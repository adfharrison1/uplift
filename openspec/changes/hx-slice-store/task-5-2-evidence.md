# Task 5.2 evidence — final-review slice corrections

Status: implemented and independently reviewed in the default checkout; owner commit approval remains pending. Task 5.1's checkbox is post-commit bookkeeping for `c059bb9` and is carried in this diff. Task 5.2 remains unchecked. The ninth task is justified in `tasks.md`: final delivery review found two code defects, corrected within one source file plus tests and related docs.

## Scope and observed checks

- `StateSliceStore.get` now reads the registered default for an unset registry-bound id, even when a caller supplies a same-id descriptor with another default. `updateSlice` uses that same baseline. The registered validator remains authoritative. `schemaMatches` compares privately copied JSON values structurally, so an inherited `toJSON` hook cannot conceal a value-changing parse result. General schema checks remain proportional to the value; `get` adds a registry lookup but no row traversal.
- The two focused regressions failed against the prior code: colliding fallback returned `{ count: 0 }` instead of `{ count: 10 }`, and an inherited `toJSON` made a changing schema pass. After correction, `npx vitest run tests/unit/domain/StateSliceRegistry.test.ts` passed **47/47**. The strengthened coordinator round trip checks nondefault pressure/discovery state and the second loaded version map; rejected-load tests preserve a populated prior world, slice/version map and RNG, with named error detail. Combined focused run: **71/71 across five files**.
- Socket-enabled `npm run verify`: **PASS** format 1,954 ms, lint 1,732 ms, typecheck 622 ms and tests 18,508 ms. `npm run defects -- reconcile --check`: pass, 51 active and 25 resolved. `openspec validate hx-slice-store --strict`: valid after placing 5.2 in group 5. `git diff --check`: pass. No reference 2019 Intel Mac frame timing was measured.

## G1–G6

| Gate | Task result and limit |
| --- | --- |
| G1 Consumer trace | Registered key → `StateSliceRegistry.register` → `StateSliceStore.fromSnapshot` → `get`/`updateSlice` now uses one registered fallback. Typed slice/effect → coordinator save → repository → repeated coordinator load → slice, version, pressure and discovery readback remains covered. Browser launch still does not consume disk saves. |
| G2 Trust boundary | A caller's same-id descriptor cannot choose the default of a registered unset slice. A schema callback's returned value is privately copied and compared without invoking inherited serialization hooks; changing output rejects before publication. Caller code that mutates global built-in prototypes is outside the slice-input boundary and can affect general JSON serialization elsewhere. |
| G3 Hot-path cost | Registry lookup and structural schema comparison add no traversal of earlier appended rows. Schema comparison visits the candidate value, as the prior serialization comparison did. Append still copies the distinct-key map and new row; full reads/snapshots/updates remain collection-sized. Reference-Mac 60 FPS impact is unmeasured. |
| G4 Failure containment | A changing parser result throws before creating a store. Failed coordinator loads now demonstrably leave nondefault slice value/version, world tick/discovery and RNG intact and can retry after a corrected slot. |
| G5 Defect reconciliation | The two verified final-review code findings are fixed in scope; the roadmap cost wording and test evidence gaps are corrected. The checked ledger reconciles, with five owned records still open until final closing evidence. Future Act/Observation integration and telemetry retry semantics remain with later owners. |
| G6 Scenario traceability | Two new domain regressions and strengthened coordinator assertions cover the relevant default, schema, versioned readback and failed-load scenarios. The 18-scenario matrix is change-wide closing evidence and will be refreshed after this task's approval and commit. |

Finite `-0` is JSON-equivalent to `0`, as recorded in Task 3.2's evidence and the accepted validation-only design. The raw plain-JSON contract does not promise preservation of the IEEE sign bit. The observation is retained, not silently discarded.

## Document integrity

The domain README and AGENTS now describe the registered fallback and structural validator comparison. Word counts are 873 → 891 and 763 → 795. The roadmap replaces its unqualified “O(1) append” with cost proportional to the new row and distinct keys, independent of existing rows. These are additions/clarifications; no owner wording, exemplar, inbox entry, historical review or planned system was cut or moved. `DESIGN_NOTES.md` status index, Where-facts-live ownership, State/saves, Seven primitives, design dispositions and later roadmap order remain unchanged because this task corrects shipped behavior and one roadmap cost sentence without changing feature status or ownership. Independent documentation fidelity/coherence dispositions belong in [task-5-2-reviews.md](task-5-2-reviews.md).
