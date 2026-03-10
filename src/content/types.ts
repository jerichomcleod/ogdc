export type Direction = 'north' | 'east' | 'south' | 'west'

export type CellType = 'floor' | 'wall' | 'void'

export type WallOverride =
  | 'door_closed'
  | 'door_open'
  | 'door_locked'
  | 'passage'
  | 'rune'

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
  cells: Cell[][]      // cells[y][x]
  spawnX: number
  spawnY: number
  spawnFacing: Direction
  exitX: number
  exitY: number
}
