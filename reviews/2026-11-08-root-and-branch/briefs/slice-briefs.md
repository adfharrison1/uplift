# Slice briefs used in this review (faithful condensed copies of the scout and challenger prompts)

Every scout prompt begins: "Read briefs/common.md first and follow it exactly" (it covers owner pillars, evidence rules and the JSON schema).
Outputs go to raw/<slice>-<X>.json. All scouts and challengers are Sonnet (`model: sonnet`, `subagent_type: general-purpose`), launched in parallel in one message.

## Framework critique (before slice 0)
Three critics read the draft framework:
- (a) **Game-dev lens**: which slices are missing, misordered, or should be merged.
- (b) **Codebase-fit lens**: a file-ownership map per slice, with gaps and overlaps.
- (c) **LLM-multi-agent method/cost lens**: failure modes (sycophancy, hallucinated citations, generic best-practice findings), blind challengers, a findings schema, register structure.

## Slice 0: Baseline (facts only, no judgement)
- **Scout A (code reality):**
  - runtime wiring from the browser and CLI entries;
  - unreachable modules and unused exports;
  - the player's verbs today;
  - per registry kind, the count of content entries;
  - which DESIGN_NOTES concepts have code;
  - the largest files and TODO count;
  - test counts and the test:src LOC ratio per layer.
- **Scout B (docs vs reality):**
  - classify 40+ doc claims as IMPLEMENTED / PARTIAL / ABSENT / CONTRADICTED;
  - roadmap delivered vs not delivered;
  - spec requirement counts;
  - document weight vs src LOC;
  - commit counts by conventional type, and fixes after feats per change.
- **Verification:** Opus spot-checks. Then 2 blind fact-checkers each get ONLY the claim text of the ~20 load-bearing facts (no evidence) and verify from scratch.

## Slice 1: Root (vision, loop, legibility, sequencing)
- **Scout A (player experience):**
  - minute, session and epoch loop;
  - feedback for covert actions;
  - goals and win/fail states;
  - whether the two halves of agency (embodied vs macro) connect;
  - first 10 minutes;
  - experience vs mechanism.
  - Comparables: Disco Elysium, Pentiment, Cultist Simulator, CK3, Suzerain, Sunless Sea, Shadows of Doubt, Hitman, Invisible Inc, Citizen Sleeper, KoDP, Frostpunk.
- **Scout B (build sequencing / prototype vs production):**
  - riskiest-assumption-first map;
  - schemas that encode untested numbers;
  - rework already queued;
  - dead ends;
  - when the first playable decision with a consequence arrives;
  - the concrete cost of building generality first.
- **Scout C (design coherence / positioning):**
  - contradictions between pillars;
  - orphan systems (no input or no output);
  - what is novel vs already solved elsewhere, and a one-sentence hook;
  - missing genre staples (fail-forward, notebook, save-scum policy, difficulty, replayability);
  - tone as mechanics vs flavour.
- **Challengers (blind):**
  - ch1 falsifies all claims, seeing claims and paths only;
  - ch2 judges every recommendation and route against the pillars;
  - ch3 re-attacks the criticals, argues "not critical for a nascent personal project", and gives routes a second review.

## Slice 2: Game-systems design
- **Scout A (NPC minds and epistemics, as perceived design):**
  - inference trails from behaviour;
  - the presence-model seam;
  - remote actors under "aware at some point";
  - an NPC epistemic model;
  - notebook categories;
  - whether the anti-thundering-herd rules make the world inert.
- **Scout B (levers, economy, system graph):**
  - draft the who-writes / who-reads graph;
  - feedback loops and runaway risk;
  - a clock decision record;
  - a Leverage Chain definition;
  - 5–8 rules-spine items mapped to code;
  - whether stocks, discovery and delta are decisions or bookkeeping.
- **Scout C (text-generation pipeline under P2):**
  - runtime vs authoring-time vs hybrid generation;
  - grounding inputs;
  - quality gates;
  - what change 08 becomes;
  - the authored/generated split and an authoring kit;
  - every passage the new decision contradicts.
- **Challengers:**
  - ch1 and ch2 falsify claims (ch2 also audits the system graph row by row against the code);
  - ch3 judges the recommendations as game design, with a now / before-06 / later priority;
  - ch4 re-attacks the criticals ("if not decided now, about-to-ship code is built in the wrong shape") and reviews routes;
  - ch5 is an engine architect who merges the proposed primitives into a minimal core model, places them in layers, and gives an introduction order.
- **Follow-up question from the owner ("how much is achieved by reordering?"):**
  - Opus drafted a category mapping (in scope / reorder / new scope / rescope / docs);
  - checker 1 tested the mapping's accuracy against config.yaml and DESIGN_NOTES;
  - checker 2 critiqued the reordered roadmap for dependency breaks, splits, and items too early or too late.

## Slice 3: Simulation core (code)
- Each scout owns one file set. Every bug claim needs a concrete failure scenario, and repros are allowed under the scratchpad (import TS via the logs:query resolve-hook pattern).
- **Scout A (KinematicsEngine, WaypointNavigator, SpatialHashGrid):** edge cases, determinism, 60 FPS allocations, core-model seams, test quality.
- **Scout B (WorldState, reducer, StateSliceRegistry, SeededRandom, legacy):**
  - bugs and mutation leaks;
  - RNG quality and forking;
  - slice clone cost (quantify it and propose a fix);
  - envelope and outcome readiness;
  - test gaps.
- **Scout C (SimulationCoordinator, PlaySession, save/load):**
  - frame-order bugs;
  - exact save round trip, versioning and migration;
  - a golden-run determinism test;
  - god-object evidence;
  - core-model tick placement.
- **INV-1 ran in parallel.** The owner said "JEV, like Microsoft-decision, or Laya". The first run guessed JEPA, then classical decision networks; that became INV-1a. A web search identified JEV as TypeSafe AI's closed decision model and LAYA as its open-source Apache-2.0 alternative, and INV-1b was re-run on LAYA with web access.
- **Challengers:**
  - ch1 and ch2 falsify claims with their OWN independent repros;
  - ch3 (architect) slots every fix and route and proposes a pre-core hardening batch;
  - ch4 fact-checks INV facts against primary sources and judges the INV recommendations (it caught two unsourced INV-1b claims);
  - ch5 (sim designer) judges the INV items and routes from the player side.

## Slice 4: Engineering health
- **Scout A (guardrails):**
  - can the architecture test be fooled (probe files in the scratchpad only)?
  - do ESLint and tsconfig match AGENTS.md?
  - which new invariants need automated checks?
  - verify timing split by step;
  - guardrails that cost more than they protect.
- **Scout B (registry and content pipeline):**
  - authoring walkthrough: how many files and synced ids per new character, prop, room or office;
  - registry validation and dead code;
  - how the registry scales to the core-model kinds;
  - TS vs JSON split-brain;
  - section-doc drift.
- **Scout C (tests, telemetry, disk bridge):**
  - test value vs volume;
  - logger and compactor correctness and scaling;
  - bridge security: traversal, LAN exposure, CSRF, DNS rebinding. Loopback-only probes, never touching repo logs/ or saves/;
  - minimal eval/ shape.
- **Challengers:**
  - ch1 and ch2 falsify claims (ch2 independently re-probed the CSRF);
  - ch3 (architect) produces an amended hardening batch;
  - ch4 (security / DX lead) gives a top 3.
- Both falsifiers must finish with `git status --short` showing the repo untouched.

## Slice 5: Runtime, feel and presentation
- **Scout A, renderer and frame cost (code):** RenderFrameBuilder, SceneVisualBlueprints, SpaceFrame, ChiaroscuroStageRenderer, StageKitbashBuilders, content/scene, and the per-frame part of browserMain.
  - Headless benchmark of the pure builder (µs and allocations at today's scene vs a synthetic room with 30–100 NPCs and 50+ props).
  - Three.js disposal and sharing, draw calls per character or prop, cost of shadows, lights, fog and god-rays.
  - Camera spring stability with variable dt, and whether the renderer reads interpolated state.
  - Readiness for render interpolation, 05d, many-NPC rooms, a diegetic UI built in DOM vs WebGL, and epoch theming.
  - The real GPU profile is impossible headless, so the scout writes the exact scenario for Opus to profile in Chrome with the owner.
- **Scout B, play feel (code + 05d/05e design):** input architecture (menu stack, key repeat, held-key-on-close, event.key vs event.code for AZERTY, focus, rebinding, gamepad), camera best practice for the owner's "centred, event capture then auto-return, single zoom-out" (Cinemachine-style priority blend stack, occlusion cutaway, motion-sickness limits), menu grammar usability (Space doing triple duty, A/D in vertical lists), and accessibility (text scale, contrast, colour-blind cues, captions, hold vs toggle, reading speed, timed ambient lines, and the P4 risk that subtle visual tells exclude some players).
- **Scout C, art direction and audio (design):**
  - A legibility-vs-mood rule for P4 evidence under dark chiaroscuro.
  - Whether the kitbash vocabulary can express 40–60 distinguishable characters, and what it costs to add a motif. Is there an agent-followable style guide?
  - Coherence of the diegetic UI against the lace.
  - The audio plan: procedural only vs a small sample set, whether the audibility formula is predictable as gameplay, how character comes through without voice, and whether audio should move earlier because it carries inference trails.
  - Whether epoch theming scales.
- **Process note:** code scouts now finish with `git status --short`.
- **Slice 5 challengers:**
  - ch1 and ch2 falsify claims, with their own benchmarks and probes; ch2 computes WCAG luminance itself.
  - **New:** ch2 tags each claim's `kind` as rule | vocabulary | placeholder | code, so placeholder art is not mistaken for a design gap.
  - ch3 (runtime architect) slots items and writes an ordered **05d/05e prerequisites** list.
  - ch4 (game-feel / UX / accessibility lead and art director) judges items against the owner's raw interaction notes, keeping the mood and the diegetic UI, and gives a top 3.

## Slice 6: Process and docs, plus the amendment inventory
- **Scout A (documentation architecture):**
  - Where truth lives: map each knowledge kind to its files, and count and diff duplicated facts.
  - A convention plus a check so docs never blur shipped and planned.
  - Density and agent-readability: a target shape and size budgets.
  - What happens to the owner's raw notes (inbox?).
  - Stale pinned versions and CVE ids.
  - Where each class of accepted review decision should live.
- **Scout B (OpenSpec and roadmap hygiene):**
  - Archived specs vs verified reality.
  - **Gate effectiveness, numeric only:** defects this review found in delivered changes, and which gate dimension should have caught each. Framed as "make gates catch X", never "fewer gates", per the owner's constraint.
  - A maintainable roadmap representation (ordered list vs dependency graph, status tags).
  - Is the 4–6 task rule helping?
  - Draft the `change_plan`: new and amended OpenSpec changes implied by the register.
- **Scout C (amendment inventory, not findings):** maps every accepted decision and pillar to a target file and section, with an action, a summary and the conflicting passages quoted. Also lists deletions and coverage gaps. This feeds slice 7.
- **Process note:** the owner had de-weighted the gates topic, so the brief allows a finding about gates only with numeric evidence, framed as improving the gates.
- **Slice 6 challengers:**
  - ch1 falsifies all 14 findings: counts, spec quotes in context, passages the scouts missed.
  - ch2 (technical-writing / process lead) judges recommendations and routes against the "never fewer gates" constraint, and writes a final `doc_shape` with the fewest new files.
  - **ch3 audits the change_plan:**
    - coverage against the register (orphans, scope nobody accepted);
    - order against the accepted order;
    - granularity;
    - missing changes;
    - whether the untouched planned changes still have valid dependencies.
  - **ch4 audits the amendment inventory:**
    - fidelity to the owner's exact decisions;
    - coverage;
    - a sample of 20 or more of the deletions;
    - cross-conflicts with the change_plan;
    - the order to apply edits in.
- **Process note:** large derived artefacts (change plan, amendment inventory) each get two independent auditors with different lenses, and each is checked against the register as the source of truth.

## Slice 7: Synthesis and amendments
- **7a, revise.** Two Sonnet revisers ran in parallel, each given the register as the source of truth plus the audit of its artefact.
  - **Change plan v2:** the complete ordered list from now to the end of the roadmap (new, amended and untouched changes). Each accepted item is owned by exactly one change, the accepted order is followed exactly, and any deviation is justified. Over-wide items are split.
  - **Inventory v2:** fix every fidelity issue, use the owner's exact wording, turn wrong deletions into "(planned)" marks, add the missing amendments plus those implied by slice 6, and give a coherent `apply_order`.
- **7b, re-audit (next).** Two auditors per artefact, plus one cross-consistency and coherence check across slices.
- **7a results:** plan v2 has 83 changes (52 new, 22 amended, 9 untouched), with a scripted check for duplicates and forward dependencies. Inventory v2 has 89 amendments, no outright deletions, and 135 verified quotes.
- **7b re-audit (4 auditors):**
  - **A1:** plan coverage, checking every accepted id against the actual scope text, plus order and fidelity, and the three flagged placements.
  - **A2:** plan granularity and practicality (merges and splits under the size rule, without arguing for fewer gates), 4–6 milestones with visible outcomes, top risks, and where to start.
  - **A3:** inventory fidelity and coverage, classifying each open item as owner / decided / drop.
  - **A4:** whether the inventory can be applied (simulate the batches, find same-passage conflicts and missing targets, estimate word budgets), plan↔inventory consistency, and contradictions across slices.
- **Process note:** the reviser's scope can balloon (83 changes). A dedicated practicality auditor is needed to recommend merges and milestones.
- **7b results:** all 4 auditors returned ready_with_fixes.
  - A1: 17 items missing by scope text even though the reviser claimed none.
  - A2: merge down to about 63 changes, with 6 milestones.
  - A3: 2 genuine owner questions; drop 5 additions nobody accepted.
  - A4: 14 apply conflicts and 13 contradictions across slices; line numbers shift between batches, so anchor on quoted text.
- **7c, Opus rulings plus v3.** Opus wrote `raw/S7-opus-rulings.md`: binding rulings on the auditors' conflicts, plus the owner questions held for the checkpoint. Two v3 revisers then applied every audit fix under those rulings. Each self-checks with a script (deps resolve, ownership complete, anchor quotes verbatim, each amendment in exactly one batch).
- **Process note:** a reviser's self-report ("nothing unowned") is not evidence. Coverage has to be judged against what the scope text actually does. Rulings must be written to a file before the final revision, so both revisers apply the same decisions.
