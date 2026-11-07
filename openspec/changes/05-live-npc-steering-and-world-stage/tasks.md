## 1. Portal-gated waypoint graph

- [x] 1.1 Add optional `neighborWaypointIds` on `WaypointBlueprint`, optional `portalTargetSpaceId` / `portalTargetWaypointId` on `PropBlueprint`, and optional `separationWeight` (`0..1`, default `1`) on `CharacterBlueprint` in `src/domain/registries/EpochBlueprints.ts`, validate them in `src/domain/registries/EpochModuleRegistry.ts` (portal targets are a pair, `portalState` alone stays legal, explicit-neighbor spaces reject degree-0 waypoints), add `getAllSpaces()`, and add optional `separationWeight` on `EntitySimulationState` in `src/domain/simulation/WorldState.ts`, with cases in `tests/unit/domain/EpochModuleRegistry.test.ts` | Verify: `npx vitest run tests/unit/domain/EpochModuleRegistry.test.ts && npm run verify` | Commit: `feat(domain): validate waypoint neighbors and portal targets`
- [x] 1.2 Implement `planWaypointPath` and `truncatePathAtClosedPortals` in `src/domain/simulation/WaypointNavigator.ts`, re-export them from `src/domain/index.ts`, with unit tests in `tests/unit/domain/WaypointNavigator.test.ts` | Verify: `npx vitest run tests/unit/domain/WaypointNavigator.test.ts && npm run verify` | Commit: `feat(domain): add deterministic portal-gated waypoint planning`

## 2. Embodied separation and move requests

- [x] 2.1 Add `SpatialHashGrid` in `src/domain/simulation/SpatialHashGrid.ts` and apply same-space XZ separation inside `src/domain/simulation/KinematicsEngine.ts`, scaled by the mover's `separationWeight` (omitted means `1`; `0` keeps packed spacing), re-export the grid from `src/domain/index.ts`, with tests in `tests/unit/domain/KinematicsAndReducer.test.ts` | Verify: `npx vitest run tests/unit/domain/KinematicsAndReducer.test.ts && npm run verify` | Commit: `feat(domain): separate embodied walkers with a 2D spatial hash`
- [x] 2.2 Add `set_separation_weight` to `src/domain/simulation/WorldState.ts` and `src/domain/simulation/WorldEffectReducer.ts`, and add `requestWaypointMove`, `requestSetPortalState`, spawn-time weight copy, and pre-step path truncation (including the hop off the current waypoint) to `src/application/simulation/SimulationCoordinator.ts`, with unit tests in `tests/unit/application/SimulationCoordinator.test.ts` | Verify: `npx vitest run tests/unit/application/SimulationCoordinator.test.ts && npm run verify` | Commit: `feat(app): request waypoint moves and stop at closed portals`

## 3. Starter yard and chambers slice

- [x] 3.1 Add `src/content/worlds/starterHoldPack.ts` and `src/content/scene/starterHoldStages.ts`, re-export both from `src/content/index.ts`, and cover registration, open-door crossing, and barred refusal in `tests/unit/content/StarterHoldStage.test.ts` | Verify: `npx vitest run tests/unit/content/StarterHoldStage.test.ts && npm run verify` | Commit: `feat(content): add the yard and chambers embodied proving slice`

## 4. Hierarchical documentation and 6-subagent review

- [ ] 4.1 Update `src/domain/README.md`, `src/domain/AGENTS.md`, `src/application/README.md`, `src/application/AGENTS.md`, `src/content/README.md`, `src/content/AGENTS.md`, `tests/README.md`, and `tests/AGENTS.md`, then run the post-change 6-subagent review (adversarial, code adherence, performance, testing, logic, design adherence) and fold in verified fixes | Verify: `npm run verify` | Commit: `docs(sim): document live steering and the starter hold slice`
