/** Versioned, lossless world snapshot boundary. Custom slices and their versions remain separate. */
import { z } from 'zod';
import { StateSliceStore } from '../core/StateSliceRegistry.js';
import {
  DiscoveryLayerSchema,
  InertiaPillarKindSchema,
  PortalStateSchema,
  validateEntityId,
} from '../registries/EpochBlueprints.js';
import type { WorldState } from '../simulation/WorldState.js';

const NonEmptyString = z.string().min(1);
const NonNegativeInteger = z.number().int().nonnegative();
const ExactId = NonEmptyString.refine((id) => id === id.trim(), 'ID must not be trimmed');
const EntityIdSchema = z.string().superRefine((entityId, context) => {
  try {
    validateEntityId(entityId);
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid entity id',
    });
  }
});

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function copyPropState(value: unknown): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    throw new TypeError('Invalid prop state: expected a plain JSON record');
  }
  try {
    const copied = StateSliceStore.fromSnapshot({ 'prop.state': value }).toSnapshot()['prop.state'];
    if (!isPlainRecord(copied)) throw new TypeError('not a plain record');
    return copied;
  } catch (error) {
    throw new TypeError(`Invalid prop state: ${String(error)}`, { cause: error });
  }
}

const WaypointTargetSnapshotSchema = z.strictObject({
  waypointId: NonEmptyString,
  spaceId: NonEmptyString,
  position: z.tuple([z.number(), z.number(), z.number()]),
});

const PendingStimulusSnapshotSchema = z.strictObject({
  stimulusId: NonEmptyString,
  sourceEntityId: NonEmptyString,
  topic: NonEmptyString,
  cascadeHopCount: NonNegativeInteger,
  readyAtElapsedSeconds: z.number().nonnegative(),
  deliberationSeconds: z.number().nonnegative(),
  dwellSeconds: z.number().nonnegative(),
  cooldownSeconds: z.number().nonnegative(),
  requiresExternalTrigger: z.boolean(),
  externalRelease: z.boolean(),
});

const InertiaPillarSnapshotSchema = z.strictObject({
  id: ExactId,
  kind: InertiaPillarKindSchema,
  weight: z.number().nonnegative(),
  holderEntityId: ExactId.optional(),
});

const EntitySnapshotSchema = z.strictObject({
  entityId: EntityIdSchema,
  lineageId: NonEmptyString,
  spaceId: NonEmptyString,
  waypointId: NonEmptyString,
  position: z.tuple([z.number(), z.number(), z.number()]),
  yawRadians: z.number(),
  walkSpeedMetersPerSec: z.number().nonnegative(),
  yawSpeedRadiansPerSec: z.number().nonnegative(),
  cognitivePhase: z.enum([
    'idle',
    'deliberating',
    'moving',
    'performing_dwell',
    'cooldown',
    'awaiting_trigger',
  ]),
  phaseRemainingSeconds: z.number().nonnegative(),
  activeBehaviorId: NonEmptyString.optional(),
  pendingDwellSeconds: z.number().nonnegative(),
  pendingCooldownSeconds: z.number().nonnegative(),
  requiresExternalTrigger: z.boolean(),
  activePath: z.array(WaypointTargetSnapshotSchema),
  drives: z.record(z.string(), z.number().min(0).max(1)),
  emergencyVice: NonEmptyString,
  inertiaPillars: z.array(InertiaPillarSnapshotSchema),
  pendingStimuli: z.array(PendingStimulusSnapshotSchema),
  separationWeight: z.number().min(0).max(1).optional(),
});

const EntitiesSnapshotSchema = z
  .record(z.string(), EntitySnapshotSchema)
  .superRefine((entities, context) => {
    for (const [key, entity] of Object.entries(entities)) {
      try {
        validateEntityId(key);
      } catch (error) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: error instanceof Error ? error.message : 'Invalid entity id',
        });
      }
      if (key !== entity.entityId) {
        context.addIssue({
          code: 'custom',
          path: [key, 'entityId'],
          message: `Entity map key '${key}' does not match entityId '${entity.entityId}'`,
        });
      }
    }
  });

const PropSnapshotSchema = z
  .strictObject({
    propId: NonEmptyString,
    spaceId: NonEmptyString,
    waypointId: NonEmptyString,
    state: z.unknown(),
    portalState: PortalStateSchema.optional(),
  })
  .transform((prop) => ({ ...prop, state: copyPropState(prop.state) }));

const WorldFields = {
  epochId: NonEmptyString,
  worldTick: NonNegativeInteger,
  elapsedSimulationSeconds: z.number().nonnegative(),
  paused: z.boolean(),
  pacingConfig: z.strictObject({
    deliberationScale: z.number().nonnegative(),
    baseDigestionDelaySeconds: z.number().nonnegative(),
    cascadeBackoffFactor: z.number().positive(),
    maxAutonomousCascadeHops: NonNegativeInteger,
    maxCognitiveEvaluationsPerPulse: NonNegativeInteger,
    allowUnclampedFrameDt: z.boolean(),
  }),
  cognitiveRoundRobinCursor: NonNegativeInteger,
  entities: EntitiesSnapshotSchema,
  props: z.record(z.string(), PropSnapshotSchema),
  pressureStocks: z.strictObject({
    subsistence_pressure: z.number().min(0).max(1),
    production_pressure: z.number().min(0).max(1),
    elite_prestige_pressure: z.number().min(0).max(1),
  }),
  discoveryLayer: DiscoveryLayerSchema.nullable(),
  activeEmergencyId: NonEmptyString.nullable(),
  orbitalPass: z
    .strictObject({
      phase: z.enum(['zenith', 'horizon', 'occluded']),
      ticksInCurrentPhase: NonNegativeInteger,
      availableDelta: z.number().nonnegative(),
      maxDelta: z.number().nonnegative(),
      activeBurn: z.boolean(),
    })
    .refine((pass) => pass.availableDelta <= pass.maxDelta, {
      message: 'availableDelta exceeds maxDelta',
      path: ['availableDelta'],
    }),
  emittedAudioCues: z.array(
    z.strictObject({
      bus: z.enum(['groundside', 'lace']),
      cueId: NonEmptyString,
      loudness: z.number().min(0).max(1),
      sourceSpaceId: NonEmptyString,
      worldTick: NonNegativeInteger,
    }),
  ),
  recordedLegacyScars: z.array(
    z.strictObject({
      scarId: NonEmptyString,
      ledger: z.enum(['material', 'veil']),
      description: NonEmptyString,
      worldTick: NonNegativeInteger,
    }),
  ),
} as const;

const WorldStateInputSchema = z.strictObject({
  ...WorldFields,
  stateSlices: z.instanceof(StateSliceStore),
});
const VersionOneSchema = z.strictObject({ ...WorldFields, snapshotVersion: z.literal(1) });
const CurrentSnapshotSchema = z.strictObject({ ...WorldFields, snapshotVersion: z.literal(2) });
export type SerializedWorldStateSnapshot = z.infer<typeof CurrentSnapshotSchema>;

function ownJsonRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    throw new TypeError('Invalid WorldState snapshot JSON: expected a plain record');
  }
  try {
    const owned = StateSliceStore.fromSnapshot({ 'world.snapshot': value }).toSnapshot()[
      'world.snapshot'
    ];
    if (!isPlainRecord(owned)) throw new TypeError('not a plain record');
    return owned;
  } catch (error) {
    throw new TypeError(`Invalid WorldState snapshot JSON: ${String(error)}`, { cause: error });
  }
}

function ownJsonSnapshot(snapshot: SerializedWorldStateSnapshot): SerializedWorldStateSnapshot {
  return ownJsonRecord(snapshot) as SerializedWorldStateSnapshot;
}

function ownWorldFields(world: WorldState): {
  readonly fields: Readonly<Record<string, unknown>>;
  readonly stateSlices: StateSliceStore;
} {
  if (!isPlainRecord(world)) {
    throw new TypeError('Invalid WorldState snapshot JSON: expected a plain world record');
  }
  const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let stateSlices: StateSliceStore | undefined;
  for (const key of Reflect.ownKeys(world)) {
    if (typeof key !== 'string') {
      throw new TypeError('Invalid WorldState snapshot JSON: symbol root field');
    }
    const descriptor = Object.getOwnPropertyDescriptor(world, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(
        `Invalid WorldState snapshot JSON at ${key}: non-enumerable or accessor field`,
      );
    }
    if (key === 'stateSlices') {
      if (!(descriptor.value instanceof StateSliceStore)) {
        throw new TypeError('Invalid WorldState snapshot at stateSlices: expected a store');
      }
      stateSlices = descriptor.value;
    } else {
      Object.defineProperty(fields, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  if (stateSlices === undefined) {
    throw new TypeError('Invalid WorldState snapshot at stateSlices: missing store');
  }
  return { fields: ownJsonRecord(fields), stateSlices };
}

function parseSnapshot<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || '$';
    throw new TypeError(
      `Invalid WorldState snapshot at ${path}: ${issue?.message ?? 'unknown error'}`,
    );
  }
  return result.data;
}

/** Encodes exactly the world fields; state slices are stored in their own sidecars. */
export function encodeWorldState(world: WorldState): SerializedWorldStateSnapshot {
  const { fields, stateSlices } = ownWorldFields(world);
  const parsed = parseSnapshot(WorldStateInputSchema, { ...fields, stateSlices });
  const { stateSlices: _stateSlices, ...snapshotFields } = parsed;
  void _stateSlices;
  return ownJsonSnapshot(
    parseSnapshot(CurrentSnapshotSchema, { ...snapshotFields, snapshotVersion: 2 }),
  );
}

function migrateVersionOne(
  snapshot: z.infer<typeof VersionOneSchema>,
): SerializedWorldStateSnapshot {
  const { snapshotVersion: _version, ...fields } = snapshot;
  void _version;
  return parseSnapshot(CurrentSnapshotSchema, { ...fields, snapshotVersion: 2 });
}

/** Parses an untrusted inner snapshot and checks its epoch/tick against the outer envelope. */
export function decodeWorldStateSnapshot(
  input: unknown,
  expected: Pick<WorldState, 'epochId' | 'worldTick'>,
): SerializedWorldStateSnapshot {
  const safeInput = ownJsonRecord(input);
  const version = safeInput['snapshotVersion'];
  let snapshot: SerializedWorldStateSnapshot;
  if (version === 1) {
    snapshot = migrateVersionOne(parseSnapshot(VersionOneSchema, safeInput));
  } else if (version === 2) {
    snapshot = parseSnapshot(CurrentSnapshotSchema, safeInput);
  } else {
    throw new TypeError(`Invalid WorldState snapshot at snapshotVersion: ${String(version)}`);
  }
  if (snapshot.epochId !== expected.epochId) {
    throw new TypeError('Invalid WorldState snapshot at epochId: envelope mismatch');
  }
  if (snapshot.worldTick !== expected.worldTick) {
    throw new TypeError('Invalid WorldState snapshot at worldTick: envelope mismatch');
  }
  return ownJsonSnapshot(snapshot);
}
