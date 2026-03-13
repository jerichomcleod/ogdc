import { Direction } from '../content/types'
import { LEVEL_SEQUENCE, LevelId, getFloor, regenerateDungeons } from '../content/floors'
import { EnemyInstance, ItemInstance, Corpse, Equipment } from '../content/defs'
import { getGameOverText } from '../engine/assets'

export type { EnemyInstance, ItemInstance, Corpse, Equipment }

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
  corpses:      Corpse[]          // recently killed enemies; cleared when player moves
  items:        ItemInstance[]    // items on the floor
  inventory:    ItemInstance[]    // items carried by the player (max 20)
  equipment:    Equipment         // equipped weapon / armor / shield
  gold:         number            // gold coins collected
  combatLog:    string[]          // last 4 events, newest last
  levelEntryMs:     number         // performance.now() when floor was entered
  levelEntryDismissMs: number | null  // set when player keypress dismisses the splash
  playerActed:      boolean
  deadEndMsg:       string
  deadEndMs:        number | null
  entitiesSpawned:  boolean
  lastHitMs:        number
}

export type GameMode = 'dungeon' | 'game_over' | 'town'

export interface GameState {
  mode:               GameMode
  run:                RunState
  worldSeed:          number
  levelIndex:         number
  townMenuIndex:      number
  gameOverMs:         number
  gameOverMessage:    string
  gameOverMenuIndex:  number
  shownLevelEntries:  Set<string>
  discoveredPortals:  Set<string>  // floor IDs where player has found the portal
  gameTick:           number
  enemyMoveMs:        number
  lastActionWasTurn:  boolean
  inventoryOpen:      boolean
  inventorySlot:      number       // 0-19 = carry grid, 20=weapon, 21=armor, 22=shield
  inventoryFocus:     'grid' | 'equip'
}

export function pushCombatLog(run: RunState, msg: string): void {
  run.combatLog.push(msg)
  if (run.combatLog.length > 4) run.combatLog.shift()
}

export function makeRevealedGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array(width).fill(false))
}

function makeRunState(
  floorId: LevelId,
  hp: number, maxHp: number,
  carry: { inventory: ItemInstance[]; equipment: Equipment; gold: number } = {
    inventory: [], equipment: { weapon: null, armor: null, shield: null }, gold: 0,
  },
): RunState {
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
    corpses:      [],
    items:        [],
    inventory:    carry.inventory,
    equipment:    carry.equipment,
    gold:         carry.gold,
    combatLog:    [],
    levelEntryMs:        performance.now(),
    levelEntryDismissMs: null,
    playerActed:         false,
    deadEndMsg:          '',
    deadEndMs:           null,
    entitiesSpawned:     false,
    lastHitMs:           0,
  }
}

function extractCarry(run: RunState) {
  return { inventory: run.inventory, equipment: run.equipment, gold: run.gold }
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
    discoveredPortals:  new Set(),
    gameTick:           0,
    enemyMoveMs:        0,
    lastActionWasTurn:  false,
    inventoryOpen:      false,
    inventorySlot:      0,
    inventoryFocus:     'grid',
  }
}

/** Advance to the next level, preserving HP and carry. After the last level resets the world. */
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
  state.run = makeRunState(LEVEL_SEQUENCE[state.levelIndex], hp, maxHp, extractCarry(state.run))
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
  const prev  = state.levelIndex - 1
  state.levelIndex = prev
  const carry = extractCarry(state.run)
  const floor = getFloor(LEVEL_SEQUENCE[prev])!
  const { hp, maxHp } = state.run
  state.run = {
    floorId:      LEVEL_SEQUENCE[prev],
    position:     { x: floor.returnX, y: floor.returnY },
    facing:       floor.returnFacing,
    hp, maxHp,
    mapRevealed:  makeRevealedGrid(floor.width, floor.height),
    floorFlags:   {},
    anim:         null,
    enemies:      [],
    corpses:      [],
    items:        [],
    inventory:    carry.inventory,
    equipment:    carry.equipment,
    gold:         carry.gold,
    combatLog:    [],
    levelEntryMs:        performance.now(),
    levelEntryDismissMs: null,
    playerActed:         false,
    deadEndMsg:          '',
    deadEndMs:           null,
    entitiesSpawned:     false,
    lastHitMs:           0,
  }
}

/** Return from town back to dungeon level 0. */
export function returnToDungeon(state: GameState): void {
  const { hp, maxHp } = state.run
  const carry = extractCarry(state.run)
  state.mode = 'dungeon'
  state.run  = makeRunState(LEVEL_SEQUENCE[0], hp, maxHp, carry)
  state.levelIndex = 0
}

/** Jump directly to any level (0-indexed) via a discovered portal. Preserves carry. */
export function returnToPortal(state: GameState, floorId: string): void {
  const idx = LEVEL_SEQUENCE.indexOf(floorId as LevelId)
  if (idx === -1) return
  const { hp, maxHp } = state.run
  const carry  = extractCarry(state.run)
  const floor  = getFloor(floorId as LevelId)!
  state.levelIndex = idx
  state.mode = 'dungeon'
  state.run = {
    floorId,
    position:     { x: floor.portalX ?? floor.spawnX, y: floor.portalY ?? floor.spawnY },
    facing:       floor.spawnFacing,
    hp, maxHp,
    mapRevealed:  makeRevealedGrid(floor.width, floor.height),
    floorFlags:   {},
    anim:         null,
    enemies:      [],
    corpses:      [],
    items:        [],
    inventory:    carry.inventory,
    equipment:    carry.equipment,
    gold:         carry.gold,
    combatLog:    [],
    levelEntryMs:        performance.now(),
    levelEntryDismissMs: null,
    playerActed:         false,
    deadEndMsg:          '',
    deadEndMs:           null,
    entitiesSpawned:     false,
    lastHitMs:           0,
  }
}

/** Jump directly to any level (0-indexed). Preserves carry. */
export function goToLevel(state: GameState, index: number): void {
  state.levelIndex = Math.max(0, Math.min(LEVEL_SEQUENCE.length - 1, index))
  const { hp, maxHp } = state.run
  state.run  = makeRunState(LEVEL_SEQUENCE[state.levelIndex], hp, maxHp, extractCarry(state.run))
  state.mode = 'dungeon'
}

export function triggerGameOver(state: GameState): void {
  state.mode             = 'game_over'
  state.gameOverMs       = performance.now()
  state.gameOverMessage  = getGameOverText()
  state.gameOverMenuIndex = 0
}
