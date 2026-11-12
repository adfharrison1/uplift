import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SimulationCoordinator } from '../../../../src/application/index.js';
import {
  defineStateSlice,
  type SaveSlotRepositoryPort,
  SeededRandom,
  StateSliceRegistry,
} from '../../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import { createClock } from './fixtures.js';

const CUSTOM_SLICES = '__upliftCustomSlicesSnapshot';
const SLICE_VERSIONS = '__upliftCustomSliceVersions';

function withoutVersionMap(slices: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(slices).filter(([id]) => id !== SLICE_VERSIONS));
}

function coordinator(
  saveRepository: SaveSlotRepositoryPort,
  stateSliceRegistry?: StateSliceRegistry,
): SimulationCoordinator {
  return new SimulationCoordinator({
    epochId: 'epoch_sim_test',
    registry: makeRegistry(),
    telemetry: new InMemorySessionTelemetry('session_slices', createClock()),
    saveRepository,
    clock: createClock(),
    rng: new SeededRandom(77),
    stateSliceRegistry,
  });
}

describe('SimulationCoordinator versioned state slices', () => {
  it('saves, loads and resaves a registered slice through the repository consumer', () => {
    const key = defineStateSlice(
      'plugin.versioned',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int().nonnegative() }),
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const writer = coordinator(repository, registry);
    writer.dispatchEffects([
      { type: 'set_state_slice', sliceId: key.id, value: { count: 4 } },
      { type: 'adjust_pressure_stock', stock: 'production_pressure', delta: 0.45 },
      { type: 'set_discovery_layer', layer: 'assayed' },
    ]);
    const saved = writer.saveToSlot('versioned_one');

    expect(saved.stateSlices[CUSTOM_SLICES]).toEqual({ 'plugin.versioned': { count: 4 } });
    expect(saved.stateSlices[SLICE_VERSIONS]).toEqual({ 'plugin.versioned': 2 });
    const reader = coordinator(repository, registry);
    const loaded = reader.loadFromSlot('versioned_one');
    expect(loaded.stateSlices.get(key)).toEqual({ count: 4 });
    expect(loaded.stateSlices.toVersionMap()).toEqual({ 'plugin.versioned': 2 });
    expect(loaded.pressureStocks.production_pressure).toBeCloseTo(0.45);
    expect(loaded.discoveryLayer).toBe('assayed');
    expect(reader.saveToSlot('versioned_two').stateSlices[SLICE_VERSIONS]).toEqual({
      'plugin.versioned': 2,
    });
    const loadedAgain = coordinator(repository, registry).loadFromSlot('versioned_two');
    expect(loadedAgain.stateSlices.get(key)).toEqual({ count: 4 });
    expect(loadedAgain.stateSlices.toVersionMap()).toEqual({ 'plugin.versioned': 2 });
    expect(loadedAgain.pressureStocks.production_pressure).toBeCloseTo(0.45);
    expect(loadedAgain.discoveryLayer).toBe('assayed');
    const prior = writer.getWorldState();
    expect(() =>
      writer.dispatchEffects([{ type: 'set_state_slice', sliceId: key.id, value: { count: -1 } }]),
    ).toThrow(/plugin\.versioned/);
    expect(writer.getWorldState()).toBe(prior);
  });

  it('migrates an unversioned save once and does not freeze callback output', () => {
    const callbackOutput = { count: 5 };
    let calls = 0;
    const key = defineStateSlice(
      'plugin.migrated',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int().nonnegative() }),
        migrate(value, fromVersion) {
          calls += 1;
          expect(value).toEqual({ oldCount: 5 });
          expect(fromVersion).toBe(1);
          return callbackOutput;
        },
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const base = coordinator(repository, registry).saveToSlot('historical_base');
    const stateSlices = {
      ...withoutVersionMap(base.stateSlices),
      [CUSTOM_SLICES]: { 'plugin.migrated': { oldCount: 5 } },
    };
    repository.saveSlot({ ...base, slotId: 'historical', stateSlices });

    const reader = coordinator(repository, registry);
    expect(reader.loadFromSlot('historical').stateSlices.get(key)).toEqual({ count: 5 });
    expect(calls).toBe(1);
    expect(Object.isFrozen(callbackOutput)).toBe(false);
    callbackOutput.count = 99;
    expect(reader.getWorldState().stateSlices.get(key)).toEqual({ count: 5 });
    const savedAgain = reader.saveToSlot('historical_resaved');
    expect(savedAgain.stateSlices[SLICE_VERSIONS]).toEqual({ 'plugin.migrated': 2 });
    expect(
      coordinator(repository, registry).loadFromSlot('historical_resaved').stateSlices.get(key),
    ).toEqual({ count: 5 });
    expect(calls).toBe(1);
  });

  it('keeps a historical version-one slice unchanged without invoking migration', () => {
    let calls = 0;
    const key = defineStateSlice(
      'plugin.v1',
      { count: 0 },
      {
        schema: z.object({ count: z.number().int() }),
        migrate() {
          calls += 1;
          return { count: 999 };
        },
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const base = coordinator(repository, registry).saveToSlot('v1_base');
    const stateSlices = {
      ...withoutVersionMap(base.stateSlices),
      [CUSTOM_SLICES]: { 'plugin.v1': { count: 7 } },
    };
    repository.saveSlot({ ...base, slotId: 'v1_old', stateSlices });

    const reader = coordinator(repository, registry);
    expect(reader.loadFromSlot('v1_old').stateSlices.get(key)).toEqual({ count: 7 });
    expect(reader.saveToSlot('v1_resaved').stateSlices[CUSTOM_SLICES]).toEqual({
      'plugin.v1': { count: 7 },
    });
    expect(calls).toBe(0);
  });

  it('loads a historical save with no custom-slice container as an empty store', () => {
    const key = defineStateSlice('plugin.absent_container', { count: 0 }, { version: 2 });
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const reader = coordinator(repository, registry);
    reader.dispatchEffects([{ type: 'set_state_slice', sliceId: key.id, value: { count: 4 } }]);
    const base = reader.saveToSlot('with_slices');
    repository.saveSlot({
      ...base,
      slotId: 'historical_no_slices',
      stateSlices: Object.fromEntries(
        Object.entries(base.stateSlices).filter(
          ([id]) => id !== CUSTOM_SLICES && id !== SLICE_VERSIONS,
        ),
      ),
    });

    const loaded = reader.loadFromSlot('historical_no_slices');
    expect(loaded.stateSlices.toSnapshot()).toEqual({});
    expect(loaded.stateSlices.toVersionMap()).toEqual({});
    expect(loaded.stateSlices.get(key)).toEqual({ count: 0 });
  });

  it('passes an unknown version-three slice through an intermediate coordinator', () => {
    let calls = 0;
    const key = defineStateSlice(
      'plugin.future',
      { count: 0 },
      {
        version: 3,
        schema: z.object({ count: z.number().int() }),
        migrate() {
          calls += 1;
          return { count: 999 };
        },
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const writer = coordinator(repository, registry);
    writer.dispatchEffects([{ type: 'set_state_slice', sliceId: key.id, value: { count: 7 } }]);
    writer.saveToSlot('future_first');

    const intermediate = coordinator(repository);
    intermediate.loadFromSlot('future_first');
    const passed = intermediate.saveToSlot('future_passed');
    expect(passed.stateSlices[CUSTOM_SLICES]).toEqual({ 'plugin.future': { count: 7 } });
    expect(passed.stateSlices[SLICE_VERSIONS]).toEqual({ 'plugin.future': 3 });
    expect(
      coordinator(repository, registry).loadFromSlot('future_passed').stateSlices.get(key),
    ).toEqual({ count: 7 });
    expect(calls).toBe(0);
  });

  it('rejects malformed containers and versions with unchanged world and RNG, then retries', () => {
    const key = defineStateSlice(
      'plugin.checked',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int().nonnegative() }),
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const reader = coordinator(repository, registry);
    const valid = reader.saveToSlot('valid_slices');
    reader.dispatchEffects(
      [
        { type: 'set_state_slice', sliceId: key.id, value: { count: 9 } },
        { type: 'set_discovery_layer', layer: 'assayed' },
      ],
      { advanceTick: true },
    );
    const priorWorld = reader.getWorldState();
    const priorRng = reader.getRng();
    const priorWord = priorRng.getState();
    const cases: ReadonlyArray<{
      name: string;
      slices: unknown;
      versions: unknown;
      error: RegExp;
    }> = [
      { name: 'null container', slices: null, versions: {}, error: /stateSlices/ },
      { name: 'number container', slices: 7, versions: {}, error: /stateSlices/ },
      { name: 'array container', slices: [], versions: {}, error: /stateSlices/ },
      {
        name: 'null versions',
        slices: { 'plugin.checked': { count: 1 } },
        versions: null,
        error: /sliceVersions/,
      },
      { name: 'orphan version', slices: {}, versions: { orphan: 2 }, error: /orphan/ },
      {
        name: 'fractional version',
        slices: { 'plugin.checked': { count: 1 } },
        versions: { 'plugin.checked': 1.5 },
        error: /plugin\.checked.*version/,
      },
      {
        name: 'future version',
        slices: { 'plugin.checked': { count: 1 } },
        versions: { 'plugin.checked': 3 },
        error: /plugin\.checked.*future slice version/,
      },
      {
        name: 'missing migration',
        slices: { 'plugin.checked': { count: 1 } },
        versions: {},
        error: /plugin\.checked.*missing migration.*version/,
      },
      {
        name: 'invalid schema',
        slices: { 'plugin.checked': { count: -1 } },
        versions: { 'plugin.checked': 2 },
        error: /plugin\.checked.*schema rejected/,
      },
    ];
    for (const [index, invalid] of cases.entries()) {
      const slotId = `invalid_slice_${String(index)}`;
      repository.saveSlot({
        ...valid,
        slotId,
        stateSlices: {
          ...valid.stateSlices,
          [CUSTOM_SLICES]: invalid.slices,
          [SLICE_VERSIONS]: invalid.versions,
        },
      });
      expect(() => reader.loadFromSlot(slotId), invalid.name).toThrow(invalid.error);
      expect(reader.getWorldState(), invalid.name).toBe(priorWorld);
      expect(reader.getRng(), invalid.name).toBe(priorRng);
      expect(reader.getRng().getState(), invalid.name).toBe(priorWord);
      expect(reader.getWorldState().worldTick, invalid.name).toBe(1);
      expect(reader.getWorldState().discoveryLayer, invalid.name).toBe('assayed');
      expect(reader.getWorldState().stateSlices.get(key), invalid.name).toEqual({ count: 9 });
      expect(reader.getWorldState().stateSlices.toVersionMap(), invalid.name).toEqual({
        'plugin.checked': 2,
      });
    }
    repository.saveSlot({
      ...valid,
      slotId: 'invalid_slice_0',
      stateSlices: {
        ...valid.stateSlices,
        [CUSTOM_SLICES]: { 'plugin.checked': { count: 2 } },
        [SLICE_VERSIONS]: { 'plugin.checked': 2 },
      },
    });
    expect(reader.loadFromSlot('invalid_slice_0').stateSlices.get(key)).toEqual({ count: 2 });
  });

  it('leaves the prior session intact when migration throws or returns invalid data, then retries', () => {
    let mode: 'throw' | 'invalid' | 'valid' = 'throw';
    const key = defineStateSlice(
      'plugin.retry',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int() }),
        migrate() {
          if (mode === 'throw') {
            throw new Error('injected migration fault');
          }
          if (mode === 'invalid') {
            return new Map([['count', 8]]);
          }
          return { count: 8 };
        },
      },
    );
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new InMemorySaveSlotRepository();
    const reader = coordinator(repository, registry);
    const saved = reader.saveToSlot('retry_base');
    repository.saveSlot({
      ...saved,
      slotId: 'retry_migration',
      stateSlices: {
        ...saved.stateSlices,
        [CUSTOM_SLICES]: { 'plugin.retry': { oldCount: 8 } },
        [SLICE_VERSIONS]: {},
      },
    });
    reader.dispatchEffects(
      [
        { type: 'set_state_slice', sliceId: key.id, value: { count: 12 } },
        { type: 'set_discovery_layer', layer: 'assayed' },
      ],
      { advanceTick: true },
    );
    const prior = reader.getWorldState();
    const priorRng = reader.getRng();
    const priorWord = priorRng.getState();
    for (const failureMode of ['throw', 'invalid'] as const) {
      mode = failureMode;
      expect(() => reader.loadFromSlot('retry_migration')).toThrow(/plugin\.retry.*migration/);
      expect(reader.getWorldState()).toBe(prior);
      expect(reader.getRng()).toBe(priorRng);
      expect(reader.getRng().getState()).toBe(priorWord);
      expect(reader.getWorldState().worldTick).toBe(1);
      expect(reader.getWorldState().discoveryLayer).toBe('assayed');
      expect(reader.getWorldState().stateSlices.get(key)).toEqual({ count: 12 });
      expect(reader.getWorldState().stateSlices.toVersionMap()).toEqual({ 'plugin.retry': 2 });
    }

    mode = 'valid';
    expect(reader.loadFromSlot('retry_migration').stateSlices.get(key)).toEqual({ count: 8 });
  });
});

describe('SimulationCoordinator slice sidecar on disk', () => {
  let saveDir: string;
  beforeEach(() => {
    saveDir = mkdtempSync(join(tmpdir(), 'uplift-slice-versions-'));
  });
  afterEach(() => {
    rmSync(saveDir, { recursive: true, force: true });
  });

  it('retains the raw slice and version sidecar through real file readback', () => {
    const key = defineStateSlice('plugin.disk', { count: 0 }, { version: 2 });
    const registry = new StateSliceRegistry();
    registry.register(key);
    const repository = new FileSaveSlotRepository(saveDir);
    const writer = coordinator(repository, registry);
    writer.dispatchEffects([{ type: 'set_state_slice', sliceId: key.id, value: { count: 8 } }]);
    writer.saveToSlot('disk_versioned');

    const diskBytes = readFileSync(join(saveDir, 'disk_versioned.json'), 'utf8');
    expect(JSON.parse(diskBytes) as unknown).toMatchObject({
      stateSlices: {
        [CUSTOM_SLICES]: { 'plugin.disk': { count: 8 } },
        [SLICE_VERSIONS]: { 'plugin.disk': 2 },
      },
    });
    expect(
      coordinator(repository, registry).loadFromSlot('disk_versioned').stateSlices.get(key),
    ).toEqual({ count: 8 });
  });
});
