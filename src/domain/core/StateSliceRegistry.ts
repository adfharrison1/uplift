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

const definedKeys = new WeakSet<object>();

/**
 * Copies caller-owned objects before they enter a slice. Primitives need no copy.
 */
function cloneValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return structuredClone(value);
}

/**
 * Recursively freezes a private copy, including descendants of a shallow-frozen root.
 */
function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null || visited.has(value)) {
    return value;
  }
  visited.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, visited);
  }
  Object.freeze(value);
  return value;
}

function ownFrozen<T>(value: T): T {
  return deepFreeze(cloneValue(value));
}

/**
 * Defines a typed state slice descriptor with a non-empty identifier and deeply frozen default value.
 */
export function defineStateSlice<T>(id: string, defaultValue: T): StateSliceKey<T> {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('StateSliceKey id must be a non-empty string');
  }
  const key = Object.freeze({
    id: trimmed,
    defaultValue: ownFrozen(defaultValue),
  });
  definedKeys.add(key);
  return key;
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

type SliceEntry =
  | { readonly kind: 'value'; readonly value: unknown }
  | { readonly kind: 'append'; readonly previous: SliceEntry; readonly row: unknown };

/**
 * Immutable store for modular plugin state slices.
 * Every update returns a new `StateSliceStore` instance, preserving reducer purity.
 */
export class StateSliceStore {
  #entries: ReadonlyMap<string, SliceEntry> = new Map();
  readonly #materialized = new Map<string, ReadonlyArray<unknown>>();
  readonly #fallbacks = new WeakMap<object, unknown>();

  public constructor() {
    if (arguments.length !== 0) {
      throw new TypeError('StateSliceStore constructor does not accept raw entries or arguments');
    }
  }

  static #fromTrustedEntries(entries: ReadonlyMap<string, SliceEntry>): StateSliceStore {
    const store = new StateSliceStore();
    store.#entries = entries;
    return store;
  }

  /**
   * Restores a `StateSliceStore` from a plain-object snapshot produced by `toSnapshot()`.
   */
  public static fromSnapshot(snapshot: Readonly<Record<string, unknown>>): StateSliceStore {
    const entries = new Map<string, SliceEntry>();
    for (const [id, value] of Object.entries(snapshot)) {
      entries.set(id, Object.freeze({ kind: 'value', value: ownFrozen(value) }));
    }
    return StateSliceStore.#fromTrustedEntries(entries);
  }

  /**
   * Returns a shared frozen value, or the key's frozen default when unset.
   * Appended collections are materialized on first read and cached per store.
   */
  public get<T>(key: StateSliceKey<T>): T {
    return this.#read(key, key.id);
  }

  #read<T>(key: StateSliceKey<T>, id: string): T {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      if (definedKeys.has(key)) {
        return key.defaultValue;
      }
      if (!this.#fallbacks.has(key)) {
        this.#fallbacks.set(key, ownFrozen(key.defaultValue));
      }
      return this.#fallbacks.get(key) as T;
    }
    return this.#materialize(id, entry) as T;
  }

  /**
   * Returns a new `StateSliceStore` with `key` updated to `newValue`, leaving this instance unchanged.
   */
  public withSlice<T>(key: StateSliceKey<T>, newValue: T): StateSliceStore {
    return this.#withSlice(key.id, newValue);
  }

  #withSlice<T>(id: string, newValue: T): StateSliceStore {
    const next = new Map(this.#entries);
    next.set(id, Object.freeze({ kind: 'value', value: ownFrozen(newValue) }));
    return StateSliceStore.#fromTrustedEntries(next);
  }

  /** Appends one privately frozen row without reading or copying prior rows. */
  public appendSlice<Row>(key: StateSliceKey<ReadonlyArray<Row>>, row: Row): StateSliceStore {
    const id = key.id;
    if (!this.#entries.has(id) && !definedKeys.has(key)) {
      throw new TypeError(`StateSliceKey '${id}' must use defineStateSlice for append`);
    }
    const previous =
      this.#entries.get(id) ?? Object.freeze({ kind: 'value', value: key.defaultValue });
    if (previous.kind === 'value' && !Array.isArray(previous.value)) {
      throw new TypeError(`StateSliceKey '${id}' is not an array collection`);
    }
    const next = new Map(this.#entries);
    next.set(id, Object.freeze({ kind: 'append', previous, row: ownFrozen(row) }));
    return StateSliceStore.#fromTrustedEntries(next);
  }

  /**
   * Applies a pure updater function to the current value of `key` and returns a new `StateSliceStore`.
   */
  public updateSlice<T>(key: StateSliceKey<T>, updater: (current: T) => T): StateSliceStore {
    const id = key.id;
    const current = this.#read(key, id);
    const updated = updater(current);
    return this.#withSlice(id, updated);
  }

  /**
   * Returns a deeply frozen, deterministic plain-object snapshot of all explicitly stored slices.
   */
  public toSnapshot(): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const sortedKeys = Array.from(this.#entries.keys()).sort();
    for (const id of sortedKeys) {
      const entry = this.#entries.get(id);
      if (entry !== undefined) {
        result[id] = ownFrozen(this.#materialize(id, entry));
      }
    }
    return Object.freeze(result);
  }

  #materialize(id: string, entry: SliceEntry): unknown {
    if (entry.kind === 'value') {
      return entry.value;
    }
    const cached = this.#materialized.get(id);
    if (cached !== undefined) {
      return cached;
    }

    const appendedRows: unknown[] = [];
    let current: SliceEntry = entry;
    while (current.kind === 'append') {
      appendedRows.push(current.row);
      current = current.previous;
    }
    if (!Array.isArray(current.value)) {
      throw new TypeError(`StateSliceKey '${id}' is not an array collection`);
    }
    const rows: unknown[] = [...current.value];
    for (let index = appendedRows.length - 1; index >= 0; index -= 1) {
      rows.push(appendedRows[index]);
    }
    const frozen = Object.freeze(rows);
    this.#materialized.set(id, frozen);
    return frozen;
  }
}
