/**
 * Three.js 60 FPS Stage-Paint Chiaroscuro Scene Graph Builder & Frame Synchronizer
 * (`src/interfaces/three/ChiaroscuroStageRenderer.ts`).
 *
 * Constructs `THREE.Scene` and `THREE.Group` hierarchies from `EpochVisualTheme`,
 * `StageSceneBlueprint`, and `CharacterVisualBlueprint`, synchronizes `RenderFrame`
 * camera/entity/prop/fog/highlight state in O(N) time per frame, resolves raycast hits
 * to `semanticId`s, and deterministically disposes GPU resources (`disposeSceneGraph`).
 */
import * as THREE from 'three';
import type {
  CharacterVisualBlueprint,
  EpochVisualTheme,
  RenderFrame,
  StageSceneBlueprint,
  WallSegmentBlueprint,
} from '../../application/index.js';
import {
  buildCharacterKitbashGroup,
  buildStagePropGroup,
  buildWallMotifGroup,
  computeChiaroscuroColor,
  createChiaroscuroToonMaterial,
  disposeSharedChiaroscuroGradientMap,
  getSharedChiaroscuroGradientMap,
  resolveSurfaceMaterialHex,
} from './StageKitbashBuilders.js';

export interface BuiltStageScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly stageRoot: THREE.Group;
  readonly semanticIndex: ReadonlyMap<string, THREE.Object3D>;
  readonly entityGroups: ReadonlyMap<string, THREE.Group>;
  readonly propGroups: ReadonlyMap<string, THREE.Group>;
  readonly godRayCones: ReadonlyArray<THREE.Mesh>;
}

export interface DisposeSceneGraphOptions {
  readonly disposeSharedRamp?: boolean | undefined;
}

function positionWallSegmentGroup(
  group: THREE.Group,
  stage: StageSceneBlueprint,
  seg: WallSegmentBlueprint,
  fallbackIndex: number,
  totalOnCompass: number,
): void {
  const halfW = stage.footprint.widthMeters * 0.5;
  const halfD = stage.footprint.depthMeters * 0.5;
  const autoOffset = (fallbackIndex - (totalOnCompass - 1) * 0.5) * seg.widthMeters;
  const offset = seg.offsetAlongWallMeters ?? autoOffset;
  const recess = seg.zone === 'alcove' ? Math.max(0.4, seg.recessMeters) : seg.recessMeters;

  switch (seg.compass) {
    case 'north':
      group.position.set(offset, 0, -halfD - recess);
      group.rotation.y = 0;
      break;
    case 'south':
      group.position.set(offset, 0, halfD + recess);
      group.rotation.y = Math.PI;
      break;
    case 'east':
      group.position.set(halfW + recess, 0, offset);
      group.rotation.y = -Math.PI * 0.5;
      break;
    case 'west':
      group.position.set(-halfW - recess, 0, offset);
      group.rotation.y = Math.PI * 0.5;
      break;
  }
}

/**
 * Builds a complete Three.js chiaroscuro stage scene graph from `theme`, `stage`, and `characterVisuals`.
 * Every generated mesh and group carries `userData.semanticId` and is indexed in `semanticIndex`.
 */
export function buildStageSceneGraph(options: {
  readonly theme: EpochVisualTheme;
  readonly stage: StageSceneBlueprint;
  readonly characterVisuals?: ReadonlyArray<CharacterVisualBlueprint> | undefined;
}): BuiltStageScene {
  const { theme, stage } = options;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.shadowTintHex);
  scene.fog = new THREE.FogExp2(theme.fogColorHex, theme.fogDensity);

  const firstVol = stage.cameraVolumes[0];
  const camera = new THREE.PerspectiveCamera(firstVol?.fovDegrees ?? 42, 16 / 9, 0.1, 250);

  const stageRoot = new THREE.Group();
  stageRoot.name = stage.stageId;
  scene.add(stageRoot);

  // Ambient + directional chiaroscuro key light
  const ambientLight = new THREE.AmbientLight(theme.shadowTintHex, theme.ambientIntensity);
  stageRoot.add(ambientLight);

  const keyLight = new THREE.DirectionalLight('#ffffff', theme.keyLightIntensity);
  keyLight.position.set(
    -theme.keyLightDirection[0] * 20,
    -theme.keyLightDirection[1] * 20,
    -theme.keyLightDirection[2] * 20,
  );
  stageRoot.add(keyLight);

  const semanticIndex = new Map<string, THREE.Object3D>();
  const entityGroups = new Map<string, THREE.Group>();
  const propGroups = new Map<string, THREE.Group>();
  const godRayCones: THREE.Mesh[] = [];

  // 1. Floor mesh
  const floorGeom = new THREE.BoxGeometry(
    stage.footprint.widthMeters,
    0.2,
    stage.footprint.depthMeters,
  );
  const floorMat = createChiaroscuroToonMaterial({
    baseHex: theme.stoneColorHex,
    theme,
    extraGrime: 0.2,
  });
  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.name = stage.floorSemanticId;
  floorMesh.position.set(0, -0.1, 0);
  floorMesh.userData['semanticId'] = stage.floorSemanticId;
  stageRoot.add(floorMesh);
  semanticIndex.set(stage.floorSemanticId, floorMesh);

  // 2. Compass wall & alcove segments + parametric motifs
  const segmentsByCompass = new Map<string, WallSegmentBlueprint[]>();
  for (const seg of stage.wallSegments) {
    const list = segmentsByCompass.get(seg.compass) ?? [];
    list.push(seg);
    segmentsByCompass.set(seg.compass, list);
  }

  for (const seg of stage.wallSegments) {
    const compassSiblings = segmentsByCompass.get(seg.compass) ?? [seg];
    const indexOnCompass = compassSiblings.indexOf(seg);

    const segGroup = new THREE.Group();
    segGroup.name = seg.semanticId;
    segGroup.userData['semanticId'] = seg.semanticId;
    positionWallSegmentGroup(
      segGroup,
      stage,
      seg,
      Math.max(0, indexOnCompass),
      compassSiblings.length,
    );

    const wallGeom = new THREE.BoxGeometry(seg.widthMeters, seg.heightMeters, seg.thicknessMeters);
    const wallMat = createChiaroscuroToonMaterial({
      baseHex: resolveSurfaceMaterialHex(seg.surfaceMaterial, theme),
      theme,
    });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.set(0, seg.heightMeters * 0.5, 0);
    wallMesh.userData['semanticId'] = seg.semanticId;
    segGroup.add(wallMesh);

    for (const motif of seg.motifs) {
      const motifGroup = buildWallMotifGroup(seg.semanticId, motif, theme);
      segGroup.add(motifGroup);
      const motifSemId = motifGroup.userData['semanticId'] as string | undefined;
      if (motifSemId !== undefined) {
        semanticIndex.set(motifSemId, motifGroup);
      }
    }

    stageRoot.add(segGroup);
    semanticIndex.set(seg.semanticId, segGroup);
  }

  // 3. Stage props & portals
  for (const prop of stage.props) {
    const propGroup = buildStagePropGroup(prop, theme);
    stageRoot.add(propGroup);
    propGroups.set(prop.propId, propGroup);
    semanticIndex.set(prop.semanticId, propGroup);
  }

  // 4. Torch/forge point lights & optional alpha-cone god-rays
  for (const lightSpec of stage.lights) {
    const lightGroup = new THREE.Group();
    lightGroup.name = lightSpec.semanticId;
    lightGroup.position.set(lightSpec.position[0], lightSpec.position[1], lightSpec.position[2]);
    lightGroup.userData['semanticId'] = lightSpec.semanticId;

    const pointLight = new THREE.PointLight(
      lightSpec.colorHex,
      lightSpec.intensity,
      lightSpec.falloffDistance,
    );
    pointLight.userData['semanticId'] = lightSpec.semanticId;
    lightGroup.add(pointLight);

    if (lightSpec.hasGodRayCone) {
      const coneGeom = new THREE.ConeGeometry(1.4, 3.6, 12, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(lightSpec.colorHex),
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const coneMesh = new THREE.Mesh(coneGeom, coneMat);
      coneMesh.name = `${lightSpec.semanticId}.godray`;
      coneMesh.position.set(0, -1.8, 0);
      coneMesh.userData['semanticId'] = lightSpec.semanticId;
      lightGroup.add(coneMesh);
      godRayCones.push(coneMesh);
    }

    stageRoot.add(lightGroup);
    semanticIndex.set(lightSpec.semanticId, lightGroup);
  }

  // 5. Character posture/wardrobe kitbash groups
  for (const charVis of options.characterVisuals ?? []) {
    const charGroup = buildCharacterKitbashGroup(charVis, theme);
    stageRoot.add(charGroup);
    entityGroups.set(charVis.characterId, charGroup);

    charGroup.traverse((child) => {
      const semId = child.userData['semanticId'] as string | undefined;
      if (semId !== undefined && !semanticIndex.has(semId)) {
        semanticIndex.set(semId, child);
      }
    });
  }

  return {
    scene,
    camera,
    stageRoot,
    semanticIndex,
    entityGroups,
    propGroups,
    godRayCones,
  };
}

/**
 * Walks up the `THREE.Object3D` parent hierarchy to resolve the nearest `userData.semanticId`.
 */
export function resolveSemanticIdFromObject(
  object: THREE.Object3D | null | undefined,
): string | null {
  let current: THREE.Object3D | null | undefined = object;
  while (current !== null && current !== undefined) {
    const semId = current.userData['semanticId'];
    if (typeof semId === 'string' && semId.length > 0) {
      return semId;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Finds the first `THREE.Object3D` in `root` with matching `userData.semanticId`, or `null` if absent.
 */
export function findObjectBySemanticId(
  root: THREE.Object3D,
  semanticId: string,
): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found === null && obj.userData['semanticId'] === semanticId) {
      found = obj;
    }
  });
  return found;
}

/**
 * Synchronizes a `BuiltStageScene` with the latest `RenderFrame` in O(N) time:
 * updates camera transform/FOV, `FogExp2` density, god-ray visibility, entity poses,
 * portal door hinge angles, desaturation, and selection emissive highlight.
 */
export function applyRenderFrameToScene(
  built: BuiltStageScene,
  frame: RenderFrame,
  theme: EpochVisualTheme,
): void {
  const { camera, scene } = built;
  camera.position.set(frame.camera.position[0], frame.camera.position[1], frame.camera.position[2]);
  camera.lookAt(frame.camera.lookAt[0], frame.camera.lookAt[1], frame.camera.lookAt[2]);
  if (frame.camera.rollDegrees !== 0) {
    camera.rotateZ((frame.camera.rollDegrees * Math.PI) / 180);
  }
  camera.fov = frame.camera.fovDegrees;
  camera.aspect = frame.camera.aspect;
  camera.near = frame.camera.near;
  camera.far = frame.camera.far;
  camera.updateProjectionMatrix();

  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = frame.effectiveFogDensity;
    scene.fog.color.set(frame.fogColorHex);
  }

  for (const cone of built.godRayCones) {
    cone.visible = !frame.suppressGodRays;
  }

  for (const pose of frame.entityPoses) {
    const group = built.entityGroups.get(pose.entityId);
    if (group !== undefined) {
      group.position.set(pose.position[0], pose.position[1], pose.position[2]);
      group.rotation.y = pose.yawRadians;
      group.visible = pose.spaceId === frame.activeSpaceId;
    }
  }

  for (const propPose of frame.propPoses) {
    const group = built.propGroups.get(propPose.propId);
    if (group !== undefined) {
      group.position.set(propPose.position[0], propPose.position[1], propPose.position[2]);
      group.rotation.y = propPose.yawRadians + propPose.hingeYawOffsetRadians;
    }
  }

  const selectedId = frame.domMirror.selectedSemanticId;
  const hoveredId = frame.domMirror.hoveredSemanticId;

  built.stageRoot.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) {
      return;
    }
    const mat = obj.material;
    if (!(mat instanceof THREE.MeshToonMaterial)) {
      return;
    }
    const baseHex = mat.userData['baseHex'] as string | undefined;
    const extraGrime = (mat.userData['extraGrime'] as number | undefined) ?? 0;
    const lastDesat = mat.userData['lastDesaturation'] as number | undefined;
    if (baseHex !== undefined && lastDesat !== frame.effectiveDesaturation) {
      mat.color.copy(
        computeChiaroscuroColor(baseHex, theme, frame.effectiveDesaturation, extraGrime),
      );
      mat.userData['lastDesaturation'] = frame.effectiveDesaturation;
    }

    const semId = resolveSemanticIdFromObject(obj);
    if (selectedId !== null && semId === selectedId) {
      mat.emissive.set('#4fd2ff');
      mat.emissiveIntensity = 0.35;
    } else if (hoveredId !== null && semId === hoveredId) {
      mat.emissive.set('#c4a574');
      mat.emissiveIntensity = 0.2;
    } else {
      const baseEmissiveHex = (mat.userData['baseEmissiveHex'] as string | undefined) ?? '#000000';
      const baseEmissiveIntensity =
        (mat.userData['baseEmissiveIntensity'] as number | undefined) ?? 0;
      mat.emissive.set(baseEmissiveHex);
      mat.emissiveIntensity = baseEmissiveIntensity;
    }
  });
}

/**
 * Deterministically disposes all geometries and materials in `root`, preserving the shared
 * singleton 3-band chiaroscuro gradient `DataTexture` unless `options.disposeSharedRamp === true`.
 */
export function disposeSceneGraph(
  root: THREE.Object3D,
  options?: DisposeSceneGraphOptions,
): { readonly disposedGeometries: number; readonly disposedMaterials: number } {
  const sharedRamp = getSharedChiaroscuroGradientMap();
  const seenGeometries = new Set<THREE.BufferGeometry>();
  const seenMaterials = new Set<THREE.Material>();

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry instanceof THREE.BufferGeometry) {
        seenGeometries.add(obj.geometry);
      }
      if (Array.isArray(obj.material)) {
        for (const m of obj.material) {
          if (m instanceof THREE.Material) {
            seenMaterials.add(m);
          }
        }
      } else if (obj.material instanceof THREE.Material) {
        seenMaterials.add(obj.material);
      }
    }
  });

  for (const geom of seenGeometries) {
    geom.dispose();
  }

  for (const mat of seenMaterials) {
    if (
      mat instanceof THREE.MeshToonMaterial &&
      mat.gradientMap !== null &&
      mat.gradientMap !== sharedRamp
    ) {
      mat.gradientMap.dispose();
    }
    mat.dispose();
  }

  if (options?.disposeSharedRamp === true) {
    disposeSharedChiaroscuroGradientMap();
  }

  return {
    disposedGeometries: seenGeometries.size,
    disposedMaterials: seenMaterials.size,
  };
}
