# Task 5 implementation evidence

Task 5 integrates the checked archive transaction with the installed OpenSpec CLI. Base: `1f104e0`; default checkout, no live archive, staging, commit, checkbox update or push by the implementer. Source/tooling scope is three files: wrapper, package command and bounded shared-module integration. Runtime layers and dependencies are unchanged.

## Retained verification

- `task-5-red.txt`: 34 wrapper tests failed on an explicit missing-wrapper assertion before production wrapper code existed.
- `task-5-c1-red.txt`: three identity-integration tests failed before the shared compatibility fix. `task-5-c1-consumer-red.txt`: pure reconciliation and pre-move ambiguity failed before the final consistency correction.
- `task-5-boundaries-red.txt`: nine failures established missing durable-phase callbacks, immediate preimage recheck, moved review integrity and renamed pre-sync protection before implementation.
- `task-5-tests.txt`: `npx vitest run tests/unit/tooling/ArchiveChange.test.ts tests/unit/tooling/ProjectStatus.test.ts` passed 146 tests (56 wrapper, 90 shared), measured 11.35 seconds on this host. This exceeds the reference suite target; no timing guarantee or wall-clock test is claimed.
- Focused ESLint and `npm run typecheck` passed. Controller owns full `npm run verify`, independent final reviews and owner checkpoint; those outcomes are not claimed by this implementation handoff.
- `task-5-cli-normal.txt`, `task-5-cli-dated.txt`, `task-5-cli-empty.txt`: real installed CLI, default executable resolver, complete synthetic repositories; strict preflight, full sync/archive, actual main spec, finalized receipt, combined list/reconcile and (nonempty cases) reopened recurrence. Controller independently repeated ordinary smoke in `task-5-controller-smoke.txt`.
- `task-5-cli-before-move.txt`, `task-5-cli-after-move.txt`, `task-5-cli-ledger-written.txt`, `task-5-cli-roadmap-written.txt`, `task-5-cli-finalized-receipt-written.txt`, `task-5-cli-journal-removed.txt`: each corrected run exited zero after its injected interruption, explicit resume, repeated resume and consumer readback. After-move uses the real successful CLI before altering its reported status; remaining durable interruptions use trusted phase callbacks with actual files.

The smoke fixture generator is `.superpowers/sdd/tasks/task-5-smoke.mjs`; invocation is `node <script> alpha [normal|no-defects|before-move|after-move|ledger-written|roadmap-written|finalized-receipt-written|journal-removed]`, or `2026-01-02-alpha` for dated-ID compatibility. `alpha prepare-only` prints a retained complete fixture path for independent cold-agent exercise without archiving it; the operator must remove that temporary directory afterward. Other modes clean up in `finally`. Git fixtures remove inherited `GIT_*` variables and disable commit signing locally. CLI children disable telemetry/version network checks and use the active pinned Node runtime; no network or installed dependencies were needed.

The first six failure-smoke harness attempts ended with `existsSync is not defined` before reaching the injected boundary. This was a scratch-harness missing import, not an archive result or production defect. It was corrected and all six modes rerun; the retained final mode transcripts contain their actual successful recovery results. Initial unit-fixture corrections similarly normalized macOS temporary paths and used the existing `parked_reason` schema; they did not change production contracts.

## Integration decisions and findings

The deterministic final-review record is change-local `final-reviews.yaml`: schema version, original change ID and exactly six dimension/reviewer/brief/passed-disposition/digested-locator records. Distinct dimensions are adversarial, architecture-adherence, performance, testing, logic-integrity and design-coherence; reviewer identifiers must be distinct. Locators use shared tracked evidence validation and survive moves. This checks evidence integrity, not semantic correctness or owner permission. The controller approved this routine format choice before implementation.

**T5-C1, major:** the installed CLI preserves an already date-prefixed original change name, while the original shared parser always stripped one prefix. The real CLI baseline moved the change and then failed `REFERENCE: missing change 2026-01-02-alpha`; retained immutable `task-5-cli-baseline.log` is its source. The finding entered the real ledger with supported add → in_progress commands (ledger revision 137). Verification waits for retained independent review evidence and controller staging. Do not hand-edit its history.

The bounded correction preserves historical `archiveIdentity(name)` parsing. Repository inventory resolves exact original or once-stripped archive names against declared roadmap IDs, rejects dual matches/forged maps/duplicate identities/collisions, and shares that resolution across paths, receipts, cancellation, repair, evidence and reconciliation. Pure reconciliation normalizes once. Preflight rejects ambiguous future destinations and invalid calendar-prefixed names before preparing; actual CLI date naming needs no extra rename or crash window. Missing receipts remain errors for dated and empty archives. Trusted `onStep` notifications extend the existing cancellation pattern to preparation/finalization; no CLI exposes callbacks or `lock:false`.

## G1–G6

| Gate | Result and limits |
| --- | --- |
| G1 Consumer trace | Archive skill → npm command → synchronous wrapper lock/preflight → shared preparation → one actual installed full CLI sync/archive → receipt finalization → ledger/roadmap → combined listing/reconciliation. Real ordinary, dated, empty, interruption and recurrence transcripts reach those consumers. |
| G2 Trust boundary | Safe IDs/options; local resolved context/list/status and change roots; schema paths confined; tracked review/defect digests; symlink rejection; external stores rejected before receipt/journal; root and preimages rechecked immediately before CLI. Shared lock contention prevents supported concurrent writers. |
| G3 Cost | Human-triggered tooling only; snapshots and hashes scale with change/main-spec bytes, plus shared graph/ledger validation. CLI subprocesses are synchronous under the lock and output is bounded at 1 MiB. Focused 146 tests measured 11.35s; no target-hardware or 60 FPS assertion. No runtime hot path changed. |
| G4 Failure containment | Every receipt/journal/ledger/roadmap durable phase, both sides of CLI move, occupied candidates, nonzero/throw handling, preserved pending IDs, stale evidence/external edits, explicit pre-move cancel/resume and post-move idempotent repair. Real failure smokes verify actual CLI/filesystem boundaries. |
| G5 Findings | T5-C1 recorded/in_progress; code corrected and tested, independent review pending at handoff. Process/document findings retained below/in inventory. Controller completes tracked evidence, verified transition and final reconciliation before owner checkpoint. |
| G6 Traceability | Scenario mapping below plus unchanged shared90-test contract. Missing full verification/final reviews are explicitly pending rather than called verified. |

## Scenario map

| Defect-ledger scenario | Named test/manual consumer evidence |
| --- | --- |
| Successful archive reaches listing consumer | `runs full archive once and reaches empty receipt, roadmap, combined list and reconciliation consumers`; actual normal/dated smoke resolves D-1 then reopens D-2. |
| An unfinished defect remains | `refuses open owned defects before archive`, `refuses parked owned defects before archive`; other active transition states remain shared-module coverage. |
| Failure before archive succeeds | `preserves a failed pre-move archive for explicit resume...`; real before-move smoke. |
| Failure after archive succeeds | `treats nonzero exit after move as pending...`; durable phase table tests; real after-move/ledger/roadmap/finalized-receipt/journal-removal smokes. |
| Bypass or conflicting edits | `preserves external edits on resume and cancellation`; missing finalized receipt test; existing shared bypass/conflict tests retained. |
| Unsafe archive argument or ledger path | Unsafe argument/unsupported-option parameterized cases; linked-change sentinel test; shared atomic-write/path matrix. |
| Change-local evidence moves with archive | Six `recovers failure after ...` cases preserve D-1 resolved revision4; actual dated/ordinary list/reconcile/reopen reads same digested evidence. |
| CLI resolves an external store | Context/list/status external-root cases before preparation; `rechecks the selected root after preparing...`. |
| Prepared archive is canceled or resumed | Cancel/fresh archive, refreshed completion, exact preimages and already-moved repair tests. |
| Pending finalization remains visible | Every durable-phase case reads combined list and pending D-1 before recovery; real failed-state transcripts show affected IDs. |
| Receipt deleted after successful cleanup | Empty-receipt deletion/reconciliation test; shared finite legacy and missing-receipt checks unchanged. |
| Durable transitions/revisions/replay/reopening | Existing shared90 tests plus actual archive terminal revision4 and recurrence linkage. |
| Schema artifacts/tasks and final delivery records | Custom `work/checklist.md` fixture, invalid counts/incomplete artifacts/blocked instructions, missing/five/duplicate-reviewer/stale review rejection; strict-failure before preparation. |
| Prior sync conflict | ADDED, MODIFIED, REMOVED and RENAMED pre-sync cases stop before preparation. |
| Date-prefix and inventory identity | Original-dated inventory, ambiguous declarations, forged mapping, pure reconciliation without adapter map, future destination ambiguity and invalid calendar preflight; actual installed dated CLI smoke. |

## Document integrity

Cold baseline and staged no-loss mapping are in `.superpowers/sdd/tasks/task-5-skill-baseline.md` and `task-5-skill-no-loss.md`. Two independent pre-cut fidelity/coherence reviews passed before installation. The first coherence pass identified a missing explicit preapproval strict-validation command; it was added and independently rechecked. Archive selection, optional advisory lookup, context authority, store/root discovery, schema completion, metadata preservation and owner approval remain. Approved full CLI transaction semantics supersede manual inline sync/mkdir/mv and warning bypasses. Apply receives only a concise checked-command/evidence/reconciliation signpost.

Canonical homes: root README command/recovery/review-record contract, paired root AGENTS capability guidance, paired tests guides for test boundaries, workflow skills for agent procedure. DESIGN_NOTES Where-facts-live now points at the shipped command guide and distinguishes remaining docs-truth work; this was a narrow factual correction. Status-index engineering row, pillars/rules spine, roadmap order/status, design dispositions and inbox are otherwise unchanged: no gameplay/design decision or new feature file. Historical review/task evidence is untouched.

Root AGENTS is 996 whitespace-delimited words (ceiling 1050); config context remains 704 (ceiling 1500). DESIGN_NOTES was 17174 before the single facts-home correction; final count recorded in the implementation report. Owner language and unresolved inbox content were not changed. No legacy exemption was extended. Independent final task reviews and full verification remain the controller's completion gate.


## Review-fix supplement

The initial 146-test checkpoint above remains historical evidence. Final tests and real smokes are recorded separately after these corrections; no earlier RED or baseline file is overwritten.

- **T5-C2, major preflight bypass:** independent reviewer/controller reproduction found CRLF section headings and mixed body line endings bypassed prior-sync checks. Seven new wrapper cases failed before the two read-only input strings were normalized to LF; all 12 LF/CRLF-direction/operation regressions now pass. The on-disk main/delta bytes are never normalized or rewritten. Retained `task-5-c2-red.txt` and `task-5-c2-green.txt` establish the correction.
- **T5-C3, major evidence/recovery bypass:** direct shared repair and plain reconciliation originally validated only defect-specific proof. Controller and implementer reproduced stale independent final-review evidence being finalized, including zero-defect receipts. Five initial filesystem RED cases and the repo-locator follow-up are retained. Shared receipt reads now validate archived original-change preimage bytes (excluding expected main-spec updates) plus an optional generic `retained_evidence` array of validated locators. The wrapper supplies all review locators through trusted `prepareArchive(..., {retainedEvidence})`; legacy receipts without that optional field remain compatible. Repository and other-change proof remain supported and digests/locators unchanged; mutable main-spec output is rejected as review proof with an immutable-snapshot instruction. Direct repair/list/reconciliation now reject missing or altered proof before cleanup, preserve journal/conflicting bytes, and recover after restoration. `task-5-c3-red.txt`, `task-5-c3-repo-red.txt`, `task-5-c3-retained-red.txt` and `task-5-c3-retained-green.txt` retain the progression.
- **T5-C4, major confinement defect:** lexical child-prefix checks preceded `relative()` normalization, allowing selected-change/../sibling paths. Three CLI artifact/task/context RED cases reached archive before correction. Canonical absolute equality is now required before selected-child and repository-safe path checks. `task-5-c4-red.txt` and `task-5-c3-c4-green.txt` retain rejection and unchanged outside-sentinel proof.

All four findings are real checked-ledger in_progress records at this handoff (ledger 143), with no premature verified transition. Controller retains independent review evidence and will perform verified transitions only after tracked immutable fix/test/review proof is available. Source/tooling cap remains wrapper/package/shared module.

Shared API additions are trusted programmatic options only: `prepareArchive` can retain validated generic evidence locators and reports prepared-receipt/journal writes through `onStep`; `repairArchive` reports ledger/roadmap/finalized-receipt/journal-removal phases. All remain synchronous under the one project lock. No CLI accepts callbacks, retained-reference injection or `lock:false`.

Document wording now explicitly states archived-original preservation and immutable review snapshots, while future supplementary evidence uses separate files. The narrower DESIGN_NOTES facts-home correction increases its word count 17174→17184; root 996/config 704 remain within their ceilings. Scope, pillars/rules spine, roadmap order/status, owner wording and unresolved inbox remain unchanged.


## Final implementer verification

After C1–C4 corrections, `task-5-tests-final.txt` records all 170 focused tests passing (80 wrapper, 90 shared), measured 33.60 seconds. Focused ESLint and strict typecheck also pass. This is materially slower than the initial checkpoint because retained review locators are revalidated through every durable consumer, including repeated tracked-file Git checks. The target remains a reference measurement goal; this result does not meet a sub-five-second full-verification target, and no target-hardware guarantee is claimed. No simulation/runtime hot path changes. Batching tracked-path lookups within a single read operation is a possible future optimization, not delivered here.

`task-5-cli-final.txt` is the final-core actual-CLI smoke matrix: ordinary, original-dated and no-defect success plus before-move, after-move, ledger, roadmap, finalized-receipt and journal-removal interruption/recovery. Controller's independent recovered-evidence rejection is retained in `task-5-controller-recovery-fixed.txt`. Final task review reports and full verification remain controller-owned completion evidence; their pending outcomes are not converted into implementation success assertions.


## Performance correction and final forward exercise

**T5-C5, minor/G3:** the measured 33.60-second checkpoint exposed repeated per-locator Git processes. The controller required a bounded correction and the finding entered the checked ledger through add → in_progress. `createReferenceChecker` now loads one NUL-delimited tracked-path set lazily per synchronous read/validation operation and shares identical-reference validation across defect/retained locators. Wrapper final-review validation uses the same scoped helper; standalone `validateReference` creates a fresh scope. No process-global cache survives an operation. File confinement, old-index relocation fallback, sanitized Git environment and actual content-digest checks remain.

`task-5-c5-preserved-contract.txt` verifies the untracking regression against the preoptimization implementation: a later reconciliation observes removed index membership, then succeeds after tracking the relocated archive file. That preserved behavior also passes after optimization. `task-5-tests-optimized.txt` records 171 focused tests passing (81 wrapper,90 shared) in 11.11 seconds, versus 170 tests in 33.60 seconds before batching: approximately 67% lower measured duration, not a controlled target-hardware benchmark. Focused lint and strict typecheck pass. The original timing evidence is retained, not rewritten. This supersedes the prior paragraph's unimplemented-optimization status; the reference-Mac/full-verification target still is not claimed met.

The nine-case actual CLI matrix completed successfully before this scoped index batching; all nine `EXIT` values in `task-5-cli-final.txt` are zero. Those consumers are also covered by the optimized unit matrix. The controller's independent cold forward exercise passed in `task-5-skill-forward.md`: one actual npm archive, resolved D-1, roadmap next beta, no duplicate owner approval, finalized receipt with six retained references and reconciliation readback. The controller removed only that temporary fixture after its independent check. The fixture had no verify script; supplied prior-verification preconditions are not a claim of fixture full verification.

The optional skill-creator Python quick validator could not run because Python yaml is absent; no dependency was installed. Controller used the installed Node yaml parser to check both actual frontmatters, names/descriptions/scaffold and preserved compatibility metadata. The current Python validator also has an older metadata allowlist. Repository architecture checks/full verification remain the authoritative structural completion checks.

Current handoff ledger: revision 145, 65 active records (53 open, 1 parked, 6 verified, 5 in_progress), no resolved records. C1–C4 are major, C5 minor/G3. All five wait for final independent review and immutable tracked evidence before controller verified transitions. Later controller supplements own the final verification/approval outcome.


## Controller completion supplement

[Final approval checkpoint](task-5-final-supplement.md) supersedes the pending review/verification status above. Both independent reviews and final full verification pass. Five checked verified transitions produce ledger revision 150 (53 open, 1 parked, 11 verified); reconciliation and deterministic read-only consumers pass. The unexplained initial test-run anomaly is retained as T5-V1, not claimed fixed. Task 5 remains uncommitted and unchecked pending owner approval.
