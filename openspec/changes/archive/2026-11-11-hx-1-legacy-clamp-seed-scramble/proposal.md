# Proposal

## Why

Two valid legacy drive mutations can push a successor's drive outside `[0, 1]` and abort epoch initialization or save loading. Adjacent numeric world seeds also enter Xorshift32 without a mixing step. This M1 hardening work makes runtime handoff tolerant of saturated drives and pins seed initialization with golden vectors.

## What Changes

- Clamp finite runtime legacy drive results to `[0, 1]` after ordered mutation application, and emit a structured warning through the coordinator's telemetry port when saturation occurs. Retain the diagnostic in memory if warning storage fails. Keep strict authoring validation for out-of-range results, conflicting overrides, unknown targets and malformed inputs.
- **BREAKING (fresh-run sequences):** Pass fresh numeric seeds through `splitmix32` before Xorshift32 initialization. Preserve exact serialized RNG-state restoration, including save/load continuation, by bypassing the fresh-seed scramble on `fromState`.
- Add frozen-input and golden-vector tests, including the coordinator's telemetry and save/load consumers; update the domain guides when behavior ships.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dual-ledger-civilization-legacy`: distinguish runtime drive saturation and telemetry from strict authoring rejection while preserving ordered lineage mutations and input immutability.
- `deterministic-simulation-primitives`: mix fresh RNG seeds deterministically and preserve serialized-state restoration.

## Impact

The affected path is `CivilizationLegacyState` → `SimulationCoordinator` epoch initialization/load → resolved character drives and `SessionTelemetryPort`, plus fresh `SeededRandom` construction and save-state restoration. This depends on the archived operational-safety work. The change remains epoch-agnostic, local and offline, with no external API keys or cloud inference in runtime or tests.

Existing save formats remain readable by the updated code. A pre-change binary can reject a new save containing saturated legacy mutations; downgrade compatibility is not guaranteed.

**Non-goals:** lineage mutation accumulation across epochs, `sourceScarId` membership validation, stateless keyed rolls, fixed-step timing, new content, and browser-to-disk telemetry wiring. Those remain in their later roadmap entries.
