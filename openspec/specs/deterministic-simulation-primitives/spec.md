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
The domain layer SHALL provide a `StateSliceKey<T>` descriptor and immutable-friendly `StateSliceStore` so plug-and-play content modules can read and update custom state without untyped maps.

#### Scenario: Default value fallback when slice is unset
- **WHEN** a module defines a `StateSliceKey<T>` with a default value and reads it from an empty `StateSliceStore`
- **THEN** the store SHALL return a clone/value matching the declared default of type `T`

#### Scenario: Immutable update and retrieval of a typed state slice
- **WHEN** a module updates a `StateSliceKey<T>` on a `StateSliceStore` via `withSlice(key, newValue)`
- **THEN** the returned `StateSliceStore` SHALL reflect `newValue` for `key` while leaving the previous `StateSliceStore` instance unmodified

#### Scenario: Duplicate slice key collision rejection in registry
- **WHEN** two distinct state slice definitions attempt to register the same string identifier in a `StateSliceRegistry`
- **THEN** the registry SHALL throw a descriptive duplicate-key error
