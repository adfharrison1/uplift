## Context

See `proposal.md` for motivation. This is Change 1 of the 8-change MVP sequence (`01-clean-scaffold-and-verify`), establishing the repository toolchain, strict TypeScript configuration, Clean Architecture enforcement, and foundational domain primitives (`SeededRandom`, `StateSliceRegistry`) on a 2019 Intel Core i7 MacBook Pro (16GB RAM).

## Goals / Non-Goals

**Goals:**
- Pin exact latest stable and CVE-patched package versions as of 2026-10-29.
- Enforce Clean Architecture inward dependency direction, the ban on implicit/explicit `any`, and the ban on unseeded `Math.random()` / `Date.now()` via a zero-dependency AST/regex architecture test suite (`tests/architecture/layer_boundaries.test.ts`).
- Deliver pure, 100% deterministic `SeededRandom` and `StateSliceStore` primitives in `src/domain/core/`.

**Non-Goals:**
- Introducing runtime `three` or `@huggingface/transformers` code in this change (those packages are documented in the stack manifest and added when their respective adapter changes arrive, keeping Change 1 install and test times ultra-fast).

## Decisions

### 1. Pinned Versions Table (Verified 2026-10-29, Including Latest Security / CVE Fixes)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
|---|---|---|
| Node.js LTS | `24.22.2` (or `26.13.0`) | Runtime; includes Oct 21, 2026 security patches (`CVE-2026-111497` Brotli RCE, `CVE-2026-105482` DNS NUL byte truncation, `CVE-2026-105483` / `CVE-2026-106069` TLS bypass, `CVE-2026-106074` crypto entropy cache) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `typescript` | `7.0.2` | Strict static typechecker (`tsc --noEmit`) |
| `vite` | `8.3.5` | Local dev server and bundler |
| `vitest` | `5.0.5` | Fast unit, architecture, and headless simulation test runner |
| `@types/node` | `24.19.2` | Node.js type definitions for test & build scripts |
| `three` *(Change 3)* | `0.186.1` (`@types/three` `0.186.0`) | 3D WebGL renderer (installed in Change 3) |
| `@huggingface/transformers` *(Change 7)* | `4.3.2` | Local ONNX runtime in Web Worker (installed in Change 7) |

### 2. Layer Placement & Hierarchical Documentation Map

```text
README.md                    # Master project overview, setup/run guide, pinned deps, links to section READMEs
AGENTS.md                    # Master agent guide, /verify workflow, commit rules, links to section AGENTS.md files
src/
  domain/
    README.md                # Human docs: domain responsibilities, deterministic simulation & legacy state
    AGENTS.md                # Agent rules: zero outward imports, SeededRandom & StateSliceKey conventions
    core/
      SeededRandom.ts        # Pure Xorshift32 PRNG (zero imports)
      StateSliceRegistry.ts  # Typed StateSliceKey<T>, StateSliceRegistry, StateSliceStore
    index.ts
  application/
    README.md                # Human docs: use-case orchestration & port contracts
    AGENTS.md                # Agent rules: depends only on domain; no Three.js or ONNX imports
    index.ts
  infrastructure/
    README.md                # Human docs: local ONNX worker, lexical parser, persistence adapters
    AGENTS.md                # Agent rules: implements domain ports; 100% offline/local inference only
    index.ts
  content/
    README.md                # Human docs: plug-and-play content packs (eras, NPCs, behaviors, spaces, props)
    AGENTS.md                # Agent rules: step-by-step recipes for adding/swapping content modules
    index.ts
  interfaces/
    README.md                # Human docs: Three.js 60 FPS renderer, HUD, and composition root
    AGENTS.md                # Agent rules: wiring in composition/, presentation separation from domain
    index.ts
tests/
  README.md                  # Human docs: test tiers (architecture, unit, content contract, simulation)
  AGENTS.md                  # Agent rules: fast deterministic testing without WebGL or 23MB ONNX loads
  architecture/
    layer_boundaries.test.ts # Enforces layer imports, zero explicit `any`, no Math.random/Date.now, and section README/AGENTS presence
  unit/
    domain/
      SeededRandom.test.ts
      StateSliceRegistry.test.ts
```

- *Alternative considered*: Using an external ESLint + `eslint-plugin-import` + `@typescript-eslint` stack (50+ transitive packages).
- *Decision*: Combine `tsc --noEmit` (with maximum strictness flags in `tsconfig.json`) and a fast, self-contained Vitest static scanner (`tests/architecture/layer_boundaries.test.ts`) that strips comments/strings and checks all import specifiers, explicit `any` tokens, and forbidden non-deterministic globals in `<100ms` with zero extra dependency surface.

### 3. Local Dev Setup & Verification Commands

- `npm run typecheck`: `tsc --noEmit`
- `npm run test:arch`: `vitest run tests/architecture/`
- `npm run test:unit`: `vitest run tests/unit/`
- `npm run verify`: `npm run typecheck && npm run test:arch && npm run test:unit`

## Risks / Trade-offs

- **[Risk] Regex/token static scanner could match `any` inside comments or string literals** $\rightarrow$ **Mitigation**: Strip single-line (`//`) and multi-line (`/* */`) comments before scanning for `: any`, `as any`, `<any>`, `any[]`, and `Record<string, any>`, and test the scanner directly against positive and negative fixtures in `layer_boundaries.test.ts`.
