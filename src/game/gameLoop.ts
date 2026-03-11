import { GameState, makeInitialState, returnToDungeon } from './gameState'
import { clear } from '../engine/canvas'
import { consumeAction, flushInput } from '../engine/input'
import { processMovement } from '../systems/movementSystem'
import { processEnemyTurns, generateEntities } from '../systems/entitySystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'
import { renderLevelEntry, renderGameOver, renderCombatLog, renderHpOverlay, renderDeadEnd } from '../ui/overlays'
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
        state.gameTick++
        processEnemyTurns(state)
        state.enemyMoveMs = performance.now()
        state.run.playerActed = false
      }
      // Remove corpses from any previous position once player has moved away
      if (state.run.corpses.length) {
        const px = state.run.position.x, py = state.run.position.y
        state.run.corpses = state.run.corpses.filter(
          c => c.killedFromX === px && c.killedFromY === py
        )
      }
      break

    case 'game_over': {
      const elapsed = performance.now() - state.gameOverMs
      if (elapsed < 2000) break  // text phase — no input yet

      if (consumeAction('MOVE_FORWARD') || consumeAction('TURN_LEFT')) {
        state.gameOverMenuIndex = Math.max(0, state.gameOverMenuIndex - 1)
      }
      if (consumeAction('MOVE_BACK') || consumeAction('TURN_RIGHT')) {
        state.gameOverMenuIndex = Math.min(1, state.gameOverMenuIndex + 1)
      }
      if (consumeAction('CONFIRM') || consumeAction('INTERACT')) {
        if (state.gameOverMenuIndex === 0) {
          // New Game
          flushInput()
          const fresh = makeInitialState()
          Object.assign(state, fresh)
          spawnEntitiesForFloor(state)
        }
        // Load Game: not yet implemented — do nothing
      }
      break
    }

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
    // Spawn entities when entering a new floor for the first time
    if (!state.run.entitiesSpawned) {
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
      renderDeadEnd(state)
      break

    case 'game_over': {
      const elapsed = performance.now() - state.gameOverMs
      if (elapsed < 2000) {
        // Render the dungeon as background then overlay death screen
        renderDungeon(state)
      }
      renderGameOver(state)
      break
    }

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
  state.run.enemies         = enemies
  state.run.items           = items
  state.run.entitiesSpawned = true
}
