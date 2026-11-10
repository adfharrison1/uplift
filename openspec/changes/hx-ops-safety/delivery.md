# Delivery review

Tasks 1–5 are committed. The owner approved the final bridge corrections and task-6 documentation. The bridge fix is committed; this delivery record completes task 6. Archiving is authorized as the next separate commit; nothing has been pushed.

## Commit inventory

| Delivery | Commit |
| --- | --- |
| Default-worktree preference | `5c3021c` |
| Proposal and audited artifacts | `7d725b9` |
| Confined storage and preserved sessions | `63a965e` |
| Confined visual routes | `fa64f1d` |
| Dev token and browser transport | `034c35a` |
| Guarded HTTP boundary | `908bb13` |
| Concurrent checks and commit gate | `5e9e986` |
| Final bridge lifecycle/error corrections | `255f4dd` |
| Delivery reconciliation | This documentation commit (owner approved) |

## Observable consumer traces

- **Lab save:** served dev HTML → token lookup → existing `createStageLab.saveStage` / callable `saveVisual` → `createBridgeSaveTransport` → guarded HTTP middleware → validated confined atomic replacement → HTTP GET and disk readback. `PlayInput.test.ts` separately verifies the actual status sink survives frame updates. There is still no character-save button or runtime JSON pack loader.
- **Telemetry:** authenticated HTTP batch → disk logger → `executeLogQuery` active/compacted records. Startup and explicit session initialization move old bytes into numbered groups; real Vite restart tests inspect archives and prove current queries start empty. Browser gameplay telemetry remains in memory.
- **Saves:** authenticated HTTP PUT → schema/ID checks → file repository → GET/list/delete. Repository tests verify RNG/slice/legacy payloads and corrupt-slot isolation. Browser gameplay save storage remains in memory.
- **Quality gate:** `npm run verify` → four concurrent child checks → buffered per-check result → aggregate exit. Actual temporary-repository commits exercise `.husky/pre-commit` → lint-staged → full verification → accepted/rejected commit.

## Scenario-to-evidence matrix

Every one of the 52 scenario titles in the four delta specs appears once below. The evidence column names executable assertions or the manual measurement/documentation review; it does not treat a direct dispatcher call as HTTP authorization proof.

Test aliases (all paths relative to the repository root):

| Alias | File |
| --- | --- |
| FS | `tests/unit/infrastructure/FileSaveSlotRepository.test.ts` |
| Safe | `tests/unit/infrastructure/SafeLocalFiles.test.ts` |
| ND | `tests/unit/infrastructure/NdjsonSessionTelemetry.test.ts` |
| HTTP | `tests/unit/interfaces/LocalDiskBridgeHttp.test.ts` |
| Visual | `tests/unit/interfaces/SceneBlueprintDiskBridge.test.ts` |
| Transport | `tests/unit/interfaces/BridgeTransport.test.ts` |
| Play | `tests/unit/interfaces/PlayInput.test.ts` |
| Query | `tests/unit/interfaces/QueryLogsCli.test.ts` |
| Runner | `tests/unit/tooling/VerifyRunner.test.ts` |
| Arch | `tests/architecture/layer_boundaries.test.ts` |

### clean-architecture-and-quality-gate

| Scenario | Evidence |
| --- | --- |
| Post-task verification pass | Runner: concurrent-start rendezvous and one summary per step; real full verification in verification.md. |
| A failing child still gives a complete diagnostic result | Runner: failed exit, asynchronous/synchronous spawn errors, bounded stdout/stderr and completion of other checks. |
| Interrupted verification leaves no workers running | Runner: SIGINT/SIGTERM fixtures observe parent and grandchild exit, including early/resistant parents; Windows adapter checks command construction. |
| Serial fallback runs the same checks | package.json preserves the original serial chain; both strategies pass the same architecture/unit assertions in verification.md. |
| Pre-commit hook runs lint-staged on staged files | Runner: actual temporary Git repositories execute the hook with controlled npm/npx commands and preserve unrelated unstaged files. |
| Full verification failure blocks a commit | Runner: verification-failure hook fixture rejects the actual commit. |
| Failed staged checks stop the hook | Runner: staged-check failure short-circuits verification and rejects the commit. |
| Comparable timings accompany delivery | verification.md: cold and five alternating warm pairs, host/dependency/cache details, raw timings and limitations. |
| Wording edits do not invalidate a structurally valid skill | Arch: YAML metadata fixtures accept changed headings/prose, folded descriptions and comments. |
| Missing or misplaced guidance is still rejected | Arch: required skill files, metadata/body validation, forbidden .cursor/skills and section documentation assertions remain enforced. |

### multi-session-saves-and-debug-skill

| Scenario | Evidence |
| --- | --- |
| Save and load round-trip across multiple named sessions | FS: saves/lists/loads/deletes named sessions and checks RNG, slices and legacy round trips. |
| Corrupted save slot isolation and path-traversal rejection | FS: malformed files, traversal, invalid RNG and missing slots remain isolated. |
| Symlinked save paths cannot redirect storage | FS + Safe: root/parent/destination/dangling/temporary links, reads/deletes/listing and outside sentinels. |
| Valid and invalid HTTP bridge requests | HTTP: authenticated telemetry/save operations with readback; route/schema/media/body rejection with unchanged snapshots. |
| Known and unknown methods have no accidental write route | HTTP: every mutation method needs authorization; explicit method/path/ID allowlist rejects unsupported routes before dispatch. |
| Querying session logs by actor, level, and AI reasoning | Query: flags and chronological active/compacted filtering without mutation; HTTP: persisted telemetry read by executeLogQuery. |
| Debug agent skill presence in .agents/skills and trace-and-fix workflow | Arch: required file/frontmatter/instructions/location. Manual review checks schema, query flags, compaction and save-inspection guidance; stale runtime-wiring and unconditional preservation claims are recorded under limits for process-gates-and-ledger. |
| Allowed origins and ports | HTTP: exact localhost and 127.0.0.1 aliases on the bound port; normal-config policy fixture exercises 5173 without reserving it. |
| Foreign or malformed provenance is rejected | HTTP: foreign/malformed Origin and Host, duplicate raw headers, wrong ports and forwarded metadata rejected before dispatch. |
| Absent Origin has a narrow fallback | HTTP: absent Origin admits only same-origin/none fetch metadata; missing, cross-site and malformed cases rejected. |
| Simple POST cannot start a session | HTTP: foreign simple POST cannot dispatch or rotate logs; complete storage snapshot unchanged. |
| Browser obtains a token scoped to one server run | Transport: stable dev HTML token, restart renewal, production absence; HTTP: token obtained from served HTML. |
| Old, missing and incorrect tokens cannot mutate disk | HTTP: missing/wrong/stale tokens cannot mutate; Transport: missing/403 gives reload guidance and retains edits. |
| JSON media type is required even for bodyless mutations | HTTP: media-type matrix and authorization on DELETE as well as POST/PUT. |
| Declared and chunked oversized bodies terminate early | HTTP: declared oversized and chunked never-ended bodies terminate promptly without dispatch. |
| The cap counts bytes and admits the exact boundary | HTTP: exact byte boundary succeeds; multibyte overflow fails. |
| Interrupted body leaves storage untouched | HTTP: server-observed partial-body abort leaves storage unchanged; restart regression rejects a retired request before new-session dispatch. |
| Approved preflights permit the guarded methods and headers | HTTP: actual preflight checks origin, methods, headers and 204; actual writes still require the guard. |
| Actual listening port is shared by CORS and provenance checks | HTTP: ephemeral bound port, normal 5173 config, unbound/closed denial, restart token and port lifecycle. |
| Foreign preflight cannot grant browser write access | HTTP: foreign preflight has no allow-origin authorization and no dispatch. |
| All storage families reject symlink redirection | HTTP + Safe + ND + Visual: root/parent/file/temp links across storage families; session-start links map to redacted 400, then unavailable writes. |
| Missing allowed directories can be created safely | Safe + Visual: safe absent roots/parents created; HTTP: actual browser saves create and read registered files. |
| Failed session initialization permits explicit recovery | HTTP: injected I/O start failure gives 500, batch/compact 503, explicit retry recovers; unsafe-path start cases retain 400 and the same recovery rule. |
| Filesystem exceptions are redacted | HTTP + Visual: injected filesystem errors and links return stable redacted bodies with outside sentinels unchanged. |

### session-telemetry-and-compaction

| Scenario | Evidence |
| --- | --- |
| Previous session logs purged on new session initialization | ND: archives previous active/compacted bytes on startNewSession. The legacy scenario title is retained for MODIFIED matching; its assertions require preservation, not deletion. |
| Rolling compaction collapses routine info events while preserving critical records | ND: compacts routine info while retaining critical records and reasoning; existing cap/priority tests remain. |
| First startup and partially populated previous logs | ND: table covers no old files, either file alone, both, empty and truncated bytes without parsing losses. |
| Retention removes only the oldest completed session groups | ND: configured/default retention keeps newest complete groups; pending/unrelated/linked groups remain untouched. |
| Repeated clock values or session IDs do not collide | ND: repeated session IDs and fixed clock still allocate distinct monotonic groups and reset sequence. |
| Rotation failure preserves evidence and prevents mixed sessions | ND: constructor and explicit-start injection at all seven transitions proves byte preservation and unavailable writes after failure. |
| Later initialization preserves incomplete archives | ND: transition-failure recovery preserves earlier pending groups while successful retry creates a newer group. |
| Bridge retention configuration reaches the logger | HTTP: retention one through repeated fresh starts and three actual Vite restarts, with exact archived bytes. |
| Retention failure does not sacrifice current diagnostics | ND: pruning/diagnostic callback failures keep current logging usable; partially pruned groups retry safely. |
| Invalid retention configuration cannot destroy files | ND + HTTP: invalid retention rejected before storage mutation/server construction. |
| Current-session query and archive inspection remain distinct | ND + Query + HTTP: current queries exclude archives, including after actual restart; archived bytes inspected separately. |

### stage-inspector-lab-and-dom-mirror

| Scenario | Evidence |
| --- | --- |
| Saving and loading valid stage blueprints and character visuals via the Local Disk Bridge | HTTP: served page token → real createStageLab saveStage/saveVisual transport → persisted files → GET. Visual preserves direct route round trips. |
| Rejecting path traversal, missing assets, oversized bodies, and invalid schemas on blueprint routes | Visual + HTTP: traversal, missing assets, size, schema, ID mismatch and malformed JSON with unchanged files. |
| Linked visual asset paths cannot escape their registered directories | Visual + HTTP: root/parent/destination/dangling/temp links rejected for GET/PUT; outside sentinels unchanged. |
| Existing lab save obtains authorization from the served page | HTTP: real browser transport uses the token from served HTML for both callable lab save paths. |
| Restarted server makes an old tab reload before saving | HTTP: old run token rejected after restart; Transport: 403/missing-token guidance retains edits and requests reload. |
| Network or storage failure is visible | Transport: network and storage failures caught; no exception/token text displayed; explicit retry persists retained edits. |
| Failure status survives frame updates and explicit retry replaces it | Play: browserMain-owned live-region status survives repeated frame/input sync; explicit retry replaces failure. |

## Six-dimension review and resolutions

All six briefs used high reasoning and a medium-to-high model, scheduled within the available concurrency. Each finding was checked against implementation before correction.

| Dimension | Result and disposition |
| --- | --- |
| Adversarial/security/failure containment | Found wrapped unsafe-path session-start errors incorrectly mapping to 500. Preserve the typed cause and return 400; five real HTTP link cases check unchanged evidence, unavailable writes and recovery. Follow-up found the fresh-policy restart gap described below. |
| Architecture/specification/documentation | No layer violation found. Corrected the infrastructure overview that described the in-memory save repository as disk-backed. Independent final documentation review cleared the corrected overview and disclosures. |
| Performance | No new render-loop work or material allocation concern found. Reviewed task-5 fingerprints and measurements; reference Intel hardware and native Windows remain unmeasured. |
| Testing | Corroborated missing actual-restart rotation and wrapped-path regression cases. All scenario mappings are recorded above; two independent documentation reviewers confirmed all 52 titles and mappings. |
| Logic/simulation integrity | Found that actual Vite restart reused the old logger without rotation. Every configuration now constructs a fresh logger. Tests verify repeated actual restarts, archive retention/bytes and fresh query/sequence. Follow-up found the fresh-policy race. |
| Design fidelity/coherence | Owner pillars, future systems and shipped/planned boundaries preserved. Independent review cleared owner wording, all scenario mappings and shipped/planned boundaries; the roadmap retains proposed status until archive. |

Restart investigation also reproduced an old partial request writing into the new current log while Vite constructed its replacement server before closing the old server. A run check after body completion closes the same-policy path; independent follow-up reviews found that a real config factory creates a fresh policy. The restart wrapper now retires the old policy before replacement configuration, serializes concurrent callers through the current server method, and leaves failed replacements denied until explicit retry. Real config-factory regressions cover successful, failed and concurrent replacement lifecycles. Two independent final reviewers cleared the implementation and regressions; the HTTP suite passes all 37 cases. These source corrections belong in the separate bridge fix, never the documentation commit.

The unsafe-path 400 rule is the specific exception to the general initialization-error 500 rule. Other I/O failures remain 500, then 503 for telemetry writes until explicit recovery. No specification guarantee is weakened.

## Validation and limits

Final validation passed: `npm run verify`, `npm run verify:serial`, `npm run build`, and `openspec validate hx-ops-safety --strict`. The suite has 278 tests (8 architecture, 270 unit), including 37 real HTTP cases. Both final fix reviewers cleared the code, and both documentation reviewers cleared the 52-scenario matrix after disclosure corrections. Cold plus five warm pairs of each verification strategy all passed; final parallel warm median is 2.289819 seconds versus 3.505548 seconds serial (34.68% lower). The build retains its existing large-chunk advisory. `git diff --check` is clean. Original task-5 timings remain tied to their measured revision in [verification.md](verification.md); they are not relabeled as measurements of later tests.

- No dependency upgrades. `yaml@2.9.1`, already locked transitively, became an explicit development dependency so skill frontmatter is parsed as YAML rather than brittle prose/regex matching. This is the only dependency-manifest deviation from the original “No package upgrades or new dependencies” plan.
- Browser-origin defense is not OS-user authentication. Trusted executable configuration, hostile same-user directory swaps and concurrent multi-process writers remain outside the boundary. Pending or unprunable archives can exceed normal completed-group retention.
- The debug skill's field schema, supported query flags and save-inspection instructions were checked. Its unconditional “100% Preserved Verbatim” wording overstates compaction: preservation applies during aggregation, while storage-cap eviction can remove records from every priority tier. That wording and existing claims of automatic browser logging/local ONNX decisions are stale; their rewrite is explicitly assigned to `process-gates-and-ledger`, with runtime wiring owned by `telemetry-wiring`. This delivery does not certify those runtime claims or broaden scope to the scheduled documentation rewrite.
- The 2019 Intel i7 / 16 GB target and native Windows process/hook behavior have not been measured here. Windows command construction is tested with an injected adapter; host-native cancellation is tested on macOS.
- No AI behavior, simulation reducers, gameplay telemetry wiring, JSON pack loader, Sound Lab or Pacing Lab is delivered by this change.
