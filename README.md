# Uplift

**Uplift** is a 100% local, offline-capable covert civilization simulation inspired by Iain M. Banks' Culture stories (_Inversions_, _Matter_, _Use of Weapons_ / _Special Circumstances_) and Fred Saberhagen's _Brother Assassin_.

Presented from a dark, atmospheric **3rd-person fixed-orientation tracking camera** (_Final Fantasy VII_ / _Disco Elysium_ / _Inside_ style), you play a succession of embedded Special Circumstances operatives across a **configurable multi-Epoch civilizational ladder** (default 7-Epoch / 7-Era arc: `Feudal -> Renaissance -> Pre-Industrial/Colonial -> Industrial/WWI -> Cold-War -> Computer-Age -> Space-Age/1st-Contact`, where `Epoch` and `Era` are 100% synonymous, starting in Epoch 1 / Era 1: **Highglass Hold**). Your goal is to guide the society toward cooperative, scientific progress while managing Contested Offices (`OfficeBlueprint`), legitimate stipends vs. orbital-inserted illicit funds (`IllicitInstrumentType`), slow-burn Butterfly Threads (`TrajectoryThreadBlueprint`), async correspondence (`ChannelMediumBlueprint`), a 500+ character interpersonal `Regard` web, Epoch 2+ interactive travel vignettes (`TransitRouteBlueprint`), orbital pass windows (`OrbitalPassBlueprint`), and rival operatives from competing spacefaring civilizations (`RivalCivBlueprint`). When an Epoch concludes, the simulation runs `runInterEpochMaturation` and exports a Dual-Ledger `CivilizationLegacyState` (`materialScars` and `veilScars` of `InheritedScar`, `communicationsBackboneControllerId`, and `lineageId` mutations) into the next historical Epoch.

---

## Hardware Target & Zero-API-Key Guarantee

- **Baseline Hardware**: Designed and budgeted for a **2019 Intel Core i7 MacBook Pro (16GB RAM)** at 60 FPS, running cross-platform on macOS and Windows.
- **100% Offline / Zero Cloud API Keys**: No OpenAI, Anthropic, or cloud inference keys are ever used. All simulation decisions run deterministically in pure TypeScript, paired with a local ~23MB quantized ONNX embedding model (`Xenova/all-MiniLM-L6-v2`) running in a background Web Worker.

---

## Quick Start (Local Clone)

```bash
# 1. Ensure Node.js 24.22.2 LTS (or >=24) is active
nvm use

# 2. Install pinned dependencies (also configures Husky pre-commit hooks)
npm install

# 3. Run the full verification suite (format:check, lint, typecheck, test:arch, test:unit)
npm run verify
```

### Available NPM Scripts

| Command                | Description                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run verify`       | Runs `format:check`, `lint`, `typecheck`, `test:arch`, and `test:unit` in sequence (`<5s`)                       |
| `npm run format`       | Formats repository files with Prettier (`prettier --write .`)                                                    |
| `npm run format:check` | Verifies Prettier formatting across all files (`prettier --check .`)                                             |
| `npm run lint`         | Runs ESLint flat config (`eslint src tests vitest.config.ts vite.config.ts eslint.config.mjs`)                   |
| `npm run lint:fix`     | Runs ESLint with automatic fixes                                                                                 |
| `npm run typecheck`    | Strict native TypeScript 7.0.2 compiler check (`tsc --noEmit`, zero implicit/explicit `any`)                     |
| `npm run test:arch`    | Enforces Clean Architecture layer boundaries, zero-`any`, determinism, and hierarchical section docs             |
| `npm run test:unit`    | Runs fast deterministic unit tests in Node/Vitest (`<3s`)                                                        |
| `npm run logs:query`   | Queries active (`current-session.jsonl`) and compacted session logs by level, actor, tick, or AI                 |
| `npm run dev`          | Starts the local Vite server (`/api/telemetry`, `/api/saves`, `/api/scene-blueprints`, `/api/character-visuals`) |
| `npm run build`        | Typechecks and builds the local bundle                                                                           |

### Editor Format-on-Save & Pre-Commit Hooks

- **Format on Save**: `.vscode/settings.json` enables `editor.formatOnSave` with Prettier (`esbenp.prettier-vscode`) and ESLint fix-on-save (`dbaeumer.vscode-eslint`).
- **Pre-Commit Hook**: `.husky/pre-commit` runs `npx lint-staged`, automatically formatting and linting staged files before every `git commit`.

---

## Pinned Dependency & Security Manifest (Verified 2026-10-29)

Every dependency installed when cloning this repository is explicitly pinned:

| Tool / Package                               | Pinned Version                       | Purpose & Security / CVE Notes                                                                                                       |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Node.js LTS**                              | `24.22.2` (`.nvmrc`)                 | Includes Oct 21, 2026 security fixes (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| **npm**                                      | `12.2.1`                             | Package manager                                                                                                                      |
| **`@fission-ai/openspec`**                   | `1.15.0`                             | Spec-Driven Development (`opsx`) CLI                                                                                                 |
| **`@typescript/native`**                     | `npm:typescript@7.0.2`               | Native Go `tsc` compiler (`7.0.2`, `ES2025`, strict mode, zero `any`)                                                                |
| **`typescript`**                             | `npm:@typescript/typescript6@6.0.2`  | Official Microsoft TS 6.0.3 JS AST API bridge required by `typescript-eslint`                                                        |
| **`eslint`**                                 | `10.13.0` (`@eslint/js` `10.0.1`)    | Flat-config static analysis (`minimatch` overridden to `11.0.4` for `GHSA-g3hv-75wg-m249`)                                           |
| **`typescript-eslint`**                      | `8.72.1`                             | Strict & stylistic TypeScript ESLint rules                                                                                           |
| **`eslint-config-prettier`**                 | `10.1.8`                             | Disables formatting rules that conflict with Prettier                                                                                |
| **`prettier`**                               | `3.9.10`                             | Automated code formatting                                                                                                            |
| **`husky` + `lint-staged`**                  | `9.1.7` / `17.6.0`                   | Pre-commit formatting and linting on staged files                                                                                    |
| **`zod`**                                    | `4.6.7`                              | Schema validation and `safeParse` JSON-to-TypeScript parsing across telemetry, save slots, and HTTP bridges                          |
| **`vite`**                                   | `8.3.5`                              | Local dev server and bundler                                                                                                         |
| **`vitest`**                                 | `5.0.5`                              | Fast unit, architecture, and headless simulation test runner                                                                         |
| **`@types/node`**                            | `24.19.2`                            | Node.js type definitions for build and test scripts                                                                                  |
| **`three`** _(Change 4)_                     | `0.186.1` (`@types/three` `0.186.0`) | 3D WebGL rendering for 3rd-person fixed-orientation tracking camera                                                                  |
| **`@huggingface/transformers`** _(Change 8)_ | `4.3.2`                              | Local ONNX runtime in Web Worker for free-text semantic topic matching                                                               |

---

## Codebase Architecture & Section Guides

The codebase follows strict Clean Architecture inward dependency rules (`interfaces -> application -> domain <- infrastructure`, with plug-and-play content packs in `src/content/`). Each section maintains its own human `README.md` and agent `AGENTS.md`:

| Section            | Human Guide (`README.md`)                                      | Agent Guide (`AGENTS.md`)                                      | Responsibilities                                                                               |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Root**           | [`README.md`](README.md)                                       | [`AGENTS.md`](AGENTS.md)                                       | Master project overview, setup, and global agent governance                                    |
| **Domain**         | [`src/domain/README.md`](src/domain/README.md)                 | [`src/domain/AGENTS.md`](src/domain/AGENTS.md)                 | Pure TypeScript simulation core, `SeededRandom`, `StateSliceKey<T>`, `CivilizationLegacyState` |
| **Application**    | [`src/application/README.md`](src/application/README.md)       | [`src/application/AGENTS.md`](src/application/AGENTS.md)       | Use-case orchestration, tick coordination, `RenderFrameBuilder`, port interfaces               |
| **Infrastructure** | [`src/infrastructure/README.md`](src/infrastructure/README.md) | [`src/infrastructure/AGENTS.md`](src/infrastructure/AGENTS.md) | Session NDJSON logger & compactor, save/load repository, local ONNX Web Worker                 |
| **Content**        | [`src/content/README.md`](src/content/README.md)               | [`src/content/AGENTS.md`](src/content/AGENTS.md)               | Plug-and-play Eras, Characters (Tiers 1–3), Rivals, Roles, Behaviors, Spaces, Props, Mechanics |
| **Interfaces**     | [`src/interfaces/README.md`](src/interfaces/README.md)         | [`src/interfaces/AGENTS.md`](src/interfaces/AGENTS.md)         | Three.js 60 FPS 3rd-person tracking renderer, Debug Inspector, HUD, composition root           |
| **Tests**          | [`tests/README.md`](tests/README.md)                           | [`tests/AGENTS.md`](tests/AGENTS.md)                           | Architecture boundary enforcement, unit tests, content contract tests, simulation tests        |
