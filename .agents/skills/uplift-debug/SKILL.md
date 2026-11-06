---
name: uplift-debug
description: Query per-session NDJSON telemetry logs, AI reasoning traces, omitted AdvisoryDuel clauses, and multi-session save files to trace and fix simulation, AI, or rendering bugs in Uplift.
---

# Uplift Debug Agent Skill (`uplift-debug`)

Use this skill whenever you need to inspect play-session events, trace NPC utility or local ONNX NLP decisions, diagnose omitted `AdvisoryDuel` clauses, or inspect multi-session save files.

## 1. Session Log Architecture & Storage Caps

Uplift writes structured NDJSON logs for the **latest play session** into `./logs/`:

- **Active Window (`./logs/current-session.jsonl`)**: Raw `TelemetryEntry` lines (`recordType: 'event'`). Auto-compacts when exceeding **50 MiB** (`DEFAULT_MAX_ACTIVE_LOG_BYTES`).
- **Compacted Window (`./logs/current-session.compacted.jsonl`)**: Older time windows compacted up to **500 MiB** (`DEFAULT_MAX_COMPACTED_LOG_BYTES`).
  - Repetitive routine `info` entries are collapsed into `CompactedTelemetryDigest` records (`recordType: 'compacted_digest'`, with `count`, `firstElapsedMs`, `lastElapsedMs`, `firstWorldTick`, `lastWorldTick`).
  - **100% Preserved Verbatim**: All `warn`, `error`, and `crash` records, all records with `aiReasoning`, and all records in high-signal categories (`player`, `rival`, `office`, `pretext`, `emergency`, `martyrdom`, `correspondence`, `orbital`, `legacy`).

### `TelemetryEntry` Fields

- `sessionId`, `sequence`, `timestampIso`, `elapsedSessionMs`, `epochId`, `worldTick`
- `level`: `'info' | 'warn' | 'error' | 'crash'`
- `category`: domain category (`player`, `rival`, `office`, `pretext`, `emergency`, `martyrdom`, `correspondence`, `orbital`, `legacy`, `routine`, `kinematics`, `system`)
- `actorId`, `acteeId` (optional), `action`, `inputs`, `effects`, `message`
- `aiReasoning` (optional): `{ pipeline: 'utility_ai' | 'hybrid_nlp' | 'advisory_duel' | 'rival_ai', inputSummary, outputSummary, candidateScores, selectedReason, omittedClauses }`

## 2. Querying Session Logs (`npm run logs:query`)

Run `npm run logs:query` from the repository root to filter both compacted and active logs in chronological order without modifying them on disk:

```bash
# Show all warnings, errors, or crashes
npm run logs:query -- --level warn
npm run logs:query -- --level error
npm run logs:query -- --level crash

# Filter by actor or actee
npm run logs:query -- --actor npc.sorrel
npm run logs:query -- --actor player.deme --actee npc.vane

# Filter by AI reasoning traces (including omitted AdvisoryDuel clauses)
npm run logs:query -- --has-ai-reasoning true

# Filter by category and worldTick range
npm run logs:query -- --category rival --min-tick 10 --max-tick 50
```

## 3. Inspecting Multi-Session Save Slots (`./saves/`)

Named save sessions live in `./saves/<slotId>.json`. Each file is a validated `SaveSlotEnvelope`:

- `slotId`, `schemaVersion` (`1`), `epochId`, `worldTick`, `savedAtIso`
- `rngState`: 32-bit unsigned integer state for `SeededRandom.fromState(rngState)`
- `stateSlices`: snapshot of all modular `StateSliceKey<T>` values
- `legacyState`: optional `CivilizationLegacyState` snapshot (`materialScars`, `veilScars`, `lineageId` mutations)

## 4. Step-by-Step Trace-and-Fix Debugging Workflow

1. **Locate the Symptom**: Run `npm run logs:query -- --level error` or filter by `--actor` / `--min-tick` around the reported failure tick.
2. **Inspect AI & Reducer Reasoning**: Run `npm run logs:query -- --has-ai-reasoning true` to inspect `candidateScores`, `selectedReason`, and any `omittedClauses` withheld by the Ship Mind (_The Ending_) or Companion Drone (_The Lamp_).
3. **Reproduce Deterministically in a Unit/Simulation Test**: Copy the `rngState` and `stateSlices` from the relevant `./saves/<slotId>.json` (or `TelemetryEntry.inputs`) into a Vitest test using `SeededRandom.fromState(rngState)` and `fixedTelemetryClock`.
4. **Fix & Verify**: Apply the fix in the appropriate Clean Architecture layer and run `npm run verify`.
