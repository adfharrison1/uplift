/**
 * Epoch-agnostic Multi-Session Save / Load domain contracts (`src/domain/persistence/SaveSlotRepositoryPort.ts`).
 *
 * Pure TypeScript + Zod definitions and validation rules for saving, listing, loading, and deleting
 * named session snapshots across epochs.
 */
import { z } from 'zod';

export const SAVE_SLOT_SCHEMA_VERSION = 1 as const;

const VALID_SLOT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const UINT32_MAX = 0xffff_ffff;

export const SaveSlotIdSchema = z
  .string()
  .regex(VALID_SLOT_ID_PATTERN, 'Must match /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/');

/**
 * Validates that a `slotId` is a safe, non-empty alphanumeric/hyphen/underscore identifier
 * and cannot be used for path traversal (`..`, `/`, `\`, `%`, null bytes).
 */
export function validateSaveSlotId(slotId: string): string {
  const result = SaveSlotIdSchema.safeParse(slotId);
  if (!result.success) {
    throw new Error(
      `Invalid save slot id '${slotId}': must match /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/`,
    );
  }
  return result.data;
}

export const RngStateSchema = z.number().int().min(1).max(UINT32_MAX);

export const SaveSlotMetadataSchema = z.object({
  slotId: SaveSlotIdSchema,
  schemaVersion: z.literal(SAVE_SLOT_SCHEMA_VERSION),
  epochId: z.string().trim().min(1),
  worldTick: z.number().int().nonnegative(),
  savedAtIso: z.string().trim().min(1),
});
export type SaveSlotMetadata = z.infer<typeof SaveSlotMetadataSchema>;

export const SaveSlotEnvelopeSchema = SaveSlotMetadataSchema.extend({
  rngState: RngStateSchema,
  stateSlices: z.record(z.string(), z.unknown()),
  legacyState: z.record(z.string(), z.unknown()).optional(),
});
export type SaveSlotEnvelope = z.infer<typeof SaveSlotEnvelopeSchema>;

export const SaveSlotWriteInputSchema = z.object({
  slotId: SaveSlotIdSchema,
  epochId: z.string().trim().min(1),
  worldTick: z.number().int().nonnegative(),
  rngState: RngStateSchema,
  stateSlices: z.record(z.string(), z.unknown()),
  legacyState: z.record(z.string(), z.unknown()).optional(),
  savedAtIso: z.string().trim().min(1).optional(),
});
export type SaveSlotWriteInput = z.infer<typeof SaveSlotWriteInputSchema>;

/**
 * Domain port for multi-session save/load persistence.
 */
export interface SaveSlotRepositoryPort {
  saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope;
  loadSlot(slotId: string): SaveSlotEnvelope;
  listSlots(): ReadonlyArray<SaveSlotMetadata>;
  deleteSlot(slotId: string): boolean;
}
