import { appendFileSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_ACTIVE_LOG_BYTES,
  DEFAULT_MAX_COMPACTED_LOG_BYTES,
  fixedTelemetryClock,
  InMemorySessionTelemetry,
  NdjsonSessionTelemetry,
  parseNdjsonLines,
} from '../../../src/infrastructure/index.js';

describe('NdjsonSessionTelemetry and RollingLogCompactor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'uplift-telemetry-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('logs complete actor-actee events with a fixed clock and purges previous session logs on startNewSession', () => {
    const clock = fixedTelemetryClock('2026-11-06T12:00:00.000Z', 1500);
    const logger = new NdjsonSessionTelemetry(tempDir, 'session-alpha', clock);

    const entry = logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 3,
      level: 'info',
      category: 'player',
      actorId: 'player.deme',
      acteeId: 'npc.sorrel',
      action: 'inquire_wax_ledger',
      inputs: { tone: 'discreet' },
      effects: [{ type: 'trust_delta', delta: 0.1 }],
      message: 'Ellin Quell asked Sorrel about the chapel wax ledger',
    });

    expect(entry.sessionId).toBe('session-alpha');
    expect(entry.sequence).toBe(1);
    expect(entry.timestampIso).toBe('2026-11-06T12:00:00.000Z');
    expect(entry.elapsedSessionMs).toBe(1500);
    expect(logger.query()).toHaveLength(1);

    // Starting a new session purges prior session logs on disk
    logger.startNewSession('session-beta', fixedTelemetryClock('2026-11-06T13:00:00.000Z', 0));
    expect(logger.getSessionId()).toBe('session-beta');
    expect(logger.query()).toHaveLength(0);
    expect(readFileSync(logger.getActiveLogPath(), 'utf8')).toBe('');
  });

  it('compacts repetitive routine info events older than the retention window while preserving warn/error/crash, player, rival, office/pretext, and AI reasoning verbatim', () => {
    let currentElapsed = 1000;
    const stepClock = {
      nowIso: () => '2026-11-06T12:00:00.000Z',
      elapsedSessionMs: () => currentElapsed,
    };

    const logger = new NdjsonSessionTelemetry(tempDir, 'session-compact', stepClock);

    // 3 repetitive routine patrol entries at t=1000..3000ms (ticks 1..3)
    for (let tick = 1; tick <= 3; tick += 1) {
      currentElapsed = tick * 1000;
      logger.record({
        epochId: 'era_1_highglass_hold',
        worldTick: tick,
        level: 'info',
        category: 'routine',
        actorId: 'npc.guard_01',
        action: 'patrol_step',
        message: 'Guard stepped along courtyard wall',
      });
    }

    // High-signal office/pretext info entry at t=3500ms (must be preserved verbatim)
    currentElapsed = 3500;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 4,
      level: 'info',
      category: 'pretext',
      actorId: 'player.deme',
      acteeId: 'npc.vane',
      action: 'call_monetary_assay',
      message: 'Invoked Master of Coin pretext to freeze foundry strongbox',
    });

    // High-signal AI reasoning trace at t=4000ms (must be preserved verbatim)
    currentElapsed = 4000;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 5,
      level: 'info',
      category: 'routine',
      actorId: 'ship.the_ending',
      acteeId: 'drone.the_lamp',
      action: 'advisory_duel_evaluated',
      aiReasoning: {
        pipeline: 'advisory_duel',
        inputSummary: 'Evaluate weather miracle over Calder Spines',
        outputSummary: 'The Ending recommends storm intensification (0.73)',
        candidateScores: [
          { id: 'intensify_storm', score: 0.73 },
          { id: 'withhold_intervention', score: 0.61 },
        ],
        selectedReason: 'Accelerates gorge flood-timer adoption',
        omittedClauses: ['The Lamp omitted that storm delays Fen courier by 3 ticks'],
      },
      message: 'Advisory duel resolved in neural lace',
    });

    // Warning entry at t=4500ms (must be preserved verbatim)
    currentElapsed = 4500;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 6,
      level: 'warn',
      category: 'rival',
      actorId: 'rival.house_reciprocal',
      action: 'early_overview_rumor',
      message: 'Overview rumor arrived 2 ticks faster than horse courier',
    });

    // Recent routine entry at t=10000ms (inside 3000ms retention window: 10000 - 3000 = 7000ms cutoff)
    currentElapsed = 10_000;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 10,
      level: 'info',
      category: 'routine',
      actorId: 'npc.guard_01',
      action: 'patrol_step',
      message: 'Guard stepped along courtyard wall (recent)',
    });

    logger.compact(3000);

    const allRecords = logger.query();
    // 1 compacted digest (for the 3 old routine steps) + 3 preserved high-signal records + 1 active recent record = 5
    expect(allRecords).toHaveLength(5);

    const digests = allRecords.filter((r) => r.recordType === 'compacted_digest');
    expect(digests).toHaveLength(1);
    expect(digests[0]).toMatchObject({
      recordType: 'compacted_digest',
      actorId: 'npc.guard_01',
      action: 'patrol_step',
      count: 3,
      firstElapsedMs: 1000,
      lastElapsedMs: 3000,
      firstWorldTick: 1,
      lastWorldTick: 3,
    });

    // Filter queries work across compacted and active streams
    expect(logger.query({ level: 'warn' })).toHaveLength(1);
    expect(logger.query({ hasAiReasoning: true })).toHaveLength(1);
    expect(logger.query({ category: 'pretext', acteeId: 'npc.vane' })).toHaveLength(1);
    expect(logger.query({ minTick: 2, maxTick: 3 })).toHaveLength(1);
    expect(logger.query({ minTick: 10, maxTick: 2 })).toHaveLength(0);

    // A second compaction merges new routine entries into the existing compacted_digest bucket
    currentElapsed = 20_000;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 12,
      level: 'info',
      category: 'routine',
      actorId: 'npc.guard_01',
      action: 'patrol_step',
      message: 'Guard stepped along courtyard wall (window 2)',
    });
    logger.compact(3000);

    const digestsAfterSecondPass = logger
      .query()
      .filter((r) => r.recordType === 'compacted_digest');
    expect(digestsAfterSecondPass).toHaveLength(1);
    expect(digestsAfterSecondPass[0]).toMatchObject({
      recordType: 'compacted_digest',
      actorId: 'npc.guard_01',
      action: 'patrol_step',
      count: 4,
      firstWorldTick: 1,
      lastWorldTick: 10,
    });
  });

  it('skips malformed or truncated NDJSON lines without crashing and supports InMemorySessionTelemetry parity', () => {
    const clock = fixedTelemetryClock('2026-11-06T12:00:00.000Z', 500);
    const diskLogger = new NdjsonSessionTelemetry(tempDir, 'session-resilient', clock);
    diskLogger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 1,
      level: 'error',
      category: 'system',
      actorId: 'system',
      action: 'test_error',
      message: 'Valid error line before corruption',
    });

    appendFileSync(
      diskLogger.getActiveLogPath(),
      '{truncated_json_line\n{"recordType":"invalid"}\n',
    );

    const queried = diskLogger.query({ level: 'error' });
    expect(queried).toHaveLength(1);
    expect(parseNdjsonLines('not json\n\n')).toEqual([]);

    const memLogger = new InMemorySessionTelemetry('mem-session', clock);
    memLogger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 1,
      level: 'crash',
      category: 'system',
      actorId: 'system',
      action: 'fatal_invariant',
      message: 'In-memory crash record',
    });
    expect(memLogger.query({ level: 'crash' })).toHaveLength(1);
  });

  it('defaults to 50 MiB active and 500 MiB compacted storage caps and auto-compacts/evicts lowest-priority entries when exceeded', () => {
    let currentElapsed = 1000;
    const stepClock = {
      nowIso: () => '2026-11-06T12:00:00.000Z',
      elapsedSessionMs: () => currentElapsed,
    };

    const defaultLogger = new NdjsonSessionTelemetry(tempDir, 'session-defaults', stepClock);
    expect(defaultLogger.getStorageBudget().maxActiveLogBytes).toBe(50 * 1024 * 1024);
    expect(defaultLogger.getStorageBudget().maxCompactedLogBytes).toBe(500 * 1024 * 1024);
    expect(DEFAULT_MAX_ACTIVE_LOG_BYTES).toBe(50 * 1024 * 1024);
    expect(DEFAULT_MAX_COMPACTED_LOG_BYTES).toBe(500 * 1024 * 1024);

    // Configure small byte caps (400B active trigger, 650B compacted cap) to test auto-compaction and priority eviction
    const cappedLogger = new NdjsonSessionTelemetry(tempDir, 'session-capped', stepClock, {
      maxActiveLogBytes: 400,
      maxCompactedLogBytes: 650,
      defaultRetentionWindowMs: 500,
    });

    currentElapsed = 1000;
    cappedLogger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 1,
      level: 'info',
      category: 'routine',
      actorId: 'npc.laborer_01',
      action: 'haul_timber',
      message: 'Laborer hauled timber across the bailey',
    });

    currentElapsed = 2000;
    cappedLogger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 2,
      level: 'error',
      category: 'rival',
      actorId: 'rival.the_tithe',
      action: 'sabotage_assay',
      message: 'Critical rival sabotage error that must survive eviction',
    });

    // Advance clock past retentionWindowMs (500ms) and record another entry to exceed 400B active log cap
    currentElapsed = 5000;
    cappedLogger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 5,
      level: 'info',
      category: 'routine',
      actorId: 'npc.laborer_02',
      action: 'haul_stone',
      message: 'Another routine entry that triggers automatic compaction of older entries',
    });

    const compactedSize = statSync(cappedLogger.getCompactedLogPath()).size;
    expect(compactedSize).toBeGreaterThan(0);
    expect(compactedSize).toBeLessThanOrEqual(650);

    // High-priority error record survives even under tight compacted byte cap
    const survivingErrors = cappedLogger.query({ level: 'error' });
    expect(survivingErrors).toHaveLength(1);
    expect(survivingErrors[0]?.actorId).toBe('rival.the_tithe');
  });
});
