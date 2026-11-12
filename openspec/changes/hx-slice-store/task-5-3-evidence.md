# Task 5.3 evidence — own-property slice copies and version lookup

Status: implemented and independently reviewed in the default checkout; owner commit approval remains pending. Task 5.2's checkbox is post-commit bookkeeping for `5811f9f` and is carried in this diff. Task 5.3 remains unchecked. The tenth task has an explicit size justification in `tasks.md`: two related final-review defects are corrected in one domain source file plus tests and paired docs.

## Scope and observed checks

- A valid input could lose fields, slice ids, version entries or appended rows when an inherited setter intercepted ordinary assignment or `Array.push`. Separately, an omitted version for the valid id `toString` read `Object.prototype.toString` and skipped migration. `StateSliceRegistry.ts` now builds private records without inherited properties and adds array entries as own data properties. The same helpers cover JSON copies, key lists, version maps, snapshots and append materialization. Version lookup therefore sees an absent entry as absent.
- TDD: six new focused cases failed against `5811f9f` (**6 failed, 47 passed**): object field loss, slice/version omission, prototype-named migration, sparse copied array/key list and two append-materialization index cases. After the one-file correction, `npx vitest run tests/unit/domain/StateSliceRegistry.test.ts tests/unit/application/SimulationCoordinator` passed **77/77 in five files**. An initial full run caught an empty test setter lint error; the helper now throws if production invokes it. Focused tests and lint reran green.
- Socket-enabled `npm run verify` after that correction passed format **1,670 ms**, lint **1,134 ms**, typecheck **539 ms**, tests **16,393 ms**. Strict OpenSpec validation passed; `npm run defects -- reconcile --check` passed with **51 active, 25 resolved**; `git diff --check` passed. No reference 2019 Intel Mac frame measurement was made.

## G1–G6

| Gate | Task result and limit |
| --- | --- |
| G1 Consumer trace | Caller JSON default/write → `copyJson` → frozen slice read and snapshot; registered versioned key → `fromSnapshot` with omitted sidecar → migration → loaded version; append node → `get` materialization. Coordinator repository/save/load tests remain green. No gameplay append consumer exists yet. |
| G2 Trust boundary | Inherited prototype setters cannot intercept private record or array entry creation. Valid prototype-named ids remain supported, and an omitted version does not consult inherited properties. Rejected unsupported JSON shapes still fail before publication. |
| G3 Hot-path cost | `appendSlice` still copies only the new row and distinct-key map and links prior rows. Own-index creation visits only new row elements; materialization/snapshot still traverse the full collection. Reference-Mac 60 FPS impact remains unmeasured. |
| G4 Failure containment | Valid values and historical saves no longer silently lose data or skip migration. Regression tests inspect frozen defaults, writes, raw snapshots, version maps and repeated cached reads after hostile inherited setters. Rejected invalid loads continue to leave the prior world/RNG unchanged in coordinator tests. |
| G5 Defect reconciliation | The final adversarial review's two related findings are fixed in this task and independently reviewed without remaining Task 5.3 findings. The checked ledger still reconciles; the five change-owned defects remain open until closing review and retained evidence. |
| G6 Scenario traceability | New cases reinforce default ownership, nonlossy plain-JSON writes/snapshots, correct omitted-version migration and append order/density. The change-wide 18-scenario matrix will be refreshed after this correction's approval and commit. |

## Document integrity

Domain README and AGENTS explain the corrected private-record/array and prototype-named-id behavior; word counts are **891 → 916** and **795 → 819**. No owner exemplar, inbox text, historical review, status index, Where-facts-live row, design disposition or planned system was cut or moved. Roadmap order and later owners remain unchanged. The update clarifies shipped domain behavior; the design notes' partial status and bounded-storage paragraph remain accurate. Independent fidelity/coherence review belongs in [task-5-3-reviews.md](task-5-3-reviews.md).
