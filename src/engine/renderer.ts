import { getCtx } from './canvas'
import { GameState } from '../game/gameState'
import { getCell } from '../systems/mapSystem'
import { Direction } from '../content/types'
import { getStone, getFloorPixels, getCeilPixels } from './assets'
import { CANVAS_W, DUNGEON_H, HORIZON_Y } from '../constants'

// CAM_PLANE = CANVAS_W / (2 * DUNGEON_H) = 640/640 = 1.0
// This gives 90° FOV and ensures wall faces are exactly 1:1 square at every depth.
const CAM_PLANE = CANVAS_W / (2 * DUNGEON_H)   // = 1.0
const MAX_RAY   = 32
const SHADE_END = 8   // cells at which wall reaches full darkness

function dirVec(f: Direction): [number, number] {
  switch (f) {
    case 'north': return [ 0, -1]
    case 'south': return [ 0,  1]
    case 'east':  return [ 1,  0]
    case 'west':  return [-1,  0]
  }
}
function planeVec(f: Direction): [number, number] {
  switch (f) {
    case 'north': return [ CAM_PLANE,  0]
    case 'south': return [-CAM_PLANE,  0]
    case 'east':  return [ 0,  CAM_PLANE]
    case 'west':  return [ 0, -CAM_PLANE]
  }
}

interface Hit {
  dist:  number
  wallX: number   // hit offset within wall face, 0..1, left-to-right from player's view
  side:  0 | 1   // 0 = X-side (E/W wall), 1 = Y-side (N/S wall)
  mapX:  number
  mapY:  number
}

function castRay(
  posX: number, posY: number,
  rdx:  number, rdy:  number,
  floorId: string,
): Hit | null {
  let mx = Math.floor(posX)
  let my = Math.floor(posY)

  const ddx = rdx === 0 ? Infinity : Math.abs(1 / rdx)
  const ddy = rdy === 0 ? Infinity : Math.abs(1 / rdy)
  const sx  = rdx < 0 ? -1 : 1
  const sy  = rdy < 0 ? -1 : 1
  let sdx = rdx < 0 ? (posX - mx) * ddx : (mx + 1 - posX) * ddx
  let sdy = rdy < 0 ? (posY - my) * ddy : (my + 1 - posY) * ddy

  let side: 0 | 1 = 0
  for (let i = 0; i < MAX_RAY; i++) {
    if (sdx < sdy) { sdx += ddx; mx += sx; side = 0 }
    else           { sdy += ddy; my += sy; side = 1 }

    if (getCell(floorId, mx, my).type !== 'floor') {
      const dist = side === 0 ? sdx - ddx : sdy - ddy
      if (dist < 0.0001) return null

      let wallX = side === 0 ? posY + dist * rdy : posX + dist * rdx
      wallX -= Math.floor(wallX)
      if (side === 0 && rdx > 0) wallX = 1 - wallX
      if (side === 1 && rdy < 0) wallX = 1 - wallX

      return { dist, wallX, side, mapX: mx, mapY: my }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Core view renderer.
// posX/posY: floating-point world coords (cell centre = integer + 0.5).
// ─────────────────────────────────────────────────────────────────────────────
function renderView(
  ctx: CanvasRenderingContext2D,
  floorId: string,
  posX: number, posY: number,
  facing: Direction,
): void {
  const [dx, dy] = dirVec(facing)
  const [px, py] = planeVec(facing)

  // ── Floor and ceiling — scanline raycasting into a single ImageData ────────
  // We write every pixel of the 640×320 buffer then putImageData once.
  // Walls are drawn with drawImage ON TOP afterwards, so they're not erased.

  const imgData = ctx.createImageData(CANVAS_W, DUNGEON_H)
  const out     = new Uint32Array(imgData.data.buffer)
  out.fill(0xFF000000)   // opaque black default (horizon gap, no-texture fallback)

  const fPix = getFloorPixels(floorId)
  const cPix = getCeilPixels(floorId)

  // Left / right edge ray directions (camera-plane endpoints)
  const lx = dx - px,  ly = dy - py
  const rx = dx + px,  ry = dy + py

  // Floor  (y > HORIZON_Y)
  if (fPix) {
    const { pixels: fp, w: fw, h: fh } = fPix
    for (let y = HORIZON_Y + 1; y < DUNGEON_H; y++) {
      // rowDist: distance to the floor plane at screen row y.
      // Standard formula: posZ / (y - horizon), posZ = HORIZON_Y (half screen height).
      const rowDist = HORIZON_Y / (y - HORIZON_Y)
      let   fx = posX + rowDist * lx,  fy = posY + rowDist * ly
      const sx = rowDist * (rx - lx) / CANVAS_W
      const sy = rowDist * (ry - ly) / CANVAS_W
      const row = y * CANVAS_W
      for (let x = 0; x < CANVAS_W; x++) {
        const tx = ((Math.floor(fx * fw) % fw) + fw) % fw
        const ty = ((Math.floor(fy * fh) % fh) + fh) % fh
        out[row + x] = fp[ty * fw + tx]
        fx += sx; fy += sy
      }
    }
  }

  // Ceiling  (y < HORIZON_Y) — identical formula, mirrored
  if (cPix) {
    const { pixels: cp, w: cw, h: ch } = cPix
    for (let y = 0; y < HORIZON_Y; y++) {
      const rowDist = HORIZON_Y / (HORIZON_Y - y)
      let   fx = posX + rowDist * lx,  fy = posY + rowDist * ly
      const sx = rowDist * (rx - lx) / CANVAS_W
      const sy = rowDist * (ry - ly) / CANVAS_W
      const row = y * CANVAS_W
      for (let x = 0; x < CANVAS_W; x++) {
        const tx = ((Math.floor(fx * cw) % cw) + cw) % cw
        const ty = ((Math.floor(fy * ch) % ch) + ch) % ch
        out[row + x] = cp[ty * cw + tx]
        fx += sx; fy += sy
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // ── Walls — one DDA ray per screen column, drawn with drawImage ────────────
  // Using drawImage (not putImageData) means only the wall strip pixels change;
  // floor/ceiling pixels outside the strip are untouched.

  for (let x = 0; x < CANVAS_W; x++) {
    const camX = 2 * x / CANVAS_W - 1   // −1 (left) … +1 (right)
    const hit  = castRay(posX, posY, dx + px * camX, dy + py * camX, floorId)
    if (!hit) continue

    const { dist, wallX, side, mapX, mapY } = hit

    const lineH     = DUNGEON_H / dist
    const drawStart = HORIZON_Y - lineH / 2

    const img = getStone(mapX, mapY)
    if (img) {
      const tw = img.naturalWidth  || 640
      const th = img.naturalHeight || 640

      // Horizontal 1:1 — sample a lineH-wide strip centred in the texture,
      // matching the same logic as the vertical crop (srcY0 / srcH).
      // At dist=1 (lineH=320, tw=640): shows centre 320 px (cols 160–480).
      // At dist=0.5 (lineH=640): shows the full texture.
      // At dist=2 (lineH=160): shows the centre 160 px.
      const texCol = Math.max(0, Math.min(tw - 1,
        Math.floor((tw - lineH) / 2 + wallX * lineH)))

      // Vertical: 1:1 pixel mapping — sample as many source rows as dest rows.
      // Centre the crop in the texture so all detail is visible at all distances.
      const srcH  = Math.min(th, Math.ceil(lineH))
      const srcY0 = Math.max(0, Math.floor((th - lineH) / 2))

      // Draw texture strip. Canvas clips drawStart/drawEnd to screen bounds.
      ctx.drawImage(img, texCol, srcY0, 1, srcH, x, drawStart, 1, lineH)
    } else {
      // Fallback: flat shaded colour
      const v = Math.floor(120 * Math.max(0, 1 - dist / SHADE_END))
      ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.84)},${Math.floor(v * 0.62)})`
      ctx.fillRect(x, drawStart, 1, lineH)
    }

    // Distance + side shading overlay (Y-side walls slightly darker for depth cues)
    const sideBonus = side === 1 ? 0.12 : 0
    const shade = Math.min(0.88, Math.max(0, (dist - 0.5) / SHADE_END) + sideBonus)
    if (shade > 0.02) {
      ctx.fillStyle = `rgba(0,0,0,${shade.toFixed(2)})`
      ctx.fillRect(x, drawStart, 1, lineH)
    }
  }

  // Faint horizon rule
  ctx.strokeStyle = '#ffffff18'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(0, HORIZON_Y)
  ctx.lineTo(CANVAS_W, HORIZON_Y)
  ctx.stroke()
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point — handles animation state then calls renderView.
// ─────────────────────────────────────────────────────────────────────────────
export function renderDungeon(state: GameState): void {
  const ctx  = getCtx()
  const run  = state.run
  const anim = run.anim

  let posX   = run.position.x + 0.5
  let posY   = run.position.y + 0.5
  let facing = run.facing
  let translateX = 0

  if (anim) {
    const t = Math.min(1, (performance.now() - anim.startMs) / anim.durationMs)

    if (anim.type === 'forward' || anim.type === 'back') {
      const [fdx, fdy] = dirVec(run.facing)
      const ease   = (1 - t) * (1 - t)
      const offset = anim.type === 'forward' ? ease : -ease
      posX -= fdx * offset
      posY -= fdy * offset

    } else {
      // Directional slide: turn right → old exits left, new enters from right
      const dir = anim.type === 'turn_right' ? 1 : -1
      if (t < 0.5) {
        const p    = t / 0.5
        translateX = -dir * p * p * CANVAS_W
        facing     = anim.prevFacing
      } else {
        const p     = (t - 0.5) / 0.5
        const eased = 1 - (1 - p) * (1 - p)
        translateX  = dir * (1 - eased) * CANVAS_W
      }
    }
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, DUNGEON_H)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, CANVAS_W, DUNGEON_H)
  ctx.clip()
  if (translateX !== 0) ctx.translate(translateX, 0)

  renderView(ctx, run.floorId, posX, posY, facing)

  ctx.restore()
}
