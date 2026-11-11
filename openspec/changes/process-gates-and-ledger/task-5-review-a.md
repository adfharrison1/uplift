# Task 5 reviewer A — pre-cut skill fidelity

Result: **PASS for the proposed skill cuts only.** No blocking fidelity finding. This is not implementation, final-document, G1–G4 or delivery approval. The implementation was moving during this checkpoint and was deliberately not audited. Reviewer A worked independently without reviewer B's conclusions, with high reasoning and the inherited medium-to-high capability model. Baseline: `1f104e0`.

## Inputs and exact preservation

Read root AGENTS, the review-gates skill and its delivery/document-integrity references, approved task 5, design section “Serialized writes and recoverable archive”, the defect-ledger delta spec, both existing skills, the cold-operator baseline, proposed scratch skills and their no-loss map. Checked DESIGN_NOTES' canonical-home table, status index, pillars and rules spine for placement. No design decisions or owner wording are changed by these workflow replacements.

An independent Python substring comparison confirmed verbatim retention in the proposed archive skill of its frontmatter, the full block from “Store selection” through Input, and the entire “Select the change” block including advisory archive instructions. The proposed apply skill's entire tail from “Uplift worktree policy” is byte-for-byte identical to the existing skill. Its only diff is the delivery-gates signpost's checked-command, reconciliation and immutable-evidence integration.

- Selection preserves explicit names, contextual inference, sole-active selection, ambiguity prompts, active-only candidates, schema display and the announcement/override instruction (proposed archive lines 34–48).
- Root-null and declared-store error branches, sticky scope during discovery and no implicit setup remain intact (lines 19–30). The added local-wrapper restriction (line 17) is authorized by design section 5 and the spec scenario “CLI resolves an external store”; it does not authorize silently retargeting another repository.
- Optional archive-instructions lookup failure remains nonblocking. Required prompt-level context, optional additive guidance, controlling-input precedence, conflict reporting, no inferred flags/paths and no unsolicited verbatim copying remain intact (lines 50–77).
- Default-checkout policy, per-task owner approval before commit, checkbox-after-commit precedence, schema-returned context/task paths, blocked/all-done behavior and scope escalation remain intact in apply. The new signpost names the actual checked mutation and reconciliation commands without inventing a new status or weakening review evidence.
- Archive approval remains separate from implementation/commit approval, and existing explicit archive permission is preserved without asking again (lines 15 and 87–89). The wrapper invocation remains after that approval (lines 91–99).

## Justified supersession

The no-loss map correctly identifies these changes as supersession by the approved transaction design, not verbatim preservation:

- Incomplete-artifact/task warning overrides become completion blockers. Schema-defined tasks remain authoritative, including nonstandard paths and zero-task states; missing `tasks.md` is not completion evidence (line 81). The wrapper's exact list/count checks remain an implementation-review obligation.
- Manual sync prompts, agent-authored merge rules and inline-sync verification are replaced by one installed full validated CLI archive. This follows design section 5's exact-once synchronization contract and prohibition on skip-validation/spec flags. The proposed skill still assesses status-returned deltas, full capability paths and intended changes, and stops on prior manual sync or unclear state (lines 32 and 83). The old detailed merge instructions do not remain as a competing archive authority. Actual CLI output preservation still requires the planned real-CLI smoke evidence.
- Manual directory creation/move and computed archive destinations are delegated to the wrapper/CLI, with actual returned paths and consumer readback required before success (lines 95–101). The approved receipt/journal protocol replaces a bare filesystem move as proof of defect resolution.
- Recovery preserves pending evidence and uses explicit resume, cancel or repair; it forbids rearchiving after the move, fabricated receipts, history edits, legacy-exemption expansion and overwriting external edits (lines 103–109). These requirements match design section 5 and the recovery/receipt spec scenarios.

No accepted user choice is silently discarded: unsupported old archive alternatives are explicitly superseded by the approved strict wrapper contract. The standalone sync workflow is outside this edit.

## Evidence and limits

Reviewed scratch SHA-256 values:

| Input | SHA-256 |
| --- | --- |
| `task-5-archive-skill.md` | `4f4d61016d07c8d40f2c7b7f4a41b9899ae475bb8ddb238f7fb1cca1c3a99f29` |
| `task-5-apply-skill.md` | `246de906ab2da9efc662420981f68355cbb524eaa49020a890c00793e3dba134` |
| `task-5-skill-no-loss.md` | `71edba911d4f3c50f59357e4b378f19a94d0728f50a4c82a7587e983dcc784c6` |

This review permits the proposed cut from a fidelity perspective. Final links, command contracts, wrapper enforcement, installed-CLI behavior, cold-operator scenarios and verification results remain to be checked against the frozen implementation. No final G1–G6 claim is made here. Full task verification belongs to that later checkpoint; this report is formatted independently before retention.

Canonical placement: this review is retained with its OpenSpec change. The design status index, Where-facts-live table, roadmap ordering and design dispositions remain unchanged because this checkpoint records evidence and introduces no capability or planning decision. Existing immutable evidence, skills, implementation and ledger were not edited by this reviewer.

## Frozen implementation review

Result: **PASS within reviewer A's correctness, recovery, boundary, performance and final-document fidelity scope.** No new production defect or blocking documentation finding. This supplements the pre-cut report above; it does not replace owner approval, reviewer B, the controller's full verification or the six delivery reviews.

Inspected `scripts/archive-change.mjs`, the complete task diff in `scripts/project-status.mjs`, package wiring, `ArchiveChange.test.ts`, shared receipt/recovery functions and final installed archive/apply skills. Read the paired root/test guides, the DESIGN_NOTES canonical-home correction, retained normal/dated/empty CLI logs, controller smoke and corrected pre/post-move logs. Did not inspect reviewer B's conclusions. No implementation, ledger, historical proof or skill edits were made.

### Independent execution and defect verification

Ran the scoped command with the pinned Node runtime:

```text
/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin/node node_modules/vitest/vitest.mjs run tests/unit/tooling/ArchiveChange.test.ts -t 'date|identity|recovers failure after|nonzero exit after move|preimages immediately'
Test Files 1 passed (1)
Tests 46 passed | 10 skipped (56)
Duration 8.04s
Exit 0
```

The filter also matches the “validated archive wrapper” suite, so the executed scope includes its preflight, trust-boundary and recovery checks. Independently inspected the controller's retained `task-5-tests.txt`: 146/146 focused wrapper/shared tests passed in 11.35 seconds. Full verification remains the controller's checkpoint; it was not repeated by this reviewer.

**T5-C1 independently verified fixed:** the baseline log retains the real installed-CLI failure `REFERENCE: missing change 2026-01-02-alpha`. `mappedInventory` now resolves archive names against declared full and once-stripped roadmap IDs, refuses both-candidate ambiguity, and validates supplied mappings instead of trusting them. Consumers use `archiveChangeId`, including graph/ledger validation, change-path resolution, receipt discovery, reconciliation and recovery. `archiveDestination` rejects ambiguous or invalid-calendar destinations before any CLI call or receipt preparation. The dated unit tests and retained real-CLI dated log reach finalized receipt, resolved listing, reconciliation and linked reopening with the original date-prefixed ID unchanged. This is fix/test/independent-review evidence for the controller's checked ledger transition; the reviewer did not mutate that record.

### G1–G4 record

| Gate | Result and evidence |
| --- | --- |
| G1 consumer trace | Verified: installed archive skill → `change:archive` script → wrapper `execute`/`preflight` → shared receipt preparation → one full CLI archive → shared repair → `consumerReadback` → combined list, reconciliation and roadmap. `task-5-controller-smoke.txt` contains actual generated main-spec structure and resolved/reopen assertions. Dated and empty logs cover identity and zero-defect outcomes. CLI exit success alone does not establish completion. |
| G2 trust boundary | Verified for the named adversarial axes: unsafe IDs/options, external selected roots, unsafe/symlink paths, malformed schema task counts, incomplete work, missing/duplicate/stale review evidence, occupied atomic-write sentinels and lock contention. `rootsAndStatus`, `completed`, `finalReviews`, `safePath` and the shared lock fail closed. The installed CLI uses argument arrays and bounded captured output, with telemetry/privacy opt-outs; the installed version-check implementation also honors those opt-outs. Approval and semantic reviewer independence remain workflow responsibilities, as documented. |
| G3 hot-path cost | Verified by inspection that this is synchronous, operator-invoked tooling outside the simulation/render loop. CLI output capture is bounded at 1 MiB per invocation. Work includes several complete state reads/scans, evidence Git checks and preimage snapshots; it is not constant-cost and is not claimed as a 60 FPS operation. Measured test timings above exceed the reference suite/verification aspirations; they are reported, not disguised as passing timing assertions. Reference-Mac throughput and large-repository scaling are unverified; no task-local runtime performance regression was established. |
| G4 failure containment | Verified through executed fault-injection tests at prepared receipt, journal, ledger, roadmap, finalized receipt and journal removal boundaries. Pending listings retain IDs after active-row cleanup; repeated repair preserves one resolution event. Pre-move resume rechecks completion and exact preimages, cancellation refuses changed bytes/after-move state, and post-move resume dispatches before active-only CLI checks with no CLI calls. Shared repair accepts only recorded before/after states. Actual CLI before/after-move smoke logs confirm pending → finalized → repeated-finalized → resolved/reopen consumers. |

The shared module's exact-hash checks serialize supported writers and preserve observed conflicting edits. They do not make arbitrary editors transaction-safe; the guides explicitly retain that limit. The filesystem protocol and tests cover process interruption, not a guarantee against every hardware power-loss behavior.

### Evidence correction and document fidelity

During review, the then-in-flight `task-5-cli-before-move.txt` and `task-5-cli-after-move.txt` ended with the scratch harness error `existsSync is not defined`. This was reported to the controller as an evidence gap, not a production defect. The corrected retained logs were reread: both now show the expected injected failure, visible pending `D-1`, successful resume, idempotent repeat resume, correct main-spec content, resolved revision 4 and successful linked reopen/reconciliation. The gap is closed.

Final apply still changes only its delivery-gates signpost; default-checkout, selection/context handling and approval ordering remain unchanged. Final archive preserves the pre-cut behaviors and adds an explicit strict-validation command before approval, consistent with the already stated gate. Its checked invocation, recovery commands, evidence contract and success claims match the inspected implementation. Root README/AGENTS and test README/AGENTS describe the shipped wrapper and its limits together. DESIGN_NOTES' Where-facts-live row now accurately identifies shipped roadmap/defect/archive tooling while leaving docs-truth planned; pillars, rules, inbox decisions and roadmap order are unaffected. No task-4 evidence file appears in the diff.

No additional fix is requested from this review. Preserve this report once its digest is used as verification evidence; later results should be supplementary records.

## Scoped correction review — additional recovery finding

The preceding pass records the earlier review state. On the controller's subsequent bounded correction request, reviewer A inspected the CRLF comparison normalization, canonical CLI-path check and archived-original digest check. The CRLF/path fixes are sound within their tested scope. The original change-local recovery defect is fixed, but **T5-C3 remains blocking for supported repository-relative final-review evidence**.

Independent command:

```text
node node_modules/vitest/vitest.mjs run tests/unit/tooling/ArchiveChange.test.ts -t 'line endings|dot-segment escape|direct repair and reconciliation|direct recovery rejects'
Tests 20 passed | 56 skipped (76)
Duration 3.32s
Exit 0
```

Used the pinned Node runtime. Independently reran the controller's actual-CLI scratch probe, which now reports:

```text
INTERRUPTION probe interruption
WRAPPER EVIDENCE: evidence digest mismatch: openspec/changes/archive/2026-11-11-alpha/reviews/testing.md
DIRECT REPAIR EVIDENCE: archived change preimage missing or changed: openspec/changes/alpha/reviews/testing.md; restore retained bytes before recovery
RECONCILE EVIDENCE: archived change preimage missing or changed: openspec/changes/alpha/reviews/testing.md; restore retained bytes before recovery
```

### Major: supported repo final-review locator bypasses shared recovery integrity

Source anchors: `archive-change.mjs` → `finalReviews` accepts both `repo` and `change` locators; `project-status.mjs` → `readReceipts` now checks only preimage paths starting with `openspec/changes/${change_id}/`. The README permits the tracked, digested file-reference format for final reviews. A review proof outside the archived change can therefore remain outside both the new preimage check and the defect record's evidence checks.

Independent actual-CLI reproduction, using a fresh fixture from `task-5-smoke.mjs alpha prepare-only`:

1. Copy the testing review's bytes to tracked repository-root `testing-proof.md`. Change only the testing review's manifest locator to `{kind: 'repo', path: 'testing-proof.md', sha256: <same digest>}`; stage these fixture files. The synthetic defect still cites the adversarial review.
2. Invoke the real wrapper/default installed CLI with trusted interruption at `ledger-written`.
3. Append text to `testing-proof.md` after the archive move.
4. Attempt wrapper resume, direct `defects reconcile --repair --change alpha`, then plain `defects reconcile --check`. Remove the temporary fixture in `finally`.

Observed after the current correction:

```text
INTERRUPTION reviewer interruption
WRAPPER EVIDENCE: evidence digest mismatch: testing-proof.md
DIRECT {"state":"finalized","change_id":"alpha","ids":["D-1"]}
CHECK {"ok":true,"active":0,"resolved":1}
```

Required resolution: shared receipt consumers must validate all supported final-review evidence locators, including repo locators, before repair writes and during later reconciliation/listing. Preserve current supported locator behavior; merely checking original archived bytes does not close this bypass. Another-change locators require the same reasoning, although this reproduction uses a repo locator. Add a regression proving rejection and unchanged journal/receipt/ledger/roadmap bytes, followed by successful recovery after restoring the proof. No implementation or ledger changes were made by reviewer A. Final scoped approval is pending this correction.

## Final scoped verdict after retained-evidence correction

**PASS. T5-C3, including the independently reproduced repo-locator variant above, is fixed and independently verified. C2 and C4 remain passed. No blocking reviewer A finding remains.** This final disposition supersedes the pending correction verdict without altering its reproduction evidence.

Inspected only the bounded extension: optional `retained_evidence` in the v1 receipt uses the existing generic locator schema; wrapper `finalReviews` returns its six validated locators; trusted preparation validates and records them; shared `readReceipts` checks them before repair/list/check can proceed. Prepared/finalized receipt and journal hashes naturally include the new field. Existing receipts without it remain readable. Repo and other-change references remain supported. Original change-local preimage checks remain intact, including the manifest. Main-spec output is refused as mutable review proof before preparation, avoiding expected synchronization changes invalidating a transaction's own review proof.

Read the retained four-failure red record and 12-pass green record. Independently executed the relevant seven-test selection (7 passed, 73 skipped, 5.67 seconds) and the changed/deleted repository-locator pair (2 passed, 78 skipped, 1.53 seconds), all with the pinned Node runtime and exit 0. These scoped checks cover local original proof rejection/restoration, the other-change locator, mutable-main-spec refusal, and changed/deleted repo proof.

Repeated the actual installed-CLI repo-locator reproduction from the preceding section, adding assertions that the ledger, roadmap, journal and receipt bytes remain exactly unchanged after all rejected operations, and that the external proof remains modified. Then restored the original proof and asserted successful direct repair, resolved-list output, reconciliation and repeated repair. The temporary fixture was removed in `finally`; no live work was archived.

```text
WRAPPER EVIDENCE: evidence digest mismatch: testing-proof.md
DIRECT EVIDENCE: retained archive evidence: EVIDENCE: evidence digest mismatch: testing-proof.md
LIST EVIDENCE: retained archive evidence: EVIDENCE: evidence digest mismatch: testing-proof.md
CHECK EVIDENCE: retained archive evidence: EVIDENCE: evidence digest mismatch: testing-proof.md
PRESERVED ledger roadmap journal receipt and conflicting proof
REPAIRED {"state":"finalized","change_id":"alpha","ids":["D-1"]}
CHECK-RESTORED {"ok":true,"active":0,"resolved":1}
REPEAT {"state":"finalized","change_id":"alpha"}
```

G2/G4 are now supported for the direct recovery path as well as wrapper resume for all supported file-locator kinds. README accurately requires immutable proof outside the main-spec output tree and explains that receipts retain the locators for direct recovery integrity checks. The added validation does not introduce a six-review policy into the shared lifecycle module. This is a bounded correction to the accepted finding, not a broader re-audit or an assertion that arbitrary external edits are transaction-safe.

This report is final and formatted for retention. Do not edit it after its digest is recorded; subsequent results must use supplementary evidence.

## Bounded performance correction review

**PASS for T5-C5. Prior C1–C4 dispositions remain unchanged.** This append was requested before any report digest was recorded and reviews only reference-check batching and its regression evidence.

`createReferenceChecker` owns a fresh closure for one synchronous validation operation. It lazily reads a NUL-delimited `git ls-files -z` set once, validates schema and actual file digest, and caches only successful checks keyed by the complete canonical reference, including its digest. Receipt defect and retained evidence share that operation's checker. Wrapper review validation, project validation and preparation create their own scopes; standalone `validateReference` always creates a fresh scope. No module-level cache or checker survives a later command, the archive move, or a retry. File tracking still accepts the current archived path or original indexed change path, and Git calls retain the existing sanitized environment. The existing direct-editor race limit remains explicit.

Independently executed targeted checks with pinned Node: four identity/relocation checks passed in 563 ms, then the new later-reconciliation untracking/restaging regression and existing tracked-file/digest/real-commit test both passed in 518 ms. No broad suite or full verification was rerun by this reviewer. The new test proves that successful reconciliation does not authorize the next call after Git untracking, and that restaging the archived path restores success.

Read the retained performance evidence: `task-5-tests-final.txt` records 170 tests passing in 33.60 seconds before batching; `task-5-tests-optimized.txt` records 171 passing in 11.11 seconds afterward, approximately 67% lower elapsed time despite the extra regression. These measurements support removing the repeated-process regression; they do not establish reference-Mac throughput, large-repository limits or attainment of the aspirational full-verification budget.

Reviewed current SHA-256 snapshot:

| File | SHA-256 |
| --- | --- |
| `scripts/project-status.mjs` | `fca8a6de56da770981d86494fd1afcdb9914ae0f35e94c6119df5f2d1083d961` |
| `scripts/archive-change.mjs` | `6c51caee5fc6d71052c43378aef396dd1743180224584dff17e084936330b9cb` |
| `tests/unit/tooling/ArchiveChange.test.ts` | `4180ccec4bb627492debf6483b246578664e437ccb9054aed78499ccff99f271` |

No new blocking finding. This report is again formatted and ready to freeze when its digest is retained.
