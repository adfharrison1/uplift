# Draft: how much of slices 1–2 is achieved by reordering existing roadmap changes?

Source for change scopes: openspec/config.yaml lines 120-148 (planned atomic change sequence) and DESIGN_NOTES.md sections.

## Category A — already inside an existing change's scope; that change's spec just needs to include the fix (no reorder needed)
- S2-16 Leverage Chain definition + pillar relations → 06 ("Inertia Pillars & Leverage Chains")
- S2-07 Rival tellProfile → 06 (Rival Alien Operatives)
- S2-09 Remote evidence / rival agenda → 06 (Rivals, Writing Desk, Wider World Overview) — partial: the common Report/Observation path is not in 06
- S2-18 Delta coupled to insertion → 09 (orbital pass, Slingshot/Burn Delta)
- S2-19 Emergency fuse/scope → 09 (Emergency State set-pieces)

## Category B — achieved by reordering (sometimes needing a split)
- S2-01 Watch clock → 05b owns elapsedWatches + *Ticks rebase. Reorder: move it ahead of 05a and 06. But 05b also bundles storyteller director, curve envelopes, point-release gates, StoryletTemplate, pacing lab — so SPLIT: 05b-1 clock (+ rename, scars stamp watch) early; 05b-2 storyteller later.
- S1-R1 sequencing → defer 05a (audio) and 08 (ONNX) later; pull a vertical slice forward by SPLITTING 11 (content pack) into an early one-thread slice and the later full population.
- S2-13 hubs → 3 of 5 hubs live in existing changes: watch clock (05b), Regard graph (06a), thread runtime (06). Reorder 05b-1 and 06a before/alongside 06. The other 2 hubs (actor/provenance on effects; player resource ledger) are in no change.

## Category C — needs NEW scope (no existing change covers it)
- S2-02 Act record + actor/cause envelope on WorldEffect + BehaviorModule commit (06 utility AI implies behaviour selection but not an Act record or actor on effects)
- S2-03 Observation table (epistemic model) — only mention is 'grounded in NPC epistemic memory' inside 08's composer
- S2-11 Presence function + materialize step (only 'off_stage_region LOD' mentioned, in 06c travel)
- S2-12 / S1-R5 Player notebook — not in any change
- S2-08 Authoring kit — not in any change (11 assumes content gets written)
- S2-14 Instrument data profiles (replace hard-coded 0.25) — small; no owning change
- S2-15 Balancing loops / decay keys — partial: 05b Clock 4 drifts drives/regard/pillars, not stocks or discovery
- Resource ledger (funds/hooks/pretexts held) — 07b/07c spend them but nothing owns the ledger
- StateSliceStore clone-on-read/write fix (perf prerequisite)
- S1-R11 browser telemetry wiring

## Category D — needs RESCOPING an existing change
- S2-04/S2-05 → 08 retires as an ONNX free-text intent parser; becomes local text generation + authoring runtime
- S2-06 → 07e voice-register evals become the LineBrief + 3-tier gate suite
- S2-10 → split diffusion (closed-form per watch) from embodied cascades; touches 05b-2 (Clock 4) and 06a (Regard)
- S1-R3 talk cost (fractional watch) → 05b-1 / 07

## Category E — docs only (amendment phase, no change needed)
- S2-17 rules spine; S2-04 text rule; S1-R1 player contract; Leverage Chain definition text; S1-R10 system graph

## Counting (slice 2's 19 findings)
A: 4 fully + 1 partial (S2-07, 16, 18, 19; S2-09 partial) · B: 1 (S2-01) + S2-13 partial · C: 6 (S2-02, 03, 08, 11, 12, 14) + S2-15 partial · D: 4 (S2-04, 05, 06, 10) · E: 1 (S2-17)
=> Pure reordering fixes ~2 of 19. Existing scopes already cover ~5 more if their specs are written with the fix. ~12 need new or rescoped work.

## Draft reordered roadmap (for critique)
1. 05d direct floor locomotion (unchanged)
2. 05e proximity use & menus (unchanged)
3. 05b-1 watch clock + *Ticks→*Watches + presence function (SPLIT from 05b; adds S2-11)
4. NEW core-model change: effect envelope (actor/cause) + Act ring + BehaviorModule commit (+ StateSlice clone fix first)
5. NEW Observation table + derived discovery view + notebook data model
6. 05f eval runner (unchanged; first cases: evidence coverage)
7. NEW vertical slice (SPLIT from 11): one thread, few NPCs, one office/pretext, resource ledger, end card
8. 06 utility AI/rivals/threads/desk/overview (+ Leverage Chain, tellProfile, Report-as-Observation)
9. 06a Regard (+ closed-form diffusion)
10. 07 dialogue paging (+ TextSourcePort, freeze-on-show)
11. 08' (RESCOPED) local text generation + authoring kit + timing spike; 07e reshaped as gates
12. 05b-2 storyteller/envelopes/storylets/pacing lab
13. 05a audio
14. 07a–07d, 06c, 06b, 09 (+Delta coupling, emergency fuse), 09a, 10, 11 (rest of content)
