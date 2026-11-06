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
  type AiPipelineKind,
  type AiReasoningTrace,
  type CompactedTelemetryDigest,
  isHighSignalTelemetryEntry,
  PRESERVED_TELEMETRY_CATEGORIES,
  type SessionTelemetryPort,
  type TelemetryClock,
  type TelemetryEntry,
  type TelemetryEventInput,
  type TelemetryLevel,
  type TelemetryQueryFilter,
  type TelemetryStreamRecord,
} from './telemetry/SessionTelemetryPort.js';
export {
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotEnvelope,
  type SaveSlotMetadata,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  validateSaveSlotId,
} from './persistence/SaveSlotRepositoryPort.js';
