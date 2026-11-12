# Proposal audits and document integrity

Three independent, read-only, high-reasoning audits reviewed the proposal, MODIFIED delta, design and eight-task plan against current specs, source, tests, accepted design notes, roadmap and checked ledger. Each reviewer had a distinct lens and did not receive the others' findings before its initial report. The author checked the findings against source/ledger, reproduced the schema-transform drift with the installed Zod, revised the artifacts, and each auditor confirmed its own findings resolved. These are planning corrections; implementation behavior remains unverified.

| Finding | Independent lens and source check | Disposition in the revised plan |
| --- | --- | --- |
| A1: public store constructor accepts mutable raw entries | `/root/slice_arch_audit`, architecture/adversarial; `StateSliceRegistry.ts` constructor copies the map but not values | **Fixed in plan:** public raw-entry construction rejects; internal trusted factory and runtime bypass test. |
| A2: schema transforms drift on repeated restore | Same auditor; `z.number().transform(n => n + 1)` parsed 5→6→7 in a controller repro | **Fixed in plan:** validation-only schema rejects changed output; deliberate conversions use migration; repeated save/load test. |
| A3: malformed custom-slice container becomes `{}` | Same auditor; coordinator currently coerces present `null`/primitives to empty and accepts arrays | **Fixed in plan:** reject present non-record containers before publication; test prior world/RNG and retry. |
| A4: schema/migration output can freeze caller-owned objects | Same auditor; callback output need not belong to the store | **Fixed in plan:** ignore schema output after equality check; copy migration output before validation/freeze; ownership test. |
| B1: two owned defects omitted from closing task | `/root/slice_completeness_audit`, completeness/atomicity; checked ledger assigns five entries | **Fixed in plan:** closing task includes `S3-01`, `S3-02`, `S3-17-slices`, `S4-07-json` and `S4-13`. |
| B2: coordinator monolith omitted from fixture split | Same auditor; `SimulationCoordinator.test.ts` is the explicit `S4-13` source anchor | **Fixed in plan:** first task adopts `makeRegistry`, splits that suite and preserves atomic-load assertions. |
| B3: constructor bypass also weakens G6 | Same auditor; same source as A1 | **Fixed in plan:** direct constructor scenario, test and task. |
| B4: append scenario missed schema restriction | Same auditor; arbitrary whole-array schema cannot be validated at constant append cost | **Fixed in plan:** valid/invalid row-schema and rejected whole-array fast-path scenario plus test. |
| B5: version map and unknown keys lacked scenarios | Same auditor; design promised more than delta tests covered | **Fixed in plan:** historical version 1, partial/malformed map, unknown value/version preservation, failed load and retry scenarios. |
| C1: transformed schema changes saved game state | `/root/slice_game_audit`, game/safety/extensibility; same reproduced drift as A2 | **Fixed in plan:** validation-only boundary and repeated consumer round trip. |
| C2: unregistered intermediate coordinator could lose version | Same auditor; unknown-key preservation needed a consumer test | **Fixed in plan:** version 3 passes through an unregistered coordinator and returns unchanged to a registered one. |
| C3: separate bounded-storage paragraph would become stale | Same auditor; `DESIGN_NOTES.md` Seven primitives paragraph repeats the clone-cost prerequisite | **Fixed in plan:** implementation task updates that paragraph while retaining Tier-2/Tier-3 and epoch-compaction commitments. |

## Gate and document record

- **G1:** The design traces effects/typed keys through store, world, coordinator save repository and loaded world read; bridge tests retain actual HTTP and disk readback. Browser disk-load behavior is outside this change.
- **G2:** Constructor, direct/effect writes, snapshots, schemas, version maps and migration output are named trust boundaries with rejection scenarios.
- **G3:** Append avoids traversing old rows; full reads and snapshots can remain linear. The 5,000-row fixture, source review and host measurements are planned. Reference-Mac and 60 FPS timing are unmeasured.
- **G4:** Malformed containers, versions and migrations must fail before coordinator state publication; prior world/RNG and retry are in the spec.
- **G5:** The checked ledger still owns five open findings for this change. Later `S3-17-hop`, `S3-17-save` and `S3-17-step` stay with their existing owners. No finding is represented as verified at proposal time.
- **G6:** The design maps all 18 delta scenarios to planned named test consumers. No future test result is claimed now.

Only new OpenSpec planning documents were edited. No owner wording, live guide, status-index row, roadmap row, disposition, inbox entry or historical review was moved or cut. The Engineering status index and roadmap continue to show this work planned; the implementation tasks carry their shipped-status edits. The existing larger `DESIGN_NOTES.md` baseline remains the accepted aspirational-budget exception, and root `AGENTS.md` is unchanged. The review gate's independent fidelity/coherence lenses apply when those live documents are edited during implementation.

Final planning checks: strict OpenSpec validation passed; `npm run verify` passed format (3,265 ms), lint (2,569 ms), typecheck (715 ms) and tests (17,217 ms) with loopback access. Checked defect reconciliation passed with 51 active and 25 resolved. The validated roadmap reports `hx-slice-store` as the sole active change. The delta has 18 scenarios and the checklist has eight pending tasks. The independent auditors' sandbox-only HTTP attempts failed on loopback `EPERM`; the controller's socket-enabled full verification passed, so those attempts are not product failures. Source and tests have not been implemented by this proposal.
