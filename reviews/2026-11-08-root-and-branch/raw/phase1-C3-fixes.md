# C3 fixes (reviewC + reviewF)

Edited: DESIGN_NOTES.md, openspec/config.yaml. Not committed. `npm run verify` passes; config.yaml parses.

## reviewC, defer_to "now" (12 issues)
1. must, section 10 ambient line "authored, engine does not invent": applied (text port wording; "simulation composes no free text").
2. should, section 11 vs model runtime: applied (TextSourcePort bullet: model reached only through the port, eval/replay use authored/pool/recorded lines, real-worker suites opt-in).
3. should, status index Engineering rules row: applied (6 ids added; 06-rivals-remote-evidence added to Text pipeline row).
4. should, Engineering rules "planned, read as will" line: applied.
5. should, config slices wording: applied ("Planned (hx-slice-store) ... today the store deep-clones").
6. should, Telemetry Wiring sentence: applied, merged with reviewF fix (one sentence naming Root AGENTS.md, the infrastructure guide and setup-models, README.md and the debug skill).
7. should, hybrid_nlp: applied (renamed or removed by telemetry-wiring, generated-text value added).
8. should, tellProfile / VoiceProfile: applied (reworded, relationship sentence added, pointer in Rivals section). The relationship sentence is my reading, marked "planned, revisable"; owner may want to correct.
9. should, rejected-table row for free-text parser: applied.
10. should, SLM marking and chunk cap: marking SKIPPED by instruction (cited as "accepted, S2-05" instead); chunk cap and split rule moved into gate tier 1, section 10 now points to it: applied.
11. should, config eval bullet: applied.
12. nit, repeated quote / INV-1 / raw fragment: applied.

## reviewF (2 fixes)
1. Telemetry Wiring bullet: applied, merged with C item 6. reviewF's wording ("states the logger as it is today, no AI trace claim") was not used because root AGENTS.md does carry the old claim.
2. "the register's earlier tag" to "the earlier tag": applied.

Counts: 14 applied, 1 skipped (the marking, by instruction; its second half applied).
