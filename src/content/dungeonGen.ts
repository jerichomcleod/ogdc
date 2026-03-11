/**
 * Procedural dungeon generator.
 *
 * Pipeline:
 *   1. generateGraph  — abstract topology (nodes + edges, no positions)
 *   2. layoutGraph    — place nodes on a 2D room-grid via BFS
 *   3. rasterize      — convert to a Cell[][] with carved corridors
 *   4. generateFloor  — wraps all three into a FloorMap
 *
 * Graph structure:
 *   - Main path:   linear chain start → ... → end  (7–14 nodes)
 *   - Wide areas:  1–2 parallel corridor bands alongside a path segment
 *   - POI branches: 2–4 side branches from mid-path nodes
 *   - Loops:       1–3 extra connections creating alternate routes
 *   - Dead ends:   2–4 short dead-end stubs
 */

import { FloorMap, Cell, CellType, FloorTheme, Direction } from './types'

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────

export function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s += 0x6D2B79F5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ri(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1))
}

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Abstract graph ────────────────────────────────────────────────────────────

type NodeRole = 'start' | 'end' | 'poi' | 'normal'

interface GNode {
  id:        number
  role:      NodeRole
  neighbors: Set<number>
}

interface DunGraph {
  nodes:    Map<number, GNode>
  start:    number
  end:      number
  mainPath: number[]
}

function buildGraph(r: () => number): DunGraph {
  const nodes = new Map<number, GNode>()
  let nextId = 0

  function addNode(role: NodeRole): GNode {
    const n: GNode = { id: nextId++, role, neighbors: new Set() }
    nodes.set(n.id, n)
    return n
  }

  function link(a: number, b: number): boolean {
    const na = nodes.get(a)!, nb = nodes.get(b)!
    if (na.neighbors.size >= 4 || nb.neighbors.size >= 4) return false
    if (na.neighbors.has(b)) return false
    na.neighbors.add(b)
    nb.neighbors.add(a)
    return true
  }

  // ── 1. Main path ─────────────────────────────────────────────────────────
  const pathLen = ri(r, 7, 14)
  const mainPath: number[] = []
  for (let i = 0; i < pathLen; i++) {
    const role: NodeRole = i === 0 ? 'start' : i === pathLen - 1 ? 'end' : 'normal'
    mainPath.push(addNode(role).id)
  }
  for (let i = 0; i < mainPath.length - 1; i++) link(mainPath[i], mainPath[i + 1])

  // ── 2. Wide areas: parallel corridor bands alongside a main-path segment ─
  const wideCount = ri(r, 1, 2)
  for (let w = 0; w < wideCount; w++) {
    const lo = 2, hi = mainPath.length - 4
    if (hi < lo) continue
    const segStart = ri(r, lo, hi)
    const segLen   = Math.min(ri(r, 2, 4), mainPath.length - segStart - 1)
    const numRows  = ri(r, 1, 2)

    let prevRow = mainPath.slice(segStart, segStart + segLen)
    for (let row = 0; row < numRows; row++) {
      const rowNodes = Array.from({ length: segLen }, () => addNode('normal').id)
      // Horizontal connections within new row
      for (let col = 0; col < segLen - 1; col++) link(rowNodes[col], rowNodes[col + 1])
      // Cross-connections to previous row
      for (let col = 0; col < segLen; col++) link(prevRow[col], rowNodes[col])
      // Attach ends of new row to main path entry/exit
      if (segStart > 0)                        link(mainPath[segStart - 1],       rowNodes[0])
      if (segStart + segLen < mainPath.length) link(mainPath[segStart + segLen], rowNodes[segLen - 1])
      prevRow = rowNodes
    }
  }

  // ── 3. POI branches (2–4): side branches from mid-path, 2+ from each end ─
  const poiCount = ri(r, 2, 4)
  for (let p = 0; p < poiCount; p++) {
    const candidates = mainPath.filter((_, i) => i >= 2 && i <= mainPath.length - 3)
    if (!candidates.length) continue
    const anchor = candidates[Math.floor(r() * candidates.length)]
    const branchLen = ri(r, 2, 4)
    let prev = anchor
    for (let i = 0; i < branchLen; i++) {
      const n = addNode(i === branchLen - 1 ? 'poi' : 'normal')
      if (!link(prev, n.id)) break
      prev = n.id
    }
  }

  // ── 4. Extra loops (1–3): connect non-adjacent existing nodes ─────────────
  const allNodes = [...nodes.values()]
  const loopCount = ri(r, 1, 3)
  for (let l = 0; l < loopCount; l++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = allNodes[Math.floor(r() * allNodes.length)]
      const b = allNodes[Math.floor(r() * allNodes.length)]
      if (a.id !== b.id && !a.neighbors.has(b.id) && link(a.id, b.id)) break
    }
  }

  // ── 5. Dead ends (2–4): short stubs from any node ────────────────────────
  const deadCount = ri(r, 2, 4)
  const nodeSnap  = [...nodes.values()]
  for (let d = 0; d < deadCount; d++) {
    const anchor = nodeSnap[Math.floor(r() * nodeSnap.length)]
    if (anchor.neighbors.size >= 4) continue
    let prev = anchor.id
    for (let i = 0; i < ri(r, 1, 2); i++) {
      const n = addNode('normal')
      if (!link(prev, n.id)) break
      prev = n.id
    }
  }

  return { nodes, start: mainPath[0], end: mainPath[mainPath.length - 1], mainPath }
}

// ── 2D Layout ─────────────────────────────────────────────────────────────────

interface RoomPos { rx: number; ry: number }

const DIRS4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

function layoutGraph(graph: DunGraph, r: () => number): Map<number, RoomPos> {
  const pos      = new Map<number, RoomPos>()
  const occupied = new Set<string>()
  const queue:   number[] = []
  const visited  = new Set<number>()

  const key = (rx: number, ry: number) => `${rx},${ry}`

  function place(id: number, rx: number, ry: number): void {
    pos.set(id, { rx, ry })
    occupied.add(key(rx, ry))
    queue.push(id)
    visited.add(id)
  }

  const mainPathSet = new Set(graph.mainPath)
  place(graph.start, 0, 0)

  let qi = 0
  while (qi < queue.length) {
    const nodeId = queue[qi++]
    const { rx, ry } = pos.get(nodeId)!
    const node = graph.nodes.get(nodeId)!

    for (const nid of node.neighbors) {
      if (visited.has(nid)) continue
      visited.add(nid)

      // Prefer east for main-path-to-main-path edges, otherwise random
      const dirs = shuffle(DIRS4, r)
      if (mainPathSet.has(nodeId) && mainPathSet.has(nid)) {
        dirs.sort(([dx]) => (dx === 1 ? -1 : 1))
      }

      let placed = false

      // Try distance 1 first
      for (const [ddx, ddy] of dirs) {
        const nx = rx + ddx, ny = ry + ddy
        if (!occupied.has(key(nx, ny))) { place(nid, nx, ny); placed = true; break }
      }

      // Try distance 2–4 (will need a corridor, but that's fine)
      if (!placed) {
        outer: for (const [ddx, ddy] of dirs) {
          for (let d = 2; d <= 5; d++) {
            const nx = rx + ddx * d, ny = ry + ddy * d
            if (!occupied.has(key(nx, ny))) { place(nid, nx, ny); placed = true; break outer }
          }
        }
      }

      // Spiral fallback
      if (!placed) {
        outer2: for (let radius = 1; radius <= 20; radius++) {
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
              const nx = rx + dx, ny = ry + dy
              if (!occupied.has(key(nx, ny))) { place(nid, nx, ny); placed = true; break outer2 }
            }
          }
        }
      }
    }
  }

  return pos
}

// ── Rasterisation ─────────────────────────────────────────────────────────────

// Each room-grid step = STRIDE cells; small rooms have 1-cell gaps for corridors
const STRIDE = 3
const MAP_BORDER = 1

interface RasterResult {
  cells:        Cell[][]
  width:        number
  height:       number
  spawnX:       number   // floor cell adjacent to entryWall
  spawnY:       number
  spawnFacing:  Direction
  exitX:        number   // WALL cell: stairs_down
  exitY:        number
  returnX:      number   // floor cell adjacent to exitX/Y (land here when ascending)
  returnY:      number
  returnFacing: Direction
  entryWallX:   number   // WALL cell: stairs_up (caller may override to town_gate)
  entryWallY:   number
}

function rasterize(graph: DunGraph, positions: Map<number, RoomPos>, r: () => number): RasterResult {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const { rx, ry } of positions.values()) {
    if (rx < minX) minX = rx; if (rx > maxX) maxX = rx
    if (ry < minY) minY = ry; if (ry > maxY) maxY = ry
  }

  const offX  = -minX + MAP_BORDER
  const offY  = -minY + MAP_BORDER
  const cellW = (maxX - minX + 1) * STRIDE + MAP_BORDER * 2
  const cellH = (maxY - minY + 1) * STRIDE + MAP_BORDER * 2

  const cells: Cell[][] = Array.from({ length: cellH }, () =>
    Array.from({ length: cellW }, (): Cell => ({ type: 'wall' as CellType }))
  )

  const toCx = (rx: number) => (rx + offX) * STRIDE
  const toCy = (ry: number) => (ry + offY) * STRIDE

  function setFloor(x: number, y: number): void {
    if (x >= 0 && x < cellW && y >= 0 && y < cellH) cells[y][x] = { type: 'floor' }
  }

  function carveRoom(rx: number, ry: number, halfSize: number): void {
    const ox = toCx(rx), oy = toCy(ry)
    for (let dy = -halfSize; dy <= halfSize; dy++)
      for (let dx = -halfSize; dx <= halfSize; dx++)
        setFloor(ox + dx, oy + dy)
  }

  // L-shaped corridor: horizontal first, then vertical
  function carveCorridor(ax: number, ay: number, bx: number, by: number): void {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx)
    const y0 = Math.min(ay, by), y1 = Math.max(ay, by)
    for (let x = x0; x <= x1; x++) setFloor(x, ay)
    for (let y = y0; y <= y1; y++) setFloor(bx, y)
  }

  // Carve rooms
  for (const [id, { rx, ry }] of positions) {
    const n = graph.nodes.get(id)!
    const hs = (n.role === 'start' || n.role === 'end' || n.role === 'poi') ? 1 : 0
    carveRoom(rx, ry, hs)
  }

  // Carve corridors (each edge once)
  const seen = new Set<string>()
  for (const [id, { rx, ry }] of positions) {
    const node = graph.nodes.get(id)!
    for (const nid of node.neighbors) {
      const ek = id < nid ? `${id}-${nid}` : `${nid}-${id}`
      if (seen.has(ek)) continue
      seen.add(ek)
      const np = positions.get(nid)
      if (!np) continue
      carveCorridor(toCx(rx), toCy(ry), toCx(np.rx), toCy(np.ry))
    }
  }

  const sp = positions.get(graph.start)!
  const ep = positions.get(graph.end)!

  const spawnX = toCx(sp.rx), spawnY = toCy(sp.ry)
  const exitX  = toCx(ep.rx), exitY  = toCy(ep.ry)

  // ── Place doors at corridor chokepoints (~25% chance) ────────────────────
  // A chokepoint is a floor cell with exactly two cardinal floor neighbours
  // that are directly opposite (N+S or E+W) — a pinch-point in a corridor.
  for (let y = 1; y < cellH - 1; y++) {
    for (let x = 1; x < cellW - 1; x++) {
      if (cells[y][x].type !== 'floor') continue
      if (x === spawnX && y === spawnY) continue
      if (x === exitX  && y === exitY)  continue
      const n = cells[y - 1][x].type === 'floor'
      const s = cells[y + 1][x].type === 'floor'
      const e = cells[y][x + 1].type === 'floor'
      const w = cells[y][x - 1].type === 'floor'
      const isChokepoint = (n && s && !e && !w) || (!n && !s && e && w)
      if (isChokepoint && r() < 0.25) {
        cells[y][x] = { type: 'wall', wallOverride: 'door_closed' }
      }
    }
  }

  // ── Place stairs as wall features ────────────────────────────────────────

  interface StairResult {
    wallX: number; wallY: number
    floorX: number; floorY: number
    facing: Direction
  }

  function findWallSlot(
    cx: number, cy: number, hs: number,
    cells: Cell[][], cellW: number, cellH: number
  ): StairResult | null {
    const candidates: StairResult[] = [
      { wallX: cx,      wallY: cy-hs-1, floorX: cx,      floorY: cy-hs, facing: 'north' },
      { wallX: cx+hs+1, wallY: cy,      floorX: cx+hs,   floorY: cy,    facing: 'east'  },
      { wallX: cx,      wallY: cy+hs+1, floorX: cx,      floorY: cy+hs, facing: 'south' },
      { wallX: cx-hs-1, wallY: cy,      floorX: cx-hs,   floorY: cy,    facing: 'west'  },
    ]
    for (const c of candidates) {
      if (
        c.wallX >= 0 && c.wallX < cellW && c.wallY >= 0 && c.wallY < cellH &&
        cells[c.wallY][c.wallX].type === 'wall' &&
        c.floorX >= 0 && c.floorX < cellW && c.floorY >= 0 && c.floorY < cellH &&
        cells[c.floorY][c.floorX].type === 'floor'
      ) return c
    }
    return null
  }

  const spCx = toCx(sp.rx), spCy = toCy(sp.ry)
  const epCx = toCx(ep.rx), epCy = toCy(ep.ry)
  const HS = 1  // halfSize for start/end rooms

  const entrySlot = findWallSlot(spCx, spCy, HS, cells, cellW, cellH)
  const exitSlot  = findWallSlot(epCx, epCy, HS, cells, cellW, cellH)

  if (entrySlot) cells[entrySlot.wallY][entrySlot.wallX] = { type: 'wall', wallOverride: 'stairs_up' }
  if (exitSlot)  cells[exitSlot.wallY][exitSlot.wallX]   = { type: 'wall', wallOverride: 'stairs_down' }

  return {
    cells, width: cellW, height: cellH,
    spawnX:       entrySlot?.floorX ?? spCx,
    spawnY:       entrySlot?.floorY ?? spCy,
    spawnFacing:  entrySlot?.facing ?? 'north',
    exitX:        exitSlot?.wallX ?? epCx,
    exitY:        exitSlot?.wallY ?? epCy,
    returnX:      exitSlot?.floorX ?? epCx,
    returnY:      exitSlot?.floorY ?? epCy,
    returnFacing: exitSlot?.facing ?? 'north',
    entryWallX:   entrySlot?.wallX ?? spCx,
    entryWallY:   entrySlot?.wallY ?? spCy,
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export function generateFloor(id: string, theme: FloorTheme, seed: number, levelIndex: number): FloorMap {
  const r     = makeRng(seed)
  const graph = buildGraph(r)
  const pos   = layoutGraph(graph, r)
  const rast  = rasterize(graph, pos, r)

  const floor: FloorMap = {
    id,
    theme,
    width:        rast.width,
    height:       rast.height,
    cells:        rast.cells,
    spawnX:       rast.spawnX,
    spawnY:       rast.spawnY,
    spawnFacing:  rast.spawnFacing,
    exitX:        rast.exitX,
    exitY:        rast.exitY,
    returnX:      rast.returnX,
    returnY:      rast.returnY,
    returnFacing: rast.returnFacing,
    entryWallX:   rast.entryWallX,
    entryWallY:   rast.entryWallY,
  }

  // Override entry wall for first level: stairs_up → town_gate
  if (levelIndex === 0) {
    floor.cells[floor.entryWallY][floor.entryWallX] = { type: 'wall', wallOverride: 'town_gate' }
  }

  return floor
}
