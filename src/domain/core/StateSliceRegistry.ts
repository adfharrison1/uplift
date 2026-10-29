/**
 * Type-safe modular plugin state slices (`StateSliceKey<T>`, `StateSliceRegistry`, `StateSliceStore`).
 *
 * Allows plug-and-play content modules (behaviors, mechanics, era packs) to declare, read, and
 * immutably update custom state slices without untyped maps.
 */

export interface StateSliceKey<T> {
  readonly id: string;
  readonly defaultValue: T;
}

/**
 * Defines a typed state slice descriptor with a non-empty identifier and default value.
 */
export function defineStateSlice<T>(id: string, defaultValue: T): StateSliceKey<T> {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('StateSliceKey id must be a non-empty string');
  }
  return Object.freeze({
    id: trimmed,
    defaultValue: structuredClone(defaultValue),
  });
}

/**
 * Registry that tracks declared `StateSliceKey` descriptors across loaded content packs
 * and rejects duplicate slice key collisions at startup.
 */
export class StateSliceRegistry {
  private readonly keys = new Map<string, StateSliceKey<unknown>>();

  public register<T>(key: StateSliceKey<T>): void {
    if (this.keys.has(key.id)) {
      throw new Error(`Duplicate StateSliceKey id registered: '${key.id}'`);
    }
    this.keys.set(key.id, key);
  }

  public has(id: string): boolean {
    return this.keys.has(id);
  }

  public getAllIds(): ReadonlyArray<string> {
    return Array.from(this.keys.keys());
  }
}

/**
 * Immutable store for modular plugin state slices.
 * Every update returns a new `StateSliceStore` instance, preserving reducer purity.
 */
export class StateSliceStore {
  private readonly entries: ReadonlyMap<string, unknown>;

  public constructor(entries?: ReadonlyMap<string, unknown>) {
    this.entries = entries ? new Map(entries) : new Map<string, unknown>();
  }

  /**
   * Reads the value for `key`, falling back to a fresh clone of `key.defaultValue` when unset.
   */
  public get<T>(key: StateSliceKey<T>): T {
    if (!this.entries.has(key.id)) {
      return structuredClone(key.defaultValue);
    }
    const stored = this.entries.get(key.id) as T;
    return structuredClone(stored);
  }

  /**
   * Returns a new `StateSliceStore` with `key` updated to `newValue`, leaving this instance unchanged.
   */
  public withSlice<T>(key: StateSliceKey<T>, newValue: T): StateSliceStore {
    const next = new Map<string, unknown>(this.entries);
    next.set(key.id, structuredClone(newValue));
    return new StateSliceStore(next);
  }

  /**
   * Applies a pure updater function to the current value of `key` and returns a new `StateSliceStore`.
   */
  public updateSlice<T>(key: StateSliceKey<T>, updater: (current: T) => T): StateSliceStore {
    const current = this.get(key);
    const updated = updater(current);
    return this.withSlice(key, updated);
  }

  /**
   * Returns a deterministic plain-object snapshot of all explicitly stored slices.
   */
  public toSnapshot(): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const sortedKeys = Array.from(this.entries.keys()).sort();
    for (const id of sortedKeys) {
      result[id] = structuredClone(this.entries.get(id));
    }
    return Object.freeze(result);
  }
}
