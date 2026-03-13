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
import { getWallPixels, getFloorPixels, getCeilPixels, getDoorClosedPixels, getDoorOpenPixels, getStairDownPixels, getStairUpPixels, getPortalPixels, getEnemySpritePixels, getItemSpritePixels, TexPixels } from './assets'
import { getFloor } from '../content/floors'
import { getEnemyDef, getItemDef } from '../content/defs'
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

interface CastResult {
  hit:      Hit | null
  doorHits: Hit[]   // open-door cells the ray passed through, back-to-front order
}

function castRay(
  posX: number, posY: number,
  rdx:  number, rdy:  number,
  floorId: string,
): CastResult {
  let mx = Math.floor(posX)
  let my = Math.floor(posY)

  const ddx = Math.abs(rdx) < 1e-10 ? 1e30 : Math.abs(1 / rdx)
  const ddy = Math.abs(rdy) < 1e-10 ? 1e30 : Math.abs(1 / rdy)
  const sx  = rdx < 0 ? -1 : 1
  const sy  = rdy < 0 ? -1 : 1
  let sdx   = rdx < 0 ? (posX - mx) * ddx : (mx + 1 - posX) * ddx
  let sdy   = rdy < 0 ? (posY - my) * ddy : (my + 1 - posY) * ddy

  let side: 0 | 1 = 0
  const doorHits: Hit[] = []

  function makeHit(dist: number): Hit {
    let wallX = side === 0 ? posY + dist * rdy : posX + dist * rdx
    wallX -= Math.floor(wallX)
    if (side === 0 && rdx > 0) wallX = 1 - wallX
    if (side === 1 && rdy < 0) wallX = 1 - wallX
    return { dist, wallX, side, mapX: mx, mapY: my }
  }

  for (let i = 0; i < MAX_RAY; i++) {
    if (sdx < sdy) { sdx += ddx; mx += sx; side = 0 }
    else           { sdy += ddy; my += sy; side = 1 }

    const cell = getCell(floorId, mx, my)
    if (cell.type === 'floor') continue

    const dist = side === 0 ? sdx - ddx : sdy - ddy
    if (dist < 0.001) return { hit: null, doorHits }

    if (cell.wallOverride === 'door_open') {
      // Record for rendering but continue the ray through
      doorHits.push(makeHit(dist))
      continue
    }

    return { hit: makeHit(dist), doorHits }
  }
  return { hit: null, doorHits }
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

export interface Sprite {
  wx:      number         // world X (cell centre = x + 0.5)
  wy:      number         // world Y
  color:   number         // fallback packed Uint32 (used when no pixels)
  scaleH:  number         // height as fraction of wall face at same distance (1 = full)
  offY:    number         // vertical offset as fraction (+ = down toward floor)
  pixels?: TexPixels      // optional texture; if present, overrides solid color
}

// Pre-allocated z-buffer (one entry per screen column, filled each wall pass)
const _zBuf = new Float32Array(CANVAS_W)

/**
 * Write every pixel of a CANVAS_W × DUNGEON_H frame into `out`.
 *
 * Pass 1 — floor & ceiling scanlines.
 * Pass 2 — walls (DDA ray cast); fills _zBuf with perpendicular depth.
 * Pass 3 — sprites (enemies / items), z-buffered against walls.
 */
function renderToBuffer(
  out:     Uint32Array,
  floorId: string,
  theme:   string,
  posX:    number,
  posY:    number,
  facing:  Direction,
  sprites: Sprite[],
): void {
  const [dx, dy] = dirVec(facing)
  const [px, py] = planeVec(facing)

  const floorPix = getFloorPixels(floorId)
  const ceilPix  = getCeilPixels(floorId)

  const lx = dx - px,  ly = dy - py
  const rx = dx + px,  ry = dy + py

  // ── Pass 1 : floor and ceiling ───────────────────────────────────────────
  for (let y = 0; y < DUNGEON_H; y++) {
    const row = y * CANVAS_W
    if (y === HORIZON_Y) { out.fill(0xFF000000, row, row + CANVAS_W); continue }

    const isFloor  = y > HORIZON_Y
    const rowDist  = isFloor ? HORIZON_Y / (y - HORIZON_Y) : HORIZON_Y / (HORIZON_Y - y)
    const src      = isFloor ? floorPix : ceilPix
    const darkFrac = Math.min(1, rowDist / SHADE_END)

    if (src) {
      const { pixels, w, h } = src
      let fx = posX + rowDist * lx
      let fy = posY + rowDist * ly
      const stepX = rowDist * (rx - lx) / CANVAS_W
      const stepY = rowDist * (ry - ly) / CANVAS_W
      for (let x = 0; x < CANVAS_W; x++, fx += stepX, fy += stepY) {
        const tx  = ((Math.floor(fx * w) % w) + w) % w
        const ty  = ((Math.floor(fy * h) % h) + h) % h
        out[row + x] = shade(pixels[ty * w + tx], darkFrac)
      }
    } else {
      const base = isFloor ? rgba(45, 35, 20) : rgba(18, 12, 10)
      out.fill(shade(base, darkFrac), row, row + CANVAS_W)
    }
  }

  // ── Pass 2 : walls ────────────────────────────────────────────────────────
  _zBuf.fill(MAX_RAY)

  for (let x = 0; x < CANVAS_W; x++) {
    const camX = 2 * x / CANVAS_W - 1
    const { hit, doorHits } = castRay(posX, posY, dx + px * camX, dy + py * camX, floorId)

    // ── Solid wall ───────────────────────────────────────────────────────────
    if (hit) {
    const { dist, wallX, side, mapX, mapY } = hit
    _zBuf[x] = dist

    const lineH   = DUNGEON_H / dist
    const wallTop = HORIZON_Y - lineH / 2
    const pixTop    = Math.max(0, Math.ceil(wallTop))
    const pixBottom = Math.min(DUNGEON_H - 1, Math.floor(wallTop + lineH))
    if (pixBottom < pixTop) continue

    const darkFactor = Math.min(1, dist / SHADE_END + (side === 1 ? 0.10 : 0))

    // Wall override — pick texture based on cell override
    const cellOver     = getCell(floorId, mapX, mapY).wallOverride
    const isDoorClosed = cellOver === 'door_closed' || cellOver === 'door_locked'
    const isStairsDown = cellOver === 'stairs_down'
    const isStairsUp   = cellOver === 'stairs_up'
    const isTownGate   = cellOver === 'town_gate'

    let tex: ReturnType<typeof getWallPixels>
    if (isDoorClosed)      tex = getDoorClosedPixels(mapX, mapY)
    else if (isStairsDown) tex = getStairDownPixels()
    else if (isStairsUp)   tex = getStairUpPixels()
    else                   tex = getWallPixels(mapX, mapY, theme)

    const tw       = tex ? tex.w : 1
    const th       = tex ? tex.h : 1
    const texCol   = tex ? Math.max(0, Math.min(tw - 1, Math.floor(wallX * tw))) : 0
    // Doors and stairs use transparent PNGs — skip fully-transparent pixels
    const hasAlpha = isDoorClosed || isStairsDown || isStairsUp

    for (let y = pixTop; y <= pixBottom; y++) {
      let px32: number

      if (tex) {
        const stripFrac = (y - wallTop) / lineH
        const texRow    = Math.max(0, Math.min(th - 1, Math.floor(stripFrac * th)))
        const raw       = tex.pixels[texRow * tw + texCol]
        // Skip transparent pixels so floor/ceiling behind shows through
        if (hasAlpha && (raw >>> 24) < 128) continue
        px32 = shade(raw, darkFactor)
      } else {
        const v = Math.floor(0x6B * (1 - darkFactor))
        px32 = rgba(v, Math.floor(v * 0.85), Math.floor(v * 0.62))
      }

      if (isTownGate) {
        const r8 = Math.min(255, Math.floor(( px32        & 0xFF) * 1.6))
        const g8 = Math.min(255, Math.floor(((px32 >>  8) & 0xFF) * 1.2))
        const b8 =               Math.floor(((px32 >> 16) & 0xFF) * 0.3)
        px32 = 0xFF000000 | r8 | (g8 << 8) | (b8 << 16)
      }

      out[y * CANVAS_W + x] = px32
    }
    } // end if (hit)

    // ── Open doors — alpha-blended over whatever the ray found behind ─────────
    for (const dHit of doorHits) {
      if (dHit.dist >= _zBuf[x]) continue  // behind a solid wall
      const tex = getDoorOpenPixels(dHit.mapX, dHit.mapY)
      if (!tex) continue

      const df      = Math.min(1, dHit.dist / SHADE_END + (dHit.side === 1 ? 0.10 : 0))
      const lineH   = DUNGEON_H / dHit.dist
      const wallTop = HORIZON_Y - lineH / 2
      const pixTop  = Math.max(0,          Math.ceil(wallTop))
      const pixBot  = Math.min(DUNGEON_H - 1, Math.floor(wallTop + lineH))
      const texCol  = Math.max(0, Math.min(tex.w - 1, Math.floor(dHit.wallX * tex.w)))

      for (let y = pixTop; y <= pixBot; y++) {
        const texRow = Math.max(0, Math.min(tex.h - 1, Math.floor((y - wallTop) / lineH * tex.h)))
        const raw    = tex.pixels[texRow * tex.w + texCol]
        const alpha  = (raw >>> 24) & 0xFF
        if (alpha < 16) continue
        const a   = alpha / 255
        const src = shade(raw, df)
        const dst = out[y * CANVAS_W + x]
        const r8  = Math.floor(((src       ) & 0xFF) * a + ((dst       ) & 0xFF) * (1 - a))
        const g8  = Math.floor(((src >>  8) & 0xFF) * a + ((dst >>  8) & 0xFF) * (1 - a))
        const b8  = Math.floor(((src >> 16) & 0xFF) * a + ((dst >> 16) & 0xFF) * (1 - a))
        out[y * CANVAS_W + x] = 0xFF000000 | r8 | (g8 << 8) | (b8 << 16)
      }
    }
  }

  // ── Pass 3 : sprites ──────────────────────────────────────────────────────
  if (!sprites.length) return

  // Inverse camera matrix (invDet = 1 since CAM_PLANE = 1)
  const invDet = 1 / (px * dy - dx * py)

  // Sort back-to-front so overlapping sprites paint correctly
  const sorted = sprites
    .map(s => {
      const relX = s.wx - posX, relY = s.wy - posY
      return { s, relX, relY, dist2: relX * relX + relY * relY }
    })
    .sort((a, b) => b.dist2 - a.dist2)

  for (const { s, relX, relY } of sorted) {
    const tX =  invDet * ( dy * relX -  dx * relY)  // horizontal in camera space
    const tZ =  invDet * (-py * relX +  px * relY)  // depth (positive = in front)
    if (tZ <= 0.1) continue

    const screenCX = Math.floor(CANVAS_W / 2 * (1 + tX / tZ))
    const faceH    = DUNGEON_H / tZ                       // face height at this depth
    const sprH     = Math.floor(faceH * s.scaleH)
    const half     = sprH >> 1  // integer half-width/height avoids float column drift

    const screenCY  = HORIZON_Y + Math.floor(faceH * s.offY)
    const spriteL   = screenCX - half   // true left edge (may be off-screen)
    const spriteT   = screenCY - half   // true top  edge (may be off-screen)
    const fullSpan  = half << 1         // = 2 * half

    const drawT    = Math.max(0,          screenCY - half)
    const drawB    = Math.min(DUNGEON_H - 1, screenCY + half)
    const drawL    = Math.max(0,          screenCX - half)
    const drawR    = Math.min(CANVAS_W - 1, screenCX + half)

    // Z-bias: sprites within 0.1 cells of a wall win the depth test so they
    // don't flicker when standing adjacent to a wall (float precision issue).
    const zTest    = tZ - 0.1
    const darkFrac = Math.min(1, tZ / SHADE_END)

    const tex = s.pixels
    for (let sx = drawL; sx <= drawR; sx++) {
      if (zTest >= _zBuf[sx]) continue  // behind wall
      if (tex) {
        // U mapped against full sprite extent so partial off-screen clips correctly
        const u = Math.floor(((sx - spriteL) / Math.max(1, fullSpan)) * tex.w)
        for (let sy = drawT; sy <= drawB; sy++) {
          const v    = Math.floor(((sy - spriteT) / Math.max(1, fullSpan)) * tex.h)
          const raw  = tex.pixels[v * tex.w + u] ?? 0
          const a    = (raw >>> 24) & 0xFF
          if (a < 128) continue   // transparent pixel
          out[sy * CANVAS_W + sx] = shade(raw, darkFrac)
        }
      } else {
        // Solid colour fallback with distance fade
        const shaded = shade(s.color, darkFrac)
        for (let sy = drawT; sy <= drawB; sy++) {
          out[sy * CANVAS_W + sx] = shaded
        }
      }
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
  const floor = getFloor(run.floorId)
  const theme = floor?.theme ?? 'stone'

  const now   = performance.now()

  // Pick the correct sprite pixels for a live enemy.
  // Always frame 0 (_1 sprite). Phase set by enemy's persistent isAttacking flag.
  function enemyPixels(defKey: string, isAttacking: boolean): TexPixels | undefined {
    return getEnemySpritePixels(defKey, isAttacking ? 'attack' : 'stand', 0)
  }

  // Each enemy has its own animation timer (lastMoveMs) so animations run to
  // completion independently — no global reset that snaps positions mid-move.
  const ENEMY_MOVE_MS = 250

  // Build sprite list from enemies + corpses + items + portal on the current floor
  const sprites: Sprite[] = [
    // Portal sprite
    ...(floor?.portalX !== undefined ? [{
      wx: floor.portalX! + 0.5,
      wy: floor.portalY! + 0.5,
      color: 0xFFE09618 as number,
      scaleH: 0.85,
      offY:   0.505 - 0.85 / 2,
      pixels: getPortalPixels(),
    }] : []),
    ...run.enemies.map(e => {
      const rawT   = Math.min(1, (now - e.lastMoveMs) / ENEMY_MOVE_MS)
      const eT     = rawT * rawT * (3 - 2 * rawT)   // smoothstep
      const liveScale = e.defKey === 'behemoth' ? 1.375 : 1.0
      // Adjust offY so the behemoth's feet land on the same floor line as other
      // enemies regardless of scale: offY = (normal offY + normal scaleH/2) - scaledH/2
      const offY = 0.505 - (0.65 * liveScale) / 2
      return {
        wx: e.fromX + (e.x - e.fromX) * eT + 0.5,
        wy: e.fromY + (e.y - e.fromY) * eT + 0.5,
        color: (getEnemyDef(e.defKey)?.color ?? 0xFF00FFFF),
        scaleH: 0.65 * liveScale, offY,
        pixels: enemyPixels(e.defKey, e.isAttacking),
      }
    }),
    ...run.corpses.map(c => {
      const deadScale = c.defKey === 'behemoth' ? 0.9 : 1.0
      return {
        wx: c.x + 0.5, wy: c.y + 0.5,
        color: (getEnemyDef(c.defKey)?.color ?? 0xFF404040),
        scaleH: 0.72 * deadScale, offY: 0.22,
        pixels: getEnemySpritePixels(c.defKey, 'dead', 0),
      }
    }),
    // Group items by cell so stacked drops can be spread apart
    ...((): Sprite[] => {
      const byCell = new Map<string, number[]>()
      run.items.forEach((it, i) => {
        const k = `${it.x},${it.y}`
        if (!byCell.has(k)) byCell.set(k, [])
        byCell.get(k)!.push(i)
      })
      return run.items.map((it, i) => {
        const def     = getItemDef(it.defKey)
        const isGear  = def?.slot === 'weapon' || def?.slot === 'armor' || def?.slot === 'shield' || def?.key === 'gold_coin'
        // Stable per-item bob variation (phase + speed differ by id)
        const phase   = (it.id * 2.399) % (Math.PI * 2)   // golden-angle spread
        const speed   = 480 + (it.id % 7) * 30             // 480–660 ms
        const bob     = isGear ? Math.sin(performance.now() / speed + phase) * 0.04 : 0
        // Spread items sharing a cell in a small circle
        const group   = byCell.get(`${it.x},${it.y}`)!
        const gIdx    = group.indexOf(i)
        const gSize   = group.length
        const radius  = gSize > 1 ? Math.min(0.24, 0.10 * gSize) : 0
        const angle   = gSize > 1 ? (gIdx / gSize) * Math.PI * 2 : 0
        return {
          wx: it.x + 0.5 + Math.cos(angle) * radius,
          wy: it.y + 0.5 + Math.sin(angle) * radius,
          color: (def?.color ?? 0xFF00FF00),
          scaleH: isGear ? (def?.key === 'gold_coin' ? 0.16 : 0.65) : 0.5,
          offY:   isGear ? 0.13 + bob : 0.30,
          pixels: getItemSpritePixels(it.defKey),
        }
      })
    })(),
  ]

  let posX   = run.position.x + 0.5
  let posY   = run.position.y + 0.5
  let facing = run.facing
  let slideX = 0
  let isTurn = false

  if (anim) {
    const t = Math.min(1, (performance.now() - anim.startMs) / anim.durationMs)

    if (anim.type === 'forward' || anim.type === 'back') {
      // Slide the camera from the old cell to the new cell (ease-out quadratic).
      // For forward: camera offsets backward from destination → slides forward.
      // For back: camera offsets forward from destination → slides backward.
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
    renderToBuffer(offBuf, run.floorId, theme, posX, posY, facing, sprites)
    offCtx.putImageData(offData, 0, 0)
    ctx.drawImage(_offCanvas!, Math.round(slideX), 0)
  } else {
    // Render directly into the pre-allocated buffer, one putImageData call.
    renderToBuffer(_outBuf, run.floorId, theme, posX, posY, facing, sprites)
    ctx.putImageData(_imgData, 0, 0)
  }

  // Red hit flash — sin curve so it fades in then out over HIT_FLASH_MS.
  const HIT_FLASH_MS = 245
  const hitElapsed   = now - run.lastHitMs
  if (hitElapsed < HIT_FLASH_MS) {
    const alpha = Math.sin(Math.PI * hitElapsed / HIT_FLASH_MS) * 0.27
    ctx.fillStyle = `rgba(220,0,0,${alpha.toFixed(3)})`
    ctx.fillRect(0, 0, CANVAS_W, DUNGEON_H)
  }
}
