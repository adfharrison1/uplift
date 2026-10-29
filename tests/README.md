# Test Suites (`tests/`)

## Purpose

`tests/` verifies architectural integrity, deterministic domain behavior, plug-and-play content contracts, and headless multi-tick simulation stability in under 3 seconds.

## Test Tiers

- **`tests/architecture/`**: Static and structural verification (`layer_boundaries.test.ts`) enforcing Clean Architecture inward imports, zero explicit `any`, ban on `Math.random()` / `Date.now()` in `domain`/`content`, and presence/linking of hierarchical `README.md` and `AGENTS.md` files.
- **`tests/unit/domain/`**: Fast, pure TypeScript unit tests for domain primitives (`SeededRandom.test.ts`, `StateSliceRegistry.test.ts`), utility scoring, rumor graphs, and legacy mutations.
- **`tests/unit/content/`** *(Change 2+)*: Contract tests validating every registered character, behavior, space node, prop, and mechanic.
- **`tests/simulation/`** *(Change 2+)*: Deterministic headless simulation runs (50–100 ticks in `<50ms`).
