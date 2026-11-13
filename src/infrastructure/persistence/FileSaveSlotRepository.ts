import {
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotEnvelope,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  SaveSlotWriteInputSchema,
  SeededRandom,
  validateSaveSlotId,
} from '../../domain/index.js';
import { inspectSaveSlotEnvelope } from '../../domain/persistence/SaveSlotRepositoryPort.js';
import { z } from 'zod';
import {
  createSafeLocalFiles,
  type LocalFileOptions,
  type SafeLocalFiles,
} from './safeLocalFiles.js';
import { safeParseJsonWithSchema } from '../telemetry/NdjsonSessionTelemetry.js';

/** A valid outer save request whose nested contents fail repository inspection. */
export class InvalidSaveSlotInputError extends Error {}

function buildValidatedEnvelope(input: SaveSlotWriteInput): SaveSlotEnvelope {
  const slotId = validateSaveSlotId(input.slotId);
  const parsed = SaveSlotWriteInputSchema.safeParse(input);
  if (!parsed.success) {
    // Preserve RangeError for invalid worldTick or rngState so callers/tests get consistent error types
    if (!Number.isInteger(input.worldTick) || input.worldTick < 0) {
      throw new RangeError(
        `SaveSlotWriteInput.worldTick must be a non-negative integer, received: ${String(input.worldTick)}`,
      );
    }
    SeededRandom.fromState(input.rngState);
    throw new Error(`Invalid SaveSlotWriteInput for '${slotId}': ${parsed.error.message}`);
  }

  const data = parsed.data;
  SeededRandom.fromState(data.rngState);

  const envelope: SaveSlotEnvelope = {
    slotId: data.slotId,
    schemaVersion: SAVE_SLOT_SCHEMA_VERSION,
    epochId: data.epochId,
    packId: data.packId,
    packVersion: data.packVersion,
    worldTick: data.worldTick,
    savedAtIso: data.savedAtIso ?? new Date().toISOString(),
    rngState: data.rngState,
    stateSlices: structuredClone(data.stateSlices),
    ...(data.legacyState !== undefined ? { legacyState: structuredClone(data.legacyState) } : {}),
  };
  const inspected = inspectSaveSlotEnvelope(envelope, slotId);
  if (inspected.envelope === undefined) {
    throw new InvalidSaveSlotInputError(
      `Invalid SaveSlotWriteInput for '${slotId}': ${inspected.listing.readable ? 'unknown' : inspected.listing.reason}`,
    );
  }
  return inspected.envelope;
}

type ListEntry = ReturnType<SaveSlotRepositoryPort['listSlots']>[number];
type ExpectedIdentity = Parameters<SaveSlotRepositoryPort['listSlots']>[0];

/**
 * Fast in-memory implementation of `SaveSlotRepositoryPort` for unit and headless simulation tests.
 */
export class InMemorySaveSlotRepository implements SaveSlotRepositoryPort {
  private readonly slots = new Map<string, SaveSlotEnvelope>();

  public saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope {
    const envelope = buildValidatedEnvelope(input);
    this.slots.set(envelope.slotId, structuredClone(envelope));
    return structuredClone(envelope);
  }

  public loadSlot(slotId: string): SaveSlotEnvelope {
    const safeId = validateSaveSlotId(slotId);
    const stored = this.slots.get(safeId);
    if (stored === undefined) {
      throw new Error(`Save slot '${safeId}' does not exist`);
    }
    const inspected = inspectSaveSlotEnvelope(stored, safeId);
    if (inspected.envelope === undefined) {
      throw new Error(
        `Corrupted save slot '${safeId}': ${inspected.error?.message ?? (inspected.listing.readable ? 'unknown' : inspected.listing.reason)}`,
      );
    }
    return structuredClone(inspected.envelope);
  }

  public listSlots(expectedIdentity?: ExpectedIdentity): ReadonlyArray<ListEntry> {
    return Array.from(this.slots.values())
      .map(
        (envelope) => inspectSaveSlotEnvelope(envelope, envelope.slotId, expectedIdentity).listing,
      )
      .sort((a, b) => (a.slotId < b.slotId ? -1 : a.slotId > b.slotId ? 1 : 0));
  }

  public deleteSlot(slotId: string): boolean {
    const safeId = validateSaveSlotId(slotId);
    return this.slots.delete(safeId);
  }
}

/**
 * Disk-backed multi-session save/load repository storing `<savesDir>/<slotId>.json`
 * with strict path-traversal guards, Zod `safeParse` validation, and atomic `.tmp` rename writes.
 */
export class FileSaveSlotRepository implements SaveSlotRepositoryPort {
  private readonly savesDir: string;
  private readonly files: SafeLocalFiles;

  public constructor(savesDir: string, options: LocalFileOptions = {}) {
    this.savesDir = savesDir;
    this.files = createSafeLocalFiles(savesDir, options);
    this.files.ensureDirectory();
  }

  public getSavesDir(): string {
    return this.savesDir;
  }

  public saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope {
    const envelope = buildValidatedEnvelope(input);
    const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
    this.files.writeAtomic(`${envelope.slotId}.json`, serialized);

    return envelope;
  }

  public loadSlot(slotId: string): SaveSlotEnvelope {
    const safeId = validateSaveSlotId(slotId);
    const raw = this.files.read(`${safeId}.json`);
    if (raw === undefined) {
      throw new Error(`Save slot '${safeId}' does not exist`);
    }

    const result = safeParseJsonWithSchema(raw, z.unknown());
    if (!result.success) throw new Error(`Corrupted save slot '${safeId}': invalid_json`);
    const inspected = inspectSaveSlotEnvelope(result.data, safeId);
    if (inspected.envelope === undefined) {
      throw new Error(
        `Corrupted save slot '${safeId}': ${inspected.error?.message ?? (inspected.listing.readable ? 'unknown' : inspected.listing.reason)}`,
      );
    }
    return structuredClone(inspected.envelope);
  }

  public listSlots(expectedIdentity?: ExpectedIdentity): ReadonlyArray<ListEntry> {
    const entries = this.files.list();
    const results: ListEntry[] = [];

    for (const fileName of entries) {
      if (!fileName.endsWith('.json')) {
        continue;
      }
      const candidateSlotId = fileName.slice(0, -'.json'.length);
      try {
        validateSaveSlotId(candidateSlotId);
      } catch {
        continue;
      }
      const raw = this.files.read(fileName);
      if (raw === undefined) continue;
      const parsed = safeParseJsonWithSchema(raw, z.unknown());
      results.push(
        parsed.success
          ? inspectSaveSlotEnvelope(parsed.data, candidateSlotId, expectedIdentity).listing
          : { slotId: candidateSlotId, readable: false, reason: 'invalid_json' },
      );
    }

    return results.sort((a, b) => (a.slotId < b.slotId ? -1 : a.slotId > b.slotId ? 1 : 0));
  }

  public deleteSlot(slotId: string): boolean {
    const safeId = validateSaveSlotId(slotId);
    return this.files.removeFile(`${safeId}.json`);
  }
}
