# C5b traceability: DESIGN_NOTES.md (pre-C5b) to DESIGN_NOTES.md and design/

Old file: `git show HEAD:DESIGN_NOTES.md` (saved as `DESIGN_NOTES.before-C5b.md`, 19,601 words). New file: DESIGN_NOTES.md (about 16.5k words) plus six files under `design/`. Actions: `kept` (reworded or retitled only), `moved` (full text now in the named design file, a 3-8 line summary plus `Detail:` pointer stays), `merged into <X>` (duplicate folded into the canonical statement), `dropped (index)` (restated the Status index or Where facts live), `dropped (provenance)` (review or history remark that carried no design fact). A mechanical check confirmed every backticked identifier and every number-with-unit in the old file still appears in DESIGN_NOTES.md or `design/`.

## 1. Moved to `design/` (option a)

| Old block (heading) | New home | Left in DESIGN_NOTES |
| --- | --- | --- |
| Epoch 2+ travel vignettes (whole section: why a scene, vignette loop, summary skip, contracts, surface cues, exemplars) | `design/travel-vignettes.md` (verbatim, LaTeX-free) | 4-bullet summary + `Detail:` under Planned features by milestone |
| Assassination and cover persecution (4 vectors with odds, counter-assassination, persecution machine, 4 escape valves) | `design/assassination-and-cover-persecution.md` (verbatim) | 3-bullet summary (vector names, intercept bands, state machine, valves) |
| Orbital blackout, 5 contingencies, `CampaignContingencyScheduler` | `design/orbital-blackout-and-contingencies.md` (verbatim, including the contingency-1 `detectionTechLevel` chain, whose solar-flare steps differ from the ladder chain) | 4-bullet summary + Ship Mind forecast kept (the "Owned by" sentence dropped; the id stays in its planned mark) |
| Regard web and Romantasy (axes, 2-tier storage, triangulation, 6 channels, legacy) | `design/regard-and-romantasy.md` (verbatim, LaTeX-free) | 3-bullet summary (one web, axes, Romantasy and legacy) |
| Rivals: the three seed archetypes and their tells | `design/rival-archetypes-and-tells.md` (verbatim) | one-line archetype summary; structured `tellProfile`, agenda, owner macro-lever sentence and footprint kept whole |
| Late-game rival ambush and Rival Unveiling | `design/rival-archetypes-and-tells.md` | 1-paragraph summary incl. the 4 Unveiling steps |
| Epoch ladder skins table (rung content, drone disguise, apparatus, surface, vehicle) | `design/epoch-ladder-skins-and-rotation.md` (verbatim table) | rung names, `isTerminalEpoch`, skin columns named |
| Operative rotation detail: adjacent-epoch NPC continuity, expanding landing choices, predecessor traces, `kin_claim` vs `fresh_start` | same file | 4-bullet summary; P3 rule and owner wording kept whole |
| Anti-over-acceleration ceilings; Extraction stills (4 beats) | same file | 2 summary bullets |
| Lever table skin examples (office succession chain; instrument mode skins) | same file, new section "Lever skins across the ladder" | "(examples: design/...)" pointers in the lever table |

Stay in DESIGN_NOTES verbatim: Pillars P1-P5, Player loop, the seed characters (Sorrel, Pell, Vane, Orin, Mara), threads A-D, Highglass Hold, the communications-backbone and Detection Tech chains, the diegetic news prop chain, the macro-lever owner sentence, Ship Mind forecast, owner quotes (tone blips, camera capture, inference trails, lace-log).

## 2. Deduplicated in place (option e)

| Old text | Action | Canonical statement |
| --- | --- | --- |
| `> Status:` blockquotes under Rules spine, Core model, Clock and time, Epoch ladder, NPC minds, Economy, Text pipeline, Advisors, Rivals, Presentation, Audio, Planned features, Open | dropped (index); the shipped facts they carried moved to the nearest heading: Epoch ladder (legacy export shipped), Advisors (only the drone-disguise mesh shipped), Rivals (`RivalCivBlueprint` shipped as schema), Visual direction (60 FPS target), Rules spine intro (no rule enforced by a test yet), Engineering rules intro ("today" convention) | Status index and heading marks |
| Roadmap-ordered pointers table | dropped (index); `07e-voice-register-evals` added to the Text pipeline index row | Status index and `openspec/roadmap.yaml` |
| Rules spine summary table (Rule / Subject / Status) | dropped; each R-line states subject, status and test | R1 to R8 bullets |
| Communications-backbone ownership (lever table, Audio) | merged into one chain in The configurable ladder; the Synod / Guild Charter / Military outcome moved there; table and Audio now point to it | The configurable ladder |
| Detection Tech chain (ladder, lever table) | merged; contingency 1 keeps its own solar-flare chain in the design file | The configurable ladder |
| Lab-save caveat repeated in Pacing Lab, stage lab, play shell, Sound Lab | shortened to "(see Lab saves ...)" | Launch validation, Lab saves |
| Chunk cap in gate tier 1 | pointer to paging | Conversation paging (`120` characters, two wrapped lines) |
| Palette `#1a1f28` / `#c4a574` in authoring Layer 1 and extraction stills | pointer | Visual and UI direction |
| Palette tints, 60 Hz room step restated in Four clocks | one canonical sentence kept (rewritten; LaTeX removed) | Four clocks and the decision record |
| "Planned: fixed 1/60 s step replaces raw-dt stepping" in Pacing config | dropped | Determinism, fixed step and phases |
| Save policy bullet in Open, deferred and parked | dropped | State, saves and pack identity |
| Storylet-card open item in Open, deferred and parked | merged | Storyteller deck, thread gates and storylets (Open question) |
| Parked spikes + Other parked entries (two bullets) | merged into one "Parked entries" list; all ids kept | Open, deferred and parked |
| Gates bullet in Storyteller deck | merged into the Deck bullet | Storyteller deck |
| Presence model bullets duplicating the Presence function primitive | shortened to a pointer | Seven primitives, Presence function |
| Advisor omission "both advisors may cite predecessor sacrifices" | dropped (stated in the advisory duel bullet) | The Culture advisory pair |
| Eval "Left out" bullet | dropped (restated the owning changes) | Suites already named |
| Per-section doc-upkeep sentences ("AGENTS.md updates ride the shipping change") | kept once each where they name a distinct artifact; the Seven primitives intro keeps its own | Engineering rules intro |
| Four id lists in Engineering rules sub-headings | dropped; ids stay in the bullets and the Status index | Status index |
| "How to read this file" | rewritten; added the `design/` rule and "Change ids live in this file, under `design/` and under `openspec/`" | How to read this file |

## 3. Light tightening (option b)

Direct floor locomotion, Proximity use and menus, and Conversation paging and ambient lines were re-split into shorter bullets with the same content. Nothing dropped in them except wording: every number (`0.22` m, `0.03` m, `1.2` m by `0.14` m, `0.9` m, `0.38` rad, `0.5` m, `0.4` s, `6` s, `12` s, `0.4` m, `90°`, `±45°`, `120` characters, two wrapped lines, `1.5` m) and every identifier survives (checked mechanically). Other wording-only tightenings: Observation, Act, Core rule, Loop cycles, Four clocks, envelope list, Live F3 inspector, cognition bullets, Text pipeline, AI notes, play shell, Telemetry wiring.

## 4. Other edits

| Item | Action |
| --- | --- |
| LaTeX (`$N$`, `$k$`, `$\ge 2$`, `$O(d)$` ...) | replaced by plain text everywhere |
| System graph intro and cells | tightened; all nodes, writers, readers and gaps kept |
| Status index | added six `Design file:` rows; Where facts live gained a `design/` row |
| Dispositions intro | shortened; ids kept |
| Root `AGENTS.md`, `.cursor/rules/no-opsx-change-citations.mdc` | citation sentence (and rule `description`) widened to `design/` |

## 5. Not done

DESIGN_NOTES.md stands at about 16.5k words, not 14k. The six approved moves, the status and pointer deletions and the duplicate collapses account for about 3.5k; the remaining 2k would need content to leave the file (the deferred engineering-rules split, about 1.3k, and the Audio, eval-framework and shipped-section detail), which the owner has not approved.
