import { describe, expect, it } from 'vitest';
import {
  defineStateSlice,
  StateSliceRegistry,
  StateSliceStore,
} from '../../../src/domain/core/StateSliceRegistry.js';

interface FoundryLedgerState {
  readonly steelIngots: number;
  readonly secretCannonOrder: boolean;
}

describe('StateSliceRegistry and StateSliceStore', () => {
  const cannonProgressSlice = defineStateSlice<number>('foundry.cannon_progress', 0);
  const ledgerSlice = defineStateSlice<FoundryLedgerState>('foundry.ledger', {
    steelIngots: 12,
    secretCannonOrder: false,
  });

  it('returns a cloned default value when a slice has not been set in StateSliceStore', () => {
    const emptyStore = new StateSliceStore();
    expect(emptyStore.get(cannonProgressSlice)).toBe(0);

    const ledgerA = emptyStore.get(ledgerSlice);
    expect(ledgerA).toEqual({ steelIngots: 12, secretCannonOrder: false });
  });

  it('updates slices immutably via withSlice and updateSlice without mutating prior instances', () => {
    const store0 = new StateSliceStore();
    const store1 = store0.withSlice(cannonProgressSlice, 0.45);
    const store2 = store1.updateSlice(ledgerSlice, (prev) => ({
      ...prev,
      steelIngots: prev.steelIngots + 8,
      secretCannonOrder: true,
    }));

    expect(store0.get(cannonProgressSlice)).toBe(0);
    expect(store0.get(ledgerSlice)).toEqual({ steelIngots: 12, secretCannonOrder: false });

    expect(store1.get(cannonProgressSlice)).toBe(0.45);
    expect(store1.get(ledgerSlice)).toEqual({ steelIngots: 12, secretCannonOrder: false });

    expect(store2.get(cannonProgressSlice)).toBe(0.45);
    expect(store2.get(ledgerSlice)).toEqual({ steelIngots: 20, secretCannonOrder: true });
    expect(store2.toSnapshot()).toEqual({
      'foundry.cannon_progress': 0.45,
      'foundry.ledger': { steelIngots: 20, secretCannonOrder: true },
    });
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
