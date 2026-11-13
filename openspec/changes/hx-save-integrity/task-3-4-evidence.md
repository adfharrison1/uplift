# Task 3.4 evidence — saved prop map identity

Status: implemented and independently reviewed in the default checkout; owner commit approval remains pending. Task 3.3 was committed as `3404225`, and its post-commit checkbox is included in this diff. The untracked 28-scenario matrix remains separate Task 4.1 work.

## Scope and observed checks

One domain source file changed. `WorldStateCodec.ts` now requires each saved prop map key to equal the validated prop's inner `propId`, on both encode and decode. The existing repository structural inspector therefore classifies malformed files as `invalid_snapshot`; direct invalid replacement rejects before writing, and coordinator load rejects before state publication. No reducer behavior changed. Paired domain README/AGENTS describe the shipped invariant.

Two new tests failed first (**2 failed, 25 passed**): codec encode accepted `door` containing `propId: alias`, and a real file repository listed `prop_gate` containing `propId: prop_alias` as readable. After the fix, `npx vitest run tests/unit/domain/WorldStateCodec.test.ts tests/unit/application/SimulationCoordinator/save-codec.test.ts tests/unit/infrastructure/FileSaveSlotRepository.test.ts` passed **46/46 in three files**. The file-backed consumer test checks listing reason, load rollback, prior RNG/slices/legacy, slot bytes, rejected direct replacement, corrected retry and an `update_prop_state` that changes only `prop_gate`.

Pinned Node 24.22.2 `npm run verify` with loopback access passed format **1,986 ms**, lint **1,427 ms**, typecheck **846 ms** and tests **17,152 ms** at the final task checkpoint. An earlier green run measured **1,949 / 1,660 / 841 / 17,772 ms** after Prettier corrected two formatting-only failures. Strict OpenSpec validation passed, checked defect reconciliation passed with **49 active, 30 resolved**, and `git diff --check` passed. These are current-host measurements; the 2019 Intel reference Mac was not measured.

## Task-scoped G1–G6

| Gate | Result and limit |
| --- | --- |
| G1 Consumer trace | Raw file candidate → repository structural inspection → codec prop-map check → unreadable `listSlots` result and rejected `loadSlot`; direct replacement stops before bytes change. Corrected file → coordinator load → `update_prop_state` → only the original keyed prop changes. The consumer test observes each step. |
| G2 Trust boundary | Untrusted serialized prop map keys and inner IDs must match before a decoded world is returned. The check uses exact strings after strict prop parsing; unsafe JSON record keys remain rejected by the existing plain-JSON boundary. |
| G3 Hot-path cost | One prop-map traversal is added to explicit encode/decode, and therefore save/load/list; it does not run in frame stepping or rendering. The final performance review must measure and bound host costs, while reference-Mac latency remains unverified. |
| G4 Failure containment | Invalid disk bytes remain unchanged; listing reports `invalid_snapshot`; failed load retains the existing world, slice store, RNG object/word and legacy export; failed direct replacement retains the valid slot bytes. A corrected slot loads and updates without a duplicate prop. |
| G5 Finding disposition | Final-review `F41-A3` (mismatched saved prop key/ID reaches a coordinator and redirects reducer writes) is fixed by this bounded task and [two independent task reviews](task-3-4-reviews.md) found no remaining issue. Closing ledger transitions remain pending. The earlier entity/epoch and telemetry findings keep their owners and evidence. |
| G6 Scenario traceability | `WorldStateCodec.test.ts` covers encode/decode key/value disagreement and input preservation. `SimulationCoordinator/save-codec.test.ts` covers file listing, load, direct replacement, rollback, corrected retry and reducer consumption; the existing file repository suite remains green. The change-wide 28-scenario matrix will cite these assertions after commit. |

## Document integrity

The domain README/AGENTS pair now states the prop map invariant where the shipped codec contract lives. The DESIGN_NOTES engineering status remains partial; Where-facts-live still assigns save policy there, the roadmap row preserves order, and dispositions and inbox entries are unchanged. No owner wording, exemplar, historical review or document block moved or was cut. Word counts before → after: domain README **1,132 → 1,137**; domain AGENTS **1,063 → 1,072**. Both independent reviewers checked fidelity and coherence.
