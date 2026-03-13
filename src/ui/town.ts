import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'
import { saveGame, exportSave, importSave, hasSave } from '../persistence/saveSystem'
import { LEVEL_SEQUENCE } from '../content/floors'

const STATIC_ITEMS = [
  { label: 'Enter the Dungeon', action: 'dungeon' },
  { label: 'Rest  (restore HP)', action: 'rest' },
  { label: 'Save Game',          action: 'save' },
  { label: 'Export Save File',   action: 'export' },
  { label: 'Import Save File',   action: 'import' },
]

function portalLabel(floorId: string): string {
  const idx = LEVEL_SEQUENCE.indexOf(floorId as typeof LEVEL_SEQUENCE[number])
  if (idx === -1) return floorId
  const level = idx + 1
  const name  = floorId.startsWith('stone')    ? 'Stone'
              : floorId.startsWith('catacomb')  ? 'Catacombs'
              : 'The Works'
  const depth = parseInt(floorId.match(/_(\d)$/)?.[1] ?? '1')
  return `Portal — ${name} ${depth}  (Level ${level})`
}

function buildMenuItems(state: GameState): Array<{ label: string; action: string }> {
  const items = [...STATIC_ITEMS]
  // Sort portals by level index for consistent ordering
  const portals = [...state.discoveredPortals]
    .sort((a, b) => LEVEL_SEQUENCE.indexOf(a as any) - LEVEL_SEQUENCE.indexOf(b as any))
  for (const floorId of portals) {
    items.push({ label: portalLabel(floorId), action: `portal:${floorId}` })
  }
  return items
}

export function renderTown(state: GameState): void {
  const ctx = getCtx()

  // Background
  ctx.fillStyle = '#050403'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Atmospheric gradient sky
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

  if (hasSave()) {
    ctx.fillStyle = '#3a5a30'
    ctx.font = '10px monospace'
    ctx.fillText('◆ Save exists', CANVAS_W / 2, 80)
  }

  // Menu
  const items = buildMenuItems(state)
  const menuY = CANVAS_H / 2 - (items.length * 14)
  items.forEach((item, i) => {
    const y          = menuY + i * 28
    const isSelected = state.townMenuIndex === i
    const isPortal   = item.action.startsWith('portal:')

    if (isSelected) {
      ctx.fillStyle = 'rgba(200,169,106,0.12)'
      ctx.fillRect(CANVAS_W / 2 - 160, y - 14, 320, 22)
      ctx.fillStyle = isPortal ? '#78c8e8' : '#e8c97a'
    } else {
      ctx.fillStyle = isPortal ? '#1e4a5a' : '#5a4a30'
    }

    ctx.font = isSelected ? 'bold 13px monospace' : '13px monospace'
    ctx.fillText((isSelected ? '▶ ' : '  ') + item.label, CANVAS_W / 2, y)
  })

  // Footer
  ctx.fillStyle = '#2a2018'
  ctx.font = '10px monospace'
  ctx.fillText('↑↓ Navigate   ENTER / INTERACT to confirm', CANVAS_W / 2, CANVAS_H - 14)
}

export function townMenuItemCount(state: GameState): number {
  return buildMenuItems(state).length
}

export function getTownMenuAction(state: GameState, index: number): string {
  return buildMenuItems(state)[index]?.action ?? ''
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
