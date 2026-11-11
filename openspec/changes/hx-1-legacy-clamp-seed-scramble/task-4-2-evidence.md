# Task 4.2 evidence — repeated draws for pinned fresh seeds

Status: implemented and independently reviewed; awaiting owner approval before commit. The separate Task 4.1 checkbox now records commit `4aaa3e9`.

The four literal initial-state vectors for seeds `0`, `1`, `2` and `42` now each construct two fresh generators, compare 16 `nextUint32()` draws, and compare final states. The mixed-zero fallback vector and the existing 100-value mixed-call reproducibility test remain intact. Only `SeededRandom.test.ts` changes behavior; this adds no runtime work or shipped-guide change.

`npx vitest run tests/unit/domain/SeededRandom.test.ts` passed 12/12 (111 ms Vitest). `npm run verify` passed format (1,976 ms), lint (1,541 ms), typecheck (918 ms) and tests (17,461 ms) with loopback access required by the existing HTTP tests. `npm run defects -- reconcile --check` passed with 53 active and 22 resolved. `git diff --check` passed. Reference-Mac timing remains unmeasured.

G1/G6: direct generator outputs and final states cover the pinned-seed scenario; the separate coordinator save/load continuation scenario is covered by earlier task tests. G2/G4: no trust boundary or failure behavior changes. G3: 128 draws across these four test cases, no runtime cost. G5: both independent reviewers found no new issue; closing ledger transitions remain in Task 5.1. No owner design text or navigation was moved or cut.
