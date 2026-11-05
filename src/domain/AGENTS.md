# Agent Guide — Domain Layer (`src/domain/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Zero Outward Imports**: Never import from `application`, `infrastructure`, `interfaces`, `content`, `three`, or `@huggingface/transformers`.
2. **Zero DOM / WebGL Globals**: Never reference `window`, `document`, `HTMLCanvasElement`, or `WebGLRenderingContext`.
3. **Deterministic Execution Only**: `Math.random()`, `Date.now()`, `performance.now()`, and `new Date()` are strictly banned (enforced by both ESLint `no-restricted-syntax` and `tests/architecture/layer_boundaries.test.ts`). Always accept and use an injected `SeededRandom` instance.
4. **Immutable State & Reducers**: Domain models and `StateSliceStore` updates must return new instances rather than mutating existing state in place.
5. **Zero `any`**: Both implicit and explicit `any` are forbidden. Use generic type parameters (`<T>`) or `unknown` with type guards.

## Adding New Domain Primitives or Contracts

1. Place core primitives in `src/domain/core/` and module contracts/ports in dedicated subdirectories (e.g., `src/domain/registries/`, `src/domain/legacy/`).
2. Re-export public types and classes from `src/domain/index.ts`.
3. Add matching deterministic unit tests in `tests/unit/domain/<ModuleName>.test.ts`.
4. Update `src/domain/README.md` and run `npm run verify`.
