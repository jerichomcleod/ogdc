import { GameState, makeInitialState } from './gameState'
import { clear } from '../engine/canvas'
import { consumeAction, flushInput } from '../engine/input'
import { processMovement } from '../systems/movementSystem'
import { processEnemyTurns, generateEntities } from '../systems/entitySystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'
import { renderLevelEntry, renderGameOver, renderCombatLog, renderHpOverlay } from '../ui/overlays'

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
        state.mode       = fresh.mode
        state.run        = fresh.run
        state.worldSeed  = fresh.worldSeed
        state.levelIndex = fresh.levelIndex
        spawnEntitiesForFloor(state)
      }
      break
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
