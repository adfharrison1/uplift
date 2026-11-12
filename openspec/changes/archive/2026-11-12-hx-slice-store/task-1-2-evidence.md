# Task 1.2 evidence — world-state fixture and domain suite split

Status: implemented and reviewed in the default checkout; awaiting owner approval before commit. Task 1.2 remains unchecked. Task 1.1's checkbox was marked after its approved commit `25ccb79` and is carried into this task's pending diff. No defect transition is claimed.

## Scope and observed checks

- `tests/support/makeWorldState.ts` supplies a fresh synthetic entity and a world constructor with explicit entity, prop, pacing, slice, epoch and orbital overrides. The 700-line monolith became `Kinematics.test.ts` and `WorldEffectReducer.test.ts`; no production source changed.
- Baseline: the original suite passed 18/18 tests in one file, Vitest duration 142 ms. Inventory against HEAD: 18/18 identical test names, 18/18 identical test bodies after `makeTestEntity` → `makeWorldEntity` and `createInitialWorldState` → `makeWorldState`, and 113/113 textual `expect(...)` calls. Kinematics retains 17 tests/89 expectations; the reducer retains 1 test/24 expectations, including movement boundaries and orbital errors.
- `npx vitest run tests/unit/domain/Kinematics tests/unit/domain/WorldEffectReducer --reporter=verbose`: **PASS**, 2 files, 18 tests, Vitest duration 191 ms on this host. `npx tsc --noEmit`: **PASS**.
- `npm run verify` with loopback access: **PASS**, format 1,426 ms, lint 1,481 ms, typecheck 704 ms, test 17,080 ms. These are host observations, not reference-Mac performance claims. An independent reviewer also passed permitted full verification after an initial sandboxed loopback denial and transient process-readiness timeout.
- `npm run defects -- reconcile --check`: **PASS**, 51 active and 25 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Verified existing test paths: world fixture → `createInitialWorldState` → `stepKinematics` or `applyWorldEffects` → observable positions, phases, arrivals, effects and unchanged prior state. No runtime consumer changed. |
| G2 Trust boundary | No new runtime input or authority boundary. Identical tests retain invalid time-step and orbital-spend rejection; slice JSON/schema validation belongs to later tasks. |
| G3 Hot-path cost | Test-only builder adds one small options-object copy per construction; simulation algorithms are unchanged. Focused/full suite timings are above. The 2019 Intel 60 FPS target remains unmeasured. |
| G4 Failure containment | Existing paused/zero-time no-op, invalid time-step, off-phase burn and insufficient-Delta assertions remain; independent probes also checked unchanged prior worlds and subsequent valid operations. |
| G5 Defect reconciliation | Both task reviews found no new defect. The checked ledger reconciles; `S4-13` stays active for the remaining fixtures and bridge refactor. |
| G6 Scenario traceability | This is a test-only refactor. All 18 prior named scenarios and 113 expectations remain; new slice-store delta behavior awaits later tasks and is not marked verified here. |

## Document integrity

Shipped test guidance belongs in `tests/README.md` and `tests/AGENTS.md`; contract and task order remain in OpenSpec. The README replaces only the old combined filename with both suite names and adds the shared fixture. AGENTS adds one numbered rule and preserves prior wording except the final rule's renumbering. Word counts: README 1,203 → 1,218; AGENTS 1,358 → 1,395. The Engineering status index, Where-facts-live table, roadmap row, design dispositions, owner exemplars and unresolved inbox remain unchanged because the full builder and slice work is pending. No design paragraph, configuration context or historical review was moved or cut. Independent fidelity/coherence judgments are in [task-1-2-reviews.md](task-1-2-reviews.md).
