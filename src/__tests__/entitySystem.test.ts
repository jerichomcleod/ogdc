/**
 * Tests for entitySystem.ts — entity generation, player combat, item use,
 * enemy AI, and the no-respawn guarantee.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  generateEntities,
  playerAttack,
  tryPickupItem,
  useItem,
  processEnemyTurns,
} from '../systems/entitySystem'
import { RunState, GameState } from '../game/gameState'
import { EnemyInstance, ItemInstance } from '../content/defs'
import { FloorMap, Cell } from '../content/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../engine/assets', () => ({
  getGameOverText: () => 'You have perished.',
  getDoorClosedPixels: () => new Uint32Array(0),
  getDoorOpenPixels: () => new Uint32Array(0),
  getStairDownPixels: () => new Uint32Array(0),
  getStairUpPixels: () => new Uint32Array(0),
  getDeadEndText: () => '',
  getLevelDescText: () => '',
}))

// Provide a 10×10 all-floor test map for entitySystem tests
vi.mock('../content/floors', () => {
  function makeOpenFloor(id: string, width = 10, height = 10): FloorMap {
    const cells: Cell[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, (): Cell => ({ type: 'floor' }))
    )
    // Put walls on border
    for (let x = 0; x < width; x++) { cells[0][x] = { type: 'wall' }; cells[height-1][x] = { type: 'wall' } }
    for (let y = 0; y < height; y++) { cells[y][0] = { type: 'wall' }; cells[y][width-1] = { type: 'wall' } }
    return {
      id, theme: 'stone',
      width, height, cells,
      spawnX: 1, spawnY: 1, spawnFacing: 'south',
      exitX: width - 2, exitY: height - 2,
      returnX: 1, returnY: 1, returnFacing: 'south',
      entryWallX: 1, entryWallY: 0,
    }
  }

  const floors: Record<string, FloorMap> = {}
  const ids = [
    'stone_1','stone_2','stone_3','stone_4','stone_5',
    'catacomb_1','catacomb_2','catacomb_3','catacomb_4','catacomb_5',
    'machine_1','machine_2','machine_3','machine_4','machine_5',
  ]
  for (const id of ids) floors[id] = makeOpenFloor(id)

  const FLOORS = new Proxy({} as Record<string, FloorMap>, { get: (_t, k: string) => floors[k] })
  const LEVEL_SEQUENCE = ids
  function getFloor(id: string) { return floors[id] }
  function regenerateDungeons() {}
  return { FLOORS, LEVEL_SEQUENCE, getFloor, regenerateDungeons }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    floorId: 'stone_1',
    position: { x: 1, y: 1 },
    facing: 'south',
    hp: 60, maxHp: 60,
    mapRevealed: [],
    floorFlags: {},
    anim: null,
    enemies: [],
    items: [],
    inventory: [],
    equipment: { weapon: null, armor: null, shield: null },
    gold: 0,
    combatLog: [],
    levelEntryMs: 0,
    playerActed: false,
    deadEndMsg: '',
    deadEndMs: null,
    entitiesSpawned: false,
    corpses: [],
    lastHitMs: 0,
    ...overrides,
  }
}

function makeGameState(runOverrides: Partial<RunState> = {}): GameState {
  return {
    mode: 'dungeon',
    run: makeRunState(runOverrides),
    worldSeed: 0x1234,
    levelIndex: 0,
    townMenuIndex: 0,
    gameOverMs: 0,
    gameOverMessage: '',
    gameOverMenuIndex: 0,
    shownLevelEntries: new Set(),
    discoveredPortals: new Set(),
    gameTick: 0,
    enemyMoveMs: 0,
    lastActionWasTurn: false,
    inventoryOpen: false,
    inventorySlot: 0,
    inventoryFocus: 'grid',
  }
}

// ── generateEntities ──────────────────────────────────────────────────────────

describe('generateEntities', () => {
  it('returns enemies array for stone_1', () => {
    const { enemies } = generateEntities('stone_1', 42, 0)
    expect(Array.isArray(enemies)).toBe(true)
    expect(enemies.length).toBeGreaterThan(0)
  })

  it('returns items array for stone_1', () => {
    const { items } = generateEntities('stone_1', 42, 0)
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it('no enemy spawns at spawn position (1,1)', () => {
    const { enemies } = generateEntities('stone_1', 42, 0)
    expect(enemies.some(e => e.x === 1 && e.y === 1)).toBe(false)
  })

  it('no two enemies share the same cell', () => {
    const { enemies } = generateEntities('stone_1', 1234, 0)
    const positions = new Set(enemies.map(e => `${e.x},${e.y}`))
    expect(positions.size).toBe(enemies.length)
  })

  it('all enemies start on floor cells (not wall)', () => {
    // The mock floor has walls only on border; enemies should be on interior floor
    const { enemies } = generateEntities('stone_1', 99, 0)
    for (const e of enemies) {
      expect(e.x).toBeGreaterThan(0)
      expect(e.x).toBeLessThan(9)
      expect(e.y).toBeGreaterThan(0)
      expect(e.y).toBeLessThan(9)
    }
  })

  it('enemies have positive HP', () => {
    const { enemies } = generateEntities('stone_1', 7, 0)
    for (const e of enemies) expect(e.hp).toBeGreaterThan(0)
  })

  it('enemies have defKey matching a known enemy def', () => {
    const knownKeys = ['crawler','shade','sentinel','revenant','boneguard','wraith','automaton','drone','behemoth']
    const { enemies } = generateEntities('stone_1', 7, 0)
    for (const e of enemies) expect(knownKeys).toContain(e.defKey)
  })

  it('returns deterministic results for same seed', () => {
    const r1 = generateEntities('stone_1', 5555, 0)
    const r2 = generateEntities('stone_1', 5555, 0)
    expect(r1.enemies.map(e => `${e.defKey}@${e.x},${e.y}`))
      .toEqual(r2.enemies.map(e => `${e.defKey}@${e.x},${e.y}`))
  })

  it('returns empty for unknown floor', () => {
    const { enemies, items } = generateEntities('nonexistent', 1, 0)
    expect(enemies).toHaveLength(0)
    expect(items).toHaveLength(0)
  })

  it('deeper levels spawn more enemies on average', () => {
    const depths: number[] = []
    for (let depth = 1; depth <= 5; depth++) {
      const { enemies } = generateEntities(`stone_${depth}`, 42, depth - 1)
      depths.push(enemies.length)
    }
    // Not strictly monotone but average should increase
    const early = (depths[0] + depths[1]) / 2
    const late  = (depths[3] + depths[4]) / 2
    expect(late).toBeGreaterThanOrEqual(early)
  })
})

// ── playerAttack ──────────────────────────────────────────────────────────────

describe('playerAttack', () => {
  it('returns false when no enemy at target', () => {
    const run = makeRunState()
    expect(playerAttack(run, 2, 2)).toBe(false)
  })

  it('returns true and reduces enemy HP', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 2, hp: 10, maxHp: 10, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const run = makeRunState({ enemies: [enemy] })
    const result = playerAttack(run, 2, 2)
    expect(result).toBe(true)
    expect(enemy.hp).toBeLessThan(10)
  })

  it('removes enemy from list on kill', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 2, hp: 1, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const run = makeRunState({ enemies: [enemy] })
    playerAttack(run, 2, 2)
    expect(run.enemies).toHaveLength(0)
  })

  it('logs a message on kill', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 2, hp: 1, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const run = makeRunState({ enemies: [enemy] })
    playerAttack(run, 2, 2)
    expect(run.combatLog.some(m => m.includes('kill') || m.includes('kill'))).toBe(true)
  })

  it('logs a message on hit (not kill)', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 2, hp: 100, maxHp: 100, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const run = makeRunState({ enemies: [enemy] })
    playerAttack(run, 2, 2)
    expect(run.combatLog.length).toBeGreaterThan(0)
  })

  it('combat log never exceeds 4 entries', () => {
    const run = makeRunState()
    for (let i = 0; i < 10; i++) {
      const enemy: EnemyInstance = { id: i, defKey: 'crawler', x: 2, y: 2, hp: 1, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
      run.enemies.push(enemy)
      playerAttack(run, 2, 2)
    }
    expect(run.combatLog.length).toBeLessThanOrEqual(4)
  })

  it('does not affect enemies at other positions', () => {
    const e1: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 2, hp: 10, maxHp: 10, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const e2: EnemyInstance = { id: 2, defKey: 'crawler', x: 3, y: 3, hp: 10, maxHp: 10, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const run = makeRunState({ enemies: [e1, e2] })
    playerAttack(run, 2, 2)
    expect(e2.hp).toBe(10)
  })
})

// ── tryPickupItem ─────────────────────────────────────────────────────────────

describe('tryPickupItem', () => {
  it('returns false when no item at position', () => {
    const run = makeRunState()
    expect(tryPickupItem(run, 3, 3)).toBe(false)
  })

  it('returns true and moves item to inventory', () => {
    const item: ItemInstance = { id: 1, defKey: 'potion_sm', x: 3, y: 3 }
    const run = makeRunState({ items: [item] })
    const result = tryPickupItem(run, 3, 3)
    expect(result).toBe(true)
    expect(run.items).toHaveLength(0)
    expect(run.inventory).toHaveLength(1)
    expect(run.inventory[0].defKey).toBe('potion_sm')
  })

  it('adds a combat log entry', () => {
    const item: ItemInstance = { id: 1, defKey: 'potion_sm', x: 3, y: 3 }
    const run = makeRunState({ items: [item] })
    tryPickupItem(run, 3, 3)
    expect(run.combatLog.length).toBeGreaterThan(0)
  })
})

// ── useItem ───────────────────────────────────────────────────────────────────

describe('useItem', () => {
  it('returns false with empty inventory', () => {
    const run = makeRunState()
    expect(useItem(run)).toBe(false)
    expect(run.combatLog.some(m => m.includes('No items'))).toBe(true)
  })

  it('returns false when inventory has no usable items', () => {
    // No heal items — but all defined items are heal, so we simulate with unknown key
    // Instead just test that non-heal items produce "Nothing usable"
    const run = makeRunState({ inventory: [{ id: 9, defKey: 'not_real', x: 0, y: 0 }] })
    expect(useItem(run)).toBe(false)
    expect(run.combatLog.some(m => m.includes('Nothing'))).toBe(true)
  })

  it('heals the player and consumes the item', () => {
    const item: ItemInstance = { id: 1, defKey: 'potion_sm', x: 0, y: 0 }
    const run = makeRunState({ hp: 30, maxHp: 60, inventory: [item] })
    const result = useItem(run)
    expect(result).toBe(true)
    expect(run.hp).toBeGreaterThan(30)
    expect(run.inventory).toHaveLength(0)
  })

  it('does not overheal past maxHp', () => {
    const item: ItemInstance = { id: 1, defKey: 'potion_lg', x: 0, y: 0 }
    const run = makeRunState({ hp: 59, maxHp: 60, inventory: [item] })
    useItem(run)
    expect(run.hp).toBeLessThanOrEqual(run.maxHp)
  })

  it('uses the best healing item when multiple are available', () => {
    const sm: ItemInstance = { id: 1, defKey: 'potion_sm', x: 0, y: 0 }
    const lg: ItemInstance = { id: 2, defKey: 'potion_lg', x: 0, y: 0 }
    const run = makeRunState({ hp: 1, maxHp: 60, inventory: [sm, lg] })
    useItem(run)
    // potion_lg heals 35, potion_sm heals 15 — should use lg
    expect(run.hp).toBeGreaterThan(15 + 1)
    expect(run.inventory).toHaveLength(1)
    expect(run.inventory[0].defKey).toBe('potion_sm')
  })
})

// ── processEnemyTurns ─────────────────────────────────────────────────────────

describe('processEnemyTurns', () => {
  it('does not crash with no enemies', () => {
    const state = makeGameState()
    expect(() => processEnemyTurns(state)).not.toThrow()
  })

  it('enemy moves toward player when in aggro range', () => {
    // Place enemy at (5,5), player at (1,1) — within 12 Manhattan distance
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 5, y: 5, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      enemies: [enemy],
      floorId: 'stone_1',
    })
    processEnemyTurns(state)
    // Enemy should have moved closer (smaller Manhattan distance)
    const before = Math.abs(5 - 1) + Math.abs(5 - 1)
    const after  = Math.abs(enemy.x - 1) + Math.abs(enemy.y - 1)
    expect(after).toBeLessThan(before)
  })

  it('enemy does not move when out of aggro range (> 12 tiles)', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 9, y: 9, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },  // distance 16, > AGGRO_RANGE(12)
      enemies: [enemy],
      floorId: 'stone_1',
    })
    processEnemyTurns(state)
    expect(enemy.x).toBe(9)
    expect(enemy.y).toBe(9)
  })

  it('adjacent enemy attacks player and reduces HP', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 1, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      enemies: [enemy],
      floorId: 'stone_1',
    })
    const hpBefore = state.run.hp
    processEnemyTurns(state)
    expect(state.run.hp).toBeLessThan(hpBefore)
  })

  it('slow enemy (speed=2) skips every other turn', () => {
    // speed=2 means acts when turnDebt >= 2
    const enemy: EnemyInstance = { id: 1, defKey: 'sentinel', x: 5, y: 5, hp: 18, maxHp: 18, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      enemies: [enemy],
      floorId: 'stone_3',  // sentinel appears at stone depth 3-5
    })
    // First turn: turnDebt becomes 1, < speed(2) → no move
    processEnemyTurns(state)
    expect(enemy.x).toBe(5)
    expect(enemy.y).toBe(5)
    // Second turn: turnDebt becomes 2 (or resets) → acts
    processEnemyTurns(state)
    const after = Math.abs(enemy.x - 1) + Math.abs(enemy.y - 1)
    expect(after).toBeLessThan(Math.abs(5 - 1) + Math.abs(5 - 1))
  })

  it('enemy does not walk into player cell', () => {
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 1, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      enemies: [enemy],
      floorId: 'stone_1',
    })
    processEnemyTurns(state)
    expect(enemy.x === 1 && enemy.y === 1).toBe(false)
  })

  it('two enemies do not stack on same cell', () => {
    const e1: EnemyInstance = { id: 1, defKey: 'crawler', x: 3, y: 1, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const e2: EnemyInstance = { id: 2, defKey: 'crawler', x: 4, y: 1, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      enemies: [e1, e2],
      floorId: 'stone_1',
    })
    processEnemyTurns(state)
    expect(e1.x === e2.x && e1.y === e2.y).toBe(false)
  })

  it('triggers game over when player HP reaches 0', () => {
    // crawler: speed=1, attack=2. Start with hp=1 and turnDebt=0 so it acts immediately.
    const enemy: EnemyInstance = { id: 1, defKey: 'crawler', x: 2, y: 1, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, fromX: 0, fromY: 0, lastMoveMs: 0 }
    const state = makeGameState({
      position: { x: 1, y: 1 },
      hp: 1,
      enemies: [enemy],
      floorId: 'stone_1',
    })
    processEnemyTurns(state)
    expect(state.mode).toBe('game_over')
    expect(state.run.hp).toBe(0)
  })
})
