import { GameState, advanceLevel } from '../game/gameState'
import { consumeAction } from '../engine/input'
import { stepOffset, turnLeft, turnRight, isPassable, revealAround } from './mapSystem'
import { getFloor } from '../content/floors'

const MOVE_MS = 160
const TURN_MS = 180

export function processMovement(state: GameState): void {
  const run = state.run

  if (consumeAction('TURN_LEFT')) {
    const prev = run.facing
    run.facing = turnLeft(run.facing)
    run.anim = { type: 'turn_left', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }
  } else if (consumeAction('TURN_RIGHT')) {
    const prev = run.facing
    run.facing = turnRight(run.facing)
    run.anim = { type: 'turn_right', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }
  } else if (consumeAction('MOVE_FORWARD')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x + dx
    const ny = run.position.y + dy
    if (isPassable(run.floorId, nx, ny)) {
      const prev = run.facing
      run.position.x = nx
      run.position.y = ny
      revealAround(state)
      run.anim = { type: 'forward', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
      // Check for level exit
      const floor = getFloor(run.floorId)
      if (floor && nx === floor.exitX && ny === floor.exitY) advanceLevel(state)
    }
  } else if (consumeAction('MOVE_BACK')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x - dx
    const ny = run.position.y - dy
    if (isPassable(run.floorId, nx, ny)) {
      const prev = run.facing
      run.position.x = nx
      run.position.y = ny
      revealAround(state)
      run.anim = { type: 'back', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
    }
  }
}
