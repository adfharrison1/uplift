# Content & Plug-and-Play Modules (`src/content/`)

## Purpose

`src/content/` houses all swappable, declarative game content for **Uplift** so the core engine (`src/domain/`, `src/application/`) stays 100% free of hardcoded lore, characters, rooms, or epoch-specific mechanics. Throughout **Uplift**, **`Epoch` and `Era` are 100% synonymous** (`Epoch 1 === Era 1`), and the campaign's Epoch ladder (`EpochProfileBlueprint[]`) is 100% data-driven and configurable.

Content is organized into modular packs:

- **3D Scene Blueprints (`scene/`)**: Presentation-only 3-Layer Encoded Visual Blueprints (`EpochVisualTheme`, `StageSceneBlueprint`, `CharacterVisualBlueprint`) consumed by `src/interfaces/three/`.
- **Epochs / Eras, Characters, Rivals, Offices, Behaviors, Worlds & Mechanics** _(Changes 05–11)_: Declarative `EpochModulePackInput` packs (`SpaceNodeBlueprint`, `PropBlueprint`, `CharacterBlueprint` with `InertiaPillar[]`, `OfficeBlueprint`, `QuietClaimBlueprint`, `RivalCivBlueprint`, `TrajectoryThreadBlueprint`, `ChannelMediumBlueprint`, `EmergencyStateBlueprint`, `OrbitalPassBlueprint`, `BehaviorModule`, `PacingProfileBlueprint`, `RomanticMotiveBlueprint`, `VehicleKindBlueprint`, `TransitRouteBlueprint`, `TravelVignetteBlueprint`, `EnRouteEncounterTable`, `TravelSurfaceCueBlueprint`, `AssassinationVectorBlueprint`, `ContingencyEventBlueprint`, and `EpochTechCeilingBlueprint`).

## Current Module Inventory

- `scene/defaultStageContent.ts` — Deeply frozen starter Epoch 1 (_Highglass Hold_) visual blueprints (`DEFAULT_HIGHGLASS_VISUAL_THEME`, `DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT`, `DEFAULT_HIGHGLASS_CHARACTER_VISUALS`).
- `worlds/starterHoldPack.ts` — Deeply frozen Epoch 1 proving pack (`STARTER_HOLD_PACK`): `space_glass_yard`, `space_player_chambers`, one open chambers door, a yard walker, and the player operative. No offices, rivals, or threads.
- `scene/starterHoldStages.ts` — Matching yard and chambers `StageSceneBlueprint`s. The chambers door is `isPortal: true`.
- `index.ts` — Public content layer barrel re-exporting starter scene blueprints and the starter hold pack.
