# Task 1.1 evidence — coordinator fixture and suite split

Status: implemented and reviewed in the default checkout; awaiting owner approval before commit. The task checkbox remains open. No defect transition is claimed.

## Scope and checks

- `tests/support/makeRegistry.ts` replaces the pasted coordinator registry fixture with a fresh synthetic epoch pack and typed `EpochModulePackInput` field overrides. Three coordinator suites cover startup, simulation, and save/legacy behavior; `fixtures.ts` holds their telemetry and legacy helpers. No production source changed.
- Baseline: the original suite passed 16/16 tests in one file, Vitest duration 185 ms. Before/after inventory: 16 identical test names, 16 identical test bodies after the builder rename, and 147/147 textual `expect(...)` calls. The complete malformed-load, field-identity and retry assertions remain in the save/legacy suite.
- `npx vitest run tests/unit/application/SimulationCoordinator --reporter=verbose`: **PASS**, 3 files, 16 tests, Vitest duration 240 ms on this host. `npx tsc --noEmit`: **PASS**.
- `npm run verify` with loopback access: **PASS**, format 1,348 ms, lint 1,298 ms, typecheck 768 ms, test 16,525 ms. A sandboxed attempt first failed 31 HTTP tests at `listen EPERM 127.0.0.1`; the permitted rerun passed. These are host measurements, not a claim about the reference Intel Mac.
- `npm run defects -- reconcile --check`: **PASS**, 51 active and 25 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Verified existing coordinator tests still exercise registry → coordinator startup/step, and coordinator save → in-memory slot → load → world, custom slices, RNG and legacy readback. No new runtime consumer is claimed. |
| G2 Trust boundary | No new runtime input or authority boundary. Existing malformed legacy load and invalid effect rejections remain in the identical test bodies; slice JSON/schema boundaries belong to later tasks. |
| G3 Hot-path cost | Test-only registry construction and file layout do not change simulation hot paths. Focused/full suite timings are above. The 2019 Intel 60 FPS target remains unmeasured by this task. |
| G4 Failure containment | Identical assertions preserve atomic rejection of a foreign slot, seven malformed legacy loads, warning-record failures, failed required `load_slot` recording, unchanged prior fields and successful retry. |
| G5 Defect reconciliation | Both independent reviews found no new defect. The checked ledger reconciles. `S4-13` stays active because this task addresses only its coordinator-fixture portion; other builders and bridge work remain scheduled. |
| G6 Scenario traceability | This is a test-only refactor. All 16 prior named scenarios and 147 expectations remain; the slice-store delta's new behavior awaits Tasks 3–5 and is not marked verified here. |

## Document integrity

Shipped test guidance belongs in `tests/README.md` and `tests/AGENTS.md`; the contract and task order remain in OpenSpec. The README's coordinator path and coverage sentence moved to the new suite directory, retaining waypoint, portal and separation assertions and adding the existing atomic-load coverage. AGENTS gained one numbered fixture/suite rule without removing prior rules. Word counts: README 1,186 → 1,203; AGENTS 1,317 → 1,358. The Engineering status index and Where-facts-live table in `DESIGN_NOTES.md`, roadmap row, dispositions and unresolved inbox entries are unchanged because the full builder/slice work is still pending. No design paragraph, owner exemplar, configuration context or historical review was moved or cut. Reviewer judgments and dispositions are in [task-1-1-reviews.md](task-1-1-reviews.md).
