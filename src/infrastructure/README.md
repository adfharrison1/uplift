# Infrastructure Layer (`src/infrastructure/`)

## Purpose

`src/infrastructure/` provides concrete, 100% local/offline implementations of domain ports:

- **Structured Session Telemetry & Rolling Compaction (`telemetry/`)**:
  - `NdjsonSessionTelemetry` and `InMemorySessionTelemetry` record every player, NPC, rival operative, orbital, and system event—plus full AI inputs, outputs, reasoning, and omitted `AdvisoryDuel` clauses—to `./logs/current-session.jsonl`.
  - Purges previous session logs on new session startup and enforces a **50 MiB** active log auto-compaction trigger (`DEFAULT_MAX_ACTIVE_LOG_BYTES`) and a **500 MiB** compacted log priority-eviction cap (`DEFAULT_MAX_COMPACTED_LOG_BYTES`) via `RollingLogCompactor`.
- **Multi-Session Save / Load Repository (`persistence/`)**:
  - `FileSaveSlotRepository` and `InMemorySaveSlotRepository` persist and restore named session save files in `./saves/<slotId>.json` with path-traversal protection, atomic `.tmp` rename writes, and Zod `safeParse` validation.
- **Hybrid 3-Stage Local NLP Pipeline** _(Change 08)_:
  - Deterministic lexical/pragmatic extractor + local Web Worker running quantized `Xenova/all-MiniLM-L6-v2` (`~23MB` ONNX cached in `./public/models/`).

## Current Module Inventory

- `telemetry/RollingLogCompactor.ts` — `compactTelemetryWindow`, `enforceCompactedStorageCap`, `matchesTelemetryFilter`, `sortTelemetryRecords`, and 50 MiB / 500 MiB storage budget constants.
- `telemetry/NdjsonSessionTelemetry.ts` — `NdjsonSessionTelemetry`, `InMemorySessionTelemetry`, `systemTelemetryClock`, `fixedTelemetryClock`, `safeParseJsonWithSchema`, and `parseNdjsonLines`.
- `persistence/FileSaveSlotRepository.ts` — `FileSaveSlotRepository` and `InMemorySaveSlotRepository`.
- `index.ts` — Public infrastructure layer barrel.
