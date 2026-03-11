/**
 * Tests for dungeonGen.ts — procedural dungeon generation.
 *
 * Covers:
 *  - PRNG determinism and distribution
 *  - FloorMap structural validity
 *  - Stair placement rules (rooms only, no corners)
 *  - Door placement rules (chokepoints only)
 *  - Connectivity (all floor cells reachable from spawn)
 *  - Start/end room protection (start/end nodes keep free wall faces)
 *  - Regressions: stairs in corridors, stairs on corners, stairs missing
 */

import { describe, it, expect } from 'vitest'
import { makeRng, generateFloor } from '../content/dungeonGen'
import { FloorMap, Cell } from '../content/types'

// ── PRNG ──────────────────────────────────────────────────────────────────────

describe('makeRng', () => {
  it('returns values in [0, 1)', () => {
    const r = makeRng(12345)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const r1 = makeRng(99999)
    const r2 = makeRng(99999)
    for (let i = 0; i < 50; i++) expect(r1()).toBe(r2())
  })

  it('produces different sequences for different seeds', () => {
    const r1 = makeRng(1)
    const r2 = makeRng(2)
    const vals1 = Array.from({ length: 20 }, () => r1())
    const vals2 = Array.from({ length: 20 }, () => r2())
    expect(vals1).not.toEqual(vals2)
  })

  it('has reasonable distribution (mean near 0.5)', () => {
    const r = makeRng(777)
    const samples = Array.from({ length: 10000 }, () => r())
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    expect(mean).toBeGreaterThan(0.47)
    expect(mean).toBeLessThan(0.53)
  })
})

// ── FloorMap structural validity ──────────────────────────────────────────────

function makeFloor(seed = 0x1234, id = 'stone_1'): FloorMap {
  return generateFloor(id, 'stone', seed, 0)
}

describe('generateFloor — structure', () => {
  it('produces positive width and height', () => {
    const f = makeFloor()
    expect(f.width).toBeGreaterThan(0)
    expect(f.height).toBeGreaterThan(0)
  })

  it('cells array dimensions match width × height', () => {
    const f = makeFloor()
    expect(f.cells.length).toBe(f.height)
    for (const row of f.cells) expect(row.length).toBe(f.width)
  })

  it('spawnX/spawnY are within bounds', () => {
    const f = makeFloor()
    expect(f.spawnX).toBeGreaterThanOrEqual(0)
    expect(f.spawnX).toBeLessThan(f.width)
    expect(f.spawnY).toBeGreaterThanOrEqual(0)
    expect(f.spawnY).toBeLessThan(f.height)
  })

  it('spawn position is on a floor cell', () => {
    const f = makeFloor()
    expect(f.cells[f.spawnY][f.spawnX].type).toBe('floor')
  })

  it('returnX/returnY are within bounds', () => {
    const f = makeFloor()
    expect(f.returnX).toBeGreaterThanOrEqual(0)
    expect(f.returnX).toBeLessThan(f.width)
    expect(f.returnY).toBeGreaterThanOrEqual(0)
    expect(f.returnY).toBeLessThan(f.height)
  })

  it('return position is on a floor cell', () => {
    const f = makeFloor()
    expect(f.cells[f.returnY][f.returnX].type).toBe('floor')
  })

  it('spawnFacing is a valid direction', () => {
    const f = makeFloor()
    expect(['north', 'south', 'east', 'west']).toContain(f.spawnFacing)
  })

  it('produces deterministic output for same seed', () => {
    const f1 = makeFloor(42)
    const f2 = makeFloor(42)
    expect(f1.width).toBe(f2.width)
    expect(f1.height).toBe(f2.height)
    expect(f1.spawnX).toBe(f2.spawnX)
    expect(f1.spawnY).toBe(f2.spawnY)
  })

  it('produces different layouts for different seeds', () => {
    const f1 = makeFloor(1)
    const f2 = makeFloor(2)
    // At minimum, seeds should produce different spawn/exit positions or sizes
    const different =
      f1.width !== f2.width ||
      f1.height !== f2.height ||
      f1.spawnX !== f2.spawnX ||
      f1.spawnY !== f2.spawnY ||
      f1.exitX !== f2.exitX ||
      f1.exitY !== f2.exitY
    expect(different).toBe(true)
  })

  it('has a minimum number of floor cells', () => {
    const f = makeFloor()
    let count = 0
    for (const row of f.cells) for (const c of row) if (c.type === 'floor') count++
    expect(count).toBeGreaterThan(30)
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function cardinalNeighbors(f: FloorMap, x: number, y: number): Cell[] {
  return [
    f.cells[y - 1]?.[x],
    f.cells[y + 1]?.[x],
    f.cells[y]?.[x - 1],
    f.cells[y]?.[x + 1],
  ].filter(Boolean) as Cell[]
}

function floorNeighborCount(f: FloorMap, x: number, y: number): number {
  return cardinalNeighbors(f, x, y).filter(c => c.type === 'floor').length
}

function findAllOverrides(f: FloorMap, override: string): Array<{ x: number; y: number }> {
  const found: Array<{ x: number; y: number }> = []
  for (let y = 0; y < f.height; y++)
    for (let x = 0; x < f.width; x++)
      if (f.cells[y][x].type === 'wall' && (f.cells[y][x] as any).wallOverride === override)
        found.push({ x, y })
  return found
}

// ── Stair placement ───────────────────────────────────────────────────────────

describe('generateFloor — stair placement', () => {
  const SEEDS = [1, 2, 3, 42, 100, 999, 12345, 0xDEAD, 0xBEEF, 0xCAFE]

  it('stairs_down wall exists in every generated floor', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      const exits = findAllOverrides(f, 'stairs_down')
      expect(exits.length, `seed ${seed}: no stairs_down`).toBeGreaterThanOrEqual(1)
    }
  })

  it('stairs_up wall exists in every generated floor', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      const entries = findAllOverrides(f, 'stairs_up')
      expect(entries.length, `seed ${seed}: no stairs_up`).toBeGreaterThanOrEqual(1)
    }
  })

  it('stair walls have exactly 1 floor neighbor (no corner placement)', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      for (const override of ['stairs_down', 'stairs_up']) {
        for (const { x, y } of findAllOverrides(f, override)) {
          const n = floorNeighborCount(f, x, y)
          expect(
            n,
            `seed ${seed}: ${override} at (${x},${y}) has ${n} floor neighbors (corner)`
          ).toBe(1)
        }
      }
    }
  })

  it('stair floor-neighbor cell is in a room (has 2+ floor neighbors itself)', () => {
    // The floor cell adjacent to a stair should be room-like, not a dead-end corridor
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      for (const override of ['stairs_down', 'stairs_up']) {
        for (const { x, y } of findAllOverrides(f, override)) {
          // Find the one floor neighbor
          const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy
            if (f.cells[ny]?.[nx]?.type === 'floor') {
              const roominess = floorNeighborCount(f, nx, ny)
              expect(
                roominess,
                `seed ${seed}: ${override} adjacent floor at (${nx},${ny}) has only ${roominess} floor neighbors (corridor cell, not room)`
              ).toBeGreaterThanOrEqual(2)
              break
            }
          }
        }
      }
    }
  })

  it('exitX/exitY matches the stairs_down wall position', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      const cell = f.cells[f.exitY]?.[f.exitX]
      expect(cell?.type, `seed ${seed}`).toBe('wall')
      expect((cell as any)?.wallOverride, `seed ${seed}`).toBe('stairs_down')
    }
  })

  it('entryWallX/entryWallY matches the stairs_up wall position', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      const cell = f.cells[f.entryWallY]?.[f.entryWallX]
      expect(cell?.type, `seed ${seed}`).toBe('wall')
      expect((cell as any)?.wallOverride, `seed ${seed}`).toBe('stairs_up')
    }
  })

  it('stairs_down and stairs_up are at different positions', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      expect(
        f.exitX !== f.entryWallX || f.exitY !== f.entryWallY,
        `seed ${seed}: entry and exit stairs at same position`
      ).toBe(true)
    }
  })

  it('spawn position faces away from entry wall (into the level)', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      const dirs: Record<string, [number, number]> = {
        north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
      }
      const [dx, dy] = dirs[f.spawnFacing]
      // Moving in spawnFacing direction from spawn should not immediately hit the entry wall
      const nx = f.spawnX + dx, ny = f.spawnY + dy
      const isEntryWall = nx === f.entryWallX && ny === f.entryWallY
      expect(
        isEntryWall,
        `seed ${seed}: spawnFacing (${f.spawnFacing}) points directly at entry wall`
      ).toBe(false)
    }
  })
})

// ── Door placement ────────────────────────────────────────────────────────────

describe('generateFloor — door placement', () => {
  const SEEDS = [1, 2, 3, 42, 100, 999, 12345]

  it('all doors are at corridor chokepoints (exactly 2 opposite floor neighbors)', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      for (const override of ['door_closed']) {
        for (const { x, y } of findAllOverrides(f, override)) {
          const n = f.cells[y - 1]?.[x]?.type === 'floor'
          const s = f.cells[y + 1]?.[x]?.type === 'floor'
          const e = f.cells[y]?.[x + 1]?.type === 'floor'
          const w = f.cells[y]?.[x - 1]?.type === 'floor'
          const isNS = n && s && !e && !w
          const isEW = !n && !s && e && w
          expect(
            isNS || isEW,
            `seed ${seed}: door at (${x},${y}) not a corridor chokepoint — neighbors N:${n} S:${s} E:${e} W:${w}`
          ).toBe(true)
        }
      }
    }
  })

  it('doors are at room/corridor boundaries (at least one neighbor has 2+ floor neighbors)', () => {
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      for (const { x, y } of findAllOverrides(f, 'door_closed')) {
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
        const floorNeighborCells = dirs
          .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
          .filter(p => f.cells[p.y]?.[p.x]?.type === 'floor')
        const atBoundary = floorNeighborCells.some(p => floorNeighborCount(f, p.x, p.y) > 1)
        expect(
          atBoundary,
          `seed ${seed}: door at (${x},${y}) is floating inside a plain corridor with no room boundary`
        ).toBe(true)
      }
    }
  })

  it('no door appears inside a room (all neighbors open)', () => {
    // A door inside a room would have 3+ floor neighbors
    for (const seed of SEEDS) {
      const f = makeFloor(seed)
      for (const { x, y } of findAllOverrides(f, 'door_closed')) {
        const n = floorNeighborCount(f, x, y)
        expect(n, `seed ${seed}: door at (${x},${y}) has ${n} floor neighbors (inside room)`).toBeLessThanOrEqual(2)
      }
    }
  })
})

// ── Connectivity ──────────────────────────────────────────────────────────────

describe('generateFloor — connectivity', () => {
  function reachableFromSpawn(f: FloorMap): Set<string> {
    const visited = new Set<string>()
    const queue: Array<[number, number]> = [[f.spawnX, f.spawnY]]
    visited.add(`${f.spawnX},${f.spawnY}`)
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
    while (queue.length) {
      const [cx, cy] = queue.shift()!
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy
        const key = `${nx},${ny}`
        if (visited.has(key)) continue
        const cell = f.cells[ny]?.[nx]
        if (!cell) continue
        // Passable: floor, door_open, door_closed (openable), stairs (passable by walking)
        if (cell.type === 'floor' ||
            (cell.type === 'wall' && ['door_closed','door_open','stairs_down','stairs_up','town_gate'].includes((cell as any).wallOverride ?? ''))) {
          visited.add(key)
          queue.push([nx, ny])
        }
      }
    }
    return visited
  }

  it('exit (stairs_down) is reachable from spawn', () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const f = makeFloor(seed)
      const reachable = reachableFromSpawn(f)
      expect(
        reachable.has(`${f.exitX},${f.exitY}`),
        `seed ${seed}: exit at (${f.exitX},${f.exitY}) not reachable from spawn`
      ).toBe(true)
    }
  })

  it('entry wall (stairs_up) is reachable from spawn', () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const f = makeFloor(seed)
      const reachable = reachableFromSpawn(f)
      expect(
        reachable.has(`${f.entryWallX},${f.entryWallY}`),
        `seed ${seed}: entry wall not reachable`
      ).toBe(true)
    }
  })

  it('all floor cells are connected to spawn', () => {
    for (const seed of [1, 42]) {
      const f = makeFloor(seed)
      const reachable = reachableFromSpawn(f)
      for (let y = 0; y < f.height; y++) {
        for (let x = 0; x < f.width; x++) {
          if (f.cells[y][x].type === 'floor') {
            expect(
              reachable.has(`${x},${y}`),
              `seed ${seed}: floor cell (${x},${y}) not reachable from spawn`
            ).toBe(true)
          }
        }
      }
    }
  })
})

// ── Theme variants ────────────────────────────────────────────────────────────

describe('generateFloor — themes', () => {
  it('generates valid catacomb floors', () => {
    const f = generateFloor('catacomb_1', 'catacomb', 0xABCD, 5)
    expect(f.width).toBeGreaterThan(0)
    expect(f.cells[f.spawnY][f.spawnX].type).toBe('floor')
    expect(findAllOverrides(f, 'stairs_down').length).toBeGreaterThanOrEqual(1)
  })

  it('generates valid machine floors', () => {
    const f = generateFloor('machine_3', 'machine', 0xFADE, 10)
    expect(f.width).toBeGreaterThan(0)
    expect(f.cells[f.spawnY][f.spawnX].type).toBe('floor')
    expect(findAllOverrides(f, 'stairs_down').length).toBeGreaterThanOrEqual(1)
  })
})
