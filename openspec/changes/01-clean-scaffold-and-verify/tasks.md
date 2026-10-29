## 1. Toolchain & Strict Clean Architecture Guardrails

- [x] 1.1 Initialize `package.json`, `.gitignore`, `tsconfig.json` (with strict mode, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`), and `vitest.config.ts` using exact pinned versions (`typescript@7.0.2`, `vite@8.3.5`, `vitest@5.0.5`, `@types/node@24.19.2`) | Verify: `npm install && npm run typecheck` | Commit: `build(scaffold): initialize strict typescript vite and vitest toolchain`
- [x] 1.2 Scaffold Clean Architecture layer barrels (`src/domain/index.ts`, `src/application/index.ts`, `src/infrastructure/index.ts`, `src/content/index.ts`, `src/interfaces/index.ts`) and implement `tests/architecture/layer_boundaries.test.ts` enforcing inward imports, zero explicit `any`, and no `Math.random()` / `Date.now()` in `domain` or `content` | Verify: `npm run test:arch` | Commit: `test(arch): enforce clean architecture boundaries and zero-any policy`

## 2. Deterministic Domain Primitives

- [x] 2.1 Implement `SeededRandom` (Xorshift32 PRNG with `nextFloat`, `nextInt`, `choose`, `getState`, `fromState`) in `src/domain/core/SeededRandom.ts` and unit tests in `tests/unit/domain/SeededRandom.test.ts` | Verify: `npx vitest run tests/unit/domain/SeededRandom.test.ts && npm run test:arch` | Commit: `feat(domain): add deterministic SeededRandom PRNG`
- [ ] 2.2 Implement typed `StateSliceKey<T>`, `defineStateSlice<T>`, `StateSliceRegistry`, and immutable `StateSliceStore` in `src/domain/core/StateSliceRegistry.ts` with unit tests in `tests/unit/domain/StateSliceRegistry.test.ts` | Verify: `npx vitest run tests/unit/domain/StateSliceRegistry.test.ts && npm run test:arch` | Commit: `feat(domain): add typed StateSliceKey registry and immutable store`

## 3. Hierarchical Documentation, Verification & Governance Review

- [ ] 3.1 Create master `README.md`, confirm master `AGENTS.md`, and create per-section `README.md` and `AGENTS.md` files in `src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, `src/interfaces/`, and `tests/`, plus add automated section-doc checks to `tests/architecture/layer_boundaries.test.ts` | Verify: `npm run verify && npm audit` | Commit: `docs(devex): add hierarchical README and AGENTS guides across all codebase sections`
