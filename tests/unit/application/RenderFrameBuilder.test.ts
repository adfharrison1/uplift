import { describe, expect, it } from 'vitest';
import {
  CharacterVisualBlueprintSchema,
  EpochVisualThemeSchema,
  projectWorldToNdc,
  RenderFrameBuilder,
  selectActiveCameraVolume,
  StageSceneBlueprintSchema,
} from '../../../src/application/index.js';
import {
  applyWorldEffects,
  createInitialWorldState,
  type EntitySimulationState,
} from '../../../src/domain/index.js';

function makeEntity(
  entityId: string,
  position: readonly [number, number, number],
): EntitySimulationState {
  return {
    entityId,
    lineageId: `lineage_${entityId}`,
    spaceId: 'charnel_stairs',
    waypointId: 'wp_1',
    position,
    yawRadians: 0.4,
    walkSpeedMetersPerSec: 1.4,
    yawSpeedRadiansPerSec: 6.0,
    cognitivePhase: 'idle',
    phaseRemainingSeconds: 0,
    pendingDwellSeconds: 5,
    pendingCooldownSeconds: 2,
    requiresExternalTrigger: false,
    activePath: [],
    drives: { curiosity: 0.7 },
    emergencyVice: 'curiosity',
    inertiaPillars: [],
    pendingStimuli: [],
  };
}

function makeTheme(desaturationFactor = 0.3) {
  return EpochVisualThemeSchema.parse({
    id: 'theme_highglass',
    epochId: 'epoch_1',
    name: 'Highglass Chiaroscuro',
    stoneColorHex: '#4a525d',
    mudColorHex: '#3b3228',
    ironColorHex: '#2c3137',
    woodColorHex: '#523d2b',
    desaturationFactor,
    fogDensity: 0.025,
  });
}

function makeStage() {
  return StageSceneBlueprintSchema.parse({
    stageId: 'stage_charnel',
    spaceId: 'charnel_stairs',
    themeId: 'theme_highglass',
    footprint: { widthMeters: 20, depthMeters: 20, heightMeters: 6 },
    floorSemanticId: 'charnel_stairs.floor',
    wallSegments: [
      {
        segmentId: 'seg_02',
        compass: 'north',
        zone: 'wall',
        semanticId: 'charnel_stairs.wall.north.seg_02',
        widthMeters: 5,
        heightMeters: 5,
        motifs: [{ id: 'ossuary_skull_niche', count: 24 }],
      },
    ],
    props: [
      {
        propId: 'door_01',
        semanticId: 'charnel_stairs.prop.door_01',
        kitbashId: 'oak_portal_door',
        position: [0, 0, -4],
        isPortal: true,
      },
    ],
    cameraVolumes: [
      {
        id: 'vol_courtyard_wide',
        spaceId: 'charnel_stairs',
        priority: 0,
        boundsMin: [-10, 0, -10],
        boundsMax: [10, 6, 10],
        offset: [0, 10, 12],
        pitchDegrees: -35,
        yawDegrees: 170,
        fovDegrees: 46,
        springStiffness: 12,
      },
      {
        id: 'vol_alcove_tight',
        spaceId: 'charnel_stairs',
        priority: 10,
        boundsMin: [-2, 0, -2],
        boundsMax: [2, 4, 2],
        offset: [0, 4, 5],
        pitchDegrees: -22,
        yawDegrees: -170,
        fovDegrees: 34,
        springStiffness: 12,
      },
      {
        id: 'vol_tie_smaller',
        spaceId: 'charnel_stairs',
        priority: 10,
        boundsMin: [-1, 0, -1],
        boundsMax: [1, 2, 1],
        offset: [0, 4, 6],
        pitchDegrees: -20,
        yawDegrees: -170,
        fovDegrees: 36,
        springStiffness: 12,
      },
    ],
  });
}

describe('RenderFrameBuilder', () => {
  it('selects CameraVolumeBlueprint by priority then smallest AABB, falls back when outside all volumes, and interpolates smoothly via critically damped springs', () => {
    const theme = makeTheme();
    const stage = makeStage();
    const builder = new RenderFrameBuilder();

    // Outside all volumes ([99, 0, 99]) falls back to first volume ('vol_courtyard_wide')
    expect(selectActiveCameraVolume(stage, [99, 0, 99]).id).toBe('vol_courtyard_wide');
    // At [0, 0, 0], both priority-10 volumes contain the point -> smallest AABB ('vol_tie_smaller') wins
    expect(selectActiveCameraVolume(stage, [0, 0, 0]).id).toBe('vol_tie_smaller');

    const stateOutside = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        char_alpha: makeEntity('char_alpha', [6, 0, 6]),
      },
    });

    // Frame 1 at [6, 0, 6]: inside outer courtyard volume (priority 0)
    const frame1 = builder.buildFrame({
      worldState: stateOutside,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      dtSeconds: 1 / 60,
    });

    expect(frame1.camera.activeVolumeId).toBe('vol_courtyard_wide');
    expect(frame1.camera.fovDegrees).toBeCloseTo(46);
    expect(frame1.camera.pitchDegrees).toBeCloseTo(-35);
    expect(frame1.camera.yawDegrees).toBeCloseTo(170);

    // Move char_alpha into [1.5, 0, 1.5], inside vol_alcove_tight (priority 10, yaw -170)
    const stateInside = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        char_alpha: makeEntity('char_alpha', [1.5, 0, 1.5]),
      },
    });

    const frame2 = builder.buildFrame({
      worldState: stateInside,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      dtSeconds: 1 / 60,
    });

    expect(frame2.camera.activeVolumeId).toBe('vol_alcove_tight');
    // Spring smoothly moves FOV (46 -> 34), pitch (-35 -> -22), and position Y (10 -> 4) without instantaneous snap
    expect(frame2.camera.fovDegrees).toBeLessThan(46);
    expect(frame2.camera.fovDegrees).toBeGreaterThan(34);
    expect(frame2.camera.pitchDegrees).toBeGreaterThan(-35);
    expect(frame2.camera.pitchDegrees).toBeLessThan(-22);
    expect(frame2.camera.position[1]).toBeLessThan(10);
    expect(frame2.camera.position[1]).toBeGreaterThan(4);

    // Oversized dtSeconds spike (5.0s) is clamped to 0.25s without overshooting past target
    const spikeFrame = builder.buildFrame({
      worldState: stateInside,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      dtSeconds: 5.0,
    });
    expect(Number.isFinite(spikeFrame.camera.fovDegrees)).toBe(true);
    expect(spikeFrame.camera.fovDegrees).toBeGreaterThanOrEqual(34);

    for (let i = 0; i < 40; i += 1) {
      builder.buildFrame({
        worldState: stateInside,
        theme,
        stage,
        focusEntityId: 'char_alpha',
        dtSeconds: 1 / 60,
      });
    }

    const converged = builder.buildFrame({
      worldState: stateInside,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      dtSeconds: 1 / 60,
    });
    expect(converged.camera.fovDegrees).toBeCloseTo(34, 2);
    expect(converged.camera.pitchDegrees).toBeCloseTo(-22, 2);
    expect(converged.camera.yawDegrees).toBeCloseTo(-170, 1);
  });

  it('applies Emergency and orbital Zenith Burn camera tilts & fog density, respects reduceMotionAndFlashing, and switches to debug_free_cam with +0.40 desaturation (clamped to 1.0)', () => {
    const theme = makeTheme(0.3);
    const highDesatTheme = makeTheme(0.8);
    const stage = makeStage();

    const baseWorld = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        char_alpha: makeEntity('char_alpha', [6, 0, 6]),
      },
    });

    const { state: emergencyAndBurnWorld } = applyWorldEffects(baseWorld, [
      { type: 'trigger_emergency', emergencyId: 'emergency_plague' },
      { type: 'spend_orbital_delta', mode: 'burn', cost: 15 },
    ]);

    const builderNormal = new RenderFrameBuilder();
    const normalFrame = builderNormal.buildFrame({
      worldState: emergencyAndBurnWorld,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      reduceMotionAndFlashing: false,
    });

    // Base pitch -35, emergency -2.0, zenith burn -1.5 -> -38.5; roll +1.5; fogDensity * 1.35
    expect(normalFrame.camera.pitchDegrees).toBeCloseTo(-38.5);
    expect(normalFrame.camera.rollDegrees).toBeCloseTo(1.5);
    expect(normalFrame.effectiveFogDensity).toBeCloseTo(0.025 * 1.35);
    expect(normalFrame.suppressGodRays).toBe(false);

    // With reduceMotionAndFlashing: true, camera tilts and emergency fog boost are suppressed and god-rays are disabled
    const builderReduced = new RenderFrameBuilder();
    const reducedFrame = builderReduced.buildFrame({
      worldState: emergencyAndBurnWorld,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      reduceMotionAndFlashing: true,
    });
    expect(reducedFrame.camera.pitchDegrees).toBeCloseTo(-35);
    expect(reducedFrame.camera.rollDegrees).toBe(0);
    expect(reducedFrame.effectiveFogDensity).toBeCloseTo(0.025);
    expect(reducedFrame.suppressGodRays).toBe(true);

    // F3 Debug Mode + cameraDeAnchored switches to debug_free_cam, applies freeCamOffset, and boosts desaturation by +0.40
    const deAnchoredFrame = builderReduced.buildFrame({
      worldState: emergencyAndBurnWorld,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      debugMode: true,
      cameraDeAnchored: true,
      freeCamOffset: [3, 2, -4],
    });
    expect(deAnchoredFrame.camera.cameraMode).toBe('debug_free_cam');
    expect(deAnchoredFrame.camera.position).toEqual([6 + 3, 10 + 2, 6 + 12 - 4]);
    expect(deAnchoredFrame.effectiveDesaturation).toBeCloseTo(0.7);
    expect(deAnchoredFrame.domMirror.cameraMode).toBe('debug_free_cam');
    expect(deAnchoredFrame.domMirror.debugPaused).toBe(true);

    // Theme with 0.8 desaturation clamps to 1.0 under cameraDeAnchored
    const clampedFrame = builderReduced.buildFrame({
      worldState: emergencyAndBurnWorld,
      theme: highDesatTheme,
      stage,
      focusEntityId: 'char_alpha',
      debugMode: true,
      cameraDeAnchored: true,
    });
    expect(clampedFrame.effectiveDesaturation).toBe(1.0);
  });

  it('projects 3D world anchors into NDC with behind-camera and out-of-frustum culling and emits DebugInspectorCards for entities, props, and wall segments', () => {
    const theme = makeTheme();
    const stage = makeStage();
    const builder = new RenderFrameBuilder();
    const charVisual = CharacterVisualBlueprintSchema.parse({
      characterId: 'char_in_front',
      lineageId: 'lineage_char_in_front',
      heightScale: 1.1,
      primaryColorHex: '#3a404a',
      accentColorHex: '#7a684b',
    });

    // Camera at [0, 3, 4] looking at [0, 0, 0] (in vol_tie_smaller).
    // char_in_front at [0, 0, 0] is in front; char_behind at [0, 8, 12] is behind; char_offscreen at [50, 0, 0] is off-screen right.
    const world = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        char_in_front: makeEntity('char_in_front', [0, 0, 0]),
        char_behind: makeEntity('char_behind', [0, 8, 12]),
        char_offscreen: makeEntity('char_offscreen', [50, 0, 0]),
      },
      props: {
        door_01: {
          propId: 'door_01',
          spaceId: 'charnel_stairs',
          waypointId: 'wp_1',
          state: { locked: false },
          portalState: 'open',
        },
      },
    });

    const frame = builder.buildFrame({
      worldState: world,
      theme,
      stage,
      characterVisuals: [charVisual],
      focusPositionOverride: [0, 0, 0],
      debugMode: true,
      hoveredSemanticId: 'charnel_stairs.wall.north.seg_02',
      selectedSemanticId: 'npc.char_in_front',
    });

    expect(frame.propPoses[0]?.hingeYawOffsetRadians).toBeCloseTo(Math.PI * 0.5);

    const frontCard = frame.inspectorCards.find((c) => c.semanticId === 'npc.char_in_front');
    const behindCard = frame.inspectorCards.find((c) => c.semanticId === 'npc.char_behind');
    const offscreenCard = frame.inspectorCards.find((c) => c.semanticId === 'npc.char_offscreen');
    const propCard = frame.inspectorCards.find(
      (c) => c.semanticId === 'charnel_stairs.prop.door_01',
    );
    const wallCard = frame.inspectorCards.find(
      (c) => c.semanticId === 'charnel_stairs.wall.north.seg_02',
    );

    expect(frontCard).toBeDefined();
    expect(frontCard?.worldAnchor[1]).toBeCloseTo(1.8 * 1.1);
    expect(frontCard?.ndc.visibleInFrustum).toBe(true);
    expect(Math.abs(frontCard?.ndc.ndcX ?? 99)).toBeLessThanOrEqual(1);
    expect(Math.abs(frontCard?.ndc.ndcY ?? 99)).toBeLessThanOrEqual(1);
    expect(Math.abs(frontCard?.ndc.ndcZ ?? 99)).toBeLessThanOrEqual(1);

    expect(behindCard).toBeDefined();
    expect(behindCard?.ndc.clipW).toBeLessThanOrEqual(0);
    expect(behindCard?.ndc.visibleInFrustum).toBe(false);
    expect(behindCard?.ndc.ndcX).toBe(0);
    expect(behindCard?.ndc.ndcY).toBe(0);

    expect(offscreenCard).toBeDefined();
    expect(offscreenCard?.ndc.visibleInFrustum).toBe(false);
    expect(offscreenCard?.ndc.ndcX).toBe(1);

    expect(propCard?.targetKind).toBe('prop');
    expect(propCard?.summary['portalState']).toBe('open');
    expect(wallCard?.targetKind).toBe('wall_segment');

    expect(frame.domMirror).toEqual({
      activeSpaceId: 'charnel_stairs',
      hoveredSemanticId: 'charnel_stairs.wall.north.seg_02',
      selectedSemanticId: 'npc.char_in_front',
      cameraMode: 'tracking_volume',
      debugPaused: false,
    });

    // Degenerate camera parameters return visibleInFrustum: false without NaN
    const degenerate = projectWorldToNdc([0, 0, 0], {
      ...frame.camera,
      fovDegrees: 0,
    });
    expect(degenerate.visibleInFrustum).toBe(false);
    expect(Number.isFinite(degenerate.ndcX)).toBe(true);
  });

  it('de-anchors the camera without building inspector cards', () => {
    const theme = makeTheme();
    const stage = makeStage();
    const world = createInitialWorldState({
      epochId: 'epoch_1',
      entities: { char_alpha: makeEntity('char_alpha', [0, 0, 0]) },
      props: {},
    });
    const frame = new RenderFrameBuilder().buildFrame({
      worldState: world,
      theme,
      stage,
      focusEntityId: 'char_alpha',
      cameraDeAnchored: true,
      freeCamOffset: [1, 0, 0],
    });
    expect(frame.camera.cameraMode).toBe('debug_free_cam');
    expect(frame.inspectorCards).toEqual([]);
    expect(frame.effectiveDesaturation).toBeCloseTo(0.7);
  });
});
