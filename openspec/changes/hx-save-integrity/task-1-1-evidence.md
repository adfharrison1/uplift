# Task 1.1 evidence — versioned world snapshot codec

Status: implemented and reviewed in the default checkout; awaiting owner approval before commit. The task checkbox remains open. No defect transition is claimed.

## Scope and checks

Three source files changed: `WorldStateCodec.ts` (new), `EpochBlueprints.ts` (shared entity-ID utility) and the domain barrel. The new codec validates and owns the serialized world, excludes `StateSliceStore`, accepts only explicit versions 1 and 2, migrates version 1 by changing its marker on a fresh value, and compares inner epoch/tick with the caller's outer values. The validator utility is exported but is not yet applied to authored or loaded entities. The coordinator still uses its shallow guard until Task 1.2.

`tests/unit/domain/WorldStateCodec.test.ts` was written before implementation. Its first run failed 10/10 cases because the three public functions were absent. Later targeted RED→GREEN cycles reproduced loss from explicit `undefined`, own `__proto__` record keys, padded pillar IDs, orbital availability above capacity, and hidden/accessor root fields. The final focused run passed 15/15 tests (Vitest duration 187 ms on this host). The tests also exercise current and synthetic historical snapshots, nested entity/prop/pacing/pressure/orbital/cue/scar failures, version errors, outer epoch/tick mismatches, prop JSON rejection, determinism and input preservation.

`npm run verify` with loopback access passed format 1,783 ms, lint 1,769 ms, typecheck 848 ms and tests 17,055 ms. Strict OpenSpec validation passed. Checked defect reconciliation passed with 49 active and 30 resolved records. `git diff --check` passed. These are current-host measurements; the 2019 Intel reference-Mac target is not measured by this task.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | The exported domain codec is exercised by its focused tests. Repository → coordinator → live-world consumption remains **unverified** until Task 1.2; no end-to-end save claim is made. |
| G2 Trust boundary | Unknown snapshot input is copied as exact plain JSON before Zod parsing, so unsafe map keys cannot disappear. Strict nested schemas, explicit versions, prop-state copying, outer epoch/tick comparison and nontransforming pillar IDs reject malformed or lossy input. Character entity-ID enforcement remains Task 3.1. |
| G3 Hot-path cost | Codec work is confined to explicit encode/decode; no frame path changed. It traverses/copies the world more than once and scales with serialized world size. The focused suite duration above is measured, but per-call cost and the reference-Mac 60 FPS limit remain **unverified**. |
| G4 Failure containment | Failed decode throws before returning a snapshot; failed encode cannot produce an output. No coordinator state or repository bytes are touched in this task. Atomic live-load and slot-byte assertions remain assigned to Task 1.2. |
| G5 Defect reconciliation | Review findings `T1.1-R1`–`R4` were fixed and independently checked; see the review record. They refine the owned `S3-09-fields`/save-integrity work rather than introduce a new shipped defect. Existing owned ledger records remain active; reconciliation passed. |
| G6 Scenario traceability | The domain current/historical, corrupt, mismatch and JSON scenarios map to 15 focused tests. Repository round trip, coordinator publication, listing and pack identity scenarios are **unverified** here and remain assigned to later tasks. |

## Document integrity

Shipped domain API guidance was added to paired `src/domain/README.md` and `src/domain/AGENTS.md`; the README grew from 916 to 1,010 words and AGENTS from 819 to 915. Both state that coordinator integration and entity enforcement are pending. `DESIGN_NOTES.md` status index, Where-facts-live save-policy owner, roadmap row, design dispositions and inbox are unchanged because the end-to-end codec capability is still planned through Task 1.2. No owner wording, exemplar or historical review was moved or cut. The independent architecture reviewer checked placement and coherence.
