/**
 * Epoch-agnostic Multi-Session Save / Load domain contracts (`src/domain/persistence/SaveSlotRepositoryPort.ts`).
 *
 * Pure TypeScript definitions and validation rules for saving, listing, loading, and deleting
 * named session snapshots across epochs.
 */

export const SAVE_SLOT_SCHEMA_VERSION = 1 as const;

const VALID_SLOT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * Validates that a `slotId` is a safe, non-empty alphanumeric/hyphen/underscore identifier
 * and cannot be used for path traversal (`..`, `/`, `\`, `%`, null bytes).
 */
export function validateSaveSlotId(slotId: string): string {
  if (!VALID_SLOT_ID_PATTERN.test(slotId)) {
    throw new Error(
      `Invalid save slot id '${slotId}': must match /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/`,
    );
  }
  return slotId;
}

export interface SaveSlotMetadata {
  readonly slotId: string;
  readonly schemaVersion: number;
  readonly epochId: string;
  readonly worldTick: number;
  readonly savedAtIso: string;
}

export interface SaveSlotEnvelope extends SaveSlotMetadata {
  readonly rngState: number;
  readonly stateSlices: Readonly<Record<string, unknown>>;
  readonly legacyState?: Readonly<Record<string, unknown>> | undefined;
}

export interface SaveSlotWriteInput {
  readonly slotId: string;
  readonly epochId: string;
  readonly worldTick: number;
  readonly rngState: number;
  readonly stateSlices: Readonly<Record<string, unknown>>;
  readonly legacyState?: Readonly<Record<string, unknown>> | undefined;
  readonly savedAtIso?: string | undefined;
}

/**
 * Domain port for multi-session save/load persistence.
 */
export interface SaveSlotRepositoryPort {
  saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope;
  loadSlot(slotId: string): SaveSlotEnvelope;
  listSlots(): ReadonlyArray<SaveSlotMetadata>;
  deleteSlot(slotId: string): boolean;
}
