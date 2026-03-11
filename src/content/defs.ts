// Enemy and item definitions.
// Colors are packed Uint32 (little-endian ImageData: R | G<<8 | B<<16 | 0xFF<<24).

function col(r: number, g: number, b: number): number {
  return 0xFF000000 | (r & 0xFF) | ((g & 0xFF) << 8) | ((b & 0xFF) << 16)
}

export interface EnemyDef {
  key:    string
  name:   string
  color:  number          // billboard fill color
  hp:     number
  attack: number          // damage per hit
  speed:  number          // acts every N player turns
  themes: string[]
  depth:  [number, number] // min/max floor depth within its theme (1–5)
}

export interface ItemDef {
  key:    string
  name:   string
  color:  number
  effect: 'heal'
  value:  number
}

// ── Enemy roster ─────────────────────────────────────────────────────────────

export const ENEMY_DEFS: EnemyDef[] = [
  // Stone
  { key: 'crawler',   name: 'Cave Crawler',    color: col( 50, 110,  55), hp:  6, attack: 2, speed: 1, themes: ['stone', 'catacomb'],          depth: [1, 3] },
  { key: 'shade',     name: 'Shadow',           color: col(110,  55, 140), hp:  9, attack: 3, speed: 1, themes: ['stone'],                      depth: [2, 5] },
  { key: 'sentinel',  name: 'Stone Sentinel',   color: col(120, 125, 165), hp: 18, attack: 5, speed: 2, themes: ['stone'],                      depth: [3, 5] },
  // Catacomb
  { key: 'revenant',  name: 'Revenant',         color: col(200, 190, 110), hp: 10, attack: 3, speed: 1, themes: ['catacomb'],                   depth: [1, 3] },
  { key: 'boneguard', name: 'Bone Guard',        color: col(225, 218, 198), hp: 20, attack: 5, speed: 2, themes: ['catacomb'],                   depth: [2, 5] },
  { key: 'wraith',    name: 'Wraith',            color: col( 70, 185, 185), hp:  7, attack: 4, speed: 1, themes: ['catacomb', 'machine'],        depth: [3, 5] },
  // Machine
  { key: 'automaton', name: 'Automaton',         color: col(205, 130,  38), hp: 14, attack: 4, speed: 2, themes: ['machine'],                   depth: [1, 3] },
  { key: 'drone',     name: 'Sentry Drone',      color: col(225,  75,  28), hp:  8, attack: 5, speed: 1, themes: ['machine'],                   depth: [2, 4] },
  { key: 'heavy',     name: 'Heavy Unit',        color: col(145,  38,  18), hp: 28, attack: 7, speed: 3, themes: ['machine'],                   depth: [4, 5] },
]

// ── Item roster ───────────────────────────────────────────────────────────────

export const ITEM_DEFS: ItemDef[] = [
  { key: 'potion_sm', name: 'Healing Draught', color: col(200,  45,  45), effect: 'heal', value: 15 },
  { key: 'potion_lg', name: 'Healing Potion',  color: col(225,  85,  85), effect: 'heal', value: 35 },
]

export function getEnemyDef(key: string): EnemyDef | undefined {
  return ENEMY_DEFS.find(d => d.key === key)
}

export function getItemDef(key: string): ItemDef | undefined {
  return ITEM_DEFS.find(d => d.key === key)
}

// ── Entity instances (live in GameState) ─────────────────────────────────────

export interface EnemyInstance {
  id:          number
  defKey:      string
  x:           number
  y:           number
  fromX:       number    // position at start of current move animation
  fromY:       number
  hp:          number
  maxHp:       number
  turnDebt:    number    // counts up; acts when turnDebt >= speed
  isAttacking: boolean   // true while enemy's last action was an attack; cleared on move/idle
}

/** A killed enemy that lingers as a corpse until the player moves away. */
export interface Corpse {
  x:              number
  y:              number
  defKey:         string
  killedFromX:    number   // player cell at moment of kill
  killedFromY:    number
}

export interface ItemInstance {
  id:     number
  defKey: string
  x:      number
  y:      number
}
