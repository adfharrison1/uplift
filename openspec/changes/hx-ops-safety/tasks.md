# Tasks

Six tasks, each one verified Conventional Commit. Source/tooling caps below exclude tests and the documentation that ships with that task. Work stays in infrastructure, interfaces and repository tooling; no domain/application changes are needed. All runtime and tests remain offline except temporary loopback HTTP.

For every task: run its Verify command and npm run verify; obtain two independent reviewers (correctness/edge cases/performance and architecture/spec/types/tests), verify findings, fix them, rerun verification and inspect the staged diff. Briefs say "high reasoning, medium-to-high model". Pause for owner review before committing. Mark a task complete only after its approved commit. Never push without an explicit request.

## 1. Preserve diagnostics and confine infrastructure storage

- [x] 1.1 Add shared safe local filesystem operations; migrate save read/write/list/delete and telemetry read/append/compact paths; replace destructive logger initialization with bounded previous-session rotation and fail-closed partial-failure handling. Verify: npm exec vitest run tests/unit/infrastructure/ followed by npm run verify. Commit: fix(storage): preserve session logs and confine local file operations.

  Source files (3): new src/infrastructure/persistence/safeLocalFiles.ts, src/infrastructure/persistence/FileSaveSlotRepository.ts, src/infrastructure/telemetry/NdjsonSessionTelemetry.ts.

  Tests: SafeLocalFiles.test.ts (new), existing save repository tests and NdjsonSessionTelemetry.test.ts. Use the typed filesystem adapter and deterministic temporary-name seam. Cover root/parent/file/dangling/temp links, exclusive temp collision, safe absent roots, round trips, constructor and explicit startup, N retention, duplicate clock/session IDs, malformed/partial files, a failure at every rotation transition, prune errors and current-query isolation. Distinguish constructor throws from existing-instance failure; prove record/batch/compact reject while unavailable and later initialization preserves all pending groups. Preserve compaction/cap assertions.

  Docs in this commit: src/infrastructure/README.md and AGENTS.md; tests/README.md and AGENTS.md. Describe default retention three and the single-writer/recoverable-incomplete-group boundary. No new exports through a barrel are needed.

## 2. Confine existing visual asset routes

- [x] 2.1 Move stage and character reads/atomic writes onto the shared filesystem helper and preserve URL/schema/size behavior. Verify: npm exec vitest run tests/unit/interfaces/LocalDiskBridge.test.ts tests/unit/interfaces/SceneBlueprintDiskBridge.test.ts followed by npm run verify. Commit: fix(bridge): confine visual asset file operations.

  Source files (1): src/interfaces/vite/localDiskBridgePlugin.ts.

  Tests: existing LocalDiskBridge.test.ts and SceneBlueprintDiskBridge.test.ts; unsafe roots, parents, destination and temporary links, GET confinement, safe directory creation, missing assets, malformed JSON, mismatched IDs and disk readback. This step does not enforce token headers yet.

  Docs in this commit: src/interfaces/README.md and AGENTS.md, and relevant test guidance.

## 3. Supply dev tokens through the real browser save transport

- [ ] 3.1 Generate a per-run token, inject it into dev HTML and route existing stage-lab fetches through a shared token-bearing transport with readable, retained failure status. Verify: npm exec vitest run tests/unit/interfaces/ followed by npm run build and npm run verify. Commit: feat(bridge): authenticate browser save requests with a dev token.

  Source files (3): src/interfaces/vite/localDiskBridgePlugin.ts; new src/interfaces/composition/bridgeTransport.ts; src/interfaces/composition/browserMain.ts.

  Tests: BridgeTransport.test.ts (new) and existing PlayInput.test.ts for synchronization. Test the browserMain-owned dedicated status sink, the unchanged void transport callback, createStageLab.saveStage and callable saveVisual. Cover HTML token lookup, stable/new-run tokens, no production token, missing token, HTTP/network errors, retained edits, live-region attributes, frame sync and explicit retry/success. No character-save button is added. Server enforcement waits for task 4; valid page saves work at this intermediate commit.

  Docs in this commit: src/interfaces/README.md and AGENTS.md; relevant tests docs. Campaign SaveSlotRepository persistence and browser telemetry wiring remain outside this task; stage/character lab writes are its explicit scope.

## 4. Enforce the HTTP boundary and prove end-to-end behavior

- [ ] 4.1 Add the shared guard ahead of body buffering/dispatch, explicit route/method matching, exact loopback provenance and CORS, token/media-type checks, prompt oversized-stream destruction and abort handling; thread configured retention to the logger. Verify: npm exec vitest run tests/unit/interfaces/ followed by npm run build and npm run verify. Commit: fix(bridge): reject unauthorized and oversized HTTP writes.

  Source files (2): src/interfaces/vite/localDiskBridgePlugin.ts and vite.config.ts.

  Tests: LocalDiskBridgeHttp.test.ts (new) mounts the actual Vite plugin on 127.0.0.1:0 with isolated storage and closes all sockets. Fetch served HTML, use its token through the browser helper, PUT stage/character assets and GET/read their contents. Set browser-owned provenance explicitly in the Node adapter; never synthesize the token there. Exercise authenticated telemetry session/batch/compact and save PUT/GET/list/DELETE, retention override 1, failed initialization/503/retry, no-end chunked overflow and the complete design.md matrix. Assert rejection happens before dispatcher invocation and disk mutation. Test positive/negative preflight and the shared bound-port policy separately, including the normal 5173 config without binding a fixed port. Snapshot storage after legitimate startup rotation.

  Docs in this commit: src/interfaces/README.md and AGENTS.md; tests/README.md and AGENTS.md, including client metadata, failure codes, token reload and local-socket test needs.

## 5. Parallelize verification and strengthen the commit gate

- [ ] 5.1 Add the concurrent verification runner and serial fallback, enforce full verification after lint-staged, and replace only skill prose/model-name assertions with structural checks. Verify: npm exec vitest run tests/unit/tooling/VerifyRunner.test.ts tests/architecture/ followed by npm run verify and npm run verify:serial. Commit: build(verify): run checks concurrently and enforce the commit gate.

  Source/tooling files (3): new scripts/verify.mjs, package.json and .husky/pre-commit.

  Tests: VerifyRunner.test.ts (new) uses controlled subprocesses for concurrent launch, single summary per step, buffered output, success/nonzero/spawn failure, output overflow, interruption/descendant cleanup and hook sequencing/failure propagation. Never invoke verify recursively from Vitest. Update tests/architecture/layer_boundaries.test.ts to retain required skills, valid frontmatter, no .cursor/skills, documentation presence/links and every substantive architecture assertion. Headings and model names cease being test contracts.

  Docs in this commit: root README.md script table and hook description; root AGENTS.md Quick Verify; tests/README.md and AGENTS.md. Write openspec/changes/hx-ops-safety/verification.md with cold plus five matched warm parallel/serial timings, raw durations, median/maximum, commands, host/OS/Node/dependency/cache/test count, reference-machine caveat and native-platform coverage limits. Include the runner in lint and test a real grandchild's termination using the platform strategy in design.md.

## 6. Reconcile delivery evidence and complete cross-cutting review

- [ ] 6.1 Check all scenario-to-test mappings, actual consumer traces, measured timings and shipped documentation; run the six-dimension post-change review, resolve verified findings and record the result. Verify: npm run verify, npm run verify:serial and openspec validate hx-ops-safety --strict. Commit: docs(operations): record verified storage and quality-gate contracts.

  Source/tooling files (0): this is integration and documentation reconciliation, not delayed feature work. Review adversarial/security/failure containment, architecture/specs/docs, performance, testing, logic and design coherence. All six reviewers use "high reasoning, medium-to-high model"; schedule within available concurrency without dropping any review.

  Docs: confirm root and affected section README.md/AGENTS.md describe what tasks 1–5 shipped; correct only remaining inconsistencies. Check verification.md against the required measurements and scenario coverage. Update the shipped bridge/rotation portions of DESIGN_NOTES.md and relevant status-index/Where-facts-live/dispositions rows. Keep roadmap status proposed while the change is active and add a delivered-awaiting-archive note only after delivery checks; archive state remains derived from openspec/changes/. Other engineering and telemetry work stays planned. Preserve exact owner wording and use independent fidelity/coherence checks for derived documentation.

  Verified code fixes belong in additional atomic fix commits with their tests and normal two-reviewer gate; do not hide a source fix inside this documentation commit. Repeat the affected review after each fix.

## Workflow follow-up

- The proposal's three-agent audit and strict validation happen before implementation. User approval of the reviewed artifacts is required before apply.
- After all tasks and delivery reviews are complete, archive only when requested, following the archive workflow and retaining review/verification evidence.
- The unrelated talk-cost owner decision remains open until before the watch-clock proposal; it does not block this work.
