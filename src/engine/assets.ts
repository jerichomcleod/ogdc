// Texture paths — served from publicDir: assets/ via Vite.
// BASE_URL is '/' in dev and '/ogdc/' in production.
const BASE = import.meta.env.BASE_URL

const STONE_PATH    = Array.from({ length: 7  }, (_, i) => `${BASE}stone_${i + 1}.png`)
const CATACOMB_PATH = Array.from({ length: 10 }, (_, i) => `${BASE}catacombs_${i + 1}.png`)
const MACHINE_PATH  = Array.from({ length: 12 }, (_, i) => `${BASE}machinery_${i + 1}.png`)
const FLOOR_PATHS   = Array.from({ length: 8  }, (_, i) => `${BASE}floor_${i + 1}.png`)
const CEIL_PATHS    = Array.from({ length: 8  }, (_, i) => `${BASE}ceiling_${i + 1}.png`)

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

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { cache.set(path, img); resolve(img) }
    img.onerror = () => reject(new Error(`Failed to load: ${path}`))
    img.src = path
  })
}

export async function preloadAssets(): Promise<void> {
  const all = [
    ...STONE_PATH, ...CATACOMB_PATH, ...MACHINE_PATH,
    ...FLOOR_PATHS, ...CEIL_PATHS,
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
