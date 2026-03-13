import { GameState, makeInitialState, returnToDungeon, returnToPortal, goToLevel } from './gameState'
import { clear } from '../engine/canvas'
import { consumeAction, flushInput, openCheatConsole, isCheatConsoleActive, getCheatConsoleBuffer, consumeCheatSubmit } from '../engine/input'
import { processMovement } from '../systems/movementSystem'
import { processEnemyTurns, generateEntities } from '../systems/entitySystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'
import { renderLevelEntry, renderGameOver, renderCombatLog, renderHpOverlay, renderDeadEnd, renderCheatConsole } from '../ui/overlays'
import { renderTown, townMenuItemCount, getTownMenuAction, handleTownSaveAction } from '../ui/town'
import { renderInventory, updateInventory } from '../ui/inventory'
import { loadGame } from '../persistence/saveSystem'

export function startLoop(state: GameState): void {
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
      // Inventory takes priority — intercepts all input while open
      if (state.inventoryOpen) {
        updateInventory(state)
        break
      }

      // Open inventory
      if (consumeAction('OPEN_INVENTORY')) {
        state.inventoryOpen  = true
        state.inventoryFocus = 'grid'
        state.inventorySlot  = 0
        flushInput()
        break
      }

      // Open cheat console on Enter
      if (consumeAction('CONFIRM')) {
        openCheatConsole()
        flushInput()
        break
      }

      // Process cheat submission
      {
        const cheat = consumeCheatSubmit()
        if (cheat) {
          processCheat(cheat, state)
          break
        }
      }

      processMovement(state)
      tickAnim(state)
      if (state.run.playerActed) {
        state.gameTick++
        processEnemyTurns(state)
        state.enemyMoveMs = performance.now()
        state.run.playerActed = false
      }
      // Remove corpses once player has moved away from kill site
      if (state.run.corpses.length) {
        const px = state.run.position.x, py = state.run.position.y
        state.run.corpses = state.run.corpses.filter(
          c => c.killedFromX === px && c.killedFromY === py
        )
      }
      break

    case 'game_over': {
      const elapsed = performance.now() - state.gameOverMs
      if (elapsed < 2000) break

      if (consumeAction('MOVE_FORWARD') || consumeAction('TURN_LEFT')) {
        state.gameOverMenuIndex = Math.max(0, state.gameOverMenuIndex - 1)
      }
      if (consumeAction('MOVE_BACK') || consumeAction('TURN_RIGHT')) {
        state.gameOverMenuIndex = Math.min(1, state.gameOverMenuIndex + 1)
      }
      if (consumeAction('CONFIRM') || consumeAction('INTERACT')) {
        if (state.gameOverMenuIndex === 0) {
          flushInput()
          const fresh = makeInitialState()
          Object.assign(state, fresh)
          spawnEntitiesForFloor(state)
        } else if (state.gameOverMenuIndex === 1) {
          flushInput()
          const loaded = loadGame(state)
          if (loaded) {
            if (!state.run.entitiesSpawned) spawnEntitiesForFloor(state)
          }
        }
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
    state.townMenuIndex = Math.min(townMenuItemCount(state) - 1, state.townMenuIndex + 1)
  }
  if (consumeAction('INTERACT') || consumeAction('CONFIRM')) {
    const action = getTownMenuAction(state, state.townMenuIndex)
    if (action === 'dungeon') {
      returnToDungeon(state)
      spawnEntitiesForFloor(state)
    } else if (action === 'rest') {
      state.run.hp = state.run.maxHp
      state.run.combatLog = ['You feel restored.']
    } else if (action.startsWith('portal:')) {
      const floorId = action.slice(7)
      returnToPortal(state, floorId)
      spawnEntitiesForFloor(state)
    } else if (action === 'save' || action === 'export' || action === 'import') {
      handleTownSaveAction(action, state).then(ok => {
        if (action === 'import' && ok) {
          if (!state.run.entitiesSpawned) spawnEntitiesForFloor(state)
        }
        if (action === 'save' && ok) {
          state.run.combatLog = ['Game saved.']
        }
      })
    }
  }
}

function tickAnim(state: GameState): void {
  if (!state.run.anim) return
  const t = (performance.now() - state.run.anim.startMs) / state.run.anim.durationMs
  if (t >= 1) {
    state.run.anim = null
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
      if (isCheatConsoleActive()) renderCheatConsole(getCheatConsoleBuffer())
      if (state.inventoryOpen)    renderInventory(state)
      break

    case 'game_over': {
      const elapsed = performance.now() - state.gameOverMs
      if (elapsed < 2000) renderDungeon(state)
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

function processCheat(text: string, state: GameState): void {
  const m = text.trim().match(/^showmetheway\s+(\d+)$/)
  if (m) {
    const level = parseInt(m[1], 10)
    if (level >= 1 && level <= 15) {
      goToLevel(state, level - 1)
      spawnEntitiesForFloor(state)
    }
  }
}
