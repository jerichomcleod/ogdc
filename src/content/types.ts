export type Direction = 'north' | 'east' | 'south' | 'west'

export type CellType = 'floor' | 'wall' | 'void'

export type WallOverride =
  | 'door_closed'
  | 'door_open'
  | 'door_locked'
  | 'passage'
  | 'rune'
  | 'stairs_down'
  | 'stairs_up'
  | 'town_gate'

export interface Cell {
  type: CellType
  wallOverride?: WallOverride
}

export type FloorTheme = 'stone' | 'catacomb' | 'machine'

export interface FloorMap {
  id: string
  theme: FloorTheme
  width: number
  height: number
  cells: Cell[][]
  spawnX: number          // floor cell player enters on (adjacent to entryWallX/Y)
  spawnY: number
  spawnFacing: Direction  // facing entryWall on spawn
  exitX: number           // WALL cell with stairs_down
  exitY: number
  returnX: number         // floor cell to land on when ascending from level below (adjacent to exitX/Y)
  returnY: number
  returnFacing: Direction // facing direction when returning from below
  entryWallX: number      // WALL cell with stairs_up or town_gate
  entryWallY: number
}
