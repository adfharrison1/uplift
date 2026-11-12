import { describe, expect, it } from 'vitest';
import { SimulationCoordinator } from '../../../../src/application/index.js';
import {
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  EpochModuleRegistry,
  FAST_EVAL_PACING_CONFIG,
} from '../../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import { createClock } from './fixtures.js';

describe('SimulationCoordinator simulation', () => {
  it('enforces round-robin anti-thundering-herd evaluation cap under DEFAULT_GAMEPLAY_PACING_CONFIG and supports numeric/options overrides and FAST_EVAL_PACING_CONFIG', () => {
    const registry = makeRegistry();
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
    packId: 'test_door',
    packVersion: 1,
    imports: [],
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
      packId: 'test_offstage',
      packVersion: 1,
      imports: [],
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
