import { getCtx } from '../engine/canvas'
import { GameState, RunState, pushCombatLog } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'
import { saveGame, exportSave, importSave, hasSave } from '../persistence/saveSystem'
import { LEVEL_SEQUENCE } from '../content/floors'
import { getItemDef, ItemDef, Equipment } from '../content/defs'

let _shopMenuOpen = false

function staticItems(): Array<{ label: string; action: string }> {
  if (_shopMenuOpen) {
    return [
      { label: 'Sell Equipment',              action: 'sell'          },
      { label: 'Buy: Healing Draught  [20g]', action: 'buy_potion_sm' },
      { label: 'Buy: Healing Potion   [50g]', action: 'buy_potion_lg' },
      { label: '← Back',                     action: 'shop_back'     },
    ]
  }
  return [
    { label: 'Enter the Dungeon',                                  action: 'dungeon' },
    { label: 'Rest  (restore HP)',                                  action: 'rest'    },
    { label: 'Shop',                                               action: 'shop'    },
    { label: hasSave() ? 'Save Game  [◆ saved]' : 'Save Game',    action: 'save'    },
    { label: 'Export Save File',                                   action: 'export'  },
    { label: 'Import Save File',                                   action: 'import'  },
  ]
}

export function openShopMenu():  void { _shopMenuOpen = true  }
export function closeShopMenu(): void { _shopMenuOpen = false }

// ── Sell sub-menu ─────────────────────────────────────────────────────────────

interface ShopItem {
  label:  string
  gold:   number
  remove: (run: RunState) => void
}

let _shopOpen = false
let _shopIdx  = 0

function sellPrice(def: ItemDef): number {
  if (def.slot === 'weapon') return Math.ceil((def.attackMin ?? 0) / 2)
  return Math.ceil((def.defense ?? 0) / 2)
}

function buildShopItems(run: RunState): ShopItem[] {
  const items: ShopItem[] = []

  const eqSlots: Array<[keyof Equipment, string]> = [
    ['weapon', 'Weapon'], ['armor', 'Armor'], ['shield', 'Shield'],
  ]
  for (const [slot, label] of eqSlots) {
    const inst = run.equipment[slot]
    if (!inst) continue
    const def  = getItemDef(inst.defKey)
    if (!def)  continue
    const gold = sellPrice(def)
    items.push({
      label:  `[${label}] ${def.name}  +${gold}g`,
      gold,
      remove: r => { r.equipment[slot] = null },
    })
  }

  run.inventory.forEach(inst => {
    const def = getItemDef(inst.defKey)
    if (!def || def.effect !== 'equip') return
    const gold = sellPrice(def)
    items.push({
      label:  `${def.name}  +${gold}g`,
      gold,
      remove: r => { r.inventory.splice(r.inventory.indexOf(inst), 1) },
    })
  })

  return items
}

export function isShopOpen(): boolean { return _shopOpen }
export function openShop():  void { _shopOpen = true; _shopIdx = 0 }
export function closeShop(): void { _shopOpen = false }

export function shopNav(dir: 1 | -1, run: RunState): void {
  const count = buildShopItems(run).length
  if (!count) return
  _shopIdx = Math.max(0, Math.min(count - 1, _shopIdx + dir))
}

export function shopConfirm(run: RunState): void {
  const items = buildShopItems(run)
  const entry = items[_shopIdx]
  if (!entry) return
  entry.remove(run)
  run.gold += entry.gold
  pushCombatLog(run, `Sold for ${entry.gold} gold.`)
  const newCount = buildShopItems(run).length
  if (_shopIdx >= newCount) _shopIdx = Math.max(0, newCount - 1)
}

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
  const items = staticItems()
  if (!_shopMenuOpen) {
    const portals = [...state.discoveredPortals]
      .sort((a, b) => LEVEL_SEQUENCE.indexOf(a as any) - LEVEL_SEQUENCE.indexOf(b as any))
    for (const floorId of portals) {
      items.push({ label: portalLabel(floorId), action: `portal:${floorId}` })
    }
  }
  return items
}

// ── Rest particles ────────────────────────────────────────────────────────────

interface RestParticle { x: number; y: number; vx: number; vy: number; startMs: number }
const _restParticles: RestParticle[] = []
const REST_DURATION_MS = 1400

export function triggerRestEffect(healedAmount: number): void {
  const now   = performance.now()
  const count = healedAmount > 0 ? 9 : 4
  const cx    = CANVAS_W / 2
  const cy    = CANVAS_H / 2 + 20
  for (let i = 0; i < count; i++) {
    _restParticles.push({
      x:       cx + (Math.random() - 0.5) * 160,
      y:       cy + (Math.random() - 0.5) * 50,
      vx:      (Math.random() - 0.5) * 0.04,
      vy:      -(0.06 + Math.random() * 0.07),
      startMs: now,
    })
  }
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

  // Gold counter (shown when shop sub-menu is open)
  if (_shopMenuOpen) {
    ctx.textAlign = 'center'
    ctx.font      = '12px monospace'
    ctx.fillStyle = '#c8a060'
    ctx.fillText(`Gold: ${state.run.gold}`, CANVAS_W / 2, CANVAS_H * 0.42 - 30)
  }

  // Menu — anchored below flavor text, never closer than y=90
  const items = buildMenuItems(state)
  const menuY = Math.max(90, CANVAS_H * 0.42)
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

  // Rest particles
  const now = performance.now()
  ctx.font = 'bold 18px monospace'
  for (let i = _restParticles.length - 1; i >= 0; i--) {
    const p       = _restParticles[i]
    const elapsed = now - p.startMs
    if (elapsed >= REST_DURATION_MS) { _restParticles.splice(i, 1); continue }
    const t     = elapsed / REST_DURATION_MS
    const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
    ctx.save()
    ctx.globalAlpha = Math.max(0, alpha)
    ctx.fillStyle   = '#50e870'
    ctx.textAlign   = 'center'
    ctx.fillText('+', p.x + p.vx * elapsed, p.y + p.vy * elapsed)
    ctx.restore()
  }

  // Footer
  ctx.fillStyle = '#2a2018'
  ctx.font = '10px monospace'
  ctx.fillText('↑↓ Navigate   ENTER / INTERACT to confirm', CANVAS_W / 2, CANVAS_H - 14)

  // Shop overlay
  if (_shopOpen) renderShop(ctx, state.run)
}

function renderShop(ctx: CanvasRenderingContext2D, run: RunState): void {
  const items = buildShopItems(run)
  const W = 320
  const H = Math.max(80, items.length * 22 + 56)
  const mx = CANVAS_W / 2 - W / 2
  const my = CANVAS_H / 2 - H / 2

  ctx.fillStyle = 'rgba(0,0,0,0.92)'
  ctx.fillRect(mx, my, W, H)
  ctx.strokeStyle = '#6a5a3a'
  ctx.lineWidth   = 1.5
  ctx.strokeRect(mx, my, W, H)

  ctx.textAlign = 'center'
  ctx.font      = 'bold 13px monospace'
  ctx.fillStyle = '#c8a96a'
  ctx.fillText('SELL EQUIPMENT', CANVAS_W / 2, my + 18)

  if (!items.length) {
    ctx.font      = '11px monospace'
    ctx.fillStyle = '#5a4a30'
    ctx.fillText('No equipment to sell.', CANVAS_W / 2, my + 44)
  } else {
    items.forEach((entry, i) => {
      const iy      = my + 36 + i * 22
      const chosen  = _shopIdx === i
      ctx.fillStyle = chosen ? 'rgba(200,169,106,0.15)' : 'transparent'
      ctx.fillRect(mx + 6, iy - 13, W - 12, 18)
      ctx.fillStyle = chosen ? '#e8c97a' : '#6a5a38'
      ctx.font      = chosen ? 'bold 11px monospace' : '11px monospace'
      ctx.fillText((chosen ? '▶ ' : '  ') + entry.label, CANVAS_W / 2, iy)
    })
  }

  ctx.font      = '9px monospace'
  ctx.fillStyle = '#3a2e1e'
  ctx.fillText('[↑↓] Select   [Enter/F] Sell   [Esc] Close', CANVAS_W / 2, my + H - 8)
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
