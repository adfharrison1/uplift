import { describe, expect, it } from 'vitest';
import {
  defineStateSlice,
  StateSliceRegistry,
  StateSliceStore,
} from '../../../src/domain/core/StateSliceRegistry.js';
import { z } from 'zod';
import { applyWorldEffects } from '../../../src/domain/simulation/WorldEffectReducer.js';
import { makeWorldEntity, makeWorldState } from '../../support/makeWorldState.js';

describe('applyWorldEffects', () => {
  it('validates and versions set_state_slice through a bound registry', () => {
    const key = defineStateSlice(
      'plugin.known',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int().nonnegative() }),
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const state = makeWorldState({ stateSlices: StateSliceStore.fromSnapshot({}, registry) });
    const result = applyWorldEffects(state, [
      { type: 'set_state_slice', sliceId: 'plugin.known', value: { count: 2 } },
    ]).state;

    expect(result.stateSlices.get(key)).toEqual({ count: 2 });
    expect(result.stateSlices.toVersionMap()).toEqual({ 'plugin.known': 2 });
    expect(() =>
      applyWorldEffects(result, [
        { type: 'set_state_slice', sliceId: 'plugin.known', value: { count: -1 } },
      ]),
    ).toThrow(/plugin\.known/);
    expect(result.stateSlices.get(key)).toEqual({ count: 2 });
  });
  it('rejects non-JSON set_state_slice values before publishing a new world', () => {
    const state = makeWorldState();
    for (const value of [new Map([['id', 1]]), Number.NaN, { nested: undefined }]) {
      expect(() =>
        applyWorldEffects(state, [
          { type: 'adjust_pressure_stock', stock: 'subsistence_pressure', delta: 0.2 },
          { type: 'set_state_slice', sliceId: 'plugin.invalid', value },
        ]),
      ).toThrow(/plugin\.invalid/);
      expect(state.pressureStocks.subsistence_pressure).toBe(0);
      expect(state.stateSlices.toSnapshot()).toEqual({});
    }
  });

  it('applies pressure stocks, discovery layers, inertia pillar collapse, emergencies, orbital pass/slingshot/burn, audio cues, custom state slices, and legacy scars immutably', () => {
    const customSlice = defineStateSlice<number>('plugin.custom_counter', 0);
    const state0 = makeWorldState({
      epochId: 'epoch_test',
      entities: {
        npc_alpha: makeWorldEntity('npc_alpha'),
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
