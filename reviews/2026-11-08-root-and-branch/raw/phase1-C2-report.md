# Phase 1 C2 report

Applied 14 of 14, skipped 0. `npm run verify` exit 0. Files: DESIGN_NOTES.md, openspec/config.yaml (no new files, nothing committed).

| Id | Result | Notes |
| --- | --- | --- |
| A-70 | applied | Config bullets for locomotion, proximity use, text bubbles, paging, 07a-07d, eval framework, 07e rewritten to "will" with a heading-style `(planned: <v3 ids>)` and the `[planned - revisable]` tag. Dropped "free-text intent cases on `08`". `VoiceProfile` marked `(planned)`. Paging bullet now says each conversation charges the 05b-1 verb. The no-loss diff table for A-72 is not done here (it belongs to A-72's gate). |
| A-71 | applied | Config line 33, Sound Lab (line 49) and Pacing Lab (line 99) and the play-shell bullet marked planned; DESIGN_NOTES Save Patch and Pacing Inspector bullets in future tense, with "guarded bridge write-route helper (planned, built by hx-ops-safety)". |
| A-69 | applied | Headings 7, 8, 9, 10, 10a-e, 11, 05f eval, Sound Design, section 0 and section 4 carry `(planned: ...)` with umbrella ids mapped to v3 ids (05a, 05b, 05d, 05e, 05f, 07, 10), original id kept as "was `05d`". Present-to-future rewrites for the WASD walk, Space use, eval:ai loop and advisor sulk. A "Status: planned" note under sections 7, 8, 9, 10 and 11. `locomotionMode` recorded as a planned contract (05d-locomotion-footprint). |
| A-51 | applied | Section 6 lab-save text and the Stage Lab "Save to Disk" bullet get the interim caveat plus the source-of-truth rule (planned: pre-05b-pack-source-of-truth). Config play-shell bullet gets one caveat sentence. |
| A-05 | applied | R1-R8 written in the Rules spine, each with status and enforcing test ("to be written"). R8 status `open`. Config gets a pointer line. |
| A-06 | applied | R6 with the single pause/lab definition from ruling 6. |
| A-07 | applied | Emergency row rewrite (scope, scoped compounding, fuse later = 09-emergency-fuse) plus R5; config Emergency bullet extended. |
| A-08 | applied | "Core model: seven primitives" before the Generational Operatives section, with the owner wording. |
| A-11 | applied | Clock decision record bullet in section 0, mirrored in R1 and the config Clock 2 line. |
| A-15 | applied | Inertia row points to a new "Leverage Chain" section; config Slow-Burn bullet extended. |
| A-16 | applied | "Player loop (minimal)" holds only mission, verbs per thread, win/fail shape, epoch-end evaluation (R8, open) and the Leverage Chain pointer. |
| A-19 | applied | "System graph" table from raw/S2-system-graph.json with the two completeness fixes (drives/emergencyVice, recordedLegacyScars) and the small audit notes on discoveryLayer and instruments. |
| A-14 | applied | "Loop cycles" section before section 0; talk-cost wording as in ruling 7. |
| A-20 | applied | Freeze-extension line after the StateSliceKey line in config (owner wording) and in the Rules spine. |

Also: status index gained rows for Core model, Leverage Chain, System graph and Loop cycles; the Rules spine row now says rules written, R8 open.

Interpretations:
- Punch item 12 says "11 of 13 rows accurate". The JSON has 14 rows and the audit file marks 12 accurate and 2 incomplete, so DESIGN_NOTES says "12 of 14 rows accurate as drafted, 2 incomplete and fixed".
- Rather than rewriting every sentence of sections 7-11 into future tense, I rewrote the four sentences the amendment names and added a "read each verb as will" status note under each planned heading.
- Section 10 still says "Reading costs no watch." I did not edit it (not in my ids); the Loop cycles section states that it is superseded for the conversation as a whole while chunk reading stays free. Later group may want to align it.
- Sections 1, 2, 3, 5 headings (06a, 06b, 09a, 06c ids exist in roadmap.yaml) were left untouched; only the old umbrella ids were remapped.
- Section 0 body still has stale "Change `05b`" prose; left as is.
- The R1-R8 enforcing tests are all "to be written"; the owning change ids are named. No test was invented as existing.
- Player-loop "mission" and "win and fail shape" lines are one-line statements grounded in the existing dual-ledger and Special Circumstances framing; no Epoch 1 contract written.
- Forward pointers only for C3/C4 items (text pipeline, Observation detail, presence, notebook, audio).
