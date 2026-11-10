import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {
  nodeLocalFileOps,
  type LocalFileOps,
} from '../../../src/infrastructure/persistence/safeLocalFiles.js';
import {
  SessionStorageError,
  TelemetryStorageUnavailableError,
} from '../../../src/infrastructure/telemetry/NdjsonSessionTelemetry.js';
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

  it('logs complete actor-actee events with a fixed clock and archives previous session logs on startNewSession', () => {
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

    const previous = readFileSync(logger.getActiveLogPath(), 'utf8');
    // Starting a new session preserves prior bytes outside the current query.
    logger.startNewSession('session-beta', fixedTelemetryClock('2026-11-06T13:00:00.000Z', 0));
    expect(logger.getSessionId()).toBe('session-beta');
    expect(logger.query()).toHaveLength(0);
    expect(readFileSync(logger.getActiveLogPath(), 'utf8')).toBe('');
    const groups = readdirSync(join(tempDir, 'prev'));
    expect(groups).toEqual(['session-0000000000000001']);
    expect(
      readFileSync(
        join(tempDir, 'prev', 'session-0000000000000001', 'current-session.jsonl'),
        'utf8',
      ),
    ).toBe(previous);
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

const activeName = 'current-session.jsonl';
const compactedName = 'current-session.compacted.jsonl';
const event = {
  epochId: 'test-epoch',
  worldTick: 1,
  level: 'info',
  category: 'system',
  actorId: 'test',
  action: 'record',
  message: 'test',
} as const;
const clock = fixedTelemetryClock('2026-11-06T12:00:00.000Z', 10);
const groupName = (sequence: number): string => `session-${String(sequence).padStart(16, '0')}`;

describe('previous-session preservation and storage failures', () => {
  let base: string;
  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'uplift-rotation-'));
  });
  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it.each([
    { names: [] },
    { names: [activeName] },
    { names: [compactedName] },
    { names: [activeName, compactedName] },
  ])('preserves partial and malformed old logs: $names', ({ names }) => {
    for (const name of names)
      writeFileSync(join(base, name), name === activeName ? '{truncated' : '');
    const logger = new NdjsonSessionTelemetry(base, '../same/session', clock);
    expect(logger.query()).toEqual([]);
    for (const name of names)
      expect(readFileSync(join(base, 'prev', groupName(1), name), 'utf8')).toBe(
        name === activeName ? '{truncated' : '',
      );
    if (names.length === 0) expect(existsSync(join(base, 'prev'))).toBe(false);
    else expect(readdirSync(join(base, 'prev', groupName(1)))).toEqual([...names].sort());
    expect(logger.record(event).sequence).toBe(1);
  });

  it.each([undefined, 1, 2])(
    'retains exactly the newest configured groups (%s), with duplicate IDs and clocks',
    (retention) => {
      const logger = new NdjsonSessionTelemetry(
        base,
        'same/id',
        clock,
        {},
        retention === undefined ? {} : { maxPreviousSessions: retention },
      );
      const originals: string[] = [];
      for (let index = 1; index <= 5; index += 1) {
        logger.record({ ...event, worldTick: index });
        originals.push(readFileSync(logger.getActiveLogPath(), 'utf8'));
        logger.startNewSession('same/id', clock);
      }
      const kept = retention ?? 3;
      expect(readdirSync(join(base, 'prev'))).toEqual(
        Array.from({ length: kept }, (_, index) => groupName(6 - kept + index)),
      );
      for (let sequence = 6 - kept; sequence <= 5; sequence += 1)
        expect(readFileSync(join(base, 'prev', groupName(sequence), activeName), 'utf8')).toBe(
          originals[sequence - 1],
        );
      expect(logger.record({ ...event, worldTick: 99 }).sequence).toBe(1);
      expect(logger.query()).toMatchObject([{ worldTick: 99 }]);
      expect(logger.query()).toHaveLength(1);
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity])(
    'rejects invalid retention %s before creating or rotating files',
    (maxPreviousSessions) => {
      writeFileSync(join(base, activeName), 'evidence');
      expect(
        () => new NdjsonSessionTelemetry(base, 'session', clock, {}, { maxPreviousSessions }),
      ).toThrow();
      expect(readdirSync(base)).toEqual([activeName]);
      expect(readFileSync(join(base, activeName), 'utf8')).toBe('evidence');
      const absent = join(base, 'absent');
      expect(
        () => new NdjsonSessionTelemetry(absent, 'session', clock, {}, { maxPreviousSessions }),
      ).toThrow();
      expect(existsSync(absent)).toBe(false);
    },
  );

  it('rejects blank session IDs before mutating storage', () => {
    writeFileSync(join(base, activeName), 'evidence');
    expect(() => new NdjsonSessionTelemetry(base, '   ', clock)).toThrow();
    expect(readdirSync(base)).toEqual([activeName]);
    expect(readFileSync(join(base, activeName), 'utf8')).toBe('evidence');
  });

  const failures = [
    'validate',
    'reserve',
    'move-active',
    'move-compacted',
    'create-active',
    'create-compacted',
    'finalize',
  ] as const;
  it.each(failures)(
    'preserves bytes and fails closed on explicit startup failure at %s',
    (transition) => {
      let armed = false;
      const fail = (): never => {
        throw Object.assign(new Error('injected private path'), { code: 'EIO' });
      };
      const ops: LocalFileOps = {
        ...nodeLocalFileOps,
        lstat: (path) => {
          if (armed && transition === 'validate' && path.endsWith(activeName)) fail();
          return nodeLocalFileOps.lstat(path);
        },
        mkdir: (path) => {
          if (armed && transition === 'reserve' && path.endsWith('.pending')) fail();
          nodeLocalFileOps.mkdir(path);
        },
        rename: (from, to) => {
          if (
            armed &&
            ((transition === 'move-active' && from.endsWith(activeName)) ||
              (transition === 'move-compacted' && from.endsWith(compactedName)) ||
              (transition === 'finalize' && from.endsWith('.pending')))
          )
            fail();
          nodeLocalFileOps.rename(from, to);
        },
        open: (path, flags) => {
          if (
            armed &&
            ((transition === 'create-active' && path.endsWith(activeName)) ||
              (transition === 'create-compacted' && path.endsWith(compactedName)))
          )
            fail();
          return nodeLocalFileOps.open(path, flags);
        },
      };
      const diagnostics: unknown[] = [];
      const logger = new NdjsonSessionTelemetry(
        base,
        'committed',
        clock,
        {},
        {
          fileOps: ops,
          maxPreviousSessions: 1,
          onDiagnostic: (value) => {
            diagnostics.push(value);
          },
        },
      );
      logger.record(event);
      logger.startNewSession('committed');
      logger.record({ ...event, worldTick: 2 });
      writeFileSync(logger.getCompactedLogPath(), 'old compacted malformed bytes');
      const oldActive = readFileSync(logger.getActiveLogPath(), 'utf8');
      const oldCompacted = readFileSync(logger.getCompactedLogPath(), 'utf8');
      armed = true;
      expect(() =>
        logger.startNewSession('uncommitted', fixedTelemetryClock('2026-11-07T00:00:00.000Z', 0)),
      ).toThrow(SessionStorageError);
      expect(logger.getSessionId()).toBe('committed');
      for (const attempt of [
        () => logger.record(event),
        () => logger.recordBatch([event]),
        () => logger.recordBatch([]),
        () => logger.compact(),
      ])
        expect(attempt).toThrow(TelemetryStorageUnavailableError);
      expect(existsSync(join(base, 'prev', groupName(1)))).toBe(true);
      const pending = join(base, 'prev', `${groupName(2)}.pending`);
      for (const [name, content] of [
        [activeName, oldActive],
        [compactedName, oldCompacted],
      ] as const) {
        const archived = join(pending, name);
        expect(readFileSync(existsSync(archived) ? archived : join(base, name), 'utf8')).toBe(
          content,
        );
      }
      const pendingContents = existsSync(pending)
        ? readdirSync(pending).map((name) => [name, readFileSync(join(pending, name), 'utf8')])
        : undefined;
      expect(JSON.stringify(diagnostics)).not.toContain(base);
      armed = false;
      logger.startNewSession('recovered');
      expect(logger.record(event)).toMatchObject({
        sessionId: 'recovered',
        sequence: 1,
        elapsedSessionMs: 10,
      });
      if (pendingContents !== undefined)
        expect(
          readdirSync(pending).map((name) => [name, readFileSync(join(pending, name), 'utf8')]),
        ).toEqual(pendingContents);
    },
  );

  it.each(failures)('constructor throws without discarding old bytes at %s', (transition) => {
    writeFileSync(join(base, activeName), 'old active');
    writeFileSync(join(base, compactedName), 'old compacted');
    const fail = (): never => {
      throw Object.assign(new Error('injected'), { code: 'EIO' });
    };
    const fileOps: LocalFileOps = {
      ...nodeLocalFileOps,
      lstat: (path) => {
        if (transition === 'validate' && path.endsWith(activeName)) fail();
        return nodeLocalFileOps.lstat(path);
      },
      mkdir: (path) => {
        if (transition === 'reserve' && path.endsWith('.pending')) fail();
        nodeLocalFileOps.mkdir(path);
      },
      rename: (from, to) => {
        if (
          (transition === 'move-active' && from.endsWith(activeName)) ||
          (transition === 'move-compacted' && from.endsWith(compactedName)) ||
          (transition === 'finalize' && from.endsWith('.pending'))
        )
          fail();
        nodeLocalFileOps.rename(from, to);
      },
      open: (path, flags) => {
        if (
          (transition === 'create-active' && path.endsWith(activeName)) ||
          (transition === 'create-compacted' && path.endsWith(compactedName))
        )
          fail();
        return nodeLocalFileOps.open(path, flags);
      },
    };
    expect(
      () =>
        new NdjsonSessionTelemetry(
          base,
          'failed',
          clock,
          {},
          { fileOps, onDiagnostic: () => undefined },
        ),
    ).toThrow(SessionStorageError);
    for (const [name, content] of [
      [activeName, 'old active'],
      [compactedName, 'old compacted'],
    ] as const) {
      const archived = join(base, 'prev', `${groupName(1)}.pending`, name);
      expect(readFileSync(existsSync(archived) ? archived : join(base, name), 'utf8')).toBe(
        content,
      );
    }
    const recovered = new NdjsonSessionTelemetry(base, 'recovered', clock);
    expect(recovered.record(event).sessionId).toBe('recovered');
  });

  it('keeps logging if pruning or the diagnostic callback fails and retries pruning later', () => {
    let failPrune = true;
    let reported = 0;
    const logger = new NdjsonSessionTelemetry(
      base,
      'first',
      clock,
      {},
      {
        maxPreviousSessions: 1,
        fileOps: {
          ...nodeLocalFileOps,
          unlink: (path) => {
            if (failPrune) throw Object.assign(new Error('denied'), { code: 'EACCES' });
            nodeLocalFileOps.unlink(path);
          },
        },
        onDiagnostic: () => {
          reported += 1;
          throw new Error('diagnostic failed');
        },
      },
    );
    logger.record(event);
    logger.startNewSession('second');
    logger.record(event);
    logger.startNewSession('third');
    expect(readdirSync(join(base, 'prev'))).toHaveLength(2);
    expect(logger.record(event).sessionId).toBe('third');
    expect(reported).toBeGreaterThan(0);
    failPrune = false;
    logger.startNewSession('fourth');
    expect(readdirSync(join(base, 'prev'))).toEqual([groupName(3)]);
  });

  it('leaves pending, unrelated and suspicious linked archive groups untouched', () => {
    const logger = new NdjsonSessionTelemetry(
      base,
      'first',
      clock,
      {},
      { maxPreviousSessions: 1, onDiagnostic: () => undefined },
    );
    mkdirSync(join(base, 'prev'));
    mkdirSync(join(base, 'prev', `${groupName(10)}.pending`));
    writeFileSync(join(base, 'prev', `${groupName(10)}.pending`, activeName), 'recover me');
    writeFileSync(join(base, 'prev', 'notes'), 'keep');
    const outside = join(base, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, activeName), 'sentinel');
    symlinkSync(outside, join(base, 'prev', groupName(11)), 'dir');
    mkdirSync(join(base, 'prev', groupName(12)));
    symlinkSync(join(outside, activeName), join(base, 'prev', groupName(12), activeName));
    logger.startNewSession('second');
    logger.startNewSession('third');
    expect(readFileSync(join(outside, activeName), 'utf8')).toBe('sentinel');
    expect(readFileSync(join(base, 'prev', `${groupName(10)}.pending`, activeName), 'utf8')).toBe(
      'recover me',
    );
    expect(readFileSync(join(base, 'prev', 'notes'), 'utf8')).toBe('keep');
    expect(existsSync(join(base, 'prev', groupName(11)))).toBe(true);
    expect(existsSync(join(base, 'prev', groupName(12)))).toBe(true);
    expect(existsSync(join(base, 'prev', groupName(14)))).toBe(true);
  });

  it('fails without mutation when the archive sequence is exhausted', () => {
    mkdirSync(join(base, 'prev'));
    mkdirSync(join(base, 'prev', `${groupName(Number.MAX_SAFE_INTEGER)}.pending`));
    writeFileSync(join(base, activeName), 'keep');
    expect(
      () => new NdjsonSessionTelemetry(base, 'next', clock, {}, { onDiagnostic: () => undefined }),
    ).toThrow(SessionStorageError);
    expect(readFileSync(join(base, activeName), 'utf8')).toBe('keep');
    expect(readdirSync(base).sort()).toEqual([activeName, 'prev']);
  });
  it.each(['active', 'compacted', 'prev', 'root', 'parent'])(
    'rejects a linked %s on startup without altering outside bytes',
    (position) => {
      const outside = join(base, 'outside');
      mkdirSync(outside);
      writeFileSync(join(outside, activeName), 'outside active');
      writeFileSync(join(outside, compactedName), 'outside compacted');
      const root = join(base, 'logs');
      let configuredRoot = root;
      if (position === 'root' || position === 'parent') {
        symlinkSync(outside, root, 'dir');
        if (position === 'parent') configuredRoot = join(root, 'nested');
      } else {
        mkdirSync(root);
        symlinkSync(
          position === 'prev'
            ? outside
            : join(outside, position === 'active' ? activeName : compactedName),
          join(
            root,
            position === 'prev' ? 'prev' : position === 'active' ? activeName : compactedName,
          ),
        );
      }
      expect(
        () =>
          new NdjsonSessionTelemetry(
            configuredRoot,
            'session',
            clock,
            {},
            { onDiagnostic: () => undefined },
          ),
      ).toThrow(SessionStorageError);
      expect(readFileSync(join(outside, activeName), 'utf8')).toBe('outside active');
      expect(readFileSync(join(outside, compactedName), 'utf8')).toBe('outside compacted');
      expect(readdirSync(outside)).toEqual([compactedName, activeName]);
    },
  );

  it('rejects log links inserted after startup on read, append and compact', () => {
    const logger = new NdjsonSessionTelemetry(base, 'session', clock);
    const outside = join(base, 'sentinel');
    writeFileSync(outside, 'keep');
    rmSync(logger.getActiveLogPath());
    symlinkSync(outside, logger.getActiveLogPath());
    expect(() => logger.record(event)).toThrow();
    expect(() => logger.query()).toThrow();
    expect(() => logger.compact()).toThrow();
    expect(readFileSync(outside, 'utf8')).toBe('keep');
    expect(readFileSync(logger.getCompactedLogPath(), 'utf8')).toBe('');
  });

  it('keeps both logs intact when the compaction temporary candidate is linked', () => {
    const logger = new NdjsonSessionTelemetry(
      base,
      'session',
      clock,
      {},
      { temporaryName: () => 'candidate.tmp' },
    );
    logger.record(event);
    const active = readFileSync(logger.getActiveLogPath(), 'utf8');
    const compacted = readFileSync(logger.getCompactedLogPath(), 'utf8');
    writeFileSync(join(base, 'sentinel'), 'keep');
    symlinkSync(join(base, 'sentinel'), join(base, 'candidate.tmp'));
    expect(() => logger.compact()).toThrow();
    expect(readFileSync(join(base, 'sentinel'), 'utf8')).toBe('keep');
    expect(readFileSync(logger.getActiveLogPath(), 'utf8')).toBe(active);
    expect(readFileSync(logger.getCompactedLogPath(), 'utf8')).toBe(compacted);
  });
  it('retries a partially pruned expired group without touching the newest retained group', () => {
    let failSecondUnlink = true;
    const diagnostics: unknown[] = [];
    const logger = new NdjsonSessionTelemetry(
      base,
      'first',
      clock,
      {},
      {
        maxPreviousSessions: 1,
        fileOps: {
          ...nodeLocalFileOps,
          unlink: (path) => {
            if (failSecondUnlink && path.endsWith(`${groupName(1)}/${compactedName}`))
              throw Object.assign(new Error('denied'), { code: 'EACCES' });
            nodeLocalFileOps.unlink(path);
          },
        },
        onDiagnostic: (diagnostic) => {
          diagnostics.push(diagnostic);
        },
      },
    );
    logger.record(event);
    writeFileSync(logger.getCompactedLogPath(), 'expired compacted evidence');
    logger.startNewSession('second');
    logger.record({ ...event, worldTick: 2 });
    const retained = readFileSync(logger.getActiveLogPath(), 'utf8');
    logger.startNewSession('third');
    expect(readFileSync(join(base, 'prev', groupName(1), compactedName), 'utf8')).toBe(
      'expired compacted evidence',
    );
    expect(existsSync(join(base, 'prev', groupName(1), activeName))).toBe(false);
    expect(readFileSync(join(base, 'prev', groupName(2), activeName), 'utf8')).toBe(retained);
    expect(readFileSync(join(base, 'prev', groupName(2), compactedName), 'utf8')).toBe('');
    expect(diagnostics).toContainEqual({
      operation: 'prune',
      path: `prev/${groupName(1)}`,
      code: 'EACCES',
    });
    expect(logger.record(event).sessionId).toBe('third');
    failSecondUnlink = false;
    logger.startNewSession('fourth');
    expect(readdirSync(join(base, 'prev'))).toEqual([groupName(3)]);
  });
});
