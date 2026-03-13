import { GameState, makeInitialState, returnToDungeon, returnToPortal, goToLevel, pushCombatLog } from './gameState'
import { clear } from '../engine/canvas'
import { consumeAction, flushInput, openCheatConsole, isCheatConsoleActive, getCheatConsoleBuffer, consumeCheatSubmit, hasAnyAction } from '../engine/input'
import { processMovement } from '../systems/movementSystem'
import { processEnemyTurns, generateEntities, makeItemInstance } from '../systems/entitySystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'
import { renderLevelEntry, renderGameOver, renderCombatLog, renderHpOverlay, renderDeadEnd, renderCheatConsole } from '../ui/overlays'
import { renderTown, townMenuItemCount, getTownMenuAction, handleTownSaveAction, triggerRestEffect, isShopOpen, openShop, closeShop, shopNav, shopConfirm, openShopMenu, closeShopMenu } from '../ui/town'
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
      // Dismiss level-entry splash on any keypress (before consuming the action)
      if (
        state.run.levelEntryDismissMs === null &&
        !state.shownLevelEntries.has(state.run.floorId) &&
        hasAnyAction()
      ) {
        state.run.levelEntryDismissMs = performance.now()
      }

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
      if (consumeAction('CONFIRM') || consumeAction('INTERACT') || consumeAction('ATTACK')) {
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
  // Shop overlay intercepts all input while open
  if (isShopOpen()) {
    if (consumeAction('MOVE_FORWARD') || consumeAction('TURN_LEFT'))  shopNav(-1, state.run)
    if (consumeAction('MOVE_BACK')    || consumeAction('TURN_RIGHT')) shopNav(1,  state.run)
    if (consumeAction('CONFIRM') || consumeAction('INTERACT') || consumeAction('ATTACK')) shopConfirm(state.run)
    if (consumeAction('CANCEL')) closeShop()
    return
  }

  // Esc navigates back through shop layers
  if (consumeAction('CANCEL')) {
    closeShopMenu()
    state.townMenuIndex = 0
    return
  }

  if (consumeAction('MOVE_FORWARD') || consumeAction('TURN_LEFT')) {
    state.townMenuIndex = Math.max(0, state.townMenuIndex - 1)
  }
  if (consumeAction('MOVE_BACK') || consumeAction('TURN_RIGHT')) {
    state.townMenuIndex = Math.min(townMenuItemCount(state) - 1, state.townMenuIndex + 1)
  }
  if (consumeAction('INTERACT') || consumeAction('CONFIRM') || consumeAction('ATTACK')) {
    const action = getTownMenuAction(state, state.townMenuIndex)
    if (action === 'dungeon') {
      closeShopMenu()
      returnToDungeon(state)
      spawnEntitiesForFloor(state)
    } else if (action === 'rest') {
      const healed = state.run.maxHp - state.run.hp
      state.run.hp = state.run.maxHp
      const msg = healed > 0
        ? `Rested. +${healed} HP restored. (${state.run.maxHp}/${state.run.maxHp})`
        : 'You rest, but are already at full health.'
      state.run.combatLog = [msg]
      triggerRestEffect(healed)
    } else if (action === 'shop') {
      openShopMenu()
      state.townMenuIndex = 0
    } else if (action === 'shop_back') {
      closeShopMenu()
      state.townMenuIndex = 0
    } else if (action === 'sell') {
      openShop()
    } else if (action === 'buy_potion_sm') {
      if (state.run.gold < 20) {
        pushCombatLog(state.run, 'Not enough gold. (need 20g)')
      } else if (state.run.inventory.length >= 36) {
        pushCombatLog(state.run, 'Inventory full.')
      } else {
        state.run.gold -= 20
        state.run.inventory.push(makeItemInstance('potion_sm'))
        pushCombatLog(state.run, 'Bought a Healing Draught.')
      }
    } else if (action === 'buy_potion_lg') {
      if (state.run.gold < 50) {
        pushCombatLog(state.run, 'Not enough gold. (need 50g)')
      } else if (state.run.inventory.length >= 36) {
        pushCombatLog(state.run, 'Inventory full.')
      } else {
        state.run.gold -= 50
        state.run.inventory.push(makeItemInstance('potion_lg'))
        pushCombatLog(state.run, 'Bought a Healing Potion.')
      }
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
  const cmd = text.trim()

  if (cmd === 'helpmedaddy') {
    state.run.hp = state.run.maxHp
    pushCombatLog(state.run, 'Full heal.')
    return
  }

  const m = cmd.match(/^showmetheway\s+(\d+)$/)
  if (m) {
    const level = parseInt(m[1], 10)
    if (level >= 1 && level <= 15) {
      goToLevel(state, level - 1)
      spawnEntitiesForFloor(state)
    }
  }
}
