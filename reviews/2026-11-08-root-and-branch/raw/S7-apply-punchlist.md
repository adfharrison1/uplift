# Binding punch list for applying inventory v3 (from final gate F2; Opus-ruled)

Appliers must follow this list. Post-apply reviewers check every item.

1. **Shipped-only AGENTS.md (A-68, plus a rule in the A-75 test).**
   - Every registry bullet for a kind with zero content or callers (rivals, offices/quiet claims/instruments/stocks/discovery, channels, threads, emergencies, orbital pass) is reworded as a schema contract: "The registry accepts `XBlueprint` (fields …). There is no content or runtime consumer yet. Design: DESIGN_NOTES §…".
   - Remove behaviour claims such as propagation, spoofing on the overview, stipends that pay, transit and interception, and martyrdom rules running.
   - The Characters bullet describes only the shipped blueprint fields. It has no `locomotionMode` or "direct" wording.
2. **Telemetry line (A-52).** AGENTS.md states the logger as it really is: the infrastructure NDJSON logger and compactor exist, but the browser game does not feed them yet. Drop "every AI input/output/reasoning trace logs".
3. **ONNX row.** Remove "local ONNX Web Worker" from the root AGENTS.md section map, and from the src/application, src/domain and src/infrastructure AGENTS.md mentions. Replace it with "planned: local text-generation worker behind TextSourcePort (DESIGN_NOTES)". That last part goes in DESIGN_NOTES only, not in AGENTS.md.
4. **Cut these inventions:**
   - the waiver mechanism on the 06→slice edge (A-58/A-60). Ruling 9 already defines the edge as an ordering plus go/no-go gate.
   - the Writing Desk "compose by choosing" mechanic (A-99). Say only "Writing Desk uses the text port".
   - the "stub end card" as a pass criterion of 11-pass-1-slice (A-100). The end card is in 11-pass-1-ledger-end-card.
   - A-97, which is merged into A-10.
5. **Roadmap seeding has one owner.** A-79 seeds openspec/roadmap.yaml directly from plan v3 (64 ids plus parked entries). A-58 only records rationale in DESIGN_NOTES. One pointer line to roadmap.yaml stays in the config context (A-72).
6. **Clean up debris** in the summaries of A-69, A-70, A-13, A-71, A-51 and A-40 (fragments left from stripping line numbers). Write the intended sentence.
7. **Section order in B7.** Before "### 1. Unified Interpersonal Regard Web", insert in this order: Presence model (A-18), then Resource ledger (A-96), then Storyteller deck (A-98).
8. **Label collision.** Rules-spine numbers are R1…Rn. Refer to the register's slice-1 "R7" route as "route RC/R7 (authored storylet cards)", or by its finding id S2-08, never as a bare "R7".
9. **Name the change for every 07 item:**
   - ambient lines and the talk cost go in 07-dialogue-paging;
   - tone blips, readingSpeed and captions go in 07-bubble-lace-skins-and-tone-blips;
   - the camera stack goes in 07-camera-directive-stack.
10. **Anchors.** Headings that get suffixed with a status marker in B3 are matched by prefix when later batches anchor on them (A-31, A-100).
11. **Batch dependencies.** A-45 (B1) only adds a forward pointer. The §9 wording lands in B8 with A-46. The A-44 block rewrite (B8) carries forward the A-71 tense edit (B3).
12. **System graph (A-19).** State that the graph is drafted from raw/S2-system-graph.json (audited: 12 of 14 rows accurate, 2 incomplete and fixed). The completeness fixes are included.
13. **Owner-pending items** (Q1, Q2, Q3): apply them with the owner's answers, or leave them clearly marked "(owner decision pending)" if not yet answered. The docs-truth ledger check (A-75 item 7) is enabled only once Q3 is answered.

14. **A-70 no-loss table.** A-72 (in process-gates-and-ledger) owns the no-loss diff table. It must be produced and must pass before any config context text is cut.
15. **Carried to the process-gates-and-ledger change** (the C3 applier could not touch these paths): the free-text/ONNX wording in README.md, tests/AGENTS.md and src/domain/README.md (A-29); the uplift-debug skill telemetry text (A-52); the AGENTS.md telemetry bullet (A-52); the src/infrastructure/AGENTS.md model-weights line (A-02).
16. **Carried to process-gates-and-ledger (high):** root AGENTS.md states as shipped `locomotionMode`, the arrival hold, proximity use, conversation paging and `npm run eval:ai`. None of these exist in src. The AGENTS.md truth rewrite and the docs-truth test fix this.
17. **Skills must maintain the doc system** (owner requirement, see register). The design-notes skill rewrite, the review skill and the gates skill encode placement, index upkeep, status discipline, integrity checks and budgets. The docs-truth test (A-75) also checks `design/` files against the status index.
18. **Root AGENTS.md signposts every skill** (owner requirement). The A-68 rewrite adds a short "Skills" section: one line per skill, saying when to use it and its path:
    - uplift-debug: logs and tracing;
    - uplift-design-notes: integrating a raw design dump or new decision;
    - uplift-review-gates: the per-change review gates G1–G6 and the size rule;
    - root-and-branch-review: the periodic deep review.

    The review skill is TRACKED (owner decision), so there is no exemption: the docs-truth test checks every skill path. Only the review registers under `reviews/` stay gitignored.
