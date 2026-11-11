# Checkpoint procedure

## Proposal: three auditors

Read `DESIGN_NOTES.md`, its status index and `openspec/roadmap.yaml` before drafting. Check new inbox notes and accepted decisions. Draft all schema-required artifacts with consumer-ending scenarios and actual call sites. Use the size rule in the skill, not the older fixed task-count recommendation. Obtain three independent audits, each brief stating **high reasoning, medium-to-high model**:

1. **Architecture, adversarial, determinism and hardware:** inward dependencies, epoch-agnostic registry contracts, immutability, races, deterministic inputs, offline operation, trust boundaries (G2), failure containment (G4), 60 FPS and verification budget.
2. **Completeness, design alignment and atomicity:** positive/negative/error scenarios, consumer traces (G1), scenario evidence plan (G6), design/roadmap coherence, inward-out task order, file cap and green intermediate commits.
3. **Game standards, safety, accessibility and extensibility:** simulation conventions, player/user consequences, accessibility, gotchas, future integration and avoiding structural dead ends.

Verify every finding; record disposition and evidence (G5), revise artifacts, then run `npx openspec validate "<name>" --strict` with the selected store scope where applicable. Present the concrete artifacts and findings for owner approval. The propose workflow stops here; a later apply request starts implementation.

## Each task: two reviewers

1. Inspect the working tree, task requirements and relevant section guides. Implement only the approved task and its related docs. Run its `Verify:` command and `npm run verify`.
2. Dispatch two independent reviewers with **high reasoning, medium-to-high model**:
   - **Correctness, logic, edge cases and performance:** state transitions, malformed/boundary inputs, immutability, determinism, CPU/memory cost (G3), G2 security and G4 containment.
   - **Architecture, spec/design adherence, types and test coverage:** layer boundaries, zero-`any`, Zod contracts, plug-and-play content, consumer traces, scenario assertions, G5 dispositions and G6 gaps.
3. Reproduce or inspect load-bearing claims independently. Write a disposition for each. Apply verified fixes, rerun the applicable checks and `npm run verify`, and complete G1–G6 with honest evidence limits. If code contradicts an archived SHALL, revise its delta before approval.
4. Review the task's diff and, when scoped staging is authorized, `git diff --staged`. Preserve unrelated staged and unstaged work. Present the concrete result and pause for owner review. Do not commit merely because checks passed.
5. After approval, create the atomic Conventional Commit, then mark the exact schema-returned task checkbox complete and refresh OpenSpec progress. Do not push unless asked. An implementation summary or reviewer pass is not owner approval.

## Delivery: six reviewers before archive

Dispatch the following independent briefs with **high reasoning, medium-to-high model**, using bounded waves if fewer than six slots are available. Keep reviewers' initial reports independent. Counts are mandatory even for documentation or process work; adapt evidence to that scope.

1. **Adversarial:** malformed inputs, edges, races, G2 trust boundaries and G4 failure containment.
2. **Architecture and adherence:** inward imports, zero-`any`, registry contracts, spec behavior, hierarchical README/AGENTS and document integrity.
3. **Performance:** G3 allocation and cloning costs, algorithmic scaling, 2019 Intel i7 / 16 GB, 60 FPS and measured verification timing.
4. **Testing:** G6 positive, boundary and negative coverage, deterministic local tests, `<3s` suite target and actual consumer assertions.
5. **Logic and simulation integrity:** mathematical/bitwise correctness, reducer purity, state invariants and actual end-to-end consumers (G1).
6. **Design coherence:** accepted owner wording, pillars/rules spine, design notes and roadmap, thematic consistency and future integration.

Independently verify the reports; record disagreements and all dispositions. Record unplanned fixes in the closing review task, deliver any approved fixes atomically, and rerun `npm run verify`. Finish G5 reconciliation and G6 coverage before approval. A missing consumer or unrun manual check is not verified. Follow the archive workflow's owner checkpoint; this skill grants no archive permission.

## Persistent findings and bootstrap G5

Keep stable finding IDs and retained repository evidence. Each finding record includes:

- source report/anchor and a self-contained claim;
- severity, gate/scenario, concrete trigger, and code defect versus process/document finding;
- disposition (`accepted`, `fixed`, `rejected`, `deferred`, `blocked`, or `unverified`), rationale, fixing owner or explicit unscheduled state, and revisit condition/blocker when relevant;
- fix reference or content digest, test command/result/evidence path, independent reviewer/brief/result/evidence path;
- changes in disposition with their reason, preserving earlier evidence and disagreement.

Do not label a fix verified until its fix, passing tests and independent review are all recorded. Do not drop minor defects. Process/document findings receive explicit dispositions rather than invented runtime-defect entries. Rejected decisions remain visible.

**Before the checked ledger tools ship:** maintain these fields in `finding-inventory.md` under the selected active proposal directory. Record each G5 check as “bootstrap inventory checked”, including known gaps; never report a nonexistent ledger reconciliation as passed. Keep task evidence in stable files so migration can cite it. During this workflow's rollout, the ledger integration task migrates every bootstrap code-defect record using the real add/transition commands, checks parity by ID, ownership, status and evidence, and preserves process/document dispositions in the inventory. Already fixed defects still retain their history and evidence during migration.

**Once the checked ledger tools ship:** use their supported commands to record defect disposition changes and run `npm run defects -- reconcile --check` at task and closing checkpoints. Keep evidence files immutable once their digests are recorded; later summaries are supplementary. A reconciliation error blocks the checkpoint until corrected. Archive resolution uses the checked archive workflow; neither a directory move nor an agent assertion resolves a defect. Do not implement or imitate those commands as part of using this skill.
