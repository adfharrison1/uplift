import {
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotEnvelope,
  SaveSlotEnvelopeSchema,
  type SaveSlotMetadata,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  SaveSlotWriteInputSchema,
  SeededRandom,
  validateSaveSlotId,
} from '../../domain/index.js';
import {
  createSafeLocalFiles,
  UnsafeLocalPathError,
  type LocalFileOptions,
  type SafeLocalFiles,
} from './safeLocalFiles.js';
import { safeParseJsonWithSchema } from '../telemetry/NdjsonSessionTelemetry.js';

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

  return {
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
}

function toMetadata(envelope: SaveSlotEnvelope): SaveSlotMetadata {
  return {
    slotId: envelope.slotId,
    schemaVersion: envelope.schemaVersion,
    epochId: envelope.epochId,
    packId: envelope.packId,
    packVersion: envelope.packVersion,
    worldTick: envelope.worldTick,
    savedAtIso: envelope.savedAtIso,
  };
}

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
    return structuredClone(stored);
  }

  public listSlots(): ReadonlyArray<SaveSlotMetadata> {
    return Array.from(this.slots.values())
      .map(toMetadata)
      .sort((a, b) => a.slotId.localeCompare(b.slotId));
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

    const result = safeParseJsonWithSchema(raw, SaveSlotEnvelopeSchema);
    if (!result.success || result.data.slotId !== safeId) {
      throw new Error(
        `Corrupted save slot '${safeId}': ${result.success ? 'mismatched slotId' : result.error.message}`,
      );
    }

    SeededRandom.fromState(result.data.rngState);
    return structuredClone(result.data);
  }

  public listSlots(): ReadonlyArray<SaveSlotMetadata> {
    const entries = this.files.list();
    const metadataList: SaveSlotMetadata[] = [];

    for (const fileName of entries) {
      if (!fileName.endsWith('.json')) {
        continue;
      }
      const candidateSlotId = fileName.slice(0, -'.json'.length);
      try {
        const envelope = this.loadSlot(candidateSlotId);
        metadataList.push(toMetadata(envelope));
      } catch (error) {
        if (error instanceof UnsafeLocalPathError) throw error;
        // Isolate corrupted files during directory listing so valid sessions remain accessible
      }
    }

    return metadataList.sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  public deleteSlot(slotId: string): boolean {
    const safeId = validateSaveSlotId(slotId);
    return this.files.removeFile(`${safeId}.json`);
  }
}
