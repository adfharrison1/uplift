# Design

## Context

See [proposal.md](proposal.md) for motivation and the [state-slice delta](specs/deterministic-simulation-primitives/spec.md) for behavior. `src/domain/core/StateSliceRegistry.ts` currently clones object values on every `get`, `withSlice` and `toSnapshot`; `withSlice` also copies its map. `WorldEffectReducer` creates an ad hoc key for `set_state_slice`. `SimulationCoordinator` saves a raw custom-slice snapshot inside `SaveSlotRepositoryPort.stateSlices` and restores it without a key registry. `createInitialWorldState` currently clones a supplied store through a snapshot. The browser does not yet supply gameplay slices or load disk saves into the launch.

The prerequisite legacy/seed change is archived. The existing save envelope accepts a JSON-shaped `stateSlices` record, and the later save-integrity change owns `WorldStateCodec`, pack identity and world-snapshot migration. This change stays in domain, its current application save/load consumer and tests. No WebGL, model runtime, cloud inference or external API key enters runtime or verification.

## Goals / Non-Goals

**Goals:** Preserve pure, epoch-agnostic state updates while making reads share frozen values; make appending one row independent of the size of an existing collection; validate JSON and known schemas at every applicable boundary; carry slice versions through the actual coordinator save/load path; keep historical unversioned saves loadable.

**Non-Goals:** A generic persistent vector or content registry kind; gameplay `ThreadRuntime`/Act slices; world snapshot codec, pack identity or epoch migration; fixed-step, kinematics or renderer work; a new bridge policy. The existing bridge security and disk tests remain real consumer tests.

## Decisions

### 1. Validate, copy and freeze at the domain boundary

The public `StateSliceStore` constructor accepts no raw entries; an internal trusted factory assembles entries that have already crossed a boundary. `defineStateSlice`, `withSlice`, append and `fromSnapshot` traverse inputs before publication. The guard accepts only null, booleans, strings, finite numbers, dense arrays and plain objects with string keys. It rejects special prototypes (`Map`, `Set`, `Date` and custom classes), functions, symbols, bigint, `undefined`, sparse arrays, cycles and unsafe keys. It checks nested members even if the caller shallow-froze an ancestor. The store copies accepted caller data before invoking callbacks. A key schema is **validation-only**: parse a second private copy, require its result to be JSON-equivalent to the candidate, discard the callback's output, then deeply freeze the candidate. Coercions or transforms that change data are rejected; intentional conversions belong in `migrate`. Migration output is separately copied, JSON-checked, schema-validated and frozen, so a callback cannot freeze an externally retained object. `get` returns the frozen reference; `toSnapshot` makes a separate deterministic JSON tree. Invalid data throws with the slice id and path; neither the input nor a prior store is changed.

This replaces `structuredClone` on every read. `JSON.stringify`/`parse` was rejected as a validator because it silently drops or rewrites unsupported values. Freezing the caller's object was rejected because it would mutate caller ownership. Accepting caller-supplied constructor maps was rejected because it bypasses both the JSON guard and shared-read immutability.

### 2. Provide an explicit append path for growing arrays

`StateSliceStore.appendSlice(key, row)` stores a frozen row in a persistent append node that points to the previous collection entry. It creates a new store and leaves earlier stores intact. The append does not traverse or copy old rows; its work is proportional to the new row and the number of distinct slice keys copied by the current map representation. Iterative materialization flattens nodes into an ordered frozen array for `get` and into a fresh JSON array for `toSnapshot`; a per-store cache makes repeated `get` return one reference. `withSlice` replaces an entire value and `updateSlice` remains a general full-value transform, with no constant-time claim.

An appendable collection may declare an optional validation-only row schema for constant-time validation of the new row. A key with an arbitrary whole-array schema cannot use the fast append path unless its validation is also expressible per row; that combination is rejected before a new store exists, and the caller can use `withSlice` instead. Base arrays are validated once when written or restored. A 5,000-row fixture checks old/new store values and shared row identity; source-level complexity review and recorded host timings check that append does not traverse old rows, without a wall-clock assertion. A flat-array copy was rejected because it leaves the reported size-dependent frame cost in place. A new persistent-collection dependency was rejected for this one domain primitive.

### 3. Keep version metadata separate from raw slice values

`StateSliceKey<T>` gains optional `schema`, positive integer `version` (default 1) and `migrate(value, fromVersion)` contracts. `StateSliceRegistry` exposes key lookup. `StateSliceStore` records a version with each value and accepts an optional registry for known-key validation. The coordinator accepts an optional state-slice registry, passes it to its initial and restored stores, and uses it to validate known keys. `set_state_slice` still goes through the store's JSON/schema boundary even though the reducer supplies an ad hoc descriptor. Unknown keys remain intact as plain JSON until pack identity is specified by the later change; they are never silently dropped.

`toSnapshot()` keeps the existing raw `id -> value` shape. A separate version map is saved under a new coordinator-owned key beside `__upliftCustomSlicesSnapshot` in the current save envelope; it does not occupy a user slice id. `fromSnapshot` accepts the value record and optional version map/registry. A missing map or omitted id means historical version 1; entries must be positive integers for present value ids, so orphaned, non-integer and malformed entries fail. Unknown slice ids retain both their JSON value and version through an intermediate coordinator save, without a version-1 migration. For a known older version, run that key's migration once to its declared current version, then validate and freeze; reject a future version, absent migration, throw or invalid result before coordinator state publication. A present custom-slice container must be a plain record: `null`, primitives and arrays are rejected rather than converted to `{}`; only a genuinely absent historical container may be empty. `createInitialWorldState` retains a supplied immutable store directly instead of serializing it and losing its versions. The current `SaveSlotRepositoryPort` shape can carry the extra coordinator key, so the world codec remains with `hx-save-integrity`.

Wrapping every slice value in a tagged object was rejected because old user values could resemble the wrapper and direct snapshot consumers expect raw values. Version metadata without a real coordinator consumer was rejected because it would leave the accepted defect in place.

### 4. Use test builders without erasing real consumers

`tests/support/makeRegistry.ts` builds a small synthetic, valid epoch registry and replaces the local builder in the coordinator test monolith named by `S4-13`; `makeWorldState.ts` builds a valid headless world with explicit overrides; `makeStageBlueprint.ts` builds application presentation data and stays out of domain. Tests adopt builders where a suite is touched, splitting only touched monolithic files into coherent groups. The real loopback bridge suite retains host/origin/token checks and actual disk readback. It uses the stage builder for synthetic assets and adds a version-map save PUT/GET readback; coordinator tests then consume that saved shape through their actual save repository. The existing proving-pack HTTP path remains to catch wiring errors.

### Consumer, trust and cost trace

| Axis | Planned proof |
| --- | --- |
| G1 | `set_state_slice`/typed key → reducer/store → world → coordinator save → `SaveSlotRepositoryPort` JSON → coordinator load with registered key → `WorldState.stateSlices.get()` result; bridge tests end at HTTP and disk readback. A unit-only key parser is insufficient. |
| G2 | Direct values, effects and saved JSON are untrusted at the slice boundary. JSON guard, schema, version map and migration result validation reject malformed data; browser bridge authorization remains in its existing HTTP suite. |
| G3 | `get` is allocation-free after materialization, append does not touch prior rows, and `toSnapshot` is O(rows) off the frame path. Record host 5,000-row append/read/snapshot measurements and memory notes; the reference Mac and 60 FPS effect remain unmeasured until measured there. |
| G4 | An invalid write leaves the old store usable. A malformed present container, version map, known slice or migration fails before `load_slot` publication; the coordinator retains prior world, RNG, legacy and resolved state and can retry after a corrected slot. |

### G6 scenario evidence plan

These are planned assertions, not implementation results. Task 6.1 binds each to its final test name and observed result after the suite splits.

| Delta scenario | Planned named test consumer |
| --- | --- |
| Default value fallback | `StateSliceRegistry.test.ts`: same deeply frozen default reference; original input mutation has no effect. |
| Immutable update and retrieval | `StateSliceRegistry.test.ts`: stable new reference, frozen nested value, unchanged prior store and input. |
| Duplicate key collision | `StateSliceRegistry.test.ts`: second id registration throws. |
| Raw-entry construction | `StateSliceRegistry.test.ts`: public map argument rejected even via runtime construction. |
| Growing collection append | `StateSliceRegistry.test.ts`: 5,000-row fixture, ordered old/new reads, shared old rows, measured append/read/snapshot. |
| Row schema and whole-array restriction | `StateSliceRegistry.test.ts`: valid row, invalid row and unsupported whole-array key leave prior store intact. |
| Frozen nested values | `StateSliceRegistry.test.ts`: shallow-frozen root with mutable descendants becomes fully frozen private copy. |
| Non-JSON rejection | `StateSliceRegistry.test.ts` and `WorldEffectReducer.test.ts`: listed invalid values on default/write/append/restore/effect. |
| Known schema validation | `StateSliceRegistry.test.ts` and split `SimulationCoordinator` save/load suite: valid input, invalid input and value-changing schema. |
| Callback ownership | `StateSliceRegistry.test.ts` and split coordinator save/load suite: externally retained schema/migration output stays mutable. |
| Versioned save/load | Split coordinator save/load suite plus `FileSaveSlotRepository.test.ts`: persisted sidecar and loaded world read. |
| Older unversioned migration | Split coordinator save/load suite: one migration call from version 1, valid frozen result. |
| Historical version-one save | Split coordinator save/load suite: absent sidecar, no migration, exact readback. |
| Repeated save/load | Split coordinator save/load suite: two save/load cycles preserve value and version. |
| Unknown slice/version | Split coordinator save/load suite: version 3 passes through an unregistered coordinator without migration. |
| Version-map omissions/malformed metadata | Split coordinator save/load suite: omitted version 1, non-integer and orphaned entries. |
| Malformed custom-slice container | Split coordinator save/load suite: present `null`, primitive and array rejected; prior world/RNG and retry. |
| Unsupported/failed migration | Split coordinator save/load suite: future/missing/throwing/invalid migration cases and successful retry. |

## Risks / Trade-offs

- **Frozen shared reads break code that mutates a returned object** → search all `get` callers, update them to immutable transforms, and test identity plus attempted nested mutation. The current source has no gameplay slice reader.
- **A full read after many appends remains linear** → expose the append path to writers, cache materialization per immutable store, and measure read/snapshot separately. Do not claim that arbitrary `updateSlice` is O(1).
- **Schema transforms or migration may produce non-JSON data** → reject value-changing schema output, ignore validation callback output, and validate/copy migration output before freezing or publishing. Repeat save/load tests guard against transform drift.
- **Version-map or registry mismatch can reject a historical save** → treat absent metadata and omitted version-1 ids as version 1, preserve unknown JSON keys and versions, test old/new/future/invalid versions and rollback, and retain exact serialized values for inspection.
- **Test refactors may lose coverage** → compare named assertions and real HTTP consumers before/after each split; keep all authorization and storage failure cases. No fixture-only test replaces a real network check.

## Migration Plan

Ship key/store and focused tests first, then integrate the coordinator save/load sidecar and migrate the touched test suites. Existing save files lack the sidecar and load as version 1. A future versioned write adds the sidecar without rewriting old saves; a bad migration leaves the current session unchanged. Rollback to an older executable does not understand versioned slices, so versioned saved slots should be retained as data rather than overwritten during rollback. The later codec change can incorporate the same version map without changing the slice contract.

After implementation, update both domain and test section README/AGENTS guides, and the application pair for coordinator behavior. Reconcile the Engineering status index, State/saves, Tests/builders and the separate Core model bounded-storage prerequisite under Seven primitives in `DESIGN_NOTES.md`, retaining its Tier-2/Tier-3 and epoch-compaction commitments. Do not delete later planned work or unresolved inbox text. Preserve the existing reduced-motion assertions during the `PlaySession` test split. The roadmap row remains the ordered owner until checked archive finalization. Document moves/cuts require a no-loss map and independent fidelity/coherence reviews; ordinary status edits still receive the document-integrity checks.
