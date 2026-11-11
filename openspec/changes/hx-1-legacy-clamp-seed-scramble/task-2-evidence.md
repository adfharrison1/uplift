# Task 2 evidence — pure runtime legacy resolution

Status: implemented and independently reviewed in the default checkout; awaiting owner approval before commit. The Task 2 checkbox remains open. The uncommitted Task 1 checkbox records its already approved commit `4ce6794`.

## Scope and observed checks

- `CivilizationLegacyState.ts` now shares one ordered mutation engine between strict `applyLegacyToCharacterBlueprints` and pure `resolveRuntimeLegacyCharacterBlueprints`. The latter returns resolved characters and deterministic `LegacyDriveClampNote` data. Only finite final drives are saturated to `[0, 1]`; non-finite intermediate arithmetic, conflicting overrides, unknown targets, malformed intervals and negative final pillar weights still reject. The domain barrel exports the new API.
- TDD: five new runtime tests first failed because the resolver was absent; after implementation the focused suite passed 9/9. Reviewer-requested test strengthening remained green and was independently rechecked.
- `npx vitest run tests/unit/domain/CivilizationLegacyState.test.ts`: **PASS**, 1 file, 9 tests, Vitest duration 130 ms, command wall time 0.47 s.
- `npm run verify` after review fixes with loopback access: **PASS**; format 1,545 ms, lint 1,510 ms, typecheck 986 ms, tests 16,534 ms; command wall time 16.70 s on this host. This is measured host time, not a reference-Mac claim.
- `npm run defects -- reconcile --check`: **PASS**, 53 active and 22 resolved. `git diff --check`: **PASS**.

## Task-scoped G1–G6

| Gate | Disposition and evidence |
| --- | --- |
| G1 Consumer trace | Verified domain path: lineage mutation input → shared ordered resolver → strict throw or runtime `{ characters, clampNotes }` → unit assertions for transformed blueprints and four notes across two successors. Coordinator world/telemetry consumers are assigned to Task 3 and remain unverified here. |
| G2 Trust boundary | `CivilizationLegacyStateSchema.parse` rejects malformed intervals and values; explicit checks reject conflicting overrides, unknown drive/pillar targets, intermediate non-finite arithmetic and final negative pillar weight. Tests cover `toString` as a drive key. |
| G3 Hot-path cost | Resolution runs at construction/load, outside the frame loop. Grouping is linear in mutations; each matching blueprint copies drives/pillars and walks its lineage mutations, with pillar lookup linear in that blueprint's pillar count. Focused/full command times are above; reference-Mac profiling remains unverified. |
| G4 Failure containment | Invalid mutations throw before returning any character array or notes. Tests compare input snapshots after failures and repeat resolution against frozen input. Publication into coordinator state is Task 3. |
| G5 Defect reconciliation | No code defect was found. Review test findings `T2-TEST-01` (nested targets not frozen) and `T2-TEST-02` (one affected character only) were fixed and independently rechecked. The checked ledger reconciles; runtime clamp defect transitions remain for closing Task 4 after consumer evidence. |
| G6 Scenario traceability | Existing tests retain ordered mutation, strict high/low rejection, conflicts and unknown targets. New runtime tests assert high/low saturation, four ordered notes for two matching characters, unrelated reference preservation, two same-sign adds on frozen inputs, in-range boundaries/later clamp with no note, invalid interval rejection, and non-finite drive/pillar arithmetic masked by later clamp/override. Coordinator startup/load/warning scenarios remain Task 3. |

## Document integrity

The canonical shipped API description is in the paired domain guides; the approved contract remains in OpenSpec. README word count changed 702 → 742; AGENTS 498 → 567. Existing helper names and planned material were retained. `DESIGN_NOTES.md` status index and Where-facts-live table, roadmap entry and dispositions were checked and remain unchanged: the overall legacy clamp still needs coordinator wiring in Task 3. No document move/cut or new design file was made. The two reviewers independently checked documentation fidelity and coherence; their dispositions are in [task-2-reviews.md](task-2-reviews.md).
