import { describe, expect, it } from 'vitest';
import {
  isHighSignalTelemetryEntry,
  PRESERVED_TELEMETRY_CATEGORIES,
  SAVE_SLOT_SCHEMA_VERSION,
  type TelemetryEntry,
  validateSaveSlotId,
} from '../../../src/domain/index.js';

function makeSampleEntry(overrides: Partial<TelemetryEntry> = {}): TelemetryEntry {
  return {
    recordType: 'event',
    sessionId: 'session-01',
    sequence: 1,
    timestampIso: '2026-11-06T12:00:00.000Z',
    elapsedSessionMs: 1500,
    epochId: 'era_1_highglass_hold',
    worldTick: 4,
    level: 'info',
    category: 'routine',
    actorId: 'npc.guard_01',
    action: 'patrol_waypoint',
    message: 'Guard stepped to courtyard waypoint',
    ...overrides,
  };
}

describe('Domain Telemetry & Save Slot Contracts', () => {
  it('classifies routine info entries as compactable and preserves high-signal categories, warn/error/crash, and AI reasoning', () => {
    const routineInfo = makeSampleEntry();
    expect(isHighSignalTelemetryEntry(routineInfo)).toBe(false);

    for (const level of ['warn', 'error', 'crash'] as const) {
      expect(isHighSignalTelemetryEntry(makeSampleEntry({ level }))).toBe(true);
    }

    for (const category of PRESERVED_TELEMETRY_CATEGORIES) {
      expect(isHighSignalTelemetryEntry(makeSampleEntry({ category }))).toBe(true);
    }

    const withAiReasoning = makeSampleEntry({
      category: 'routine',
      aiReasoning: {
        pipeline: 'advisory_duel',
        inputSummary: 'Evaluate bullion drop',
        outputSummary: 'The Lamp objects to bread inflation',
        candidateScores: [{ id: 'warn_inflation', score: 0.91 }],
        selectedReason: 'Subsistence pressure threshold exceeded',
        omittedClauses: ['The Ending withheld casualty variance clause'],
      },
    });
    expect(isHighSignalTelemetryEntry(withAiReasoning)).toBe(true);
  });

  it('validates safe alphanumeric/hyphen/underscore save slot IDs and rejects path traversal strings', () => {
    expect(SAVE_SLOT_SCHEMA_VERSION).toBe(1);
    expect(validateSaveSlotId('slot-alpha_01')).toBe('slot-alpha_01');
    expect(validateSaveSlotId('era1-before-martyrdom')).toBe('era1-before-martyrdom');

    const invalidIds = [
      '',
      '   ',
      '../secret',
      '../../etc/passwd',
      '..%2F..%2Fetc%2Fpasswd',
      'slot/with/slash',
      'slot\\with\\backslash',
      '.hidden',
      '-leading-dash',
      'a'.repeat(65),
    ];

    for (const badId of invalidIds) {
      expect(() => validateSaveSlotId(badId)).toThrow(/Invalid save slot id/);
    }
  });
});
