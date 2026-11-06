/**
 * Dual-Ledger CivilizationLegacyState & Deterministic Lineage Mutator
 * (`src/domain/legacy/CivilizationLegacyState.ts`).
 *
 * Tracks Material Scars (economic, institutional, communications backbone) separately from
 * Veil Scars (epistemic, religious, anachronistic relics, rival alien footprints) and applies
 * ordered, conflict-checked `LineageMutation` rules across historical Epochs.
 */
import { z } from 'zod';
import {
  type CharacterBlueprint,
  CharacterBlueprintSchema,
} from '../registries/EpochBlueprints.js';

const NonEmptyStringSchema = z.string().trim().min(1);

export const InheritedScarSchema = z.object({
  scarId: NonEmptyStringSchema,
  ledger: z.enum(['material', 'veil']),
  description: NonEmptyStringSchema,
  originEpochId: NonEmptyStringSchema,
});
export type InheritedScar = z.infer<typeof InheritedScarSchema>;

export const LineageMutationTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('drive'),
    key: NonEmptyStringSchema,
  }),
  z.object({
    kind: z.literal('inertia_weight'),
    pillarId: NonEmptyStringSchema,
  }),
]);
export type LineageMutationTarget = z.infer<typeof LineageMutationTargetSchema>;

export const LineageMutationSchema = z
  .discriminatedUnion('strategy', [
    z.object({
      lineageId: NonEmptyStringSchema,
      sourceScarId: NonEmptyStringSchema,
      target: LineageMutationTargetSchema,
      strategy: z.literal('add'),
      delta: z.number(),
    }),
    z.object({
      lineageId: NonEmptyStringSchema,
      sourceScarId: NonEmptyStringSchema,
      target: LineageMutationTargetSchema,
      strategy: z.literal('multiply'),
      factor: z.number().nonnegative(),
    }),
    z.object({
      lineageId: NonEmptyStringSchema,
      sourceScarId: NonEmptyStringSchema,
      target: LineageMutationTargetSchema,
      strategy: z.literal('clamp'),
      min: z.number(),
      max: z.number(),
    }),
    z.object({
      lineageId: NonEmptyStringSchema,
      sourceScarId: NonEmptyStringSchema,
      target: LineageMutationTargetSchema,
      strategy: z.literal('override'),
      value: z.number(),
    }),
  ])
  .refine(
    (m) => (m.strategy === 'clamp' ? m.min <= m.max : true),
    'LineageMutation clamp min must be <= max',
  );
export type LineageMutation = z.infer<typeof LineageMutationSchema>;

export const CivilizationLegacyStateSchema = z
  .object({
    sourceEpochId: NonEmptyStringSchema,
    materialScars: z.array(InheritedScarSchema).readonly(),
    veilScars: z.array(InheritedScarSchema).readonly(),
    communicationsBackboneControllerId: NonEmptyStringSchema.optional(),
    lineageMutations: z.array(LineageMutationSchema).readonly(),
  })
  .superRefine((val, ctx) => {
    const seenScarIds = new Set<string>();
    for (const scar of val.materialScars) {
      if (scar.ledger !== 'material') {
        ctx.addIssue({
          code: 'custom',
          message: `Material scar '${scar.scarId}' must have ledger: 'material'`,
        });
      }
      if (seenScarIds.has(scar.scarId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate scarId '${scar.scarId}' in CivilizationLegacyState`,
        });
      }
      seenScarIds.add(scar.scarId);
    }
    for (const scar of val.veilScars) {
      if (scar.ledger !== 'veil') {
        ctx.addIssue({
          code: 'custom',
          message: `Veil scar '${scar.scarId}' must have ledger: 'veil'`,
        });
      }
      if (seenScarIds.has(scar.scarId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate scarId '${scar.scarId}' in CivilizationLegacyState`,
        });
      }
      seenScarIds.add(scar.scarId);
    }
  });
export type CivilizationLegacyState = z.infer<typeof CivilizationLegacyStateSchema>;

/**
 * Creates a validated `CivilizationLegacyState` instance.
 */
export function createCivilizationLegacyState(
  input: CivilizationLegacyState,
): CivilizationLegacyState {
  return CivilizationLegacyStateSchema.parse(input);
}

/**
 * Appends an `InheritedScar` to the appropriate ledger (`material` or `veil`) immutably.
 * Idempotent if a scar with the same `scarId` already exists in either ledger.
 */
export function recordScarInLegacyState(
  legacyState: CivilizationLegacyState,
  scar: InheritedScar,
): CivilizationLegacyState {
  const validatedScar = InheritedScarSchema.parse(scar);
  const alreadyPresent =
    legacyState.materialScars.some((s) => s.scarId === validatedScar.scarId) ||
    legacyState.veilScars.some((s) => s.scarId === validatedScar.scarId);
  if (alreadyPresent) {
    return legacyState;
  }
  if (validatedScar.ledger === 'material') {
    return createCivilizationLegacyState({
      ...legacyState,
      materialScars: [...legacyState.materialScars, validatedScar],
    });
  }
  return createCivilizationLegacyState({
    ...legacyState,
    veilScars: [...legacyState.veilScars, validatedScar],
  });
}

export interface RecordedLegacyScarInput {
  readonly scarId: string;
  readonly ledger: 'material' | 'veil';
  readonly description: string;
  readonly originEpochId?: string | undefined;
  readonly worldTick?: number | undefined;
}

/**
 * Builds a Dual-Ledger `CivilizationLegacyState` by partitioning in-epoch recorded scars
 * (`WorldState.recordedLegacyScars`) into `materialScars` and `veilScars`.
 */
export function civilizationLegacyFromRecordedScars(input: {
  readonly sourceEpochId: string;
  readonly recordedScars: ReadonlyArray<RecordedLegacyScarInput>;
  readonly communicationsBackboneControllerId?: string | undefined;
  readonly lineageMutations?: ReadonlyArray<LineageMutation> | undefined;
}): CivilizationLegacyState {
  const materialScars: InheritedScar[] = [];
  const veilScars: InheritedScar[] = [];
  const seenIds = new Set<string>();

  for (const rawScar of input.recordedScars) {
    if (seenIds.has(rawScar.scarId)) {
      continue;
    }
    seenIds.add(rawScar.scarId);
    const scar: InheritedScar = {
      scarId: rawScar.scarId,
      ledger: rawScar.ledger,
      description: rawScar.description,
      originEpochId: rawScar.originEpochId ?? input.sourceEpochId,
    };
    if (scar.ledger === 'material') {
      materialScars.push(scar);
    } else {
      veilScars.push(scar);
    }
  }

  return createCivilizationLegacyState({
    sourceEpochId: input.sourceEpochId,
    materialScars,
    veilScars,
    ...(input.communicationsBackboneControllerId !== undefined
      ? {
          communicationsBackboneControllerId: input.communicationsBackboneControllerId,
        }
      : {}),
    lineageMutations: input.lineageMutations ?? [],
  });
}

/**
 * Serializes `CivilizationLegacyState` into a cloned plain record suitable for `SaveSlotEnvelope.legacyState`.
 */
export function legacyStateToRecord(
  legacyState: CivilizationLegacyState,
): Readonly<Record<string, unknown>> {
  const validated = CivilizationLegacyStateSchema.parse(legacyState);
  return structuredClone(validated) as Record<string, unknown>;
}

/**
 * Restores and validates a `CivilizationLegacyState` from a `SaveSlotEnvelope.legacyState` record.
 */
export function parseLegacyState(raw: Readonly<Record<string, unknown>>): CivilizationLegacyState {
  return CivilizationLegacyStateSchema.parse(raw);
}

function targetKey(target: LineageMutationTarget): string {
  return target.kind === 'drive' ? `drive:${target.key}` : `inertia_weight:${target.pillarId}`;
}

function applyArithmeticStrategy(current: number, mutation: LineageMutation): number {
  switch (mutation.strategy) {
    case 'add':
      return current + mutation.delta;
    case 'multiply':
      return current * mutation.factor;
    case 'clamp':
      return Math.min(mutation.max, Math.max(mutation.min, current));
    case 'override':
      return mutation.value;
  }
}

/**
 * Applies ordered, composable `LineageMutation` rules from `legacyState` to successor
 * `CharacterBlueprint` definitions matching `lineageId`.
 *
 * - Rejects multiple `override` mutations targeting the same `(lineageId, target)`.
 * - Rejects mutations targeting unknown drive keys or unknown inertia pillar IDs.
 * - Enforces final drive bounds `[0, 1]` and inertia pillar weights `>= 0`.
 * - Leaves unrelated lineages completely untouched.
 */
export function applyLegacyToCharacterBlueprints(
  blueprints: ReadonlyArray<CharacterBlueprint>,
  legacyState: CivilizationLegacyState,
): ReadonlyArray<CharacterBlueprint> {
  const validatedLegacy = CivilizationLegacyStateSchema.parse(legacyState);
  if (validatedLegacy.lineageMutations.length === 0) {
    return [...blueprints];
  }

  const mutationsByLineage = new Map<string, LineageMutation[]>();
  for (const mutation of validatedLegacy.lineageMutations) {
    const existing = mutationsByLineage.get(mutation.lineageId);
    if (existing === undefined) {
      mutationsByLineage.set(mutation.lineageId, [mutation]);
    } else {
      existing.push(mutation);
    }
  }

  // Check for conflicting override mutations per (lineageId, target)
  for (const [lineageId, mutations] of mutationsByLineage.entries()) {
    const overrideOwners = new Map<string, string>();
    for (const mutation of mutations) {
      if (mutation.strategy !== 'override') {
        continue;
      }
      const tKey = targetKey(mutation.target);
      const priorScar = overrideOwners.get(tKey);
      if (priorScar !== undefined) {
        throw new Error(
          `Conflicting override mutations on lineage '${lineageId}' target '${tKey}' from scars '${priorScar}' and '${mutation.sourceScarId}'`,
        );
      }
      overrideOwners.set(tKey, mutation.sourceScarId);
    }
  }

  return blueprints.map((blueprint) => {
    const mutations = mutationsByLineage.get(blueprint.lineageId);
    if (mutations === undefined || mutations.length === 0) {
      return blueprint;
    }

    const nextDrives: Record<string, number> = { ...blueprint.drives };
    const nextPillars = blueprint.inertiaPillars.map((p) => ({ ...p }));

    for (const mutation of mutations) {
      if (mutation.target.kind === 'drive') {
        const driveKey = mutation.target.key;
        if (!Object.hasOwn(nextDrives, driveKey)) {
          throw new Error(
            `LineageMutation from scar '${mutation.sourceScarId}' targets unknown drive '${driveKey}' on lineage '${blueprint.lineageId}'`,
          );
        }
        const currentVal = nextDrives[driveKey];
        if (currentVal === undefined) {
          throw new Error(
            `LineageMutation from scar '${mutation.sourceScarId}' targets unknown drive '${driveKey}' on lineage '${blueprint.lineageId}'`,
          );
        }
        nextDrives[driveKey] = applyArithmeticStrategy(currentVal, mutation);
      } else {
        const pillarId = mutation.target.pillarId;
        const pillarIndex = nextPillars.findIndex((p) => p.id === pillarId);
        const pillar = nextPillars[pillarIndex];
        if (pillarIndex === -1 || pillar === undefined) {
          throw new Error(
            `LineageMutation from scar '${mutation.sourceScarId}' targets unknown inertiaPillar '${pillarId}' on lineage '${blueprint.lineageId}'`,
          );
        }
        nextPillars[pillarIndex] = {
          ...pillar,
          weight: applyArithmeticStrategy(pillar.weight, mutation),
        };
      }
    }

    for (const [driveKey, finalVal] of Object.entries(nextDrives)) {
      if (!Number.isFinite(finalVal) || finalVal < 0 || finalVal > 1) {
        throw new Error(
          `LineageMutation out of bounds on lineage '${blueprint.lineageId}' drive '${driveKey}': final value ${String(finalVal)} must be in [0, 1]`,
        );
      }
    }

    for (const pillar of nextPillars) {
      if (!Number.isFinite(pillar.weight) || pillar.weight < 0) {
        throw new Error(
          `LineageMutation out of bounds on lineage '${blueprint.lineageId}' pillar '${pillar.id}': final weight ${String(pillar.weight)} must be >= 0`,
        );
      }
    }

    return CharacterBlueprintSchema.parse({
      ...blueprint,
      drives: nextDrives,
      inertiaPillars: nextPillars,
    });
  });
}
