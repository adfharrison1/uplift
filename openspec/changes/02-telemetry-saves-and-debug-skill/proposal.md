## Why

Before building the simulation registries, 3D camera, NPC utility brains, and rival operative mechanics, `uplift` requires a rock-solid, epoch-agnostic observability and persistence backbone: every player, NPC, rival, orbital, and system event—plus every AI input, output, reasoning chain, and withheld `AdvisoryDuel` clause—must be logged to a per-session structured NDJSON stream with rolling compaction, paired with a multi-session save/load system and a dedicated Debug Agent Skill so both the developer and AI agents can inspect, trace, and replay any simulation state.

## What Changes

- Define epoch-agnostic domain ports and record contracts in `src/domain/telemetry/` (`TelemetryEntry`, `TelemetryLevel`: `'info' | 'warn' | 'error' | 'crash'`, `AiReasoningTrace`, `SessionTelemetryPort`) and `src/domain/persistence/` (`SaveSlotMetadata`, `SaveSlotEnvelope`, `SaveSlotRepositoryPort`).
- Implement the local NDJSON session logger and **Rolling Compactor** in `src/infrastructure/telemetry/` (`NdjsonSessionTelemetry`, `InMemorySessionTelemetry`):
  - Writes structured JSON lines to `./logs/current-session.jsonl` with `timestampIso`, `elapsedSessionMs`, `epochId`, `worldTick`, `level`, `category`, `actorId`, `acteeId`, `action`, `inputs`, `effects`, and optional `aiReasoning` (including omitted `AdvisoryDuel` clauses).
  - Purges previous session logs on new session start so only the latest session is retained, and compacts older time windows into `./logs/current-session.compacted.jsonl`—collapsing repetitive routine `info` entries into summary digests while preserving 100% of `warn`, `error`, `crash`, player, rival, office/pretext, and AI reasoning records.
- Implement the **Multi-Session Save / Load Repository** in `src/infrastructure/persistence/` (`FileSaveSlotRepository`, `InMemorySaveSlotRepository`) supporting saving, listing, loading, and deleting multiple named sessions under `./saves/` (preserving `epochId`, `worldTick`, `SeededRandom` state, `StateSliceStore` snapshot, and payload integrity).
- Add a lightweight **Vite Local Disk Bridge** (`src/interfaces/vite/localDiskBridgePlugin.ts`) and a **Log Query CLI & Debug Agent Skill** (`src/interfaces/cli/queryLogs.ts`, `npm run logs:query`, and `.agents/skills/uplift-debug/SKILL.md`) so browser play writes directly to `./logs/` and `./saves/` and agents can filter and trace logs in one command.

### Non-goals

- No concrete game content packs, 3D rendering, or ONNX inference yet (deferred to Changes 03–08).
- Runtime and tests require **zero external API keys, zero paid tokens, and zero cloud telemetry services**.
- All telemetry and save schemas are **epoch-agnostic** (`epochId`, `StateSliceStore` snapshots, generic `actorId`/`acteeId` and `effects` payloads) so they work identically in Era 1 (*Highglass Hold*) and all future Epochs without modifying core domain loop code.

### Dependencies on Prior Changes

- Depends on `01-clean-scaffold-and-verify` (archived) and `01a-eslint-prettier-and-hooks` (archived).

## Capabilities

### New Capabilities

- `session-telemetry-and-compaction`: Per-session structured NDJSON event and AI reasoning logging (`info`, `warn`, `error`, `crash`) with single-session retention and rolling time-window compaction.
- `multi-session-saves-and-debug-skill`: Multi-session save/load persistence (`./saves/`), Vite local disk bridge, and the `uplift-debug` agent skill + log query CLI (`npm run logs:query`).

### Modified Capabilities

<!-- None -->

## Impact

- Adds `src/domain/telemetry/*`, `src/domain/persistence/*`, `src/infrastructure/telemetry/*`, `src/infrastructure/persistence/*`, `src/interfaces/cli/queryLogs.ts`, `src/interfaces/vite/localDiskBridgePlugin.ts`, `vite.config.ts`, and `.agents/skills/uplift-debug/SKILL.md`.
- Updates `package.json` (`logs:query` script), `README.md`, `AGENTS.md`, and section `README.md` / `AGENTS.md` files in `src/domain/`, `src/infrastructure/`, `src/interfaces/`, and `tests/`.
