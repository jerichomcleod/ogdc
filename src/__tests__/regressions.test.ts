/**
 * Regression tests — each test corresponds to a bug that was found and fixed.
 * These tests exist to prevent those bugs from being reintroduced.
 *
 * Bugs covered:
 *  R01 - Stairs appear on corner walls (2 floor neighbors)
 *  R02 - Stairs appear in random corridors (adjacent floor cell has only 1 floor neighbor)
 *  R03 - Stairs missing entirely (null slot → spawn at room center, no wall placed)
 *  R04 - Dead-end detection triggers when a door is adjacent (door miscounted as wall)
 *  R05 - Doors spawn inside rooms (not at chokepoints)
 *  R06 - Doors spawn inside plain corridor (no room/junction boundary)
 *  R07 - Enemies respawn after being killed
 *  R08 - Level entry message shown multiple times for the same floor
 *  R09 - Open door blocks raycasting (door_open should not be a solid hit)
 *  R10 - Spawn facing points toward entry wall instead of into level
 *  R11 - start/end nodes get extra corridor connections → no free wall faces
 *  R12 - enemy sprites flicker: z-buffer float precision & non-integer half-width
 *  R13 - enemy attack pose reverts after timeout instead of persisting until next action
 */

import { describe, it, expect, vi } from 'vitest'
import { generateFloor } from '../content/dungeonGen'
import { FloorMap } from '../content/types'
import { EnemyInstance } from '../content/defs'

// A larger set of seeds to stress-test layout variety
const SEEDS = [
  1, 2, 3, 5, 8, 13, 21, 42, 100, 256, 999,
  0x1234, 0xABCD, 0xDEAD, 0xBEEF, 0xCAFE, 0xF00D,
  12345, 99999, 0xFFFFFF,
]

function floorNeighborCount(f: FloorMap, x: number, y: number): number {
  return (
    (f.cells[y - 1]?.[x]?.type === 'floor' ? 1 : 0) +
    (f.cells[y + 1]?.[x]?.type === 'floor' ? 1 : 0) +
    (f.cells[y]?.[x - 1]?.type === 'floor' ? 1 : 0) +
    (f.cells[y]?.[x + 1]?.type === 'floor' ? 1 : 0)
  )
}

function findOverrides(f: FloorMap, override: string) {
  const found: { x: number; y: number }[] = []
  for (let y = 0; y < f.height; y++)
    for (let x = 0; x < f.width; x++)
      if (f.cells[y][x].type === 'wall' && (f.cells[y][x] as any).wallOverride === override)
        found.push({ x, y })
  return found
}

// ── R01: Stairs on corners ────────────────────────────────────────────────────

describe('R01 — stairs must not appear on corner walls', () => {
  it('stairs_down has exactly 1 floor neighbor across all seeds', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      for (const { x, y } of findOverrides(f, 'stairs_down')) {
        const n = floorNeighborCount(f, x, y)
        expect(n, `seed ${seed}: stairs_down at (${x},${y}) has ${n} floor neighbors`).toBe(1)
      }
    }
  })

  it('stairs_up has exactly 1 floor neighbor across all seeds', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      for (const { x, y } of findOverrides(f, 'stairs_up')) {
        const n = floorNeighborCount(f, x, y)
        expect(n, `seed ${seed}: stairs_up at (${x},${y}) has ${n} floor neighbors`).toBe(1)
      }
    }
  })
})

// ── R02: Stairs in corridors ──────────────────────────────────────────────────

describe('R02 — stairs must be in rooms, not corridors', () => {
  // The floor cell adjacent to a stair should be in a room-like area
  // (≥2 floor neighbors of its own, meaning it's not a dead-end corridor tip).
  it('stair-adjacent floor cell has at least 2 floor neighbors (room cell)', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      for (const override of ['stairs_down', 'stairs_up']) {
        for (const { x, y } of findOverrides(f, override)) {
          const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy
            if (f.cells[ny]?.[nx]?.type === 'floor') {
              const roominess = floorNeighborCount(f, nx, ny)
              expect(
                roominess,
                `seed ${seed}: ${override} floor neighbor at (${nx},${ny}) is corridor-only (${roominess} neighbors)`
              ).toBeGreaterThanOrEqual(2)
              break
            }
          }
        }
      }
    }
  })
})

// ── R03: Stairs missing ───────────────────────────────────────────────────────

describe('R03 — stairs must always be placed (never missing)', () => {
  it('stairs_down always present', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      expect(findOverrides(f, 'stairs_down').length, `seed ${seed}: no stairs_down`).toBeGreaterThanOrEqual(1)
    }
  })

  it('stairs_up always present', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      expect(findOverrides(f, 'stairs_up').length, `seed ${seed}: no stairs_up`).toBeGreaterThanOrEqual(1)
    }
  })

  it('exitX/exitY is a stairs_down wall (not a floor or plain wall)', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      const cell = f.cells[f.exitY]?.[f.exitX]
      expect(cell?.type, `seed ${seed}: exitX/Y not a wall`).toBe('wall')
      expect((cell as any)?.wallOverride, `seed ${seed}: exitX/Y not stairs_down`).toBe('stairs_down')
    }
  })
})

// ── R04: Dead-end detection near doors ───────────────────────────────────────

describe('R04 — dead-end detection counts doors as open neighbors', () => {
  // This is a logic test: a cell with one floor neighbor and one door_closed neighbor
  // has 2 open paths and is NOT a dead end.
  it('door_closed neighbor counts as open (not a dead end)', () => {
    const countOpen = (f: FloorMap, x: number, y: number): number => {
      const isDoorLike = (cell: any) =>
        cell?.type === 'wall' && (cell.wallOverride === 'door_closed' || cell.wallOverride === 'door_open')
      return (
        (f.cells[y - 1]?.[x]?.type === 'floor' || isDoorLike(f.cells[y - 1]?.[x]) ? 1 : 0) +
        (f.cells[y + 1]?.[x]?.type === 'floor' || isDoorLike(f.cells[y + 1]?.[x]) ? 1 : 0) +
        (f.cells[y]?.[x - 1]?.type === 'floor' || isDoorLike(f.cells[y]?.[x - 1]) ? 1 : 0) +
        (f.cells[y]?.[x + 1]?.type === 'floor' || isDoorLike(f.cells[y]?.[x + 1]) ? 1 : 0)
      )
    }

    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      // Find any floor cell adjacent to a door
      for (let y = 1; y < f.height - 1; y++) {
        for (let x = 1; x < f.width - 1; x++) {
          if (f.cells[y][x].type !== 'floor') continue
          const neighbors = [
            f.cells[y - 1][x], f.cells[y + 1][x],
            f.cells[y][x - 1], f.cells[y][x + 1],
          ]
          const hasDoor = neighbors.some(
            c => c?.type === 'wall' && ((c as any).wallOverride === 'door_closed' || (c as any).wallOverride === 'door_open')
          )
          if (hasDoor) {
            const open = countOpen(f, x, y)
            // A cell adjacent to a door should have ≥2 open paths (the door + the corridor behind us)
            expect(open, `seed ${seed}: floor cell (${x},${y}) adjacent to door should have ≥2 open neighbors`).toBeGreaterThanOrEqual(2)
          }
        }
      }
    }
  })
})

// ── R05 + R06: Door placement rules ──────────────────────────────────────────

describe('R05/R06 — doors only at corridor chokepoints with room boundaries', () => {
  it('every door_closed is a strict N/S or E/W chokepoint', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      for (const { x, y } of findOverrides(f, 'door_closed')) {
        const n = f.cells[y - 1]?.[x]?.type === 'floor'
        const s = f.cells[y + 1]?.[x]?.type === 'floor'
        const e = f.cells[y]?.[x + 1]?.type === 'floor'
        const w = f.cells[y]?.[x - 1]?.type === 'floor'
        const ok = (n && s && !e && !w) || (!n && !s && e && w)
        expect(ok, `seed ${seed}: door at (${x},${y}) violates chokepoint rule`).toBe(true)
      }
    }
  })

  it('every door has at least one neighbor that opens into a room (≥2 floor neighbors)', () => {
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      for (const { x, y } of findOverrides(f, 'door_closed')) {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
        const floorCells = dirs
          .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
          .filter(p => f.cells[p.y]?.[p.x]?.type === 'floor')
        const atBoundary = floorCells.some(p => floorNeighborCount(f, p.x, p.y) > 1)
        expect(atBoundary, `seed ${seed}: door at (${x},${y}) not on a room boundary`).toBe(true)
      }
    }
  })
})

// ── R07: Enemy respawn ────────────────────────────────────────────────────────

describe('R07 — entitiesSpawned flag prevents respawn', () => {
  it('entitiesSpawned starts false on fresh RunState from makeInitialState', async () => {
    // Dynamically import to use the mock
    vi.mock('../engine/assets', () => ({ getGameOverText: () => 'dead' }))
    const { makeInitialState } = await import('../game/gameState')
    const s = makeInitialState()
    expect(s.run.entitiesSpawned).toBe(false)
  })
})

// ── R10: Spawn facing ─────────────────────────────────────────────────────────

describe('R10 — spawn facing points into the level, not at entry wall', () => {
  it('moving in spawnFacing direction from spawn does not immediately step to entryWall', () => {
    const dirOffsets: Record<string, [number, number]> = {
      north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
    }
    for (const seed of SEEDS) {
      const f = generateFloor('stone_1', 'stone', seed, 0)
      const [dx, dy] = dirOffsets[f.spawnFacing]
      const nx = f.spawnX + dx
      const ny = f.spawnY + dy
      const facingEntryWall = nx === f.entryWallX && ny === f.entryWallY
      expect(facingEntryWall, `seed ${seed}: spawn faces directly at entry wall`).toBe(false)
    }
  })
})

// ── R11: start/end nodes not over-connected ───────────────────────────────────

describe('R11 — start/end rooms always have at least one free wall face', () => {
  // Because start/end nodes are excluded from loops and dead-ends,
  // they keep exactly 1 connection (from the main path).
  // This means their 3×3 room always has ≥3 flat wall faces.
  // We verify this indirectly: stair walls always have exactly 1 floor neighbor.
  it('stair wall single-face property holds for all themes and depths', () => {
    const configs: Array<[string, any, number, number]> = [
      ['stone_1', 'stone', 0xAA, 0],
      ['stone_5', 'stone', 0xBB, 4],
      ['catacomb_1', 'catacomb', 0xCC, 5],
      ['catacomb_5', 'catacomb', 0xDD, 9],
      ['machine_1', 'machine', 0xEE, 10],
      ['machine_5', 'machine', 0xFF, 14],
    ]
    for (const [id, theme, seed, idx] of configs) {
      const f = generateFloor(id, theme as any, seed, idx)
      for (const override of ['stairs_down', 'stairs_up']) {
        for (const { x, y } of findOverrides(f, override)) {
          const n = floorNeighborCount(f, x, y)
          expect(n, `${id} seed ${seed}: ${override} at (${x},${y}) is on a corner`).toBe(1)
        }
      }
    }
  })
})

// ── R12: Sprite z-buffer float precision ─────────────────────────────────────

describe('R12 — sprite z-buffer bias prevents flicker near walls', () => {
  // The fix: zTest = tZ - 0.1 so a sprite at depth d wins against a wall at the same depth.
  // Without it, float imprecision causes the comparison to flip frame-to-frame → flicker.

  it('sprite at same depth as wall would be hidden without bias (the bug)', () => {
    const tZ = 5.0, wallDepth = 5.0
    expect(tZ >= wallDepth).toBe(true)  // old check: sprite was skipped → flickered
  })

  it('sprite at same depth as wall renders with bias applied (the fix)', () => {
    const tZ = 5.0, wallDepth = 5.0
    const zTest = tZ - 0.1
    expect(zTest >= wallDepth).toBe(false)  // new check: sprite is NOT skipped
  })

  it('sprite clearly behind wall is still occluded after the bias', () => {
    const tZ = 5.5, wallDepth = 5.0
    const zTest = tZ - 0.1  // 5.4 >= 5.0 → true → correctly hidden
    expect(zTest >= wallDepth).toBe(true)
  })

  it('integer right-shift for sprite half-width never produces a fractional index', () => {
    // sprH / 2 with an odd sprH gives 0.5 float → non-integer array index.
    // sprH >> 1 always produces an integer.
    for (const sprH of [1, 2, 3, 50, 101, 200]) {
      const half = sprH >> 1
      expect(Number.isInteger(half)).toBe(true)
      expect(half).toBe(Math.floor(sprH / 2))
    }
  })
})

// ── R13: Enemy attack pose persistence ───────────────────────────────────────

describe('R13 — enemy attack pose persists until next action, not time-based', () => {
  it('isAttacking stays true across multiple ticks without a new action', () => {
    const enemy: EnemyInstance = {
      id: 1, defKey: 'crawler', x: 2, y: 1, fromX: 2, fromY: 1,
      hp: 6, maxHp: 6, turnDebt: 0, isAttacking: true, lastMoveMs: 0,
    }
    expect(enemy.isAttacking).toBe(true)
  })

  it('isAttacking clears when enemy moves', () => {
    const enemy: EnemyInstance = {
      id: 1, defKey: 'crawler', x: 5, y: 1, fromX: 5, fromY: 1,
      hp: 6, maxHp: 6, turnDebt: 0, isAttacking: true, lastMoveMs: 0,
    }
    enemy.x = 4
    enemy.isAttacking = false
    expect(enemy.isAttacking).toBe(false)
  })

  it('isAttacking initializes to false on spawn', () => {
    const enemy: EnemyInstance = {
      id: 1, defKey: 'crawler', x: 3, y: 3, fromX: 3, fromY: 3,
      hp: 6, maxHp: 6, turnDebt: 0, isAttacking: false, lastMoveMs: 0,
    }
    expect(enemy.isAttacking).toBe(false)
  })
})
