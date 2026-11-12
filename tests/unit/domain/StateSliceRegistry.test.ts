import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  defineStateSlice,
  StateSliceRegistry,
  StateSliceStore,
} from '../../../src/domain/core/StateSliceRegistry.js';

interface FoundryLedgerState {
  steelIngots: number;
  secretCannonOrder: boolean;
  notes: string[];
}

describe('StateSliceRegistry and StateSliceStore', () => {
  const cannonProgressSlice = defineStateSlice<number>('foundry.cannon_progress', 0);
  const ledgerSlice = defineStateSlice<FoundryLedgerState>('foundry.ledger', {
    steelIngots: 12,
    secretCannonOrder: false,
    notes: ['initial shipment'],
  });

  it('shares a deeply frozen default without freezing the caller-owned input', () => {
    const emptyStore = new StateSliceStore();
    expect(emptyStore.get(cannonProgressSlice)).toBe(0);

    const original = {
      steelIngots: 12,
      secretCannonOrder: false,
      notes: ['initial shipment'],
    };
    const key = defineStateSlice('foundry.private_default', original);
    const ledgerA = emptyStore.get(key);
    expect(ledgerA).toEqual({
      steelIngots: 12,
      secretCannonOrder: false,
      notes: ['initial shipment'],
    });
    expect(emptyStore.get(key)).toBe(ledgerA);
    expect(Object.isFrozen(ledgerA)).toBe(true);
    expect(Object.isFrozen(ledgerA.notes)).toBe(true);
    original.steelIngots = 999;
    original.notes.push('caller edit');
    expect(emptyStore.get(key)).toEqual({
      steelIngots: 12,
      secretCannonOrder: false,
      notes: ['initial shipment'],
    });
  });

  it('freezes private copies on write and returns one reference while preserving earlier stores', () => {
    const store0 = new StateSliceStore();
    const store1 = store0.withSlice(cannonProgressSlice, 0.45);
    const input = {
      steelIngots: 20,
      secretCannonOrder: true,
      notes: ['cast barrel'],
    };
    const store2 = store1.withSlice(ledgerSlice, input);

    expect(store0.get(cannonProgressSlice)).toBe(0);
    expect(store1.get(cannonProgressSlice)).toBe(0.45);
    expect(store1.get(ledgerSlice).steelIngots).toBe(12);
    const retrieved = store2.get(ledgerSlice);
    expect(retrieved).toBe(store2.get(ledgerSlice));
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen(retrieved.notes)).toBe(true);
    input.steelIngots = 0;
    input.notes.push('caller edit');
    expect(retrieved).toEqual({
      steelIngots: 20,
      secretCannonOrder: true,
      notes: ['cast barrel'],
    });
  });

  it('updates a whole slice and restores deeply frozen snapshot values', () => {
    const store0 = new StateSliceStore();
    const store1 = store0.withSlice(cannonProgressSlice, 0.45);
    const store2 = store1.updateSlice(ledgerSlice, (prev) => ({
      ...prev,
      steelIngots: prev.steelIngots + 8,
      secretCannonOrder: true,
      notes: [...prev.notes, 'cast barrel'],
    }));

    expect(store0.get(cannonProgressSlice)).toBe(0);
    expect(store1.get(cannonProgressSlice)).toBe(0.45);
    expect(store2.get(ledgerSlice)).toEqual({
      steelIngots: 20,
      secretCannonOrder: true,
      notes: ['initial shipment', 'cast barrel'],
    });

    const retrieved = store2.get(ledgerSlice);
    expect(retrieved).toBe(store2.get(ledgerSlice));
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen(retrieved.notes)).toBe(true);

    const snapshot = store2.toSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot['foundry.ledger'])).toBe(true);
    expect(snapshot['foundry.ledger']).not.toBe(retrieved);

    const restored = StateSliceStore.fromSnapshot(snapshot);
    expect(restored.get(cannonProgressSlice)).toBe(0.45);
    expect(restored.get(ledgerSlice)).toEqual({
      steelIngots: 20,
      secretCannonOrder: true,
      notes: ['initial shipment', 'cast barrel'],
    });
    expect(Object.isFrozen(restored.get(ledgerSlice).notes)).toBe(true);
  });

  it('copies a shallow-frozen root and freezes every nested descendant', () => {
    const callerOwned = Object.freeze({ nested: { labels: ['first'] } });
    const key = defineStateSlice('foundry.nested', { nested: { labels: [] as string[] } });
    const store = new StateSliceStore().withSlice(key, callerOwned);
    const retrieved = store.get(key);

    expect(retrieved).toBe(store.get(key));
    expect(Object.isFrozen(retrieved)).toBe(true);
    expect(Object.isFrozen(retrieved.nested)).toBe(true);
    expect(Object.isFrozen(retrieved.nested.labels)).toBe(true);
    expect(() => retrieved.nested.labels.push('tampered')).toThrow(TypeError);
    callerOwned.nested.labels.push('caller edit');
    expect(store.get(key).nested.labels).toEqual(['first']);
  });

  it('rejects raw constructor entries even when invoked dynamically', () => {
    const callerOwned = { labels: ['mutable'] };
    const raw = new Map<string, unknown>([['foundry.raw', callerOwned]]);
    expect(() => Reflect.construct(StateSliceStore, [raw])).toThrow(/raw entries|arguments/i);
    expect(Reflect.get(StateSliceStore, 'fromTrustedEntries')).toBeUndefined();
    callerOwned.labels.push('changed');
    expect(new StateSliceStore().toSnapshot()).toEqual({});
  });

  it('owns a structural key default on first read and rejects an unowned append base', () => {
    const callerRow = { nested: { label: 'original' } };
    const callerRows = [callerRow];
    const key = { id: 'foundry.structural', defaultValue: callerRows };
    const store = new StateSliceStore();
    const fallback = store.get(key);

    expect(fallback).toBe(store.get(key));
    expect(fallback).not.toBe(callerRows);
    expect(Object.isFrozen(fallback)).toBe(true);
    expect(Object.isFrozen(fallback[0]?.nested)).toBe(true);
    callerRow.nested.label = 'caller edit';
    expect(store.get(key)[0]?.nested.label).toBe('original');
    expect(() => store.appendSlice(key, { nested: { label: 'next' } })).toThrow(/defineStateSlice/);
  });

  it('does not expose an entry materializer that can poison cached reads', () => {
    const key = defineStateSlice<ReadonlyArray<{ readonly id: number }>>('foundry.private', []);
    const store = new StateSliceStore().appendSlice(key, { id: 1 });

    expect(Reflect.get(store, 'materialize')).toBeUndefined();
    expect(store.get(key)).toEqual([{ id: 1 }]);
  });

  it('uses one structural key id when resolving a cached collection', () => {
    const a = defineStateSlice<ReadonlyArray<{ readonly id: string }>>('foundry.a', []);
    const b = defineStateSlice<ReadonlyArray<{ readonly id: string }>>('foundry.b', []);
    const store = new StateSliceStore().appendSlice(a, { id: 'a' }).appendSlice(b, { id: 'b' });
    let reads = 0;
    const changingKey = {
      get id() {
        reads += 1;
        return reads === 1 ? a.id : b.id;
      },
      defaultValue: [] as ReadonlyArray<{ readonly id: string }>,
    };

    expect(store.get(changingKey)).toEqual([{ id: 'a' }]);
    expect(store.get(b)).toEqual([{ id: 'b' }]);
  });

  it('uses one structural key id when appending to an existing collection', () => {
    const a = defineStateSlice<ReadonlyArray<{ readonly id: string }>>('foundry.append_a', []);
    const b = defineStateSlice<ReadonlyArray<{ readonly id: string }>>('foundry.append_b', []);
    const store = new StateSliceStore().appendSlice(a, { id: 'a' });
    const callerRow = { id: 'caller' };
    let reads = 0;
    const changingKey = {
      get id() {
        reads += 1;
        return reads === 1 ? a.id : b.id;
      },
      defaultValue: [callerRow],
    };

    const appended = store.appendSlice(changingKey, { id: 'next' });
    callerRow.id = 'edited';
    expect(appended.get(a)).toEqual([{ id: 'a' }, { id: 'next' }]);
    expect(appended.get(b)).toEqual([]);
  });

  it('updates the same structural key id it read', () => {
    const a = defineStateSlice('foundry.update_a', 0);
    const b = defineStateSlice('foundry.update_b', 0);
    const store = new StateSliceStore().withSlice(a, 1).withSlice(b, 10);
    let reads = 0;
    const changingKey = {
      get id() {
        reads += 1;
        return reads === 1 ? a.id : b.id;
      },
      defaultValue: 0,
    };

    const updated = store.updateSlice(changingKey, (current) => current + 1);
    expect(updated.get(a)).toBe(2);
    expect(updated.get(b)).toBe(10);
  });

  it('appends to a 5,000-row collection without changing old rows or stores', () => {
    const key = defineStateSlice<ReadonlyArray<{ readonly id: number; readonly label: string }>>(
      'foundry.rows',
      [],
    );
    const rows = Array.from({ length: 5_000 }, (_, id) => ({ id, label: `row_${id}` }));
    const before = new StateSliceStore().withSlice(key, rows);
    const oldRows = before.get(key);
    const callerRow = { id: 5_000, label: 'appended' };
    const after = before.appendSlice(key, callerRow);
    const newRows = after.get(key);

    expect(after).not.toBe(before);
    expect(before.get(key)).toBe(oldRows);
    expect(oldRows).toHaveLength(5_000);
    expect(newRows).toBe(after.get(key));
    expect(newRows).toHaveLength(5_001);
    expect(newRows[0]).toBe(oldRows[0]);
    expect(newRows[4_999]).toBe(oldRows[4_999]);
    expect(newRows[5_000]).toEqual({ id: 5_000, label: 'appended' });
    expect(Object.isFrozen(newRows)).toBe(true);
    expect(Object.isFrozen(newRows[5_000])).toBe(true);
    callerRow.label = 'caller edit';
    expect(after.get(key)[5_000]?.label).toBe('appended');
    const snapshot = after.toSnapshot();
    expect(snapshot['foundry.rows']).toEqual(newRows);
    expect(snapshot['foundry.rows']).not.toBe(newRows);
    expect(Object.isFrozen(snapshot['foundry.rows'])).toBe(true);
  });

  it('materializes a long append chain in order and keeps updateSlice a whole-value transform', () => {
    const key = defineStateSlice<ReadonlyArray<{ readonly id: number }>>('foundry.chain', []);
    let store = new StateSliceStore();
    for (let id = 0; id < 5_000; id += 1) {
      store = store.appendSlice(key, { id });
    }
    const fullRows = store.get(key);
    expect(fullRows).toHaveLength(5_000);
    expect(fullRows[0]?.id).toBe(0);
    expect(fullRows[4_999]?.id).toBe(4_999);
    expect(store.get(key)).toBe(fullRows);
    expect(store.toSnapshot()['foundry.chain']).toEqual(fullRows);

    let seenByUpdater: ReadonlyArray<{ readonly id: number }> | undefined;
    const updated = store.updateSlice(key, (current) => {
      seenByUpdater = current;
      return [...current, { id: 5_000 }];
    });
    expect(seenByUpdater).toBe(fullRows);
    expect(updated.get(key)).toHaveLength(5_001);
    expect(store.get(key)).toBe(fullRows);
  });

  it.each([
    ['Map', new Map([['id', 1]])],
    ['Set', new Set([1])],
    ['Date', new Date(0)],
    [
      'custom instance',
      new (class SliceValue {
        readonly id = 1;
      })(),
    ],
    ['sparse array', Array(2)],
    ['undefined', undefined],
    ['function', () => 1],
    ['symbol', Symbol('slice')],
    ['bigint', 1n],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects non-JSON %s at every slice boundary', (_name, value) => {
    const key = defineStateSlice<unknown>('foundry.json_value', null);
    const rows = defineStateSlice<ReadonlyArray<unknown>>('foundry.json_rows', []);
    const store = new StateSliceStore();

    expect(() => defineStateSlice('foundry.invalid_default', value)).toThrow(/foundry/);
    expect(() => store.withSlice(key, value)).toThrow(/foundry/);
    expect(() => store.appendSlice(rows, value)).toThrow(/foundry/);
    expect(() => StateSliceStore.fromSnapshot({ 'foundry.json_value': value })).toThrow(/foundry/);
    expect(store.toSnapshot()).toEqual({});
  });

  it('rejects nested cycles, unsafe keys and accessor properties with a useful path', () => {
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    const unsafe = JSON.parse('{"__proto__":1}') as unknown;
    const accessor = Object.defineProperty({}, 'secret', { enumerable: true, get: () => 1 });

    expect(() => defineStateSlice('foundry.cycle', { nested: [cycle] })).toThrow(
      /foundry\.cycle.*nested.*0.*self/,
    );
    expect(() => defineStateSlice('foundry.unsafe', unsafe)).toThrow(/foundry\.unsafe.*__proto__/);
    expect(() => defineStateSlice('foundry.accessor', accessor)).toThrow(
      /foundry\.accessor.*secret/,
    );
  });

  it('rejects symbol object keys and out-of-range array indices without losing them', () => {
    const symbolKey = { id: 1 };
    Object.defineProperty(symbolKey, Symbol('hidden'), { value: 2, enumerable: true });
    const extraIndex = [1];
    Object.defineProperty(extraIndex, '4294967295', { value: 2, enumerable: true });

    expect(() => defineStateSlice('foundry.symbol_key', symbolKey)).toThrow(
      /foundry\.symbol_key.*symbol/i,
    );
    expect(() => defineStateSlice('foundry.extra_index', extraIndex)).toThrow(
      /foundry\.extra_index.*non-index/i,
    );
  });

  it('keeps key and row schemas validation-only on defaults, writes and restores', () => {
    const schema = z.object({ count: z.number().int().nonnegative() });
    expect(() => defineStateSlice('foundry.bad_default', { count: -1 }, { schema })).toThrow(
      /foundry\.bad_default/,
    );
    const key = defineStateSlice('foundry.count', { count: 1 }, { schema });
    const registry = new StateSliceRegistry();
    registry.register(key);
    const store = new StateSliceStore().withSlice(key, { count: 2 });
    expect(store.get(key)).toEqual({ count: 2 });
    expect(() => store.withSlice(key, { count: -1 })).toThrow(/foundry\.count/);
    const valueWithExtraField = { count: 3, extra: 'drop' };
    expect(() => store.withSlice(key, valueWithExtraField)).toThrow(/foundry\.count.*change/i);
    expect(() =>
      StateSliceStore.fromSnapshot({ 'foundry.count': { count: -1 } }, registry),
    ).toThrow(/foundry\.count/);
    expect(
      StateSliceStore.fromSnapshot({ 'foundry.count': { count: 2 } }, registry).get(key),
    ).toEqual({ count: 2 });

    const rowSchema = z.object({ id: z.number().int().nonnegative() });
    const rows = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.valid_rows', [], {
      rowSchema,
    });
    expect(() => defineStateSlice('foundry.invalid_rows', [{ id: -1 }], { rowSchema })).toThrow(
      /foundry\.invalid_rows/,
    );
    const appended = new StateSliceStore().appendSlice(rows, { id: 1 });
    expect(appended.get(rows)).toEqual([{ id: 1 }]);
    expect(() => appended.appendSlice(rows, { id: -1 })).toThrow(/foundry\.valid_rows/);
    expect(() => appended.withSlice(rows, [{ id: -1 }])).toThrow(/foundry\.valid_rows/);
    const rowRegistry = new StateSliceRegistry();
    rowRegistry.register(rows);
    expect(
      StateSliceStore.fromSnapshot({ 'foundry.valid_rows': [{ id: 2 }] }, rowRegistry).get(rows),
    ).toEqual([{ id: 2 }]);
    expect(() =>
      StateSliceStore.fromSnapshot({ 'foundry.valid_rows': [{ id: -1 }] }, rowRegistry),
    ).toThrow(/foundry\.valid_rows/);
    expect(appended.get(rows)).toEqual([{ id: 1 }]);
  });

  it('rejects a whole-array schema on the fast append path without visiting old rows', () => {
    const rows = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.whole', [], {
      schema: z.array(z.object({ id: z.number() })).max(2),
      rowSchema: z.object({ id: z.number() }),
    });
    const before = new StateSliceStore().withSlice(rows, [{ id: 0 }]);

    expect(() => before.appendSlice(rows, { id: 1 })).toThrow(/foundry\.whole.*whole-array/i);
    expect(before.get(rows)).toEqual([{ id: 0 }]);
  });

  it('does not append under a different validator for an existing slice id', () => {
    const lax = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.bound_rows', []);
    const strict = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.bound_rows', [], {
      rowSchema: z.object({ id: z.number().int().nonnegative() }),
    });
    const before = new StateSliceStore().withSlice(lax, [{ id: -1 }]);

    expect(() => before.appendSlice(strict, { id: 1 })).toThrow(/foundry\.bound_rows.*schema/i);
    expect(before.get(lax)).toEqual([{ id: -1 }]);
  });

  it('retains a whole-array restriction when another key shares its id', () => {
    const whole = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.bound_whole', [], {
      schema: z.array(z.object({ id: z.number() })).max(1),
    });
    const lax = defineStateSlice<ReadonlyArray<{ id: number }>>('foundry.bound_whole', []);
    const before = new StateSliceStore().withSlice(whole, [{ id: 0 }]);

    expect(() => before.appendSlice(lax, { id: 1 })).toThrow(/foundry\.bound_whole.*whole-array/i);
    expect(before.get(whole)).toEqual([{ id: 0 }]);
  });

  it('captures one schema from options and registry descriptors', () => {
    const strict = z.object({ count: z.number().int().nonnegative() });
    let optionReads = 0;
    const options = {
      get schema() {
        optionReads += 1;
        return optionReads === 1 ? strict : undefined;
      },
    };
    const key = defineStateSlice('foundry.captured', { count: 1 }, options);
    expect(optionReads).toBe(1);
    expect(() => new StateSliceStore().withSlice(key, { count: -1 })).toThrow(/foundry\.captured/);

    let registryReads = 0;
    const structural = {
      id: 'foundry.registered',
      defaultValue: { count: 1 },
      get schema() {
        registryReads += 1;
        return registryReads === 1 ? strict : undefined;
      },
    };
    const registry = new StateSliceRegistry();
    registry.register(structural);
    expect(registryReads).toBe(1);
    expect(() =>
      StateSliceStore.fromSnapshot({ 'foundry.registered': { count: -1 } }, registry),
    ).toThrow(/foundry\.registered/);
  });

  it('keeps the original parser after a caller mutates the schema object', () => {
    const strict = z.object({ count: z.number().int().nonnegative() });
    const schema = { parse: (input: unknown) => strict.parse(input) };
    const key = defineStateSlice('foundry.stable_schema', { count: 1 }, { schema });
    const registry = new StateSliceRegistry();
    registry.register(key);
    schema.parse = () => ({ count: -1 });

    expect(() =>
      StateSliceStore.fromSnapshot({ 'foundry.stable_schema': { count: -1 } }, registry),
    ).toThrow(/foundry\.stable_schema/);
    expect(() => new StateSliceStore().withSlice(key, { count: -1 })).toThrow(
      /foundry\.stable_schema/,
    );
  });

  it('keeps one validator authority for reads and whole-value writes of an id', () => {
    const strict = defineStateSlice(
      'foundry.bound_value',
      { count: 0 },
      {
        schema: z.object({ count: z.number().int().nonnegative() }),
      },
    );
    const lax = defineStateSlice('foundry.bound_value', { count: 0 });
    const stored = new StateSliceStore().withSlice(strict, { count: 1 });

    expect(() => stored.withSlice(lax, { count: -1 })).toThrow(/foundry\.bound_value.*schema/i);
    expect(() => stored.updateSlice(lax, () => ({ count: -1 }))).toThrow(
      /foundry\.bound_value.*schema/i,
    );
    expect(() => stored.get(lax)).toThrow(/foundry\.bound_value.*schema/i);
    expect(stored.get(strict)).toEqual({ count: 1 });
  });

  it('never freezes a schema callback output retained by its caller', () => {
    const retained = { count: 1 };
    const schema = { parse: (_input: unknown) => retained };
    const key = defineStateSlice('foundry.callback', { count: 1 }, { schema });
    const stored = new StateSliceStore().withSlice(key, { count: 1 });

    expect(Object.isFrozen(retained)).toBe(false);
    retained.count = 9;
    expect(stored.get(key)).toEqual({ count: 1 });
    expect(key.defaultValue).toEqual({ count: 1 });
  });

  it('registers distinct slices and throws on duplicate slice key collisions', () => {
    const registry = new StateSliceRegistry();
    registry.register(cannonProgressSlice);
    registry.register(ledgerSlice);

    expect(registry.has('foundry.cannon_progress')).toBe(true);
    expect(registry.getAllIds()).toEqual(['foundry.cannon_progress', 'foundry.ledger']);

    const duplicateKey = defineStateSlice<number>('foundry.cannon_progress', 99);
    expect(() => registry.register(duplicateKey)).toThrow(/Duplicate StateSliceKey id/);
  });

  it('rejects empty or whitespace-only slice key identifiers', () => {
    expect(() => defineStateSlice('   ', 0)).toThrow(/non-empty string/);
  });
});
