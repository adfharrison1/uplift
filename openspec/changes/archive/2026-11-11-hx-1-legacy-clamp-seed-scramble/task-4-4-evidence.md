# Task 4.4 evidence — adjacent-seed design intent

Status: implemented and independently reviewed; awaiting owner approval before commit. The Task 4.3 checkbox now records commit `463c3dc`.

The seed paragraph in `DESIGN_NOTES.md` now says the shipped `splitmix32` constructor step aims to spread adjacent numeric seeds before Xorshift32. It distinguishes literal initial-state golden vectors from repeated-draw assertions and makes no statistical-independence claim. The later keyed `roll(worldSeed, streamKey, counter)` remains explicitly planned; the shipped algorithm and guides are unchanged.

Document-integrity map: the historical seed note at `9d236d3` aimed to avoid correlated streams from adjacent seeds. Its adjacent-seed separation intent is retained with narrower, supportable wording. The current paragraph's constructor location, golden vectors, keyed-roll plan and roadmap owner remain in place. No owner exemplar, number, identifier, paragraph or planned work was cut or moved. The Engineering rules status-index row remains partial with seed scrambling shipped; the Where-facts-live table, roadmap and dispositions remain accurate without edits. `DESIGN_NOTES.md` grew from 17,265 to 17,275 words (+10), within its accepted aspirational-budget exception.

After the review correction, `npm run verify` passed: format 937 ms, lint 1,278 ms, typecheck 564 ms and tests 16,917 ms, with loopback access for existing HTTP tests. `npm run roadmap:next -- --json` reported this change active, no next or blocked item; `npm run defects -- reconcile --check` passed with 53 active and 22 resolved. `git diff --check` passed. Reference-Mac timing remains unmeasured.

G1/G6: the design statement traces to `SeededRandom` fresh construction and the pinned initial-state/repeated-draw tests; save-state restoration remains covered separately. G2–G4: documentation-only change, no trust boundary, hot-path or failure behavior change. G5: one wording issue about what golden vectors pin was verified, corrected and accepted by both reviewers.
