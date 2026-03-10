# Updated Plan: Wake in the Depths
## Realistic Browser-Based Scope (Early 1990s Aesthetic)

---

## Design Philosophy

The original plan is well-conceived but scoped for a team with significant runtime. This document reduces it to a realistic solo or small-team project with a clear finish line.

The key shift: **embrace the 1990s dungeon crawler aesthetic deliberately.** Grid-based movement, sprite-based enemies, chunky UI, and text-heavy lore are not limitations — they are the feel. Eye of the Beholder (1991), Dungeon Master (1987), Ultima Underworld (1992), and Wizardry VI are the reference points.

This removes the need for a 3D engine entirely and cuts scope by roughly 60% while producing something with more aesthetic coherence.

---

## Core Aesthetic Target

- **Perspective**: First-person, grid-locked movement (no free-roaming)
- **Rendering**: HTML5 Canvas — raycasting walls + billboard sprites, OR flat pre-rendered perspective panels
- **Movement**: Cardinal directions only (N/S/E/W), one step at a time. Turn 90 degrees left or right.
- **Combat**: Turn-based or click-to-act (not real-time animation combos)
- **UI**: Heavy, chunky panel layout — compass, minimap, HP/stamina bars, portrait, inventory
- **Color Palette**: Muted dungeon tones, amber text, limited palette per floor theme
- **Text**: Flavor text on every item, enemy, and location. Text is atmosphere.
- **No 3D library required.** Canvas 2D is sufficient.

The rendering approach should look like this: dungeon walls fill the top 60% of the screen. A wide UI panel anchors the bottom with all player info. The minimap auto-draws as you explore.

---

## What Gets Cut From Original Plan

| Original Feature | Status | Reason |
|---|---|---|
| Smooth 3D first-person movement | Replaced with grid-based | Saves months of camera/collision work |
| Babylon.js / Three.js | Dropped | Not needed for grid-based |
| Dodge mechanic | Cut | Doesn't apply to grid-based |
| Sprint | Cut | No free movement |
| Real-time animation combat | Simplified to turn-based | Far more achievable |
| Multiple playstyle archetypes (4 classes) | Start with 1, add 1 more | Reduces content scope for v1 |
| Maze pressure / corridor shifting | Deferred to Phase 2 | Interesting but complex |
| Seeded challenge mode | Deferred | Nice feature, not core |
| Hub NPC interactions | Simplified to menus | Cuts dialogue tree complexity |
| Procedural generation | Handcrafted floors first | Procedural gen can come later once rooms work |

---

## Revised Core Loop

```
Title Screen
    → New Game (name your character) / Load Save / Import Save
        → Hub (The Threshold)
            → Review inventory, read lore, save game
            → Descend into dungeon
                → Navigate floor grid, reveal automap
                → Encounter enemies (turn-based combat)
                → Find keys, relics, hidden passages
                → Reach exit (descend) or return to hub (ascend)
            → Return to hub with loot/relics
        → After retrieving final relic → Ending screen
```

---

## Game Structure (V1 Vertical Slice)

### Hub: The Threshold

A safe antechamber above the Wake. Implemented as a **static illustrated scene** or a simple text-menu with atmospheric description.

Hub functions:
- **Rest**: restore HP (costs a resource or is time-limited)
- **Stash**: deposit items you want to keep between runs
- **Codex**: browse discovered lore entries and relic descriptions
- **Save / Export**: manual save point, trigger JSON export
- **Descend**: enter the dungeon

Hub does not need to be a walkable space. It is a menu with art behind it.

### Dungeon: 3 Floors for V1

Each floor is a **handcrafted grid map** (16×16 or 20×20 tiles).

| Floor | Theme | Enemy Set | Key Feature |
|---|---|---|---|
| 1 — The Antechamber | Crumbling masonry, torchlit | Skulks, Warden | Teaches grid navigation, locked door puzzle |
| 2 — The Mechanism Hall | Ancient machinery, grinding gears | Sentinel Constructs, Murmur Priests | Pressure plate puzzle, first relic |
| 3 — The Hollow Choir | Bone and silence, ambient wrongness | Burrowers, Choir Wraith (miniboss) | Final relic, exit to ending |

Each floor contains:
- 1 locked door requiring a key found elsewhere on the floor
- 1 hidden passage (walk into a wall that looks solid)
- 1 optional side room with loot or lore
- 1 guaranteed healing item if the player is low on resources
- 1 relic or major item

### Combat System (Turn-Based)

When the player steps into a cell occupied by an enemy, or moves adjacent to one, combat initiates.

**Combat is sequential — player acts, then enemies act.**

Player options each turn:
- **Attack** (basic weapon swing — always available)
- **Use Item** (consumable from inventory)
- **Flee** (attempt to retreat — may fail)

Enemy behavior is simple and readable:
- Skulks: attack twice, low HP
- Wardens: attack once, high defense, block sometimes
- Murmur Priests: deal debuff instead of damage (lowers attack for 2 turns), retreat when adjacent
- Sentinel Constructs: slow, deal heavy damage, immune to flee attempts
- Burrowers: ambush (appear without warning), moderate HP
- Choir Wraith (floor 3 miniboss): 3-phase, each phase uses a different simple mechanic

No stamina bar. No combo chains. Clarity over depth in V1.

### Items and Relics

**Consumables** (found in dungeon, carried in limited inventory slots):
- Small Phial (restore 15 HP)
- Restoration Draft (restore 30 HP)
- Clarity Shard (remove debuff)
- Smoke Tallow (flee attempt always succeeds this turn)
- Ember Stone (deal bonus fire damage this turn)

**Relics** (persistent within a run, found on floors 2 and 3):
- **Hollow Saint's Torch**: reveals hidden passages without searching — but enemies on this floor become aggressive (fewer idle turns before engaging)
- **Stone Sigil**: gain +2 defense — movement slows (costs 1 extra step-action to traverse a room sometimes, mechanically this means some doors require 2 turns to pass through)
- **Blood Thread Charm**: heal 3 HP on every kill — max HP reduced by 20
- **Cartographer's Eye**: minimap reveals adjacent rooms before you enter — enemies detect you through walls (remove the benefit of hesitation)

Player can hold up to 2 relics at a time. Choosing between them is the primary mechanical decision.

---

## Progression

### Within a Run
- Collect items found in dungeon
- Relics stay equipped until the run ends or player discards one to pick up another
- HP does not restore between floors unless the player uses items or rests at a safe alcove

### Persistent (Survives Between Runs)
- **Codex entries**: lore fragments collected in the dungeon
- **Best depth reached**: tracked for score/prestige
- **Discovered relic knowledge**: once you've found a relic, its effects are shown in the codex even before finding it again

### No Permadeath in V1
Death returns the player to The Threshold with:
- Inventory lost
- Relics lost
- Lore discovered on that run retained
- HP restored
- Player chooses to descend again or export save

This is gentler than classic roguelikes and more appropriate for a narrative-driven game.

---

## Save System

Same general approach as original plan, simplified schema:

```json
{
  "version": 1,
  "profile": {
    "name": "Maren",
    "createdAt": "2026-03-09T00:00:00Z",
    "lastPlayedAt": "2026-03-09T00:00:00Z"
  },
  "progression": {
    "maxDepth": 2,
    "codexEntries": ["entry_threshold_001", "entry_relic_torch"],
    "knownRelics": ["hollow_saint_torch"]
  },
  "currentRun": {
    "floor": 2,
    "hp": 34,
    "maxHp": 60,
    "inventory": [
      {"id": "phial_small", "qty": 2}
    ],
    "relics": ["hollow_saint_torch"],
    "position": {"x": 7, "y": 4},
    "facing": "north",
    "mapRevealed": [[true, false, ...], ...],
    "floorFlags": {
      "keyFound": true,
      "lockedDoorOpen": false,
      "relicCollected": false
    }
  }
}
```

Save locations:
- **Auto**: IndexedDB on floor transition and at hub
- **Manual**: Player-triggered at hub ("Save and Rest")
- **Export**: Download as `.wakestate` JSON file
- **Import**: Upload `.wakestate` file, validate, restore

---

## Technical Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | Catches errors early, good for data structures |
| Bundler | Vite | Fast dev loop, zero config |
| Rendering | HTML5 Canvas 2D | No 3D library needed for grid-based |
| UI | HTML/CSS panels + Canvas | Canvas for dungeon view; HTML for inventory/HUD |
| Saves | localStorage (settings) + IndexedDB (saves) | Same as original plan |
| Audio | Web Audio API | Simple, no dependency |

**Rendering approach: Textured perspective projection on Canvas 2D.**

This is the same technique used by the Windows 3D Maze screensaver and early grid-based crawlers. A small set of tileable textures (wall, floor, ceiling) are drawn onto perspective-projected quads at each depth level. The renderer reads the grid around the player and constructs the view column by column (or quad by quad for a grid-locked version).

How it works in practice:
- The dungeon is a 2D grid. At each step the renderer looks ahead N cells in the player's facing direction.
- For each depth slice (1 cell, 2 cells, 3 cells away), it draws the visible wall faces, floor strip, and ceiling strip scaled and offset by depth.
- Wall textures tile horizontally across the face. Floor and ceiling textures tile across their respective planes, shrinking toward the horizon.
- Left and right wall faces for the current corridor are drawn as perspective trapezoids using `ctx.transform`.
- No raycasting required for a grid-locked view — the geometry is simple and deterministic.

This means:
- **One wall texture per floor theme** tiles across all wall faces at all distances.
- **One floor texture per floor theme** tiles across the floor plane.
- **One ceiling texture per floor theme** tiles across the ceiling plane.
- Special wall variants (door, locked door, hidden passage) are overlaid on the base wall texture.

The renderer module handles all the projection math. Art assets stay minimal.

---

## Folder Structure (Revised)

```
/src
  /engine
    canvas.ts         ← canvas setup and clear
    input.ts          ← keyboard + click input
    audio.ts          ← sound effects
    renderer.ts       ← perspective projection: reads grid, draws tiled wall/floor/ceiling quads at each depth slice

  /game
    gameState.ts      ← single source of truth
    gameLoop.ts       ← update tick
    constants.ts

  /systems
    combatSystem.ts   ← turn resolution
    movementSystem.ts ← grid step, wall collision, facing
    lootSystem.ts     ← item drops
    saveSystem.ts     ← IndexedDB + export/import
    mapSystem.ts      ← automap reveal

  /content
    items.ts          ← item definitions
    relics.ts         ← relic definitions
    enemies.ts        ← enemy stat blocks + behavior
    floors.ts         ← floor grid data + room metadata
    lore.ts           ← codex entry text

  /ui
    hud.ts            ← HP bar, compass, portrait
    inventory.ts      ← item grid panel
    minimap.ts        ← automap drawing
    menus.ts          ← title, hub, death, settings
    codex.ts          ← lore browser

  /persistence
    indexedDb.ts
    exportImport.ts
    migration.ts

  main.ts
```

---

## Assets Required (Manual Creation)

This section details everything that cannot be generated by code and must be created by hand. This is the largest non-code workload.

### Visual Assets

#### Dungeon Tile Textures (Core Rendering)

The perspective renderer tiles a small set of textures across projected geometry. You do not draw pre-composed panels — the engine handles projection. You only need to provide the raw tiles.

Each tile should be **64×64px** or **128×128px**, designed to tile seamlessly (left edge matches right edge, top matches bottom). Pixel art style recommended.

**Per floor theme, you need 3 base textures:**

| Texture | Filename pattern | Notes |
|---|---|---|
| Wall tile | `wall_<theme>.png` | Stone blocks, machinery panels, bone lattice, etc. Tiles horizontally across wall faces. Should have some vertical interest (mortar lines, rivets) since it won't tile vertically — walls have a fixed height. |
| Floor tile | `floor_<theme>.png` | Tiles across the floor plane receding to horizon. Keep detail subtle — this will be seen in perspective and busier textures look noisy. |
| Ceiling tile | `ceiling_<theme>.png` | Same logic as floor. Can be darker/simpler than the wall — ceilings are glanced at, not studied. |

**3 floor themes:**

| Theme | Wall feel | Floor feel | Ceiling feel |
|---|---|---|---|
| Antechamber (Floor 1) | Rough-cut stone blocks, torch sconces implied | Worn flagstone | Raw stone, dark |
| Mechanism Hall (Floor 2) | Iron plates with rivets or conduit lines | Metal grating or worn tile | Low industrial ceiling |
| Hollow Choir (Floor 3) | Smooth pale stone, carved grooves or bone inlay | Polished dark stone | High vaulted, almost black |

**Total base tiles: 9 images** (3 textures × 3 themes).

**Special wall overlay tiles (shared across themes):**

| Texture | Filename | Notes |
|---|---|---|
| Door (closed) | `wall_door_closed.png` | Centered on a wall face. Same size as base wall tile, drawn over it. |
| Door (open) | `wall_door_open.png` | Shows open passage through darkness. |
| Locked door | `wall_door_locked.png` | Visible lock or seal indicator. |
| Hidden passage (revealed) | `wall_passage.png` | Subtle indication — a seam, a hollow sound. Only shown after discovery. |
| Decorated wall / rune wall | `wall_rune.png` | Optional. For special rooms, objective chambers. |

**Total special overlays: 5 images.**

**Grand total for dungeon rendering: 14 tile images.** All reused at every depth level by the projection engine.

#### Enemy Sprites
Each enemy needs:
- **Idle frame** (1 image, front-facing)
- **Attack frame** (1 image)
- **Death frame** (1 image, or just remove from view)

| Enemy | Frames Needed |
|---|---|
| Skulk | 3 |
| Warden | 3 |
| Murmur Priest | 3 |
| Sentinel Construct | 3 |
| Burrower | 3 (emerging from floor or wall) |
| Choir Wraith (miniboss) | 3–5 (3 phases) |

Total: ~20 enemy sprites. Recommend 64×64 or 96×96 pixel art.

#### UI Art
| Asset | Notes |
|---|---|
| `hud_frame.png` | Bottom panel frame — the main UI chrome |
| `portrait_player.png` | Static character portrait (or 2 states: normal, damaged) |
| `compass_rose.png` | N/S/E/W compass image or 4 direction indicators |
| `minimap_tiles.png` | Tile sheet: floor, wall, unexplored, stairs, door, special |
| `inventory_slot.png` | Empty and filled slot frame |
| Item icons | One icon per item type (~8 icons) |
| Relic icons | One icon per relic (~4–6 icons) |
| `door_closed.png` / `door_open.png` | In dungeon view |
| `passage_hidden.png` | Revealed hidden passage texture |

#### Screens and Backgrounds
| Asset | Notes |
|---|---|
| `title_screen.png` | Full-screen title art — the most important piece of atmosphere |
| `hub_background.png` | The Threshold scene — stone antechamber, flickering light |
| `ending_a.png` | Ending screen (reseal) — optional, can be text-only |
| `ending_b.png` | Ending screen (sacrifice) — optional |
| `death_screen.png` | "You have fallen" screen |

---

### Written Content

#### Lore Codex Entries
Each collected fragment appears in the in-game codex. These should be written in advance.

**Required entries (V1):**
- The Threshold (introduction to the hub)
- The Wake (what the dungeon is)
- The Extant Core (the entity / anomaly below)
- The Delvers (who your character is and what came before)
- The Lost Expedition (who you're looking for)
- Entry for each relic (4 entries — item lore)
- Entry for each enemy type (5 entries — bestiary-style)
- 3–5 "environmental" entries (graffiti found on walls, broken tablets, etc.)

Total: ~18–20 short text entries, each 3–8 sentences.

#### Item and Relic Flavor Text
Every item needs a 1–2 sentence description.

| Items |
|---|
| Small Phial |
| Restoration Draft |
| Clarity Shard |
| Smoke Tallow |
| Ember Stone |
| Hollow Saint's Torch |
| Stone Sigil |
| Blood Thread Charm |
| Cartographer's Eye |

#### Enemy Descriptions
Short flavor text shown when a new enemy is encountered for the first time (1–3 sentences each):
- Skulk, Warden, Murmur Priest, Sentinel Construct, Burrower, Choir Wraith

#### Hub Dialogue / Menu Flavor Text
The hub menus can have atmospheric one-liners that change based on depth or run state. These rotate on screen and cost nothing to write but do a lot for tone. Recommend 20–30 short atmospheric strings.

Examples:
- *"The Wake breathes. You can feel it."*
- *"The relic you carry feels heavier here."*
- *"No one who descended past the third ring has returned intact."*

#### Floor Descriptions
Short text that displays when the player first enters a new floor. 2–4 sentences establishing atmosphere.

---

### Audio Assets

Audio is optional but has a large impact on 90s feel. If included:

| Asset | Description |
|---|---|
| `ambient_floor1.mp3` | Low droning ambience, stone and torch |
| `ambient_floor2.mp3` | Mechanical grinding, low hum |
| `ambient_floor3.mp3` | Silence with faint choir or resonance |
| `ambient_hub.mp3` | Quiet surface air |
| `sfx_step.wav` | Footstep on stone |
| `sfx_turn.wav` | Character turning |
| `sfx_attack.wav` | Weapon swing |
| `sfx_hit.wav` | Enemy taking damage |
| `sfx_enemy_hit.wav` | Player taking damage |
| `sfx_door_open.wav` | Door mechanism |
| `sfx_item_pickup.wav` | Pick up item |
| `sfx_death.wav` | Player death |
| `sfx_descend.wav` | Stairs, going deeper |
| `sfx_victory.wav` | Floor cleared or boss defeated |
| `music_title.mp3` | Title screen theme — 30–90 seconds |

Ambient tracks should loop seamlessly. All SFX can be short (0.5–2 seconds). Tools: BFXR/SFXR for retro SFX; Audacity or free DAW for ambient tracks.

---

## Phased Delivery

### Phase 1 — Playable Prototype
Goal: prove the core loop with placeholder art.

- [x] Grid movement in a flat canvas dungeon (no art, just colored walls)
- [x] Minimap reveals as you walk
- [x] One enemy type with working turn combat
- [x] Inventory panel with one item type
- [x] Save/load to IndexedDB
- [x] Export/import JSON

### Phase 2 — First Vertical Slice
Goal: one complete playable floor with real art.

- [ ] Panel art for Floor 1 walls and floors
- [ ] 3 enemy sprites
- [ ] Working HUD with portrait and compass
- [ ] All V1 items functioning
- [ ] Floor 1 grid map: handcrafted, solvable, with secret room
- [ ] Hub menu with save and codex

### Phase 3 — Full V1
Goal: complete 3-floor game with ending.

- [ ] All 3 floor themes with art
- [ ] All 6 enemy types with sprites
- [ ] All 4 relics functioning
- [ ] Floor 2 and 3 handcrafted maps
- [ ] Choir Wraith miniboss fight
- [ ] All lore entries written and in codex
- [ ] Title screen and ending screens
- [ ] Audio (at minimum: ambient + key SFX)
- [ ] Death screen and run-loss flow
- [ ] Full save/load/export/import

### Phase 4 — Polish and Expansion (if desired)
- Raycasting renderer upgrade
- Procedural floor generation (seeded)
- Second character archetype
- Additional floors
- Expanded ending choices (see original plan)

---

## What This Game Is (Summary Statement)

> **Wake in the Depths** is a grid-based first-person dungeon crawler playable in a browser. You descend through three floors of a sealed labyrinth, managing a small inventory, collecting relics with tradeoffs, and fighting enemies in turn-based encounters. The tone is quiet, oppressive, and text-heavy in the tradition of early 90s PC dungeon crawlers. Progress saves to the browser or to an exported file. The full V1 game is completable in 60–90 minutes.

This is achievable. The original plan is a good game. This plan is a game you can finish.
