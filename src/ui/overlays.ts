import { getCtx } from '../engine/canvas'
import { GameState } from '../game/gameState'
import { CANVAS_W, CANVAS_H } from '../constants'

// ── Level entry text ──────────────────────────────────────────────────────────

const ENTRY_DURATION_MS = 2800
const ENTRY_FADE_MS     = 600

const LEVEL_TEXT: Record<string, [string, string]> = {
  stone_1:    ['Stone — Level 1', '{placeholder text: Opening line — the player has just descended. Unease, damp air, first steps into darkness.}'],
  stone_2:    ['Stone — Level 2', '{placeholder text: Deepening stone. Hints of those who passed through before.}'],
  stone_3:    ['Stone — Level 3', '{placeholder text: Older stone. The air is different here.}'],
  stone_4:    ['Stone — Level 4', '{placeholder text: Very deep now. The silence has weight.}'],
  stone_5:    ['Stone — Level 5', '{placeholder text: Something shifts. The stone is older than the dungeon around it.}'],
  catacomb_1: ['Catacombs — Level 1', '{placeholder text: The dead are everywhere. Not all of them restful.}'],
  catacomb_2: ['Catacombs — Level 2', '{placeholder text: Growing wrongness. Names are carved in the walls.}'],
  catacomb_3: ['Catacombs — Level 3', '{placeholder text: Some of the names are familiar.}'],
  catacomb_4: ['Catacombs — Level 4', '{placeholder text: The carvings become more recent.}'],
  catacomb_5: ['Catacombs — Level 5', '{placeholder text: The oldest part. Something was sealed here once.}'],
  machine_1:  ['The Works — Level 1', '{placeholder text: Metal and oil. Not natural. Who built this, and when?}'],
  machine_2:  ['The Works — Level 2', '{placeholder text: The machines are still running. They have been running a long time.}'],
  machine_3:  ['The Works — Level 3', '{placeholder text: Purpose, but no operators. The purpose is unclear.}'],
  machine_4:  ['The Works — Level 4', '{placeholder text: Everything here is pointed at something deeper.}'],
  machine_5:  ['The Works — Level 5', '{placeholder text: The source. This is what the dungeon was built around.}'],
}

export function renderLevelEntry(state: GameState): void {
  const elapsed = performance.now() - state.run.levelEntryMs
  if (elapsed >= ENTRY_DURATION_MS) return

  const ctx   = getCtx()
  const texts = LEVEL_TEXT[state.run.floorId]
  if (!texts) return

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
  ctx.fillText(texts[0], CANVAS_W / 2, CANVAS_H / 2 - 18)

  ctx.fillStyle = '#8a7a60'
  ctx.font      = '13px monospace'
  // Wrap the subtitle at ~60 chars
  const subtitle = texts[1]
  const lines    = wrapText(subtitle, 58)
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 + 10 + i * 18)
  })
  ctx.restore()
}

// ── Game over screen ──────────────────────────────────────────────────────────

const DEATH_LINES = [
  'You have perished in the depths.',
  'The darkness takes you.',
  'Your light goes out.',
  'The dungeon claims another.',
  'Here you end.',
]

export function renderGameOver(state: GameState): void {
  const ctx = getCtx()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const line = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)]

  ctx.textAlign = 'center'
  ctx.fillStyle = '#8a2020'
  ctx.font      = 'bold 28px monospace'
  ctx.fillText('YOU DIED', CANVAS_W / 2, CANVAS_H / 2 - 40)

  ctx.fillStyle = '#6a5a4a'
  ctx.font      = '14px monospace'
  ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2)

  ctx.fillStyle = '#4a4030'
  ctx.font      = '12px monospace'
  ctx.fillText('Press ENTER to try again', CANVAS_W / 2, CANVAS_H / 2 + 36)

  // Reached depth
  ctx.fillStyle = '#3a3028'
  ctx.font      = '11px monospace'
  const floorLabel = state.run.floorId.replace('_', ' ')
  ctx.fillText(`Reached: ${floorLabel}`, CANVAS_W / 2, CANVAS_H / 2 + 60)
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
