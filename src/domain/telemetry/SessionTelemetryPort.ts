/**
 * Epoch-agnostic Session Telemetry domain contracts (`src/domain/telemetry/SessionTelemetryPort.ts`).
 *
 * Pure TypeScript definitions and classification rules for per-session structured NDJSON logging,
 * AI reasoning traces (including omitted `AdvisoryDuel` clauses), and rolling compaction digests.
 * Contains zero wall-clock calls (`Date.now`, `new Date`, `performance.now`); time is supplied via `TelemetryClock`.
 */

export type TelemetryLevel = 'info' | 'warn' | 'error' | 'crash';

export type AiPipelineKind = 'utility_ai' | 'hybrid_nlp' | 'advisory_duel' | 'rival_ai';

/**
 * Injected clock abstraction so domain logic never calls wall-clock globals directly.
 */
export interface TelemetryClock {
  nowIso(): string;
  elapsedSessionMs(): number;
}

export interface AiCandidateScore {
  readonly id: string;
  readonly score: number;
  readonly breakdown?: Readonly<Record<string, number>> | undefined;
}

export interface AiReasoningTrace {
  readonly pipeline: AiPipelineKind;
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly candidateScores: ReadonlyArray<AiCandidateScore>;
  readonly selectedReason: string;
  readonly omittedClauses?: ReadonlyArray<string> | undefined;
}

/**
 * Input payload passed to `SessionTelemetryPort.record()`.
 * `sessionId`, `sequence`, `timestampIso`, and `elapsedSessionMs` are stamped by the logger using `TelemetryClock`.
 */
export interface TelemetryEventInput {
  readonly epochId: string;
  readonly worldTick: number;
  readonly level: TelemetryLevel;
  readonly category: string;
  readonly actorId: string;
  readonly acteeId?: string | undefined;
  readonly action: string;
  readonly inputs?: Readonly<Record<string, unknown>> | undefined;
  readonly effects?: ReadonlyArray<Readonly<Record<string, unknown>>> | undefined;
  readonly aiReasoning?: AiReasoningTrace | undefined;
  readonly message: string;
}

/**
 * Full stamped NDJSON telemetry entry persisted in `./logs/current-session.jsonl`.
 */
export interface TelemetryEntry extends TelemetryEventInput {
  readonly recordType: 'event';
  readonly sessionId: string;
  readonly sequence: number;
  readonly timestampIso: string;
  readonly elapsedSessionMs: number;
}

/**
 * Compacted summary digest for repetitive routine `info` events older than the active retention window.
 */
export interface CompactedTelemetryDigest {
  readonly recordType: 'compacted_digest';
  readonly sessionId: string;
  readonly epochId: string;
  readonly level: 'info';
  readonly category: string;
  readonly actorId: string;
  readonly action: string;
  readonly count: number;
  readonly firstSequence: number;
  readonly lastSequence: number;
  readonly firstElapsedMs: number;
  readonly lastElapsedMs: number;
  readonly firstWorldTick: number;
  readonly lastWorldTick: number;
  readonly sampleMessage: string;
}

export type TelemetryStreamRecord = TelemetryEntry | CompactedTelemetryDigest;

export interface TelemetryQueryFilter {
  readonly level?: TelemetryLevel | undefined;
  readonly category?: string | undefined;
  readonly actorId?: string | undefined;
  readonly acteeId?: string | undefined;
  readonly action?: string | undefined;
  readonly minTick?: number | undefined;
  readonly maxTick?: number | undefined;
  readonly hasAiReasoning?: boolean | undefined;
}

/**
 * Canonical high-signal categories that must NEVER be collapsed during rolling compaction,
 * even when logged at `level: 'info'`.
 */
export const PRESERVED_TELEMETRY_CATEGORIES: ReadonlySet<string> = new Set([
  'player',
  'rival',
  'office',
  'pretext',
  'emergency',
  'martyrdom',
  'correspondence',
  'orbital',
  'legacy',
]);

/**
 * Pure domain predicate determining whether a `TelemetryEntry` must be preserved verbatim
 * during rolling log compaction.
 */
export function isHighSignalTelemetryEntry(entry: TelemetryEntry): boolean {
  if (entry.level !== 'info') {
    return true;
  }
  if (entry.aiReasoning !== undefined) {
    return true;
  }
  return PRESERVED_TELEMETRY_CATEGORIES.has(entry.category);
}

/**
 * Domain port for session-scoped telemetry recording, rolling compaction, and log querying.
 */
export interface SessionTelemetryPort {
  getSessionId(): string;
  startNewSession(sessionId: string, clock?: TelemetryClock): void;
  record(event: TelemetryEventInput): TelemetryEntry;
  compact(retentionWindowMs: number): void;
  query(filter?: TelemetryQueryFilter): ReadonlyArray<TelemetryStreamRecord>;
}
