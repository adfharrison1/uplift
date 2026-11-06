import {
  type CompactedTelemetryDigest,
  isHighSignalTelemetryEntry,
  PRESERVED_TELEMETRY_CATEGORIES,
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

function getEvictionAgeKey(record: TelemetryStreamRecord): {
  readonly elapsedMs: number;
  readonly sequence: number;
} {
  if (record.recordType === 'compacted_digest') {
    return {
      elapsedMs: record.lastElapsedMs,
      sequence: record.lastSequence,
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

function routineBucketKey(record: {
  readonly sessionId: string;
  readonly epochId: string;
  readonly category: string;
  readonly actorId: string;
  readonly action: string;
}): string {
  return JSON.stringify([
    record.sessionId,
    record.epochId,
    record.category,
    record.actorId,
    record.action,
  ]);
}

function digestFromEntry(entry: TelemetryEntry): CompactedTelemetryDigest {
  return {
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
  };
}

function mergeDigests(
  left: CompactedTelemetryDigest,
  right: CompactedTelemetryDigest,
): CompactedTelemetryDigest {
  const rightStartedEarlier = right.firstSequence < left.firstSequence;
  return {
    recordType: 'compacted_digest',
    sessionId: left.sessionId,
    epochId: left.epochId,
    level: 'info',
    category: left.category,
    actorId: left.actorId,
    action: left.action,
    count: left.count + right.count,
    firstSequence: Math.min(left.firstSequence, right.firstSequence),
    lastSequence: Math.max(left.lastSequence, right.lastSequence),
    firstElapsedMs: Math.min(left.firstElapsedMs, right.firstElapsedMs),
    lastElapsedMs: Math.max(left.lastElapsedMs, right.lastElapsedMs),
    firstWorldTick: Math.min(left.firstWorldTick, right.firstWorldTick),
    lastWorldTick: Math.max(left.lastWorldTick, right.lastWorldTick),
    sampleMessage: rightStartedEarlier ? right.sampleMessage : left.sampleMessage,
  };
}

function absorbDigest(
  buckets: Map<string, CompactedTelemetryDigest>,
  digest: CompactedTelemetryDigest,
): void {
  const key = routineBucketKey(digest);
  const prior = buckets.get(key);
  buckets.set(key, prior === undefined ? digest : mergeDigests(prior, digest));
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
  if (
    filter.minTick !== undefined &&
    filter.maxTick !== undefined &&
    filter.minTick > filter.maxTick
  ) {
    return false;
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
 * - Tier 1: non-preserved `info` events without `aiReasoning`
 * - Tier 2: `info` events with `aiReasoning` or in `PRESERVED_TELEMETRY_CATEGORIES`
 * - Tier 3: `warn`, `error`, and `crash` events (highest protection)
 */
function getEvictionPriorityTier(record: TelemetryStreamRecord): number {
  if (record.recordType === 'compacted_digest') {
    return 0;
  }
  if (record.level !== 'info') {
    return 3;
  }
  if (record.aiReasoning !== undefined || PRESERVED_TELEMETRY_CATEGORIES.has(record.category)) {
    return 2;
  }
  return 1;
}

/**
 * Enforces `maxCompactedBytes` on a chronological array of `TelemetryStreamRecord` items.
 * If the serialized NDJSON byte length exceeds `maxCompactedBytes`, evicts the oldest lowest-tier
 * records first (routine digests -> plain info -> AI/preserved info -> warn/error/crash).
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

  const items = records.map((record) => {
    const lineBytes = Buffer.byteLength(JSON.stringify(record), 'utf8') + 1;
    return {
      record,
      lineBytes,
      tier: getEvictionPriorityTier(record),
      evicted: false,
    };
  });

  let totalBytes = items.reduce((sum, item) => sum + item.lineBytes, 0);
  if (totalBytes <= maxCompactedBytes) {
    return [...records];
  }

  const evictionOrder = [...items].sort((a, b) => {
    const keyA = getEvictionAgeKey(a.record);
    const keyB = getEvictionAgeKey(b.record);
    if (keyA.elapsedMs !== keyB.elapsedMs) {
      return keyA.elapsedMs - keyB.elapsedMs;
    }
    return keyA.sequence - keyB.sequence;
  });

  for (let tier = 0; tier <= 3 && totalBytes > maxCompactedBytes; tier += 1) {
    for (const item of evictionOrder) {
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
 *   into a single `CompactedTelemetryDigest` (and merged with any existing digest for the same bucket).
 * - Enforces `maxCompactedBytes` (default 500 MiB) on the resulting compacted stream.
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

  const routineBuckets = new Map<string, CompactedTelemetryDigest>();
  const preservedCompacted: TelemetryStreamRecord[] = [];
  for (const record of existingCompacted) {
    if (record.recordType === 'compacted_digest') {
      absorbDigest(routineBuckets, record);
    } else {
      preservedCompacted.push(record);
    }
  }

  if (activeEntries.length === 0) {
    const coalesced = sortTelemetryRecords([...preservedCompacted, ...routineBuckets.values()]);
    return {
      compactedRecords: enforceCompactedStorageCap(coalesced, maxCompactedBytes),
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

  for (const entry of activeEntries) {
    if (entry.elapsedSessionMs > cutoffElapsedMs) {
      retainedActiveEntries.push(entry);
      continue;
    }

    if (isHighSignalTelemetryEntry(entry)) {
      newlyCompactedVerbatim.push(entry);
      continue;
    }

    absorbDigest(routineBuckets, digestFromEntry(entry));
  }

  const combinedCompacted = sortTelemetryRecords([
    ...preservedCompacted,
    ...newlyCompactedVerbatim,
    ...routineBuckets.values(),
  ]);

  return {
    compactedRecords: enforceCompactedStorageCap(combinedCompacted, maxCompactedBytes),
    retainedActiveEntries,
  };
}
