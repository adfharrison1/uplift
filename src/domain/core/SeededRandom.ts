/**
 * Deterministic 32-bit Xorshift pseudo-random number generator for the Domain layer.
 *
 * Guarantees reproducible sequences across simulation runs, save/load snapshots,
 * and headless test harnesses without ever calling `Math.random()`.
 */
const DEFAULT_NON_ZERO_SEED = 0x6d2b79f5;
const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;

function normalizeSeed(seed: number): number {
  const uint32 = seed >>> 0;
  return uint32 === 0 ? DEFAULT_NON_ZERO_SEED : uint32;
}

export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  /**
   * Restores a `SeededRandom` instance from a previously serialized `getState()` value.
   */
  public static fromState(state: number): SeededRandom {
    return new SeededRandom(state);
  }

  /**
   * Returns the current internal 32-bit unsigned integer state for serialization.
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Advances the Xorshift32 state and returns an unsigned 32-bit integer.
   */
  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = normalizeSeed(x);
    return this.state;
  }

  /**
   * Returns a deterministic floating-point value in the half-open interval `[0, 1)`.
   */
  public nextFloat(): number {
    return this.nextUint32() / UINT32_MAX_PLUS_ONE;
  }

  /**
   * Returns a deterministic integer in the half-open interval `[0, maxExclusive)`.
   */
  public nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`maxExclusive must be a positive integer, received: ${String(maxExclusive)}`);
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  /**
   * Deterministically selects one element from a non-empty readonly array.
   */
  public choose<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot choose from an empty array');
    }
    const index = this.nextInt(items.length);
    const chosen = items[index];
    if (chosen === undefined && !(index in items)) {
      throw new RangeError(`Selected index ${String(index)} out of bounds`);
    }
    return chosen as T;
  }
}
