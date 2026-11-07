# Application Layer (`src/application/`)

## Purpose

`src/application/` orchestrates use cases between the outer adapters (`src/interfaces/`, `src/infrastructure/`) and the inner simulation core (`src/domain/`).

Responsibilities include:

- Coordinating the continuous 60 FPS kinematics step (`stepFrame`), discrete `WorldEffect` dispatch (`dispatchEffects`), and anti-thundering-herd round-robin cognitive scheduler (`pulseCognitiveScheduler`) with full pause support for In-Game Debug Mode and fast-eval overrides (`FAST_EVAL_PACING_CONFIG`).
- Managing Dual-Ledger `CivilizationLegacyState` inheritance on epoch startup, in-epoch scar accumulation (`exportLegacyState`), and atomic multi-session save/load snapshots (`saveToSlot`, `loadFromSlot`) via `SaveSlotRepositoryPort`.
- Emitting structured session telemetry (`SessionTelemetryPort`) for kinematics arrivals, cognitive phase transitions, frame `dt` clamping, world effects, and persistence operations.
- Defining the Zod-validated **3-Layer Encoded Visual Authoring Framework** (`EpochVisualTheme`, `StageSceneBlueprint`, `CameraVolumeBlueprint`, `CharacterVisualBlueprint`, and deterministic `semanticId` helpers) in `rendering/SceneVisualBlueprints.ts`.
- Computing pure, WebGL-independent render frames (`RenderFrameBuilder` in `rendering/RenderFrameBuilder.ts`) for the volume-aware 3rd-person fixed-orientation tracking camera, critically damped spring transitions, Emergency/Zenith tilts (with `reduceMotionAndFlashing` accessibility clamp), `F3` De-Anchored Free-Cam (`+0.40` desaturation), behind-camera-guarded 3D-to-NDC `DebugInspectorCard` projection, and `AgentDomMirrorState`.

## Current Module Inventory

- `simulation/SimulationCoordinator.ts` — Application simulation coordinator wiring `EpochModuleRegistry`, `stepKinematics`, `applyWorldEffects`, round-robin `pulseCognitiveScheduler`, `CivilizationLegacyState`, `SessionTelemetryPort`, and `SaveSlotRepositoryPort`.
- `rendering/SceneVisualBlueprints.ts` — Layer 1–3 Zod schemas (`EpochVisualThemeSchema`, `StageSceneBlueprintSchema`, `StagePropVisualBlueprintSchema`, `CameraVolumeBlueprintSchema`, `CharacterVisualBlueprintSchema`), `resolveCharacterVisualForTheme`, and deterministic `semanticId` formatters/validators.
- `rendering/RenderFrameBuilder.ts` — Pure `RenderFrameBuilder`, `selectActiveCameraVolume`, `stepCriticallyDampedSpring`, and `projectWorldToNdc`.
- `index.ts` — Public application layer barrel re-exporting `SimulationCoordinator`, `RenderFrameBuilder`, and all 3-Layer Visual Blueprint schemas/types.
