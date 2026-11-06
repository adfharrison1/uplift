import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NdjsonSessionTelemetry } from '../../../src/infrastructure/index.js';
import { executeLogQuery, parseQueryCliArgs } from '../../../src/interfaces/index.js';

describe('queryLogs CLI and executeLogQuery', () => {
  let tempLogsDir: string;

  beforeEach(() => {
    tempLogsDir = mkdtempSync(join(tmpdir(), 'uplift-query-cli-test-'));
  });

  afterEach(() => {
    rmSync(tempLogsDir, { recursive: true, force: true });
  });

  it('parses CLI flags accurately and rejects invalid levels or non-integer tick bounds', () => {
    const parsed = parseQueryCliArgs([
      '--logs-dir',
      tempLogsDir,
      '--level',
      'warn',
      '--category',
      'rival',
      '--actor',
      'rival.the_quiet',
      '--actee',
      'npc.sorrel',
      '--action',
      'delete_overview_rumor',
      '--min-tick',
      '5',
      '--max-tick',
      '20',
      '--has-ai-reasoning',
      'true',
    ]);

    expect(parsed.logsDir).toBe(tempLogsDir);
    expect(parsed.filter).toEqual({
      level: 'warn',
      category: 'rival',
      actorId: 'rival.the_quiet',
      acteeId: 'npc.sorrel',
      action: 'delete_overview_rumor',
      minTick: 5,
      maxTick: 20,
      hasAiReasoning: true,
    });

    expect(() => parseQueryCliArgs(['--level', 'invalid'])).toThrow(/Invalid --level/);
    expect(() => parseQueryCliArgs(['--min-tick', 'abc'])).toThrow(/Invalid --min-tick/);
    expect(() => parseQueryCliArgs(['--max-tick', '1.5'])).toThrow(/Invalid --max-tick/);
    expect(() => parseQueryCliArgs(['--actorr', 'typo'])).toThrow(/Unknown log query flag/);
    expect(() => parseQueryCliArgs(['--actor'])).toThrow(/Missing value for --actor/);
    expect(() => parseQueryCliArgs(['--min-tick', '10', '--max-tick', '5'])).toThrow(
      /Invalid tick range/,
    );
  });

  it('queries across both compacted and active session logs without overwriting existing files', () => {
    let elapsed = 1000;
    const clock = {
      nowIso: () => '2026-11-06T12:00:00.000Z',
      elapsedSessionMs: () => elapsed,
    };

    const logger = new NdjsonSessionTelemetry(tempLogsDir, 'session-cli', clock);

    elapsed = 1000;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 1,
      level: 'info',
      category: 'routine',
      actorId: 'npc.guard_01',
      action: 'patrol',
      message: 'Guard patrol 1',
    });

    elapsed = 2000;
    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 2,
      level: 'warn',
      category: 'martyrdom',
      actorId: 'npc.pell',
      acteeId: 'npc.sorrel',
      action: 'volunteer_vigil',
      aiReasoning: {
        pipeline: 'utility_ai',
        inputSummary: 'Evaluate vigil substitution',
        outputSummary: 'Pell steps forward to lead vigil',
        candidateScores: [{ id: 'volunteer_vigil', score: 0.88 }],
        selectedReason: 'High spectacle drive',
      },
      message: 'Pell volunteered to take Sorrel place at the vigil',
    });

    elapsed = 10_000;
    logger.compact(2000);

    logger.record({
      epochId: 'era_1_highglass_hold',
      worldTick: 10,
      level: 'info',
      category: 'player',
      actorId: 'player.deme',
      action: 'inspect_desk',
      message: 'Inspected writing desk in chambers',
    });

    const all = executeLogQuery(tempLogsDir);
    expect(all).toHaveLength(3);

    const aiOnly = executeLogQuery(tempLogsDir, {
      actorId: 'npc.pell',
      hasAiReasoning: true,
    });
    expect(aiOnly).toHaveLength(1);
    expect(aiOnly[0]?.action).toBe('volunteer_vigil');

    // Re-running executeLogQuery does not wipe or alter the existing logs
    expect(executeLogQuery(tempLogsDir)).toHaveLength(3);
  });
});
