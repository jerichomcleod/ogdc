# Assets Needed — Wake in the Depths

All assets listed here are missing or need expanding. Existing assets are noted where relevant.

---

## Textures & Images

### Wall Textures (640×640 px, square, seamless preferred)

These are used as the face of every wall cell in first-person view. The renderer projects them at 1:1 aspect ratio. Already have:

| Theme     | Have | Need |
|-----------|------|------|
| Stone     | 7    | More variety recommended (10–12 total) |
| Catacomb  | 10   | Complete — expand if desired |
| Machinery | 12   | Complete — expand if desired |

Each texture should read clearly at small sizes (walls far away) and at near-full-screen (wall directly in front). Avoid pure-noise patterns — architectural detail reads better. Suggested content per theme:

- **Stone**: Cut stone, mortar lines, moss patches, carved relief, crumbling sections, iron fixtures
- **Catacomb**: Bone niches, carved epitaphs, stained plaster, alcoves, torch sconces, cracked arches
- **Machinery**: Riveted panels, pipe flanges, valve wheels, circuit traces, warning stripes, corroded metal

---

### Floor Textures (any square power-of-two, e.g. 512×512 or 256×256)

Used for the floor via perspective scanline raycasting — the texture tiles across the ground. Already have 8. Suggestions for expansion:

- **Stone floors**: Flagstone, cobblestone, worn marble, mossy stone
- **Catacomb floors**: Cracked tile, bone dust, dirt with roots
- **Machinery floors**: Metal grating, reinforced concrete, painted lines

Currently all 3 themes share the same floor pool. Separate sets per theme are possible if desired.

---

### Ceiling Textures (same spec as floor)

Used identically to floor but on the ceiling plane. Already have 8. Suggestions:

- **Stone ceilings**: Arched stone, rough-hewn rock, hanging stalactites
- **Catacomb ceilings**: Plastered vault, collapsed sections, root intrusion
- **Machinery ceilings**: Ducting, conduit bundles, fluorescent strips, water damage

---

### HUD / UI Sprites (pixel art recommended, any size)

None of these exist yet:

| Asset | Description |
|-------|-------------|
| Health bar / heart icons | Shown in bottom HUD alongside HP numbers |
| Compass rose or direction indicator | Replaces or supplements the "DIR NORTH" text |
| Exit marker icon | Used on minimap to mark the level exit |
| Fog-of-war edge texture | Subtle vignette or border around the 3D viewport (optional) |
| Door sprite / icon | Visual distinction for doors on minimap (currently a flat color) |

---

### Special Cell Markers

These wall override types are defined in code. Door and stair textures now exist; the rest still render as plain walls:

| Type | Texture file(s) | Status |
|------|----------------|--------|
| `door_closed` | `door_closed_1/2/3.png` | ✅ Done |
| `door_open` | `door_opened_1/2.png`, `door_open_3.png` | ✅ Done |
| `stairs_down` | `stair_down.png` | ✅ Done |
| `stairs_up` | `stair_up.png` | ✅ Done |
| `town_gate` | Uses wall texture + gold tint | Functional — dedicated texture optional |
| `door_locked` | — | Not yet |
| `passage` | — | Not yet |
| `rune` | — | Not yet |

---

### Enemy Sprites (9 needed)

Currently rendered as solid-color billboards. Each needs a PNG with transparent background — the renderer composites them as 3D billboards. Enemies render at **75% of wall face height**; sprites should fill the frame vertically.

Recommended size: **128×128 px** (or 64×64 minimum), transparent PNG.

| Filename | Enemy | Theme | Color hint |
|----------|-------|-------|-----------|
| `enemy_crawler.png` | Cave Crawler | Stone | Dim green — small, insectoid |
| `enemy_shade.png` | Shadow | Stone | Dark purple — wispy silhouette |
| `enemy_sentinel.png` | Stone Sentinel | Stone | Slate blue-grey — large humanoid |
| `enemy_revenant.png` | Revenant | Catacomb | Amber glow — undead humanoid |
| `enemy_boneguard.png` | Bone Guard | Catacomb | Ivory/white — skeletal soldier |
| `enemy_wraith.png` | Wraith | Catacomb/Machine | Teal — translucent, flowing |
| `enemy_automaton.png` | Automaton | Machine | Bronze/orange — mechanical humanoid |
| `enemy_drone.png` | Sentry Drone | Machine | Red-orange — floating |
| `enemy_heavy.png` | Heavy Unit | Machine | Dark red — large, armored |

---

### Item Sprites (2 needed)

Items render at **28% of wall face height**, shifted toward the floor (ground-level objects). Keep them small and readable at low resolution.

| Filename | Item | Notes |
|----------|------|-------|
| `item_potion_sm.png` | Healing Draught | Small vial, red liquid |
| `item_potion_lg.png` | Healing Potion | Larger flask, brighter red |

---

### Town Background (1 needed)

The town screen currently draws a procedural gradient. A painted background would replace it.

| Filename | Size | Description |
|----------|------|-------------|
| `town_bg.png` | 640×320 px | Surface scene — night sky, stone buildings, dungeon entrance visible. Dark/moody to match dungeon aesthetic |

---

### Town Gate Wall Texture (optional)

| Filename | Use | Notes |
|----------|-----|-------|
| `town_gate.png` | Wall face for the gate back to town (level 1 entry wall) | Arched gate/portal, warm gold tones. Currently uses stone wall + gold tint. |

---

### Title / Menu Art (optional but recommended)

| Asset | Suggested Size | Description |
|-------|---------------|-------------|
| Title screen illustration | 640×480 or larger | Establishing image for the main menu |
| Loading / preload screen | 640×480 | Shown while textures load |
| Game over screen | 640×480 | Shown on player death |
| Level transition card | 640×480 | Shown briefly between levels (e.g. "Entering the Catacombs…") |

---

## Audio

Nothing exists yet. Suggested priority order:

### Ambient / Music
| Asset | Description |
|-------|-------------|
| `ambient_stone.ogg` | Looping atmospheric audio for stone dungeon levels |
| `ambient_catacomb.ogg` | Looping audio for catacomb levels (dripping, wind, distant echoes) |
| `ambient_machine.ogg` | Looping audio for machinery levels (hum, dripping coolant, distant clanks) |

### Player Sound Effects
| Asset | Description |
|-------|-------------|
| `footstep_stone.ogg` | Footstep on stone floor (single hit, loop from movement system) |
| `footstep_metal.ogg` | Footstep on metal grating |
| `footstep_dirt.ogg` | Footstep on catacomb dirt |
| `door_open.ogg` | Door opening creak |
| `door_locked.ogg` | Dull thud — locked door |
| `level_exit.ogg` | Transition sound when descending to next level |
| `player_hurt.ogg` | Damage received |
| `player_death.ogg` | Player death |

### UI Sound Effects
| Asset | Description |
|-------|-------------|
| `ui_select.ogg` | Menu selection / confirm |
| `ui_back.ogg` | Cancel / back |
| `ui_open_inventory.ogg` | Inventory open |

---

## Writing / Narrative Content

Nothing exists yet. The following are needed to give the game voice:

### Level Flavor Text
✅ **Done** — loaded from `lvldesc.csv` (5 variants per level, randomly selected on entry).

### POI Room Descriptions
Short text (1–2 sentences) shown when the player enters a Point of Interest room. Needed per theme:

- **Stone**: 4–6 variants (ancient shrine, collapsed chamber, flooded room, altar, guard post, armoury)
- **Catacomb**: 4–6 variants (burial alcove, ossuary, sealed crypt, reliquary, prayer niche, forgotten tomb)
- **Machinery**: 4–6 variants (control station, coolant junction, reactor core section, storage bay, maintenance shaft, collapsed generator)

### Dead End Flavour
✅ **Done** — loaded from `deadend.csv` (5 variants per theme: stone, catacomb, machine).

### Item / Loot Descriptions
Not yet implemented, but when items are added these will be needed:
- Short name (e.g. "Rusted Sword")
- One-line description (e.g. "Heavier than it looks. The edge is still sharp.")

### Enemy Names and Descriptions
Not yet implemented. Suggested sets per theme (3–5 per theme):

- **Stone**: Ancient guardians, stone constructs, feral things that live in the dark
- **Catacomb**: Undead, grave-bound spirits, something that wears dead faces
- **Machinery**: Automatons, corrupted maintenance units, things grown into the pipes

### Game Over Text
✅ **Done** — loaded from `gameover.csv` (11 variants, randomly selected at death).

### Level Completion / Exit Text
Short text when stepping on the exit cell. Can be atmospheric rather than mechanical. 1 per level or 1 per theme.

---

## Format Notes

- **Wall textures**: 640×640 PNG, RGBA (alpha ignored by renderer — can be RGB). Square. Power-of-two not strictly required but recommended.
- **Floor/Ceiling textures**: Any square PNG. 256×256 or 512×512 recommended. Tileable.
- **UI sprites**: PNG with transparency. Pixel art at game resolution (640×480) is cleanest.
- **Audio**: OGG Vorbis preferred for web delivery. MP3 also fine. Ambient loops should be seamlessly loopable.
- **Writing**: Plain text or markdown is fine. Can be delivered directly as copy.
