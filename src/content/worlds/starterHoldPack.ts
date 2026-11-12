/**
 * Epoch 1 starter hold pack (`src/content/worlds/starterHoldPack.ts`).
 *
 * A yard and a chambers joined by one open door, plus a yard walker and the
 * player operative. Seed exemplar only. The domain never names these ids.
 */
import type { EpochModulePackInput } from '../../domain/index.js';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const STARTER_HOLD_PACK: EpochModulePackInput = deepFreeze({
  epochId: 'epoch_1_highglass',
  packId: 'starter_hold',
  packVersion: 1,
  imports: [],
  spaces: [
    {
      id: 'space_glass_yard',
      name: 'Glass Yard',
      kind: 'outdoor_area',
      earshotRadiusMeters: 14,
      surfaceMaterial: 'mud',
      acousticClass: 'open_court',
      ambientMaskLoudness: 0.25,
      connectedSpaceIds: ['space_player_chambers'],
      waypoints: [
        { id: 'wp_glass_yard_gate', position: [0, 0, 0] },
        { id: 'wp_glass_yard_threshold', position: [4, 0, 0] },
      ],
    },
    {
      id: 'space_player_chambers',
      name: 'Player Chambers',
      kind: 'indoor_room',
      earshotRadiusMeters: 6,
      surfaceMaterial: 'stone',
      acousticClass: 'tight_interior',
      ambientMaskLoudness: 0.1,
      connectedSpaceIds: ['space_glass_yard'],
      waypoints: [
        { id: 'wp_player_chambers_threshold', position: [6, 0, 1] },
        { id: 'wp_player_chambers_hearth', position: [8, 0, 1] },
      ],
    },
  ],
  props: [
    {
      id: 'prop_chambers_door',
      name: 'Chambers Door',
      spaceId: 'space_glass_yard',
      waypointId: 'wp_glass_yard_threshold',
      tier: 'interactive',
      initialState: {},
      portalState: 'open',
      portalTargetSpaceId: 'space_player_chambers',
      portalTargetWaypointId: 'wp_player_chambers_threshold',
    },
  ],
  characters: [
    {
      id: 'char_yard_walker',
      name: 'Yard Walker',
      lineageId: 'lineage_yard_walker',
      tier: 'role_routine',
      startingSpaceId: 'space_glass_yard',
      startingWaypointId: 'wp_glass_yard_gate',
      walkSpeedMetersPerSec: 1.4,
      yawSpeedRadiansPerSec: 6,
      listenerThreshold: 0.22,
      drives: { duty: 0.6 },
      emergencyVice: 'duty',
      inertiaPillars: [],
    },
    {
      id: 'char_player_operative',
      name: 'Player Operative',
      lineageId: 'lineage_player_operative',
      tier: 'utility_schemer',
      startingSpaceId: 'space_player_chambers',
      startingWaypointId: 'wp_player_chambers_hearth',
      walkSpeedMetersPerSec: 1.4,
      yawSpeedRadiansPerSec: 6,
      listenerThreshold: 0.18,
      drives: { curiosity: 0.7 },
      emergencyVice: 'curiosity',
      inertiaPillars: [],
    },
  ],
});
