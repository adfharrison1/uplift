# Task 5.1 evidence — bridge suite and save sidecar

Status: implemented and independently reviewed in the default checkout; awaiting owner approval before commit. Task 5.1 remains unchecked. Task 4.1's checkbox is post-commit bookkeeping for `4706538` and is carried in this pending diff. No production file changed.

## Scope and observed checks

- The 1,258-line `LocalDiskBridgeHttp.test.ts` became `authorization.test.ts`, `storage.test.ts`, `lifecycle.test.ts` and a shared test-only `harness.ts`. The harness retains ephemeral loopback Vite startup, served-token acquisition, request helpers, dispatch spy, storage snapshots and per-test server/directory cleanup. `trackServer` retains cleanup of replacement Vite generations. Synthetic stage requests use `makeStageBlueprint`; the proving-pack browser transport path remains in the storage suite.
- A coordinator-produced save with a registered version-3 slice travels through authorized HTTP PUT/GET, real `saves/slice_http.json` readback and a `FileSaveSlotRepository`/coordinator load. The test asserts the raw custom value and separate `__upliftCustomSliceVersions` sidecar after HTTP and disk, then the loaded value and version.
- Before refactor, `npx vitest run tests/unit/interfaces/LocalDiskBridgeHttp.test.ts` passed **37/37** in 1.22 s. After the split and new consumer test, `npx vitest run tests/unit/interfaces/LocalDiskBridgeHttp` passed **38/38** across three files in 980 ms. All 24 original declarations and their 37 expanded cases remain; original `expect(` calls **151 → 151**, plus **six** in the new test, for **157** total. The moved Vite config fixture initially failed four restart cases due to its relative path; correction restored all 37 original cases before adding the new one.
- Socket-enabled `npm run verify` after the wording correction and evidence creation passed format 1,244 ms, lint 2,575 ms, typecheck 631 ms and tests 16,301 ms. `npm run defects -- reconcile --check` passed with 51 active and 25 resolved; strict OpenSpec validation passed; `git diff --check` passed.

## G1–G6

| Gate | Evidence and limit |
| --- | --- |
| G1 Consumer trace | `SimulationCoordinator.dispatchEffects` → `saveToSlot` sidecar producer → real loopback Vite bridge PUT → `FileSaveSlotRepository` bytes → HTTP GET and direct JSON readback → new coordinator `loadFromSlot` → slice value/version. The existing proving-pack `createStageLab`/browser transport → HTTP → stage/visual disk and GET path remains. |
| G2 Trust boundary | Authorization suite retains exact Host/Origin/token/media-type checks, duplicate-header rejection, CORS, route/method/ID allowlists and pre-dispatch storage snapshots. Storage suite retains linked path confinement and redacted error results. The new sidecar request uses the served token through the real bridge. |
| G3 Hot-path cost | Test-only refactor changes no runtime path. Target suite measured 1.22 s before and 980 ms after locally, below the under-three-second reference target on this host; no 2019 Intel reference-Mac measurement or 60 FPS claim is made. The new save test runs outside frame stepping. |
| G4 Failure containment | Original streamed overflow, aborted body, failed initialization/503/retry, symlink, retired in-flight request and restart tests remain with unchanged storage/dispatch assertions. The harness closes servers and removes isolated roots after each test, including failure. |
| G5 Defect reconciliation | Independent finding `T5.1-R1` was verified and fixed; its disposition is in [task-5-1-reviews.md](task-5-1-reviews.md). The checked defect ledger reconciles. The five slice-store-owned records remain active pending the closing evidence task; this test-only task makes no premature defect transition. |
| G6 Scenario traceability | The new storage test names the real HTTP/disk sidecar scenario and asserts every consumer boundary. The original 24 test blocks, 37 expanded cases and 151 assertions were inventoried before/after. Three split suites retain authorization, storage and lifecycle rejection/restart/failure behavior; Task 4.1's coordinator suite retains migration and rollback cases. |

## Document integrity

The Engineering status-index row remains partial and adds shipped slice storage/test builders without removing later roadmap owners. The Tests/builders paragraph keeps the “each test ships with the fix” rule, builder names, HTTP security/persistence provenance, future RNG/cap/mid-hop/dt acceptance and later `tests/`/`golden/`/`eval/` split. The Seven primitives paragraph keeps Tier 3 empty, Tier 2 on demand and epoch-end scar compaction. It now limits the shipped performance claim to the append path, keeps full-read/snapshot/update scaling and assigns future watch batching and large-slice sizing to the Act and Observation owners.

`tests/README.md` and `tests/AGENTS.md` point to the split suites and shared harness while preserving the existing HTTP testing rules. Word counts before → after: `DESIGN_NOTES.md` 17,318 → 17,361; test README 1,253 → 1,290; test AGENTS 1,463 → 1,516. The larger design-notes baseline is accepted. Where-facts-live ownership, roadmap order, dispositions, inbox text, owner exemplars and historical review files are unchanged. Both independent reviewers checked the no-loss map, links, status and untouched sections; the one wording finding was corrected and independently rechecked.
