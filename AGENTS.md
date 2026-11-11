# Agent Guide — Uplift

Uplift is a local, offline-capable covert civilization simulation inspired by Banks and Saberhagen. The hardware target is a 2019 Intel Core i7 MacBook Pro with 16 GB RAM and 60 FPS presentation. Runtime and tests require no cloud inference or external API keys. Design intent and future systems live in [DESIGN_NOTES.md](DESIGN_NOTES.md); these guides describe shipped code.

## Worktree and documentation policy

Use the default checkout, including OpenSpec apply. Do not create or switch worktrees unless the owner requests it. Inspect the working tree before editing and preserve unrelated changes. Retain this policy when regenerating the apply skill.

New live OpenSpec change citations belong only in openspec/, DESIGN_NOTES.md and design/. Elsewhere describe capabilities, not change IDs or numbered changes. Workflow commands such as `/opsx-propose` are permitted. Tracked historical review reports remain immutable evidence under reviews/; do not rewrite them to satisfy live-guidance checks.

Read the target section's AGENTS before editing. Update both its README and AGENTS when capabilities change. Keep shipped guidance, planned design, ordered work and review dispositions in their canonical homes. Read the design notes and inbox before proposing work. Preserve owner wording and unresolved inbox entries; use the review-gates document-integrity procedure for moves and cuts.

## Quick Verify

Run `npm run verify` after every task. It runs format checking, lint, typechecking and one architecture/unit Vitest process concurrently, prints four PASS/FAIL summaries and waits for every check. Failure diagnostics stay grouped. The runner caps captured output at 1 MiB per check and terminates each process tree on overflow or interruption, with forced escalation after 500 ms. The reference-Mac target is under five seconds; record measurements instead of asserting wall-clock timing in tests. HTTP tests need loopback socket access.

`npm run verify:serial` keeps sequential checks; `npm run test:arch` and `npm run test:unit` remain callable separately. Every commit runs lint-staged followed by full verification. Either failure blocks the commit; the hook does not stage unrelated files. The owner approves each task before commit. Never push without an explicit request.

Read dependency versions and scripts from [package.json](package.json), the Node pin from [.nvmrc](.nvmrc), compiler settings from [tsconfig.json](tsconfig.json), and verification behavior from [scripts/verify.mjs](scripts/verify.mjs). Do not duplicate version or CVE tables.

## Local project status

Use `npm run roadmap:next -- --json` for validated active/next work and `npm run defects -- reconcile --check` at task checkpoints. Mutate defects through checked add/transition/update/reopen commands, with expected revisions and retained evidence; see [command guide](README.md#roadmap-and-defect-status). Keep verification files immutable. Resolved records live in archive receipts, not the active ledger. Use `npm run change:archive -- <id>` only after owner archive approval; it validates local scope, completion, final reviews and owned findings, then performs full CLI sync/archive with receipt finalization. Explicit `--resume` or defect repair/cancel handles interruption; never presync, hand-move, skip checks or rearchive a moved receipt. Never hand-edit history, extend legacy exemptions or steal a project lock.

## Architecture and deterministic code

| Layer                 | Allowed project dependencies                 |
| --------------------- | -------------------------------------------- |
| interfaces            | application, domain, infrastructure, content |
| application           | domain                                       |
| infrastructure        | domain                                       |
| content outside scene | domain                                       |
| content/scene         | interfaces/three, domain, three              |
| domain                | no outward project layers                    |

Domain is pure TypeScript with schema validation, without DOM/WebGL globals, Three.js or model runtimes. Application must not import infrastructure, interfaces, content, Three.js or model runtimes. Infrastructure must not import application, interfaces, content or Three.js. Content topology must not import outer layers or Three.js; scene content must not import application or infrastructure. All content excludes model runtimes.

Keep strict TypeScript and the existing null, index, optional-property and override checks. Implicit and explicit `any` are forbidden in source and tests. Preserve ESLint, Prettier and architecture assertions. Domain and content forbid ambient randomness/time; inject `SeededRandom` and clocks. Keep reducers pure and inputs immutable. Content identifiers, characters, rooms and behaviors belong in registered packs, never hardcoded in domain or application. Epoch and Era are synonyms; there is no fixed engine epoch count.

## Shipped contracts and consumers

`EpochModuleRegistry` accepts spatial, character, behavior, office, quiet-claim, rival, thread, channel, emergency and orbital blueprints. Character contracts include tiers, lineage, drives, emergency vice, inertia pillars and separation weight. The proving pack supplies spaces, bodies, a portal and a waypoint behavior. The additional registry kinds are contracts, not a playable economy, correspondence or rival campaign.

`applyWorldEffects` already implements pressure/discovery, emergency and orbital state transitions. `SimulationCoordinator` dispatches effects, steps waypoint kinematics, schedules cognition and exposes save/load and legacy helpers. Do not describe existing reducers as missing, or infer complete gameplay from their presence. `PlaySession` and the browser composition own one canvas, resident-stage switching, waypoint development controls and the stage lab.

The NDJSON logger, rolling compactor and file save repository exist. The browser uses in-memory telemetry and saves; it does not feed the disk logger. Stage-lab saves reach guarded local routes, but saved JSON is not loaded into the launch. Storage recovery and compaction limits are documented in the infrastructure guide.

## Section guides

| Section        | Human guide                            | Agent guide                            |
| -------------- | -------------------------------------- | -------------------------------------- |
| Domain         | [README](src/domain/README.md)         | [AGENTS](src/domain/AGENTS.md)         |
| Application    | [README](src/application/README.md)    | [AGENTS](src/application/AGENTS.md)    |
| Infrastructure | [README](src/infrastructure/README.md) | [AGENTS](src/infrastructure/AGENTS.md) |
| Content        | [README](src/content/README.md)        | [AGENTS](src/content/AGENTS.md)        |
| Interfaces     | [README](src/interfaces/README.md)     | [AGENTS](src/interfaces/AGENTS.md)     |
| Tests          | [README](tests/README.md)              | [AGENTS](tests/AGENTS.md)              |

## Project skills

Project skills live in .agents/skills/, never .cursor/skills/. Read the relevant skill before its workflow. Delivery gates retain three proposal, two task and six delivery reviewers; briefs specify high reasoning, medium-to-high model. Slot limits require waves, not fewer reviewers.

- [uplift-review-gates](.agents/skills/uplift-review-gates/SKILL.md): delivery reviews, G1–G6, task sizing and document integrity.
- [root-and-branch-review](.agents/skills/root-and-branch-review/SKILL.md): periodic whole-project review.
- [uplift-debug](.agents/skills/uplift-debug/SKILL.md): telemetry and simulation diagnosis.
- [uplift-design-notes](.agents/skills/uplift-design-notes/SKILL.md): assess and disposition raw design notes.
- [openspec-propose](.agents/skills/openspec-propose/SKILL.md): create planning artifacts and stop for owner review.
- [openspec-apply-change](.agents/skills/openspec-apply-change/SKILL.md): implement approved tasks with per-task approval.
- [openspec-update-change](.agents/skills/openspec-update-change/SKILL.md): revise planning artifacts without code edits.
- [openspec-explore](.agents/skills/openspec-explore/SKILL.md): investigate ideas and requirements.
- [openspec-sync-specs](.agents/skills/openspec-sync-specs/SKILL.md): synchronize delta specs without archiving.
- [openspec-archive-change](.agents/skills/openspec-archive-change/SKILL.md): archive delivered work after its gates.
