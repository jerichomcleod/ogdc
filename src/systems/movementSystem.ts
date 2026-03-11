import { GameState, advanceLevel, goUp } from '../game/gameState'
import { consumeAction } from '../engine/input'
import { stepOffset, turnLeft, turnRight, isPassable, revealAround } from './mapSystem'
import { getFloor } from '../content/floors'
import { Cell } from '../content/types'
import { playerAttack, tryPickupItem, useItem } from './entitySystem'
import { getDeadEndText } from '../engine/assets'

const MOVE_MS = 160
const TURN_MS = 180

export function processMovement(state: GameState): void {
  const run = state.run
  if (state.mode !== 'dungeon') return

  // ── Turning ────────────────────────────────────────────────────────────────
  if (consumeAction('TURN_LEFT')) {
    const prev = run.facing
    run.facing              = turnLeft(run.facing)
    run.playerActed         = true
    state.lastActionWasTurn = true
    run.anim        = { type: 'turn_left', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }

  } else if (consumeAction('TURN_RIGHT')) {
    const prev = run.facing
    run.facing              = turnRight(run.facing)
    run.playerActed         = true
    state.lastActionWasTurn = true
    run.anim        = { type: 'turn_right', prevFacing: prev, startMs: performance.now(), durationMs: TURN_MS }

  // ── Forward / back movement ────────────────────────────────────────────────
  } else if (consumeAction('MOVE_FORWARD')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x + dx, ny = run.position.y + dy
    if (!isPassable(run.floorId, nx, ny) && tryStairTransit(state, nx, ny)) {
      run.playerActed         = true
      state.lastActionWasTurn = false
    } else if (isPassable(run.floorId, nx, ny) && !run.enemies.some(e => e.x === nx && e.y === ny)) {
      const prev      = run.facing
      run.position.x  = nx
      run.position.y  = ny
      run.playerActed         = true
      state.lastActionWasTurn = false
      revealAround(state)
      tryPickupItem(run, nx, ny)
      checkDeadEnd(state)
      run.anim = { type: 'forward', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
    }

  } else if (consumeAction('MOVE_BACK')) {
    const { dx, dy } = stepOffset(run.facing)
    const nx = run.position.x - dx, ny = run.position.y - dy
    if (isPassable(run.floorId, nx, ny) && !run.enemies.some(e => e.x === nx && e.y === ny)) {
      const prev      = run.facing
      run.position.x  = nx
      run.position.y  = ny
      run.playerActed         = true
      state.lastActionWasTurn = false
      revealAround(state)
      tryPickupItem(run, nx, ny)
      checkDeadEnd(state)
      run.anim = { type: 'back', prevFacing: prev, startMs: performance.now(), durationMs: MOVE_MS }
    }

  // ── Attack ─────────────────────────────────────────────────────────────────
  } else if (consumeAction('ATTACK')) {
    attackFacing(state)
    run.playerActed         = true
    state.lastActionWasTurn = false

  // ── Use item ───────────────────────────────────────────────────────────────
  } else if (consumeAction('USE_ITEM')) {
    if (useItem(run)) {
      run.playerActed         = true
      state.lastActionWasTurn = false
    }

  // ── Interact ───────────────────────────────────────────────────────────────
  } else if (consumeAction('INTERACT')) {
    if (interactFacing(state)) {
      run.playerActed         = true
      state.lastActionWasTurn = false
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

// ── Dead-end detection ────────────────────────────────────────────────────────

function checkDeadEnd(state: GameState): void {
  const run   = state.run
  const floor = getFloor(run.floorId)
  if (!floor) return
  const { x, y } = run.position

  // Count open neighbours — floor tiles OR passable/openable wall cells (doors).
  // Doors are walls but not true dead ends; only solid walls count as blocked.
  const neighbors = [
    floor.cells[y - 1]?.[x],
    floor.cells[y + 1]?.[x],
    floor.cells[y]?.[x - 1],
    floor.cells[y]?.[x + 1],
  ]
  const isDoorLike = (c: Cell | undefined) =>
    c?.type === 'wall' && (c.wallOverride === 'door_closed' || c.wallOverride === 'door_open')
  const floorCount = neighbors.filter(c => c?.type === 'floor' || isDoorLike(c)).length

  if (floorCount <= 1) {
    // Determine theme from floorId
    const theme = run.floorId.startsWith('catacomb') ? 'catacomb'
                : run.floorId.startsWith('machine')  ? 'machine'
                : 'stone'
    const msg = getDeadEndText(theme)
    if (msg) {
      run.deadEndMsg = msg
      run.deadEndMs  = performance.now()
    }
  }
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
    floor.cells[ty][tx] = { type: 'wall', wallOverride: 'door_open' }
    return true
  }
  return false
}

// ── Stair transit on forward movement ─────────────────────────────────────────

function tryStairTransit(state: GameState, tx: number, ty: number): boolean {
  const floor = getFloor(state.run.floorId)
  if (!floor || ty < 0 || ty >= floor.height || tx < 0 || tx >= floor.width) return false
  const cell = floor.cells[ty][tx]
  if (cell.wallOverride === 'stairs_down') { advanceLevel(state); return true }
  if (cell.wallOverride === 'stairs_up' || cell.wallOverride === 'town_gate') { goUp(state); return true }
  return false
}
