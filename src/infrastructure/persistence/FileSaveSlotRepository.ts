import {
  existsSync,
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
  type SaveSlotMetadata,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  SeededRandom,
  validateSaveSlotId,
} from '../../domain/index.js';

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildValidatedEnvelope(input: SaveSlotWriteInput): SaveSlotEnvelope {
  const slotId = validateSaveSlotId(input.slotId);
  const epochId = input.epochId.trim();
  if (epochId.length === 0) {
    throw new Error('SaveSlotWriteInput.epochId must be a non-empty string');
  }
  if (!Number.isInteger(input.worldTick) || input.worldTick < 0) {
    throw new RangeError(
      `SaveSlotWriteInput.worldTick must be a non-negative integer, received: ${String(input.worldTick)}`,
    );
  }
  // Validates rngState is in [1, 2^32 - 1]
  SeededRandom.fromState(input.rngState);

  if (!isPlainRecord(input.stateSlices)) {
    throw new Error('SaveSlotWriteInput.stateSlices must be a plain object');
  }
  if (input.legacyState !== undefined && !isPlainRecord(input.legacyState)) {
    throw new Error('SaveSlotWriteInput.legacyState must be a plain object when provided');
  }

  const savedAtIso = input.savedAtIso ?? new Date().toISOString();

  const envelope: SaveSlotEnvelope = {
    slotId,
    schemaVersion: SAVE_SLOT_SCHEMA_VERSION,
    epochId,
    worldTick: input.worldTick,
    savedAtIso,
    rngState: input.rngState,
    stateSlices: structuredClone(input.stateSlices),
    ...(input.legacyState !== undefined ? { legacyState: structuredClone(input.legacyState) } : {}),
  };

  return envelope;
}

function validateLoadedEnvelope(expectedSlotId: string, parsed: unknown): SaveSlotEnvelope {
  if (!isPlainRecord(parsed)) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': root JSON value is not an object`);
  }

  const slotId = parsed['slotId'];
  const schemaVersion = parsed['schemaVersion'];
  const epochId = parsed['epochId'];
  const worldTick = parsed['worldTick'];
  const savedAtIso = parsed['savedAtIso'];
  const rngState = parsed['rngState'];
  const stateSlices = parsed['stateSlices'];
  const legacyState = parsed['legacyState'];

  if (slotId !== expectedSlotId) {
    throw new Error(
      `Corrupted save slot '${expectedSlotId}': mismatched slotId '${String(slotId)}'`,
    );
  }
  if (schemaVersion !== SAVE_SLOT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported save slot schemaVersion '${String(schemaVersion)}' in '${expectedSlotId}'`,
    );
  }
  if (typeof epochId !== 'string' || epochId.trim().length === 0) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid epochId`);
  }
  if (typeof worldTick !== 'number' || !Number.isInteger(worldTick) || worldTick < 0) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid worldTick`);
  }
  if (typeof savedAtIso !== 'string' || savedAtIso.trim().length === 0) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid savedAtIso`);
  }
  if (typeof rngState !== 'number') {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid rngState`);
  }
  SeededRandom.fromState(rngState);

  if (!isPlainRecord(stateSlices)) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid stateSlices`);
  }
  if (legacyState !== undefined && !isPlainRecord(legacyState)) {
    throw new Error(`Corrupted save slot '${expectedSlotId}': invalid legacyState`);
  }

  return {
    slotId: expectedSlotId,
    schemaVersion: SAVE_SLOT_SCHEMA_VERSION,
    epochId,
    worldTick,
    savedAtIso,
    rngState,
    stateSlices: structuredClone(stateSlices),
    ...(legacyState !== undefined ? { legacyState: structuredClone(legacyState) } : {}),
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
 * with strict path-traversal guards and atomic `.tmp` rename writes.
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

    let parsed: unknown;
    try {
      const raw = readFileSync(targetPath, 'utf8');
      parsed = JSON.parse(raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Corrupted save slot '${safeId}': invalid JSON (${detail})`, {
        cause: error,
      });
    }

    return validateLoadedEnvelope(safeId, parsed);
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
    return resolvedTarget;
  }
}
