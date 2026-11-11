# Task 3 document integrity record

Status: staged drafts only; no live config/guide cuts. Two independent pre-cut reviews are pending. Source commit: `c0251a0`. Staged root: `/tmp/uplift-task3-stage`; full source map: `task-3-config-no-loss-map.json`. The exact original config is retained in `task-3-config-before.txt` as historical migration evidence, not current instructions.

## Measurements and source checks

| Document       | Before words | Initial staged words | Constraint                                                           |
| -------------- | ------------ | -------------------- | -------------------------------------------------------------------- |
| Root AGENTS    | 2,234        | 886                  | approximately 900; at most 1,050                                     |
| Config context | 4,837        | 704                  | below 1,500                                                          |
| DESIGN_NOTES   | 16,904       | 17,050               | approximately 14,000 aspirational; existing larger baseline accepted |

Counts are whitespace-delimited; the JSON companion records actual source/draft hashes and counts. No engineering split, new runtime code or test changes. Source/tooling scope is the existing OpenSpec configuration; other files are related documentation and evidence.

Root draft checks found 27 resolving Markdown links, including all ten project skills and twelve section README/AGENTS links. All four root npm commands resolve in package.json. Root code symbols were checked against public source exports: EpochModuleRegistry, SeededRandom, applyWorldEffects, SimulationCoordinator and PlaySession. Numeric runner claims remain sourced in scripts/verify.mjs; hardware/FPS goals are targets, not observed guarantees.

The staged config was copied into a temporary OpenSpec repository alongside the current active artifacts. Running `openspec instructions tasks --change process-gates-and-ledger --json` through the nvm Node runtime exited zero, emitted no stderr/unsupported-operation warning and returned all five new task rules. This is a staged CLI probe, not the required live post-install verification. No model-version assertion was added: the external installed CLI is separate from project manifests.

## Canonical homes and preservation

Design remains organised by system. Narrow missing contract names/tuning exemplars were added at existing design homes, not copied wholesale into a new appendix. No feature file was created, so the existing status-index rows still cover both touched detail files; design/README.md is inspected and unchanged. The Where-facts-live table corrects the false epoch engine-constant claim and identifies the shipped review skill. The roadmap retains every row/order/dependency; only evidenced status/scope debris changes. The dispositions section records the reconciliation without implying the whole proposal is delivered.

The entire inbox hash matches the task baseline; no raw note was removed. Historical reviews are untouched and explicitly treated as immutable evidence separate from live citation guidance. Existing HTTP, storage, recovery and test recipes are retained. The full config map has 119 rows and includes every old context block and artifact-rule/operation sentence, with exact source text and resolving destination anchors. Structural coverage is not proof of semantic no-loss; independent reviewers check that separately.

Two additional self-audit candidates were reported to the controller while the drafts were frozen: camera inspiration exemplars absent from canonical design, and the config's explicit substitute/right-martyr next-epoch consequences. They await the review/fix round and are not silently deemed preserved.

## Verification limits

Full npm verification and the required live CLI readback will run after authorized installation under the controller, with loopback access. Independent review passes, confirmed fixes and final hash/count evidence will supplement this record before approval. No commit, index staging, task checkbox or archive action has been performed.

## Pre-cut correction snapshot

The controller accepted T3-F1 through T3-F10 after the initial fidelity block and coherence pass. `task-3-fix-round-1.md` records the staged corrections and exact homes; both independent rechecks remain pending. Current counts: root 886, config context 704, DESIGN_NOTES 17174. Source/draft snapshot hashes are retained separately so the initial record remains auditable.

## Installation and pre-cut gate result

Both independent pre-cut gates passed after the bounded correction round and the explicit-throws refinement; see the controller-owned `task-3-reviews.md`. The controller verified live targets still matched the task baseline, verified frozen staged digests, then installed the exact reviewed snapshot. The implementer independently read back all 21 manifest targets and matched every digest to `task-3-round-1-draft-hashes.json`; `task-3-installed-hashes.json` retains the result and unchanged inbox digest. One target, design/README.md, is intentionally byte-identical to its original; 20 documentation/config files differ.

Final installed counts remain root AGENTS 886, config context 704 and DESIGN_NOTES 17,174. Root and config ceilings are satisfied; the design baseline is accepted and its aspirational target is not claimed met. No engineering-rule split or fixed epoch engine constant was introduced. T2-BUDGET-01 and T2-DOC-04 have concrete installed corrections. The append-only bootstrap inventory supplement records them and T3-F1 through T3-F10 with precise evidence; these remain document/process dispositions, not runtime ledger seed defects.

The required live `npm run verify`, CLI instructions readback and final installed-document reviews are controller-owned and pending at this implementer handoff. The controller will append their exact results; the earlier staged CLI success and pre-cut reviews are not substituted for them. No commit, index staging, task checkmark, push or archive action was performed by this implementer.
