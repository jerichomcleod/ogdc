/**
 * Entity system: enemy/item placement and enemy AI turns.
 */

import { GameState, RunState, pushCombatLog, triggerGameOver } from '../game/gameState'
import { EnemyInstance, ItemInstance, Corpse, Equipment, ENEMY_DEFS, ITEM_DEFS, getEnemyDef, getItemDef } from '../content/defs'
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

  // Collect valid floor cells (not spawn, not exit, not portal), shuffled
  const pool: [number, number][] = []
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.cells[y][x].type !== 'floor') continue
      if (x === floor.spawnX && y === floor.spawnY) continue
      if (x === floor.exitX  && y === floor.exitY)  continue
      if (floor.portalX !== undefined && x === floor.portalX && y === floor.portalY) continue
      pool.push([x, y])
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const used    = new Set<string>()
  const enemies: EnemyInstance[] = []
  const items:   ItemInstance[]  = []
  let   pi = 0

  const eligible = ENEMY_DEFS.filter(d =>
    d.themes.includes(theme) && depth >= d.depth[0] && depth <= d.depth[1]
  )
  if (!eligible.length) return { enemies: [], items: [] }

  // Enemies — HP rolled from range using seeded RNG
  const enemyCount = ri(r, Math.round((3 + depth) * 0.65), Math.round((5 + depth * 2) * 0.65))
  for (let i = 0; i < enemyCount && pi < pool.length; i++) {
    const [x, y] = pool[pi++]
    const k = `${x},${y}`
    if (used.has(k)) { i--; continue }
    used.add(k)
    const def = eligible[Math.floor(r() * eligible.length)]
    const hp  = ri(r, def.hpMin, def.hpMax)
    enemies.push({ id: _nextId++, defKey: def.key, x, y, fromX: x, fromY: y, hp, maxHp: hp, turnDebt: 0, isAttacking: false, lastMoveMs: 0 })
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

/** BFS from (sx,sy) toward (tx,ty) within maxDist steps. Returns the first step to take, or null. */
function bfsStep(
  fid:      string,
  sx: number, sy: number,
  tx: number, ty: number,
  maxDist:  number,
  occupied: Set<string>,
): [number, number] | null {
  if (sx === tx && sy === ty) return null
  const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]
  const parent = new Map<string, [number, number] | null>()
  const queue: [number, number][] = [[sx, sy]]
  parent.set(`${sx},${sy}`, null)

  while (queue.length) {
    const [cx, cy] = queue.shift()!
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy
      const key = `${nx},${ny}`
      if (parent.has(key)) continue
      const isTarget = nx === tx && ny === ty
      if (!isTarget && (!isPassable(fid, nx, ny) || occupied.has(key))) continue
      parent.set(key, [cx, cy])
      if (isTarget) {
        let cur: [number, number] = [nx, ny]
        let prev = parent.get(key)!
        while (prev && !(prev[0] === sx && prev[1] === sy)) {
          cur  = prev
          prev = parent.get(`${prev[0]},${prev[1]}`)!
        }
        return cur
      }
      if (Math.abs(nx - sx) + Math.abs(ny - sy) < maxDist) {
        queue.push([nx, ny])
      }
    }
  }
  return null
}

export function processEnemyTurns(state: GameState): void {
  const run  = state.run
  const px   = run.position.x
  const py   = run.position.y
  const fid  = run.floorId

  for (const e of run.enemies) { e.fromX = e.x; e.fromY = e.y }

  const occupied = new Set<string>(run.enemies.map(e => `${e.x},${e.y}`))

  for (const enemy of run.enemies) {
    const def = getEnemyDef(enemy.defKey)
    if (!def) continue

    enemy.turnDebt++
    if (enemy.turnDebt < def.speed) continue
    enemy.turnDebt = 0

    const dist = Math.abs(enemy.x - px) + Math.abs(enemy.y - py)

    if (dist === 1) {
      if (!state.lastActionWasTurn) {
        enemy.isAttacking = true
        dealDamageToPlayer(state, enemy.defKey)
      }
      continue
    }

    if (dist > AGGRO_RANGE) {
      enemy.isAttacking = false
      continue
    }

    occupied.delete(`${enemy.x},${enemy.y}`)

    const step = bfsStep(fid, enemy.x, enemy.y, px, py, AGGRO_RANGE, occupied)
    if (step) {
      const [nx, ny] = step
      occupied.add(`${nx},${ny}`)
      enemy.x = nx
      enemy.y = ny
      enemy.lastMoveMs = performance.now()
      enemy.isAttacking = false
    } else {
      occupied.add(`${enemy.x},${enemy.y}`)
    }
  }
}

function playerDefense(run: RunState): number {
  const armorDef  = getItemDef(run.equipment.armor?.defKey  ?? '')?.defense ?? 0
  const shieldDef = getItemDef(run.equipment.shield?.defKey ?? '')?.defense ?? 0
  return armorDef + shieldDef
}

function dealDamageToPlayer(state: GameState, defKey: string): void {
  const def     = getEnemyDef(defKey)
  const name    = def?.name ?? 'Something'
  const rawDmg  = def ? ri(Math.random, def.attackMin, def.attackMax) : 1
  const defense = playerDefense(state.run)
  const dmg     = Math.max(0, rawDmg - defense)
  state.run.hp -= dmg
  state.run.lastHitMs = performance.now()
  if (defense > 0) {
    pushCombatLog(state.run, `The ${name} hits for ${rawDmg} (blocked ${rawDmg - dmg}). ${state.run.hp}/${state.run.maxHp} HP`)
  } else {
    pushCombatLog(state.run, `The ${name} hits you for ${dmg}.`)
  }
  if (state.run.hp <= 0) {
    state.run.hp = 0
    triggerGameOver(state)
  }
}

// ── Player attack ─────────────────────────────────────────────────────────────

const PLAYER_ATK_BASE_MIN = 1
const PLAYER_ATK_BASE_MAX = 2

/** Attack the enemy at (tx, ty). Returns true if an attack was made. */
export function playerAttack(run: RunState, tx: number, ty: number): boolean {
  const idx = run.enemies.findIndex(e => e.x === tx && e.y === ty)
  if (idx === -1) return false

  const enemy   = run.enemies[idx]
  const def     = getEnemyDef(enemy.defKey)
  const name    = def?.name ?? 'it'
  const wpnDef  = getItemDef(run.equipment.weapon?.defKey ?? '')
  const atkMin  = PLAYER_ATK_BASE_MIN + (wpnDef?.attackMin ?? 0)
  const atkMax  = PLAYER_ATK_BASE_MAX + (wpnDef?.attackMax ?? 0)
  const dmg     = ri(Math.random, atkMin, atkMax)

  enemy.hp -= dmg
  if (enemy.hp <= 0) {
    run.enemies.splice(idx, 1)
    const corpse: Corpse = {
      x: tx, y: ty,
      defKey: enemy.defKey,
      killedFromX: run.position.x,
      killedFromY: run.position.y,
    }
    run.corpses.push(corpse)
    pushCombatLog(run, `You kill the ${name}.`)
  } else {
    pushCombatLog(run, `You hit the ${name} for ${dmg}. (${enemy.hp}/${enemy.maxHp} HP)`)
  }
  return true
}

// ── Item pickup ───────────────────────────────────────────────────────────────

/** Pick up an item at (x, y). Gold goes to counter; equipment/potions go to inventory. */
export function tryPickupItem(run: RunState, x: number, y: number): boolean {
  const idx = run.items.findIndex(it => it.x === x && it.y === y)
  if (idx === -1) return false

  const item = run.items[idx]
  const def  = getItemDef(item.defKey)

  // Gold coins auto-collect into the gold counter, never enter inventory
  if (item.defKey === 'gold_coin') {
    run.items.splice(idx, 1)
    run.gold++
    pushCombatLog(run, 'Found a Gold Coin.')
    return true
  }

  if (run.inventory.length >= 20) {
    pushCombatLog(run, 'Inventory full.')
    return false
  }

  run.items.splice(idx, 1)
  run.inventory.push(item)
  pushCombatLog(run, `Picked up ${def?.name ?? 'item'}.`)
  return true
}

/** Use the best healing item in inventory (Q key shortcut). */
export function useItem(run: RunState): boolean {
  if (!run.inventory.length) {
    pushCombatLog(run, 'No items to use.')
    return false
  }
  let bestIdx = -1, bestVal = 0
  for (let i = 0; i < run.inventory.length; i++) {
    const def = getItemDef(run.inventory[i].defKey)
    if (def && def.effect === 'heal' && (def.value ?? 0) > bestVal) {
      bestVal = def.value!
      bestIdx = i
    }
  }
  if (bestIdx === -1) {
    pushCombatLog(run, 'Nothing usable.')
    return false
  }
  return useItemAtSlot(run, bestIdx)
}

/** Use the heal item at a specific inventory slot (inventory screen). */
export function useItemAtSlot(run: RunState, idx: number): boolean {
  const item = run.inventory[idx]
  if (!item) return false
  const def = getItemDef(item.defKey)
  if (!def || def.effect !== 'heal') return false
  run.inventory.splice(idx, 1)
  const healed = Math.min(def.value ?? 0, run.maxHp - run.hp)
  run.hp += healed
  pushCombatLog(run, `Used ${def.name}. +${healed} HP. (${run.hp}/${run.maxHp})`)
  return true
}

/** Equip the item at a specific inventory slot. Returns true on success. */
export function equipItemAtSlot(run: RunState, idx: number): boolean {
  const item = run.inventory[idx]
  if (!item) return false
  const def = getItemDef(item.defKey)
  if (!def || def.effect !== 'equip' || !def.slot) return false

  run.inventory.splice(idx, 1)
  const displaced = run.equipment[def.slot]
  if (displaced && run.inventory.length < 20) run.inventory.push(displaced)
  run.equipment[def.slot] = item
  pushCombatLog(run, `Equipped ${def.name}.`)
  return true
}

/** Unequip the item in the given slot back to inventory. */
export function unequipSlot(run: RunState, slot: keyof Equipment): boolean {
  const item = run.equipment[slot]
  if (!item) return false
  if (run.inventory.length >= 20) {
    pushCombatLog(run, 'Inventory full — unequip failed.')
    return false
  }
  run.equipment[slot] = null
  run.inventory.push(item)
  const def = getItemDef(item.defKey)
  pushCombatLog(run, `Unequipped ${def?.name ?? 'item'}.`)
  return true
}

/** Drop the item at a specific inventory slot onto the floor at the player's position. */
export function dropItemAtSlot(run: RunState, idx: number): boolean {
  const item = run.inventory[idx]
  if (!item) return false
  run.inventory.splice(idx, 1)
  item.x = run.position.x
  item.y = run.position.y
  run.items.push(item)
  const def = getItemDef(item.defKey)
  pushCombatLog(run, `Dropped ${def?.name ?? 'item'}.`)
  return true
}
