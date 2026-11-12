import { describe, expect, it } from 'vitest';
import * as browserMain from '../../../src/interfaces/composition/browserMain.js';
import type {
  SaveSlotRepositoryPort,
  SaveSlotWriteInput,
  TelemetryClock,
} from '../../../src/domain/index.js';

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
    const input = {
      slotId: 'browser_owned',
      epochId: 'epoch_browser',
      packId: 'pack_browser',
      packVersion: 2,
      worldTick: 5,
      rngState: 19,
      stateSlices: { nested: { count: 7 } },
      legacyState: { marker: ['original'] },
    };
    const saved = repository.saveSlot(input);
    input.stateSlices.nested.count = 99;
    input.legacyState.marker[0] = 'changed';
    (saved.stateSlices['nested'] as { count: number }).count = 88;
    (saved.legacyState?.['marker'] as string[])[0] = 'changed again';
    const loaded = repository.loadSlot('browser_owned');
    expect(loaded.stateSlices).toEqual({ nested: { count: 7 } });
    expect(loaded.legacyState).toEqual({ marker: ['original'] });
    (loaded.stateSlices['nested'] as { count: number }).count = 66;
    expect(repository.loadSlot('browser_owned').stateSlices).toEqual({ nested: { count: 7 } });
    expect(repository.loadSlot('browser_owned')).toMatchObject({
      packId: 'pack_browser',
      packVersion: 2,
    });
  });

  it('lists required identity and rejects an identity-free write', () => {
    expect(BrowserSaveRepository).toBeTypeOf('function');
    if (BrowserSaveRepository === undefined) return;
    const repository = new BrowserSaveRepository(clock);
    repository.saveSlot({
      slotId: 'identified',
      epochId: 'epoch_browser',
      packId: 'pack_browser',
      packVersion: 2,
      worldTick: 1,
      rngState: 9,
      stateSlices: {},
    });
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
        schemaVersion: 2,
        epochId: 'epoch_browser',
        packId: 'pack_browser',
        packVersion: 2,
        worldTick: 1,
        savedAtIso: '2026-11-12T00:00:00.000Z',
      },
    ]);
    expect(() => repository.loadSlot('anonymous')).toThrow(/does not exist/);
  });
});
