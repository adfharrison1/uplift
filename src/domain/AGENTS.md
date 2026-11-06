# Agent Guide — Domain Layer (`src/domain/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Zero Outward Imports**: Never import from `application`, `infrastructure`, `interfaces`, `content`, `three`, or `@huggingface/transformers`. Pure schema validation via `zod` (`z.object`, `z.infer`) is permitted for domain data contracts.
2. **Zero Era-Specific Hardcoding**: Keep all schemas, registries, reducers, and kinematics inside `src/domain/` 100% epoch-agnostic. Never hardcode specific Era 1 feudal character names, spaces, or factions here—author those in `src/content/` and register them via `EpochModuleRegistry`.
3. **Zero DOM / WebGL Globals**: Never reference `window`, `document`, `HTMLCanvasElement`, or `WebGLRenderingContext`.
4. **Deterministic Execution Only**: `Math.random()`, `Date.now()`, `performance.now()`, and `new Date()` are strictly banned (enforced by both ESLint `no-restricted-syntax` and `tests/architecture/layer_boundaries.test.ts`). Always accept and use an injected `SeededRandom` or `TelemetryClock` instance.
5. **Immutable State & Pure Reducers**: `WorldState`, `applyWorldEffects`, `stepKinematics`, `applyLegacyToCharacterBlueprints`, and `StateSliceStore` updates must return new instances without mutating inputs in place.
6. **Zero `any` & Zod v4 Conventions**: Both implicit and explicit `any` are forbidden. Derive TypeScript types via `z.infer<typeof Schema>` and remember that `z.number()` in Zod v4 is finite by default (do not call deprecated `.finite()`).

## Adding New Domain Primitives or Contracts

1. Place core primitives in `src/domain/core/` and module contracts/ports in dedicated subdirectories (`src/domain/telemetry/`, `src/domain/persistence/`, `src/domain/registries/`, `src/domain/simulation/`, `src/domain/legacy/`).
2. Re-export public types, schemas, functions, and classes from `src/domain/index.ts`.
3. Add matching deterministic unit tests in `tests/unit/domain/<ModuleName>.test.ts` covering both normal gameplay pacing (`DEFAULT_GAMEPLAY_PACING_CONFIG`) and fast evaluation pacing (`FAST_EVAL_PACING_CONFIG`) where applicable.
4. Update both `src/domain/README.md` and `src/domain/AGENTS.md` and run `npm run verify`.
