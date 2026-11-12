# Task 2.1 evidence — stage blueprint fixture and PlaySession split

Status: implemented and reviewed in the default checkout; awaiting owner approval before commit. Task 2.1 remains unchecked. Task 1.2's checkbox was marked after its approved commit `3f0fcee` and is carried into this pending diff. No defect transition is claimed.

## Scope and observed checks

- `tests/support/makeStageBlueprint.ts` builds synthetic stage data through the application presentation schema and canonical semantic-id formatters. `PlaySessionStage.test.ts` and `PlaySessionControls.test.ts` replace the monolith, sharing only test setup through `PlaySessionFixtures.ts`. No production source or proving-pack consumer changed.
- Baseline: the original PlaySession suite passed 11/11 tests in one file, Vitest duration 178 ms. Afterward, the split passed 11/11 tests across two files, duration 206 ms. All 11 names and 57/57 `expect` expressions are preserved. Ten test callbacks match after the builder rename; the authored-height case uses a prop override and produces a deeply equal parsed stage. Its assertions are unchanged. The unchanged `StarterHoldStage.test.ts` consumer also passed in the independent reviewers' focused runs.
- The first full verify found that an override typed as parsed schema output required defaulted prop fields. The builder now accepts `z.input<typeof StageSceneBlueprintSchema>` overrides and returns parsed output. Focused tests and `npx tsc --noEmit` passed after that correction.
- Final pre-review `npm run verify` with loopback access: **PASS**, format 1,531 ms, lint 1,474 ms, typecheck 654 ms, test 16,148 ms. These are host measurements, not reference-Mac performance claims. `npm run defects -- reconcile --check`: **PASS**, 51 active and 25 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Synthetic stage → `StageSceneBlueprintSchema` → real PlaySession/coordinator/frame builder → resident stage, camera, poses and statuses. The content proving-pack test remains a separate real registry/stage consumer. |
| G2 Trust boundary | The test builder validates authored stage input with canonical semantic ids; no production authority boundary changed. Existing rejected launches, invalid floor points, blocked doors and unknown props remain observable. |
| G3 Hot-path cost | Fixture parsing is test setup with unchanged small stage sizes; no frame hot path changed. Focused/full timings are above. The 2019 Intel 60 FPS target remains unmeasured here. |
| G4 Failure containment | Identical assertions retain prior world on failed launch, blocked movement, paused input and unknown prop. Missing-stage fallback keeps the resident stage; reduced-motion/camera behavior retains all eight assertions. |
| G5 Defect reconciliation | Both reviews found no new defect. The checked ledger reconciles; `S4-13` remains active until the later bridge work and closing evidence. |
| G6 Scenario traceability | All 11 prior PlaySession cases and 57 assertions remain. The proving-pack consumer was retained unchanged and independently run. New slice-store behavior awaits later tasks. |

## Document integrity

Shipped test guidance belongs in `tests/README.md` and `tests/AGENTS.md`; the contract and order stay in OpenSpec. The README's application paragraph maps to its new stage/control filenames and builder while retaining coordinator, blueprint and frame-test claims. AGENTS adds one numbered rule, retaining prior rules except the final rule's renumbering. Word counts: README 1,218 → 1,246; AGENTS 1,395 → 1,431. Engineering status, Where-facts-live ownership, roadmap, dispositions, owner exemplars and unresolved inbox entries remain unchanged while the wider slice and bridge work is pending. No design paragraph, configuration context or historical review was moved or cut. Independent fidelity/coherence judgments are in [task-2-1-reviews.md](task-2-1-reviews.md).
