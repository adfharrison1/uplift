# Proposal audit and document integrity

Three independent high-reasoning audits reviewed `proposal.md`, both MODIFIED deltas, `design.md` and `tasks.md` against live specs, source, accepted design notes and the roadmap. The reviewers made no edits. The author checked each finding against source and revised the artifacts; each reviewer confirmed its own final dispositions.

| Auditor and lens | Finding | Verified disposition |
| --- | --- | --- |
| `/root/proposal_audit_arch` — architecture, adversarial, determinism, hardware | A1: telemetry warning writes can throw after a load has changed state | **Fixed in plan.** Clamp warning writes are best effort with `getLegacyClampNotes()` fallback; required `load_slot` logging moves before state publication. Failure and retry tests are explicit. `NdjsonSessionTelemetry.recordBatch` can throw on unavailable storage or append. |
| Same auditor | A2: a later clamp could hide intermediate non-finite arithmetic; no-warning and rejection scenarios overlapped | **Fixed in plan.** Check every arithmetic result before the next mutation. The no-warning scenario requires finite intermediate results. |
| Same auditor | A3: seed `0` does not exercise mixed-zero fallback | **Fixed in plan.** Seed `0x61c88647` mixes to zero and has a pinned fallback state/test. |
| `/root/proposal_audit_specs` — coverage, design and atomicity | B1: closing task permitted multiple unplanned fix commits under one checkbox | **Fixed in plan.** Each confirmed unplanned fix becomes a separately numbered task with one bounded commit, verification, two reviews and owner approval. |
| Same auditor | B2: G6 test files were named without scenario-level trace | **Fixed in plan.** `design.md` maps all 16 delta scenarios to named test evidence, including negative, no-warning and architecture cases; outcomes remain unverified until apply. |
| `/root/proposal_audit_game` — game standards, save safety, extensibility | C1: rollback claim confused save-schema compatibility with old-loader behavior | **Fixed in plan.** New code reads old saves; old code can reject new saturated-legacy saves. |
| Same auditor | C2: a load clamp warning could be mistaken for a change to the saved world entity | **Fixed in plan.** Warning context names startup/load phase, load slot and blueprint resolution; saved world remains unchanged. |
| Same auditor | C3: mixed-zero fallback lacked a concrete test | **Fixed in plan.** Same seed/vector coverage as A3. |

Document placement: the two deltas revise the existing capability contracts, and the roadmap entry now names both. The design notes already hold the planned seed and legacy behavior; their partial status and Where-facts-live table remain accurate. The inbox and historical review evidence remain untouched. No accepted content was moved or cut from live documents; all original scenario names in both MODIFIED requirements are retained. Design dispositions remain unchanged because the proposal implements accepted decisions. The three owned ledger findings remain open until implementation evidence is verified; accumulation and source-scar findings retain their later owners.

Final planning checks: strict OpenSpec validation passed; `npm run verify` passed format, lint, typecheck and test with loopback access; `npm run defects -- reconcile --check` passed with 53 active and 22 resolved records. Roadmap status identifies this proposal as the sole active change. No implementation test outcomes are claimed by the G6 plan.
