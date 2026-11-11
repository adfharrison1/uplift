# Task 3 evidence — coordinator legacy clamp consumers

Status: implemented and independently reviewed in the default checkout; awaiting owner approval before commit. Task 3 remains unchecked. The uncommitted Task 2 checkbox records commit `125b96f`.

## Scope and observed checks

- `SimulationCoordinator` resolves legacy drives at startup and load, exposes frozen latest clamp notes, and writes structured phase-aware `legacy_drive_clamped` warnings through its injected telemetry port. Each warning write is independently best effort. The saved world snapshot is restored without rewriting entities from newly resolved blueprints. `load_slot` is recorded after local preparation and before publishing any restored coordinator field; its failure preserves the prior state.
- TDD: six new coordinator consumer tests first failed against the strict-only/old load path; after implementation the focused suite passed. Two review-requested coverage additions were independently rechecked.
- `npx vitest run tests/unit/application/SimulationCoordinator.test.ts`: **PASS**, 1 file, 16 tests, Vitest duration 169 ms, command wall time 0.51 s.
- `npm run verify` after review fixes with loopback access: **PASS**; format 1,530 ms, lint 1,459 ms, typecheck 633 ms, tests 16,611 ms; command wall time 16.85 s on this host. This is a measurement, not a reference-Mac timing claim.
- `npm run defects -- reconcile --check`: **PASS**, 53 active and 22 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Startup legacy → domain runtime resolver → initial `WorldState.entities`, `getResolvedCharacters`, frozen `getLegacyClampNotes` and `InMemorySessionTelemetry.query`. Load slot → parsed legacy and raw RNG → resolved blueprint, unchanged saved-world entity, restored next draw and queryable `load_slot`/warning records. Tests end at each consumer. Browser disk telemetry is outside this task. |
| G2 Trust boundary | Legacy parsing and domain checks reject conflicting overrides, unknown drive/pillar targets, malformed clamp intervals, non-finite intermediate arithmetic and negative final pillar weights. Seven individual invalid-slot cases verify the load boundary without publishing state. Slot repository validation remains the existing port contract. |
| G3 Hot-path cost | Resolution and warning loops run only at startup/load, not per frame. Work is bounded by affected blueprints, mutations and clamp notes; each note has one attempted port write. Focused/full command times are above; target-Mac profiling remains unverified. |
| G4 Failure containment | Failed first and later warning writes leave valid saturated results and frozen notes; later warnings are still attempted. Failed required `load_slot` recording leaves the prior world, RNG object/word, inherited legacy, resolved characters and notes intact; retry succeeds. Invalid-load failures preserve the same fields. |
| G5 Defect reconciliation | No code defect was found. Review test findings `T3-TEST-01` (restored tick not distinguished) and `T3-TEST-02` (old notes not cleared by in-range load) were fixed and independently rechecked. The checked ledger reconciles; specified clamp/RNG defects remain active until closing Task 4 binds full fix/test/review evidence. |
| G6 Scenario traceability | New tests cover startup high saturation and telemetry readback, low load with saved-world and RNG continuation, explicit in-range clamp/no warnings, latest-note clearing, seven individual invalid loads, first/later warning failures, failed required load record and successful retry. Existing coordinator tests remain green. Closing Task 4 will check the full delta scenario matrix. |

## Document integrity

The paired application guides describe shipped coordinator behavior; `DESIGN_NOTES.md` now marks legacy drive saturation shipped while keeping the overall engineering/state sections partial. README word count changed 648 → 701; AGENTS 672 → 738; DESIGN_NOTES 17,198 → 17,251 (its target is aspirational). The status-index row was updated; the Where-facts-live table, roadmap row and dispositions were checked and remain unchanged. The old planned clamp paragraph maps to the shipped finite-final-drive behavior plus retained planned `sourceScarId` membership, watch recording and cross-epoch accumulation. No exemplar, unrelated plan, design file or navigation link was cut. Independent fidelity/coherence judgments are in [task-3-reviews.md](task-3-reviews.md).
