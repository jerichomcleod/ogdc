import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'
import { saveGame, exportSave, importSave, hasSave } from '../persistence/saveSystem'

const STATIC_ITEMS = [
  { label: 'Enter the Dungeon', action: 'dungeon' },
  { label: 'Rest  (restore HP)', action: 'rest' },
  { label: 'Save Game',          action: 'save' },
  { label: 'Export Save File',   action: 'export' },
  { label: 'Import Save File',   action: 'import' },
]

// Returns menu items with Save highlighted if a save exists
function menuItems() {
  return STATIC_ITEMS
}

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

  // Save indicator
  if (hasSave()) {
    ctx.fillStyle = '#3a5a30'
    ctx.font = '10px monospace'
    ctx.fillText('◆ Save exists', CANVAS_W / 2, 80)
  }

  // Menu
  const items  = menuItems()
  const menuY  = CANVAS_H / 2 - 40
  items.forEach((item, i) => {
    const y          = menuY + i * 28
    const isSelected = state.townMenuIndex === i

    if (isSelected) {
      ctx.fillStyle = 'rgba(200,169,106,0.12)'
      ctx.fillRect(CANVAS_W / 2 - 140, y - 14, 280, 22)
      ctx.fillStyle = '#e8c97a'
    } else {
      ctx.fillStyle = '#5a4a30'
    }

    ctx.font = isSelected ? 'bold 13px monospace' : '13px monospace'
    ctx.fillText((isSelected ? '▶ ' : '  ') + item.label, CANVAS_W / 2, y)
  })

  // Footer
  ctx.fillStyle = '#2a2018'
  ctx.font = '10px monospace'
  ctx.fillText('↑↓ Navigate   ENTER / INTERACT to confirm', CANVAS_W / 2, CANVAS_H - 14)
}

export function townMenuItemCount(): number {
  return menuItems().length
}

export function getTownMenuAction(index: number): string {
  return menuItems()[index]?.action ?? ''
}

/** Handle save/export/import actions that require async or side effects outside the main loop. */
export async function handleTownSaveAction(
  action: string,
  state: GameState,
): Promise<boolean> {
  if (action === 'save') {
    saveGame(state)
    return true
  }
  if (action === 'export') {
    exportSave(state)
    return true
  }
  if (action === 'import') {
    const ok = await importSave(state)
    return ok
  }
  return false
}
