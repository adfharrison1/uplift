# Agent Guide — Uplift

**Uplift** is a 100% local, offline-capable covert civilization simulation inspired by Iain M. Banks' Culture stories (_Inversions_, _Matter_, _Special Circumstances_) and Fred Saberhagen's _Brother Assassin_, built with TypeScript, Three.js (3rd-person fixed-orientation tracking camera + free-cam debug inspector), and local ONNX embeddings (`@huggingface/transformers`) for a 2019 Intel Core i7 MacBook Pro (16GB RAM).

## Quick Verify (Run After Every Task)

```bash
npm run verify
```

`npm run verify` executes in sequence:

1. `npm run format:check` (`prettier --check .`)
2. `npm run lint` (`eslint src tests vitest.config.ts vite.config.ts eslint.config.mjs`)
3. `npm run typecheck` (`tsc --noEmit` via native TypeScript 7.0.2)
4. `npm run test:arch` (Clean Architecture inward dependency, zero-`any`, `Math.random` ban, and section doc checks)
5. `npm run test:unit` (Fast deterministic unit, registry contract, and headless simulation tests in `<3s`)

## Clean Architecture Layer Rules (Enforced by `tests/architecture/layer_boundaries.test.ts`)

```text
interfaces/*         -> application, domain, infrastructure, content
application          -> domain
infrastructure       -> domain
content/* (topology) -> domain
content/scene/*      -> interfaces/three, domain, three
domain               -> NOTHING outward (pure TypeScript only)
```

| Layer                           | Path                             | Must NOT Import / Use                                                                                                                                                     |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`                        | `src/domain/`                    | `application`, `infrastructure`, `interfaces`, `content`, `three`, `@huggingface/transformers`, DOM/WebGL globals, `Math.random()`, `Date.now()`, implicit/explicit `any` |
| `application`                   | `src/application/`               | `infrastructure`, `interfaces`, `content`, `three`, `@huggingface/transformers`, implicit/explicit `any`                                                                  |
| `infrastructure`                | `src/infrastructure/`            | `application`, `interfaces`, `content`, `three`, implicit/explicit `any`                                                                                                  |
| `content` (domain data/plugins) | `src/content/` (except `scene/`) | `application`, `infrastructure`, `interfaces`, `three`, `@huggingface/transformers`, `Math.random()`, `Date.now()`, implicit/explicit `any`                               |
| `content/scene` (3D visuals)    | `src/content/scene/`             | `application`, `infrastructure`, `@huggingface/transformers`, `Math.random()`, `Date.now()`, implicit/explicit `any`                                                      |
| `interfaces`                    | `src/interfaces/`                | implicit/explicit `any`                                                                                                                                                   |

## Strict TypeScript, ESLint, Prettier & Zero-`any` Policy

- `tsconfig.json` enforces `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, and `"noImplicitOverride": true`.
- We use Microsoft's official TypeScript 7.0.2 side-by-side setup (`@typescript/native` for `tsc` 7.0.2 + `typescript` aliased to `@typescript/typescript6@6.0.2` for `typescript-eslint`).
- Explicit `any` (`: any`, `as any`, `<any>`, `any[]`, `Record<string, any>`) is banned across `src/` and `tests/` and verified by both ESLint (`@typescript-eslint/no-explicit-any`) and `tests/architecture/layer_boundaries.test.ts`. Use `unknown` with type guards or generic type parameters `<T>` instead.
- Prettier runs on save (`.vscode/settings.json`), and Husky + `lint-staged` run Prettier and ESLint on staged files on every `git commit`.

## Plug-and-Play Module Registries & Core Systems

Throughout **Uplift**, **`Epoch` and `Era` are 100% synonymous** (`Epoch 1 === Era 1`; code uses `epochId`), and the campaign's Epoch ladder (`EpochProfileBlueprint[]`, default 7-Epoch arc: `Feudal -> Renaissance -> Pre-Industrial/Colonial -> Industrial/WWI -> Cold-War -> Computer-Age -> Space-Age/1st-Contact`) is 100% data-driven and configurable. Never hardcode specific characters, behaviors, rooms, props, offices, or epoch counts inside `src/domain/` or `src/application/`. Register all content and sub-types via `EpochModuleRegistry`:

- **Characters (`CharacterBlueprint`, `CharacterVisualBlueprint`)**: 3 tiers (`utility_schemer` Tier 1, `role_routine` Tier 2, `ambient_crowd` Tier 3) with `lineageId`, `drives`, `emergencyVice`, `inertiaPillars` (`InertiaPillar[]`: `doctrine`, `constituency`, `debt`, `temper`, `ignorance`), and 3D posture/wardrobe kitbashing.
- **Rival Spacefaring Operatives (`RivalCivBlueprint`)**: Competing off-world operatives whose actions propagate across local and wider world nodes (`orbitalOffsetTicks`, `spoofMode`) and can spoof or be detected on the Wider World Overview.
- **Contested Offices, Quiet Claims & Economy (`OfficeBlueprint`, `QuietClaimBlueprint`, `IllicitInstrumentType`, `PressureStockType`)**: Contested offices (`institutionalLineageId`, `pretextFamilies`, `stipendPerTick`) and deniable Quiet Claims vs. 3 orbital-inserted illicit fund modes (`insert_illicit_instrument`) impacting 3 societal pressure stocks and 4 discovery layers (`'noticed' | 'assayed' | 'attributed' | 'theorized'`).
- **Wider World Overview & Async Correspondence (`ChannelMediumBlueprint`, `WorldOverviewModule`, `MessageTransitQueue` — Change 06)**: News, rumors, and time-lagged correspondence (horse courier -> semaphore/post -> telegraph -> radio/CRT -> email) to off-stage core NPCs.
- **Unified Interpersonal `Regard` Web & Manipulative Romantasy (`RegardGraphModule`, `RomanticMotiveBlueprint` — Change 06a)**: 2-tier hybrid social graph scaling to 500+ on-stage and off-stage characters (`affection`, `respect`, `trust`, `dread`, `obligation`, `exposure`, `bondKind`), relational triangulation & letter co-signing, and double-motive romantasy subplots.
- **Epoch 2+ Interactive Fast-Travel Vignettes (`TravelVignetteCoordinator`, `VehicleKindBlueprint`, `TransitRouteBlueprint`, `TravelSurfaceCueBlueprint` — Change 06c)**: Bounded vehicle-cabin stages (fast travel that is still a Clock-1 scene and a Clock-2 watch spend), fellow passengers, diegetic news, two independent social/news rolls that may mutate trip pretext / origin / destination / wider world, a summary skip that still resolves pending rolls, and small live world-state surface cues on the cabin. Epoch 1 has no travel vignettes; later Epochs become less limited one `travelTechTier` rung at a time.
- **Assassination, Counter-Assassination & Cover Persecution (`ViolentPlotModule`, `AnomalousSuspectState` — Change 06b)**: 4 last-resort assassination vectors, counter-assassination weighted by the Companion Drone's (`advisor_particular`) disposition and rival operative timing, and epoch-agnostic `coverPersecutionRisk` trials skinned per Epoch.
- **4-Clock Campaign Pacing, Curve Envelopes & Storyteller Director (`PacingProfileBlueprint`, `CurveEnvelopeSchema`, `StorytellerPacingDirector` — Change 05b)**: Separates 60Hz room embodiment from integer Campaign Watches (`elapsedWatches`), governing 50–100h tension-and-recovery waveforms, 5-stage Butterfly Thread point-releases, slow-drift NPC evolution, and compositional `StoryletTemplate` injection via live-editable curve envelopes (`PUT /api/pacing-profiles/:profileId`).
- **Inertia Weighting, Slow-Burn Butterfly Threads & Crises (`TrajectoryThreadBlueprint`)**: Slow-building historical threads, religious martyrdom/succession rules (`primaryCandidateLineageId`, `substituteCandidateLineageId`), and crises with `dualUseCeiling`.
- **Emergency States (`EmergencyStateBlueprint`)**: Pauses non-related traits and compounds `emergencyVice` drives (`trigger_emergency`, `compound_emergency_vices`, `resolve_emergency`) until resolved.
- **Orbital Pass Mechanics, Weather Control & Blackout Contingencies (`OrbitalPassBlueprint`, `OrbitalPassRuntimeState`, `WeatherControlModule`, `CampaignContingencyScheduler` — Changes 09 & 09a)**: Orbital position gating ability availability, localized weather control with overuse penalties, and conditional Endgame Rival Ship Ambush + 5-event random pool of once-per-playthrough orbital blackout contingencies with stratified anti-clustering epoch pacing.
- **Configurable $N$-Epoch Operative Rotation, Anti-Over-Acceleration Ceilings & Predecessor Traces (`runInterEpochMaturation`, `EpochTechCeilingBlueprint`, `ExtractionStillFrameBuilder` — Change 10)**: Measured one-rung-at-a-time progression across the configured `EpochProfileBlueprint[]` ladder (default 7 Epochs) with 15–30 year generational compression (adjacent-Epoch NPC aging `youth -> prime -> elder -> succeeded_by_heir`) and strict `maxTechTierForEpoch` and `maxMaturationStepPerTransition = 1` ceilings, 4-panel procedural chiaroscuro extraction stills, `semanticId` predecessor traces, `kin_claim` vs `fresh_start`, and seeded Ship/Drone (`advisor_integral` / `advisor_particular`) temperament + `droneDisguisePool` rolls.
- **Session Telemetry & Debug Skill**: Every event and AI input/output/reasoning trace logs to `./logs/current-session.jsonl` (50 MiB active cap / 500 MiB compacted cap) with rolling compaction and `.agents/skills/uplift-debug/SKILL.md`.
- **Agent Skills Rule (Enforced by `npm run test:arch`)**: Always place project agent skills in `.agents/skills/<skill-name>/SKILL.md` — never in `.cursor/skills/`.

## Section-Specific Agent & Developer Guides (Hierarchical Map)

Root `README.md` and `AGENTS.md` provide high-level project instructions and point to scoped `README.md` and `AGENTS.md` files inside every major section of the codebase. **Always read the target section's `AGENTS.md` when working in that directory, and update both `<section>/README.md` and `<section>/AGENTS.md` when adding or changing capabilities:**

| Codebase Section         | Human Overview (`README.md`)                                   | Agent Rules & Recipes (`AGENTS.md`)                            | Scope                                                                                                    |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Domain Layer**         | [`src/domain/README.md`](src/domain/README.md)                 | [`src/domain/AGENTS.md`](src/domain/AGENTS.md)                 | Pure simulation models, `SeededRandom`, `StateSliceKey<T>`, reducer contracts, `CivilizationLegacyState` |
| **Application Layer**    | [`src/application/README.md`](src/application/README.md)       | [`src/application/AGENTS.md`](src/application/AGENTS.md)       | Use cases, tick orchestration, `RenderFrameBuilder`, port interfaces                                     |
| **Infrastructure Layer** | [`src/infrastructure/README.md`](src/infrastructure/README.md) | [`src/infrastructure/AGENTS.md`](src/infrastructure/AGENTS.md) | Session NDJSON logger & compactor, save/load repository, local ONNX Web Worker                           |
| **Content & Plugins**    | [`src/content/README.md`](src/content/README.md)               | [`src/content/AGENTS.md`](src/content/AGENTS.md)               | Swappable Eras, Characters (Tiers 1–3), Rivals, Roles, Behaviors, Spaces, Props, Mechanics               |
| **Interfaces Layer**     | [`src/interfaces/README.md`](src/interfaces/README.md)         | [`src/interfaces/AGENTS.md`](src/interfaces/AGENTS.md)         | Three.js 60 FPS 3rd-person tracking renderer, Debug Inspector, HUD, composition root                     |
| **Test Suites**          | [`tests/README.md`](tests/README.md)                           | [`tests/AGENTS.md`](tests/AGENTS.md)                           | Architecture boundary tests, domain unit tests, content contract tests, headless simulation tests        |

## Atomic Delivery, Post-Propose Audit, Pre-Commit Self-Review & Post-Change 6-Subagent Review

We use **OpenSpec (`opsx`)** across the living atomic change roadmap in `openspec/config.yaml`. `DESIGN_NOTES.md` and `openspec/config.yaml` are living documents—before proposing any new change, always check `DESIGN_NOTES.md` for new notes or intermediate changes, and keep all engine parameters, camera settings, and module registries data-driven so design and config changes can be made at any time without structural rework.

### 1. Post-Propose 3-Subagent Spec Audit Gate (Before `/opsx-apply`)

After generating `proposal.md`, `specs/*`, `design.md`, and `tasks.md` in `/opsx-propose`, launch **three parallel subagents** (using Composer 2.5 Fast or Grok 4.7 High Fast) to audit the change artifacts before implementation:

1. **Subagent A — Architecture, Adversarial, Determinism & Hardware Audit**: Checks Clean Architecture inward layer placement, epoch-agnostic plug-and-play contracts (zero feudal hardcoding in `domain`), race conditions/immutability/determinism, zero external APIs, and 2019 Intel Mac 60 FPS / `<5s` verify budgets.
2. **Subagent B — Spec Completeness, `DESIGN_NOTES.md` Alignment & Task Atomicity Audit**: Checks `WHEN`/`THEN` scenario coverage (including negative/error cases), alignment with `DESIGN_NOTES.md` and `openspec/config.yaml`, and verifies `tasks.md` has 4–6 atomic tasks (1–3 files each) ordered inward-out so every intermediate commit compiles and passes `npm run verify`.
3. **Subagent C — Game-Industry Standards, Best Practices, User safety, Accessibility, Gotchas & Extensibility Audit**: Checks game-industry simulation/architecture best practices, user-safety, accessibility, gotchas, possible coding-into-a-corner, future-proofing, and extensibility.

Fold verified improvements from the 3 subagents into the OpenSpec artifacts, run `npx openspec validate "<change>" --strict`, and **pause for user review and approval before starting `/opsx-apply`**.

### 2. Per-Subtask 2-Subagent Review & Pre-Commit Self-Review (Before Pausing for User Review & Committing)

Within each change, every task in `tasks.md` is scoped to 1–3 files + tests (`1 Task = 1 Verified Commit`). For every subtask:

1. Implement the subtask and run its `Verify:` command and `npm run verify`.
2. Launch **2 parallel review subagents** (using Composer 2.5 Fast or Grok 4.7 High Fast) with broad, non-overlapping review briefs on the subtask's files:
   - **Subagent A — Correctness, Logic, Edge Cases & Performance**: Audits algorithmic/state-machine logic, boundary/malformed inputs, immutability, determinism, and CPU/memory efficiency.
   - **Subagent B — Architecture, Spec/Design Adherence, Types & Test Coverage**: Audits Clean Architecture inward boundaries, zero-`any` / Zod conventions, alignment with the change's spec/design, and unit test assertion quality/gaps.
3. Double-check their findings, apply any verified fixes, re-run `npm run verify`, and inspect `git diff --staged` before pausing for user review.
4. Once approved, create the atomic **Conventional Commit** and mark `- [x]` in `tasks.md`. Do not push to a remote unless explicitly asked.

### 3. Post-Change 6-Subagent Review Gate (After Each Change Is Delivered)

When all tasks in a change are delivered (and before `/opsx-archive`), launch **6 parallel review subagents** (using Composer 2.5 Fast or Grok 4.7 High Fast) to review the change across 6 specialized dimensions:

1. **Adversarial Review**: Edge cases, malformed inputs, concurrency/race conditions, and failure modes.
2. **Code Adherence & Architecture Review**: Clean Architecture inward imports, zero-`any` compliance, plug-and-play registry boundaries, OpenSpec spec adherence, and hierarchical `README.md` / `AGENTS.md` completeness.
3. **Performance Review**: 2019 Intel Core i7 (16GB RAM) hardware budget, 60 FPS frame budget, cloning/allocation overhead, and algorithmic complexity.
4. **Testing Review**: Test coverage gaps, boundary/negative assertions, determinism, and execution speed (`<3s` unit/arch suite).
5. **Logic & Simulation Integrity Review**: Mathematical/bitwise correctness, state-transition invariants, and reducer purity.
6. **Design Notes, Thematic Consistency & Coherence Review**: Adherence to `DESIGN_NOTES.md`, thematic consistency, and overall coherence of the change.

Always double-check the subagents' findings against the actual code, apply any verified fixes in an atomic commit (`fix(<scope>): ...`), and re-run `npm run verify`.
