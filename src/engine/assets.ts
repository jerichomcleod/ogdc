// Texture paths — served from publicDir: assets/ via Vite.
// BASE_URL is '/' in dev and '/ogdc/' in production.
const BASE = import.meta.env.BASE_URL

const STONE_PATH    = Array.from({ length: 7  }, (_, i) => `${BASE}stone_${i + 1}.png`)
const CATACOMB_PATH = Array.from({ length: 10 }, (_, i) => `${BASE}catacombs_${i + 1}.png`)
const MACHINE_PATH  = Array.from({ length: 12 }, (_, i) => `${BASE}machinery_${i + 1}.png`)
const FLOOR_PATHS   = Array.from({ length: 8  }, (_, i) => `${BASE}floor_${i + 1}.png`)
const CEIL_PATHS    = Array.from({ length: 8  }, (_, i) => `${BASE}ceiling_${i + 1}.png`)

const DOOR_CLOSED_PATHS = ['door_closed_1.png','door_closed_2.png','door_closed_3.png'].map(f => `${BASE}${f}`)
const DOOR_OPEN_PATHS   = ['door_opened_1.png','door_opened_2.png','door_open_3.png'].map(f => `${BASE}${f}`)
const STAIR_DOWN_PATH   = `${BASE}stair_down.png`
const STAIR_UP_PATH     = `${BASE}stair_up.png`

const WALL_PATHS_BY_THEME: Record<string, string[]> = {
  stone:    STONE_PATH,
  catacomb: CATACOMB_PATH,
  machine:  MACHINE_PATH,
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
  const all = [
    ...STONE_PATH, ...CATACOMB_PATH, ...MACHINE_PATH,
    ...FLOOR_PATHS, ...CEIL_PATHS,
    ...DOOR_CLOSED_PATHS, ...DOOR_OPEN_PATHS,
    STAIR_DOWN_PATH, STAIR_UP_PATH,
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
    fetch(`${BASE}deadend.csv`).then(r => r.text()),
    fetch(`${BASE}gameover.csv`).then(r => r.text()),
    fetch(`${BASE}lvldesc.csv`).then(r => r.text()),
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

/** Theme-aware wall texture for a given cell coordinate. */
export function getWallPixels(cx: number, cy: number, theme: string): TexPixels | undefined {
  const paths = WALL_PATHS_BY_THEME[theme] ?? STONE_PATH
  const path  = paths[cellTexIndex(cx, cy, paths.length)]
  const img   = cache.get(path)
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
