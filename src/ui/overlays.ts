import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'
import { getLevelDescText } from '../engine/assets'

// ── Level entry text ──────────────────────────────────────────────────────────

const ENTRY_DURATION_MS = 2800
const ENTRY_FADE_MS     = 600

function levelLabel(floorId: string): string {
  const LABELS: Record<string, string> = {
    stone_1: 'Stone — Level 1',    stone_2: 'Stone — Level 2',
    stone_3: 'Stone — Level 3',    stone_4: 'Stone — Level 4',
    stone_5: 'Stone — Level 5',
    catacomb_1: 'Catacombs — Level 1', catacomb_2: 'Catacombs — Level 2',
    catacomb_3: 'Catacombs — Level 3', catacomb_4: 'Catacombs — Level 4',
    catacomb_5: 'Catacombs — Level 5',
    machine_1: 'The Works — Level 1',  machine_2: 'The Works — Level 2',
    machine_3: 'The Works — Level 3',  machine_4: 'The Works — Level 4',
    machine_5: 'The Works — Level 5',
  }
  return LABELS[floorId] ?? floorId
}

let _cachedDescFloor = ''
let _cachedDesc      = ''

export function renderLevelEntry(state: GameState): void {
  // Only show once per floor per run
  if (state.shownLevelEntries.has(state.run.floorId)) return

  // Cache the subtitle per floor to avoid re-randomising each frame
  if (state.run.floorId !== _cachedDescFloor) {
    _cachedDescFloor = state.run.floorId
    _cachedDesc      = getLevelDescText(state.run.floorId)
  }

  const elapsed = performance.now() - state.run.levelEntryMs
  if (elapsed >= ENTRY_DURATION_MS) {
    state.shownLevelEntries.add(state.run.floorId)
    return
  }

  const title = levelLabel(state.run.floorId)
  if (!title) return

  const ctx     = getCtx()
  const subtitle = _cachedDesc

  // Fade in first 300ms, full alpha until fade point, then fade out
  let alpha = 1
  if (elapsed < 300) {
    alpha = elapsed / 300
  } else if (elapsed > ENTRY_DURATION_MS - ENTRY_FADE_MS) {
    alpha = (ENTRY_DURATION_MS - elapsed) / ENTRY_FADE_MS
  }
  alpha = Math.max(0, Math.min(1, alpha))

  ctx.save()
  ctx.globalAlpha = alpha * 0.82
  ctx.fillStyle   = '#000'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.globalAlpha = alpha

  ctx.textAlign    = 'center'
  ctx.fillStyle    = '#d4b87a'
  ctx.font         = 'bold 22px monospace'
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 18)

  ctx.fillStyle = '#8a7a60'
  ctx.font      = '13px monospace'
  // Wrap the subtitle at ~60 chars
  const lines    = wrapText(subtitle, 58)
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 + 10 + i * 18)
  })
  ctx.restore()
}

// ── Game over screen ──────────────────────────────────────────────────────────

const GAMEOVER_TEXT_MS = 2000  // show text overlay for 2 seconds before menu

export function renderGameOver(state: GameState): void {
  const ctx     = getCtx()
  const elapsed = performance.now() - state.gameOverMs

  if (elapsed < GAMEOVER_TEXT_MS) {
    // Phase 1: darken the dungeon view that's already rendered, overlay death text
    // Apply 50% dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Fade in over first 400ms
    const alpha = Math.min(1, elapsed / 400)
    ctx.save()
    ctx.globalAlpha = alpha

    ctx.textAlign = 'center'
    ctx.fillStyle = '#8a2020'
    ctx.font      = 'bold 26px monospace'
    ctx.fillText('YOU DIED', CANVAS_W / 2, CANVAS_H / 2 - 28)

    ctx.fillStyle = '#6a5a4a'
    ctx.font      = '13px monospace'
    const lines = wrapText(state.gameOverMessage, 58)
    lines.forEach((line, i) => {
      ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 + 4 + i * 18)
    })

    ctx.restore()
  } else {
    // Phase 2: menu
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#6a1818'
    ctx.font      = 'bold 26px monospace'
    ctx.fillText('YOU DIED', CANVAS_W / 2, CANVAS_H / 2 - 60)

    ctx.fillStyle = '#5a4a3a'
    ctx.font      = '13px monospace'
    ctx.fillText(state.gameOverMessage, CANVAS_W / 2, CANVAS_H / 2 - 30)

    // Reached depth
    ctx.fillStyle = '#3a3028'
    ctx.font      = '11px monospace'
    const floorLabel = state.run.floorId.replace('_', ' ')
    ctx.fillText(`Reached: ${floorLabel}`, CANVAS_W / 2, CANVAS_H / 2 - 10)

    // Menu items
    const menuItems = ['New Game', 'Load Game']
    menuItems.forEach((label, i) => {
      const y = CANVAS_H / 2 + 24 + i * 28
      const selected = state.gameOverMenuIndex === i
      if (selected) {
        ctx.fillStyle = 'rgba(200,100,100,0.15)'
        ctx.fillRect(CANVAS_W / 2 - 100, y - 14, 200, 22)
        ctx.fillStyle = '#e86060'
      } else {
        ctx.fillStyle = '#4a3028'
      }
      ctx.font = selected ? 'bold 14px monospace' : '14px monospace'
      ctx.fillText((selected ? '▶ ' : '  ') + label, CANVAS_W / 2, y)
    })

    ctx.fillStyle = '#2a2018'
    ctx.font      = '10px monospace'
    ctx.fillText('↑↓ Navigate   ENTER to confirm', CANVAS_W / 2, CANVAS_H - 14)
  }
}

// ── HP overlay (top-left of the game canvas) ─────────────────────────────────

export function renderHpOverlay(state: GameState): void {
  if (state.mode !== 'dungeon') return
  const ctx = getCtx()
  const run = state.run
  const label = `HP  ${run.hp} / ${run.maxHp}`

  ctx.save()
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'left'
  const tw = ctx.measureText(label).width

  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(7, 7, tw + 14, 22)

  ctx.fillStyle = run.hp <= Math.floor(run.maxHp * 0.25) ? '#e86060' : '#c8a96a'
  ctx.fillText(label, 14, 23)
  ctx.restore()
}

// ── Combat log (updates HTML #combat-log element) ────────────────────────────

export function renderCombatLog(state: GameState): void {
  const logEl = document.getElementById('combat-log')
  if (!logEl) return
  const log = state.run.combatLog
  if (!log.length) return
  // Render newest last (bottom) — same order as before
  logEl.innerHTML = log
    .map((msg, i) => {
      const age     = log.length - 1 - i  // 0 = newest
      const opacity = Math.max(0.25, 1 - age * 0.22).toFixed(2)
      const color   = age === 0 ? '#e8c97a' : '#8a7a5a'
      return `<div style="opacity:${opacity};color:${color}">${msg}</div>`
    })
    .join('')
}

// ── Dead-end overlay ──────────────────────────────────────────────────────────

const DEADEND_DURATION_MS = 3500
const DEADEND_FADE_MS     = 700

export function renderDeadEnd(state: GameState): void {
  if (!state.run.deadEndMs) return
  const elapsed = performance.now() - state.run.deadEndMs
  if (elapsed >= DEADEND_DURATION_MS) { state.run.deadEndMs = null; return }

  let alpha = 1
  if (elapsed < 400) alpha = elapsed / 400
  else if (elapsed > DEADEND_DURATION_MS - DEADEND_FADE_MS)
    alpha = (DEADEND_DURATION_MS - elapsed) / DEADEND_FADE_MS
  alpha = Math.max(0, Math.min(1, alpha))

  const ctx  = getCtx()
  const msg  = state.run.deadEndMsg
  const lines = wrapText(msg, 62)
  const boxH  = lines.length * 17 + 18
  const boxY  = CANVAS_H - boxH - 10

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle   = 'rgba(0,0,0,0.72)'
  ctx.fillRect(20, boxY, CANVAS_W - 40, boxH)

  ctx.fillStyle = '#6a5a4a'
  ctx.font      = '12px monospace'
  ctx.textAlign = 'center'
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, boxY + 14 + i * 17)
  })
  ctx.restore()
}

// ── Cheat console overlay ─────────────────────────────────────────────────────

export function renderCheatConsole(buffer: string): void {
  const ctx  = getCtx()
  const text = '> ' + buffer + '_'
  const boxW = CANVAS_W - 40
  const boxH = 36
  const boxX = 20
  const boxY = Math.floor(CANVAS_H / 2) - 18

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.88)'
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.strokeStyle = '#c8a96a'
  ctx.lineWidth   = 1
  ctx.strokeRect(boxX, boxY, boxW, boxH)

  ctx.fillStyle = '#c8a96a'
  ctx.font      = '14px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(text, boxX + 10, boxY + boxH / 2 + 5)
  ctx.restore()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapText(text: string, maxChars: number): string[] {
  const words  = text.split(' ')
  const lines: string[] = []
  let   cur    = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      lines.push(cur.trim())
      cur = w
    } else {
      cur += (cur ? ' ' : '') + w
    }
  }
  if (cur) lines.push(cur.trim())
  return lines
}
