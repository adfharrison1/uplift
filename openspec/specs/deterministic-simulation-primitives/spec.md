# deterministic-simulation-primitives Specification

## Purpose
Provide deterministic pseudo-random number generation (`SeededRandom`) and type-safe modular state slices (`StateSliceKey<T>` and `StateSliceStore`) for the simulation domain.

## Requirements

### Requirement: Seeded deterministic pseudo-random number generator
The domain layer SHALL provide a `SeededRandom` generator that mixes each fresh numeric seed with `splitmix32` before Xorshift32, restores serialized internal state without remixing it, and forbids raw `Math.random()` and `Date.now()` inside `src/domain/` and `src/content/`.

#### Scenario: Reproducible sequence from identical seed
- **WHEN** two `SeededRandom` instances are initialized with the same numeric seed and called for 100 values (`nextFloat()`, `nextInt()`, `choose()`)
- **THEN** both instances SHALL produce identical sequences of values and identical final internal seed states

#### Scenario: State serialization and restoration
- **WHEN** `getState()` is captured from a `SeededRandom` instance after $N$ draws and used to initialize a new instance through `fromState()`
- **THEN** subsequent draws from both instances SHALL be identical; restoration SHALL use the saved internal state directly, without applying `splitmix32` again

#### Scenario: Ban on unseeded randomness in domain and content
- **WHEN** any `.ts` file in `src/domain/` or `src/content/` calls `Math.random()` or `Date.now()`
- **THEN** `npm run test:arch` SHALL fail and report the offending file

#### Scenario: Fresh-seed golden vectors and adjacent seeds
- **WHEN** fresh generators are constructed from numeric seeds `0`, `1`, `2`, and `42`
- **THEN** their initial internal states SHALL be `0x92ca2f0e`, `0x96a0f96b`, `0xb4421bbb`, and `0x3805ea2c` respectively, and repeated construction SHALL give identical draw sequences

#### Scenario: Normalization and rejection of invalid fresh seeds
- **WHEN** a fresh generator receives a finite integer seed that maps to a 32-bit word, or receives a non-integer or non-finite seed
- **THEN** the generator SHALL use deterministic unsigned 32-bit normalization and a non-zero Xorshift32 state for the former, and SHALL throw `RangeError` for the latter

#### Scenario: Mixed-zero seed uses a non-zero fallback
- **WHEN** a fresh generator receives seed `0x61c88647`, whose specified `splitmix32` result is zero
- **THEN** its initial Xorshift32 state SHALL be `0x6d2b79f5`, and subsequent draws SHALL be deterministic and non-zero-state

#### Scenario: Save and load continue the same stream
- **WHEN** a coordinator saves after draws and a coordinator loads that slot using its serialized RNG state
- **THEN** the loaded coordinator's next draws SHALL match continuation from the saved state, without applying fresh-seed mixing again

### Requirement: Type-safe modular plugin state slices
The domain layer SHALL provide epoch-agnostic `StateSliceKey<T>`, `StateSliceRegistry` and immutable `StateSliceStore` contracts. The store SHALL accept only plain-JSON values, freeze values on write, share frozen values on read, support collection append without traversing existing rows, and restore known slices through optional validation-only schema, version and migration contracts without silently losing data.

#### Scenario: Default value fallback when slice is unset
- **WHEN** a module defines a `StateSliceKey<T>` with an object or array default and reads it from an empty `StateSliceStore`
- **THEN** the store SHALL return the same deeply frozen default reference on repeated reads, matching the declared value, and later mutation of the caller's original input SHALL NOT change it

#### Scenario: Immutable update and retrieval of a typed state slice
- **WHEN** a module updates a `StateSliceKey<T>` on a `StateSliceStore` via `withSlice(key, newValue)` and then reads it twice
- **THEN** the new store SHALL return the same deeply frozen value reference on both reads, the previous store SHALL retain its prior value, and later mutation of `newValue` SHALL NOT affect either store

#### Scenario: Duplicate slice key collision rejection in registry
- **WHEN** two distinct state slice definitions attempt to register the same string identifier in a `StateSliceRegistry`
- **THEN** the registry SHALL throw a descriptive duplicate-key error

#### Scenario: Raw-entry construction cannot bypass validation
- **WHEN** a caller attempts to construct a store from a supplied map containing a mutable or non-JSON value
- **THEN** the public constructor SHALL reject raw entries; only validated store operations SHALL publish entries, and later caller mutation SHALL NOT alter a store

#### Scenario: Growing collection append preserves earlier stores
- **WHEN** a caller appends one plain-JSON row to a slice collection with 5,000 existing rows and retains the earlier store
- **THEN** the append SHALL create a new store without traversing or copying the existing rows, the earlier store SHALL expose exactly its earlier rows, and the new store SHALL expose the appended row in order; a full collection read or snapshot MAY take time proportional to the number of rows

#### Scenario: Appendable row schema and unsupported whole-array schema
- **WHEN** an appendable collection key has a row validator, or a key has an arbitrary whole-array schema that cannot be checked incrementally
- **THEN** a valid row SHALL append without revisiting earlier rows, an invalid row SHALL be rejected before publication, and the incompatible whole-array key SHALL reject the fast append path with its prior store unchanged

#### Scenario: Frozen nested values cannot be changed through a read
- **WHEN** a caller reads an object slice containing nested arrays and objects from a store, including a caller-supplied object whose root was already shallow-frozen
- **THEN** every reachable node in the returned value SHALL be frozen, attempted mutation SHALL fail or leave the value unchanged, and later reads SHALL return the same uncorrupted reference

#### Scenario: Non-JSON slice values are rejected before publication
- **WHEN** a key default, direct slice write, append row, restored snapshot or `set_state_slice` effect contains `Map`, `Set`, `Date`, a custom instance, a cycle, a sparse array, `undefined`, a function, a symbol, a bigint or a non-finite number
- **THEN** the operation SHALL reject the value with a useful error before publishing a new store or world, rather than silently changing or dropping it during serialization

#### Scenario: Known slice schema validates writes and restores
- **WHEN** a slice key supplies a schema and receives a valid JSON value on definition, write or restore
- **THEN** the stored value SHALL satisfy the schema without transformation, and a schema-invalid value or a schema that changes the value SHALL be rejected without changing the previous store or a coordinator world being loaded

#### Scenario: Validation and migration callbacks cannot freeze caller-owned output
- **WHEN** a schema or migration callback returns an object also retained by its caller
- **THEN** successful storage SHALL validate and freeze a private copy, leaving the caller-owned object mutable; a value-changing schema callback SHALL be rejected

#### Scenario: Versioned slice survives save and load through the consumer
- **WHEN** a registered versioned slice is written, a coordinator saves its world through `SaveSlotRepositoryPort`, and another coordinator loads that slot
- **THEN** the loaded world's slice SHALL have the same validated value and version, and the saved JSON SHALL contain enough version information to restore it without changing unrelated world state

#### Scenario: Older unversioned slice migrates once on load
- **WHEN** an existing save contains an unversioned plain-JSON slice and the registered key now declares a newer version with a migration function
- **THEN** the coordinator load SHALL treat the unversioned value as version 1, apply the migration exactly once before state publication, validate the result, and expose the migrated frozen value through the loaded world

#### Scenario: Historical version-one save needs no migration
- **WHEN** a historical save has no version map and its registered key is still version 1
- **THEN** loading SHALL preserve its exact slice value without invoking migration, and a later save SHALL preserve the value

#### Scenario: Repeated save and load does not transform a slice
- **WHEN** a valid versioned slice with a validation-only schema is saved and loaded twice through coordinator and repository consumers
- **THEN** its value and version SHALL remain identical after each cycle

#### Scenario: Unknown slice and version survive an intermediate coordinator
- **WHEN** a version-3 slice is saved, loaded and saved by a coordinator that does not register its key, then loaded by a coordinator that does register that version-3 key
- **THEN** its plain-JSON value and version SHALL survive unchanged, and no version-1 migration SHALL run

#### Scenario: Version map omissions and malformed metadata
- **WHEN** a saved version map omits a version-1 slice, or contains a non-integer, orphaned or otherwise malformed version entry
- **THEN** omission SHALL mean version 1, while malformed metadata SHALL reject the load before publication and report the affected slice or map field

#### Scenario: Malformed custom-slice container rejects load
- **WHEN** a save contains a present custom-slice container that is `null`, a primitive or an array instead of a plain record
- **THEN** coordinator loading SHALL reject it before publication rather than replacing it with an empty store, preserve its prior world and RNG state, and allow a successful retry after the slot is corrected

#### Scenario: Unsupported or failed migration leaves the current world intact
- **WHEN** a saved known slice has a future version, needs a missing migration, produces an invalid or non-JSON migration result, or its migration throws
- **THEN** coordinator loading SHALL fail before publishing the loaded world, preserving its prior world, RNG and slice values and reporting the slice identifier and version problem; a corrected slot SHALL load successfully
