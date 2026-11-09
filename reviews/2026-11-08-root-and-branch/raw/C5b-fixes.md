# C5b fixes

Counts: reviewN 8 lost, 9 altered, 1 merged wrongly, 2 broken pointers; all addressed except one pointer (below). reviewC: 11 should/nit items, all addressed. Ambiguities: 4 (i, ii, iii, iv), all written in. `wc -w DESIGN_NOTES.md` = 16526. `npm run verify` passes.

## reviewN
- Lost, restored in DESIGN_NOTES: "drawn from or authored in the Epoch's operative pool"; the "Three skin chains advance with the ladder..." lead-in; the shipped-as-schema sentence under Economy and levers; "no model runs" (Text pipeline rule) and "no audio graph or AudioContext exists" (Audio); the "attributed" trigger example; "any later subject adds a suite the same way" (Local AI eval); "a new press moves on"; "while the player talks, the world moves on".
- Altered, corrected: "starts as" (shape vocabulary); "not later" (residency); slop rationale "so the body does not sit in the pixels"; "the arrival does not commit"; "held and pressed sets feed a data action table"; AI notes owner wording ("decision web", "for runtime use, if it has a place"); "and is not built in the crew handoff"; "on the 7-Epoch default ladder". The Ship Mind "Owned by" sentence is not restored; the traceability wording now says so.
- Merged wrongly: the contingency-1 `detectionTechLevel` chain (aurora omens, geomagnetic storms) is back in `design/orbital-blackout-and-contingencies.md`; the traceability rows say it is not merged.
- Pointers: a `Detail:` line to `design/epoch-ladder-skins-and-rotation.md` now closes The configurable ladder. NOT DONE: `openspec/config.yaml` line 61 ("DESIGN_NOTES, Open items") should read "DESIGN_NOTES, State, saves and pack identity". That file is outside the files I may edit; the caller must change it.

## reviewC
- Status index rows no longer cite archived ids (03 and 04 dropped from Core model terminology and Visual and UI direction; 05c was already gone).
- The index is the table of record; the Where facts live row points at it; `design/README.md` now only points to the index and states that DESIGN_NOTES.md wins on a mismatch.
- `openspec/roadmap.yaml` header line 5 allows `design/`.
- Stage JSON paths are described as planned paths, created by the bridge on first save.
- 8-14 h became 7-14 h in both places (50-100 h over 7 Epochs gives 7.1-14.3 h).
- Fractional-watch talk-cost unit added to Open, deferred and parked.
- Arrival hold: "The timer starts when the NPC is held short and runs while the disc covers the point."
- Added to How to read this file: root AGENTS.md describes some planned behaviour as current until its rewrite; the status marks here win.
- `S1-R2` added to the Dispositions id list.
- `reduceMotion` now drives the shipped `reduceMotionAndFlashing` option (Accessibility and Settings).
- `design/regard-and-romantasy.md` storage tiers renamed baseline layer and sparse layer (and "two-layer" in the DESIGN_NOTES summary); the ladder table column is "Drone disguise examples (pool of 3-6 per Epoch)".

## Implementer ambiguities
- (i) Space on a chunk showing the end mark exits the conversation, cited as owner wording ("space exits the dialogue from the last chunk", notes/inbox.md).
- (ii) W or S with A or D is a diagonal: sum of held directions in the control frame, normalised, same speed. A or D alone turns in place and facing holds.
- (iii) Owner decision (coordinator message): facing follows the walk direction; the proximity-use arc measures from it. Written in Direct floor locomotion and in the Use bullet. Not in the Open list.
- (iv) Owner decision (coordinator message): Escape on the choice menu pops one layer and confirms no row. Escape on a chunk leaves the conversation. Not in the Open list. The menu grammar line cites the owner's "escape to quit the menu/dialog".

Traceability updated: Ship Mind forecast row, Detection Tech row, word count.
