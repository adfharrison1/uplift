---
name: uplift-debug
description: Use when investigating Uplift simulation, AI, rendering or persistence symptoms using session telemetry, NDJSON logs or save snapshots, including missing traces and session-storage failures.
---

# Uplift debugging

Trace the actual producer, transport, storage and consumer before interpreting missing evidence. Use [uplift-review-gates](../uplift-review-gates/SKILL.md) for fixes and retained findings. Read the relevant scoped guides before editing code.

## Establish which session and adapter ran

| Path             | Shipped behavior and evidence                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser campaign | `src/interfaces/composition/browserMain.ts` injects `BrowserSessionTelemetry`: at most 2,048 in-memory events, oldest removed, compaction a no-op. Its `BrowserSaveRepository` is also in memory. Reloading loses these records.                                                                                                               |
| Local dev bridge | `src/interfaces/vite/localDiskBridgePlugin.ts` creates the disk logger and save repository. Explicit telemetry session/batch/compact requests and save requests have handlers, but the campaign does not send its telemetry or game saves to them. The browser's bridge transport saves scene/character visual assets, not campaign snapshots. |
| Node storage     | `NdjsonSessionTelemetry` writes supplied events under its configured logs directory; `FileSaveSlotRepository` writes supplied envelopes under its configured saves directory. Defaults in the bridge are `./logs` and `./saves`.                                                                                                               |

The domain contract in `src/domain/telemetry/SessionTelemetryPort.ts` supports `aiReasoning` for utility, hybrid NLP, advisory duel and rival pipelines. That schema does not prove those producers ran. Locate a real recording call before promising candidate scores, omitted clauses or any AI trace. Category is a nonempty string, not a closed enum. `inputs`, `effects`, `acteeId` and `aiReasoning` are optional.

An empty disk query can mean an unwired browser producer, no matching events, missing files, skipped malformed lines, rotation or eviction. It does not establish that the simulation did nothing. Record which explanation the evidence supports.

## Query existing logs without changing them

Use the read-only CLI; **do not instantiate `NdjsonSessionTelemetry` to inspect logs**, because its constructor starts a session and rotates current files. Do not start/restart the dev server just to inspect an existing session.

```bash
npm run logs:query -- --logs-dir ./logs --level error
npm run logs:query -- --logs-dir ./logs --actor char_player_operative --min-tick 10 --max-tick 50
npm run logs:query -- --logs-dir ./logs --has-ai-reasoning
```

Replace example IDs with observed ones. `--level` is an exact match; query warn, error and crash separately. Supported flags are `--logs-dir`, `--level`, `--category`, `--actor` / `--actor-id`, `--actee` / `--actee-id`, `--action`, `--min-tick`, `--max-tick`, and `--has-ai-reasoning` (bare means true; explicit true/false supported). There are no limit, tail, help or recursive-archive flags. Unknown flags, missing required values, invalid levels/noninteger ticks and inverted tick ranges fail.

`src/interfaces/cli/queryLogs.ts` reads only `current-session.compacted.jsonl` and `current-session.jsonl` in the chosen directory. It emits matching NDJSON sorted by elapsed-session time, then sequence (digest first-time/first-sequence). Missing files contribute no records; malformed/truncated lines are skipped. Inspect raw copied bytes if corruption matters. Query a specific prior-session directory with `--logs-dir`; archives are never searched automatically. File existence alone does not prove it belongs to the reported session: check `sessionId`, sequence and timestamps.

Tick bounds are inclusive for events. A digest matches when its tick range overlaps the requested range; its count covers the full bucket, not just that range. Digests cannot match an actee or `--has-ai-reasoning true`; false includes digests and events without reasoning.

## Understand retention and storage health

Read `src/infrastructure/telemetry/RollingLogCompactor.ts` for current constants and classification:

- **50 MiB active threshold** triggers compaction after append; it is not a hard active-file bound. The default **60,000 ms** window uses the latest event's elapsed time. Entries at or before the cutoff compact; newer entries remain active.
- Ordinary info entries fold into digests by session, epoch, category, actor and action. Counts, sequence/time/tick bounds and a sample message survive; full individual payloads do not.
- Non-info entries, AI reasoning and the preserved categories (`player`, `rival`, `office`, `pretext`, `emergency`, `martyrdom`, `correspondence`, `orbital`, `legacy`) avoid digesting. **They can still be evicted.** The **500 MiB compacted cap** evicts oldest records within priority tiers: routine digests, plain info, AI/preserved info, then warn/error/crash. No tier has unlimited retention.

The disk logger rotates old files into numbered `logs/prev/session-<sequence>` groups and normally retains three completed groups. It uses `.pending` groups during rotation. Failed startup throws `SessionStorageError`; after a failed explicit start, record/batch/compact remain unavailable until an explicit start succeeds. Prune failure can leave extra groups while current logging continues. Diagnostics default to stderr; absence of current events is not a storage-health check.

Follow [infrastructure recovery guidance](../../../src/infrastructure/README.md#storage-boundaries-and-recovery): stop the writer, preserve current and pending bytes, inspect diagnostics and locations, and recover explicitly. Pending groups are not automatically resumed or pruned. Do not delete evidence or promise atomic recovery across both compaction files; each replacement is atomic separately.

## Save snapshots and deterministic reproduction

Disk saves are `<savesDir>/<slotId>.json`. `src/domain/persistence/SaveSlotRepositoryPort.ts` defines the envelope: schema version 1, slot/epoch/tick/time, nonzero unsigned 32-bit RNG state, state-slice record and optional legacy record. Envelope validation is not complete validation of every nested simulation value. `FileSaveSlotRepository` checks IDs, schema and matching slot ID, uses confined atomic file replacement, and skips corrupt ordinary slots when listing; unsafe paths still fail. Listing no slot is not proof that no corrupt file exists.

Preserve the original snapshot before investigation. Reproduction needs the matching code/content registry, epoch/pack, complete coordinator world/custom-slice snapshot and legacy state, RNG state, pacing, clock and input/effect/frame-step sequence. Inspect `SimulationCoordinator.saveToSlot` / `loadFromSlot` in `src/application/simulation/SimulationCoordinator.ts` for the actual snapshot format. Use `SeededRandom.fromState` and `fixedTelemetryClock` in appropriate test layers; RNG alone or an optional telemetry input payload is not a replay.

Trace a symptom through the actual entry point → producer → adapter → query/save consumer → observable outcome. Reproduce the failing behavior with the available evidence, fix in the appropriate layer, and run targeted tests plus `npm run verify`. Report what was observed, what was inferred and what remains unavailable. Never claim a browser-to-disk or AI consumer trace from a schema-only or producer-only test.
