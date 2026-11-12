import { describe, expect, it } from 'vitest';
import * as domain from '../../../src/domain/index.js';
import type { WorldState } from '../../../src/domain/simulation/WorldState.js';
import { makeWorldEntity, makeWorldState } from '../../support/makeWorldState.js';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a record');
  }
  return value as Record<string, unknown>;
}

function encode(world: WorldState): Record<string, unknown> {
  const fn: unknown = Reflect.get(domain, 'encodeWorldState');
  if (typeof fn !== 'function') throw new Error('encodeWorldState is missing');
  return record(fn(world));
}

function decode(
  snapshot: unknown,
  epochId = 'epoch_test',
  worldTick = 12,
): Record<string, unknown> {
  const fn: unknown = Reflect.get(domain, 'decodeWorldStateSnapshot');
  if (typeof fn !== 'function') throw new Error('decodeWorldStateSnapshot is missing');
  return record(fn(snapshot, { epochId, worldTick }));
}

function world(): WorldState {
  const base = makeWorldState({
    entities: { npc_alpha: makeWorldEntity('npc_alpha') },
    props: {
      door: {
        propId: 'door',
        spaceId: 'space_alpha',
        waypointId: 'wp_start',
        state: { locked: true, tags: ['old', { seen: false }] },
        portalState: 'closed',
      },
    },
  });
  return {
    ...base,
    worldTick: 12,
    elapsedSimulationSeconds: 3.25,
    paused: true,
    pressureStocks: {
      subsistence_pressure: 0.2,
      production_pressure: 0.4,
      elite_prestige_pressure: 0.6,
    },
    discoveryLayer: 'assayed',
    activeEmergencyId: 'emergency_alpha',
    orbitalPass: {
      phase: 'horizon',
      ticksInCurrentPhase: 7,
      availableDelta: 20,
      maxDelta: 50,
      activeBurn: false,
    },
    emittedAudioCues: [
      {
        bus: 'lace',
        cueId: 'cue_alpha',
        loudness: 0.5,
        sourceSpaceId: 'space_alpha',
        worldTick: 11,
      },
    ],
    recordedLegacyScars: [
      { scarId: 'scar_alpha', ledger: 'material', description: 'A change', worldTick: 9 },
    ],
  };
}

function unversionedWorldFields(input: WorldState): Record<string, unknown> {
  const { stateSlices: _stateSlices, ...fields } = input;
  void _stateSlices;
  return fields;
}

describe('WorldStateCodec', () => {
  it('encodes a private current snapshot and decodes the exact world fields without slices', () => {
    const input = world();
    const priorProps = structuredClone(input.props);
    const snapshot = encode(input);
    expect(snapshot['snapshotVersion']).toBe(2);
    expect(snapshot['stateSlices']).toBeUndefined();
    expect(snapshot['worldTick']).toBe(12);
    expect(snapshot['discoveryLayer']).toBe('assayed');
    expect(snapshot['recordedLegacyScars']).toEqual(input.recordedLegacyScars);
    expect(snapshot['props']).toEqual(input.props);
    expect(snapshot['props']).not.toBe(input.props);
    expect(decode(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
    expect(input.props).toEqual(priorProps);
  });

  it('migrates only the version marker from a strict synthetic version-one snapshot', () => {
    const input = world();
    const previous = { snapshotVersion: 1, ...unversionedWorldFields(input) };
    const untouched = structuredClone(previous);
    const migrated = decode(previous);
    expect(migrated).toEqual({ ...previous, snapshotVersion: 2 });
    expect(previous).toEqual(untouched);
    expect(() => decode(unversionedWorldFields(input))).toThrow(/snapshotVersion/);
    expect(() => decode({ ...previous, added: true })).toThrow(/added/);
  });

  it.each([
    { label: 'missing marker', marker: undefined },
    { label: 'fractional marker', marker: 1.5 },
    { label: 'future marker', marker: 3 },
    { label: 'negative marker', marker: -1 },
  ])('rejects a $label without inferring a migration', ({ marker }) => {
    const snapshot = { ...encode(world()), snapshotVersion: marker };
    expect(() => decode(snapshot)).toThrow(/snapshotVersion/);
  });

  it('rejects inner epoch and tick mismatches independently', () => {
    const snapshot = encode(world());
    expect(() => decode({ ...snapshot, epochId: 'other_epoch' })).toThrow(/epochId/);
    expect(() => decode({ ...snapshot, worldTick: 13 })).toThrow(/worldTick/);
    expect(() => decode(snapshot, 'other_epoch')).toThrow(/epochId/);
    expect(() => decode(snapshot, 'epoch_test', 13)).toThrow(/worldTick/);
    expect(decode(snapshot)).toEqual(snapshot);
  });

  it('rejects malformed nested world values without dropping unknown fields', () => {
    const snapshot = encode(world());
    const entities = record(snapshot['entities']);
    const entity = record(entities['npc_alpha']);
    const props = record(snapshot['props']);
    const prop = record(props['door']);
    const cases: ReadonlyArray<{ name: string; value: unknown; field: RegExp }> = [
      { name: 'entity position', value: { ...entity, position: [0, 'bad', 0] }, field: /position/ },
      {
        name: 'entity phase',
        value: { ...entity, cognitivePhase: 'unknown' },
        field: /cognitivePhase/,
      },
      { name: 'prop portal', value: { ...prop, portalState: 'unknown' }, field: /portalState/ },
      {
        name: 'pacing',
        value: { ...record(snapshot['pacingConfig']), cascadeBackoffFactor: -1 },
        field: /cascadeBackoffFactor/,
      },
      {
        name: 'pressure',
        value: { ...record(snapshot['pressureStocks']), production_pressure: 'high' },
        field: /production_pressure/,
      },
      {
        name: 'orbital',
        value: { ...record(snapshot['orbitalPass']), phase: 'unknown' },
        field: /phase/,
      },
      {
        name: 'cue',
        value: [{ bus: 'invalid', cueId: 'x', loudness: 0.5, sourceSpaceId: 's', worldTick: 1 }],
        field: /bus/,
      },
      {
        name: 'scar',
        value: [{ scarId: 's', ledger: 'invalid', description: 'x', worldTick: 1 }],
        field: /ledger/,
      },
    ];
    for (const { name, value, field } of cases) {
      const corrupt = structuredClone(snapshot);
      switch (name) {
        case 'entity position':
        case 'entity phase':
          corrupt['entities'] = { npc_alpha: value };
          break;
        case 'prop portal':
          corrupt['props'] = { door: value };
          break;
        case 'pacing':
          corrupt['pacingConfig'] = value;
          break;
        case 'pressure':
          corrupt['pressureStocks'] = value;
          break;
        case 'orbital':
          corrupt['orbitalPass'] = value;
          break;
        case 'cue':
          corrupt['emittedAudioCues'] = value;
          break;
        case 'scar':
          corrupt['recordedLegacyScars'] = value;
          break;
      }
      expect(() => decode(corrupt), name).toThrow(field);
    }
    expect(() => decode({ ...snapshot, unexpected: 1 })).toThrow(/unexpected/);
    expect(() =>
      decode({ ...snapshot, entities: { npc_alpha: { ...entity, unexpected: 1 } } }),
    ).toThrow(/unexpected/);
  });

  it('rejects prop state values that JSON persistence would change', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const invalidStates: ReadonlyArray<unknown> = [
      { amount: Number.NaN },
      { hidden: undefined },
      { amount: 1n },
      cyclic,
      { created: new Date(0) },
      new Map([['x', 1]]),
    ];
    for (const state of invalidStates) {
      const input = world();
      const prop = input.props['door'];
      if (prop === undefined) throw new Error('Missing fixture prop');
      const candidate = {
        ...input,
        props: { door: { ...prop, state: state as Record<string, unknown> } },
      };
      expect(() => encode(candidate)).toThrow(/state|plain|JSON|prop/i);
    }
    const snapshot = encode(world());
    const prop = record(record(snapshot['props'])['door']);
    expect(() =>
      decode({ ...snapshot, props: { door: { ...prop, state: { amount: Number.NaN } } } }),
    ).toThrow(/state|plain|JSON|prop/i);
  });

  it('rejects explicit undefined optional fields that JSON would omit', () => {
    const input = world();
    const entity = input.entities['npc_alpha'];
    if (entity === undefined) throw new Error('Missing fixture entity');
    expect(() =>
      encode({ ...input, entities: { npc_alpha: { ...entity, activeBehaviorId: undefined } } }),
    ).toThrow(/activeBehaviorId|JSON/);
    const snapshot = encode(input);
    const encodedEntity = record(record(snapshot['entities'])['npc_alpha']);
    expect(() =>
      decode({
        ...snapshot,
        entities: { npc_alpha: { ...encodedEntity, activeBehaviorId: undefined } },
      }),
    ).toThrow(/activeBehaviorId|JSON/);
  });

  it('rejects unsafe own record keys before Zod can drop them', () => {
    const input = world();
    const unsafeEntities = Object.create(null) as Record<string, WorldState['entities'][string]>;
    Object.defineProperty(unsafeEntities, '__proto__', {
      value: makeWorldEntity('hidden'),
      enumerable: true,
      configurable: true,
    });
    expect(() => encode({ ...input, entities: unsafeEntities })).toThrow(/__proto__|unsafe/);
    const snapshot = encode(input);
    expect(() => decode({ ...snapshot, entities: unsafeEntities })).toThrow(/__proto__|unsafe/);

    const prop = input.props['door'];
    const entity = input.entities['npc_alpha'];
    if (prop === undefined || entity === undefined) throw new Error('Missing fixture');
    const unsafeProps = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(unsafeProps, '__proto__', {
      value: prop,
      enumerable: true,
    });
    expect(() => decode({ ...snapshot, props: unsafeProps })).toThrow(/__proto__|unsafe/);

    const unsafeDrives = JSON.parse('{"__proto__":0.5}') as Record<string, unknown>;
    expect(Object.hasOwn(unsafeDrives, '__proto__')).toBe(true);
    expect(() =>
      decode({ ...snapshot, entities: { npc_alpha: { ...entity, drives: unsafeDrives } } }),
    ).toThrow(/__proto__|unsafe/);
  });

  it('rejects hidden or accessor root fields before encoding can omit them', () => {
    const hidden = world();
    Object.defineProperty(hidden, 'untracked', { value: 7, enumerable: false });
    expect(() => encode(hidden)).toThrow(/untracked|non-enumerable/);

    const accessor = world();
    Object.defineProperty(accessor, 'epochId', {
      get() {
        throw new Error('Getter must not run');
      },
      enumerable: true,
    });
    expect(() => encode(accessor)).toThrow(/epochId|accessor/);
  });

  it('rejects pillar identifiers that an authoring schema would trim', () => {
    const input = world();
    const entity = input.entities['npc_alpha'];
    const pillar = entity?.inertiaPillars[0];
    if (entity === undefined || pillar === undefined) throw new Error('Missing fixture pillar');
    const badEntity = {
      ...entity,
      inertiaPillars: [{ ...pillar, id: ` ${pillar.id} ` }, ...entity.inertiaPillars.slice(1)],
    };
    expect(() => encode({ ...input, entities: { npc_alpha: badEntity } })).toThrow(
      /inertiaPillars|id/,
    );
    const snapshot = encode(input);
    expect(() => decode({ ...snapshot, entities: { npc_alpha: badEntity } })).toThrow(
      /inertiaPillars|id/,
    );
    const badHolder = {
      ...entity,
      inertiaPillars: [
        { ...pillar, holderEntityId: ' npc_alpha ' },
        ...entity.inertiaPillars.slice(1),
      ],
    };
    expect(() => decode({ ...snapshot, entities: { npc_alpha: badHolder } })).toThrow(
      /holderEntityId/,
    );
  });

  it('rejects orbital availability greater than its capacity', () => {
    const snapshot = encode(world());
    const orbitalPass = { ...record(snapshot['orbitalPass']), availableDelta: 51, maxDelta: 50 };
    expect(() => decode({ ...snapshot, orbitalPass })).toThrow(/orbitalPass|availableDelta/);
    expect(() =>
      encode({
        ...world(),
        orbitalPass: {
          phase: 'horizon',
          ticksInCurrentPhase: 0,
          availableDelta: 51,
          maxDelta: 50,
          activeBurn: false,
        },
      }),
    ).toThrow(/orbitalPass|availableDelta/);
  });

  it('exposes the future entity-ID token validator without yet applying it to snapshots', () => {
    const fn: unknown = Reflect.get(domain, 'validateEntityId');
    if (typeof fn !== 'function') throw new Error('validateEntityId is missing');
    expect(fn('npc_alpha-1')).toBe('npc_alpha-1');
    for (const id of ['', '_bad', 'Upper', 'has.dot', 'a'.repeat(65)]) {
      expect(() => fn(id)).toThrow(/entity|id|token/i);
    }
  });
});
