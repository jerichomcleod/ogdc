import { getCtx } from './canvas'
import { GameState } from '../game/gameState'
import { getCell } from '../systems/mapSystem'
import { Direction } from '../content/types'
import { getStone, getFloorTex, getCeilTex } from './assets'
import {
  CANVAS_W, DUNGEON_H, HORIZON_Y, VP_X,
  VIEW_DEPTH, WALL_SCALE, WALL_HALF_W
} from '../constants'

// Screen-space geometry for a wall face at a given depth.
function faceAt(depth: number) {
  const halfW = WALL_HALF_W / depth
  const halfH = WALL_SCALE  / depth
  return {
    left:   VP_X - halfW,
    right:  VP_X + halfW,
    top:    HORIZON_Y - halfH,
    bottom: HORIZON_Y + halfH,
  }
}

type Face = ReturnType<typeof faceAt>

// Translate a relative (forward, lateral) grid offset into world coordinates.
function worldCell(
  px: number, py: number, facing: Direction,
  forward: number, lateral: number
): { x: number; y: number } {
  switch (facing) {
    case 'north': return { x: px + lateral, y: py - forward }
    case 'south': return { x: px - lateral, y: py + forward }
    case 'east':  return { x: px + forward, y: py + lateral }
    case 'west':  return { x: px - forward, y: py - lateral }
  }
}

// Draw a textured trapezoid as vertical strips.
// xStart/xEnd: screen x range. top1/bottom1 at xStart, top2/bottom2 at xEnd.
// flipSrc: mirrors texture horizontally (for right walls, to be symmetric with left).
function drawSideStrip(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  xStart: number, xEnd: number,
  top1: number, bottom1: number,
  top2: number, bottom2: number,
  flipSrc: boolean,
): void {
  if (xEnd <= xStart + 0.5) return
  const iw = img.naturalWidth  || 640
  const ih = img.naturalHeight || 640
  const span = xEnd - xStart
  const STEP = 2
  for (let sx = Math.round(xStart); sx < xEnd; sx += STEP) {
    const t = (sx - xStart) / span
    const top    = top1    + t * (top2    - top1)
    const bottom = bottom1 + t * (bottom2 - bottom1)
    if (bottom <= top) continue
    const srcT = flipSrc ? 1 - t : t
    const srcX = Math.min(Math.floor(srcT * iw), iw - 1)
    // Sample only as many source rows as destination rows for 1:1 height mapping.
    const colH = bottom - top
    const srcH = Math.min(ih, colH)
    const srcY = (ih - colH) > 0 ? Math.floor((ih - colH) / 2) : 0
    ctx.drawImage(img, srcX, srcY, STEP, srcH, sx, top, STEP, colH)
  }
}

// Draw a perspective floor band (horizontal trapezoid below the horizon).
// Covers y from far.bottom (inner, near horizon) to near.bottom (outer, near player).
// Each depth band shows one full tile — tiles appear larger closer to the player.
function drawFloorBand(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  far: Face, near: Face | { left: number; right: number; top: number; bottom: number },
): void {
  const iw = img.naturalWidth  || 640
  const ih = img.naturalHeight || 640
  const yTop    = far.bottom
  const yBottom = near.bottom
  if (yBottom <= yTop) return
  for (let sy = Math.round(yTop); sy < yBottom; sy++) {
    const t      = (sy - yTop) / (yBottom - yTop)   // 0 = far edge, 1 = near edge
    const xLeft  = far.left  + t * (near.left  - far.left)
    const xRight = far.right + t * (near.right - far.right)
    const w      = xRight - xLeft
    if (w < 1) continue
    const srcY = Math.min(Math.floor(t * ih), ih - 1)
    ctx.drawImage(img, 0, srcY, iw, 1, xLeft, sy, w, 1)
  }
}

// Draw a perspective ceiling band (horizontal trapezoid above the horizon).
// Covers y from near.top (outer, near player) to far.top (inner, near horizon).
function drawCeilBand(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  far: Face, near: Face | { left: number; right: number; top: number; bottom: number },
): void {
  const iw = img.naturalWidth  || 640
  const ih = img.naturalHeight || 640
  const yTop    = near.top
  const yBottom = far.top
  if (yBottom <= yTop) return
  for (let sy = Math.round(yTop); sy < yBottom; sy++) {
    const t      = (sy - yTop) / (yBottom - yTop)   // 0 = near edge, 1 = far edge (horizon)
    const xLeft  = near.left  + t * (far.left  - near.left)
    const xRight = near.right + t * (far.right - near.right)
    const w      = xRight - xLeft
    if (w < 1) continue
    // Flip srcY so the tile bottom faces the player (near = bottom of texture)
    const srcY = Math.min(Math.floor((1 - t) * ih), ih - 1)
    ctx.drawImage(img, 0, srcY, iw, 1, xLeft, sy, w, 1)
  }
}

// Core render — called with active facing (may differ during turn animation first half).
function renderDungeonView(
  ctx: CanvasRenderingContext2D,
  floorId: string,
  px: number, py: number,
  facing: Direction,
  offset: number,   // depth offset for forward/back animation
): void {
  const floorTex = getFloorTex(floorId)
  const ceilTex  = getCeilTex(floorId)

  // Pre-scan: find first blocking cell ahead
  let maxVisible = VIEW_DEPTH
  for (let d = 1; d <= VIEW_DEPTH; d++) {
    const fw = worldCell(px, py, facing, d, 0)
    if (getCell(floorId, fw.x, fw.y).type !== 'floor') { maxVisible = d; break }
  }

  // Draw back → front
  for (let d = maxVisible; d >= 1; d--) {
    const effectiveD     = d + offset
    const effectiveDNear = d - 1 + offset

    const far  = faceAt(effectiveD)
    const near: Face | { left: number; right: number; top: number; bottom: number } =
      effectiveDNear < 0.1
        ? { left: 0, right: CANVAS_W, top: 0, bottom: DUNGEON_H }
        : faceAt(effectiveDNear)

    // ── Ceiling band ───────────────────────────────────────────────────────
    if (ceilTex) {
      drawCeilBand(ctx, ceilTex, far, near)
    } else {
      ctx.fillStyle = '#1a1210'
      ctx.beginPath()
      ctx.moveTo(near.left, near.top); ctx.lineTo(near.right, near.top)
      ctx.lineTo(far.right, far.top); ctx.lineTo(far.left, far.top)
      ctx.closePath(); ctx.fill()
    }

    // ── Floor band ─────────────────────────────────────────────────────────
    if (floorTex) {
      drawFloorBand(ctx, floorTex, far, near)
    } else {
      ctx.fillStyle = '#3b2e1a'
      ctx.beginPath()
      ctx.moveTo(far.left, far.bottom); ctx.lineTo(far.right, far.bottom)
      ctx.lineTo(near.right, near.bottom); ctx.lineTo(near.left, near.bottom)
      ctx.closePath(); ctx.fill()
    }

    // ── Left side wall ─────────────────────────────────────────────────────
    const leftWorld = worldCell(px, py, facing, d - 1, -1)
    if (getCell(floorId, leftWorld.x, leftWorld.y).type !== 'floor') {
      const tex = getStone(leftWorld.x, leftWorld.y)
      if (tex) {
        drawSideStrip(ctx, tex,
          near.left, far.left,
          near.top, near.bottom,
          far.top,  far.bottom,
          false)
      } else {
        ctx.fillStyle = '#4a3d2c'
        ctx.beginPath()
        ctx.moveTo(near.left, near.top); ctx.lineTo(far.left, far.top)
        ctx.lineTo(far.left, far.bottom); ctx.lineTo(near.left, near.bottom)
        ctx.closePath(); ctx.fill()
      }
    }

    // ── Right side wall ────────────────────────────────────────────────────
    const rightWorld = worldCell(px, py, facing, d - 1, 1)
    if (getCell(floorId, rightWorld.x, rightWorld.y).type !== 'floor') {
      const tex = getStone(rightWorld.x, rightWorld.y)
      if (tex) {
        drawSideStrip(ctx, tex,
          far.right, near.right,
          far.top,   far.bottom,
          near.top,  near.bottom,
          true)
      } else {
        ctx.fillStyle = '#5a4c36'
        ctx.beginPath()
        ctx.moveTo(near.right, near.top); ctx.lineTo(far.right, far.top)
        ctx.lineTo(far.right, far.bottom); ctx.lineTo(near.right, near.bottom)
        ctx.closePath(); ctx.fill()
      }
    }

    // ── Front wall ─────────────────────────────────────────────────────────
    const frontWorld = worldCell(px, py, facing, d, 0)
    const frontCell  = getCell(floorId, frontWorld.x, frontWorld.y)
    if (frontCell.type !== 'floor') {
      const isDoor = frontCell.wallOverride === 'door_closed'
                  || frontCell.wallOverride === 'door_locked'
      if (isDoor) {
        ctx.fillStyle = '#7a4a20'
        ctx.fillRect(far.left, far.top, far.right - far.left, far.bottom - far.top)
      } else {
        const tex = getStone(frontWorld.x, frontWorld.y)
        if (tex) {
          ctx.drawImage(tex, far.left, far.top, far.right - far.left, far.bottom - far.top)
        } else {
          ctx.fillStyle = '#6b5a42'
          ctx.fillRect(far.left, far.top, far.right - far.left, far.bottom - far.top)
        }
      }
    }
  }

  // Faint horizon line
  ctx.strokeStyle = '#ffffff14'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, HORIZON_Y)
  ctx.lineTo(CANVAS_W, HORIZON_Y)
  ctx.stroke()
}

export function renderDungeon(state: GameState): void {
  const ctx     = getCtx()
  const run     = state.run
  const anim    = run.anim
  const { x: px, y: py } = run.position

  let offset       = 0
  let activeFacing = run.facing
  let translateX   = 0

  if (anim) {
    const t = Math.min(1, (performance.now() - anim.startMs) / anim.durationMs)
    if (anim.type === 'forward' || anim.type === 'back') {
      // Ease-out quadratic: scene starts one cell displaced, eases to final position
      const ease = (1 - t) * (1 - t)
      offset = anim.type === 'forward' ? ease : -ease
    } else {
      // Directional slide: turn right → old view exits LEFT, new view enters from RIGHT
      // dir = +1 for right, -1 for left
      const dir = anim.type === 'turn_right' ? 1 : -1
      if (t < 0.5) {
        // Exit phase: old view slides out opposite to turn direction (ease-in)
        const p = t / 0.5
        translateX   = -dir * p * p * CANVAS_W
        activeFacing = anim.prevFacing
      } else {
        // Enter phase: new view slides in from turn direction (ease-out)
        const p = (t - 0.5) / 0.5
        const eased  = 1 - (1 - p) * (1 - p)
        translateX   = dir * (1 - eased) * CANVAS_W
        activeFacing = run.facing
      }
    }
  }

  // Black void — visible as side bars during turn slide and as the horizon gap.
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, DUNGEON_H)

  ctx.save()
  // Clip to dungeon area so turn slides don't bleed into the HUD
  ctx.beginPath()
  ctx.rect(0, 0, CANVAS_W, DUNGEON_H)
  ctx.clip()
  if (translateX !== 0) ctx.translate(translateX, 0)

  renderDungeonView(ctx, run.floorId, px, py, activeFacing, offset)

  ctx.restore()
}
