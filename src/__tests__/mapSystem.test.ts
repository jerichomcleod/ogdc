/**
 * Tests for mapSystem.ts — passability, direction helpers, turn logic.
 * Also covers movement helpers used by the renderer and movement system.
 */

import { describe, it, expect, vi } from 'vitest'
import { isPassable, stepOffset, turnLeft, turnRight, getCell } from '../systems/mapSystem'
import { Cell, FloorMap } from '../content/types'

// ── Mock floors registry ──────────────────────────────────────────────────────
// mapSystem accesses FLOORS[id] via the proxy in floors.ts.
// We mock floors.ts to provide a controlled test floor.

vi.mock('../content/floors', () => {
  const cells: Cell[][] = [
    [{ type: 'wall' },                            { type: 'wall' },                                               { type: 'wall' }],
    [{ type: 'wall' },                            { type: 'floor' },                                              { type: 'wall' }],
    [{ type: 'wall' },                            { type: 'wall', wallOverride: 'door_closed' } as Cell,         { type: 'wall' }],
    [{ type: 'wall' },                            { type: 'wall', wallOverride: 'door_open' } as Cell,           { type: 'wall' }],
    [{ type: 'wall' },                            { type: 'wall', wallOverride: 'stairs_down' } as Cell,         { type: 'wall' }],
    [{ type: 'wall' },                            { type: 'wall', wallOverride: 'stairs_up' } as Cell,           { type: 'wall' }],
  ]

  const floor: FloorMap = {
    id: 'test', theme: 'stone',
    width: 3, height: 6, cells,
    spawnX: 1, spawnY: 1, spawnFacing: 'north',
    exitX: 1, exitY: 4, returnX: 1, returnY: 5, returnFacing: 'south',
    entryWallX: 1, entryWallY: 5,
  }

  const FLOORS: Record<string, FloorMap> = { test: floor }
  const LEVEL_SEQUENCE = ['test']
  function getFloor(id: string) { return FLOORS[id] }
  function regenerateDungeons() {}
  return { FLOORS, LEVEL_SEQUENCE, getFloor, regenerateDungeons }
})

// ── isPassable ────────────────────────────────────────────────────────────────

describe('isPassable', () => {
  it('returns true for floor cells', () => {
    expect(isPassable('test', 1, 1)).toBe(true)
  })

  it('returns false for plain wall cells', () => {
    expect(isPassable('test', 0, 0)).toBe(false)
    expect(isPassable('test', 2, 0)).toBe(false)
  })

  it('returns false for door_closed walls', () => {
    expect(isPassable('test', 1, 2)).toBe(false)
  })

  it('returns true for door_open walls', () => {
    expect(isPassable('test', 1, 3)).toBe(true)
  })

  it('returns false for stairs_down walls', () => {
    expect(isPassable('test', 1, 4)).toBe(false)
  })

  it('returns false for stairs_up walls', () => {
    expect(isPassable('test', 1, 5)).toBe(false)
  })

  it('returns false for out-of-bounds coordinates', () => {
    expect(isPassable('test', -1, 0)).toBe(false)
    expect(isPassable('test', 100, 100)).toBe(false)
  })

  it('returns false for unknown floor id', () => {
    expect(isPassable('nonexistent', 0, 0)).toBe(false)
  })
})

// ── getCell ───────────────────────────────────────────────────────────────────

describe('getCell', () => {
  it('returns floor cell at valid floor position', () => {
    const cell = getCell('test', 1, 1)
    expect(cell.type).toBe('floor')
  })

  it('returns wall cell at wall position', () => {
    const cell = getCell('test', 0, 0)
    expect(cell.type).toBe('wall')
  })

  it('returns void for out-of-bounds', () => {
    expect(getCell('test', -1, 0).type).toBe('void')
    expect(getCell('test', 10, 10).type).toBe('void')
  })

  it('returns void for unknown floor', () => {
    expect(getCell('missing', 0, 0).type).toBe('void')
  })
})

// ── stepOffset ────────────────────────────────────────────────────────────────

describe('stepOffset', () => {
  it('north moves dy = -1', () => {
    expect(stepOffset('north')).toEqual({ dx: 0, dy: -1 })
  })

  it('south moves dy = +1', () => {
    expect(stepOffset('south')).toEqual({ dx: 0, dy: 1 })
  })

  it('east moves dx = +1', () => {
    expect(stepOffset('east')).toEqual({ dx: 1, dy: 0 })
  })

  it('west moves dx = -1', () => {
    expect(stepOffset('west')).toEqual({ dx: -1, dy: 0 })
  })

  it('opposite directions sum to zero', () => {
    const ns = { dx: stepOffset('north').dx + stepOffset('south').dx, dy: stepOffset('north').dy + stepOffset('south').dy }
    expect(ns).toEqual({ dx: 0, dy: 0 })
    const ew = { dx: stepOffset('east').dx + stepOffset('west').dx, dy: stepOffset('east').dy + stepOffset('west').dy }
    expect(ew).toEqual({ dx: 0, dy: 0 })
  })
})

// ── turnLeft / turnRight ──────────────────────────────────────────────────────

describe('turnLeft', () => {
  it('north → west', () => expect(turnLeft('north')).toBe('west'))
  it('west → south',  () => expect(turnLeft('west')).toBe('south'))
  it('south → east',  () => expect(turnLeft('south')).toBe('east'))
  it('east → north',  () => expect(turnLeft('east')).toBe('north'))
  it('four lefts returns to start', () => {
    let d: Parameters<typeof turnLeft>[0] = 'north'
    for (let i = 0; i < 4; i++) d = turnLeft(d)
    expect(d).toBe('north')
  })
})

describe('turnRight', () => {
  it('north → east',  () => expect(turnRight('north')).toBe('east'))
  it('east → south',  () => expect(turnRight('east')).toBe('south'))
  it('south → west',  () => expect(turnRight('south')).toBe('west'))
  it('west → north',  () => expect(turnRight('west')).toBe('north'))
  it('four rights returns to start', () => {
    let d: Parameters<typeof turnRight>[0] = 'north'
    for (let i = 0; i < 4; i++) d = turnRight(d)
    expect(d).toBe('north')
  })
  it('left then right is identity', () => {
    const dirs: Parameters<typeof turnLeft>[0][] = ['north', 'east', 'south', 'west']
    for (const d of dirs) expect(turnRight(turnLeft(d))).toBe(d)
  })
})
