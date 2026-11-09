# Phase 1 C1 report

Applied 16 of 16, skipped 0 in full. Verify: `npm run verify` exit 0 (125 unit tests pass).

Files: DESIGN_NOTES.md (edited), openspec/roadmap.yaml (new), openspec/config.yaml (roadmap block replaced by one pointer line, plus one pointer sentence for the pillars), notes/inbox.md (new).

| Id | Result | Notes |
| --- | --- | --- |
| A-53 | applied | "Engineering rules" section with "Bridge lock (planned: hx-ops-safety)" at the end of DESIGN_NOTES. Logger-rotation partner added as one bullet (ruling 1). The route list and "save routes" wording is my reading of the existing lab and disk routes. |
| A-79 | applied | roadmap.yaml seeded from plan v3: 7 archived (01, 01a, 02, 03, 04, 05, 05c), 64 planned in plan order, 16 parked = 87 entries. Config block (header through the last legacy entry) became one pointer line. Not done: the `roadmap:next` script and package.json change (code, goes through the docs-spine OpenSpec change); the DAG test (A-75). |
| A-58 | applied | Order is the plan's. Original ids kept. Rationale recorded in the roadmap header comments. No P3 slot, no waiver. 10-crew-handoff is the plan's, cameo stripped. |
| A-59 | applied | Plan's 05b-1 and 05b-2 entries carry the fractional-watch verb and the guarded-helper wording through their `scope` text, taken from the plan. |
| A-60 | applied | `validated_by` on 11-pass-1-slice. Waiver mechanism cut per the punch list. 06-utility-ai depends_on 11-pass-1-ledger-end-card (plan edge). |
| A-61 | applied | 07 family split as in the plan. Ambient lines only in 07-dialogue-paging. |
| A-62 | applied | 09 entries as in the plan. |
| A-28 | applied | 08a-timing-spike and 08-generated-text-adapter with notes. Q1 is answered in the register (split), so the note states it as decided, not pending. |
| A-45 | applied | audio-minimal entry (plan) directly after 05e-settings-model. DESIGN_NOTES gets a forward pointer only (below the status index), no "Minimal audio" section. |
| A-35 | applied | Forecast bullet at the end of section 3, marked (planned: 09-delta-coupling-and-forecast). INV-D parked entry exists. |
| A-76 | applied | Frame at the top: pillars, Where facts live, status index table (no heading markers), rules spine skeleton, dispositions appendix at the bottom. |
| A-01 | applied | Pillars and de-weighted note verbatim from register.md. Config gets one pointer sentence. |
| A-77 | applied | Dump moved verbatim to notes/inbox.md; six disposition rows in the appendix. Rows 5 and 6 cite the planned change ids. |
| A-63 | applied | "Open, deferred and parked" inside the status index, with "Ideas, not scheduled" sub-heading. Save policy written with the owner decision (Q2 answered). The route is cited as "route RC/R7 (finding S2-08)" per punch item 8. |
| A-94 | applied | "Considered and rejected" table in the appendix; S1-R9 label kept. |
| A-04 | applied | Owner's cameo wording only, no cross-references. |

Interpretations:
- Roadmap entries carry an extra `scope` field (the plan's scope text, kept so no planned content is lost when the config block was cut), `revisit_when` on parked entries, `note` on three entries, and top-level `milestones`. Archived entries have `milestone: null`, one-line scope omitted, and depends_on chained in order.
- `validated_by` value is free text (owner playthrough of the slice); the brief gave no schema.
- The status index statuses (shipped, partial, planned) are my judgment against code: 05d and 05e are not in src, so sections 7 and 8 read planned.
- The rules spine skeleton has R1 to R8 subjects and "planned" only; text and tests arrive with the later A-05 group.
