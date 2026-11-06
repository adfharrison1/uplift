import { describe, expect, it } from 'vitest';
import {
  applyLegacyToCharacterBlueprints,
  type CharacterBlueprint,
  civilizationLegacyFromRecordedScars,
  createCivilizationLegacyState,
  legacyStateToRecord,
  parseLegacyState,
  recordScarInLegacyState,
  SAVE_SLOT_SCHEMA_VERSION,
  SaveSlotEnvelopeSchema,
} from '../../../src/domain/index.js';

function makeBlueprint(
  id: string,
  lineageId: string,
  overrides: Partial<CharacterBlueprint> = {},
): CharacterBlueprint {
  return {
    id,
    name: `Character ${id}`,
    lineageId,
    tier: 'utility_schemer',
    startingSpaceId: 'space_alpha',
    startingWaypointId: 'wp_alpha_1',
    walkSpeedMetersPerSec: 1.4,
    yawSpeedRadiansPerSec: 6.0,
    listenerThreshold: 0.2,
    drives: { curiosity: 0.6, secrecy: 0.5 },
    emergencyVice: 'secrecy',
    inertiaPillars: [
      { id: 'pillar_doc', kind: 'doctrine', weight: 0.5 },
      { id: 'pillar_debt', kind: 'debt', weight: 0.3 },
    ],
    ...overrides,
  };
}

describe('Dual-Ledger CivilizationLegacyState and applyLegacyToCharacterBlueprints', () => {
  it('records Material Scars and Veil Scars in separate ledgers, deduplicates across ledgers, and round-trips through SaveSlotEnvelopeSchema', () => {
    const initial = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [
        {
          scarId: 'material_scar_alpha',
          ledger: 'material',
          description: 'Cooperative gorge charter established',
          originEpochId: 'epoch_1',
        },
      ],
      veilScars: [],
      communicationsBackboneControllerId: 'inst_guild_charter',
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'material_scar_alpha',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.1,
        },
      ],
    });

    const withVeil = recordScarInLegacyState(initial, {
      scarId: 'veil_scar_alpha',
      ledger: 'veil',
      description: 'Open-inquiry martyrdom doctrinal rift',
      originEpochId: 'epoch_1',
    });

    // Idempotent duplicate across same or opposite ledger
    const duplicateSame = recordScarInLegacyState(withVeil, {
      scarId: 'veil_scar_alpha',
      ledger: 'veil',
      description: 'Duplicate veil scar',
      originEpochId: 'epoch_1',
    });
    expect(duplicateSame).toBe(withVeil);

    const duplicateCross = recordScarInLegacyState(withVeil, {
      scarId: 'material_scar_alpha',
      ledger: 'veil',
      description: 'Cross-ledger duplicate scarId',
      originEpochId: 'epoch_1',
    });
    expect(duplicateCross).toBe(withVeil);

    expect(withVeil.materialScars).toHaveLength(1);
    expect(withVeil.veilScars).toHaveLength(1);
    expect(withVeil.communicationsBackboneControllerId).toBe('inst_guild_charter');

    const envelope = SaveSlotEnvelopeSchema.parse({
      schemaVersion: SAVE_SLOT_SCHEMA_VERSION,
      slotId: 'slot_epoch1_end',
      label: 'End of Epoch 1',
      savedAtIso: '2026-11-06T21:00:00.000Z',
      epochId: 'epoch_1',
      worldTick: 1800,
      rngState: 123456,
      stateSlices: {},
      legacyState: legacyStateToRecord(withVeil),
    });

    expect(envelope.legacyState).toBeDefined();
    const restored = parseLegacyState(envelope.legacyState ?? {});
    expect(restored).toEqual(withVeil);
  });

  it('converts in-epoch WorldState.recordedLegacyScars into a partitioned CivilizationLegacyState via civilizationLegacyFromRecordedScars', () => {
    const legacy = civilizationLegacyFromRecordedScars({
      sourceEpochId: 'epoch_1',
      recordedScars: [
        {
          scarId: 'scar_mat_1',
          ledger: 'material',
          description: 'Signal tower seized',
          worldTick: 120,
        },
        {
          scarId: 'scar_veil_1',
          ledger: 'veil',
          description: 'Anachronistic lens venerated',
          worldTick: 240,
        },
        {
          scarId: 'scar_mat_1',
          ledger: 'material',
          description: 'Duplicate ignored',
          worldTick: 300,
        },
      ],
      communicationsBackboneControllerId: 'office_censorate',
    });

    expect(legacy.materialScars).toEqual([
      {
        scarId: 'scar_mat_1',
        ledger: 'material',
        description: 'Signal tower seized',
        originEpochId: 'epoch_1',
      },
    ]);
    expect(legacy.veilScars).toEqual([
      {
        scarId: 'scar_veil_1',
        ledger: 'veil',
        description: 'Anachronistic lens venerated',
        originEpochId: 'epoch_1',
      },
    ]);
    expect(legacy.communicationsBackboneControllerId).toBe('office_censorate');
  });

  it('applies ordered add, multiply, clamp, and override lineage mutations without mutating input blueprints', () => {
    const charAlpha = makeBlueprint('char_epoch2_alpha', 'lineage_alpha');
    const charAlpha2 = makeBlueprint('char_epoch2_alpha_2', 'lineage_alpha');
    const charBeta = makeBlueprint('char_epoch2_beta', 'lineage_beta');
    const snapshotAlpha = structuredClone(charAlpha);

    const legacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [
        {
          scarId: 'material_scar_alpha',
          ledger: 'material',
          description: 'Guild secrecy entrenched',
          originEpochId: 'epoch_1',
        },
      ],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'material_scar_alpha',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.6,
        },
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'material_scar_alpha',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'clamp',
          min: 0,
          max: 1,
        },
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'material_scar_alpha',
          target: { kind: 'drive', key: 'secrecy' },
          strategy: 'override',
          value: 0.9,
        },
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'material_scar_alpha',
          target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
          strategy: 'multiply',
          factor: 1.5,
        },
      ],
    });

    const mutated = applyLegacyToCharacterBlueprints([charAlpha, charAlpha2, charBeta], legacy);
    const updatedAlpha = mutated[0];
    const updatedAlpha2 = mutated[1];
    const updatedBeta = mutated[2];

    expect(updatedAlpha).not.toBe(charAlpha);
    expect(charAlpha).toEqual(snapshotAlpha);
    expect(updatedAlpha?.drives['curiosity']).toBe(1.0);
    expect(updatedAlpha?.drives['secrecy']).toBe(0.9);
    expect(updatedAlpha?.inertiaPillars[0]?.weight).toBeCloseTo(0.75);
    expect(updatedAlpha2?.drives['curiosity']).toBe(1.0);

    // Unrelated lineage_beta is referentially unchanged
    expect(updatedBeta).toBe(charBeta);
  });

  it('rejects conflicting overrides, unknown drive/pillar targets, Object.prototype keys, and out-of-bounds results without mutating inputs', () => {
    const charAlpha = makeBlueprint('char_epoch2_alpha', 'lineage_alpha');
    const snapshotAlpha = structuredClone(charAlpha);

    // 1. Conflicting drive overrides
    const conflictingDriveLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'override',
          value: 0.2,
        },
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_2',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'override',
          value: 0.8,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], conflictingDriveLegacy)).toThrow(
      /Conflicting override mutations/,
    );

    // 2. Conflicting inertia_weight overrides
    const conflictingPillarLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
          strategy: 'override',
          value: 0.2,
        },
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_2',
          target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
          strategy: 'override',
          value: 0.4,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], conflictingPillarLegacy)).toThrow(
      /Conflicting override mutations/,
    );

    // 3. Drive > 1 and Drive < 0 out of bounds
    const driveHighLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.8,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], driveHighLegacy)).toThrow(
      /out of bounds/,
    );

    const driveNegativeLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: -0.9,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], driveNegativeLegacy)).toThrow(
      /out of bounds/,
    );

    // 4. Negative inertia pillar weight
    const pillarNegativeLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
          strategy: 'add',
          delta: -1.0,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], pillarNegativeLegacy)).toThrow(
      /out of bounds/,
    );

    // 5. Unknown drive key (including Object.prototype key 'toString') and unknown pillarId
    const unknownDriveLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'drive', key: 'toString' },
          strategy: 'add',
          delta: 0.1,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], unknownDriveLegacy)).toThrow(
      /unknown drive 'toString'/,
    );

    const unknownPillarLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_1',
      materialScars: [],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_1',
          target: { kind: 'inertia_weight', pillarId: 'non_existent_pillar' },
          strategy: 'add',
          delta: 0.1,
        },
      ],
    });
    expect(() => applyLegacyToCharacterBlueprints([charAlpha], unknownPillarLegacy)).toThrow(
      /unknown inertiaPillar 'non_existent_pillar'/,
    );

    // 6. Schema validation of wrong ledger placement and invalid clamp min > max
    expect(() =>
      createCivilizationLegacyState({
        sourceEpochId: 'epoch_1',
        materialScars: [
          {
            scarId: 'wrong_ledger',
            ledger: 'veil',
            description: 'Veil scar placed in materialScars',
            originEpochId: 'epoch_1',
          },
        ],
        veilScars: [],
        lineageMutations: [],
      }),
    ).toThrow(/must have ledger: 'material'/);

    expect(() =>
      createCivilizationLegacyState({
        sourceEpochId: 'epoch_1',
        materialScars: [],
        veilScars: [],
        lineageMutations: [
          {
            lineageId: 'lineage_alpha',
            sourceScarId: 'scar_1',
            target: { kind: 'drive', key: 'curiosity' },
            strategy: 'clamp',
            min: 0.8,
            max: 0.2,
          },
        ],
      }),
    ).toThrow(/clamp min must be <= max/);

    // Input blueprint was never mutated across all throwing invocations
    expect(charAlpha).toEqual(snapshotAlpha);
  });
});
