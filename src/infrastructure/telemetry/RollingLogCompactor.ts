import {
  type CompactedTelemetryDigest,
  isHighSignalTelemetryEntry,
  type TelemetryEntry,
  type TelemetryQueryFilter,
  type TelemetryStreamRecord,
} from '../../domain/index.js';

export const DEFAULT_MAX_ACTIVE_LOG_BYTES = 50 * 1024 * 1024; // 50 MiB
export const DEFAULT_MAX_COMPACTED_LOG_BYTES = 500 * 1024 * 1024; // 500 MiB
export const DEFAULT_RETENTION_WINDOW_MS = 60_000; // 60 seconds

export interface TelemetryStorageBudget {
  readonly maxActiveLogBytes: number;
  readonly maxCompactedLogBytes: number;
  readonly defaultRetentionWindowMs: number;
}

export const DEFAULT_TELEMETRY_STORAGE_BUDGET: TelemetryStorageBudget = Object.freeze({
  maxActiveLogBytes: DEFAULT_MAX_ACTIVE_LOG_BYTES,
  maxCompactedLogBytes: DEFAULT_MAX_COMPACTED_LOG_BYTES,
  defaultRetentionWindowMs: DEFAULT_RETENTION_WINDOW_MS,
});

export interface CompactionResult {
  readonly compactedRecords: ReadonlyArray<TelemetryStreamRecord>;
  readonly retainedActiveEntries: ReadonlyArray<TelemetryEntry>;
}

function getRecordSortKey(record: TelemetryStreamRecord): {
  readonly elapsedMs: number;
  readonly sequence: number;
} {
  if (record.recordType === 'compacted_digest') {
    return {
      elapsedMs: record.firstElapsedMs,
      sequence: record.firstSequence,
    };
  }
  return {
    elapsedMs: record.elapsedSessionMs,
    sequence: record.sequence,
  };
}

export function sortTelemetryRecords(
  records: ReadonlyArray<TelemetryStreamRecord>,
): ReadonlyArray<TelemetryStreamRecord> {
  return [...records].sort((a, b) => {
    const keyA = getRecordSortKey(a);
    const keyB = getRecordSortKey(b);
    if (keyA.elapsedMs !== keyB.elapsedMs) {
      return keyA.elapsedMs - keyB.elapsedMs;
    }
    return keyA.sequence - keyB.sequence;
  });
}

/**
 * Evaluates whether a `TelemetryStreamRecord` (raw event or compacted digest) matches `filter`.
 */
export function matchesTelemetryFilter(
  record: TelemetryStreamRecord,
  filter?: TelemetryQueryFilter,
): boolean {
  if (filter === undefined) {
    return true;
  }
  if (filter.level !== undefined && record.level !== filter.level) {
    return false;
  }
  if (filter.category !== undefined && record.category !== filter.category) {
    return false;
  }
  if (filter.actorId !== undefined && record.actorId !== filter.actorId) {
    return false;
  }
  if (filter.action !== undefined && record.action !== filter.action) {
    return false;
  }

  if (record.recordType === 'compacted_digest') {
    if (filter.acteeId !== undefined) {
      return false;
    }
    if (filter.hasAiReasoning === true) {
      return false;
    }
    if (filter.minTick !== undefined && record.lastWorldTick < filter.minTick) {
      return false;
    }
    if (filter.maxTick !== undefined && record.firstWorldTick > filter.maxTick) {
      return false;
    }
    return true;
  }

  if (filter.acteeId !== undefined && record.acteeId !== filter.acteeId) {
    return false;
  }
  if (filter.minTick !== undefined && record.worldTick < filter.minTick) {
    return false;
  }
  if (filter.maxTick !== undefined && record.worldTick > filter.maxTick) {
    return false;
  }
  if (filter.hasAiReasoning !== undefined) {
    const hasReasoning = record.aiReasoning !== undefined;
    if (hasReasoning !== filter.hasAiReasoning) {
      return false;
    }
  }
  return true;
}

/**
 * Returns an eviction priority tier for compacted records (lower tier = evicted first when over byte budget):
 * - Tier 0: `compacted_digest` routine summaries
 * - Tier 1: `info` events without `aiReasoning`
 * - Tier 2: `info` events with `aiReasoning`
 * - Tier 3: `warn`, `error`, and `crash` events (highest protection)
 */
function getEvictionPriorityTier(record: TelemetryStreamRecord): number {
  if (record.recordType === 'compacted_digest') {
    return 0;
  }
  if (record.level !== 'info') {
    return 3;
  }
  if (record.aiReasoning !== undefined) {
    return 2;
  }
  return 1;
}

/**
 * Enforces `maxCompactedBytes` on a chronological array of `TelemetryStreamRecord` items.
 * If the serialized NDJSON byte length exceeds `maxCompactedBytes`, evicts the oldest lowest-tier
 * records first (routine digests -> plain info -> AI info -> warn/error/crash).
 */
export function enforceCompactedStorageCap(
  records: ReadonlyArray<TelemetryStreamRecord>,
  maxCompactedBytes: number,
): ReadonlyArray<TelemetryStreamRecord> {
  if (maxCompactedBytes <= 0 || !Number.isFinite(maxCompactedBytes)) {
    throw new RangeError(
      `maxCompactedBytes must be a positive finite number, received: ${String(maxCompactedBytes)}`,
    );
  }
  if (records.length === 0) {
    return [];
  }

  const items = records.map((record, index) => {
    const lineBytes = Buffer.byteLength(`${JSON.stringify(record)}\n`, 'utf8');
    return {
      record,
      index,
      lineBytes,
      tier: getEvictionPriorityTier(record),
      evicted: false,
    };
  });

  let totalBytes = items.reduce((sum, item) => sum + item.lineBytes, 0);
  if (totalBytes <= maxCompactedBytes) {
    return [...records];
  }

  // Evict in tier order (0 -> 1 -> 2 -> 3), oldest first within each tier
  for (let tier = 0; tier <= 3 && totalBytes > maxCompactedBytes; tier += 1) {
    for (const item of items) {
      if (totalBytes <= maxCompactedBytes) {
        break;
      }
      if (!item.evicted && item.tier === tier) {
        item.evicted = true;
        totalBytes -= item.lineBytes;
      }
    }
  }

  return items.filter((item) => !item.evicted).map((item) => item.record);
}

/**
 * Compacts entries older than `latestElapsedMs - retentionWindowMs`:
 * - High-signal entries (`warn`/`error`/`crash`, `aiReasoning`, or preserved categories) are kept verbatim.
 * - Repetitive routine `info` entries sharing `(sessionId, epochId, category, actorId, action)` are folded
 *   into a single `CompactedTelemetryDigest`.
 * - Optionally enforces `maxCompactedBytes` (default 500 MiB) on the resulting compacted stream.
 */
export function compactTelemetryWindow(
  activeEntries: ReadonlyArray<TelemetryEntry>,
  existingCompacted: ReadonlyArray<TelemetryStreamRecord>,
  retentionWindowMs: number,
  maxCompactedBytes: number = DEFAULT_MAX_COMPACTED_LOG_BYTES,
): CompactionResult {
  if (retentionWindowMs < 0 || !Number.isFinite(retentionWindowMs)) {
    throw new RangeError(
      `retentionWindowMs must be a non-negative finite number, received: ${String(retentionWindowMs)}`,
    );
  }
  if (activeEntries.length === 0) {
    return {
      compactedRecords: enforceCompactedStorageCap(existingCompacted, maxCompactedBytes),
      retainedActiveEntries: [],
    };
  }

  let maxElapsedMs = 0;
  for (const entry of activeEntries) {
    if (entry.elapsedSessionMs > maxElapsedMs) {
      maxElapsedMs = entry.elapsedSessionMs;
    }
  }
  const cutoffElapsedMs = maxElapsedMs - retentionWindowMs;

  const retainedActiveEntries: TelemetryEntry[] = [];
  const newlyCompactedVerbatim: TelemetryEntry[] = [];
  const routineBuckets = new Map<string, CompactedTelemetryDigest>();

  for (const entry of activeEntries) {
    if (entry.elapsedSessionMs > cutoffElapsedMs) {
      retainedActiveEntries.push(entry);
      continue;
    }

    if (isHighSignalTelemetryEntry(entry)) {
      newlyCompactedVerbatim.push(entry);
      continue;
    }

    const bucketKey = `${entry.sessionId}::${entry.epochId}::${entry.category}::${entry.actorId}::${entry.action}`;
    const existingDigest = routineBuckets.get(bucketKey);

    if (existingDigest === undefined) {
      routineBuckets.set(bucketKey, {
        recordType: 'compacted_digest',
        sessionId: entry.sessionId,
        epochId: entry.epochId,
        level: 'info',
        category: entry.category,
        actorId: entry.actorId,
        action: entry.action,
        count: 1,
        firstSequence: entry.sequence,
        lastSequence: entry.sequence,
        firstElapsedMs: entry.elapsedSessionMs,
        lastElapsedMs: entry.elapsedSessionMs,
        firstWorldTick: entry.worldTick,
        lastWorldTick: entry.worldTick,
        sampleMessage: entry.message,
      });
    } else {
      routineBuckets.set(bucketKey, {
        ...existingDigest,
        count: existingDigest.count + 1,
        firstSequence: Math.min(existingDigest.firstSequence, entry.sequence),
        lastSequence: Math.max(existingDigest.lastSequence, entry.sequence),
        firstElapsedMs: Math.min(existingDigest.firstElapsedMs, entry.elapsedSessionMs),
        lastElapsedMs: Math.max(existingDigest.lastElapsedMs, entry.elapsedSessionMs),
        firstWorldTick: Math.min(existingDigest.firstWorldTick, entry.worldTick),
        lastWorldTick: Math.max(existingDigest.lastWorldTick, entry.worldTick),
      });
    }
  }

  const combinedCompacted = sortTelemetryRecords([
    ...existingCompacted,
    ...newlyCompactedVerbatim,
    ...routineBuckets.values(),
  ]);

  return {
    compactedRecords: enforceCompactedStorageCap(combinedCompacted, maxCompactedBytes),
    retainedActiveEntries,
  };
}
