import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  TelemetryLevel,
  TelemetryQueryFilter,
  TelemetryStreamRecord,
} from '../../domain/index.js';
import {
  ACTIVE_SESSION_LOG_FILENAME,
  COMPACTED_SESSION_LOG_FILENAME,
  matchesTelemetryFilter,
  parseNdjsonLines,
  sortTelemetryRecords,
} from '../../infrastructure/index.js';

export interface ParsedLogQueryCliArgs {
  readonly logsDir: string;
  readonly filter: TelemetryQueryFilter;
}

const VALID_LEVELS: ReadonlySet<string> = new Set(['info', 'warn', 'error', 'crash']);
const KNOWN_FLAGS = [
  '--logs-dir',
  '--level',
  '--category',
  '--actor',
  '--actor-id',
  '--actee',
  '--actee-id',
  '--action',
  '--min-tick',
  '--max-tick',
  '--has-ai-reasoning',
] as const;

function requireFlagValue(flag: string, nextVal: string | undefined): string {
  if (nextVal === undefined || nextVal.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return nextVal;
}

/**
 * Parses CLI arguments for `npm run logs:query`.
 * Rejects unknown flags, missing flag values, invalid levels, and inverted tick ranges.
 */
export function parseQueryCliArgs(
  argv: ReadonlyArray<string>,
  defaultLogsDir: string = resolve(process.cwd(), 'logs'),
): ParsedLogQueryCliArgs {
  let logsDir = defaultLogsDir;
  let level: TelemetryLevel | undefined;
  let category: string | undefined;
  let actorId: string | undefined;
  let acteeId: string | undefined;
  let action: string | undefined;
  let minTick: number | undefined;
  let maxTick: number | undefined;
  let hasAiReasoning: boolean | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const nextVal = argv[i + 1];

    switch (arg) {
      case '--logs-dir': {
        logsDir = resolve(requireFlagValue(arg, nextVal));
        i += 1;
        break;
      }
      case '--level': {
        if (nextVal === undefined || !VALID_LEVELS.has(nextVal)) {
          throw new Error(
            `Invalid --level '${String(nextVal)}': expected info, warn, error, or crash`,
          );
        }
        level = nextVal as TelemetryLevel;
        i += 1;
        break;
      }
      case '--category': {
        category = requireFlagValue(arg, nextVal);
        i += 1;
        break;
      }
      case '--actor':
      case '--actor-id': {
        actorId = requireFlagValue(arg, nextVal);
        i += 1;
        break;
      }
      case '--actee':
      case '--actee-id': {
        acteeId = requireFlagValue(arg, nextVal);
        i += 1;
        break;
      }
      case '--action': {
        action = requireFlagValue(arg, nextVal);
        i += 1;
        break;
      }
      case '--min-tick': {
        const parsedMin = Number(nextVal);
        if (nextVal === undefined || !Number.isInteger(parsedMin)) {
          throw new Error(`Invalid --min-tick '${String(nextVal)}': expected integer`);
        }
        minTick = parsedMin;
        i += 1;
        break;
      }
      case '--max-tick': {
        const parsedMax = Number(nextVal);
        if (nextVal === undefined || !Number.isInteger(parsedMax)) {
          throw new Error(`Invalid --max-tick '${String(nextVal)}': expected integer`);
        }
        maxTick = parsedMax;
        i += 1;
        break;
      }
      case '--has-ai-reasoning': {
        if (nextVal === 'true' || nextVal === 'false') {
          hasAiReasoning = nextVal === 'true';
          i += 1;
        } else {
          hasAiReasoning = true;
        }
        break;
      }
      default: {
        throw new Error(
          `Unknown log query flag '${arg}'. Expected one of: ${KNOWN_FLAGS.join(', ')}`,
        );
      }
    }
  }

  if (minTick !== undefined && maxTick !== undefined && minTick > maxTick) {
    throw new Error(
      `Invalid tick range: --min-tick ${String(minTick)} is greater than --max-tick ${String(maxTick)}`,
    );
  }

  const filter: TelemetryQueryFilter = {
    ...(level !== undefined ? { level } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(actorId !== undefined ? { actorId } : {}),
    ...(acteeId !== undefined ? { acteeId } : {}),
    ...(action !== undefined ? { action } : {}),
    ...(minTick !== undefined ? { minTick } : {}),
    ...(maxTick !== undefined ? { maxTick } : {}),
    ...(hasAiReasoning !== undefined ? { hasAiReasoning } : {}),
  };

  return {
    logsDir,
    filter,
  };
}

/**
 * Reads `./logs/current-session.compacted.jsonl` and `./logs/current-session.jsonl` without modifying
 * them on disk, returning all matching records in chronological order.
 */
export function executeLogQuery(
  logsDir: string,
  filter?: TelemetryQueryFilter,
): ReadonlyArray<TelemetryStreamRecord> {
  const compactedPath = join(logsDir, COMPACTED_SESSION_LOG_FILENAME);
  const activePath = join(logsDir, ACTIVE_SESSION_LOG_FILENAME);

  const compactedRecords = existsSync(compactedPath)
    ? parseNdjsonLines(readFileSync(compactedPath, 'utf8'))
    : [];
  const activeRecords = existsSync(activePath)
    ? parseNdjsonLines(readFileSync(activePath, 'utf8'))
    : [];

  const combined = sortTelemetryRecords([...compactedRecords, ...activeRecords]);
  return combined.filter((record) => matchesTelemetryFilter(record, filter));
}

const entryArg = process.argv[1];
if (entryArg !== undefined && import.meta.url === pathToFileURL(entryArg).href) {
  const { logsDir, filter } = parseQueryCliArgs(process.argv.slice(2));
  const results = executeLogQuery(logsDir, filter);
  for (const record of results) {
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }
}
