import { GameState, makeInitialState, returnToDungeon } from './gameState'
import { clear } from '../engine/canvas'
import { consumeAction, flushInput } from '../engine/input'
import { processMovement } from '../systems/movementSystem'
import { processEnemyTurns, generateEntities } from '../systems/entitySystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'
import { renderLevelEntry, renderGameOver, renderCombatLog, renderHpOverlay } from '../ui/overlays'
import { renderTown, townMenuItemCount, getTownMenuAction } from '../ui/town'

export function startLoop(state: GameState): void {
  // Populate the first floor's entities
  spawnEntitiesForFloor(state)

  function frame() {
    update(state)
    render(state)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function update(state: GameState): void {
  switch (state.mode) {
    case 'dungeon':
      processMovement(state)
      tickAnim(state)
      if (state.run.playerActed) {
        processEnemyTurns(state)
        state.run.playerActed = false
      }
      break

    case 'game_over':
      if (consumeAction('CONFIRM')) {
        flushInput()
        // Reset state in-place so the loop keeps running
        const fresh = makeInitialState()
        state.mode          = fresh.mode
        state.run           = fresh.run
        state.worldSeed     = fresh.worldSeed
        state.levelIndex    = fresh.levelIndex
        state.townMenuIndex = fresh.townMenuIndex
        spawnEntitiesForFloor(state)
      }
      break

    case 'town':
      updateTown(state)
      break
  }
}

function updateTown(state: GameState): void {
  if (consumeAction('MOVE_FORWARD') || consumeAction('TURN_LEFT')) {
    state.townMenuIndex = Math.max(0, state.townMenuIndex - 1)
  }
  if (consumeAction('MOVE_BACK') || consumeAction('TURN_RIGHT')) {
    state.townMenuIndex = Math.min(townMenuItemCount() - 1, state.townMenuIndex + 1)
  }
  if (consumeAction('INTERACT') || consumeAction('CONFIRM')) {
    const action = getTownMenuAction(state.townMenuIndex)
    if (action === 'dungeon') {
      returnToDungeon(state)
      spawnEntitiesForFloor(state)
    } else if (action === 'rest') {
      state.run.hp = state.run.maxHp
      state.run.combatLog = ['You feel restored.']
    }
  }
}

function tickAnim(state: GameState): void {
  if (!state.run.anim) return
  const t = (performance.now() - state.run.anim.startMs) / state.run.anim.durationMs
  if (t >= 1) {
    state.run.anim = null
    // Spawn entities when we enter a new floor (detected by empty enemy list after advance)
    if (state.run.enemies.length === 0 && state.run.items.length === 0) {
      spawnEntitiesForFloor(state)
    }
  }
}

function render(state: GameState): void {
  clear()
  switch (state.mode) {
    case 'dungeon':
      renderDungeon(state)
      renderHpOverlay(state)
      renderMinimap(state)
      renderCombatLog(state)
      renderLevelEntry(state)
      break

    case 'game_over':
      renderGameOver(state)
      break

    case 'town':
      renderTown(state)
      break
  }
}

function spawnEntitiesForFloor(state: GameState): void {
  const { enemies, items } = generateEntities(
    state.run.floorId,
    state.worldSeed,
    state.levelIndex,
  )
  state.run.enemies = enemies
  state.run.items   = items
}
