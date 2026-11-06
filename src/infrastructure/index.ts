/**
 * Infrastructure Layer Barrel (`src/infrastructure/`)
 *
 * Concrete adapters implementing domain ports (NDJSON session telemetry, rolling compactor,
 * multi-session save/load repositories, and future local ONNX Web Worker).
 * Depends inward on `src/domain/` only.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const INFRASTRUCTURE_LAYER_ID = 'infrastructure' as const;

export {
  ACTIVE_SESSION_LOG_FILENAME,
  COMPACTED_SESSION_LOG_FILENAME,
  fixedTelemetryClock,
  InMemorySessionTelemetry,
  NdjsonSessionTelemetry,
  parseNdjsonLines,
  systemTelemetryClock,
} from './telemetry/NdjsonSessionTelemetry.js';
export {
  type CompactionResult,
  compactTelemetryWindow,
  DEFAULT_MAX_ACTIVE_LOG_BYTES,
  DEFAULT_MAX_COMPACTED_LOG_BYTES,
  DEFAULT_RETENTION_WINDOW_MS,
  DEFAULT_TELEMETRY_STORAGE_BUDGET,
  enforceCompactedStorageCap,
  matchesTelemetryFilter,
  sortTelemetryRecords,
  type TelemetryStorageBudget,
} from './telemetry/RollingLogCompactor.js';
export {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
} from './persistence/FileSaveSlotRepository.js';
