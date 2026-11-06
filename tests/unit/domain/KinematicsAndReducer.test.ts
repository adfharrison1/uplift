import { describe, expect, it } from 'vitest';
import { defineStateSlice } from '../../../src/domain/core/StateSliceRegistry.js';
import { stepKinematics } from '../../../src/domain/simulation/KinematicsEngine.js';
import { applyWorldEffects } from '../../../src/domain/simulation/WorldEffectReducer.js';
import {
  createInitialWorldState,
  DEFAULT_GAMEPLAY_PACING_CONFIG,
  type EntitySimulationState,
  FAST_EVAL_PACING_CONFIG,
} from '../../../src/domain/simulation/WorldState.js';

function makeTestEntity(
  entityId: string,
  overrides: Partial<EntitySimulationState> = {},
): EntitySimulationState {
  return {
    entityId,
    lineageId: `lineage_${entityId}`,
    spaceId: 'space_alpha',
    waypointId: 'wp_start',
    position: [0, 0, 0],
    yawRadians: 0,
    walkSpeedMetersPerSec: 1.4,
    yawSpeedRadiansPerSec: 6.0,
    cognitivePhase: 'idle',
    phaseRemainingSeconds: 0,
    pendingDwellSeconds: 10,
    pendingCooldownSeconds: 5,
    requiresExternalTrigger: false,
    activePath: [],
    drives: { curiosity: 0.5, secrecy: 0.3 },
    emergencyVice: 'secrecy',
    inertiaPillars: [
      { id: 'pillar_doc', kind: 'doctrine', weight: 0.7 },
      { id: 'pillar_debt', kind: 'debt', weight: 0.4 },
    ],
    pendingStimuli: [],
    ...overrides,
  };
}

describe('stepKinematics and applyWorldEffects', () => {
  it('advances an entity smoothly across 60 frames of 1/60s, snaps to [1.4, 0, 0], emits arrival, and transitions to performing_dwell', () => {
    const initial = createInitialWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeTestEntity('npc_alpha'),
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
    const state = createInitialWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeTestEntity('npc_alpha', {
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
    const arrivalState = createInitialWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeTestEntity('npc_alpha', {
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
    const state = createInitialWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeTestEntity('npc_alpha', {
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
    const baseState = createInitialWorldState({
      epochId: 'epoch_test',
      pacingConfig: DEFAULT_GAMEPLAY_PACING_CONFIG,
      entities: {
        npc_alpha: makeTestEntity('npc_alpha'),
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
    const fastEvalBase = createInitialWorldState({
      epochId: 'epoch_test',
      pacingConfig: FAST_EVAL_PACING_CONFIG,
      entities: {
        npc_alpha: makeTestEntity('npc_alpha'),
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

  it('applies pressure stocks, discovery layers, inertia pillar collapse, emergencies, orbital pass/slingshot/burn, audio cues, custom state slices, and legacy scars immutably', () => {
    const customSlice = defineStateSlice<number>('plugin.custom_counter', 0);
    const state0 = createInitialWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeTestEntity('npc_alpha'),
      },
      props: {
        door_01: {
          propId: 'door_01',
          spaceId: 'space_alpha',
          waypointId: 'wp_start',
          state: { locked: false },
          portalState: 'closed',
        },
      },
    });

    const { state: state1 } = applyWorldEffects(state0, [
      { type: 'adjust_pressure_stock', stock: 'subsistence_pressure', delta: 0.45 },
      { type: 'set_discovery_layer', layer: 'assayed' },
      { type: 'collapse_inertia_pillar', entityId: 'npc_alpha', pillarId: 'pillar_debt' },
      { type: 'trigger_emergency', emergencyId: 'emergency_plague' },
      { type: 'compound_emergency_vices', delta: 0.25 },
      {
        type: 'update_prop_state',
        propId: 'door_01',
        patch: { locked: true },
        portalState: 'barred',
      },
      { type: 'advance_orbital_pass', phase: 'occluded', deltaRegen: 0 },
      { type: 'spend_orbital_delta', mode: 'slingshot', cost: 40 },
      { type: 'spend_orbital_delta', mode: 'burn', cost: 15 },
      {
        type: 'emit_audio_cue',
        bus: 'groundside',
        cueId: 'pillar_fracture_debt',
        loudness: 0.6,
        sourceSpaceId: 'space_alpha',
      },
      {
        type: 'record_legacy_scar',
        scarId: 'material_scar_alpha',
        ledger: 'material',
        description: 'Backbone monopoly chartered',
      },
      {
        type: 'set_state_slice',
        sliceId: 'plugin.custom_counter',
        value: 42,
      },
    ]);

    // Original state0 is completely unmodified
    expect(state0.pressureStocks.subsistence_pressure).toBe(0);
    expect(state0.discoveryLayer).toBeNull();
    expect(state0.entities['npc_alpha']?.inertiaPillars).toHaveLength(2);
    expect(state0.entities['npc_alpha']?.drives['secrecy']).toBe(0.3);
    expect(state0.stateSlices.get(customSlice)).toBe(0);

    // New state1 reflects all updates
    expect(state1.pressureStocks.subsistence_pressure).toBe(0.45);
    expect(state1.discoveryLayer).toBe('assayed');
    expect(state1.entities['npc_alpha']?.inertiaPillars).toHaveLength(1);
    expect(state1.entities['npc_alpha']?.drives['secrecy']).toBeCloseTo(0.55);
    expect(state1.props['door_01']?.portalState).toBe('barred');
    expect(state1.orbitalPass.phase).toBe('zenith');
    expect(state1.orbitalPass.availableDelta).toBe(45);
    expect(state1.orbitalPass.activeBurn).toBe(true);
    expect(state1.emittedAudioCues).toHaveLength(1);
    expect(state1.recordedLegacyScars).toHaveLength(1);
    expect(state1.stateSlices.get(customSlice)).toBe(42);

    // Resolve emergency and verify overspending orbital delta or burning outside zenith throws
    const { state: state2 } = applyWorldEffects(state1, [
      { type: 'resolve_emergency' },
      { type: 'adjust_pressure_stock', stock: 'subsistence_pressure', delta: 5.0 },
      {
        type: 'insert_illicit_instrument',
        instrument: 'anachronistic_marvel',
        intensity: 0.4,
        scarId: 'veil_scar_marvel',
        scarDescription: 'Impossible lens venerated',
      },
    ]);
    expect(state2.activeEmergencyId).toBeNull();
    expect(state2.pressureStocks.subsistence_pressure).toBe(1.0);
    expect(state2.pressureStocks.elite_prestige_pressure).toBeCloseTo(0.4);
    expect(state2.recordedLegacyScars).toHaveLength(2);

    const { state: stateOccluded } = applyWorldEffects(state2, [
      { type: 'advance_orbital_pass', phase: 'occluded', deltaRegen: 10 },
    ]);
    expect(stateOccluded.orbitalPass.phase).toBe('occluded');
    expect(stateOccluded.orbitalPass.availableDelta).toBe(55);
    expect(() =>
      applyWorldEffects(stateOccluded, [{ type: 'spend_orbital_delta', mode: 'burn', cost: 10 }]),
    ).toThrow(/Orbital Burn requires 'zenith' pass phase/);

    expect(() =>
      applyWorldEffects(state2, [{ type: 'spend_orbital_delta', mode: 'burn', cost: 999 }]),
    ).toThrow(/Insufficient orbital Delta/);
  });
});
