import { FloorMap, Cell, CellType } from './types'

// Map legend:
//   # = wall
//   . = floor
//   @ = player spawn (floor cell)
//   E = exit (floor cell)
//   D = door closed (wall cell with override)

const TEST_LAYOUT = [
  '####################',
  '#..................#',
  '#.####.###.####...#',
  '#.#....#...#..#...#',
  '#.#.##.#.#.#..####',
  '#...##...#.......D#',
  '####.#####.######.#',
  '#....#.....#......#',
  '#.####.###.#.####.#',
  '#.#....#.#.#.#....#',
  '#.#.##.#.#...#.####',
  '#@..##...#...#....E',
  '####################',
]

function parseLayout(rows: string[]): { cells: Cell[][], spawnX: number, spawnY: number, exitX: number, exitY: number } {
  let spawnX = 1, spawnY = 1, exitX = 1, exitY = 1
  const cells: Cell[][] = rows.map((row, y) =>
    row.split('').map((ch, x): Cell => {
      if (ch === '@') { spawnX = x; spawnY = y }
      if (ch === 'E') { exitX = x; exitY = y }
      const type: CellType = ch === '#' ? 'wall' : 'floor'
      if (ch === 'D') return { type: 'wall', wallOverride: 'door_closed' }
      return { type }
    })
  )
  return { cells, spawnX, spawnY, exitX, exitY }
}

const { cells: testCells, spawnX, spawnY, exitX, exitY } = parseLayout(TEST_LAYOUT)

export const TEST_FLOOR: FloorMap = {
  id: 'test',
  theme: 'antechamber',
  width: TEST_LAYOUT[0].length,
  height: TEST_LAYOUT.length,
  cells: testCells,
  spawnX,
  spawnY,
  spawnFacing: 'north',
  exitX,
  exitY,
}

export const FLOORS: Record<string, FloorMap> = {
  test: TEST_FLOOR,
}
