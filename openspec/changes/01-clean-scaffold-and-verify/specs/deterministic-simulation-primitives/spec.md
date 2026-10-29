## Purpose

Provide deterministic pseudo-random number generation (`SeededRandom`) and type-safe modular state slices (`StateSliceKey<T>` and `StateSliceStore`) for the simulation domain.

## ADDED Requirements

### Requirement: Seeded deterministic pseudo-random number generator
The domain layer SHALL provide a `SeededRandom` generator (Xorshift32) and SHALL forbid raw `Math.random()` and `Date.now()` inside `src/domain/` and `src/content/`.

#### Scenario: Reproducible sequence from identical seed
- **WHEN** two `SeededRandom` instances are initialized with the same numeric seed and called for 100 values (`nextFloat()`, `nextInt()`, `choose()`)
- **THEN** both instances SHALL produce identical sequences of values and identical final internal seed states

#### Scenario: State serialization and restoration
- **WHEN** `getState()` is captured from a `SeededRandom` instance after $N$ draws and used to initialize a new `SeededRandom` instance
- **THEN** subsequent draws from both instances SHALL be identical

#### Scenario: Ban on unseeded randomness in domain and content
- **WHEN** any `.ts` file in `src/domain/` or `src/content/` calls `Math.random()` or `Date.now()`
- **THEN** `npm run test:arch` SHALL fail and report the offending file

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
