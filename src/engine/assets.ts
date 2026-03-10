// Texture paths — served from publicDir: assets/ via Vite
const STONE_PATHS = Array.from({ length: 7 }, (_, i) => `/stone_${i + 1}.png`)
const FLOOR_PATHS = Array.from({ length: 8 }, (_, i) => `/floor_${i + 1}.png`)
const CEIL_PATHS  = Array.from({ length: 8 }, (_, i) => `/ceiling_${i + 1}.png`)

const cache = new Map<string, HTMLImageElement>()

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { cache.set(path, img); resolve(img) }
    img.onerror = () => reject(new Error(`Failed to load: ${path}`))
    img.src = path
  })
}

export async function preloadAssets(): Promise<void> {
  const all = [...STONE_PATHS, ...FLOOR_PATHS, ...CEIL_PATHS]
  await Promise.all(all.map(loadImage))
}

// Deterministic per-cell texture index — same result every visit for a given (cx, cy)
export function cellTexIndex(cx: number, cy: number, count: number): number {
  return ((cx * 1259 + cy * 2953 + cx * cy * 73) >>> 0) % count
}

export function getStone(cx: number, cy: number): HTMLImageElement | undefined {
  return cache.get(STONE_PATHS[cellTexIndex(cx, cy, STONE_PATHS.length)])
}

function floorHash(floorId: string, seed: number): number {
  let h = seed
  for (const c of floorId) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function getFloorTex(floorId: string): HTMLImageElement | undefined {
  return cache.get(FLOOR_PATHS[floorHash(floorId, 17) % FLOOR_PATHS.length])
}

export function getCeilTex(floorId: string): HTMLImageElement | undefined {
  return cache.get(CEIL_PATHS[floorHash(floorId, 41) % CEIL_PATHS.length])
}
