/**
 * Epoch-agnostic Plug-and-Play Module Blueprints (`src/domain/registries/EpochBlueprints.ts`).
 *
 * Defines Zod-validated declarative contracts for Spaces, Waypoints, Props, Characters,
 * Contested Offices, Quiet Claims, Economy/Discovery enums, Rival Civilizations,
 * Trajectory Threads, Correspondence Channels, Emergency States, Orbital Pass rules,
 * and human-paced Behaviors. Contains zero epoch-specific lore or 3D presentation imports.
 */
import { z } from 'zod';

const NonEmptyIdSchema = z.string().trim().min(1);

export const SurfaceMaterialSchema = z.enum(['mud', 'stone', 'wood', 'metal', 'earth']);
export type SurfaceMaterial = z.infer<typeof SurfaceMaterialSchema>;

export const AcousticClassSchema = z.enum([
  'tight_interior',
  'live_interior',
  'open_court',
  'basin',
  'off_stage',
]);
export type AcousticClass = z.infer<typeof AcousticClassSchema>;

export const SpaceKindSchema = z.enum(['indoor_room', 'outdoor_area', 'off_stage_region']);
export type SpaceKind = z.infer<typeof SpaceKindSchema>;

export const WaypointBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  position: z.tuple([z.number(), z.number(), z.number()]).readonly(),
});
export type WaypointBlueprint = z.infer<typeof WaypointBlueprintSchema>;

export const SpaceNodeBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  kind: SpaceKindSchema,
  earshotRadiusMeters: z.number().nonnegative(),
  surfaceMaterial: SurfaceMaterialSchema,
  acousticClass: AcousticClassSchema,
  ambientMaskLoudness: z.number().min(0).max(1),
  connectedSpaceIds: z.array(NonEmptyIdSchema).readonly(),
  waypoints: z.array(WaypointBlueprintSchema).readonly(),
});
export type SpaceNodeBlueprint = z.infer<typeof SpaceNodeBlueprintSchema>;

export const PortalStateSchema = z.enum(['open', 'ajar', 'closed', 'barred']);
export type PortalState = z.infer<typeof PortalStateSchema>;

export const PropTierSchema = z.enum(['interactive', 'static']);
export type PropTier = z.infer<typeof PropTierSchema>;

export const PropBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  spaceId: NonEmptyIdSchema,
  waypointId: NonEmptyIdSchema,
  tier: PropTierSchema,
  initialState: z.record(z.string(), z.unknown()),
  portalState: PortalStateSchema.optional(),
});
export type PropBlueprint = z.infer<typeof PropBlueprintSchema>;

export const InertiaPillarKindSchema = z.enum([
  'doctrine',
  'constituency',
  'debt',
  'temper',
  'ignorance',
]);
export type InertiaPillarKind = z.infer<typeof InertiaPillarKindSchema>;

export const InertiaPillarSchema = z.object({
  id: NonEmptyIdSchema,
  kind: InertiaPillarKindSchema,
  weight: z.number().min(0),
  holderEntityId: NonEmptyIdSchema.optional(),
});
export type InertiaPillar = z.infer<typeof InertiaPillarSchema>;

export const AcousticBiasSchema = z.enum(['transient', 'low', 'gap']);
export type AcousticBias = z.infer<typeof AcousticBiasSchema>;

export const CharacterTierSchema = z.enum(['utility_schemer', 'role_routine', 'ambient_crowd']);
export type CharacterTier = z.infer<typeof CharacterTierSchema>;

export const CharacterBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  lineageId: NonEmptyIdSchema,
  tier: CharacterTierSchema,
  startingSpaceId: NonEmptyIdSchema,
  startingWaypointId: NonEmptyIdSchema,
  walkSpeedMetersPerSec: z.number().nonnegative().default(1.4),
  yawSpeedRadiansPerSec: z.number().nonnegative().default(6.0),
  listenerThreshold: z.number().min(0).max(1).default(0.2),
  acousticBias: AcousticBiasSchema.optional(),
  drives: z.record(z.string(), z.number().min(0).max(1)),
  emergencyVice: NonEmptyIdSchema,
  inertiaPillars: z.array(InertiaPillarSchema).readonly(),
});
export type CharacterBlueprint = z.infer<typeof CharacterBlueprintSchema>;

export const PretextKindSchema = z.enum([
  'medical_quarantine',
  'ideological_censure',
  'technical_audit',
  'monetary_assay',
  'protocol_immunity',
]);
export type PretextKind = z.infer<typeof PretextKindSchema>;

export const OfficeBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  institutionalLineageId: NonEmptyIdSchema,
  patronEntityId: NonEmptyIdSchema.optional(),
  pretextFamilies: z.array(PretextKindSchema).readonly(),
  stipendPerTick: z.number().nonnegative(),
  exposureRiskModifier: z.number().nonnegative(),
});
export type OfficeBlueprint = z.infer<typeof OfficeBlueprintSchema>;

export const QuietClaimBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  targetEntityId: NonEmptyIdSchema,
  unlockedPretext: PretextKindSchema,
  exposurePenalty: z.number().nonnegative(),
});
export type QuietClaimBlueprint = z.infer<typeof QuietClaimBlueprintSchema>;

export const IllicitInstrumentTypeSchema = z.enum([
  'unbacked_mass_commodity',
  'forged_fiat_instrument',
  'anachronistic_marvel',
]);
export type IllicitInstrumentType = z.infer<typeof IllicitInstrumentTypeSchema>;

export const PressureStockTypeSchema = z.enum([
  'subsistence_pressure',
  'production_pressure',
  'elite_prestige_pressure',
]);
export type PressureStockType = z.infer<typeof PressureStockTypeSchema>;

export const DiscoveryLayerSchema = z.enum(['noticed', 'assayed', 'attributed', 'theorized']);
export type DiscoveryLayer = z.infer<typeof DiscoveryLayerSchema>;

export const RivalSpoofModeSchema = z.enum(['round_numbers', 'deletion', 'early_surplus']);
export type RivalSpoofMode = z.infer<typeof RivalSpoofModeSchema>;

export const RivalCivBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  doctrineSummary: NonEmptyIdSchema,
  orbitalOffsetTicks: z.number().int().nonnegative(),
  spoofMode: RivalSpoofModeSchema,
  coverEntityId: NonEmptyIdSchema.optional(),
});
export type RivalCivBlueprint = z.infer<typeof RivalCivBlueprintSchema>;

export const TrajectoryThreadBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  initialInertia: z.number().min(0).max(1),
  dualUseCeiling: z.number().int().positive(),
  primaryCandidateLineageId: NonEmptyIdSchema.optional(),
  substituteCandidateLineageId: NonEmptyIdSchema.optional(),
});
export type TrajectoryThreadBlueprint = z.infer<typeof TrajectoryThreadBlueprintSchema>;

export const ChannelMediumBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  baseTransitTicks: z.number().int().nonnegative(),
  interceptionRisk: z.number().min(0).max(1),
  forgeryDifficulty: z.number().min(0).max(1),
});
export type ChannelMediumBlueprint = z.infer<typeof ChannelMediumBlueprintSchema>;

export const EmergencyStateBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  name: NonEmptyIdSchema,
  dominantVerb: NonEmptyIdSchema,
  fuseTicks: z.number().int().positive(),
  viceCompoundRate: z.number().nonnegative(),
});
export type EmergencyStateBlueprint = z.infer<typeof EmergencyStateBlueprintSchema>;

export const OrbitalPassPhaseSchema = z.enum(['zenith', 'horizon', 'occluded']);
export type OrbitalPassPhase = z.infer<typeof OrbitalPassPhaseSchema>;

export const OrbitalPassBlueprintSchema = z.object({
  id: NonEmptyIdSchema,
  zenithDurationTicks: z.number().int().positive(),
  horizonDurationTicks: z.number().int().positive(),
  occludedDurationTicks: z.number().int().positive(),
  maxDelta: z.number().positive(),
  slingshotCost: z.number().positive(),
  burnCostPerTick: z.number().positive(),
});
export type OrbitalPassBlueprint = z.infer<typeof OrbitalPassBlueprintSchema>;

export const BehaviorModuleSchema = z.object({
  id: NonEmptyIdSchema,
  label: NonEmptyIdSchema,
  dependencyIds: z.array(NonEmptyIdSchema).readonly().default([]),
  deliberationSeconds: z.number().nonnegative().default(5),
  dwellSeconds: z.number().nonnegative().default(10),
  cooldownSeconds: z.number().nonnegative().default(5),
  requiresExternalTrigger: z.boolean().default(false),
});
export type BehaviorModule = z.infer<typeof BehaviorModuleSchema>;

export interface EpochModulePackInput {
  readonly epochId: string;
  readonly spaces: ReadonlyArray<SpaceNodeBlueprint>;
  readonly props?: ReadonlyArray<PropBlueprint>;
  readonly characters?: ReadonlyArray<CharacterBlueprint>;
  readonly offices?: ReadonlyArray<OfficeBlueprint>;
  readonly quietClaims?: ReadonlyArray<QuietClaimBlueprint>;
  readonly rivals?: ReadonlyArray<RivalCivBlueprint>;
  readonly threads?: ReadonlyArray<TrajectoryThreadBlueprint>;
  readonly channels?: ReadonlyArray<ChannelMediumBlueprint>;
  readonly emergencies?: ReadonlyArray<EmergencyStateBlueprint>;
  readonly orbitalPass?: OrbitalPassBlueprint;
  readonly behaviors?: ReadonlyArray<BehaviorModule>;
}
