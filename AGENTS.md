# Agent Guide — Uplift

**Uplift** is a 100% local, offline-capable covert civilization simulation inspired by Iain M. Banks' Culture stories (_Inversions_, _Matter_, _Special Circumstances_) and Fred Saberhagen's _Brother Assassin_, built with TypeScript, Three.js (3rd-person fixed-orientation tracking camera + free-cam debug inspector), and local ONNX embeddings (`@huggingface/transformers`) for a 2019 Intel Core i7 MacBook Pro (16GB RAM).

## Quick Verify (Run After Every Task)

```bash
npm run verify
```

`npm run verify` executes in sequence:

1. `npm run format:check` (`prettier --check .`)
2. `npm run lint` (`eslint src tests vitest.config.ts`)
3. `npm run typecheck` (`tsc --noEmit` via native TypeScript 7.0.2)
4. `npm run test:arch` (Clean Architecture inward dependency, zero-`any`, `Math.random` ban, and section doc checks)
5. `npm run test:unit` (Fast deterministic unit, registry contract, and headless simulation tests in `<3s`)

## Clean Architecture Layer Rules (Enforced by `tests/architecture/layer_boundaries.test.ts`)

```text
interfaces/*         -> application, domain, infrastructure, content
application          -> domain
infrastructure       -> domain
content/topology/*   -> domain
content/scene/*      -> interfaces/three, domain
domain               -> NOTHING outward (pure TypeScript only)
```

| Layer                           | Path                             | Must NOT Import / Use                                                                                                                                                     |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`                        | `src/domain/`                    | `application`, `infrastructure`, `interfaces`, `content`, `three`, `@huggingface/transformers`, DOM/WebGL globals, `Math.random()`, `Date.now()`, implicit/explicit `any` |
| `application`                   | `src/application/`               | `infrastructure`, `interfaces`, `three`, `@huggingface/transformers`, implicit/explicit `any`                                                                             |
| `infrastructure`                | `src/infrastructure/`            | `application`, `interfaces`, `three`, implicit/explicit `any`                                                                                                             |
| `content` (domain data/plugins) | `src/content/` (except `scene/`) | `infrastructure`, `interfaces`, `three`, `@huggingface/transformers`, `Math.random()`, `Date.now()`, implicit/explicit `any`                                              |
| `interfaces`                    | `src/interfaces/`                | implicit/explicit `any`                                                                                                                                                   |

## Strict TypeScript, ESLint, Prettier & Zero-`any` Policy

- `tsconfig.json` enforces `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, and `"noImplicitOverride": true`.
- We use Microsoft's official TypeScript 7.0.2 side-by-side setup (`@typescript/native` for `tsc` 7.0.2 + `typescript` aliased to `@typescript/typescript6@6.0.2` for `typescript-eslint`).
- Explicit `any` (`: any`, `as any`, `<any>`, `any[]`, `Record<string, any>`) is banned across `src/` and `tests/` and verified by both ESLint (`@typescript-eslint/no-explicit-any`) and `tests/architecture/layer_boundaries.test.ts`. Use `unknown` with type guards or generic type parameters `<T>` instead.
- Prettier runs on save (`.vscode/settings.json`), and Husky + `lint-staged` run Prettier and ESLint on staged files on every `git commit`.

## Plug-and-Play Module Registries & Core Systems

Never hardcode specific characters, behaviors, rooms, props, roles, or era rules inside `src/domain/` or `src/application/`. Register all content and sub-types via declarative contracts wired in `src/interfaces/composition/`:

- **Characters (`CharacterBlueprint`)**: 3 tiers (`utility_schemer` Tier 1, `role_routine` Tier 2, `ambient_crowd` Tier 3) with `lineageId`, distinct attitude/voice profiles, and `inertia` weighting.
- **Rival Spacefaring Operatives (`RivalOperativeBlueprint`)**: Competing off-world operatives whose actions propagate across local and wider world nodes and can spoof or be detected on the Wider World Overview.
- **Roles & Groundside Funds (`RoleBlueprint`, `FundsEconomyModule`)**: Era-appropriate roles (with rank progression and physical Chambers/Office) granting legitimate funds vs. orbital-inserted illegitimate funds (which risk discovery and local inflation).
- **Wider World Overview & Async Correspondence (`WorldOverviewModule`, `MessageTransitQueue`)**: News, rumors, and time-lagged correspondence (horse courier -> telegraph -> email) to off-stage core NPCs.
- **Inertia Weighting, Slow-Burn Butterfly Threads & Crises (`TrajectoryThreadModule`)**: Slow-building historical threads, religious martyrdom/succession rules, and crises (wars, plagues, economic shocks).
- **Emergency States (`EmergencyStateModule`)**: Pauses non-related traits and activates emergency traits/rumors/resolutions until resolved.
- **Orbital Pass Mechanics & Weather Control (`OrbitalPassModule`, `WeatherControlModule`)**: Orbital position gating ability availability and localized weather control with overuse penalties.
- **Session Telemetry & Debug Skill**: Every event and AI input/output/reasoning trace logs to `./logs/current-session.jsonl` with rolling compaction and `.cursor/skills/uplift-debug/SKILL.md`.

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

## Atomic Delivery, Pre-Commit Self-Review & Post-Change 5-Subagent Review

We use **OpenSpec (`opsx`)** across the living atomic change roadmap in `openspec/config.yaml`. `DESIGN_NOTES.md` and `openspec/config.yaml` are living documents—before proposing any new change, always check `DESIGN_NOTES.md` for new notes or intermediate changes, and keep all engine parameters, camera settings, and module registries data-driven so design and config changes can be made at any time without structural rework.

### 1. Pre-Commit Short Self-Review (Before Every Commit)

Within each change, every task in `tasks.md` is scoped to 1–3 files + tests (`1 Task = 1 Verified Commit`). Before running `git commit`:

1. Run the task's `Verify:` command and `npm run verify`.
2. Inspect `git diff --staged` and perform a short self-review checking:
   - **Scope**: Only files belonging to the current task are staged.
   - **Architecture & Types**: Clean Architecture inward boundaries hold; zero implicit or explicit `any`.
   - **Determinism & Immutability**: No `Math.random()` / `Date.now()` in `domain` or `content`; state updates do not mutate prior snapshots in place.
   - **Tests**: Edge cases and failure paths are asserted.
3. Create the atomic **Conventional Commit** and mark `- [x]` in `tasks.md`. Do not push to a remote unless explicitly asked.

### 2. Post-Change 5-Subagent Review Gate (After Each Change Is Delivered)

When all tasks in a change are delivered (and before `/opsx-archive`), launch **5 parallel review subagents** (using Composer 2.5 Fast or Grok 4.7 High Fast) to review the change across 5 specialized dimensions:

1. **Adversarial Review**: Edge cases, malformed inputs, concurrency/race conditions, and failure modes.
2. **Code Adherence & Architecture Review**: Clean Architecture inward imports, zero-`any` compliance, plug-and-play registry boundaries, OpenSpec spec adherence, and hierarchical `README.md` / `AGENTS.md` completeness.
3. **Performance Review**: 2019 Intel Core i7 (16GB RAM) hardware budget, 60 FPS frame budget, cloning/allocation overhead, and algorithmic complexity.
4. **Testing Review**: Test coverage gaps, boundary/negative assertions, determinism, and execution speed (`<3s` unit/arch suite).
5. **Logic & Simulation Integrity Review**: Mathematical/bitwise correctness, state-transition invariants, and reducer purity.

Always double-check the subagents' findings against the actual code, apply any verified fixes in an atomic commit (`fix(<scope>): ...`), and re-run `npm run verify`.
