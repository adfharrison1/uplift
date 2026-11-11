/**
 * Deterministic 32-bit Xorshift pseudo-random number generator for the Domain layer.
 *
 * Guarantees reproducible sequences across simulation runs, save/load snapshots,
 * and headless test harnesses without ever calling `Math.random()`.
 */
const DEFAULT_NON_ZERO_SEED = 0x6d2b79f5;
const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;
const RAW_STATE_TOKEN = Symbol('SeededRandom.rawState');

function validateAndNormalizeSeed(seed: number): number {
  if (!Number.isInteger(seed)) {
    throw new RangeError(`Seed must be a finite integer, received: ${String(seed)}`);
  }
  return seed >>> 0;
}

function mixFreshSeed(seed: number): number {
  let word = (seed + 0x9e3779b9) >>> 0;
  word = Math.imul(word ^ (word >>> 16), 0x85ebca6b);
  word = Math.imul(word ^ (word >>> 13), 0xc2b2ae35);
  return (word ^ (word >>> 16)) >>> 0;
}

function normalizeInternalState(state: number): number {
  const uint32 = state >>> 0;
  return uint32 === 0 ? DEFAULT_NON_ZERO_SEED : uint32;
}

export class SeededRandom {
  private state: number;

  public constructor(seed: number, rawStateToken?: typeof RAW_STATE_TOKEN) {
    this.state =
      rawStateToken === RAW_STATE_TOKEN
        ? seed
        : normalizeInternalState(mixFreshSeed(validateAndNormalizeSeed(seed)));
  }

  /**
   * Restores a `SeededRandom` instance from a previously serialized `getState()` value.
   */
  public static fromState(state: number): SeededRandom {
    if (!Number.isInteger(state) || state <= 0 || state >= UINT32_MAX_PLUS_ONE) {
      throw new RangeError(
        `Serialized SeededRandom state must be an integer in [1, 2^32 - 1], received: ${String(state)}`,
      );
    }
    return new SeededRandom(state, RAW_STATE_TOKEN);
  }

  /**
   * Returns the current internal 32-bit unsigned integer state for serialization.
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Advances the Xorshift32 state (Marsaglia 13, 17, 5) and returns an unsigned 32-bit integer.
   */
  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = normalizeInternalState(x);
    return this.state;
  }

  /**
   * Returns a deterministic floating-point value in the half-open interval `[0, 1)`.
   */
  public nextFloat(): number {
    return this.nextUint32() / UINT32_MAX_PLUS_ONE;
  }

  /**
   * Returns an unbiased deterministic integer in the half-open interval `[0, maxExclusive)`
   * using rejection sampling to avoid modulo bias.
   */
  public nextInt(maxExclusive: number): number {
    if (
      !Number.isInteger(maxExclusive) ||
      maxExclusive <= 0 ||
      maxExclusive > UINT32_MAX_PLUS_ONE
    ) {
      throw new RangeError(
        `maxExclusive must be an integer in [1, 2^32], received: ${String(maxExclusive)}`,
      );
    }
    if (maxExclusive === 1) {
      this.nextUint32();
      return 0;
    }

    const limit = UINT32_MAX_PLUS_ONE - (UINT32_MAX_PLUS_ONE % maxExclusive);
    let sample = this.nextUint32();
    while (sample >= limit) {
      sample = this.nextUint32();
    }
    return sample % maxExclusive;
  }

  /**
   * Deterministically selects one element from a non-empty readonly array.
   */
  public choose<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot choose from an empty array');
    }
    const index = this.nextInt(items.length);
    if (!(index in items)) {
      throw new RangeError(`Cannot choose from sparse array hole at index ${String(index)}`);
    }
    return items[index] as T;
  }
}
