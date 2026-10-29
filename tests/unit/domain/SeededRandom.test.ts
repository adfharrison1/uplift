import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../../src/domain/core/SeededRandom.js';

describe('SeededRandom', () => {
  it('produces identical sequences of 100 values from the same numeric seed', () => {
    const rngA = new SeededRandom(42_001);
    const rngB = new SeededRandom(42_001);
    const palette = ['foundry', 'scriptorium', 'council_hall', 'chapel'] as const;

    for (let i = 0; i < 100; i += 1) {
      const floatA = rngA.nextFloat();
      const floatB = rngB.nextFloat();
      expect(floatA).toBe(floatB);
      expect(floatA).toBeGreaterThanOrEqual(0);
      expect(floatA).toBeLessThan(1);

      const intA = rngA.nextInt(17);
      const intB = rngB.nextInt(17);
      expect(intA).toBe(intB);
      expect(intA).toBeGreaterThanOrEqual(0);
      expect(intA).toBeLessThan(17);

      const choiceA = rngA.choose(palette);
      const choiceB = rngB.choose(palette);
      expect(choiceA).toBe(choiceB);
    }

    expect(rngA.getState()).toBe(rngB.getState());
  });

  it('produces distinct sequences for different seeds and safely normalizes seed 0', () => {
    const rngZero = new SeededRandom(0);
    const rngOther = new SeededRandom(1337);

    expect(rngZero.getState()).not.toBe(0);
    const seqZero = Array.from({ length: 10 }, () => rngZero.nextFloat());
    const seqOther = Array.from({ length: 10 }, () => rngOther.nextFloat());
    expect(seqZero).not.toEqual(seqOther);
  });

  it('serializes and restores internal state mid-stream via getState() and fromState()', () => {
    const original = new SeededRandom(99_887);
    for (let i = 0; i < 25; i += 1) {
      original.nextFloat();
    }

    const savedState = original.getState();
    const restored = SeededRandom.fromState(savedState);

    for (let i = 0; i < 50; i += 1) {
      expect(restored.nextFloat()).toBe(original.nextFloat());
      expect(restored.nextInt(100)).toBe(original.nextInt(100));
    }
    expect(restored.getState()).toBe(original.getState());
  });

  it('rejects invalid bounds in nextInt and empty arrays in choose', () => {
    const rng = new SeededRandom(7);
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(-5)).toThrow(RangeError);
    expect(() => rng.nextInt(2.5)).toThrow(RangeError);
    expect(() => rng.choose([])).toThrow(RangeError);
  });
});
