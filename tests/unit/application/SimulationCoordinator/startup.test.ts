import { describe, expect, it } from 'vitest';
import { MAX_FRAME_DT_SECONDS, SimulationCoordinator } from '../../../../src/application/index.js';
import {
  createCivilizationLegacyState,
  FAST_EVAL_PACING_CONFIG,
  SeededRandom,
} from '../../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import { createClock, highLegacy } from './fixtures.js';

describe('SimulationCoordinator startup', () => {
  it('initializes WorldState from EpochModuleRegistry with legacy mutations, steps 60Hz kinematics with dt clamping, and freezes when paused', () => {
    const registry = makeRegistry();
    const telemetry = new InMemorySessionTelemetry('session_test', createClock());
    const saveRepository = new InMemorySaveSlotRepository();
    const legacy = createCivilizationLegacyState({
      sourceEpochId: 'epoch_0',
      materialScars: [
        {
          scarId: 'scar_charter',
          ledger: 'material',
          description: 'Cooperative charter founded',
          originEpochId: 'epoch_0',
        },
      ],
      veilScars: [],
      lineageMutations: [
        {
          lineageId: 'lineage_alpha',
          sourceScarId: 'scar_charter',
          target: { kind: 'drive', key: 'curiosity' },
          strategy: 'add',
          delta: 0.25,
        },
      ],
    });

    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry,
      telemetry,
      saveRepository,
      clock: createClock(),
      rng: new SeededRandom(42),
      legacyState: legacy,
    });

    expect(() => coordinator.stepFrame(-0.016)).toThrow(RangeError);
    expect(() => coordinator.stepFrame(Number.NaN)).toThrow(RangeError);

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBeCloseTo(
      0.75,
    );
    expect(coordinator.getWorldState().orbitalPass.maxDelta).toBe(120);

    // Assign movement path to char_alpha
    coordinator.dispatchEffects(
      [
        {
          type: 'move_entity_to_waypoint',
          entityId: 'char_alpha',
          path: [{ waypointId: 'wp_a2', spaceId: 'space_alpha', position: [1.4, 0, 0] }],
        },
      ],
      { actorId: 'char_alpha', action: 'begin_walk', advanceTick: true },
    );

    expect(coordinator.getWorldState().worldTick).toBe(1);

    // Pause freezes both kinematics and effect dispatch
    coordinator.setPaused(true);
    const pausedStep = coordinator.stepFrame(0.1);
    expect(pausedStep.arrivals).toHaveLength(0);
    expect(coordinator.getWorldState().entities['char_alpha']?.position).toEqual([0, 0, 0]);

    const ignoredWhilePaused = coordinator.dispatchEffects([
      {
        type: 'adjust_pressure_stock',
        stock: 'subsistence_pressure',
        delta: 0.5,
      },
    ]);
    expect(ignoredWhilePaused.appliedEffects).toHaveLength(0);

    coordinator.setPaused(false);

    // Oversized frame dtSeconds is clamped to MAX_FRAME_DT_SECONDS (0.25s) under DEFAULT_GAMEPLAY_PACING_CONFIG
    coordinator.stepFrame(2.0);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(MAX_FRAME_DT_SECONDS);

    const clampWarnings = telemetry.query({
      level: 'warn',
      action: 'clamp_frame_dt',
    });
    expect(clampWarnings).toHaveLength(1);

    // Step remaining 0.75s in 3 frames of 0.25s to complete the 1.4m walk at 1.4m/s
    coordinator.stepFrame(0.25);
    coordinator.stepFrame(0.25);
    const finalStep = coordinator.stepFrame(0.25);
    expect(finalStep.arrivals).toHaveLength(1);
    expect(finalStep.arrivals[0]?.waypointId).toBe('wp_a2');

    // Under FAST_EVAL_PACING_CONFIG (allowUnclampedFrameDt: true), stepFrame(2.0) advances a full 2.0s without clamping
    coordinator.setPacingConfig(FAST_EVAL_PACING_CONFIG);
    coordinator.stepFrame(2.0);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(3.0);
    expect(
      telemetry.query({
        level: 'warn',
        action: 'clamp_frame_dt',
      }),
    ).toHaveLength(1);
  });

  it('starts with saturated entities, resolved blueprints, immutable notes and queryable startup warnings', () => {
    const telemetry = new InMemorySessionTelemetry('session_startup_clamp', createClock());
    const coordinator = new SimulationCoordinator({
      epochId: 'epoch_sim_test',
      registry: makeRegistry(),
      telemetry,
      saveRepository: new InMemorySaveSlotRepository(),
      clock: createClock(),
      legacyState: highLegacy,
    });

    expect(coordinator.getWorldState().entities['char_alpha']?.drives['curiosity']).toBe(1);
    expect(coordinator.getResolvedCharacters()[0]?.drives['curiosity']).toBe(1);
    expect(coordinator.getLegacyClampNotes()).toEqual([
      {
        lineageId: 'lineage_alpha',
        characterId: 'char_alpha',
        driveKey: 'curiosity',
        unclampedValue: 1.25,
        clampedValue: 1,
      },
    ]);
    expect(Object.isFrozen(coordinator.getLegacyClampNotes())).toBe(true);
    expect(Object.isFrozen(coordinator.getLegacyClampNotes()[0])).toBe(true);
    expect(telemetry.query({ level: 'warn', action: 'legacy_drive_clamped' })).toMatchObject([
      {
        epochId: 'epoch_sim_test',
        worldTick: 0,
        category: 'legacy',
        actorId: 'char_alpha',
        inputs: {
          lineageId: 'lineage_alpha',
          characterId: 'char_alpha',
          driveKey: 'curiosity',
          unclampedValue: 1.25,
          clampedValue: 1,
          resolutionPhase: 'startup',
        },
      },
    ]);
  });
});
