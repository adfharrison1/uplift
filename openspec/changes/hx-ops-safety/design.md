# Design

## Context

See proposal.md for motivation and scope. The approved direction is in DESIGN_NOTES.md, Engineering rules / Bridge lock and Telemetry policy, and openspec/roadmap.yaml. Review evidence is in reviews/2026-11-08-root-and-branch/raw/S4-C.json and S4-ch2.json.

Observed call sites:

| Entry point                                                          | Present behavior                                                                                      | Observable consumer after implementation                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Vite configureServer in src/interfaces/vite/localDiskBridgePlugin.ts | Constructs the logger and consumes every API body before dispatch, without provenance or token checks | Authorized HTTP response plus file/query readback; rejected requests leave disk unchanged |
| NdjsonSessionTelemetry constructor and startNewSession               | Empty both current files using a fixed .tmp path                                                      | Previous bytes in a retained session directory; fresh records only in current query       |
| FileSaveSlotRepository saveSlot/loadSlot/listSlots/deleteSlot        | Slot destination checks exist; fixed temporary path and parent-root handling need confinement         | Safe save round trip and unchanged outside sentinel                                       |
| browserMain.ts createStageLab transport                              | Sends JSON via an unobserved fetch promise                                                            | Token-bearing request, disk readback, persistent readable save failure                    |
| package.json verify and .husky/pre-commit                            | Five serial commands; hook only runs lint-staged                                                      | Four concurrent results, equivalent serial fallback, rejected commit on failure           |

The browser game still uses in-memory telemetry and saves. This proposal does not claim to connect those adapters to disk. Stage lab is the existing browser disk consumer.

The installed CLI warns that config's operations.propose is unsupported. Proposal rules and audit instructions are applied explicitly here; fixing the configuration schema remains separate. Planning uses the CLI through nvm Node because the Homebrew launcher selects a broken runtime.

### Dependency snapshot

No upgrades. Package versions below are read from package.json; Node comes from .nvmrc. The historical config's security-patch assertions are not a fresh vulnerability attestation.

| Component                                   | Existing pin                                             |
| ------------------------------------------- | -------------------------------------------------------- |
| Node                                        | 24.22.2                                                  |
| Native TypeScript / JS AST bridge           | npm:typescript@7.0.2 / npm:@typescript/typescript6@6.0.2 |
| Vite / Vitest                               | 8.3.5 / 5.0.5                                            |
| ESLint / @eslint/js / typescript-eslint     | 10.13.0 / 10.0.1 / 8.72.1                                |
| eslint-config-prettier / minimatch override | 10.1.8 / 11.0.4                                          |
| Prettier / Husky / lint-staged              | 3.9.10 / 9.1.7 / 17.6.0                                  |
| Zod                                         | 4.6.7                                                    |
| Three / @types/three                        | 0.186.1 / 0.186.0                                        |
| @types/node                                 | 24.19.2                                                  |

OpenSpec is a globally installed tool, not a package.json dependency; the setup reports 1.14.3 while historical project prose says 1.15.0. Do not silently upgrade dependencies or copy that prose as observed fact.

## Goals / Non-Goals

**Goals:** one reusable request policy; preserved diagnostics; executable HTTP and filesystem acceptance; six independently green commits; no runtime network beyond the local bridge, new domain dependency or simulation RNG consumption.

**Non-goals:** a hostile same-user OS process, shared multi-process log writers, LAN/HTTPS deployments, crash-atomic transactions spanning several files, browser telemetry wiring or broader save-integrity work. The failure contract is preservation and fail-closed operation, not automatic recovery of every interrupted rotation.

## Decisions

### 1. Confined file operations belong in infrastructure

Add src/infrastructure/persistence/safeLocalFiles.ts and import it directly from the save repository, disk telemetry implementation and bridge. It owns synchronous directory validation, safe reads/appends, exclusive temporary-file creation and atomic replacement. It imports only Node filesystem/path facilities, never interfaces, application, content or Three.js.

The helper factory accepts a typed LocalFileOps adapter and temporary-name supplier, both defaulting to real Node operations. Save-repository and logger constructors accept these only as trusted optional dependencies, never HTTP input. Tests delegate to real temporary-directory operations while failing a selected mkdir, move, exclusive create, final rename or unlink call. A deterministic temporary-name supplier allows planting a symlink at the exact candidate and proving exclusive creation refuses it. Do not globally mock node:fs.

Validate registered roots and every application-controlled component with lstat, including dangling links, and verify realpath containment immediately before operations. Distinguish ENOENT from permission/I/O errors. A missing allowed child can be created only through previously checked ancestors. Reject linked files, directories and root replacements; re-check during operations rather than trusting a one-time startup check. Resolve trusted system aliases above the application anchor (such as macOS /tmp) once; this is not permission to follow a symlink substituted within a project storage path.

Temporary files are generated inside the checked destination directory and opened exclusively; never overwrite a predictable existing .tmp path. Use no-follow file opens where supported, check the opened file type, and clean up only temporary files owned by the operation. Read, append, compact, rotate, list and delete paths all use the same policy. Serialization/schema validation completes before replacement. Route error responses use stable messages without absolute paths.

Alternative rejected: lexical path prefix checks alone. They miss root, destination, dangling and temporary-file links. Portable lstat/realpath checks do not eliminate hostile same-user directory-swap races; that threat is explicitly outside this local dev boundary.

### 2. Rotate complete session groups without parsing old logs

Keep current filenames and the current-query API. Add a fifth, optional SessionStorageOptions argument to NdjsonSessionTelemetry, preserving the existing logsDir/sessionId/clock/budget arguments. It contains maxPreviousSessions (default 3), the trusted filesystem dependencies above, and an onDiagnostic callback. Validate maxPreviousSessions as a positive finite integer before filesystem mutation, independently of the active/compacted byte budgets. LocalDiskBridgeOptionsSchema exposes the same maxPreviousSessions field and passes it through; test a bridge configured with 1 across repeated server starts. The default diagnostic sink writes to local stderr; callback failures are contained and never turn successful retention cleanup into logger data loss.

Construction and startNewSession first validate the session ID and retention. One writer owns each configured logs root. Use logs/prev/session-<sequence>.pending for an incomplete group and logs/prev/session-<sequence> for a complete group; sequence is a zero-padded decimal safe integer ordered numerically. Both groups contain only the original current-session.jsonl and/or current-session.compacted.jsonl names. Allocate max(existing managed complete and pending sequences) + 1, reserve the pending directory exclusively, and fail without mutation on sequence exhaustion. Session IDs and clocks never become path components.

The transition order is: validate -> reserve pending group -> move existing active file -> move existing compacted file -> exclusively create fresh active file -> exclusively create fresh compacted file -> atomically rename the pending directory to its final name -> commit in-memory session ID/clock/sequence and enable writes -> prune completed groups. Skip missing old files; no old files means first startup needs no group. At each failed transition every old file remains byte-for-byte recoverable at its original path OR its pending-group path; a second copy is not required. New empty files created before a failure may remain but cannot be written by a failed instance. Pending groups are recognizable solely by the suffix and never overwritten, resumed, renamed or pruned automatically. A later initialization allocates a higher sequence, preserves every older pending group and handles whatever current files remain; manual inspection/recovery is documented.

Construction failure throws a typed storage error, so no failed object escapes; Vite setup reports it and aborts before listening. Failure during startNewSession on an existing instance throws while retaining the last committed ID/clock/counters and marking storage unavailable. record, recordBatch and compact then reject without file operations until a successful explicit startNewSession; query/getters may read the remaining current files/last committed metadata but must not claim that a new session started. An HTTP session start rejected for an unsafe path returns 400, including when the typed path error is wrapped by initialization; other I/O initialization failures return 500. Both disable subsequent telemetry mutation attempts with 503 until an authorized explicit retry succeeds. Save/visual repositories are independent. Diagnostics name relative recoverable paths and error codes locally, never token values; HTTP errors use the redacted mapping below. Inject a failure at every transition and distinguish constructor failure from explicit-start failure in tests.

Prune only managed completed groups, oldest first, after successful initialization. Leave unrelated entries, incomplete groups and symlinks untouched; report suspicious entries or cleanup errors. Cleanup failure can temporarily exceed N but must not disable the new current log. Retention is N session pairs, not N individual files.

Alternative rejected: append all runs to one current log. It changes query semantics and mixes session sequences. Alternative rejected: copy then truncate without completing preservation, which loses evidence on failure. The maximum normally retained data is the configured group count times existing per-session budgets, plus the current session; incomplete/error groups are deliberately preserved for recovery.

### 3. One guard precedes body buffering and every mutating dispatch

Keep the guard in src/interfaces/vite/localDiskBridgePlugin.ts and expose a typed middleware seam usable by the real HTTP tests. Route matching is an explicit method/path table:

| Route                                                                | Methods          |
| -------------------------------------------------------------------- | ---------------- |
| /api/telemetry/session, /api/telemetry/batch, /api/telemetry/compact | POST             |
| /api/saves                                                           | GET              |
| /api/saves/:slotId                                                   | GET, PUT, DELETE |
| /api/scene-blueprints/:stageId, /api/character-visuals/:characterId  | GET, PUT         |

The trusted route resolver owns root selection; callers never submit a file path. Keep encoded separators, traversal, malformed IDs and URL/body mismatches rejected. No future audio or pacing routes are added.

handleLocalDiskBridgeRequest remains an in-process post-validation dispatcher for existing unit tests, not an HTTP trust boundary. Document that precondition and keep it behind the guarded middleware in configureServer. It is not a pure function: it performs repository I/O. Only the middleware accepts IncomingMessage; a spy and actual-file assertions must prove that rejected network requests never reach the dispatcher. Future bridge route registration goes through that same middleware, with no second unauthenticated mount.

Build the exact two origins and two Host authorities from the actual listening dev port. The configured default is 5173 with strictPort and loopback binding; ephemeral-port tests resolve the bound address. No wildcard, suffix, forwarded-header or arbitrary-loopback-port allowance. Inspect raw header multiplicity where Node would otherwise merge or discard values. Present Origin must match exactly. Without Origin require Sec-Fetch-Site same-origin or none; that fallback never bypasses the token. Apply provenance checks to reads too; mutations additionally require one correct token and application/json with optional UTF-8 charset. A bodyless DELETE still carries that media type. Empty compact requests retain the existing default-object behavior.

Export a small createLocalBridgeAccessPolicy factory from localDiskBridgePlugin.ts. Each vite.config.ts config-factory invocation creates one policy and passes the same instance to server.cors.origin and the plugin's trusted second argument. The policy starts unbound and denies origins. configureServer binds its port from httpServer.address() on the listening event (or immediately if already listening), resets it on close/restart and refuses unsupported non-TCP/middleware-only hosts. Restart entry retires the old policy before Vite constructs a replacement and rotates storage. Requests capture their originating run and recheck it after body consumption. Concurrent restarts pass through each current run’s retirement, and failed replacement leaves the old bridge denied until a successful restart. Before binding, bridge requests fail closed with 503. Both CORS and Host/Origin checks call this same instance, so port 0 becomes the actual assigned port without rebuilding a regex or guessing 5173. Tests exercise the config's 5173 policy without reserving that port, then perform socket tests through the same factory with port 0.

That second argument is an opaque, module-branded policy created only by this factory, with fixed Host/Origin predicates and immutable public methods. It is not an arbitrary allow callback or user-supplied configuration: tests use the same factory and can vary only the bound local port. Internal port binding is controlled by the plugin lifecycle. Malicious executable same-user configuration is outside the documented threat boundary.

Generate a 256-bit token with node:crypto once per server run, outside the deterministic simulation. Inject it with transformIndexHtml into a dev-only meta element named uplift-bridge-token; never bake it into production, query strings, files or diagnostics. Keep it stable for page loads in a run and renew it on server restart. Browser and server share the X-Uplift-Bridge-Token header spelling through tests.

Set explicit server.cors in vite.config.ts using the same origin policy. Verify both full Vite behavior and the bridge's own rejection: CORS only controls browser response access and cannot block a simple POST by itself. Retain Vite's own host validation as defense in depth. A non-browser local client can read dev HTML and provide approved metadata and the token; this is a browser-origin defense, not OS-user authentication.

Set CORS methods to GET, POST, PUT, DELETE and OPTIONS, allowedHeaders to Content-Type and X-Uplift-Bridge-Token, credentials false and optionsSuccessStatus 204. Allowed preflights receive the exact approved Access-Control-Allow-Origin plus these method/header lists and Vary: Origin; foreign origins receive no allow-origin authorization. Vite installs CORS before configureServer middleware, so an allowed OPTIONS can finish there without a token or dispatch. A forwarded/unsupported OPTIONS performs no mutation. The bridge's own provenance/token guard remains mandatory for actual requests.

Preserve the JSON error field and use a stable redacted mapping: 403 / Bridge request forbidden; 415 / JSON content type required; 400 / Invalid bridge request (or Unsafe storage path for path-policy errors); 413 / Bridge payload too large; 404 / Bridge resource not found; 405 / Method not allowed; 500 / Bridge storage operation failed; 503 / Bridge storage unavailable. A Node/Vite rejection before bridge dispatch can use its own 4xx response. Never serialize caught filesystem messages or token values into bridge errors. Existing successful payload shapes remain unchanged.

Alternative rejected: CORS alone or token alone. Both leave gaps when combined with overly broad origin admission or an unguarded route. No permissive test-only bypass enters production code.

### 4. Stop rejected streams; preserve the browser save path

After header and route checks, reject oversized declared lengths before reading. Count actual Buffer bytes for chunked/undeclared bodies. On the first excess chunk, release retained buffers, settle once and destroy the request without waiting for end. Send 413 when possible; accept a closed socket as the oversized result when destruction prevents response delivery. Handle abort/error/close without duplicate responses or unhandled rejections. No handler runs until the complete bounded body is validated.

Add src/interfaces/composition/bridgeTransport.ts with injectable token lookup, fetch and a status sink. It reads the served meta token, uses relative same-origin paths, attaches JSON/token headers and rejects non-2xx responses. browserMain.ts owns a dedicated data-bridge-save-status paragraph appended to the stage panel, using textContent, role=status, aria-live=polite and aria-atomic=true. Its sink is separate from playInput's data-play-status so frame sync cannot erase errors. The transport factory returns the existing void BlueprintSaveRequest callback and catches its own async promise; StageLabOptions and stageLabPanel.ts need no contract change. An explicit save attempt replaces the prior error with Saving; success replaces it with Saved; failure retains readable text until the next attempt. Missing/stale-token text tells the developer to reload while preserving the in-memory edit. Never inject a server error as HTML or replay a failed write automatically.

The existing Save stage button is the interactive trigger. Character visuals currently expose the callable saveVisual(characterId) API without a dedicated button; preserve and test that API through the same transport without claiming or adding a wardrobe control. Tests call createStageLab.saveStage and saveVisual with the real transport, plus status-sink tests for repeated playInput.sync, failed requests and explicit retry. Local schema failures remain synchronous before transport, as they are today.

Alternative rejected: enforce server auth before connecting the existing browser consumer. Task ordering first supplies HTML and transport support, then activates enforcement, so each intermediate commit still saves successfully.

### 5. Verification tooling remains outside simulation layers

Add scripts/verify.mjs, with package.json selecting it for verify and retaining the old chain as verify:serial. Launch format:check, lint, typecheck and test concurrently; npm test already includes both test directories and excludes eval/. Invoke the current Node/npm executables without constructing shell commands from input. Collect each child's stdout/stderr separately, print one PASS/FAIL line per step, and print contiguous failure diagnostics. Reap all children before success/failure exit. Forward interruption and terminate worker descendants, not merely the immediate npm parent; test the supported POSIX/Windows process handling.

On POSIX each check owns a detached process group; termination sends SIGTERM to the negative PGID and escalates to SIGKILL after a bounded grace interval. On Windows use taskkill /PID <pid> /T, escalating with /F, and wait for close events. A subprocess fixture writes its parent/grandchild PIDs to a temporary file; interruption tests assert both are gone and teardown kills leftovers even on assertion failure. Run native behavior tests on the current OS and test the other platform's command construction through an injected process adapter; record unexecuted native-platform coverage. Add scripts/verify.mjs to the package lint command so the runner is checked too, using the existing configuration without adding a fourth task-5 tooling file.

Bound buffered output and turn overflow into a reported failure rather than losing a child's failure silently. The runner's tests use controlled short-lived fixture subprocesses; they never recursively run the whole verify command from Vitest.

The pre-commit hook runs lint-staged then verify with explicit failure propagation, without adding unrelated files to the index. Keep actual architecture/zero-any/determinism checks and root/section documentation checks. Replace only skill-prose/model-name assertions with structural metadata and presence checks; corresponding archived spec expectations are modified in this proposal.

Alternative rejected: five concurrent npm jobs retaining two Vitest launches. It repeats test-runner startup. Alternative rejected: delete validation to meet a timing target.

Record one cold and five warm runs of both commands at the same revision, hardware, cache conditions and test count; report warm median and maximum. Parallel median must not exceed serial median. The review's earlier 2.4–3.1 s versus 5.3–6.7 s is historical evidence, not a fresh benchmark. Under 5 s remains the reference-Mac target; measurements on this host must identify its actual hardware.

Store commands, raw durations, cache preparation, dependency/test counts, host/OS/Node details, summaries and native-platform coverage limits in openspec/changes/hx-ops-safety/verification.md during task 5. Task 6 checks this tracked evidence; do not invent measurements during proposal authoring.

## Verification and traceability

No WebGL, models, external services or public interfaces are needed. Every filesystem test uses isolated temporary roots, includes outside sentinel files where relevant, and cleans up. HTTP tests bind only 127.0.0.1:0 and close connections/server in finally hooks. Snapshot expected logs after legitimate server-start rotation before testing request rejection.

| Scenario group                                                           | Test destination                                                                 | Observable end                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Save round trip, unsafe roots/files/temp paths                           | tests/unit/infrastructure/FileSaveSlotRepository.test.ts; SafeLocalFiles.test.ts | loaded payload or unchanged outside sentinel                  |
| Startup, retention N, repeated IDs, partial files, injected I/O failures | tests/unit/infrastructure/NdjsonSessionTelemetry.test.ts                         | archived bytes/current query; failed instance cannot append   |
| Route and schema behavior                                                | tests/unit/interfaces/LocalDiskBridge.test.ts; SceneBlueprintDiskBridge.test.ts  | response plus storage contents                                |
| Origin/Host/token/media type, body cap, abort, CORS                      | tests/unit/interfaces/LocalDiskBridgeHttp.test.ts                                | actual HTTP response/socket termination plus unchanged files  |
| HTML token -> browser request -> disk -> GET                             | tests/unit/interfaces/BridgeTransport.test.ts; LocalDiskBridgeHttp.test.ts       | submitted stage/character value survives readback             |
| Save failure reporting                                                   | tests/unit/interfaces/BridgeTransport.test.ts and existing composition tests     | stable readable status, retained edit, no unhandled rejection |
| Concurrent start, output, failure, signals, hook short circuit           | tests/unit/tooling/VerifyRunner.test.ts                                          | subprocess exits, results and descendants                     |
| Skill structure without prose pins                                       | tests/architecture/layer_boundaries.test.ts                                      | wording change accepted; missing/invalid skill rejected       |

Use the actual Vite plugin on an ephemeral local HTTP server, including transformIndexHtml and middleware routing. Use the served token in both valid and rejected-header cases. The browser helper can use injected fetch in Node against that same server; spy-only header tests are insufficient. Retain unit handlers for schema coverage, but do not use them as evidence for middleware security.

Node fetch does not supply browser Origin/Fetch Metadata. Raw HTTP cases explicitly set Host/Origin/Sec-Fetch-Site as needed. For the production browser transport's injected fetch, a test adapter adds only browser-owned provenance fields for the served origin; the production helper must supply the token and media type itself. Use raw node:http requests for duplicate headers and unterminated/aborted streams. Never relax production checks for the harness.

A table-driven matrix covers both loopback aliases, wrong ports/hosts, null/missing/duplicate Origin, missing and wrong fetch metadata, missing/wrong/stale tokens, all mutation methods, unsupported media types, exact byte limit, multibyte overflow, chunked no-end overflow, client abort, root/parent/file/temp links and missing safe roots. Include an authenticated session start followed by a telemetry batch and actual current-log query, plus compaction and save deletion.

## Documentation and delivery

Update README.md and AGENTS.md for infrastructure with tasks 1–2, interfaces with tasks 2–4, and tests with each new testing capability. Update root README.md scripts and root AGENTS.md Quick Verify when task 5 ships parallel verification (A-54). Final task checks coherence and updates only the shipped portions of DESIGN_NOTES status/index/dispositions; the wider section stays partial because later hardening remains planned. No planned behavior goes into AGENTS.md and no change IDs go outside the allowed documentation paths.

Each task is one green commit with at most three source/tooling files plus tests and associated docs. Three proposal reviewers, two reviewers per implementation task and six reviewers after delivery remain mandatory. Reviewer briefs say "high reasoning, medium-to-high model". Stop for owner review after the proposal audit; no implementation is authorized by proposing.

## Risks / Trade-offs

- Filesystem races from another same-user process -> documented threat boundary, synchronous validation/operations, exclusive temporary files and no-follow opens; no false claim of OS isolation.
- Multiple server processes sharing logs -> unsupported single-writer invariant; use distinct configured roots.
- Rotation can fail after moving one file -> incomplete groups preserve all bytes, writes fail closed, no pruning, recovery diagnostic.
- Retention increases disk use -> configurable positive N, bounded completed groups; preserve evidence on cleanup failure.
- Auth invalidates existing tabs/scripts -> current token in dev HTML, readable reload instruction, no background retry.
- Concurrent checks compete for CPU/RAM -> measured parallel/serial comparison, bounded output and serial fallback; no unmeasured frame-loop changes.
- Loopback tests may need sandbox permission -> use the actual local socket suite with its required permission; do not skip it or replace it with mocks.

## Migration Plan

1. Land confined storage and non-destructive rotation, then migrate visual file operations.
2. Ship dev-token injection and browser transport together before enabling mandatory guard checks.
3. Enable guard/CORS and run the full HTTP matrix; current sessions/asset schemas need no data migration.
4. Switch verification and hook, record timings, complete documentation and review.
5. Never roll back to destructive logger startup against retained user logs. If reverting code is required, preserve logs separately first. Archived groups remain ordinary NDJSON files; the previous-session data is not fed into current queries.
