## Purpose

Provide structured per-session NDJSON event and AI reasoning logging (`info`, `warn`, `error`, `crash`) with injected clock stamping, single-session retention, and rolling time-window compaction across all epochs.

## ADDED Requirements

### Requirement: Structured NDJSON session event logging with injected clock
The telemetry system SHALL record every player, NPC, rival operative, orbital, and system event to a structured NDJSON session log containing absolute ISO timestamps, elapsed session time in milliseconds, epoch identifier, world tick, severity level (`info`, `warn`, `error`, or `crash`), actor, actee, action identifier, inputs, and resulting world effects, using an injected `TelemetryClock` so `src/domain/` remains 100% free of wall-clock globals.

#### Scenario: Event logged with complete metadata and fixed clock in domain/unit tests
- **WHEN** an action occurs between an `actorId` and an `acteeId` at a given `worldTick` with a `TelemetryClock` returning `timestampIso: "2026-11-06T12:00:00.000Z"` and `elapsedSessionMs: 1500`
- **THEN** the session logger SHALL append a valid JSON line containing those exact `timestampIso` and `elapsedSessionMs` values along with `epochId`, `worldTick`, `level`, `category`, `actorId`, `acteeId`, `action`, `inputs`, and `effects`, and `src/domain/telemetry/` SHALL contain zero calls to `Date.now()`, `new Date()`, or `performance.now()`

#### Scenario: Severity levels and malformed line resilience
- **WHEN** events of level `info`, `warn` (warning), `error`, or `crash` are emitted or queried from a log stream containing a truncated line
- **THEN** the session logger SHALL persist and filter each valid event by level and skip any malformed NDJSON line without crashing

### Requirement: AI input, output, reasoning, and omitted clause logging
The telemetry system SHALL record full AI decision and NLP parsing traces—including raw input, structured output, candidate utility/similarity scores, reasoning explanation, and any `omissible` briefing clauses withheld during an `AdvisoryDuel`.

#### Scenario: AI utility and NLP trace recorded
- **WHEN** an NPC utility decision, rival operative evaluation, or player NLP parse completes
- **THEN** the logged entry SHALL include an `aiReasoning` payload with `inputSummary`, `outputSummary`, `candidateScores`, `selectedReason`, and `omittedClauses`

### Requirement: Single-session log retention and rolling time-window compaction
The telemetry system SHALL retain only the latest play session's logs on new session startup and SHALL compact older time windows within the current session into a compacted log stream without losing high-value diagnostic or narrative events.

#### Scenario: Previous session logs purged on new session initialization
- **WHEN** a new play session starts via `startNewSession(sessionId)`
- **THEN** any prior session's active and compacted log files in `./logs/` SHALL be replaced by the new session's log files

#### Scenario: Rolling compaction collapses routine info events while preserving critical records
- **WHEN** rolling compaction runs for entries older than the active retention window
- **THEN** repetitive routine `info` entries sharing the same `(epochId, category, actorId, action)` tuple SHALL be aggregated into a single compacted summary record with `count`, `firstElapsedMs`, `lastElapsedMs`, `firstWorldTick`, and `lastWorldTick`, while 100% of `warn`, `error`, `crash`, `aiReasoning`, and high-signal categories (`player`, `rival`, `office`, `pretext`, `emergency`, `martyrdom`, `correspondence`, `orbital`, `legacy`) SHALL be preserved verbatim
