/**
 * Save / load / export / import game state.
 *
 * Persistence strategy:
 *   - localStorage key "ogdc_save" for in-browser save (always available)
 *   - JSON file download/upload for durable cross-device backup
 *
 * performance.now() timestamps are zeroed on load — they are visual timing
 * values that don't need to survive a session boundary.
 */

import { GameState, RunState, GameMode } from '../game/gameState'
import { regenerateDungeons } from '../content/floors'
import { Direction } from '../content/types'
import { EnemyInstance, ItemInstance, Corpse, Equipment } from '../content/defs'

const SAVE_KEY     = 'ogdc_save'
const SAVE_VERSION = 2

// ── Serialized shape ─────────────────────────────────────────────────────────

interface SaveRun {
  floorId:         string
  position:        { x: number; y: number }
  facing:          Direction
  hp:              number
  maxHp:           number
  mapRevealed:     boolean[][]
  floorFlags:      Record<string, boolean>
  enemies:         EnemyInstance[]
  corpses:         Corpse[]
  items:           ItemInstance[]
  inventory:       ItemInstance[]
  equipment:       Equipment
  gold:            number
  combatLog:       string[]
  entitiesSpawned: boolean
}

interface SaveFile {
  version:           number
  worldSeed:         number
  levelIndex:        number
  gameTick:          number
  mode:              GameMode
  townMenuIndex:     number
  shownLevelEntries: string[]
  discoveredPortals: string[]
  run:               SaveRun
}

// ── Serialize ─────────────────────────────────────────────────────────────────

function serialize(state: GameState): SaveFile {
  const r = state.run
  return {
    version:           SAVE_VERSION,
    worldSeed:         state.worldSeed,
    levelIndex:        state.levelIndex,
    gameTick:          state.gameTick,
    mode:              state.mode === 'game_over' ? 'dungeon' : state.mode,
    townMenuIndex:     state.townMenuIndex,
    shownLevelEntries: [...state.shownLevelEntries],
    discoveredPortals: [...state.discoveredPortals],
    run: {
      floorId:         r.floorId,
      position:        { ...r.position },
      facing:          r.facing,
      hp:              Math.max(1, r.hp),
      maxHp:           r.maxHp,
      mapRevealed:     r.mapRevealed.map(row => [...row]),
      floorFlags:      { ...r.floorFlags },
      enemies:         r.enemies.map(e => ({ ...e })),
      corpses:         [],
      items:           r.items.map(i => ({ ...i })),
      inventory:       r.inventory.map(i => ({ ...i })),
      equipment:       {
        weapon: r.equipment.weapon ? { ...r.equipment.weapon } : null,
        armor:  r.equipment.armor  ? { ...r.equipment.armor  } : null,
        shield: r.equipment.shield ? { ...r.equipment.shield } : null,
      },
      gold:            r.gold,
      combatLog:       [...r.combatLog],
      entitiesSpawned: r.entitiesSpawned,
    },
  }
}

// ── Deserialize ───────────────────────────────────────────────────────────────

function deserialize(data: SaveFile, state: GameState): void {
  regenerateDungeons(data.worldSeed)

  state.worldSeed         = data.worldSeed
  state.levelIndex        = data.levelIndex
  state.gameTick          = data.gameTick
  state.mode              = data.mode
  state.townMenuIndex     = data.townMenuIndex
  state.shownLevelEntries = new Set(data.shownLevelEntries)
  state.discoveredPortals = new Set(data.discoveredPortals ?? [])

  state.gameOverMs        = 0
  state.gameOverMessage   = ''
  state.gameOverMenuIndex = 0
  state.enemyMoveMs       = 0
  state.lastActionWasTurn = false
  state.inventoryOpen     = false
  state.inventorySlot     = 0
  state.inventoryFocus    = 'grid'

  const r = data.run
  const run: RunState = {
    floorId:         r.floorId,
    position:        { ...r.position },
    facing:          r.facing,
    hp:              r.hp,
    maxHp:           r.maxHp,
    mapRevealed:     r.mapRevealed,
    floorFlags:      r.floorFlags,
    anim:            null,
    enemies:         r.enemies,
    corpses:         r.corpses,
    items:           r.items,
    inventory:       r.inventory,
    equipment:       r.equipment ?? { weapon: null, armor: null, shield: null },
    gold:            r.gold ?? 0,
    combatLog:       r.combatLog,
    levelEntryMs:    0,
    playerActed:     false,
    deadEndMsg:      '',
    deadEndMs:       null,
    entitiesSpawned: r.entitiesSpawned,
    lastHitMs:           0,
    levelEntryDismissMs: null,
  }
  state.run = run
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(raw: unknown): raw is SaveFile {
  if (!raw || typeof raw !== 'object') return false
  const d = raw as Record<string, unknown>
  return (
    d['version'] === SAVE_VERSION &&
    typeof d['worldSeed']  === 'number' &&
    typeof d['levelIndex'] === 'number' &&
    !!d['run'] &&
    typeof (d['run'] as Record<string, unknown>)['floorId'] === 'string'
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)))
  } catch (e) {
    console.warn('Save failed:', e)
  }
}

export function loadGame(state: GameState): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as unknown
    if (!validate(data)) return false
    deserialize(data, state)
    return true
  } catch (e) {
    console.warn('Load failed:', e)
    return false
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}

export function exportSave(state: GameState): void {
  const blob = new Blob([JSON.stringify(serialize(state), null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'wake-depths-save.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function importSave(state: GameState): Promise<boolean> {
  return new Promise(resolve => {
    const input  = document.createElement('input')
    input.type   = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(false); return }
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target!.result as string) as unknown
          if (!validate(data)) { resolve(false); return }
          deserialize(data, state)
          saveGame(state)
          resolve(true)
        } catch {
          resolve(false)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
