import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EpochVisualThemeSchema,
  PlaySession,
  RenderFrameBuilder,
  SimulationCoordinator,
  StageSceneBlueprintSchema,
} from '../../../src/application/index.js';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  STARTER_HOLD_CHARACTER_VISUALS,
} from '../../../src/content/index.js';
import { EpochModuleRegistry, type TelemetryClock } from '../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
  NdjsonSessionTelemetry,
} from '../../../src/infrastructure/index.js';
import { createPlayInput } from '../../../src/interfaces/composition/playInput.js';
import { createStageLab } from '../../../src/interfaces/composition/stageLabPanel.js';
import {
  handleLocalDiskBridgeRequest,
  InMemoryDomAttributeSink,
  MAX_BRIDGE_BODY_BYTES,
  StageInspectorDomMirror,
} from '../../../src/interfaces/index.js';

function createClock(): TelemetryClock {
  return {
    nowIso(): string {
      return '2026-11-08T10:00:00.000Z';
    },
    elapsedSessionMs(): number {
      return 0;
    },
  };
}

function doorSession(
  portalState: 'open' | 'barred' = 'open',
  includeYardStage = true,
): {
  readonly coordinator: SimulationCoordinator;
  readonly session: PlaySession;
} {
  const registry = new EpochModuleRegistry();
  registry.registerPack({
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
    characters: [
      {
        id: 'char_walker',
        name: 'Walker',
        lineageId: 'lineage_walker',
        tier: 'role_routine',
        startingSpaceId: 'space_room',
        startingWaypointId: 'wp_inside',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.4 },
        emergencyVice: 'duty',
        inertiaPillars: [],
      },
      {
        id: 'char_other',
        name: 'Other',
        lineageId: 'lineage_other',
        tier: 'role_routine',
        startingSpaceId: 'space_yard',
        startingWaypointId: 'wp_lane',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.4 },
        emergencyVice: 'duty',
        inertiaPillars: [],
      },
    ],
  });
  const coordinator = new SimulationCoordinator({
    epochId: 'epoch_play',
    registry,
    telemetry: new InMemorySessionTelemetry('session_play', createClock()),
    saveRepository: new InMemorySaveSlotRepository(),
    clock: createClock(),
  });
  const stages = new Map<string, ReturnType<typeof roomStage>>([['space_room', roomStage()]]);
  if (includeYardStage) {
    stages.set('space_yard', yardStage());
  }
  const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
    stages,
    characterVisuals: [],
    theme: EpochVisualThemeSchema.parse(theme()),
    focusEntityId: 'char_walker',
  });
  return { coordinator, session };
}

function theme() {
  return {
    id: 'theme_play',
    epochId: 'epoch_play',
    name: 'Play',
    stoneColorHex: '#888888',
    mudColorHex: '#887766',
    ironColorHex: '#666666',
    woodColorHex: '#775544',
    shadowTintHex: '#1a1f28',
    torchWarmHex: '#c4a574',
    ambientIntensity: 0.35,
    keyLightDirection: [-0.4, -1, -0.2] as const,
    keyLightIntensity: 1.1,
    desaturationFactor: 0.3,
    grimeIntensity: 0.2,
    fogDensity: 0.02,
    fogColorHex: '#1a1f28',
  };
}

function roomStage() {
  return StageSceneBlueprintSchema.parse({
    stageId: 'stage_space_room',
    spaceId: 'space_room',
    themeId: 'theme_play',
    footprint: { widthMeters: 12, depthMeters: 10, heightMeters: 4.5 },
    floorSemanticId: 'space_room.floor',
    wallSegments: [
      {
        segmentId: 'seg_01',
        compass: 'north',
        semanticId: 'space_room.wall.north.seg_01',
      },
    ],
    props: [
      {
        propId: 'prop_door',
        semanticId: 'space_room.prop.prop_door',
        position: [4, 0, 0],
        isPortal: true,
      },
    ],
    cameraVolumes: [
      {
        id: 'vol_room',
        spaceId: 'space_room',
        boundsMin: [-6, 0, -5],
        boundsMax: [6, 4.5, 5],
        offset: [0, 6, 8],
      },
    ],
  });
}

function yardStage() {
  return StageSceneBlueprintSchema.parse({
    stageId: 'stage_space_yard',
    spaceId: 'space_yard',
    themeId: 'theme_play',
    footprint: { widthMeters: 12, depthMeters: 10, heightMeters: 4.5 },
    floorSemanticId: 'space_yard.floor',
    wallSegments: [
      {
        segmentId: 'seg_01',
        compass: 'north',
        semanticId: 'space_yard.wall.north.seg_01',
      },
    ],
    props: [],
    cameraVolumes: [
      {
        id: 'vol_yard',
        spaceId: 'space_yard',
        boundsMin: [-6, 0, -5],
        boundsMax: [6, 4.5, 5],
        offset: [0, 6, 8],
      },
    ],
  });
}

describe('play input and the stage lab', () => {
  it('updates a portal from a pointer hit and does not raycast the floor or portal while paused', () => {
    const { coordinator, session } = doorSession();
    let floorCasts = 0;
    let portalCasts = 0;
    const input = createPlayInput({
      session,
      isPaused: () => coordinator.getWorldState().paused,
      waypointIds: () => ['wp_inside'],
      entityIds: () => ['char_walker'],
      readPortalState: (propId) => coordinator.getWorldState().props[propId]?.portalState,
      raycastFloor: () => {
        floorCasts += 1;
        return { x: 0, z: 0 };
      },
      raycastPortal: () => {
        portalCasts += 1;
        return { propId: 'prop_door', semanticId: 'space_room.prop.prop_door' };
      },
      raycastPick: () => null,
      onPick: () => undefined,
    });
    input.pointerDown();
    expect(portalCasts).toBe(1);
    expect(floorCasts).toBe(0);
    expect(input.statusText()).toBe('updated');
    expect(coordinator.getWorldState().props['prop_door']?.portalState).toBe('ajar');

    input.keyDown('F3');
    input.pointerDown();
    expect(portalCasts).toBe(1);
    expect(floorCasts).toBe(0);
    expect(coordinator.getWorldState().props['prop_door']?.portalState).toBe('ajar');
  });

  it('pauses on F3 and backtick, and arrow keys change only the camera offset', () => {
    const { coordinator, session } = doorSession();
    const input = createPlayInput({
      session,
      isPaused: () => coordinator.getWorldState().paused,
      waypointIds: () => ['wp_inside', 'wp_lane'],
      entityIds: () => ['char_walker'],
      readPortalState: () => undefined,
      raycastFloor: () => null,
      raycastPortal: () => null,
      raycastPick: () => null,
      onPick: () => undefined,
    });
    const origin = coordinator.getWorldState().entities['char_walker']?.position;
    input.keyDown('ArrowRight');
    expect(session.getFreeCamOffset()).toEqual([0, 0, 0]);
    input.keyDown('F3');
    expect(coordinator.getWorldState().paused).toBe(true);
    input.keyDown('F3', true);
    expect(coordinator.getWorldState().paused).toBe(true);
    input.keyDown('ArrowRight');
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual(origin);
    expect(session.getFreeCamOffset()).toEqual([0.5, 0, 0]);
    const framed = session.frame(0);
    expect(framed.renderFrame?.camera.cameraMode).toBe('debug_free_cam');

    input.keyDown('`');
    expect(coordinator.getWorldState().paused).toBe(false);
    input.keyDown('Backquote');
    expect(coordinator.getWorldState().paused).toBe(true);
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual(origin);
  });

  it('shows paused for a waypoint command and does not dispatch', () => {
    const { coordinator, session } = doorSession();
    let dispatches = 0;
    const dispatch = coordinator.dispatchEffects.bind(coordinator);
    coordinator.dispatchEffects = (effects, options) => {
      dispatches += 1;
      return dispatch(effects, options);
    };
    const input = createPlayInput({
      session,
      isPaused: () => coordinator.getWorldState().paused,
      waypointIds: () => ['wp_lane'],
      entityIds: () => ['char_walker'],
      readPortalState: () => undefined,
      raycastFloor: () => null,
      raycastPortal: () => null,
      raycastPick: () => null,
      onPick: () => undefined,
    });
    session.setPaused(true);
    expect(input.activateWaypoint('wp_lane')).toBe('paused');
    expect(input.statusText()).toBe('paused');
    expect(dispatches).toBe(0);
    expect(coordinator.getWorldState().entities['char_walker']?.activePath).toEqual([]);
  });

  it('mirrors a paused pick and does not change a portal from the stage panel while paused', () => {
    const sink = new InMemoryDomAttributeSink();
    const { coordinator, session } = doorSession();
    let released: string | null = null;
    const input = createPlayInput({
      session,
      isPaused: () => coordinator.getWorldState().paused,
      waypointIds: () => ['wp_inside'],
      entityIds: () => ['char_walker', 'char_other'],
      readPortalState: (propId) => coordinator.getWorldState().props[propId]?.portalState,
      raycastFloor: () => null,
      raycastPortal: () => null,
      raycastPick: () => null,
      onPick: () => undefined,
      onFocusStage: (releasedStageId) => {
        released = releasedStageId;
      },
    });
    const lab = createStageLab({
      mirror: new StageInspectorDomMirror(sink),
      isPaused: () => coordinator.getWorldState().paused,
      getStage: () => session.getResidentStage(),
      getVisuals: () => [],
      requestPortal: (propId, portalState) => input.requestPortal(propId, portalState),
      transport: () => undefined,
    });
    session.setPaused(true);
    lab.pick('space_room.prop.prop_door', 'debug_free_cam');
    expect(sink.getAttribute('data-active-space-id')).toBe('space_room');
    expect(sink.getAttribute('data-hovered-semantic-id')).toBe('space_room.prop.prop_door');
    expect(sink.getAttribute('data-selected-semantic-id')).toBe('space_room.prop.prop_door');
    expect(sink.getAttribute('data-debug-paused')).toBe('true');
    expect(sink.getAttribute('data-camera-mode')).toBe('debug_free_cam');
    expect(lab.requestSelectedPortal('closed')).toBe('paused');
    expect(coordinator.getWorldState().props['prop_door']?.portalState).toBe('open');
    input.setFocus('char_other');
    expect(released).toBe('stage_space_room');
    expect(session.getResidentStage()?.spaceId).toBe('space_yard');
    expect(session.getFocusEntityId()).toBe('char_other');
  });

  it('lists a text command for every waypoint in the active space', () => {
    const { coordinator, session } = doorSession();
    const input = createPlayInput({
      session,
      isPaused: () => coordinator.getWorldState().paused,
      waypointIds: () => ['wp_inside', 'wp_lane'],
      entityIds: () => ['char_walker'],
      readPortalState: () => undefined,
      raycastFloor: () => null,
      raycastPortal: () => null,
      raycastPick: () => null,
      onPick: () => undefined,
    });
    const doc = {
      createElement(): FakeNode {
        return fakeNode(doc);
      },
    };
    const panel = fakeNode(doc);
    input.attach(panel as unknown as HTMLElement);
    expect(panel.children[1]?.children.map((button) => button.textContent)).toEqual([
      'wp_inside',
      'wp_lane',
    ]);
  });

  it('shows missing_stage when the focus space has no stage', () => {
    const { session } = doorSession('open', false);
    const input = createPlayInput({
      session,
      isPaused: () => false,
      waypointIds: () => ['wp_inside'],
      entityIds: () => ['char_walker', 'char_other'],
      readPortalState: () => undefined,
      raycastFloor: () => null,
      raycastPortal: () => null,
      raycastPick: () => null,
      onPick: () => undefined,
    });
    input.setFocus('char_other');
    expect(session.getStatus()).toBe('missing_stage');
    expect(input.statusText()).toBe('missing_stage');
    expect(session.getResidentStage()?.spaceId).toBe('space_room');
  });

  it('does not save a blueprint while the simulation is playing', () => {
    let calls = 0;
    const lab = createStageLab({
      mirror: new StageInspectorDomMirror(new InMemoryDomAttributeSink()),
      isPaused: () => false,
      getStage: () => DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      getVisuals: () => STARTER_HOLD_CHARACTER_VISUALS,
      requestPortal: () => 'ready',
      transport: () => {
        calls += 1;
      },
    });
    lab.saveStage();
    const visual = STARTER_HOLD_CHARACTER_VISUALS[0];
    expect(visual).toBeDefined();
    if (visual === undefined) {
      return;
    }
    lab.saveVisual(visual.characterId);
    expect(calls).toBe(0);
  });

  it('saves the stage blueprint through the scene-blueprint disk route', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'uplift-play-input-'));
    try {
      const telemetry = new NdjsonSessionTelemetry(join(tempDir, 'logs'));
      const saves = new FileSaveSlotRepository(join(tempDir, 'saves'));
      const sceneBlueprintsDir = join(tempDir, 'stages');
      const characterVisualsDir = join(tempDir, 'characters');
      const lab = createStageLab({
        mirror: new StageInspectorDomMirror(new InMemoryDomAttributeSink()),
        isPaused: () => true,
        getStage: () => DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
        getVisuals: () => [],
        requestPortal: () => 'ready',
        transport: (request) => {
          const response = handleLocalDiskBridgeRequest(
            { method: request.method, url: request.url, rawBody: request.rawBody },
            telemetry,
            saves,
            MAX_BRIDGE_BODY_BYTES,
            { sceneBlueprintsDir, characterVisualsDir },
          );
          expect(response.statusCode).toBe(200);
          expect(response.body['blueprint']).toEqual(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT);
        },
      });
      lab.saveStage();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('saves a character visual through the character-visual disk route', () => {
    const visual = STARTER_HOLD_CHARACTER_VISUALS[0];
    expect(visual).toBeDefined();
    if (visual === undefined) {
      return;
    }
    const tempDir = mkdtempSync(join(tmpdir(), 'uplift-play-visual-'));
    try {
      const telemetry = new NdjsonSessionTelemetry(join(tempDir, 'logs'));
      const saves = new FileSaveSlotRepository(join(tempDir, 'saves'));
      const lab = createStageLab({
        mirror: new StageInspectorDomMirror(new InMemoryDomAttributeSink()),
        isPaused: () => true,
        getStage: () => null,
        getVisuals: () => STARTER_HOLD_CHARACTER_VISUALS,
        requestPortal: () => 'ready',
        transport: (request) => {
          const response = handleLocalDiskBridgeRequest(
            { method: request.method, url: request.url, rawBody: request.rawBody },
            telemetry,
            saves,
            MAX_BRIDGE_BODY_BYTES,
            {
              sceneBlueprintsDir: join(tempDir, 'stages'),
              characterVisualsDir: join(tempDir, 'characters'),
            },
          );
          expect(response.statusCode).toBe(200);
          expect(request.url).toBe(`/api/character-visuals/${visual.characterId}`);
          expect(response.body['visual']).toEqual(visual);
        },
      });
      lab.saveVisual(visual.characterId);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

interface FakeNode {
  readonly style: {
    position: string;
    top: string;
    left: string;
    color: string;
    font: string;
  };
  readonly dataset: Record<string, string>;
  textContent: string;
  type: string;
  readonly ownerDocument: { createElement: (tag: string) => FakeNode };
  readonly children: FakeNode[];
  append: (...nodes: FakeNode[]) => void;
  replaceChildren: () => void;
  addEventListener: (type: string, listener: () => void) => void;
}

function fakeNode(doc: { createElement: (tag: string) => FakeNode }): FakeNode {
  const node: FakeNode = {
    style: { position: '', top: '', left: '', color: '', font: '' },
    dataset: {},
    textContent: '',
    type: '',
    ownerDocument: doc,
    children: [],
    append: (...nodes: FakeNode[]) => {
      node.children.push(...nodes);
    },
    replaceChildren: () => {
      node.children.length = 0;
    },
    addEventListener: () => undefined,
  };
  return node;
}
