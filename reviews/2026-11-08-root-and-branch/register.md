# Findings register — 2026-11-08 root-and-branch

Status values: `accepted`, `accepted-partial`, `deferred`, `rejected-by-owner`, `rejected-by-review`, `candidate` (awaiting challenge).
All amendments (OpenSpec and DESIGN_NOTES) are drafted together at the end of the review.

## Owner pillars stated during the review (scouts must not argue against these)

- **P1.** The engine, modules, content objects and 3D render UI are built as a strong, decoupled, epoch-agnostic framework. The owner and an agent can then add detail and colour collaboratively as they go. The underlying tech and mechanics in the design notes are wanted. Some rules should still be set early enough to guide how the architecture evolves.
- **P2.** There is no free-text player input. A large share of the surfaced text should come from local SLM / Hugging Face generation, not hand-crafted lines. The owner is happy to get help with authoring.
- **P3.** Each epoch has a new operative with their own new Ship and Drone crew, because that is how the Culture works. The new crew, and the loss of the previous one, are part of the fun.
- **P4.** Some feedback is meant to be indirect: the player pieces together related events, NPC behaviour and world outcomes.
- **P5.** Everything the review settles stays open to later change. Core model, rules spine and roadmap order are a direction with room to add and modify, not a frozen spec. (Owner, after slice 2.)
- **De-weighted:** scale versus solo-developer time, and the number of review gates.

## Slice 0 — Baseline
Facts only. See [slices/00-baseline.md](slices/00-baseline.md).

## Slice 1 — Root (see [slices/01-root.md](slices/01-root.md))

| ID | Sev | Finding | Status | Owner position → revised action |
| --- | --- | --- | --- | --- |
| S1-R1 | critical | No written player loop or player contract, and the roadmap never forces a test of one before the big systems | accepted-partial | Keep building the engine, but set a minimal **rules spine** early so it can guide the architecture: mission, verbs per thread, win/fail shape, epoch-end evaluation, Leverage Chain definition. The vertical slice tests the engine; it does not replace engine work. Don't write everything up front. |
| S1-R2 | major | Feedback for covert actions is under-specified per action | accepted-partial | Indirect feedback is intentional (P4). Design **inference trails**: each covert effect leaves discoverable traces in events, NPC behaviour and world state. Add light signposting, e.g. advisor nudges or notebook prompts. |
| S1-R3 | major | Loop cycles unwritten; talking costs no campaign time | accepted | Write the minute, session and epoch cycles. The cost of talking comes from the world. |
| S1-R4 | major | No NPC presence model bridges watches and rooms | accepted (reframed) | Presence table per watch. Every macro lever must be something the player **interacts with in some way, and is aware of that interaction in some way, at some point**. That covers remote adversaries and correspondents. |
| S1-R5 | major | Hidden information with no notebook and no save policy | accepted (expanded) | The lace-log notebook records known facts, suspicions, partial knowledge with open questions, and complete omissions (gaps). Slice 2 to propose more categories. Save policy still to be decided. |
| S1-R6 | major | Schemas encode untested numbers; rework already queued; generality ahead of use | accepted (reluctantly) | Freeze extension: no new kind or effect without content that uses it. Settle the clock model before more time-bearing schema. No deletion. |
| S1-R7 | major | Writing pipeline undecided ("Composer" vs authored) | resolved by owner → P2 | No free text, so the ONNX intent parser in change 08 is obsolete as designed. The pipeline becomes local SLM generation plus assisted authoring. Slice 2 must review generation vs the anti-slop bar, runtime vs authoring-time, determinism and hardware. |
| S1-R8 | major | No onboarding / first-10-minutes design | deferred | Owner isn't ready for this yet. Revisit later. |
| S1-R9 | minor | Re-rolled advisors weaken the through-line | rejected-by-owner | P3. Owner's addition: **past advisors occasionally appear with help or notes over the Culture's galactic network**. Design-note candidate. |
| S1-R10 | minor | Thin system inputs/consumers; no who-writes/who-reads graph | accepted | Owner wants help. Opus to draft the system graph during the amendment phase. |
| S1-R11 | minor | Inert or soon-to-be-replaced subsystems | accepted | Label click-to-waypoint as dev tooling. Wire browser telemetry to `/api/telemetry`. |
| S1-13 | — | No epoch-handoff payoff | rejected-by-review | DESIGN_NOTES:174,179,182 already specify it. |
| S1-12 | — | Tone is only flavour | rejected-by-review | Overstated; folded into S1-R2. |

### Routes from slice 1

| ID | Route | Review verdict | Owner / status |
| --- | --- | --- | --- |
| R1 | One-thread vertical slice | endorsed | Accepted as an engine test, with the P1 caveat |
| R2 | Advisors as the feedback channel (prose, ground-truth-bounded) | endorsed with changes | Fits P4 signposting; carry into slice 2 |
| R3 | Lace log as notebook | endorsed with changes | Accepted via S1-R5 |
| R4 | Content-first discipline (freeze, don't quarantine) | endorsed with changes | Accepted via S1-R6 |
| R5 | Text-only advisor/writing prototype | endorsed | Becomes a **generation-quality prototype** under P2; slice 2 |
| R7 | Authored quality-gated storylet cards | endorsed with changes | Revisit under P2 in slice 2 (generated vs authored cards) |
| R8 | Epoch 1 as definition of done, with its own ending | endorsed with changes | Open; owner didn't address it |
| R6 | Seasonal council, rooms as scenes | rejected-by-review | — |
| R9 | CK3 numeric odds | rejected-by-review | Qualitative odds in advisor speech instead |

## Slice 2 — Game-systems design (see [slices/02-systems.md](slices/02-systems.md))

All findings were reviewed by at least 3 subagents. The three scout "criticals" were downgraded to major, with priority **now**.
**Owner decisions (after slice 2):** (1) Accepts the 7-primitive core model and the corrected order in slices/02b-roadmap-reorder.md, leaving plenty of room to add and modify. (2) Accepts the 8-rule rules spine, leaving room to modify. (3) Accepts the hybrid text pipeline. Stipulation: **also investigate a "JEV"-style decision network or decision web for runtime use, if it has a place** (owner: "like Microsoft-decision, or Laya"; not JEPA). (4) Proceed to slice 3.
All slice-2 findings below now read `accepted (P5: revisable)` unless marked otherwise.

| ID | Sev | Priority | Finding | Status |
| --- | --- | --- | --- | --- |
| S2-01 | major | now | Time uses three units; no watch clock | accepted (P5) |
| S2-02 | major | now | No Act/actor/cause; dwell commits nothing | accepted (P5) |
| S2-03 | major | now | No model of who knows what | accepted (P5) |
| S2-04 | major | now | P2 leaves generated text homeless; change 08 obsolete; ~15 passages drift | accepted (P5) |
| S2-05 | major | before-06 | Hybrid generation; runtime SLM tier gated on a timing spike | accepted, as amended (P5) |
| S2-06 | major | before-06 | LineBrief + 3-tier gate missing | accepted (P5) |
| S2-07 | major | later | Rival tells need a structured tellProfile | accepted (P5) |
| S2-08 | major | before-06 | No authored/generated split; no authoring kit | accepted (P5) |
| S2-09 | major | before-06 | No common remote-evidence path; rivals lack an agenda | accepted (P5) |
| S2-10 | major | before-06 | Player-gated world; diffusion split; fractional-watch talk cost | accepted, as amended (P5) |
| S2-11 | major | before-06 | Presence seam and three blockers | accepted (P5) |
| S2-12 | major | later | Notebook categories and the omission-referent rule | accepted (P5) |
| S2-13 | major | now | Economy hubs missing; system graph as dependency spine | accepted (P5) |
| S2-14 | major | before-06 | Instrument coupling hard-coded in the domain reducer | accepted (P5) |
| S2-15 | major | before-06 | No balancing loops; discovery ratchet | accepted (P5) |
| S2-16 | major | now | Leverage Chain needs pillar relations (definition proposed) | accepted (P5) |
| S2-17 | major | now | Eight-rule rules spine | accepted (P5) |
| S2-18 | major | before-06 | Delta uncoupled; stocks bookkeeping; discovery not per observer | accepted (P5) |
| S2-19 | minor | later | Emergency has no fuse; uniform compounding | accepted (P5) |
| — | — | slice 3 | StateSliceStore deep-clones on every read and write | carried to slice 3 |

Routes: recommended RA2, RA4, RC3. Recommended with changes RA1 and RB1 (merged into Observation), RA3, RB2, RB3, RC1. Parked RC2.
Deliverables: the 7-primitive core model and the 10-step introduction order (slices/02-systems.md); the system graph (raw/S2-system-graph.json).


### Open investigations
| ID | Topic | Status |
| --- | --- | --- |
| INV-1a | Classical decision networks (Bayes nets, influence diagrams): integer noisy-OR belief combiner on Observation, EU terms in 06, offline-fitted forecast tables. Researched on a wrong reading of the owner's ask, but kept as useful input | done, challenged: see slices/03-sim-core.md |
| INV-1b | **Decision models** (owner's "JEV" = TypeSafe AI's closed decision model; **LAYA** = ConvAI Innovations, open source, Apache 2.0, non-autoregressive, outputs choice/score/probability). Does one earn a runtime or authoring-time place: NPC choice, text selection (RC2), Observation confidence, forecasts, gates? | done, challenged: see slices/03-sim-core.md |

## Slice 3 — Simulation core (see [slices/03-sim-core.md](slices/03-sim-core.md))

Every claim was falsified with independent repros (14 hold, 4 overstated, 0 wrong). The headline deliverable is a **7-step hardening batch that lands before 05d**.
**Owner decisions (after slice 3):** (1) Hardening batch accepted, to land before 05d. (2) INV-1 verdict accepted: no decision model in the sim path; integer belief maths and designed-in misbelief; small classifier parked as a later spike. (3) Proceed to slice 4. All findings are `accepted (P5)`.

| ID | Sev | Slot | Finding | Status |
| --- | --- | --- | --- | --- |
| S3-01 | major | pre-core | Slice store clones on every get and write; O(n) append | accepted (P5) |
| S3-02 | major | pre-core | Slices untyped and unversioned; Map/Set lost on save | accepted (P5) |
| S3-03 | major | pre-core | No save migration; pack mismatch unchecked | accepted (P5) |
| S3-04 | major | pre-core | No reducer outcome channel; throws abort the batch | accepted (P5) |
| S3-05 | major | pre-core | Any throw kills the rAF loop | accepted (P5; review-accepted, examples trimmed) |
| S3-06 | major | pre-core | Pause drops every dispatched effect | accepted (P5; review-accepted, narrowed) |
| S3-07 | major | pre-core | No state hash or golden run; raw-dt stepping | accepted (P5) |
| S3-08 | major | pre-core / act-step | No seed scramble; RNG outside WorldState | accepted (P5) |
| S3-09 | major | pre-core | Frame order in PlaySession; coordinator mixes ~7 jobs; field list in 4 places | accepted (P5) |
| S3-10 | major | pre-core | Kinematics can't host commit, steer or presence; stale phase fields | accepted (P5) |
| S3-11 | major | pre-core | Door closing mid-route causes a silent doorway dwell | accepted (P5) |
| S3-12 | major | pre-core | Retarget plans from the last waypoint | accepted (P5) |
| S3-13 | minor | act-step | Stimulus cap evicts by age; no dedupe | accepted (P5) |
| S3-14 | minor | pre-core / 05b-1 | Legacy mutations accumulate; sourceScarId unchecked | accepted (P5; narrowed) |
| S3-15 | minor | pre-core | Zero-speed mover; hops not metres | accepted (P5; yaw part dropped) |
| S3-16 | minor | presence-step | Per-frame allocation waste | accepted (P5) |
| S3-17 | minor | split | Test gaps | accepted (P5) |
| S3-18 | minor | pre-core | PlaySession.status is sticky | accepted (P5) |

INV-1 conclusions INV-A to INV-F are in the slice digest. Headline: no LAYA-class decision model in the simulation path. Small integer belief maths gives P4 its readable NPC mistakes, and learning stays offline. A fine-tuned small classifier for line selection is parked as a later spike.

## Slice 4 — Engineering health (see [slices/04-engineering.md](slices/04-engineering.md))

Every finding was reviewed at least 3 times. The bridge CSRF was reproduced twice on loopback-only probes. Headline: the hardening batch is amended with a step 0a (bridge lock, logger never truncates) and a step 0b (parallel verify, pre-commit verify). The guardrail, `validateLaunch`, kind-table and docs-truth work runs before the first new kind. **Owner decisions (after slice 4):** all accepted: the amended hardening batch (0a, 0b, then 1–7, then pre-05b-1 work), the lab ruling (JSON is the source of truth, checked at runtime, no TS emission), and the telemetry policy (Act log plus replay-with-tracing).

| ID | Sev | Slot | Finding | Status |
| --- | --- | --- | --- | --- |
| S4-01 | major | 05b-1 (decide now) | Stage-lab saves are never loaded → JSON is the source of truth, checked at runtime, with no TS emission | accepted (P5; ruled) |
| S4-02 | major | hardening-0a | Bridge accepts a cross-origin simple POST | accepted (P5) |
| S4-03 | major | hardening-0a | Logger truncates on start | accepted (P5) |
| S4-04 | major | hardening-6 | Determinism guards are literal-only; application has none | accepted (P5) |
| S4-05 | major | hardening-6 | Layer-test blind spots | accepted (P5) |
| S4-06 | major | 05b-1 | Hand-typed epoch-agnostic denylist | accepted (P5) |
| S4-07 | major | hardening-3/6, obs | New invariants unguarded | accepted (P5) |
| S4-08 | major | 05b-1 | 3-file string-id joins; no launch validator | accepted (P5) |
| S4-09 | major | 05b-1 | Closed 11-kind registry; inconsistent refs | accepted (P5) |
| S4-10 | major | hardening-4 | Pack identity unmodelled | accepted (P5) |
| S4-11 | major | 05b-1 | Section docs name non-existent blueprints; pre-P2 plan; fixtures shipped as content | accepted (P5) |
| S4-12 | major | act-step | Telemetry vs Act log policy | accepted (P5) |
| S4-13 | major | hardening-3 | Monolithic tests; bridge untested | accepted (P5) |
| S4-14 | minor | telemetry wiring | Compaction and CLI gaps | accepted (P5) |
| S4-15 | minor | hardening-0b | Serial verify (parallel measured at 2.4–3.1 s) | accepted (P5) |
| S4-16 | minor | hardening-0b | Prose-pinning tests; pre-commit too weak | accepted (P5) |
| S4-17 | minor | later | Untyped ESLint | accepted (P5) |
| S4-18 | minor | 05f | eval/ vs golden split | accepted (P5) |

## Slice 5 — Runtime, feel and presentation (see [slices/05-runtime-feel.md](slices/05-runtime-feel.md))

Every finding had at least 3 reviews. Headline deliverable: an ordered list of **05d/05e prerequisites**. Speed is fine; the problems are structural. **Owner decisions (after slice 5):** (1) 05d/05e prerequisites and the rulings accepted. (2) The minimal audio slice becomes **its own new change, directly after 05e** (before 05b-1). It covers footsteps by surface, doors, menu confirm/back sounds, and murmur through doors on a provisional audibility-tier rule. Observation integration of the audibility tiers follows at core step 5. Full 05a stays later. (3) **Per-NPC tone blips approved**: a subtle per-character pitch/timbre signature as bubble text pages. DESIGN_NOTES §9 needs an amendment so this is not counted as a synthesised voice. (4) Proceed to slice 6.

| ID | Sev | Slot | Finding | Status |
| --- | --- | --- | --- | --- |
| S5-01 | major | 05d / core step 6 | Crowd and materialized NPCs get no mesh | accepted (P5) |
| S5-02 | major | 05d | Cost scales with the whole cast; room change hitches 28–72 ms | accepted (P5) |
| S5-03 | major | hardening 4/5 | A bad id throws in the render loop and freezes the page | accepted (P5) |
| S5-04 | major | hardening 6 | No interpolation seam | accepted (P5) |
| S5-05 | major | 05d/05e/05b-1 | Shape data hardcoded in the renderer; closed vocabulary | accepted (P5) |
| S5-06 | minor | 05d | Camera volume pitch and yaw are dead fields | accepted (P5) |
| S5-07 | minor | 05d / later | One geometry and material per part | accepted (P5) |
| S5-08 | minor | later | DPR 1, no antialiasing | accepted (P5) |
| S5-09 | major | 05d | Stateless input; event.key; focus | accepted (P5) |
| S5-10 | major | 05e | Menu press-consumption model | accepted (P5) |
| S5-11 | major | 05d / 07 | Camera capture, zoom and control-frame latch | accepted (P5; ruled) |
| S5-12 | major | 05e/07/05a | Accessibility Settings model | accepted (P5) |
| S5-13 | major | core step 5 | Visual tells paired with non-visual noticing | accepted (P5) |
| S5-14 | minor | hardening 5 | Free-cam gated on isPaused (original claim was wrong) | accepted (P5; narrowed) |
| S5-15 | major | 05d/05e | Mood-vs-signal readability rule | accepted (P5) |
| S5-16 | minor | later | Silhouette budget | accepted (P5; downgraded) |
| S5-17 | minor | later | Theme schema roles | accepted (P5) |
| S5-18 | minor | 05e/07 | Cyan reuse; lace text panel | accepted (P5) |
| S5-19 | major | core step 5/07/05a | Audibility tiers | accepted (P5) |
| S5-20 | minor | 05a | Audio identity; hybrid samples | accepted (P5; own change after 05e) |

## Slice 6 — Process and docs (see [slices/06-process-docs.md](slices/06-process-docs.md))

**Erratum:** slice-0 fact S0B-42 was wrong. 05c is tagged `[archived]` in config.yaml.
**Owner decisions (after slice 6):**
(1) All slice-6 findings and proposals accepted: the ch2 doc shape, the design-notes skill fix, the docs-truth test, `roadmap.yaml` plus `roadmap:next`, gates G1–G6 as additions, consumer scenarios in specs, and the task-size rule.
(2) The defect ledger is **tracked in the repo**, with a **mechanism that guarantees an entry is removed when it is fixed**. Proposed design, to be specified in slice 7: each entry carries an id, a source, a severity and the change that will fix it. The archive step deletes the entries for the change being archived, and the docs-truth test fails if any entry names an already-archived change, or names a change that does not exist in roadmap.yaml.
(3) Proceed to slice 7.

| ID | Sev | Finding | Status |
| --- | --- | --- | --- |
| S6A-01 | major | The design-notes skill writes planned systems into AGENTS.md (the drift generator) | accepted (P5) |
| S6A-02 | major | Versions stated in 4 places and diverged | accepted (P5) |
| S6A-03 | minor | CVE ids and dates unverifiable | accepted (P5) |
| S6A-04 | major | No raw-notes inbox; the 8 Nov dump is half-integrated | accepted (P5) |
| S6A-05 | major | Duplicated engine facts with no owner | accepted (P5; counts corrected) |
| S6A-06 | minor | Oversized config context | accepted (P5; narrowed) |
| S6A-07 | major | The only doc check is existence and length | accepted (P5) |
| S6A-08 | major | Review outputs need a home → the ch2 doc shape | accepted (P5) |
| S6B-01 | major | Specs test the call, not the outcome | accepted (P5) |
| S6B-02 | major | Specs encode defects as SHALL requirements | accepted (P5) |
| S6B-03 | major | Gates miss 4 defect classes → add G1–G6 (no removals) | accepted (P5) |
| S6B-04 | major | Roadmap unreliable → `roadmap.yaml` + `roadmap:next` | accepted (P5) |
| S6B-05 | minor | 4–6 task count → size rule | accepted (P5) |
| S6B-06 | major | About 30 implied changes with no owner → change plan (revised in slice 7) | accepted (P5) |

Artefacts carried into slice 7: raw/S6-B.json `change_plan` with corrections in raw/S6-ch3.json, and raw/S6-C.json inventory with corrections in raw/S6-ch4.json.

## Slice 7 — Synthesis (see [slices/07-synthesis.md](slices/07-synthesis.md))
Final artefacts:
- raw/S7-change-plan-v3.json: 64 changes in 6 milestones, plus parked items.
- raw/S7-inventory-v3.json: 94 anchored amendments in batches B0–B9.
- raw/S7-apply-punchlist.md: binding.
- raw/S7-opus-rulings.md: rulings.

Both final gates returned approve_with_minor, and the minor items are fixed or on the punch list. **Owner decisions (after slice 7):** Q1: split the timing spike (08a before the 07 text skeleton; the 08 adapter after 05b-2). Q2: Save policy (owner decision): autosave at watch boundaries plus named manual saves. Loading ANY earlier save is allowed; the owner wants rollback. The notebook (the player's Observations) is part of the save, so loading restores the knowledge state of that moment. Deterministic keyed rolls (roll(worldSeed, streamKey, counter)) mean a reload does not reroll random outcomes unless the player acts differently. An optional ironman mode is parked. Q3: ledger at openspec/defect-ledger.yaml, seeded with all severities. Q4: phases 1–3 approved (Phase 1 applies design-doc batches on a branch with one commit per batch; Phase 2 proposes the M1 OpenSpec changes; Phase 3 writes the review skill).
**Owner decision (during Phase 1):** add a **C5 restructure pass** after C4. It reorganises DESIGN_NOTES by system (frame and pillars → rules spine → core model → systems → planned features by milestone → open, parked and dispositions), merges duplicates, and keeps the owner's exemplar prose (characters, threads, rival tells, tone benchmarks) verbatim. No-loss guarantee: a traceability table maps every old paragraph to its new home, with one reviewer for no-loss and one for coherence.
**Owner decision (during Phase 1): subagent stipulation.** Every subagent brief, in this review, the review skill, the rewritten design-notes skill, the gate briefs (uplift-review-gates skill, AGENTS.md, config.yaml rules), states **"high reasoning, medium-to-high model"**. That phrasing is model-agnostic and replaces the named "Composer 2.5 Fast or Grok 4.7 High Fast". The design-notes skill gets a **full rewrite** (not the narrow A-78 fix) inside process-gates-and-ledger, after C5, targeting the new doc shape. In Claude Code this maps to `model: sonnet` (or stronger) with `effort: high`.
**Owner decision (C5 length):** apply option (a), per-feature design files under `design/` for distant M6 features, each with a summary plus a pointer and a status-index row; plus (e) deduplicate in place; plus (b) a light prose tightening on locomotion, proximity and paging. Target about 14k words. Option (c), splitting out the engineering rules, is deferred until M1 ships. The same no-loss traceability and no-loss review apply.
**Owner requirement (skills must maintain the new structure).** The rewritten uplift-design-notes skill, the new root-and-branch review skill and the new uplift-review-gates skill must all keep the new doc system intact and in order. That system is: DESIGN_NOTES organised by system; per-feature `design/` files; the status index; Where-facts-live; the rules spine; `openspec/roadmap.yaml`; `notes/inbox.md`; and the dispositions appendix. In concrete terms:
(1) **Placement.** Each new decision goes in the right system section or `design/` file. Every concept has ONE canonical statement; everywhere else points to it.
(2) **Index upkeep.** Each edit updates the status-index row, the Where-facts-live row, the roadmap entry and the dispositions row.
(3) **Status discipline.** Shipped vs planned, `(planned: id)` / `(shipped)` tags, nothing planned written as shipped, and AGENTS.md written only by the change that ships the code.
(4) **Integrity.** Owner wording kept verbatim. A no-loss traceability check on any restructure or move. Two-reviewer checks (fidelity plus coherence) on derived edits.
(5) **Budgets.** Word budgets for DESIGN_NOTES, AGENTS.md and the config context. When a section outgrows its budget, it moves to a `design/` file instead of growing.
(6) **Enforcement.** The docs-truth test checks that every `design/` file has a status-index row and every `planned:` id resolves.
**Owner requirement:** root AGENTS.md signposts every project skill: when to use it and where it lives (punch list 18).
**Owner decision:** the root-and-branch-review skill is **tracked in git**: `.agents/skills/root-and-branch-review/SKILL.md`, plus the `.claude/skills` symlink for Claude Code. Only the per-review registers under `reviews/` stay gitignored.
**Owner decisions (during C5b):** facing follows the walk direction, and the proximity-use arc measures from that facing. Escape on a choice menu pops one layer.
