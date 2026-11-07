# Interfaces & Composition Layer (`src/interfaces/`)

## Purpose

`src/interfaces/` is the outer presentation, CLI, local dev middleware, and dependency-wiring shell of **Uplift**:

- **`cli/queryLogs.ts`**: Command-line utility (`npm run logs:query`) for filtering active and compacted session logs by `--level`, `--category`, `--actor`, `--actee`, `--action`, `--min-tick`, `--max-tick`, and `--has-ai-reasoning`.
- **`vite/localDiskBridgePlugin.ts`**: Vite dev-server middleware mounting `/api/telemetry/*`, `/api/saves/*`, `/api/scene-blueprints/:stageId`, and `/api/character-visuals/:characterId` with a `256 KiB` body cap (`413`), path-traversal rejection, atomic temp-file-and-rename writes, and Zod `safeParse` validation (`400`).
- **`three/`**: Three.js 60 FPS WebGL stage-paint chiaroscuro scene graph & parametric kitbash builders (`StageKitbashBuilders.ts`, `ChiaroscuroStageRenderer.ts`), featuring a shared 3-band stepped toon gradient `DataTexture`, parametric architectural motifs, character posture/wardrobe kitbashers, `userData.semanticId` tagging, raycast lookup, and `disposeSceneGraph`.
- **`hud/`**: In-Game `F3` Stage, Lighting & Wardrobe Inspector controller and Agent DOM Mirror (`StageInspectorDomMirror.ts`) synchronizing `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`, and `globalThis.__UPLIFT_STAGE_INSPECTOR__`, plus pure live blueprint mutators.
- **`composition/`** _(Change 05+)_: Manual dependency injection root wiring content packs, domain registries, telemetry loggers, save/load repositories, and application use cases.

## Current Module Inventory

- `cli/queryLogs.ts` — `parseQueryCliArgs` and `executeLogQuery` CLI runner.
- `vite/localDiskBridgePlugin.ts` — `handleLocalDiskBridgeRequest`, `isBridgeApiUrl`, and `localDiskBridgePlugin`.
- `three/StageKitbashBuilders.ts` — `getSharedChiaroscuroGradientMap`, `createChiaroscuroToonMaterial`, `buildWallMotifGroup`, `buildStagePropGroup`, `buildCharacterKitbashGroup`, and re-exported visual blueprint types/schemas for `src/content/scene/`.
- `three/ChiaroscuroStageRenderer.ts` — `buildStageSceneGraph`, `applyRenderFrameToScene`, `resolveSemanticIdFromObject`, `findObjectBySemanticId`, and `disposeSceneGraph`.
- `hud/StageInspectorDomMirror.ts` — `StageInspectorDomMirror`, `InMemoryDomAttributeSink`, `buildInspectableTargetCatalog`, `upsertWallSegmentMotif`, `removeWallSegmentMotif`, `updateStageLight`, `updateCameraVolumeFraming`, `updateEpochVisualTheme`, and `updateCharacterVisualSlot`.
- `index.ts` — Public interfaces layer barrel.
