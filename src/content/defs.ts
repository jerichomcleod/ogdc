// Enemy and item definitions.
// Colors are packed Uint32 (little-endian ImageData: R | G<<8 | B<<16 | 0xFF<<24).

function col(r: number, g: number, b: number): number {
  return 0xFF000000 | (r & 0xFF) | ((g & 0xFF) << 8) | ((b & 0xFF) << 16)
}

export interface EnemyDef {
  key:       string
  name:      string
  color:     number          // billboard fill color
  hpMin:     number
  hpMax:     number
  attackMin: number
  attackMax: number
  speed:     number          // acts every N player turns
  minLevel:  number          // first level (1-based) this enemy can appear
  maxLevel:  number          // last level (1-based) this enemy can appear
}

export type EquipSlot = 'weapon' | 'armor' | 'shield'

export interface ItemDef {
  key:        string
  name:       string
  color:      number
  effect:     'heal' | 'equip'
  value?:     number      // HP restored (heal items only)
  slot?:      EquipSlot   // equipment slot (equip items only)
  attackMin?: number      // weapon attack bonus min
  attackMax?: number      // weapon attack bonus max
  defense?:   number      // armor/shield defense bonus
  twoHanded?: boolean     // future: prevents shield equip
  minLevel?:  number      // earliest level this weapon drops (1-based)
  maxLevel?:  number      // latest level this weapon drops (1-based)
}

// ── Enemy roster ─────────────────────────────────────────────────────────────

export const ENEMY_DEFS: EnemyDef[] = [
  { key: 'crawler',   name: 'Cave Crawler',   color: col( 50, 110,  55), hpMin:  4, hpMax:  8, attackMin: 1, attackMax:  3, speed: 1, minLevel:  1, maxLevel:  8 },
  { key: 'shade',     name: 'Shadow',         color: col(110,  55, 140), hpMin:  6, hpMax: 12, attackMin: 2, attackMax:  4, speed: 1, minLevel:  2, maxLevel:  5 },
  { key: 'sentinel',  name: 'Stone Sentinel', color: col(120, 125, 165), hpMin:  8, hpMax: 16, attackMin: 4, attackMax:  7, speed: 2, minLevel:  3, maxLevel:  5 },
  { key: 'revenant',  name: 'Revenant',       color: col(200, 190, 110), hpMin:  7, hpMax: 14, attackMin: 2, attackMax:  4, speed: 1, minLevel:  6, maxLevel:  8 },
  { key: 'boneguard', name: 'Bone Guard',     color: col(225, 218, 198), hpMin:  9, hpMax: 16, attackMin: 4, attackMax:  7, speed: 2, minLevel:  7, maxLevel: 10 },
  { key: 'wraith',    name: 'Wraith',         color: col( 70, 185, 185), hpMin: 12, hpMax: 18, attackMin: 3, attackMax:  5, speed: 1, minLevel:  8, maxLevel: 15 },
  { key: 'automaton', name: 'Automaton',      color: col(205, 130,  38), hpMin: 10, hpMax: 18, attackMin: 3, attackMax:  6, speed: 2, minLevel: 11, maxLevel: 13 },
  { key: 'drone',     name: 'Sentry Drone',   color: col(225,  75,  28), hpMin: 14, hpMax: 18, attackMin: 4, attackMax:  7, speed: 1, minLevel: 12, maxLevel: 14 },
  { key: 'behemoth',  name: 'Behemoth',       color: col(145,  38,  18), hpMin: 16, hpMax: 24, attackMin: 6, attackMax: 11, speed: 3, minLevel: 14, maxLevel: 15 },
]

// ── Item roster ───────────────────────────────────────────────────────────────

export const ITEM_DEFS: ItemDef[] = [
  // Consumables
  { key: 'potion_sm',     name: 'Healing Draught', color: col(200,  45,  45), effect: 'heal', value: 15 },
  { key: 'potion_lg',     name: 'Healing Potion',  color: col(225,  85,  85), effect: 'heal', value: 35 },
  // Gold
  { key: 'gold_coin',     name: 'Gold Coin',        color: col(220, 180,  30), effect: 'heal', value: 0 },
  // Weapons — one-handed
  { key: 'dagger',       name: 'Dagger',      color: col(160, 155, 140), effect: 'equip', slot: 'weapon', attackMin: 1, attackMax:  3, minLevel:  1, maxLevel:  3 },
  { key: 'mace',         name: 'Mace',        color: col(170, 155, 120), effect: 'equip', slot: 'weapon', attackMin: 2, attackMax:  5, minLevel:  3, maxLevel:  5 },
  { key: 'scimitar',     name: 'Scimitar',    color: col(190, 185, 155), effect: 'equip', slot: 'weapon', attackMin: 2, attackMax:  6, minLevel:  6, maxLevel:  8 },
  { key: 'longsword',    name: 'Longsword',   color: col(200, 200, 215), effect: 'equip', slot: 'weapon', attackMin: 3, attackMax:  8, minLevel:  8, maxLevel: 10 },
  { key: 'morningstar',  name: 'Morningstar', color: col(175, 150, 110), effect: 'equip', slot: 'weapon', attackMin: 3, attackMax:  7, minLevel:  7, maxLevel:  9 },
  { key: 'battleaxe',   name: 'Battleaxe',   color: col(180, 160, 120), effect: 'equip', slot: 'weapon', attackMin: 4, attackMax:  9, minLevel:  6, maxLevel: 10 },
  // Weapons — two-handed (future: blocks shield slot)
  { key: 'quarterstaff', name: 'Quarterstaff', color: col(140, 110, 70), effect: 'equip', slot: 'weapon', attackMin: 2, attackMax:  5, twoHanded: true, minLevel:  2, maxLevel:  4 },
  { key: 'hammer',       name: 'War Hammer',   color: col(165, 145, 100), effect: 'equip', slot: 'weapon', attackMin: 4, attackMax:  9, twoHanded: true, minLevel: 11, maxLevel: 12 },
  { key: 'greataxe',    name: 'Great Axe',    color: col(155, 130,  90), effect: 'equip', slot: 'weapon', attackMin: 5, attackMax: 12, twoHanded: true, minLevel: 13, maxLevel: 15 },
  { key: 'halberd',     name: 'Halberd',      color: col(145, 125,  85), effect: 'equip', slot: 'weapon', attackMin: 5, attackMax: 12, twoHanded: true, minLevel: 13, maxLevel: 15 },
  // Armor
  { key: 'leather_armor', name: 'Leather Armor', color: col(140, 100,  55), effect: 'equip', slot: 'armor',  defense: 1, minLevel:  1, maxLevel:  7 },
  { key: 'chain_mail',    name: 'Chainmail',     color: col(160, 165, 175), effect: 'equip', slot: 'armor',  defense: 3, minLevel:  5, maxLevel: 12 },
  { key: 'plate_armor',   name: 'Plate Armor',   color: col(190, 195, 205), effect: 'equip', slot: 'armor',  defense: 5, minLevel: 10, maxLevel: 15 },
  // Shields
  { key: 'wooden_shield', name: 'Wooden Shield', color: col(130,  95,  50), effect: 'equip', slot: 'shield', defense: 1, minLevel:  1, maxLevel:  8 },
  { key: 'iron_shield',   name: 'Iron Shield',   color: col(155, 160, 170), effect: 'equip', slot: 'shield', defense: 2, minLevel:  6, maxLevel: 15 },
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
  lastMoveMs:  number    // performance.now() when this enemy last moved; drives its own animation
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

export interface Equipment {
  weapon: ItemInstance | null
  armor:  ItemInstance | null
  shield: ItemInstance | null
}
