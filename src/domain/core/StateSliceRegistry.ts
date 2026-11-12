/**
 * Type-safe modular plugin state slices (`StateSliceKey<T>`, `StateSliceRegistry`, `StateSliceStore`).
 *
 * Allows plug-and-play content modules (behaviors, mechanics, epoch packs) to declare, read, and
 * immutably update custom state slices without untyped maps.
 */

export interface StateSliceKey<T> {
  readonly id: string;
  readonly defaultValue: T;
  readonly schema?: SliceSchema<unknown> | undefined;
  readonly rowSchema?: SliceSchema<unknown> | undefined;
  readonly version?: number | undefined;
  readonly migrate?: ((value: unknown, fromVersion: number) => unknown) | undefined;
}

export interface SliceSchema<T> {
  parse(value: unknown): T;
}

export interface StateSliceOptions<T> {
  readonly schema?: SliceSchema<T> | undefined;
  readonly rowSchema?: T extends ReadonlyArray<infer Row>
    ? SliceSchema<Row> | undefined
    : undefined;
  readonly version?: number | undefined;
  readonly migrate?: ((value: unknown, fromVersion: number) => unknown) | undefined;
}

const definedKeys = new WeakSet<object>();
const capturedSchemas = new WeakMap<object, SliceSchema<unknown>>();
const capturedConstraints = new WeakMap<object, SliceConstraints>();

interface SliceConstraints {
  readonly schema: SliceSchema<unknown> | undefined;
  readonly rowSchema: SliceSchema<unknown> | undefined;
  readonly version: number;
  readonly migrate: ((value: unknown, fromVersion: number) => unknown) | undefined;
}

const emptyConstraints: SliceConstraints = Object.freeze({
  schema: undefined,
  rowSchema: undefined,
  version: 1,
  migrate: undefined,
});

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

function invalid(id: string, path: string, reason: string): never {
  throw new TypeError(`StateSliceKey '${id}' at ${path}: ${reason}`);
}

function checkedId(id: string): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError('StateSliceKey id must be a non-empty string');
  }
  if (unsafeKeys.has(id)) {
    invalid(id, '$', 'unsafe slice identifier');
  }
  return id;
}

function captureSchema(
  schema: SliceSchema<unknown> | undefined,
  id: string,
  field: string,
): SliceSchema<unknown> | undefined {
  if (schema === undefined) {
    return undefined;
  }
  if (schema === null || (typeof schema !== 'object' && typeof schema !== 'function')) {
    invalid(id, field, 'schema must provide parse');
  }
  const existing = capturedSchemas.get(schema);
  if (existing !== undefined) {
    return existing;
  }
  const parse = schema.parse;
  if (typeof parse !== 'function') {
    invalid(id, field, 'schema must provide parse');
  }
  const captured: SliceSchema<unknown> = Object.freeze({
    parse(value: unknown): unknown {
      return parse.call(schema, value);
    },
  });
  capturedSchemas.set(schema, captured);
  capturedSchemas.set(captured, captured);
  return captured;
}

function captureConstraints(
  input: Pick<StateSliceKey<unknown>, 'schema' | 'rowSchema' | 'version' | 'migrate'> | undefined,
  id: string,
): SliceConstraints {
  if (input === undefined) {
    return emptyConstraints;
  }
  const existing = capturedConstraints.get(input);
  if (existing !== undefined) {
    return existing;
  }
  const schema = input.schema;
  const rowSchema = input.rowSchema;
  const version = input.version === undefined ? 1 : input.version;
  const migrate = input.migrate;
  if (!Number.isSafeInteger(version) || version < 1) {
    invalid(id, '$.version', 'version must be a positive integer');
  }
  if (migrate !== undefined && typeof migrate !== 'function') {
    invalid(id, '$.migrate', 'migration must be a function');
  }
  const constraints: SliceConstraints = Object.freeze({
    schema: captureSchema(schema, id, '$.schema'),
    rowSchema: captureSchema(rowSchema, id, '$.rowSchema'),
    version,
    migrate: migrate?.bind(input),
  });
  capturedConstraints.set(input, constraints);
  return constraints;
}

function requireSameConstraints(
  id: string,
  stored: SliceConstraints,
  incoming: SliceConstraints,
): void {
  if (
    stored.schema !== incoming.schema ||
    stored.rowSchema !== incoming.rowSchema ||
    stored.version !== incoming.version ||
    stored.migrate !== incoming.migrate
  ) {
    throw new TypeError(`StateSliceKey '${id}' schema differs from the stored slice`);
  }
}

/** Copies only values that have an exact, lossless JSON shape. */
function copyJson(
  value: unknown,
  id: string,
  path = '$',
  ancestors = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      invalid(id, path, 'non-finite number');
    }
    return value;
  }
  if (typeof value !== 'object') {
    invalid(id, path, `unsupported ${typeof value} value`);
  }
  if (ancestors.has(value)) {
    invalid(id, path, 'cycle');
  }
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null
  ) {
    invalid(id, path, 'non-plain object or array');
  }
  ancestors.add(value);
  try {
    if (array) {
      for (const key of Reflect.ownKeys(value)) {
        if (
          typeof key !== 'string' ||
          (key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
        ) {
          invalid(id, path, 'array has a non-index property');
        }
      }
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          invalid(id, `${path}[${index}]`, 'sparse or accessor array element');
        }
        result.push(copyJson(descriptor.value, id, `${path}[${index}]`, ancestors));
      }
      return result;
    }
    const result: Record<string, unknown> = {};
    const keys: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        invalid(id, path, 'symbol object key');
      }
      keys.push(key);
    }
    for (const key of keys.sort()) {
      if (unsafeKeys.has(key)) {
        invalid(id, `${path}.${key}`, 'unsafe object key');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        invalid(id, `${path}.${key}`, 'non-enumerable or accessor property');
      }
      result[key] = copyJson(descriptor.value, id, `${path}.${key}`, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
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

function schemaMatches(
  value: unknown,
  id: string,
  path: string,
  schema: SliceSchema<unknown>,
): void {
  let parsed: unknown;
  try {
    parsed = schema.parse(copyJson(value, id, path));
  } catch (error) {
    invalid(id, path, `schema rejected value: ${String(error)}`);
  }
  const checked = copyJson(parsed, id, path);
  if (JSON.stringify(checked) !== JSON.stringify(value)) {
    invalid(id, path, 'schema would change the value');
  }
}

function ownFrozen<T>(value: T, id: string, constraints = emptyConstraints): T {
  const candidate = copyJson(value, id);
  if (constraints.schema !== undefined) {
    schemaMatches(candidate, id, '$', constraints.schema);
  }
  if (constraints.rowSchema !== undefined) {
    if (!Array.isArray(candidate)) {
      invalid(id, '$', 'row schema requires an array collection');
    }
    for (let index = 0; index < candidate.length; index += 1) {
      schemaMatches(candidate[index], id, `$[${index}]`, constraints.rowSchema);
    }
  }
  return deepFreeze(candidate) as T;
}

/**
 * Defines a typed state slice descriptor with a non-empty identifier and deeply frozen default value.
 */
export function defineStateSlice<T>(
  id: string,
  defaultValue: T,
  options?: StateSliceOptions<T>,
): StateSliceKey<T> {
  const trimmed = id.trim();
  checkedId(trimmed);
  const constraints = captureConstraints(options, trimmed);
  const key = Object.freeze({
    id: trimmed,
    defaultValue: ownFrozen(defaultValue, trimmed, constraints),
    schema: constraints.schema,
    rowSchema: constraints.rowSchema,
    version: constraints.version,
    migrate: constraints.migrate,
  });
  definedKeys.add(key);
  capturedConstraints.set(key, constraints);
  return key;
}

/**
 * Registry that tracks declared `StateSliceKey` descriptors across loaded content packs
 * and rejects duplicate slice key collisions at startup.
 */
export class StateSliceRegistry {
  private readonly keys = new Map<string, StateSliceKey<unknown>>();

  public register<T>(key: StateSliceKey<T>): void {
    const id = checkedId(key.id);
    const constraints = captureConstraints(key, id);
    if (this.keys.has(id)) {
      throw new Error(`Duplicate StateSliceKey id registered: '${id}'`);
    }
    const registered = Object.freeze({
      id,
      defaultValue: ownFrozen(key.defaultValue, id, constraints),
      schema: constraints.schema,
      rowSchema: constraints.rowSchema,
      version: constraints.version,
      migrate: constraints.migrate,
    });
    capturedConstraints.set(registered, constraints);
    this.keys.set(id, registered);
  }

  public get(id: string): StateSliceKey<unknown> | undefined {
    return this.keys.get(id);
  }

  public has(id: string): boolean {
    return this.keys.has(id);
  }

  public getAllIds(): ReadonlyArray<string> {
    return Array.from(this.keys.keys());
  }
}

type SliceEntry =
  | {
      readonly kind: 'value';
      readonly value: unknown;
      readonly constraints: SliceConstraints;
      readonly version: number;
    }
  | {
      readonly kind: 'append';
      readonly previous: SliceEntry;
      readonly row: unknown;
      readonly constraints: SliceConstraints;
      readonly version: number;
    };

function readVersionMap(input: unknown, slices: object): Readonly<Record<string, number>> {
  if (input === undefined) {
    return {};
  }
  const copied = copyJson(input, 'sliceVersions');
  if (copied === null || Array.isArray(copied) || typeof copied !== 'object') {
    invalid('sliceVersions', '$', 'version map must be a plain record');
  }
  const versions: Record<string, number> = {};
  for (const [id, version] of Object.entries(copied)) {
    if (!Object.hasOwn(slices, id)) {
      invalid(id, '$.version', 'orphaned version entry');
    }
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
      invalid(id, '$.version', 'version must be a positive integer');
    }
    versions[id] = version;
  }
  return versions;
}

/**
 * Immutable store for modular plugin state slices.
 * Every update returns a new `StateSliceStore` instance, preserving reducer purity.
 */
export class StateSliceStore {
  #entries: ReadonlyMap<string, SliceEntry> = new Map();
  #registry: StateSliceRegistry | undefined;
  readonly #materialized = new Map<string, ReadonlyArray<unknown>>();
  readonly #fallbacks = new WeakMap<object, unknown>();

  public constructor() {
    if (arguments.length !== 0) {
      throw new TypeError('StateSliceStore constructor does not accept raw entries or arguments');
    }
  }

  static #fromTrustedEntries(
    entries: ReadonlyMap<string, SliceEntry>,
    registry?: StateSliceRegistry,
  ): StateSliceStore {
    const store = new StateSliceStore();
    store.#entries = entries;
    store.#registry = registry;
    return store;
  }

  /**
   * Restores a `StateSliceStore` from a plain-object snapshot produced by `toSnapshot()`.
   */
  public static fromSnapshot(
    snapshot: unknown,
    registry?: StateSliceRegistry,
    versionMap?: unknown,
  ): StateSliceStore {
    const copied = copyJson(snapshot, 'stateSlices');
    if (copied === null || Array.isArray(copied) || typeof copied !== 'object') {
      invalid('stateSlices', '$', 'snapshot must be a plain record');
    }
    const versions = readVersionMap(versionMap, copied);
    const entries = new Map<string, SliceEntry>();
    for (const [id, value] of Object.entries(copied)) {
      checkedId(id);
      const registered = registry?.get(id);
      const constraints = captureConstraints(registered, id);
      const fromVersion = versions[id] ?? 1;
      if (registered !== undefined && fromVersion > constraints.version) {
        invalid(
          id,
          '$.version',
          `future slice version ${String(fromVersion)} exceeds ${String(constraints.version)}`,
        );
      }
      let candidate = value;
      if (registered !== undefined && fromVersion < constraints.version) {
        if (constraints.migrate === undefined) {
          invalid(id, '$.version', `missing migration from version ${String(fromVersion)}`);
        }
        try {
          candidate = copyJson(constraints.migrate(copyJson(candidate, id), fromVersion), id);
        } catch (error) {
          invalid(
            id,
            '$.version',
            `migration from version ${String(fromVersion)} failed: ${String(error)}`,
          );
        }
      }
      const version = registered === undefined ? fromVersion : constraints.version;
      let frozenValue: unknown;
      try {
        frozenValue = ownFrozen(candidate, id, constraints);
      } catch (error) {
        if (registered !== undefined && fromVersion < constraints.version) {
          invalid(
            id,
            '$.version',
            `migration to version ${String(constraints.version)} produced invalid value: ${String(error)}`,
          );
        }
        throw error;
      }
      entries.set(
        id,
        Object.freeze({
          kind: 'value',
          value: frozenValue,
          constraints,
          version,
        }),
      );
    }
    return StateSliceStore.#fromTrustedEntries(entries, registry);
  }

  /**
   * Returns a shared frozen value, or the key's frozen default when unset.
   * Appended collections are materialized on first read and cached per store.
   */
  public get<T>(key: StateSliceKey<T>): T {
    const id = checkedId(key.id);
    return this.#read(key, id, captureConstraints(key, id));
  }

  #read<T>(key: StateSliceKey<T>, id: string, constraints: SliceConstraints): T {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      if (definedKeys.has(key)) {
        return key.defaultValue;
      }
      if (!this.#fallbacks.has(key)) {
        this.#fallbacks.set(key, ownFrozen(key.defaultValue, id, constraints));
      }
      return this.#fallbacks.get(key) as T;
    }
    requireSameConstraints(id, entry.constraints, constraints);
    return this.#materialize(id, entry) as T;
  }

  /**
   * Returns a new `StateSliceStore` with `key` updated to `newValue`, leaving this instance unchanged.
   */
  public withSlice<T>(key: StateSliceKey<T>, newValue: T): StateSliceStore {
    const id = checkedId(key.id);
    return this.#withSlice(id, newValue, captureConstraints(this.#registry?.get(id) ?? key, id));
  }

  #withSlice<T>(id: string, newValue: T, constraints: SliceConstraints): StateSliceStore {
    const previous = this.#entries.get(id);
    if (previous !== undefined) {
      requireSameConstraints(id, previous.constraints, constraints);
      if (previous.version !== constraints.version) {
        invalid(id, '$.version', 'write cannot replace a different stored version');
      }
    }
    const next = new Map(this.#entries);
    next.set(
      id,
      Object.freeze({
        kind: 'value',
        value: ownFrozen(newValue, id, constraints),
        constraints,
        version: constraints.version,
      }),
    );
    return StateSliceStore.#fromTrustedEntries(next, this.#registry);
  }

  /** Appends one privately frozen row without reading or copying prior rows. */
  public appendSlice<Row>(key: StateSliceKey<ReadonlyArray<Row>>, row: Row): StateSliceStore {
    const id = checkedId(key.id);
    const registered = this.#registry?.get(id);
    const constraints = captureConstraints(registered ?? key, id);
    if (constraints.schema !== undefined) {
      throw new TypeError(`StateSliceKey '${id}' cannot use fast append with a whole-array schema`);
    }
    if (!this.#entries.has(id) && !definedKeys.has(key) && registered === undefined) {
      throw new TypeError(`StateSliceKey '${id}' must use defineStateSlice for append`);
    }
    const previous =
      this.#entries.get(id) ??
      Object.freeze({
        kind: 'value',
        value: registered?.defaultValue ?? key.defaultValue,
        constraints,
        version: constraints.version,
      });
    if (previous.constraints.schema !== undefined) {
      throw new TypeError(`StateSliceKey '${id}' cannot append to a whole-array schema value`);
    }
    requireSameConstraints(id, previous.constraints, constraints);
    if (previous.version !== constraints.version) {
      invalid(id, '$.version', 'append cannot change the stored version');
    }
    if (previous.kind === 'value' && !Array.isArray(previous.value)) {
      throw new TypeError(`StateSliceKey '${id}' is not an array collection`);
    }
    const next = new Map(this.#entries);
    next.set(
      id,
      Object.freeze({
        kind: 'append',
        previous,
        row: ownFrozen(
          row,
          id,
          constraints.rowSchema === undefined
            ? emptyConstraints
            : { ...emptyConstraints, schema: constraints.rowSchema },
        ),
        constraints,
        version: constraints.version,
      }),
    );
    return StateSliceStore.#fromTrustedEntries(next, this.#registry);
  }

  /**
   * Applies a pure updater function to the current value of `key` and returns a new `StateSliceStore`.
   */
  public updateSlice<T>(key: StateSliceKey<T>, updater: (current: T) => T): StateSliceStore {
    const id = checkedId(key.id);
    const constraints = captureConstraints(this.#registry?.get(id) ?? key, id);
    const current = this.#read(key, id, constraints);
    const updated = updater(current);
    return this.#withSlice(id, updated, constraints);
  }

  /** Versions above historical version one, stored separately from raw slice values. */
  public toVersionMap(): Readonly<Record<string, number>> {
    const versions: Record<string, number> = {};
    for (const id of Array.from(this.#entries.keys()).sort()) {
      const entry = this.#entries.get(id);
      if (entry !== undefined && entry.version !== 1) {
        versions[id] = entry.version;
      }
    }
    return Object.freeze(versions);
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
        result[id] = ownFrozen(this.#materialize(id, entry), id);
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
