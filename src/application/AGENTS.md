# Agent Guide — Application Layer (`src/application/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/` (`src/domain/index.js`) and `zod` only, plus sibling modules inside `src/application/`.
2. **Forbidden Imports**: Must NEVER import from `src/infrastructure/`, `src/interfaces/`, `src/content/`, `three`, or `@huggingface/transformers`.
3. **Port-Driven Orchestration & Telemetry**: Communicate with AI workers, session logging/compaction (`SessionTelemetryPort`), save/load persistence (`SaveSlotRepositoryPort`), and 3D rendering exclusively through abstract port interfaces defined in `src/domain/` or `src/application/`. Ensure `SimulationCoordinator` (`stepFrame`, `dispatchEffects`, `pulseCognitiveScheduler`, `exportLegacyState`, `saveToSlot`, `loadFromSlot`) and future use cases emit structured session telemetry events.
4. **Human-Paced Gameplay vs. Fast-Eval Pacing**: Always respect `WorldState.pacingConfig` (`DEFAULT_GAMEPLAY_PACING_CONFIG` for live 60Hz gameplay with `MAX_FRAME_DT_SECONDS = 0.25` clamping and `maxCognitiveEvaluationsPerPulse = 1`; `FAST_EVAL_PACING_CONFIG` for millisecond headless tests and AI evaluations).
5. **Pure Frame Building & Epoch-Agnostic Visual Blueprints**: Keep 3-Layer Visual Blueprint schemas (`SceneVisualBlueprints.ts`), 3rd-person tracking camera bounds, critically damped spring transitions, de-anchored debug camera state, and behind-camera-guarded (`clipW <= 1e-5`) 3D-to-NDC floating debug inspector card projections (`RenderFrameBuilder.ts`) in pure TypeScript with open identifier tokens so they can be tested in `tests/unit/application/` without a browser or WebGL context.
6. **Zero `any`**: Implicit and explicit `any` are forbidden.

## Adding New Application Use Cases or Coordinators

1. Place application coordinators and pure frame builders in dedicated subdirectories (e.g., `src/application/simulation/`, `src/application/rendering/`).
2. Re-export public classes, interfaces, schemas, and constants from `src/application/index.ts`.
3. Add deterministic unit tests in `tests/unit/application/<UseCaseName>.test.ts`.
4. Update both `src/application/README.md` and `src/application/AGENTS.md` and run `npm run verify`.

## Waypoint requests

- Do not import content packs. Build the space list and space-kind directory from `EpochModuleRegistry.getAllSpaces()` when the coordinator is constructed.
- `requestWaypointMove` returns `paused` or `unknown_entity` before `dispatchEffects`. On a planned path, dispatch only `move_entity_to_waypoint`. Leave a deliberating entity in that phase. `already_there`, `blocked`, and `unknown_waypoint` do not change `WorldState`.
- `requestSetPortalState` dispatches the existing `update_prop_state` effect. An unknown prop returns `unknown_prop`.
- On an unpaused frame with `dtSeconds > 0`, truncate active paths once, including the hop off the current waypoint, and then call `stepKinematics` with the space-kind directory. Do not read portal state again during that step.
