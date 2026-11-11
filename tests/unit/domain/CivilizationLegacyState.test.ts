import { describe, expect, it } from 'vitest';
import {
  applyLegacyToCharacterBlueprints,
  type CharacterBlueprint,
  type CivilizationLegacyState,
  civilizationLegacyFromRecordedScars,
  createCivilizationLegacyState,
  legacyStateToRecord,
  type LineageMutation,
  parseLegacyState,
  recordScarInLegacyState,
  resolveRuntimeLegacyCharacterBlueprints,
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

function makeLegacy(lineageMutations: ReadonlyArray<LineageMutation>): CivilizationLegacyState {
  return createCivilizationLegacyState({
    sourceEpochId: 'epoch_1',
    materialScars: [],
    veilScars: [],
    lineageMutations,
  });
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

describe('runtime legacy character resolution', () => {
  it('saturates finite high and low final drives once per character and drive', () => {
    const alpha = makeBlueprint('char_alpha', 'lineage_alpha', {
      drives: { curiosity: 0.5, secrecy: 0.5 },
    });
    const alpha2 = makeBlueprint('char_alpha_2', 'lineage_alpha', {
      drives: { curiosity: 0.5, secrecy: 0.5 },
    });
    const beta = makeBlueprint('char_beta', 'lineage_beta');
    const legacy = makeLegacy([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'add',
        delta: 0.75,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);

    const result = resolveRuntimeLegacyCharacterBlueprints([alpha, alpha2, beta], legacy);

    expect(result.characters[0]?.drives).toEqual({ curiosity: 1, secrecy: 0 });
    expect(result.characters[1]?.drives).toEqual({ curiosity: 1, secrecy: 0 });
    expect(result.characters[2]).toBe(beta);
    expect(result.clampNotes).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'curiosity',
        unclampedValue: 1.25,
        clampedValue: 1,
      },
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'secrecy',
        unclampedValue: -0.25,
        clampedValue: 0,
      },
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha_2',
        driveKey: 'curiosity',
        unclampedValue: 1.25,
        clampedValue: 1,
      },
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha_2',
        driveKey: 'secrecy',
        unclampedValue: -0.25,
        clampedValue: 0,
      },
    ]);
    expect(() => applyLegacyToCharacterBlueprints([alpha], legacy)).toThrow(/out of bounds/);
  });

  it('produces deterministic saturation notes from two same-sign adds without mutating frozen inputs', () => {
    const original = makeBlueprint('char_frozen', 'lineage_alpha', {
      drives: { curiosity: 0.5, secrecy: 0.5 },
    });
    const alpha = Object.freeze({
      ...original,
      drives: Object.freeze({ ...original.drives }),
      inertiaPillars: Object.freeze(
        original.inertiaPillars.map((pillar) => Object.freeze({ ...pillar })),
      ),
    });
    const legacy = makeLegacy([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_a',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'add',
        delta: 0.25,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_b',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'add',
        delta: 0.5,
      },
    ]);
    for (const mutation of legacy.lineageMutations) {
      Object.freeze(mutation.target);
      Object.freeze(mutation);
    }
    Object.freeze(legacy.materialScars);
    Object.freeze(legacy.veilScars);
    Object.freeze(legacy.lineageMutations);
    Object.freeze(legacy);
    const blueprintBefore = structuredClone(alpha);
    const legacyBefore = structuredClone(legacy);

    const first = resolveRuntimeLegacyCharacterBlueprints([alpha], legacy);
    const second = resolveRuntimeLegacyCharacterBlueprints([alpha], legacy);

    expect(first).toEqual(second);
    expect(first.characters[0]).not.toBe(alpha);
    expect(first.characters[0]?.drives['curiosity']).toBe(1);
    expect(first.clampNotes).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_frozen',
        driveKey: 'curiosity',
        unclampedValue: 1.25,
        clampedValue: 1,
      },
    ]);
    expect(alpha).toEqual(blueprintBefore);
    expect(legacy).toEqual(legacyBefore);
  });

  it('leaves boundary and later-explicitly-clamped drives in range without notes', () => {
    const alpha = makeBlueprint('char_alpha', 'lineage_alpha');
    const legacy = makeLegacy([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'add',
        delta: 0.8,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_clamp',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'clamp',
        min: 0,
        max: 1,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_zero',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'override',
        value: 0,
      },
    ]);

    const result = resolveRuntimeLegacyCharacterBlueprints([alpha], legacy);

    expect(result.characters[0]?.drives).toEqual({ curiosity: 1, secrecy: 0 });
    expect(result.clampNotes).toEqual([]);
  });

  it('rejects conflicts, unknown targets and invalid clamp intervals before returning characters', () => {
    const alpha = makeBlueprint('char_alpha', 'lineage_alpha');
    const override = {
      lineageId: 'lineage_alpha',
      sourceScarId: 'scar_a',
      target: { kind: 'drive', key: 'curiosity' },
      strategy: 'override',
      value: 0.2,
    } as const;
    const conflicts = makeLegacy([override, { ...override, sourceScarId: 'scar_b', value: 0.8 }]);
    const unknownDrive = makeLegacy([{ ...override, target: { kind: 'drive', key: 'toString' } }]);
    const unknownPillar = makeLegacy([
      { ...override, target: { kind: 'inertia_weight', pillarId: 'missing' } },
    ]);
    const invalidClamp = {
      ...makeLegacy([]),
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_bad',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'clamp',
          min: 0.8,
          max: 0.2,
        },
      ],
    } as CivilizationLegacyState;
    const snapshot = structuredClone(alpha);

    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], conflicts)).toThrow(
      /Conflicting override/,
    );
    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], unknownDrive)).toThrow(
      /unknown drive/,
    );
    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], unknownPillar)).toThrow(
      /unknown inertiaPillar/,
    );
    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], invalidClamp)).toThrow(
      /clamp min must be <= max/,
    );
    expect(alpha).toEqual(snapshot);
  });

  it('rejects intermediate non-finite drive and pillar arithmetic even if later repaired', () => {
    const alpha = makeBlueprint('char_alpha', 'lineage_alpha');
    const driveThenClamp = makeLegacy([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_max',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'override',
        value: Number.MAX_VALUE,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_overflow',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'add',
        delta: Number.MAX_VALUE,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_clamp',
        target: { kind: 'drive', key: 'curiosity' },
        strategy: 'clamp',
        min: 0,
        max: 1,
      },
    ]);
    const pillarThenOverride = makeLegacy([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_first',
        target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
        strategy: 'add',
        delta: Number.MAX_VALUE,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_overflow',
        target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
        strategy: 'add',
        delta: Number.MAX_VALUE,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_override',
        target: { kind: 'inertia_weight', pillarId: 'pillar_doc' },
        strategy: 'override',
        value: 0.5,
      },
    ]);
    const snapshot = structuredClone(alpha);

    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], driveThenClamp)).toThrow(
      /non-finite/,
    );
    expect(() => resolveRuntimeLegacyCharacterBlueprints([alpha], pillarThenOverride)).toThrow(
      /non-finite/,
    );
    expect(() => applyLegacyToCharacterBlueprints([alpha], driveThenClamp)).toThrow(/non-finite/);
    expect(() => applyLegacyToCharacterBlueprints([alpha], pillarThenOverride)).toThrow(
      /non-finite/,
    );
    expect(alpha).toEqual(snapshot);
  });
});
