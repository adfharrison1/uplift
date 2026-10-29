# Domain Layer (`src/domain/`)

## Purpose

`src/domain/` is the pure TypeScript heart of **Uplift**. It defines the deterministic simulation primitives, module contracts, 60Hz spatial kinematics math, Utility AI scoring rules, epistemic rumor graphs, and `CivilizationLegacyState` continuity models.

It has **zero outward dependencies**: it never imports Three.js, ONNX/Transformers, DOM/WebGL globals, or concrete content packs.

## Current Module Inventory

- `core/SeededRandom.ts` — Deterministic 32-bit Xorshift PRNG (`nextUint32`, `nextFloat`, `nextInt`, `choose`, `getState`, `fromState`).
- `core/StateSliceRegistry.ts` — Type-safe plugin state descriptors (`StateSliceKey<T>`, `defineStateSlice`, `StateSliceRegistry`, and immutable `StateSliceStore`).
- `index.ts` — Public barrel exporting domain primitives and contracts.
