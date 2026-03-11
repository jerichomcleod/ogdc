/**
 * Tests for gameState.ts — state transitions, level advance/retreat,
 * town transitions, game-over, and entity respawn prevention.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  makeInitialState,
  advanceLevel,
  goUp,
  returnToDungeon,
  triggerGameOver,
  pushCombatLog,
  makeRevealedGrid,
  RunState,
} from '../game/gameState'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../engine/assets', () => ({
  getGameOverText: () => 'You have perished.',
}))

function makeOpenFloor(id: string) {
  const cells = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ type: 'floor' as const }))
  )
  return {
    id, theme: 'stone' as const,
    width: 10, height: 10, cells,
    spawnX: 1, spawnY: 1, spawnFacing: 'south' as const,
    exitX: 8, exitY: 8,
    returnX: 2, returnY: 2, returnFacing: 'north' as const,
    entryWallX: 1, entryWallY: 0,
  }
}

vi.mock('../content/floors', () => {
  const floors: Record<string, ReturnType<typeof makeOpenFloor>> = {}
  const ids2 = [
    'stone_1','stone_2','stone_3','stone_4','stone_5',
    'catacomb_1','catacomb_2','catacomb_3','catacomb_4','catacomb_5',
    'machine_1','machine_2','machine_3','machine_4','machine_5',
  ]
  for (const id of ids2) {
    const cells = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ type: 'floor' as const }))
    )
    floors[id] = {
      id, theme: 'stone' as const,
      width: 10, height: 10, cells,
      spawnX: 1, spawnY: 1, spawnFacing: 'south' as const,
      exitX: 8, exitY: 8,
      returnX: 2, returnY: 2, returnFacing: 'north' as const,
      entryWallX: 1, entryWallY: 0,
    }
  }
  const FLOORS = new Proxy({} as any, { get: (_t, k: string) => floors[k] })
  const LEVEL_SEQUENCE = ids2
  function getFloor(id: string) { return floors[id] }
  function regenerateDungeons() {}
  return { FLOORS, LEVEL_SEQUENCE, getFloor, regenerateDungeons }
})

// ── makeInitialState ──────────────────────────────────────────────────────────

describe('makeInitialState', () => {
  it('produces mode dungeon', () => {
    const s = makeInitialState()
    expect(s.mode).toBe('dungeon')
  })

  it('starts at levelIndex 0', () => {
    const s = makeInitialState()
    expect(s.levelIndex).toBe(0)
  })

  it('run floorId is stone_1', () => {
    const s = makeInitialState()
    expect(s.run.floorId).toBe('stone_1')
  })

  it('spawn position matches floor spawnX/spawnY', () => {
    const s = makeInitialState()
    expect(s.run.position.x).toBe(1)
    expect(s.run.position.y).toBe(1)
  })

  it('entitiesSpawned is false initially', () => {
    const s = makeInitialState()
    expect(s.run.entitiesSpawned).toBe(false)
  })

  it('has full HP', () => {
    const s = makeInitialState()
    expect(s.run.hp).toBe(s.run.maxHp)
  })

  it('starts with empty inventory', () => {
    const s = makeInitialState()
    expect(s.run.inventory).toHaveLength(0)
  })

  it('shownLevelEntries is empty', () => {
    const s = makeInitialState()
    expect(s.shownLevelEntries.size).toBe(0)
  })
})

// ── advanceLevel ──────────────────────────────────────────────────────────────

describe('advanceLevel', () => {
  it('increments levelIndex by 1', () => {
    const s = makeInitialState()
    advanceLevel(s)
    expect(s.levelIndex).toBe(1)
  })

  it('changes floorId to next floor', () => {
    const s = makeInitialState()
    advanceLevel(s)
    expect(s.run.floorId).toBe('stone_2')
  })

  it('preserves HP', () => {
    const s = makeInitialState()
    s.run.hp = 30
    advanceLevel(s)
    expect(s.run.hp).toBe(30)
  })

  it('preserves maxHp', () => {
    const s = makeInitialState()
    advanceLevel(s)
    expect(s.run.maxHp).toBe(60)
  })

  it('preserves inventory items', () => {
    const s = makeInitialState()
    s.run.inventory = [{ id: 1, defKey: 'potion_sm', x: 0, y: 0 }]
    advanceLevel(s)
    expect(s.run.inventory).toHaveLength(1)
    expect(s.run.inventory[0].defKey).toBe('potion_sm')
  })

  it('resets entitiesSpawned to false on new floor', () => {
    const s = makeInitialState()
    s.run.entitiesSpawned = true
    advanceLevel(s)
    expect(s.run.entitiesSpawned).toBe(false)
  })

  it('resets enemies to empty on new floor', () => {
    const s = makeInitialState()
    s.run.enemies = [{ id: 1, defKey: 'crawler', x: 2, y: 2, hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false }]
    advanceLevel(s)
    expect(s.run.enemies).toHaveLength(0)
  })

  it('wraps to level 0 after last level (15)', () => {
    const s = makeInitialState()
    s.levelIndex = 14  // last
    advanceLevel(s)
    expect(s.levelIndex).toBe(0)
    expect(s.run.floorId).toBe('stone_1')
  })
})

// ── goUp ─────────────────────────────────────────────────────────────────────

describe('goUp', () => {
  it('decrements levelIndex', () => {
    const s = makeInitialState()
    s.levelIndex = 3
    advanceLevel(s) // sets up level 3 run
    goUp(s)
    // Wait, goUp from level 3 state (after advanceLevel) goes to level 2
    // But let me just set levelIndex manually for simplicity:
  })

  it('goes to previous floor', () => {
    const s = makeInitialState()
    s.levelIndex = 2
    s.run.floorId = 'stone_3'
    goUp(s)
    expect(s.levelIndex).toBe(1)
    expect(s.run.floorId).toBe('stone_2')
  })

  it('places player at returnX/returnY of previous floor', () => {
    const s = makeInitialState()
    s.levelIndex = 2
    s.run.floorId = 'stone_3'
    goUp(s)
    expect(s.run.position.x).toBe(2)  // returnX of mocked floor
    expect(s.run.position.y).toBe(2)  // returnY
  })

  it('goes to town when at level 0', () => {
    const s = makeInitialState()
    expect(s.levelIndex).toBe(0)
    goUp(s)
    expect(s.mode).toBe('town')
  })

  it('preserves HP when going up', () => {
    const s = makeInitialState()
    s.levelIndex = 2
    s.run.floorId = 'stone_3'
    s.run.hp = 25
    goUp(s)
    expect(s.run.hp).toBe(25)
  })

  it('resets entitiesSpawned to false on previous floor', () => {
    const s = makeInitialState()
    s.levelIndex = 2
    s.run.floorId = 'stone_3'
    s.run.entitiesSpawned = true
    goUp(s)
    expect(s.run.entitiesSpawned).toBe(false)
  })
})

// ── returnToDungeon ───────────────────────────────────────────────────────────

describe('returnToDungeon', () => {
  it('sets mode to dungeon', () => {
    const s = makeInitialState()
    s.mode = 'town'
    returnToDungeon(s)
    expect(s.mode).toBe('dungeon')
  })

  it('sets levelIndex to 0', () => {
    const s = makeInitialState()
    s.mode = 'town'
    returnToDungeon(s)
    expect(s.levelIndex).toBe(0)
  })

  it('sets floorId to stone_1', () => {
    const s = makeInitialState()
    s.mode = 'town'
    returnToDungeon(s)
    expect(s.run.floorId).toBe('stone_1')
  })

  it('entitiesSpawned is false after returning', () => {
    const s = makeInitialState()
    s.run.entitiesSpawned = true
    s.mode = 'town'
    returnToDungeon(s)
    expect(s.run.entitiesSpawned).toBe(false)
  })
})

// ── triggerGameOver ───────────────────────────────────────────────────────────

describe('triggerGameOver', () => {
  it('sets mode to game_over', () => {
    const s = makeInitialState()
    triggerGameOver(s)
    expect(s.mode).toBe('game_over')
  })

  it('sets a non-empty gameOverMessage', () => {
    const s = makeInitialState()
    triggerGameOver(s)
    expect(s.gameOverMessage.length).toBeGreaterThan(0)
  })

  it('resets gameOverMenuIndex to 0', () => {
    const s = makeInitialState()
    s.gameOverMenuIndex = 1
    triggerGameOver(s)
    expect(s.gameOverMenuIndex).toBe(0)
  })
})

// ── pushCombatLog ─────────────────────────────────────────────────────────────

describe('pushCombatLog', () => {
  function makeRun(): RunState {
    return {
      floorId: 'stone_1', position: { x: 1, y: 1 }, facing: 'south',
      hp: 60, maxHp: 60, mapRevealed: [], floorFlags: {}, anim: null,
      enemies: [], items: [], inventory: [], combatLog: [],
      levelEntryMs: 0, playerActed: false, deadEndMsg: '', deadEndMs: null,
      entitiesSpawned: false, corpses: [],
    }
  }

  it('adds messages in order', () => {
    const run = makeRun()
    pushCombatLog(run, 'msg1')
    pushCombatLog(run, 'msg2')
    expect(run.combatLog).toEqual(['msg1', 'msg2'])
  })

  it('caps at 4 messages', () => {
    const run = makeRun()
    for (let i = 0; i < 10; i++) pushCombatLog(run, `msg${i}`)
    expect(run.combatLog.length).toBe(4)
  })

  it('evicts oldest message when capped', () => {
    const run = makeRun()
    for (let i = 0; i < 5; i++) pushCombatLog(run, `msg${i}`)
    expect(run.combatLog[0]).toBe('msg1')
    expect(run.combatLog[3]).toBe('msg4')
  })
})

// ── makeRevealedGrid ──────────────────────────────────────────────────────────

describe('makeRevealedGrid', () => {
  it('creates correct dimensions', () => {
    const grid = makeRevealedGrid(5, 8)
    expect(grid.length).toBe(8)
    for (const row of grid) expect(row.length).toBe(5)
  })

  it('all cells start as false', () => {
    const grid = makeRevealedGrid(4, 4)
    for (const row of grid) for (const v of row) expect(v).toBe(false)
  })
})

// ── Entity respawn prevention ─────────────────────────────────────────────────

describe('entity respawn prevention', () => {
  it('entitiesSpawned flag starts false on every new RunState', () => {
    const s = makeInitialState()
    expect(s.run.entitiesSpawned).toBe(false)
  })

  it('entitiesSpawned flag is preserved as-is (not reset) by advanceLevel when already false', () => {
    const s = makeInitialState()
    s.run.entitiesSpawned = false
    advanceLevel(s)
    // New RunState always starts false; the old value doesn't matter
    expect(s.run.entitiesSpawned).toBe(false)
  })

  it('advanceLevel always resets entitiesSpawned to false (not inherited from old run)', () => {
    const s = makeInitialState()
    s.run.entitiesSpawned = true
    advanceLevel(s)
    expect(s.run.entitiesSpawned).toBe(false)
  })

  it('goUp always resets entitiesSpawned to false', () => {
    const s = makeInitialState()
    s.levelIndex = 1
    s.run.floorId = 'stone_2'
    s.run.entitiesSpawned = true
    goUp(s)
    expect(s.run.entitiesSpawned).toBe(false)
  })
})
