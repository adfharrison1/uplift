import { join } from 'node:path';
import {
  createSafeLocalFiles,
  localFileErrorCode,
  UnsafeLocalPathError,
  type LocalFileOptions,
  type SafeLocalFiles,
} from '../persistence/safeLocalFiles.js';
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

export interface SessionStorageDiagnostic {
  readonly operation: 'rotation' | 'prune' | 'archive';
  readonly path: string;
  readonly code: string;
}

export interface SessionStorageOptions extends LocalFileOptions {
  readonly maxPreviousSessions?: number;
  readonly onDiagnostic?: (diagnostic: SessionStorageDiagnostic) => void;
}

export class SessionStorageError extends Error {
  public constructor(cause: unknown) {
    super('Session storage operation failed', { cause });
    this.name = 'SessionStorageError';
  }
}

export class TelemetryStorageUnavailableError extends Error {
  public constructor() {
    super('Telemetry storage unavailable');
    this.name = 'TelemetryStorageUnavailableError';
  }
}

interface ArchiveGroup {
  readonly name: string;
  readonly sequence: number;
  readonly pending: boolean;
}

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
  private readonly files: SafeLocalFiles;
  private readonly maxPreviousSessions: number;
  private readonly onDiagnostic: (diagnostic: SessionStorageDiagnostic) => void;
  private available = false;
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
    options: SessionStorageOptions = {},
  ) {
    this.maxPreviousSessions = options.maxPreviousSessions ?? 3;
    if (
      !Number.isFinite(this.maxPreviousSessions) ||
      !Number.isInteger(this.maxPreviousSessions) ||
      this.maxPreviousSessions < 1
    ) {
      throw new RangeError('maxPreviousSessions must be a positive finite integer');
    }
    this.onDiagnostic =
      options.onDiagnostic ??
      ((diagnostic) => {
        process.stderr.write(`${JSON.stringify(diagnostic)}\n`);
      });
    try {
      this.files = createSafeLocalFiles(logsDir, options);
    } catch (error) {
      throw new SessionStorageError(error);
    }
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

  /** Preserve old files before publishing new metadata; pending groups require manual recovery. */
  public startNewSession(sessionId: string, clock?: TelemetryClock): void {
    this.available = false;
    let recoveryPath = '.';
    try {
      const trimmed = sessionId.trim();
      if (trimmed.length === 0) throw new Error('sessionId must be a non-empty string');
      const oldFiles = [ACTIVE_SESSION_LOG_FILENAME, COMPACTED_SESSION_LOG_FILENAME].filter(
        (name) => {
          const stat = this.files.stat(name);
          if (stat !== undefined && !stat.isFile()) throw new UnsafeLocalPathError();
          return stat !== undefined;
        },
      );
      const groups = this.archiveGroups();
      let pending: string | undefined;
      let completed: string | undefined;
      if (oldFiles.length > 0) {
        const highest = groups.reduce((max, group) => Math.max(max, group.sequence), 0);
        if (highest >= Number.MAX_SAFE_INTEGER) throw new RangeError('Archive sequence exhausted');
        completed = `prev/session-${String(highest + 1).padStart(16, '0')}`;
        pending = `${completed}.pending`;
        recoveryPath = pending;
        this.files.ensureDirectory('prev');
        this.files.ensureDirectory(pending, true);
        for (const name of oldFiles) this.files.move(name, `${pending}/${name}`);
      }
      this.files.createFile(ACTIVE_SESSION_LOG_FILENAME);
      this.files.createFile(COMPACTED_SESSION_LOG_FILENAME);
      if (pending !== undefined && completed !== undefined) this.files.move(pending, completed);
      this.sessionId = trimmed;
      if (clock !== undefined) this.clock = clock;
      this.sequence = 0;
      this.activeLogBytes = 0;
      this.available = true;
    } catch (error) {
      this.diagnose('rotation', recoveryPath, error);
      throw new SessionStorageError(error);
    }
    this.prunePreviousSessions();
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
    this.requireAvailable();
    if (events.length === 0) {
      return [];
    }
    const validatedEvents = events.map((event) => TelemetryEventInputSchema.parse(event));
    const entries: TelemetryEntry[] = [];
    const lines: string[] = [];

    for (const validated of validatedEvents) {
      const sequence = this.sequence + entries.length + 1;
      const entry: TelemetryEntry = {
        ...validated,
        recordType: 'event',
        sessionId: this.sessionId,
        sequence,
        timestampIso: this.clock.nowIso(),
        elapsedSessionMs: this.clock.elapsedSessionMs(),
      };
      entries.push(entry);
      lines.push(`${JSON.stringify(entry)}\n`);
    }

    const payload = lines.join('');
    this.files.append(ACTIVE_SESSION_LOG_FILENAME, payload);
    this.sequence += entries.length;
    this.activeLogBytes += Buffer.byteLength(payload, 'utf8');

    if (this.activeLogBytes > this.budget.maxActiveLogBytes) {
      this.compact(this.budget.defaultRetentionWindowMs);
    }

    return entries;
  }

  public compact(retentionWindowMs: number = this.budget.defaultRetentionWindowMs): void {
    this.requireAvailable();
    const activeRecords = this.readFileRecords(ACTIVE_SESSION_LOG_FILENAME).filter(
      (r): r is TelemetryEntry => r.recordType === 'event',
    );
    const existingCompacted = this.readFileRecords(COMPACTED_SESSION_LOG_FILENAME);

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

    this.files.writeAtomic(COMPACTED_SESSION_LOG_FILENAME, compactedText);
    this.files.writeAtomic(ACTIVE_SESSION_LOG_FILENAME, activeText);
    this.activeLogBytes = Buffer.byteLength(activeText, 'utf8');
  }

  public query(filter?: TelemetryQueryFilter): ReadonlyArray<TelemetryStreamRecord> {
    const compacted = this.readFileRecords(COMPACTED_SESSION_LOG_FILENAME);
    const active = this.readFileRecords(ACTIVE_SESSION_LOG_FILENAME);
    const combined = sortTelemetryRecords([...compacted, ...active]);
    return combined.filter((record) => matchesTelemetryFilter(record, filter));
  }

  private requireAvailable(): void {
    if (!this.available) throw new TelemetryStorageUnavailableError();
  }

  private readFileRecords(path: string): ReadonlyArray<TelemetryStreamRecord> {
    const raw = this.files.read(path);
    return raw === undefined ? [] : parseNdjsonLines(raw);
  }

  private archiveGroups(): ArchiveGroup[] {
    const groups: ArchiveGroup[] = [];
    for (const name of this.files.list('prev')) {
      const match = /^session-(\d{16})(\.pending)?$/.exec(name);
      if (match === null) continue;
      const sequence = Number(match[1]);
      if (!Number.isSafeInteger(sequence) || sequence < 1) {
        this.diagnose('archive', 'prev', new RangeError('Invalid archive sequence'));
        continue;
      }
      groups.push({ name, sequence, pending: match[2] !== undefined });
    }
    return groups.sort((a, b) => a.sequence - b.sequence);
  }

  private prunePreviousSessions(): void {
    try {
      const completed: ArchiveGroup[] = [];
      for (const group of this.archiveGroups()) {
        if (group.pending) continue;
        const path = `prev/${group.name}`;
        try {
          const stat = this.files.stat(path);
          if (stat === undefined || !stat.isDirectory()) throw new UnsafeLocalPathError();
          // Inspect every child before removing anything; leave foreign contents and links alone.
          for (const name of this.files.list(path)) {
            if (name !== ACTIVE_SESSION_LOG_FILENAME && name !== COMPACTED_SESSION_LOG_FILENAME)
              throw new UnsafeLocalPathError();
            if (this.files.stat(`${path}/${name}`)?.isFile() !== true)
              throw new UnsafeLocalPathError();
          }
          completed.push(group);
        } catch (error) {
          this.diagnose('archive', path, error);
        }
      }
      for (const group of completed.slice(
        0,
        Math.max(0, completed.length - this.maxPreviousSessions),
      )) {
        const path = `prev/${group.name}`;
        try {
          this.files.removeFile(`${path}/${ACTIVE_SESSION_LOG_FILENAME}`);
          this.files.removeFile(`${path}/${COMPACTED_SESSION_LOG_FILENAME}`);
          this.files.removeDirectory(path);
        } catch (error) {
          this.diagnose('prune', path, error);
        }
      }
    } catch (error) {
      this.diagnose('prune', 'prev', error);
    }
  }

  private diagnose(
    operation: SessionStorageDiagnostic['operation'],
    path: string,
    error: unknown,
  ): void {
    try {
      this.onDiagnostic({ operation, path, code: localFileErrorCode(error) });
    } catch {
      /* Diagnostics cannot disable current logging or discard recoverable files. */
    }
  }
}
