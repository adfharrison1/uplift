# Content & Plug-and-Play Modules (`src/content/`)

## Purpose

`src/content/` houses all swappable, declarative game content for **Uplift** so the core engine (`src/domain/`, `src/application/`) stays 100% free of hardcoded lore, characters, rooms, or era-specific mechanics. Every module and sub-type can be added, removed, or updated independently.

Content is organized into modular packs:

- **Eras (`eras/`)**: Historical epoch definitions (starting with Era 1: _Highglass Hold_) and `CivilizationLegacyState` mutators.
- **Characters & Personas (`characters/`)**: 3-tier NPC blueprints (Tier 1 `utility_schemer`, Tier 2 `role_routine`, Tier 3 `ambient_crowd`) with `lineageId`, distinct attitude/individuality, `inertia` weighting, plus Sassy Ship Mind and Prim Drone voice profiles.
- **Rival Spacefaring Operatives (`rivals/`)**: Competing off-world operatives with alien doctrines whose actions propagate across the wider and local world.
- **Roles & Economy (`roles/`)**: Player roles, advancement paths, physical Chambers/Office definitions, and legitimate vs. orbital-inserted illegitimate fund rules.
- **Behaviors (`behaviors/`)**: Standalone `BehaviorModule` plugins (`canExecute`, `scoreUtility`, `execute -> WorldEffect[]`).
- **World Topology & Wider World (`worlds/`)**: Local indoor rooms (`indoor_room`), outdoor free-roam spaces (`outdoor_area`), waypoints, and off-stage wider-world regions/correspondence targets.
- **3D Scene Blueprints (`scene/`)**: Presentation-only 3-Layer Encoded Visual Blueprints (`EpochVisualTheme`, `StageSceneBlueprint`, `CharacterVisualBlueprint`) consumed by `src/interfaces/three/`.
- **Mechanics, Crises & Orbital Abilities (`mechanics/`)**: Uplift tech seeds, slow-burn butterfly threads, martyrdom/succession rules, wars/plagues/crises, emergency states, orbital pass windows, and localized weather modification.

## Current Module Inventory

- `scene/defaultStageContent.ts` — Deeply frozen starter Highglass Hold visual blueprints (`DEFAULT_HIGHGLASS_VISUAL_THEME`, `DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT`, `DEFAULT_HIGHGLASS_CHARACTER_VISUALS`).
- `index.ts` — Public content layer barrel re-exporting starter scene blueprints.
