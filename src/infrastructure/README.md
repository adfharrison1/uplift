# Infrastructure Layer (`src/infrastructure/`)

## Purpose

`src/infrastructure/` provides concrete, 100% local/offline implementations of domain ports:

- **Structured Session Telemetry & Rolling Compaction**:
  - Writes every player, NPC, rival operative, orbital, and system event—plus full AI inputs, outputs, and reasoning—to `./logs/current-session.jsonl` (structured NDJSON with absolute ISO timestamps, `elapsedSessionMs`, `worldTick`, `level: info | warn | error | crash`, `actorId`, `acteeId`).
  - Retains only the latest session log on new session startup and performs rolling compaction into `./logs/current-session.compacted.jsonl`.
- **Multi-Session Save / Load Repository**:
  - Persists and restores named session save files in `./saves/` (including `WorldState`, `SeededRandom` state, `StateSliceStore`, correspondence queues, and `CivilizationLegacyState`).
- **Hybrid 3-Stage Local NLP Pipeline**:
  1. Deterministic lexical/pragmatic extractor (`<1ms` negation, speaker-target roles, speech act).
  2. Local Web Worker running quantized `Xenova/all-MiniLM-L6-v2` (`~23MB` ONNX cached in `./public/models/`).
  3. Intent combiner and deterministic fallback matcher for fast unit tests.

## Current Module Inventory

- `index.ts` — Public infrastructure layer barrel.
