# Wake in the Depths — Development Plan

## Concept

**Wake in the Depths** is a grid-based first-person dungeon crawler playable in a browser. You descend through 15 floors of a sealed labyrinth across three visual themes, fighting enemies in turn-based bump combat and managing a small inventory. The tone is dark fantasy with ancient machinery and subtle reality distortion — quiet, oppressive, text-heavy in the tradition of early 90s PC dungeon crawlers.

**Narrative premise:** The Wake is an ancient engine built to contain the Extant Core — a memory gravity well where identities and histories collapse. The seal is failing. You are a Delver searching for someone lost in the lower levels, uncovering that previous Delvers became living components in the stabilization system.

---

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Bundler | Vite |
| Rendering | HTML5 Canvas 2D — software raycaster (DDA) |
| UI | Canvas 2D for dungeon view, HTML/CSS for HUD overlay |
| Saves | localStorage (settings) + IndexedDB (saves) — not yet implemented |
| Deployment | GitHub Pages (`/ogdc/` base path) |

---

## Completed

### Engine
- [x] Software raycaster renderer — DDA, perspective-correct floor/ceiling, column-by-column wall projection
- [x] Distance fog (shade) applied to walls, floor, ceiling, enemy sprites, and item sprites
- [x] Smooth movement animation (ease in/out) for forward and back steps
- [x] Smooth turn animation (ease in/out) for left and right rotation
- [x] Smooth enemy movement animation — smoothstep interpolation over 250ms from `fromX/fromY` to `x/y`
- [x] Red hit flash overlay — sin-curve alpha fade on player damage, 245ms duration
- [x] Z-buffer for sprite occlusion with float bias (`zTest = tZ - 0.1`) to prevent flicker
- [x] Asset loading and pixel cache — all images pre-decoded to `Uint32Array` for software sampling
- [x] Asset directory organized into subdirs: `walls/`, `floors/`, `doors/`, `world/`, `enemies/`, `items/`, `data/`

### Dungeon Generation
- [x] Graph-based procedural generation — main path, wide areas, POI branches, loops, dead ends
- [x] Seeded RNG — deterministic per seed, reproducible layouts
- [x] Stair placement — always in rooms, never on corners or corridor tips (R01–R03 verified)
- [x] Door placement — only at strict corridor chokepoints with room boundaries (R05–R06 verified)
- [x] Dead-end detection treats doors as open neighbors (R04 verified)
- [x] Spawn facing points into level, not at entry wall (R10 verified)
- [x] Start/end nodes excluded from loops — always have free wall faces (R11 verified)
- [x] Less grid-like layout: loops reduced (0–1 per floor), dead ends increased (6–10 per floor)

### Level Structure
- [x] 15 levels: `stone_1–5` → `catacomb_1–5` → `machine_1–5`
- [x] Theme-aware wall textures — stone (7 variants), catacomb (10 variants), machinery (12 variants)
- [x] Floor/ceiling textures — 8 floor variants, 8 ceiling variants, selected per floor by hash
- [x] Deterministic per-cell texture index — same wall texture every visit
- [x] Stairs down (exit) and stairs up (return to previous level)
- [x] Level entry message overlay (2.5s, shown once per floor per session, R08)
- [x] Dead-end flavor text overlay
- [x] Game over screen with random message variants

### Enemies
- [x] Enemy instances placed on each floor, density scales with depth
- [x] Billboard sprite rendering — z-buffered, distance-fogged, integer half-width (R12)
- [x] Bump-to-attack: moving into enemy cell deals damage
- [x] Enemy AI — move toward player when in aggro range (12 cells), attack when adjacent
- [x] Turn debt system — enemies with speed > 1 act less frequently
- [x] `isAttacking` persistent pose — attack sprite held until enemy moves or idles (R13)
- [x] `fromX/fromY` snapshot — enables smooth movement interpolation
- [x] Enemy respawn prevention — `entitiesSpawned` flag, enemies only placed once per floor visit (R07)
- [x] Corpse rendering — dead enemies remain as sprites at reduced size

**Enemy roster:**

| Key | Name | Theme(s) | HP | Atk | Speed | Sprites |
|---|---|---|---|---|---|---|
| crawler | Cave Crawler | stone, catacomb | 6 | 2 | 1 | ✓ |
| shade | Shadow | stone | 9 | 3 | 1 | ✓ |
| sentinel | Stone Sentinel | stone | 18 | 5 | 2 | ✓ |
| revenant | Revenant | catacomb | 10 | 3 | 1 | ✓ |
| boneguard | Bone Guard | catacomb | 20 | 5 | 2 | ✓ |
| wraith | Wraith | catacomb, machine | 7 | 4 | 1 | — (solid color) |
| automaton | Automaton | machine | 14 | 4 | 2 | — (solid color) |
| drone | Sentry Drone | machine | 8 | 5 | 1 | — (solid color) |
| heavy | Heavy Unit | machine | 28 | 7 | 3 | — (solid color) |

### Items
- [x] Healing potions placed on floors (1–3 per level)
- [x] Sprite rendering — billboarded, positioned lower toward floor (offY 0.30)
- [x] Pickup via INTERACT (E / Space) when adjacent
- [x] Effect: restore HP

| Key | Name | Effect |
|---|---|---|
| potion_sm | Healing Draught | +15 HP |
| potion_lg | Healing Potion | +35 HP |

### Doors
- [x] Placed at corridor chokepoints during generation (~25% of eligible cells)
- [x] Rendered with door texture over wall
- [x] INTERACT to open (becomes passable, open door does not block raycasting — R09)
- [x] Deterministic door texture variant per cell coordinate

### UI
- [x] HUD: HP bar, floor ID, combat log (last 4 messages)
- [x] Viewport minimap with fog of war
- [x] Town/hub screen with descend option
- [x] Game over screen with restart

### Testing
- [x] 148 tests across 5 files (Vitest)
  - `dungeonGen.test.ts` — layout validity, room structure, connectivity
  - `regressions.test.ts` — R01–R13 regression suite
  - `gameState.test.ts` — state transitions, level advance/retreat, game over
  - `entitySystem.test.ts` — spawn, AI, combat, respawn prevention
  - `mapSystem.test.ts` — reveal, cell lookup, passability
- [x] GitHub Actions CI — runs on every push

---

## Pending

### High Priority
- [ ] **Sprites for remaining enemies** — wraith, automaton, drone, heavy currently render as solid-color billboards
- [ ] **Save / Load** — serialize `GameState` to localStorage or IndexedDB; auto-save on floor transition
- [ ] **Persistent progression** — stats, unlocks, and run history survive browser refresh

### Gameplay
- [ ] **Player progression** — Strength (attack), Endurance (max HP), Perception (reveal radius); level up on floor completion
- [ ] **Full inventory UI** — overlay grid (I key), show held items with icons, use consumables from inventory
- [ ] **Locked doors + key system** — key item placed on same floor, always reachable from spawn
- [ ] **Relic system** — items with passive tradeoff effects; hold up to 2 at a time
  - Hollow Saint's Torch: reveals hidden passages, increases enemy aggression
  - Stone Sigil: +defense, slowed movement
  - Blood Thread Charm: heal on kill, reduced max HP
  - Cartographer's Eye: partial map reveal, enemies detect player through walls
- [ ] **Enemy loot drops** — chance-based item drops on kill
- [ ] **More enemy behaviors** — ranged attack, support/debuff, ambush, slow-heavy variants

### Content
- [ ] **Lore codex** — collectible flavor text entries discovered in dungeon; browsable from hub
- [ ] **Floor descriptions** — atmospheric 2–4 sentence text on first visit (CSV already loaded, needs content)
- [ ] **Dead-end messages** — per-theme flavor text (CSV loaded, needs expanded content)
- [ ] **Game over messages** — more variants (CSV loaded)
- [ ] **Hub / town screen** — rest (full heal), codex browser, save/export, descend
- [ ] **Ending screens** — reseal, sacrifice, destroy — three outcomes based on player choice
- [ ] **Boss encounters** — one per theme region (floor 5, 10, 15)

### Audio
- [ ] **Ambient drones** — procedural Web Audio API oscillator per theme (no files needed)
- [ ] **Sound effects** — footstep, turn, attack hit, player hit, door open, item pickup, death, stairs
- [ ] **Volume settings** — SFX and music independently controllable

### Polish
- [ ] **Title screen** — full-canvas art with New Game / Load / Import
- [ ] **Export / Import save** — JSON download as `.wakestate`, file upload with schema validation
- [ ] **Mobile input** — on-screen directional buttons wired to input queue
- [ ] **Settings menu** — keybindings, volume, graphics (e.g. shade distance)

---

## Known Bugs

None currently tracked. All discovered bugs have regression tests in `src/__tests__/regressions.test.ts`.

Fixed regressions (do not reintroduce):
- **R01** — Stairs on corner walls (2 floor neighbors)
- **R02** — Stairs in random corridors (adjacent floor cell has only 1 floor neighbor)
- **R03** — Stairs missing entirely (null slot → spawn at room center)
- **R04** — Dead-end detection triggers when a door is adjacent (door miscounted as wall)
- **R05** — Doors spawn inside rooms (not at chokepoints)
- **R06** — Doors spawn inside plain corridor (no room/junction boundary)
- **R07** — Enemies respawn after being killed
- **R08** — Level entry message shown multiple times for the same floor
- **R09** — Open door blocks raycasting
- **R10** — Spawn facing points toward entry wall instead of into level
- **R11** — Start/end nodes get extra corridor connections → no free wall faces
- **R12** — Enemy sprites flicker: z-buffer float precision & non-integer half-width
- **R13** — Enemy attack pose reverts after timeout instead of persisting until next action

---

## Enhancements (Future / Nice-to-Have)

- **Seeded daily challenge mode** — fixed seed per date, leaderboard-friendly
- **Second character archetype** — different starting stats/ability (e.g. Seeker: fast, low HP)
- **Maze pressure escalation** — dungeon becomes more hostile the longer you stay on a floor
- **Light / lantern mechanic** — exploration mode (wide reveal) vs revelation mode (finds secrets, drains energy)
- **Trap types** — spike corridors, pressure plates, dart launchers, cursed chests
- **Hidden passages** — walls that look solid but are passable after discovery
- **Procedural audio expansion** — Web Audio API synth for full ambient soundscape
- **Animated torch / light flicker** — subtle intensity variation on wall brightness
- **Particle effects** — hit sparks, death dissolve
- **Multiple save slots** — IndexedDB with slot selection on title screen
- **Narrative branching** — mid-game discoveries change hub dialogue and final choice options
- **Expanded floor count** — beyond 15 levels; theme 4+ (e.g. Hollow Choir, Deep Machine)

---

## File Structure

```
/src
  /engine
    gameLoop.ts       ← RAF loop, update/render dispatch, enemy timing
    input.ts          ← keyboard input, action queue, cooldowns
    renderer.ts       ← DDA raycaster, sprite pass, HUD, overlays
    assets.ts         ← image loading, pixel cache, text data (CSV)

  /game
    gameState.ts      ← GameState / RunState types, state factory functions
    constants.ts      ← canvas dims, FOV, shade distance, animation timings

  /systems
    entitySystem.ts   ← enemy/item spawn, AI turns, combat resolution, loot
    mapSystem.ts      ← cell lookup, reveal, passability

  /content
    types.ts          ← FloorMap, Cell, EnemyDef, ItemDef, EnemyInstance, Corpse
    defs.ts           ← enemy and item stat definitions
    dungeonGen.ts     ← graph-based procedural floor generation
    floors.ts         ← floor registry, LEVEL_SEQUENCE, getFloor()

  /__tests__
    dungeonGen.test.ts
    regressions.test.ts
    gameState.test.ts
    entitySystem.test.ts
    mapSystem.test.ts

/assets
  /walls              ← stone_1-7, catacombs_1-10, machinery_1-12
  /floors             ← floor_1-8, ceiling_1-8
  /doors              ← door_closed_1-3, door_opened_1-2, door_open_3
  /world              ← stair_down, stair_up
  /enemies            ← crawler, shade, sentinel, revenant, boneguard sprites
  /items              ← potion_small, potion_large
  /data               ← deadend.csv, gameover.csv, lvldesc.csv

index.html
vite.config.ts
```
