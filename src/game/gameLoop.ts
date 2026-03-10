import { GameState } from './gameState'
import { clear } from '../engine/canvas'
import { processMovement } from '../systems/movementSystem'
import { renderDungeon } from '../engine/renderer'
import { renderMinimap } from '../ui/minimap'

export function startLoop(state: GameState): void {
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
      break
  }
}

function tickAnim(state: GameState): void {
  if (!state.run.anim) return
  const t = (performance.now() - state.run.anim.startMs) / state.run.anim.durationMs
  if (t >= 1) state.run.anim = null
}

function render(state: GameState): void {
  clear()
  switch (state.mode) {
    case 'dungeon':
      renderDungeon(state)
      renderMinimap(state)
      break
  }
}
