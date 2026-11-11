# dual-ledger-civilization-legacy Specification

## Purpose
Provide the Dual-Ledger `CivilizationLegacyState` (**Material Scars** vs. **Veil Scars**) and deterministic `lineageId` successor mutations so choices and dysfunctions in one historical Epoch flow into the next Epoch.

## Requirements

### Requirement: Dual-ledger civilization legacy state
The domain layer SHALL maintain a `CivilizationLegacyState` with two distinct scar ledgers—**Material Scars** (economic, institutional, and communications-backbone structures) and **Veil Scars** (miracle-dependent faith, doctrinal rifts, anachronistic relics, and rival alien footprints)—so that material progress and epistemic/covert contamination are tracked independently across Epochs.

#### Scenario: Recording material and veil scars independently
- **WHEN** an Epoch records a material scar (`material_scar_alpha`) and a veil scar (`veil_scar_alpha`)
- **THEN** `CivilizationLegacyState` SHALL store both scars in their respective ledgers without collapsing them into a single scalar score and SHALL round-trip cleanly through `SaveSlotEnvelope.legacyState`

### Requirement: Deterministic lineage successor mutations and bounds validation across Epochs
The legacy mutator SHALL apply ordered, composable `LineageMutation` rules (`add`, `multiply`, `clamp`, `override`) to successor blueprints matching a `lineageId`. Runtime epoch initialization and save loading SHALL saturate finite final drive values to `[0, 1]` and report each saturation; strict authoring validation SHALL reject out-of-range drive values.

#### Scenario: Mutating an Epoch 2 successor character blueprint by lineageId
- **WHEN** `applyLegacyToCharacterBlueprints` is called with successor character blueprints and a `CivilizationLegacyState` containing valid mutations for `lineageId: 'lineage_alpha'`
- **THEN** the matching successor blueprint's drives and starting inertia pillars SHALL be deterministically transformed while leaving unrelated lineages (`lineage_beta`) unchanged

#### Scenario: Conflicting override mutations or out-of-bounds drive results rejected
- **WHEN** two legacy scars attempt to apply `override` mutations to the same target on `lineage_alpha`, or strict authoring validation finds a final drive outside `[0, 1]`
- **THEN** strict authoring validation SHALL throw a descriptive error without mutating the input blueprints; conflicting overrides SHALL remain invalid for runtime resolution as well

#### Scenario: Runtime epoch initialization saturates a high drive and reports it
- **WHEN** an epoch starts with a valid `CivilizationLegacyState` whose ordered finite drive mutations yield a final value above `1` for a registered successor lineage
- **THEN** the successor's resolved blueprint and initial world entity SHALL contain drive value `1`, startup SHALL complete, and a healthy coordinator `SessionTelemetryPort` SHALL contain a `warn` note identifying the lineage, character, drive, original final value, clamped value and `startup` resolution phase

#### Scenario: Runtime loading saturates a low drive and preserves the saved world
- **WHEN** `loadFromSlot` restores a valid legacy state whose ordered finite drive mutations yield a final value below `0`
- **THEN** loading SHALL complete, `getResolvedCharacters()` SHALL contain drive value `0`, the saved `WorldState` snapshot and RNG continuation SHALL be restored, and a healthy coordinator telemetry port SHALL contain a `warn` note identifying `load` resolution phase and slot ID; the note SHALL describe a resolved blueprint, not a mutation of the saved entity

#### Scenario: Runtime values already in range need no saturation note
- **WHEN** every intermediate drive arithmetic result is finite and ordered mutations yield a final value inside `[0, 1]`, including either boundary or a later explicit `clamp` that brings a finite value into range
- **THEN** runtime resolution SHALL preserve that final value and SHALL NOT emit a saturation note

#### Scenario: Invalid mutations remain errors without partial runtime state
- **WHEN** runtime resolution encounters a conflicting override, unknown drive or pillar target, invalid clamp interval, or non-finite result at any arithmetic step, even if a later operation could restore a finite result
- **THEN** it SHALL reject the invalid mutation before publishing partial successor blueprints or a partially loaded world; the input legacy and character blueprints SHALL remain unchanged

#### Scenario: Frozen inputs remain unchanged after runtime saturation
- **WHEN** runtime resolution applies two same-sign drive mutations to frozen legacy and character inputs and saturates the final value
- **THEN** it SHALL produce new resolved data and diagnostics deterministically without mutating either frozen input

#### Scenario: Clamp warning storage failure retains a usable result
- **WHEN** a valid runtime clamp occurs but the telemetry port throws while recording its `legacy_drive_clamped` warning
- **THEN** construction or loading SHALL still complete with the saturated result, `getLegacyClampNotes()` SHALL expose the diagnostic, and a later warning SHALL still be attempted independently

#### Scenario: Load record failure preserves the prior coordinator state
- **WHEN** a valid slot is prepared but telemetry rejects the required `load_slot` record before publication
- **THEN** `loadFromSlot` SHALL fail without changing the prior world, RNG state, inherited legacy, resolved characters or clamp notes; a retry after telemetry recovers SHALL succeed
