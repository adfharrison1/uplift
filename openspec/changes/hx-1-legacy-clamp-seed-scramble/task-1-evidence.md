# Task 1 evidence — fresh RNG seed mixing

Status: implemented and reviewed in the default checkout; awaiting owner approval before commit. Task 1's checkbox remains open. No ledger defect is transitioned by this task.

## Scope and observed checks

- `SeededRandom` mixes only fresh validated integer seeds with the specified 32-bit finalizer. `fromState` restores a validated raw nonzero word. The existing Xorshift step and public draw APIs remain in place.
- The paired domain guides and the seed paragraph in `DESIGN_NOTES.md` describe this shipped behavior. The test file pins four initial-state vectors, wrapped/negative normalization, mixed-zero fallback and raw-state continuation alongside the existing sequence and rejection tests.
- TDD in the implementation session: the focused suite initially had six expected failures with the new assertions, then passed 12/12 after implementation. This records that session's red/green observation; the current checkpoint rerun is below.
- `npx vitest run tests/unit/domain/SeededRandom.test.ts`: **PASS**, 1 file, 12 tests; Vitest duration 91 ms, command wall time 0.67 s. Initial states for seeds `0`, `1`, `2`, `42` were `0x92ca2f0e`, `0x96a0f96b`, `0xb4421bbb`, `0x3805ea2c`; seed `0x61c88647` used fallback `0x6d2b79f5`.
- Final `npm run verify` after document-review fixes, with loopback access: **PASS**; format 1,276 ms, lint 1,275 ms, typecheck 785 ms, tests 17,171 ms; command wall time 17.36 s on this host. This is an observation, not a reference-Mac performance claim.
- `npm run defects -- reconcile --check`: **PASS**, 53 active and 22 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Verified direct path: numeric seed → constructor/mixer → `getState` and draws → unit assertions; saved word → `fromState` → next draws → continuation assertions. The coordinator's save/load consumer remains unverified until Task 3. |
| G2 Trust boundary | Verified for numeric inputs: noninteger/nonfinite seeds and invalid serialized words throw `RangeError`; valid negative/wrapped integers normalize to uint32. No external data source or authority change is introduced. |
| G3 Hot-path cost | The mix runs once per fresh construction, with constant 32-bit arithmetic and no allocation beyond the generator. Draw cost remains unchanged. Focused/full command timings are above; reference-Mac profiling is unverified. |
| G4 Failure containment | Invalid inputs reject before an instance exists; a mixed-zero word uses the nonzero fallback. The test confirms deterministic subsequent draws. Coordinator load failure containment is Task 3. |
| G5 Defect reconciliation | The two task reviews found no code defect. Document findings `DOC-T1-01` and `DOC-T1-02` were fixed in scope and independently rechecked; the checked ledger reconciliation passed. `S3-08-seed` and `S3-17-clamp-rng` remain active until closing evidence binds all required fix, test and review references. |
| G6 Scenario traceability | Reproducible 100-value sequence, raw state continuation, four vectors, normalization/rejection and mixed-zero fallback are asserted in `SeededRandom.test.ts`. The domain/content ambient-randomness ban is covered by architecture tests in full verify. Coordinator save/load continuation is explicitly unverified here and assigned to Task 3. |

## Document integrity

Canonical shipped guidance is in `src/domain/README.md` and `src/domain/AGENTS.md`; the change contract remains in OpenSpec. The additions preserve existing text and remove no owner wording, exemplar or planned system. Scoped word counts: README 689 → 702; AGENTS 476 → 498. `DESIGN_NOTES.md` status index and Where-facts-live table, roadmap row and design dispositions were checked. The status row remains partial and now names shipped seed scrambling while retaining remaining hardening as planned. The design section heading changed from planned to partial, and its seed sentence was corrected to mark the constructor mix shipped. A short status sentence keeps every other bullet planned; the old sentence's keyed-roll plan remains verbatim in the new sentence. The legacy clamp remains planned for Task 3. No new design file, navigation link, document move or broad cut is involved. Independent document-integrity judgments are in [task-1-reviews.md](task-1-reviews.md).
