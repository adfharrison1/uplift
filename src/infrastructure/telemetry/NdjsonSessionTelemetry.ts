import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import {
  type SessionTelemetryPort,
  type TelemetryClock,
  type TelemetryEntry,
  type TelemetryEventInput,
  TelemetryEventInputSchema,
  type TelemetryQueryFilter,
  type TelemetryStreamRecord,
  TelemetryStreamRecordSchema,
} from '../../domain/index.js';
import {
  compactTelemetryWindow,
  DEFAULT_TELEMETRY_STORAGE_BUDGET,
  matchesTelemetryFilter,
  sortTelemetryRecords,
  type TelemetryStorageBudget,
} from './RollingLogCompactor.js';

export const ACTIVE_SESSION_LOG_FILENAME = 'current-session.jsonl';
export const COMPACTED_SESSION_LOG_FILENAME = 'current-session.compacted.jsonl';

/**
 * Runtime wall-clock provider for infrastructure telemetry stamping.
 */
export function systemTelemetryClock(sessionStartedAtMs: number = Date.now()): TelemetryClock {
  return {
    nowIso: () => new Date().toISOString(),
    elapsedSessionMs: () => Math.max(0, Date.now() - sessionStartedAtMs),
  };
}

/**
 * Deterministic fixed clock for unit and headless simulation tests.
 */
export function fixedTelemetryClock(iso: string, elapsedMs: number): TelemetryClock {
  return {
    nowIso: () => iso,
    elapsedSessionMs: () => elapsedMs,
  };
}

export type SafeJsonParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: { readonly message: string } };

/**
 * Safely parses a JSON string and validates it against a Zod schema in one step using `safeParse`.
 * Fails closed when `rawJson` is not valid JSON.
 */
export function safeParseJsonWithSchema<T>(
  rawJson: string,
  schema: z.ZodType<T>,
): SafeJsonParseResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: { message: `Invalid JSON: ${message}` },
    };
  }
  return schema.safeParse(parsed);
}

/**
 * Parses an NDJSON string into validated `TelemetryStreamRecord` items via Zod `safeParse`,
 * safely skipping empty or malformed/truncated lines without throwing.
 */
export function parseNdjsonLines(rawContent: string): ReadonlyArray<TelemetryStreamRecord> {
  const lines = rawContent.split('\n');
  const records: TelemetryStreamRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const result = safeParseJsonWithSchema(trimmed, TelemetryStreamRecordSchema);
    if (result.success) {
      records.push(result.data);
    }
  }

  return records;
}

/**
 * Fast in-memory implementation of `SessionTelemetryPort` for unit and headless simulation tests.
 */
export class InMemorySessionTelemetry implements SessionTelemetryPort {
  private sessionId: string;
  private clock: TelemetryClock;
  private readonly budget: TelemetryStorageBudget;
  private sequence = 0;
  private activeEntries: TelemetryEntry[] = [];
  private compactedRecords: TelemetryStreamRecord[] = [];

  public constructor(
    initialSessionId = 'session-default',
    clock: TelemetryClock = systemTelemetryClock(),
    budget: Partial<TelemetryStorageBudget> = {},
  ) {
    this.sessionId = initialSessionId;
    this.clock = clock;
    this.budget = {
      ...DEFAULT_TELEMETRY_STORAGE_BUDGET,
      ...budget,
    };
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public setClock(clock: TelemetryClock): void {
    this.clock = clock;
  }

  public startNewSession(sessionId: string, clock?: TelemetryClock): void {
    const trimmed = sessionId.trim();
    if (trimmed.length === 0) {
      throw new Error('sessionId must be a non-empty string');
    }
    this.sessionId = trimmed;
    if (clock !== undefined) {
      this.clock = clock;
    }
    this.sequence = 0;
    this.activeEntries = [];
    this.compactedRecords = [];
  }

  public record(event: TelemetryEventInput): TelemetryEntry {
    const validated = TelemetryEventInputSchema.parse(event);
    this.sequence += 1;
    const entry: TelemetryEntry = {
      ...validated,
      recordType: 'event',
      sessionId: this.sessionId,
      sequence: this.sequence,
      timestampIso: this.clock.nowIso(),
      elapsedSessionMs: this.clock.elapsedSessionMs(),
    };
    this.activeEntries.push(entry);
    return entry;
  }

  public compact(retentionWindowMs: number = this.budget.defaultRetentionWindowMs): void {
    const result = compactTelemetryWindow(
      this.activeEntries,
      this.compactedRecords,
      retentionWindowMs,
      this.budget.maxCompactedLogBytes,
    );
    this.compactedRecords = [...result.compactedRecords];
    this.activeEntries = [...result.retainedActiveEntries];
  }

  public query(filter?: TelemetryQueryFilter): ReadonlyArray<TelemetryStreamRecord> {
    const all = sortTelemetryRecords([...this.compactedRecords, ...this.activeEntries]);
    return all.filter((record) => matchesTelemetryFilter(record, filter));
  }
}

/**
 * Disk-backed NDJSON implementation of `SessionTelemetryPort` writing to:
 * - `<logsDir>/current-session.jsonl` (auto-compacts when exceeding `maxActiveLogBytes`, default 50 MiB)
 * - `<logsDir>/current-session.compacted.jsonl` (capped at `maxCompactedLogBytes`, default 500 MiB)
 */
export class NdjsonSessionTelemetry implements SessionTelemetryPort {
  private readonly logsDir: string;
  private readonly activeLogPath: string;
  private readonly compactedLogPath: string;
  private readonly budget: TelemetryStorageBudget;
  private sessionId: string;
  private clock: TelemetryClock;
  private sequence = 0;
  private activeLogBytes = 0;

  public constructor(
    logsDir: string,
    initialSessionId = 'session-default',
    clock: TelemetryClock = systemTelemetryClock(),
    budget: Partial<TelemetryStorageBudget> = {},
  ) {
    this.logsDir = logsDir;
    this.activeLogPath = join(logsDir, ACTIVE_SESSION_LOG_FILENAME);
    this.compactedLogPath = join(logsDir, COMPACTED_SESSION_LOG_FILENAME);
    this.budget = {
      ...DEFAULT_TELEMETRY_STORAGE_BUDGET,
      ...budget,
    };
    this.sessionId = initialSessionId;
    this.clock = clock;
    this.startNewSession(initialSessionId, clock);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getActiveLogPath(): string {
    return this.activeLogPath;
  }

  public getCompactedLogPath(): string {
    return this.compactedLogPath;
  }

  public getStorageBudget(): TelemetryStorageBudget {
    return this.budget;
  }

  public setClock(clock: TelemetryClock): void {
    this.clock = clock;
  }

  /**
   * Starts a new play session and purges previous session logs on disk so only the latest session is kept.
   */
  public startNewSession(sessionId: string, clock?: TelemetryClock): void {
    const trimmed = sessionId.trim();
    if (trimmed.length === 0) {
      throw new Error('sessionId must be a non-empty string');
    }
    this.sessionId = trimmed;
    if (clock !== undefined) {
      this.clock = clock;
    }
    this.sequence = 0;
    this.activeLogBytes = 0;

    mkdirSync(this.logsDir, { recursive: true });
    this.writeAtomic(this.activeLogPath, '');
    this.writeAtomic(this.compactedLogPath, '');
  }

  public record(event: TelemetryEventInput): TelemetryEntry {
    const [entry] = this.recordBatch([event]);
    if (entry === undefined) {
      throw new Error('Failed to record telemetry event');
    }
    return entry;
  }

  /**
   * Appends a batch of events in a single atomic filesystem append operation,
   * tracking `activeLogBytes` in memory and automatically triggering rolling compaction
   * if `current-session.jsonl` exceeds `maxActiveLogBytes` (default 50 MiB).
   */
  public recordBatch(events: ReadonlyArray<TelemetryEventInput>): ReadonlyArray<TelemetryEntry> {
    if (events.length === 0) {
      return [];
    }
    const validatedEvents = events.map((event) => TelemetryEventInputSchema.parse(event));
    const entries: TelemetryEntry[] = [];
    const lines: string[] = [];

    for (const validated of validatedEvents) {
      this.sequence += 1;
      const entry: TelemetryEntry = {
        ...validated,
        recordType: 'event',
        sessionId: this.sessionId,
        sequence: this.sequence,
        timestampIso: this.clock.nowIso(),
        elapsedSessionMs: this.clock.elapsedSessionMs(),
      };
      entries.push(entry);
      lines.push(`${JSON.stringify(entry)}\n`);
    }

    const payload = lines.join('');
    appendFileSync(this.activeLogPath, payload, 'utf8');
    this.activeLogBytes += Buffer.byteLength(payload, 'utf8');

    if (this.activeLogBytes > this.budget.maxActiveLogBytes) {
      this.compact(this.budget.defaultRetentionWindowMs);
    }

    return entries;
  }

  public compact(retentionWindowMs: number = this.budget.defaultRetentionWindowMs): void {
    const activeRecords = this.readFileRecords(this.activeLogPath).filter(
      (r): r is TelemetryEntry => r.recordType === 'event',
    );
    const existingCompacted = this.readFileRecords(this.compactedLogPath);

    const result = compactTelemetryWindow(
      activeRecords,
      existingCompacted,
      retentionWindowMs,
      this.budget.maxCompactedLogBytes,
    );

    const compactedText =
      result.compactedRecords.length > 0
        ? `${result.compactedRecords.map((r) => JSON.stringify(r)).join('\n')}\n`
        : '';
    const activeText =
      result.retainedActiveEntries.length > 0
        ? `${result.retainedActiveEntries.map((r) => JSON.stringify(r)).join('\n')}\n`
        : '';

    this.writeAtomic(this.compactedLogPath, compactedText);
    this.writeAtomic(this.activeLogPath, activeText);
    this.activeLogBytes = Buffer.byteLength(activeText, 'utf8');
  }

  public query(filter?: TelemetryQueryFilter): ReadonlyArray<TelemetryStreamRecord> {
    const compacted = this.readFileRecords(this.compactedLogPath);
    const active = this.readFileRecords(this.activeLogPath);
    const combined = sortTelemetryRecords([...compacted, ...active]);
    return combined.filter((record) => matchesTelemetryFilter(record, filter));
  }

  private readFileRecords(filePath: string): ReadonlyArray<TelemetryStreamRecord> {
    if (!existsSync(filePath)) {
      return [];
    }
    const raw = readFileSync(filePath, 'utf8');
    return parseNdjsonLines(raw);
  }

  private writeAtomic(targetPath: string, content: string): void {
    const tmpPath = `${targetPath}.tmp`;
    writeFileSync(tmpPath, content, 'utf8');
    renameSync(tmpPath, targetPath);
  }
}
