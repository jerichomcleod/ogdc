import { Direction } from '../content/types'
import { LEVEL_SEQUENCE, LevelId, getFloor, regenerateDungeons } from '../content/floors'

export interface CamAnim {
  type:        'forward' | 'back' | 'turn_left' | 'turn_right'
  prevFacing:  Direction
  startMs:     number
  durationMs:  number
}

export interface RunState {
  floorId:     string
  position:    { x: number; y: number }
  facing:      Direction
  hp:          number
  maxHp:       number
  mapRevealed: boolean[][]
  floorFlags:  Record<string, boolean>
  anim:        CamAnim | null
}

export type GameMode = 'dungeon'

export interface GameState {
  mode:       GameMode
  run:        RunState
  worldSeed:  number
  levelIndex: number    // current index into LEVEL_SEQUENCE
}

function makeRevealedGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array(width).fill(false))
}

function spawnOnFloor(floorId: LevelId): RunState {
  const floor = getFloor(floorId)!
  return {
    floorId,
    position:    { x: floor.spawnX, y: floor.spawnY },
    facing:      floor.spawnFacing,
    hp:          60,
    maxHp:       60,
    mapRevealed: makeRevealedGrid(floor.width, floor.height),
    floorFlags:  {},
    anim:        null,
  }
}

export function makeInitialState(): GameState {
  const worldSeed  = (Math.random() * 0xFFFF_FFFF) >>> 0
  regenerateDungeons(worldSeed)
  const levelIndex = 0
  return {
    mode:       'dungeon',
    worldSeed,
    levelIndex,
    run:        spawnOnFloor(LEVEL_SEQUENCE[levelIndex]),
  }
}

/** Advance to the next level.  After the last level, resets the world. */
export function advanceLevel(state: GameState): void {
  const next = state.levelIndex + 1
  if (next >= LEVEL_SEQUENCE.length) {
    // Completed all levels — town reset
    const newSeed = (Math.random() * 0xFFFF_FFFF) >>> 0
    state.worldSeed  = newSeed
    state.levelIndex = 0
    regenerateDungeons(newSeed)
  } else {
    state.levelIndex = next
  }
  state.run = spawnOnFloor(LEVEL_SEQUENCE[state.levelIndex])
}
