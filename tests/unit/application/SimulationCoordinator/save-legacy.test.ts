import { describe, expect, it } from 'vitest';
import { SimulationCoordinator } from '../../../../src/application/index.js';
import {
  createCivilizationLegacyState,
  FAST_EVAL_PACING_CONFIG,
  legacyStateToRecord,
  SeededRandom,
} from '../../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import {
  createClock,
  driveTarget,
  FaultingLegacyTelemetry,
  highLegacy,
  legacyWithMutations,
} from './fixtures.js';

describe('SimulationCoordinator save and legacy', () => {
  it('saves and loads complete WorldState, RNG state, custom slices, and Dual-Ledger CivilizationLegacyState atomically', () => {
    const registry = makeRegistry();
    const telemetry = new InMemorySessionTelemetry('session_save', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const inheritedLegacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_0',
      materialScars: [
        {
          scarId: 'scar_epoch0_material',
          ledger: 'material',
          description: 'Inherited bridge charter',
          originEpochId: 'epoch_0',
        },
      ],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_epoch0_material',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.1,
        },
      ],
    });

    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry,
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(999),
      pacingConfig: FAST_EVAL_PACING_CONFIG,
      legacyState: inheritedLegacy,
    });

    coordinator.dispatchEffects(
      [
        {
          type: 'adjust_pressure_stock',
          stock: 'production_pressure',
          delta: 0.45,
        },
        {
          type: 'set_discovery_layer',
          layer: 'assayed',
        },
        {
          type: 'record_legacy_scar',
          scarId: 'scar_epoch1_veil',
          ledger: 'veil',
          description: 'Doctrinal schism recorded',
        },
        {
          type: 'set_state_slice',
          sliceId: 'custom_module_slice',
          value: { counter: 7 },
        },
      ],
      { advanceTick: true },
    );

    const savedRngState = coordinator.getRng().getState();
    const envelope = coordinator.saveToSlot('slot_alpha_1');
    expect(envelope.worldTick).toBe(1);

    // Mutate state further after saving
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects(
      [
        {
          type: 'set_discovery_layer',
          layer: 'theorized',
        },
      ],
      { advanceTick: true },
    );
    expect(coordinator.getWorldState().worldTick).toBe(2);

    // Foreign slot missing WorldState snapshot throws atomically without altering RNG or state
    saveRepository.saveSlot({
      slotId: 'slot_foreign',
      epochId: 'epoch_sim_test',
      packId: 'test_simulation',
      packVersion: 1,
      worldTick: 99,
      rngState: 12345,
      stateSlices: {},
    });
    const rngBeforeFailedLoad = coordinator.getRng().getState();
    expect(() => coordinator.loadFromSlot('slot_foreign')).toThrow(
      /does not contain a valid SimulationCoordinator WorldState snapshot/,
    );
    expect(coordinator.getRng().getState()).toBe(rngBeforeFailedLoad);
    expect(coordinator.getWorldState().worldTick).toBe(2);

    // Load restores tick 1, RNG state, discoveryLayer, custom slice, and combined Dual-Ledger legacy
    const restored = coordinator.loadFromSlot('slot_alpha_1');
    expect(restored.worldTick).toBe(1);
    expect(restored.discoveryLayer).toBe('assayed');
    expect(restored.pressureStocks.production_pressure).toBeCloseTo(0.45);
    expect(restored.stateSlices.toSnapshot()['custom_module_slice']).toEqual({
      counter: 7,
    });
    expect(coordinator.getRng().getState()).toBe(savedRngState);

    const exportedLegacy = coordinator.exportLegacyState({
      communicationsBackboneControllerId: 'office_alpha',
    });
    expect(exportedLegacy.materialScars).toHaveLength(1);
    expect(exportedLegacy.materialScars[0]?.scarId).toBe('scar_epoch0_material');
    expect(exportedLegacy.veilScars).toHaveLength(1);
    expect(exportedLegacy.veilScars[0]?.scarId).toBe('scar_epoch1_veil');
    expect(exportedLegacy.lineageMutations).toHaveLength(1);
    expect(exportedLegacy.communicationsBackboneControllerId).toBe('office_alpha');
  });

  it('loads a low-clamp blueprint while retaining the saved world and raw RNG continuation', () => {
    const telemetry = new InMemorySessionTelemetry('session_load_clamp', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(42),
    });
    coordinator.getRng().nextUint32();
    const saved = coordinator.saveToSlot('slot_low_clamp');
    const expectedNextDraw = SeededRandom.fromState(saved.rngState).nextUint32();
    const restoredEpochId = 'epoch_sim_test';
    const savedWorld = saved.stateSlices['__upliftWorldStateSnapshot'];
    if (typeof savedWorld !== 'object' || savedWorld === null) {
      throw new Error('Saved slot is missing its world snapshot');
    }
    const lowLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);
    saveRepository.saveSlot({
      ...saved,
      epochId: restoredEpochId,
      stateSlices: {
        ...saved.stateSlices,
        __upliftWorldStateSnapshot: { ...savedWorld, epochId: restoredEpochId },
      },
      legacyState: legacyStateToRecord(lowLegacy),
    });
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    expect(coordinator.getWorldState().worldTick).toBe(1);

    const restored = coordinator.loadFromSlot('slot_low_clamp');

    expect(restored.epochId).toBe(restoredEpochId);
    expect(restored.worldTick).toBe(saved.worldTick);
    expect(restored.entities['char_alpha']?.drives['secrecy']).toBe(0.4);
    expect(coordinator.getResolvedCharacters()[0]?.drives['secrecy']).toBe(0);
    expect(coordinator.getLegacyClampNotes()).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'secrecy',
        unclampedValue: -0.35,
        clampedValue: 0,
      },
    ]);
    expect(coordinator.getRng().nextUint32()).toBe(expectedNextDraw);
    expect(telemetry.query({ action: 'load_slot' })).toMatchObject([
      { epochId: restoredEpochId, worldTick: saved.worldTick },
    ]);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toMatchObject([
      {
        epochId: restoredEpochId,
        worldTick: saved.worldTick,
        category: 'legacy',
        inputs: {
          lineageId: 'lineage_alpha',
          characterId: 'char_alpha',
          driveKey: 'secrecy',
          unclampedValue: -0.35,
          clampedValue: 0,
          resolutionPhase: 'load',
          slotId: 'slot_low_clamp',
        },
        message: expect.stringMatching(/blueprint/),
      },
    ]);
  });

  it('emits no clamp warning for a finite final drive returned to range by an explicit clamp', () => {
    const telemetry = new InMemorySessionTelemetry('session_no_clamp', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const inRangeLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: driveTarget,
        strategy: 'add',
        delta: 0.75,
      },
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_bound',
        target: driveTarget,
        strategy: 'clamp',
        min: 0,
        max: 1,
      },
    ]);
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: inRangeLegacy,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    coordinator.saveToSlot('slot_in_range');
    coordinator.loadFromSlot('slot_in_range');
    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toEqual([]);
  });

  it('replaces startup clamp notes with an empty latest load result', () => {
    const telemetry = new InMemorySessionTelemetry('session_latest_notes', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: highLegacy,
    });
    expect(coordinator.getLegacyClampNotes()).toHaveLength(1);
    const saved = coordinator.saveToSlot('slot_latest_notes');
    const inRangeLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_in_range',
        target: driveTarget,
        strategy: 'add',
        delta: 0.25,
      },
    ]);
    saveRepository.saveSlot({ ...saved, legacyState: legacyStateToRecord(inRangeLegacy) });

    coordinator.loadFromSlot('slot_latest_notes');

    expect(coordinator.getLegacyClampNotes()).toEqual([]);
    expect(coordinator.getResolvedCharacters()[0]?.drives['curiosity']).toBe(0.75);
    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toHaveLength(1);
  });

  it('leaves every prior coordinator field intact for each invalid load', () => {
    const telemetry = new InMemorySessionTelemetry('session_invalid_load', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(99),
      legacyState: highLegacy,
    });
    const saved = coordinator.saveToSlot('slot_base_valid');
    const base = { lineageId: 'lineage_alpha', sourceScarId: 'scar_invalid' } as const;
    const override = { ...base, target: driveTarget, strategy: 'override', value: 0.25 } as const;
    const invalidCases: ReadonlyArray<{
      readonly name: string;
      readonly legacyState: Readonly<Record<string, unknown>>;
      readonly expected: RegExp;
    }> = [
      {
        name: 'conflict',
        legacyState: legacyStateToRecord(
          legacyWithMutations([override, { ...override, sourceScarId: 'scar_second' }]),
        ),
        expected: /Conflicting override/,
      },
      {
        name: 'drive',
        legacyState: legacyStateToRecord(
          legacyWithMutations([{ ...override, target: { kind: 'drive', key: 'toString' } }]),
        ),
        expected: /unknown drive/,
      },
      {
        name: 'pillar',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            { ...override, target: { kind: 'inertia_weight', pillarId: 'missing' } },
          ]),
        ),
        expected: /unknown inertiaPillar/,
      },
      {
        name: 'interval',
        legacyState: {
          ...legacyWithMutations([]),
          lineageMutations: [{ ...base, target: driveTarget, strategy: 'clamp', min: 1, max: 0 }],
        },
        expected: /clamp min must be <= max/,
      },
      {
        name: 'drive_overflow',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            { ...base, target: driveTarget, strategy: 'override', value: Number.MAX_VALUE },
            { ...base, target: driveTarget, strategy: 'add', delta: Number.MAX_VALUE },
            { ...base, target: driveTarget, strategy: 'clamp', min: 0, max: 1 },
          ]),
        ),
        expected: /non-finite/,
      },
      {
        name: 'pillar_overflow',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: Number.MAX_VALUE,
            },
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: Number.MAX_VALUE,
            },
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'override',
              value: 0.5,
            },
          ]),
        ),
        expected: /non-finite/,
      },
      {
        name: 'negative_pillar',
        legacyState: legacyStateToRecord(
          legacyWithMutations([
            {
              ...base,
              target: { kind: 'inertia_weight', pillarId: 'pillar_1' },
              strategy: 'add',
              delta: -1,
            },
          ]),
        ),
        expected: /out of bounds/,
      },
    ];
    const priorState = coordinator.getWorldState();
    const priorRng = coordinator.getRng();
    const priorRngWord = priorRng.getState();
    const priorCharacters = coordinator.getResolvedCharacters();
    const priorNotes = coordinator.getLegacyClampNotes();
    const priorLegacy = coordinator.exportLegacyState();

    for (const [index, invalid] of invalidCases.entries()) {
      const slotId = `invalid_${String(index)}`;
      saveRepository.saveSlot({ ...saved, slotId, legacyState: invalid.legacyState });
      expect(() => coordinator.loadFromSlot(slotId), invalid.name).toThrow(invalid.expected);
      expect(coordinator.getWorldState(), invalid.name).toBe(priorState);
      expect(coordinator.getRng(), invalid.name).toBe(priorRng);
      expect(coordinator.getRng().getState(), invalid.name).toBe(priorRngWord);
      expect(coordinator.getResolvedCharacters(), invalid.name).toBe(priorCharacters);
      expect(coordinator.getLegacyClampNotes(), invalid.name).toBe(priorNotes);
      expect(coordinator.exportLegacyState(), invalid.name).toEqual(priorLegacy);
    }
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(0);
  });

  it('continues after first and later clamp-warning writes fail while retaining notes', () => {
    const telemetry = new FaultingLegacyTelemetry('session_warning_faults', createClock());
    telemetry.failedWarningAttempts.add(1);
    telemetry.failedWarningAttempts.add(4);
    const saveRepository = new InMemorySaveSlotRepository();
    const twoClamps = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_high',
        target: driveTarget,
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
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      legacyState: twoClamps,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives).toEqual({
      curiosity: 1,
      secrecy: 0,
    });
    expect(coordinator.getLegacyClampNotes()).toHaveLength(2);
    expect(telemetry.warningAttempts).toBe(2);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(1);

    coordinator.saveToSlot('slot_warning_faults');
    expect(() => coordinator.loadFromSlot('slot_warning_faults')).not.toThrow();
    expect(coordinator.getLegacyClampNotes()).toHaveLength(2);
    expect(telemetry.warningAttempts).toBe(4);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(2);
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(1);
  });

  it('keeps prior world, RNG, legacy, characters and notes when load_slot recording fails, then retries', () => {
    const telemetry = new FaultingLegacyTelemetry('session_load_record_fault', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(71),
      legacyState: highLegacy,
    });
    const saved = coordinator.saveToSlot('slot_retry');
    const lowLegacy = legacyWithMutations([
      {
        lineageId: 'lineage_alpha',
        sourceScarId: 'scar_low',
        target: { kind: 'drive', key: 'secrecy' },
        strategy: 'add',
        delta: -0.75,
      },
    ]);
    saveRepository.saveSlot({ ...saved, legacyState: legacyStateToRecord(lowLegacy) });
    coordinator.getRng().nextUint32();
    coordinator.dispatchEffects([{ type: 'set_discovery_layer', layer: 'assayed' }], {
      advanceTick: true,
    });
    const priorState = coordinator.getWorldState();
    const priorRng = coordinator.getRng();
    const priorRngWord = priorRng.getState();
    const priorCharacters = coordinator.getResolvedCharacters();
    const priorNotes = coordinator.getLegacyClampNotes();
    const priorLegacy = coordinator.exportLegacyState();
    telemetry.failNextLoadRecord = true;

    expect(() => coordinator.loadFromSlot('slot_retry')).toThrow(/load_slot record failed/);
    expect(coordinator.getWorldState()).toBe(priorState);
    expect(coordinator.getRng()).toBe(priorRng);
    expect(coordinator.getRng().getState()).toBe(priorRngWord);
    expect(coordinator.getResolvedCharacters()).toBe(priorCharacters);
    expect(coordinator.getLegacyClampNotes()).toBe(priorNotes);
    expect(coordinator.exportLegacyState()).toEqual(priorLegacy);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(1);

    const restored = coordinator.loadFromSlot('slot_retry');
    expect(restored.worldTick).toBe(saved.worldTick);
    expect(coordinator.getRng().getState()).toBe(saved.rngState);
    expect(coordinator.getResolvedCharacters()[0]?.drives['secrecy']).toBe(0);
    expect(coordinator.getLegacyClampNotes()[0]?.driveKey).toBe('secrecy');
    expect(telemetry.query({ action: 'load_slot' })).toHaveLength(1);
    expect(telemetry.query({ action: 'legacy_drive_clamped' })).toHaveLength(2);
  });
});
