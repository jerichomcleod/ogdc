import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { getFloor } from '../content/floors'
import { MINIMAP_X, MINIMAP_Y, DUNGEON_H, CANVAS_H, CANVAS_W, MINIMAP_CELL } from '../constants'
import { LEVEL_SEQUENCE } from '../content/floors'

const C_WALL       = '#2a2318'
const C_FLOOR      = '#8b7355'
const C_UNEXPLORED = '#111'
const C_PLAYER     = '#e8c97a'
const C_EXIT       = '#4ab87a'
const C_DOOR       = '#8a5a20'

// Viewport: how many cells to show on the minimap
const VIEW_W = 22
const VIEW_H = 14

const ARROWS: Record<string, [number, number][]> = {
  north: [ [0,-2], [ 2, 1], [-2, 1] ],
  south: [ [0, 2], [ 2,-1], [-2,-1] ],
  east:  [ [2, 0], [-1,-2], [-1, 2] ],
  west:  [ [-2,0], [ 1,-2], [ 1, 2] ],
}

export function renderMinimap(state: GameState): void {
  const ctx = getCtx()
  const run = state.run
  const floor = getFloor(run.floorId)
  if (!floor) return

  const cell = MINIMAP_CELL

  // Clamp viewport to actual map size, center on player
  const viewW  = Math.min(VIEW_W, floor.width)
  const viewH  = Math.min(VIEW_H, floor.height)
  const { x: px, y: py } = run.position
  const startX = Math.max(0, Math.min(px - Math.floor(viewW / 2), floor.width  - viewW))
  const startY = Math.max(0, Math.min(py - Math.floor(viewH / 2), floor.height - viewH))

  const mapW = viewW * cell
  const mapH = viewH * cell

  // Background
  ctx.fillStyle = '#0a0905'
  ctx.fillRect(MINIMAP_X - 1, MINIMAP_Y - 1, mapW + 2, mapH + 2)

  for (let vy = 0; vy < viewH; vy++) {
    for (let vx = 0; vx < viewW; vx++) {
      const mx = startX + vx
      const my = startY + vy
      const sx = MINIMAP_X + vx * cell
      const sy = MINIMAP_Y + vy * cell

      if (!run.mapRevealed[my]?.[mx]) {
        ctx.fillStyle = C_UNEXPLORED
        ctx.fillRect(sx, sy, cell, cell)
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
      ctx.fillRect(sx, sy, cell, cell)
    }
  }

  // Player marker
  const mpx = MINIMAP_X + (px - startX) * cell + cell / 2
  const mpy = MINIMAP_Y + (py - startY) * cell + cell / 2
  const arrow = ARROWS[run.facing]
  ctx.fillStyle = C_PLAYER
  ctx.beginPath()
  ctx.moveTo(mpx + arrow[0][0], mpy + arrow[0][1])
  ctx.lineTo(mpx + arrow[1][0], mpy + arrow[1][1])
  ctx.lineTo(mpx + arrow[2][0], mpy + arrow[2][1])
  ctx.closePath()
  ctx.fill()

  // HUD separator
  ctx.strokeStyle = '#3a3020'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, DUNGEON_H)
  ctx.lineTo(CANVAS_W, DUNGEON_H)
  ctx.stroke()

  // Stats
  const statsX = MINIMAP_X + mapW + 16
  const levelLabel = LEVEL_SEQUENCE.indexOf(run.floorId as typeof LEVEL_SEQUENCE[number]) + 1
  ctx.fillStyle = '#c8a96a'
  ctx.font = '12px monospace'
  ctx.fillText(`HP   ${run.hp} / ${run.maxHp}`,           statsX, MINIMAP_Y + 14)
  ctx.fillText(`LVL  ${run.floorId.replace('_', ' ')}`,   statsX, MINIMAP_Y + 30)
  ctx.fillText(`${levelLabel} / ${LEVEL_SEQUENCE.length}`, statsX, MINIMAP_Y + 46)
  ctx.fillText(`DIR  ${run.facing.toUpperCase()}`,         statsX, MINIMAP_Y + 62)
  ctx.fillText('WASD / ARROWS to move',                    statsX, CANVAS_H - 14)
}
