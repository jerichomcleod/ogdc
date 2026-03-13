/**
 * Inventory screen — full-canvas overlay toggled with I.
 *
 * Layout:
 *   Left panel  — Equipment slots (weapon / armor / shield)
 *   Right panel — 4×5 carry grid (20 slots)
 *   Bottom      — Selected item name + description + key hints
 *
 * Navigation:
 *   inventoryFocus 'grid'  — arrow keys move within 4×5 grid; pressing LEFT
 *                            from column 0 moves focus to 'equip' panel
 *   inventoryFocus 'equip' — UP/DOWN move between weapon/armor/shield;
 *                            pressing RIGHT moves focus to 'grid'
 *   CONFIRM (Enter)  — equip (equip items) or use (heal items)
 *   DROP_ITEM (X)    — drop selected carry item
 *   CANCEL (Escape)  — close
 */

import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { consumeAction } from '../engine/input'
import { getItemDef, Equipment } from '../content/defs'
import { equipItemAtSlot, useItemAtSlot, dropItemAtSlot, unequipSlot } from '../systems/entitySystem'
import { CANVAS_W, CANVAS_H } from '../constants'

// ── Layout constants ──────────────────────────────────────────────────────────

const PANEL_X   = 20
const PANEL_Y   = 30
const PANEL_W   = CANVAS_W - 40
const PANEL_H   = CANVAS_H - 60

const EQUIP_X   = PANEL_X + 10
const EQUIP_W   = 150
const EQUIP_SH  = 44     // slot height

const GRID_X    = EQUIP_X + EQUIP_W + 20
const GRID_COLS = 5
const GRID_ROWS = 4
const SLOT_SZ   = 38     // slot size (px)
const SLOT_GAP  = 4

const EQUIP_SLOTS: Array<keyof Equipment> = ['weapon', 'armor', 'shield']
const EQUIP_LABELS = ['Weapon', 'Armor', 'Shield']

// ── Update (call every frame when inventoryOpen) ──────────────────────────────

export function updateInventory(state: GameState): void {
  const run = state.run

  // Close
  if (consumeAction('CANCEL') || consumeAction('OPEN_INVENTORY')) {
    state.inventoryOpen  = false
    return
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  if (state.inventoryFocus === 'grid') {
    const col = state.inventorySlot % GRID_COLS
    const row = Math.floor(state.inventorySlot / GRID_COLS)

    if (consumeAction('MOVE_FORWARD')) {
      state.inventorySlot = Math.max(0, state.inventorySlot - GRID_COLS)
    } else if (consumeAction('MOVE_BACK')) {
      state.inventorySlot = Math.min(GRID_COLS * GRID_ROWS - 1, state.inventorySlot + GRID_COLS)
    } else if (consumeAction('TURN_RIGHT')) {
      if (col < GRID_COLS - 1) state.inventorySlot++
    } else if (consumeAction('TURN_LEFT')) {
      if (col > 0) {
        state.inventorySlot--
      } else {
        // Switch to equip panel — pick the row-aligned slot
        state.inventoryFocus = 'equip'
        state.inventorySlot  = Math.min(row, EQUIP_SLOTS.length - 1)
      }
    }

    // Actions on carry slot
    if (consumeAction('CONFIRM') || consumeAction('INTERACT')) {
      const item = run.inventory[state.inventorySlot]
      if (item) {
        const def = getItemDef(item.defKey)
        if (def?.effect === 'equip') equipItemAtSlot(run, state.inventorySlot)
        else if (def?.effect === 'heal') {
          if (useItemAtSlot(run, state.inventorySlot)) {
            state.inventorySlot = Math.min(state.inventorySlot, Math.max(0, run.inventory.length - 1))
          }
        }
      }
    }

    if (consumeAction('DROP_ITEM')) {
      if (run.inventory[state.inventorySlot]) {
        dropItemAtSlot(run, state.inventorySlot)
        state.inventorySlot = Math.min(state.inventorySlot, Math.max(0, run.inventory.length - 1))
      }
    }

  } else {
    // equip panel
    if (consumeAction('MOVE_FORWARD')) {
      state.inventorySlot = Math.max(0, state.inventorySlot - 1)
    } else if (consumeAction('MOVE_BACK')) {
      state.inventorySlot = Math.min(EQUIP_SLOTS.length - 1, state.inventorySlot + 1)
    } else if (consumeAction('TURN_RIGHT')) {
      state.inventoryFocus = 'grid'
      state.inventorySlot  = 0
    } else if (consumeAction('TURN_LEFT')) {
      // already at leftmost — no-op
    }

    // Unequip selected slot back to carry
    if (consumeAction('CONFIRM') || consumeAction('INTERACT')) {
      const slot = EQUIP_SLOTS[state.inventorySlot]
      if (slot) unequipSlot(run, slot)
    }
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderInventory(state: GameState): void {
  const ctx = getCtx()
  const run = state.run

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.88)'
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H)
  ctx.strokeStyle = '#6a5a3a'
  ctx.lineWidth   = 1
  ctx.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H)

  // Title
  ctx.textAlign  = 'left'
  ctx.fillStyle  = '#c8a96a'
  ctx.font       = 'bold 14px monospace'
  ctx.fillText('INVENTORY', PANEL_X + 10, PANEL_Y + 18)

  ctx.fillStyle = '#3a3028'
  ctx.font      = '10px monospace'
  ctx.textAlign = 'right'
  ctx.fillText('[I] Close   [X] Drop   [↑↓←→] Navigate   [Enter] Use/Equip', PANEL_X + PANEL_W - 10, PANEL_Y + 18)

  // Gold
  ctx.textAlign = 'left'
  ctx.fillStyle = '#c8a060'
  ctx.font      = '11px monospace'
  ctx.fillText(`Gold: ${run.gold}`, PANEL_X + 10, PANEL_Y + PANEL_H - 10)

  const contentY = PANEL_Y + 28

  // ── Equipment panel ────────────────────────────────────────────────────────
  const equipSelected = state.inventoryFocus === 'equip'

  ctx.fillStyle = '#1a1510'
  ctx.fillRect(EQUIP_X - 4, contentY - 4, EQUIP_W + 8, EQUIP_SLOTS.length * (EQUIP_SH + 6) + 4)

  EQUIP_SLOTS.forEach((slot, i) => {
    const sy       = contentY + i * (EQUIP_SH + 6)
    const equipped = run.equipment[slot]
    const def      = equipped ? getItemDef(equipped.defKey) : null
    const selected = equipSelected && state.inventorySlot === i

    ctx.fillStyle = selected ? 'rgba(200,169,106,0.18)' : 'rgba(255,255,255,0.03)'
    ctx.fillRect(EQUIP_X, sy, EQUIP_W, EQUIP_SH)

    ctx.strokeStyle = selected ? '#c8a96a' : '#3a2e1e'
    ctx.lineWidth   = selected ? 1.5 : 1
    ctx.strokeRect(EQUIP_X, sy, EQUIP_W, EQUIP_SH)

    ctx.font      = '9px monospace'
    ctx.fillStyle = '#5a4a2a'
    ctx.textAlign = 'left'
    ctx.fillText(EQUIP_LABELS[i].toUpperCase(), EQUIP_X + 6, sy + 13)

    ctx.font      = '11px monospace'
    ctx.fillStyle = def ? '#d4b47a' : '#2a2018'
    ctx.fillText(def?.name ?? '—', EQUIP_X + 6, sy + 30)
  })

  // ── Carry grid ────────────────────────────────────────────────────────────
  const gridSelected = state.inventoryFocus === 'grid'

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const slotIdx = row * GRID_COLS + col
      const sx      = GRID_X + col * (SLOT_SZ + SLOT_GAP)
      const sy      = contentY + row * (SLOT_SZ + SLOT_GAP)
      const item    = run.inventory[slotIdx]
      const def     = item ? getItemDef(item.defKey) : null
      const selected = gridSelected && state.inventorySlot === slotIdx

      ctx.fillStyle = selected ? 'rgba(200,169,106,0.18)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(sx, sy, SLOT_SZ, SLOT_SZ)

      ctx.strokeStyle = selected ? '#c8a96a' : '#2a2018'
      ctx.lineWidth   = selected ? 1.5 : 1
      ctx.strokeRect(sx, sy, SLOT_SZ, SLOT_SZ)

      if (def) {
        // Color swatch in top-left corner
        const r8 = (def.color       ) & 0xFF
        const g8 = (def.color >>  8) & 0xFF
        const b8 = (def.color >> 16) & 0xFF
        ctx.fillStyle = `rgb(${r8},${g8},${b8})`
        ctx.fillRect(sx + 3, sy + 3, 8, 8)

        // Item name abbreviated
        ctx.font      = '8px monospace'
        ctx.fillStyle = '#a09070'
        ctx.textAlign = 'center'
        const abbr = def.name.length > 8 ? def.name.slice(0, 7) + '…' : def.name
        ctx.fillText(abbr, sx + SLOT_SZ / 2, sy + SLOT_SZ - 5)
      }
    }
  }

  // ── Selected item detail ───────────────────────────────────────────────────
  const detailY = PANEL_Y + PANEL_H - 44

  ctx.fillStyle = '#111008'
  ctx.fillRect(PANEL_X + 10, detailY, PANEL_W - 20, 36)

  let selectedItem = null
  let selectedDef  = null

  if (state.inventoryFocus === 'grid') {
    selectedItem = run.inventory[state.inventorySlot]
    selectedDef  = selectedItem ? getItemDef(selectedItem.defKey) : null
  } else {
    const slot = EQUIP_SLOTS[state.inventorySlot]
    selectedItem = slot ? run.equipment[slot] : null
    selectedDef  = selectedItem ? getItemDef(selectedItem.defKey) : null
  }

  if (selectedDef) {
    ctx.textAlign = 'left'
    ctx.font      = 'bold 12px monospace'
    ctx.fillStyle = '#e8c97a'
    ctx.fillText(selectedDef.name, PANEL_X + 16, detailY + 14)

    ctx.font      = '10px monospace'
    ctx.fillStyle = '#6a5a40'
    const detail = itemDetail(selectedDef)
    ctx.fillText(detail, PANEL_X + 16, detailY + 28)
  }
}

function itemDetail(def: ReturnType<typeof getItemDef>): string {
  if (!def) return ''
  if (def.effect === 'heal') return `Restores ${def.value ?? 0} HP`
  if (def.slot === 'weapon') return `Attack +${def.attackMin ?? 0}–${def.attackMax ?? 0}`
  if (def.slot === 'armor' || def.slot === 'shield') return `Defense +${def.defense ?? 0}`
  return ''
}
