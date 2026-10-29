## Why

Before building the 3D feudal court, autonomous NPC utility brains, or local ONNX dialogue pipelines, `uplift` needs an enforceable Clean Architecture skeleton, strict zero-`any` TypeScript compiler/linter guardrails, deterministic randomness (`SeededRandom`), and a typed plugin state slice mechanism (`StateSliceKey<T>`). Establishing this foundation first guarantees that every subsequent module (characters, behaviors, spaces, props, mechanics) can be added or swapped without breaking architectural boundaries or introducing non-determinism.

## What Changes

- Initialize the local project toolchain (`package.json`, `tsconfig.json`, `vitest.config.ts`) with exact pinned versions verified on 2026-10-29 and strict TypeScript flags (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`).
- Scaffold the Clean Architecture directory layout (`src/domain/`, `src/application/`, `src/infrastructure/`, `src/interfaces/`, `src/content/`) and automated architectural verification (`tests/architecture/layer_boundaries.test.ts`) that enforces inward-only imports, bans explicit `any` across `src/` and `tests/`, and forbids `Math.random()` and `Date.now()` in `src/domain/` and `src/content/`.
- Implement the deterministic `SeededRandom` (Xorshift32 PRNG) in `src/domain/core/SeededRandom.ts` for reproducible simulation replays and save/load state.
- Implement the typed `StateSliceKey<T>` and `StateSliceStore` in `src/domain/core/StateSliceRegistry.ts` so plug-and-play content modules can read and write custom state with full compile-time and runtime type safety (zero `Record<string, any>`).
- Establish the hierarchical documentation and agent-guidance structure: master root `README.md` and `AGENTS.md` with high-level project/running details that link to dedicated `README.md` and `AGENTS.md` files in every major codebase section (`src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, `src/interfaces/`, and `tests/`), verified automatically by `npm run test:arch`.
- Add the one-command verification loop (`npm run verify`).

### Non-goals

- No Three.js 3D rendering or WebGL viewport yet (deferred to Change 3: `03-first-person-3d-shell`).
- No NPC behavior scoring, world tick reducer, or `CivilizationLegacyState` mutators yet (deferred to Change 2: `02-modular-registries-and-kinematics`).
- No `@huggingface/transformers` ONNX model download or Web Worker inference yet (deferred to Change 7: `07-local-onnx-hybrid-intent`).
- Runtime and tests require **zero external API keys, zero paid tokens, and zero cloud inference**.

### Dependencies on Prior Changes

- None — this is Change 1 of the 8-change MVP sequence.

## Capabilities

### New Capabilities

- `clean-architecture-and-quality-gate`: Strict Clean Architecture layer boundaries, zero-`any` TypeScript enforcement, and the `npm run verify` automated gate.
- `deterministic-simulation-primitives`: Seeded deterministic PRNG (`SeededRandom`) and type-safe modular plugin state storage (`StateSliceKey<T>` and `StateSliceStore`).

### Modified Capabilities

<!-- None: first change in repository -->

## Impact

- Creates `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `src/domain/core/*`, `src/application/`, `src/infrastructure/`, `src/interfaces/`, `src/content/`, `tests/architecture/layer_boundaries.test.ts`, and `tests/unit/domain/*`.
- All future modules register state slices through `defineStateSlice<T>` and draw randomness exclusively from `SeededRandom` without modifying core engine loop code.
