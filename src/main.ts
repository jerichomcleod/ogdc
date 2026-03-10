import { initCanvas } from './engine/canvas'
import { initInput } from './engine/input'
import { makeInitialState } from './game/gameState'
import { revealAround } from './systems/mapSystem'
import { startLoop } from './game/gameLoop'
import { preloadAssets } from './engine/assets'

async function main() {
  initCanvas()
  initInput()

  const state = makeInitialState()
  revealAround(state)

  await preloadAssets()
  startLoop(state)
}

main()
