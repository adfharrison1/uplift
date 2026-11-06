# Agent Guide — Application Layer (`src/application/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/` (`src/domain/index.js`) only, plus sibling modules inside `src/application/`.
2. **Forbidden Imports**: Must NEVER import from `src/infrastructure/`, `src/interfaces/`, `src/content/`, `three`, or `@huggingface/transformers`.
3. **Port-Driven Orchestration & Telemetry**: Communicate with AI workers, session logging/compaction (`SessionTelemetryPort`), save/load persistence (`SaveSlotRepositoryPort`), and 3D rendering exclusively through abstract port interfaces defined in `src/domain/` or `src/application/`. Ensure `SimulationCoordinator` (`stepFrame`, `dispatchEffects`, `pulseCognitiveScheduler`, `exportLegacyState`, `saveToSlot`, `loadFromSlot`) and future use cases emit structured session telemetry events.
4. **Human-Paced Gameplay vs. Fast-Eval Pacing**: Always respect `WorldState.pacingConfig` (`DEFAULT_GAMEPLAY_PACING_CONFIG` for live 60Hz gameplay with `MAX_FRAME_DT_SECONDS = 0.25` clamping and `maxCognitiveEvaluationsPerPulse = 1`; `FAST_EVAL_PACING_CONFIG` for millisecond headless tests and AI evaluations).
5. **Pure Frame Building**: Keep 3rd-person tracking camera bounds, de-anchored debug camera state, NPC interpolation math, and floating debug inspector card projections in pure TypeScript classes here so they can be tested in `tests/unit/` without a browser or WebGL context.
6. **Zero `any`**: Implicit and explicit `any` are forbidden.

## Adding New Application Use Cases or Coordinators

1. Place application coordinators and pure frame builders in dedicated subdirectories (e.g., `src/application/simulation/`).
2. Re-export public classes, interfaces, and constants from `src/application/index.ts`.
3. Add deterministic unit tests in `tests/unit/application/<UseCaseName>.test.ts`.
4. Update both `src/application/README.md` and `src/application/AGENTS.md` and run `npm run verify`.
