/**
 * Epoch-agnostic Session Telemetry domain contracts (`src/domain/telemetry/SessionTelemetryPort.ts`).
 *
 * Pure TypeScript + Zod schema definitions and classification rules for per-session structured NDJSON logging,
 * AI reasoning traces (including omitted `AdvisoryDuel` clauses), and rolling compaction digests.
 * Contains zero wall-clock calls (`Date.now`, `new Date`, `performance.now`); time is supplied via `TelemetryClock`.
 */
import { z } from 'zod';

export const TelemetryLevelSchema = z.enum(['info', 'warn', 'error', 'crash']);
export type TelemetryLevel = z.infer<typeof TelemetryLevelSchema>;

export const AiPipelineKindSchema = z.enum([
  'utility_ai',
  'hybrid_nlp',
  'advisory_duel',
  'rival_ai',
]);
export type AiPipelineKind = z.infer<typeof AiPipelineKindSchema>;

/**
 * Injected clock abstraction so domain logic never calls wall-clock globals directly.
 */
export interface TelemetryClock {
  nowIso(): string;
  elapsedSessionMs(): number;
}

export const AiCandidateScoreSchema = z.object({
  id: z.string().trim().min(1),
  score: z.number(),
  breakdown: z.record(z.string(), z.number()).optional(),
});
export type AiCandidateScore = z.infer<typeof AiCandidateScoreSchema>;

export const AiReasoningTraceSchema = z.object({
  pipeline: AiPipelineKindSchema,
  inputSummary: z.string(),
  outputSummary: z.string(),
  candidateScores: z.array(AiCandidateScoreSchema).readonly(),
  selectedReason: z.string(),
  omittedClauses: z.array(z.string()).readonly().optional(),
});
export type AiReasoningTrace = z.infer<typeof AiReasoningTraceSchema>;

const JsonObjectSchema = z.record(z.string(), z.unknown());

/**
 * Input payload passed to `SessionTelemetryPort.record()`.
 * `sessionId`, `sequence`, `timestampIso`, and `elapsedSessionMs` are stamped by the logger using `TelemetryClock`.
 */
export const TelemetryEventInputSchema = z.object({
  epochId: z.string().trim().min(1),
  worldTick: z.number().int().nonnegative(),
  level: TelemetryLevelSchema,
  category: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  acteeId: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1),
  inputs: JsonObjectSchema.optional(),
  effects: z.array(JsonObjectSchema).readonly().optional(),
  aiReasoning: AiReasoningTraceSchema.optional(),
  message: z.string(),
});
export type TelemetryEventInput = z.infer<typeof TelemetryEventInputSchema>;

/**
 * Full stamped NDJSON telemetry entry persisted in `./logs/current-session.jsonl`.
 */
export const TelemetryEntrySchema = TelemetryEventInputSchema.extend({
  recordType: z.literal('event'),
  sessionId: z.string().trim().min(1),
  sequence: z.number().int().positive(),
  timestampIso: z.string().min(1),
  elapsedSessionMs: z.number().nonnegative(),
});
export type TelemetryEntry = z.infer<typeof TelemetryEntrySchema>;

/**
 * Compacted summary digest for repetitive routine `info` events older than the active retention window.
 */
export const CompactedTelemetryDigestSchema = z.object({
  recordType: z.literal('compacted_digest'),
  sessionId: z.string().trim().min(1),
  epochId: z.string().trim().min(1),
  level: z.literal('info'),
  category: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  action: z.string().trim().min(1),
  count: z.number().int().positive(),
  firstSequence: z.number().int().positive(),
  lastSequence: z.number().int().positive(),
  firstElapsedMs: z.number().nonnegative(),
  lastElapsedMs: z.number().nonnegative(),
  firstWorldTick: z.number().int().nonnegative(),
  lastWorldTick: z.number().int().nonnegative(),
  sampleMessage: z.string(),
});
export type CompactedTelemetryDigest = z.infer<typeof CompactedTelemetryDigestSchema>;

export const TelemetryStreamRecordSchema = z.discriminatedUnion('recordType', [
  TelemetryEntrySchema,
  CompactedTelemetryDigestSchema,
]);
export type TelemetryStreamRecord = z.infer<typeof TelemetryStreamRecordSchema>;

export const TelemetryQueryFilterSchema = z.object({
  level: TelemetryLevelSchema.optional(),
  category: z.string().trim().min(1).optional(),
  actorId: z.string().trim().min(1).optional(),
  acteeId: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  minTick: z.number().int().optional(),
  maxTick: z.number().int().optional(),
  hasAiReasoning: z.boolean().optional(),
});
export type TelemetryQueryFilter = z.infer<typeof TelemetryQueryFilterSchema>;

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
