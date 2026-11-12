import { describe, expect, it } from 'vitest';
import type { SpaceKind } from '../../../src/domain/registries/EpochBlueprints.js';
import { stepKinematics } from '../../../src/domain/simulation/KinematicsEngine.js';
import {
  insertEmbodiedBodies,
  SpatialHashGrid,
} from '../../../src/domain/simulation/SpatialHashGrid.js';
import { applyWorldEffects } from '../../../src/domain/simulation/WorldEffectReducer.js';
import {
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  type EntitySimulationState,
  FAST_EVAL_PACING_CONFIG,
  type WorldState,
} from '../../../src/domain/simulation/WorldState.js';
import { makeWorldEntity, makeWorldState } from '../../support/makeWorldState.js';

describe('stepKinematics and applyWorldEffects', () => {
  it('advances an entity smoothly across 60 frames of 1/60s, snaps to [1.4, 0, 0], emits arrival, and transitions to performing_dwell', () => {
    const initial = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha'),
      },
    });

    const { state: withPath } = applyWorldEffects(initial, [
      {
        type: 'move_entity_to_waypoint',
        entityId: 'npc_alpha',
        path: [
          {
            waypointId: 'wp_target',
            spaceId: 'space_alpha',
            position: [1.4, 0, 0],
          },
        ],
      },
    ]);

    let current = withPath;
    let totalArrivals = 0;
    let prevX = 0;

    for (let frame = 1; frame <= 59; frame += 1) {
      const step = stepKinematics(current, 1 / 60);
      current = step.state;
      const x = current.entities['npc_alpha']?.position[0] ?? 0;
      expect(step.arrivals).toHaveLength(0);
      expect(x).toBeGreaterThan(prevX);
      expect(x).toBeCloseTo((frame * 1.4) / 60, 5);
      expect(current.entities['npc_alpha']?.yawRadians).toBeGreaterThan(0);
      prevX = x;
    }

    const finalStep = stepKinematics(current, 1 / 60);
    current = finalStep.state;
    totalArrivals += finalStep.arrivals.length;

    expect(totalArrivals).toBe(1);
    expect(finalStep.arrivals[0]).toEqual({
      entityId: 'npc_alpha',
      waypointId: 'wp_target',
      spaceId: 'space_alpha',
      position: [1.4, 0, 0],
      terminalArrival: true,
    });
    expect(current.entities['npc_alpha']?.position).toEqual([1.4, 0, 0]);
    expect(current.entities['npc_alpha']?.cognitivePhase).toBe('performing_dwell');
    expect(current.entities['npc_alpha']?.phaseRemainingSeconds).toBe(10);
  });

  it('carries leftover intra-frame time accurately across deliberating -> moving -> performing_dwell transitions', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha', {
          cognitivePhase: 'deliberating',
          phaseRemainingSeconds: 2,
          pendingDwellSeconds: 10,
          activePath: [{ waypointId: 'wp_far', spaceId: 'space_alpha', position: [10, 0, 0] }],
        }),
      },
    });

    // 5s frame: 2s spent finishing deliberation, 3s spent walking at 1.4 m/s -> 4.2m
    const step = stepKinematics(state, 5);
    expect(step.state.entities['npc_alpha']?.cognitivePhase).toBe('moving');
    expect(step.state.entities['npc_alpha']?.position[0]).toBeCloseTo(4.2);

    // Mid-frame arrival: 0.7m left at 1.4 m/s takes 0.5s out of a 1.0s frame -> 0.5s applied to dwell (10 - 0.5 = 9.5)
    const arrivalState = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha', {
          cognitivePhase: 'moving',
          pendingDwellSeconds: 10,
          activePath: [{ waypointId: 'wp_near', spaceId: 'space_alpha', position: [0.7, 0, 0] }],
        }),
      },
    });
    const arrivalStep = stepKinematics(arrivalState, 1.0);
    expect(arrivalStep.state.entities['npc_alpha']?.cognitivePhase).toBe('performing_dwell');
    expect(arrivalStep.state.entities['npc_alpha']?.phaseRemainingSeconds).toBeCloseTo(9.5);
  });

  it('handles zero-length segments, multi-waypoint traversal, pause freeze, and invalid dtSeconds rejection', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha', {
          cognitivePhase: 'moving',
          activePath: [
            { waypointId: 'wp_zero', spaceId: 'space_alpha', position: [0, 0, 0] },
            { waypointId: 'wp_mid', spaceId: 'space_alpha', position: [1, 0, 0] },
            { waypointId: 'wp_end', spaceId: 'space_beta', position: [2, 0, 0] },
          ],
        }),
      },
    });

    expect(() => stepKinematics(state, -0.016)).toThrow(RangeError);
    expect(() => stepKinematics(state, Number.NaN)).toThrow(RangeError);
    expect(() => stepKinematics(state, Number.POSITIVE_INFINITY)).toThrow(RangeError);

    // dtSeconds === 0 is a no-op
    const zeroDt = stepKinematics(state, 0);
    expect(zeroDt.state).toBe(state);
    expect(zeroDt.arrivals).toHaveLength(0);

    // Paused state freezes kinematics
    const { state: pausedState } = applyWorldEffects(state, [{ type: 'set_paused', paused: true }]);
    const pausedStep = stepKinematics(pausedState, 1.0);
    expect(pausedStep.state).toBe(pausedState);
    expect(pausedStep.arrivals).toHaveLength(0);

    // Multi-waypoint step in 2.0s at 1.4 m/s (budget 2.8m covers the 2.0m path)
    const multiStep = stepKinematics(state, 2.0);
    expect(multiStep.arrivals.map((a) => a.waypointId)).toEqual(['wp_zero', 'wp_mid', 'wp_end']);
    expect(multiStep.state.entities['npc_alpha']?.position).toEqual([2, 0, 0]);
    expect(multiStep.state.entities['npc_alpha']?.spaceId).toBe('space_beta');
  });

  it('enforces human-paced cognitive phases and anti-thundering-herd stimulus backoff under DEFAULT_GAMEPLAY_PACING_CONFIG, and fast-forwards under FAST_EVAL_PACING_CONFIG', () => {
    const baseState = makeWorldState({
      epochId: 'epoch_test',
      pacingConfig: DEFAULT_GAMEPLAY_PACING_CONFIG,
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha'),
      },
    });

    const { state: afterStimuli } = applyWorldEffects(baseState, [
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'npc_alpha',
        stimulusId: 'stim_hop_1',
        sourceEntityId: 'npc_beta',
        topic: 'audit_notice',
        cascadeHopCount: 1,
        deliberationSeconds: 6,
        dwellSeconds: 8,
        cooldownSeconds: 4,
        requiresExternalTrigger: true,
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'npc_alpha',
        stimulusId: 'stim_hop_2',
        sourceEntityId: 'npc_gamma',
        topic: 'cascade_rumor',
        cascadeHopCount: 2,
        deliberationSeconds: 6,
        dwellSeconds: 8,
        cooldownSeconds: 4,
        requiresExternalTrigger: false,
      },
    ]);

    const stimuli = afterStimuli.entities['npc_alpha']?.pendingStimuli ?? [];
    expect(stimuli[0]?.readyAtElapsedSeconds).toBe(10);
    expect(stimuli[1]?.readyAtElapsedSeconds).toBe(20);
    expect(afterStimuli.entities['npc_alpha']?.cognitivePhase).toBe('awaiting_trigger');

    const { state: releasedState } = applyWorldEffects(afterStimuli, [
      { type: 'release_external_trigger', entityId: 'npc_alpha' },
    ]);
    expect(releasedState.entities['npc_alpha']?.cognitivePhase).toBe('idle');
    expect(releasedState.entities['npc_alpha']?.pendingStimuli[1]?.externalRelease).toBe(true);

    const { state: deliberatingState } = applyWorldEffects(releasedState, [
      {
        type: 'set_cognitive_phase',
        entityId: 'npc_alpha',
        phase: 'deliberating',
        durationSeconds: 6,
        dwellSeconds: 8,
        cooldownSeconds: 4,
        requiresExternalTrigger: true,
      },
    ]);

    const step3s = stepKinematics(deliberatingState, 3);
    expect(step3s.state.entities['npc_alpha']?.cognitivePhase).toBe('deliberating');
    expect(step3s.state.entities['npc_alpha']?.phaseRemainingSeconds).toBe(3);

    const stepToDwell = stepKinematics(step3s.state, 3);
    expect(stepToDwell.state.entities['npc_alpha']?.cognitivePhase).toBe('performing_dwell');
    expect(stepToDwell.state.entities['npc_alpha']?.phaseRemainingSeconds).toBe(8);

    const stepToCooldown = stepKinematics(stepToDwell.state, 8);
    expect(stepToCooldown.state.entities['npc_alpha']?.cognitivePhase).toBe('cooldown');
    expect(stepToCooldown.state.entities['npc_alpha']?.phaseRemainingSeconds).toBe(4);

    const stepToAwaiting = stepKinematics(stepToCooldown.state, 4);
    expect(stepToAwaiting.state.entities['npc_alpha']?.cognitivePhase).toBe('awaiting_trigger');

    // Enqueuing a hop-capped stimulus while an entity is actively moving does NOT freeze its physical walk
    const movingWithHopCap = applyWorldEffects(baseState, [
      {
        type: 'move_entity_to_waypoint',
        entityId: 'npc_alpha',
        path: [{ waypointId: 'wp_2', spaceId: 'space_alpha', position: [1.4, 0, 0] }],
      },
      {
        type: 'enqueue_npc_stimulus',
        targetEntityId: 'npc_alpha',
        stimulusId: 'stim_while_moving',
        sourceEntityId: 'npc_beta',
        topic: 'urgent_rumor',
        cascadeHopCount: 2,
        deliberationSeconds: 5,
        dwellSeconds: 2,
        cooldownSeconds: 2,
        requiresExternalTrigger: false,
      },
    ]);
    expect(movingWithHopCap.state.entities['npc_alpha']?.cognitivePhase).toBe('moving');
    expect(movingWithHopCap.state.entities['npc_alpha']?.requiresExternalTrigger).toBe(true);

    // FAST_EVAL_PACING_CONFIG waterfalls zero-duration phases in a single step
    const fastEvalBase = makeWorldState({
      epochId: 'epoch_test',
      pacingConfig: FAST_EVAL_PACING_CONFIG,
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha'),
      },
    });
    const { state: fastDelib } = applyWorldEffects(fastEvalBase, [
      {
        type: 'set_cognitive_phase',
        entityId: 'npc_alpha',
        phase: 'deliberating',
        durationSeconds: 10,
        dwellSeconds: 15,
        cooldownSeconds: 5,
        requiresExternalTrigger: false,
      },
    ]);
    expect(fastDelib.entities['npc_alpha']?.phaseRemainingSeconds).toBe(0);

    const fastStep = stepKinematics(fastDelib, 0.016);
    expect(fastStep.state.entities['npc_alpha']?.cognitivePhase).toBe('idle');
    expect(fastStep.cognitiveTransitions.map((t) => t.toPhase)).toEqual([
      'performing_dwell',
      'cooldown',
      'idle',
    ]);
  });
});

function xzDistance(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function movingPair(
  left: Partial<EntitySimulationState>,
  right: Partial<EntitySimulationState>,
): WorldState {
  return makeWorldState({
    epochId: 'epoch_test',
    entities: {
      npc_left: makeWorldEntity('npc_left', {
        cognitivePhase: 'moving',
        position: [0, 1, 0],
        activePath: [{ waypointId: 'wp_left', spaceId: 'space_alpha', position: [10, 1, 0] }],
        ...left,
      }),
      npc_right: makeWorldEntity('npc_right', {
        cognitivePhase: 'moving',
        position: [0, 1, 0.4],
        activePath: [{ waypointId: 'wp_right', spaceId: 'space_alpha', position: [10, 1, 0.4] }],
        ...right,
      }),
    },
  });
}

describe('SpatialHashGrid', () => {
  it('returns ids inside 0.75m from the 3×3 neighborhood in ascending order', () => {
    const grid = new SpatialHashGrid();
    grid.insert('npc_b', 1.9, 0.1);
    grid.insert('npc_a', 2.2, 0.1);
    grid.insert('npc_far', 1.9, 2);
    expect(grid.query(1.9, 0.1, 0.75)).toEqual(['npc_a', 'npc_b']);
  });

  it('leaves an off-stage body out of the hash while that body still walks', () => {
    const spaceKinds = new Map<string, SpaceKind>([
      ['space_room', 'indoor_room'],
      ['space_off', 'off_stage_region'],
    ]);
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_indoor: makeWorldEntity('npc_indoor', {
          spaceId: 'space_room',
          cognitivePhase: 'moving',
          position: [0, 2, 0],
          activePath: [{ waypointId: 'wp_room', spaceId: 'space_room', position: [10, 2, 0] }],
        }),
        npc_off: makeWorldEntity('npc_off', {
          spaceId: 'space_off',
          cognitivePhase: 'moving',
          position: [0, 2, 0.4],
          activePath: [{ waypointId: 'wp_off', spaceId: 'space_off', position: [10, 2, 0.4] }],
        }),
      },
    });
    const grid = insertEmbodiedBodies(
      [
        { entityId: 'npc_indoor', spaceId: 'space_room', x: 0, z: 0 },
        { entityId: 'npc_off', spaceId: 'space_off', x: 0.4, z: 0 },
      ],
      spaceKinds,
    );
    expect(grid.query(0, 0, 0.75)).toEqual(['npc_indoor']);
    expect(grid.has('npc_off')).toBe(false);

    const step = stepKinematics(state, 1 / 60, spaceKinds);
    expect(step.state.entities['npc_off']?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(step.state.entities['npc_indoor']?.position[2]).toBe(0);
    expect(step.state.entities['npc_indoor']?.position[0]).toBeCloseTo(1.4 / 60, 5);
  });
});

describe('embodied separation', () => {
  it('separates two walkers without increasing distance to their targets', () => {
    const state = movingPair({}, { separationWeight: 1 });
    const step = stepKinematics(state, 1 / 60);
    const again = stepKinematics(state, 1 / 60);
    const left = step.state.entities['npc_left'];
    const right = step.state.entities['npc_right'];
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    if (left === undefined || right === undefined) {
      return;
    }
    expect(xzDistance(left.position, right.position)).toBeGreaterThan(0.4);
    expect(left.position[1]).toBe(1);
    expect(right.position[1]).toBe(1);
    expect(xzDistance(left.position, [10, 1, 0])).toBeLessThanOrEqual(10);
    expect(xzDistance(right.position, [10, 1, 0.4])).toBeLessThanOrEqual(10);
    const frameCap = 0.15 / 60;
    const stepX = 1.4 / 60;
    expect(Math.hypot(left.position[0] - stepX, left.position[2])).toBeLessThanOrEqual(
      frameCap + 1e-9,
    );
    expect(Math.hypot(right.position[0] - stepX, right.position[2] - 0.4)).toBeLessThanOrEqual(
      frameCap + 1e-9,
    );
    expect(again.state.entities['npc_left']?.position).toEqual(left.position);
    expect(again.state.entities['npc_right']?.position).toEqual(right.position);
  });

  it('caps a slow partial step by the remaining-distance term', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          walkSpeedMetersPerSec: 0.2,
          position: [0, 0, 0],
          activePath: [{ waypointId: 'wp_near', spaceId: 'space_alpha', position: [0.4, 0, 0] }],
        }),
        npc_idle: makeWorldEntity('npc_idle', {
          position: [0, 0, 0.3],
        }),
      },
    });
    const step = stepKinematics(state, 1);
    const walked = step.state.entities['npc_walk'];
    expect(walked?.position[0]).toBeCloseTo(0.2, 5);
    expect(walked?.position[1]).toBe(0);
    expect(walked?.position[2]).toBeCloseTo(-0.1, 5);
    expect(step.state.entities['npc_idle']?.position).toEqual([0, 0, 0.3]);
    expect(step.arrivals).toHaveLength(0);
  });

  it('keeps a packed pair on its authored spacing', () => {
    const step = stepKinematics(
      movingPair({ separationWeight: 0 }, { separationWeight: 0 }),
      1 / 60,
    );
    expect(step.state.entities['npc_left']?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(step.state.entities['npc_left']?.position[2]).toBe(0);
    expect(step.state.entities['npc_right']?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(step.state.entities['npc_right']?.position[2]).toBe(0.4);
  });

  it('lets a weight-1 walker slide around a packed body that does not move aside', () => {
    const step = stepKinematics(
      movingPair({ separationWeight: 1 }, { separationWeight: 0 }),
      1 / 60,
    );
    const packed = step.state.entities['npc_right'];
    const miller = step.state.entities['npc_left'];
    expect(packed?.position[0]).toBeCloseTo(1.4 / 60, 5);
    expect(packed?.position[2]).toBe(0.4);
    expect(miller).toBeDefined();
    if (miller === undefined) {
      return;
    }
    expect(xzDistance(miller.position, [10, 1, 0])).toBeLessThanOrEqual(10);
    expect(miller.position[2]).not.toBe(0);
  });

  it('does not let an idle body on the destination stall arrival', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_idle: makeWorldEntity('npc_idle', {
          position: [2, 0, 0],
          waypointId: 'wp_dest',
        }),
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          position: [0, 0, 0],
          activePath: [{ waypointId: 'wp_dest', spaceId: 'space_alpha', position: [2, 0, 0] }],
        }),
      },
    });
    let current = state;
    let arrived = false;
    for (let frame = 0; frame < 120 && !arrived; frame += 1) {
      const step = stepKinematics(current, 1 / 60);
      current = step.state;
      arrived = step.arrivals.some((event) => event.waypointId === 'wp_dest');
    }
    expect(arrived).toBe(true);
    expect(current.entities['npc_idle']?.position).toEqual([2, 0, 0]);
  });

  it('does not separate entities that are in different spaces', () => {
    const step = stepKinematics(
      movingPair({}, { spaceId: 'space_beta', separationWeight: 1 }),
      1 / 60,
    );
    expect(step.state.entities['npc_left']?.position[2]).toBe(0);
    expect(step.state.entities['npc_right']?.position[2]).toBe(0.4);
  });

  it('snaps onto a target inside 0.05m instead of sliding off an overlapping body', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          position: [0, 3, 0],
          activePath: [{ waypointId: 'wp_near', spaceId: 'space_alpha', position: [0.04, 3, 0] }],
        }),
        npc_block: makeWorldEntity('npc_block', {
          position: [0.04, 3, 0],
          waypointId: 'wp_near',
        }),
      },
    });
    const step = stepKinematics(state, 1 / 60);
    expect(step.state.entities['npc_walk']?.position).toEqual([0.04, 3, 0]);
    expect(step.arrivals[0]?.waypointId).toBe('wp_near');
  });

  it('matches plain path integration for a lone walker', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_lone: makeWorldEntity('npc_lone', {
          cognitivePhase: 'moving',
          activePath: [
            { waypointId: 'wp_mid', spaceId: 'space_alpha', position: [1, 0, 0] },
            { waypointId: 'wp_end', spaceId: 'space_alpha', position: [2, 0, 0] },
          ],
        }),
      },
    });
    const step = stepKinematics(state, 0.5);
    expect(step.state.entities['npc_lone']?.position[0]).toBeCloseTo(0.7, 5);
    expect(step.state.entities['npc_lone']?.position[1]).toBe(0);
    expect(step.state.entities['npc_lone']?.position[2]).toBe(0);
    expect(step.arrivals).toHaveLength(0);
  });

  it('keeps leftover time when a close waypoint is already reachable', () => {
    const neighbor = makeWorldEntity('npc_block', {
      position: [0.04, 0, 0],
      waypointId: 'wp_near',
    });
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_block: neighbor,
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          pendingDwellSeconds: 10,
          activePath: [
            { waypointId: 'wp_near', spaceId: 'space_alpha', position: [0.04, 0, 0] },
            { waypointId: 'wp_far', spaceId: 'space_alpha', position: [10, 0, 0] },
          ],
        }),
      },
    });
    const step = stepKinematics(state, 1);
    expect(step.arrivals.map((event) => event.waypointId)).toEqual(['wp_near']);
    expect(step.state.entities['npc_walk']?.position[0]).toBeCloseTo(1.4, 5);
    expect(step.state.entities['npc_walk']?.cognitivePhase).toBe('moving');
  });

  it('does not teleport a stationary mover onto a nearby waypoint', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_block: makeWorldEntity('npc_block', { position: [0.04, 5, 0] }),
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          walkSpeedMetersPerSec: 0,
          position: [0, 1, 0],
          activePath: [{ waypointId: 'wp_near', spaceId: 'space_alpha', position: [0.04, 5, 0] }],
        }),
      },
    });
    const step = stepKinematics(state, 1 / 60);
    expect(step.arrivals).toHaveLength(0);
    expect(step.state.entities['npc_walk']?.position).toEqual([0, 1, 0]);
  });

  it('does not slide past the current waypoint', () => {
    const state = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_idle: makeWorldEntity('npc_idle', { position: [-0.4, 0, 0] }),
        npc_walk: makeWorldEntity('npc_walk', {
          cognitivePhase: 'moving',
          activePath: [{ waypointId: 'wp_mark', spaceId: 'space_alpha', position: [1, 0, 0] }],
        }),
      },
    });
    const step = stepKinematics(state, 0.7);
    const walked = step.state.entities['npc_walk']?.position[0] ?? 0;
    expect(walked).toBeLessThanOrEqual(1);
    expect(step.state.entities['npc_walk']?.position).toEqual([1, 0, 0]);
    expect(step.arrivals[0]?.waypointId).toBe('wp_mark');
  });
});
