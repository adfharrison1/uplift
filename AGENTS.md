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

## Atomic Delivery & Git Commits ("1 Task = 1 Verified Commit")

We use **OpenSpec (`opsx`)** across an 8-change roadmap (see `openspec/config.yaml`).
Within each change:
- Every task in `tasks.md` is scoped to 1–3 files + tests.
- Complete one task, run its `Verify:` command and `npm run verify`, create its atomic **Conventional Commit**, and mark `- [x]` in `tasks.md`.
- Do not push to a remote unless explicitly asked.

```text
build(scaffold): initialize vite typescript and vitest toolchain
test(arch): enforce inward layer dependency boundaries
feat(domain): add deterministic SeededRandom PRNG
feat(domain): add typed StateSliceKey registry for modular plugins
docs(devex): add README dependency manifest and verify script
```
