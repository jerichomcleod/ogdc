import { Cell, Direction } from '../content/types'
import { FLOORS } from '../content/floors'
import { GameState } from '../game/gameState'

export function getCell(floorId: string, x: number, y: number): Cell {
  const floor = FLOORS[floorId]
  if (!floor) return { type: 'void' }
  if (y < 0 || y >= floor.height || x < 0 || x >= floor.width) return { type: 'void' }
  return floor.cells[y][x]
}

export function isPassable(floorId: string, x: number, y: number): boolean {
  const cell = getCell(floorId, x, y)
  if (cell.type !== 'floor') return false
  return true
}

export function stepOffset(facing: Direction): { dx: number; dy: number } {
  switch (facing) {
    case 'north': return { dx:  0, dy: -1 }
    case 'south': return { dx:  0, dy:  1 }
    case 'east':  return { dx:  1, dy:  0 }
    case 'west':  return { dx: -1, dy:  0 }
  }
}

export function turnRight(facing: Direction): Direction {
  const cycle: Direction[] = ['north', 'east', 'south', 'west']
  return cycle[(cycle.indexOf(facing) + 1) % 4]
}

export function turnLeft(facing: Direction): Direction {
  const cycle: Direction[] = ['north', 'east', 'south', 'west']
  return cycle[(cycle.indexOf(facing) + 3) % 4]
}

// Reveal the player cell and all 8 surrounding cells
export function revealAround(state: GameState): void {
  const { x, y } = state.run.position
  const floor = FLOORS[state.run.floorId]
  if (!floor) return
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < floor.width && ny >= 0 && ny < floor.height) {
        state.run.mapRevealed[ny][nx] = true
      }
    }
  }
}
