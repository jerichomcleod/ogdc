import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'

const MENU_ITEMS = [
  { label: 'Enter the Dungeon', action: 'dungeon' },
  { label: 'Rest  (restore HP)', action: 'rest' },
]

export function renderTown(state: GameState): void {
  const ctx = getCtx()

  // Background
  ctx.fillStyle = '#050403'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Atmospheric gradient sky (top half)
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.55)
  sky.addColorStop(0, '#0a0d14')
  sky.addColorStop(1, '#1a1208')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.55)

  // Ground
  ctx.fillStyle = '#0e0b06'
  ctx.fillRect(0, CANVAS_H * 0.55, CANVAS_W, CANVAS_H * 0.45)

  // Town name
  ctx.textAlign = 'center'
  ctx.fillStyle = '#c8a96a'
  ctx.font = 'bold 20px monospace'
  ctx.fillText('THE SURFACE', CANVAS_W / 2, 44)

  ctx.fillStyle = '#4a3a24'
  ctx.font = '11px monospace'
  ctx.fillText('You have returned from the depths.', CANVAS_W / 2, 64)

  // Menu
  const menuY = CANVAS_H / 2 - 20
  MENU_ITEMS.forEach((item, i) => {
    const y = menuY + i * 32
    const isSelected = state.townMenuIndex === i

    if (isSelected) {
      ctx.fillStyle = 'rgba(200,169,106,0.12)'
      ctx.fillRect(CANVAS_W / 2 - 140, y - 14, 280, 24)
      ctx.fillStyle = '#e8c97a'
    } else {
      ctx.fillStyle = '#5a4a30'
    }

    ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace'
    ctx.fillText((isSelected ? '▶ ' : '  ') + item.label, CANVAS_W / 2, y)
  })

  // Footer
  ctx.fillStyle = '#2a2018'
  ctx.font = '10px monospace'
  ctx.fillText('↑↓ Navigate   ENTER / INTERACT to confirm', CANVAS_W / 2, CANVAS_H - 14)
}

export function townMenuItemCount(): number {
  return MENU_ITEMS.length
}

export function getTownMenuAction(index: number): string {
  return MENU_ITEMS[index]?.action ?? ''
}
