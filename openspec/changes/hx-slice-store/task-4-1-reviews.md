# Task 4.1 independent reviews and dispositions

Two reviewers received separate high-reasoning, medium-to-high-model briefs. Neither edited files or saw the other's initial conclusions. The controller reproduced their concrete findings, applied corrections and ran focused and full checks. The owner's commit instruction is separate from these judgments.

## Correctness, adversarial behavior and cost — `/root/slice_task_4_1_correctness`

- `T4.1-R1` (medium, G2/G4): explicit descriptor `version: null` was treated as omitted by `?? 1`. The reviewer reproduced acceptance through definition and registration. Fixed with an undefined-only default and a runtime regression for both paths; the focused suite passes.
- `T4.1-R2` (low, G6): a historical save with no custom-slice container had an implementation branch but no coordinator consumer assertion. Added a repository/coordinator test that loads such a slot into a previously populated session and observes an empty store and default value. The focused suite passes.
- The reviewer found no further migration, version-map, passthrough or rollback defect. The State/saves design paragraph preserves the former intent and leaves codec and pack identity planned; the status-index edit is scheduled in Task 5.1.

## Architecture, adherence, coverage and document coherence — `/root/slice_task_4_1_adherence`

- Independently found `T4.1-R1` through the same explicit-null descriptor path. After correction, the reviewer ran the null-version regression and saw one pass.
- `T4.1-R3` (low, document integrity): the rewritten domain README omitted the prior explicit accepted JSON value list and weakened “deeply frozen” to “frozen.” The list and wording were restored. The reviewer confirmed the corrected guide and a clean diff.
- The reviewer found no remaining layer, type, spec, consumer or document conflict: exactly three production files changed; no outward import or `any` was added; the save/legacy suite retained its unrelated atomic-load assertions. State/saves wording, planned codec and pack identity, navigation ownership and the Task 5.1 documentation assignments remain coherent.

## Controller findings and final disposition

- `T4.1-C1` (medium, G6): a version-1 value loaded under a version-3 key called the one-step callback twice, once per intermediate version. A regression failed against the loop. The callback now runs once with the saved version and its output is checked against the declared current schema; the regression passes.
- `T4.1-C2` (medium, G2): the first `updateSlice` on a registry-bound store used a structural caller key's constraints instead of the registered schema/version. A regression failed before correction. `updateSlice` now takes the registered constraints when present; invalid output is rejected and a valid update stores version 2.

All five findings are fixed in Task 4.1; `T4.1-R1` was independently reported by both reviewers. No disagreement or deferred task-local finding remains. Full verification and defect reconciliation passed after the corrections. Bridge HTTP preservation and final reference-Mac limits remain for later scheduled checkpoints.
