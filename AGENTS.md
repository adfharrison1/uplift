# Agent Guide — Uplift

**Uplift** is a 100% local, offline-capable first-person covert civilization simulation inspired by Iain M. Banks' Culture stories (*Inversions*, *Matter*, *Special Circumstances*), built with TypeScript, Three.js, and local ONNX embeddings (`@huggingface/transformers`) for a 2019 Intel Core i7 MacBook Pro (16GB RAM).

## Quick Verify (Run After Every Task)

```bash
npm run verify
```

`npm run verify` executes in sequence:
1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run test:arch` (Clean Architecture inward dependency & `Math.random` ban checks)
3. `npm run test:unit` (Fast deterministic unit, registry contract, and headless simulation tests in `<3s`)

## Clean Architecture Layer Rules (Enforced by `tests/architecture/layer_boundaries.test.ts`)

```text
interfaces/*         -> application, domain, infrastructure, content
application          -> domain
infrastructure       -> domain
content/topology/*   -> domain
content/scene/*      -> interfaces/three, domain
domain               -> NOTHING outward (pure TypeScript only)
```

| Layer | Path | Must NOT Import / Use |
|---|---|---|
| `domain` | `src/domain/` | `application`, `infrastructure`, `interfaces`, `content`, `three`, `@huggingface/transformers`, DOM/WebGL globals, `Math.random()`, `Date.now()`, implicit/explicit `any` |
| `application` | `src/application/` | `infrastructure`, `interfaces`, `three`, `@huggingface/transformers`, implicit/explicit `any` |
| `infrastructure` | `src/infrastructure/` | `application`, `interfaces`, `three`, implicit/explicit `any` |
| `content` (domain data/plugins) | `src/content/` (except `scene/`) | `infrastructure`, `interfaces`, `three`, `@huggingface/transformers`, `Math.random()`, `Date.now()`, implicit/explicit `any` |
| `interfaces` | `src/interfaces/` | implicit/explicit `any` |

## Strict TypeScript & Zero-`any` Policy

- `tsconfig.json` enforces `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, and `"noImplicitOverride": true`.
- Explicit `any` (`: any`, `as any`, `<any>`, `any[]`, `Record<string, any>`) is banned across `src/` and `tests/` and verified automatically in `tests/architecture/layer_boundaries.test.ts` on every `npm run verify`. Use `unknown` with type guards or generic type parameters `<T>` instead.

## Plug-and-Play Module Registries

Never hardcode specific characters, behaviors, rooms, props, or era rules inside `src/domain/` or `src/application/`. Register all content via declarative contracts wired in `src/interfaces/composition/`:

- **Characters (`CharacterBlueprint`)**: 3 tiers (`utility_schemer` Tier 1, `role_routine` Tier 2, `ambient_crowd` Tier 3) with `lineageId` for multi-era continuity.
- **Behaviors (`BehaviorModule`)**: Pure plugins (`canExecute`, `scoreUtility`, `execute -> WorldEffect[]`) with hysteresis commitment bonuses.
- **Spaces (`SpaceNode`)**: Supports both `indoor_room` (acoustic containment, doors) and `outdoor_area` (free-roam courtyard/commons, distance earshot falloff).
- **Props (`PropBlueprint`)**: 2 tiers (`interactive` with inspect/tamper state, `static` scenery with colliders and dynamic Uplift visuals).
- **Typed Custom State (`StateSliceKey<T>`)**: Use `defineStateSlice<T>(key, defaultValue)` for plugin state — never untyped `Record<string, any>`.
- **Era Legacy (`CivilizationLegacyState`)**: Carries societal axes, negative civilizational scars (`InheritedTrait[]`), and character lineage mutations across eras.

## Section-Specific Agent & Developer Guides (Hierarchical Map)

Root `README.md` and `AGENTS.md` provide high-level project instructions and point to scoped `README.md` and `AGENTS.md` files inside every major section of the codebase. **Always read the target section's `AGENTS.md` when working in that directory, and update both `<section>/README.md` and `<section>/AGENTS.md` when adding or changing capabilities:**

| Codebase Section | Human Overview (`README.md`) | Agent Rules & Recipes (`AGENTS.md`) | Scope |
|---|---|---|---|
| **Domain Layer** | [`src/domain/README.md`](src/domain/README.md) | [`src/domain/AGENTS.md`](src/domain/AGENTS.md) | Pure simulation models, `SeededRandom`, `StateSliceKey<T>`, reducer contracts, `CivilizationLegacyState` |
| **Application Layer** | [`src/application/README.md`](src/application/README.md) | [`src/application/AGENTS.md`](src/application/AGENTS.md) | Use cases, tick orchestration, `RenderFrameBuilder`, port interfaces |
| **Infrastructure Layer** | [`src/infrastructure/README.md`](src/infrastructure/README.md) | [`src/infrastructure/AGENTS.md`](src/infrastructure/AGENTS.md) | Local ONNX Web Worker, lexical/pragmatic parser, local model cache, save/load |
| **Content & Plugins** | [`src/content/README.md`](src/content/README.md) | [`src/content/AGENTS.md`](src/content/AGENTS.md) | Swappable Eras, Characters (Tiers 1–3), Behaviors, Spaces (indoor/outdoor), Props, Mechanics |
| **Interfaces Layer** | [`src/interfaces/README.md`](src/interfaces/README.md) | [`src/interfaces/AGENTS.md`](src/interfaces/AGENTS.md) | Three.js 60 FPS renderer, WASD/raycast controller, HUD, composition root |
| **Test Suites** | [`tests/README.md`](tests/README.md) | [`tests/AGENTS.md`](tests/AGENTS.md) | Architecture boundary tests, domain unit tests, content contract tests, headless simulation tests |

## Atomic Delivery, Pre-Commit Self-Review & Post-Change 5-Subagent Review

We use **OpenSpec (`opsx`)** across an 8-change roadmap (see `openspec/config.yaml`).

### 1. Pre-Commit Short Self-Review (Before Every Commit)
Within each change, every task in `tasks.md` is scoped to 1–3 files + tests (`1 Task = 1 Verified Commit`). Before running `git commit`:
1. Run the task's `Verify:` command and `npm run verify`.
2. Inspect `git diff --staged` and perform a short self-review checking:
   - **Scope**: Only files belonging to the current task are staged.
   - **Architecture & Types**: Clean Architecture inward boundaries hold; zero implicit or explicit `any`.
   - **Determinism & Immutability**: No `Math.random()` / `Date.now()` in `domain` or `content`; state updates do not mutate prior snapshots in place.
   - **Tests**: Edge cases and failure paths are asserted.
3. Create the atomic **Conventional Commit** and mark `- [x]` in `tasks.md`. Do not push to a remote unless explicitly asked.

```text
build(scaffold): initialize strict typescript vite and vitest toolchain
test(arch): enforce clean architecture boundaries and zero-any policy
feat(domain): add deterministic SeededRandom PRNG
feat(domain): add typed StateSliceKey registry and immutable store
docs(devex): add hierarchical README and AGENTS guides across all codebase sections
```

### 2. Post-Change 5-Subagent Review Gate (After Each Change Is Delivered)
When all tasks in a change are delivered (and before `/opsx-archive`), launch **5 parallel review subagents** (using Claude 4.5 Haiku Thinking) to review the change across 5 specialized dimensions:
1. **Adversarial Review**: Edge cases, malformed inputs, concurrency/race conditions, and failure modes.
2. **Code Adherence & Architecture Review**: Clean Architecture inward imports, zero-`any` compliance, plug-and-play registry boundaries, OpenSpec spec adherence, and hierarchical `README.md` / `AGENTS.md` completeness.
3. **Performance Review**: 2019 Intel Core i7 (16GB RAM) hardware budget, 60 FPS frame budget, cloning/allocation overhead, and algorithmic complexity.
4. **Testing Review**: Test coverage gaps, boundary/negative assertions, determinism, and execution speed (`<3s` unit/arch suite).
5. **Logic & Simulation Integrity Review**: Mathematical/bitwise correctness, state-transition invariants, and reducer purity.

Always double-check the subagents' findings against the actual code, apply any verified fixes in an atomic commit (`fix(<scope>): ...`), and re-run `npm run verify`.
