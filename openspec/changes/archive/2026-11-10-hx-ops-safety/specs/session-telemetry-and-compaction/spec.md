# Spec Delta

## MODIFIED Requirements

### Requirement: Single-session log retention and rolling time-window compaction

The telemetry system SHALL maintain current active/compacted logs and retain previous session groups under logs/prev, configured by maxPreviousSessions (default three) on the logger and bridge. Construction and explicit session starts SHALL rotate existing logs before creating fresh current files, never overwrite prior bytes as initialization, and preserve the existing compaction and storage-budget rules.

#### Scenario: Previous session logs purged on new session initialization

- **WHEN** construction or an explicit new-session request encounters previous active and compacted logs
- **THEN** prior logs SHALL be removed from the current-session namespace by moving both files byte-for-byte into one uniquely named previous-session group before fresh current files are created; no prior bytes SHALL be discarded, and a new event SHALL appear only in the current session's query result

#### Scenario: Rolling compaction collapses routine info events while preserving critical records

- **WHEN** rolling compaction runs for entries older than the active retention window
- **THEN** repetitive routine info entries sharing the same (sessionId, epochId, category, actorId, action) tuple SHALL be aggregated into one compacted summary with count, firstElapsedMs, lastElapsedMs, firstWorldTick and lastWorldTick, while warn, error, crash, aiReasoning and high-signal categories (player, rival, office, pretext, emergency, martyrdom, correspondence, orbital, legacy) SHALL be preserved verbatim during aggregation; existing storage-cap eviction behavior SHALL remain unchanged

#### Scenario: First startup and partially populated previous logs

- **WHEN** storage is empty, or only one previous log file exists, or a previous file is empty or contains malformed NDJSON
- **THEN** initialization SHALL create a usable current session and SHALL preserve every existing previous byte without requiring JSON parsing or fabricating a missing historical file

#### Scenario: Retention removes only the oldest completed session groups

- **WHEN** successful rotations leave more than the configured positive integer N completed previous-session groups
- **THEN** only the oldest completed managed groups SHALL be removed until N remain, with the newest N byte-for-byte intact; current files, unrelated entries and incomplete groups SHALL not be pruned

#### Scenario: Repeated clock values or session IDs do not collide

- **WHEN** multiple starts use identical clock values or session IDs, including IDs containing filesystem separators
- **THEN** each nonempty prior session SHALL receive a distinct archive destination, no user session ID SHALL become a path, and earlier retained files SHALL not be overwritten

#### Scenario: Rotation failure preserves evidence and prevents mixed sessions

- **WHEN** a filesystem error interrupts moving files or creating fresh current files
- **THEN** construction SHALL throw without returning an instance, or an explicit start on an existing instance SHALL throw and mark it unavailable; prior bytes SHALL remain at original or recoverable archive paths, no pruning SHALL occur, and an existing unavailable instance SHALL reject record, batch and compact calls until a successful explicit start

#### Scenario: Later initialization preserves incomplete archives

- **WHEN** a later constructor or explicit retry runs after a failed rotation left a pending group and possibly fresh empty current files
- **THEN** it SHALL allocate a new unique group as needed, leave every prior pending group byte-for-byte unchanged and unpruned, and expose new session metadata only after successful finalization

#### Scenario: Bridge retention configuration reaches the logger

- **WHEN** the bridge is configured with maxPreviousSessions equal to 1 and restarts successfully several times using the same isolated logs directory
- **THEN** exactly the newest completed prior-session group SHALL remain alongside the current files; invalid retention SHALL fail before any storage mutation

#### Scenario: Retention failure does not sacrifice current diagnostics

- **WHEN** an old completed group cannot be removed after a successful rotation
- **THEN** current logging SHALL remain usable, the failure SHALL be reported, and excess retained groups SHALL remain for a later pruning attempt

#### Scenario: Invalid retention configuration cannot destroy files

- **WHEN** retention is zero, negative, fractional or non-finite
- **THEN** construction SHALL reject it before changing any managed file

#### Scenario: Current-session query and archive inspection remain distinct

- **WHEN** a previous session has been rotated and a new event recorded
- **THEN** the existing current-log query SHALL return only the new session's records, while reading the retained group's active and compacted files SHALL recover the prior records
