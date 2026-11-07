# Test Suites (`tests/`)

## Purpose

`tests/` verifies architectural integrity, deterministic domain behavior, application simulation and rendering frame coordination, infrastructure persistence/telemetry, interface CLI/HTTP/Three.js/HUD adapters, plug-and-play content contracts, and headless multi-tick simulation stability in under 3 seconds as part of `npm run verify` (`format:check` -> `lint` -> `typecheck` -> `test:arch` -> `test:unit`).

## Test Tiers

- **`tests/architecture/`**: Static and structural verification (`layer_boundaries.test.ts`) enforcing Clean Architecture inward imports, zero explicit `any`, ban on `Math.random()` / `Date.now()` in `domain`/`content`, presence/linking of hierarchical `README.md` and `AGENTS.md` files, ESLint/Prettier/Husky config checks, and `.agents/skills/uplift-debug/SKILL.md` plus `.agents/skills/uplift-design-notes/SKILL.md` verification.
- **`tests/unit/domain/`**: Fast, pure TypeScript unit tests for domain primitives, schemas, registries, kinematics, reducers, and Dual-Ledger civilization legacy (`SeededRandom.test.ts`, `StateSliceRegistry.test.ts`, `TelemetryAndSavePorts.test.ts`, `EpochModuleRegistry.test.ts`, `WaypointNavigator.test.ts`, `KinematicsAndReducer.test.ts`, `CivilizationLegacyState.test.ts`).
- **`tests/unit/application/`**: Deterministic headless unit tests for application simulation coordination, 3-Layer Visual Blueprints, and `RenderFrameBuilder` camera/NDC math (`SimulationCoordinator.test.ts`, `SceneVisualBlueprints.test.ts`, `RenderFrameBuilder.test.ts`). Coordinator tests cover waypoint requests, portal truncation, and separation-weight spawn and rejection.
- **`tests/unit/infrastructure/`**: Unit tests for NDJSON session telemetry, rolling compaction, 50 MiB / 500 MiB storage budgets, and multi-session save/load repositories (`NdjsonSessionTelemetry.test.ts`, `FileSaveSlotRepository.test.ts`).
- **`tests/unit/interfaces/`**: Unit tests for the `logs:query` CLI, Vite local disk bridge HTTP middleware (telemetry, saves, scene blueprints, character visuals), Three.js chiaroscuro stage & kitbash builders, and `StageInspectorDomMirror` (`QueryLogsCli.test.ts`, `LocalDiskBridge.test.ts`, `ChiaroscuroStageRenderer.test.ts`, `StageInspectorDomMirror.test.ts`, `SceneBlueprintDiskBridge.test.ts`).
- **`tests/unit/content/`**: Content contract tests. `StarterHoldStage.test.ts` registers the starter hold, crosses the open door, plans the return, and refuses a barred door. Exemplar ids in that test must stay out of `src/domain/` and `src/application/`.
