import { GameState } from '../game/gameState'
import { getFloor } from '../content/floors'
import { LEVEL_SEQUENCE } from '../content/floors'

// ── Config ────────────────────────────────────────────────────────────────────

const CELL   = 5     // px per cell — smaller = more map visible
const VIEW_W = 30    // cells wide  → MAP_W = 150 px
const VIEW_H = 20    // cells tall  → MAP_H = 100 px
const MAP_W  = VIEW_W * CELL
const MAP_H  = VIEW_H * CELL

const C_WALL       = '#2a2318'
const C_FLOOR      = '#8b7355'
const C_UNEXPLORED = '#0e0d0b'
const C_PLAYER     = '#e8c97a'   // neutral warm amber
const C_EXIT       = '#4ab87a'
const C_DOOR       = '#8a5a20'
const C_ENEMY      = '#e84040'   // red for enemy diamonds

// Sharper, more elongated directional arrows
const ARROWS: Record<string, [number, number][]> = {
  north: [ [0, -3],   [ 2,  2.5], [-2,  2.5] ],
  south: [ [0,  3],   [ 2, -2.5], [-2, -2.5] ],
  east:  [ [3,  0],   [-2, -2.5], [-2,  2.5] ],
  west:  [ [-3, 0],   [ 2, -2.5], [ 2,  2.5] ],
}

// ── Canvas context (lazy-initialised) ─────────────────────────────────────────

let _ctx: CanvasRenderingContext2D | null = null

function getMinimapCtx(): CanvasRenderingContext2D | null {
  if (_ctx) return _ctx
  const el = document.getElementById('minimap-canvas') as HTMLCanvasElement | null
  if (!el) return null
  el.width  = MAP_W
  el.height = MAP_H
  _ctx = el.getContext('2d')!
  return _ctx
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderMinimap(state: GameState): void {
  const ctx = getMinimapCtx()
  if (!ctx) return

  const run   = state.run
  const floor = getFloor(run.floorId)
  if (!floor) return

  const viewW  = Math.min(VIEW_W, floor.width)
  const viewH  = Math.min(VIEW_H, floor.height)
  const { x: px, y: py } = run.position
  const startX = Math.max(0, Math.min(px - Math.floor(viewW / 2), floor.width  - viewW))
  const startY = Math.max(0, Math.min(py - Math.floor(viewH / 2), floor.height - viewH))

  // Background
  ctx.fillStyle = '#0a0905'
  ctx.fillRect(0, 0, MAP_W, MAP_H)

  // Cells
  for (let vy = 0; vy < viewH; vy++) {
    for (let vx = 0; vx < viewW; vx++) {
      const mx = startX + vx
      const my = startY + vy
      const sx = vx * CELL
      const sy = vy * CELL

      if (!run.mapRevealed[my]?.[mx]) {
        ctx.fillStyle = C_UNEXPLORED
        ctx.fillRect(sx, sy, CELL, CELL)
        continue
      }

      const c = floor.cells[my][mx]
      if (mx === floor.exitX && my === floor.exitY) {
        ctx.fillStyle = C_EXIT
      } else if (c.wallOverride === 'door_closed' || c.wallOverride === 'door_locked') {
        ctx.fillStyle = C_DOOR
      } else if (c.type === 'wall') {
        ctx.fillStyle = C_WALL
      } else {
        ctx.fillStyle = C_FLOOR
      }
      ctx.fillRect(sx, sy, CELL, CELL)
    }
  }

  // Enemy diamonds — only on revealed cells within the viewport
  ctx.fillStyle = C_ENEMY
  for (const enemy of run.enemies) {
    const vx = enemy.x - startX
    const vy = enemy.y - startY
    if (vx < 0 || vx >= viewW || vy < 0 || vy >= viewH) continue
    if (!run.mapRevealed[enemy.y]?.[enemy.x]) continue
    const ex = vx * CELL + CELL / 2
    const ey = vy * CELL + CELL / 2
    const r  = Math.max(1.5, CELL / 2 - 0.5)
    ctx.beginPath()
    ctx.moveTo(ex,     ey - r)
    ctx.lineTo(ex + r, ey)
    ctx.lineTo(ex,     ey + r)
    ctx.lineTo(ex - r, ey)
    ctx.closePath()
    ctx.fill()
  }

  // Player arrow
  const mpx   = (px - startX) * CELL + CELL / 2
  const mpy   = (py - startY) * CELL + CELL / 2
  const arrow = ARROWS[run.facing]
  ctx.fillStyle = C_PLAYER
  ctx.beginPath()
  ctx.moveTo(mpx + arrow[0][0], mpy + arrow[0][1])
  ctx.lineTo(mpx + arrow[1][0], mpy + arrow[1][1])
  ctx.lineTo(mpx + arrow[2][0], mpy + arrow[2][1])
  ctx.closePath()
  ctx.fill()

  // Level label on canvas bottom-left
  const lvl = LEVEL_SEQUENCE.indexOf(run.floorId as typeof LEVEL_SEQUENCE[number]) + 1
  const label = `Level ${lvl}`
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'left'
  const lw = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(2, MAP_H - 14, lw + 8, 13)
  ctx.fillStyle = '#8b7355'
  ctx.fillText(label, 6, MAP_H - 4)
}
