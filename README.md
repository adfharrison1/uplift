# Uplift

**Uplift** is a 100% local, offline-capable covert civilization simulation inspired by Iain M. Banks' Culture stories (_Inversions_, _Matter_, _Use of Weapons_ / _Special Circumstances_) and Fred Saberhagen's _Brother Assassin_.

The current build is a deterministic simulation foundation with a two-room proving pack, waypoint movement, portal requests, a fixed-orientation tracking camera, a stage/wardrobe inspector, guarded local disk bridges and headless tests. The page's waypoint and floor-click controls are development tools. Browser telemetry and saves currently stay in memory; stage-lab JSON can be saved to disk but is not loaded back into the launch.

The intended game follows covert operatives across a configurable civilizational ladder. The economy, rivals, conversations, generational campaign and local generated-text adapter remain design work. Registry schemas and several reducers exist for these systems; their presence does not imply complete gameplay. [DESIGN_NOTES.md](DESIGN_NOTES.md) distinguishes shipped foundations from planned systems and links their canonical detail.

---

## Hardware Target & Zero-API-Key Guarantee

- **Baseline Hardware**: Designed and budgeted for a **2019 Intel Core i7 MacBook Pro (16GB RAM)** at 60 FPS, running cross-platform on macOS and Windows.
- **100% Offline / Zero Cloud API Keys**: No OpenAI, Anthropic, or cloud inference keys are ever used. All simulation decisions run deterministically in pure TypeScript.

---

## Quick Start (Local Clone)

```bash
# 1. Activate the Node version selected by .nvmrc
nvm use

# 2. Install pinned dependencies (also configures Husky pre-commit hooks)
npm install

# 3. Run the full verification suite (format:check, lint, typecheck, test:arch, test:unit)
npm run verify
```

### Available NPM Scripts

| Command                 | Description                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`        | Runs format, lint, types and one combined architecture/unit test process concurrently; prints four PASS/FAIL summaries |
| `npm run verify:serial` | Runs the same checks sequentially, keeping separate architecture and unit test commands                                |
| `npm run format`        | Formats repository files with Prettier (`prettier --write .`)                                                          |
| `npm run format:check`  | Verifies Prettier formatting across all files (`prettier --check .`)                                                   |
| `npm run lint`          | Runs ESLint flat config (`eslint src tests vitest.config.ts vite.config.ts eslint.config.mjs scripts`)                 |
| `npm run lint:fix`      | Runs ESLint with automatic fixes                                                                                       |
| `npm run typecheck`     | Strict native TypeScript compiler check (`tsc --noEmit`, zero implicit/explicit `any`)                                 |
| `npm run test:arch`     | Enforces Clean Architecture layer boundaries, zero-`any`, determinism, and hierarchical section docs                   |
| `npm run test:unit`     | Runs deterministic Node/Vitest unit tests (reference target under three seconds)                                       |
| `npm run logs:query`    | Queries active (`current-session.jsonl`) and compacted session logs by level, actor, tick, or AI                       |
| `npm run dev`           | Starts the local Vite server (`/api/telemetry`, `/api/saves`, `/api/scene-blueprints`, `/api/character-visuals`)       |
| `npm run build`         | Typechecks and builds the local bundle                                                                                 |

Verification buffers each check’s output and prints failure diagnostics together. Output over 1 MiB per check fails that check and stops its process tree. Interrupts stop all check trees, escalating after 500 ms. The under-five-second target applies to the 2019 Intel reference Mac; actual timings depend on host and cache state. The test suite needs permission to open ephemeral loopback sockets.

### Editor Format-on-Save & Pre-Commit Hooks

- **Format on Save**: `.vscode/settings.json` enables `editor.formatOnSave` with Prettier (`esbenp.prettier-vscode`) and ESLint fix-on-save (`dbaeumer.vscode-eslint`).
- **Pre-Commit Hook**: `.husky/pre-commit` runs `npx lint-staged`, automatically formatting and linting staged files, then runs `npm run verify`. Either failure aborts the commit; unrelated files are not staged.

---

## Review workflows

[Delivery review gates](.agents/skills/uplift-review-gates/SKILL.md) define proposal, per-task and final independent reviews, consumer evidence, task sizing and document integrity. [Periodic root-and-branch review](.agents/skills/root-and-branch-review/SKILL.md) covers the whole project through baseline inspection, blind challenges, owner decisions and approved amendment batches. The [project skill index](AGENTS.md#project-skills) links all workflows. Claude can use `/root-and-branch-review` through the tracked skill symlink.

The portable quotechecker checks full source quotations and marks command evidence for human verification without executing commands. Its Python regression suite is separate from ordinary Node verification:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/tooling -p 'test_quotecheck.py'
```

## Toolchain sources

[package.json](package.json) is the source for exact dependency pins, supported Node engines, scripts and overrides; [.nvmrc](.nvmrc) selects the development runtime. Use `nvm use` before installing or verifying. The native TypeScript compiler and its JavaScript AST compatibility package are pinned there separately. Security attestations are not duplicated in this guide. OpenSpec is an external CLI, not a project dependency; inspect the installed CLI version when its behavior matters.

---

## Codebase Architecture & Section Guides

The codebase follows strict Clean Architecture inward dependency rules (`interfaces -> application -> domain <- infrastructure`, with plug-and-play content packs in `src/content/`). Each section maintains its own human `README.md` and agent `AGENTS.md`:

| Section            | Human Guide (`README.md`)                                      | Agent Guide (`AGENTS.md`)                                      | Responsibilities                                                                               |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Root**           | [`README.md`](README.md)                                       | [`AGENTS.md`](AGENTS.md)                                       | Master project overview, setup, and global agent governance                                    |
| **Domain**         | [`src/domain/README.md`](src/domain/README.md)                 | [`src/domain/AGENTS.md`](src/domain/AGENTS.md)                 | Pure TypeScript simulation core, `SeededRandom`, `StateSliceKey<T>`, `CivilizationLegacyState` |
| **Application**    | [`src/application/README.md`](src/application/README.md)       | [`src/application/AGENTS.md`](src/application/AGENTS.md)       | Use-case orchestration, tick coordination, `RenderFrameBuilder`, port interfaces               |
| **Infrastructure** | [`src/infrastructure/README.md`](src/infrastructure/README.md) | [`src/infrastructure/AGENTS.md`](src/infrastructure/AGENTS.md) | Session NDJSON logger & compactor, save/load repository, confined local storage                |
| **Content**        | [`src/content/README.md`](src/content/README.md)               | [`src/content/AGENTS.md`](src/content/AGENTS.md)               | Plug-and-play Eras, Characters (Tiers 1–3), Rivals, Roles, Behaviors, Spaces, Props, Mechanics |
| **Interfaces**     | [`src/interfaces/README.md`](src/interfaces/README.md)         | [`src/interfaces/AGENTS.md`](src/interfaces/AGENTS.md)         | Three.js 60 FPS 3rd-person tracking renderer, Debug Inspector, HUD, composition root           |
| **Tests**          | [`tests/README.md`](tests/README.md)                           | [`tests/AGENTS.md`](tests/AGENTS.md)                           | Architecture boundary enforcement, unit tests, content contract tests, simulation tests        |

## Roadmap and defect status

`npm run roadmap:next -- --json` validates the roadmap against actual active/archive directories and reports active proposals before selecting eligible planned work in declared order. Completion requires an archive or an evidenced review disposition; validation links do not become dependencies. `npm run defects -- list --json` lists active records; add `--include-resolved` for terminal receipt records or `--status open` to filter. These commands are read-only.

The tracked ledger is `openspec/defect-ledger.yaml`. IDs, severity, fixing owner and workflow status are separate. Open records enter through a JSON input containing `id`, `summary`, `source` (an array of path/anchor/description objects), `severity`, `status` and `fixing_change`. Parked inputs also require `parked_reason` and `revisit_when`; their owner may be null. Split findings use `parent_id`.

```sh
npm run defects -- add --file finding.json --expect-ledger-revision 0
npm run defects -- transition EXAMPLE --to in_progress --expect-revision 1 --reason 'Fix underway'
npm run defects -- transition EXAMPLE --to blocked --expect-revision 2 --reason 'Dependency unavailable' --blocker 'Required contract missing'
npm run defects -- update EXAMPLE --file patch.json --expect-revision 3 --reason 'Ownership adjudicated'
npm run defects -- reconcile --check
```

Mutation inputs must be repository-relative JSON files. Commands reject unknown fields/options, stale revisions, no-op changes and unsafe paths. Updates can add sources or change summary, severity, owner, blocker/revisit details and evidence. The transition graph is:

| From        | Permitted destinations          |
| ----------- | ------------------------------- |
| open        | in_progress, blocked, parked    |
| in_progress | open, blocked, verified, parked |
| blocked     | open, in_progress, parked       |
| verified    | open, in_progress, blocked      |
| parked      | open                            |

Every transition needs a reason. Use `--blocker`, `--revisit-when` and `--owner` for destination prerequisites; `--owner null` deliberately unschedules parked work. Leaving blocked/parked clears obsolete current fields while retaining history. Verification uses `--evidence evidence.json`, with a `fix_ref`, successful `tests` records (command/outcome/locator), and independent `reviews` records (reviewer/brief/disposition/locator). Git fixes use `{ "kind": "git", "commit": "<commit object ID>" }`. File references use `{ "kind": "repo", "path": "proof.md", "sha256": "<digest>" }` or `{ "kind": "change", "change_id": "example", "relative_path": "proof.md", "sha256": "<digest>" }`; the latter survives archive moves. Files beneath active changes must use a change locator. Referenced files must be tracked. Commands validate retained evidence; they never execute evidence commands or establish semantic correctness.

Verified ownership, summary and core evidence changes require a transition out of verified first. Supplementary evidence may be added while verification remains intact. Keep evidence files immutable: an externally changed historical digest fails closed, including a requested reopening. Restore the retained original bytes and put new evidence in a separate file before recording the new decision; never rewrite historical events to conceal the mismatch. Resolved records remain immutable in receipts; `defects reopen OLD --new-id NEW --owner example --reason 'Recurrence' --expect-ledger-revision N` creates a linked successor.

Reconciliation detects missing nonlegacy receipts, bypass archives and pending cleanup even after active rows disappear. For an existing supported transaction, `npm run defects -- reconcile --repair --change example` finishes only matching before/after states; `--cancel --change example` removes generated state only before the move with intact preimages. Conflicts preserve files for inspection. All writers share an exclusive project lock, hash rechecks and atomic replacement. A stale lock is never stolen: inspect its reported PID and remove it only after confirming no writer remains. Direct editors ignoring the lock remain outside its serialization guarantee.

### Archive and recovery

After the owner approves archive, run `npm run change:archive -- example` from the repository root. The installed OpenSpec CLI must be on PATH; the wrapper uses the current Node runtime and disables CLI telemetry/version network checks. It accepts only a safe change ID and optional `--resume`; external stores, skip-spec/validation flags and lock overrides are unsupported.

Preflight checks the resolved local context/list/status roots, schema-tracked artifact/task completion, six retained final reviews, strict validation and reconciled graph/ledger. Every owned defect must be verified; parked findings still assigned to the change block archive. Already synchronized/conflicting deltas require inspection. Do not manually sync before archive. One full CLI archive performs spec synchronization and the move, then the wrapper finalizes matching receipt/ledger/roadmap state and reads the combined list and reconciliation before reporting success.

Before requesting archive approval, retain `final-reviews.yaml` inside the active change with `schema_version: 1`, `change_id`, and exactly six `reviews`. Each review has `dimension`, a distinct nonempty `reviewer`, nonempty `brief`, `disposition: passed`, and `locator` using the tracked, digested file-reference format above. Required dimensions are `adversarial`, `architecture-adherence`, `performance`, `testing`, `logic-integrity` and `design-coherence`, each once. Use change locators for files that move with a change. Review proof must be an immutable snapshot outside the main-spec output tree. The receipt retains these locators so direct repair and reconciliation also validate repository and other-change proof after a move. This record verifies evidence presence/integrity; independent judgment, G1–G6 and owner approval remain the review workflow's responsibility. Do not manufacture passed reviews to satisfy preflight.

The prepared `defect-resolution.yaml` travels with the change; `openspec/archive-transaction.yaml` retains recovery intent. Every new archive needs a finalized receipt, including archives with no defects. All original change files are bound to the receipt’s preimage digests, including the final-review manifest and proof files. Repair, listing and reconciliation reject changed or missing archived originals; restore their retained bytes and use new supplementary files for later evidence. Main specs are excluded from this archived-original check because synchronization intentionally updates them. Actual CLI naming is reconciled against declared roadmap IDs: an original valid date-prefixed ID remains intact, and ambiguous or invalid calendar-prefixed identities are rejected before the move. Never rename a destination manually.

| Observed state                                       | Explicit action                                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failed before move; preimages intact                 | `npm run change:archive -- example --resume` refreshes checks and continues the prepared transaction.                                                                        |
| Cancel before move                                   | `npm run defects -- reconcile --cancel --change example` removes only generated state, preserving original files.                                                            |
| Moved; cleanup interrupted                           | `npm run defects -- reconcile --repair --change example`, or the wrapper's `--resume`, finishes matching state without running archive again. Repeated repair is idempotent. |
| Conflicting edits, bypass archive or missing receipt | Preserve evidence and inspect; do not guess a repair, rewrite history or extend legacy exemptions.                                                                           |

Even a nonzero CLI result is checked against actual directories. Pending listings retain affected IDs when ledger cleanup has already happened; successful cleanup requires receipt, roadmap, combined-list and reconciliation readback. Cancellation after the move is refused. The shared lock covers synchronous preflight through finalization; arbitrary editors ignoring it can still race after the last hash check.
