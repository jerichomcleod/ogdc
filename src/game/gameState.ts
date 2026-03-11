import { Direction } from '../content/types'
import { LEVEL_SEQUENCE, LevelId, getFloor, regenerateDungeons } from '../content/floors'
import { EnemyInstance, ItemInstance } from '../content/defs'
import { getGameOverText } from '../engine/assets'

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
  items:        ItemInstance[]    // items on the floor
  inventory:    ItemInstance[]    // items carried by the player
  combatLog:    string[]          // last 4 events, newest last
  levelEntryMs: number            // performance.now() when floor was entered
  playerActed:  boolean           // set true when player takes a turn action
  deadEndMsg:   string            // current dead-end flavor text (empty = none)
  deadEndMs:    number | null     // when dead-end message was triggered
}

export type GameMode = 'dungeon' | 'game_over' | 'town'

export interface GameState {
  mode:               GameMode
  run:                RunState
  worldSeed:          number
  levelIndex:         number
  townMenuIndex:      number
  gameOverMs:         number   // performance.now() when game_over was set
  gameOverMessage:    string   // death flavor text, picked once
  gameOverMenuIndex:  number   // 0=New Game, 1=Load Game
  shownLevelEntries:  Set<string>  // floors whose entry message has been shown this run
}

export function pushCombatLog(run: RunState, msg: string): void {
  run.combatLog.push(msg)
  if (run.combatLog.length > 4) run.combatLog.shift()
}

export function makeRevealedGrid(width: number, height: number): boolean[][] {
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
    inventory:    [],
    combatLog:    [],
    levelEntryMs: performance.now(),
    playerActed:  false,
    deadEndMsg:   '',
    deadEndMs:    null,
  }
}

export function makeInitialState(): GameState {
  const worldSeed  = (Math.random() * 0xFFFF_FFFF) >>> 0
  regenerateDungeons(worldSeed)
  const levelIndex = 0
  return {
    mode:               'dungeon',
    worldSeed,
    levelIndex,
    townMenuIndex:      0,
    run:                makeRunState(LEVEL_SEQUENCE[levelIndex], 60, 60),
    gameOverMs:         0,
    gameOverMessage:    '',
    gameOverMenuIndex:  0,
    shownLevelEntries:  new Set(),
  }
}

/** Advance to the next level, preserving HP and inventory. After the last level resets the world. */
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
  const { hp, maxHp, inventory } = state.run
  state.run           = makeRunState(LEVEL_SEQUENCE[state.levelIndex], hp, maxHp)
  state.run.inventory = inventory
}

export function goToTown(state: GameState): void {
  state.mode = 'town'
}

/** Go to previous level, spawn at returnX/returnY of that level. If already level 0, go to town. */
export function goUp(state: GameState): void {
  if (state.levelIndex <= 0) {
    goToTown(state)
    return
  }
  const prev = state.levelIndex - 1
  state.levelIndex = prev
  const { hp, maxHp, inventory } = state.run
  const floor = getFloor(LEVEL_SEQUENCE[prev])!
  state.run = {
    floorId:      LEVEL_SEQUENCE[prev],
    position:     { x: floor.returnX, y: floor.returnY },
    facing:       floor.returnFacing,
    hp, maxHp,
    mapRevealed:  makeRevealedGrid(floor.width, floor.height),
    floorFlags:   {},
    anim:         null,
    enemies:      [],
    items:        [],
    inventory,
    combatLog:    [],
    levelEntryMs: performance.now(),
    playerActed:  false,
    deadEndMsg:   '',
    deadEndMs:    null,
  }
}

/** Return from town back to dungeon level 0. */
export function returnToDungeon(state: GameState): void {
  const { hp, maxHp, inventory } = state.run
  state.mode = 'dungeon'
  state.levelIndex = 0
  const floor = getFloor(LEVEL_SEQUENCE[0])!
  state.run = {
    floorId:      LEVEL_SEQUENCE[0],
    position:     { x: floor.spawnX, y: floor.spawnY },
    facing:       floor.spawnFacing,
    hp, maxHp,
    mapRevealed:  makeRevealedGrid(floor.width, floor.height),
    floorFlags:   {},
    anim:         null,
    enemies:      [],
    items:        [],
    inventory,
    combatLog:    [],
    levelEntryMs: performance.now(),
    playerActed:  false,
    deadEndMsg:   '',
    deadEndMs:    null,
  }
}

export function triggerGameOver(state: GameState): void {
  state.mode             = 'game_over'
  state.gameOverMs       = performance.now()
  state.gameOverMessage  = getGameOverText()
  state.gameOverMenuIndex = 0
}
