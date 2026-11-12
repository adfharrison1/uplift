# Content & Plug-and-Play Modules (`src/content/`)

## Purpose

`src/content/` houses all swappable, declarative game content for **Uplift** so the core engine (`src/domain/`, `src/application/`) stays 100% free of hardcoded lore, characters, rooms, or epoch-specific mechanics. Throughout **Uplift**, **`Epoch` and `Era` are 100% synonymous** (`Epoch 1 === Era 1`), and the configurable campaign ladder remains [design intent](../../DESIGN_NOTES.md); its blueprint contract is not shipped.

Content is organized into modular packs with a required `packId`, positive `packVersion` and explicit versioned import list. The first pack establishes the registry's primary identity; a cameo pack must be declared by that primary pack and target the same registry epoch. Registry acceptance of offices, rivals, threads and other kinds does not imply authored content or active gameplay consumers for them:

- **3D Scene Blueprints (`scene/`)**: Presentation-only 3-Layer Encoded Visual Blueprints (`EpochVisualTheme`, `StageSceneBlueprint`, `CharacterVisualBlueprint`) consumed by `src/interfaces/three/`.
- **Epochs / Eras, Characters, Rivals, Offices, Behaviors, Worlds & Mechanics**: Declarative `EpochModulePackInput` packs (`SpaceNodeBlueprint`, `PropBlueprint`, `CharacterBlueprint` with `InertiaPillar[]`, `OfficeBlueprint`, `QuietClaimBlueprint`, `RivalCivBlueprint`, `TrajectoryThreadBlueprint`, `ChannelMediumBlueprint`, `EmergencyStateBlueprint`, `OrbitalPassBlueprint`, and `BehaviorModule`).

## Current Module Inventory

- `scene/defaultStageContent.ts` — Deeply frozen starter Epoch 1 (_Highglass Hold_) visual blueprints (`DEFAULT_HIGHGLASS_VISUAL_THEME`, `DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT`, `DEFAULT_HIGHGLASS_CHARACTER_VISUALS`).
- `worlds/starterHoldPack.ts` — Deeply frozen Epoch 1 proving pack (`STARTER_HOLD_PACK`, `packId: starter_hold`, version 1, no imports): `space_glass_yard`, `space_player_chambers`, one open chambers door, `char_yard_walker`, and `char_player_operative`. No offices, rivals, or threads.
- `scene/starterHoldCharacterVisuals.ts` — Deeply frozen `STARTER_HOLD_CHARACTER_VISUALS`. `char_player_operative` uses `lineage_player_operative`, a measured gait, and a ledger. `char_yard_walker` uses `lineage_yard_walker`, a brisk gait, and a muddier body. Each `characterId` matches a character in `STARTER_HOLD_PACK`.
- `scene/starterHoldStages.ts` — `STARTER_HOLD_YARD_STAGE` (`stage_glass_yard`), `STARTER_HOLD_CHAMBERS_STAGE` (`stage_player_chambers`), and `STARTER_HOLD_STAGE_DIRECTORY`. The directory is keyed by those two `spaceId`s and its values are the same stage objects. Both stages use a 12 m by 10 m footprint. Prop positions are world coordinates, the same frame as the pack waypoints. The yard stage marks `prop_chambers_door` with `isPortal: true`. The chambers stage has no props.
- `index.ts` — Public content layer barrel re-exporting the default scene blueprints, `STARTER_HOLD_PACK`, `STARTER_HOLD_STAGE_DIRECTORY`, and `STARTER_HOLD_CHARACTER_VISUALS`. The proving-slice launch passes that directory, those visuals, and `DEFAULT_HIGHGLASS_VISUAL_THEME` to `PlaySession`. This layer does not import the session.
