# Task 1 implementation evidence

Status: implemented and independently reviewed; staged for owner approval, not committed. The task checkbox remains unchecked until the approved commit. This evidence file is supplementary during bootstrap and is not yet digest-bound as verified ledger evidence. The initial implementation observations below are retained; the controller finalization records their outcomes.

## TDD evidence

- Before the new checker existed, the new CLI suite ran red: 11 tests, 37 failing subtest assertions. Missing-file failure establishes an absent interface, not proof of the historical bug.
- Independently reproduced the historical bug using temporary files: source `first\nreal tail\n`, evidence `first\nfalse tail`, lines `1-2`. `python3 -I reviews/tools/quotecheck.py <findings.json> <temporary-root>` reported `checked 1 items, 0 problems`, exit 0. The required outcome was nonzero.
- Initial portable implementation passed the first 11 tests against a staged script. Two line-semantics cases were then added. The Unicode separator case was refined to quote only the prefix of the same physical line, then failed with actual exit 0 versus expected 1. Replacing `splitlines` with physical newline handling made all 13 pass; CRLF and optional final terminators remain accepted.
- Controller's no-skill behavioral baseline preceded skill authoring. It found missing persistent finding/evidence contracts, consumer evidence left to judgment, generic periodic dimensions, grouped future proposals, missed slices/blind challenge/synthesis/no-loss sequence, old task count and vendor models. These gaps are addressed structurally in the workflow contracts. Forward probe remains pending.

## Commands and observed results

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/tooling -p 'test_quotecheck.py'`: **PASS**, 13 tests, 2.587 s on the installed script. Isolated real CLI fixtures cover multiline success, wrong tail/range/whitespace, physical lines, missing/escaping sources, malformed evidence and command nonexecution.
- `PATH=/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin:$PATH npm run verify`: first restricted run **FAIL**. Lint PASS 2000 ms; typecheck PASS 1037 ms. Format failed for apply/propose frontmatter and controller scratch `progress.md`/`task-1-brief.md`. Tests: 247 passed, 31 failed solely on `listen EPERM: operation not permitted 127.0.0.1`; failing suites were `BridgeTransport.test.ts` (1) and `LocalDiskBridgeHttp.test.ts` (30), 28 files, 3.23 s Vitest duration. No test was skipped or weakened. Workflow header formatting was corrected in staging with the project's Prettier config; controller installation and unrestricted rerun are pending.
- Actual symlink inspection: `.claude/skills/root-and-branch-review` is a symlink to `../../.agents/skills/root-and-branch-review`; strict resolution equals the project skill directory and its `SKILL.md` exists. **PASS**.
- `git diff --check`: **PASS** before evidence documents were added; final check follows controller review updates.

Reported times are host observations, not proof of the reference Intel Mac budgets.

## Gate and source fidelity mapping

| Existing requirement / source                                                                                                                    | Preserved home                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three proposal auditors: architecture/adversarial/determinism/hardware; spec/design/atomicity; game standards/safety/accessibility/extensibility | `uplift-review-gates/references/delivery.md`, proposal section                                                                                                                                                                   |
| Two task reviewers: correctness/logic/edges/performance; architecture/spec/types/tests                                                           | Delivery reference, task section; explicit owner approval before commit/checkmark                                                                                                                                                |
| Six closing dimensions: adversarial, architecture, performance, testing, simulation logic, design coherence                                      | Delivery reference, six numbered briefs; waves preserve all six                                                                                                                                                                  |
| G1 actual consumer, G2 security, G3 hot-path, G4 containment, G5 defects, G6 scenarios                                                           | Gates entrypoint evidence table and persistent findings/bootstrap procedure                                                                                                                                                      |
| Default checkout, unrelated edit preservation, planning-only propose, schema states and task owner checkpoint                                    | Gates entrypoint, narrow apply/propose signposts; existing generated workflow otherwise retained                                                                                                                                 |
| Historical source framework plus later process-notes/register supersessions                                                                      | Periodic slice table and slice/brief reference: no mandatory playtest; at least two blind reviews of each finding AND recommendation, third for critical/roadmap items; model-agnostic capability briefs; tracked review history |
| Actual synthesis and Phase 1 procedure, HANDOFF/punch list                                                                                       | Periodic adjudication reference: revise/four audits/written rulings/revise/two final audits/punch list; approved content batches then separate traced restructure                                                                |
| Owner document-integrity requirements                                                                                                            | Shared document-integrity reference: system placement, canonical facts, four navigation/disposition checks, verbatim language, no-loss mapping, two independent reviews, budgets and pillar checks                               |

The existing historical review files were read and left unchanged. Their machine paths, vendor instructions, initial playtest demand and older ignored-review assumption were not copied into live workflow guidance. Existing root review prose remains available, but the new root routing explicitly gives current procedure, task sizing and model briefs to the gates skill. No broad root truth rewrite or design-notes skill rewrite was included.

## Document integrity record

- Canonical workflow homes: two project skills; shared integrity reference avoids duplicated policy. Human root README and test README explain the new tooling; paired AGENTS files supply routing/test procedures.
- DESIGN_NOTES status index: checked, unchanged; no design feature or gameplay capability delivered. Where-facts-live table: checked, unchanged; design authority unchanged. Roadmap: checked, unchanged; this remains the active proposal with later work intact. Dispositions: this task's bootstrap finding inventory created; historical register unchanged.
- No content moves/cuts: root index and narrow signposts are additive; generated metadata values preserved. No-loss gate-axis mapping above protects the old review coverage. No owner wording or planned runtime content deleted.
- Current root word budget is intentionally a staged migration debt; broader root consolidation belongs to its scheduled task. No budget enforcement is claimed here. No new `design/` feature file needs an index row.
- Independent fidelity/coherence review pending controller. Skill deployment has not been approved by the owner.

## Controller finalization

- Full `npm run verify` with authorized loopback access: **PASS** — format 1,498 ms, lint 1,559 ms, typecheck 875 ms, tests 2,602 ms. The sandbox-only HTTP failures are cleared; no tests were skipped or weakened. Project formatting was corrected before this run.
- `openspec validate process-gates-and-ledger --strict`: **PASS**. `git diff --cached --check`: **PASS**.
- Both skill entrypoints and reference links passed structural validation using the installed project YAML parser. The skill-creator Python `quick_validate.py` could not run because that interpreter lacks PyYAML; it is not claimed passed and no dependency was installed. Equivalent metadata/name/description/placeholder checks plus reference-link checks passed.
- A fresh independent operator completed the two workflow exercises using the new skills without blocking ambiguity. The retained [exercise](task-1-skill-exercise.md) recovers consumer proof, bootstrap dispositions, review counts/independence, checkpoints, synthesis/no-loss and next-only proposals. It is a procedural exercise, not a claim that a real periodic review was performed.
- [Reviewer A and reviewer B](task-1-reviews.md) both returned specification and quality **PASS**, no actionable defects. A covers correctness/edges/performance and cold-agent usability; B covers architecture/spec/test quality and process fidelity/coherence. A independently ran five additional passing temporary probes: duplicate JSON keys, invalid UTF-8, bad route evidence, mixed manual plus bad source, and nested cwd with a worktree-style .git file.
- Reviewers' requested bookkeeping is completed here and in the bootstrap inventory. No implementation fix was requested by either review. No commits or pushes have been made.

## Task-scoped G1–G6 and scenario evidence

| Gate | Result and evidence                                                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1   | Verified for task scope: real CLI tests call main → evidence parsing → complete source comparison → stdout/exit consumer. Skill entrypoints → procedure references → independent operator output are retained in the exercise.                  |
| G2   | Verified for static local input/path scope: malformed, missing, absolute, traversal and escaping-link inputs fail; command strings never execute. Reviewer A records that hostile concurrent filesystem replacement is not a claimed guarantee. |
| G3   | Reviewed: no simulation/frame-loop work. Checker cost is proportional to input evidence and file reads, with largest-source memory. Host timings are recorded; reference-Mac profiling is not claimed.                                          |
| G4   | Verified: bad citations return nonzero with diagnostics, command evidence returns manual status, fixtures preserve outside sentinels, and the checker performs no persistent writes.                                                            |
| G5   | Bootstrap inventory checked: every task finding retains source, severity, owner, disposition and fix/test/independent-review evidence. No nonexistent ledger command or reconciliation pass is claimed.                                         |
| G6   | Verified for the delivered workflow/checker scope below. Runtime ledger/archive and broad docs-truth scenarios remain assigned to later tasks.                                                                                                  |

| Delivered scenario group                                                 | Evidence                                                                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proposal/task/final review counts and default checkout/owner checkpoints | Independent process-fidelity review plus operator exercise, with preserved source-axis mapping above                                                     |
| Pipeline stops before consumer                                           | Operator scenario A refuses to equate producer assertions with verified persistence                                                                      |
| Defect disposition maintenance                                           | Operator scenario A uses the documented bootstrap inventory and identifies migration to future checked commands; actual ledger transitions remain task 4 |
| Prior-review reconciliation and repeated blind challenges                | Operator scenario B recovers separate finding/recommendation coverage and third-review condition                                                         |
| Synthesis approval and no-loss amendments                                | Operator scenario B follows four audits, written rulings, revision, two final audits, punch list and owner-approved content/restructure ordering         |
| Matching first line with a false remaining quote                         | test_false_tail_fails_even_when_first_line_matches; historical RED preserved above                                                                       |
| Relocated checkout and unsafe/malformed evidence                         | Explicit-root/discovery, missing/range/path/symlink and command-sentinel tests; five independent additional probes                                       |

## Uncommitted fix identities

These SHA-256 digests identify the tested/reviewed files before the approved commit. Task 4 can use the delivered Git reference and these retained identities when migrating already fixed code/tooling defects.

| File                                                          | SHA-256                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `.agents/skills/root-and-branch-review/scripts/quotecheck.py` | `c83746b602a705a5d828695696aeff47348cf258dc91ec7d9bfa4a253e759d8e` |
| `.agents/skills/root-and-branch-review/SKILL.md`              | `d05b769a5ecfad3d76dcf1d3ec2c114904d1f1ce93619999cc376d80f73a9e69` |
| `.agents/skills/uplift-review-gates/SKILL.md`                 | `33610258ed4bcfaa9fe1043a7d7ec8ffdf882208c2c2a2123302efc65e8e23ab` |
| `tests/tooling/test_quotecheck.py`                            | `760d0b04fac659075204c9692a5a35ccd0c9639a8d39a8353e06f02d4403cd6d` |
