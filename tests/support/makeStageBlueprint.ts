import type { z } from 'zod';
import {
  formatFloorSemanticId,
  formatWallSegmentSemanticId,
  StageSceneBlueprintSchema,
  type StageSceneBlueprint,
} from '../../src/application/index.js';

type StageSceneBlueprintInput = z.input<typeof StageSceneBlueprintSchema>;

export function makeStageBlueprint(
  spaceId: string,
  overrides: Partial<StageSceneBlueprintInput> = {},
): StageSceneBlueprint {
  return StageSceneBlueprintSchema.parse({
    stageId: `stage_${spaceId}`,
    spaceId,
    themeId: 'theme_play',
    footprint: { widthMeters: 20, depthMeters: 20, heightMeters: 6 },
    floorSemanticId: formatFloorSemanticId(spaceId),
    wallSegments: [
      {
        segmentId: 'seg_01',
        compass: 'north',
        zone: 'wall',
        semanticId: formatWallSegmentSemanticId(spaceId, 'north', 'seg_01'),
      },
    ],
    cameraVolumes: [
      {
        id: `vol_${spaceId}`,
        spaceId,
        boundsMin: [-10, 0, -10],
        boundsMax: [10, 6, 10],
        offset: [0, 8, 10],
      },
    ],
    ...overrides,
  });
}
