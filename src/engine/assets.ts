// Texture paths — served from publicDir: assets/ via Vite.
// BASE_URL is '/' in dev and '/ogdc/' in production.
const BASE = import.meta.env.BASE_URL

// ── Wall textures ─────────────────────────────────────────────────────────────
const STONE_PATH    = Array.from({ length: 7  }, (_, i) => `${BASE}walls/stone_${i + 1}.png`)
const CATACOMB_PATH = Array.from({ length: 10 }, (_, i) => `${BASE}walls/catacombs_${i + 1}.png`)
const MACHINE_PATH  = Array.from({ length: 12 }, (_, i) => `${BASE}walls/machinery_${i + 1}.png`)

// ── Floor / ceiling textures ──────────────────────────────────────────────────
const FLOOR_PATHS = Array.from({ length: 8 }, (_, i) => `${BASE}floors/floor_${i + 1}.png`)
const CEIL_PATHS  = Array.from({ length: 8 }, (_, i) => `${BASE}floors/ceiling_${i + 1}.png`)

// ── Door / world textures ─────────────────────────────────────────────────────
const DOOR_CLOSED_PATHS = ['door_closed_1.png','door_closed_2.png','door_closed_3.png']
  .map(f => `${BASE}doors/${f}`)
const DOOR_OPEN_PATHS   = ['door_opened_1.png','door_opened_2.png','door_open_3.png']
  .map(f => `${BASE}doors/${f}`)
const STAIR_DOWN_PATH   = `${BASE}world/stair_down.png`
const STAIR_UP_PATH     = `${BASE}world/stair_up.png`

// ── Enemy sprite paths ────────────────────────────────────────────────────────
// Organised as: ENEMY_SPRITE_PATHS[defKey][phase][frameIdx]
// Phase keys are always 'stand' | 'attack' | 'dead' in code regardless of
// filename convention (some files use 'standing_', mapped here to 'stand').
const E = `${BASE}enemies/`
const ENEMY_SPRITE_PATHS: Record<string, Record<string, string[]>> = {
  crawler: {
    stand:  [1,2,3].map(n => `${E}enemy_crawler_stand_${n}.png`),
    attack: [1,2,3].map(n => `${E}enemy_crawler_attack_${n}.png`),
    dead:   [1,2].map(n =>   `${E}enemy_crawler_dead_${n}.png`),
  },
  shade: {
    stand:  [1,2].map(n => `${E}enemy_shade_stand_${n}.png`),
    attack: [1,2].map(n => `${E}enemy_shade_attack_${n}.png`),
    dead:   [1,2].map(n => `${E}enemy_shade_dead_${n}.png`),
  },
  sentinel: {
    stand:  [1,2,3].map(n => `${E}enemy_sentinel_standing_${n}.png`),
    attack: [1,2].map(n =>   `${E}enemy_sentinel_attack_${n}.png`),
    dead:   [1,2].map(n =>   `${E}enemy_sentinel_dead_${n}.png`),
  },
  revenant: {
    stand:  [1,2,3].map(n => `${E}enemy_revenant_stand_${n}.png`),
    attack: [1,2,3].map(n => `${E}enemy_revenant_attack_${n}.png`),
    dead:   [1,2,3].map(n => `${E}enemy_revenant_dead_${n}.png`),
  },
  boneguard: {
    stand:  [1,2,3].map(n => `${E}enemy_boneguard_standing_${n}.png`),
    attack: [1,2,3].map(n => `${E}enemy_boneguard_attack_${n}.png`),
    dead:   [1,2,3].map(n => `${E}enemy_boneguard_dead_${n}.png`),
  },
}

// ── Item sprite paths ─────────────────────────────────────────────────────────
const ITEM_SPRITE_PATHS: Record<string, string> = {
  potion_sm: `${BASE}items/potion_small.png`,
  potion_lg: `${BASE}items/potion_large.png`,
}


const cache      = new Map<string, HTMLImageElement>()
const pixelCache = new Map<string, TexPixels>()

export interface TexPixels {
  pixels: Uint32Array   // RGBA as Uint32, little-endian (R | G<<8 | B<<16 | A<<24)
  w: number
  h: number
}

// deadend: Map<levelType, string[]>  e.g. 'stone' -> [msg1, msg2, ...]
const deadEndTexts   = new Map<string, string[]>()
// gameover: string[]
const gameOverTexts: string[] = []
// lvldesc: Map<levelId, string[]>   e.g. 'stone_1' -> [msg1, ...]
const lvlDescTexts   = new Map<string, string[]>()

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { cache.set(path, img); resolve(img) }
    img.onerror = () => reject(new Error(`Failed to load: ${path}`))
    img.src = path
  })
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim() })
    return row
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = '' }
    else { cur += ch }
  }
  result.push(cur)
  return result
}

export async function preloadAssets(): Promise<void> {
  const enemySpritePaths = Object.values(ENEMY_SPRITE_PATHS)
    .flatMap(phases => Object.values(phases).flat())

  const all = [
    ...STONE_PATH, ...CATACOMB_PATH, ...MACHINE_PATH,
    ...FLOOR_PATHS, ...CEIL_PATHS,
    ...DOOR_CLOSED_PATHS, ...DOOR_OPEN_PATHS,
    STAIR_DOWN_PATH, STAIR_UP_PATH,
    ...enemySpritePaths,
    ...Object.values(ITEM_SPRITE_PATHS),
  ]
  const imgs = await Promise.all(all.map(loadImage))

  for (const img of imgs) {
    const off = document.createElement('canvas')
    off.width  = img.naturalWidth
    off.height = img.naturalHeight
    const ctx = off.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const id = ctx.getImageData(0, 0, off.width, off.height)
    pixelCache.set(img.src, {
      pixels: new Uint32Array(id.data.buffer),
      w: off.width,
      h: off.height,
    })
  }

  const [deadEndCsv, gameOverCsv, lvlDescCsv] = await Promise.all([
    fetch(`${BASE}data/deadend.csv`).then(r => r.text()),
    fetch(`${BASE}data/gameover.csv`).then(r => r.text()),
    fetch(`${BASE}data/lvldesc.csv`).then(r => r.text()),
  ])

  for (const row of parseCSV(deadEndCsv)) {
    const type = row['Level Type']?.toLowerCase()
    const msg  = row['Message']
    if (type && msg) {
      if (!deadEndTexts.has(type)) deadEndTexts.set(type, [])
      deadEndTexts.get(type)!.push(msg)
    }
  }

  for (const row of parseCSV(gameOverCsv)) {
    if (row['Message']) gameOverTexts.push(row['Message'])
  }

  for (const row of parseCSV(lvlDescCsv)) {
    const lvl = row['Level']
    const msg = row['Message']
    if (lvl && msg) {
      if (!lvlDescTexts.has(lvl)) lvlDescTexts.set(lvl, [])
      lvlDescTexts.get(lvl)!.push(msg)
    }
  }
}

// Deterministic per-cell texture index — same result every visit for (cx, cy)
export function cellTexIndex(cx: number, cy: number, count: number): number {
  return ((cx * 1259 + cy * 2953 + cx * cy * 73) >>> 0) % count
}

function floorHash(floorId: string, seed: number): number {
  let h = seed
  for (const c of floorId) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function getFloorPixels(floorId: string): TexPixels | undefined {
  const path = FLOOR_PATHS[floorHash(floorId, 17) % FLOOR_PATHS.length]
  const img  = cache.get(path)
  return img ? pixelCache.get(img.src) : undefined
}

export function getCeilPixels(floorId: string): TexPixels | undefined {
  const path = CEIL_PATHS[floorHash(floorId, 41) % CEIL_PATHS.length]
  const img  = cache.get(path)
  return img ? pixelCache.get(img.src) : undefined
}

/** Theme-aware wall texture for a given cell coordinate.
 *  Catacomb: 60% stone, 40% catacomb.
 *  Machine:  60% stone, 38% machine, 2% catacomb.
 *  Stone:    100% stone.
 */
export function getWallPixels(cx: number, cy: number, theme: string): TexPixels | undefined {
  let paths: string[]
  if (theme === 'catacomb') {
    const pick = ((cx * 1637 + cy * 3119 + cx * cy * 97) >>> 0) % 100
    paths = pick < 60 ? STONE_PATH : CATACOMB_PATH
  } else if (theme === 'machine') {
    const pick = ((cx * 1637 + cy * 3119 + cx * cy * 97) >>> 0) % 100
    paths = pick < 60 ? STONE_PATH : pick < 98 ? MACHINE_PATH : CATACOMB_PATH
  } else {
    paths = STONE_PATH
  }
  const path = paths[cellTexIndex(cx, cy, paths.length)]
  const img  = cache.get(path)
  return img ? pixelCache.get(img.src) : undefined
}

// Use cell coords to pick door variant deterministically
export function getDoorClosedPixels(cx: number, cy: number): TexPixels | undefined {
  const path = DOOR_CLOSED_PATHS[cellTexIndex(cx, cy, DOOR_CLOSED_PATHS.length)]
  return pixelCache.get(cache.get(path)?.src ?? '')
}
export function getDoorOpenPixels(cx: number, cy: number): TexPixels | undefined {
  const path = DOOR_OPEN_PATHS[cellTexIndex(cx, cy, DOOR_OPEN_PATHS.length)]
  return pixelCache.get(cache.get(path)?.src ?? '')
}
export function getStairDownPixels(): TexPixels | undefined {
  return pixelCache.get(cache.get(STAIR_DOWN_PATH)?.src ?? '')
}
export function getStairUpPixels(): TexPixels | undefined {
  return pixelCache.get(cache.get(STAIR_UP_PATH)?.src ?? '')
}

/**
 * Get pixel data for an enemy sprite.
 * @param defKey   Enemy definition key (e.g. 'crawler', 'sentinel')
 * @param phase    'stand' | 'attack' | 'dead'
 * @param frameIdx 0-based frame index within that phase
 */
export function getEnemySpritePixels(
  defKey: string, phase: string, frameIdx: number
): TexPixels | undefined {
  const paths = ENEMY_SPRITE_PATHS[defKey]?.[phase]
  if (!paths?.length) return undefined
  const path = paths[frameIdx % paths.length]
  return pixelCache.get(cache.get(path)?.src ?? '')
}

export function getItemSpritePixels(defKey: string): TexPixels | undefined {
  const path = ITEM_SPRITE_PATHS[defKey]
  if (!path) return undefined
  return pixelCache.get(cache.get(path)?.src ?? '')
}

export function getDeadEndText(theme: string): string {
  const pool = deadEndTexts.get(theme) ?? []
  if (!pool.length) return ''
  return pool[Math.floor(Math.random() * pool.length)]
}
export function getGameOverText(): string {
  if (!gameOverTexts.length) return 'The darkness takes you.'
  return gameOverTexts[Math.floor(Math.random() * gameOverTexts.length)]
}
export function getLevelDescText(levelId: string): string {
  const pool = lvlDescTexts.get(levelId) ?? []
  if (!pool.length) return ''
  return pool[Math.floor(Math.random() * pool.length)]
}
