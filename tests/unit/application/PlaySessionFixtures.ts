import {
  EpochVisualThemeSchema,
  PlaySession,
  RenderFrameBuilder,
  SimulationCoordinator,
} from '../../../src/application/index.js';
import {
  EpochModuleRegistry,
  FAST_EVAL_PACING_CONFIG,
  type TelemetryClock,
} from '../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../src/infrastructure/index.js';
import { makeStageBlueprint } from '../../support/makeStageBlueprint.js';

export const THEME = EpochVisualThemeSchema.parse({
  id: 'theme_play',
  epochId: 'epoch_play',
  stoneColorHex: '#888888',
  mudColorHex: '#887766',
  ironColorHex: '#666666',
  woodColorHex: '#775544',
});

function createClock(): TelemetryClock {
  let elapsed = 0;
  return {
    nowIso(): string {
      return '2026-11-07T21:30:00.000Z';
    },
    elapsedSessionMs(): number {
      elapsed += 16;
      return elapsed;
    },
  };
}

export function character(
  id: string,
  spaceId: string,
  waypointId: string,
): {
  readonly id: string;
  readonly name: string;
  readonly lineageId: string;
  readonly tier: 'role_routine';
  readonly startingSpaceId: string;
  readonly startingWaypointId: string;
  readonly walkSpeedMetersPerSec: number;
  readonly yawSpeedRadiansPerSec: number;
  readonly listenerThreshold: number;
  readonly drives: { readonly duty: number };
  readonly emergencyVice: 'duty';
  readonly inertiaPillars: readonly [];
} {
  return {
    id,
    name: id,
    lineageId: `lineage_${id}`,
    tier: 'role_routine',
    startingSpaceId: spaceId,
    startingWaypointId: waypointId,
    walkSpeedMetersPerSec: 1.4,
    yawSpeedRadiansPerSec: 6,
    listenerThreshold: 0.2,
    drives: { duty: 0.4 },
    emergencyVice: 'duty',
    inertiaPillars: [],
  };
}

export function coordinatorFor(
  pack: Parameters<EpochModuleRegistry['registerPack']>[0],
  pacing: 'gameplay' | 'fast',
): SimulationCoordinator {
  const registry = new EpochModuleRegistry();
  registry.registerPack(pack);
  return new SimulationCoordinator({
    epochId: 'epoch_play',
    registry,
    telemetry: new InMemorySessionTelemetry('session_play', createClock()),
    saveRepository: new InMemorySaveSlotRepository(),
    clock: createClock(),
    ...(pacing === 'fast' ? { pacingConfig: FAST_EVAL_PACING_CONFIG } : {}),
  });
}

export function doorSession(
  portalState: 'open' | 'barred',
  pacing: 'gameplay' | 'fast' = 'fast',
): { readonly coordinator: SimulationCoordinator; readonly session: PlaySession } {
  const coordinator = coordinatorFor(
    {
      epochId: 'epoch_play',
      packId: 'test_play_session',
      packVersion: 1,
      imports: [],
      spaces: [
        {
          id: 'space_room',
          name: 'Room',
          kind: 'indoor_room',
          earshotRadiusMeters: 6,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_yard'],
          waypoints: [{ id: 'wp_inside', position: [8, 0, 0] }],
        },
        {
          id: 'space_yard',
          name: 'Yard',
          kind: 'outdoor_area',
          earshotRadiusMeters: 12,
          surfaceMaterial: 'mud',
          acousticClass: 'open_court',
          ambientMaskLoudness: 0.2,
          connectedSpaceIds: ['space_room'],
          waypoints: [
            { id: 'wp_lane', position: [0, 0, 0] },
            { id: 'wp_door', position: [4, 0, 0] },
          ],
        },
      ],
      props: [
        {
          id: 'prop_door',
          name: 'Door',
          spaceId: 'space_yard',
          waypointId: 'wp_door',
          tier: 'interactive',
          initialState: {},
          portalState,
          portalTargetSpaceId: 'space_room',
          portalTargetWaypointId: 'wp_inside',
        },
      ],
      characters: [character('char_walker', 'space_room', 'wp_inside')],
    },
    pacing,
  );
  const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
    stages: new Map([
      ['space_room', makeStageBlueprint('space_room')],
      ['space_yard', makeStageBlueprint('space_yard')],
    ]),
    characterVisuals: [],
    theme: THEME,
    focusEntityId: 'char_walker',
  });
  return { coordinator, session };
}
