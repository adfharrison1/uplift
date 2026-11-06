import { describe, expect, it } from 'vitest';
import { MAX_FRAME_DT_SECONDS, SimulationCoordinator } from '../../../src/application/index.js';
import {
  createCivilizationLegacyState,
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  EpochModuleRegistry,
  FAST_EVAL_PACING_CONFIG,
  SeededRandom,
  type TelemetryClock,
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
    expect(pulse1.state.cognitiveRoundRobinCursor).toBe(1);
    expect(pulse1.state.entities['char_alpha']?.cognitivePhase).toBe('deliberating');
    expect(pulse1.state.entities['char_alpha']?.phaseRemainingSeconds).toBe(4);
    expect(pulse1.state.entities['char_beta']?.cognitivePhase).toBe('idle');

    // Numeric override pulseCognitiveScheduler(2) promotes the remaining 2 ready entities ('char_beta', 'char_gamma')
    const pulse2 = coordinator.pulseCognitiveScheduler(2);
    expect(pulse2.promotedEntityIds).toEqual(['char_beta', 'char_gamma']);
    expect(pulse2.state.cognitiveRoundRobinCursor).toBe(0);

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
