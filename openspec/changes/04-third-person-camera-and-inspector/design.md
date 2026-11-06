## Context

See `proposal.md` for motivation. Change `04-third-person-camera-and-inspector` introduces the 3-Layer Encoded Visual Authoring Framework, the pure `RenderFrameBuilder` (with volume-aware 3rd-person tracking camera, accessibility motion clamps, and `F3` De-Anchored Free-Cam), the Three.js 60 FPS stage-paint chiaroscuro scene graph & kitbash builders, the `F3` Stage/Wardrobe/Lighting Inspector + Agent DOM Mirror, and Vite Local Disk Bridge persistence for visual blueprints.

## Goals / Non-Goals

**Goals:**
- Keep 100% of camera spring math, frustum/NDC projection (`w <= 0` behind-camera guarded), inspector card layout, and 3-layer blueprint validation in pure TypeScript (`src/application/rendering/`) with zero `three` or DOM dependencies so unit tests execute in milliseconds in Node/Vitest.
- Keep `src/application/rendering/SceneVisualBlueprints.ts` epoch-agnostic by validating open identifier strings (`^[a-z0-9][a-z0-9_-]{0,63}$`) for motif and garment/prop slots, while providing concrete Era 1 parametric builders (plus a deterministic fallback geometry) in `src/interfaces/three/StageKitbashBuilders.ts`.
- Build Three.js scene graphs (`src/interfaces/three/`) with shared stepped 3-band toon/chiaroscuro materials (`#1a1f28` shadows, `-30%` desaturated palettes, `#c4a574` torch pools, exponential fog, god-ray cones), parametric architectural motifs, and low-poly character posture/wardrobe kitbashers where every generated `Object3D`/`Mesh` carries a deterministic `userData.semanticId`.
- Provide an Agent DOM Mirror (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `globalThis.__UPLIFT_STAGE_INSPECTOR__`) and live `F3` Stage/Wardrobe Lab mutators backed by `GET`/`PUT /api/scene-blueprints/:stageId` and `GET`/`PUT /api/character-visuals/:characterId`.

**Non-Goals:**
- Importing `three` or any 3D blueprint into `src/domain/`.
- Requiring a headless browser or GPU context to run `npm run verify`.
- Full multi-room NPC steering, portal door traversal, procedural Web Audio synthesis, or diegetic parchment/lace HUD panels (deferred to Changes `05`, `05a`, and `06`–`07`).

## Decisions

### 1. 3-Layer Encoded Visual Blueprints & Deterministic `semanticId`s (`src/application/rendering/SceneVisualBlueprints.ts`)

- **Layer 1 — `EpochVisualTheme`**:
  - `id`, `epochId`, `name`, `stoneColorHex`, `mudColorHex`, `ironColorHex`, `woodColorHex`, `shadowTintHex` (default `'#1a1f28'`), `torchWarmHex` (default `'#c4a574'`), `ambientIntensity` (default `0.35`), `keyLightDirection` (non-zero 3D vector, default `[-0.5, -1.0, -0.4]`), `keyLightIntensity` (default `1.1`), `desaturationFactor` (`0..1`, default `0.30`), `grimeIntensity` (`0..1`, default `0.35`), `fogDensity` (`>= 0`, default `0.025`), `fogColorHex` (default `'#1a1f28'`).
- **Layer 2 — `StageSceneBlueprint`, `StagePropVisualBlueprint` & `CameraVolumeBlueprint`**:
  - Note: `StageSceneBlueprint` is the concrete implementation of the 3D scene blueprint referred to as `WorldSceneBlueprint` in `openspec/config.yaml`.
  - Defines `stageId`, `spaceId`, `themeId`, `footprint`: `{ widthMeters, depthMeters, heightMeters }`, `floorSemanticId`, `wallSegments`: ordered `WallSegmentBlueprint[]` (`segmentId`: e.g. `'seg_01'`, `'arch_01'`, `compass`: `'north' | 'south' | 'east' | 'west'`, `zone`: `'wall' | 'alcove'`, `semanticId`: `<spaceId>.<zone>.<compass>.<segmentId>`, `widthMeters`, `heightMeters`, `thicknessMeters` default `0.4`, `recessMeters` default `0`, `offsetAlongWallMeters`, `motifs`: `WallMotifInstance[]` with `id`, `count`, `recessDepth`, `scale`, `offsetX`, `offsetY`, `spacingMeters` default `0.5`, `columns` default `6`), `props`: `StagePropVisualBlueprint[]` (`propId`, `semanticId`: `<spaceId>.prop.<propId>`, `kitbashId`, `position`, `yawRadians`, `scale`, `surfaceMaterial`, `isPortal`), `lights`: `StageLightBlueprint[]` (`id`, `semanticId`: `<spaceId>.light.<id>`, `position`, `colorHex`, `intensity`, `falloffDistance`, `hasGodRayCone`), and `cameraVolumes`: `CameraVolumeBlueprint[]` (`id`, `spaceId`, `priority` default `0`, `boundsMin`, `boundsMax`, `offset`, `pitchDegrees`, `yawDegrees`, `fovDegrees`, `springStiffness`).
- **Layer 3 Contract — `CharacterVisualBlueprint` & `resolveCharacterVisualForTheme`**:
  - `characterId`, `lineageId`, `heightScale` (`0.5..2.0`), `shoulderWidth` (`0.3..1.5`), `spinePitchRadians` (`-0.8..0.8`), `gaitStyle` (`'upright' | 'stooped' | 'measured' | 'brisk'`), open-identifier slots `headgear`, `cloak`, `heldPropLeft`, `heldPropRight`, `primaryColorHex`, `accentColorHex`, `mudLevel` (`0..1`), `sootLevel` (`0..1`), and optional `droneDisguise`.
  - `resolveCharacterVisualForTheme(visualsByLineageOrId, target, theme, options)` matches by `lineageId` first, preserving posture and garment/prop slots across epochs while optionally rebinding `primaryColorHex` (`stoneColorHex`) and `accentColorHex` (`ironColorHex`) to `theme`.

### 2. Pure `RenderFrameBuilder` & Critically Damped Tracking Camera (`src/application/rendering/RenderFrameBuilder.ts`)

- **Volume-Aware Tracking Camera & Priority Resolution**:
  - Selects all `CameraVolumeBlueprint` entries in `stage.cameraVolumes` whose AABB (`boundsMin..boundsMax`) contains the tracked focus position, sorting candidates by descending `priority`, then ascending AABB volume (`dx * dy * dz`), then declaration order (falling back to the first volume for `activeSpaceId`).
  - Smooths camera position, look-at target, pitch, yaw, and FOV using critically damped spring integration (`stepCriticallyDampedSpring(current, velocity, target, omega, dtSeconds)`), clamping `dtSeconds` to `[0, 0.25]` so background tab spikes never overshoot or produce `NaN`.
  - Applies deterministic atmospheric camera modifiers when `reduceMotionAndFlashing === false`: `+1.5°` roll, `-2.0°` pitch, and `1.35x` fog density during an active `EmergencyState`, and `-1.5°` pitch lift during orbital `zenith` with `activeBurn: true`. When `reduceMotionAndFlashing === true`, tilts are `0°` and god-ray cones are suppressed.
  - When `debugMode === true` and `cameraDeAnchored === true`, switches to `cameraMode: 'debug_free_cam'`, applies `freeCamOffset`, and sets `effectiveDesaturation = Math.min(1, theme.desaturationFactor + 0.40)`.
- **Pure 3D-to-NDC Projection (`w <= 1e-5` Guarded) & Floating Inspector Cards**:
  - Computes perspective view-projection transformation in pure TypeScript (`projectWorldToNdc`). If `clipW <= 1e-5` (behind camera) or NDC coordinates fall outside `[-1, 1]`, marks `visibleInFrustum: false` and clamps safe coordinates so behind-camera entities never invert onto the screen.

### 3. Three.js Stage-Paint Chiaroscuro & Kitbash Builders (`src/interfaces/three/`)

- **`StageKitbashBuilders.ts` & `ChiaroscuroStageRenderer.ts`** (consolidated into two cohesive modules under `src/interfaces/three/` to respect atomic task file caps):
  - Generates a shared singleton 3-band stepped chiaroscuro `THREE.DataTexture` (`NearestFilter`) for `THREE.MeshToonMaterial` with `#1a1f28` shadow tint and desaturated theme colors.
  - Builds procedural `THREE.Object3D` meshes for all 6 canonical motif types (`ossuary_skull_niche`, `lancet_window`, `buttress_rib`, `fulgurite_lens_sconce`, `guild_anvil_rack`, `torch_sconce`) plus a fallback procedural relief mesh for custom motif IDs, and modular character kitbash groups (`torso`, `head`, `headgear`, `cloak`, `heldPropLeft`, `heldPropRight`, `droneDisguise`), setting `userData.semanticId` on every node.
  - Provides `resolveSemanticIdFromObject(obj)` and `findObjectBySemanticId(root, semanticId)`, plus `disposeSceneGraph(root, options)` which disposes all per-stage geometries and materials while keeping the shared singleton toon ramp texture alive across live `F3` stage reloads (unless `disposeSharedRamp: true` is passed).

### 4. `F3` Stage/Wardrobe Lab, Agent DOM Mirror & Vite Local Disk Bridge (`src/interfaces/hud/`, `src/interfaces/vite/`)

- **`StageInspectorDomMirror.ts`**:
  - Updates `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, and `data-camera-mode` on a host element (or an attribute sink in headless tests) and populates `globalThis.__UPLIFT_STAGE_INSPECTOR__` (including an indexed list of inspectable `semanticId` targets).
  - Provides pure immutable mutators (`upsertWallSegmentMotif`, `updateStageLight`, `updateCameraVolumeFraming`, `updateCharacterVisualSlot`) that validate via Zod without mutating inputs.
- **Vite Local Disk Bridge Extension (`localDiskBridgePlugin.ts`)**:
  - Adds optional `sceneBlueprintsDir` and `characterVisualsDir` (with defaults so existing `handleLocalDiskBridgeRequest(req, telemetry, saves)` calls remain 100% backwards-compatible) and mounts `GET`/`PUT /api/scene-blueprints/:stageId` and `GET`/`PUT /api/character-visuals/:characterId` with URL decoding + strict `[A-Za-z0-9_-]` ID validation, path-prefix containment check, `256 KiB` body limit, Zod validation, and atomic temp-file-plus-rename writes.

### 5. Pinned Versions Table (Verified 2026-10-29)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
|---|---|---|
| Node.js LTS | `24.22.2` (`.nvmrc`) | Runtime; includes Oct 21, 2026 security patches (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | Native Go `tsc` binary (`7.0.2`, `ES2025`, strict mode, zero `any`) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | Official TS 6.0.3 JS AST API bridge required by `typescript-eslint` |
| `zod` | `4.6.7` | Schema validation and `z.infer` typing |
| `three` | `0.186.1` (`@types/three` `0.186.0`) | 3D scene graph and WebGL stage-paint chiaroscuro rendering |
| `vite` | `8.3.5` | Local dev server and bundler |
| `vitest` | `5.0.5` | Fast unit, architecture, and headless simulation test runner |
| `eslint` | `10.13.0` (`@eslint/js` `10.0.1`) | Flat-config static analysis (`minimatch` override `11.0.4`, `--cache`) |
| `typescript-eslint` | `8.72.1` | Strict & stylistic TypeScript ESLint rules |
| `eslint-config-prettier` | `10.1.8` | Disables formatting rules that conflict with Prettier |
| `prettier` | `3.9.10` | Automated code formatting (`--cache`) |
| `husky` + `lint-staged` | `9.1.7` / `17.6.0` | Pre-commit formatting and linting on staged files |
| `@types/node` | `24.19.2` | Node.js type definitions |

### 6. Layer Placement & Section Documentation Updates

```text
src/
  application/
    rendering/
      SceneVisualBlueprints.ts      # Layer 1-3 Zod schemas (EpochVisualTheme, StageSceneBlueprint, CameraVolumeBlueprint, CharacterVisualBlueprint) & semanticId helpers
      RenderFrameBuilder.ts         # Critically damped 3rd-person tracking camera, F3 Free-Cam, NDC projection, DebugInspectorCard & AgentDomMirrorState
    index.ts                        # Re-exports rendering schemas and RenderFrameBuilder
  interfaces/
    three/
      StageKitbashBuilders.ts       # Stepped chiaroscuro toon ramp, parametric wall motif builders, character posture/wardrobe kitbashers (re-exports visual blueprint types for content/scene/)
      ChiaroscuroStageRenderer.ts   # Stage scene graph builder, RenderFrame transform sync, semanticId raycast lookup, disposeSceneGraph
    hud/
      StageInspectorDomMirror.ts    # Agent DOM Mirror attributes, globalThis.__UPLIFT_STAGE_INSPECTOR__, and live F3 Stage/Wardrobe Lab mutators
    vite/
      localDiskBridgePlugin.ts      # Extended with GET/PUT /api/scene-blueprints/:id and /api/character-visuals/:id
    index.ts                        # Re-exports Three.js builders, StageInspectorDomMirror, and disk bridge
  content/
    scene/
      defaultStageContent.ts        # Starter EpochVisualTheme, StageSceneBlueprint, and CharacterVisualBlueprint definitions (imports types via interfaces/three)
    index.ts                        # Re-exports default stage content
```

- **Section `README.md` & `AGENTS.md` files updated by this change**:
  - `src/application/README.md` and `src/application/AGENTS.md`
  - `src/interfaces/README.md` and `src/interfaces/AGENTS.md`
  - `src/content/README.md` and `src/content/AGENTS.md`
  - `tests/README.md` and `tests/AGENTS.md`

### 7. Headless Testing & Verification Strategy

- All unit tests run in Node/Vitest in `<3s` without a browser or WebGL context (`THREE.Scene`, `THREE.Group`, `THREE.Mesh`, `THREE.PerspectiveCamera`, and `THREE.Raycaster` execute purely in CPU memory in Node with lightweight low-poly geometries).
- `npm run verify` runs `format:check`, `lint`, `typecheck`, `test:arch`, and `test:unit`.
