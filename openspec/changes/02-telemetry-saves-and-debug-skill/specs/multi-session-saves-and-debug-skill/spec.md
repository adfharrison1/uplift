## Purpose

Provide multi-session save/load persistence (`./saves/`), a local Vite disk bridge for browser-to-disk telemetry/saves, and a Debug Agent Skill (`uplift-debug`) with a CLI log query tool (`npm run logs:query`).

## ADDED Requirements

### Requirement: Multi-session save and load repository
The persistence layer SHALL allow players and headless harnesses to save, list, load, and delete multiple named session snapshots on disk, preserving deterministic RNG state, epoch identifier, world tick, and modular `StateSliceStore` data.

#### Scenario: Save and load round-trip across multiple named sessions
- **WHEN** two distinct session states (`slot-alpha` and `slot-beta`) are saved with different `epochId`, `worldTick`, `rngState`, and `StateSliceStore` snapshots
- **THEN** `listSlots()` SHALL return metadata for both sessions, and `loadSlot('slot-alpha')` SHALL restore the exact `epochId`, `worldTick`, `SeededRandom` state, and `StateSliceStore` values saved for `slot-alpha`

#### Scenario: Corrupted or missing save slot handling
- **WHEN** `loadSlot()` is called for a non-existent or malformed save slot
- **THEN** the repository SHALL throw a descriptive error without corrupting other saved sessions

### Requirement: CLI log query tool and Debug Agent Skill
The project SHALL provide a CLI log query utility (`npm run logs:query`) and a Cursor agent skill (`.cursor/skills/uplift-debug/SKILL.md`) capable of filtering active and compacted session logs by `level`, `actorId`, `acteeId`, `category`, `action`, `minTick`, `maxTick`, and AI reasoning presence.

#### Scenario: Querying session logs by actor, level, and AI reasoning
- **WHEN** a developer or agent queries the session logs with filters (e.g., `level: 'warn'`, `actorId: 'npc.sorrel'`, or `hasAiReasoning: true`)
- **THEN** the query runner SHALL return only matching entries across the active and compacted log streams in chronological order

#### Scenario: Debug agent skill presence and structure
- **WHEN** `npm run test:arch` executes
- **THEN** it SHALL verify that `.cursor/skills/uplift-debug/SKILL.md` exists and documents the log schema, compaction rules, save slot inspection, and `npm run logs:query` usage
