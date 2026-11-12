# Task 2.1 independent reviews

Two read-only reviewers received distinct high-reasoning, medium-to-high-model briefs without seeing each other's initial reports. Neither edited files. Their findings were reproduced or checked against source, corrected within the approved task, and independently rechecked against the revised diff.

## Correctness, edges and cost — `/root/save_task21_correctness`

Lens: atomic registration, rollback, malformed inputs, direct-method bypass, determinism, G2/G4 and document fidelity. `T2.1-R1` (medium) found that a global transaction Boolean let a pack getter call a public direct method while `registerPack` was active, injecting undeclared blueprints. `T2.1-R2` (medium) found that identity fields were reread after validation, allowing a blueprint getter to alter the published identity. New real-registry regressions failed before the fix. The reviewer also noted `T2.1-R3`, missing/malformed version coverage. Its final recheck confirmed the module-private token, active-transaction guard, captured identity and expanded tests close those cases; focused tests passed 18/18. It found no remaining in-scope issue. Hostile same-process monkeypatching can intercept ordinary JavaScript methods and access TypeScript-private maps; that is outside this registration API boundary.

## Architecture, adherence and documents — `/root/save_task21_architecture`

Lens: inward dependencies, three-source-file cap, types, spec/design adherence, G1/G6, synthetic fixtures, paired guides and status/navigation. It independently confirmed `T2.1-R1`, found `T2.1-R3` (medium) for omitted ID/version and noninteger version cases, and `T2.1-R4` (low) because the tests README inventory omitted the new suite. The controller added runtime malformed-input cases, an invalid declared-import version case and the missing suite names. The final recheck found all findings resolved, the three-source-file cap intact and the shipped/planned document status coherent. Focused tests passed 18/18; no remaining architecture, coverage or document-integrity finding was reported.

## Dispositions

| Finding | Disposition and evidence |
| --- | --- |
| `T2.1-R1` | **Fixed.** A real getter-injection regression failed before the token/guard fix and passes for primary and cameo packs. Rollback and corrected retry are asserted; both reviewers rechecked. |
| `T2.1-R2` | **Fixed.** A getter-mutated identity regression failed before capture of validated primitives and passes afterward; correctness reviewer rechecked. |
| `T2.1-R3` | **Fixed.** New cases cover missing ID/version/imports, fractional and nonpositive versions and invalid declared-import versions; both reviewers rechecked. |
| `T2.1-R4` | **Fixed.** Tests README now includes the new registry suite and prior codec suite in its domain inventory; architecture reviewer rechecked. |

No unplanned task or unresolved disagreement arose. Owner approval is still required before this task's commit.
