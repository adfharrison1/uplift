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
  encodeWorldState,
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotWriteInput,
  SeededRandom,
  StateSliceStore,
} from '../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
} from '../../../src/infrastructure/index.js';
import { nodeLocalFileOps } from '../../../src/infrastructure/persistence/safeLocalFiles.js';
import { makeWorldState } from '../../support/makeWorldState.js';
import { withSaveSnapshot } from '../../support/withSaveSnapshot.js';

describe('FileSaveSlotRepository and InMemorySaveSlotRepository', () => {
  let tempSavesDir: string;
  const subsistenceSlice = defineStateSlice<number>('economy.subsistence_pressure', 0.15);
  const packIdentity = { packId: 'test_pack', packVersion: 1 };

  beforeEach(() => {
    tempSavesDir = mkdtempSync(join(tmpdir(), 'uplift-saves-test-'));
  });

  afterEach(() => {
    rmSync(tempSavesDir, { recursive: true, force: true });
  });

  it('lists a corrupt safe-named candidate beside a structurally readable slot', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    repo.saveSlot({
      slotId: 'good',
      epochId: 'epoch_test',
      ...packIdentity,
      worldTick: 0,
      rngState: 42,
      stateSlices: { __upliftWorldStateSnapshot: encodeWorldState(makeWorldState()) },
    });
    writeFileSync(join(tempSavesDir, 'broken.json'), '{broken', 'utf8');
    expect(repo.listSlots()).toMatchObject([
      { slotId: 'broken', readable: false, reason: 'invalid_json' },
      { slotId: 'good', readable: true, packId: 'test_pack' },
    ]);
  });

  it('compares the raw outer epoch with the inner snapshot before listing, loading or replacing', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const original = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'replace',
        epochId: 'epoch_test',
        ...packIdentity,
        worldTick: 0,
        rngState: 42,
        stateSlices: {},
      }),
    );
    const originalBytes = readFileSync(join(tempSavesDir, 'replace.json'), 'utf8');
    const padded = { ...original, slotId: 'padded', epochId: ' epoch_test ' };
    writeFileSync(join(tempSavesDir, 'padded.json'), JSON.stringify(padded));
    const paddedBytes = readFileSync(join(tempSavesDir, 'padded.json'), 'utf8');

    expect(repo.listSlots().find((entry) => entry.slotId === 'padded')).toEqual({
      slotId: 'padded',
      readable: false,
      reason: 'invalid_snapshot',
    });
    expect(() => repo.loadSlot('padded')).toThrow(/epochId.*mismatch/);
    expect(readFileSync(join(tempSavesDir, 'padded.json'), 'utf8')).toBe(paddedBytes);
    expect(() => repo.saveSlot({ ...original, epochId: ' epoch_test ' })).toThrow(
      /invalid_snapshot/,
    );
    expect(readFileSync(join(tempSavesDir, 'replace.json'), 'utf8')).toBe(originalBytes);
    expect(repo.loadSlot('replace')).toEqual(original);
  });

  it.each(['EIO', 'EACCES'] as const)(
    'propagates %s listing read faults without diagnosing valid bytes as corrupt',
    (code) => {
      const writer = new FileSaveSlotRepository(tempSavesDir);
      writer.saveSlot(
        withSaveSnapshot({
          slotId: 'valid',
          epochId: 'epoch_test',
          ...packIdentity,
          worldTick: 0,
          rngState: 42,
          stateSlices: {},
        }),
      );
      const bytes = readFileSync(join(tempSavesDir, 'valid.json'), 'utf8');
      const failing = new FileSaveSlotRepository(tempSavesDir, {
        fileOps: {
          ...nodeLocalFileOps,
          read: () => {
            throw Object.assign(new Error('injected read fault'), { code });
          },
        },
      });
      expect(() => failing.listSlots()).toThrow('injected read fault');
      expect(readFileSync(join(tempSavesDir, 'valid.json'), 'utf8')).toBe(bytes);
      expect(writer.listSlots()).toMatchObject([{ slotId: 'valid', readable: true }]);
    },
  );

  it('classifies structural failures before expected identity mismatches in stable order', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const base = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'base',
        epochId: 'epoch_test',
        ...packIdentity,
        worldTick: 3,
        rngState: 42,
        stateSlices: { 'plugin.data': { count: 1 } },
      }),
    );
    const world = base.stateSlices['__upliftWorldStateSnapshot'] as Record<string, unknown>;
    const write = (slotId: string, value: unknown): void => {
      writeFileSync(join(tempSavesDir, `${slotId}.json`), JSON.stringify(value));
    };
    writeFileSync(join(tempSavesDir, 'a_json.json'), '{bad');
    write('b_schema', { ...base, slotId: 'b_schema', schemaVersion: 1, packId: undefined });
    write('c_identity', { ...base, slotId: 'c_identity', packId: undefined, stateSlices: {} });
    write('d_envelope', { ...base, slotId: 'd_envelope', rngState: 0, stateSlices: {} });
    write('e_snapshot', {
      ...base,
      slotId: 'e_snapshot',
      packId: 'foreign',
      stateSlices: {
        ...base.stateSlices,
        __upliftWorldStateSnapshot: { ...world, worldTick: 4 },
        __upliftCustomSliceVersions: { orphan: 2 },
      },
      legacyState: { broken: true },
    });
    write('f_slices', {
      ...base,
      slotId: 'f_slices',
      packId: 'foreign',
      stateSlices: { ...base.stateSlices, __upliftCustomSliceVersions: { orphan: 2 } },
      legacyState: { broken: true },
    });
    write('g_legacy', {
      ...base,
      slotId: 'g_legacy',
      packId: 'foreign',
      legacyState: { broken: true },
    });
    repo.saveSlot({
      ...base,
      slotId: 'h_epoch',
      epochId: 'other_epoch',
      stateSlices: {
        ...base.stateSlices,
        __upliftWorldStateSnapshot: { ...world, epochId: 'other_epoch' },
      },
    });
    repo.saveSlot({ ...base, slotId: 'i_pack', packId: 'other_pack' });
    repo.saveSlot({ ...base, slotId: 'j_version', packVersion: 2 });
    writeFileSync(join(tempSavesDir, '.hidden.json'), '{bad');

    const listed = repo.listSlots({ epochId: 'epoch_test', ...packIdentity });
    expect(listed.filter((entry) => !entry.readable)).toEqual([
      { slotId: 'a_json', readable: false, reason: 'invalid_json' },
      { slotId: 'b_schema', readable: false, reason: 'unsupported_schema' },
      { slotId: 'c_identity', readable: false, reason: 'missing_identity' },
      { slotId: 'd_envelope', readable: false, reason: 'invalid_envelope' },
      { slotId: 'e_snapshot', readable: false, reason: 'invalid_snapshot' },
      { slotId: 'f_slices', readable: false, reason: 'invalid_slices' },
      { slotId: 'g_legacy', readable: false, reason: 'invalid_legacy_state' },
      { slotId: 'h_epoch', readable: false, reason: 'epoch_mismatch' },
      { slotId: 'i_pack', readable: false, reason: 'pack_mismatch' },
      { slotId: 'j_version', readable: false, reason: 'pack_version_mismatch' },
    ]);
    expect(listed.find((entry) => entry.slotId === 'base')).toMatchObject({
      slotId: 'base',
      readable: true,
      worldTick: 3,
    });
    expect(repo.loadSlot('base')).toEqual(base);
  });

  it('rejects invalid direct replacements before writing any new bytes', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const original = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'replace',
        epochId: 'epoch_test',
        ...packIdentity,
        worldTick: 1,
        rngState: 42,
        stateSlices: {},
      }),
    );
    const bytes = readFileSync(join(tempSavesDir, 'replace.json'), 'utf8');
    const world = original.stateSlices['__upliftWorldStateSnapshot'] as Record<string, unknown>;
    const cases = [
      {
        name: 'snapshot',
        value: {
          ...original,
          stateSlices: {
            ...original.stateSlices,
            __upliftWorldStateSnapshot: { ...world, worldTick: 2 },
          },
        },
        error: /invalid_snapshot/,
      },
      {
        name: 'slices',
        value: {
          ...original,
          stateSlices: {
            ...original.stateSlices,
            __upliftCustomSlicesSnapshot: { broken: new Map([['key', 1]]) },
          },
        },
        error: /invalid_slices/,
      },
      {
        name: 'legacy',
        value: { ...original, legacyState: { broken: true } },
        error: /invalid_legacy_state/,
      },
    ];
    for (const candidate of cases) {
      expect(() => repo.saveSlot(candidate.value), candidate.name).toThrow(candidate.error);
      expect(readFileSync(join(tempSavesDir, 'replace.json'), 'utf8')).toBe(bytes);
      expect(repo.loadSlot('replace')).toEqual(original);
    }
  });

  it('saves, lists, loads, and deletes multiple named sessions while preserving RNG state, StateSliceStore, and legacyState', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const rng = new SeededRandom(12_345);
    rng.nextUint32();
    const savedRngState = rng.getState();

    const store = new StateSliceStore().withSlice(subsistenceSlice, 0.62);

    const savedAlpha = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'slot-alpha',
        epochId: 'era_1_highglass_hold',
        ...packIdentity,
        worldTick: 18,
        rngState: savedRngState,
        stateSlices: store.toSnapshot(),
        legacyState: {
          sourceEpochId: 'era_1_highglass_hold',
          materialScars: [
            {
              scarId: 'gorge_charter_tradition',
              ledger: 'material',
              description: 'Charter',
              originEpochId: 'era_1_highglass_hold',
            },
          ],
          veilScars: [
            {
              scarId: 'doctrinal_rift_open_inquiry',
              ledger: 'veil',
              description: 'Rift',
              originEpochId: 'era_1_highglass_hold',
            },
          ],
          lineageMutations: [],
        },
        savedAtIso: '2026-11-06T14:00:00.000Z',
      }),
    );

    repo.saveSlot(
      withSaveSnapshot({
        slotId: 'slot-beta',
        epochId: 'era_2_steam_republic',
        packId: 'other_pack',
        packVersion: 2,
        worldTick: 4,
        rngState: 98_765,
        stateSlices: new StateSliceStore().toSnapshot(),
        savedAtIso: '2026-11-06T15:00:00.000Z',
      }),
    );

    expect(savedAlpha.schemaVersion).toBe(SAVE_SLOT_SCHEMA_VERSION);
    const listed = repo.listSlots();
    expect(listed).toHaveLength(2);
    expect(listed).toMatchObject([
      { slotId: 'slot-alpha', readable: true, packId: 'test_pack', packVersion: 1 },
      { slotId: 'slot-beta', readable: true, packId: 'other_pack', packVersion: 2 },
    ]);

    const loadedAlpha = repo.loadSlot('slot-alpha');
    expect(loadedAlpha.schemaVersion).toBe(2);
    expect(loadedAlpha.packId).toBe('test_pack');
    expect(loadedAlpha.packVersion).toBe(1);
    expect(loadedAlpha.epochId).toBe('era_1_highglass_hold');
    expect(loadedAlpha.worldTick).toBe(18);
    expect(loadedAlpha.legacyState).toEqual({
      sourceEpochId: 'era_1_highglass_hold',
      materialScars: [
        {
          scarId: 'gorge_charter_tradition',
          ledger: 'material',
          description: 'Charter',
          originEpochId: 'era_1_highglass_hold',
        },
      ],
      veilScars: [
        {
          scarId: 'doctrinal_rift_open_inquiry',
          ledger: 'veil',
          description: 'Rift',
          originEpochId: 'era_1_highglass_hold',
        },
      ],
      lineageMutations: [],
    });

    const restoredRng = SeededRandom.fromState(loadedAlpha.rngState);
    expect(restoredRng.nextUint32()).toBe(rng.nextUint32());

    const restoredStore = StateSliceStore.fromSnapshot(
      loadedAlpha.stateSlices['__upliftCustomSlicesSnapshot'],
    );
    expect(restoredStore.get(subsistenceSlice)).toBe(0.62);

    expect(repo.deleteSlot('slot-beta')).toBe(true);
    expect(repo.deleteSlot('slot-beta')).toBe(false);
    expect(repo.listSlots()).toHaveLength(1);
  });

  it('isolates corrupted save files and rejects path traversal, invalid rngState, and missing slots', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    repo.saveSlot(
      withSaveSnapshot({
        slotId: 'valid-slot',
        epochId: 'era_1_highglass_hold',
        ...packIdentity,
        worldTick: 1,
        rngState: 42,
        stateSlices: {},
      }),
    );

    // Write a corrupted JSON file directly into savesDir
    writeFileSync(join(tempSavesDir, 'corrupted-slot.json'), '{broken_json', 'utf8');

    expect(repo.listSlots()).toMatchObject([
      { slotId: 'corrupted-slot', readable: false, reason: 'invalid_json' },
      { slotId: 'valid-slot', readable: true },
    ]);

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
          ...packIdentity,
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
        ...packIdentity,
        worldTick: 0,
        rngState: 0,
        stateSlices: {},
      }),
    ).toThrow(RangeError);

    expect(() =>
      repo.saveSlot({
        slotId: 'bad-tick',
        epochId: 'era_1',
        ...packIdentity,
        worldTick: -1,
        rngState: 10,
        stateSlices: {},
      }),
    ).toThrow(RangeError);
  });

  it('rejects identity-free current and schema-one files without assigning a pack from epoch', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const current = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'current',
        epochId: 'epoch_test',
        packId: 'pack_current',
        packVersion: 2,
        worldTick: 1,
        rngState: 42,
        stateSlices: {},
      }),
    );
    writeFileSync(
      join(tempSavesDir, 'identity_free.json'),
      JSON.stringify({
        ...current,
        slotId: 'identity_free',
        packId: undefined,
        packVersion: undefined,
      }),
    );
    writeFileSync(
      join(tempSavesDir, 'old_schema.json'),
      JSON.stringify({ ...current, slotId: 'old_schema', schemaVersion: 1 }),
    );
    expect(() => repo.loadSlot('identity_free')).toThrow(/Corrupted save slot/);
    expect(() => repo.loadSlot('old_schema')).toThrow(/Corrupted save slot/);
    expect(repo.listSlots()).toMatchObject([
      { slotId: 'current', readable: true },
      { slotId: 'identity_free', readable: false, reason: 'missing_identity' },
      { slotId: 'old_schema', readable: false, reason: 'unsupported_schema' },
    ]);
    expect(repo.loadSlot('current')).toEqual(current);
  });

  it('keeps prior bytes when a direct replacement omits pack identity', () => {
    const repo = new FileSaveSlotRepository(tempSavesDir);
    const original = repo.saveSlot(
      withSaveSnapshot({
        slotId: 'replace',
        epochId: 'epoch_test',
        packId: 'pack_current',
        packVersion: 2,
        worldTick: 1,
        rngState: 42,
        stateSlices: {},
      }),
    );
    const bytes = readFileSync(join(tempSavesDir, 'replace.json'), 'utf8');
    expect(() =>
      repo.saveSlot({ ...original, packId: undefined } as unknown as SaveSlotWriteInput),
    ).toThrow(/packId/);
    expect(readFileSync(join(tempSavesDir, 'replace.json'), 'utf8')).toBe(bytes);
    expect(repo.loadSlot('replace')).toEqual(original);
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
        ...packIdentity,
        worldTick: 0,
        rngState: 1,
        stateSlices: {},
      }),
    ).toThrow();
    expect(() => readFileSync(join(tempSavesDir, 'missing'))).toThrow();
  });

  it('preserves a saved snapshot when a chosen temporary filename is linked or occupied', () => {
    const original = new FileSaveSlotRepository(tempSavesDir);
    const input = withSaveSnapshot({
      slotId: 'slot',
      epochId: 'test',
      ...packIdentity,
      worldTick: 1,
      rngState: 1,
      stateSlices: {},
    });
    original.saveSlot(input);
    const bytes = readFileSync(join(tempSavesDir, 'slot.json'), 'utf8');
    writeFileSync(join(tempSavesDir, 'outside'), 'sentinel');
    symlinkSync(join(tempSavesDir, 'outside'), join(tempSavesDir, 'candidate.tmp'));
    const repo = new FileSaveSlotRepository(tempSavesDir, { temporaryName: () => 'candidate.tmp' });
    expect(() =>
      repo.saveSlot(withSaveSnapshot({ ...input, stateSlices: {}, worldTick: 2 })),
    ).toThrow();
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
    memRepo.saveSlot(
      withSaveSnapshot({
        slotId: 'mem-slot',
        epochId: 'era_1_highglass_hold',
        ...packIdentity,
        worldTick: 7,
        rngState: 777,
        stateSlices: { 'test.slice': 123 },
      }),
    );

    expect(memRepo.listSlots()).toHaveLength(1);
    expect(memRepo.loadSlot('mem-slot').worldTick).toBe(7);
    expect(memRepo.deleteSlot('mem-slot')).toBe(true);
    expect(() => memRepo.loadSlot('mem-slot')).toThrow(/does not exist/);
  });

  it.each(['file', 'memory'] as const)(
    '%s slots require pack identity and preserve it in metadata',
    (kind) => {
      const repo =
        kind === 'file'
          ? new FileSaveSlotRepository(tempSavesDir)
          : new InMemorySaveSlotRepository();
      const withIdentity = repo.saveSlot(
        withSaveSnapshot({
          slotId: 'with_identity',
          epochId: 'epoch_identity',
          packId: 'pack_primary',
          packVersion: 3,
          worldTick: 2,
          rngState: 7,
          stateSlices: { 'test.slice': { count: 1 } },
          savedAtIso: '2026-11-12T00:00:00.000Z',
        }),
      );
      expect(() =>
        repo.saveSlot({
          slotId: 'without_identity',
          epochId: 'epoch_identity',
          worldTick: 1,
          rngState: 8,
          stateSlices: {},
          savedAtIso: '2026-11-12T00:01:00.000Z',
        } as SaveSlotWriteInput),
      ).toThrow(/packId/);

      expect(withIdentity).toMatchObject({ packId: 'pack_primary', packVersion: 3 });
      expect(repo.loadSlot('with_identity')).toMatchObject({
        packId: 'pack_primary',
        packVersion: 3,
      });
      expect(repo.listSlots()).toEqual([
        {
          slotId: 'with_identity',
          readable: true,
          schemaVersion: 2,
          epochId: 'epoch_identity',
          packId: 'pack_primary',
          packVersion: 3,
          worldTick: 2,
          savedAtIso: '2026-11-12T00:00:00.000Z',
        },
      ]);
      expect(() => repo.loadSlot('without_identity')).toThrow(/does not exist/);
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
      const input = withSaveSnapshot({
        slotId: 'owned_values',
        epochId: 'epoch_identity',
        packId: 'pack_primary',
        packVersion: 3,
        worldTick: 2,
        rngState: 7,
        stateSlices: { 'test.slice': { count: 1 } },
        legacyState: {
          sourceEpochId: 'epoch_identity',
          materialScars: [
            {
              scarId: 'original',
              ledger: 'material',
              description: 'Original',
              originEpochId: 'epoch_identity',
            },
          ],
          veilScars: [],
          lineageMutations: [],
        },
      });

      const saved = repo.saveSlot(input);
      (input.stateSlices['__upliftCustomSlicesSnapshot'] as { 'test.slice': { count: number } })[
        'test.slice'
      ].count = 99;
      const inputScar = input.legacyState.materialScars[0];
      if (inputScar === undefined) throw new Error('Missing input scar');
      inputScar.description = 'Changed';
      (saved.stateSlices['__upliftCustomSlicesSnapshot'] as { 'test.slice': { count: number } })[
        'test.slice'
      ].count = 88;
      const savedScar = (saved.legacyState?.['materialScars'] as { description: string }[])[0];
      if (savedScar === undefined) throw new Error('Missing saved scar');
      savedScar.description = 'Changed again';
      const loaded = repo.loadSlot('owned_values');
      expect(loaded.stateSlices['__upliftCustomSlicesSnapshot']).toEqual({
        'test.slice': { count: 1 },
      });
      expect(
        (loaded.legacyState?.['materialScars'] as { description: string }[])[0]?.description,
      ).toBe('Original');

      (loaded.stateSlices['__upliftCustomSlicesSnapshot'] as { 'test.slice': { count: number } })[
        'test.slice'
      ].count = 66;
      const loadedScar = (loaded.legacyState?.['materialScars'] as { description: string }[])[0];
      if (loadedScar === undefined) throw new Error('Missing loaded scar');
      loadedScar.description = 'Changed after load';
      expect(repo.loadSlot('owned_values').stateSlices['__upliftCustomSlicesSnapshot']).toEqual({
        'test.slice': { count: 1 },
      });
      expect(
        (
          repo.loadSlot('owned_values').legacyState?.['materialScars'] as { description: string }[]
        )[0]?.description,
      ).toBe('Original');
    },
  );
});
