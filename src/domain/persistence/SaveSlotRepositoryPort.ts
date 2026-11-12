/**
 * Epoch-agnostic Multi-Session Save / Load domain contracts (`src/domain/persistence/SaveSlotRepositoryPort.ts`).
 *
 * Pure TypeScript + Zod definitions and validation rules for saving, listing, loading, and deleting
 * named session snapshots across epochs.
 */
import { z } from 'zod';
import { StateSliceStore } from '../core/StateSliceRegistry.js';
import { parseLegacyState } from '../legacy/CivilizationLegacyState.js';
import { decodeWorldStateSnapshot } from './WorldStateCodec.js';

export const SAVE_SLOT_SCHEMA_VERSION = 2 as const;

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
const PackIdSchema = z
  .string()
  .min(1)
  .refine((id) => id === id.trim(), 'packId must not be padded');
const PackVersionSchema = z.number().int().positive();

export const SaveSlotMetadataSchema = z.object({
  slotId: SaveSlotIdSchema,
  schemaVersion: z.literal(SAVE_SLOT_SCHEMA_VERSION),
  epochId: z.string().trim().min(1),
  packId: PackIdSchema,
  packVersion: PackVersionSchema,
  worldTick: z.number().int().nonnegative(),
  savedAtIso: z.string().trim().min(1),
});
export type SaveSlotMetadata = z.infer<typeof SaveSlotMetadataSchema>;
const SaveSlotHeaderSchema = SaveSlotMetadataSchema.extend({ rngState: RngStateSchema });

export const SaveSlotEnvelopeSchema = SaveSlotMetadataSchema.extend({
  rngState: RngStateSchema,
  stateSlices: z.record(z.string(), z.unknown()),
  legacyState: z.record(z.string(), z.unknown()).optional(),
});
export type SaveSlotEnvelope = z.infer<typeof SaveSlotEnvelopeSchema>;

export const SaveSlotWriteInputSchema = z.object({
  slotId: SaveSlotIdSchema,
  epochId: z.string().trim().min(1),
  packId: PackIdSchema,
  packVersion: PackVersionSchema,
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
  listSlots(
    expectedIdentity?: Pick<SaveSlotMetadata, 'epochId' | 'packId' | 'packVersion'>,
  ): ReadonlyArray<
    | (SaveSlotMetadata & { readonly readable: true })
    | {
        readonly slotId: string;
        readonly readable: false;
        readonly reason:
          | 'invalid_json'
          | 'unsupported_schema'
          | 'missing_identity'
          | 'invalid_envelope'
          | 'invalid_snapshot'
          | 'invalid_slices'
          | 'invalid_legacy_state'
          | 'epoch_mismatch'
          | 'pack_mismatch'
          | 'pack_version_mismatch';
      }
  >;
  deleteSlot(slotId: string): boolean;
}

type ListEntry = ReturnType<SaveSlotRepositoryPort['listSlots']>[number];
type ExpectedIdentity = Pick<SaveSlotMetadata, 'epochId' | 'packId' | 'packVersion'>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function unreadable(
  slotId: string,
  reason: Extract<ListEntry, { readonly readable: false }>['reason'],
): ListEntry {
  return { slotId, readable: false, reason };
}

/** Shared repository-level checks; registered slice schemas remain the coordinator's authority. */
export function inspectSaveSlotEnvelope(
  input: unknown,
  slotId: string,
  expectedIdentity?: ExpectedIdentity,
): {
  readonly listing: ListEntry;
  readonly envelope: SaveSlotEnvelope | undefined;
  readonly error: Error | undefined;
} {
  const fail = (
    reason: Extract<ListEntry, { readonly readable: false }>['reason'],
    error?: unknown,
  ) => ({
    listing: unreadable(slotId, reason),
    envelope: undefined,
    error: error instanceof Error ? error : undefined,
  });
  if (!isRecord(input)) return fail('invalid_envelope');
  if (input['schemaVersion'] !== SAVE_SLOT_SCHEMA_VERSION) return fail('unsupported_schema');
  if (!Object.hasOwn(input, 'packId') || !Object.hasOwn(input, 'packVersion')) {
    return fail('missing_identity');
  }
  const header = SaveSlotHeaderSchema.safeParse(input);
  if (!header.success || header.data.slotId !== slotId) return fail('invalid_envelope');

  const slices = input['stateSlices'];
  if (!isRecord(slices)) return fail('invalid_slices');
  try {
    decodeWorldStateSnapshot(slices['__upliftWorldStateSnapshot'], {
      epochId: header.data.epochId,
      worldTick: header.data.worldTick,
    });
  } catch (error) {
    return fail('invalid_snapshot', error);
  }
  try {
    StateSliceStore.fromSnapshot(slices);
    const custom = Object.hasOwn(slices, '__upliftCustomSlicesSnapshot')
      ? slices['__upliftCustomSlicesSnapshot']
      : {};
    const versions = slices['__upliftCustomSliceVersions'];
    if (Object.hasOwn(slices, '__upliftCustomSliceVersions') && versions === undefined) {
      return fail('invalid_slices');
    }
    StateSliceStore.fromSnapshot(custom, undefined, versions);
  } catch (error) {
    return fail('invalid_slices', error);
  }
  if (Object.hasOwn(input, 'legacyState')) {
    try {
      StateSliceStore.fromSnapshot({ legacy: input['legacyState'] });
      if (!isRecord(input['legacyState'])) return fail('invalid_legacy_state');
      parseLegacyState(input['legacyState']);
    } catch (error) {
      return fail('invalid_legacy_state', error);
    }
  }
  const parsed = SaveSlotEnvelopeSchema.safeParse(input);
  if (!parsed.success) return fail('invalid_envelope');
  const envelope = parsed.data;
  if (expectedIdentity !== undefined) {
    if (envelope.epochId !== expectedIdentity.epochId) return fail('epoch_mismatch');
    if (envelope.packId !== expectedIdentity.packId) return fail('pack_mismatch');
    if (envelope.packVersion !== expectedIdentity.packVersion) return fail('pack_version_mismatch');
  }
  const { rngState: _rngState, ...metadata } = header.data;
  void _rngState;
  return {
    listing: { ...metadata, readable: true },
    envelope,
    error: undefined,
  };
}
