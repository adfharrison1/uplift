# Spec Delta

## MODIFIED Requirements

### Requirement: Multi-session save and load repository with path-traversal protection

The persistence layer SHALL allow saving, listing, loading and deleting multiple named snapshots while preserving schemaVersion, RNG state, epoch, world tick, modular state slices and optional legacy state. It SHALL reject invalid slot identifiers and symlinks in application-controlled storage paths, confine file operations to the configured saves root, and use exclusively created temporary files for atomic replacement.

#### Scenario: Save and load round-trip across multiple named sessions

- **WHEN** two distinct session states (slot-alpha and slot-beta) are saved with different epochId, worldTick, rngState, stateSlices and legacyState snapshots
- **THEN** listing SHALL return metadata for both, and loading slot-alpha SHALL restore its exact schemaVersion, epochId, worldTick, RNG state, state slices and legacy state

#### Scenario: Corrupted save slot isolation and path-traversal rejection

- **WHEN** load, save or delete receives a traversal identifier, or loading encounters a corrupt or missing slot
- **THEN** the repository SHALL report an error without reading, writing or deleting outside the configured saves root and without corrupting other valid sessions

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

## ADDED Requirements

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

- **WHEN** an authorized new-session request fails during rotation
- **THEN** it SHALL receive 500; later telemetry batch/compact requests SHALL receive 503 without writes until an authorized new-session retry succeeds; none of these responses SHALL expose filesystem paths or tokens

#### Scenario: Filesystem exceptions are redacted

- **WHEN** a path-policy rejection or I/O failure includes an absolute path internally
- **THEN** the HTTP response SHALL use the stable error mapping and omit that path, while the prior bytes remain recoverable as required by the telemetry/filesystem contracts
