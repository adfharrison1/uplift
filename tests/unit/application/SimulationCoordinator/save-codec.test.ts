import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  EpochVisualThemeSchema,
  RenderFrameBuilder,
  SimulationCoordinator,
} from '../../../../src/application/index.js';
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
import { makeStageBlueprint } from '../../../support/makeStageBlueprint.js';
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
    expect(saved).toMatchObject({
      schemaVersion: 2,
      epochId: 'epoch_sim_test',
      packId: 'test_simulation',
      packVersion: 1,
    });
    expect(repository.listSlots()).toMatchObject([
      { slotId: 'first', packId: 'test_simulation', packVersion: 1 },
    ]);
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

  it('rejects a coordinator whose requested epoch differs from its bound primary pack', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    expect(
      () =>
        new SimulationCoordinator({
          epochId: 'wrong_epoch',
          registry: makeRegistry(),
          telemetry: new InMemorySessionTelemetry('wrong_epoch', createClock()),
          saveRepository: repository,
          clock: createClock(),
        }),
    ).toThrow(/epochId/);
    expect(
      () =>
        new SimulationCoordinator({
          epochId: 'epoch_sim_test',
          registry: new domain.EpochModuleRegistry(),
          telemetry: new InMemorySessionTelemetry('unbound', createClock()),
          saveRepository: repository,
          clock: createClock(),
        }),
    ).toThrow(/bound to a primary pack/);
  });

  it('rejects each primary identity mismatch before publishing world, RNG, slices or legacy and permits retry', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const base = coordinator(repository).saveToSlot('base');
    const world = asRecord(base.stateSlices[WORLD]);
    const cases = [
      {
        name: 'epoch',
        changes: {
          epochId: 'other_epoch',
          stateSlices: {
            ...base.stateSlices,
            [WORLD]: { ...world, epochId: 'other_epoch' },
          },
        },
        error: /epochId differs from the bound primary pack/,
      },
      {
        name: 'pack',
        changes: { packId: 'other_pack' },
        error: /packId differs from the bound primary pack/,
      },
      {
        name: 'version',
        changes: { packVersion: 2 },
        error: /packVersion differs from the bound primary pack/,
      },
    ] as const;
    for (const mismatch of cases) {
      const slotId = `mismatch_${mismatch.name}`;
      repository.saveSlot({ ...base, ...mismatch.changes, slotId });
      const bytes = readFileSync(join(saveDir, `${slotId}.json`), 'utf8');
      const reader = coordinator(repository);
      reader.getRng().nextUint32();
      reader.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
        advanceTick: true,
      });
      const priorWorld = reader.getWorldState();
      const priorRng = reader.getRng();
      const priorSlices = priorWorld.stateSlices;
      const priorLegacy = reader.exportLegacyState();
      expect(() => reader.loadFromSlot(slotId), mismatch.name).toThrow(mismatch.error);
      expect(reader.getWorldState()).toBe(priorWorld);
      expect(reader.getRng()).toBe(priorRng);
      expect(reader.getWorldState().stateSlices).toBe(priorSlices);
      expect(reader.exportLegacyState()).toEqual(priorLegacy);
      expect(readFileSync(join(saveDir, `${slotId}.json`), 'utf8')).toBe(bytes);
      repository.saveSlot({ ...base, slotId });
      expect(reader.loadFromSlot(slotId).worldTick).toBe(base.worldTick);
    }
  });

  it('loads an arbitrary earlier tick under the same current pack version', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const writer = coordinator(repository);
    const early = writer.saveToSlot('early');
    const reader = coordinator(repository);
    for (let tick = 0; tick < 12; tick += 1) {
      reader.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
        advanceTick: true,
      });
    }
    expect(reader.getWorldState().worldTick).toBe(12);
    expect(reader.loadFromSlot('early').worldTick).toBe(early.worldTick);
    expect(reader.saveToSlot('resaved')).toMatchObject({
      packId: 'test_simulation',
      packVersion: 1,
      worldTick: early.worldTick,
    });
  });

  it('rejects a saved older pack version when the receiving registry has advanced', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const old = coordinator(repository).saveToSlot('old_pack');
    const bytes = readFileSync(join(saveDir, 'old_pack.json'), 'utf8');
    const reader = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry({ packVersion: 2 }),
      telemetry: new InMemorySessionTelemetry('new_pack', createClock()),
      saveRepository: repository,
      clock: createClock(),
    });
    const priorWorld = reader.getWorldState();
    expect(old.packVersion).toBe(1);
    expect(() => reader.loadFromSlot('old_pack')).toThrow(/packVersion/);
    expect(reader.getWorldState()).toBe(priorWorld);
    expect(readFileSync(join(saveDir, 'old_pack.json'), 'utf8')).toBe(bytes);
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

  it('rejects malformed saved entity IDs before world or RNG publication and loads after correction', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const base = coordinator(repository).saveToSlot('base');
    const snapshot = asRecord(base.stateSlices[WORLD]);
    const entities = asRecord(snapshot['entities']);
    const entity = asRecord(entities['char_alpha']);
    const theme = EpochVisualThemeSchema.parse({
      id: 'theme_play',
      epochId: 'epoch_sim_test',
      name: 'Save codec test theme',
      stoneColorHex: '#4a525d',
      mudColorHex: '#3b3228',
      ironColorHex: '#2c3137',
      woodColorHex: '#523d2b',
    });
    const stage = makeStageBlueprint('space_alpha');
    const frameBuilder = new RenderFrameBuilder();
    const cases = [
      {
        name: 'key',
        entities: { ...entities, 'Bad.Id': { ...entity, entityId: 'Bad.Id' } },
        error: /Bad.Id/,
      },
      {
        name: 'value',
        entities: { ...entities, char_alpha: { ...entity, entityId: 'Bad.Id' } },
        error: /Bad.Id/,
      },
      {
        name: 'mismatch',
        entities: { ...entities, char_alpha: { ...entity, entityId: 'char_gamma' } },
        error: /char_alpha.*char_gamma/,
      },
    ] as const;
    for (const invalid of cases) {
      const slotId = `bad_entity_${invalid.name}`;
      writeFileSync(
        join(saveDir, `${slotId}.json`),
        JSON.stringify({
          ...base,
          slotId,
          stateSlices: {
            ...base.stateSlices,
            [WORLD]: { ...snapshot, entities: invalid.entities },
          },
        }),
      );
      const bytes = readFileSync(join(saveDir, `${slotId}.json`), 'utf8');
      const reader = coordinator(repository);
      reader.getRng().nextUint32();
      reader.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
        advanceTick: true,
      });
      const priorWorld = reader.getWorldState();
      const priorRng = reader.getRng();
      const priorRngState = priorRng.getState();
      expect(() => reader.loadFromSlot(slotId), invalid.name).toThrow(invalid.error);
      expect(reader.getWorldState()).toBe(priorWorld);
      expect(reader.getRng()).toBe(priorRng);
      expect(reader.getRng().getState()).toBe(priorRngState);
      expect(readFileSync(join(saveDir, `${slotId}.json`), 'utf8')).toBe(bytes);
      const laterFrame = frameBuilder.buildFrame({
        worldState: reader.getWorldState(),
        theme,
        stage,
        focusEntityId: 'char_alpha',
      });
      expect(
        laterFrame.entityPoses.find((pose) => pose.entityId === 'char_alpha')?.semanticId,
      ).toBe('npc.char_alpha');
      repository.saveSlot({ ...base, slotId });
      expect(reader.loadFromSlot(slotId).entities['char_alpha']?.entityId).toBe('char_alpha');
    }
  });

  it('rejects a mismatched saved prop id before listing, load or replacement and updates a corrected prop', () => {
    const repository = new FileSaveSlotRepository(saveDir);
    const base = coordinator(repository).saveToSlot('base');
    const snapshot = asRecord(base.stateSlices[WORLD]);
    const props = asRecord(snapshot['props']);
    const prop = asRecord(props['prop_gate']);
    const invalidSlices = {
      ...base.stateSlices,
      [WORLD]: {
        ...snapshot,
        props: { ...props, prop_gate: { ...prop, propId: 'prop_alias' } },
      },
    };
    writeFileSync(
      join(saveDir, 'bad_prop.json'),
      JSON.stringify({ ...base, slotId: 'bad_prop', stateSlices: invalidSlices }),
    );
    const invalidBytes = readFileSync(join(saveDir, 'bad_prop.json'), 'utf8');
    const baseBytes = readFileSync(join(saveDir, 'base.json'), 'utf8');
    expect(repository.listSlots().find((entry) => entry.slotId === 'bad_prop')).toEqual({
      slotId: 'bad_prop',
      readable: false,
      reason: 'invalid_snapshot',
    });

    const reader = coordinator(repository);
    reader.getRng().nextUint32();
    reader.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    const priorWorld = reader.getWorldState();
    const priorRng = reader.getRng();
    const priorRngState = priorRng.getState();
    const priorLegacy = reader.exportLegacyState();
    expect(() => reader.loadFromSlot('bad_prop')).toThrow(/prop_gate.*prop_alias/);
    expect(reader.getWorldState()).toBe(priorWorld);
    expect(reader.getWorldState().stateSlices).toBe(priorWorld.stateSlices);
    expect(reader.getRng()).toBe(priorRng);
    expect(reader.getRng().getState()).toBe(priorRngState);
    expect(reader.exportLegacyState()).toEqual(priorLegacy);
    expect(readFileSync(join(saveDir, 'bad_prop.json'), 'utf8')).toBe(invalidBytes);
    expect(() => repository.saveSlot({ ...base, stateSlices: invalidSlices })).toThrow(
      /invalid_snapshot/,
    );
    expect(readFileSync(join(saveDir, 'base.json'), 'utf8')).toBe(baseBytes);

    repository.saveSlot({ ...base, slotId: 'bad_prop' });
    reader.loadFromSlot('bad_prop');
    reader.dispatchEffects([
      { type: 'update_prop_state', propId: 'prop_gate', patch: { locked: true } },
    ]);
    expect(Object.keys(reader.getWorldState().props)).toEqual(['prop_gate']);
    expect(reader.getWorldState().props['prop_gate']?.state).toEqual({ locked: true });
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
