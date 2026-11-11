import { describe, expect, it } from 'vitest';
import { MAX_FRAME_DT_SECONDS, SimulationCoordinator } from '../../../src/application/index.js';
import {
  createCivilizationLegacyState,
  type CivilizationLegacyState,
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  EpochModuleRegistry,
  FAST_EVAL_PACING_CONFIG,
  legacyStateToRecord,
  type LineageMutation,
  SeededRandom,
  type TelemetryClock,
  type TelemetryEntry,
  type TelemetryEventInput,
} from '../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../src/infrastructure/index.js';

function createClock(): TelemetryClock {
  let elapsed = 0;
  return {
    nowIso(): string {
      return '2026-11-06T21:30:00.000Z';
    },
    elapsedSessionMs(): number {
      elapsed += 16;
      return elapsed;
    },
  };
}

function legacyWithMutations(
  lineageMutations: ReadonlyArray<LineageMutation>,
): CivilizationLegacyState {
  return createCivilizationLegacyState({
    sourceEpochId: 'epoch_0',
    materialScars: [],
    veilScars: [],
    lineageMutations,
  });
}

class FaultingLegacyTelemetry extends InMemorySessionTelemetry {
  public readonly failedWarningAttempts = new Set<number>();
  public warningAttempts = 0;
  public failNextLoadRecord = false;

  public override record(event: TelemetryEventInput): TelemetryEntry {
    if (event.action === 'legacy_drive_clamped') {
      this.warningAttempts += 1;
      if (this.failedWarningAttempts.has(this.warningAttempts)) {
        throw new Error(`warning write ${String(this.warningAttempts)} failed`);
      }
    }
    if (event.action === 'load_slot' && this.failNextLoadRecord) {
      this.failNextLoadRecord = false;
      throw new Error('load_slot record failed');
    }
    return super.record(event);
  }
}

function buildTestRegistry(): EpochModuleRegistry {
  const registry = new EpochModuleRegistry();
  registry.registerPack({
    epochId: 'epoch_sim_test',
    spaces: [
      {
        id: 'space_alpha',
        name: 'Space Alpha',
        kind: 'indoor_room',
        earshotRadiusMeters: 12,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.2,
        connectedSpaceIds: ['space_beta'],
        waypoints: [
          { id: 'wp_a1', position: [0, 0, 0] },
          { id: 'wp_a2', position: [1.4, 0, 0] },
        ],
      },
      {
        id: 'space_beta',
        name: 'Space Beta',
        kind: 'outdoor_area',
        earshotRadiusMeters: 20,
        surfaceMaterial: 'earth',
        acousticClass: 'open_court',
        ambientMaskLoudness: 0.4,
        connectedSpaceIds: ['space_alpha'],
        waypoints: [{ id: 'wp_b1', position: [5, 0, 0] }],
      },
    ],
    props: [
      {
        id: 'prop_gate',
        name: 'Inner Gate',
        spaceId: 'space_alpha',
        waypointId: 'wp_a2',
        tier: 'interactive',
        initialState: { locked: false },
        portalState: 'closed',
      },
    ],
    characters: [
      {
        id: 'char_alpha',
        name: 'Alpha Schemer',
        lineageId: 'lineage_alpha',
        tier: 'utility_schemer',
        startingSpaceId: 'space_alpha',
        startingWaypointId: 'wp_a1',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6.0,
        listenerThreshold: 0.2,
        drives: { curiosity: 0.5, secrecy: 0.4 },
        emergencyVice: 'secrecy',
        inertiaPillars: [{ id: 'pillar_1', kind: 'doctrine', weight: 0.6 }],
      },
      {
        id: 'char_beta',
        name: 'Beta Routine',
        lineageId: 'lineage_beta',
        tier: 'role_routine',
        startingSpaceId: 'space_alpha',
        startingWaypointId: 'wp_a2',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6.0,
        listenerThreshold: 0.25,
        drives: { duty: 0.7, caution: 0.5 },
        emergencyVice: 'caution',
        inertiaPillars: [{ id: 'pillar_2', kind: 'constituency', weight: 0.5 }],
      },
      {
        id: 'char_gamma',
        name: 'Gamma Crowd',
        lineageId: 'lineage_gamma',
        tier: 'ambient_crowd',
        startingSpaceId: 'space_beta',
        startingWaypointId: 'wp_b1',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6.0,
        listenerThreshold: 0.3,
        drives: { conformity: 0.8 },
        emergencyVice: 'conformity',
        inertiaPillars: [],
      },
    ],
    orbitalPass: {
      id: 'orbital_pass_default',
      zenithDurationTicks: 10,
      horizonDurationTicks: 8,
      occludedDurationTicks: 12,
      slingshotCost: 10,
      burnCostPerTick: 25,
      maxDelta: 120,
    },
  });
  return registry;
}

describe('SimulationCoordinator', () => {
  it('initializes WorldState from EpochModuleRegistry with legacy mutations, steps 60Hz kinematics with dt clamping, and freezes when paused', () => {
    const registry = buildTestRegistry();
    const telemetry = new InMemorySessionTelemetry('session_test', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const legacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_0',
      materialScars: [
        {
          scarId: 'scar_charter',
          ledger: 'material',
          description: 'Cooperative charter founded',
          originEpochId: 'epoch_0',
        },
      ],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_charter',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.25,
        },
      ],
    });

    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry,
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(42),
      legacyState: legacy,
    });

    expect(() => coordinator.stepFrame(-0.016)).toThrow(RangeError);
    expect(() => coordinator.stepFrame(Number.NaN)).toThrow(RangeError);

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBeCloseTo(
      0.75,
    );
    expect(coordinator.getWorldState().orbitalPass.maxDelta).toBe(120);

    // Assign movement path to char_alpha
    coordinator.dispatchEffects(
      [
        {
          type: 'move_entity_to_waypoint',
          entityId: 'char_alpha',
          path: [{ waypointId: 'wp_a2', spaceId: 'space_alpha', position: [1.4, 0, 0] }],
        },
      ],
      { actorId: 'char_alpha', action: 'begin_walk', advanceTick: true },
    );

    expect(coordinator.getWorldState().worldTick).toBe(1);

    // Pause freezes both kinematics and effect dispatch
    coordinator.setPaused(true);
    const pausedStep = coordinator.stepFrame(0.1);
    expect(pausedStep.arrivals).toHaveLength(0);
    expect(coordinator.getWorldState().entities['char_alpha']?.position).toEqual([0, 0, 0]);

    const ignoredWhilePaused = coordinator.dispatchEffects([
      {
        type: 'adjust_pressure_stock',
        stock: 'subsistence_pressure',
        delta: 0.5,
      },
    ]);
    expect(ignoredWhilePaused.appliedEffects).toHaveLength(0);

    coordinator.setPaused(false);

    // Oversized frame dtSeconds is clamped to MAX_FRAME_DT_SECONDS (0.25s) under DEFAULT_GAMEPLAY_PACING_CONFIG
    coordinator.stepFrame(2.0);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(MAX_FRAME_DT_SECONDS);

    const clampWarnings = telemetry.query({
      level: 'warn',
      action: 'clamp_frame_dt',
    });
    expect(clampWarnings).toHaveLength(1);

    // Step remaining 0.75s in 3 frames of 0.25s to complete the 1.4m walk at 1.4m/s
    coordinator.stepFrame(0.25);
    coordinator.stepFrame(0.25);
    const finalStep = coordinator.stepFrame(0.25);
    expect(finalStep.arrivals).toHaveLength(1);
    expect(finalStep.arrivals[0]?.waypointId).toBe('wp_a2');

    // Under FAST_EVAL_PACING_CONFIG (allowUnclampedFrameDt: true), stepFrame(2.0) advances a full 2.0s without clamping
    coordinator.setPacingConfig(FAST_EVAL_PACING_CONFIG);
    coordinator.stepFrame(2.0);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(3.0);
    expect(
      telemetry.query({
        level: 'warn',
        action: 'clamp_frame_dt',
      }),
    ).toHaveLength(1);
  });

  it('enforces round-robin anti-thundering-herd evaluation cap under DEFAULT_GAMEPLAY_PACING_CONFIG and supports numeric/options overrides and FAST_EVAL_PACING_CONFIG', () => {
    const registry = buildTestRegistry();
    const telemetry = new InMemorySessionTelemetry('session_rr', createClock());
    const saveRepository = new InMemorySaveSlotRepository();

    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry,
      telemetry,
      saveRepository,
      clock: createClock(),
      pacingConfig: DEFAULT_GAMEPLAY_PACING_CONFIG,
    });

    expect(() => coordinator.pulseCognitiveScheduler(-1)).toThrow(RangeError);
    expect(() => coordinator.pulseCognitiveScheduler(Number.NaN)).toThrow(RangeError);

    // Enqueue 3 stimuli (hop 0 -> ready after baseDigestionDelaySeconds = 5.0s)
    coordinator.dispatchEffects([
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_alpha',
        stimulusId: 'stim_alpha',
        sourceEntityId: 'player',
        topic: 'audit_notice',
        cascadeHopCount: 0,
        deliberationSeconds: 4,
        dwellSeconds: 6,
        cooldownSeconds: 2,
        requiresExternalTrigger: false,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_beta',
        stimulusId: 'stim_beta',
        sourceEntityId: 'player',
        topic: 'audit_notice',
        cascadeHopCount: 0,
        deliberationSeconds: 4,
        dwellSeconds: 6,
        cooldownSeconds: 2,
        requiresExternalTrigger: false,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_gamma',
        stimulusId: 'stim_gamma',
        sourceEntityId: 'player',
        topic: 'audit_notice',
        cascadeHopCount: 0,
        deliberationSeconds: 4,
        dwellSeconds: 6,
        cooldownSeconds: 2,
        requiresExternalTrigger: false,
      },
    ]);

    // Before 5.0s digestion delay, no stimulus is ready
    const earlyPulse = coordinator.pulseCognitiveScheduler();
    expect(earlyPulse.promotedEntityIds).toEqual([]);

    // Advance 5.0s across 20 frames of 0.25s
    for (let i = 0; i < 20; i += 1) {
      coordinator.stepFrame(0.25);
    }

    // Pulse 1 promotes only 1 entity ('char_alpha') and advances cursor to 1
    const pulse1 = coordinator.pulseCognitiveScheduler();
    expect(pulse1.promotedEntityIds).toEqual(['char_alpha']);
    expect(pulse1.consumedStimuli[0]?.stimulus.stimulusId).toBe('stim_alpha');
    expect(pulse1.state.cognitiveRoundRobinCursor).toBe(1);
    expect(pulse1.state.entities['char_alpha']?.cognitivePhase).toBe('deliberating');
    expect(pulse1.state.entities['char_alpha']?.phaseRemainingSeconds).toBe(4);
    expect(pulse1.state.entities['char_beta']?.cognitivePhase).toBe('idle');

    // Pulse 2 (default cap 1) starts at cursor 1 and promotes 'char_beta', advancing cursor to 2
    const pulse2 = coordinator.pulseCognitiveScheduler();
    expect(pulse2.promotedEntityIds).toEqual(['char_beta']);
    expect(pulse2.consumedStimuli[0]?.stimulus.stimulusId).toBe('stim_beta');
    expect(pulse2.state.cognitiveRoundRobinCursor).toBe(2);

    // Pulse 3 with numeric override pulseCognitiveScheduler(2) promotes remaining ready entity ('char_gamma') and wraps cursor to 0
    const pulse3 = coordinator.pulseCognitiveScheduler(2);
    expect(pulse3.promotedEntityIds).toEqual(['char_gamma']);
    expect(pulse3.state.cognitiveRoundRobinCursor).toBe(0);

    // Switch to FAST_EVAL_PACING_CONFIG and enqueue stimuli on all 3 characters after resetting phases
    coordinator.setPacingConfig(FAST_EVAL_PACING_CONFIG);
    coordinator.dispatchEffects([
      {
        type: 'set_cognitive_phase',
        entityId: 'char_alpha',
        phase: 'idle',
        durationSeconds: 0,
      },
      {
        type: 'set_cognitive_phase',
        entityId: 'char_beta',
        phase: 'idle',
        durationSeconds: 0,
      },
      {
        type: 'set_cognitive_phase',
        entityId: 'char_gamma',
        phase: 'idle',
        durationSeconds: 0,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_alpha',
        stimulusId: 'stim_fast_1',
        sourceEntityId: 'player',
        topic: 'fast_eval',
        cascadeHopCount: 0,
        deliberationSeconds: 5,
        dwellSeconds: 5,
        cooldownSeconds: 5,
        requiresExternalTrigger: false,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_beta',
        stimulusId: 'stim_fast_2',
        sourceEntityId: 'player',
        topic: 'fast_eval',
        cascadeHopCount: 0,
        deliberationSeconds: 5,
        dwellSeconds: 5,
        cooldownSeconds: 5,
        requiresExternalTrigger: false,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'char_gamma',
        stimulusId: 'stim_fast_3',
        sourceEntityId: 'player',
        topic: 'fast_eval',
        cascadeHopCount: 0,
        deliberationSeconds: 5,
        dwellSeconds: 5,
        cooldownSeconds: 5,
        requiresExternalTrigger: false,
      },
    ]);

    // Under FAST_EVAL_PACING_CONFIG, all 3 ready entities promote in a single pulse with scaled duration 0
    const fastPulse = coordinator.pulseCognitiveScheduler();
    expect(fastPulse.promotedEntityIds).toEqual(['char_alpha', 'char_beta', 'char_gamma']);
    expect(fastPulse.state.entities['char_alpha']?.phaseRemainingSeconds).toBe(0);
  });

  it('saves and loads complete WorldState, RNG state, custom slices, and Dual-Ledger CivilizationLegacyState atomically', () => {
    const registry = buildTestRegistry();
    const telemetry = new InMemorySessionTelemetry('session_save', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const inheritedLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_0',
      materialScars: [
        {
          scarId: 'scar_epoch0_material',
          ledger: 'material',
          description: 'Inherited bridge charter',
          originEpochId: 'epoch_0',
        },
      ],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_epoch0_material',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.1,
        },
      ],
    });

    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry,
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(999),
      pacingConfig: FAST_EVAL_PACING_CONFIG,
      legacyState: inheritedLegacy,
    });

    coordinator.dispatchEffects(
      [
        {
          type: 'adjust_pressure_stock',
          stock: 'production_pressure',
          delta: 0.45,
        },
        {
          type: 'set_discovery_layer',
          layer: 'assayed',
        },
        {
          type: 'record_legacy_scar',
          scarId: 'scar_epoch1_veil',
          ledger: 'veil',
          description: 'Doctrinal schism recorded',
        },
        {
          type: 'set_state_slice',
          sliceId: 'custom_module_slice',
          value: { counter: 7 },
        },
      ],
      { advanceTick: true },
    );

    const savedRngState = coordinator.getRng().getState();
    const envelope = coordinator.saveToSlot('slot_alpha_1');
    expect(envelope.worldTick).toBe(1);

    // Mutate state further after saving
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects(
      [
        {
          type: 'set_discovery_layer',
          layer: 'theorized',
        },
      ],
      { advanceTick: true },
    );
    expect(coordinator.getWorldState().worldTick).toBe(2);

    // Foreign slot missing WorldState snapshot throws atomically without altering RNG or state
    saveRepository.saveSlot({
      slotId: 'slot_foreign',
      epochId: 'epoch_sim_test',
      worldTick: 99,
      rngState: 12345,
      stateSlices: {},
    });
    const rngBeforeFailedLoad = coordinator.getRng().getState();
    expect(() => coordinator.loadFromSlot('slot_foreign')).toThrow(
      /does not contain a valid SimulationCoordinator WorldState snapshot/,
    );
    expect(coordinator.getRng().getState()).toBe(rngBeforeFailedLoad);
    expect(coordinator.getWorldState().worldTick).toBe(2);

    // Load restores tick 1, RNG state, discoveryLayer, custom slice, and combined Dual-Ledger legacy
    const restored = coordinator.loadFromSlot('slot_alpha_1');
    expect(restored.worldTick).toBe(1);
    expect(restored.discoveryLayer).toBe('assayed');
    expect(restored.pressureStocks.production_pressure).toBeCloseTo(0.45);
    expect(restored.stateSlices.toSnapshot()['custom_module_slice']).toEqual({
      counter: 7,
    });
    expect(coordinator.getRng().getState()).toBe(savedRngState);

    const exportedLegacy = coordinator.exportLegacyState({
      communicationsBackboneControllerId: 'office_alpha',
    });
    expect(exportedLegacy.materialScars).toHaveLength(1);
    expect(exportedLegacy.materialScars[0]?.scarId).toBe('scar_epoch0_material');
    expect(exportedLegacy.veilScars).toHaveLength(1);
    expect(exportedLegacy.veilScars[0]?.scarId).toBe('scar_epoch1_veil');
    expect(exportedLegacy.lineageMutations).toHaveLength(1);
    expect(exportedLegacy.communicationsBackboneControllerId).toBe('office_alpha');
  });
});

describe('SimulationCoordinator legacy clamp consumers', () => {
  const driveTarget = { kind: 'drive', key: 'curiosity' } as const;
  const highLegacy = legacyWithMutations([
    {
      lineageId: 'lineage_alpha',
      sourceScarId: 'scar_high',
      target: driveTarget,
      strategy: 'add',
      delta: 0.75,
    },
  ]);

  it('starts with saturated entities, resolved blueprints, immutable notes and queryable startup warnings', () => {
    const telemetry = new InMemorySessionTelemetry('session_startup_clamp', createClock());
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository: new InMemorySaveSlotRepository(),
      clock: createClock(),
      legacyState: highLegacy,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(coordinator.getResolvedCharacters()[0]?.drives['curiosity']).toBe(1);
    expect(coordinator.getLegacyClampNotes()).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'curiosity',
        unclampedValue: 1.25,
        clampedValue: 1,
      },
    ]);
    expect(Object.isFrozen(coordinator.getLegacyClampNotes())).toBe(true);
    expect(Object.isFrozen(coordinator.getLegacyClampNotes()[0])).toBe(true);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toMatchObject([
      {
        epochId: 'epoch_sim_test',
        worldTick: 0,
        category: 'legacy',
        actorId: 'char_alpha',
        inputs: {
          lineageId: 'lineage_alpha',
          characterId: 'char_alpha',
          driveKey: 'curiosity',
          unclampedValue: 1.25,
          clampedValue: 1,
          resolutionPhase: 'startup',
        },
      },
    ]);
  });

  it('loads a low-clamp blueprint while retaining the saved world and raw RNG continuation', () => {
    const telemetry = new InMemorySessionTelemetry('session_load_clamp', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(42),
    });
    coordinator.getRng().nextUint32();
    const saved = coordinator.saveToSlot('slot_low_clamp');
    const expectedNextDraw = SeededRandom.fromState(saved.rngState).nextUint32();
    const lowLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);
    saveRepository.saveSlot({ ...saved, legacyState: legacyStateToRecord(lowLegacy) });
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    expect(coordinator.getWorldState().worldTick).toBe(1);

    const restored = coordinator.loadFromSlot('slot_low_clamp');

    expect(restored.worldTick).toBe(saved.worldTick);
    expect(restored.entities['char_alpha']?.drives['secrecy']).toBe(0.4);
    expect(coordinator.getResolvedCharacters()[0]?.drives['secrecy']).toBe(0);
    expect(coordinator.getLegacyClampNotes()).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'secrecy',
        unclampedValue: -0.35,
        clampedValue: 0,
      },
    ]);
    expect(coordinator.getRng().nextUint32()).toBe(expectedNextDraw);
    expect(telemetry.query({ action: 'load_slot' })).toMatchObject([
      { worldTick: saved.worldTick },
    ]);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toMatchObject([
      {
        epochId: 'epoch_sim_test',
        worldTick: saved.worldTick,
        category: 'legacy',
        inputs: {
          lineageId: 'lineage_alpha',
          characterId: 'char_alpha',
          driveKey: 'secrecy',
          unclampedValue: -0.35,
          clampedValue: 0,
          resolutionPhase: 'load',
          slotId: 'slot_low_clamp',
        },
        message: expect.stringMatching(/blueprint/),
      },
    ]);
  });

  it('emits no clamp warning for a finite final drive returned to range by an explicit clamp', () => {
    const telemetry = new InMemorySessionTelemetry('session_no_clamp', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const inRangeLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: driveTarget,
        strategy: 'add',
        delta: 0.75,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_bound',
        target: driveTarget,
        strategy: 'clamp',
        min: 0,
        max: 1,
      },
    ]);
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: inRangeLegacy,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    coordinator.saveToSlot('slot_in_range');
    coordinator.loadFromSlot('slot_in_range');
    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toEqual([]);
  });

  it('replaces startup clamp notes with an empty latest load result', () => {
    const telemetry = new InMemorySessionTelemetry('session_latest_notes', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: highLegacy,
    });
    expect(coordinator.getLegacyClampNotes()).toHaveLength(1);
    const saved = coordinator.saveToSlot('slot_latest_notes');
    const inRangeLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_in_range',
        target: driveTarget,
        strategy: 'add',
        delta: 0.25,
      },
    ]);
    saveRepository.saveSlot({ ...saved, legacyState: legacyStateToRecord(inRangeLegacy) });

    coordinator.loadFromSlot('slot_latest_notes');

    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    expect(coordinator.getResolvedCharacters()[0]?.drives['curiosity']).toBe(0.75);
    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toHaveLength(1);
  });

  it('leaves every prior coordinator field intact for each invalid load', () => {
    const telemetry = new InMemorySessionTelemetry('session_invalid_load', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(99),
      legacyState: highLegacy,
    });
    const saved = coordinator.saveToSlot('slot_base_valid');
    const base = { lineageId: 'lineage_alpha', sourceScarId: 'scar_invalid' } as const;
    const override = { ...base, target: driveTarget, strategy: 'override', value: 0.25 } as const;
    const invalidCases: ReadonlyArray<{
      readonly name: string;
      readonly legacyState: Readonly<Record<string, unknown>>;
      readonly expected: RegExp;
    }> = [
      {
        name: 'conflict',
        legacyState: legacyStateToRecord(
          legacyWithMutations([override, { ...override, sourceScarId: 'scar_second' }]),
        ),
        expected: /Conflicting override/,
      },
      {
        name: 'drive',
        legacyState: legacyStateToRecord(
          legacyWithMutations([{ ...override, target: { kind: 'drive', key: 'toString' } }]),
        ),
        expected: /unknown drive/,
      },
      {
        name: 'pillar',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            { ...override, target: { kind: 'inertia_weight', pillarId: 'missing' } },
          ]),
        ),
        expected: /unknown inertiaPillar/,
      },
      {
        name: 'interval',
        legacyState: {
          ...legacyWithMutations([]),
          lineageMutations: [{ ...base, target: driveTarget, strategy: 'clamp', min: 1, max: 0 }],
        },
        expected: /clamp min must be <= max/,
      },
      {
        name: 'drive_overflow',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            { ...base, target: driveTarget, strategy: 'override', value: Number.MAX_VALUE },
            { ...base, target: driveTarget, strategy: 'add', delta: Number.MAX_VALUE },
            { ...base, target: driveTarget, strategy: 'clamp', min: 0, max: 1 },
          ]),
        ),
        expected: /non-finite/,
      },
      {
        name: 'pillar_overflow',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: Number.MAX_VALUE,
            },
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: Number.MAX_VALUE,
            },
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'override',
              value: 0.5,
            },
          ]),
        ),
        expected: /non-finite/,
      },
      {
        name: 'negative_pillar',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: -1,
            },
          ]),
        ),
        expected: /out of bounds/,
      },
    ];
    const priorState = coordinator.getWorldState();
    const priorRng = coordinator.getRng();
    const priorRngWord = priorRng.getState();
    const priorCharacters = coordinator.getResolvedCharacters();
    const priorNotes = coordinator.getLegacyClampNotes();
    const priorLegacy = coordinator.exportLegacyState();

    for (const [index, invalid] of invalidCases.entries()) {
      const slotId = `invalid_${String(index)}`;
      saveRepository.saveSlot({ ...saved, slotId, legacyState: invalid.legacyState });
      expect(() => coordinator.loadFromSlot(slotId), invalid.name).toThrow(invalid.expected);
      expect(coordinator.getWorldState(), invalid.name).toBe(priorState);
      expect(coordinator.getRng(), invalid.name).toBe(priorRng);
      expect(coordinator.getRng().getState(), invalid.name).toBe(priorRngWord);
      expect(coordinator.getResolvedCharacters(), invalid.name).toBe(priorCharacters);
      expect(coordinator.getLegacyClampNotes(), invalid.name).toBe(priorNotes);
      expect(coordinator.exportLegacyState(), invalid.name).toEqual(priorLegacy);
    }
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(0);
  });

  it('continues after first and later clamp-warning writes fail while retaining notes', () => {
    const telemetry = new FaultingLegacyTelemetry('session_warning_faults', createClock());
    telemetry.failedWarningAttempts.add(1);
    telemetry.failedWarningAttempts.add(4);
    const saveRepository = new InMemorySaveSlotRepository();
    const twoClamps = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: driveTarget,
        strategy: 'add',
        delta: 0.75,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: twoClamps,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives).toEqual({
      curiosity: 1,
      secrecy: 0,
    });
    expect(coordinator.getLegacyClampNotes()).toHaveLength(2);
    expect(telemetry.warningAttempts).toBe(2);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(1);

    coordinator.saveToSlot('slot_warning_faults');
    expect(() => coordinator.loadFromSlot('slot_warning_faults')).not.toThrow();
    expect(coordinator.getLegacyClampNotes()).toHaveLength(2);
    expect(telemetry.warningAttempts).toBe(4);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(2);
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(1);
  });

  it('keeps prior world, RNG, legacy, characters and notes when load_slot recording fails, then retries', () => {
    const telemetry = new FaultingLegacyTelemetry('session_load_record_fault', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: buildTestRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(71),
      legacyState: highLegacy,
    });
    const saved = coordinator.saveToSlot('slot_retry');
    const lowLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);
    saveRepository.saveSlot({ ...saved, legacyState: legacyStateToRecord(lowLegacy) });
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    const priorState = coordinator.getWorldState();
    const priorRng = coordinator.getRng();
    const priorRngWord = priorRng.getState();
    const priorCharacters = coordinator.getResolvedCharacters();
    const priorNotes = coordinator.getLegacyClampNotes();
    const priorLegacy = coordinator.exportLegacyState();
    telemetry.failNextLoadRecord = true;

    expect(() => coordinator.loadFromSlot('slot_retry')).toThrow(/load_slot record failed/);
    expect(coordinator.getWorldState()).toBe(priorState);
    expect(coordinator.getRng()).toBe(priorRng);
    expect(coordinator.getRng().getState()).toBe(priorRngWord);
    expect(coordinator.getResolvedCharacters()).toBe(priorCharacters);
    expect(coordinator.getLegacyClampNotes()).toBe(priorNotes);
    expect(coordinator.exportLegacyState()).toEqual(priorLegacy);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(1);

    const restored = coordinator.loadFromSlot('slot_retry');
    expect(restored.worldTick).toBe(saved.worldTick);
    expect(coordinator.getRng().getState()).toBe(saved.rngState);
    expect(coordinator.getResolvedCharacters()[0]?.drives['secrecy']).toBe(0);
    expect(coordinator.getLegacyClampNotes()[0]?.driveKey).toBe('secrecy');
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(1);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(2);
  });
});

function doorCoordinator(options: {
  readonly portalState: 'open' | 'ajar' | 'closed' | 'barred';
  readonly startWaypointId: 'wp_lane' | 'wp_door';
  readonly separationWeight?: number;
  readonly witness?: boolean;
}): SimulationCoordinator {
  const registry = new EpochModuleRegistry();
  registry.registerPack({
    epochId: 'epoch_door',
    spaces: [
      {
        id: 'space_yard',
        name: 'Yard',
        kind: 'outdoor_area',
        earshotRadiusMeters: 12,
        surfaceMaterial: 'mud',
        acousticClass: 'open_court',
        ambientMaskLoudness: 0.2,
        connectedSpaceIds: ['space_room'],
        waypoints: [
          { id: 'wp_lane', position: [0, 0, 0] },
          { id: 'wp_door', position: [4, 0, 0] },
        ],
      },
      {
        id: 'space_room',
        name: 'Room',
        kind: 'indoor_room',
        earshotRadiusMeters: 6,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: ['space_yard'],
        waypoints: [{ id: 'wp_inside', position: [8, 0, 0] }],
      },
    ],
    props: [
      {
        id: 'prop_door',
        name: 'Door',
        spaceId: 'space_yard',
        waypointId: 'wp_door',
        tier: 'interactive',
        initialState: {},
        portalState: options.portalState,
        portalTargetSpaceId: 'space_room',
        portalTargetWaypointId: 'wp_inside',
      },
    ],
    characters: [
      {
        id: 'char_walker',
        name: 'Walker',
        lineageId: 'lineage_walker',
        tier: 'role_routine',
        startingSpaceId: 'space_yard',
        startingWaypointId: options.startWaypointId,
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.4 },
        emergencyVice: 'duty',
        inertiaPillars: [],
        ...(options.separationWeight !== undefined
          ? { separationWeight: options.separationWeight }
          : {}),
      },
      ...(options.witness === true
        ? [
            {
              id: 'char_witness',
              name: 'Witness',
              lineageId: 'lineage_witness',
              tier: 'role_routine' as const,
              startingSpaceId: 'space_yard',
              startingWaypointId: 'wp_door' as const,
              walkSpeedMetersPerSec: 1.4,
              yawSpeedRadiansPerSec: 6,
              listenerThreshold: 0.2,
              drives: { duty: 0.4 },
              emergencyVice: 'duty' as const,
              inertiaPillars: [],
              separationWeight: 1,
            },
          ]
        : []),
    ],
  });
  return new SimulationCoordinator({
    epochId: 'epoch_door',
    registry,
    telemetry: new InMemorySessionTelemetry('session_door', createClock()),
    saveRepository: new InMemorySaveSlotRepository(),
    clock: createClock(),
    pacingConfig: FAST_EVAL_PACING_CONFIG,
  });
}

describe('waypoint requests and portal truncation', () => {
  it('copies authored separation weight and rejects an unknown or out-of-range change', () => {
    const coordinator = doorCoordinator({
      portalState: 'open',
      startWaypointId: 'wp_lane',
      witness: true,
    });
    expect(coordinator.getWorldState().entities['char_walker']?.separationWeight).toBe(1);
    coordinator.dispatchEffects([
      { type: 'set_separation_weight', entityId: 'char_walker', weight: 0 },
    ]);
    expect(coordinator.getWorldState().entities['char_walker']?.separationWeight).toBe(0);
    expect(coordinator.getWorldState().entities['char_witness']?.separationWeight).toBe(1);
    expect(() =>
      coordinator.dispatchEffects([
        { type: 'set_separation_weight', entityId: 'char_witness', weight: 0 },
        { type: 'set_separation_weight', entityId: 'char_missing', weight: 0 },
      ]),
    ).toThrow(/Unknown entityId 'char_missing'/);
    expect(coordinator.getWorldState().entities['char_walker']?.separationWeight).toBe(0);
    expect(coordinator.getWorldState().entities['char_witness']?.separationWeight).toBe(1);

    const packed = doorCoordinator({
      portalState: 'open',
      startWaypointId: 'wp_lane',
      separationWeight: 0,
    });
    expect(packed.getWorldState().entities['char_walker']?.separationWeight).toBe(0);
    packed.dispatchEffects([{ type: 'set_separation_weight', entityId: 'char_walker', weight: 0 }]);
    expect(() =>
      packed.dispatchEffects([
        { type: 'set_separation_weight', entityId: 'char_missing', weight: 0 },
      ]),
    ).toThrow(/Unknown entityId 'char_missing'/);
    expect(packed.getWorldState().entities['char_walker']?.separationWeight).toBe(0);
    expect(() =>
      packed.dispatchEffects([
        { type: 'set_separation_weight', entityId: 'char_walker', weight: 1.5 },
      ]),
    ).toThrow();
    expect(packed.getWorldState().entities['char_walker']?.separationWeight).toBe(0);
  });

  it('stores a path for a deliberating entity without forcing moving', () => {
    const coordinator = doorCoordinator({ portalState: 'open', startWaypointId: 'wp_lane' });
    coordinator.dispatchEffects([
      {
        type: 'set_cognitive_phase',
        entityId: 'char_walker',
        phase: 'deliberating',
        durationSeconds: 4,
      },
    ]);
    expect(coordinator.requestWaypointMove('char_walker', 'wp_inside')).toBe('path');
    const entity = coordinator.getWorldState().entities['char_walker'];
    expect(entity?.cognitivePhase).toBe('deliberating');
    expect(entity?.activePath.map((target) => target.waypointId)).toEqual(['wp_door', 'wp_inside']);
  });

  it('leaves state unchanged for a blocked, unknown, already-there, or paused request', () => {
    const barred = doorCoordinator({ portalState: 'barred', startWaypointId: 'wp_lane' });
    const before = barred.getWorldState();
    const entityBefore = before.entities['char_walker'];
    expect(barred.requestWaypointMove('char_walker', 'wp_inside')).toBe('blocked');
    expect(barred.getWorldState()).toBe(before);
    expect(barred.getWorldState().entities['char_walker']).toEqual(entityBefore);

    expect(barred.requestWaypointMove('char_missing', 'wp_door')).toBe('unknown_entity');
    expect(barred.requestWaypointMove('char_walker', 'wp_missing')).toBe('unknown_waypoint');
    expect(barred.requestWaypointMove('char_walker', 'wp_lane')).toBe('already_there');
    expect(barred.getWorldState()).toBe(before);

    barred.setPaused(true);
    const paused = barred.getWorldState();
    expect(barred.requestWaypointMove('char_walker', 'wp_door')).toBe('paused');
    expect(barred.requestSetPortalState('prop_door', 'open')).toBe('paused');
    expect(barred.getWorldState()).toBe(paused);
    expect(barred.getWorldState().entities['char_walker']?.activePath).toEqual([]);
    expect(barred.getWorldState().props['prop_door']?.portalState).toBe('barred');
  });

  it('returns unknown_prop without changing portal state', () => {
    const coordinator = doorCoordinator({ portalState: 'open', startWaypointId: 'wp_lane' });
    const before = coordinator.getWorldState();
    expect(coordinator.requestSetPortalState('prop_missing', 'barred')).toBe('unknown_prop');
    expect(coordinator.getWorldState()).toBe(before);
  });

  it('drops the far side when the door bars before a large step', () => {
    const fromLane = doorCoordinator({ portalState: 'open', startWaypointId: 'wp_lane' });
    expect(fromLane.requestWaypointMove('char_walker', 'wp_inside')).toBe('path');
    expect(fromLane.requestSetPortalState('prop_door', 'barred')).toBe('updated');
    const laneStep = fromLane.stepFrame(10);
    const laneEntity = laneStep.state.entities['char_walker'];
    expect(laneEntity?.spaceId).toBe('space_yard');
    expect(laneEntity?.position).toEqual([4, 0, 0]);
    expect(laneStep.arrivals.map((event) => event.waypointId)).toEqual(['wp_door']);

    const atDoor = doorCoordinator({ portalState: 'open', startWaypointId: 'wp_door' });
    expect(atDoor.requestWaypointMove('char_walker', 'wp_inside')).toBe('path');
    expect(atDoor.getWorldState().entities['char_walker']?.activePath).toEqual([
      expect.objectContaining({ waypointId: 'wp_inside', spaceId: 'space_room' }),
    ]);
    expect(atDoor.requestSetPortalState('prop_door', 'barred')).toBe('updated');
    const doorStep = atDoor.stepFrame(10);
    expect(doorStep.arrivals).toHaveLength(0);
    expect(doorStep.state.entities['char_walker']?.spaceId).toBe('space_yard');
    expect(doorStep.state.entities['char_walker']?.position).toEqual([4, 0, 0]);
    expect(doorStep.state.entities['char_walker']?.activePath).toEqual([]);
  });

  it('keeps an off-stage pair on its path when stepFrame supplies space kinds', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack({
      epochId: 'epoch_offstage',
      spaces: [
        {
          id: 'space_off',
          name: 'Off Stage',
          kind: 'off_stage_region',
          earshotRadiusMeters: 8,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: [],
          waypoints: [
            { id: 'wp_a0', position: [0, 0, 0], neighborWaypointIds: ['wp_a1'] },
            { id: 'wp_a1', position: [10, 0, 0], neighborWaypointIds: ['wp_a0'] },
            { id: 'wp_b0', position: [0, 0, 0.4], neighborWaypointIds: ['wp_b1'] },
            { id: 'wp_b1', position: [10, 0, 0.4], neighborWaypointIds: ['wp_b0'] },
          ],
        },
      ],
      characters: [
        {
          id: 'char_a',
          name: 'A',
          lineageId: 'lineage_a',
          tier: 'role_routine',
          startingSpaceId: 'space_off',
          startingWaypointId: 'wp_a0',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          listenerThreshold: 0.2,
          drives: { duty: 0.4 },
          emergencyVice: 'duty',
          inertiaPillars: [],
        },
        {
          id: 'char_b',
          name: 'B',
          lineageId: 'lineage_b',
          tier: 'role_routine',
          startingSpaceId: 'space_off',
          startingWaypointId: 'wp_b0',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          listenerThreshold: 0.2,
          drives: { duty: 0.4 },
          emergencyVice: 'duty',
          inertiaPillars: [],
        },
      ],
    });
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_offstage',
      registry,
      telemetry: new InMemorySessionTelemetry('session_offstage', createClock()),
      saveRepository: new InMemorySaveSlotRepository(),
      clock: createClock(),
      pacingConfig: FAST_EVAL_PACING_CONFIG,
    });
    expect(coordinator.requestWaypointMove('char_a', 'wp_a1')).toBe('path');
    expect(coordinator.requestWaypointMove('char_b', 'wp_b1')).toBe('path');
    const step = coordinator.stepFrame(1 / 60);
    const left = step.state.entities['char_a'];
    const right = step.state.entities['char_b'];
    expect(left?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(left?.position[2]).toBe(0);
    expect(right?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(right?.position[2]).toBe(0.4);
  });
});
