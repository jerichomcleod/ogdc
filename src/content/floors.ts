import { FloorMap, FloorTheme } from './types'
import { generateFloor } from './dungeonGen'

// ── Level sequence: 5 depths × 3 themes = 15 levels ─────────────────────────

export type LevelId =
  | 'stone_1'    | 'stone_2'    | 'stone_3'    | 'stone_4'    | 'stone_5'
  | 'catacomb_1' | 'catacomb_2' | 'catacomb_3' | 'catacomb_4' | 'catacomb_5'
  | 'machine_1'  | 'machine_2'  | 'machine_3'  | 'machine_4'  | 'machine_5'

export const LEVEL_SEQUENCE: LevelId[] = [
  'stone_1',    'stone_2',    'stone_3',    'stone_4',    'stone_5',
  'catacomb_1', 'catacomb_2', 'catacomb_3', 'catacomb_4', 'catacomb_5',
  'machine_1',  'machine_2',  'machine_3',  'machine_4',  'machine_5',
]

function levelTheme(id: LevelId): FloorTheme {
  if (id.startsWith('stone'))    return 'stone'
  if (id.startsWith('catacomb')) return 'catacomb'
  return 'machine'
}

// ── Dungeon registry — regenerated per world seed ─────────────────────────────

let worldSeed = 0x4F63_4443   // default seed ("OgDC" in ASCII)
const floorCache = new Map<string, FloorMap>()

/** Call on town exit — clears cached floors so every level regenerates. */
export function regenerateDungeons(newSeed: number): void {
  worldSeed = newSeed
  floorCache.clear()
}

/** Returns a lazily-generated, cached FloorMap for the given level id. */
export function getFloor(id: string): FloorMap | undefined {
  if (floorCache.has(id)) return floorCache.get(id)
  const idx = LEVEL_SEQUENCE.indexOf(id as LevelId)
  if (idx === -1) return undefined
  const theme = levelTheme(id as LevelId)
  const seed  = (worldSeed + idx * 0x3A7) >>> 0
  const floor = generateFloor(id, theme, seed, idx)
  floorCache.set(id, floor)
  return floor
}

// Proxy so existing code using FLOORS[id] continues to work
export const FLOORS: Record<string, FloorMap> = new Proxy({} as Record<string, FloorMap>, {
  get(_t, prop: string) { return getFloor(prop) },
})
