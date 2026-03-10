# Wake in the Depths — Coding Implementation Plan

This document covers the build order, module responsibilities, key technical decisions, and implementation notes for the browser-based game. Read `updated_plan.md` for game design scope.

---

## Guiding Principles

- **Build vertically, not horizontally.** Get one working slice end-to-end before adding breadth. A character who can walk through a textured corridor is worth more than five half-finished systems.
- **Fake it until you wire it.** Use hardcoded stubs and placeholder data at every layer. Replace stubs with real content late.
- **No dependencies beyond Vite.** Everything else is Canvas 2D, standard DOM APIs, IndexedDB, and TypeScript. No frameworks, no game engines.
- **Data drives content.** Floors, enemies, items, and lore are JSON-shaped TypeScript objects. The engine reads them. Adding a new enemy is adding a new object, not writing new code.

---

## Project Setup

```bash
npm create vite@latest ogdc -- --template vanilla-ts
cd ogdc
npm install
```

Initial file cleanup: remove `counter.ts`, `typescript.svg`. Keep `main.ts`, `style.css`, `index.html`.

`index.html` structure:
```html
<body>
  <div id="app">
    <canvas id="dungeon-view"></canvas>
    <div id="hud"></div>
  </div>
</body>
```

`style.css`: set `body { margin: 0; background: #000; display: flex; justify-content: center; }`. The game runs at a fixed internal resolution scaled to fit the window.

---

## Module Map

Every module listed here corresponds to a file. They are described in dependency order — each module only depends on modules listed above it.

---

### 1. `constants.ts`

No dependencies. Defines all magic numbers and config in one place.

```ts
export const GRID_CELL_SIZE = 1         // logical units, not pixels
export const VIEW_DEPTH = 4             // how many cells deep the renderer looks
export const CANVAS_W = 640            // internal render width
export const CANVAS_H = 400            // internal render height
export const HORIZON_Y = CANVAS_H / 2  // where floor meets ceiling
export const FOV_CELLS = 1             // cells visible left/right of corridor (0 = tunnel, 1 = one side room)
export const TILE_SIZE = 64            // texture tile pixel size
```

Adjust these freely. `VIEW_DEPTH = 4` means the renderer looks 4 cells forward. Wider or deeper views cost more draw calls but look more impressive.

---

### 2. `engine/canvas.ts`

No dependencies. Sets up the canvas and exposes the 2D context.

Responsibilities:
- Create/get the canvas element
- Set internal pixel dimensions (`CANVAS_W × CANVAS_H`)
- Handle CSS scaling to fill the browser window (use `image-rendering: pixelated` on the canvas CSS for crisp pixel art upscaling)
- Export `ctx: CanvasRenderingContext2D`
- Export a `clear()` function

Note on scaling: set `canvas.width = CANVAS_W` and `canvas.height = CANVAS_H`, then use CSS `width: 100%; height: auto` or a resize listener to scale the element up. The game logic always works in internal coordinates.

---

### 3. `engine/input.ts`

No dependencies. Normalizes keyboard and mouse/touch input.

Responsibilities:
- Maintain a set of currently held keys: `heldKeys: Set<string>`
- Maintain a queue of just-pressed actions for this frame: `actionQueue`
- Map keys to logical actions:

```ts
type Action =
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'INTERACT'
  | 'OPEN_INVENTORY'
  | 'OPEN_MAP'
  | 'CONFIRM'
  | 'CANCEL'
```

- Export `consumeAction(action: Action): boolean` — returns true and removes the action if present. Used by game systems each frame to avoid double-processing.
- Export `isHeld(action: Action): boolean` — for anything that should repeat while held (not movement — movement is step-based, but might be used for UI scroll later).

Movement is not continuous — each `MOVE_FORWARD` keypress triggers exactly one grid step. Do not auto-repeat movement. A small input cooldown (~150ms) prevents accidental double-steps from key repeat events.

---

### 4. `engine/assets.ts`

No dependencies. Loads and caches image assets.

Responsibilities:
- `loadImage(path: string): Promise<HTMLImageElement>` — fetch and cache
- `getImage(path: string): HTMLImageElement` — synchronous access after loading (throws if not loaded)
- `preloadAll(paths: string[]): Promise<void>` — load a list, resolve when all are done

All assets are loaded once at startup before the game loop begins. No lazy loading.

Asset path convention:
```
/assets/textures/wall_antechamber.png
/assets/textures/floor_antechamber.png
/assets/textures/ceiling_antechamber.png
/assets/textures/wall_mechanism.png
...
/assets/sprites/enemy_skulk_idle.png
/assets/sprites/enemy_skulk_attack.png
/assets/ui/hud_frame.png
/assets/ui/portrait.png
...
```

---

### 5. `engine/audio.ts`

No dependencies. Wraps Web Audio API for simple sound playback.

Responsibilities:
- `playSound(id: string)` — play a loaded sound effect once
- `playMusic(id: string)` — loop a music/ambient track
- `stopMusic()`
- `setVolume(sfx: number, music: number)`

Load audio files as `AudioBuffer` via `fetch` + `AudioContext.decodeAudioData`. Keep it simple: one `AudioContext`, one gain node for SFX, one for music. Do not implement this first — stub it with no-ops and fill in later.

---

### 6. `content/types.ts`

No dependencies. TypeScript type definitions for all game data. No logic here.

```ts
export type Direction = 'north' | 'east' | 'south' | 'west'

export type CellType = 'floor' | 'wall' | 'void'

export interface Cell {
  type: CellType
  wallOverride?: 'door_closed' | 'door_open' | 'door_locked' | 'passage' | 'rune'
  interactable?: InteractableId
  item?: ItemId
  enemy?: EnemyId
}

export interface FloorMap {
  id: string
  theme: 'antechamber' | 'mechanism' | 'choir'
  width: number
  height: number
  cells: Cell[][]       // cells[y][x]
  spawnX: number
  spawnY: number
  spawnFacing: Direction
  exitX: number
  exitY: number
}

export interface ItemDef {
  id: string
  name: string
  flavor: string
  icon: string          // asset path
  stackable: boolean
  maxStack: number
  useEffect: UseEffectId | null
}

export interface RelicDef {
  id: string
  name: string
  flavor: string
  icon: string
  onEquip: RelicEffectId
  onUnequip: RelicEffectId
  tradeoffDescription: string
}

export interface EnemyDef {
  id: string
  name: string
  flavor: string
  sprite: string        // asset path prefix, e.g. 'enemy_skulk'
  maxHp: number
  attack: number
  defense: number
  behavior: EnemyBehavior
  lootTable: LootEntry[]
}

export type EnemyBehavior = 'aggressive' | 'ranged' | 'support' | 'ambush' | 'slow_heavy'

export interface LootEntry {
  itemId: string
  chance: number        // 0–1
  qty: [number, number] // [min, max]
}
```

Define all other IDs (`UseEffectId`, `RelicEffectId`, `InteractableId`) as string union types as you add content.

---

### 7. `content/items.ts`, `content/relics.ts`, `content/enemies.ts`, `content/floors.ts`

Depends on: `content/types.ts`

These are pure data files. No logic. Each exports a `Record<string, Def>` keyed by ID.

Example:
```ts
// content/items.ts
export const ITEMS: Record<string, ItemDef> = {
  phial_small: {
    id: 'phial_small',
    name: 'Small Phial',
    flavor: 'A stoppered vial of cloudy fluid. Tastes like mineral water and regret.',
    icon: '/assets/ui/item_phial_small.png',
    stackable: true,
    maxStack: 5,
    useEffect: 'heal_15',
  },
  // ...
}
```

`content/floors.ts` defines each floor as a `FloorMap`. The cell grid can be defined as a 2D array of cell objects, or parsed from a compact string format (e.g. `#` = wall, `.` = floor, `D` = door). A compact string is easier to author and read:

```ts
const F1_LAYOUT = `
####################
#..................#
#.###.#####.###.#.##
...
`

function parseLayout(raw: string): Cell[][] { ... }
```

Build `parseLayout` as a utility. It reads the string into a `Cell[][]` grid. Special characters for doors, enemies, and items are replaced with floor cells but add metadata via a separate placement table.

---

### 8. `game/gameState.ts`

Depends on: `content/types.ts`

The single source of truth. One object that holds all mutable game state. No logic — just the shape and a factory function.

```ts
export interface RunState {
  floor: number
  position: { x: number; y: number }
  facing: Direction
  hp: number
  maxHp: number
  inventory: InventorySlot[]   // array of { itemId, qty }
  relics: string[]             // equipped relic IDs, max 2
  mapRevealed: boolean[][]
  floorFlags: Record<string, boolean>
  enemies: Record<string, EnemyInstance>   // keyed by "x,y"
}

export interface GameState {
  mode: 'title' | 'hub' | 'dungeon' | 'combat' | 'inventory' | 'codex' | 'dead'
  run: RunState | null
  progression: ProgressionState
  settings: Settings
}

export function makeInitialState(): GameState { ... }
```

All systems read from and write to this object. Pass it by reference. No Redux-style dispatching needed at this scale — just mutate directly and let the render loop redraw each frame.

---

### 9. `systems/mapSystem.ts`

Depends on: `game/gameState.ts`, `content/floors.ts`

Responsibilities:
- `loadFloor(floorId: string, state: GameState)` — set up the run's current floor, place enemies, reveal starting cell
- `getCellAt(x: number, y: number, floorId: string): Cell` — safe cell lookup
- `revealAround(x: number, y: number, state: GameState)` — mark cells adjacent to player as revealed
- `isWall(x: number, y: number, floorId: string): boolean`
- `isPassable(x: number, y: number, state: GameState): boolean` — checks wall, enemy presence, locked doors

---

### 10. `systems/movementSystem.ts`

Depends on: `game/gameState.ts`, `systems/mapSystem.ts`, `engine/input.ts`

Responsibilities:
- `tryMove(state: GameState)` — consume `MOVE_FORWARD` or `MOVE_BACK` from input, check passability, update position
- `tryTurn(state: GameState)` — consume `TURN_LEFT` or `TURN_RIGHT`, update facing direction
- `stepOffset(facing: Direction): { dx: number, dy: number }` — utility

The facing direction cycles: north → east → south → west → north. Turning never moves the player.

After a move succeeds: call `mapSystem.revealAround`. If the new cell has an enemy, transition `state.mode` to `'combat'`. If the new cell is the exit, trigger floor transition.

---

### 11. `engine/renderer.ts`

Depends on: `engine/canvas.ts`, `engine/assets.ts`, `game/gameState.ts`, `content/floors.ts`, `constants.ts`

This is the most complex module. Read this section carefully.

**Coordinate system:**
- Player faces `north` = negative Y direction on the grid (y decreases as you go forward).
- Canvas origin is top-left. Horizon is at `CANVAS_H / 2`.
- Vanishing point is at `(CANVAS_W / 2, HORIZON_Y)`.

**Precomputed view geometry:**

For each depth level `d` from 1 to `VIEW_DEPTH`, precompute the screen-space coordinates of:
- The front wall face (a centered rectangle, shrinking with depth)
- The left wall face (a trapezoid from the previous depth's left edge to the current depth's left edge)
- The right wall face (mirror of left)
- The floor strip (rectangle below the front wall, clipped to horizon)
- The ceiling strip (rectangle above the front wall)

Define these as a table at startup:

```ts
interface DepthSlice {
  depth: number
  // Front face screen rect
  frontLeft: number
  frontRight: number
  frontTop: number
  frontBottom: number
  // Left face (trapezoid: 4 corners)
  leftFace: [Point, Point, Point, Point]
  // Right face
  rightFace: [Point, Point, Point, Point]
  // Floor/ceiling strips
  floorTop: number     // = frontBottom
  ceilingBottom: number // = frontTop
}
```

The projection formula for a front wall at depth `d`:
```
wallHeight = VIEW_HEIGHT / d          // VIEW_HEIGHT is a tuning constant, e.g. CANVAS_H * 0.9
wallTop = HORIZON_Y - wallHeight / 2
wallBottom = HORIZON_Y + wallHeight / 2
wallLeft = VP_X - (WALL_WIDTH / d) / 2
wallRight = VP_X + (WALL_WIDTH / d) / 2
```

Tune `VIEW_HEIGHT` and `WALL_WIDTH` until the corridor feels right. A narrow `WALL_WIDTH` relative to `VIEW_HEIGHT` produces a tighter tunnel. Equal values produce a roughly cubic feel.

**Trapezoid drawing with `ctx.transform`:**

Canvas 2D cannot natively draw a perspective-correct trapezoid and tile a texture across it. The workaround:

For a wall face that is trapezoidal, use `ctx.transform` to apply a non-uniform scale + translate that maps the texture quad to the trapezoid shape. This is not true perspective-correct texture mapping, but for grid-aligned walls it looks correct because all wall faces are vertical. Horizontal texture tiling on a vertical face can be done with this approximation without visible distortion.

For each left/right wall face, compute the transformation matrix that maps the unit square `[0,0]–[1,1]` to the trapezoid corners, then draw the texture using `ctx.drawImage`. See MDN `CanvasRenderingContext2D.transform()`.

Simpler alternative that avoids matrix math: draw each depth slice as overlapping rectangles scaled toward the vanishing point. Left wall faces become thin rectangles anchored to the left side, right wall faces to the right. This is slightly less accurate but visually acceptable and much easier to implement first.

**Draw order (painter's algorithm — back to front):**
1. Fill background with black (void color)
2. For `d = VIEW_DEPTH` down to `1`:
   a. Determine what's in the cell at this depth in front of the player
   b. Draw ceiling strip for depth `d` (texture-tiled `ctx.drawImage` with repeat)
   c. Draw floor strip for depth `d`
   d. If left cell at depth `d` is a wall, draw left wall face
   e. If right cell at depth `d` is a wall, draw right wall face
   f. If front cell at depth `d` is a wall, draw front wall face
   g. If front cell at depth `d` is a wall with an overlay (door, rune), draw overlay on top
3. If an enemy is present at depth 1 or 2, draw enemy sprite (billboard)
4. Draw items on floor at depth 1

**Looking left and right into side corridors:**

At each depth level, also check one cell to the left and right. If those cells are open floor (not wall), draw an open side passage instead of a left/right wall face. This creates the branching corridor feel. The side passage for a left opening at depth `d` is a gap in the left wall face, filled with darkness (or a dim version of the far wall texture to imply depth).

**Texture tiling:**

For floor and ceiling, use `ctx.createPattern(img, 'repeat')` and fill a clipping region. For walls at varying depths, scale the texture with `ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` — pick `sw = TILE_SIZE` and scale `dw` to the face width on screen. Crop vertically to the face height.

**Enemy sprites:**

Enemies are billboarded sprites drawn over the dungeon view. At depth 1, draw the sprite at roughly `(VP_X - spriteW/2, HORIZON_Y - spriteH/2)` scaled to near-full height. At depth 2, draw smaller and higher on screen. Pre-define sprite size and position per depth level the same way wall geometry is precomputed.

**Export:**
```ts
export function renderDungeon(state: GameState): void
```

Called once per frame. Does not return anything — draws directly to canvas.

---

### 12. `ui/minimap.ts`

Depends on: `engine/canvas.ts`, `game/gameState.ts`, `content/floors.ts`

Draws the automap in the corner of the HUD. Each revealed cell is a small colored square. Walls are dark, floors are light, current player position has a direction indicator.

Draw the minimap to a separate small canvas (or an off-screen canvas) and composite it into the HUD. Size: 3×3 pixels per cell for a 20×20 grid = 60×60px map. Scale up as needed.

---

### 13. `ui/hud.ts`

Depends on: `engine/canvas.ts`, `game/gameState.ts`, `engine/assets.ts`, `ui/minimap.ts`

Draws the bottom UI panel each frame. Layout (all screen-space coordinates, adjust to fit):

```
┌─────────────────────────────────────────────────────────┐
│  [PORTRAIT]  HP: ████████░░  [MINIMAP]  [COMPASS]       │
│              ST: ████░░░░░░                              │
│  [Relic 1] [Relic 2]          [Inv Slot×6]              │
└─────────────────────────────────────────────────────────┘
```

The HUD lives below the dungeon view, drawn on the same canvas or as an HTML overlay. Canvas is simpler for consistent pixel art feel — draw everything on one canvas.

Compass: draw a simple `N`, `E`, `S`, `W` label with the player's current facing highlighted or centered.

---

### 14. `systems/combatSystem.ts`

Depends on: `game/gameState.ts`, `content/enemies.ts`, `content/items.ts`

Combat state lives in `GameState.run`. When combat initiates, the current enemy is identified by its grid position. Combat is turn-based with the player always going first.

```ts
export interface CombatState {
  enemyId: string          // definition ID
  enemyHp: number
  enemyPosition: { x: number; y: number }
  playerDebuffs: Debuff[]
  turn: 'player' | 'enemy'
  log: string[]            // last N combat messages
}
```

Player actions:
- `playerAttack(state)` — roll damage, apply to enemy HP, check death
- `playerUseItem(state, itemId)` — apply item effect, remove from inventory
- `playerFlee(state)` — roll flee chance (base 60%, modified by relics), on success move player back one cell and end combat

Enemy turn (called after player action resolves):
- Look up the enemy's `behavior` from `EnemyDef`
- Apply behavior logic:
  - `aggressive`: attack player for `attack - player.defense` damage (min 1)
  - `ranged`: attack at half damage, never closes to melee, tries to maintain distance
  - `support`: apply debuff (lower player attack by 2 for 2 turns) rather than direct damage
  - `ambush`: first turn deals double damage (surprise), then `aggressive`
  - `slow_heavy`: skips every other turn, deals triple damage on acting turn

Append events to `combatState.log`. The UI reads from this log.

On enemy death: call `lootSystem.rollLoot`, remove enemy from floor state, return `state.mode` to `'dungeon'`.

On player death (HP ≤ 0): transition to `'dead'` mode.

---

### 15. `systems/lootSystem.ts`

Depends on: `game/gameState.ts`, `content/enemies.ts`, `content/items.ts`

```ts
export function rollLoot(enemyId: string, state: GameState): void
```

Rolls against each `LootEntry` in the enemy's `lootTable`. Adds successful drops to the floor cell at the enemy's position so the player can pick them up by walking over it (or auto-pick, designer choice).

Also handles: `addItemToInventory(itemId, qty, state)` — finds existing stack or empty slot, respects `maxStack`, returns `false` if inventory is full.

---

### 16. `systems/interactionSystem.ts`

Depends on: `game/gameState.ts`, `systems/mapSystem.ts`, `systems/lootSystem.ts`

Handles `INTERACT` input. When the player presses interact, check the cell directly in front of them:
- **Door (closed, unlocked)**: open it (update `cell.wallOverride` to `door_open`, play sound)
- **Door (locked)**: check inventory for a key. If present, consume key and open.
- **Hidden passage**: if player has Cartographer's Eye relic or has used a Reveal action, mark as revealed
- **Item on floor**: pick up (call `addItemToInventory`)
- **Relic on floor**: prompt to equip (if 2 relics held, prompt to swap one out)
- **Nothing**: no-op

Also handle auto-pickup: when the player walks onto a cell with an item and inventory is not full, pick it up automatically. Show a brief message in the combat log or a floating text.

---

### 17. `systems/relicSystem.ts`

Depends on: `game/gameState.ts`

Applies and removes relic passive effects when the player equips/unequips.

```ts
export function equipRelic(relicId: string, state: GameState): void
export function unequipRelic(relicId: string, state: GameState): void
```

Each relic effect is implemented as a named handler in this module. Keep the effect list small and concrete:

```ts
const RELIC_EFFECTS: Record<RelicEffectId, (state: GameState) => void> = {
  hollow_torch_equip: (state) => { /* mark floor passages as visible */ },
  hollow_torch_unequip: (state) => { /* revert */ },
  blood_thread_equip: (state) => { state.run.maxHp -= 20; state.run.hp = Math.min(state.run.hp, state.run.maxHp) },
  // ...
}
```

---

### 18. `systems/useEffectSystem.ts`

Depends on: `game/gameState.ts`

Maps `UseEffectId` strings to functions that mutate game state.

```ts
const USE_EFFECTS: Record<UseEffectId, (state: GameState) => void> = {
  heal_15: (state) => { state.run.hp = Math.min(state.run.hp + 15, state.run.maxHp) },
  heal_30: (state) => { state.run.hp = Math.min(state.run.hp + 30, state.run.maxHp) },
  clear_debuff: (state) => { state.run.combat?.playerDebuffs = [] },
  // ...
}

export function applyUseEffect(effectId: UseEffectId, state: GameState): void {
  USE_EFFECTS[effectId]?.(state)
}
```

---

### 19. `ui/combatView.ts`

Depends on: `engine/canvas.ts`, `game/gameState.ts`, `engine/assets.ts`

When `state.mode === 'combat'`, this module draws over the dungeon view:
- Enemy sprite (large, centered or left of center)
- Enemy name and HP bar
- Combat log (last 4–5 lines, scrolling)
- Action buttons: `[Attack]  [Use Item]  [Flee]`

Buttons can be keyboard-driven (A, I, F) or drawn as click targets. Draw them as chunky labeled rectangles in the pixel art style. Register click handlers that call the appropriate combat system function.

---

### 20. `ui/inventoryView.ts`

Depends on: `engine/canvas.ts`, `game/gameState.ts`, `engine/assets.ts`

Full-screen (canvas) inventory panel. Shows:
- Item grid (6–8 slots, item icon + qty)
- Selected item: name, flavor text, `[Use]` button
- Equipped relics: 2 slots with name and tradeoff reminder
- `[Close]` returns to dungeon mode

Triggered by `OPEN_INVENTORY` input. Sets `state.mode = 'inventory'` and draws this instead of the dungeon.

---

### 21. `ui/menus.ts`

Depends on: `engine/canvas.ts`, `game/gameState.ts`, `persistence/saveSystem.ts`

Handles all full-screen menu states:
- `drawTitleScreen()` — title art, `[New Game]  [Load]  [Import Save]`
- `drawHubScreen()` — The Threshold art/description, hub action buttons
- `drawDeathScreen()` — message, run summary, `[Return to Hub]`
- `drawCodexScreen()` — list of unlocked codex entries, selected entry text
- `drawSaveMenu()` — save slot info, `[Save]`, `[Export]`, `[Import]`

Menus handle their own input via click regions or keyboard navigation. Use a simple cursor index for keyboard nav.

---

### 22. `persistence/saveSystem.ts`

Depends on: `game/gameState.ts`

**IndexedDB:**
```ts
export async function saveGame(state: GameState): Promise<void>
export async function loadGame(): Promise<GameState | null>
```

Open the DB on first call. Use a single object store `'save'` with key `'current'`. Store the full `GameState` serialized to JSON.

**Export:**
```ts
export function exportSave(state: GameState): void
```
Serialize `GameState` to JSON string, create a `Blob`, create a temporary `<a>` element, trigger download as `wake-depths-save.wakestate`.

**Import:**
```ts
export async function importSave(): Promise<GameState | null>
```
Open a file picker (`<input type="file">`), read the file, parse JSON, validate schema version, return the parsed state (or null on failure). Caller writes it to IndexedDB.

**Schema validation:**
```ts
export function validateSave(raw: unknown): raw is GameState
```
Check `raw.version === CURRENT_VERSION`, check required fields exist. Fail loudly with a user-visible error message if invalid.

**Settings (localStorage):**
```ts
export function saveSettings(settings: Settings): void
export function loadSettings(): Settings
```
Serialize to `localStorage.setItem('ogdc_settings', JSON.stringify(settings))`.

---

### 23. `game/gameLoop.ts`

Depends on: all systems, all UI modules, `engine/input.ts`, `engine/canvas.ts`

The top-level update/render loop.

```ts
export function startLoop(state: GameState): void {
  function frame() {
    update(state)
    render(state)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function update(state: GameState): void {
  switch (state.mode) {
    case 'dungeon':
      movementSystem.tryTurn(state)
      movementSystem.tryMove(state)
      interactionSystem.tryInteract(state)
      break
    case 'combat':
      combatSystem.handlePlayerInput(state)
      break
    case 'inventory':
      inventoryView.handleInput(state)
      break
    // ...
  }
}

function render(state: GameState): void {
  canvas.clear()
  switch (state.mode) {
    case 'dungeon':
      renderer.renderDungeon(state)
      hud.drawHud(state)
      break
    case 'combat':
      renderer.renderDungeon(state)   // dungeon still visible behind combat UI
      combatView.draw(state)
      break
    case 'inventory':
      inventoryView.draw(state)
      break
    case 'title':
    case 'hub':
    case 'dead':
    case 'codex':
      menus.draw(state)
      break
  }
}
```

---

### 24. `main.ts`

Entry point. Runs once.

```ts
async function main() {
  const state = makeInitialState()
  const savedState = await loadGame()
  if (savedState) Object.assign(state, savedState)

  await assets.preloadAll(ALL_ASSET_PATHS)

  setupInput()
  startLoop(state)
}

main()
```

---

## Build Order

Work in this exact order. Each step produces something you can see or test.

### Step 1 — Walking in a Box
**Goal:** Character can move and turn through a hardcoded test grid. Minimap updates.
1. `constants.ts`
2. `engine/canvas.ts`
3. `engine/input.ts`
4. `content/types.ts`
5. `game/gameState.ts` (stub `run` with a test floor)
6. `systems/mapSystem.ts` (hardcode one 5×5 test map)
7. `systems/movementSystem.ts`
8. Flat-color renderer: draw a solid color per face direction (front = gray, left = dark gray, right = medium gray, floor = brown, ceiling = near-black). No textures. Just confirm the geometry is right.
9. `ui/minimap.ts`
10. `game/gameLoop.ts` (dungeon mode only)
11. `main.ts`

At the end of Step 1, a person walking around a box dungeon with a flat-color 3D view and a minimap is a working game skeleton.

### Step 2 — Textured Walls
**Goal:** Load real tile textures and render them on the projected geometry.
1. `engine/assets.ts`
2. Stub texture files (even solid-color PNGs of the right size) placed in `/assets/textures/`
3. Update renderer to sample from textures instead of solid fills
4. Tune projection constants until the corridor looks correct

### Step 3 — HUD and Menus
**Goal:** HUD visible. Title screen navigable. Hub screen accessible.
1. `ui/hud.ts` (HP bar, compass, relic slots — stub values)
2. `ui/menus.ts` (title and hub screens — placeholder art)
3. Wire title → hub → dungeon flow in game loop

### Step 4 — Items and Inventory
**Goal:** Pick up an item from the floor. View it in inventory. Use it.
1. `content/items.ts` (define 3 items)
2. `systems/lootSystem.ts`
3. `systems/interactionSystem.ts` (item pickup only)
4. `systems/useEffectSystem.ts` (heal_15 only)
5. `ui/inventoryView.ts`
6. Place one item in the test floor map

### Step 5 — Combat
**Goal:** Walk into an enemy, fight it, win or die.
1. `content/enemies.ts` (define Skulk only)
2. `systems/combatSystem.ts` (player attack + enemy attack only, no flee yet)
3. `ui/combatView.ts` (enemy sprite, HP bar, log, Attack button)
4. Wire combat mode into game loop
5. Enemy sprite loading via `engine/assets.ts`
6. Death → dead mode → hub

### Step 6 — Doors and Interactions
**Goal:** Locked door, key item, open door.
1. Extend `systems/interactionSystem.ts` (doors, keys)
2. Add door overlay textures
3. Add key item to `content/items.ts`
4. Build a small test map with a locked door

### Step 7 — Persistence
**Goal:** Save at hub, reload, continue from same floor.
1. `persistence/saveSystem.ts`
2. Export button on hub screen
3. Import on title screen
4. Auto-save on floor transition

### Step 8 — Relics
**Goal:** Pick up a relic, feel its effect, swap it out.
1. `content/relics.ts`
2. `systems/relicSystem.ts`
3. Update inventory view to show relics
4. Test with Blood Thread Charm (visible HP reduction)

### Step 9 — Full Floor 1
**Goal:** Real handcrafted map, full enemy set for Floor 1, save leads to Floor 2 stub.
1. Build Floor 1 grid in `content/floors.ts`
2. Place all Skulk and Warden enemies
3. Place items, key, relic
4. Wire floor exit to Floor 2 (stub: "You descend deeper." and return to hub)

### Step 10 — Content Completion
Floors 2 and 3, remaining enemies, miniboss, all relics, all items, ending screens, lore codex, audio.

---

## Key Technical Gotchas

**Canvas transform for trapezoid walls:** `ctx.save()` / `ctx.restore()` around every transformed draw. Forgetting this corrupts subsequent draw calls.

**Texture tiling on walls:** `drawImage` with a source rect. To tile a 64px texture across a 200px face, draw it 3–4 times offset horizontally. Or use `ctx.createPattern` and fill a clipped path.

**Input on mobile:** The game is keyboard-driven. Add on-screen arrow buttons as HTML elements below the canvas if you want mobile support. Wire them to inject into the same input queue. Not required for V1.

**IndexedDB is async:** All save/load calls are async. The game loop itself is synchronous. Load save data before starting the loop, not during it.

**Floor map authoring:** The compact string format for floor layouts is the easiest to iterate on. Define `#` = wall, `.` = floor, `D` = door (closed), `E` = exit, `@` = player spawn. Keep a separate metadata table for enemy and item placements by coordinate rather than embedding them in the string — it's easier to adjust.

**Combat log length:** Cap the log at the last 5–6 entries. Render it as lines of text in a fixed area. Do not implement scrolling for V1.

**Relic swap UI:** When the player tries to pick up a third relic, pause and show a selection prompt: "Which relic will you set aside?" This requires a temporary UI state. The simplest implementation is a `pendingRelicSwap` field in game state that the inventory view checks.

---

## What Stays Out of Code

The following are data/art concerns, not coding concerns:

- Tile texture art (see `updated_plan.md` — 14 images)
- Enemy sprite art (~20 images)
- All lore text, item flavor, enemy descriptions
- Hub and title screen background art
- Audio files

Define placeholder versions of all of these (solid-color PNGs, empty strings, silent audio) so code can run and be tested independently of art delivery.
