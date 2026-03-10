import { Direction } from '../content/types'
import { TEST_FLOOR } from '../content/floors'

export interface CamAnim {
  type:        'forward' | 'back' | 'turn_left' | 'turn_right'
  prevFacing:  Direction   // facing before the move/turn began
  startMs:     number
  durationMs:  number
}

export interface RunState {
  floorId: string
  position: { x: number; y: number }
  facing: Direction
  hp: number
  maxHp: number
  mapRevealed: boolean[][]
  floorFlags: Record<string, boolean>
  anim: CamAnim | null
}

export type GameMode = 'dungeon'

export interface GameState {
  mode: GameMode
  run: RunState
}

function makeRevealedGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array(width).fill(false))
}

export function makeInitialState(): GameState {
  const floor = TEST_FLOOR
  return {
    mode: 'dungeon',
    run: {
      floorId: floor.id,
      position: { x: floor.spawnX, y: floor.spawnY },
      facing: floor.spawnFacing,
      hp: 60,
      maxHp: 60,
      mapRevealed: makeRevealedGrid(floor.width, floor.height),
      floorFlags: {},
      anim: null,
    },
  }
}
