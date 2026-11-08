import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EpochVisualThemeSchema,
  PlaySession,
  RenderFrameBuilder,
  SimulationCoordinator,
  StageSceneBlueprintSchema,
  type StageSceneBlueprint,
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

const THEME = EpochVisualThemeSchema.parse({
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

function makeStage(spaceId: string): StageSceneBlueprint {
  return StageSceneBlueprintSchema.parse({
    stageId: `stage_${spaceId}`,
    spaceId,
    themeId: 'theme_play',
    footprint: { widthMeters: 20, depthMeters: 20, heightMeters: 6 },
    floorSemanticId: `${spaceId}.floor`,
    wallSegments: [
      {
        segmentId: 'seg_01',
        compass: 'north',
        zone: 'wall',
        semanticId: `${spaceId}.wall.north.seg_01`,
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
  });
}

function character(
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

function coordinatorFor(
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

describe('PlaySession', () => {
  it('does not name a content pack or an exemplar place or character', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../src/application/shell/PlaySession.ts',
      ),
      'utf8',
    );
    expect(source).not.toContain('char_player_operative');
    expect(source).not.toContain('char_yard_walker');
    expect(source).not.toContain('space_glass_yard');
    expect(source).not.toContain('space_player_chambers');
    expect(source).not.toContain('src/content');
    expect(source).not.toContain("from 'three'");
  });

  it('adopts the stage registered for a non-proving-slice space', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        spaces: [
          {
            id: 'space_other',
            name: 'Other',
            kind: 'indoor_room',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_other', position: [0, 0, 0] }],
          },
        ],
        characters: [character('char_other', 'space_other', 'wp_other')],
      },
      'gameplay',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_other', makeStage('space_other')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_other',
    });
    expect(session.getResidentStage()?.spaceId).toBe('space_other');
    expect(session.frame(1 / 60).renderFrame?.activeSpaceId).toBe('space_other');
  });

  it('swaps to the yard stage after an open door and keeps the chambers stage when the door is barred', () => {
    const open = doorSession('open');
    expect(open.session.requestMove('wp_lane')).toBe('path');
    const arrived = open.session.frame(8);
    expect(open.coordinator.getWorldState().entities['char_walker']?.spaceId).toBe('space_yard');
    expect(arrived.residentStage?.spaceId).toBe('space_yard');
    expect(arrived.releasedStageId).toBe('stage_space_room');

    const barred = doorSession('barred');
    const before = barred.coordinator.getWorldState();
    expect(barred.session.requestMove('wp_lane')).toBe('blocked');
    expect(barred.coordinator.getWorldState()).toBe(before);
    expect(barred.session.getResidentStage()?.spaceId).toBe('space_room');
    expect(barred.session.getStatus()).toBe('blocked');
  });

  it('calls stepFrame once and then the cognitive pulse on a paused frame without dispatching', () => {
    const { coordinator, session } = doorSession('open');
    session.setPaused(true);
    const steps: number[] = [];
    const pulses: number[] = [];
    let dispatches = 0;
    const stepFrame = coordinator.stepFrame.bind(coordinator);
    const pulse = coordinator.pulseCognitiveScheduler.bind(coordinator);
    const dispatch = coordinator.dispatchEffects.bind(coordinator);
    coordinator.stepFrame = (dtSeconds: number) => {
      steps.push(dtSeconds);
      return stepFrame(dtSeconds);
    };
    coordinator.pulseCognitiveScheduler = () => {
      pulses.push(1);
      return pulse();
    };
    coordinator.dispatchEffects = (effects) => {
      dispatches += 1;
      return dispatch(effects);
    };
    session.frame(2);
    expect(steps).toEqual([2]);
    expect(pulses).toEqual([1]);
    expect(dispatches).toBe(0);
    expect(session.requestMove('wp_lane')).toBe('paused');
    expect(dispatches).toBe(0);
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual([8, 0, 0]);
  });

  it('passes a 2 second delta through one step and does not open a second step', () => {
    const { coordinator, session } = doorSession('open', 'gameplay');
    const steps: number[] = [];
    const stepFrame = coordinator.stepFrame.bind(coordinator);
    coordinator.stepFrame = (dtSeconds: number) => {
      steps.push(dtSeconds);
      return stepFrame(dtSeconds);
    };
    session.frame(2);
    expect(steps).toEqual([2]);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(0.25);
  });

  it('ignores a distant floor point and moves to the nearest in-range waypoint', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        spaces: [
          {
            id: 'space_floor',
            name: 'Floor',
            kind: 'outdoor_area',
            earshotRadiusMeters: 12,
            surfaceMaterial: 'mud',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.2,
            connectedSpaceIds: [],
            waypoints: [
              { id: 'wp_near', position: [0, 0, 0] },
              { id: 'wp_far', position: [10, 0, 0] },
            ],
          },
          {
            id: 'space_elsewhere',
            name: 'Elsewhere',
            kind: 'indoor_room',
            earshotRadiusMeters: 6,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_foreign', position: [5, 0, 5] }],
          },
        ],
        characters: [character('char_walker', 'space_floor', 'wp_near')],
      },
      'fast',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_floor', makeStage('space_floor')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_walker',
    });
    expect(session.clickFloor(5, 5)).toBe('miss');
    expect(coordinator.getWorldState().entities['char_walker']?.activePath).toEqual([]);

    expect(session.clickFloor(1.5, 0)).toBe('already_there');
    expect(session.clickFloor(10, 0)).toBe('path');
    expect(
      coordinator
        .getWorldState()
        .entities['char_walker']?.activePath.map((target) => target.waypointId),
    ).toEqual(['wp_far']);

    session.setPaused(true);
    const paused = coordinator.getWorldState();
    expect(session.clickFloor(10, 0)).toBe('paused');
    expect(coordinator.getWorldState()).toBe(paused);
  });

  it('keeps the resident stage and reports missing_stage for an unregistered space', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        spaces: [
          {
            id: 'space_home',
            name: 'Home',
            kind: 'indoor_room',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_home', position: [0, 0, 0] }],
          },
          {
            id: 'space_unregistered',
            name: 'Unregistered',
            kind: 'outdoor_area',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'earth',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_away', position: [3, 0, 0] }],
          },
        ],
        characters: [
          character('char_home', 'space_home', 'wp_home'),
          character('char_away', 'space_unregistered', 'wp_away'),
        ],
      },
      'gameplay',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_home', makeStage('space_home')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_home',
    });
    const established = session.frame(0);
    expect(established.residentStage?.spaceId).toBe('space_home');
    expect(session.setFocusEntity('char_away')).toBeNull();
    expect(session.getResidentStage()?.spaceId).toBe('space_home');
    expect(session.getStatus()).toBe('missing_stage');
    expect(session.frame(1 / 60).renderFrame?.activeSpaceId).toBe('space_home');

    const swapped = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([
        ['space_home', makeStage('space_home')],
        ['space_unregistered', makeStage('space_unregistered')],
      ]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_home',
    });
    expect(swapped.setFocusEntity('char_away')).toBe('stage_space_home');
    expect(swapped.getResidentStage()?.spaceId).toBe('space_unregistered');
    expect(swapped.getStatus()).toBe('ready');
  });

  it('forwards reduced motion and leaves the body in place when the camera offset changes', () => {
    const { coordinator, session } = doorSession('open');
    session.setReduceMotionAndFlashing(true);
    const reduced = session.frame(1 / 60, { aspect: 2 });
    expect(reduced.renderFrame?.suppressGodRays).toBe(true);
    expect(reduced.renderFrame?.camera.aspect).toBe(2);

    session.setPaused(true);
    session.setCameraDeAnchored(true);
    session.setFreeCamOffset([4, 1, -2]);
    const before = coordinator.getWorldState().entities['char_walker']?.position;
    const framed = session.frame(1 / 60);
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual(before);
    expect(framed.renderFrame?.camera.cameraMode).toBe('debug_free_cam');
    expect(framed.renderFrame?.inspectorCards).toEqual([]);
    expect(session.getFreeCamOffset()).toEqual([4, 1, -2]);
  });

  it('reports unknown_prop and does not change a prop', () => {
    const { coordinator, session } = doorSession('open');
    const before = coordinator.getWorldState();
    expect(session.requestPortalState('prop_missing', 'barred')).toBe('unknown_prop');
    expect(coordinator.getWorldState()).toBe(before);
    expect(session.getStatus()).toBe('unknown_prop');
  });
});

function doorSession(
  portalState: 'open' | 'barred',
  pacing: 'gameplay' | 'fast' = 'fast',
): { readonly coordinator: SimulationCoordinator; readonly session: PlaySession } {
  const coordinator = coordinatorFor(
    {
      epochId: 'epoch_play',
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
      ['space_room', makeStage('space_room')],
      ['space_yard', makeStage('space_yard')],
    ]),
    characterVisuals: [],
    theme: THEME,
    focusEntityId: 'char_walker',
  });
  return { coordinator, session };
}
