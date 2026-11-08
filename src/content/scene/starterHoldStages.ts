/**
 * Stage blueprints for the Epoch 1 starter hold (`src/content/scene/starterHoldStages.ts`).
 *
 * One stage per pack space. Prop positions are world coordinates, the same
 * frame as the pack waypoints. The floor, the walls, and the camera volume
 * stay centered on the stage. The chambers door is a portal so the existing
 * hinge yaw can pose it. No new renderer module.
 */
import {
  formatFloorSemanticId,
  formatPropSemanticId,
  formatWallSegmentSemanticId,
  type StageSceneBlueprint,
  StageSceneBlueprintSchema,
} from '../../interfaces/three/StageKitbashBuilders.js';
import { DEFAULT_HIGHGLASS_VISUAL_THEME } from './defaultStageContent.js';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function stageFor(
  stageId: string,
  spaceId: string,
  surfaceMaterial: 'mud' | 'stone',
  props: ReadonlyArray<{
    readonly propId: string;
    readonly position: readonly [number, number, number];
    readonly isPortal: boolean;
  }>,
): StageSceneBlueprint {
  const widthMeters = 12;
  const depthMeters = 10;
  const halfWidth = widthMeters / 2;
  const halfDepth = depthMeters / 2;
  return deepFreeze(
    StageSceneBlueprintSchema.parse({
      stageId,
      spaceId,
      themeId: DEFAULT_HIGHGLASS_VISUAL_THEME.id,
      footprint: {
        widthMeters,
        depthMeters,
        heightMeters: 4.5,
      },
      floorSemanticId: formatFloorSemanticId(spaceId),
      wallSegments: [
        {
          segmentId: 'seg_01',
          compass: 'north',
          semanticId: formatWallSegmentSemanticId(spaceId, 'north', 'seg_01'),
          widthMeters,
          heightMeters: 4.5,
          surfaceMaterial,
        },
      ],
      props: props.map((prop) => ({
        propId: prop.propId,
        semanticId: formatPropSemanticId(spaceId, prop.propId),
        position: prop.position,
        isPortal: prop.isPortal,
        surfaceMaterial: 'wood',
      })),
      cameraVolumes: [
        {
          id: 'vol_main',
          spaceId,
          boundsMin: [-halfWidth, 0, -halfDepth],
          boundsMax: [halfWidth, 4.5, halfDepth],
          offset: [0, 6, 8],
        },
      ],
    }),
  );
}

export const STARTER_HOLD_YARD_STAGE: StageSceneBlueprint = stageFor(
  'stage_glass_yard',
  'space_glass_yard',
  'mud',
  [{ propId: 'prop_chambers_door', position: [4, 0, 0], isPortal: true }],
);

export const STARTER_HOLD_CHAMBERS_STAGE: StageSceneBlueprint = stageFor(
  'stage_player_chambers',
  'space_player_chambers',
  'stone',
  [],
);

export const STARTER_HOLD_STAGE_DIRECTORY: Readonly<Record<string, StageSceneBlueprint>> =
  deepFreeze({
    [STARTER_HOLD_YARD_STAGE.spaceId]: STARTER_HOLD_YARD_STAGE,
    [STARTER_HOLD_CHAMBERS_STAGE.spaceId]: STARTER_HOLD_CHAMBERS_STAGE,
  });
