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

These wall override types are defined in code but have no visual distinction yet. They currently render as plain walls:

| Type | Suggested Visual |
|------|-----------------|
| `door_closed` | Wall texture with a door arch/frame overlay |
| `door_open` | Recessed doorway — floor visible through gap |
| `door_locked` | Door with keyhole detail |
| `passage` | Archway or curtained opening |
| `rune` | Wall with a glowing carved symbol |

If you want these to stand out visually, either provide separate textures for each, or provide overlay sprites that get composited onto the wall face.

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
Short atmospheric descriptions shown when entering each level (1–3 sentences). One per level:

| Level ID     | Tone suggestion |
|--------------|----------------|
| `stone_1`    | Threshold — the player has just descended. Unease, damp air. |
| `stone_2–4`  | Deepening dread. Hints of what came before. |
| `stone_5`    | Something shifts. The stone is older here. |
| `catacomb_1` | The dead are everywhere. Not all of them restful. |
| `catacomb_2–4` | Growing wrongness. Names on the walls. Familiar ones. |
| `catacomb_5` | The oldest part. Something was sealed here. |
| `machine_1`  | Metal and oil. Not natural. Who built this? |
| `machine_2–4` | The machines are still running. Why? |
| `machine_5`  | The source. This is what the dungeon was built around. |

### POI Room Descriptions
Short text (1–2 sentences) shown when the player enters a Point of Interest room. Needed per theme:

- **Stone**: 4–6 variants (ancient shrine, collapsed chamber, flooded room, altar, guard post, armoury)
- **Catacomb**: 4–6 variants (burial alcove, ossuary, sealed crypt, reliquary, prayer niche, forgotten tomb)
- **Machinery**: 4–6 variants (control station, coolant junction, reactor core section, storage bay, maintenance shaft, collapsed generator)

### Dead End Flavour
1–2 sentence descriptions for dead-end rooms (no progression value — pure atmosphere). 3–5 per theme.

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
3–5 short variants (avoid generic "You died"). Match the tone of the dungeon.

### Level Completion / Exit Text
Short text when stepping on the exit cell. Can be atmospheric rather than mechanical. 1 per level or 1 per theme.

---

## Format Notes

- **Wall textures**: 640×640 PNG, RGBA (alpha ignored by renderer — can be RGB). Square. Power-of-two not strictly required but recommended.
- **Floor/Ceiling textures**: Any square PNG. 256×256 or 512×512 recommended. Tileable.
- **UI sprites**: PNG with transparency. Pixel art at game resolution (640×480) is cleanest.
- **Audio**: OGG Vorbis preferred for web delivery. MP3 also fine. Ambient loops should be seamlessly loopable.
- **Writing**: Plain text or markdown is fine. Can be delivered directly as copy.
