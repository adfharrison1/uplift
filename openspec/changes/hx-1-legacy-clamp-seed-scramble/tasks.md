# Tasks

Each numbered checkbox is one owner-approved, green Conventional Commit. After each implementation task, run its targeted Verify command and `npm run verify`, obtain the two independent task reviews, fix confirmed findings, inspect the diff, and pause for owner approval before committing or marking the box complete. Keep reports and review findings in the compact evidence package.

## 1. Mix fresh RNG seeds

- [x] 1.1 Implement one-shot `splitmix32` initialization in `src/domain/core/SeededRandom.ts` while restoring `fromState` from raw internal state; add four golden vectors, invalid and wrapped/negative seeds, mixed-zero seed `0x61c88647` → fallback `0x6d2b79f5`, and mid-stream continuation in `tests/unit/domain/SeededRandom.test.ts`; update `src/domain/README.md` and `src/domain/AGENTS.md`. **Verify:** `npx vitest run tests/unit/domain/SeededRandom.test.ts`, `npm run verify`, and exact initial-state/fallback vectors. **Commit:** `fix(domain): scramble fresh rng seeds without remixing saves`.

## 2. Resolve runtime legacy drives without mutating input

- [x] 2.1 Add a pure runtime legacy resolver and clamp diagnostics in `src/domain/legacy/CivilizationLegacyState.ts`, sharing ordered mutation logic with strict `applyLegacyToCharacterBlueprints`; export the runtime API from `src/domain/index.ts`; test high/low/final-in-range values, frozen inputs, strict authoring throws, conflicts, unknown targets, invalid clamp intervals, and intermediate non-finite arithmetic followed by clamp or override in `tests/unit/domain/CivilizationLegacyState.test.ts`; update the paired domain guides. **Verify:** `npx vitest run tests/unit/domain/CivilizationLegacyState.test.ts`, `npm run verify`, and unchanged input snapshots. **Commit:** `fix(domain): resolve legacy drive overflow with pure diagnostics`.

## 3. Surface runtime clamps at the coordinator

- [x] 3.1 Use the runtime resolver in `src/application/simulation/SimulationCoordinator.ts` for construction and `loadFromSlot`; retain notes through `getLegacyClampNotes()`, emit structured phase-aware `warn` notes (with slot ID on load), and make only clamp-warning writes nonfatal. Prepare load data locally and move the existing `load_slot` record before state publication so its failure leaves prior state intact. In `tests/unit/application/SimulationCoordinator.test.ts`, check initial `WorldState.entities`, `getResolvedCharacters()`, telemetry query/readback, no-warning cases, saved world/RNG continuation, individual invalid-load cases, failed first/later warning writes, failed `load_slot` and successful retry. Update `src/application/README.md`, `src/application/AGENTS.md`, and the relevant planned/shipped wording in `DESIGN_NOTES.md` while retaining later legacy work. **Verify:** `npx vitest run tests/unit/application/SimulationCoordinator.test.ts`, `npm run verify`, and `npm run defects -- reconcile --check`. **Commit:** `fix(application): report runtime legacy drive saturation`.

## 4. Closing review corrections

The six independent delivery reviews identified four bounded corrections. The two stale design-status references share one status-drift fix; the omitted adjacent-seed intent is a separate no-loss fix. Each checkbox below receives its own targeted/full verification, two independent task reviews and owner-approved commit before closing evidence.

- [x] 4.1 Make the saved epoch differ from the live epoch in the coordinator low-load warning test, and assert both `load_slot` and `legacy_drive_clamped` records use the restored epoch and tick. **Verify:** `npx vitest run tests/unit/application/SimulationCoordinator.test.ts`, `npm run verify`, `npm run defects -- reconcile --check`. **Commit:** `test(application): distinguish restored epoch in legacy load warnings`.

- [ ] 4.2 For each pinned fresh seed `0`, `1`, `2` and `42`, assert identical multi-draw sequences from repeated construction in `SeededRandom.test.ts`, retaining exact initial-state and mixed-zero vectors. **Verify:** `npx vitest run tests/unit/domain/SeededRandom.test.ts`, `npm run verify`. **Commit:** `test(domain): pin repeated draws for adjacent seeds`.

- [ ] 4.3 Correct the stale shipped/planned status references in the `DESIGN_NOTES.md` Engineering rules introduction and Operative rotation cross-reference, preserving later planned systems and owner wording. **Verify:** `npm run verify`, document-integrity no-loss review and status-index/roadmap checks. **Commit:** `docs(design): align shipped legacy status references`.

- [ ] 4.4 Restore the adjacent-seed separation intent in the `DESIGN_NOTES.md` seed paragraph without claiming statistical independence or changing the shipped algorithm. **Verify:** `npm run verify` and document-integrity no-loss review. **Commit:** `docs(design): retain adjacent-seed intent`.

## 5. Closing review and defect evidence

- [ ] 5.1 Recheck the six independent delivery reviews and scenario-to-test trace after corrections, disposition every finding, and record compact G1–G6 evidence. Transition only `S3-08-seed`, `S3-14-clamp`, and `S3-17-clamp-rng` through the checked ledger with expected revisions and retained fix/test/reviewer references. Leave the accumulation and source-scar findings with their later owners. Record the separately discovered pre-existing `nextInt` distribution issue with explicit future ownership/revisit conditions; do not change existing RNG draw semantics in this change. **Verify:** `npx openspec validate hx-1-legacy-clamp-seed-scramble --strict`, `npm run verify`, `npm run defects -- reconcile --check`, and a clean scoped diff. **Commit:** `chore(hardening): record closing review and defect evidence`.

## Workflow follow-up

- After all tasks and reviews are complete, present the concrete result for owner archive approval. Archive only on a later explicit instruction through `npm run change:archive -- hx-1-legacy-clamp-seed-scramble`; do not presync or hand-move files.
