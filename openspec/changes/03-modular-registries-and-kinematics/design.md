## Context

See `proposal.md` for motivation. Change 03 (`03-modular-registries-and-kinematics`) builds the epoch-agnostic simulation backbone in `src/domain/` and `src/application/` before 3D rendering (`Change 04`) and concrete Highglass Hold content authoring (`Changes 05–06`).

## Goals / Non-Goals

**Goals:**
- Define epoch-agnostic Zod schemas and TypeScript contracts in `src/domain/registries/` for all plug-and-play module types from `DESIGN_NOTES.md` and `openspec/config.yaml`: Spaces, Props, Characters (with Inertia Pillars & emergency vices), Contested Offices & Pretexts, Deniable Quiet Claims, 3 Illicit Fund Modes, 3 Pressure Stocks, 4 Discovery Layers (`noticed | assayed | attributed | theorized`, or `null` when unnoticed), Behaviors with topological sort, Rival Civilizations, Braided Trajectory Threads (with Martyrdom/Succession & Dual-Use Ceilings), Async Correspondence Media, Emergency States, and Orbital Pass / Slingshot & Burn Delta rules.
- Implement the pure `WorldState`, `WorldEffect` reducer, and continuous 60Hz `stepKinematics(dt)` engine in `src/domain/simulation/`.
- Implement the Dual-Ledger `CivilizationLegacyState` (`MaterialScars` vs. `VeilScars`) and `lineageId` successor mutator in `src/domain/legacy/`.
- Implement `SimulationCoordinator` in `src/application/simulation/` importing only `src/domain/index.js` and accepting injected `SessionTelemetryPort`, `SaveSlotRepositoryPort`, and `TelemetryClock`.

**Non-Goals:**
- Hardcoding any Era 1 feudal names (`Sorrel`, `Vane`, `Synod`, `Highglass`) inside `src/domain/` or `src/application/`. All feudal content belongs in `src/content/` in later changes; unit tests here use synthetic epoch-agnostic test fixtures (`lineage_alpha`, `space_alpha`, etc.).

## Decisions

### 1. Epoch-Agnostic Module Blueprints & `EpochModuleRegistry` (`src/domain/registries/`)

To ensure seamless flow from Era 1 into Era 2+, every blueprint uses universal domain concepts:
- **Spatial Nodes (`SpaceNodeBlueprint`)**: `kind: 'indoor_room' | 'outdoor_area' | 'off_stage_region'`, `earshotRadiusMeters`, `surfaceMaterial: 'mud' | 'stone' | 'wood' | 'metal' | 'earth'`, `acousticClass: 'tight_interior' | 'live_interior' | 'open_court' | 'basin' | 'off_stage'`, `ambientMaskLoudness` (`0..1`), `connectedSpaceIds` (validated to exist, contain no duplicates, and prohibit self-links), and `waypoints: ReadonlyArray<{ id: string; position: readonly [number, number, number] }>` (globally unique waypoint IDs).
- **Props (`PropBlueprint`)**: `id`, `name`, `spaceId`, `waypointId`, `tier: 'interactive' | 'static'`, `initialState: Readonly<Record<string, unknown>>`, and optional `portalState: 'open' | 'ajar' | 'closed' | 'barred'`.
- **Characters (`CharacterBlueprint`)**: `id`, `name`, `lineageId`, `tier: 'utility_schemer' | 'role_routine' | 'ambient_crowd'`, `startingSpaceId`, `startingWaypointId` (must belong to `startingSpaceId`), `walkSpeedMetersPerSec` (default `1.4`), `yawSpeedRadiansPerSec` (default `6.0`), `listenerThreshold` (default `0.2`), optional `acousticBias: 'transient' | 'low' | 'gap'`, `drives: Readonly<Record<string, number>>` (`[0, 1]`), `emergencyVice: string` (must be a key in `drives`), and `inertiaPillars: ReadonlyArray<InertiaPillar>` (`id`, `kind: 'doctrine' | 'constituency' | 'debt' | 'temper' | 'ignorance'`, `weight: number`, `holderEntityId?: string`).
- **Contested Offices, Pretexts & Quiet Claims (`OfficeBlueprint`, `QuietClaimBlueprint`)**:
  - `OfficeBlueprint`: `id`, `institutionalLineageId`, `patronEntityId`, `pretextFamilies: ReadonlyArray<'medical_quarantine' | 'ideological_censure' | 'technical_audit' | 'monetary_assay' | 'protocol_immunity'>`, `stipendPerTick`, and `exposureRiskModifier`.
  - `QuietClaimBlueprint`: `id`, `targetEntityId`, `unlockedPretext`, and `exposurePenalty`.
- **Economy & Discovery (`IllicitInstrumentType`, `PressureStockType`, `DiscoveryLayer`)**:
  - `IllicitInstrumentType`: `'unbacked_mass_commodity' | 'forged_fiat_instrument' | 'anachronistic_marvel'`
  - `PressureStockType`: `'subsistence_pressure' | 'production_pressure' | 'elite_prestige_pressure'`
  - `DiscoveryLayer`: `'noticed' | 'assayed' | 'attributed' | 'theorized'` (stored as `DiscoveryLayer | null` on `WorldState`, where `null` represents no discovery layer triggered yet).
- **Rivals, Trajectory Threads, Correspondence, Emergencies & Orbit (`RivalCivBlueprint`, `TrajectoryThreadBlueprint`, `ChannelMediumBlueprint`, `EmergencyStateBlueprint`, `OrbitalPassBlueprint`)**:
  - Validated and indexed in `EpochModuleRegistry`.
- **Behaviors (`BehaviorModule`)**: Registered via Kahn's algorithm topological sort, rejecting self-loops (`A -> A`), multi-node cycles (`A -> B -> A`), duplicate dependencies, and missing dependencies. Every `BehaviorModule` also specifies human-paced timing (`deliberationSeconds >= 0`, `dwellSeconds >= 0`, `cooldownSeconds >= 0`, `requiresExternalTrigger: boolean`).

### 2. Continuous 60Hz Kinematics (`stepKinematics`), Human-Paced Cognitive Phases & Pure `applyWorldEffects` (`src/domain/simulation/`)

- **60Hz Frame Loop (`stepKinematics(state, dtSeconds)`)**:
  - Rejects `dtSeconds < 0` or `!Number.isFinite(dtSeconds)` with `RangeError` (before checking `paused`).
  - If `dtSeconds === 0` or `state.paused === true`, returns `{ state, arrivals: [] }` immediately.
  - Advances `elapsedSimulationSeconds` by `dtSeconds`, decrements each entity's `phaseRemainingSeconds` when in `deliberating`, `performing_dwell`, or `cooldown`, and advances each moving entity in ascending `entityId` order along its `activePath` in one polyline pass: handles zero-length segments (`<= 1e-6m`) without division by zero, snaps to exact waypoint coordinates when `distance <= stepDistance`, carries remaining `stepDistance` into subsequent segments, and emits one `WaypointArrivalEvent` per reached waypoint in path order.
- **Anti-Thundering-Herd Stimulus Queue (`PendingStimulus`) & `SimulationPacingConfig`**:
  - Each entity tracks `cognitivePhase: 'idle' | 'deliberating' | 'moving' | 'performing_dwell' | 'cooldown' | 'awaiting_trigger'` and `pendingStimuli: ReadonlyArray<PendingStimulus>`.
  - `WorldState` carries `cognitiveRoundRobinCursor: number` and `pacingConfig: SimulationPacingConfig` with two presets:
    - `DEFAULT_GAMEPLAY_PACING_CONFIG`: `{ deliberationScale: 1.0, baseDigestionDelaySeconds: 5.0, cascadeBackoffFactor: 2.0, maxAutonomousCascadeHops: 2, maxCognitiveEvaluationsPerPulse: 1, allowUnclampedFrameDt: false }`
    - `FAST_EVAL_PACING_CONFIG`: `{ deliberationScale: 0.0, baseDigestionDelaySeconds: 0.0, cascadeBackoffFactor: 1.0, maxAutonomousCascadeHops: 32, maxCognitiveEvaluationsPerPulse: 64, allowUnclampedFrameDt: true }`
  - When `enqueue_npc_stimulus` is applied with `cascadeHopCount`, its `readyAtElapsedSeconds` is computed as `state.elapsedSimulationSeconds + state.pacingConfig.baseDigestionDelaySeconds * Math.pow(state.pacingConfig.cascadeBackoffFactor, cascadeHopCount)`. If `cascadeHopCount >= state.pacingConfig.maxAutonomousCascadeHops`, the target entity is placed in `awaiting_trigger` until `release_external_trigger` marks the stimulus `externalRelease: true` and returns the entity to `idle`.
  - When `set_cognitive_phase` sets a `deliberating`, `performing_dwell`, or `cooldown` timer, `durationSeconds` is multiplied by `state.pacingConfig.deliberationScale`. During `stepKinematics(dt > 0)`, any timed phase with `phaseRemainingSeconds <= 0` transitions and reloads the next phase's scaled duration (waterfalling through zero-duration phases in a single pass under `FAST_EVAL_PACING_CONFIG`), and exhausting `activePath` transitions `moving` into `performing_dwell`.
- **Pure Reducer (`applyWorldEffects(state, effects)`)**:
  - Returns `{ state: nextState, appliedEffects }` without mutating `state`.
  - Supports `move_entity_to_waypoint`, `set_cognitive_phase`, `enqueue_npc_stimulus`, `release_external_trigger`, `emit_audio_cue` (`bus: 'groundside' | 'lace'`, `cueId`, `loudness`, `sourceSpaceId`), `update_prop_state`, `adjust_pressure_stock` (clamped `[0, 1]`), `set_discovery_layer`, `collapse_inertia_pillar`, `trigger_emergency`, `compound_emergency_vices` (increments each entity's `emergencyVice` drive clamped to `[0, 1]`), `resolve_emergency`, `advance_orbital_pass`, `spend_orbital_delta` (`mode: 'slingshot' | 'burn'`), `record_legacy_scar`, and `set_state_slice`.

### 3. Dual-Ledger `CivilizationLegacyState` & `LineageMutation` (`src/domain/legacy/`)

- `CivilizationLegacyState` separates `materialScars` (`ledger: 'material'`) and `veilScars` (`ledger: 'veil'`), tracks `communicationsBackboneControllerId`, and lists `lineageMutations` (`strategy: 'add' | 'multiply' | 'clamp' | 'override'`).
- `applyLegacyToCharacterBlueprints` applies mutations in order, rejects multiple `override`s on the same `(lineageId, target)`, and validates that all final drive values lie within `[0, 1]`.

### 4. `SimulationCoordinator` (`src/application/simulation/`)

- Imports ONLY from `../../domain/index.js` (never `src/infrastructure/` or `src/content/`).
- Clamps live frame `dtSeconds` to `MAX_FRAME_DT_SECONDS = 0.25` when `state.pacingConfig.allowUnclampedFrameDt === false` (logging a `warn` telemetry event if clamped) and skips both kinematics and `applyWorldEffects` while `state.paused === true`.
- Implements `pulseCognitiveScheduler(maxEvaluationsOverride?: number)`: scans lexicographically sorted `entityId`s starting at `cognitiveRoundRobinCursor % entityIds.length`, promotes at most `maxEvaluationsOverride ?? state.pacingConfig.maxCognitiveEvaluationsPerPulse` `idle` entities with a ready stimulus (`elapsedSimulationSeconds >= readyAtElapsedSeconds` and (`cascadeHopCount < state.pacingConfig.maxAutonomousCascadeHops` or `externalRelease === true`)) into `deliberating`, and advances `cognitiveRoundRobinCursor` past the last promoted entity.

### 5. Pinned Versions Table (Verified 2026-10-29 — Zero New Dependencies)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
|---|---|---|
| Node.js LTS | `24.22.2` (`.nvmrc`) | Runtime; includes Oct 21, 2026 security patches (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | Native Go `tsc` binary (`7.0.2`, `ES2025`, strict mode, zero `any`) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | Official TS 6.0.3 JS AST API bridge required by `typescript-eslint` |
| `zod` | `4.6.7` | Schema validation and `z.infer` typing |
| `vite` | `8.3.5` | Local dev server and bundler |
| `vitest` | `5.0.5` | Fast unit, architecture, and headless simulation test runner |
| `eslint` | `10.13.0` (`@eslint/js` `10.0.1`) | Flat-config static analysis (`minimatch` override `11.0.4`, `--cache`) |
| `typescript-eslint` | `8.72.1` | Strict & stylistic TypeScript ESLint rules |
| `eslint-config-prettier` | `10.1.8` | Disables formatting rules that conflict with Prettier |
| `prettier` | `3.9.10` | Automated code formatting (`--cache`) |
| `husky` + `lint-staged` | `9.1.7` / `17.6.0` | Pre-commit formatting and linting on staged files |
| `@types/node` | `24.19.2` | Node.js type definitions |

### 6. Layer Placement & Section Documentation Updates

```text
src/
  domain/
    registries/
      EpochBlueprints.ts          # Zod schemas & types for Spaces, Props, Characters, Offices, QuietClaims, Rivals, Threads, Channels, Emergencies, Orbit, Behaviors
      EpochModuleRegistry.ts      # Registry with reference validation & Kahn's topological sort cycle detection
    simulation/
      WorldState.ts               # Immutable WorldState, EntitySpatialState, PressureStocks, OrbitalPassState, WorldEffect union
      WorldEffectReducer.ts       # Pure applyWorldEffects(state, effects) reducer
      KinematicsEngine.ts         # Continuous 60Hz stepKinematics(state, dtSeconds) with pause & WaypointArrivalEvent emission
    legacy/
      CivilizationLegacyState.ts  # Dual-ledger MaterialScars/VeilScars, LineageMutation, applyLegacyToCharacterBlueprints
    index.ts                      # Re-exports all domain registries, simulation, and legacy modules
  application/
    simulation/
      SimulationCoordinator.ts    # Orchestrates registries, 60Hz kinematics, effects, telemetry logging, and save/load
    index.ts                      # Re-exports SimulationCoordinator
```

- **Section `README.md` & `AGENTS.md` files updated by this change**:
  - `src/domain/README.md` and `src/domain/AGENTS.md`
  - `src/application/README.md` and `src/application/AGENTS.md`
  - `tests/README.md` and `tests/AGENTS.md`

### 7. Local Dev Setup & Verification Commands

- `npm run verify`: Runs `format:check`, `lint`, `typecheck`, `test:arch`, and `test:unit` in `<4s`.

## Risks / Trade-offs

- **[Risk] Floating-point overshoot or zero-length segment NaN during 60Hz waypoint stepping** $\rightarrow$ **Mitigation**: Treat segments `<= 1e-6m` as immediate arrivals without division, snap to exact waypoint tuples when `distance <= stepDistance`, and spend remaining distance on the next waypoint in the path.
