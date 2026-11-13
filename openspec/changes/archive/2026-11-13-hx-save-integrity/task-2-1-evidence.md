# Task 2.1 evidence — primary pack identity and declared imports

Status: implemented and independently reviewed in the default checkout; awaiting owner approval before commit. The task checkbox remains open. No defect transition is claimed.

## Scope and observed checks

Three source files changed: `EpochBlueprints.ts` requires pack ID, positive integer version and an explicit versioned import list; `EpochModuleRegistry.ts` binds one primary identity/epoch, accepts only declared same-target-epoch versions, closes direct registration after binding and rolls back failed transactions; `starterHoldPack.ts` authors its identity. Synthetic test packs now provide identities and imports. Paired domain, content and test guides and the shipped/planned status in `DESIGN_NOTES.md` were updated.

The first test run failed 5/5 new registry cases against the old API. After initial implementation, two new adversarial tests failed: a pack getter could call a public registration method during a transaction, and a blueprint getter could mutate the pack identity after validation. A module-private registration token and a transaction guard now reject callback-driven direct calls, while captured validated epoch, ID, version and import declarations determine the published identity. The final focused command passed **18/18 tests in 3 files** (`npx vitest run tests/unit/domain/EpochModulePackIdentity.test.ts tests/unit/domain/EpochModuleRegistry.test.ts tests/unit/content/StarterHoldStage.test.ts`; 211 ms on this host). The tests cover primary/cameo registration, duplicate/undeclared/wrong-version/wrong-epoch rejection, malformed/missing primary fields and import versions, every public direct method, failed primary/import rollback, corrected retry, the proving-pack identity and getter-based bypasses.

Final `npm run verify` with loopback access passed format **2,031 ms**, lint **1,922 ms**, typecheck **809 ms** and tests **18,328 ms**. Strict OpenSpec validation passed; checked defect reconciliation passed with **49 active, 30 resolved**. `git diff --check` passed. These are current-host measurements; the 2019 Intel reference Mac and per-registration cost were not measured.

## Task-scoped G1–G6

| Gate | Result and limit |
| --- | --- |
| G1 Consumer trace | `STARTER_HOLD_PACK` and synthetic pack inputs → `registerPack` → `getPrimaryPackIdentity` and blueprint getters → proving-pack coordinator/stage test. Registry identity is available to save creation; save envelopes do not yet consume it until the later identity task. |
| G2 Trust boundary | Authored pack identities, versions, import declarations and target epochs are checked before mutation. A module-private token distinguishes internal calls from public direct methods, including pack accessor callbacks. Malformed primary inputs and undeclared imports reject. Content code remains local/offline and epoch-agnostic in domain. |
| G3 Hot-path cost | Registration is an explicit setup operation. Validation and snapshots scale with declared imports and registered blueprint maps; no frame path changed. Focused/full-suite host durations are above; no reference-Mac or large-pack latency was measured. |
| G4 Failure containment | Failed primary/import registration restores blueprint maps and leaves retained identity unchanged. The corrected pack can register afterward. Direct methods reject on a bound registry and during a pack transaction; getter-injection tests cover both primary and cameo windows. |
| G5 Defect reconciliation | Review findings `T2.1-R1`–`R4` were fixed and independently rechecked in the review record. They are in-scope corrections to this task, with no new deferred defect. Change-owned ledger transitions remain assigned to the closing task; reconciliation passed. |
| G6 Scenario traceability | Primary/cameo, bad/missing identity, duplicate/undeclared/version/epoch, direct bypass, rollback and retry map to `EpochModulePackIdentity.test.ts`; existing unbound focused registration and proving-pack consumers map to `EpochModuleRegistry.test.ts` and `StarterHoldStage.test.ts`. Save-envelope identity scenarios remain assigned to later tasks, and entity-ID materialization remains task 3.1. |

## Document integrity

Domain and content README/AGENTS now describe the shipped pack contract and controlled import path. Tests README/AGENTS explain synthetic fixture identity, and the test inventory names the new suite. `DESIGN_NOTES.md` keeps the section **partial**, marks registry binding shipped, and leaves save-envelope enforcement, fingerprint reconciliation, owner save-policy wording and future materialization planned. The status index remains partial; Where-facts-live, roadmap ordering, dispositions and inbox are unchanged because their ownership did not change. No owner wording or blocks were moved or cut. Before → after word counts: `DESIGN_NOTES.md` 17,393 → 17,425; domain README 1,014 → 1,063, AGENTS 919 → 1,003; content README 302 → 343, AGENTS 407 → 468; tests README 1,290 → 1,313, AGENTS 1,516 → 1,534. Both independent reviewers checked fidelity/coherence; no remaining document finding was reported.
