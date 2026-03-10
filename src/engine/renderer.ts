/**
 * Software renderer — one ImageData buffer, written completely each frame.
 *
 * Two passes:
 *   1. Floor + ceiling: per scanline, perspective UV, direct pixel writes.
 *   2. Walls: per screen column, DDA ray cast, per pixel in the wall strip.
 *
 * A single putImageData call blits the finished buffer to the canvas.
 * Turn animation is the only place drawImage is used (slide compositing).
 */

import { getCtx } from './canvas'
import { GameState } from '../game/gameState'
import { getCell } from '../systems/mapSystem'
import { Direction } from '../content/types'
import { getWallPixels, getFloorPixels, getCeilPixels } from './assets'
import { getFloor } from '../content/floors'
import { CANVAS_W, DUNGEON_H, HORIZON_Y } from '../constants'

// ── Constants ────────────────────────────────────────────────────────────────

// CAM_PLANE = CANVAS_W / (2 × DUNGEON_H) = 640/640 = 1.0
// This gives 90° FOV.  At every depth d the wall face is exactly
// (DUNGEON_H/d) × (DUNGEON_H/d) pixels — a perfect square.
const CAM_PLANE = CANVAS_W / (2 * DUNGEON_H)

const MAX_RAY   = 32   // cells a ray will travel before giving up
const SHADE_END = 7    // distance (cells) at which walls reach full black

// ── World-space vectors ──────────────────────────────────────────────────────

// X = east, Y = south.
function dirVec(f: Direction): [number, number] {
  switch (f) {
    case 'north': return [ 0, -1]
    case 'south': return [ 0,  1]
    case 'east':  return [ 1,  0]
    case 'west':  return [-1,  0]
  }
}

// Camera plane — perpendicular to dir, length = CAM_PLANE.
function planeVec(f: Direction): [number, number] {
  switch (f) {
    case 'north': return [ CAM_PLANE,  0]
    case 'south': return [-CAM_PLANE,  0]
    case 'east':  return [ 0,  CAM_PLANE]
    case 'west':  return [ 0, -CAM_PLANE]
  }
}

// ── DDA ray cast ─────────────────────────────────────────────────────────────

interface Hit {
  dist:  number    // perpendicular distance to the wall (fisheye-free)
  wallX: number    // hit position along the face, 0–1, left→right from player
  side:  0 | 1    // 0 = X-aligned wall (E/W face), 1 = Y-aligned (N/S face)
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

  const ddx = Math.abs(rdx) < 1e-10 ? 1e30 : Math.abs(1 / rdx)
  const ddy = Math.abs(rdy) < 1e-10 ? 1e30 : Math.abs(1 / rdy)
  const sx  = rdx < 0 ? -1 : 1
  const sy  = rdy < 0 ? -1 : 1
  let sdx   = rdx < 0 ? (posX - mx) * ddx : (mx + 1 - posX) * ddx
  let sdy   = rdy < 0 ? (posY - my) * ddy : (my + 1 - posY) * ddy

  let side: 0 | 1 = 0

  for (let i = 0; i < MAX_RAY; i++) {
    if (sdx < sdy) { sdx += ddx; mx += sx; side = 0 }
    else           { sdy += ddy; my += sy; side = 1 }

    if (getCell(floorId, mx, my).type !== 'floor') {
      const dist = side === 0 ? sdx - ddx : sdy - ddy
      if (dist < 0.001) return null

      // wallX: fractional hit position on the face, oriented consistently
      // so texture reads left-to-right regardless of which face was struck.
      let wallX = side === 0
        ? posY + dist * rdy
        : posX + dist * rdx
      wallX -= Math.floor(wallX)
      if (side === 0 && rdx > 0) wallX = 1 - wallX
      if (side === 1 && rdy < 0) wallX = 1 - wallX

      return { dist, wallX, side, mapX: mx, mapY: my }
    }
  }
  return null
}

// ── Pixel helpers ────────────────────────────────────────────────────────────

// Pack RGB into a Uint32 as stored in a Uint32Array view of ImageData.
// (Little-endian: R at byte 0, G at byte 1, B at byte 2, A=255 at byte 3.)
function rgba(r: number, g: number, b: number): number {
  return 0xFF000000 | (r & 0xFF) | ((g & 0xFF) << 8) | ((b & 0xFF) << 16)
}

// Apply a 0–1 shade multiplier to a packed pixel.
function shade(px: number, s: number): number {
  if (s <= 0) return px
  const m = 1 - s
  return 0xFF000000
    | Math.floor(( px        & 0xFF) * m)
    | (Math.floor(((px >> 8)  & 0xFF) * m) << 8)
    | (Math.floor(((px >> 16) & 0xFF) * m) << 16)
}

// ── Core render ──────────────────────────────────────────────────────────────

/**
 * Write every pixel of a CANVAS_W × DUNGEON_H frame into `out`.
 *
 * Pass 1 — floor & ceiling:
 *   For each scanline, compute the real-world floor/ceiling coordinate that
 *   maps to that screen row using standard perspective maths, sample the
 *   texture, write the pixel.
 *
 * Pass 2 — walls:
 *   For each screen column, cast a DDA ray.  For each pixel in the
 *   resulting wall strip, sample the texture at the correct 1:1 UV and
 *   overwrite the floor/ceiling pixel already sitting there.
 */
function renderToBuffer(
  out:    Uint32Array,
  floorId: string,
  theme:  string,
  posX:   number,
  posY:   number,
  facing: Direction,
): void {
  const [dx, dy] = dirVec(facing)
  const [px, py] = planeVec(facing)

  const floorPix = getFloorPixels(floorId)
  const ceilPix  = getCeilPixels(floorId)

  // Camera-plane endpoints — used to compute per-scanline ray directions.
  const lx = dx - px,  ly = dy - py   // leftmost ray
  const rx = dx + px,  ry = dy + py   // rightmost ray

  // ── Pass 1 : floor and ceiling ──────────────────────────────────────────
  for (let y = 0; y < DUNGEON_H; y++) {
    const row = y * CANVAS_W

    if (y === HORIZON_Y) {
      // Black gap at the exact horizon line.
      out.fill(0xFF000000, row, row + CANVAS_W)
      continue
    }

    const isFloor = y > HORIZON_Y

    // rowDist: distance to the floor/ceiling plane at this screen row.
    // Derived from: eyeHeight (= 0.5) / projected_y_fraction.
    // eyeHeight * DUNGEON_H = HORIZON_Y, so rowDist = HORIZON_Y / |y - HORIZON_Y|.
    const rowDist = isFloor
      ? HORIZON_Y / (y - HORIZON_Y)
      : HORIZON_Y / (HORIZON_Y - y)

    const src = isFloor ? floorPix : ceilPix

    if (src) {
      const { pixels, w, h } = src
      // World position at the left edge of this scanline.
      let fx = posX + rowDist * lx
      let fy = posY + rowDist * ly
      // Step per pixel: interpolate between left and right ray endpoints.
      const stepX = rowDist * (rx - lx) / CANVAS_W
      const stepY = rowDist * (ry - ly) / CANVAS_W

      for (let x = 0; x < CANVAS_W; x++, fx += stepX, fy += stepY) {
        // Tile the world coordinate into [0, w) and [0, h).
        const tx = ((Math.floor(fx * w) % w) + w) % w
        const ty = ((Math.floor(fy * h) % h) + h) % h
        out[row + x] = pixels[ty * w + tx]
      }
    } else {
      // Fallback solid colour — dark brown floor, near-black ceiling.
      out.fill(isFloor ? rgba(45, 35, 20) : rgba(18, 12, 10), row, row + CANVAS_W)
    }
  }

  // ── Pass 2 : walls ────────────────────────────────────────────────────────
  for (let x = 0; x < CANVAS_W; x++) {
    const camX = 2 * x / CANVAS_W - 1           // −1 (left) … +1 (right)
    const hit  = castRay(posX, posY, dx + px * camX, dy + py * camX, floorId)
    if (!hit) continue

    const { dist, wallX, side, mapX, mapY } = hit

    // Wall strip geometry.
    const lineH   = DUNGEON_H / dist             // face height (= face width, square)
    const wallTop = HORIZON_Y - lineH / 2        // top of strip in screen space

    // Pixel rows to actually write (clamped to the dungeon viewport).
    const pixTop    = Math.max(0, Math.ceil(wallTop))
    const pixBottom = Math.min(DUNGEON_H - 1, Math.floor(wallTop + lineH))
    if (pixBottom < pixTop) continue

    // Distance shading: 0 = full brightness, 1 = black.
    // Y-side walls receive a small extra darkening for a cheap lighting cue.
    const darkFactor = Math.min(1, dist / SHADE_END + (side === 1 ? 0.10 : 0))

    const tex = getWallPixels(mapX, mapY, theme)

    // 1:1 texture sampling — show a lineH × lineH crop from the centre of
    // the texture, matching the square face size at this distance.
    // When lineH > texture dimension we show the whole texture (close walls).
    const tw = tex ? tex.w : 1
    const th = tex ? tex.h : 1

    // Standard UV: wallX (0–1 across face) → texture column.
    // Stable — does not shift with distance.
    const texCol = tex ? Math.max(0, Math.min(tw - 1, Math.floor(wallX * tw))) : 0

    for (let y = pixTop; y <= pixBottom; y++) {
      let px32: number

      if (tex) {
        // Standard UV: strip fraction (0–1 top→bottom) → texture row.
        const stripFrac = (y - wallTop) / lineH
        const texRow    = Math.max(0, Math.min(th - 1, Math.floor(stripFrac * th)))
        px32 = shade(tex.pixels[texRow * tw + texCol], darkFactor)
      } else {
        const v = Math.floor(0x6B * (1 - darkFactor))
        px32 = rgba(v, Math.floor(v * 0.85), Math.floor(v * 0.62))
      }

      out[y * CANVAS_W + x] = px32
    }
  }
}

// ── Pre-allocated buffers ────────────────────────────────────────────────────

// Reuse one ImageData every frame — avoids per-frame GC pressure.
const _imgData  = new ImageData(CANVAS_W, DUNGEON_H)
const _outBuf   = new Uint32Array(_imgData.data.buffer)

// Offscreen canvas — used only during turn-slide animation.
// putImageData ignores ctx transforms, so we render into an offscreen canvas
// then drawImage it onto the main canvas with an x-offset.
let _offCanvas: HTMLCanvasElement | null = null
let _offCtx:    CanvasRenderingContext2D | null = null
let _offData:   ImageData | null = null
let _offBuf:    Uint32Array | null = null

function getOff(): [CanvasRenderingContext2D, ImageData, Uint32Array] {
  if (!_offCanvas) {
    _offCanvas = document.createElement('canvas')
    _offCanvas.width  = CANVAS_W
    _offCanvas.height = DUNGEON_H
    _offCtx   = _offCanvas.getContext('2d')!
    _offData  = new ImageData(CANVAS_W, DUNGEON_H)
    _offBuf   = new Uint32Array(_offData.data.buffer)
  }
  return [_offCtx!, _offData!, _offBuf!]
}

// ── Public entry point ───────────────────────────────────────────────────────

export function renderDungeon(state: GameState): void {
  const ctx   = getCtx()
  const run   = state.run
  const anim  = run.anim
  const theme = getFloor(run.floorId)?.theme ?? 'stone'

  let posX   = run.position.x + 0.5
  let posY   = run.position.y + 0.5
  let facing = run.facing
  let slideX = 0
  let isTurn = false

  if (anim) {
    const t = Math.min(1, (performance.now() - anim.startMs) / anim.durationMs)

    if (anim.type === 'forward' || anim.type === 'back') {
      // Shift the camera position toward the previous cell (ease-out quadratic).
      const [fdx, fdy] = dirVec(run.facing)
      const ease = (1 - t) * (1 - t)
      const off  = anim.type === 'forward' ? ease : -ease
      posX -= fdx * off
      posY -= fdy * off

    } else {
      isTurn = true
      // Turn right: old view exits LEFT, new view enters from RIGHT.
      const dir = anim.type === 'turn_right' ? 1 : -1
      if (t < 0.5) {
        // Exit phase — render the pre-turn direction, slide it out.
        const p = t / 0.5                          // 0 → 1
        slideX  = -dir * p * p * CANVAS_W          // ease-in
        facing  = anim.prevFacing
      } else {
        // Enter phase — render the new direction, slide it in.
        const p     = (t - 0.5) / 0.5             // 0 → 1
        const eased = 1 - (1 - p) * (1 - p)       // ease-out
        slideX      = dir * (1 - eased) * CANVAS_W
        // facing is already run.facing (updated at turn start)
      }
    }
  }

  // Black fill — seen as the slide bars during turn animation.
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, DUNGEON_H)

  if (isTurn) {
    // Render into the offscreen buffer, blit to main canvas with x-offset.
    const [offCtx, offData, offBuf] = getOff()
    renderToBuffer(offBuf, run.floorId, theme, posX, posY, facing)
    offCtx.putImageData(offData, 0, 0)
    ctx.drawImage(_offCanvas!, Math.round(slideX), 0)
  } else {
    // Render directly into the pre-allocated buffer, one putImageData call.
    renderToBuffer(_outBuf, run.floorId, theme, posX, posY, facing)
    ctx.putImageData(_imgData, 0, 0)
  }
}
