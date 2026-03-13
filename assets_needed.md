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

### Enemy Sprites

Currently rendered as solid-color billboards until sprites are provided. Each needs a PNG with transparent background — the renderer composites them as 3D billboards. Enemies render at **75% of wall face height**; sprites should fill the frame vertically. Each enemy has separate **stand**, **attack**, and **dead** animation frames.

Recommended size: **128×128 px** (or 64×64 minimum), transparent PNG. Naming convention: `enemy_{key}_{phase}_{frame}.png`.

**✅ Sprites already provided** (in `assets/enemies/`):

| Enemy | Stand | Attack | Dead | Notes |
|-------|-------|--------|------|-------|
| Cave Crawler | `_stand_1–3` | `_attack_1–3` | `_dead_1–3` | Stone/catacomb |
| Shadow | `_stand_1–2` | `_attack_1–2` | `_dead_1–2` | Stone |
| Stone Sentinel | `_stand_1–3` | `_attack_1–2` | `_dead_1–3` | Stone |
| Revenant | `_stand_1–3` | `_attack_1–2` | `_dead_1–3` | Catacomb |
| Bone Guard | `_stand_1–3` | `_attack_1–2` | `_dead_1–3` | Catacomb |
| Wraith | `_stand_1–2` | `_attack_1–2` | `_dead_1–2` | Catacomb/Machine — teal, translucent |
| Automaton | `_stand_1–3` | `_attack_1–3` | `_dead_1–3` | Machine — bronze/orange |
| Sentry Drone | `_stand_1–3` | `_attack_1–3` | `_dead_1–3` | Machine — files named `enemy_sentry_*` |
| Behemoth | `_stand_1–2` | `_attack_1–2` | `_dead_1–3` | Machine — dark red, renders at 137.5% scale |

**Still needed:** All enemy sprites are wired; no additional enemy sprite assets are currently required.

---

### Item Sprites

Items render as 3D billboards at ground level. Two rendering sizes are used:
- **Consumables** (potions): ~28% of wall height, shifted toward floor
- **Equipment / gold** (planned — Feature 3): same billboard system, similar scale

**✅ Done:**

| Filename | Item | Notes |
|----------|------|-------|
| `item_potion_sm.png` | Healing Draught | Small vial, red liquid |
| `item_potion_lg.png` | Healing Potion | Larger flask, brighter red |

**Needed for Feature 3 (Equipment System):**

Equipment and gold items will render as in-world billboards when dropped on the floor, and as small icon thumbnails inside the inventory screen grid.

Recommended: **two versions per item** — a **world sprite** (128×128 transparent PNG, readable at small sizes) and an **icon sprite** (32×32 transparent PNG for the inventory grid slot).

| Key | World sprite filename | Icon filename | Description |
|-----|-----------------------|---------------|-------------|
| `dagger` | `item_dagger.png` | `icon_dagger.png` | Short blade, rusted edge — Stone depths |
| `short_sword` | `item_short_sword.png` | `icon_short_sword.png` | Single-edged blade, wrapped hilt |
| `longsword` | `item_longsword.png` | `icon_longsword.png` | Double-edged, crossguard |
| `great_blade` | `item_great_blade.png` | `icon_great_blade.png` | Wide two-handed blade, dark metal |
| `leather_armor` | `item_leather_armor.png` | `icon_leather_armor.png` | Studded chest plate |
| `chain_mail` | `item_chain_mail.png` | `icon_chain_mail.png` | Linked rings, medieval style |
| `plate_armor` | `item_plate_armor.png` | `icon_plate_armor.png` | Solid steel breastplate |
| `wooden_shield` | `item_wooden_shield.png` | `icon_wooden_shield.png` | Round wooden buckler |
| `iron_shield` | `item_iron_shield.png` | `icon_iron_shield.png` | Kite shield, iron boss |
| `gold_coin` | `item_gold_coin.png` | `icon_gold_coin.png` | Coin pile or scattered coins — auto-collected on step |

Place world sprites in `assets/items/`, icon sprites in `assets/items/icons/` (or same folder with `icon_` prefix — your call).

---

### Portal Sprites — Feature 1 (4 frames needed)

Portals appear on levels 3, 5, 7, 9, 11, 13, and 15 in dedicated 3×3 rooms. They render as **animated tall billboards** — the renderer cycles through frames based on game tick, producing a floating, pulsing effect.

**Render spec:**
- `scaleH ≈ 0.90` (90% of wall height — notably taller than enemies)
- `offY ≈ 0.06` (center slightly above mid-wall — the top floats upward)
- A soft blue glow drawn as translucent rect columns around the sprite (handled in code)

| Filename | Description |
|----------|-------------|
| `assets/world/portal_1.png` | Frame 1 — portal "closed" or dim state |
| `assets/world/portal_2.png` | Frame 2 — expanding inner glow |
| `assets/world/portal_3.png` | Frame 3 — fully bright, inner energy visible |
| `assets/world/portal_4.png` | Frame 4 — slightly contracted, flickering |

**Visual direction:** A vertically elongated floating diamond or oval gate. Electric blue-white core with a dark outer halo. Faint particle wisps at top and bottom. Style should feel ancient-magical rather than sci-fi — no clean geometry. The four frames should loop smoothly when cycled at ~4 FPS.

**Recommended size:** 128×256 px (2:1 portrait), transparent PNG. The sprite is taller than it is wide to match the `scaleH 0.90` render height.

---

### Inventory UI Assets — Feature 2

The inventory screen is drawn entirely on canvas. Most visual elements are rendered programmatically (colored rectangles, text), but slot and panel textures add tactile quality.

All optional — the UI degrades gracefully to flat colored rectangles if these are absent.

| Filename | Size | Description |
|----------|------|-------------|
| `assets/ui/slot_frame.png` | 40×40 px | Border texture for an inventory grid slot. Used for all 20 carry slots. Transparent interior so item icon shows through. Dark stone/metal frame. |
| `assets/ui/slot_selected.png` | 40×40 px | Same as above but highlighted — bright gold or white inner glow — used on the currently selected slot. |
| `assets/ui/equip_weapon.png` | 56×56 px | Silhouette background for the weapon equipment slot. Shows a faint sword-shape watermark in the slot. |
| `assets/ui/equip_armor.png` | 56×56 px | Same for armor slot — faint chest plate silhouette. |
| `assets/ui/equip_shield.png` | 56×56 px | Same for shield slot — faint round shield silhouette. |
| `assets/ui/panel_bg.png` | 640×480 px | Semi-transparent dark panel overlay for the entire inventory screen. Can be a simple vignette or textured parchment. Used at partial opacity behind all UI elements. |

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
- **Enemy sprites**: Any square PNG with transparent background. 128×128 recommended. Renderer scales to match wall projection height. Tall enemies (behemoth) use the same square frame — the scale factor is applied in code.
- **Portal sprites**: 128×256 portrait PNG. Transparent background. Four frames for animation loop.
- **Item world sprites**: 128×128 PNG with transparency. Simple, readable silhouette at small sizes.
- **Item icon sprites**: 32×32 PNG with transparency. Shown inside 40×40 slot frames in the inventory grid.
- **UI sprites**: PNG with transparency. Pixel art at game resolution (640×480) is cleanest. Slot frames at 40×40; equipment slots at 56×56.
- **Audio**: OGG Vorbis preferred for web delivery. MP3 also fine. Ambient loops should be seamlessly loopable.
- **Writing**: Plain text or markdown is fine. Can be delivered directly as copy.
