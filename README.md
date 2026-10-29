# Uplift

**Uplift** is a 100% local, offline-capable first-person covert civilization simulation inspired by Iain M. Banks' Culture stories (*Inversions*, *Matter*, *Use of Weapons* / *Special Circumstances*).

You play an embedded agent of a post-scarcity galactic civilization operating inside **Highglass Hold** (Era 1: Feudal Court & Guild Town). Your goal is to guide the society toward cooperative, scientific progress without allowing your technological or social interventions to be hijacked into militarism or exposing yourself as an off-world anomaly to the Inquisition. When an era concludes, the simulation exports a `CivilizationLegacyState` ledger carrying both achievements and negative civilizational scars (`InheritedTrait[]`) and character lineage mutations (`lineageId`) into the next historical age.

---

## Hardware Target & Zero-API-Key Guarantee

- **Baseline Hardware**: Designed and budgeted for a **2019 Intel Core i7 MacBook Pro (16GB RAM)** at 60 FPS, running cross-platform on macOS and Windows.
- **100% Offline / Zero Cloud API Keys**: No OpenAI, Anthropic, or cloud inference keys are ever used. All simulation decisions run deterministically in pure TypeScript, paired with a local ~23MB quantized ONNX embedding model (`Xenova/all-MiniLM-L6-v2`) running in a background Web Worker.

---

## Quick Start (Local Clone)

```bash
# 1. Ensure Node.js 24.22.2 LTS (or >=24) is active
nvm use

# 2. Install pinned dependencies
npm install

# 3. Run the full verification suite (typecheck, architecture linter, unit tests)
npm run verify
```

### Available NPM Scripts

| Command | Description |
|---|---|
| `npm run verify` | Runs `typecheck`, `test:arch`, and `test:unit` in sequence (`<3s`) |
| `npm run typecheck` | Strict TypeScript compiler check (`tsc --noEmit`, zero implicit/explicit `any`) |
| `npm run test:arch` | Enforces Clean Architecture layer boundaries, zero-`any`, determinism, and documentation map |
| `npm run test:unit` | Runs fast deterministic unit tests in Node/Vitest |
| `npm run dev` | Starts the local Vite development server |
| `npm run build` | Typechecks and builds the local bundle |

---

## Pinned Dependency & Security Manifest (Verified 2026-10-29)

Every dependency installed when cloning this repository is explicitly pinned:

| Tool / Package | Pinned Version | Purpose & Security / CVE Notes |
|---|---|---|
| **Node.js LTS** | `24.22.2` (`.nvmrc`) | Includes Oct 21, 2026 security fixes (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| **npm** | `12.2.1` | Package manager |
| **`@fission-ai/openspec`** | `1.15.0` | Spec-Driven Development (`opsx`) CLI |
| **`typescript`** | `7.0.2` | Strict static typechecking (`ES2025`, zero `any`) |
| **`vite`** | `8.3.5` | Local dev server and bundler |
| **`vitest`** | `5.0.5` | Fast unit, architecture, and headless simulation test runner |
| **`@types/node`** | `24.19.2` | Node.js type definitions for build and test scripts |
| **`three`** *(Change 3)* | `0.186.1` (`@types/three` `0.186.0`) | 3D WebGL rendering for indoor rooms and outdoor courtyards |
| **`@huggingface/transformers`** *(Change 7)* | `4.3.2` | Local ONNX runtime in Web Worker for free-text semantic topic matching |

---

## Codebase Architecture & Section Guides

The codebase follows strict Clean Architecture inward dependency rules (`interfaces -> application -> domain <- infrastructure`, with plug-and-play content packs in `src/content/`). Each section maintains its own human `README.md` and agent `AGENTS.md`:

| Section | Human Guide (`README.md`) | Agent Guide (`AGENTS.md`) | Responsibilities |
|---|---|---|---|
| **Root** | [`README.md`](README.md) | [`AGENTS.md`](AGENTS.md) | Master project overview, setup, and global agent governance |
| **Domain** | [`src/domain/README.md`](src/domain/README.md) | [`src/domain/AGENTS.md`](src/domain/AGENTS.md) | Pure TypeScript simulation core, `SeededRandom`, `StateSliceKey<T>`, `CivilizationLegacyState` |
| **Application** | [`src/application/README.md`](src/application/README.md) | [`src/application/AGENTS.md`](src/application/AGENTS.md) | Use-case orchestration, tick coordination, `RenderFrameBuilder`, port interfaces |
| **Infrastructure** | [`src/infrastructure/README.md`](src/infrastructure/README.md) | [`src/infrastructure/AGENTS.md`](src/infrastructure/AGENTS.md) | Local ONNX Web Worker, lexical/pragmatic parser, model cache, persistence |
| **Content** | [`src/content/README.md`](src/content/README.md) | [`src/content/AGENTS.md`](src/content/AGENTS.md) | Plug-and-play Eras, Characters (Tiers 1–3), Behaviors, Spaces, Props, Mechanics |
| **Interfaces** | [`src/interfaces/README.md`](src/interfaces/README.md) | [`src/interfaces/AGENTS.md`](src/interfaces/AGENTS.md) | Three.js 60 FPS renderer, First-Person controller, HUD, composition root |
| **Tests** | [`tests/README.md`](tests/README.md) | [`tests/AGENTS.md`](tests/AGENTS.md) | Architecture boundary enforcement, unit tests, content contract tests, simulation tests |
