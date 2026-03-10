import { GameState, advanceLevel } from '../game/gameState'
import { consumeAction } from '../engine/input'
import { stepOffset, turnLeft, turnRight, isPassable, revealAround } from './mapSystem'
import { getFloor } from '../content/floors'
import { playerAttack, tryPickupItem, useItem } from './entitySystem'

const MOVE_MS = 160
const TURN_MS = 180

export function processMovement(state: GameState): void {
  const run = state.run
  if (state.mode !== 'dungeon') return

  // ── Turning ────────────────────────────────────────────────────────────────
  if (consumeAction('TURN_LEFT')) {
    const prev = run.facing
    run.facing      = turnLeft(run.facing)
    run.playerActed = true
    run.anim        = { type: 'turn_left', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }

  } else if (consumeAction('TURN_RIGHT')) {
    const prev = run.facing
    run.facing      = turnRight(run.facing)
    run.playerActed = true
    run.anim        = { type: 'turn_right', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }

  // ── Forward / back movement ────────────────────────────────────────────────
  } else if (consumeAction('MOVE_FORWARD')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x + dx, ny = run.position.y + dy
    if (isPassable(run.floorId, nx, ny) && !run.enemies.some(e => e.x === nx && e.y === ny)) {
      const prev      = run.facing
      run.position.x  = nx
      run.position.y  = ny
      run.playerActed = true
      revealAround(state)
      tryPickupItem(run, nx, ny)
      run.anim = { type: 'forward', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
      const floor = getFloor(run.floorId)
      if (floor && nx === floor.exitX && ny === floor.exitY) advanceLevel(state)
    }

  } else if (consumeAction('MOVE_BACK')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x - dx, ny = run.position.y - dy
    if (isPassable(run.floorId, nx, ny) && !run.enemies.some(e => e.x === nx && e.y === ny)) {
      const prev      = run.facing
      run.position.x  = nx
      run.position.y  = ny
      run.playerActed = true
      revealAround(state)
      tryPickupItem(run, nx, ny)
      run.anim = { type: 'back', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
    }

  // ── Attack ─────────────────────────────────────────────────────────────────
  } else if (consumeAction('ATTACK')) {
    if (attackFacing(state)) {
      run.playerActed = true
    }

  // ── Use item ───────────────────────────────────────────────────────────────
  } else if (consumeAction('USE_ITEM')) {
    if (useItem(run)) {
      run.playerActed = true
    }

  // ── Interact ───────────────────────────────────────────────────────────────
  } else if (consumeAction('INTERACT')) {
    if (interactFacing(state)) {
      run.playerActed = true
    }
  }
}

// ── Attack in facing direction (or nearest adjacent enemy) ────────────────────

function attackFacing(state: GameState): boolean {
  const run              = state.run
  const { dx, dy }       = stepOffset(run.facing)
  const fx               = run.position.x + dx
  const fy               = run.position.y + dy

  // Try facing cell first
  if (playerAttack(run, fx, fy)) return true

  // No direct hit — check the other 3 adjacent cells in order of priority
  const adjacents: [number, number][] = [
    [run.position.x + dx + dy, run.position.y + dy - dx],   // 45° left of facing
    [run.position.x + dx - dy, run.position.y + dy + dx],   // 45° right of facing
    [run.position.x - dx,      run.position.y - dy],        // behind
  ]
  for (const [ax, ay] of adjacents) {
    if (playerAttack(run, ax, ay)) return true
  }

  return false
}

// ── Interact with the cell directly in front ──────────────────────────────────

function interactFacing(state: GameState): boolean {
  const run = state.run
  const { dx, dy } = stepOffset(run.facing)
  const tx = run.position.x + dx
  const ty = run.position.y + dy
  const floor = getFloor(run.floorId)
  if (!floor) return false
  if (ty < 0 || ty >= floor.height || tx < 0 || tx >= floor.width) return false
  const cell = floor.cells[ty][tx]
  if (cell.wallOverride === 'door_closed') {
    floor.cells[ty][tx] = { type: 'floor' }
    return true
  }
  return false
}
