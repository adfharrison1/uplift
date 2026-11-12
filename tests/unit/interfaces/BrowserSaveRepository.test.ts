import { describe, expect, it } from 'vitest';
import * as browserMain from '../../../src/interfaces/composition/browserMain.js';
import type {
  SaveSlotRepositoryPort,
  SaveSlotWriteInput,
  TelemetryClock,
} from '../../../src/domain/index.js';
import { withSaveSnapshot } from '../../support/withSaveSnapshot.js';

type BrowserSaveConstructor = new (clock: TelemetryClock) => SaveSlotRepositoryPort;
const BrowserSaveRepository = (
  browserMain as unknown as { BrowserSaveRepository?: BrowserSaveConstructor }
).BrowserSaveRepository;

const clock: TelemetryClock = {
  nowIso: () => '2026-11-12T00:00:00.000Z',
  elapsedSessionMs: () => 0,
};

describe('browser in-memory save repository', () => {
  it('owns nested input and both returned envelopes across later loads', () => {
    expect(BrowserSaveRepository).toBeTypeOf('function');
    if (BrowserSaveRepository === undefined) return;
    const repository = new BrowserSaveRepository(clock);
    const input = withSaveSnapshot({
      slotId: 'browser_owned',
      epochId: 'epoch_browser',
      packId: 'pack_browser',
      packVersion: 2,
      worldTick: 5,
      rngState: 19,
      stateSlices: { nested: { count: 7 } },
      legacyState: {
        sourceEpochId: 'epoch_browser',
        materialScars: [
          {
            scarId: 'original',
            ledger: 'material',
            description: 'Original',
            originEpochId: 'epoch_browser',
          },
        ],
        veilScars: [],
        lineageMutations: [],
      },
    });
    const saved = repository.saveSlot(input);
    (
      input.stateSlices['__upliftCustomSlicesSnapshot'] as { nested: { count: number } }
    ).nested.count = 99;
    const inputScar = input.legacyState.materialScars[0];
    if (inputScar === undefined) throw new Error('Missing input scar');
    inputScar.description = 'Changed';
    (
      saved.stateSlices['__upliftCustomSlicesSnapshot'] as { nested: { count: number } }
    ).nested.count = 88;
    const savedScar = (saved.legacyState?.['materialScars'] as { description: string }[])[0];
    if (savedScar === undefined) throw new Error('Missing saved scar');
    savedScar.description = 'Changed again';
    const loaded = repository.loadSlot('browser_owned');
    expect(loaded.stateSlices['__upliftCustomSlicesSnapshot']).toEqual({ nested: { count: 7 } });
    expect(
      (loaded.legacyState?.['materialScars'] as { description: string }[])[0]?.description,
    ).toBe('Original');
    (
      loaded.stateSlices['__upliftCustomSlicesSnapshot'] as { nested: { count: number } }
    ).nested.count = 66;
    expect(
      repository.loadSlot('browser_owned').stateSlices['__upliftCustomSlicesSnapshot'],
    ).toEqual({ nested: { count: 7 } });
    expect(repository.loadSlot('browser_owned')).toMatchObject({
      packId: 'pack_browser',
      packVersion: 2,
    });
  });

  it('lists required identity and rejects an identity-free write', () => {
    expect(BrowserSaveRepository).toBeTypeOf('function');
    if (BrowserSaveRepository === undefined) return;
    const repository = new BrowserSaveRepository(clock);
    repository.saveSlot(
      withSaveSnapshot({
        slotId: 'identified',
        epochId: 'epoch_browser',
        packId: 'pack_browser',
        packVersion: 2,
        worldTick: 1,
        rngState: 9,
        stateSlices: {},
      }),
    );
    expect(() =>
      repository.saveSlot({
        slotId: 'anonymous',
        epochId: 'epoch_browser',
        worldTick: 2,
        rngState: 10,
        stateSlices: {},
      } as SaveSlotWriteInput),
    ).toThrow();
    expect(repository.listSlots()).toEqual([
      {
        slotId: 'identified',
        readable: true,
        schemaVersion: 2,
        epochId: 'epoch_browser',
        packId: 'pack_browser',
        packVersion: 2,
        worldTick: 1,
        savedAtIso: '2026-11-12T00:00:00.000Z',
      },
    ]);
    expect(repository.listSlots({ epochId: 'other', packId: 'other', packVersion: 3 })).toEqual([
      { slotId: 'identified', readable: false, reason: 'epoch_mismatch' },
    ]);
    expect(
      repository.listSlots({ epochId: 'epoch_browser', packId: 'other', packVersion: 3 }),
    ).toEqual([{ slotId: 'identified', readable: false, reason: 'pack_mismatch' }]);
    expect(
      repository.listSlots({ epochId: 'epoch_browser', packId: 'pack_browser', packVersion: 3 }),
    ).toEqual([{ slotId: 'identified', readable: false, reason: 'pack_version_mismatch' }]);
    expect(() => repository.loadSlot('anonymous')).toThrow(/does not exist/);
  });
});
