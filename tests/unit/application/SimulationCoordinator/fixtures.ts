import {
  createCivilizationLegacyState,
  type CivilizationLegacyState,
  type LineageMutation,
  type TelemetryClock,
  type TelemetryEntry,
  type TelemetryEventInput,
} from '../../../../src/domain/index.js';
import { InMemorySessionTelemetry } from '../../../../src/infrastructure/index.js';

export function createClock(): TelemetryClock {
  let elapsed = 0;
  return {
    nowIso(): string {
      return '2026-11-06T21:30:00.000Z';
    },
    elapsedSessionMs(): number {
      elapsed += 16;
      return elapsed;
    },
  };
}

export function legacyWithMutations(
  lineageMutations: ReadonlyArray<LineageMutation>,
): CivilizationLegacyState {
  return createCivilizationLegacyState({
    sourceEpochId: 'epoch_0',
    materialScars: [],
    veilScars: [],
    lineageMutations,
  });
}

export class FaultingLegacyTelemetry extends InMemorySessionTelemetry {
  public readonly failedWarningAttempts = new Set<number>();
  public warningAttempts = 0;
  public failNextLoadRecord = false;

  public override record(event: TelemetryEventInput): TelemetryEntry {
    if (event.action === 'legacy_drive_clamped') {
      this.warningAttempts += 1;
      if (this.failedWarningAttempts.has(this.warningAttempts)) {
        throw new Error(`warning write ${String(this.warningAttempts)} failed`);
      }
    }
    if (event.action === 'load_slot' && this.failNextLoadRecord) {
      this.failNextLoadRecord = false;
      throw new Error('load_slot record failed');
    }
    return super.record(event);
  }
}

export const driveTarget = { kind: 'drive', key: 'curiosity' } as const;
export const highLegacy = legacyWithMutations([
  {
    lineageId: 'lineage_alpha',
    sourceScarId: 'scar_high',
    target: driveTarget,
    strategy: 'add',
    delta: 0.75,
  },
]);
