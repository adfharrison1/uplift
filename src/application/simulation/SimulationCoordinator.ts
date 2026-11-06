/**
 * SimulationCoordinator (`src/application/simulation/SimulationCoordinator.ts`).
 *
 * Application-layer use-case coordinator that wires `EpochModuleRegistry`,
 * continuous 60Hz `stepKinematics(dt)`, pure `applyWorldEffects`, the anti-thundering-herd
 * round-robin `pulseCognitiveScheduler`, Dual-Ledger `CivilizationLegacyState` inheritance/export,
 * structured `SessionTelemetryPort` logging, and multi-session `SaveSlotRepositoryPort` persistence.
 *
 * Depends strictly inward on `src/domain/index.js`.
 */
import {
  applyLegacyToCharacterBlueprints,
  applyWorldEffects,
  type CharacterBlueprint,
  type CivilizationLegacyState,
  civilizationLegacyFromRecordedScars,
  createInitialWorldState,
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  type EntitySimulationState,
  type EpochModuleRegistry,
  type InheritedScar,
  type KinematicsStepResult,
  legacyStateToRecord,
  type LineageMutation,
  parseLegacyState,
  type PendingStimulus,
  type PropSimulationState,
  type SaveSlotEnvelope,
  type SaveSlotRepositoryPort,
  SeededRandom,
  type SessionTelemetryPort,
  type SimulationPacingConfig,
  SimulationPacingConfigSchema,
  StateSliceStore,
  stepKinematics,
  type TelemetryClock,
  type TelemetryLevel,
  type WorldEffect,
  type WorldEffectReducerResult,
  type WorldState,
} from '../../domain/index.js';

export const MAX_FRAME_DT_SECONDS = 0.25 as const;

const WORLD_STATE_SNAPSHOT_KEY = '__upliftWorldStateSnapshot' as const;
const CUSTOM_SLICES_SNAPSHOT_KEY = '__upliftCustomSlicesSnapshot' as const;

export interface SimulationCoordinatorOptions {
  readonly epochId: string;
  readonly registry: EpochModuleRegistry;
  readonly telemetry: SessionTelemetryPort;
  readonly saveRepository: SaveSlotRepositoryPort;
  readonly clock: TelemetryClock;
  readonly rng?: SeededRandom | undefined;
  readonly pacingConfig?: SimulationPacingConfig | undefined;
  readonly legacyState?: CivilizationLegacyState | undefined;
}

export interface DispatchEffectsOptions {
  readonly actorId?: string | undefined;
  readonly acteeId?: string | undefined;
  readonly action?: string | undefined;
  readonly category?: string | undefined;
  readonly level?: TelemetryLevel | undefined;
  readonly advanceTick?: boolean | undefined;
  readonly message?: string | undefined;
}

export interface CognitivePulseOptions {
  readonly maxEvaluationsOverride?: number | undefined;
}

export interface ConsumedStimulusRecord {
  readonly entityId: string;
  readonly stimulus: PendingStimulus;
}

export interface CognitivePulseResult {
  readonly state: WorldState;
  readonly promotedEntityIds: ReadonlyArray<string>;
  readonly consumedStimuli: ReadonlyArray<ConsumedStimulusRecord>;
}

interface SerializedWorldStateSnapshot {
  readonly epochId: string;
  readonly worldTick: number;
  readonly elapsedSimulationSeconds: number;
  readonly paused: boolean;
  readonly pacingConfig: SimulationPacingConfig;
  readonly cognitiveRoundRobinCursor: number;
  readonly entities: Readonly<Record<string, EntitySimulationState>>;
  readonly props: Readonly<Record<string, PropSimulationState>>;
  readonly pressureStocks: WorldState['pressureStocks'];
  readonly discoveryLayer: WorldState['discoveryLayer'];
  readonly activeEmergencyId: WorldState['activeEmergencyId'];
  readonly orbitalPass: WorldState['orbitalPass'];
  readonly emittedAudioCues: WorldState['emittedAudioCues'];
  readonly recordedLegacyScars: WorldState['recordedLegacyScars'];
}

function isSerializedWorldStateSnapshot(value: unknown): value is SerializedWorldStateSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['epochId'] === 'string' &&
    typeof record['worldTick'] === 'number' &&
    typeof record['elapsedSimulationSeconds'] === 'number' &&
    typeof record['paused'] === 'boolean' &&
    typeof record['cognitiveRoundRobinCursor'] === 'number' &&
    typeof record['entities'] === 'object' &&
    record['entities'] !== null &&
    typeof record['props'] === 'object' &&
    record['props'] !== null &&
    typeof record['pressureStocks'] === 'object' &&
    record['pressureStocks'] !== null &&
    typeof record['orbitalPass'] === 'object' &&
    record['orbitalPass'] !== null &&
    Array.isArray(record['emittedAudioCues']) &&
    Array.isArray(record['recordedLegacyScars'])
  );
}

function buildInitialEntities(
  registry: EpochModuleRegistry,
  characters: ReadonlyArray<CharacterBlueprint>,
): Record<string, EntitySimulationState> {
  const entities: Record<string, EntitySimulationState> = {};
  for (const char of characters) {
    const wpEntry = registry.getWaypoint(char.startingWaypointId);
    entities[char.id] = {
      entityId: char.id,
      lineageId: char.lineageId,
      spaceId: char.startingSpaceId,
      waypointId: char.startingWaypointId,
      position: [...wpEntry.waypoint.position],
      yawRadians: 0,
      walkSpeedMetersPerSec: char.walkSpeedMetersPerSec,
      yawSpeedRadiansPerSec: char.yawSpeedRadiansPerSec,
      cognitivePhase: 'idle',
      phaseRemainingSeconds: 0,
      pendingDwellSeconds: 0,
      pendingCooldownSeconds: 0,
      requiresExternalTrigger: false,
      activePath: [],
      drives: { ...char.drives },
      emergencyVice: char.emergencyVice,
      inertiaPillars: char.inertiaPillars.map((p) => ({ ...p })),
      pendingStimuli: [],
    };
  }
  return entities;
}

function buildInitialProps(registry: EpochModuleRegistry): Record<string, PropSimulationState> {
  const props: Record<string, PropSimulationState> = {};
  for (const prop of registry.getAllProps()) {
    props[prop.id] = {
      propId: prop.id,
      spaceId: prop.spaceId,
      waypointId: prop.waypointId,
      state: structuredClone(prop.initialState),
      ...(prop.portalState !== undefined ? { portalState: prop.portalState } : {}),
    };
  }
  return props;
}

function inferEffectTelemetryCategory(effects: ReadonlyArray<WorldEffect>): string {
  for (const effect of effects) {
    switch (effect.type) {
      case 'trigger_emergency':
      case 'compound_emergency_vices':
      case 'resolve_emergency':
        return 'emergency';
      case 'advance_orbital_pass':
      case 'spend_orbital_delta':
        return 'orbital';
      case 'record_legacy_scar':
        return 'legacy';
      default:
        break;
    }
  }
  return 'simulation';
}

export class SimulationCoordinator {
  private readonly registry: EpochModuleRegistry;
  private readonly telemetry: SessionTelemetryPort;
  private readonly saveRepository: SaveSlotRepositoryPort;
  private readonly clock: TelemetryClock;
  private rng: SeededRandom;
  private resolvedCharacters: ReadonlyArray<CharacterBlueprint>;
  private inheritedLegacyState: CivilizationLegacyState | undefined;
  private state: WorldState;

  public constructor(options: SimulationCoordinatorOptions) {
    const trimmedEpochId = options.epochId.trim();
    if (trimmedEpochId.length === 0) {
      throw new Error('SimulationCoordinator requires a non-empty epochId');
    }

    this.registry = options.registry;
    this.telemetry = options.telemetry;
    this.saveRepository = options.saveRepository;
    this.clock = options.clock;
    this.rng = options.rng ?? new SeededRandom(1);
    this.inheritedLegacyState = options.legacyState;

    const baseCharacters = this.registry.getAllCharacters();
    this.resolvedCharacters =
      options.legacyState !== undefined
        ? applyLegacyToCharacterBlueprints(baseCharacters, options.legacyState)
        : [...baseCharacters];

    const entities = buildInitialEntities(this.registry, this.resolvedCharacters);
    const props = buildInitialProps(this.registry);
    const orbitalBlueprint = this.registry.getOrbitalPass();

    this.state = createInitialWorldState({
      epochId: trimmedEpochId,
      entities,
      props,
      pacingConfig: options.pacingConfig ?? DEFAULT_GAMEPLAY_PACING_CONFIG,
      maxOrbitalDelta: orbitalBlueprint?.maxDelta ?? 100,
    });
  }

  public getWorldState(): WorldState {
    return this.state;
  }

  public getRegistry(): EpochModuleRegistry {
    return this.registry;
  }

  public getResolvedCharacters(): ReadonlyArray<CharacterBlueprint> {
    return this.resolvedCharacters;
  }

  public getRng(): SeededRandom {
    return this.rng;
  }

  public setPaused(paused: boolean): WorldState {
    if (this.state.paused === paused) {
      return this.state;
    }
    this.state = {
      ...this.state,
      paused,
    };
    this.telemetry.record({
      epochId: this.state.epochId,
      worldTick: this.state.worldTick,
      level: 'info',
      category: 'simulation',
      actorId: 'system',
      action: paused ? 'pause_simulation' : 'resume_simulation',
      message: paused ? 'Simulation paused (Debug Mode)' : 'Simulation resumed from pause',
    });
    return this.state;
  }

  public setPacingConfig(pacingConfig: SimulationPacingConfig): WorldState {
    const validated = Object.freeze({
      ...SimulationPacingConfigSchema.parse(pacingConfig),
    });
    this.state = {
      ...this.state,
      pacingConfig: validated,
    };
    return this.state;
  }

  /**
   * Steps 60Hz continuous spatial kinematics and cognitive phase timers.
   *
   * - Rejects negative or non-finite `dtSeconds` with `RangeError`.
   * - Clamps `dtSeconds` to `MAX_FRAME_DT_SECONDS` (`0.25s`) when `allowUnclampedFrameDt === false`,
   *   emitting a `'warn'` telemetry event.
   * - Freezes completely when `state.paused === true`.
   */
  public stepFrame(dtSeconds: number): KinematicsStepResult {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      throw new RangeError(
        `stepFrame requires a finite non-negative dtSeconds, received ${String(dtSeconds)}`,
      );
    }

    if (this.state.paused || dtSeconds === 0) {
      return {
        state: this.state,
        arrivals: [],
        cognitiveTransitions: [],
      };
    }

    let effectiveDt = dtSeconds;
    if (!this.state.pacingConfig.allowUnclampedFrameDt && dtSeconds > MAX_FRAME_DT_SECONDS) {
      effectiveDt = MAX_FRAME_DT_SECONDS;
      this.telemetry.record({
        epochId: this.state.epochId,
        worldTick: this.state.worldTick,
        level: 'warn',
        category: 'simulation',
        actorId: 'system',
        action: 'clamp_frame_dt',
        inputs: {
          requestedDtSeconds: dtSeconds,
          clampedDtSeconds: MAX_FRAME_DT_SECONDS,
        },
        message: `Clamped frame dtSeconds from ${String(dtSeconds)}s to ${String(MAX_FRAME_DT_SECONDS)}s`,
      });
    }

    const result = stepKinematics(this.state, effectiveDt);
    this.state = result.state;

    for (const arrival of result.arrivals) {
      this.telemetry.record({
        epochId: this.state.epochId,
        worldTick: this.state.worldTick,
        level: 'info',
        category: 'kinematics',
        actorId: arrival.entityId,
        action: 'waypoint_arrival',
        inputs: {
          spaceId: arrival.spaceId,
          waypointId: arrival.waypointId,
          position: [...arrival.position],
        },
        message: `Entity '${arrival.entityId}' arrived at waypoint '${arrival.waypointId}' in '${arrival.spaceId}'`,
      });
    }

    for (const transition of result.cognitiveTransitions) {
      this.telemetry.record({
        epochId: this.state.epochId,
        worldTick: this.state.worldTick,
        level: 'info',
        category: 'cognitive',
        actorId: transition.entityId,
        action: 'cognitive_phase_transition',
        inputs: {
          fromPhase: transition.fromPhase,
          toPhase: transition.toPhase,
        },
        message: `Entity '${transition.entityId}' transitioned from '${transition.fromPhase}' to '${transition.toPhase}'`,
      });
    }

    return result;
  }

  /**
   * Applies discrete `WorldEffect` commands via the pure reducer and records telemetry.
   * Skips effect application while `state.paused === true`.
   */
  public dispatchEffects(
    effects: ReadonlyArray<WorldEffect>,
    options?: DispatchEffectsOptions,
  ): WorldEffectReducerResult {
    if (this.state.paused || effects.length === 0) {
      return {
        state: this.state,
        appliedEffects: [],
      };
    }

    const result = applyWorldEffects(this.state, effects);
    const nextWorldTick =
      options?.advanceTick === true && result.appliedEffects.length > 0
        ? result.state.worldTick + 1
        : result.state.worldTick;

    this.state =
      nextWorldTick === result.state.worldTick
        ? result.state
        : {
            ...result.state,
            worldTick: nextWorldTick,
          };

    if (result.appliedEffects.length > 0) {
      const category = options?.category ?? inferEffectTelemetryCategory(result.appliedEffects);
      const actorId = options?.actorId ?? 'system';
      const action =
        options?.action ??
        (result.appliedEffects.length === 1
          ? (result.appliedEffects[0]?.type ?? 'apply_world_effects')
          : 'apply_world_effects');

      this.telemetry.record({
        epochId: this.state.epochId,
        worldTick: this.state.worldTick,
        level: options?.level ?? 'info',
        category,
        actorId,
        ...(options?.acteeId !== undefined ? { acteeId: options.acteeId } : {}),
        action,
        effects: result.appliedEffects.map((eff) => ({ ...eff }) as Record<string, unknown>),
        message:
          options?.message ??
          `Applied ${String(result.appliedEffects.length)} world effect(s) via '${action}'`,
      });
    }

    return {
      state: this.state,
      appliedEffects: result.appliedEffects,
    };
  }

  /**
   * Anti-thundering-herd round-robin cognitive scheduler (`pulseCognitiveScheduler`).
   *
   * Scans lexicographically sorted `entityId`s starting at `cognitiveRoundRobinCursor % entityIds.length`,
   * promotes at most `maxEvaluationsOverride ?? state.pacingConfig.maxCognitiveEvaluationsPerPulse`
   * `idle` entities with a ready stimulus (`elapsedSimulationSeconds >= readyAtElapsedSeconds` and
   * (`cascadeHopCount < state.pacingConfig.maxAutonomousCascadeHops` or `externalRelease === true`))
   * into `deliberating`, and advances `cognitiveRoundRobinCursor` past the last promoted entity.
   */
  public pulseCognitiveScheduler(
    optionsOrMaxEvaluations?: number | CognitivePulseOptions,
  ): CognitivePulseResult {
    const rawOverride =
      typeof optionsOrMaxEvaluations === 'number'
        ? optionsOrMaxEvaluations
        : optionsOrMaxEvaluations?.maxEvaluationsOverride;

    if (rawOverride !== undefined) {
      if (!Number.isInteger(rawOverride) || rawOverride < 0) {
        throw new RangeError(
          `maxEvaluationsOverride must be a non-negative integer, received ${String(rawOverride)}`,
        );
      }
    }

    if (this.state.paused) {
      return {
        state: this.state,
        promotedEntityIds: [],
        consumedStimuli: [],
      };
    }

    const sortedEntityIds = Object.keys(this.state.entities).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const totalEntities = sortedEntityIds.length;
    const maxEvaluations = rawOverride ?? this.state.pacingConfig.maxCognitiveEvaluationsPerPulse;

    if (totalEntities === 0 || maxEvaluations <= 0) {
      return {
        state: this.state,
        promotedEntityIds: [],
        consumedStimuli: [],
      };
    }

    const startCursor =
      ((this.state.cognitiveRoundRobinCursor % totalEntities) + totalEntities) % totalEntities;
    let nextCursor = startCursor;
    const nextEntities: Record<string, EntitySimulationState> = {
      ...this.state.entities,
    };
    const promotedEntityIds: string[] = [];
    const consumedStimuli: ConsumedStimulusRecord[] = [];

    for (let offset = 0; offset < totalEntities; offset += 1) {
      if (promotedEntityIds.length >= maxEvaluations) {
        break;
      }

      const idx = (startCursor + offset) % totalEntities;
      const entityId = sortedEntityIds[idx];
      if (entityId === undefined) {
        continue;
      }
      const entity = nextEntities[entityId];
      if (entity === undefined || entity.cognitivePhase !== 'idle') {
        continue;
      }

      const readyStimulusIndex = entity.pendingStimuli.findIndex(
        (s) =>
          this.state.elapsedSimulationSeconds >= s.readyAtElapsedSeconds &&
          (s.cascadeHopCount < this.state.pacingConfig.maxAutonomousCascadeHops ||
            s.externalRelease),
      );
      if (readyStimulusIndex === -1) {
        continue;
      }

      const stimulus = entity.pendingStimuli[readyStimulusIndex];
      if (stimulus === undefined) {
        continue;
      }

      const remainingStimuli = entity.pendingStimuli.filter((_, i) => i !== readyStimulusIndex);
      const scaledDeliberation =
        stimulus.deliberationSeconds * this.state.pacingConfig.deliberationScale;

      nextEntities[entityId] = {
        ...entity,
        cognitivePhase: 'deliberating',
        phaseRemainingSeconds: scaledDeliberation,
        pendingDwellSeconds: stimulus.dwellSeconds,
        pendingCooldownSeconds: stimulus.cooldownSeconds,
        requiresExternalTrigger: stimulus.requiresExternalTrigger,
        pendingStimuli: remainingStimuli,
      };

      promotedEntityIds.push(entityId);
      consumedStimuli.push({ entityId, stimulus });
      nextCursor = (idx + 1) % totalEntities;
    }

    if (promotedEntityIds.length === 0) {
      return {
        state: this.state,
        promotedEntityIds: [],
        consumedStimuli: [],
      };
    }

    this.state = {
      ...this.state,
      cognitiveRoundRobinCursor: nextCursor,
      entities: nextEntities,
    };

    for (const { entityId, stimulus } of consumedStimuli) {
      const scaledDeliberation =
        stimulus.deliberationSeconds * this.state.pacingConfig.deliberationScale;
      this.telemetry.record({
        epochId: this.state.epochId,
        worldTick: this.state.worldTick,
        level: 'info',
        category: 'cognitive',
        actorId: entityId,
        acteeId: stimulus.sourceEntityId,
        action: 'promote_stimulus_to_deliberating',
        inputs: {
          stimulusId: stimulus.stimulusId,
          topic: stimulus.topic,
          cascadeHopCount: stimulus.cascadeHopCount,
          scaledDeliberationSeconds: scaledDeliberation,
        },
        message: `Promoted entity '${entityId}' to deliberating on stimulus '${stimulus.stimulusId}' (${stimulus.topic})`,
      });
    }

    return {
      state: this.state,
      promotedEntityIds,
      consumedStimuli,
    };
  }

  /**
   * Exports the accumulated Dual-Ledger `CivilizationLegacyState`, merging any inherited scars
   * from earlier epochs with scars recorded during the current epoch.
   */
  public exportLegacyState(options?: {
    readonly communicationsBackboneControllerId?: string | undefined;
    readonly lineageMutations?: ReadonlyArray<LineageMutation> | undefined;
  }): CivilizationLegacyState {
    const priorScars: InheritedScar[] =
      this.inheritedLegacyState !== undefined
        ? [...this.inheritedLegacyState.materialScars, ...this.inheritedLegacyState.veilScars]
        : [];

    const combinedMutations: LineageMutation[] = [
      ...(this.inheritedLegacyState?.lineageMutations ?? []),
      ...(options?.lineageMutations ?? []),
    ];

    const backboneController =
      options?.communicationsBackboneControllerId ??
      this.inheritedLegacyState?.communicationsBackboneControllerId;

    return civilizationLegacyFromRecordedScars({
      sourceEpochId: this.state.epochId,
      recordedScars: [...priorScars, ...this.state.recordedLegacyScars],
      ...(backboneController !== undefined
        ? { communicationsBackboneControllerId: backboneController }
        : {}),
      lineageMutations: combinedMutations,
    });
  }

  /**
   * Saves the current `WorldState`, RNG state, state slices, and Dual-Ledger `CivilizationLegacyState`
   * into the named slot via `SaveSlotRepositoryPort`.
   */
  public saveToSlot(slotId: string): SaveSlotEnvelope {
    const worldSnapshot: SerializedWorldStateSnapshot = {
      epochId: this.state.epochId,
      worldTick: this.state.worldTick,
      elapsedSimulationSeconds: this.state.elapsedSimulationSeconds,
      paused: this.state.paused,
      pacingConfig: this.state.pacingConfig,
      cognitiveRoundRobinCursor: this.state.cognitiveRoundRobinCursor,
      entities: structuredClone(this.state.entities),
      props: structuredClone(this.state.props),
      pressureStocks: { ...this.state.pressureStocks },
      discoveryLayer: this.state.discoveryLayer,
      activeEmergencyId: this.state.activeEmergencyId,
      orbitalPass: { ...this.state.orbitalPass },
      emittedAudioCues: structuredClone(this.state.emittedAudioCues),
      recordedLegacyScars: structuredClone(this.state.recordedLegacyScars),
    };

    const envelope = this.saveRepository.saveSlot({
      slotId,
      epochId: this.state.epochId,
      worldTick: this.state.worldTick,
      rngState: this.rng.getState(),
      savedAtIso: this.clock.nowIso(),
      stateSlices: {
        [WORLD_STATE_SNAPSHOT_KEY]: worldSnapshot,
        [CUSTOM_SLICES_SNAPSHOT_KEY]: this.state.stateSlices.toSnapshot(),
      },
      legacyState: legacyStateToRecord(this.exportLegacyState()),
    });

    this.telemetry.record({
      epochId: this.state.epochId,
      worldTick: this.state.worldTick,
      level: 'info',
      category: 'persistence',
      actorId: 'system',
      action: 'save_slot',
      inputs: { slotId: envelope.slotId },
      message: `Saved simulation state to slot '${envelope.slotId}' at tick ${String(this.state.worldTick)}`,
    });

    return envelope;
  }

  /**
   * Restores `WorldState`, RNG state, state slices, and Dual-Ledger `CivilizationLegacyState`
   * atomically from a named save slot.
   */
  public loadFromSlot(slotId: string): WorldState {
    const envelope = this.saveRepository.loadSlot(slotId);
    const rawWorldSnapshot = envelope.stateSlices[WORLD_STATE_SNAPSHOT_KEY];
    if (!isSerializedWorldStateSnapshot(rawWorldSnapshot)) {
      throw new Error(
        `Save slot '${slotId}' does not contain a valid SimulationCoordinator WorldState snapshot`,
      );
    }

    const rawCustomSlices = envelope.stateSlices[CUSTOM_SLICES_SNAPSHOT_KEY];
    const customSlicesRecord =
      typeof rawCustomSlices === 'object' && rawCustomSlices !== null
        ? (rawCustomSlices as Readonly<Record<string, unknown>>)
        : {};

    const nextRng = SeededRandom.fromState(envelope.rngState);
    const nextLegacy =
      envelope.legacyState !== undefined ? parseLegacyState(envelope.legacyState) : undefined;
    const nextPacing = Object.freeze({
      ...SimulationPacingConfigSchema.parse(rawWorldSnapshot.pacingConfig),
    });

    const baseCharacters = this.registry.getAllCharacters();
    const nextResolvedCharacters =
      nextLegacy !== undefined
        ? applyLegacyToCharacterBlueprints(baseCharacters, nextLegacy)
        : [...baseCharacters];

    const nextState: WorldState = {
      epochId: rawWorldSnapshot.epochId,
      worldTick: rawWorldSnapshot.worldTick,
      elapsedSimulationSeconds: rawWorldSnapshot.elapsedSimulationSeconds,
      paused: rawWorldSnapshot.paused,
      pacingConfig: nextPacing,
      cognitiveRoundRobinCursor: rawWorldSnapshot.cognitiveRoundRobinCursor,
      entities: structuredClone(rawWorldSnapshot.entities),
      props: structuredClone(rawWorldSnapshot.props),
      pressureStocks: { ...rawWorldSnapshot.pressureStocks },
      discoveryLayer: rawWorldSnapshot.discoveryLayer,
      activeEmergencyId: rawWorldSnapshot.activeEmergencyId,
      orbitalPass: { ...rawWorldSnapshot.orbitalPass },
      emittedAudioCues: structuredClone(rawWorldSnapshot.emittedAudioCues),
      recordedLegacyScars: structuredClone(rawWorldSnapshot.recordedLegacyScars),
      stateSlices: StateSliceStore.fromSnapshot(customSlicesRecord),
    };

    this.rng = nextRng;
    this.inheritedLegacyState = nextLegacy;
    this.resolvedCharacters = nextResolvedCharacters;
    this.state = nextState;

    this.telemetry.record({
      epochId: this.state.epochId,
      worldTick: this.state.worldTick,
      level: 'info',
      category: 'persistence',
      actorId: 'system',
      action: 'load_slot',
      inputs: { slotId: envelope.slotId },
      message: `Loaded simulation state from slot '${envelope.slotId}' at tick ${String(this.state.worldTick)}`,
    });

    return this.state;
  }
}
