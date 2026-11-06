# Test Suites (`tests/`)

## Purpose

`tests/` verifies architectural integrity, deterministic domain behavior, infrastructure persistence/telemetry, interface CLI/HTTP bridges, plug-and-play content contracts, and headless multi-tick simulation stability in under 3 seconds as part of `npm run verify` (`format:check` -> `lint` -> `typecheck` -> `test:arch` -> `test:unit`).

## Test Tiers

- **`tests/architecture/`**: Static and structural verification (`layer_boundaries.test.ts`) enforcing Clean Architecture inward imports, zero explicit `any`, ban on `Math.random()` / `Date.now()` in `domain`/`content`, presence/linking of hierarchical `README.md` and `AGENTS.md` files, ESLint/Prettier/Husky config checks, and `.agents/skills/uplift-debug/SKILL.md` verification.
- **`tests/unit/domain/`**: Fast, pure TypeScript unit tests for domain primitives and schemas (`SeededRandom.test.ts`, `StateSliceRegistry.test.ts`, `TelemetryAndSavePorts.test.ts`).
- **`tests/unit/infrastructure/`**: Unit tests for NDJSON session telemetry, rolling compaction, 50 MiB / 500 MiB storage budgets, and multi-session save/load repositories (`NdjsonSessionTelemetry.test.ts`, `FileSaveSlotRepository.test.ts`).
- **`tests/unit/interfaces/`**: Unit tests for the `logs:query` CLI and Vite local disk bridge HTTP middleware (`QueryLogsCli.test.ts`, `LocalDiskBridge.test.ts`).
- **`tests/unit/content/`** _(Change 03+)_: Contract tests validating every registered character, behavior, space node, prop, office, rival operative, and mechanic.
- **`tests/simulation/`** _(Change 03+)_: Deterministic headless simulation runs (50–100 ticks in `<50ms`).
