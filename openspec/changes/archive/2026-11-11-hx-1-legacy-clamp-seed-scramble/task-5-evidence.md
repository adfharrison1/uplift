# Task 5.1 closing evidence — legacy clamp and seed scramble

Status: six independent delivery rechecks, scenario trace, checked ledger transitions and two independent task-artifact reviews completed; awaiting owner approval before commit. The Task 4.5 checkbox records commit `84b61c5`. No source, test, shipped-guide or design content changes in this task.

## Verification and scope

- Four focused files (`SeededRandom`, `CivilizationLegacyState`, `SimulationCoordinator`, architecture boundaries) passed 45/45 in 177 ms Vitest on this host. Three focused runtime suites also passed 37/37 in the adversarial and logic rechecks.
- Strict OpenSpec validation passed: `Change 'hx-1-legacy-clamp-seed-scramble' is valid`.
- `npm run verify` passed after ledger transitions: format 1,163 ms, lint 1,431 ms, typecheck 680 ms, tests 16,206 ms; command wall time 16.31 s with loopback access. The 2019 reference Mac's under-five-second verification target, under-three-second suite target and 60 FPS frame timing remain unmeasured.
- `npm run defects -- reconcile --check` passed with 54 active and 22 resolved. `npm run roadmap:next -- --json` reports this change active, no next or blocked item. `git diff --check` passed. Only this change's checklist, compact closing reports/manifest and the checked ledger change belong to this task.
- A temporary `src/domain/__hx1_date_now_probe.ts` containing `Date.now()` made the actual `npm run test:arch` fail (exit 1) and report that path. The probe was removed in `finally`; the clean architecture suite then passed 25/25. No probe file or routine command log is tracked.

## G1–G6

| Gate | Result and limit |
| --- | --- |
| G1 Consumer trace | Verified: fresh numeric seed → `SeededRandom` mixer → coordinator RNG → `saveToSlot` raw word → `loadFromSlot`/`fromState` → matching next draw. Legacy mutations → pure ordered runtime resolver → coordinator startup/load → initial world entity or resolved blueprint, retained notes and queryable `SessionTelemetryPort` records. Browser-to-disk logging is outside this change. |
| G2 Trust boundary | Verified for inputs: finite-integer seed and serialized-word validation; legacy schema plus conflict, unknown-target, interval and non-finite-step rejection. `sourceScarId` membership remains owned by `05b-1-watch-clock-and-time-spend`. |
| G3 Hot-path cost | Mixer runs once per fresh generator. Legacy resolution and one attempted write per clamp note run at startup/load, outside frame stepping. Host command timings are above; reference-hardware runtime cost is unverified. |
| G4 Failure containment | Invalid legacy load leaves prior world/RNG/legacy/characters/notes intact. Warning-write failures retain saturated results and notes and do not stop later warnings; required `load_slot` failure occurs before publication and retry succeeds. Injected ports throw before append; post-append throws were not separately tested. |
| G5 Defect reconciliation | The three owned entries are `verified` at entry revision 4, each with retained fix, passing test and independent review references. The ledger is at revision 190. `S3-14-accumulation` and `S3-14-source` remain `open` with their later owners. New `HX1-NEXTINT-01` is `parked` with owner `cm-act-envelope-and-rolls` and a revisit condition before gameplay use or RNG stream-semantic change. The Task 1 review's narrow `nextInt(2^32)` correctness claim is superseded by the closing logic proof; seed-mixer acceptance stands. |
| G6 Scenario traceability | All 16 delta scenarios have named real assertions below. The ambient-randomness guard scans current files and synthetic violations; a controlled `Date.now()` source-file probe caused actual `npm run test:arch` failure and was removed. No manual gameplay or reference-Mac claim is made. |

## Scenario-to-test trace

| Delta scenario | Verified test consumer |
| --- | --- |
| Legacy successor by lineage | `CivilizationLegacyState.test.ts:166`: ordered mutations and untouched unrelated blueprint. |
| Override and authoring bound rejection | `CivilizationLegacyState.test.ts:232`: conflict, high/low strict rejection and unchanged inputs. |
| High startup saturation | `SimulationCoordinator.test.ts:549`: initial entity, resolved blueprint, notes and telemetry query. |
| Low load saturation | `SimulationCoordinator.test.ts:591`: saved entity retained, restored epoch/tick, resolved blueprint, warning and RNG continuation. |
| In-range and no note | `CivilizationLegacyState.test.ts:542`; `SimulationCoordinator.test.ts:672,709`: boundary/later clamp and cleared notes. |
| Invalid mutation containment | `CivilizationLegacyState.test.ts:575,619`; `SimulationCoordinator.test.ts:741`: rejected inputs and unchanged prior load state. |
| Frozen inputs | `CivilizationLegacyState.test.ts:485`: two same-sign adds, frozen nested data and ordered notes. |
| Warning storage failure | `SimulationCoordinator.test.ts:865`: first/later failures, retained notes and completed load. |
| Required load record failure | `SimulationCoordinator.test.ts:911`: prior fields preserved and retry succeeds. |
| Reproducible sequence | `SeededRandom.test.ts:45`: 100 matched mixed calls and final state. |
| Raw state restoration | `SeededRandom.test.ts:39,81`: direct state and mid-stream continuation. |
| Ambient randomness ban | `layer_boundaries.test.ts:276,336`: current-file scan and synthetic violations; controlled temporary `Date.now()` source file made `npm run test:arch` fail, then clean suite passed 25/25. |
| Fresh golden vectors | `SeededRandom.test.ts:5`: exact states and 16 repeated draws per seed `0`, `1`, `2`, `42`. |
| Seed normalization/rejection | `SeededRandom.test.ts:22,114`: wrapped/negative and invalid seeds. |
| Mixed-zero fallback | `SeededRandom.test.ts:28`: specified fallback and deterministic nonzero-state draws. |
| Coordinator save/load stream | `SimulationCoordinator.test.ts:420,591`: saved raw RNG continuation through slot load. |

## Finding and ownership binding

| Finding | Status | Fix and retained evidence |
| --- | --- | --- |
| `S3-08-seed` | verified | Mixer `4ce6794`, coordinator consumer `444f7aa`, repeated pinned draws `be9a95b`; task 1/3/4.2 reports and independent reviews are bound in the checked ledger. |
| `S3-14-clamp` | verified | Pure resolver `125b96f`, coordinator `444f7aa`, restored-epoch test `4aaa3e9`; task 2/3/4.1 reports and independent reviews are bound. |
| `S3-17-clamp-rng` | verified | Frozen-input resolver `125b96f`, seed mixer `4ce6794`, repeated draws `be9a95b`; task 1/2/4.2 reports and independent reviews are bound. |
| `S3-14-accumulation` / `S3-14-source` | open | Existing owners `10-registry-swap-and-legacy` / `05b-1-watch-clock-and-time-spend`; no status or ownership mutation. |
| `HX1-NEXTINT-01` | parked | Pre-existing unreachable-zero `nextInt(2^32)` result. Owner `cm-act-envelope-and-rolls`; revisit before it introduces a gameplay caller of `nextInt`/`choose` or changes RNG stream semantics. No draw change in this delivery. Its ledger history includes an active-change review source path that will relocate at archive; the stable `SeededRandom.ts` source anchor remains, and the review can be found through the archive receipt. |

The closing findings `CLOSE-G6-01`, `CLOSE-G6-02`, `CLOSE-DOC-01`, `CLOSE-DOC-02` and `CLOSE-DOC-03` were fixed in Tasks 4.1–4.5 and independently rechecked. `CLOSE-PROC-01` was resolved by excluding preliminary second-wave reports and obtaining context-free replacements. The final six judgments and their individual limits are retained in `task-5-reviews.md`; `final-reviews.yaml` binds their immutable digest for archive preflight. Documentation integrity: this task adds only OpenSpec evidence and status history, with no owner design text, status-index row, roadmap row, disposition or inbox change.
