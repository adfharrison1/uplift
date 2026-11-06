/**
 * 3-Layer Encoded Visual Authoring Framework & Deterministic `semanticId` Contracts
 * (`src/application/rendering/SceneVisualBlueprints.ts`).
 *
 * Pure TypeScript + Zod v4 schemas for:
 * - Layer 1: `EpochVisualTheme` (stage-paint chiaroscuro palettes, `#1a1f28` shadow tint, `#c4a574` torch tint, key/ambient lighting, desaturation, grime, fog)
 * - Layer 2: `StageSceneBlueprint` & `CameraVolumeBlueprint` (room dimensions, compass walls, segments/alcoves with thickness/recess/offset, motif grid/row layout, 3D prop/portal visuals, lights, camera volumes)
 * - Layer 3: `CharacterVisualBlueprint` (posture, spine pitch, modular garment/prop slots, grime, companion drone disguise)
 *
 * Contains zero Three.js or DOM imports so it can be validated and unit-tested in pure Node/Vitest.
 */
import { z } from 'zod';

const IdentifierTokenSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9][a-z0-9_-]{0,63}$/,
    'Must be a lowercase alphanumeric/underscore/hyphen token (1-64 chars)',
  );

export const HexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color (#RRGGBB)')
  .transform((val) => val.toLowerCase());
export type HexColor = z.infer<typeof HexColorSchema>;

export const CompassDirectionSchema = z.enum(['north', 'south', 'east', 'west']);
export type CompassDirection = z.infer<typeof CompassDirectionSchema>;

export const WallSurfaceZoneSchema = z.enum(['wall', 'alcove']);
export type WallSurfaceZone = z.infer<typeof WallSurfaceZoneSchema>;

export const CanonicalMotifIdSchema = z.enum([
  'ossuary_skull_niche',
  'lancet_window',
  'buttress_rib',
  'fulgurite_lens_sconce',
  'guild_anvil_rack',
  'torch_sconce',
]);
export type CanonicalMotifId = z.infer<typeof CanonicalMotifIdSchema>;

export const CharacterPartSlotNameSchema = z.enum([
  'torso',
  'head',
  'headgear',
  'cloak',
  'held_prop_left',
  'held_prop_right',
  'drone_disguise',
]);
export type CharacterPartSlotName = z.infer<typeof CharacterPartSlotNameSchema>;

const WALL_SEGMENT_SEMANTIC_ID_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,63}\.(?:wall|alcove)\.(?:north|south|east|west)\.[a-z0-9][a-z0-9_-]{0,63}$/;

const SEMANTIC_ID_PATTERN =
  /^(?:[a-z0-9][a-z0-9_-]{0,63}\.(?:(?:wall|alcove)\.(?:north|south|east|west)\.[a-z0-9][a-z0-9_-]{0,63}(?:\.motif\.[a-z0-9][a-z0-9_-]{0,63})?|floor|prop\.[a-z0-9][a-z0-9_-]{0,63}|light\.[a-z0-9][a-z0-9_-]{0,63})|npc\.[a-z0-9][a-z0-9_-]{0,63}(?:\.part\.(?:torso|head|headgear|cloak|held_prop_left|held_prop_right|drone_disguise))?)$/;

export const SemanticIdSchema = z
  .string()
  .trim()
  .regex(
    SEMANTIC_ID_PATTERN,
    'Must match a canonical stage or NPC semanticId pattern (e.g. charnel_stairs.wall.north.seg_02, chapel.alcove.east.arch_01, space_alpha.floor, or npc.sorrel.part.headgear)',
  );
export type SemanticId = z.infer<typeof SemanticIdSchema>;

export function validateSemanticId(semanticId: string): SemanticId {
  return SemanticIdSchema.parse(semanticId);
}

export function formatWallSegmentSemanticId(
  spaceId: string,
  compass: CompassDirection,
  segmentId: string,
  zone: WallSurfaceZone = 'wall',
): string {
  const validSpace = IdentifierTokenSchema.parse(spaceId);
  const validCompass = CompassDirectionSchema.parse(compass);
  const validSegment = IdentifierTokenSchema.parse(segmentId);
  const validZone = WallSurfaceZoneSchema.parse(zone);
  return `${validSpace}.${validZone}.${validCompass}.${validSegment}`;
}

export function formatWallMotifSemanticId(segmentSemanticId: string, motifId: string): string {
  const trimmedSegment = segmentSemanticId.trim();
  if (!WALL_SEGMENT_SEMANTIC_ID_PATTERN.test(trimmedSegment)) {
    throw new Error(
      `segmentSemanticId '${segmentSemanticId}' must be a valid wall or alcove segment semanticId (<spaceId>.<wall|alcove>.<compass>.<segmentId>)`,
    );
  }
  const validMotifId = IdentifierTokenSchema.parse(motifId);
  return SemanticIdSchema.parse(`${trimmedSegment}.motif.${validMotifId}`);
}

export function formatFloorSemanticId(spaceId: string): string {
  const validSpace = IdentifierTokenSchema.parse(spaceId);
  return `${validSpace}.floor`;
}

export function formatPropSemanticId(spaceId: string, propId: string): string {
  const validSpace = IdentifierTokenSchema.parse(spaceId);
  const validProp = IdentifierTokenSchema.parse(propId);
  return `${validSpace}.prop.${validProp}`;
}

export function formatLightSemanticId(spaceId: string, lightId: string): string {
  const validSpace = IdentifierTokenSchema.parse(spaceId);
  const validLight = IdentifierTokenSchema.parse(lightId);
  return `${validSpace}.light.${validLight}`;
}

export function formatCharacterRootSemanticId(characterId: string): string {
  const validChar = IdentifierTokenSchema.parse(characterId);
  return `npc.${validChar}`;
}

export function formatCharacterPartSemanticId(
  characterId: string,
  slot: CharacterPartSlotName,
): string {
  const validChar = IdentifierTokenSchema.parse(characterId);
  const validSlot = CharacterPartSlotNameSchema.parse(slot);
  return `npc.${validChar}.part.${validSlot}`;
}

/**
 * Layer 1 — `EpochVisualTheme`
 * Defines stage-paint chiaroscuro palettes, `#1a1f28` shadow tint, `#c4a574` torch tint,
 * directional key-light and ambient fill for the 3-band toon ramp, desaturation, grime, and fog.
 */
export const EpochVisualThemeSchema = z
  .object({
    id: IdentifierTokenSchema,
    epochId: IdentifierTokenSchema,
    name: z.string().trim().min(1).default('Default Epoch Visual Theme'),
    stoneColorHex: HexColorSchema,
    mudColorHex: HexColorSchema,
    ironColorHex: HexColorSchema,
    woodColorHex: HexColorSchema,
    shadowTintHex: HexColorSchema.default('#1a1f28'),
    torchWarmHex: HexColorSchema.default('#c4a574'),
    ambientIntensity: z.number().min(0).max(5).default(0.35),
    keyLightDirection: z
      .tuple([z.number(), z.number(), z.number()])
      .readonly()
      .default([-0.5, -1.0, -0.4]),
    keyLightIntensity: z.number().min(0).max(10).default(1.1),
    desaturationFactor: z.number().min(0).max(1).default(0.3),
    grimeIntensity: z.number().min(0).max(1).default(0.35),
    fogDensity: z.number().nonnegative().default(0.025),
    fogColorHex: HexColorSchema.default('#1a1f28'),
  })
  .refine(
    (t) =>
      Math.hypot(t.keyLightDirection[0], t.keyLightDirection[1], t.keyLightDirection[2]) > 1e-6,
    'EpochVisualTheme keyLightDirection must be a non-zero 3D vector',
  );
export type EpochVisualTheme = z.infer<typeof EpochVisualThemeSchema>;

/**
 * Parametric motif attachment on a wall/alcove segment.
 * Includes grid/row layout fields (`offsetX`, `offsetY`, `spacingMeters`, `columns`) so
 * multi-instance motifs (e.g. `count: 24` skull niches or buttress ribs) map cleanly to Three.js meshes.
 */
export const WallMotifInstanceSchema = z.object({
  id: IdentifierTokenSchema,
  count: z.number().int().positive().max(256).default(1),
  recessDepth: z.number().min(0).max(5).default(0.2),
  scale: z.number().positive().max(10).default(1.0),
  offsetX: z.number().min(-50).max(50).default(0.0),
  offsetY: z.number().min(-10).max(20).default(1.5),
  spacingMeters: z.number().positive().max(20).default(0.5),
  columns: z.number().int().positive().max(64).default(6),
});
export type WallMotifInstance = z.infer<typeof WallMotifInstanceSchema>;

export const WallSegmentBlueprintSchema = z.object({
  segmentId: IdentifierTokenSchema,
  compass: CompassDirectionSchema,
  zone: WallSurfaceZoneSchema.default('wall'),
  semanticId: SemanticIdSchema,
  widthMeters: z.number().positive().max(200).default(4.0),
  heightMeters: z.number().positive().max(100).default(4.5),
  thicknessMeters: z.number().positive().max(20).default(0.4),
  recessMeters: z.number().min(0).max(20).default(0.0),
  offsetAlongWallMeters: z.number().min(-250).max(250).optional(),
  surfaceMaterial: z.enum(['stone', 'mud', 'wood', 'metal', 'earth']).default('stone'),
  motifs: z.array(WallMotifInstanceSchema).readonly().default([]),
});
export type WallSegmentBlueprint = z.infer<typeof WallSegmentBlueprintSchema>;

/**
 * 3D visual placement and kitbash descriptor for stage props and swinging doors/portals.
 * Joins by `propId` to `WorldState.props[propId]` so portal states (`open | ajar | closed | barred`)
 * drive Three.js door hinge rotations automatically.
 */
export const StagePropVisualBlueprintSchema = z.object({
  propId: IdentifierTokenSchema,
  semanticId: SemanticIdSchema,
  kitbashId: IdentifierTokenSchema.default('crate_prop'),
  position: z.tuple([z.number(), z.number(), z.number()]).readonly(),
  yawRadians: z.number().default(0),
  scale: z
    .tuple([z.number().positive(), z.number().positive(), z.number().positive()])
    .readonly()
    .default([1, 1, 1]),
  surfaceMaterial: z.enum(['stone', 'mud', 'wood', 'metal', 'earth']).default('wood'),
  isPortal: z.boolean().default(false),
});
export type StagePropVisualBlueprint = z.infer<typeof StagePropVisualBlueprintSchema>;

export const StageLightBlueprintSchema = z.object({
  id: IdentifierTokenSchema,
  semanticId: SemanticIdSchema,
  position: z.tuple([z.number(), z.number(), z.number()]).readonly(),
  colorHex: HexColorSchema.default('#c4a574'),
  intensity: z.number().min(0).max(20).default(2.0),
  falloffDistance: z.number().positive().max(200).default(12.0),
  hasGodRayCone: z.boolean().default(false),
});
export type StageLightBlueprint = z.infer<typeof StageLightBlueprintSchema>;

export const CameraVolumeBlueprintSchema = z
  .object({
    id: IdentifierTokenSchema,
    spaceId: IdentifierTokenSchema,
    priority: z.number().int().default(0),
    boundsMin: z.tuple([z.number(), z.number(), z.number()]).readonly(),
    boundsMax: z.tuple([z.number(), z.number(), z.number()]).readonly(),
    offset: z.tuple([z.number(), z.number(), z.number()]).readonly(),
    pitchDegrees: z.number().min(-85).max(85).default(-28),
    yawDegrees: z.number().min(-180).max(180).default(0),
    fovDegrees: z.number().min(15).max(110).default(42),
    springStiffness: z.number().positive().max(100).default(12),
  })
  .refine(
    (v) =>
      v.boundsMin[0] < v.boundsMax[0] &&
      v.boundsMin[1] < v.boundsMax[1] &&
      v.boundsMin[2] < v.boundsMax[2],
    'CameraVolumeBlueprint boundsMin must be strictly less than boundsMax on all axes',
  );
export type CameraVolumeBlueprint = z.infer<typeof CameraVolumeBlueprintSchema>;

/**
 * Layer 2 — `StageSceneBlueprint`
 * Declarative 3D stage layout with deterministic `semanticId` addressing across all wall bays,
 * floors, props/portals, lights, and camera volumes.
 */
export const StageSceneBlueprintSchema = z
  .object({
    stageId: IdentifierTokenSchema,
    spaceId: IdentifierTokenSchema,
    themeId: IdentifierTokenSchema.default('default_theme'),
    footprint: z.object({
      widthMeters: z.number().positive().max(500),
      depthMeters: z.number().positive().max(500),
      heightMeters: z.number().positive().max(100),
    }),
    floorSemanticId: SemanticIdSchema,
    wallSegments: z.array(WallSegmentBlueprintSchema).min(1).readonly(),
    props: z.array(StagePropVisualBlueprintSchema).readonly().default([]),
    lights: z.array(StageLightBlueprintSchema).readonly().default([]),
    cameraVolumes: z.array(CameraVolumeBlueprintSchema).min(1).readonly(),
  })
  .superRefine((stage, ctx) => {
    const expectedFloorId = formatFloorSemanticId(stage.spaceId);
    if (stage.floorSemanticId !== expectedFloorId) {
      ctx.addIssue({
        code: 'custom',
        message: `Stage '${stage.stageId}' floorSemanticId '${stage.floorSemanticId}' must equal '${expectedFloorId}'`,
      });
    }

    const seenSemanticIds = new Set<string>([stage.floorSemanticId]);

    for (const seg of stage.wallSegments) {
      const expectedSegId = formatWallSegmentSemanticId(
        stage.spaceId,
        seg.compass,
        seg.segmentId,
        seg.zone,
      );
      if (seg.semanticId !== expectedSegId) {
        ctx.addIssue({
          code: 'custom',
          message: `Wall segment '${seg.segmentId}' semanticId '${seg.semanticId}' must equal '${expectedSegId}'`,
        });
      }
      if (seenSemanticIds.has(seg.semanticId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate semanticId '${seg.semanticId}' in stage '${stage.stageId}'`,
        });
      }
      seenSemanticIds.add(seg.semanticId);

      const seenMotifs = new Set<string>();
      for (const motif of seg.motifs) {
        if (seenMotifs.has(motif.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate motif id '${motif.id}' on wall segment '${seg.semanticId}'`,
          });
        }
        seenMotifs.add(motif.id);
      }
    }

    for (const prop of stage.props) {
      const expectedPropId = formatPropSemanticId(stage.spaceId, prop.propId);
      if (prop.semanticId !== expectedPropId) {
        ctx.addIssue({
          code: 'custom',
          message: `Prop '${prop.propId}' semanticId '${prop.semanticId}' must equal '${expectedPropId}'`,
        });
      }
      if (seenSemanticIds.has(prop.semanticId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate semanticId '${prop.semanticId}' in stage '${stage.stageId}'`,
        });
      }
      seenSemanticIds.add(prop.semanticId);
    }

    for (const light of stage.lights) {
      const expectedLightId = formatLightSemanticId(stage.spaceId, light.id);
      if (light.semanticId !== expectedLightId) {
        ctx.addIssue({
          code: 'custom',
          message: `Light '${light.id}' semanticId '${light.semanticId}' must equal '${expectedLightId}'`,
        });
      }
      if (seenSemanticIds.has(light.semanticId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate semanticId '${light.semanticId}' in stage '${stage.stageId}'`,
        });
      }
      seenSemanticIds.add(light.semanticId);
    }

    const seenVolumeIds = new Set<string>();
    for (const vol of stage.cameraVolumes) {
      if (vol.spaceId !== stage.spaceId) {
        ctx.addIssue({
          code: 'custom',
          message: `CameraVolume '${vol.id}' spaceId '${vol.spaceId}' must match stage spaceId '${stage.spaceId}'`,
        });
      }
      if (seenVolumeIds.has(vol.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate cameraVolume id '${vol.id}' in stage '${stage.stageId}'`,
        });
      }
      seenVolumeIds.add(vol.id);
    }
  });
export type StageSceneBlueprint = z.infer<typeof StageSceneBlueprintSchema>;

export const GaitStyleSchema = z.enum(['upright', 'stooped', 'measured', 'brisk']);
export type GaitStyle = z.infer<typeof GaitStyleSchema>;

/**
 * Layer 3 Contract — `CharacterVisualBlueprint`
 * Keyed by `characterId` and `lineageId` so 3D silhouette/posture/wardrobe data joins
 * cleanly to domain `CharacterBlueprint` without leaking 3D schemas into `src/domain/`.
 */
export const CharacterVisualBlueprintSchema = z.object({
  characterId: IdentifierTokenSchema,
  lineageId: IdentifierTokenSchema,
  heightScale: z.number().min(0.5).max(2.0).default(1.0),
  shoulderWidth: z.number().min(0.3).max(1.5).default(0.55),
  spinePitchRadians: z.number().min(-0.8).max(0.8).default(0.0),
  gaitStyle: GaitStyleSchema.default('upright'),
  headgear: IdentifierTokenSchema.default('none'),
  cloak: IdentifierTokenSchema.default('none'),
  heldPropLeft: IdentifierTokenSchema.default('none'),
  heldPropRight: IdentifierTokenSchema.default('none'),
  primaryColorHex: HexColorSchema,
  accentColorHex: HexColorSchema,
  mudLevel: z.number().min(0).max(1).default(0.15),
  sootLevel: z.number().min(0).max(1).default(0.1),
  droneDisguise: IdentifierTokenSchema.optional(),
});
export type CharacterVisualBlueprint = z.infer<typeof CharacterVisualBlueprintSchema>;

/**
 * Rebinds a `CharacterVisualBlueprint` across epochs by matching `lineageId`, preserving
 * silhouette posture (`heightScale`, `shoulderWidth`, `spinePitchRadians`, `gaitStyle`)
 * and garment/prop slots while optionally rebinding surface palette colors to the new `EpochVisualTheme`.
 */
export function resolveCharacterVisualForTheme(
  visualsByLineageOrId: ReadonlyArray<CharacterVisualBlueprint>,
  target: {
    readonly characterId: string;
    readonly lineageId: string;
  },
  theme: EpochVisualTheme,
  options?: {
    readonly rebindPaletteToTheme?: boolean | undefined;
    readonly newDroneDisguise?: string | undefined;
  },
): CharacterVisualBlueprint {
  const validatedTheme = EpochVisualThemeSchema.parse(theme);
  const lineageCandidates = visualsByLineageOrId.filter((v) => v.lineageId === target.lineageId);

  if (lineageCandidates.length === 0) {
    throw new Error(
      `No CharacterVisualBlueprint found for lineageId '${target.lineageId}' (requested characterId '${target.characterId}')`,
    );
  }

  const exactIdMatch = lineageCandidates.find((v) => v.characterId === target.characterId);
  if (exactIdMatch === undefined && lineageCandidates.length > 1) {
    throw new Error(
      `Ambiguous CharacterVisualBlueprint candidates for lineageId '${target.lineageId}' without matching characterId '${target.characterId}'`,
    );
  }

  const matched = exactIdMatch ?? lineageCandidates[0];
  if (matched === undefined) {
    throw new Error(`No CharacterVisualBlueprint found for lineageId '${target.lineageId}'`);
  }

  return CharacterVisualBlueprintSchema.parse({
    ...matched,
    characterId: target.characterId,
    lineageId: target.lineageId,
    primaryColorHex:
      options?.rebindPaletteToTheme === true
        ? validatedTheme.stoneColorHex
        : matched.primaryColorHex,
    accentColorHex:
      options?.rebindPaletteToTheme === true ? validatedTheme.ironColorHex : matched.accentColorHex,
    ...(options?.newDroneDisguise !== undefined ? { droneDisguise: options.newDroneDisguise } : {}),
  });
}
