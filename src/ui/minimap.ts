import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { FLOORS } from '../content/floors'
import { MINIMAP_CELL, MINIMAP_X, MINIMAP_Y, DUNGEON_H, CANVAS_H, CANVAS_W } from '../constants'

const C_WALL      = '#2a2318'
const C_FLOOR     = '#8b7355'
const C_UNEXPLORED = '#111'
const C_PLAYER    = '#e8c97a'
const C_EXIT      = '#4ab87a'
const C_DOOR      = '#8a5a20'

// Arrow verts for player direction indicator (relative to cell center, in minimap space)
const ARROWS: Record<string, [number, number][]> = {
  north: [ [0,-2], [ 2, 1], [-2, 1] ],
  south: [ [0, 2], [ 2,-1], [-2,-1] ],
  east:  [ [2, 0], [-1,-2], [-1, 2] ],
  west:  [ [-2,0], [ 1,-2], [ 1, 2] ],
}

export function renderMinimap(state: GameState): void {
  const ctx = getCtx()
  const run = state.run
  const floor = FLOORS[run.floorId]
  if (!floor) return

  const mapW = floor.width  * MINIMAP_CELL
  const mapH = floor.height * MINIMAP_CELL

  // Background
  ctx.fillStyle = '#0a0905'
  ctx.fillRect(MINIMAP_X - 1, MINIMAP_Y - 1, mapW + 2, mapH + 2)

  for (let cy = 0; cy < floor.height; cy++) {
    for (let cx = 0; cx < floor.width; cx++) {
      const revealed = run.mapRevealed[cy][cx]
      const sx = MINIMAP_X + cx * MINIMAP_CELL
      const sy = MINIMAP_Y + cy * MINIMAP_CELL

      if (!revealed) {
        ctx.fillStyle = C_UNEXPLORED
        ctx.fillRect(sx, sy, MINIMAP_CELL, MINIMAP_CELL)
        continue
      }

      const cell = floor.cells[cy][cx]
      if (cx === floor.exitX && cy === floor.exitY) {
        ctx.fillStyle = C_EXIT
      } else if (cell.wallOverride === 'door_closed' || cell.wallOverride === 'door_locked') {
        ctx.fillStyle = C_DOOR
      } else if (cell.type === 'wall') {
        ctx.fillStyle = C_WALL
      } else {
        ctx.fillStyle = C_FLOOR
      }
      ctx.fillRect(sx, sy, MINIMAP_CELL, MINIMAP_CELL)
    }
  }

  // Player marker
  const px = MINIMAP_X + run.position.x * MINIMAP_CELL + MINIMAP_CELL / 2
  const py = MINIMAP_Y + run.position.y * MINIMAP_CELL + MINIMAP_CELL / 2
  const arrow = ARROWS[run.facing]

  ctx.fillStyle = C_PLAYER
  ctx.beginPath()
  ctx.moveTo(px + arrow[0][0], py + arrow[0][1])
  ctx.lineTo(px + arrow[1][0], py + arrow[1][1])
  ctx.lineTo(px + arrow[2][0], py + arrow[2][1])
  ctx.closePath()
  ctx.fill()

  // HUD separator line
  ctx.strokeStyle = '#3a3020'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, DUNGEON_H)
  ctx.lineTo(CANVAS_W, DUNGEON_H)
  ctx.stroke()

  // Stats text (right of minimap)
  const statsX = MINIMAP_X + mapW + 16
  ctx.fillStyle = '#c8a96a'
  ctx.font = '12px monospace'
  ctx.fillText(`HP  ${run.hp} / ${run.maxHp}`, statsX, MINIMAP_Y + 14)
  ctx.fillText(`POS ${run.position.x}, ${run.position.y}`, statsX, MINIMAP_Y + 30)
  ctx.fillText(`DIR ${run.facing.toUpperCase()}`, statsX, MINIMAP_Y + 46)
  ctx.fillText('WASD / ARROWS to move', statsX, CANVAS_H - 14)
}
