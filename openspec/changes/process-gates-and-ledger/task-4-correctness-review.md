# Task 4 independent correctness review

Reviewer: task4_correctness, high reasoning, medium-to-high model. Reviewed the frozen shared module, focused tests and package wiring against task 4, design sections 3–5 and the defect-ledger/roadmap-graph deltas. This is the initial core review; live seed, documentation and final verification await the controller's addendum. No source, tests or live ledger were changed by this reviewer.

Result: three reproduced major defects require disposition before approval. Normal lifecycle/replay cases passed the existing suite. The archive wrapper itself belongs to task 5; the findings below affect the already implemented shared primitives and checked consumers.

## T4-C1 — Cancellation can strand an unrecoverable journal

- Severity: major; gates G1/G4/G6.
- Location: `scripts/project-status.mjs`, `cancelArchive`, lines 1057–1058 in the reviewed snapshot; recovery requires a receipt at lines 1038–1042.
- Trigger: interrupt cancellation, or fail its second unlink, after the generated receipt was deleted but before the journal was deleted. The original ledger, roadmap and active change remain intact.
- Reproduction: prepare a zero-defect archive in an isolated fixture, remove only its receipt to reproduce that exact durable intermediate state, and invoke cancel, repair, resume and reconciliation.
- Observed consumers: cancel, repair and resume all report `RECEIPT: missing receipt alpha`. Check reports `RECONCILE: pending journal missing receipt alpha; pending finalization: alpha`. Supported mutations remain blocked. Clearing a stale process lock does not resolve this orphan journal.
- Required behavior: interruption during cancellation must retain an explicitly recoverable state. Removing the journal before the receipt would leave the already supported orphan-prepared-receipt state; recheck conflicts before each removal. Add a failure-boundary regression proving retry and a subsequent unrelated mutation work without manual ledger/journal surgery.

## T4-C2 — A receipt in the wrong change directory satisfies reconciliation

- Severity: major; gates G1/G2/G4/G6.
- Location: `scripts/project-status.mjs`, `readReceipts`, lines 836–847; reconciliation indexes receipts by the payload's `change_id` without checking their containing directory.
- Trigger: successfully finalize alpha, then move alpha's finalized `defect-resolution.yaml` into the active beta directory. Alpha's roadmap still points to its now-missing archive receipt.
- Reproduction: zero-defect alpha archive created through prepare/move/repair; relocate its receipt with `renameSync`; run the real `execute(root, ['defects', 'reconcile', '--check'])` consumer.
- Observed result: `{"ok":true,"active":0,"resolved":0}`. Alpha's actual referenced receipt is absent, yet the missing-receipt contract is reported satisfied.
- Required behavior: bind each receipt's payload identity to the exact discovered containing change identity/path before accepting it. Cover misplaced prepared and finalized receipts, including a zero-defect archive, and ensure rejected recovery preserves files.

## T4-C3 — Accepted repository evidence can break on archive relocation

- Severity: major; gates G1/G2/G4/G6.
- Location: `scripts/project-status.mjs`, `validateReference`, lines 651–670.
- Trigger: supply a tracked file under `openspec/changes/alpha/` using a `kind: repo` locator. Verification and archive preparation both accept it. Archive then moves the file, while history and receipt retain the old repository path.
- Reproduction: use the supported add and transition commands to verify D with a correct digest for `openspec/changes/alpha/proof.md`, tagged `repo`; prepare alpha, move it to `archive/2026-01-01-alpha`, and invoke repair and combined listing.
- Observed consumers: both repair and combined listing fail with `ENOENT .../openspec/changes/alpha/proof.md`. The receipt reader validates evidence before recovery can advance, leaving the prepared transaction stuck despite entirely supported inputs.
- Required behavior: enforce relocatable change locators for evidence inside an active change (or provide an equally explicit safe relocation policy), before recording verification. Check fix/test/review/supplementary references and graph delivery references through their shared validation boundary. Add the actual archive/list/reconcile consumer regression; the existing positive test uses the correct `change` tag and misses this accepted-input failure.

## Evidence and limits

The executable scratch reproducer is `/tmp/task-4-correctness-probe.mjs`; run `node /tmp/task-4-correctness-probe.mjs`. It imports the live module, creates isolated temporary repositories/directories, exercises real command consumers, prints the results above and removes every fixture. It does not edit the live ledger or source. The crash window is reproduced by constructing the precise intermediate disk state, not by probabilistic process timing. These results were obtained twice before recording this report.

`npx vitest run tests/unit/tooling/ProjectStatus.test.ts`: 80/80 tests passed, one file, reported duration 5.96 seconds (6.51 seconds tool elapsed). This establishes the current suite does not catch the three cases. Full verification is the controller's final task checkpoint; this report does not claim it passed. Hardware was not identified as the reference Intel Mac, and no target-hardware performance guarantee is asserted.

Reviewed strict schemas, all legal/no-op transition handling, replay identity and provenance, verified-update restrictions, owner checks, evidence digests/Git environment sanitation, static path and symlink refusal, lock/hash behavior, deterministic selection, receipt snapshots, pending consumer visibility and finalization sequencing. No additional concrete blockers were established in that bounded inspection. Concurrent malicious filesystem swaps and power-loss directory durability were not experimentally exercised; the documented limitation for arbitrary editors ignoring the lock remains relevant. Pure validators' default no-op evidence callbacks are not proof of evidence existence; checked filesystem consumers do perform those checks.

## Independent fix re-review

Result: **pass for the scoped fixes and additive-guide fidelity review**. Initial findings above remain retained as evidence; T4-C1, T4-C2 and T4-C3 are now independently verified fixed. No additional substantive defect was established in this re-review. This is not owner approval, archive-wrapper verification or a claim that all delivery gates are complete.

Reviewed frozen fingerprints:

- `scripts/project-status.mjs`: `7b523ffc6d440d8cf238cbdd1b82e89eff61bd924b458274538c69bb40ef4c96`.
- `tests/unit/tooling/ProjectStatus.test.ts`: `f7c70d43d1a4180d1f1635b5c6bc81227abd0a4f93b513b37b687b47b2ea5d8a`.

Both hashes were rechecked against the frozen files and match the retained [fix evidence](task-4-fix-evidence.md).

T4-C1: cancellation removes the journal first, retaining an intact prepared receipt if interrupted. It verifies the journal hash before deletion, then reloads ledger/roadmap/inventory and rechecks affected-file preimages and receipt hash before deleting the receipt. The regression `recovers cancellation interrupted between journal and receipt removal` injects an exception at that boundary, demonstrates pending mutation rejection, retries cancellation and successfully adds another defect. `preserves an external receipt edit between cancellation removals` proves changed receipt bytes survive a conflict. Additional independent temporary-fixture probes changed each of ledger, roadmap and the active proposal after journal removal: every case returned `CONFLICT: transaction preimage conflict; preserve edits and inspect before recovery`, retained the exact edited bytes and retained the receipt. A separate probe interrupted cancellation, resumed to `prepared`, canceled to `canceled`, then obtained reconciliation `{ ok: true, active: 0, resolved: 0 }`.

T4-C2: `readReceipts` now compares each physical receipt path with the unique path implied by its payload's change identity. The finalized zero-defect relocation test exercises real reconciliation and fails; the prepared relocation test exercises cancellation and verifies receipt bytes plus journal remain. Identity binding covers both receipt states before checked consumers can accept or remove them.

T4-C3: the shared locator schema rejects repository locators beneath movable active-change paths and directs callers to use change locators. Stable archive paths remain allowed. Regressions cover fix references, test records, review records, supplementary evidence and done-by-review delivery references. Rejected verification leaves revision 2 and in-progress status intact. The existing positive relocation test still completes prepare/move/repair and returns the resolved record through combined listing, establishing that valid change locators remain usable.

The new independent-process writer test starts two Node children, waits for both ready markers, releases both against ledger revision zero, then asserts exactly one success and one lock/revision failure. It checks ledger revision one, one retained entry and exact final bytes via the successful writer's digest. It uses real supported commands and filesystem locking, with Git overrides removed and child cleanup registered. This establishes the at-most-one-success contract; it does not require a particular scheduler interleaving or force the losing process to encounter the lock rather than the later revision check. The separate held-lock test covers deterministic lock contention.

Independent execution: `npx vitest run tests/unit/tooling/ProjectStatus.test.ts` passed **90/90**, one file, reported duration **7.02 seconds**, tool elapsed **7.51 seconds**. This measured duration exceeds the documented under-three-second suite target, and it is not a reference-Mac measurement. The controller separately reported full verification PASS with its test phase at 8,394 ms; that is controller evidence, not a full verification run performed by this reviewer. Performance targets must not be reported as achieved on this evidence.

## Additive guide fidelity and no-loss check

Compared the root/tests guide edits with the Git baseline, inspected the exact diff, and checked their claims against package wiring and the reviewed code/tests. No owner wording, existing guardrail, shipped capability or planned-work distinction was cut. The wrapper is explicitly described as separate work; the receipt tests accurately disclose their direct synthetic moves. No new live change citation was added to these guides.

| File | Baseline-to-current mapping | Words before → after |
| --- | --- | --- |
| Root AGENTS | Every previous line retained; one local-status section inserted, pointing to the command guide | 886 → 961 |
| Root README | Existing material retained except the lint command's single-file target, replaced with the actual `scripts` target from package.json; command/lifecycle guidance appended | 907 → 1,463 |
| Tests AGENTS | Entire previous document retained verbatim; temporary-fixture and consumer requirements appended | 938 → 1,022 |
| Tests README | Entire previous document retained verbatim; actual project-status coverage and wrapper limits appended | 798 → 894 |

Root AGENTS remains below its 1,050-word ceiling. Guidance remains in shipped-capability homes; the changes do not introduce a design decision, feature document, owner-wording move or inbox disposition. This narrow fidelity review did not amend design navigation. Coherence/navigation and seed disposition review belong to the controller's other reviewer and final task record. The two reviewers' conclusions were not shared during this independent review.

Final documentation recheck: the nine-word addition “Files beneath active changes must use a change locator.” accurately describes the verified T4-C3 validation rule. The README count above includes it. No implementation changed or retest was required; this report is now frozen.
