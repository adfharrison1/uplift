# Agent Guide — Domain Layer (`src/domain/`)

## Strict Guardrails

Verification enforces structural boundaries and exercises behavior; it does not prove every immutability or simulation invariant. The rules below remain requirements when known defects await hardening.

1. **Zero Outward Imports**: Never import from `application`, `infrastructure`, `interfaces`, `content`, `three`, or `@huggingface/transformers`. Pure schema validation via `zod` (`z.object`, `z.infer`) is permitted for domain data contracts.
2. **Zero Era-Specific Hardcoding**: Keep all schemas, registries, reducers, and kinematics inside `src/domain/` 100% epoch-agnostic. Never hardcode specific Era 1 feudal character names, spaces, or factions here—author those in `src/content/` and register them via `EpochModuleRegistry`.
3. **Zero DOM / WebGL Globals**: Never reference `window`, `document`, `HTMLCanvasElement`, or `WebGLRenderingContext`.
4. **Deterministic Execution Only**: `Math.random()`, `Date.now()`, `performance.now()`, and `new Date()` are strictly banned (enforced by both ESLint `no-restricted-syntax` and `tests/architecture/layer_boundaries.test.ts`). Accept an injected `SeededRandom` for randomness; telemetry timestamps come through `TelemetryClock`. Domain code must not construct runtime clocks.
   Fresh `SeededRandom` numeric seeds pass through one `splitmix32` step; `fromState` restores a validated non-zero internal word directly so saved streams continue exactly.
5. **Immutable State & Pure Reducers**: `WorldState`, `applyWorldEffects`, `stepKinematics`, `applyLegacyToCharacterBlueprints`, `resolveRuntimeLegacyCharacterBlueprints`, and `StateSliceStore` updates must return new instances without mutating inputs in place.
   Plain object and array state-slice defaults and writes are private deeply frozen copies; `get` returns a stable frozen reference. Define appendable keys with `defineStateSlice` so their default collection is owned before an append. Use `withSlice`, `updateSlice` or `appendSlice` instead of mutating a read. `appendSlice` copies only the new row and the distinct-key map; full reads, snapshots and general `updateSlice` can traverse the collection. Do not pass raw entries to the store constructor.
   Slice defaults, writes, append rows and restored snapshots must be plain JSON. Reject special objects, cycles, sparse arrays, unsupported primitives, non-finite numbers and unsafe keys. Build private records without inherited properties and arrays with own elements so inherited setters and prototype-named slice ids cannot drop data or skip migration. Key and row schemas validate private copies without transforming values; compare JSON values structurally so inherited serialization hooks cannot hide a transform. A registry-bound unset slice reads the registered default even if a caller supplies a same-id descriptor with a different default; keep the captured validator authority for an existing slice id on reads and writes. A whole-array schema cannot use fast append. Keep failed writes and restores from publishing a new store.
   Give known slices a positive integer `version` and a one-step `migrate(value, fromVersion)` when old values need conversion. Keep `toSnapshot` as raw values and `toVersionMap` separate; missing metadata means version one, unknown slice versions survive round trips, and invalid or future versions fail before publication. Retain a supplied immutable store when creating `WorldState` so its versions are not lost.
6. **Zero `any` & Zod v4 Conventions**: Both implicit and explicit `any` are forbidden. Derive TypeScript types via `z.infer<typeof Schema>` and remember that `z.number()` in Zod v4 is finite by default (do not call deprecated `.finite()`).

## Adding New Domain Primitives or Contracts

1. Place core primitives in `src/domain/core/` and module contracts/ports in dedicated subdirectories (`src/domain/telemetry/`, `src/domain/persistence/`, `src/domain/registries/`, `src/domain/simulation/`, `src/domain/legacy/`).
2. Re-export public types, schemas, functions, and classes from `src/domain/index.ts`.
3. Add matching deterministic unit tests in `tests/unit/domain/<ModuleName>.test.ts` covering both normal gameplay pacing (`DEFAULT_GAMEPLAY_PACING_CONFIG`) and fast evaluation pacing (`FAST_EVAL_PACING_CONFIG`) where applicable.
4. Update both `src/domain/README.md` and `src/domain/AGENTS.md` and run `npm run verify`.

## Registry and reducer status

Preserve the exact schema vocabularies and orbital reducer rules recorded in this section's README. Distinguish data acceptance and callable reducer behavior from a content pack or gameplay consumer; do not remove working reducer contracts when correcting planned-feature claims.

## World snapshot boundary

Use `encodeWorldState` and `decodeWorldStateSnapshot` for serialized world fields, keeping custom slice values and version maps separate. The codec owns a strict version-2 shape, a pure synthetic version-1 marker migration, nested validation, plain-JSON ownership, unsafe-key rejection and equality of inner and outer epoch/tick. It rejects orbital availability above capacity and never trims saved pillar IDs. The coordinator calls the codec on save/load and publishes a restored world only after the remaining state and required load telemetry pass validation. `validateEntityId` is exported for the shared render token rule but is not yet enforced by registration or snapshot decoding.

## Legacy mutation policy

Keep the strict authoring mutator and pure runtime resolver on one ordered mutation path. Reject conflicting overrides, unknown targets, malformed intervals and non-finite arithmetic at each step, even if a later mutation could mask the error. Only the runtime resolver saturates finite final drives to `[0, 1]`; return deterministic notes as data, with no telemetry dependency in domain. Preserve frozen inputs and unrelated blueprints.

## Waypoint steering

- `neighborWaypointIds` are optional same-space ids. A listed neighbor is an undirected edge even when only one side declares it. A space with no non-empty neighbor list uses one declaration-order chain. A space with any explicit neighbor uses only those edges, and registration rejects a waypoint whose undirected degree is `0`.
- Portal target ids are both present or both absent. Either target requires `portalState`. `portalState` alone adds no graph edge. `open` and `ajar` are the passable states, and that edge is undirected.
- `planWaypointPath` omits the start and includes the destination. A duplicated waypoint id adds no chain or portal edge. `truncatePathAtClosedPortals` is pure, and its first hop is the entity's current `waypointId`. `SimulationCoordinator` calls it once on an unpaused frame with `dtSeconds > 0`, before kinematics.
- `separationWeight` is `0..1`. Omitted means `1`. Weight `0` does not slide. This is not a flocking or crowd solver. Change weight with `set_separation_weight`, not by editing the integrator.
