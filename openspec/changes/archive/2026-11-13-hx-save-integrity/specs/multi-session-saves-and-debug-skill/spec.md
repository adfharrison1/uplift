# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
