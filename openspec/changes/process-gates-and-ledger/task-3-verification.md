# Task 3 installed verification

Current status: the reviewed document/config snapshot is installed. This supersedes the earlier staged-only and pending-check status in the initial mapping/integrity/handoff records; those remain as chronology. No commit or task checkbox is authorized by this record. Source base: c0251a0.

## Actual command results

Node commands used the existing nvm runtime at `/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin`. The installed OpenSpec entry point was `/opt/homebrew/bin/openspec`, executed by that Node binary.

- `npm run verify`: **PASS** format:check 1,308 ms; lint 1,628 ms; typecheck 877 ms; test 3,815 ms. Existing loopback HTTP tests ran with authorized socket access. No suite was skipped or weakened. Timings describe this host/run, not a new reference-Mac benchmark.
- `openspec instructions tasks --change process-gates-and-ledger --json`: **exit 0**, empty stderr (no unsupported-operation warning), all **five** new task rules returned. This was run against the installed live config, separately from the implementer's temporary-repository probe. Exact stdout is retained in [task-3-live-instructions.json](task-3-live-instructions.json).
- `openspec validate process-gates-and-ledger --strict`: **exit 0**, “Change 'process-gates-and-ledger' is valid”.
- `git diff --check`: **PASS** after installation.

## Source, identity and navigation checks

Controller readback confirms all **21** installed snapshot digests equal the reviewed frozen hashes (20 changed files; design/README.md is inspected and unchanged). The retained exact config snapshot equals `git show c0251a0:openspec/config.yaml`. Every source block and all 119 mapping rows resolve; each live destination anchor exists. Original source text stays in migration evidence, explicitly not a second live design authority.

All **56** Markdown file-link targets across the installed snapshot resolve. Root has all **ten** project skill links; its four npm commands (`verify`, `verify:serial`, `test:arch`, `test:unit`) resolve in package.json. Root code names were checked against current exports: EpochModuleRegistry, SeededRandom, applyWorldEffects, SimulationCoordinator and PlaySession. Runner numeric claims resolve to scripts/verify.mjs; goals remain labeled as targets. Source/schema-owned vocabulary has precise destinations in the corrected map and domain guide. Paired section links and structural architecture checks pass.

Final whitespace-delimited counts: root AGENTS **886** (before 2,234; ceiling 1,050); parsed config context **704** (before 4,837; below 1,500); DESIGN_NOTES **17,174** (before 16,904; accepted aspirational roughly 14,000 target). The design increase retains unique source detail rather than cutting meaning to satisfy a nonbinding target. No engineering split occurred. All existing feature files retain status-index coverage; no new feature file was created.

All **87** roadmap entries retain their IDs, order and dependencies. The entire inbox digest remains `201f90608ff5ec4f887bb67b57cd5666e9ddc07af7ac633b23ad8c0c2be4e4ed`. Historical reviews, runtime source, package scripts, tests and the task checkbox remain unchanged. Only documentation and the approved OpenSpec configuration/roadmap are modified.

## G1–G6 and limits

- G1: real installed config → OpenSpec task-instruction consumer → five supported rules with no warning. Shipped guide claims are traced to actual source consumers; no new gameplay flow is claimed.
- G2: owner authority, canonical homes and exact source snapshots retained; cuts waited for two independent pre-cut passes. No runtime trust boundary changes.
- G3: no runtime/hot-path code changes; verification measurements above, no target-machine rendering benchmark.
- G4: the first fidelity review blocked installation; missing content was restored before cuts, reviewed again, and installation checked both base bytes and frozen hashes. Recovery/storage recipes remain source-grounded.
- G5: **bootstrap inventory checked**; all T3-F1–F10 document findings and prior T2 budget/cap debt retain ownership and fix evidence. Checked ledger tooling is future work; no reconciliation command is claimed run.
- G6: task-specific source/identifier/link/count/CLI checks and full verification completed. Structural docs-truth tests belong to the later enforcement task and are not claimed shipped here. Independent final task reviews are retained in task-3-reviews.md.

Owner commit approval remains the next checkpoint after final review evidence is complete. No archive or push is performed.
