# Tasks

Each numbered checkbox is one owner-approved, green Conventional Commit. After each implementation task, run its targeted Verify command and `npm run verify`, obtain the two independent task reviews, fix confirmed findings, inspect the diff, and pause for owner approval before committing or marking the box complete. Keep reports and review findings in the compact evidence package.

## 1. Mix fresh RNG seeds

- [x] 1.1 Implement one-shot `splitmix32` initialization in `src/domain/core/SeededRandom.ts` while restoring `fromState` from raw internal state; add four golden vectors, invalid and wrapped/negative seeds, mixed-zero seed `0x61c88647` → fallback `0x6d2b79f5`, and mid-stream continuation in `tests/unit/domain/SeededRandom.test.ts`; update `src/domain/README.md` and `src/domain/AGENTS.md`. **Verify:** `npx vitest run tests/unit/domain/SeededRandom.test.ts`, `npm run verify`, and exact initial-state/fallback vectors. **Commit:** `fix(domain): scramble fresh rng seeds without remixing saves`.

## 2. Resolve runtime legacy drives without mutating input

- [ ] 2.1 Add a pure runtime legacy resolver and clamp diagnostics in `src/domain/legacy/CivilizationLegacyState.ts`, sharing ordered mutation logic with strict `applyLegacyToCharacterBlueprints`; export the runtime API from `src/domain/index.ts`; test high/low/final-in-range values, frozen inputs, strict authoring throws, conflicts, unknown targets, invalid clamp intervals, and intermediate non-finite arithmetic followed by clamp or override in `tests/unit/domain/CivilizationLegacyState.test.ts`; update the paired domain guides. **Verify:** `npx vitest run tests/unit/domain/CivilizationLegacyState.test.ts`, `npm run verify`, and unchanged input snapshots. **Commit:** `fix(domain): resolve legacy drive overflow with pure diagnostics`.

## 3. Surface runtime clamps at the coordinator

- [ ] 3.1 Use the runtime resolver in `src/application/simulation/SimulationCoordinator.ts` for construction and `loadFromSlot`; retain notes through `getLegacyClampNotes()`, emit structured phase-aware `warn` notes (with slot ID on load), and make only clamp-warning writes nonfatal. Prepare load data locally and move the existing `load_slot` record before state publication so its failure leaves prior state intact. In `tests/unit/application/SimulationCoordinator.test.ts`, check initial `WorldState.entities`, `getResolvedCharacters()`, telemetry query/readback, no-warning cases, saved world/RNG continuation, individual invalid-load cases, failed first/later warning writes, failed `load_slot` and successful retry. Update `src/application/README.md`, `src/application/AGENTS.md`, and the relevant planned/shipped wording in `DESIGN_NOTES.md` while retaining later legacy work. **Verify:** `npx vitest run tests/unit/application/SimulationCoordinator.test.ts`, `npm run verify`, and `npm run defects -- reconcile --check`. **Commit:** `fix(application): report runtime legacy drive saturation`.

## 4. Closing review and defect evidence

- [ ] 4.1 Run the six independent delivery reviews and scenario-to-test trace, disposition every finding, and add a separate numbered task for each confirmed unplanned fix before closing evidence; each added task gets its own bounded commit, targeted/full verification, two reviews and owner approval. Record compact G1–G6 evidence and transition only `S3-08-seed`, `S3-14-clamp`, and `S3-17-clamp-rng` through the checked ledger with expected revisions and retained fix/test/reviewer references. Leave the accumulation and source-scar findings with their later owners. **Verify:** `npx openspec validate hx-1-legacy-clamp-seed-scramble --strict`, `npm run verify`, `npm run defects -- reconcile --check`, and a clean scoped diff. **Commit:** `chore(hardening): record closing review and defect evidence`.

## Workflow follow-up

- After all tasks and reviews are complete, present the concrete result for owner archive approval. Archive only on a later explicit instruction through `npm run change:archive -- hx-1-legacy-clamp-seed-scramble`; do not presync or hand-move files.
