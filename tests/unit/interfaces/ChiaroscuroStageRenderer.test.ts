import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  CharacterVisualBlueprintSchema,
  EpochVisualThemeSchema,
  RenderFrameBuilder,
  StageSceneBlueprintSchema,
} from '../../../src/application/index.js';
import { applyWorldEffects, createInitialWorldState } from '../../../src/domain/index.js';
import {
  applyRenderFrameToScene,
  buildStageSceneGraph,
  disposeSceneGraph,
  findObjectBySemanticId,
  resolveSemanticIdFromObject,
} from '../../../src/interfaces/three/ChiaroscuroStageRenderer.js';
import { getSharedChiaroscuroGradientMap } from '../../../src/interfaces/three/StageKitbashBuilders.js';

describe('ChiaroscuroStageRenderer and StageKitbashBuilders', () => {
  it('builds a Three.js stage scene graph with all 6 canonical motifs, god-rays, props/portals, and character kitbash parts tagged with userData.semanticId', () => {
    const theme = EpochVisualThemeSchema.parse({
      id: 'theme_highglass',
      epochId: 'epoch_1',
      name: 'Highglass Chiaroscuro',
      stoneColorHex: '#4a525d',
      mudColorHex: '#3b3228',
      ironColorHex: '#2c3137',
      woodColorHex: '#523d2b',
    });

    const stage = StageSceneBlueprintSchema.parse({
      stageId: 'stage_charnel',
      spaceId: 'charnel_stairs',
      themeId: 'theme_highglass',
      footprint: { widthMeters: 16, depthMeters: 12, heightMeters: 5 },
      floorSemanticId: 'charnel_stairs.floor',
      wallSegments: [
        {
          segmentId: 'seg_02',
          compass: 'north',
          zone: 'wall',
          semanticId: 'charnel_stairs.wall.north.seg_02',
          widthMeters: 6,
          heightMeters: 5,
          motifs: [
            { id: 'ossuary_skull_niche', count: 6, columns: 3 },
            { id: 'lancet_window', count: 1 },
            { id: 'buttress_rib', count: 2 },
            { id: 'fulgurite_lens_sconce', count: 1 },
            { id: 'guild_anvil_rack', count: 1 },
            { id: 'torch_sconce', count: 2 },
            { id: 'custom_future_motif', count: 1 },
          ],
        },
      ],
      props: [
        {
          propId: 'door_01',
          semanticId: 'charnel_stairs.prop.door_01',
          kitbashId: 'oak_portal_door',
          position: [0, 0, -6],
          isPortal: true,
        },
      ],
      lights: [
        {
          id: 'torch_01',
          semanticId: 'charnel_stairs.light.torch_01',
          position: [0, 3, -5],
          colorHex: '#c4a574',
          intensity: 2.5,
          falloffDistance: 12,
          hasGodRayCone: true,
        },
      ],
      cameraVolumes: [
        {
          id: 'vol_main',
          spaceId: 'charnel_stairs',
          boundsMin: [-8, 0, -6],
          boundsMax: [8, 5, 6],
          offset: [0, 6, 8],
        },
      ],
    });

    const sorrelVisual = CharacterVisualBlueprintSchema.parse({
      characterId: 'sorrel',
      lineageId: 'lineage_sorrel',
      heightScale: 0.96,
      shoulderWidth: 0.5,
      spinePitchRadians: 0.25,
      gaitStyle: 'stooped',
      headgear: 'synod_cowl',
      cloak: 'waxed_mantle',
      heldPropLeft: 'taper_holder',
      heldPropRight: 'ledger_book',
      primaryColorHex: '#3a404a',
      accentColorHex: '#7a684b',
      mudLevel: 0.3,
      sootLevel: 0.2,
      droneDisguise: 'bronze_reliquary_lamp',
    });

    const built = buildStageSceneGraph({
      theme,
      stage,
      characterVisuals: [sorrelVisual],
    });

    expect(built.scene.fog).toBeInstanceOf(THREE.FogExp2);
    expect(built.godRayCones).toHaveLength(1);
    expect(built.godRayCones[0]?.userData['semanticId']).toBe('charnel_stairs.light.torch_01');
    expect(built.semanticIndex.has('charnel_stairs.floor')).toBe(true);
    expect(built.semanticIndex.has('charnel_stairs.wall.north.seg_02')).toBe(true);
    expect(built.semanticIndex.has('charnel_stairs.light.torch_01')).toBe(true);

    // Verify all 6 canonical motifs + custom fallback motif are indexed by semanticId
    expect(
      built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.ossuary_skull_niche'),
    ).toBe(true);
    expect(built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.lancet_window')).toBe(
      true,
    );
    expect(built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.buttress_rib')).toBe(
      true,
    );
    expect(
      built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.fulgurite_lens_sconce'),
    ).toBe(true);
    expect(built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.guild_anvil_rack')).toBe(
      true,
    );
    expect(built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.torch_sconce')).toBe(
      true,
    );
    expect(
      built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.custom_future_motif'),
    ).toBe(true);

    // Verify character parts and spinePitchRadians
    const headgearObj = findObjectBySemanticId(built.stageRoot, 'npc.sorrel.part.headgear');
    const cloakObj = findObjectBySemanticId(built.stageRoot, 'npc.sorrel.part.cloak');
    const leftPropObj = findObjectBySemanticId(built.stageRoot, 'npc.sorrel.part.held_prop_left');
    const rightPropObj = findObjectBySemanticId(built.stageRoot, 'npc.sorrel.part.held_prop_right');
    const droneObj = findObjectBySemanticId(built.stageRoot, 'npc.sorrel.part.drone_disguise');
    expect(headgearObj).not.toBeNull();
    expect(cloakObj).not.toBeNull();
    expect(leftPropObj).not.toBeNull();
    expect(rightPropObj).not.toBeNull();
    expect(droneObj).not.toBeNull();

    // Parent-chain semanticId walk for untagged child meshes
    const untaggedChild = new THREE.Object3D();
    headgearObj?.add(untaggedChild);
    expect(resolveSemanticIdFromObject(untaggedChild)).toBe('npc.sorrel.part.headgear');
    expect(resolveSemanticIdFromObject(new THREE.Object3D())).toBeNull();
    expect(findObjectBySemanticId(built.stageRoot, 'npc.missing.part.head')).toBeNull();

    const sorrelGroup = built.entityGroups.get('sorrel');
    const spineGroup = sorrelGroup?.children[0];
    expect(spineGroup?.rotation.x).toBeCloseTo(0.25);
  });

  it('synchronizes RenderFrame camera, fog, entity/prop transforms, preserves warm emissives on unselected meshes, and disposes scene graphs cleanly', () => {
    const theme = EpochVisualThemeSchema.parse({
      id: 'theme_highglass',
      epochId: 'epoch_1',
      name: 'Highglass Chiaroscuro',
      stoneColorHex: '#4a525d',
      mudColorHex: '#3b3228',
      ironColorHex: '#2c3137',
      woodColorHex: '#523d2b',
    });

    const stage = StageSceneBlueprintSchema.parse({
      stageId: 'stage_charnel',
      spaceId: 'charnel_stairs',
      themeId: 'theme_highglass',
      footprint: { widthMeters: 16, depthMeters: 12, heightMeters: 5 },
      floorSemanticId: 'charnel_stairs.floor',
      wallSegments: [
        {
          segmentId: 'seg_02',
          compass: 'north',
          zone: 'wall',
          semanticId: 'charnel_stairs.wall.north.seg_02',
          widthMeters: 6,
          heightMeters: 5,
          motifs: [{ id: 'torch_sconce', count: 2 }],
        },
      ],
      props: [
        {
          propId: 'door_01',
          semanticId: 'charnel_stairs.prop.door_01',
          kitbashId: 'oak_portal_door',
          position: [0, 0, -6],
          isPortal: true,
        },
      ],
      lights: [
        {
          id: 'torch_01',
          semanticId: 'charnel_stairs.light.torch_01',
          position: [0, 3, -5],
          hasGodRayCone: true,
        },
      ],
      cameraVolumes: [
        {
          id: 'vol_main',
          spaceId: 'charnel_stairs',
          boundsMin: [-8, 0, -6],
          boundsMax: [8, 5, 6],
          offset: [0, 6, 8],
        },
      ],
    });

    const sorrelVisual = CharacterVisualBlueprintSchema.parse({
      characterId: 'sorrel',
      lineageId: 'lineage_sorrel',
      primaryColorHex: '#3a404a',
      accentColorHex: '#7a684b',
      droneDisguise: 'bronze_reliquary_lamp',
    });

    const built = buildStageSceneGraph({
      theme,
      stage,
      characterVisuals: [sorrelVisual],
    });

    const baseWorld = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        sorrel: {
          entityId: 'sorrel',
          lineageId: 'lineage_sorrel',
          spaceId: 'charnel_stairs',
          waypointId: 'wp_1',
          position: [2.5, 0, -1.5],
          yawRadians: 1.2,
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6.0,
          cognitivePhase: 'moving',
          phaseRemainingSeconds: 0,
          pendingDwellSeconds: 5,
          pendingCooldownSeconds: 2,
          requiresExternalTrigger: false,
          activePath: [],
          drives: { curiosity: 0.8 },
          emergencyVice: 'curiosity',
          inertiaPillars: [],
          pendingStimuli: [],
        },
      },
      props: {
        door_01: {
          propId: 'door_01',
          spaceId: 'charnel_stairs',
          waypointId: 'wp_1',
          state: {},
          portalState: 'open',
        },
      },
    });
    const { state: emergencyWorld } = applyWorldEffects(baseWorld, [
      { type: 'trigger_emergency', emergencyId: 'emergency_plague' },
    ]);

    const frameBuilder = new RenderFrameBuilder();
    const frame = frameBuilder.buildFrame({
      worldState: emergencyWorld,
      theme,
      stage,
      characterVisuals: [sorrelVisual],
      focusEntityId: 'sorrel',
      debugMode: true,
      selectedSemanticId: 'charnel_stairs.floor',
      reduceMotionAndFlashing: false,
    });

    applyRenderFrameToScene(built, frame, theme);
    const quatAfterFrame1 = built.camera.quaternion.clone();
    // Applying the same emergency frame a second time does not accumulate camera roll
    applyRenderFrameToScene(built, frame, theme);
    expect(built.camera.quaternion.x).toBeCloseTo(quatAfterFrame1.x, 6);
    expect(built.camera.quaternion.y).toBeCloseTo(quatAfterFrame1.y, 6);
    expect(built.camera.quaternion.z).toBeCloseTo(quatAfterFrame1.z, 6);
    expect(built.camera.quaternion.w).toBeCloseTo(quatAfterFrame1.w, 6);

    expect(built.camera.position.x).toBeCloseTo(frame.camera.position[0]);
    expect(built.camera.position.y).toBeCloseTo(frame.camera.position[1]);
    expect(built.camera.position.z).toBeCloseTo(frame.camera.position[2]);
    expect(built.camera.fov).toBeCloseTo(frame.camera.fovDegrees);
    expect((built.scene.fog as THREE.FogExp2).density).toBeCloseTo(frame.effectiveFogDensity);

    const sorrelGroup = built.entityGroups.get('sorrel');
    expect(sorrelGroup?.position.x).toBeCloseTo(2.5);
    expect(sorrelGroup?.position.z).toBeCloseTo(-1.5);
    expect(sorrelGroup?.rotation.y).toBeCloseTo(1.2);

    const doorGroup = built.propGroups.get('door_01');
    expect(doorGroup?.rotation.y).toBeCloseTo(Math.PI * 0.5);
    expect(built.godRayCones[0]?.visible).toBe(true);

    // Selected floor mesh has cyan selection highlight (0.35), while unselected drone mesh preserves its base warm emissive (0.3)
    const floorMesh = findObjectBySemanticId(built.stageRoot, 'charnel_stairs.floor') as THREE.Mesh;
    const floorMat = floorMesh.material as THREE.MeshToonMaterial;
    expect(floorMat.emissiveIntensity).toBeCloseTo(0.35);

    const droneMesh = findObjectBySemanticId(
      built.stageRoot,
      'npc.sorrel.part.drone_disguise',
    ) as THREE.Mesh;
    const droneMat = droneMesh.material as THREE.MeshToonMaterial;
    expect(droneMat.emissiveIntensity).toBeCloseTo(0.3);

    const sharedRamp = getSharedChiaroscuroGradientMap();
    const rampDisposeSpy = vi.spyOn(sharedRamp, 'dispose');
    const geomDisposeSpy = vi.spyOn(floorMesh.geometry, 'dispose');
    const matDisposeSpy = vi.spyOn(floorMat, 'dispose');

    const disposed = disposeSceneGraph(built.stageRoot);
    expect(disposed.disposedGeometries).toBeGreaterThan(0);
    expect(disposed.disposedMaterials).toBeGreaterThan(0);
    expect(geomDisposeSpy).toHaveBeenCalledOnce();
    expect(matDisposeSpy).toHaveBeenCalledOnce();
    expect(rampDisposeSpy).not.toHaveBeenCalled();

    // Rebuilt stage reuses the same shared ramp texture, and disposeSharedRamp: true disposes it
    const rebuilt = buildStageSceneGraph({ theme, stage });
    const rebuiltFloor = findObjectBySemanticId(
      rebuilt.stageRoot,
      'charnel_stairs.floor',
    ) as THREE.Mesh;
    expect((rebuiltFloor.material as THREE.MeshToonMaterial).gradientMap).toBe(sharedRamp);

    disposeSceneGraph(rebuilt.stageRoot, { disposeSharedRamp: true });
    expect(rampDisposeSpy).toHaveBeenCalledOnce();
  });

  it('does not create a mesh for a pose with no matching visual', () => {
    const theme = EpochVisualThemeSchema.parse({
      id: 'theme_highglass',
      epochId: 'epoch_1',
      name: 'Highglass Chiaroscuro',
      stoneColorHex: '#4a525d',
      mudColorHex: '#3b3228',
      ironColorHex: '#2c3137',
      woodColorHex: '#523d2b',
    });
    const stage = StageSceneBlueprintSchema.parse({
      stageId: 'stage_bare',
      spaceId: 'space_bare',
      themeId: 'theme_highglass',
      footprint: { widthMeters: 12, depthMeters: 10, heightMeters: 4.5 },
      floorSemanticId: 'space_bare.floor',
      wallSegments: [
        {
          segmentId: 'seg_01',
          compass: 'north',
          semanticId: 'space_bare.wall.north.seg_01',
        },
      ],
      props: [],
      cameraVolumes: [
        {
          id: 'vol_bare',
          spaceId: 'space_bare',
          boundsMin: [-6, 0, -5],
          boundsMax: [6, 4.5, 5],
          offset: [0, 6, 8],
        },
      ],
    });
    const built = buildStageSceneGraph({ theme, stage, characterVisuals: [] });
    expect(built.entityGroups.size).toBe(0);
    const world = createInitialWorldState({
      epochId: 'epoch_1',
      entities: {
        absent: {
          entityId: 'absent',
          lineageId: 'lineage_absent',
          spaceId: 'space_bare',
          waypointId: 'wp_1',
          position: [0, 0, 0],
          yawRadians: 0,
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          cognitivePhase: 'idle',
          phaseRemainingSeconds: 0,
          pendingDwellSeconds: 0,
          pendingCooldownSeconds: 0,
          requiresExternalTrigger: false,
          activePath: [],
          drives: { duty: 0.4 },
          emergencyVice: 'duty',
          inertiaPillars: [],
          pendingStimuli: [],
        },
      },
      props: {},
    });
    const frame = new RenderFrameBuilder().buildFrame({
      worldState: world,
      theme,
      stage,
      characterVisuals: [],
      focusEntityId: 'absent',
    });
    expect(frame.entityPoses.some((pose) => pose.entityId === 'absent')).toBe(true);
    expect(() => applyRenderFrameToScene(built, frame, theme)).not.toThrow();
    expect(built.entityGroups.has('absent')).toBe(false);
  });
});
