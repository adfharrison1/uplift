## Purpose

Provide multi-session save/load persistence (`./saves/`), a local Vite disk bridge for browser-to-disk telemetry/saves, and a Debug Agent Skill (`uplift-debug`) with a CLI log query tool (`npm run logs:query`).

## ADDED Requirements

### Requirement: Multi-session save and load repository with path-traversal protection
The persistence layer SHALL allow players and headless harnesses to save, list, load, and delete multiple named session snapshots on disk, preserving `schemaVersion`, deterministic RNG state, epoch identifier, world tick, modular `StateSliceStore` data, and optional `legacyState`, while rejecting invalid or path-traversal slot identifiers.

#### Scenario: Save and load round-trip across multiple named sessions
- **WHEN** two distinct session states (`slot-alpha` and `slot-beta`) are saved with different `epochId`, `worldTick`, `rngState`, `stateSlices`, and `legacyState` snapshots
- **THEN** `listSlots()` SHALL return metadata for both sessions, and `loadSlot('slot-alpha')` SHALL restore the exact `schemaVersion`, `epochId`, `worldTick`, `SeededRandom` state, `StateSliceStore` values, and `legacyState` saved for `slot-alpha`

#### Scenario: Corrupted save slot isolation and path-traversal rejection
- **WHEN** `loadSlot()`, `saveSlot()`, or `deleteSlot()` is called with a path-traversal identifier (e.g., `../../etc/passwd` or `..%2Fsecret`) or for a corrupted/non-existent save slot
- **THEN** the repository SHALL throw a descriptive error without reading, writing, or deleting outside `./saves/` and without corrupting other valid saved sessions

### Requirement: Vite local disk bridge validation
The Vite local disk bridge middleware SHALL expose local endpoints for appending telemetry batches and reading/writing save slots, rejecting malformed JSON, invalid slot IDs (`400`), and oversized payloads (`>256 KiB` with `413`).

#### Scenario: Valid and invalid HTTP bridge requests
- **WHEN** the local disk bridge receives a valid telemetry batch or save request vs. malformed JSON, an invalid `slotId`, or a body exceeding `256 KiB`
- **THEN** valid requests SHALL persist to `./logs/` or `./saves/`, while invalid requests SHALL return `400` or `413` with zero partial disk writes

### Requirement: CLI log query tool and Debug Agent Skill
The project SHALL provide a CLI log query utility (`npm run logs:query`) and a Cursor agent skill (`.cursor/skills/uplift-debug/SKILL.md`) capable of filtering active and compacted session logs by `level`, `actorId`, `acteeId`, `category`, `action`, `minTick`, `maxTick`, and AI reasoning presence to trace and fix simulation or AI issues.

#### Scenario: Querying session logs by actor, level, and AI reasoning
- **WHEN** a developer or agent queries the session logs with filters (e.g., `level: 'warn'`, `actorId: 'npc.sorrel'`, or `hasAiReasoning: true`)
- **THEN** the query runner SHALL return only matching entries across the active and compacted log streams in chronological order

#### Scenario: Debug agent skill presence and trace-and-fix workflow
- **WHEN** `npm run test:arch` executes
- **THEN** it SHALL verify that `.cursor/skills/uplift-debug/SKILL.md` exists and documents the log schema, compaction rules, save slot inspection, `npm run logs:query` usage, and the step-by-step trace-and-fix debugging workflow
