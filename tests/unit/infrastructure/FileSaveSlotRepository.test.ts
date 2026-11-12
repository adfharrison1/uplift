import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  defineStateSlice,
  SAVE_SLOT_SCHEMA_VERSION,
  SeededRandom,
  StateSliceStore,
} from '../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
} from '../../../src/infrastructure/index.js';

describe('FileSaveSlotRepository and InMemorySaveSlotRepository', () => {
  let tempSavesDir: string;
  const subsistenceSlice = defineStateSlice<number>('economy.subsistence_pressure', 0.15);

  beforeEach(() => {
    tempSavesDir = mkdtempSync(join(tmpdir(), 'uplift-saves-test-'));
  });

  afterEach(() => {
    rmSync(tempSavesDir, { recursive: true, force: true });
  });

  it('saves, lists, loads, and deletes multiple named sessions while preserving RNG state, StateSliceStore, and legacyState', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const rng = new SeededRandom(12_345);
    rng.nextUint32();
    const savedRngState = rng.getState();

    const store = new StateSliceStore().withSlice(subsistenceSlice, 0.62);

    const savedAlpha = repo.saveSlot({
      slotId: 'slot-alpha',
      epochId: 'era_1_highglass_hold',
      worldTick: 18,
      rngState: savedRngState,
      stateSlices: store.toSnapshot(),
      legacyState: {
        materialScars: ['gorge_charter_tradition'],
        veilScars: ['doctrinal_rift_open_inquiry'],
      },
      savedAtIso: '2026-11-06T14:00:00.000Z',
    });

    repo.saveSlot({
      slotId: 'slot-beta',
      epochId: 'era_2_steam_republic',
      worldTick: 4,
      rngState: 98_765,
      stateSlices: new StateSliceStore().toSnapshot(),
      savedAtIso: '2026-11-06T15:00:00.000Z',
    });

    expect(savedAlpha.schemaVersion).toBe(SAVE_SLOT_SCHEMA_VERSION);
    const listed = repo.listSlots();
    expect(listed).toHaveLength(2);
    expect(listed.map((s) => s.slotId)).toEqual(['slot-alpha', 'slot-beta']);

    const loadedAlpha = repo.loadSlot('slot-alpha');
    expect(loadedAlpha.epochId).toBe('era_1_highglass_hold');
    expect(loadedAlpha.worldTick).toBe(18);
    expect(loadedAlpha.legacyState).toEqual({
      materialScars: ['gorge_charter_tradition'],
      veilScars: ['doctrinal_rift_open_inquiry'],
    });

    const restoredRng = SeededRandom.fromState(loadedAlpha.rngState);
    expect(restoredRng.nextUint32()).toBe(rng.nextUint32());

    const restoredStore = StateSliceStore.fromSnapshot(loadedAlpha.stateSlices);
    expect(restoredStore.get(subsistenceSlice)).toBe(0.62);

    expect(repo.deleteSlot('slot-beta')).toBe(true);
    expect(repo.deleteSlot('slot-beta')).toBe(false);
    expect(repo.listSlots()).toHaveLength(1);
  });

  it('isolates corrupted save files and rejects path traversal, invalid rngState, and missing slots', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    repo.saveSlot({
      slotId: 'valid-slot',
      epochId: 'era_1_highglass_hold',
      worldTick: 1,
      rngState: 42,
      stateSlices: {},
    });

    // Write a corrupted JSON file directly into savesDir
    writeFileSync(join(tempSavesDir, 'corrupted-slot.json'), '{broken_json', 'utf8');

    // listSlots still returns valid-slot without crashing
    expect(repo.listSlots().map((s) => s.slotId)).toEqual(['valid-slot']);

    // Loading the corrupted or missing slot throws a descriptive error
    expect(() => repo.loadSlot('corrupted-slot')).toThrow(/Corrupted save slot/);
    expect(() => repo.loadSlot('non-existent')).toThrow(/does not exist/);

    // Path traversal attempts are rejected before touching disk
    for (const traversalId of ['../../etc/passwd', '..%2Fsecret', '../outside', 'a/b']) {
      expect(() => repo.loadSlot(traversalId)).toThrow(/Invalid save slot id/);
      expect(() => repo.deleteSlot(traversalId)).toThrow(/Invalid save slot id/);
      expect(() =>
        repo.saveSlot({
          slotId: traversalId,
          epochId: 'era_1',
          worldTick: 0,
          rngState: 1,
          stateSlices: {},
        }),
      ).toThrow(/Invalid save slot id/);
    }

    // Invalid rngState (0 or NaN) or negative worldTick rejected
    expect(() =>
      repo.saveSlot({
        slotId: 'bad-rng',
        epochId: 'era_1',
        worldTick: 0,
        rngState: 0,
        stateSlices: {},
      }),
    ).toThrow(RangeError);

    expect(() =>
      repo.saveSlot({
        slotId: 'bad-tick',
        epochId: 'era_1',
        worldTick: -1,
        rngState: 10,
        stateSlices: {},
      }),
    ).toThrow(RangeError);
  });

  it('rejects a linked root before writing through it', () => {
    const linkedRoot = join(tempSavesDir, 'linked');
    symlinkSync(tempSavesDir, linkedRoot, 'dir');
    expect(() => new FileSaveSlotRepository(linkedRoot)).toThrow();
  });

  it('refuses dangling slot links without creating the outside target', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    symlinkSync(join(tempSavesDir, 'missing'), join(tempSavesDir, 'linked.json'));
    expect(() =>
      repo.saveSlot({
        slotId: 'linked',
        epochId: 'epoch',
        worldTick: 0,
        rngState: 1,
        stateSlices: {},
      }),
    ).toThrow();
    expect(() => readFileSync(join(tempSavesDir, 'missing'))).toThrow();
  });

  it('preserves a saved snapshot when a chosen temporary filename is linked or occupied', () => {
    const original = new FileSaveSlotRepository(tempSavesDir);
    const input = { slotId: 'slot', epochId: 'test', worldTick: 1, rngState: 1, stateSlices: {} };
    original.saveSlot(input);
    const bytes = readFileSync(join(tempSavesDir, 'slot.json'), 'utf8');
    writeFileSync(join(tempSavesDir, 'outside'), 'sentinel');
    symlinkSync(join(tempSavesDir, 'outside'), join(tempSavesDir, 'candidate.tmp'));
    const repo = new FileSaveSlotRepository(tempSavesDir, { temporaryName: () => 'candidate.tmp' });
    expect(() => repo.saveSlot({ ...input, worldTick: 2 })).toThrow();
    expect(readFileSync(join(tempSavesDir, 'outside'), 'utf8')).toBe('sentinel');
    expect(readFileSync(join(tempSavesDir, 'slot.json'), 'utf8')).toBe(bytes);
    expect(repo.loadSlot('slot').worldTick).toBe(1);
  });

  it('rejects linked slot reads/deletes and a replaced root on listing', () => {
    const root = join(tempSavesDir, 'storage');
    const repo = new FileSaveSlotRepository(root);
    writeFileSync(join(tempSavesDir, 'sentinel'), 'keep');
    symlinkSync(join(tempSavesDir, 'sentinel'), join(root, 'linked.json'));
    expect(() => repo.loadSlot('linked')).toThrow();
    expect(() => repo.deleteSlot('linked')).toThrow();
    expect(() => repo.listSlots()).toThrow(/Unsafe storage path/);
    renameSync(root, join(tempSavesDir, 'original'));
    symlinkSync(tempSavesDir, root, 'dir');
    expect(() => repo.listSlots()).toThrow();
    expect(readFileSync(join(tempSavesDir, 'sentinel'), 'utf8')).toBe('keep');
    expect(readdirSync(join(tempSavesDir, 'original'))).toEqual(['linked.json']);
  });

  it('provides matching behavior in InMemorySaveSlotRepository', () => {
    const memRepo = new InMemorySaveSlotRepository();
    memRepo.saveSlot({
      slotId: 'mem-slot',
      epochId: 'era_1_highglass_hold',
      worldTick: 7,
      rngState: 777,
      stateSlices: { 'test.slice': 123 },
    });

    expect(memRepo.listSlots()).toHaveLength(1);
    expect(memRepo.loadSlot('mem-slot').worldTick).toBe(7);
    expect(memRepo.deleteSlot('mem-slot')).toBe(true);
    expect(() => memRepo.loadSlot('mem-slot')).toThrow(/does not exist/);
  });

  it.each(['file', 'memory'] as const)(
    '%s slots preserve supplied pack identity and omit absent identity',
    (kind) => {
      const repo =
        kind === 'file'
          ? new FileSaveSlotRepository(tempSavesDir)
          : new InMemorySaveSlotRepository();
      const withIdentity = repo.saveSlot({
        slotId: 'with_identity',
        epochId: 'epoch_identity',
        packId: 'pack_primary',
        packVersion: 3,
        worldTick: 2,
        rngState: 7,
        stateSlices: { 'test.slice': { count: 1 } },
        savedAtIso: '2026-11-12T00:00:00.000Z',
      });
      const withoutIdentity = repo.saveSlot({
        slotId: 'without_identity',
        epochId: 'epoch_identity',
        worldTick: 1,
        rngState: 8,
        stateSlices: {},
        savedAtIso: '2026-11-12T00:01:00.000Z',
      });

      expect(withIdentity).toMatchObject({ packId: 'pack_primary', packVersion: 3 });
      expect(repo.loadSlot('with_identity')).toMatchObject({
        packId: 'pack_primary',
        packVersion: 3,
      });
      expect(repo.listSlots()).toEqual([
        {
          slotId: 'with_identity',
          schemaVersion: 1,
          epochId: 'epoch_identity',
          packId: 'pack_primary',
          packVersion: 3,
          worldTick: 2,
          savedAtIso: '2026-11-12T00:00:00.000Z',
        },
        {
          slotId: 'without_identity',
          schemaVersion: 1,
          epochId: 'epoch_identity',
          worldTick: 1,
          savedAtIso: '2026-11-12T00:01:00.000Z',
        },
      ]);
      expect(withoutIdentity).not.toHaveProperty('packId');
      expect(withoutIdentity).not.toHaveProperty('packVersion');
      expect(repo.loadSlot('without_identity')).not.toHaveProperty('packId');
      if (kind === 'file') {
        expect(
          JSON.parse(readFileSync(join(tempSavesDir, 'with_identity.json'), 'utf8')),
        ).toMatchObject({
          packId: 'pack_primary',
          packVersion: 3,
        });
      }
    },
  );

  it.each(['file', 'memory'] as const)(
    '%s slots keep accepted nested values when callers mutate input or returned envelopes',
    (kind) => {
      const repo =
        kind === 'file'
          ? new FileSaveSlotRepository(tempSavesDir)
          : new InMemorySaveSlotRepository();
      const input = {
        slotId: 'owned_values',
        epochId: 'epoch_identity',
        packId: 'pack_primary',
        packVersion: 3,
        worldTick: 2,
        rngState: 7,
        stateSlices: { 'test.slice': { count: 1 } },
        legacyState: { markers: ['original'] },
      };

      const saved = repo.saveSlot(input);
      input.stateSlices['test.slice'].count = 99;
      input.legacyState.markers[0] = 'changed';
      (saved.stateSlices['test.slice'] as { count: number }).count = 88;
      (saved.legacyState?.['markers'] as string[])[0] = 'changed again';
      const loaded = repo.loadSlot('owned_values');
      expect(loaded.stateSlices).toEqual({ 'test.slice': { count: 1 } });
      expect(loaded.legacyState).toEqual({ markers: ['original'] });

      (loaded.stateSlices['test.slice'] as { count: number }).count = 66;
      (loaded.legacyState?.['markers'] as string[])[0] = 'changed after load';
      expect(repo.loadSlot('owned_values').stateSlices).toEqual({ 'test.slice': { count: 1 } });
      expect(repo.loadSlot('owned_values').legacyState).toEqual({ markers: ['original'] });
    },
  );
});
