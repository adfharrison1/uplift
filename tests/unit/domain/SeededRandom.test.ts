import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../../src/domain/core/SeededRandom.js';

describe('SeededRandom', () => {
  it.each([
    [0, 0x92ca2f0e],
    [1, 0x96a0f96b],
    [2, 0xb4421bbb],
    [42, 0x3805ea2c],
  ])('mixes fresh seed %i to the pinned initial state', (seed, initialState) => {
    expect(new SeededRandom(seed).getState()).toBe(initialState);
    expect(new SeededRandom(seed).nextUint32()).toBe(new SeededRandom(seed).nextUint32());
  });

  it('normalizes wrapped and negative seeds before mixing', () => {
    expect(new SeededRandom(-1).getState()).toBe(new SeededRandom(0xffffffff).getState());
    expect(new SeededRandom(0x1_0000_0000).getState()).toBe(0x92ca2f0e);
    expect(new SeededRandom(0x1_0000_0001).getState()).toBe(0x96a0f96b);
  });

  it('uses the non-zero fallback when a valid seed mixes to zero', () => {
    const first = new SeededRandom(0x61c88647);
    const second = new SeededRandom(0x61c88647);

    expect(first.getState()).toBe(0x6d2b79f5);
    expect(Array.from({ length: 10 }, () => first.nextUint32())).toEqual(
      Array.from({ length: 10 }, () => second.nextUint32()),
    );
    expect(first.getState()).not.toBe(0);
  });

  it('restores a serialized word without applying fresh-seed mixing', () => {
    const restored = SeededRandom.fromState(0x12345678);
    expect(restored.getState()).toBe(0x12345678);
    expect(restored.nextUint32()).toBe(0x87985aa5);
  });

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

  it('handles nextInt(1), single-element choose, and statistical distribution across buckets', () => {
    const rng = new SeededRandom(2026);
    expect(rng.nextInt(1)).toBe(0);
    expect(rng.choose(['only_item'])).toBe('only_item');

    const buckets = [0, 0, 0];
    const sampleCount = 3000;
    for (let i = 0; i < sampleCount; i += 1) {
      const bucket = rng.nextInt(3);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });

  it('rejects non-integer seeds, invalid serialized states, invalid nextInt bounds, and empty/sparse arrays', () => {
    expect(() => new SeededRandom(Number.NaN)).toThrow(RangeError);
    expect(() => new SeededRandom(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => new SeededRandom(3.1415)).toThrow(RangeError);

    expect(() => SeededRandom.fromState(0)).toThrow(RangeError);
    expect(() => SeededRandom.fromState(Number.NaN)).toThrow(RangeError);
    expect(() => SeededRandom.fromState(0x1_0000_0000)).toThrow(RangeError);

    const rng = new SeededRandom(7);
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(-5)).toThrow(RangeError);
    expect(() => rng.nextInt(2.5)).toThrow(RangeError);
    expect(() => rng.nextInt(0x1_0000_0001)).toThrow(RangeError);
    expect(() => rng.choose([])).toThrow(RangeError);

    const sparse = new Array<string>(2);
    expect(() => rng.choose(sparse)).toThrow(RangeError);
  });
});
