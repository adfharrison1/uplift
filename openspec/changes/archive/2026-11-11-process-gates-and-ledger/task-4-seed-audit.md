# Task 4 independent seed audit B

This records the completed independent source audit against baseline `1c77ac7`. The reviewer inspected the accepted register, adjudicated slices 03–05, approved finding reconciliation, bootstrap inventory, task/design/spec contracts, earlier delivery evidence and current source. This is the initial seed expectation, not approval of the forthcoming tooling, actual ledger, CLI or documentation. No tests were run for this read-only audit. The subsequent implementation review must compare the actual result with this baseline and inspect any new findings.

## Expected parity

Expect **57 code/tooling records: 53 open, one parked and three verified**, before any new implementation findings. Historical S3–S5 findings contribute 53 records: 35 major and 18 minor. The three quotechecker records add two major and one minor. The controller has assigned **major** to the inherited-Git-fixture defect because a nested repository can use and modify the parent index. That severity is a controller ruling, not a historical assignment. The complete expected total is therefore **38 major and 19 minor**. There are no accepted critical S3–S5 records, but the schema must support critical severity.

Each suffixed S3/S4/S5 child retains the original finding as `parent_id`. Standalone findings have no parent. Do not also seed umbrella records S3-07, S3-08, S3-09, S3-14, S3-17, S4-07, S4-11, S4-14 or S5-18.

| ID                     | Severity | Status   | Fixing owner                     | Parent | Accepted code scope                                                            |
| ---------------------- | -------- | -------- | -------------------------------- | ------ | ------------------------------------------------------------------------------ |
| S3-01                  | major    | open     | hx-slice-store                   | —      | Slice cloning on reads and writes; append cost grows with slice size           |
| S3-02                  | major    | open     | hx-slice-store                   | —      | Missing slice schema/version and plain-JSON enforcement                        |
| S3-03                  | major    | open     | hx-save-integrity                | —      | Weak inner snapshot validation, no migration or pack mismatch check            |
| S3-04                  | major    | open     | hx-reducer-and-frame-safety      | —      | No per-effect rejection outcome; throws abort a batch                          |
| S3-05                  | major    | open     | hx-reducer-and-frame-safety      | —      | Frame exception prevents the next animation frame                              |
| S3-06                  | major    | open     | hx-reducer-and-frame-safety      | —      | Pause silently drops dispatched effects                                        |
| S3-07-golden           | major    | open     | hx-determinism-harness           | S3-07  | State hash and seeded golden-run coverage                                      |
| S3-07-raw-dt           | major    | open     | hx-fixed-step-tick               | S3-07  | Raw frame-dt stepping                                                          |
| S3-08-rolls            | major    | open     | cm-act-envelope-and-rolls        | S3-08  | Saved deterministic keyed rolls                                                |
| S3-08-seed             | major    | open     | hx-1-legacy-clamp-seed-scramble  | S3-08  | Seed scrambling                                                                |
| S3-09-fields           | major    | open     | hx-save-integrity                | S3-09  | Duplicated snapshot field lists                                                |
| S3-09-order            | major    | open     | hx-fixed-step-tick               | S3-09  | Frame phase ordering and coordinator responsibilities                          |
| S3-10                  | major    | open     | hx-kinematics                    | —      | Kinematic extension seams and stale phase fields                               |
| S3-11                  | major    | open     | hx-kinematics                    | —      | Closed door truncates route into silent doorway dwell                          |
| S3-12                  | major    | open     | hx-kinematics                    | —      | Retarget starts from last waypoint rather than current body position           |
| S3-13                  | minor    | open     | cm-act-envelope-and-rolls        | —      | Stimulus cap evicts by age without deduplication                               |
| S3-14-accumulation     | minor    | open     | 10-registry-swap-and-legacy      | S3-14  | Legacy mutations accumulate across epochs                                      |
| S3-14-clamp            | minor    | open     | hx-1-legacy-clamp-seed-scramble  | S3-14  | Runtime clamp requirement; existing authoring throw remains specified          |
| S3-14-source           | minor    | open     | 05b-1-watch-clock-and-time-spend | S3-14  | Unchecked sourceScarId reference                                               |
| S3-15                  | minor    | open     | hx-kinematics                    | —      | Zero-speed mover never finishes; hop-based routing limitation                  |
| S3-16                  | minor    | parked   | null                             | —      | Small per-frame allocation cost; revisit at 100+ bodies in a room              |
| S3-17-clamp-rng        | minor    | open     | hx-1-legacy-clamp-seed-scramble  | S3-17  | Frozen-input clamp and RNG golden-vector coverage                              |
| S3-17-hop              | minor    | open     | hx-kinematics                    | S3-17  | Mid-hop routing and boundary-state coverage                                    |
| S3-17-save             | minor    | open     | hx-save-integrity                | S3-17  | Strengthened codec round-trip, corruption, schema, migration and pack coverage |
| S3-17-slices           | minor    | open     | hx-slice-store                   | S3-17  | Frozen/shared output and JSON-slice invariants                                 |
| S3-17-step             | minor    | open     | hx-fixed-step-tick               | S3-17  | Catch-up caps and equivalent dt splits                                         |
| S3-18                  | minor    | open     | hx-reducer-and-frame-safety      | —      | Sticky PlaySession status                                                      |
| S4-01                  | major    | open     | pre-05b-pack-source-of-truth     | —      | Saved stage JSON is not loaded into the runtime launch                         |
| S4-04                  | major    | open     | hx-determinism-harness           | —      | Literal-shape determinism guards and missing application coverage              |
| S4-05                  | major    | open     | hx-determinism-harness           | —      | Import/layer checker blind spots                                               |
| S4-06                  | major    | open     | pre-05b-launch-validation        | —      | Hand-maintained epoch-specific denylist                                        |
| S4-07-json             | major    | open     | hx-slice-store                   | S4-07  | Map/Set and frozen-slice invariants                                            |
| S4-07-order            | major    | open     | hx-determinism-harness           | S4-07  | Sorted-iteration and determinism coverage                                      |
| S4-08                  | major    | open     | pre-05b-launch-validation        | —      | Bare-string joins lack launch validation                                       |
| S4-09                  | major    | open     | pre-05b-launch-validation        | —      | Closed registry kinds and inconsistent references                              |
| S4-10                  | major    | open     | hx-save-integrity                | —      | Pack identity and composition are not modelled                                 |
| S4-11-contracts        | major    | open     | pre-05b-pack-source-of-truth     | S4-11  | Missing blueprint contracts and fixtures exported as content                   |
| S4-12                  | major    | open     | cm-act-envelope-and-rolls        | —      | Existing telemetry versus intended Act-log policy                              |
| S4-13                  | major    | open     | hx-slice-store                   | —      | Remaining monolithic tests and pasted fixtures; bridge portion delivered       |
| S4-14-runtime          | minor    | open     | telemetry-wiring                 | S4-14  | CLI tail/limit/count gaps and compaction edge behavior                         |
| S4-17                  | minor    | open     | 07-text-port-and-history         | —      | Untyped ESLint; typed async-port lint remains assigned                         |
| S5-01                  | major    | open     | cm-presence-render-crowd         | —      | Current mesh creation requires an ID-matched visual                            |
| S5-02                  | major    | open     | pre-05d-renderer-shape           | —      | Frame and stage-build work scales with the whole cast                          |
| S5-03                  | major    | open     | hx-save-integrity                | —      | Invalid semantic entity ID can throw during frame construction                 |
| S5-04                  | major    | open     | hx-fixed-step-tick               | —      | Missing render interpolation seam                                              |
| S5-05                  | major    | open     | pre-05d-renderer-shape           | —      | Renderer-owned shape literals and closed vocabulary                            |
| S5-06                  | minor    | open     | 05d-input-and-control-frame      | —      | Camera volume pitch/yaw do not drive actual view orientation                   |
| S5-07                  | minor    | open     | pre-05d-renderer-shape           | —      | Per-part geometry/material allocation and caching                              |
| S5-09                  | major    | open     | 05d-input-and-control-frame      | —      | Stateless event.key input and unmanaged focus seam                             |
| S5-11                  | major    | open     | 05d-input-and-control-frame      | —      | Existing camera latch/zoom seam limitation                                     |
| S5-12                  | major    | open     | 05e-settings-model               | —      | Existing settings/accessibility limitation                                     |
| S5-14                  | minor    | open     | hx-reducer-and-frame-safety      | —      | Free-camera keys gate on isPaused                                              |
| S5-18-cyan             | minor    | open     | 05e-modal-stack-use-and-menu     | S5-18  | Existing debug highlight conflicts with reserved lace cyan                     |
| T1-QC-01               | major    | verified | process-gates-and-ledger         | —      | Historical quotechecker could accept false quote tails/ranges                  |
| T1-QC-02               | major    | verified | process-gates-and-ledger         | —      | Historical quotechecker root/path and command-evidence handling                |
| T1-QC-03               | minor    | verified | process-gates-and-ledger         | —      | Unicode separators incorrectly treated as physical source lines                |
| TOOL-GIT-FIXTURE-INDEX | major    | open     | process-gates-and-ledger         | —      | Inherited Git environment makes nested fixtures use the parent index           |

S3-16 requires a retained reason and revisit condition, not merely null ownership. T1-QC-01/02/03 require actual checked **add → in_progress → verified** histories. Task 1 commit `628699b`, [task evidence](task-1-evidence.md), [independent reviews](task-1-reviews.md) and [bootstrap final dispositions](finding-inventory.md#final-task-1-dispositions) retain the fix/test/review record. Do not seed them unresolved or fabricate an initial verified event.

## Exclusions and document dispositions

| Finding or portion                                                                                  | Required retained disposition                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S4-02, S4-03, S4-15, S4-16                                                                          | Previously delivered in [archived safety delivery](../archive/2026-11-10-hx-ops-safety/delivery.md) and [verification](../archive/2026-11-10-hx-ops-safety/verification.md); exclude active seeds without fabricating retrospective receipts |
| S4-13 bridge tests                                                                                  | Delivered real guarded HTTP middleware tests; seed only remaining fixture/monolith debt                                                                                                                                                      |
| S4-11-guides                                                                                        | Explicit document-only split owned here, parent S4-11; retain task 3 evidence and still-open sibling S4-11-contracts                                                                                                                         |
| S4-14-guidance                                                                                      | Explicit document-only split owned here, parent S4-14; retain task 2 evidence and still-open sibling S4-14-runtime                                                                                                                           |
| S4-18                                                                                               | Planned shared harness/eval policy at 05f-eval-and-replay                                                                                                                                                                                    |
| S5-10                                                                                               | Planned menu press-consumption model at 05e-modal-stack-use-and-menu                                                                                                                                                                         |
| S5-13 and S5-19                                                                                     | Planned tell/noticing and audibility rules at cm-instrument-profiles-audibility-tells                                                                                                                                                        |
| S5-15                                                                                               | Planned readability rule at 05d-arrival-hold-readability                                                                                                                                                                                     |
| S5-20                                                                                               | Planned audio identity/hybrid samples at 05a-audio-engine                                                                                                                                                                                    |
| S5-08, S5-16, S5-17                                                                                 | Parked design/art decisions at dpr-antialiasing, silhouette-budget and theme-roles; not parked code-defect rows                                                                                                                              |
| S5-11 directive stack                                                                               | Future capture/return system with dialogue/events; current seed is only latch/zoom seam                                                                                                                                                      |
| S5-12 reading/captions                                                                              | Future 07/05a owners; current seed is only settings/accessibility limitation                                                                                                                                                                 |
| S5-18 lace panel                                                                                    | Future panel work; only current cyan conflict is seeded                                                                                                                                                                                      |
| S4-07 hidden-truth projector                                                                        | Future cm-observation-notebook requirement; slice invariants cannot resolve it                                                                                                                                                               |
| S5-07 Tier-3 merging                                                                                | Parked design; current row owns allocation/caching only                                                                                                                                                                                      |
| T1-PROC, T2/T3 document findings, environment/budget observations, S1/S2/S6 design/process findings | Explicit bootstrap/design/roadmap dispositions, not invented runtime defects                                                                                                                                                                 |

**Initial correction requested:** `finding-inventory.md` contained neither explicit `S4-11-guides` nor `S4-14-guidance` ID when audited. Add their document-only dispositions with parent/sibling provenance and task 3/task 2 evidence. This report records the baseline gap; it does not claim whether a later implementation has corrected it.

## Source-backed narrowing and evidence

Authority is [the accepted register](../../../reviews/2026-11-08-root-and-branch/register.md), [slice 3](../../../reviews/2026-11-08-root-and-branch/slices/03-sim-core.md), [slice 4](../../../reviews/2026-11-08-root-and-branch/slices/04-engineering.md), [slice 5](../../../reviews/2026-11-08-root-and-branch/slices/05-runtime-feel.md), and the approved [reconciliation contract](finding-reconciliation.md). Source anchors below refer to inspected baseline `1c77ac7`; they are provenance, not claims of fresh test execution.

- **Slices:** `src/domain/core/StateSliceRegistry.ts:8,105,116,134` confirms unversioned descriptors, cloning and unrestricted snapshot values. `src/domain/persistence/SaveSlotRepositoryPort.ts:47` permits unknown slice values. Do not describe the TypeScript slice API as wholly untyped: the defect concerns runtime schema/version and JSON invariants.
- **Save/load:** `src/application/simulation/SimulationCoordinator.ts:95,112,741,789,817` shows the repeated field lists, weak inner guard and unchecked pack identity. Existing repository/coordinator save round-trip and some corruption tests already exist. S3-17-save owns strengthened codec/migration/schema/pack coverage, not a claim of zero save tests.
- **Effects and stimuli:** `SimulationCoordinator.ts:506` returns without applying effects while paused. `src/domain/simulation/WorldEffectReducer.ts:61,72,478` supplies throwing unknown-ID paths and no per-effect rejection channel; `:176` appends and evicts oldest stimuli. Pause also stops simulation time; the finding is silent effect loss.
- **Frame/order:** `src/interfaces/composition/browserMain.ts:207–232` passes raw dt and schedules the next animation frame only after frame/render/input work. `src/application/shell/PlaySession.ts:184` owns coordinator stepping. Do not resurrect the rejected unreachable-dt example for loop death.
- **RNG:** `src/domain/core/SeededRandom.ts:10–27` normalizes but does not scramble the seed; `SimulationCoordinator.ts:252,277` holds the RNG outside WorldState. Keyed rolls remain separately owned.
- **Kinematics:** `SimulationCoordinator.ts:204,457` truncates routes and plans from the entity waypoint. `src/domain/simulation/KinematicsEngine.ts:344,389` enters dwell on exhausted paths and stalls zero-speed movement. `src/domain/simulation/WaypointNavigator.ts:218` uses queue traversal. The accepted yaw-snap allegation was dropped; Dijkstra is conditional on an observed wrong route.
- **Legacy:** `src/domain/legacy/CivilizationLegacyState.ts:75–115,327` lacks source-scar referential validation and throws on out-of-range results. `SimulationCoordinator.ts:718` concatenates inherited and new mutations. Runtime clamping is an accepted change to specified behavior, not evidence that the existing authoring throw violates its current contract.
- **Content/registry:** `browserMain.ts:482` composes a static launch; `src/content/index.ts:10` exports the Charnel fixture content. `src/domain/registries/EpochModuleRegistry.ts:39–88` uses separate closed-kind storage/registration and does not retain pack identity. Missing future blueprint contracts are not falsely described as shipped gameplay.
- **Guard coverage:** `eslint.config.mjs:35` limits determinism selectors to domain/content literal shapes. `tests/architecture/layer_boundaries.test.ts:40,117` confirms import extraction and determinism-pattern blind spots. Typed lint remains absent.
- **Visibility/cost/shapes:** `src/interfaces/three/ChiaroscuroStageRenderer.ts:193` builds groups from supplied visuals; `src/application/rendering/RenderFrameBuilder.ts:678` traverses sorted world entity IDs. `src/interfaces/three/StageKitbashBuilders.ts:169,291,330` holds literal shapes and per-part resources. This proves current seams, not that planned crowd/materialization systems already exist.
- **Camera:** `RenderFrameBuilder.ts:528,550` computes position from offset and separately computes pitch/yaw. `ChiaroscuroStageRenderer.ts:263` applies position/lookAt, not those pitch/yaw fields. The precise claim is that pitch/yaw do not drive the actual view, not that the fields are never read. S5-11 identifies the existing latch/zoom seam limitation, not a finished movement/control-frame feature or future directive stack.
- **Input/accessibility:** `browserMain.ts:202` forwards event.key, and `src/interfaces/composition/playInput.ts:145–163` implements stateless key handling with a pause gate. Pause and de-anchor are already separate state. WASD layout risk remains prospective. Accessibility already affects fog/god-rays as well as motion, so the seed must not reduce current behavior to only one visual clamp.
- **Cyan:** `ChiaroscuroStageRenderer.ts:330` uses `#4fd2ff` for selected debug highlight. Future lace panel design is not part of this current-code seed.
- **Telemetry:** `src/interfaces/cli/queryLogs.ts:67–122` lacks tail/limit/count options. `src/infrastructure/telemetry/NdjsonSessionTelemetry.ts:371–395` performs synchronous compaction. Debug wording corrections do not implement runtime wiring or retention changes. The accepted trace-policy finding is narrower than a claim that all decision traces are currently kept verbatim.
- **Git fixture:** `tests/unit/tooling/VerifyRunner.test.ts:268,313` inherits the process environment into nested Git work. Archived safety `verification.md:160` records the actual partial-index failure and deferral. No new reproduction was run during this audit.

Historical slice timings remain historical headless observations. In particular, the 28–72 ms room-change figures are not a fresh GPU benchmark or reference-Mac measurement. Slice 5 explicitly leaves GPU profiling open. This audit neither supplies that missing evidence nor approves the final seed, lifecycle implementation or documentation.

## Implementation review B: initial findings at ledger revision 69

This supplement preserves the initial implementation review findings before correction. Its lens is seed fidelity, architecture/specification, coverage and related guidance; it does not replace the independent core-algorithm review. The reviewer performed read-only source/data checks and the installed CLI's roadmap and reconciliation consumers. No test suite or mutating ledger command was run by this reviewer.

- Exact parity passed for all 57 IDs, severities, statuses, fixing owners and parent links against the independent table above; no unexpected records were present. T1-QC histories contain add → in_progress → verified, with the delivered task 1 Git reference and matching retained test/review digests.
- The retained seed command log contains 57 successful adds, six lifecycle transitions and six provenance updates, reaching ledger revision 69. Two additional logged read-only commands do not advance the revision. The legacy exemption set exactly matches the eight actual archive directories.
- Read-only `node scripts/project-status.mjs roadmap --json` returned active `process-gates-and-ledger`, `next: null`; `node scripts/project-status.mjs defects reconcile --check` returned `ok: true`, 57 active and zero resolved records.
- The earlier missing S4-11-guides/S4-14-guidance dispositions are now explicit in the inventory, with their parent IDs, task evidence and still-open code siblings. Git-fixture major severity is explicitly a controller assignment.
- The module stays in Node tooling and exposes pure graph, lifecycle and reconciliation functions alongside filesystem adapters. Shared receipt/lock/recovery seams exist for task 5. The API guide explicitly reserves OpenSpec root/completion/review preflight and the actual archive CLI for the wrapper, and warns that the shared lock callback is synchronous. Root and tests README/AGENTS pairs describe the shipped command scope without claiming the wrapper has shipped.

### T4-B-01 — source provenance precision

Severity: minor. Kind: seed provenance/document correction, not a newly inferred simulation defect. Gates: G5/G6. Initial status: correction required.

The six initial source updates preserve history correctly, but further source citations still fail to identify the accepted evidence precisely:

- All 19 split child records point to their child ID as an anchor in the original register, which contains only the parent IDs. Append the correct parent-register anchor or the child anchor in finding-reconciliation.md.
- S4-06 cites the architecture test for the five-ID denylist, but the actual check is `tests/unit/content/StarterHoldStage.test.ts`, `HIGHGLASS_IDS` and its test at line 152.
- S3-13 says `emit_stimulus`; the reducer case is `enqueue_npc_stimulus`. S4-14-runtime says `parseArgs`; the CLI parser is `parseQueryCliArgs`. S5-11 says `targetOffset`; the frame builder uses `activeVolume.offset` and `targetPosX/Y/Z`. The S3-18 correction should distinguish the PlaySession `requestMove` method from its coordinator `requestWaypointMove` call.
- S3-16's source points to renderer allocations, whereas the accepted claim in `raw/S3-claims-2.json` concerns the kinematic grid/sorted IDs and coordinator portal gates/per-entity maps. `KinematicsEngine.ts:574` and coordinator path/step/portal helpers support that original scope. Preserve parked/null ownership and its 100+ bodies revisit condition; do not silently turn it into renderer work.

Required correction: append supported provenance updates and retain the original events and corrective rationale. No historical review or ledger history is to be rewritten.

### T4-B-02 — independent concurrent-writer coverage

Severity: minor. Kind: tooling-test coverage. Gates: G2/G4/G6. Initial status: correction required.

The approved task explicitly requires concurrent-writer coverage. At the reviewed snapshot, `ProjectStatus.test.ts:267` tests sequential stale revisions and `:478` tests nested same-process lock contention; it does not start independent status writer processes. Its subprocess use is Git fixture setup only. These cases leave the independent-process serialization guarantee unexercised.

Required correction: use isolated temporary repositories and independent processes with a deterministic synchronization/lock barrier to prove at most one writer using the same expected revision succeeds, and the losing writer preserves the winner's bytes. Keep the live ledger outside the fixture. The existing suite otherwise covers every transition edge, state/history contradictions, evidence relocation, receipt recovery and combined listing/reconciliation consumers; those strengths do not substitute for this missing concurrency case.

Final review remains pending correction readback, the final documentation snapshot and controller verification. This initial supplement does not approve implementation or claim that full verification has passed.

## Final implementation review B at ledger revision 132

**Review B result: PASS for architecture, specification/coverage, seed fidelity and related documentation. T4-B-01 and T4-B-02 are corrected and independently checked; no actionable Review B finding remains.** This is the independent task-review result, not owner approval, full-project verification, archive approval or a replacement for Review A. The controller still owns the full verification gate and the three new code-defect verification transitions.

The reviewed snapshot contains 60 records: the exact 57 baseline records plus T4-C1, T4-C2 and T4-C3, each still in_progress at revision 2. The baseline retains 53 open, one parked and three verified records; total severities are 41 major and 19 minor. All 19 split children retain their expected parent, and the finite legacy set exactly matches the eight actual archive directories. Every baseline ID, severity, status, owner and parent matches the independent table. No additional baseline discrepancy or unsupported exclusion was found. Ledger revision 132 equals the total 132 retained history events at this pre-archive snapshot.

### T4-B-01 correction verification

All 57 [source audit records](task-4-source-audit.json) were checked independently against actual source bytes: every quoted line, recorded file digest and accepted provenance anchor matched. Every corrected provenance anchor and literal source excerpt is also present in the corresponding ledger row. The [parity record](task-4-seed-parity.json) agrees with independent readback rather than serving as its sole evidence.

The 19 child rows now explicitly cite their original parent register findings. The six named file/symbol corrections are present. S3-16 now cites the kinematic sorted-ID list, rebuilt grid, coordinator portal-gate helper and per-frame truncation call; its correction explicitly supersedes the renderer anchor while preserving parked/null ownership and the 100+ bodies revisit condition. Earlier imprecise sources and events remain preserved with corrective provenance. The source corrections are append-only update events, including an additional update after each T1-QC verified transition; none erases the actual add → in_progress → verified migration history or changes its retained verification evidence.

S4-11-guides and S4-14-guidance remain explicit document-only dispositions with live code siblings. Previously delivered safety fixes remain excluded with archive evidence. Planned camera capture, future crowds/materialization, lace panels, art/audio choices and the unmeasured GPU profile are not falsely reported delivered. Existing save tests and the narrower camera/accessibility claims remain acknowledged.

### T4-B-02 correction verification

`ProjectStatus.test.ts` now starts two independent Node processes against one isolated temporary repository. Both announce readiness before a shared release barrier, both attempt a checked add at ledger revision zero, and the assertions require exactly one success, a lock/revision failure for the loser, one final entry, revision one and final bytes matching the winner's digest. Child cleanup and Git-environment isolation are present. This closes the earlier same-process-only coverage gap.

The reviewer independently ran:

```text
npx vitest run tests/unit/tooling/ProjectStatus.test.ts -t 'serializes two independent writers starting at the same ledger revision'
```

Result: **PASS**, one selected test passed, 89 deliberately unselected tests, 394 ms Vitest duration. The reviewer did not rerun the complete suite. The retained [focused full-suite result](task-4-evidence/focused-green-final.txt) records 90 passing tests in 7.03 s; that is inspected controller/implementation evidence, not a claim of an independent full-suite run or reference-Mac timing.

### Final consumer and documentation checks

The reviewer reran the installed read-only consumers after correction. Roadmap output remains active `process-gates-and-ledger`, `next: null`, with no invented next work. Reconciliation returns `ok: true`, 60 active and zero resolved records. No live ledger mutation was performed by this reviewer.

The root and tests README/AGENTS pairs consistently document checked commands, immutable verification evidence and the archive-wrapper boundary. Package wiring covers scripts in lint. The [shared API guide](task-4-shared-api.md) remains compatible with task 5: pure validation/replay exports, shared synchronous lock, trusted internal lock bypass, movable change evidence, receipt preparation and explicit cancel/resume/repair are available; real OpenSpec selection, validation, approval and archive invocation remain wrapper work. Tests exercise the implemented consumers with temporary fixtures, and future wrapper failure/preflight scenarios are not claimed validated here. Task 6 remains responsible for its scheduled broader documentation enforcement and inherited Git-fixture correction.

Reviewed implementation identities (SHA-256):

| Asset                                       | Digest                                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| scripts/project-status.mjs                  | 7b523ffc6d440d8cf238cbdd1b82e89eff61bd924b458274538c69bb40ef4c96 |
| tests/unit/tooling/ProjectStatus.test.ts    | f7c70d43d1a4180d1f1635b5c6bc81227abd0a4f93b513b37b687b47b2ea5d8a |
| openspec/defect-ledger.yaml at revision 132 | 2511e04aedff87e6fb93ccd645b1e3f1515c2d6fca239a89cab87af8b809c2c0 |
| task-4-shared-api.md                        | d237ffe68ea7534632c767052c6c3cf1a359ab359a82de9f7854a39bedeef69e |

Subsequent supported verification transitions for T4-C1/C2/C3 will necessarily change the ledger digest/revision. They do not retroactively change the snapshot reviewed here and require the controller's retained evidence and final reconciliation.

### Closing evidence-scope readback

The subsequently supplied [fix snapshot](task-4-fix-evidence.md) and [scenario matrix](task-4-scenarios.md) preserve the reviewed source hashes, distinguish observed behavioral RED from setup failures, retain host timing limits and leave actual OpenSpec wrapper/external-store behavior explicitly to task 5. The controller reports full verification passed (format 1,630 ms, lint 2,490 ms, typecheck 765 ms, tests 8,394 ms); this reviewer inspected that retained record and did not independently rerun full verification.

One scenario-map precision correction was sent to the controller: the stale-archive-label row originally cited archived-without-directory/proposed-without-active cases, which exercise different conditions. To supply direct evidence without changing files or expanding implementation, this reviewer loaded the actual project, cloned the roadmap in memory, changed the existing archived `01-clean-scaffold-and-verify` row to `planned` and called `validateGraph` with the actual inventory. The exact result was `DRIFT: archive has stale roadmap status: 01-clean-scaffold-and-verify`. No bytes were persisted. The scenario matrix can cite this manual result for that scenario. The implementation behaved correctly; no additional code defect was inferred.
