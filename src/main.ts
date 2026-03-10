import { initCanvas } from './engine/canvas'
import { initInput } from './engine/input'
import { initControls } from './ui/controls'
import { makeInitialState } from './game/gameState'
import { revealAround } from './systems/mapSystem'
import { startLoop } from './game/gameLoop'
import { preloadAssets } from './engine/assets'

async function main() {
  initCanvas()
  initInput()
  initControls()

  const state = makeInitialState()
  revealAround(state)

  await preloadAssets()
  startLoop(state)
}

main()
