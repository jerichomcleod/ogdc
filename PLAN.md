# Wake in the Depths — Development Plan

## Status

### Built
- Software raycaster renderer (DDA, perspective-correct floor/ceiling, 1:1 wall projection)
- Smooth movement + turn animations (ease in/out)
- Procedural dungeon generation (graph-based: main path, wide areas, POI branches, loops, dead ends)
- 15 levels: stone_1–5 → catacomb_1–5 → machine_1–5
- World seed reset on level completion
- Level progression (step on exit → next level)
- Viewport minimap with fog of war
- Theme-aware wall textures (stone / catacomb / machinery)
- GitHub Pages deployment

---

## Active Sprint — Playable Loop

Everything below uses stand-in graphics (solid colored rectangles). No art files needed.

### Enemies & Combat
- Enemy instances placed on each generated floor (density scales with depth)
- Enemies render as colored billboards in 3D view (sprite pass after wall pass, z-buffered)
- **Bump-to-attack**: moving into enemy cell attacks instead of moving
- Player attack: randomised damage roll
- Enemy turns: process after each player action; enemies move toward player, attack when adjacent
- Enemy aggro range: 12 cells
- Enemies per theme have defined HP, attack, and speed (every N turns)
- Death: `state.mode = 'game_over'`

Enemy roster (stand-in colors, to be replaced with sprites):

| Key        | Name           | Theme(s)          | HP | Atk | Speed |
|------------|----------------|-------------------|----|-----|-------|
| crawler    | Cave Crawler   | stone, catacomb   | 6  | 2   | 1     |
| shade      | Shadow         | stone             | 9  | 3   | 1     |
| sentinel   | Stone Sentinel | stone             | 18 | 5   | 2     |
| revenant   | Revenant       | catacomb          | 10 | 3   | 1     |
| boneguard  | Bone Guard     | catacomb          | 20 | 5   | 2     |
| wraith     | Wraith         | catacomb, machine | 7  | 4   | 1     |
| automaton  | Automaton      | machine           | 14 | 4   | 2     |
| drone      | Sentry Drone   | machine           | 8  | 5   | 1     |
| heavy      | Heavy Unit     | machine           | 28 | 7   | 3     |

### Items
- Health potions placed on floors (1–3 per level)
- Render as small colored squares near floor level in 3D view
- Walk onto cell + INTERACT (E / Space) to pick up
- Effect: restore HP

| Key        | Name            | Effect | Value |
|------------|-----------------|--------|-------|
| potion_sm  | Healing Draught | heal   | 15 HP |
| potion_lg  | Healing Potion  | heal   | 35 HP |

### Doors
- Placed in dungeon gen at corridor chokepoints (~25% of eligible cells)
- Render with a brownish tint over the wall texture
- INTERACT facing a door: opens it (passable)
- Locked doors: planned for key system (future)

### Overlays (no art)
- **Level entry**: 2.5s semi-transparent text overlay on entering each level
  e.g. "stone 1 — {placeholder: short atmospheric line for stone level 1}"
- **Game over**: black screen, death message, prompt to restart
- **Combat log**: last 4 combat events shown in HUD text

---

## Backlog

### Player Progression
- Character stats: Strength (attack), Endurance (max HP), Perception (reveal radius)
- Level up on floor completion
- Persistent stats across floors within a session

### Inventory
- OPEN_INVENTORY (I) → overlay grid showing held items
- Max carry weight or slot count
- Item types: weapons, armour, consumables, keys

### Doors — Extended
- Locked doors require matching key item
- Key placed on same floor, always reachable from spawn

### Town / Surface
- Return to town after exiting stone_1 or completing machine_5
- Town menu: rest (full heal), manage equipment, save, descend
- On town exit: world regenerates with new seed

### Procedural Audio (Web Audio API — no files)
- Ambient drone oscillator per theme (different frequency/timbre)
- Footstep: filtered noise burst on each move
- Combat hit: short attack transient
- Door creak: frequency sweep
- Death: low impact + fade

### Return Points
- Stairways up at spawn of each level
- Using it returns player to entry point of previous level
- Allows backtracking without resetting floors

### Save / Load
- Serialize GameState to localStorage
- Auto-save on level transition

---

## Art — Needed (see assets_needed.md for full spec)

- Wall, floor, ceiling textures: largely covered — expand stone to ~10 variants
- HUD sprites: health bar, compass, exit marker
- Door wall overlay (or full door texture)
- Enemy sprites: one per enemy type (replace solid-color billboard)
- Item icons
- Title / menu art
- Level transition cards

## Writing — Needed (see assets_needed.md)

- Level flavor text (15 entries)
- POI room descriptions (4–6 per theme)
- Combat messages beyond generic hits
- Game over variants
- Enemy names confirmed (current are placeholders)
