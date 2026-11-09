# Phase 1 C3 report

Applied 23 of 23, skipped 0 in full (four secondary anchors skipped, see below). `npm run verify` exit 0 (125 unit tests pass). Files edited: DESIGN_NOTES.md, openspec/config.yaml. No new files, nothing committed. config.yaml still parses as YAML.

| Id | Result | Notes |
| --- | --- | --- |
| A-02 | applied | Config hardware block edited once. `setup-models` dropped from the install line; model cache kept as "planned, gated on the timing spike (planned: 08a-timing-spike)". The 3-stage pipeline lines replaced by one bullet stating P2 in the owner's words and pointing at the text pipeline. The planned local text-generation worker is kept as planned. Zero API Keys untouched. |
| A-67 | applied | Same edit. Stage 1 re-homed: `tellProfile` post-pass and lexical check as gate tier 1, in both config and the DESIGN_NOTES Text pipeline rule bullet. Negation and speech-act extraction recorded as retired. |
| A-23 | applied | New section "Text pipeline (P2)" before section 10 (rule bullet). |
| A-24 | applied | Hybrid generation bullet. Q1 is answered in the register, so it is stated as decided (split), not pending. Owner stipulation kept verbatim. |
| A-25 | applied | `TextSourcePort` bullet. |
| A-26 | applied | `LineBrief` and three-tier gate bullet. Suites register after 05f-eval-and-replay. |
| A-27 | applied | Authored/generated split and authoring kit bullet. |
| A-34 | applied | INV-A to INV-F bullets (details from slices/03-sim-core.md) with the owner's INV-1 verdict quoted. |
| A-99 | applied | One line only, per punch list: "The Writing Desk uses the text port." No "compose by choosing", no Report-as-Observation. |
| A-29 | applied (DESIGN_NOTES and config) | Cut the free-text clauses in sections 8, 10, 10e, 11, and "the ONNX runtime" / "the intent dataset" in section 11. Config `23MB ONNX load` became `model load`. README, tests/AGENTS and src/domain/README parts skipped: the brief forbids touching them (they go through OpenSpec changes). Section 8's "A second pause flag." left for A-49. |
| A-30 | applied | Heading retitled "Local AI Evaluation Testing Framework (planned: 05f-eval-and-replay)". NLP/ONNX bullet replaced by a pointer to the text-pipeline gate and generation suites. Ownership split bullet added to section 11 (tests exact, golden hashes, eval distributions and corpora, one `runScenario` harness). The status-index row was renamed to match the new heading. |
| A-12 | applied | Engineering rules "Determinism" entry (splitmix32, fixed step with capped catch-up, golden run, one lint block, AGENTS application-row note). Config determinism line gets a planned sentence. The pacing bullet gets a one-sentence pointer. |
| A-86 | applied | "Interpolation seam" entry, noted as its own commit. |
| A-87 | applied | "Legacy clamp" entry plus a one-bullet pointer at the end of section 4. |
| A-88 | applied | Item 3 "Stimulus cap" under the anti-thundering-herd list. |
| A-52 | applied (config and DESIGN_NOTES) | Config telemetry bullets 1 and 2 replaced: policy plus the logger as it really is (browser does not feed it; in-memory log), caps kept, "will never truncate" with the rotation planned. DESIGN_NOTES gets an Engineering rules "Telemetry policy" entry so the config cut later loses nothing. Not touched (brief forbids .agents/ and AGENTS.md): the uplift-debug skill text ("local ONNX NLP decisions") and the AGENTS.md Session Telemetry bullet. Both are recorded in the DESIGN_NOTES entry as to be changed by the shipping change. |
| A-55 | applied | "State, saves and pack identity" entry, including the owner's save policy in the register's words. Config `StateSliceKey` sentence extended with a planned clause. |
| A-56 | applied | "Launch validation, kind table and fixtures" entry (interim shape check folded in, denylist derived from packs, `defineModuleKind`, freeze-extension guard, docs-truth staging per ruling 11). |
| A-57 | applied | "Step phases and move outcomes" entry plus a pointer sub-bullet under the Human-Paced Cognitive Phases bullet. |
| A-89 | applied | "Allocation note", one line. |
| A-90 | applied | "Tests and builders" entry. |
| A-91 | applied | "Layer-test blind spots" entry (typed ESLint later, compiler-API scan parked). |
| A-95 | applied | "Scripted command log" entry, with a pointer in section 11. |

## Stale `*Tick` wording
- Section 5 "at each watch tick" became "at each watch boundary".
- Eval text: "multi-tick rollouts", "100-tick evals" and "100-tick rollout" became "multi-step" and "100-step".
- "Renamed by R1" note added in the system graph row: `fuseTicks` (renamed `fuseWatches` by R1). The Rules spine R1 and the section 0 clock decision record already name the `*Ticks` fields.

## Interpretations
- The status index gained a "Text pipeline (P2)" row, and the Engineering rules row now lists its owning ids. The eval row was renamed with the heading.
- Engineering rules entries are `###` subsections appended after "Bridge lock". "State, saves and pack identity" is one of them rather than a top-level section.
- The save policy now appears twice, in the Open items bullet (C1, untouched) and in the State entry. C5 can merge them.
- Config line 69 ("infrastructure (onnx worker, telemetry logger/compactor, save repository)") still says "onnx worker". It is in the architecture block, not the hardware block, and no C3 id targets it. A-72 or a later pass may change it.
- INV-A numbers (about 520 MB, below the majority baseline) come from slices/03-sim-core.md.
- Typed ESLint is attached to the text port as "the first async port", from the plan's text-port scope.
- "Step phases" is used for the coordinator phase order instead of "tick phases", to avoid reintroducing tick wording. The `coordinator.tick` method name is not mentioned.
