import { GameState, advanceLevel } from '../game/gameState'
import { consumeAction } from '../engine/input'
import { stepOffset, turnLeft, turnRight, isPassable, revealAround } from './mapSystem'
import { getFloor } from '../content/floors'
import { playerAttack, tryPickupItem } from './entitySystem'

const MOVE_MS = 160
const TURN_MS = 180

export function processMovement(state: GameState): void {
  const run = state.run
  if (state.mode !== 'dungeon') return

  if (consumeAction('TURN_LEFT')) {
    const prev = run.facing
    run.facing     = turnLeft(run.facing)
    run.anim       = { type: 'turn_left', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }
    run.playerActed = true

  } else if (consumeAction('TURN_RIGHT')) {
    const prev = run.facing
    run.facing     = turnRight(run.facing)
    run.anim       = { type: 'turn_right', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }
    run.playerActed = true

  } else if (consumeAction('MOVE_FORWARD')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x + dx
    const ny = run.position.y + dy
    // Bump attack if enemy is there
    if (playerAttack(run, nx, ny)) {
      run.playerActed = true
    } else if (isPassable(run.floorId, nx, ny)) {
      const prev       = run.facing
      run.position.x   = nx
      run.position.y   = ny
      run.playerActed  = true
      revealAround(state)
      tryPickupItem(run, nx, ny)
      run.anim = { type: 'forward', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
      const floor = getFloor(run.floorId)
      if (floor && nx === floor.exitX && ny === floor.exitY) advanceLevel(state)
    }

  } else if (consumeAction('MOVE_BACK')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x - dx
    const ny = run.position.y - dy
    if (isPassable(run.floorId, nx, ny)) {
      const prev       = run.facing
      run.position.x   = nx
      run.position.y   = ny
      run.playerActed  = true
      revealAround(state)
      tryPickupItem(run, nx, ny)
      run.anim = { type: 'back', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
    }

  } else if (consumeAction('INTERACT')) {
    interactFacing(state)
  }
}

function interactFacing(state: GameState): void {
  const run = state.run
  const { dx, dy } = stepOffset(run.facing)
  const tx = run.position.x + dx
  const ty = run.position.y + dy
  const floor = getFloor(run.floorId)
  if (!floor) return
  if (ty < 0 || ty >= floor.height || tx < 0 || tx >= floor.width) return
  const cell = floor.cells[ty][tx]
  if (cell.wallOverride === 'door_closed') {
    floor.cells[ty][tx] = { type: 'floor' }
    state.run.playerActed = true
  }
}
