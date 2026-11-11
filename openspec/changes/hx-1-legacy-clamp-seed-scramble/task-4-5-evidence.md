# Task 4.5 evidence — Engineering status ownership

Status: implemented and independently reviewed; awaiting owner approval before commit. The Task 4.4 checkbox now records commit `cbba8f9`.

The context-free closing design review found `CLOSE-DOC-03`: the Engineering rules status-index column is defined as owners of the *unshipped* portion, but still listed this change after its seed scramble and runtime legacy saturation shipped. The edit removes only `hx-1-legacy-clamp-seed-scramble` from that column. The shipped summary, all twelve later owner IDs and the seed/clamp detail remain. The task plan records the extra bounded task and its nine-task scope justification.

Document-integrity map: the removed ID retains its historical scope in `openspec/roadmap.yaml`, the active change, and its shipped design paragraphs; it no longer asserts an unshipped owner in the status index. No owner wording, exemplar, number, planned system, Where-facts-live entry, disposition or inbox text was cut or moved. The Engineering row remains partial because later hardening is planned. `DESIGN_NOTES.md` changed from 17,275 to 17,274 words, within its accepted aspirational-budget exception. Root AGENTS and config context are unchanged.

`npm run verify` passed with loopback access: format 3,512 ms, lint 2,879 ms, typecheck 718 ms and tests 20,824 ms. `npm run roadmap:next -- --json` reported this change active, no next or blocked item; `npm run defects -- reconcile --check` passed with 54 active and 22 resolved. `git diff --check` passed. Reference-Mac timing remains unmeasured.

G1/G6: the status-index reader now sees later unshipped owners only; shipped seed and clamp consumers remain covered by earlier tests. G2–G4: documentation-only correction, no runtime input, hot-path or failure change. G5: `CLOSE-DOC-03` was fixed and two independent task reviewers accepted the no-loss and coherence result; the plan's temporary checkbox-count wording issue was corrected and rechecked.
