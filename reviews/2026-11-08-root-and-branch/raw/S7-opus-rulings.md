# Opus rulings for v3 (applied to the change plan and the inventory)

Inputs: S7-audit-A1 (plan coverage and order), A2 (plan granularity), A3 (inventory fidelity), A4 (apply-ability and cross-slice).
Every auditor returned ready_with_fixes. Apply ALL of their fixes, except where a ruling below says otherwise.

## Rulings
1. **Security first.** `hx-0a` bridge lock (and its logger-rotation partner) moves to the FRONT of the whole plan, ahead of the docs and process changes. The CSRF has been reproduced, and the fix is independent of everything else.
2. **Granularity.** Adopt A2's merges and splits, which bring the plan to about 63 changes, and its 6 milestones (M1 trustworthy foundation, M2 walkable usable room, M3 core model alive, M4 talk and notebook, M5 vertical slice as the go/no-go point, M6 breadth). Each change carries a `milestone` field.
3. **Untouched planned changes keep their ORIGINAL ids and meanings** from config.yaml: 07a-dialogue-interruption, 07b, 07c, 06a, 06b, 06c, 09a, 05a, and so on. Ambient lines stay in 07 dialogue paging.
4. **Cameo.** The past-advisor cameo is a design note only. Strip it from the 10 crew-handoff scope.
5. **Audibility tiers have one owner.** The Observation-step change owns the tier rule's integration. audio-minimal ships a provisional table that the Observation step replaces. 05a consumes the rule and drops the calculator from its scope.
6. **Pause / lab.** One definition everywhere. The player pause sets the single domain freeze bit: time freezes, effects still reduce and return outcomes. Lab mode is a PlaySession flag that also holds the bit. Free-cam keys are gated on lab mode.
7. **Talk cost.** 05b-1 owns the fractional time-spend verb and its budget. 07 dialogue paging owns charging that verb per conversation.
8. **Settings.** 05e Settings is reduceMotion, hold or toggle movement, and textScale. readingSpeed and captions arrive with the 07 bubble/lace skins.
9. **06 and the vertical slice.** Keep `depends_on` as an ordering and go/no-go gate (the slice is M5). Set `validated_by` on the slice.
10. **Defect ledger.** An opsx-archive wrapper script deletes the entries for the change being archived, and the docs-truth test is the guarantee. The gates skill only points at the script.
11. **Docs-truth test staging.** It starts green: it lands after roadmap.yaml and the ledger exist. At first it checks root AGENTS.md only. The section-AGENTS `*Blueprint` check is added in the pre-05b-1 docs-truth change.
12. **Shape validation before validateLaunch.** pre-05d shape validation uses an interim loader check, which is then folded into validateLaunch.
13. **Surface attribute.** The `surface` attribute that footsteps need is carried by the pre-05d shape/floor descriptor.
14. **Inventory anchors.** Re-anchor every amendment on its quoted text, not line numbers, because earlier batches shift lines.
15. **Budgets.** AGENTS.md target is about 900 words with a test ceiling of 1050. Config context stays under 1.5k by cutting whole camera, play-shell and core-model blocks and pointing to DESIGN_NOTES instead. DESIGN_NOTES grows to about 16k words, which is acceptable because it is the design home and has the index at the top.
16. **Inventory additions to drop** (nobody accepted them): the qualitative-odds setting (A-41), `npm run smoke` (A-80), extra cameo mechanics (A-04/A-55), assist mode (A-37), and a P3 build slot (A-58). R7 is settled by S2-08 and is not open.
17. **INV coverage.** INV-A becomes a spec rule in the 07 text-source change: no decision model in the sim path; runtime pool selection is by tag and seed over Observations; an optional authoring-time advisory gate tier. INV-B's details go into the Observation change: collapse shared-origin parents, spoof as a negative term, an order-independence test, a parent cap, decided before the schema freezes. INV-D's parked Bayesian network, INV-F, and RC2 are recorded as parked entries in roadmap.yaml.

## Owner questions (held for the checkpoint; revisers mark them `owner-pending`)
- **Q1. Timing spike.** A1 says put it before 06, because it is a no-merge investigation that informs the 07 text design. A4 says keep the accepted order (08', after 05b-2). Opus recommends **splitting it**: the timing spike, an investigation with no merge, runs just before the 07 text skeleton, so the generated-adapter seam is designed with real numbers. The generated adapter itself (08') stays after 05b-2.
- **Q2. Save policy** (S1-R5). It is still undecided and blocks the notebook model. The candidate is autosave at watch boundaries plus named manual saves, with the notebook persisting across reloads.
- **Q3. Defect ledger location and seed.** The owner chose to track it; the location is `openspec/defect-ledger.yaml`. The seed is every open code defect this review found that has a slotted fixing change (all severities), or majors only.
