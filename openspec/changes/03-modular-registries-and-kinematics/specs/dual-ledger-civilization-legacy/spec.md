## Purpose

Provide the Dual-Ledger `CivilizationLegacyState` (**Material Scars** vs. **Veil Scars**) and deterministic `lineageId` successor mutations so choices and dysfunctions in one historical Epoch flow into the next Epoch.

## ADDED Requirements

### Requirement: Dual-ledger civilization legacy state
The domain layer SHALL maintain a `CivilizationLegacyState` with two distinct scar ledgers—**Material Scars** (economic, institutional, and communications-backbone structures) and **Veil Scars** (miracle-dependent faith, doctrinal rifts, anachronistic relics, and rival alien footprints)—so that material progress and epistemic/covert contamination are tracked independently across Epochs.

#### Scenario: Recording material and veil scars independently
- **WHEN** an Epoch records a material scar (`material_scar_alpha`) and a veil scar (`veil_scar_alpha`)
- **THEN** `CivilizationLegacyState` SHALL store both scars in their respective ledgers without collapsing them into a single scalar score and SHALL round-trip cleanly through `SaveSlotEnvelope.legacyState`

### Requirement: Deterministic lineage successor mutations and bounds validation across Epochs
The legacy mutator SHALL apply ordered, composable `LineageMutation` rules (`add`, `multiply`, `clamp`, `override`) to character successor blueprints matching a `lineageId` when initializing a new Epoch, rejecting conflicting `override` mutations on the same target or final drive values that fall outside `[0, 1]`.

#### Scenario: Mutating an Epoch 2 successor character blueprint by lineageId
- **WHEN** `applyLegacyToCharacterBlueprints` is called with successor character blueprints and a `CivilizationLegacyState` containing valid mutations for `lineageId: 'lineage_alpha'`
- **THEN** the matching successor blueprint's drives and starting inertia pillars SHALL be deterministically transformed while leaving unrelated lineages (`lineage_beta`) unchanged

#### Scenario: Conflicting override mutations or out-of-bounds drive results rejected
- **WHEN** two legacy scars attempt to apply `override` mutations to the same target on `lineage_alpha`, or an un-clamped mutation leaves a drive outside `[0, 1]`
- **THEN** `applyLegacyToCharacterBlueprints` SHALL throw a descriptive error without mutating the input blueprints
