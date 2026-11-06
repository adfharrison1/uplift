# Domain Layer (`src/domain/`)

## Purpose

`src/domain/` is the pure TypeScript heart of **Uplift**. It defines the deterministic simulation primitives, Zod-validated domain schemas and ports, epoch-agnostic plug-and-play module registries, continuous 60Hz spatial kinematics and human-paced cognitive phases, pure `WorldEffect` reducers, and Dual-Ledger `CivilizationLegacyState` continuity models.

It has **zero outward dependencies** on application, infrastructure, interfaces, content, Three.js, ONNX/Transformers, or DOM/WebGL globals.

## Current Module Inventory

- `core/SeededRandom.ts` — Deterministic 32-bit Xorshift PRNG (`nextUint32`, `nextFloat`, `nextInt` with rejection sampling, `choose`, `getState`, `fromState`).
- `core/StateSliceRegistry.ts` — Type-safe plugin state descriptors (`StateSliceKey<T>`, `defineStateSlice`, `StateSliceRegistry`, and immutable `StateSliceStore` with `toSnapshot` / `fromSnapshot` and primitive fast-paths).
- `telemetry/SessionTelemetryPort.ts` — Epoch-agnostic session telemetry schemas and ports (`TelemetryClock`, `TelemetryLevelSchema`, `AiReasoningTraceSchema`, `TelemetryEventInputSchema`, `TelemetryEntrySchema`, `CompactedTelemetryDigestSchema`, `TelemetryStreamRecordSchema`, `PRESERVED_TELEMETRY_CATEGORIES`, `isHighSignalTelemetryEntry`, `SessionTelemetryPort`).
- `persistence/SaveSlotRepositoryPort.ts` — Epoch-agnostic multi-session save/load schemas and ports (`SAVE_SLOT_SCHEMA_VERSION`, `SaveSlotIdSchema`, `RngStateSchema`, `SaveSlotMetadataSchema`, `SaveSlotEnvelopeSchema`, `SaveSlotWriteInputSchema`, `validateSaveSlotId`, `SaveSlotRepositoryPort`).
- `registries/EpochBlueprints.ts` — Epoch-agnostic Zod v4 schemas and types for `SpaceNodeBlueprint`, `WaypointBlueprint`, `PropBlueprint`, `CharacterBlueprint` (with `InertiaPillar` and `emergencyVice`), `OfficeBlueprint`, `QuietClaimBlueprint`, `RivalCivBlueprint`, `TrajectoryThreadBlueprint`, `ChannelMediumBlueprint`, `EmergencyStateBlueprint`, `OrbitalPassBlueprint`, `BehaviorModule` (with human-paced deliberation/dwell/cooldown durations), `IllicitInstrumentType`, `PressureStockType`, and `DiscoveryLayer`.
- `registries/EpochModuleRegistry.ts` — Declarative module registry enforcing global ID uniqueness, spatial/entity cross-reference integrity, and Kahn's algorithm topological sort with cycle detection for `BehaviorModule` dependencies.
- `simulation/WorldState.ts` — Immutable `WorldState`, `SimulationPacingConfig` (`DEFAULT_GAMEPLAY_PACING_CONFIG` and `FAST_EVAL_PACING_CONFIG`), `CognitivePhase`, `PendingStimulus`, `WaypointTarget`, and discriminated-union `WorldEffectSchema`.
- `simulation/WorldEffectReducer.ts` — Pure deterministic `applyWorldEffects(state, effects)` reducer with exponential stimulus hop backoff (`baseDigestionDelaySeconds * cascadeBackoffFactor^cascadeHopCount`), `maxAutonomousCascadeHops` gating (`awaiting_trigger` / `release_external_trigger`), pressure stock clamping, discovery layers, inertia pillar collapse, emergency vice compounding, orbital pass & `Slingshot`/`Burn` delta spend, audio cues (`groundside`/`lace`), and legacy scars.
- `simulation/KinematicsEngine.ts` — Continuous 60Hz `stepKinematics(state, dtSeconds)` engine advancing spatial polyline paths (`<= 1e-6m` zero-segment guard, exact waypoint coordinate snapping, intra-frame leftover distance carry, and ordered `WaypointArrivalEvent` emission) alongside human-paced cognitive timers (`deliberating -> moving -> performing_dwell -> cooldown -> idle|awaiting_trigger`) with single-pass zero-duration waterfalling under `FAST_EVAL_PACING_CONFIG`.
- `legacy/CivilizationLegacyState.ts` — Dual-Ledger `CivilizationLegacyState` (`materialScars` vs. `veilScars`, `communicationsBackboneControllerId`, `lineageMutations`), `civilizationLegacyFromRecordedScars`, `recordScarInLegacyState`, `legacyStateToRecord` / `parseLegacyState`, and `applyLegacyToCharacterBlueprints` (`add | multiply | clamp | override` strategies with conflict and `[0, 1]` bounds checks).
- `index.ts` — Public barrel exporting all domain primitives, registries, simulation reducers/kinematics, legacy state helpers, schemas, and ports.
