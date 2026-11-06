# Domain Layer (`src/domain/`)

## Purpose

`src/domain/` is the pure TypeScript heart of **Uplift**. It defines the deterministic simulation primitives, Zod-validated domain schemas and ports, module contracts, 60Hz spatial kinematics math, Utility AI scoring rules, inertia weighting, slow-burn butterfly/crisis threads, rival operative models, async correspondence, orbital pass mechanics, and `CivilizationLegacyState` continuity models.

It has **zero outward dependencies** on application, infrastructure, interfaces, content, Three.js, ONNX/Transformers, or DOM/WebGL globals.

## Current Module Inventory

- `core/SeededRandom.ts` — Deterministic 32-bit Xorshift PRNG (`nextUint32`, `nextFloat`, `nextInt` with rejection sampling, `choose`, `getState`, `fromState`).
- `core/StateSliceRegistry.ts` — Type-safe plugin state descriptors (`StateSliceKey<T>`, `defineStateSlice`, `StateSliceRegistry`, and immutable `StateSliceStore` with `toSnapshot` / `fromSnapshot` and primitive fast-paths).
- `telemetry/SessionTelemetryPort.ts` — Epoch-agnostic session telemetry schemas and ports (`TelemetryClock`, `TelemetryLevelSchema`, `AiReasoningTraceSchema`, `TelemetryEventInputSchema`, `TelemetryEntrySchema`, `CompactedTelemetryDigestSchema`, `TelemetryStreamRecordSchema`, `PRESERVED_TELEMETRY_CATEGORIES`, `isHighSignalTelemetryEntry`, `SessionTelemetryPort`).
- `persistence/SaveSlotRepositoryPort.ts` — Epoch-agnostic multi-session save/load schemas and ports (`SAVE_SLOT_SCHEMA_VERSION`, `SaveSlotIdSchema`, `RngStateSchema`, `SaveSlotMetadataSchema`, `SaveSlotEnvelopeSchema`, `SaveSlotWriteInputSchema`, `validateSaveSlotId`, `SaveSlotRepositoryPort`).
- `index.ts` — Public barrel exporting domain primitives, schemas, and contracts.
