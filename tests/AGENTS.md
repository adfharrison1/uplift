# Agent Guide — Test Suites (`tests/`)

## Strict Guardrails (Enforced by `npm run test:arch`)

1. **Never Weaken Architecture Tests**: Never disable or relax assertions in `tests/architecture/layer_boundaries.test.ts` to make a failing build pass. Fix the offending import or type annotation instead.
2. **Fast & Deterministic Unit Tests**: Unit tests (`tests/unit/`) must run in Node/Vitest in `<3s` without requiring a browser WebGL context or loading the 23MB ONNX model. Inject `SeededRandom` with fixed numeric seeds and use deterministic port fakes.
3. **Zero `any` in Tests**: Explicit `any` (`: any`, `as any`, `<any>`) is banned in `tests/` just as in `src/`. Use strongly typed test helpers or `unknown`.
4. **Pre-Commit Verification**: Always run `npm run verify` before committing any task.
