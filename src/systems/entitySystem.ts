/**
 * Entity system: enemy/item placement and enemy AI turns.
 */

import { GameState, RunState, pushCombatLog, triggerGameOver } from '../game/gameState'
import { EnemyInstance, ItemInstance, ENEMY_DEFS, ITEM_DEFS, getEnemyDef, getItemDef } from '../content/defs'
import { getFloor } from '../content/floors'
import { makeRng } from '../content/dungeonGen'
import { isPassable } from './mapSystem'

let _nextId = 0

function ri(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1))
}

function levelDepth(floorId: string): number {
  const m = floorId.match(/_(\d)$/)
  return m ? parseInt(m[1]) : 1
}

// ── Placement ─────────────────────────────────────────────────────────────────

export function generateEntities(floorId: string, worldSeed: number, levelIndex: number): {
  enemies: EnemyInstance[]
  items:   ItemInstance[]
} {
  const floor = getFloor(floorId)
  if (!floor) return { enemies: [], items: [] }

  const r     = makeRng((worldSeed ^ (levelIndex * 0x9E37)) >>> 0)
  const theme = floor.theme
  const depth = levelDepth(floorId)

  // Collect valid floor cells (not spawn, not exit), shuffled
  const pool: [number, number][] = []
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.cells[y][x].type !== 'floor') continue
      if (x === floor.spawnX && y === floor.spawnY) continue
      if (x === floor.exitX  && y === floor.exitY)  continue
      pool.push([x, y])
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const used   = new Set<string>()
  const enemies: EnemyInstance[] = []
  const items:   ItemInstance[]  = []
  let   pi = 0

  const eligible = ENEMY_DEFS.filter(d =>
    d.themes.includes(theme) && depth >= d.depth[0] && depth <= d.depth[1]
  )
  if (!eligible.length) return { enemies: [], items: [] }

  // Enemies
  const enemyCount = ri(r, 3 + depth, 5 + depth * 2)
  for (let i = 0; i < enemyCount && pi < pool.length; i++) {
    const [x, y] = pool[pi++]
    const k = `${x},${y}`
    if (used.has(k)) { i--; continue }
    used.add(k)
    const def = eligible[Math.floor(r() * eligible.length)]
    enemies.push({ id: _nextId++, defKey: def.key, x, y, hp: def.hp, maxHp: def.hp, turnDebt: 0 })
  }

  // Items
  const itemCount = ri(r, 1, 1 + Math.floor(depth / 2))
  for (let i = 0; i < itemCount && pi < pool.length; i++) {
    const [x, y] = pool[pi++]
    const k = `${x},${y}`
    if (used.has(k)) { i--; continue }
    used.add(k)
    const def = ITEM_DEFS[Math.floor(r() * ITEM_DEFS.length)]
    items.push({ id: _nextId++, defKey: def.key, x, y })
  }

  return { enemies, items }
}

// ── Enemy AI ──────────────────────────────────────────────────────────────────

const AGGRO_RANGE = 12

export function processEnemyTurns(state: GameState): void {
  const run  = state.run
  const px   = run.position.x
  const py   = run.position.y
  const fid  = run.floorId

  for (const enemy of run.enemies) {
    const def = getEnemyDef(enemy.defKey)
    if (!def) continue

    enemy.turnDebt++
    if (enemy.turnDebt < def.speed) continue
    enemy.turnDebt = 0

    const dist = Math.abs(enemy.x - px) + Math.abs(enemy.y - py)

    // Attack if adjacent to player
    if (dist === 1) {
      dealDamageToPlayer(state, enemy.defKey, def.attack)
      continue
    }

    // Move toward player if in aggro range
    if (dist > AGGRO_RANGE) continue

    const dx = Math.sign(px - enemy.x)
    const dy = Math.sign(py - enemy.y)

    // Try primary axis first, then secondary; randomise tie-break
    const steps: [number, number][] = []
    if (dx !== 0) steps.push([dx, 0])
    if (dy !== 0) steps.push([0, dy])
    if (steps.length === 2 && Math.random() < 0.5) steps.reverse()

    for (const [sx, sy] of steps) {
      const nx = enemy.x + sx
      const ny = enemy.y + sy
      if (!isPassable(fid, nx, ny)) continue
      if (nx === px && ny === py)   continue   // don't walk into player
      if (run.enemies.some(e => e !== enemy && e.x === nx && e.y === ny)) continue
      enemy.x = nx
      enemy.y = ny
      break
    }
  }
}

function dealDamageToPlayer(state: GameState, defKey: string, attack: number): void {
  const def = getEnemyDef(defKey)
  const name = def?.name ?? 'Something'
  state.run.hp -= attack
  pushCombatLog(state.run, `The ${name} hits you for ${attack} damage.`)
  if (state.run.hp <= 0) {
    state.run.hp = 0
    triggerGameOver(state)
  }
}

// ── Player attack ─────────────────────────────────────────────────────────────

const PLAYER_ATK_MIN = 5
const PLAYER_ATK_MAX = 12

/** Attack the enemy at (tx, ty). Returns true if an attack was made. */
export function playerAttack(run: RunState, tx: number, ty: number): boolean {
  const idx = run.enemies.findIndex(e => e.x === tx && e.y === ty)
  if (idx === -1) return false

  const enemy = run.enemies[idx]
  const def   = getEnemyDef(enemy.defKey)
  const name  = def?.name ?? 'it'
  const dmg   = PLAYER_ATK_MIN + Math.floor(Math.random() * (PLAYER_ATK_MAX - PLAYER_ATK_MIN + 1))

  enemy.hp -= dmg
  if (enemy.hp <= 0) {
    run.enemies.splice(idx, 1)
    pushCombatLog(run, `You kill the ${name}.`)
  } else {
    pushCombatLog(run, `You hit the ${name} for ${dmg}. (${enemy.hp}/${enemy.maxHp} HP)`)
  }
  return true
}

// ── Item pickup ───────────────────────────────────────────────────────────────

/** Pick up an item at (x, y) into inventory. Returns true if picked up. */
export function tryPickupItem(run: RunState, x: number, y: number): boolean {
  const idx = run.items.findIndex(it => it.x === x && it.y === y)
  if (idx === -1) return false

  const item = run.items.splice(idx, 1)[0]
  const def  = getItemDef(item.defKey)
  run.inventory.push(item)
  pushCombatLog(run, `Picked up ${def?.name ?? 'item'}.`)
  return true
}

/** Use the best healing item in inventory. Returns true if an item was used. */
export function useItem(run: RunState): boolean {
  if (!run.inventory.length) {
    pushCombatLog(run, 'No items to use.')
    return false
  }
  // Find best heal item
  let bestIdx = -1, bestVal = 0
  for (let i = 0; i < run.inventory.length; i++) {
    const def = getItemDef(run.inventory[i].defKey)
    if (def && def.effect === 'heal' && def.value > bestVal) {
      bestVal = def.value
      bestIdx = i
    }
  }
  if (bestIdx === -1) {
    pushCombatLog(run, 'Nothing usable.')
    return false
  }
  const item   = run.inventory.splice(bestIdx, 1)[0]
  const def    = getItemDef(item.defKey)!
  const healed = Math.min(def.value, run.maxHp - run.hp)
  run.hp      += healed
  pushCombatLog(run, `Used ${def.name}. +${healed} HP. (${run.hp}/${run.maxHp})`)
  return true
}
