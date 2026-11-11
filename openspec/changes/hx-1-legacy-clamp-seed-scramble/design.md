# Design

## Context

See [proposal.md](proposal.md). `applyLegacyToCharacterBlueprints` currently checks the final drive after ordered mutations and throws outside `[0, 1]`. `SimulationCoordinator` calls it during construction and `loadFromSlot`; the coordinator already owns `SessionTelemetryPort` and exposes both the resolved character blueprints and initial world entities. `SeededRandom` currently converts fresh seeds to uint32 before Xorshift32; `fromState` reuses the public constructor, so changing that constructor without a raw-state path would break saved RNG continuation. The two changed contracts are in the accompanying MODIFIED deltas.

## Goals / Non-Goals

**Goals:** Keep legacy arithmetic and validation pure in domain; make runtime drive saturation observable at the coordinator consumer; pin a one-time seed mixer without changing save envelopes; keep each implementation task inside the project file cap.

**Non-Goals:** Clamp inertia weights above `1` (their schema only requires nonnegative values), tolerate non-finite arithmetic, change mutation order, validate `sourceScarId` membership, accumulate mutations across epochs, move RNG into `WorldState`, or wire browser telemetry to disk.

## Decisions

### Separate runtime resolution from strict authoring validation

Keep `applyLegacyToCharacterBlueprints` as the strict authoring path, backed by a shared pure mutation engine. Add a domain runtime resolver that returns `{ characters, clampNotes }` with no telemetry dependency. It applies all mutations in their existing order, then clamps each **finite final drive** below `0` or above `1` once per affected character and drive. A later explicit `clamp` that restores a finite final value to range creates no note. Check finiteness after **each** arithmetic operation, for drives and inertia weights, so an overflow cannot be hidden by a later clamp or override. Preserve strict errors for duplicate overrides, unknown targets, malformed clamp intervals and negative final inertia weights. The domain result contains lineage ID, character ID, drive key, unclamped final value and clamped value in deterministic iteration order; frozen inputs stay untouched.

The alternative is an optional callback inside the domain mutator. Returning diagnostics as data keeps the domain function pure, makes notes directly testable, and avoids importing a telemetry adapter or clock. Another alternative is to make the existing API clamp by default, but that would erase its authoring-time contract test.

### Record notes at the actual application consumer

`SimulationCoordinator` uses the runtime resolver in its constructor before `buildInitialEntities`, and again in `loadFromSlot` before publishing restored fields. It retains the latest immutable notes through `getLegacyClampNotes()` and records one `warn` event per clamp through its injected `SessionTelemetryPort` with action `legacy_drive_clamped` and structured `inputs`. Each event names the lineage, character, drive, original and clamped values, plus `resolutionPhase: 'startup' | 'load'`; a load event also names `slotId` and says it resolved a blueprint, not that it rewrote a saved entity. Startup notes use the new epoch ID and tick `0`; load notes use the restored epoch and tick. The coordinator's `getResolvedCharacters()`, initial `WorldState.entities`, `getLegacyClampNotes()`, and healthy-port `telemetry.query()` are the observable consumers. A load retains the saved world snapshot; resolving its legacy blueprints must not rewrite that snapshot. Tests use the in-memory port and repository; no browser disk logger is implied.

The alternative is recording a warning from `CivilizationLegacyState`, which would put an output port and clock in the domain. The warning is infrequent, only on epoch start/load, so this adds no per-frame work. An invalid mutation rejects before publishing partially resolved characters or a partially loaded state. A failed clamp-warning `record()` call is caught independently for each note; the valid clamp and load still complete, and `getLegacyClampNotes()` retains the diagnostic. A failed required `load_slot` information record remains a load failure: prepare the entire next state and diagnostics locally, attempt that record **before** assigning coordinator fields, and leave the old world, RNG, inherited legacy, resolved characters and notes intact if it throws. After publication, attempt clamp warnings individually. This confines the new warning failure without silently losing its in-memory diagnostic and gives the existing load record an atomic failure boundary.

### Mix only fresh seeds, never serialized state

Use a one-shot 32-bit `splitmix32` step for a new `SeededRandom(seed)`: normalize the validated integer to uint32, compute `z = (seed + 0x9e3779b9) >>> 0`, then `z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)`, `z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)`, and return `(z ^ (z >>> 16)) >>> 0`. Reuse the existing non-zero Xorshift fallback if the mixed word is zero. The checked initial-state vectors for seeds `0`, `1`, `2`, `42` are `0x92ca2f0e`, `0x96a0f96b`, `0xb4421bbb`, `0x3805ea2c`. Seed `0x61c88647` mixes to zero and must use fallback state `0x6d2b79f5`. Keep integer validation and unsigned normalization behavior, including equivalent wrapped/negative seed words.

`fromState` validates the serialized non-zero uint32 and sets it directly through a private raw-state construction path. `getState`, `nextUint32`, `nextFloat`, `nextInt` and `choose` keep their existing contracts. The alternative is scrambling in the coordinator only; that leaves other fresh `SeededRandom` construction paths using weak adjacent seeds and complicates the API. This change intentionally alters draws for newly started runs, while prior saves continue from their stored raw RNG state exactly. No save-schema migration is needed.

### Scope and evidence

Two runtime layers change: domain (`SeededRandom`, legacy mutator, public barrel) and application (`SimulationCoordinator`). The domain README/AGENTS pair describes the shipped primitive and mutation behavior with its task; the application README/AGENTS pair describes telemetry wiring with its task. The [DESIGN_NOTES.md](../../../DESIGN_NOTES.md) engineering section and status index already place this as planned work; their status changes only when shipped. The Where-facts-live table and dispositions need no new canonical home. The roadmap entry must name both modified specs because the archived legacy SHALL changes.

G1 traces: fresh seed → `SeededRandom` constructor → coordinator RNG → `saveToSlot` raw state → `loadFromSlot`/`fromState` → next draw; legacy state → pure runtime resolver → coordinator constructor/load → world or resolved blueprints, clamp-note getter and `SessionTelemetryPort.query()`. G2 input boundaries remain Zod validation for legacy state and finite-integer validation for seeds. G4 invalid legacy data or failed required load logging must leave a load's prior coordinator state intact; failed clamp-warning storage preserves a usable result and an in-memory note. G3 both paths run at startup/load rather than per frame. G5 owns ledger findings `S3-08-seed`, `S3-14-clamp` and `S3-17-clamp-rng`; related accumulation and source-scar findings keep their later owners.

G6 planned scenario trace (all outcomes **unverified** until apply):

| Delta scenario | Named evidence target |
| --- | --- |
| Legacy: Epoch 2 successor by lineage | `CivilizationLegacyState.test.ts`: ordered lineage mutation and untouched unrelated blueprint |
| Legacy: override or authoring bound rejection | `CivilizationLegacyState.test.ts`: duplicate override and high/low strict throw, input unchanged |
| Legacy: high startup saturation | `SimulationCoordinator.test.ts`: initial entity, resolved blueprint and queryable startup warning |
| Legacy: low load saturation | `SimulationCoordinator.test.ts`: slot readback, resolved blueprint, unchanged saved entity, RNG continuation and load warning |
| Legacy: in-range/no note | `CivilizationLegacyState.test.ts` plus `SimulationCoordinator.test.ts`: boundaries, later explicit clamp, no warning |
| Legacy: invalid mutation containment | `CivilizationLegacyState.test.ts` and `SimulationCoordinator.test.ts`: conflicts, unknown drive/pillar, bad interval, intermediate overflow followed by clamp/override, unchanged world/RNG/legacy/resolved characters on load |
| Legacy: frozen inputs | `CivilizationLegacyState.test.ts`: frozen legacy and blueprint, two same-sign adds, deterministic diagnostic |
| Legacy: failed warning storage | `SimulationCoordinator.test.ts`: first/later warning failure, getter retains notes and valid load completes |
| Legacy: failed load record | `SimulationCoordinator.test.ts`: injected `load_slot` failure, old coordinator fields and notes unchanged, retry succeeds |
| RNG: reproducible sequence | `SeededRandom.test.ts`: 100 repeated mixed draws |
| RNG: state restoration | `SeededRandom.test.ts`: raw `getState`/`fromState` continuation |
| RNG: unseeded randomness ban | existing `layer_boundaries.test.ts` ban assertion, run through `npm run test:arch` |
| RNG: fresh golden vectors | `SeededRandom.test.ts`: seeds 0/1/2/42 exact initial states |
| RNG: normalization/rejection | `SeededRandom.test.ts`: wrapped/negative equivalent words and invalid integers |
| RNG: mixed-zero fallback | `SeededRandom.test.ts`: seed `0x61c88647`, fallback state and subsequent draws |
| RNG: coordinator save/load | `SimulationCoordinator.test.ts`: raw RNG continuation after slot round trip |

## Risks / Trade-offs

- **Fresh-run sequence changes** → Pin golden vectors and verify saved raw-state continuation separately; do not claim existing new-run seeds retain old streams.
- **A runtime clamp hides an authoring error** → Keep the strict public authoring path and emit one structured warning for every actual runtime saturation.
- **A second validation branch diverges** → Share one mutation engine and vary only its final-drive bound policy; test the same ordered mutations under both policies.
- **A successful load contains an older world snapshot** → Confirm the saved world remains unchanged while `getResolvedCharacters()` reflects saturated successor definitions and the warning is queryable.
- **Warning storage is unavailable** → Keep the clamp note in memory and make warning writes best effort; test a failed first and later write independently.
- **A pre-change binary reads a new saturated save** → It can reject the saved legacy mutations; downgrade needs a compatible older save or the runtime clamp code retained.

## Migration Plan

No storage format or external dependency changes. Updated code reads existing save envelopes and restores `rngState` as raw internal state without mixing. Apply code and paired guides in three green tasks, then complete closing review and ledger evidence. Pre-change binaries can reject newly written saves containing saturated legacy mutations; rollback requires a compatible save or retention of the runtime clamp support. New games also intentionally use changed RNG streams.
