# Content & Plug-and-Play Modules (`src/content/`)

## Purpose

`src/content/` houses all swappable, declarative game content for **Uplift** so the core engine (`src/domain/`, `src/application/`) stays 100% free of hardcoded lore, characters, or rooms.

Content is organized into modular packs:
- **Eras (`eras/`)**: Historical epoch definitions (starting with Era 1: *Highglass Hold*) and `CivilizationLegacyState` mutators.
- **Characters (`characters/`)**: 3-tier NPC blueprints (Tier 1 `utility_schemer`, Tier 2 `role_routine`, Tier 3 `ambient_crowd`) with `lineageId` tags.
- **Behaviors (`behaviors/`)**: Standalone `BehaviorModule` plugins (`canExecute`, `scoreUtility`, `execute -> WorldEffect[]`).
- **World Topology (`worlds/`)**: Pure domain room/courtyard graphs (`indoor_room` and `outdoor_area`), waypoints, and acoustic falloff.
- **3D Scene Blueprints (`scene/`)**: Presentation-only 3D geometry, palettes, and lighting consumed by `src/interfaces/three/`.
- **Mechanics (`mechanics/`)**: Uplift tech seeds, Orbital Ship Mind recon tools, and suspicion/anomaly rules.

## Current Module Inventory

- `index.ts` — Public content layer barrel.
