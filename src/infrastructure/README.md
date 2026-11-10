# Infrastructure Layer (`src/infrastructure/`)

## Purpose

`src/infrastructure/` provides concrete, 100% local/offline implementations of domain ports:

- **Structured Session Telemetry & Rolling Compaction (`telemetry/`)**:
  - `NdjsonSessionTelemetry` and `InMemorySessionTelemetry` record every player, NPC, rival operative, orbital, and system event—plus full AI inputs, outputs, reasoning, and omitted `AdvisoryDuel` clauses—to `./logs/current-session.jsonl`.
  - Rotates previous active/compacted files byte-for-byte into numbered groups under `logs/prev/`, retaining three completed groups by default (`maxPreviousSessions`). Current queries read only the current files. Enforces a **50 MiB** active log auto-compaction trigger (`DEFAULT_MAX_ACTIVE_LOG_BYTES`) and a **500 MiB** compacted log priority-eviction cap (`DEFAULT_MAX_COMPACTED_LOG_BYTES`) via `RollingLogCompactor`.
- **Multi-Session Save / Load Repository (`persistence/`)**:
  - `FileSaveSlotRepository` and `InMemorySaveSlotRepository` persist and restore named session save files in `./saves/<slotId>.json` with shared path confinement, exclusively created temporary files for atomic replacement, and Zod `safeParse` validation.

## Current Module Inventory

- `telemetry/RollingLogCompactor.ts` — `compactTelemetryWindow`, `enforceCompactedStorageCap`, `matchesTelemetryFilter`, `sortTelemetryRecords`, and 50 MiB / 500 MiB storage budget constants.
- `telemetry/NdjsonSessionTelemetry.ts` — `NdjsonSessionTelemetry`, `InMemorySessionTelemetry`, `systemTelemetryClock`, `fixedTelemetryClock`, `safeParseJsonWithSchema`, and `parseNdjsonLines`.
- `persistence/safeLocalFiles.ts` — Confined reads, appends, exclusive creation, atomic replacement, listing, moves and deletion; typed `LocalFileOps` and temporary-name dependencies for storage fault tests.
- `persistence/FileSaveSlotRepository.ts` — `FileSaveSlotRepository` and `InMemorySaveSlotRepository`.
- `index.ts` — Public infrastructure layer barrel.

## Storage boundaries and recovery

Storage adapters reject symlinks, including dangling links, in configured roots, application-controlled parents, files and temporary paths. They recheck paths on each operation, check opened file types and use no-follow opens where supported. Missing directories are created only through checked ancestors. Trusted macOS system aliases such as `/tmp` and `/var` are resolved once above the application path. This is a single-writer local storage policy; it does not isolate storage from a malicious process already running as the same OS user.

The logger's optional fifth `SessionStorageOptions` argument sets positive integer `maxPreviousSessions` (default 3), trusted filesystem dependencies and `onDiagnostic`. Retention is independent of byte budgets. Session IDs and clocks never form archive paths. A rotation reserves `prev/session-<sequence>.pending`, moves existing logs there, creates fresh current files exclusively, then finalizes the group before publishing new session metadata. Invalid configuration is rejected before filesystem mutation.

A constructor failure throws `SessionStorageError`. A failed explicit start retains the last committed session metadata and blocks record/batch/compact with `TelemetryStorageUnavailableError` until an explicit start succeeds. Old files remain at their original path or in the pending group; new empty files may remain. Stop the writer and inspect both locations before manually recovering a pending group. Automatic retries never resume, overwrite or prune pending groups. Current queries do not search archives.

After a successful start, pruning removes only the oldest managed completed groups. Suspicious entries and unrelated contents are left alone. Prune failures can leave more than the configured number of groups but do not disable current logging. Cleanup of an expired group can be partial; its remaining files stay in that group for a later pruning attempt. The newest retained groups are left intact. Diagnostics contain relative recovery paths and error codes, default to local stderr and tolerate a failing callback. Incomplete or unprunable groups require manual inspection and may exceed the normal retention budget.
