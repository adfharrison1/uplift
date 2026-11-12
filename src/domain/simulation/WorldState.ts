/**
 * Immutable WorldState, SimulationPacingConfig, and WorldEffect domain schemas
 * (`src/domain/simulation/WorldState.ts`).
 *
 * Pure TypeScript + Zod contracts for the epoch-agnostic simulation state,
 * human-paced cognitive phases, anti-thundering-herd stimulus queues,
 * fast-eval pacing overrides, and discrete `WorldEffect` reducer commands.
 */
import { z } from 'zod';
import { StateSliceStore } from '../core/StateSliceRegistry.js';
import {
  DiscoveryLayerSchema,
  IllicitInstrumentTypeSchema,
  type InertiaPillar,
  OrbitalPassPhaseSchema,
  PortalStateSchema,
  PressureStockTypeSchema,
} from '../registries/EpochBlueprints.js';

export const CognitivePhaseSchema = z.enum([
  'idle',
  'deliberating',
  'moving',
  'performing_dwell',
  'cooldown',
  'awaiting_trigger',
]);
export type CognitivePhase = z.infer<typeof CognitivePhaseSchema>;

export const SimulationPacingConfigSchema = z.object({
  deliberationScale: z.number().nonnegative(),
  baseDigestionDelaySeconds: z.number().nonnegative(),
  cascadeBackoffFactor: z.number().positive(),
  maxAutonomousCascadeHops: z.number().int().nonnegative(),
  maxCognitiveEvaluationsPerPulse: z.number().int().nonnegative(),
  allowUnclampedFrameDt: z.boolean(),
});
export type SimulationPacingConfig = z.infer<typeof SimulationPacingConfigSchema>;

export const DEFAULT_GAMEPLAY_PACING_CONFIG: SimulationPacingConfig = Object.freeze({
  deliberationScale: 1.0,
  baseDigestionDelaySeconds: 5.0,
  cascadeBackoffFactor: 2.0,
  maxAutonomousCascadeHops: 2,
  maxCognitiveEvaluationsPerPulse: 1,
  allowUnclampedFrameDt: false,
});

export const FAST_EVAL_PACING_CONFIG: SimulationPacingConfig = Object.freeze({
  deliberationScale: 0.0,
  baseDigestionDelaySeconds: 0.0,
  cascadeBackoffFactor: 1.0,
  maxAutonomousCascadeHops: 32,
  maxCognitiveEvaluationsPerPulse: 64,
  allowUnclampedFrameDt: true,
});

export const WaypointTargetSchema = z.object({
  waypointId: z.string().trim().min(1),
  spaceId: z.string().trim().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]).readonly(),
});
export type WaypointTarget = z.infer<typeof WaypointTargetSchema>;

export const PendingStimulusSchema = z.object({
  stimulusId: z.string().trim().min(1),
  sourceEntityId: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  cascadeHopCount: z.number().int().nonnegative(),
  readyAtElapsedSeconds: z.number().nonnegative(),
  deliberationSeconds: z.number().nonnegative().default(5),
  dwellSeconds: z.number().nonnegative().default(10),
  cooldownSeconds: z.number().nonnegative().default(5),
  requiresExternalTrigger: z.boolean().default(false),
  externalRelease: z.boolean().default(false),
});
export type PendingStimulus = z.infer<typeof PendingStimulusSchema>;

export interface EntitySimulationState {
  readonly entityId: string;
  readonly lineageId: string;
  readonly spaceId: string;
  readonly waypointId: string;
  readonly position: readonly [number, number, number];
  readonly yawRadians: number;
  readonly walkSpeedMetersPerSec: number;
  readonly yawSpeedRadiansPerSec: number;
  readonly cognitivePhase: CognitivePhase;
  readonly phaseRemainingSeconds: number;
  readonly activeBehaviorId?: string | undefined;
  readonly pendingDwellSeconds: number;
  readonly pendingCooldownSeconds: number;
  readonly requiresExternalTrigger: boolean;
  readonly activePath: ReadonlyArray<WaypointTarget>;
  readonly drives: Readonly<Record<string, number>>;
  readonly emergencyVice: string;
  readonly inertiaPillars: ReadonlyArray<InertiaPillar>;
  readonly pendingStimuli: ReadonlyArray<PendingStimulus>;
  /** Omitted means `1` (personal space). `0` keeps packed authored spacing. */
  readonly separationWeight?: number | undefined;
}

export interface PropSimulationState {
  readonly propId: string;
  readonly spaceId: string;
  readonly waypointId: string;
  readonly state: Readonly<Record<string, unknown>>;
  readonly portalState?: 'open' | 'ajar' | 'closed' | 'barred' | undefined;
}

export interface PressureStocksState {
  readonly subsistence_pressure: number;
  readonly production_pressure: number;
  readonly elite_prestige_pressure: number;
}

export interface OrbitalPassRuntimeState {
  readonly phase: 'zenith' | 'horizon' | 'occluded';
  readonly ticksInCurrentPhase: number;
  readonly availableDelta: number;
  readonly maxDelta: number;
  readonly activeBurn: boolean;
}

export interface EmittedAudioCue {
  readonly bus: 'groundside' | 'lace';
  readonly cueId: string;
  readonly loudness: number;
  readonly sourceSpaceId: string;
  readonly worldTick: number;
}

export interface RecordedLegacyScar {
  readonly scarId: string;
  readonly ledger: 'material' | 'veil';
  readonly description: string;
  readonly worldTick: number;
}

export interface WorldState {
  readonly epochId: string;
  readonly worldTick: number;
  readonly elapsedSimulationSeconds: number;
  readonly paused: boolean;
  readonly pacingConfig: SimulationPacingConfig;
  readonly cognitiveRoundRobinCursor: number;
  readonly entities: Readonly<Record<string, EntitySimulationState>>;
  readonly props: Readonly<Record<string, PropSimulationState>>;
  readonly pressureStocks: PressureStocksState;
  readonly discoveryLayer: 'noticed' | 'assayed' | 'attributed' | 'theorized' | null;
  readonly activeEmergencyId: string | null;
  readonly orbitalPass: OrbitalPassRuntimeState;
  readonly emittedAudioCues: ReadonlyArray<EmittedAudioCue>;
  readonly recordedLegacyScars: ReadonlyArray<RecordedLegacyScar>;
  readonly stateSlices: StateSliceStore;
}

export const WorldEffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move_entity_to_waypoint'),
    entityId: z.string().trim().min(1),
    path: z.array(WaypointTargetSchema).min(1).readonly(),
  }),
  z.object({
    type: z.literal('set_separation_weight'),
    entityId: z.string().trim().min(1),
    weight: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal('set_cognitive_phase'),
    entityId: z.string().trim().min(1),
    phase: CognitivePhaseSchema,
    durationSeconds: z.number().nonnegative().default(0),
    behaviorId: z.string().trim().min(1).optional(),
    dwellSeconds: z.number().nonnegative().optional(),
    cooldownSeconds: z.number().nonnegative().optional(),
    requiresExternalTrigger: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('enqueue_npc_stimulus'),
    targetEntityId: z.string().trim().min(1),
    stimulusId: z.string().trim().min(1),
    sourceEntityId: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    cascadeHopCount: z.number().int().nonnegative(),
    deliberationSeconds: z.number().nonnegative().default(5),
    dwellSeconds: z.number().nonnegative().default(10),
    cooldownSeconds: z.number().nonnegative().default(5),
    requiresExternalTrigger: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('release_external_trigger'),
    entityId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('update_prop_state'),
    propId: z.string().trim().min(1),
    patch: z.record(z.string(), z.unknown()),
    portalState: PortalStateSchema.optional(),
  }),
  z.object({
    type: z.literal('adjust_pressure_stock'),
    stock: PressureStockTypeSchema,
    delta: z.number(),
  }),
  z.object({
    type: z.literal('insert_illicit_instrument'),
    instrument: IllicitInstrumentTypeSchema,
    intensity: z.number().positive(),
    scarId: z.string().trim().min(1).optional(),
    scarDescription: z.string().trim().min(1).optional(),
  }),
  z.object({
    type: z.literal('set_discovery_layer'),
    layer: DiscoveryLayerSchema.nullable(),
  }),
  z.object({
    type: z.literal('collapse_inertia_pillar'),
    entityId: z.string().trim().min(1),
    pillarId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('trigger_emergency'),
    emergencyId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('compound_emergency_vices'),
    delta: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal('resolve_emergency'),
  }),
  z.object({
    type: z.literal('advance_orbital_pass'),
    phase: OrbitalPassPhaseSchema,
    deltaRegen: z.number().nonnegative().default(0),
  }),
  z.object({
    type: z.literal('spend_orbital_delta'),
    mode: z.enum(['slingshot', 'burn']),
    cost: z.number().positive(),
  }),
  z.object({
    type: z.literal('emit_audio_cue'),
    bus: z.enum(['groundside', 'lace']),
    cueId: z.string().trim().min(1),
    loudness: z.number().min(0).max(1),
    sourceSpaceId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('record_legacy_scar'),
    scarId: z.string().trim().min(1),
    ledger: z.enum(['material', 'veil']),
    description: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('set_state_slice'),
    sliceId: z.string().trim().min(1),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('set_paused'),
    paused: z.boolean(),
  }),
]);
export type WorldEffect = z.infer<typeof WorldEffectSchema>;

function clonePacingConfig(config: SimulationPacingConfig): SimulationPacingConfig {
  const validated = SimulationPacingConfigSchema.parse(config);
  return Object.freeze({ ...validated });
}

export function createInitialWorldState(options: {
  readonly epochId: string;
  readonly entities?: Readonly<Record<string, EntitySimulationState>>;
  readonly props?: Readonly<Record<string, PropSimulationState>>;
  readonly pacingConfig?: SimulationPacingConfig;
  readonly maxOrbitalDelta?: number;
  readonly stateSlices?: StateSliceStore;
}): WorldState {
  const maxDelta = options.maxOrbitalDelta ?? 100;
  return {
    epochId: options.epochId,
    worldTick: 0,
    elapsedSimulationSeconds: 0,
    paused: false,
    pacingConfig: clonePacingConfig(options.pacingConfig ?? DEFAULT_GAMEPLAY_PACING_CONFIG),
    cognitiveRoundRobinCursor: 0,
    entities: options.entities ? structuredClone(options.entities) : {},
    props: options.props ? structuredClone(options.props) : {},
    pressureStocks: {
      subsistence_pressure: 0,
      production_pressure: 0,
      elite_prestige_pressure: 0,
    },
    discoveryLayer: null,
    activeEmergencyId: null,
    orbitalPass: {
      phase: 'zenith',
      ticksInCurrentPhase: 0,
      availableDelta: maxDelta,
      maxDelta,
      activeBurn: false,
    },
    emittedAudioCues: [],
    recordedLegacyScars: [],
    stateSlices: options.stateSlices ?? new StateSliceStore(),
  };
}
