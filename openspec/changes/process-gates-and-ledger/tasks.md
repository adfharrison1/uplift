# Tasks

Six atomic commits, ordered from workflow contracts through shared tooling to archive integration and enforcement. No simulation layers change. Each task includes its own tests and docs, two independent reviews, verified fixes, full verification and owner approval before commit. Briefs use “high reasoning, medium-to-high model”. Keep the default worktree and preserve unrelated edits. Documentation and test files accompany their owning task; the three-file source/tooling cap is not a license to bundle unrelated implementation.

## 1. Review contracts and portable evidence

- [x] 1.1 Create the review-gates and periodic root-and-branch skills with G1–G6, all existing review counts, model-agnostic briefs, the size rule, doc integrity and the full adjudication procedure; port/fix the quotechecker and add its Claude symlink. Add apply/propose signposts to the gates skill while preserving default-worktree policy and existing planning/approval boundaries. Verify: `python3 -m unittest discover -s tests/tooling -p 'test_quotecheck.py'` and `npm run verify`; additionally obtain independent process-fidelity and cold-agent-usability reviews, and check the skill symlink resolves. Commit: `feat(process): add review gates and periodic review workflow`.

  Primary assets: two new SKILL.md files and the portable quotecheck.py. Supporting skill references, OpenSpec skill signposts, tests and root skill index are documentation/test adjuncts. Test multiline success, wrong tail/range, missing and escaping paths, malformed evidence and nonexecution of command evidence. Do not copy historical machine paths or invented mandatory playtest steps. Until task 4 ships the commands, explicitly record G5 dispositions/evidence in the finding inventory; task 4 migrates and reconciles them.

## 2. Design-note integrity and honest debugging guidance

- [x] 2.1 Rewrite uplift-design-notes for the current document system, approval/disposition checkpoints, three topic perspectives and two fidelity/coherence reviewers; correct uplift-debug against the shipped telemetry/query/compactor behavior. Exercise the rewrite on the real zoom inbox note, recognizing existing coverage and preserving unapproved inputs. Verify: deliver the exercise's canonical-home/index/disposition/no-loss record, have both reviewers check it, and run `npm run verify`. Commit: `fix(skills): preserve design decisions and describe shipped telemetry`.

  Primary files: the two existing SKILL.md files. Related DESIGN_NOTES, design index, inbox and roadmap changes require the approved disposition; never invent a new design decision or edit AGENTS through this workflow. Record budget checks and any inspected-but-unchanged index entry.

## 3. Reconcile shipped guidance and config

- [ ] 3.1 Produce and pass the config no-loss mapping before cutting text, then rewrite root/affected section guides to shipped facts, correct carried-over claims, point versions to manifests, reduce root AGENTS to at most 1,050 words and config context below 1,500 words, and move review/consumer/size rules into supported config fields. Verify: two independent fidelity/coherence reviews of the mapping and final docs, a recorded word-count/identifier/link check, `openspec instructions tasks --change process-gates-and-ledger --json` without the unsupported operation warning, and `npm run verify`. Commit: `docs(process): reconcile shipped guidance and canonical design homes`.

  Primary config: openspec/config.yaml; accompanying documentation includes root and affected domain/application/infrastructure/interfaces/tests README and AGENTS pairs, DESIGN_NOTES/design indexes and targeted roadmap corrections. Preserve all ten project-skill links, layer rules and the default-worktree policy. Record the historical-review citation treatment explicitly. No fake epoch constant or premature engineering split. Store the mapping and review results with the change.

## 4. Deterministic roadmap and defect lifecycle

- [ ] 4.1 Implement project-status module/CLI, validated graph and next selection, defect schema and checked add/list/transition/update/reopen/reconcile operations; seed all outstanding code findings using finding-reconciliation.md with evidence-backed exclusions and split ownership. Add command wiring and lint coverage for scripts. Verify: `npx vitest run tests/unit/tooling/ProjectStatus.test.ts`, `npm run roadmap:next -- --json`, `npm run defects -- reconcile --check`, and `npm run verify`; review the seed against every accepted code finding and demonstrate current active-work output. Commit: `feat(tooling): track roadmap and defect lifecycle deterministically`.

  Primary files: scripts/project-status.mjs, package.json and openspec/defect-ledger.yaml. Tests cover every transition edge, illegal/no-op edges, missing evidence and relocatable locators, stale revisions, concurrent writers, malformed YAML/unknown fields, owner changes, history replay/current-state consistency, deterministic listings, recurrence links, graph cycles/missing IDs, archive/date identity, done-by-review and active-work selection. Reconciliation/receipt parsing is tested with fixtures here, before the wrapper exists. Root/test docs explain commands and lifecycle. Capture prior-task fixes in ledger history rather than falsely seeding them as unresolved.

## 5. Archive finalization and recovery

- [ ] 5.1 Implement the archive wrapper and durable transaction/receipt protocol using the shared state module; wire change:archive and update the archive skill to delegate full validated archive and ledger/roadmap finalization to it. Integrate apply guidance with actual defect commands and reconciliation. Verify: `npx vitest run tests/unit/tooling/ArchiveChange.test.ts tests/unit/tooling/ProjectStatus.test.ts`, a temporary-repository smoke exercise against the installed OpenSpec CLI through successful archive/list/reconcile, injected failure-and-repair cases, and `npm run verify`. Commit: `feat(tooling): reconcile defects safely during archive`.

  Primary implementation: scripts/archive-change.mjs and package.json; archive/apply skills and command/recovery docs ride with it. Avoid shared-module redesign; task 4 supplies its transaction primitives. Test unfinished/parked owners, no-defect archive, CLI failures before and after directory move, every receipt/journal/ledger/roadmap write boundary, repeated repair, pre-move cancellation/resumption, relocatable evidence after move, external-store refusal, stale evidence, external edits, lock contention, symlink/path rejection and bypass detection, missing finalized receipts and finite legacy-archive exemptions. Use actual artifact readback and combined-list output. Never archive this change during its tracked tasks.

## 6. Documentation enforcement and closing delivery review

- [ ] 6.1 Add docs-truth fixtures and live checks last, extend structural skill coverage without prose pinning, isolate nested Git fixture environments, and complete the cross-capability scenario/evidence matrix and delivery record. Verify: `npx vitest run tests/architecture tests/unit/tooling/VerifyRunner.test.ts`, `npm run defects -- reconcile --check`, `openspec validate process-gates-and-ledger --strict`, `npm run verify`, and `npm run verify:serial`; obtain all six final delivery reviews, resolve verified findings and rerun affected checks. Commit: `test(process): enforce documentation truth and record delivery evidence`.

  Primary test files: tests/architecture/docs_truth.test.ts, tests/architecture/layer_boundaries.test.ts and tests/unit/tooling/VerifyRunner.test.ts. Each checker needs a valid fixture and meaningful negative fixture; all existing layer/zero-any/determinism assertions remain. Add foreign-index/environment regression tests proving parent Git state remains intact. Review factual budgets, numeric/version checks, citation precision, feature-index coverage and all skill links. Record measured test count/timing against reference budgets and any platform limits. Update root/section docs only for final verified behavior, mark owned defects verified with evidence, and record unplanned fixes as tasks before delivery.

## Workflow follow-up

- After all tasks and final reviews are delivered, obtain the owner's archive instruction and run the wrapper. Check that this change's verified defects are removed from the active ledger, their resolution receipts remain visible and roadmap:next selects the next eligible entry.
- Commit the archive/spec/ledger/roadmap result only when authorized. Never push without an explicit request.
