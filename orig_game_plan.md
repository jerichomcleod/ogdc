# Rough Draft Game Concept

## Working Title

**Wake in the Depths**

## Core Premise

Beneath a ruined city is a shifting labyrinth called the **Wake**. Long ago, it was built to seal away an entity that distorts memory, space, and identity. The seal is weakening. Strange relics are surfacing, people near the ruins are losing fragments of memory, and entire districts are becoming unstable.

The player is a **Delver**, one of the few people capable of entering the Wake and returning intact. The immediate goal is to descend, recover key relics, and restore stabilizing anchors before the dungeon fully opens. The deeper motivation is that the player has a personal connection to the labyrinth: someone they knew vanished in the lower levels, and traces of them appear in the architecture, enemy behavior, and relic descriptions.

That gives the dungeon crawl a reason beyond “get treasure”:

* restore surface stability
* uncover what happened below
* decide whether to reseal, control, or destroy the Wake

## Tone

Dark fantasy with some ancient machinery and subtle reality distortion. Not horror, but tense and oppressive.

## Narrative premise resolution

The Wake is an ancient stabilizing engine built by a lost civilization to prevent the collapse of reality around a singularity-like anomaly called the Extant Core.

The Core is not an entity in the conventional sense. It is a memory gravity well—a place where identities, events, and histories collapse into one another.

Long ago the civilization built the Wake to:

- isolate the Core
- regulate its distortions
- use Delvers as stabilizing anchors

The seal has been failing for centuries.

Recent excavations accidentally destabilized the machinery, causing the Wake to surface into the city's foundations.

The Wake requires a living consciousness to stabilize the Core. Previous delvers became anchors. The lost person the player searches for is now part of the system.

The final choice becomes moral:

- replace them as the anchor & reseal the Wake: city survives, rescue is successful
- reseal the wake without replacing them: city survives, but the person is not rescued
- destroy the system: city is destroyed, rescue unsuccessful 


---

# Gameplay Draft

## Core Loop

The loop should be tight and repeatable:

1. Enter dungeon from a safe hub
2. Explore a maze-like 3D floor
3. Fight enemies and manage resources
4. Find keys, mechanisms, and shortcuts
5. Recover relics / activate anchors / defeat a floor guardian
6. Extract or descend deeper
7. Return to hub with loot, upgrades, and story fragments

A run should create meaningful tension:

* stay longer for more rewards
* leave early to bank progress
* risk death and partial loss

## Player Goals Per Run

Each floor should contain a combination of:

* **Main objective**: recover relic, activate seal node, kill guardian, find map core
* **Sub-objectives**: rescue trapped NPC, retrieve rare crafting material, find hidden vault
* **Exit condition**: unlock stairwell or open sealed gate

## Movement and Perspective

For a browser-based 3D dungeon crawler, simplest viable option:

* first-person movement for immersion and tension.
* maze-like corridors, rooms, hidden doors, locked gates
* sprint, dodge, interact, light attack, heavy attack, block or parry, use item (attacks can be melee or magic)

---

# Interesting Complexity Without Overbuilding

## 1. Layered Dungeon Structure

Levels should not just be random corridors. Use a repeated structure:

* **Entrance zone**: low threat, establishes floor theme
* **Traversal zone**: branching corridors, traps, locked sections
* **Pressure zone**: stronger enemies, resource drain, navigation confusion
* **Objective zone**: relic chamber / anchor room / miniboss arena
* **Escape route**: shortcut or dangerous exit run

Each floor has:

* one critical path
* optional side branches
* at least one secret path
* at least one unlockable shortcut that stays open for that run

## 2. Resource Tension

The player manages:

* health - when 0, the player dies and awakens in town. This costs resources and clears progress on the current level. 
* stamina - for sprinting and combat
* mana - optional, for spells
* [future feature?] light or focus meter
* consumables
* inventory slots

A simple but useful system:

* [future feature?] darkness or corruption increases disorientation
* carrying relics increases danger or enemy aggression
* healing is limited, so positioning matters

## 3. Combat Simplicity With Depth

Keep the mechanics simple enough for browser play:

* quick attack
* heavy attack
* block
* dodge
* one active ability
* one utility slot

Depth comes from enemy patterns, space control, and resource pressure instead of giant combo systems.

Play styles include melee, ranged, and spell-caster

## 4. Light and Awareness Mechanic [FUTURE FEATURE]

A core mechanic that makes dungeon crawling more distinct:

The player carries a **lantern/focus device** with two modes:

* **Exploration mode**: broader light, better navigation
* **Revelation mode**: reveals hidden runes, fake walls, enemy weak points, but drains energy

This creates meaningful decisions:

* use energy to solve navigation and find secrets
* save energy for elite fights or boss mechanics

## 5. Maze Pressure Mechanic

To keep the dungeon from feeling static:

* the dungeon slowly becomes more hostile the longer you stay
* examples:

  * enemies respawn more aggressively
  * some corridors shift or lock
  * map reliability degrades

This prevents passive full-clear play and forces route decisions.

## 6. Relics With Tradeoffs

Relics are not just stat sticks. They should alter play in mixed ways.

Examples:

* **Torch of the Hollow Saint**: reveals traps, but increases enemy spawns
* **Stone Sigil**: higher defense, lower movement speed
* **Blood Thread Charm**: heal on kill, but max health reduced
* **Cartographer’s Eye**: partial map reveal, but hidden enemies detect you sooner

This adds build variety without requiring huge class complexity.

---

# Story / Plot Structure

## Setup

The city’s understructure is destabilizing. Sinkholes, disappearances, and memory distortions are spreading. Scholars and clergy claim the seal below is failing. Salvagers want the relics. Fanatics want the entity released.

The player is recruited or compelled to enter because:

* they are one of the few resistant to the Wake’s corruption
* they need money, status, or medicine from the guild
* they are searching for a missing sibling / mentor / expedition leader
* they begin finding evidence that they themselves may have been inside before

## Midgame

The player learns:

* the labyrinth is not purely a prison; it may be a machine
* the “entity” may be partly a person, god, or collective memory
* previous Delvers were used as living components in the seal
* the surface factions are lying about the purpose of the ruins

## Endgame Choice

At sufficient depth, the player chooses:

* **Reseal the Wake**: safer city, truth buried
* **Bind the Wake**: player gains control but risks corruption
* **Break the seal**: new world state, harder postgame, altered ending

That is enough narrative structure for a dungeon crawler without requiring huge cutscene overhead.

---

# Dungeon Content

## Enemy Types

Use a small set of readable archetypes.

### Basic Enemies

* **Skulks**: fast melee ambushers
* **Wardens**: shielded defenders that control chokepoints
* **Murmur Priests**: ranged debuff/support casters
* **Burrowers**: emerge from walls/floors in certain rooms
* **Sentinel Constructs**: slow, durable, pattern-based mechanical enemies

### Elite Variants

* enraged brute that breaks cover
* mimic-object enemy hiding as altar/chest/statue

### Bosses / Guardians

Each floor or region can end with a strong thematic encounter:

* giant blind jailer that hunts by sound
* mirror knight that copies your attacks with delay
* rooted oracle that summons geometry-changing hazards
* mechanical saint that rotates the room layout mid-fight

## Trap Types

* spike corridors
* pressure plates
* dart launchers
* cursed chests
* false exits
* rooms that lock until enemies die

## Puzzle / Navigation Elements

Simple but effective:

* rotate bridges
* pressure switches in separated rooms
* rune sequences found in environmental clues
* power routing via ancient machinery
* illusion walls visible only with lantern mode
* one-way gates that require shortcut unlocks

---

# Progression

## Persistent Progression

Since this is client-only, keep progression compact and understandable.

Persistent categories:

* discovered relics
* unlocked classes or starting kits
* town upgrades
* permanent crafting recipes
* lore entries
* best depth reached
* seeded challenge modes

## Run-Based Progression

Things that reset each run:

* current inventory
* health/resources
* temporary buffs/debuffs
* floor-specific shortcuts
* run-specific relic loadout

## Character Build Options

Do not make a giant class system. Use 3–4 starting archetypes.

### Example Archetypes

* **Vanguard**: durable melee, shield tools
* **Seeker**: fast movement, trap detection, precision damage
* **Cantor**: weak weapon damage but strong relic/channeling abilities
* **Breaker**: slow but can smash weak walls and stagger elites

Classes can mainly define:

* starting gear
* base stats
* unique skill
* interaction with relic systems

---

# Hub / Safe Zone

The hub is important because it breaks up dungeon pressure and gives long-term meaning.

Possible hub functions:

* vendor
* blacksmith / relic tuner
* archive for discovered lore
* mission board for optional objectives
* memorial wall listing failed runs / previous Delvers
* map room showing major depth milestones

This also gives a natural place for local save/load and export/import.

---

# Browser-Based Technical Architecture

## Core Constraint

No server. Everything is local.

That means:

* no central accounts
* no server sync
* no multiplayer authority
* no server-side anti-cheat
* no remote persistence

All state is stored locally on the player’s machine.

## Recommended Stack

A reasonable stack for a browser-based 3D game:

* **Rendering / 3D engine**: Three.js or Babylon.js
* **Language**: TypeScript
* **Bundler**: Vite
* **UI**: HTML/CSS + lightweight UI layer, or React if you want more structured menus
* **Persistence**: localStorage for small settings, IndexedDB for game saves
* **Audio**: Web Audio API or engine-integrated audio
* **Packaging**: static files deployable to any simple host or local file server

For a more game-oriented workflow, **Babylon.js** is a strong choice for browser 3D.
For more flexibility and ecosystem familiarity, **Three.js** is fine.
For a rough draft, either works. Babylon.js is arguably cleaner for game-like scenes.

---

# Data Storage Model

## What Should Be Stored Locally

Store only on the user’s machine:

* profile metadata
* settings
* keybindings
* save slots
* run history
* unlocked content
* screenshots or replay metadata if desired

## Storage Split

Use:

* **localStorage** for tiny config data

  * volume
  * graphics settings
  * keybindings
  * last selected save slot
* **IndexedDB** for actual save files

  * profiles
  * run state
  * progression
  * dungeon seeds
  * inventory/state snapshots

Why:

* localStorage is simple but small and synchronous
* IndexedDB is better for structured save data and multiple save slots

## Backup / Restore

Allow explicit export/import of save data.

### Export

User clicks **Export Save**

* serialize profile/save data to JSON
* optionally compress it
* download as `.json` or custom extension like `.depthwake-save`

### Import

User clicks **Import Save**

* choose exported file
* validate schema/version
* replace or merge with local save

This solves the cache-clearing problem because the player can manually back up saves.

---

# Suggested Save Schema

A simple shape:

```json
{
  "version": 1,
  "profile": {
    "name": "Player1",
    "createdAt": "2026-03-09T12:00:00Z",
    "lastPlayedAt": "2026-03-09T18:00:00Z"
  },
  "settings": {
    "audio": 0.8,
    "mouseSensitivity": 1.1,
    "graphics": "medium"
  },
  "progression": {
    "maxDepth": 7,
    "unlockedClasses": ["Vanguard", "Seeker"],
    "relicCodex": ["torch_hollow_saint", "stone_sigil"],
    "hubUpgrades": {
      "smith": 2,
      "archive": 1
    }
  },
  "currentRun": {
    "seed": 1837462,
    "floor": 3,
    "hp": 41,
    "stamina": 73,
    "inventory": [
      {"id": "potion_small", "qty": 2},
      {"id": "stone_sigil", "qty": 1}
    ],
    "position": {"x": 12.4, "y": 0, "z": -33.8},
    "flags": {
      "bossDoorUnlocked": true,
      "shortcutAOpen": false
    }
  }
}
```

Need:

* schema versioning
* validation on load
* migration support for future versions

---

# High-Level Code Architecture

## Main Modules

### 1. Engine Layer

Handles low-level runtime systems.

* render loop
* scene management
* input handling
* audio
* collision
* timing
* camera

### 2. Game State Layer

Central source of truth for current game state.

* player state
* dungeon state
* combat state
* inventory
* progression
* save/load serialization

### 3. Content Layer

Data-driven definitions.

* items
* enemies
* rooms
* traps
* relics
* dialogue
* quests
* level themes

Prefer JSON or TypeScript config objects for content.

### 4. Systems Layer

Implements game rules.

* combat system
* AI system
* loot system
* procedural generation
* interaction system
* quest/objective system
* corruption/light system

### 5. Persistence Layer

Handles:

* save to IndexedDB
* load from IndexedDB
* export to downloadable file
* import from uploaded file
* schema migration

### 6. UI Layer

Menus and overlays:

* title screen
* save slot selection
* HUD
* inventory
* map
* settings
* export/import UI
* death/results screen

---

# Example Folder Structure

```txt
/src
  /engine
    gameLoop.ts
    input.ts
    audio.ts
    sceneManager.ts
    collision.ts
    camera.ts

  /game
    gameState.ts
    gameController.ts
    constants.ts

  /systems
    combatSystem.ts
    enemyAISystem.ts
    interactionSystem.ts
    lootSystem.ts
    dungeonGenSystem.ts
    saveSystem.ts
    corruptionSystem.ts

  /entities
    player.ts
    enemy.ts
    projectile.ts
    trap.ts
    interactable.ts

  /content
    items.ts
    relics.ts
    enemies.ts
    rooms.ts
    levels.ts
    dialogue.ts

  /ui
    hud.ts
    inventoryMenu.ts
    titleMenu.ts
    settingsMenu.ts
    saveMenu.ts

  /persistence
    indexedDbStore.ts
    exportImport.ts
    saveMigrations.ts
    schemas.ts

  /utils
    random.ts
    math.ts
    events.ts
    logger.ts

  main.ts
```

---

# Runtime Flow

## On Game Start

1. load settings from localStorage
2. load save profiles from IndexedDB
3. show title/save selection UI
4. start or resume run

## During Play

* game loop updates scene and systems
* periodic autosave to IndexedDB
* manual save at hub or safe points
* state changes go through central game state store

## On Export

1. gather profile + progression + current run state
2. validate structure
3. serialize to JSON
4. trigger browser download

## On Import

1. read file from user
2. parse JSON
3. validate version/schema
4. migrate if necessary
5. write to IndexedDB
6. refresh save menu

---

# Procedural Generation Approach

For maze-like levels, keep generation controlled rather than fully random chaos.

## Simple Hybrid Model

Use:

* handcrafted room templates
* procedural corridor connections
* seeded placement of objectives, enemies, locks, and secrets

That gives:

* replayability
* coherent spaces
* fewer broken layouts than full procedural generation

## Recommended Floor Generation Steps

1. choose floor theme
2. choose set of room templates
3. build connectivity graph
4. generate corridor layout
5. place objective room far enough from spawn
6. place locked side areas and shortcut loops
7. spawn enemies/traps by zone difficulty
8. validate solvability
9. store generation seed in run state

This is much more practical than generating arbitrary 3D architecture from scratch.

---

# Offline Data / Privacy Model

Since you specifically want **no server-side connection** and local-only user info:

## Rules

* no login
* no telemetry by default
* no remote analytics required for core play
* all saves remain in browser storage unless user exports
* any backup file is generated locally and downloaded directly

## Caveats

You cannot guarantee persistence if:

* browser storage is cleared
* the user switches devices
* private browsing is used
* storage gets corrupted

So the game should explicitly warn:

* “Your save is stored only on this device/browser.”
* “Export a backup file if you want a durable copy.”

That is the correct architecture for client-only persistence.

---

# Minimal Feature Set for a First Playable Version

## Vertical Slice

A good first playable target:

* one hub area
* one dungeon theme
* 3 floor layouts
* 3 enemy types
* 1 miniboss
* melee combat
* lantern mechanic
* inventory and healing items
* local save/load
* export/import save
* simple ending after retrieving one major relic

That is enough to prove the core loop.

## Phase 2

Then add:

* more floor themes
* more relics
* alternate classes
* boss fights
* persistent hub upgrades
* branching endings
* daily seeded challenge mode

---

# What Makes This Interesting

The main things that keep it from becoming generic:

* tension from **stay deeper vs extract now**
* **relic tradeoffs** instead of pure upgrades
* **maze pressure escalation**
* narrative built around memory distortion and a living labyrinth
* offline-first architecture with exportable save files

Without those, it risks becoming just “walk maze, hit enemies, collect keys.”

---

# Recommended Practical Build Decisions

If the goal is to actually make this, not just theorize:

* Use **TypeScript**
* Use **Babylon.js** or **Three.js**
* Use **IndexedDB** for saves
* Use **JSON export/import** for backups
* Keep combat intentionally simple
* Use **room-template procedural generation**, not full freeform generation
* Build first-person before attempting ambitious third-person animation systems
