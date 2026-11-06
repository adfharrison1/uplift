# Agent Guide — Test Suites (`tests/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Never Weaken Architecture Tests**: Never disable or relax assertions in `tests/architecture/layer_boundaries.test.ts` or `eslint.config.mjs` to make a failing build pass. Fix the offending import, lint error, or type annotation instead.
2. **Fast & Deterministic Unit Tests**: Unit tests (`tests/unit/`) and architecture tests (`tests/architecture/` — linear $O(N)$ file scan) must run in Node/Vitest in `<3s` without requiring a browser WebGL context or loading the 23MB ONNX model. Inject `SeededRandom` with fixed numeric seeds and `fixedTelemetryClock` for timestamps.
3. **Isolated Temp Directories for Disk Tests**: Any test exercising `NdjsonSessionTelemetry` or `FileSaveSlotRepository` must use `mkdtempSync(join(tmpdir(), '...'))` and clean up in `afterEach` so tests never pollute `./logs/` or `./saves/`.
4. **Zero `any` in Tests**: Explicit `any` (`: any`, `as any`, `<any>`) is banned in `tests/` just as in `src/` (enforced by both ESLint and `layer_boundaries.test.ts`). Use strongly typed test helpers, Zod schemas, or `unknown`.
5. **Pre-Commit Verification**: Always run `npm run verify` (`format:check`, `lint`, `typecheck`, `test:arch`, `test:unit`) before committing any task.
