// Internal render resolution
export const CANVAS_W = 640
export const CANVAS_H = 480

// HUD takes the bottom portion; dungeon view occupies the top
export const DUNGEON_H = 320   // height of the 3D view area
export const HUD_H = CANVAS_H - DUNGEON_H

// Horizon sits in the middle of the dungeon view
export const HORIZON_Y = DUNGEON_H / 2

// Vanishing point X (center of dungeon view)
export const VP_X = CANVAS_W / 2

// How many cells deep the renderer looks
export const VIEW_DEPTH = 5

// Projection tuning.
// WALL_HALF_W = WALL_SCALE gives each grid cell a 1:1 square face.
// WALL_SCALE must stay ≤ DUNGEON_H/2 (= 160) or depth-1 walls clip off-screen.
export const WALL_SCALE  = 140   // half-height of corridor face at depth 1
export const WALL_HALF_W = 140   // half-width  — equal to WALL_SCALE for 1:1 tiles

// Minimap
export const MINIMAP_CELL = 6    // pixels per cell on the minimap
export const MINIMAP_X = 8
export const MINIMAP_Y = DUNGEON_H + 8
