# Agent Guide — Infrastructure Layer (`src/infrastructure/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/`, `zod`, and approved local runtime packages (including Node `node:fs`/`node:path`).
2. **Forbidden Imports**: Must NEVER import from `src/application/`, `src/interfaces/`, `src/content/`, or `three`.
3. **100% Local / Zero API Keys**: Never add HTTP clients calling external LLM APIs (OpenAI, Anthropic, OpenRouter, etc.). The shipped adapters provide telemetry and persistence; there is no model worker, model cache setup command or inference dependency.
4. **Zod `safeParse` for Disk/JSON Inputs**: Always use `safeParseJsonWithSchema(rawJson, Schema)` when reading JSON or NDJSON from disk so corrupted or truncated lines/files are handled safely without uncaught exceptions or `as` casts.
5. **Telemetry Storage Caps & Save Safety**: Treat `50 MiB` as the active auto-compaction trigger, not a hard active-file cap: the retained recent window may still exceed it. The compacted stream has a `500 MiB` priority-eviction cap; even high-signal records can eventually be evicted. Use `safeLocalFiles.ts` for disk reads, appends, writes, lists, moves and deletion. Validate `slotId` with `validateSaveSlotId`; serialize and schema-check before exclusive temporary creation and atomic replacement. Reject root/parent/file/temp symlinks, including dangling links, and recheck paths on each operation.
6. **Fast Unit Test Fallback**: Always provide an in-memory implementation (`InMemorySessionTelemetry`, `InMemorySaveSlotRepository`) alongside disk adapters so unit and headless simulation tests run in `<3s`.
   Preserve optional pack ID/version in file and in-memory save envelopes and listing metadata without inferring identity when absent. Keep the file repository's confinement and atomic replacement checks on the same path.
7. **Zero `any`**: Implicit and explicit `any` are forbidden.

## Session retention and failure handling

- `NdjsonSessionTelemetry` takes optional `SessionStorageOptions` as its fifth argument. Validate positive integer `maxPreviousSessions` (default 3) before filesystem mutation; keep it independent of active/compacted byte budgets.
- One writer owns a logs root. Reserve monotonic numbered `.pending` groups, move existing files byte-for-byte, exclusively create fresh current files, finalize the group, then publish metadata and prune. Never derive paths from session IDs or clocks.
- Initialization failure preserves old bytes at original or pending paths. Constructor failure throws; explicit-start failure disables record/batch/compact until successful explicit retry and retains last committed metadata. Do not automatically resume, overwrite or prune pending groups.
- Prune only oldest managed completed groups after successful initialization. Leave symlinks and unrelated entries untouched; report failures through relative-path diagnostics without disabling the current session. Diagnostic callback exceptions must be contained.
- Use typed `LocalFileOps` and deterministic temporary-name dependencies for real-directory fault injection. No global filesystem mocks. Portable checks do not promise isolation from a hostile same-user process; inspect pending groups manually with the writer stopped.
