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
| wraith | Wraith | catacomb, machine | 7 | 4 | 1 | ✓ |
| automaton | Automaton | machine | 14 | 4 | 2 | ✓ |
| drone | Sentry Drone | machine | 8 | 5 | 1 | ✓ (files: enemy_sentry_*) |
| behemoth | Behemoth | machine | 32 | 8 | 3 | ✓ (renders at 137.5% scale) |

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
- [ ] **Persistent progression** — stats, unlocks, and run history survive browser refresh

---

## Planned Features (Next Sprint)

### 1 — Surface Portals

Portals on levels 3, 5, 7, 9, 11, 13, 15 that return the player to the surface (town). Once discovered (entered or walked past), a portal is saved permanently and accessible from the town menu as a fast-travel destination to resume from that floor.

**Design:**
- Each portal occupies the center cell of a dedicated **3×3 room** carved during generation
- Portal room must NOT be the start room and must NOT contain the exit stairs
- The portal is a **tall billboard sprite**: a floating blue diamond with a vertical gradient and soft ambient glow halo — rendered in the sprite pass, not as a wall override
- Walking into the portal cell triggers return to town; the portal floor ID is stored as the re-entry point
- From the town screen, each discovered portal appears as a separate "Descend to Floor N" menu entry

**Files affected:**
| File | Change |
|---|---|
| `content/types.ts` | Add `FloorPortal { x, y }` optional field to `FloorMap` |
| `content/dungeonGen.ts` | Portal room generation: carve 3×3 room, place portal at center, only on floors at index 2,4,6,8,10,12,14 (levels 3,5…15); room chosen from non-start, non-exit graph nodes |
| `content/floors.ts` | No interface change — portal position stored in `FloorMap` |
| `engine/assets.ts` | Load `portal_1–4.png` animation frames from `assets/world/` |
| `engine/renderer.ts` | Render portal as an animated sprite (cycle frames on `gameTick`); `scaleH ≈ 0.90`, `offY ≈ 0.06`; add soft blue glow by drawing a translucent blue rect around the sprite columns |
| `systems/movementSystem.ts` | Detect portal cell on step-into; call `goToTown` and mark portal discovered |
| `game/gameState.ts` | Add `discoveredPortals: Set<string>` (floor IDs) to `GameState`; add `portalReturnId: string \| null` for which portal the player last used |
| `persistence/saveSystem.ts` | Serialize `discoveredPortals` as `string[]`; restore on load |
| `ui/town.ts` | Show portal entries below normal menu items: "Return via Portal — Stone 3", etc. Selecting one calls `goToLevel(state, idx)` + spawns entities + sets mode to dungeon |

**Assets needed:** see `assets_needed.md` — `portal_1–4.png`

---

### 2 — Inventory Screen

A full-canvas overlay (toggled with **I**) showing the player's carried items in a scrollable grid and their equipment slots.

**Layout (drawn on canvas, not HTML):**
```
┌────────────────────────────────────────┐
│  INVENTORY              [I] to close   │
│                                        │
│  Equipment         Carried Items       │
│  ┌──────────┐      ┌──┬──┬──┬──┬──┐   │
│  │ WEAPON   │      │  │  │  │  │  │   │
│  │ [item]   │      ├──┼──┼──┼──┼──┤   │
│  │ ARMOR    │      │  │  │  │  │  │   │
│  │ [item]   │      ├──┼──┼──┼──┼──┤   │
│  │ SHIELD   │      │  │  │  │  │  │   │
│  │ [item]   │      ├──┼──┼──┼──┼──┤   │
│  └──────────┘      │  │  │  │  │  │   │
│                    └──┴──┴──┴──┴──┘   │
│  Gold: 0           20 slots           │
│                                        │
│  [selected item name]                  │
│  [description]    [E] Equip [D] Drop   │
└────────────────────────────────────────┘
```

- Grid: 4 rows × 5 columns = **20 carry slots**
- Navigate grid with arrow keys; CONFIRM / E to equip or use; D (new action) to drop
- Items show a small icon sprite in each slot; selected slot shows name + description below
- Equipment panel on the left shows the three equip slots; selecting a slot unequips into carry grid

**Files affected:**
| File | Change |
|---|---|
| `engine/input.ts` | Add `DROP_ITEM` action (key D); `OPEN_INVENTORY` action already exists (key I) |
| `game/gameState.ts` | Add `inventoryOpen: boolean`; `inventorySlot: number` (0–19, selected carry slot); `inventoryFocus: 'grid' \| 'equip'`; `inventoryEquipSlot: 'weapon' \| 'armor' \| 'shield' \| null` |
| `ui/inventory.ts` | New file — `renderInventory(state)`: draws full overlay; handles equip/drop/navigate |
| `game/gameLoop.ts` | In dungeon `update()`, check `OPEN_INVENTORY` to toggle; call `updateInventory(state)`; in `render()`, call `renderInventory(state)` when `inventoryOpen` |

**Assets needed:** see `assets_needed.md` — item icons, slot frame, equipment slot backgrounds

---

### 3 — Equipment and Player Stats

Replaces the hardcoded player attack (5–12) and introduces a full equipment and stat system.

**Player stats (new struct `PlayerStats` in `gameState.ts`):**
| Stat | Default (no gear) | Source |
|---|---|---|
| `attackMin` | 1 | base + weapon.min |
| `attackMax` | 2 | base + weapon.max |
| `defense` | 0 | armor.defense + shield.defense |
| `gold` | 0 | picked up from floor / enemy drops |
| `maxHp` | 60 | unchanged for now |

**Equipment slots (stored in `RunState`):**
```typescript
equipment: {
  weapon: ItemInstance | null
  armor:  ItemInstance | null
  shield: ItemInstance | null
}
```

**Item changes:**
- `ItemDef.effect` expands from `'heal'` to `'heal' | 'equip'`
- `ItemDef` gains optional fields: `slot?: 'weapon' | 'armor' | 'shield'`, `attackMin?: number`, `attackMax?: number`, `defense?: number`
- Consumables (potions) keep `effect: 'heal'`; equipment items use `effect: 'equip'`

**New item definitions (initial set):**
| Key | Name | Slot | Stats | Rarity / Depth |
|---|---|---|---|---|
| `dagger` | Rusty Dagger | weapon | +1–3 atk | stone 1–3 |
| `short_sword` | Short Sword | weapon | +2–5 atk | stone 3–5 / catacomb 1–2 |
| `longsword` | Longsword | weapon | +3–8 atk | catacomb 3–5 / machine 1–3 |
| `great_blade` | Great Blade | weapon | +5–12 atk | machine 3–5 |
| `leather_armor` | Leather Armor | armor | +1 def | stone 1–3 |
| `chain_mail` | Chainmail | armor | +3 def | catacomb 1–3 |
| `plate_armor` | Plate Armor | armor | +5 def | machine 2–5 |
| `wooden_shield` | Wooden Shield | shield | +1 def | stone 1–4 |
| `iron_shield` | Iron Shield | shield | +2 def | catacomb 2–5 / machine 1–3 |

**Gold:**
- Stored as `gold: number` in `RunState`; serialized in `SaveRun`
- Enemies have a `goldMin/goldMax` range in `EnemyDef`; on kill, drop gold coin entity on floor
- Player picks up gold automatically on step-into (no INTERACT needed)
- Gold coin renders as a small billboard sprite

**Carry limit:**
- `inventory` array capped at **20 items** (reject pickup if full, log "Inventory full")
- Displayed as the 4×5 grid in the inventory screen

**Combat formula changes:**
- Player attack: `uniform(attackMin, attackMax)` where min/max = base + weapon bonus
- Enemy attack: `uniform(def.attackMin, def.attackMax)` — stochastic (see feature 4)
- Damage received: `max(0, roll - playerDefense)`

**Files affected:**
| File | Change |
|---|---|
| `content/defs.ts` | Expand `ItemDef`; add equipment items to `ITEM_DEFS`; add `EnemyDef.goldMin/goldMax` |
| `game/gameState.ts` | Add `equipment` and `gold` to `RunState`; derive player attack/defense from equipment |
| `systems/entitySystem.ts` | On kill, roll gold drop and push a gold coin `ItemInstance`; auto-collect gold on step; check inventory cap on pickup |
| `systems/movementSystem.ts` | Wire `DROP_ITEM` action to drop selected inventory item onto floor |
| `persistence/saveSystem.ts` | Add `equipment` and `gold` to `SaveRun` |
| `engine/assets.ts` | Load item icon sprites |

---

### 4 — Stochastic Damage and Defense

All damage and HP values are drawn from **uniform distributions** at instantiation or hit time. No fixed values remain.

**EnemyDef stat changes:**
```typescript
// Before
hp:     number
attack: number

// After
hpMin:     number
hpMax:     number
attackMin: number
attackMax: number
```

**Enemy HP** is rolled once at spawn using the floor's seeded RNG:
```typescript
enemy.hp = enemy.maxHp = ri(rng, def.hpMin, def.hpMax)
```
This uses the existing deterministic `rng` in `generateEntities`, so layouts are still reproducible per seed.

**Enemy attack** is rolled fresh each hit:
```typescript
const dmg = ri(Math.random, def.attackMin, def.attackMax)
const dealt = Math.max(0, dmg - playerDefense)
```
Note: hit-time rolls use `Math.random` (non-seeded) for moment-to-moment variability.

**Player attack** (feature 3 formula, restated here):
```typescript
const dmg = attackMin + Math.floor(Math.random() * (attackMax - attackMin + 1))
```

**Updated enemy stat table:**
| Key | Name | HP range | Atk range | Speed |
|---|---|---|---|---|
| crawler | Cave Crawler | 4–8 | 1–3 | 1 |
| shade | Shadow | 6–12 | 2–4 | 1 |
| sentinel | Stone Sentinel | 14–22 | 4–7 | 2 |
| revenant | Revenant | 7–14 | 2–5 | 1 |
| boneguard | Bone Guard | 16–25 | 4–7 | 2 |
| wraith | Wraith | 5–10 | 3–6 | 1 |
| automaton | Automaton | 10–18 | 3–6 | 2 |
| drone | Sentry Drone | 6–12 | 4–7 | 1 |
| behemoth | Behemoth | 25–40 | 6–11 | 3 |

**Files affected:**
| File | Change |
|---|---|
| `content/defs.ts` | Replace `hp/attack` with `hpMin/hpMax/attackMin/attackMax` on `EnemyDef`; update all entries |
| `systems/entitySystem.ts` | `generateEntities`: roll HP from `[hpMin, hpMax]` using seeded rng; `dealDamageToPlayer`: roll `[attackMin, attackMax]` via Math.random, subtract player defense; `playerAttack`: roll player damage from equipment stats |
| `src/__tests__/entitySystem.test.ts` | Update fixtures to use new stat fields |
| `src/__tests__/regressions.test.ts` | Update any hardcoded HP/attack expectations |

---

### Gameplay
- [ ] **Player progression** — Strength (attack), Endurance (max HP), Perception (reveal radius); level up on floor completion
- [ ] **Locked doors + key system** — key item placed on same floor, always reachable from spawn
- [ ] **Relic system** — items with passive tradeoff effects; hold up to 2 at a time
  - Hollow Saint's Torch: reveals hidden passages, increases enemy aggression
  - Stone Sigil: +defense, slowed movement
  - Blood Thread Charm: heal on kill, reduced max HP
  - Cartographer's Eye: partial map reveal, enemies detect player through walls
- [ ] **Enemy loot drops** — chance-based item drops on kill (gold always; gear with low probability)
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

## New Bugs

- Paths are just straight lines. They should meander, making random turns occasionally. 
- Players should be able to react to monsters. If a player's most recent move was to turn, monsters do not attack them. 
- catacomb and machinery walls still be 60% stone walls, and only 40% the new type. Machinery areas can also use a catacomb wall with 2% probability. 

---

## Enhancements (Future / Nice-to-Have)

- **Maze pressure escalation** — dungeon becomes more hostile the longer you stay on a floor
- **Trap types** — spike corridors, pressure plates, dart launchers, cursed chests
- **Hidden passages** — walls that look solid but are passable after discovery
- **Procedural audio expansion** — Web Audio API synth for full ambient soundscape
- **Animated torch / light flicker** — subtle intensity variation on wall brightness
- **Particle effects** — hit sparks, death dissolve



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
