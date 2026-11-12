# Task 3.1 evidence — frozen shared slices and persistent append

Status: implemented in the default checkout with owner approval to commit. The Task 3.1 checkbox remains open until the commit; Task 2.1's post-commit checkbox is carried in this diff. Findings `T3.1-R1`–`R4` are disposed in [task-3-1-reviews.md](task-3-1-reviews.md). No defect-ledger transition is claimed; `S3-01` and `S3-17-slices` remain owned by this change's closing task.

## Checks and cost

- TDD: baseline slice suite 4/4; new contract tests failed 7/9 against the original store and passed 9/9 after implementation. Reviewer regressions for structural default ownership and runtime-private materialization failed 2/11 before correction, then passed. Three changing-id regressions failed 3/14 before correction, then passed 14/14. The focused `npx vitest run tests/unit/domain/StateSliceRegistry.test.ts` final run passed 14/14.
- Final socket-enabled `npm run verify` passed format (1,711 ms), lint (1,352 ms), typecheck (729 ms), and tests (17,934 ms). A prior run passed lint/types/tests but flagged test formatting; Prettier correction preceded the final run. Reviewer sandbox runs could not bind loopback (`EPERM`), so their full-run results are not claimed as passes. `npm run defects -- reconcile --check` passed: 51 active, 25 resolved. `git diff --check` passed.
- Source-level check: `appendSlice` copies the distinct-key map, owns/freezes only the new row, and links an append node to the previous entry. For a factory-defined default or an already stored collection it does not traverse earlier rows: O(distinct keys + new-row graph). Unset structural descriptors must first use `defineStateSlice` or `withSlice`; their default is not trusted as an append base. First `get` iteratively materializes O(base rows + appended rows), cached `get` returns the same frozen reference, snapshot clones the full value, and general `updateSlice` remains a whole-value transform. Retaining and reading many historical stores can retain a flat array per store.
- Local Node 24.22.2, darwin/arm64, 5,000 existing rows: mean append 0.0016 ms (500 runs), first read 0.0140 ms (50), snapshot 1.5965 ms (20), full-value update 1.2911 ms (20). These are host measurements, not the 2019 Intel reference Mac or a 60 FPS guarantee.

## G1–G6

| Gate | Task result and limit |
| --- | --- |
| G1 Consumer trace | Typed key/default or write → `StateSliceStore` → stable `get`/ordered `toSnapshot` in the focused tests. The existing `set_state_slice` reducer writes through `withSlice` into `WorldState`; coordinator save/load uses the snapshot. No gameplay append consumer exists yet, so append is verified at the store consumer only. The versioned repository/bridge path belongs to later tasks. |
| G2 Trust boundary | Raw constructor arguments are rejected, trusted internal construction and materialization are JavaScript-private, and writes/defaults are private deep-frozen copies. Structural descriptors get an owned first-read fallback; unset structural append defaults are rejected. Changing `id` accessors are resolved once per operation. Plain-JSON/schema rejection remains Task 3.2. |
| G3 Hot-path cost | Source-level bound and measurements above; a full read/snapshot remains proportional to collection size. Reference-Mac frame impact is unverified. |
| G4 Failure containment | Rejected raw construction and unowned append leave prior stores untouched; tests retain old rows across writes and append, and caller mutation cannot alter a published collection. Malformed JSON/migration rollback awaits later tasks. |
| G5 Defect reconciliation | Four review findings were fixed in scope and independently rechecked; see review record. Checked ledger reconciliation passed. Existing slice defects remain active until all owned scenarios and final evidence are complete. |
| G6 Scenario traceability | Focused tests cover default identity/ownership, frozen write and nested descendants, raw construction, 5,000-row order/identity, iterative chain, snapshots and full-value update, plus structural/cache adversarial cases. JSON, row schema, versions and coordinator recovery scenarios remain assigned to Tasks 3.2 and 4.1. |

## Document integrity

Shipped contract guidance changed in both domain guides (README 742 → 806 words; AGENTS 567 → 639). No owner wording, design paragraph, inbox entry or historical review was moved or cut. The status index remains partial and roadmap ownership stays `hx-slice-store`; Where-facts-live ownership and disposition rows are unchanged. `DESIGN_NOTES.md` still describes the former clone-on-every-read implementation in State/saves and Seven primitives; its two planned reconciliations are explicitly assigned to Tasks 4.1 and 5.1. The paired guides describe only shipped behavior and avoid claiming the still-pending JSON/schema/version work. Both independent reviewers checked placement, preservation and coherence.
