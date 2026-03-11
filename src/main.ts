import { initCanvas } from './engine/canvas'
import { initInput } from './engine/input'
import { initControls } from './ui/controls'
import { makeInitialState } from './game/gameState'
import { revealAround } from './systems/mapSystem'
import { startLoop } from './game/gameLoop'
import { preloadAssets } from './engine/assets'
import { loadGame } from './persistence/saveSystem'

async function main() {
  initCanvas()
  initInput()
  initControls()

  const state = makeInitialState()

  // Restore previous session if a save exists
  const restored = loadGame(state)
  if (!restored) {
    // Fresh start — reveal the spawn area
    revealAround(state)
  }

  await preloadAssets()
  startLoop(state)
}

main()
