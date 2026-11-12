import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SimulationCoordinator } from '../../../../src/application/index.js';
import * as domain from '../../../../src/domain/index.js';
import {
  defineStateSlice,
  type SaveSlotRepositoryPort,
  SeededRandom,
  StateSliceRegistry,
  type TelemetryEntry,
  type TelemetryEventInput,
} from '../../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import {
  nodeLocalFileOps,
  type LocalFileOps,
} from '../../../../src/infrastructure/persistence/safeLocalFiles.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import { createClock, highLegacy } from './fixtures.js';

const WORLD = '__upliftWorldStateSnapshot';
const CUSTOM = '__upliftCustomSlicesSnapshot';
const VERSIONS = '__upliftCustomSliceVersions';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected record');
  }
  return value as Record<string, unknown>;
}

function coordinator(
  repository: SaveSlotRepositoryPort,
  telemetry = new InMemorySessionTelemetry('codec_test', createClock()),
  stateSliceRegistry?: StateSliceRegistry,
): SimulationCoordinator {
  return new SimulationCoordinator({
    epochId: 'epoch_sim_test',
    registry: makeRegistry(),
    telemetry,
    saveRepository: repository,
    clock: createClock(),
    rng: new SeededRandom(81),
    legacyState: highLegacy,
    stateSliceRegistry,
  });
}

class FaultingSaveTelemetry extends InMemorySessionTelemetry {
  public failSave = true;

  public override record(event: TelemetryEventInput): TelemetryEntry {
    if (event.action === 'save_slot' && this.failSave) throw new Error('save telemetry failed');
    return super.record(event);
  }
}

describe('SimulationCoordinator versioned world snapshots on disk', () => {
  let saveDir: string;
  beforeEach(() => {
    saveDir = mkdtempSync(join(tmpdir(), 'uplift-world-codec-'));
  });
  afterEach(() => {
    rmSync(saveDir, { recursive: true, force: true });
  });

  it('round trips a nondefault world, RNG, versioned slices and legacy through a real file slot', () => {
    const key = defineStateSlice(
      'plugin.codec',
      { count: 0 },
      {
        version: 2,
        schema: z.object({ count: z.number().int().nonnegative() }),
      },
    );
    const sliceRegistry = new StateSliceRegistry();
    sliceRegistry.register(key);
    const repository = new FileSaveSlotRepository(saveDir);
    const writer = coordinator(repository, undefined, sliceRegistry);
    writer.getRng().nextUint32();
    writer.dispatchEffects(
      [
        { type: 'set_state_slice', sliceId: key.id, value: { count: 7 } },
        { type: 'adjust_pressure_stock', stock: 'production_pressure', delta: 0.45 },
        { type: 'set_discovery_layer', layer: 'assayed' },
        { type: 'update_prop_state', propId: 'prop_gate', patch: { locked: true } },
        {
          type: 'record_legacy_scar',
          scarId: 'scar_codec',
          ledger: 'veil',
          description: 'Recorded',
        },
        {
          type: 'emit_audio_cue',
          bus: 'lace',
          cueId: 'codec_cue',
          loudness: 0.4,
          sourceSpaceId: 'space_alpha',
        },
      ],
      { advanceTick: true },
    );
    const saved = writer.saveToSlot('first');
    expect(asRecord(saved.stateSlices[WORLD])['snapshotVersion']).toBe(2);
    expect(saved.stateSlices[CUSTOM]).toEqual({ 'plugin.codec': { count: 7 } });
    expect(saved.stateSlices[VERSIONS]).toEqual({ 'plugin.codec': 2 });
    expect(
      asRecord(JSON.parse(readFileSync(join(saveDir, 'first.json'), 'utf8'))).stateSlices,
    ).toEqual(saved.stateSlices);

    const reader = coordinator(repository, undefined, sliceRegistry);
    const restored = reader.loadFromSlot('first');
    expect(domain.encodeWorldState(restored)).toEqual(saved.stateSlices[WORLD]);
    expect(restored.worldTick).toBe(1);
    expect(restored.discoveryLayer).toBe('assayed');
    expect(restored.pressureStocks.production_pressure).toBe(0.45);
    expect(restored.props['prop_gate']?.state).toEqual({ locked: true });
    expect(restored.emittedAudioCues[0]?.cueId).toBe('codec_cue');
    expect(restored.recordedLegacyScars[0]?.scarId).toBe('scar_codec');
    expect(restored.stateSlices.get(key)).toEqual({ count: 7 });
    expect(restored.stateSlices.toVersionMap()).toEqual({ 'plugin.codec': 2 });
    expect(reader.exportLegacyState()).toEqual(writer.exportLegacyState());
    expect(reader.getRng().nextUint32()).toBe(SeededRandom.fromState(saved.rngState).nextUint32());
    expect(reader.loadFromSlot('first').stateSlices.toVersionMap()).toEqual({ 'plugin.codec': 2 });
    const resaved = reader.saveToSlot('second');
    expect(asRecord(resaved.stateSlices[WORLD])['snapshotVersion']).toBe(2);
    expect(
      coordinator(repository, undefined, sliceRegistry).loadFromSlot('second').stateSlices.get(key),
    ).toEqual({ count: 7 });
  });

  it('loads a synthetic version-one inner snapshot once and resaves only version two', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const base = coordinator(repository).saveToSlot('base');
    const current = asRecord(base.stateSlices[WORLD]);
    repository.saveSlot({
      ...base,
      slotId: 'historical',
      stateSlices: {
        ...base.stateSlices,
        [WORLD]: { ...current, snapshotVersion: 1 },
      },
    });
    const reader = coordinator(repository);
    const decodeCalls = vi.spyOn(domain, 'decodeWorldStateSnapshot');
    expect(reader.loadFromSlot('historical').worldTick).toBe(base.worldTick);
    expect(decodeCalls).toHaveBeenCalledTimes(1);
    expect(asRecord(decodeCalls.mock.calls[0]?.[0])['snapshotVersion']).toBe(1);
    expect(asRecord(repository.loadSlot('historical').stateSlices[WORLD])['snapshotVersion']).toBe(
      1,
    );
    const resaved = reader.saveToSlot('resaved');
    expect(asRecord(resaved.stateSlices[WORLD])).toEqual(current);
    expect(coordinator(repository).loadFromSlot('resaved').worldTick).toBe(base.worldTick);
    expect(decodeCalls).toHaveBeenCalledTimes(2);
    expect(asRecord(decodeCalls.mock.calls[1]?.[0])['snapshotVersion']).toBe(2);
    decodeCalls.mockRestore();
  });

  it('rejects nested corruption and either inner/outer mismatch without publishing state or changing bytes, then retries', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const base = coordinator(repository).saveToSlot('base');
    const current = asRecord(base.stateSlices[WORLD]);
    const entities = asRecord(current['entities']);
    const entity = asRecord(entities['char_alpha']);
    const cases: ReadonlyArray<{ name: string; snapshot: Record<string, unknown>; error: RegExp }> =
      [
        {
          name: 'nested',
          snapshot: {
            ...current,
            entities: { ...entities, char_alpha: { ...entity, position: [0, 'bad', 0] } },
          },
          error: /position/,
        },
        { name: 'epoch', snapshot: { ...current, epochId: 'wrong_epoch' }, error: /epochId/ },
        { name: 'tick', snapshot: { ...current, worldTick: 77 }, error: /worldTick/ },
      ];
    for (const invalid of cases) {
      const slotId = `bad_${invalid.name}`;
      const invalidEnvelope = {
        ...base,
        slotId,
        stateSlices: { ...base.stateSlices, [WORLD]: invalid.snapshot },
      };
      writeFileSync(join(saveDir, `${slotId}.json`), JSON.stringify(invalidEnvelope));
      const bytes = readFileSync(join(saveDir, `${slotId}.json`), 'utf8');
      const reader = coordinator(repository);
      reader.dispatchEffects([{ type: 'set_discovery_layer', layer: 'theorized' }], {
        advanceTick: true,
      });
      const priorWorld = reader.getWorldState();
      const priorRng = reader.getRng();
      const priorLegacy = reader.exportLegacyState();
      expect(() => reader.loadFromSlot(slotId), invalid.name).toThrow(invalid.error);
      expect(reader.getWorldState()).toBe(priorWorld);
      expect(reader.getRng()).toBe(priorRng);
      expect(reader.exportLegacyState()).toEqual(priorLegacy);
      expect(readFileSync(join(saveDir, `${slotId}.json`), 'utf8')).toBe(bytes);
      repository.saveSlot({ ...base, slotId });
      expect(reader.loadFromSlot(slotId).worldTick).toBe(base.worldTick);
    }
  });

  it('reports a durable save despite telemetry failure and preserves replacement bytes on repository failure', () => {
    let failRename = false;
    const ops: LocalFileOps = {
      ...nodeLocalFileOps,
      rename(from, to) {
        if (failRename) throw new Error('injected replacement failure');
        nodeLocalFileOps.rename(from, to);
      },
    };
    const repository = new FileSaveSlotRepository(saveDir, { fileOps: ops });
    const telemetry = new FaultingSaveTelemetry('save_fault', createClock());
    const writer = coordinator(repository, telemetry);
    const saved = writer.saveToSlot('durable');
    const bytes = readFileSync(join(saveDir, 'durable.json'), 'utf8');
    expect(repository.loadSlot('durable')).toEqual(saved);
    expect(telemetry.query({ action: 'save_slot' })).toEqual([]);

    telemetry.failSave = false;
    writer.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    failRename = true;
    expect(() => writer.saveToSlot('durable')).toThrow(/injected replacement failure/);
    expect(readFileSync(join(saveDir, 'durable.json'), 'utf8')).toBe(bytes);
    expect(telemetry.query({ action: 'save_slot' })).toEqual([]);
  });
});
