# multi-session-saves-and-debug-skill Specification

## Purpose
Provide multi-session save/load persistence (`./saves/`), a local Vite disk bridge for browser-to-disk telemetry/saves, and a Debug Agent Skill (`uplift-debug`) with a CLI log query tool (`npm run logs:query`).

## Requirements

### Requirement: Multi-session save and load repository with path-traversal protection

The persistence layer SHALL save, list, load and delete multiple named identity-bearing world snapshots while preserving the envelope schema version, primary pack ID and version, RNG state, epoch, world tick, modular state slices and optional legacy state. It SHALL reject invalid slot identifiers and symlinks in application-controlled storage paths, confine operations to the saves root, and use exclusively created temporary files for atomic replacement.

#### Scenario: Save and load round-trip across multiple named sessions

- **WHEN** two distinct current-format sessions (slot-alpha and slot-beta) are saved with valid world snapshots and different epoch IDs, pack identities, world ticks, RNG states, state slices and legacy snapshots
- **THEN** listing SHALL return readable metadata for both, and loading slot-alpha SHALL restore its exact envelope schema version, pack identity, epoch ID, world tick, RNG state, state slices and legacy state

#### Scenario: Browser save slots own their accepted values
- **WHEN** a browser in-memory save accepts an input or returns an envelope from save or load, and a caller later mutates that input or returned value
- **THEN** a subsequent load SHALL return the originally accepted slot values without those mutations

#### Scenario: Corrupted save slot isolation and path-traversal rejection

- **WHEN** load, save or delete receives a traversal identifier, or loading encounters a corrupt or missing slot
- **THEN** the repository SHALL report an error without reading, writing or deleting outside the saves root or corrupting other valid sessions; listing SHALL retain a safe-named corrupt candidate with a redacted unreadable reason

#### Scenario: Symlinked save paths cannot redirect storage

- **WHEN** the saves root, an application-controlled parent, an existing slot or a candidate temporary path is a symlink, including a dangling symlink
- **THEN** the unsafe operation SHALL fail without following the link, altering its target or replacing a valid saved session

### Requirement: Vite local disk bridge validation

The local bridge SHALL expose its existing telemetry and save routes only through an explicit route/method allowlist and shared request guard. Accepted JSON SHALL retain schema validation; malformed JSON or invalid IDs SHALL return 400 without partial writes. Mutations SHALL require approved request metadata and the current server token. Body consumption SHALL be bounded at the configured limit, default 256 KiB.

#### Scenario: Valid and invalid HTTP bridge requests

- **WHEN** an authorized telemetry batch or save request contains valid JSON, malformed JSON, an invalid slot ID or an oversized body
- **THEN** valid requests SHALL persist data that the corresponding log query or save GET can read back; invalid requests SHALL perform no disk mutation and return 400 or the oversized-stream outcome below

#### Scenario: Known and unknown methods have no accidental write route

- **WHEN** an authorized request targets an unknown API route or uses an unsupported method on a known route
- **THEN** it SHALL return 404 or 405 respectively, with no file creation, session rotation or other mutation

### Requirement: CLI log query tool and Debug Agent Skill

The project SHALL provide a CLI log query utility (npm run logs:query) and a debug skill at .agents/skills/uplift-debug/SKILL.md describing schema, compaction, save inspection and trace-and-fix usage. Queries SHALL filter current active and compacted logs by level, actorId, acteeId, category, action, minTick, maxTick and AI reasoning presence. Skills SHALL NOT reside in .cursor/skills.

#### Scenario: Querying session logs by actor, level, and AI reasoning

- **WHEN** a developer or agent queries current-session logs using the supported filters
- **THEN** the query SHALL return only matching active and compacted records in chronological order

#### Scenario: Debug agent skill presence in .agents/skills and trace-and-fix workflow

- **WHEN** architecture verification inspects the debug skill
- **THEN** it SHALL verify the required file, valid name/description metadata, nonempty instructions and absence of .cursor/skills without pinning exact prose; documentation review SHALL verify the log schema, compaction, save-inspection and query guidance

### Requirement: Loopback request provenance

Every non-preflight bridge request SHALL require an exact Host of localhost or 127.0.0.1 on the serving dev port. A present Origin SHALL exactly match one of those HTTP origins. Absent Origin SHALL require Sec-Fetch-Site same-origin or none. The bridge SHALL reject bad provenance with 403 before body buffering or dispatch. Earlier HTTP-parser/Vite rejections SHALL remain 4xx. Forwarded headers SHALL NOT expand the allowlist.

#### Scenario: Allowed origins and ports

- **WHEN** a request has either exact approved Host and an Origin of http://localhost:<port> or http://127.0.0.1:<port> at the actual serving port
- **THEN** it SHALL pass provenance checks and remain subject to method, token, media-type, size and schema checks

#### Scenario: Foreign or malformed provenance is rejected

- **WHEN** a request supplies an unapproved Host, another port, a foreign Origin, Origin null, a suffix lookalike, multiple provenance header values or malformed authority
- **THEN** the bridge SHALL return 403, or the HTTP parser/Vite SHALL reject it earlier with 4xx, with all managed files unchanged even if it carries a correct token

#### Scenario: Absent Origin has a narrow fallback

- **WHEN** Origin is absent
- **THEN** only Sec-Fetch-Site same-origin or none SHALL pass provenance checks; missing metadata, same-site and cross-site SHALL receive 403

#### Scenario: Simple POST cannot start a session

- **WHEN** an external page sends a text/plain or form POST to /api/telemetry/session
- **THEN** the bridge SHALL reject it before consuming its body, and the active, compacted and archived logs SHALL remain byte-for-byte unchanged

### Requirement: Per-run write authorization

Every POST, PUT and DELETE bridge operation SHALL require Content-Type application/json, optionally with a UTF-8 charset, and an X-Uplift-Bridge-Token header equal to the current run's unpredictable token. Missing or wrong tokens SHALL return 403; unsupported or absent Content-Type SHALL return 415 after provenance and token checks. Tokens SHALL be absent from URLs, persisted data, diagnostics and production HTML.

#### Scenario: Browser obtains a token scoped to one server run

- **WHEN** the local dev page is served and then its server is restarted
- **THEN** dev HTML SHALL expose the current token to its own browser transport, repeated loads within one run SHALL share it, the restarted server SHALL use a different token, and production HTML SHALL contain no token

#### Scenario: Old, missing and incorrect tokens cannot mutate disk

- **WHEN** a request otherwise meets the request contract but omits the token or uses an incorrect or previous-run token
- **THEN** it SHALL receive 403 and leave all managed files unchanged

#### Scenario: JSON media type is required even for bodyless mutations

- **WHEN** an otherwise authorized request uses a missing, plain-text or form Content-Type, including a bodyless DELETE
- **THEN** it SHALL receive 415 without mutation; application/json and application/json; charset=utf-8 SHALL be accepted

### Requirement: Bounded request streams

The bridge SHALL count received bytes and stop consumption immediately when the configured cap is exceeded, without waiting for the sender to finish. It SHALL release buffered data and destroy the over-cap request stream, returning 413 when the response can be delivered or closing the connection otherwise. An aborted or errored body SHALL never dispatch a partial mutation.

#### Scenario: Declared and chunked oversized bodies terminate early

- **WHEN** an authorized sender declares an over-cap Content-Length or sends chunked bytes beyond the cap without ending the request
- **THEN** the server SHALL promptly return 413 or close the connection, retain no continuing body buffer and make no disk changes

#### Scenario: The cap counts bytes and admits the exact boundary

- **WHEN** a valid JSON body is exactly the configured byte limit, or a multibyte body exceeds it by one byte
- **THEN** the exact-boundary body SHALL reach schema validation and the oversized body SHALL be rejected without mutation

#### Scenario: Interrupted body leaves storage untouched

- **WHEN** the client disconnects or the body stream fails before completion
- **THEN** no handler SHALL receive partial JSON, no unhandled rejection SHALL escape, and subsequent valid requests SHALL still work

### Requirement: Explicit local CORS policy

The dev server SHALL explicitly limit CORS response authorization to its two approved loopback origins on the serving port. CORS SHALL NOT substitute for the bridge's server-side provenance and token checks.

#### Scenario: Approved preflights permit the guarded methods and headers

- **WHEN** either approved origin preflights a bridge mutation with Content-Type and X-Uplift-Bridge-Token
- **THEN** CORS SHALL return 204 with that exact Access-Control-Allow-Origin, Vary: Origin, GET/POST/PUT/DELETE/OPTIONS allowed methods and those allowed headers, without granting credentialed access or dispatching a mutation; the actual request SHALL still require every bridge guard

#### Scenario: Actual listening port is shared by CORS and provenance checks

- **WHEN** a server configured with port 0 binds an ephemeral port, or the normal server binds its configured port
- **THEN** both policies SHALL authorize only the two origins at that actual port, reject another port, and fail closed until the listening address is known

#### Scenario: Foreign preflight cannot grant browser write access

- **WHEN** a foreign origin preflights a bridge PUT or DELETE
- **THEN** it SHALL receive no CORS authorization for that origin and SHALL cause no mutation

### Requirement: Confined bridge filesystem operations

All bridge reads, writes, rotation, compaction and deletion SHALL stay inside registered storage roots. Application-controlled root components, files and temporary paths SHALL reject symlinks, including dangling links. New paths SHALL be validated through their existing ancestors. Atomic replacement SHALL use an exclusively created temporary file in the validated destination directory.

#### Scenario: All storage families reject symlink redirection

- **WHEN** a request encounters a linked managed root, child directory, destination or temporary path for logs, saves, stages or characters
- **THEN** it SHALL fail without following that link or changing any outside sentinel file; an HTTP path-policy rejection SHALL return 400 without leaking an absolute filesystem path

#### Scenario: Missing allowed directories can be created safely

- **WHEN** an authorized valid write targets an absent registered directory whose application-controlled ancestors are safe
- **THEN** the directory SHALL be created within its approved root, the payload SHALL be atomically written, and the appropriate reader SHALL return it

### Requirement: Storage failure responses do not expose filesystem details

The bridge SHALL keep error responses in its existing JSON error field, use stable redacted messages and omit absolute paths and tokens. Unsafe paths SHALL return 400, failed storage operations 500 and unavailable telemetry storage 503. Detailed recoverable relative paths SHALL be available only through local diagnostics.

#### Scenario: Failed session initialization permits explicit recovery

- **WHEN** an authorized new-session request fails during rotation because of an I/O error rather than an unsafe-path rejection
- **THEN** it SHALL receive 500; later telemetry batch/compact requests SHALL receive 503 without writes until an authorized new-session retry succeeds; none of these responses SHALL expose filesystem paths or tokens

#### Scenario: Filesystem exceptions are redacted

- **WHEN** a path-policy rejection or I/O failure includes an absolute path internally
- **THEN** the HTTP response SHALL use the stable error mapping and omit that path, while the prior bytes remain recoverable as required by the telemetry/filesystem contracts

### Requirement: Versioned world snapshots validate and migrate before load
Every new coordinator save SHALL carry a versioned world snapshot. Loading SHALL validate every serialized world field and nested entity, prop, pacing, pressure, orbital, cue and scar value, migrate supported earlier snapshot versions in order, and reject malformed, unsupported or future versions before publishing world or RNG state.
The codec SHALL require lossless plain-JSON prop state and matching inner/outer epoch ID and world tick.

#### Scenario: Current world survives repository and coordinator round trip
- **WHEN** a coordinator saves a nondefault world, RNG state, custom slices with versions and legacy state to a named repository slot, and another coordinator with the same epoch and pack loads it
- **THEN** the loaded consumer SHALL expose the same world fields, RNG continuation, slice values and versions, and legacy state, and a second save/load SHALL preserve those values without another migration

#### Scenario: Supported historical inner snapshot migrates once
- **WHEN** a current identity-bearing envelope contains a synthetic version-one inner snapshot with exactly the current serialized-world field set and only `snapshotVersion: 1` instead of `2`
- **THEN** coordinator load SHALL replace only that marker on a fresh value, validate the resulting current snapshot, expose the migrated world, and write only the current snapshot version on resave; an unversioned inner snapshot SHALL be rejected

#### Scenario: Nested corruption and unsupported version preserve prior state
- **WHEN** a slot has a malformed nested world field, a missing migration step, an invalid version marker or a future snapshot version
- **THEN** coordinator load SHALL fail with the affected snapshot field or version identified, preserve its previous world, RNG, slices and legacy state, and allow a corrected slot to load on retry

#### Scenario: Inner and outer identity fields disagree
- **WHEN** a structurally valid inner snapshot has an `epochId` or `worldTick` different from its envelope
- **THEN** repository listing SHALL mark the slot `invalid_snapshot`, coordinator load SHALL reject before publication, previous world/RNG/slices/legacy state and slot bytes SHALL remain unchanged, and corrected values SHALL load on retry

#### Scenario: Prop state would lose data during JSON persistence
- **WHEN** encoding a world prop state contains `NaN`, `undefined`, BigInt, a cycle or a non-plain object, or decoding encounters a non-JSON prop value
- **THEN** the codec SHALL reject it before saving or publishing rather than silently changing the value through serialization

### Requirement: Saves are bound to one epoch and versioned primary pack
New save envelopes SHALL carry the current schema version, epoch ID, nonempty primary `packId` and positive integer `packVersion`. A coordinator SHALL save its bound registry identity and reject mismatches before publishing state. Identity-free pre-change envelopes SHALL be unreadable. Earlier campaign states at any tick SHALL load while the epoch, pack ID and current pack version match; older pack versions SHALL fail without implicit upgrade.

#### Scenario: Matching pack and epoch load through the real consumer
- **WHEN** a coordinator saves under a registered primary pack and the file repository or guarded save HTTP route returns that envelope to a coordinator bound to the same epoch, pack ID and version
- **THEN** load SHALL restore the saved world, and the envelope and listing SHALL expose the same identity that the registry supplied

#### Scenario: Wrong epoch, pack or version rejects atomically
- **WHEN** a valid slot has a different epoch ID, pack ID or pack version from the receiving coordinator's registry
- **THEN** load SHALL report which identity component differs, leave the prior world, RNG, slices and legacy state intact, and leave the slot bytes unchanged

#### Scenario: Earlier campaign state under the current pack version loads
- **WHEN** a coordinator bound to a current epoch, primary pack and version loads a saved state from any earlier world tick under that same identity
- **THEN** it SHALL restore that earlier world and its associated RNG, slices and legacy state without requiring a minimum tick or replacing the saved slot bytes

#### Scenario: Old envelope has no implicit identity assignment
- **WHEN** a pre-change envelope lacks pack identity or uses an unsupported envelope schema version
- **THEN** the repository SHALL reject loading it and list it as unreadable with an unsupported-schema or missing-identity reason; it SHALL NOT infer a pack from its epoch ID

### Requirement: Slot listings retain unreadable candidates and reasons
Listing SHALL return repository-structurally readable metadata and safe-named unreadable candidates in deterministic slot-ID order, with stable redacted reasons for invalid data or expected identity mismatch. Save, load and listing SHALL share structural validation; invalid direct save input SHALL fail before replacement. Structural readability SHALL NOT promise registered custom-slice compatibility. Unsafe storage paths SHALL fail closed.

#### Scenario: Corrupt file remains visible beside valid slots
- **WHEN** a save directory contains a valid slot and a safe-named corrupt JSON or invalid-snapshot slot
- **THEN** `listSlots` and the existing guarded `GET /api/saves` consumer SHALL list the valid metadata and each unreadable slot with its reason, without exposing file paths, tokens or raw parse errors

#### Scenario: Expected identity diagnoses a mismatch
- **WHEN** a caller lists structurally valid slots with an expected epoch, pack ID and version
- **THEN** a matching slot SHALL remain readable and mismatched slots SHALL report the differing epoch, pack or version through stable reason codes without attempting a load into a coordinator

#### Scenario: Listing separates structural readability from coordinator compatibility
- **WHEN** a slot has a malformed custom-slice version map or legacy state, or has a structurally valid slice that fails a coordinator's registered slice schema
- **THEN** the malformed slot SHALL receive `invalid_slices` or `invalid_legacy_state` in repository listing, while the registered-schema case MAY list as structurally readable and SHALL be rejected atomically by coordinator load

#### Scenario: Direct repository save cannot create an invalid structural slot
- **WHEN** a caller attempts to replace a valid slot with an invalid inner snapshot, non-JSON custom slice or malformed legacy state
- **THEN** save SHALL reject before replacement, preserve the previous slot bytes and report no successful save

#### Scenario: Multiple invalid conditions use stable precedence
- **WHEN** a safe-named file contains malformed JSON, a schema-one identity-free envelope, or a valid current envelope whose snapshot and expected identity both mismatch
- **THEN** listing SHALL classify them as `invalid_json`, `unsupported_schema` and `invalid_snapshot` respectively, with no raw parser or path details; full precedence SHALL be unsafe path error, invalid JSON, unsupported envelope schema, missing identity on current schema, other invalid envelope, invalid snapshot, invalid slices, invalid legacy state, expected epoch mismatch, expected pack ID mismatch, then expected pack-version mismatch

#### Scenario: Linked or unsafe path stays confined
- **WHEN** listing encounters a symlink in an application-controlled save path or a candidate name outside the safe slot-ID pattern
- **THEN** it SHALL never follow the unsafe path or read outside the save root, and other valid slots SHALL remain unchanged

### Requirement: Save completion reflects durable persistence
Once a repository accepts and persists a slot, a later telemetry-recording failure SHALL NOT make `saveToSlot` report failure or invite a duplicate retry. A repository failure SHALL still report failure and SHALL NOT claim that the slot was saved.

#### Scenario: Telemetry failure after persistence does not reverse success
- **WHEN** the repository commits a slot and the subsequent save telemetry call throws
- **THEN** `saveToSlot` SHALL return the saved envelope, and a repository read SHALL return the committed bytes exactly once

#### Scenario: Repository failure reports no successful save
- **WHEN** a repository write fails before committing a new or replacement slot
- **THEN** `saveToSlot` SHALL report the failure, preserve the previous slot bytes when replacing, and SHALL NOT emit a successful save event
