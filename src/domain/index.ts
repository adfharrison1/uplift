/**
 * Domain Layer Barrel (`src/domain/`)
 *
 * Pure TypeScript simulation core, deterministic primitives, and repository/service ports.
 * Zero outward dependencies on application, infrastructure, interfaces, content, Three.js, or ONNX.
 */
export const DOMAIN_LAYER_ID = 'domain' as const;
export { SeededRandom } from './core/SeededRandom.js';
export {
  defineStateSlice,
  type StateSliceKey,
  StateSliceRegistry,
  StateSliceStore,
} from './core/StateSliceRegistry.js';
export {
  type AiCandidateScore,
  AiCandidateScoreSchema,
  type AiPipelineKind,
  AiPipelineKindSchema,
  type AiReasoningTrace,
  AiReasoningTraceSchema,
  type CompactedTelemetryDigest,
  CompactedTelemetryDigestSchema,
  isHighSignalTelemetryEntry,
  PRESERVED_TELEMETRY_CATEGORIES,
  type SessionTelemetryPort,
  type TelemetryClock,
  type TelemetryEntry,
  TelemetryEntrySchema,
  type TelemetryEventInput,
  TelemetryEventInputSchema,
  type TelemetryLevel,
  TelemetryLevelSchema,
  type TelemetryQueryFilter,
  TelemetryQueryFilterSchema,
  type TelemetryStreamRecord,
  TelemetryStreamRecordSchema,
} from './telemetry/SessionTelemetryPort.js';
export {
  RngStateSchema,
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotEnvelope,
  SaveSlotEnvelopeSchema,
  SaveSlotIdSchema,
  type SaveSlotMetadata,
  SaveSlotMetadataSchema,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  SaveSlotWriteInputSchema,
  validateSaveSlotId,
} from './persistence/SaveSlotRepositoryPort.js';
