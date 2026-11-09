# Phase 1 C4 report

Applied 27 of 28 amendment ids in full or in the part the brief allows, 1 skipped (A-97, merged into A-10 per punch list 4). `npm run verify` exit 0 (125 unit tests pass). Files edited: DESIGN_NOTES.md, openspec/config.yaml (still parses as YAML). Nothing committed. All `planned:` ids resolve to openspec/roadmap.yaml. No amendment id (A-xx) appears in the text.

## Per amendment

| Id | Result | Notes |
| --- | --- | --- |
| A-09 | applied | Act record, envelope, `commit`, `roll` as a new bullet in the Human-Paced / Anti-Thundering-Herd section. Points at stimulus cap item 3 for dedupe. |
| A-10 | applied | Core model item 3 extended (decaying per-observer view, `set_discovery_layer` shim, `Regard.exposure` note from A-97, pointer to INV-B). System-graph `discoveryLayer` row got a planned clause. Config `IllicitInstrumentType` bullet got a planned clause. |
| A-13 | applied (partly pre-existing) | "Reading costs no watch" no longer exists verbatim: C1/C2 already reworded it and Loop cycles already holds the talk-cost rule (05b-1 owns verb and budget, 07-dialogue-paging charges it) and the owner sentence. The "(owner decision pending)" marker is untouched. Added the missing half: a bullet splitting embodied cascades (2-hop cap kept) from information diffusion (closed form, per watch, no wall-clock beats). "An ambient line does not spend a watch." is already present and kept. |
| A-17 | applied | New section "Inference trails and signposting" before Competing Spacefaring Civilizations, owner words verbatim. |
| A-18 | applied | New section "Presence model", owner macro-lever sentence verbatim. |
| A-21 | applied | Two table rows (instrument, stock) extended with "Planned, revisable" clauses. Insertion rule points at R7 as the single owner. Config offices/economy bullet extended. |
| A-22 | applied | Bullet after the `tellProfile` pointer: structured tellProfile, presence/absence evals, rival agenda emitting Acts, remote reports as Observations, owner sentence verbatim. Config rival bullet extended. |
| A-31 | applied | New section "Lace-log notebook" before "Accessibility and Settings" and section 9. Owner sentence verbatim. Save line points to the owner decision under Open items rather than repeating the full text a third time. |
| A-32 | applied | DESIGN_NOTES already carried the owner decision in Open items (C1); the notebook section links to it. Config Save/Load bullet got the planned policy sentence. |
| A-33 | applied | New section "Belief and deliberate misbelief" before the Human-Paced section. |
| A-96 | applied | New section "Resource ledger". R7 referenced as the one rule line. |
| A-97 | skipped | Merged into A-10 (punch list 4). Its Regard.exposure content lives in A-10's core-model text. No edit to the Regard section, and no Writing Desk invention. |
| A-98 | applied | New section "Storyteller deck, thread gates and storylets". Label is "route RC/R7 ... finding S2-08", never a bare R7. |
| A-100 | applied | New section "Vertical slice (first pass of 11)" before Engineering rules. Criteria: one thread, few NPCs, one office and pretext, authored lines through the text port. The end card is stated as belonging to `11-pass-1-ledger-end-card` and NOT a criterion. |
| A-36 | applied | "Readability rule" bullet after Diegetic UI Bifurcation. Config bullet not edited (A-72 cuts it). |
| A-47 | applied | Section 7 contracts bullet (shape descriptor, vocabulary, `surface`, residency, crowd mesh, entity-id check); footprint sentence gets a planned pointer; section 6 body-drawn sentence notes crowd has no mesh today. Config play-shell bullet not edited (A-72 cuts it). |
| A-48 | applied | "Later notes (planned, later)" bullet at the end of Visual & UI Direction, with the parked entry ids. |
| A-38 | applied | Section 7 WASD sentence rewritten to the control frame and latch plus zoom scalar. Separate "Camera capture (planned, later: 07-camera-directive-stack, after the pager)" bullet carries the owner's quote verbatim (typo "charachter" kept) and the capture rules. |
| A-39 | applied | Folded into the same section 7 sentence after "Releasing the keys stops the body on that frame." (InputState/InputFrame, keyup/blur/visibilitychange, `event.code`, data action table, Space edge-triggered, dev HUD neutralised). |
| A-37 | applied | Section 8: warm mark on the Space target; global accent rejected (breaks P4). Config proximity bullet already carries the planned tag; no edit. |
| A-40 | applied | Section 8 grammar rewritten; section 10 choice-menu and Escape clauses aligned. Config menu-grammar sentence rewritten (anchor was "will drive" in the current file, not "drive"). |
| A-49 | applied | Section 8: "A second pause flag." became "There is no second domain pause flag (see R6)." and the pause sentence now states the single freeze bit plus lab-mode flag and free-cam gating. Config debug-pause bullet got a planned sentence. A-50 merged. |
| A-41 | applied | New section "Accessibility and Settings" (after section 8, before the notebook and section 9). Settings = `reduceMotion`, hold-or-toggle, `textScale`. The qualitative-odds setting and assist mode are not mentioned (dropped). |
| A-44 | applied | Sound block: "Minimal audio (planned: audio-minimal)" bullet added first; hybrid heading and first bullet relax the "zero .wav" claim, samples allowed with the audio engine work, minimal change need not ship them. Config sound bullet relaxed. |
| A-46 | applied | Section 9 contract: "Tone blips" bullet with the owner's wording verbatim, shipping with `07-bubble-lace-skins-and-tone-blips` and not `audio-minimal`; the "Neither adds an `AudioContext` for speech" sentence kept with a pointer. Config voice-acting bullet extended. |
| A-43 | applied | Sound block "Audibility tiers" bullet (silent, murmur, clear; one owner; audio-minimal provisional table; 05a consumes only); section 10 earshot sentence names the tiers. Config formula bullet extended. |
| A-42 | applied | Noticing line in the Obra Dinn cues group of the Sound block and a bullet in Accessibility and Settings. |
| A-03 | applied | Generational Operatives bullet states the new Ship and Drone crew (P3). Section 4 gets a "A new crew each Epoch" bullet with the owner's words verbatim, S1-R9 as rejected-by-owner (pointer to Dispositions, row already exists), and the cameo as a design note only (pointer to Ideas, not scheduled). The legacy and sacrifice citation is untouched. No editor gloss. |

## Shipped-reference tags in sections 7 and 8
Tagged inline "(shipped)": `requestWaypointMove`/`stepKinematics`, `walkSpeedMetersPerSec`, `yawSpeedRadiansPerSec`, the hinge yaw, the dev HUD waypoint command, `requestSetPortalState`, `update_prop_state`, and the existing paused bit. `set_direct_steer`, `locomotionMode`, `selectProximityTarget`, `interactionHold` are not in `src`, so they stay planned.

## Interpretations
- Heading marks: new sections use "(planned: <ids>)" in the heading. Eight rows were added to the status index so the new sections are listed.
- A-40: replaced "Space and Escape ignore key repeat" and "The key that opens a menu does not also confirm a row" with the consume-every-press rule. Kept the clause that a movement key still held when the menu closes does not steer (it concerns WASD, which the consumption rule does not cover).
- A-39 has no own anchor sentence left to rewrite, so it was folded into the A-38 sentence. A-38's tense and tag follow the section 7 "read as will" status note.
- A-13: no rewrite of "Reading costs no watch." was possible (already rewritten by earlier groups); see table.
- A-43 section 10 sentence names the tiers but does not decide what a `murmur` ambient line shows; that is left to the owning changes.
- A-44: "zero .wav" is relaxed in DESIGN_NOTES and config. The minimal-audio bullet is in the Sound block, matching the existing status-index note under the table.
- Config edits are limited to the secondary anchors that the amendment says to edit (A-10, A-21, A-22, A-32, A-40, A-43, A-44, A-46, A-49). A-13, A-36, A-37, A-38, A-47 secondaries were left (cut by A-72 or already tagged).
- A-97's Regard.exposure note is not repeated in the Regard section itself.
