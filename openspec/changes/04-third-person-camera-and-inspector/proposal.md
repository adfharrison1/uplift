## Why

With the epoch-agnostic simulation backbone, continuous 60Hz kinematics, and `SimulationCoordinator` in place from Change `03-modular-registries-and-kinematics`, **Uplift** now needs its visual presentation, camera framing, and live inspection architecture before we build out full Highglass Hold outdoor/indoor steering in Change `05`. Specifically, we need:
1. A **Pure `RenderFrameBuilder`** in `src/application/rendering/` so 3rd-person fixed-orientation tracking camera math (`CameraVolumeBlueprint` with priority/tie-breaking, critically damped spring transitions, emergency/zenith tilts with `reduceMotionAndFlashing` accessibility support, and `F3` De-Anchored Free-Cam), NPC pose interpolation, and 3D-to-screen floating inspector card projections (with behind-camera `w <= 0` frustum culling) can be deterministically unit-tested in Node/Vitest without a WebGL context.
2. A **3-Layer Encoded Visual Authoring Framework** (`EpochVisualTheme` + `StageSceneBlueprint` with deterministic `semanticId` wall/alcove/prop/light addressing + `CharacterVisualBlueprint` + parametric `MotifGenerator` and `CharacterKitbashGenerator`) so all 3D stages and character silhouettes are 100% agent- and UI-editable as structured JSON/TypeScript with zero 500MB `.glb` repository bloat and open epoch-agnostic identifier schemas in `src/application/`.
3. A **60 FPS Stage-Paint Chiaroscuro Three.js Builder** (`src/interfaces/three/`) paired with an **In-Game `F3` Stage, Lighting & Wardrobe Inspector + Agent DOM Mirror** (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `globalThis.__UPLIFT_STAGE_INSPECTOR__`) and Vite Local Disk Bridge persistence (`GET`/`PUT /api/scene-blueprints/:stageId`, `GET`/`PUT /api/character-visuals/:characterId`).

All runtime and test code executes 100% locally on the target **2019 Intel Core i7 MacBook Pro (16GB RAM, 60 FPS)** with **zero external API keys, zero paid tokens, and zero cloud inference calls**.

## What Changes

- **Dependencies**:
  - Install pinned `three@0.186.1` and `@types/three@0.186.0` (matching the verified dependency manifest in `README.md` and `openspec/config.yaml`).
- **Application Layer (`src/application/rendering/`)**:
  - `SceneVisualBlueprints.ts`: Pure TypeScript + Zod v4 schemas for `EpochVisualTheme`, `StageSceneBlueprint` (compass walls `north | south | east | west`, numbered wall segments/alcoves, parametric `WallMotifInstance[]`, lights, and `CameraVolumeBlueprint[]` with `priority`), `CharacterVisualBlueprint` (posture, `spinePitchRadians`, open epoch-agnostic garment/prop slot IDs, mud/soot grime, and `droneDisguise`), `resolveCharacterVisualForTheme`, and deterministic `semanticId` helpers (`formatWallSegmentSemanticId`, `formatCharacterPartSemanticId`, `validateSemanticId`).
  - `RenderFrameBuilder.ts`: Pure, WebGL-independent `RenderFrameBuilder` computing critically damped volume-aware 3rd-person tracking camera state, dynamic emergency fog & tilt modifiers (with `reduceMotionAndFlashing` accessibility toggle), `F3` De-Anchored Free-Cam overrides (`+0.40` desaturation when paused), entity render poses, projected NDC coordinates (`w <= 0` behind-camera guarded) for floating `DebugInspectorCard`s, and the `AgentDomMirrorState` snapshot.
- **Interfaces & Content Layers (`src/interfaces/three/`, `src/interfaces/hud/`, `src/interfaces/vite/`, `src/content/scene/`)**:
  - `src/interfaces/three/StageKitbashBuilders.ts` & `ChiaroscuroStageRenderer.ts`: Shared 3-band stepped chiaroscuro toon `DataTexture` ramp (`#1a1f28` shadow tint, `-30%` desaturated palettes, warm `#c4a574` torch pools, exponential distance fog, alpha-cone god-rays), parametric architectural motif builders (`ossuary_skull_niche`, `lancet_window`, `buttress_rib`, `fulgurite_lens_sconce`, `guild_anvil_rack`, `torch_sconce` plus extensible fallback geometry), low-poly character posture/wardrobe kitbash builder, `userData.semanticId` tagging on every generated mesh, raycast target resolver, and deterministic GPU resource disposal (`disposeSceneGraph`, preserving the shared singleton toon ramp texture unless explicitly requested).
  - `src/interfaces/hud/StageInspectorDomMirror.ts`: Synchronizes `AgentDomMirrorState` onto DOM attributes (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`) and a semantic inspector node list, maintains `globalThis.__UPLIFT_STAGE_INSPECTOR__`, and applies live `F3` Stage/Wardrobe Lab edits to wall motifs, lights, fog, camera volumes, and character visuals.
  - `src/interfaces/vite/localDiskBridgePlugin.ts`: Adds `GET`/`PUT /api/scene-blueprints/:stageId` and `GET`/`PUT /api/character-visuals/:characterId` with strict path-traversal rejection, `256 KiB` payload caps, atomic temp-file-and-rename writes, and Zod schema validation.
  - `src/content/scene/defaultStageContent.ts`: Declarative starter `EpochVisualTheme`, `StageSceneBlueprint`, and `CharacterVisualBlueprint` definitions re-exported from `src/content/index.ts`.

## Capabilities

### New Capabilities
- `encoded-visual-framework-and-render-frame`: Zod-validated 3-Layer Encoded Visual Blueprints (`EpochVisualTheme`, `StageSceneBlueprint`, `CameraVolumeBlueprint`, `CharacterVisualBlueprint`), deterministic `semanticId` addressing, and pure WebGL-independent `RenderFrameBuilder` with critically damped tracking camera, de-anchored free-cam, accessibility motion clamp, and 3D-to-NDC floating inspector card projection.
- `chiaroscuro-stage-and-kitbash-renderer`: Three.js 60 FPS stage-paint chiaroscuro scene graph builder, shared 3-band toon ramp, parametric wall motif & character wardrobe kitbashers with `userData.semanticId` tagging, raycast semantic target lookup, and leak-free GPU resource disposal.
- `stage-inspector-lab-and-dom-mirror`: In-Game `F3` Stage/Wardrobe/Lighting Inspector controller, Agent DOM Mirror (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `globalThis.__UPLIFT_STAGE_INSPECTOR__`), and Vite Local Disk Bridge endpoints (`/api/scene-blueprints/:stageId`, `/api/character-visuals/:characterId`).

### Modified Capabilities
- None.

## Non-Goals

- Full Highglass Hold multi-room outdoor/indoor NPC crowd steering, portal door traversal, and 2D spatial hash grid collision avoidance (deferred to Change `05-live-npc-steering-and-world-stage`).
- Procedural Web Audio synthesis and the `F3` Sound Lab Backdoor UI (deferred to Change `05a-acoustics-and-procedural-web-audio`).
- Diegetic parchment broadsheet / neural lace HUD panels, Utility AI goal scoring, rival operative turns, and the Wider World Overview HUD (deferred to Changes `06`–`07`).
- Leaking any 3D mesh, Three.js type, or `StageSceneBlueprint` schema into `src/domain/`.

## Dependencies

- Depends on `01-clean-scaffold-and-verify`, `01a-eslint-prettier-and-hooks`, `02-telemetry-saves-and-debug-skill`, and `03-modular-registries-and-kinematics`.
- Plugs into `WorldState` and `SimulationCoordinator` from Change `03` without modifying core domain simulation loop code or introducing era-specific hardcoding into `src/domain/` or `src/application/`.
