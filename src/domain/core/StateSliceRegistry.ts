/**
 * Type-safe modular plugin state slices (`StateSliceKey<T>`, `StateSliceRegistry`, `StateSliceStore`).
 *
 * Allows plug-and-play content modules (behaviors, mechanics, epoch packs) to declare, read, and
 * immutably update custom state slices without untyped maps.
 */

export interface StateSliceKey<T> {
  readonly id: string;
  readonly defaultValue: T;
}

/**
 * Fast-path clone helper: returns primitives directly (zero allocation in 60 FPS loops)
 * and deep-clones objects via `structuredClone`.
 */
function cloneValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return structuredClone(value);
}

/**
 * Recursively freezes an object graph in place for snapshot and default-value immutability.
 */
function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (typeof child === 'object' && child !== null && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

/**
 * Defines a typed state slice descriptor with a non-empty identifier and deeply frozen default value.
 */
export function defineStateSlice<T>(id: string, defaultValue: T): StateSliceKey<T> {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('StateSliceKey id must be a non-empty string');
  }
  const clonedDefault = cloneValue(defaultValue);
  return Object.freeze({
    id: trimmed,
    defaultValue: deepFreeze(clonedDefault),
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
   * Restores a `StateSliceStore` from a plain-object snapshot produced by `toSnapshot()`.
   */
  public static fromSnapshot(snapshot: Readonly<Record<string, unknown>>): StateSliceStore {
    const entries = new Map<string, unknown>();
    for (const [id, value] of Object.entries(snapshot)) {
      entries.set(id, cloneValue(value));
    }
    return new StateSliceStore(entries);
  }

  /**
   * Reads the value for `key`, falling back to a fresh clone of `key.defaultValue` when unset.
   * Primitives return with zero allocation; objects are cloned so caller mutations cannot corrupt store state.
   */
  public get<T>(key: StateSliceKey<T>): T {
    if (!this.entries.has(key.id)) {
      return cloneValue(key.defaultValue);
    }
    const stored = this.entries.get(key.id) as T;
    return cloneValue(stored);
  }

  /**
   * Returns a new `StateSliceStore` with `key` updated to `newValue`, leaving this instance unchanged.
   */
  public withSlice<T>(key: StateSliceKey<T>, newValue: T): StateSliceStore {
    const next = new Map<string, unknown>(this.entries);
    next.set(key.id, cloneValue(newValue));
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
   * Returns a deeply frozen, deterministic plain-object snapshot of all explicitly stored slices.
   */
  public toSnapshot(): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const sortedKeys = Array.from(this.entries.keys()).sort();
    for (const id of sortedKeys) {
      result[id] = deepFreeze(cloneValue(this.entries.get(id)));
    }
    return Object.freeze(result);
  }
}
