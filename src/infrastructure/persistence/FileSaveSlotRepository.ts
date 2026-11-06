import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
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

  public constructor(savesDir: string) {
    this.savesDir = savesDir;
    mkdirSync(this.savesDir, { recursive: true });
  }

  public getSavesDir(): string {
    return this.savesDir;
  }

  public saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope {
    const envelope = buildValidatedEnvelope(input);
    const targetPath = this.resolveSafeSlotPath(envelope.slotId);
    const tmpPath = `${targetPath}.tmp`;

    const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
    writeFileSync(tmpPath, serialized, 'utf8');
    renameSync(tmpPath, targetPath);

    return envelope;
  }

  public loadSlot(slotId: string): SaveSlotEnvelope {
    const safeId = validateSaveSlotId(slotId);
    const targetPath = this.resolveSafeSlotPath(safeId);
    if (!existsSync(targetPath)) {
      throw new Error(`Save slot '${safeId}' does not exist`);
    }

    const raw = readFileSync(targetPath, 'utf8');
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
    if (!existsSync(this.savesDir)) {
      return [];
    }
    const entries = readdirSync(this.savesDir);
    const metadataList: SaveSlotMetadata[] = [];

    for (const fileName of entries) {
      if (!fileName.endsWith('.json')) {
        continue;
      }
      const candidateSlotId = fileName.slice(0, -'.json'.length);
      try {
        const envelope = this.loadSlot(candidateSlotId);
        metadataList.push(toMetadata(envelope));
      } catch {
        // Isolate corrupted files during directory listing so valid sessions remain accessible
      }
    }

    return metadataList.sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  public deleteSlot(slotId: string): boolean {
    const safeId = validateSaveSlotId(slotId);
    const targetPath = this.resolveSafeSlotPath(safeId);
    if (!existsSync(targetPath)) {
      return false;
    }
    unlinkSync(targetPath);
    return true;
  }

  private resolveSafeSlotPath(slotId: string): string {
    const safeId = validateSaveSlotId(slotId);
    mkdirSync(this.savesDir, { recursive: true });
    const realRoot = realpathSync(this.savesDir);
    const resolvedTarget = resolve(realRoot, `${safeId}.json`);
    const rel = relative(realRoot, resolvedTarget);

    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Save slot path escaped saves root: '${slotId}'`);
    }
    if (existsSync(resolvedTarget)) {
      const stat = lstatSync(resolvedTarget);
      if (stat.isSymbolicLink()) {
        throw new Error(`Save slot '${safeId}' is a symbolic link and was refused`);
      }
      const realTarget = realpathSync(resolvedTarget);
      const realRel = relative(realRoot, realTarget);
      if (realRel.startsWith('..') || isAbsolute(realRel)) {
        throw new Error(`Save slot path escaped saves root: '${slotId}'`);
      }
    }
    return resolvedTarget;
  }
}
