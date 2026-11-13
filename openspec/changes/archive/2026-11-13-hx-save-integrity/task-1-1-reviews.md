# Task 1.1 independent reviews

Two read-only reviewers received distinct high-reasoning, medium-to-high-model briefs before either saw the other's initial findings. Neither edited files. The controller verified each claim against source, watched a focused regression fail before each correction, reran the focused tests and full verification, and preserved their judgments below. This record does not grant owner commit approval.

## Correctness, edges and cost — `/root/save_task1_correctness`

Lens: nested validation, migration, lossless JSON, immutability, determinism, explicit-path cost, G2 and G4. The reviewer found `T1.1-R1` (high): Zod `z.record` silently dropped an own `__proto__` entity, prop or drive key before post-parse checking. It found `T1.1-R2` (medium): the reused pillar schema trimmed ID/holder ID and could change more than the version marker. It found `T1.1-R3` (medium): orbital `availableDelta > maxDelta` passed independently valid number checks. A source probe reproduced each. The reviewer rechecked the final code and found all three addressed: raw JSON copying precedes Zod, the codec-local pillar schema rejects padded IDs without transformation, and orbital availability is bounded by capacity. Focused tests passed 14/14 at that recheck; the controller later added one root-field regression for 15/15. No new concrete issue was reported.

## Architecture, adherence and documents — `/root/save_task1_architecture`

Lens: inward imports, Zod and TypeScript contracts, old coordinator field coverage, three-file cap, scenario evidence, paired guides, status/navigation and document fidelity. The reviewer independently reproduced `T1.1-R1` and `T1.1-R2`. Its recheck confirmed both corrections and found no field omission against `WorldState` or the previous coordinator snapshot. It noted `T1.1-R4` (minor): encode's root spread could omit nonenumerable or accessor fields before the JSON guard. The controller reproduced that with a failing test and replaced the spread with descriptor-based extraction, rejecting those fields without invoking accessors. The reviewer independently rechecked the final correction, confirmed the root path closed, the three-file cap held, and the focused suite passed 15/15. The paired guides truthfully describe a shipped domain API and pending coordinator use; no owner text or planned material was removed.

## Dispositions

| Finding | Trigger and disposition | Fix and evidence |
| --- | --- | --- |
| `T1.1-R1` | Own `__proto__` map key disappears through `z.record`; **fixed**, high, G2/G4. | `ownJsonRecord` checks raw encode/decode input before Zod. Regression covers entity, prop and JSON-parsed drive maps; focused 15/15 passed; both reviewers independently confirmed the main correction. |
| `T1.1-R2` | Authoring pillar schema trims saved IDs; **fixed**, medium, G2/G6. | Codec-local strict pillar schema uses nontransforming `ExactId`; regression covers pillar and holder IDs; focused 15/15 passed; both reviewers rechecked. |
| `T1.1-R3` | Orbital availability exceeds capacity; **fixed**, medium, G2/G4. | Cross-field Zod refinement rejects it on encode/decode; regression failed then passed; correctness reviewer rechecked. |
| `T1.1-R4` | Exotic root property could be omitted by encode spread; **fixed**, minor, G2/G6. | Descriptor-based root extraction rejects hidden/accessor/symbol fields before copying. Regression failed then passed; architecture reviewer independently rechecked. |

No unplanned task or unresolved design disagreement arose. The checked ledger has no transition for Task 1.1 before owner approval and durable commit evidence.
