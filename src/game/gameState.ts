import { Direction } from '../content/types'
import { LEVEL_SEQUENCE, LevelId, getFloor, regenerateDungeons } from '../content/floors'
import { EnemyInstance, ItemInstance } from '../content/defs'

export type { EnemyInstance, ItemInstance }

export interface CamAnim {
  type:        'forward' | 'back' | 'turn_left' | 'turn_right'
  prevFacing:  Direction
  startMs:     number
  durationMs:  number
}

export interface RunState {
  floorId:      string
  position:     { x: number; y: number }
  facing:       Direction
  hp:           number
  maxHp:        number
  mapRevealed:  boolean[][]
  floorFlags:   Record<string, boolean>
  anim:         CamAnim | null
  enemies:      EnemyInstance[]
  items:        ItemInstance[]
  combatLog:    string[]      // last 4 events, newest last
  levelEntryMs: number        // performance.now() when floor was entered
  playerActed:  boolean       // set true when player takes a turn action
}

export type GameMode = 'dungeon' | 'game_over'

export interface GameState {
  mode:       GameMode
  run:        RunState
  worldSeed:  number
  levelIndex: number
}

export function pushCombatLog(run: RunState, msg: string): void {
  run.combatLog.push(msg)
  if (run.combatLog.length > 4) run.combatLog.shift()
}

function makeRevealedGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array(width).fill(false))
}

function makeRunState(floorId: LevelId, hp: number, maxHp: number): RunState {
  const floor = getFloor(floorId)!
  return {
    floorId,
    position:     { x: floor.spawnX, y: floor.spawnY },
    facing:       floor.spawnFacing,
    hp,
    maxHp,
    mapRevealed:  makeRevealedGrid(floor.width, floor.height),
    floorFlags:   {},
    anim:         null,
    enemies:      [],
    items:        [],
    combatLog:    [],
    levelEntryMs: performance.now(),
    playerActed:  false,
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
    run:        makeRunState(LEVEL_SEQUENCE[levelIndex], 60, 60),
  }
}

/** Advance to the next level, preserving HP. After the last level resets the world. */
export function advanceLevel(state: GameState): void {
  const next = state.levelIndex + 1
  if (next >= LEVEL_SEQUENCE.length) {
    const newSeed    = (Math.random() * 0xFFFF_FFFF) >>> 0
    state.worldSeed  = newSeed
    state.levelIndex = 0
    regenerateDungeons(newSeed)
  } else {
    state.levelIndex = next
  }
  const { hp, maxHp } = state.run
  state.run = makeRunState(LEVEL_SEQUENCE[state.levelIndex], hp, maxHp)
}
