# Proposal

## Why

`StateSliceStore` deep-clones a slice on every read and write, making an append to a large collection expensive enough to consume a frame. Slice values also lack schema and version checks, so values such as `Map` and `Set` can lose data when a save is serialized. This M1 hardening step follows the archived legacy/seed work and prepares the state contract before the save codec and later gameplay slices depend on it.

## What Changes

- Freeze validated plain-JSON slice values on write and share immutable values on read. Provide an append path whose cost does not grow with the number of existing rows in a slice; materializing a full read or save snapshot may still scale with that number.
- Give `StateSliceKey<T>` optional validation-only schema, per-row validation for appendable collections, version and migration behavior. Validate known values on write and restore, preserve existing unversioned saves and unknown-slice versions, and reject unsupported or lossy values rather than silently changing them.
- Add reusable `makeRegistry`, `makeWorldState` and `makeStageBlueprint` test builders under `tests/support`; adopt them in touched suites, including the coordinator suite named by the accepted test-fixture finding, and split the monolithic tests that this change edits. Refactor and extend existing bridge tests while preserving their real HTTP authorization and persistence consumers.
- Carry the outstanding S3-17 test acceptance lines to their later owners: this change verifies frozen and JSON slice behavior; catch-up caps, mid-hop movement and equivalent `dt` splits stay with the changes that implement those fixes.
- **BREAKING:** callers that mutate an object returned by `StateSliceStore.get()` must use immutable updates. Reads will return a shared frozen value.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deterministic-simulation-primitives`: strengthen the existing state-slice requirement with immutable shared reads, append behavior, plain-JSON validation and version-aware restore/migration scenarios.

## Impact

The domain slice key, registry and store, their actual reducer and coordinator save/load consumers, and paired domain/test guides are affected. Test support and selected domain, application and bridge suites change without adding gameplay, a new registry kind, a save codec, pack identity, fixed-step simulation or cloud inference. Runtime and tests continue to require zero external API keys.

The prerequisite `hx-1-legacy-clamp-seed-scramble` is archived. The next save-integrity change remains the owner of `WorldStateCodec` and pack checks; movement and fixed-step changes retain their own S3-17 acceptance tests. Design-note status, roadmap ownership, dispositions and the unresolved inbox remain unchanged by this planning proposal.
