# Agent Guide — Test Suites (`tests/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Never Weaken Architecture Tests**: Never disable or relax assertions in `tests/architecture/layer_boundaries.test.ts` or `eslint.config.mjs` to make a failing build pass. Fix the offending import, lint error, or type annotation instead.
2. **Fast & Deterministic Unit Tests**: Unit tests (`tests/unit/`) and architecture tests (`tests/architecture/` — linear $O(N)$ file scan) must run in Node/Vitest in `<3s` without requiring a browser WebGL context or loading the 23MB ONNX model. Inject `SeededRandom` with fixed numeric seeds and `fixedTelemetryClock` for timestamps, use `InMemorySessionTelemetry`, `InMemorySaveSlotRepository`, and `InMemoryDomAttributeSink` for headless unit tests, and use `FAST_EVAL_PACING_CONFIG` when testing multi-step cognitive lifecycles.
3. **Isolated Temp Directories for Disk Tests**: Any test exercising `NdjsonSessionTelemetry`, `FileSaveSlotRepository`, or `handleLocalDiskBridgeRequest` disk routes must use `mkdtempSync(join(tmpdir(), '...'))` and clean up in `afterEach` so tests never pollute `./logs/`, `./saves/`, or `./src/content/scene/`.
4. **Zero `any` & Zero Non-Null Assertions (`!`) in Tests**: Explicit `any` (`: any`, `as any`, `<any>`) and non-null assertions (`!`) are banned in `tests/` just as in `src/` (enforced by ESLint and `layer_boundaries.test.ts`). Use strongly typed test helpers, explicit `undefined` guards, Zod schemas, or `unknown`.
5. **Pre-Commit Verification**: Always run `npm run verify` (`format:check`, `lint`, `typecheck`, `test:arch`, `test:unit`) before committing any task.
6. **Content exemplars stay in content**: A headless content test may register a pack on `SimulationCoordinator` and step it with `FAST_EVAL_PACING_CONFIG`. Do not copy that pack's space, character, or prop ids into `src/domain/` or `src/application/`.
7. **AI evals stay on their own command**: Cases for any AI subject live under `eval/` and run with `npm run eval:ai`. Do not put them in `tests/unit/` or on `npm run verify`.

## Storage regression tests

Use real isolated directories for confinement and rotation tests. Inject selected failures through `LocalFileOps` while delegating other calls to `nodeLocalFileOps`; use a deterministic temporary-name supplier for collision/link tests. Never globally mock `node:fs`. Check outside sentinels, original/archive byte preservation, fresh current-query isolation and failed-instance write rejection. Cover constructor and explicit-start failures separately at each rotation transition, preserve pending groups across retry, and verify pruning/diagnostic failures leave current logging usable. Default retention is three completed groups; one writer owns each tested root.

For stage and character disk routes, pass trusted `LocalFileOptions` as the dispatcher's sixth argument to inject filesystem faults or a temporary-name supplier. Assert status plus real file readback, unchanged outside sentinels and previous asset preservation; cover GET confinement as well as PUT. Use a read-failure adapter to prove oversized files are rejected before being read. Direct dispatcher tests do not verify the HTTP trust boundary.
