# C5 traceability: old DESIGN_NOTES.md to new DESIGN_NOTES.md

Old file: `git show HEAD:DESIGN_NOTES.md` (697 lines, 20,121 words by `wc -w`). Old locations are line numbers in that file. Action is `kept` (same statement, reworded or retitled only), `merged into <X>` (duplicate folded into one canonical statement) or `moved`. Section names below are the new headings; the new file refers to sections by title, never by number.

## 1. Section map (one row per old heading or paragraph group)

| Old location | New section | Action |
| --- | --- | --- |
| L1-3 header (P5 sentence, ordering sentence, planned-mark sentence) | front-matter "How to read this file" | merged into the single P5 banner and tag convention; the "keep their original order" sentence is dropped because C5 reorders |
| L5-14 Pillars P1-P5 and De-weighted | Frame and pillars > Pillars | kept (verbatim, copied from the pristine file) |
| L16-28 Where facts live | Where facts live | kept; owner row for the ladder now names the "Epoch ladder and operative rotation" section by title |
| L30-72 Status index table | Status index | kept, regenerated per new section; the two eval rows (`Local AI Evaluation Testing Framework`, `11. Local AI Eval Framework`) merged into one row; the section-4 row now lists `10-crew-handoff` and `10-registry-swap-and-legacy`; the System graph row reads "partial (written here; the hubs it names are planned)" and the Rules spine row "partial (rules written here, R8 open; enforcing tests to be written by the owning changes)"; both list the roadmap ids of the changes that own the missing hubs and tests (not the doc-writing change); a Core model terminology row was added, the cognition row keeps `06-utility-ai` and reads partial, and the Text pipeline row lists `06-rivals-remote-evidence` |
| L73 "Minimal audio section is written by docs-spine-and-roadmap" | Audio > Minimal audio | merged into the minimal-audio bullet; the claim of a separate section is dropped (it was a bullet inside Sound Design) |
| L75-86 Open, deferred and parked | Open, parked and dispositions > Open, deferred and parked | kept; route labels (RC/R5, RC/R7, RC/R8) and finding ids removed; storylet-card item merged into one disposition; save-policy item shortened to a pointer to State, saves and pack identity |
| L87-89 Ideas, not scheduled | Open, parked and dispositions > Ideas, not scheduled | kept |
| L91-115 Rules spine R1-R8, standing freeze rule | Rules spine and engineering rules > Rules spine R1 to R8 | kept; R1 decision detail moved to Clock and time; R2 Act definition moved to Core model > Seven primitives (Act); R6 now the only pause-and-lab definition |
| L113 sentence "route RC/R7 is a different label" | n/a | dropped (route labels no longer appear) |
| L117-124 Player loop (minimal) | Frame and pillars > Player loop, minimal | kept (owner sentence verbatim) |
| L127-128 "Creative Review Enrichments" and "Solidified Design Decisions" dated headings | n/a | dropped: the file is organised by system, not by date |
| L129-132 Core Rule: terminology, N-epoch ladder | Core model (terminology) and Epoch ladder and operative rotation > The configurable ladder | merged into the ladder section (ladder stated once) |
| L133 Core Rule: epoch-agnostic abstraction and `lineageId` | Core model (intro) | kept |
| L134-144 Core Rule table rows (offices, instruments, stocks, pillars, comms desk, orbital pass, emergencies, legacy ledgers) | Economy and levers > Levers and how they flow across the ladder | moved (table kept whole; see deviation D1); detection-tech and comms-backbone chains moved to the ladder section; emergency cardinality merged into R5 |
| L146-157 Seven primitives | Core model > Seven primitives | kept; Act envelope, ring and `roll` merged here from L257/L259/R2 |
| L159-160 Leverage Chain | Core model > Leverage Chain | kept |
| L162-180 System graph | Core model > System graph | kept; audit-count sentence ("12 of 14 rows...") and `raw/S2-system-graph.json` dropped as review provenance |
| L182-186 Generational Operatives (operative part: new operative, Ellin Quell, kin_claim) | Epoch ladder and operative rotation > Operative rotation | moved |
| L182-186 Advisory pair and duel | Advisors and lace > The Culture advisory pair | moved; "(see Section 4 below)" removed |
| L188-193 Inference trails and signposting | Advisors and lace > Inference trails and signposting | kept (owner quote verbatim); per-section status banner dropped |
| L195-199 Competing spacefaring civilizations and the three rival tells | Rivals > Competing spacefaring civilizations | kept (verbatim) |
| L200-202 tellProfile and macro-lever sentence | Rivals (structured tells bullet) | merged (L200 into L201; macro-lever sentence kept once, verbatim; L315 copy merged here) |
| L204-217 Seed exemplars and tone benchmarks | Frame and pillars > Seed exemplars and tone benchmarks | kept (verbatim) |
| L219-234 Visual and UI direction | Presentation > Visual and UI direction | kept; era surfaces moved to the ladder table |
| L224-232 three-layer framework, F3 lab, DOM mirror | Presentation > Visual authoring framework and F3 labs | kept; lab-save caveat merged into Engineering rules > Launch validation (Lab saves) |
| L234 Later notes | Presentation > Visual and UI direction (Later notes) | kept |
| L236-240 Local AI Evaluation Testing Framework | Text pipeline, conversation and AI eval > Local AI eval framework | merged with L581-588 (one framework) |
| L242-249 Belief and deliberate misbelief | NPC minds and belief > Belief and deliberate misbelief | kept; merged with INV-B, INV-C, INV-E, INV-F (L530-534) |
| L251-262 Human-paced cognition and anti-thundering-herd | NPC minds and belief > Cognition phases and cascade guardrails | kept; Act record paragraph (L257, L259) merged into Seven primitives (Act) |
| L254-262 pacing config and fast-eval override | Clock and time > Pacing config and fast-eval override | moved |
| L264-276 Sound design and Sound Lab | Audio | kept; one audibility paragraph (L266, L268, L351 pointer) |
| L280-288 Loop cycles | Clock and time > Loop cycles | kept; stale clause "replaces reading costs no watch in section 10" deleted; "(owner decision pending)" marker kept |
| L290-307 Section 0 (4-clock, decision record, envelopes, Pacing Lab) | Clock and time > Four clocks and the decision record; Pacing profiles and curve envelopes | kept; thread-stage chain replaced by a pointer to R3 |
| L309-315 Presence model | Core model > Presence model | kept; macro-lever sentence replaced by a pointer to Rivals |
| L317-323 Resource ledger | Economy and levers > Resource ledger | kept; ledger glossary line added (one vocabulary) |
| L325-331 Storyteller deck, thread gates, storylets | Clock and time > Storyteller deck, thread gates and storylets | kept; stage chain replaced by pointer to R3; the settled-and-open circularity replaced by one disposition |
| L333-352 Section 1 Regard web and Romantasy | NPC minds and belief > Regard web and Romantasy | kept |
| L354-368 Section 2 assassination and cover persecution | Economy and levers > Assassination and cover persecution | kept; global `discoveryLayer` triggers restated per observer (see fix F2) |
| L370-385 Section 3 contingencies | Economy and levers > Orbital blackout, contingencies and Ship Mind forecast | kept; Rival Unveiling (L374) moved to Rivals > Late-game rival ambush; INV-D merged into the forecast bullet |
| L387-410 Section 4 ladder, ceilings, stills, kinship, crew | Epoch ladder and operative rotation | kept; one ladder table (rows = epochs, columns = skins), anti-over-acceleration and extraction stills as subsections |
| L405 legacy clamp pointer | Engineering rules > State, saves and pack identity (Legacy clamp) and a pointer in the ladder section | merged |
| L407 P3 crew quote | Epoch ladder and operative rotation > Operative rotation | merged into pillar P3 (the quote is identical to P3; the new text says "Owner wording: P3") |
| L409 drone disguise per epoch | ladder table column; Advisors and lace for the pool rule | merged |
| L412-433 Section 5 travel vignettes | Planned features by milestone > Epoch 2+ travel vignettes | kept; vehicle skins moved to the ladder table |
| L435-443 Section 6 Play shell | Presentation > Play shell | kept; "Change 04/05" replaced by roadmap ids; lab-save caveat replaced by a pointer to Launch validation (Lab saves) in the Session bullet; "is replaced ... by sections 7 and 8" now "will be replaced (planned: 05d-input-and-control-frame)" |
| L445-460 Section 7 Direct floor locomotion | Presentation > Direct floor locomotion | kept; camera capture quote verbatim |
| L462-475 Section 8 Proximity use and menus | Presentation > Proximity use and menus | kept; pause/lab definition replaced by pointer to R6; warm-mark hue added to open items |
| L477-483 Accessibility and Settings | Presentation > Accessibility and Settings | kept |
| L485-493 Lace-log notebook | Advisors and lace > Lace-log notebook | kept (notebook definition verbatim); save restated as pointer to the State section |
| L495-505 Section 9 bubbles and tone blips | Text pipeline, conversation and AI eval > Bubbles, lace page and tone blips | kept (tone blip quote verbatim); "Where this already appears" merged into the voice-register sentence |
| L507-535 Text pipeline (P2) with INV-A | Text pipeline, conversation and AI eval > Text pipeline | kept; "Owner wording: see P2" dropped (P2 is in Pillars); INV-A to INV-F reorganised (A here, B/C/E/F in Belief, D in forecast) |
| L535 Writing Desk line | Text pipeline (rule bullet) and Economy and levers (Communications Desk row) | merged |
| L537-554 Section 10 paging and ambient lines | Text pipeline, conversation and AI eval > Conversation paging and ambient lines | kept; impatient-beat timing kept once in Direct floor locomotion |
| L556-559 Section 10a | Text pipeline, conversation and AI eval > Interruption, pretext and fund choices | merged (10a, 10b, 10c share a shape) |
| L561-569 Sections 10b, 10c | same section | merged |
| L571-574 Section 10d | Advisors and lace > Advisor omission | moved |
| L576-579 Section 10e | Text pipeline, conversation and AI eval > Local AI eval framework (voice-register suite) | merged |
| L581-588 Section 11 | Local AI eval framework | merged with L236-240 |
| L590-595 Vertical slice | Planned features by milestone > Vertical slice | moved |
| L597-666 Engineering rules (12 subsections) | Rules spine and engineering rules > Engineering rules (six subsections) | kept; Interpolation seam, Step phases and Legacy clamp folded into neighbours; Tests and builders, Layer-test blind spots, Scripted command log and Allocation note folded into "Tests, replay and allocation" |
| L643 freeze-extension duplicate | Rules spine (standing rule) with a pointer from Launch validation | merged |
| L668-683 Dispositions: integrated notes | Open, parked and dispositions > Dispositions > Integrated and partly integrated notes | kept; finding id removed; "Where" column now names section titles |
| L685-697 Considered and rejected | same > Considered and rejected | kept (verbatim; this table may still name review ids) |
| L24 inbox pointer | Dispositions intro | kept |

## 2. Merged duplicates (canonical statement per concept in `duplication_map`)

| Concept | Canonical statement now in | Other places |
| --- | --- | --- |
| Epoch ladder and per-epoch skins | Epoch ladder and operative rotation (table plus three chains) | Core model, Where facts live, Economy rows, travel, visual direction point to it |
| Drone disguise pool, cover-persecution skins | ladder table columns | Advisors (pool rule), Assassination (state machine only) |
| Advisor pair definition | Advisors and lace | Regard and blackout mentions are single clauses |
| Generational flow 15-30 years, 110-200 years | The configurable ladder | none |
| Seed-exemplar disclaimer | Seed exemplars and tone benchmarks | none |
| Lab-save caveat | Launch validation (Lab saves) | Stage lab, Sound Lab, Pacing Lab and the play shell Session bullet each carry a pointer to it |
| Pause and lab one freeze bit | R6 | Play shell, Proximity use and menus point to it |
| Leverage Chain | Core model > Leverage Chain | R3, pillars row, player loop point to it |
| Save policy | Engineering rules > State, saves and pack identity | Open items, Loop cycles, notebook point to it |
| P5 lines | the single banner in front matter | all per-section banners removed |
| Clock decision record | Clock and time > Four clocks and the decision record | R1 states rule and test only |
| Four clocks and loop cycles | Clock and time | cognition phases point to it |
| Talk cost | Loop cycles | paging and Clock 1 carry a "see Loop cycles" pointer; the decision-record text does not restate the cost |
| Anti-thundering-herd and pacing config | Cognition phases and cascade guardrails; Pacing config and fast-eval override | none |
| Act record, envelope, `causeActId`, keyed rolls | Seven primitives (Act) | R2, cognition, determinism point to it |
| Observation table and `discoveryLayer` view | Seven primitives (Observation) | R4, system graph, notebook point to it |
| Belief maths (noisy-OR, BeliefView, misbelief, style counters) | Belief and deliberate misbelief | Text pipeline AI notes points to it |
| Ship Mind forecast | Orbital blackout, contingencies and Ship Mind forecast | parked list names `inv-d-bayesian-network` |
| Macro-lever owner sentence | Rivals (structured tells bullet) | Presence model points to it |
| `tellProfile` post-pass | Rivals; mechanism in Text pipeline | none |
| Emergency scope and fuse | R5 | lever row points to it |
| Delta spend requires zenith | R7 | lever row for instruments |
| Freeze extension | Rules spine standing rule | Launch validation points to it |
| Local AI eval runner | Local AI eval framework | status index merged |
| Voice-register evals | Local AI eval framework (suites) | bubbles section, notebook |
| Tone blips | Bubbles, lace page and tone blips | Audio and Settings point to it |
| Audibility formula and tiers | Audio | paging points to it |
| Text pipeline, `TextSourcePort`, `LineBrief`, gate | Text pipeline | primitives 6 and 7 are one-line summaries |
| Impatient line at about 6 s, slide at about 12 s | Direct floor locomotion (Arrival hold) | paging says "the impatient beat" |
| Camera capture and return | Direct floor locomotion (Camera capture) | dispositions row |
| Telemetry policy | Engineering rules > Telemetry policy | none |
| Review gates text | Where facts live (owner row) | root `AGENTS.md` and the skill; config copies are a follow-up |
| Play shell description | Presentation > Play shell | config copy is a follow-up |
| Communications-backbone ownership | Epoch ladder and operative rotation (chain) | Audio, Comms Desk row |
| Past advisors in later epochs | Ideas, not scheduled | Operative rotation points to it |
| Storylet cards, authored versus generated | Clock and time > Storyteller deck (Open question) | Open items restates the old open question (route and finding labels dropped) |
| Presence function and watch jumps | Core model > Presence model | Loop cycles, locomotion point to it |

## 3. Fixes deferred to C5 by the coherence review

| Issue | Fix applied |
| --- | --- |
| F1 stale "replaces reading costs no watch" clause | deleted; Loop cycles now says reading one chunk is free and the conversation is charged once |
| F2 section 2 triggers on global `discoveryLayer` | restated: rival strike needs an `attributed`-level Observation held by the rival (R4); noisy miracle leaves the witnesses a `noticed`/`assayed` Observation; `extracted_overt` raises every observer's derived discovery level to `theorized`; layer names kept as view vocabulary (Seven primitives, Observation); each trigger says its threshold applies to the observing faction's derived discovery level, not a global ordinal. The per-observer change is a deliberate fix, not a restructure side effect |
| F3 ladder stated three times | one table in Epoch ladder and operative rotation; Core model and Where facts live point at it. The config copies (`openspec/config.yaml` L10-16, L19, L73 and the other copies) are NOT touched; follow-up for the later config-dedupe change |
| F4 "Where facts live" and L3 sentence naming section numbers | owner row names the section by title; the ordering sentence rewritten; every cross-reference in the new file uses titles |
| F5 legacy change labels | mapped to roadmap ids (table below) |
| F6 root `AGENTS.md` states planned behaviour as shipped (`locomotionMode`, 0.22 m disc, 0.03 m slop, arrival hold, Space proximity use, menu grammar, `interactionHold`, paging and ambient lines, `npm run eval:ai`, telemetry "every event") | out of C5 scope; owned by `process-gates-and-ledger` and the docs-truth test. If it cannot wait, a fix-now commit adds a planned tag to those `AGENTS.md` bullets |
| F7 play shell "is replaced by sections 7 and 8" read as done | now "will be replaced (planned: 05d-input-and-control-frame)" |
| F8 "Minimal audio section" claim and System graph / Rules spine marked planned | claim removed; both marked partial (written here, hubs and tests planned) |
| F9 storylet-card circularity | the old open question restored as written (settled by the authored/generated split and the hybrid pipeline; the storylet-card question is left to `05b-2-storylets-and-lab`); route and finding labels dropped; the earlier "card grammar" reading was withdrawn |
| F10 status banners on former sections 1, 2, 3, 5 and heading ids in backticks | every H2 has a one-line status; headings carry one mark; ids moved to the index and to `(planned: id)` marks |
| F11 warm target mark versus reserved hues | added to Open, deferred and parked and to the readability rule (`05d-arrival-hold-readability`) |
| F12 audibility owner stated three ways | one Audibility paragraph in Audio |
| F13 ledger vocabulary | glossary bullet in Resource ledger |
| F14 two eval rows and a wrong section-4 row | merged into one eval row; ladder row lists both ids |
| F15 verbose house style | one P5 banner, one status line per section, short headings, review ids moved here |

## 4. Legacy change labels to roadmap ids

| Old label (location) | Replaced with |
| --- | --- |
| Change 03 (L230, L251, L293) | `03-modular-registries-and-kinematics` (cognition phases, `*Tick` fields; `06-utility-ai` where the utility brain is meant) |
| Change 04 (L224, L437) | `04-third-person-camera-and-inspector` |
| Change 05 (L437) | `05-live-npc-steering-and-world-stage` |
| Change 06 (L141, L238, L251, L586) | `06-overview-writing-desk-report` (MessageTransitQueue), `06-utility-ai` and `06-rivals-remote-evidence` (evals) |
| Change 06a (L296), 06c (L295, L431) | `06a-interpersonal-regard-and-romantasy`, `06c-epoch-travel-vignettes` |
| Change 10 (L431) | `10-registry-swap-and-legacy` |
| Change 11 (L439) | `11-epoch1-content` |
| `was 05a/05b/05d/05e/05f/07/10` heading tags | dropped (obsolete history) |

## 5. Review ids removed from prose

S1-R1, S1-R2, S1-R5, S1-R8, S1-R9, S2-05, S2-08, S2-11, S2-12, S2-17, S4-02, S4-03, S4-10, S5-11, Q1, INV-A to INV-F, route labels RC/R5, RC/R7, RC/R8. Meaning kept in each case: INV-A is "No decision model in the simulation path" (Text pipeline), INV-B/C/E/F are bullets of Belief and deliberate misbelief, INV-D is the forecast bullet. The Considered and rejected table still names S1-R9, S1-13, S1-12, R5C2, R6, R9, INV-A and INV-F because it records what was rejected.

## 6. Deviations from the c5_outline (with reasons)

| Id | Deviation | Reason |
| --- | --- | --- |
| D1 | The Core Rule table stays whole in Economy and levers rather than splitting rows between Core model and Economy | all eight rows are levers; a split table would need a second heading and a pointer for no gain; Core model keeps the terminology and the epoch-agnostic rule |
| D2 | Ladder section carries one table of skins (disguise, persecution, diegetic surface, vehicle) plus three chains for skins that do not map one-to-one onto seven rungs | the comms backbone has six steps, the detection ladder six, the news prop five; forcing them into rows would invent a mapping. The two original detection-tech chains stay verbatim in separate places: the ladder chain in the ladder section, the Cold-War/Computer/Space-Age grouping on the solar flare contingency |
| D3 | Sections 10a-10c merged into one subsection, 10d moved to Advisors, 10e into the eval framework | they share one shape and the outline already assigns 10d and 10e elsewhere |
| D4 | Rival Unveiling placed under Rivals with the contingency pool pointing at it | outline puts it in Rivals; the ambush counts toward the scheduler cap, which is stated in Economy |
| D5 | The "Tone benchmarks" subsection is not separate: benchmarks stay in the systems that use them (palette, TF2, Obra Dinn, Pendragon, RimWorld, Last Express). FFVII, Disco Elysium, Inside and Elder Scrolls named in `verbatim_exemplars` do not occur in the committed file and were not added | nothing to preserve; adding them would invent content |
| D6 | Resource ledger sits in Economy and levers, not Core model | outline lists it in both; one copy kept |
| D7 | Planned-by-milestone section carries a pointer table for 06a, 06b, 09a, 10, 07a-07e, 06c and the two full features that have no other home (vertical slice, travel vignettes) | outline asks for stubs pointing at systems |

## 7. Length

Old 20,121 words. New count: see the coordinator report (about 19,100 words). The reduction comes from removing repeated banners, the second and third ladder statements, repeated "(see ...)" restatements, the second eval framework, the dated headings and the duplicated pause, save, clock and macro-lever text. Concepts, numbers and identifiers were not cut to reach a target; a mechanical check (backticked identifiers, quoted owner sentences, roadmap ids, numbers) found nothing missing apart from retired labels (`*Tick`, `Change 06`, `was 05a` tags, `raw/S2-system-graph.json`).
