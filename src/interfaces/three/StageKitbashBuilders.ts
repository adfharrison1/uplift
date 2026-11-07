/**
 * Stage-Paint Chiaroscuro Toon Material Ramp, Parametric Architectural Motif Builders,
 * and Character Posture/Wardrobe Kitbashers (`src/interfaces/three/StageKitbashBuilders.ts`).
 *
 * Implements Layer 3 of the Encoded Visual Authoring Framework using Three.js,
 * stamping every generated `THREE.Object3D` and `THREE.Mesh` with its deterministic
 * `userData.semanticId`.
 */
import * as THREE from 'three';
import {
  type CharacterVisualBlueprint,
  type EpochVisualTheme,
  formatCharacterPartSemanticId,
  formatCharacterRootSemanticId,
  formatWallMotifSemanticId,
  type StagePropVisualBlueprint,
  type WallMotifInstance,
} from '../../application/index.js';

export type {
  CameraVolumeBlueprint,
  CharacterVisualBlueprint,
  EpochVisualTheme,
  StageLightBlueprint,
  StagePropVisualBlueprint,
  StageSceneBlueprint,
  WallMotifInstance,
  WallSegmentBlueprint,
} from '../../application/index.js';
export {
  CharacterVisualBlueprintSchema,
  EpochVisualThemeSchema,
  formatCharacterPartSemanticId,
  formatCharacterRootSemanticId,
  formatFloorSemanticId,
  formatLightSemanticId,
  formatPropSemanticId,
  formatWallMotifSemanticId,
  formatWallSegmentSemanticId,
  StageSceneBlueprintSchema,
} from '../../application/index.js';

let sharedChiaroscuroGradientTexture: THREE.DataTexture | null = null;

/**
 * Returns the shared singleton 3-band stepped chiaroscuro gradient `THREE.DataTexture`
 * (`THREE.NearestFilter`) used by all `THREE.MeshToonMaterial` instances across stages.
 */
export function getSharedChiaroscuroGradientMap(): THREE.DataTexture {
  if (sharedChiaroscuroGradientTexture !== null) {
    return sharedChiaroscuroGradientTexture;
  }
  // 3 stepped luminance bands: deep shadow (45), mid-tone (135), chiaroscuro highlight (235)
  const data = new Uint8Array([45, 45, 52, 255, 135, 135, 140, 255, 235, 232, 224, 255]);
  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedChiaroscuroGradientTexture = texture;
  return texture;
}

export function disposeSharedChiaroscuroGradientMap(): void {
  if (sharedChiaroscuroGradientTexture !== null) {
    sharedChiaroscuroGradientTexture.dispose();
    sharedChiaroscuroGradientTexture = null;
  }
}

/**
 * Applies stage-paint chiaroscuro desaturation and grime darkening toward `theme.shadowTintHex`.
 */
export function computeChiaroscuroColor(
  baseHex: string,
  theme: EpochVisualTheme,
  desaturationOverride?: number,
  extraGrime = 0,
): THREE.Color {
  const color = new THREE.Color(baseHex);
  const shadow = new THREE.Color(theme.shadowTintHex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  const desat = Math.min(1, Math.max(0, desaturationOverride ?? theme.desaturationFactor));
  color.setHSL(hsl.h, hsl.s * (1 - desat), hsl.l);

  const grimeFactor = Math.min(0.85, Math.max(0, theme.grimeIntensity * 0.35 + extraGrime * 0.4));
  color.lerp(shadow, grimeFactor);
  return color;
}

export function createChiaroscuroToonMaterial(options: {
  readonly baseHex: string;
  readonly theme: EpochVisualTheme;
  readonly desaturationOverride?: number | undefined;
  readonly extraGrime?: number | undefined;
  readonly emissiveHex?: string | undefined;
  readonly emissiveIntensity?: number | undefined;
}): THREE.MeshToonMaterial {
  const color = computeChiaroscuroColor(
    options.baseHex,
    options.theme,
    options.desaturationOverride,
    options.extraGrime ?? 0,
  );
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: getSharedChiaroscuroGradientMap(),
  });
  material.userData['baseHex'] = options.baseHex;
  material.userData['extraGrime'] = options.extraGrime ?? 0;

  if (options.emissiveHex !== undefined) {
    material.emissive = new THREE.Color(options.emissiveHex);
    material.emissiveIntensity = options.emissiveIntensity ?? 0.35;
    material.userData['baseEmissiveHex'] = options.emissiveHex;
    material.userData['baseEmissiveIntensity'] = options.emissiveIntensity ?? 0.35;
  } else {
    material.userData['baseEmissiveHex'] = '#000000';
    material.userData['baseEmissiveIntensity'] = 0;
  }
  return material;
}

export function resolveSurfaceMaterialHex(
  surfaceMaterial: 'stone' | 'mud' | 'wood' | 'metal' | 'earth',
  theme: EpochVisualTheme,
): string {
  switch (surfaceMaterial) {
    case 'stone':
      return theme.stoneColorHex;
    case 'mud':
    case 'earth':
      return theme.mudColorHex;
    case 'wood':
      return theme.woodColorHex;
    case 'metal':
      return theme.ironColorHex;
  }
}

function buildSingleMotifUnitGeometry(
  motifId: string,
  recessDepth: number,
  scale: number,
): THREE.BufferGeometry {
  const s = Math.max(0.1, scale);
  const depth = Math.max(0.05, recessDepth);

  switch (motifId) {
    case 'ossuary_skull_niche':
      return new THREE.IcosahedronGeometry(0.14 * s, 0);
    case 'lancet_window':
      return new THREE.BoxGeometry(0.55 * s, 1.6 * s, depth);
    case 'buttress_rib':
      return new THREE.BoxGeometry(0.32 * s, 3.2 * s, depth * 1.5);
    case 'fulgurite_lens_sconce':
      return new THREE.OctahedronGeometry(0.22 * s, 0);
    case 'guild_anvil_rack':
      return new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 0.45 * s, 6);
    case 'torch_sconce':
      return new THREE.ConeGeometry(0.12 * s, 0.42 * s, 6);
    default:
      return new THREE.BoxGeometry(0.35 * s, 0.35 * s, depth);
  }
}

/**
 * Builds a parametric wall motif `THREE.Group` for a `WallMotifInstance`, laying out
 * `motif.count` meshes across `motif.columns` with `motif.spacingMeters` and stamping
 * `userData.semanticId = <segmentSemanticId>.motif.<motifId>`.
 */
export function buildWallMotifGroup(
  segmentSemanticId: string,
  motif: WallMotifInstance,
  theme: EpochVisualTheme,
): THREE.Group {
  const motifSemanticId = formatWallMotifSemanticId(segmentSemanticId, motif.id);
  const group = new THREE.Group();
  group.name = motifSemanticId;
  group.userData['semanticId'] = motifSemanticId;
  group.userData['motifId'] = motif.id;

  const isWarmLit = motif.id === 'torch_sconce' || motif.id === 'fulgurite_lens_sconce';
  const baseHex = isWarmLit ? theme.torchWarmHex : theme.ironColorHex;
  const material = createChiaroscuroToonMaterial({
    baseHex,
    theme,
    ...(isWarmLit ? { emissiveHex: theme.torchWarmHex, emissiveIntensity: 0.45 } : {}),
  });

  const cols = Math.max(1, Math.min(motif.columns, motif.count));
  const rows = Math.ceil(motif.count / cols);
  const spacing = motif.spacingMeters;
  const sharedUnitGeom = buildSingleMotifUnitGeometry(motif.id, motif.recessDepth, motif.scale);

  for (let i = 0; i < motif.count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const localX = motif.offsetX + (col - (cols - 1) * 0.5) * spacing;
    const localY = motif.offsetY + (row - (rows - 1) * 0.5) * spacing;

    const clonedMat = material.clone();
    clonedMat.userData = { ...material.userData };
    const mesh = new THREE.Mesh(sharedUnitGeom, clonedMat);
    mesh.position.set(localX, localY, motif.recessDepth * 0.5);
    mesh.userData['semanticId'] = motifSemanticId;
    mesh.userData['motifInstanceIndex'] = i;
    group.add(mesh);
  }

  material.dispose();
  return group;
}

/**
 * Builds a 3D stage prop or swinging portal door `THREE.Group` stamped with `prop.semanticId`.
 */
export function buildStagePropGroup(
  prop: StagePropVisualBlueprint,
  theme: EpochVisualTheme,
): THREE.Group {
  const group = new THREE.Group();
  group.name = prop.semanticId;
  group.userData['semanticId'] = prop.semanticId;
  group.userData['propId'] = prop.propId;
  group.userData['isPortal'] = prop.isPortal;
  group.position.set(prop.position[0], prop.position[1], prop.position[2]);
  group.rotation.y = prop.yawRadians;
  group.scale.set(prop.scale[0], prop.scale[1], prop.scale[2]);

  const baseHex = resolveSurfaceMaterialHex(prop.surfaceMaterial, theme);
  const material = createChiaroscuroToonMaterial({
    baseHex,
    theme,
  });

  const geometry = prop.isPortal
    ? new THREE.BoxGeometry(1.2, 2.2, 0.14)
    : new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, prop.isPortal ? 1.1 : 0.45, 0);
  mesh.userData['semanticId'] = prop.semanticId;
  group.add(mesh);

  return group;
}

/**
 * Builds a low-poly silhouette-first character kitbash `THREE.Group` from a `CharacterVisualBlueprint`,
 * applying `heightScale`, `shoulderWidth`, `spinePitchRadians`, garment/prop slots, grime darkening,
 * and optional companion `droneDisguise` mesh. Every part carries `npc.<characterId>.part.<slot>`.
 */
export function buildCharacterKitbashGroup(
  visual: CharacterVisualBlueprint,
  theme: EpochVisualTheme,
): THREE.Group {
  const rootSemanticId = formatCharacterRootSemanticId(visual.characterId);
  const root = new THREE.Group();
  root.name = rootSemanticId;
  root.userData['semanticId'] = rootSemanticId;
  root.userData['characterId'] = visual.characterId;
  root.userData['lineageId'] = visual.lineageId;

  const widthFactor = visual.shoulderWidth / 0.55;
  root.scale.set(widthFactor, visual.heightScale, widthFactor);

  const combinedGrime = Math.min(1, (visual.mudLevel + visual.sootLevel) * 0.5);

  const spineGroup = new THREE.Group();
  spineGroup.name = `${rootSemanticId}.spine`;
  spineGroup.position.set(0, 0.75, 0);
  spineGroup.rotation.x = visual.spinePitchRadians;
  spineGroup.userData['semanticId'] = rootSemanticId;
  root.add(spineGroup);

  // 1. Torso
  const torsoId = formatCharacterPartSemanticId(visual.characterId, 'torso');
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.72, 0.28),
    createChiaroscuroToonMaterial({
      baseHex: visual.primaryColorHex,
      theme,
      extraGrime: combinedGrime,
    }),
  );
  torsoMesh.name = torsoId;
  torsoMesh.position.set(0, 0.36, 0);
  torsoMesh.userData['semanticId'] = torsoId;
  spineGroup.add(torsoMesh);

  // 2. Head
  const headId = formatCharacterPartSemanticId(visual.characterId, 'head');
  const headMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 1),
    createChiaroscuroToonMaterial({
      baseHex: visual.accentColorHex,
      theme,
      extraGrime: visual.sootLevel * 0.3,
    }),
  );
  headMesh.name = headId;
  headMesh.position.set(0, 0.9, 0);
  headMesh.userData['semanticId'] = headId;
  spineGroup.add(headMesh);

  // 3. Headgear (if not 'none')
  if (visual.headgear !== 'none') {
    const headgearId = formatCharacterPartSemanticId(visual.characterId, 'headgear');
    const headgearMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.28, 6),
      createChiaroscuroToonMaterial({
        baseHex: visual.accentColorHex,
        theme,
        extraGrime: combinedGrime,
      }),
    );
    headgearMesh.name = headgearId;
    headgearMesh.position.set(0, 1.08, 0);
    headgearMesh.userData['semanticId'] = headgearId;
    headgearMesh.userData['slotItemId'] = visual.headgear;
    spineGroup.add(headgearMesh);
  }

  // 4. Cloak (if not 'none')
  if (visual.cloak !== 'none') {
    const cloakId = formatCharacterPartSemanticId(visual.characterId, 'cloak');
    const cloakMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.82, 0.12),
      createChiaroscuroToonMaterial({
        baseHex: visual.primaryColorHex,
        theme,
        extraGrime: visual.mudLevel,
      }),
    );
    cloakMesh.name = cloakId;
    cloakMesh.position.set(0, 0.32, -0.18);
    cloakMesh.userData['semanticId'] = cloakId;
    cloakMesh.userData['slotItemId'] = visual.cloak;
    spineGroup.add(cloakMesh);
  }

  // 5. Held Prop Left
  if (visual.heldPropLeft !== 'none') {
    const leftId = formatCharacterPartSemanticId(visual.characterId, 'held_prop_left');
    const leftMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6),
      createChiaroscuroToonMaterial({
        baseHex: theme.ironColorHex,
        theme,
      }),
    );
    leftMesh.name = leftId;
    leftMesh.position.set(-0.34, 0.35, 0.18);
    leftMesh.userData['semanticId'] = leftId;
    leftMesh.userData['slotItemId'] = visual.heldPropLeft;
    spineGroup.add(leftMesh);
  }

  // 6. Held Prop Right
  if (visual.heldPropRight !== 'none') {
    const rightId = formatCharacterPartSemanticId(visual.characterId, 'held_prop_right');
    const rightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.24, 0.08),
      createChiaroscuroToonMaterial({
        baseHex: theme.woodColorHex,
        theme,
      }),
    );
    rightMesh.name = rightId;
    rightMesh.position.set(0.34, 0.35, 0.18);
    rightMesh.userData['semanticId'] = rightId;
    rightMesh.userData['slotItemId'] = visual.heldPropRight;
    spineGroup.add(rightMesh);
  }

  // 7. Companion Drone Disguise (e.g. 'bronze_reliquary_lamp')
  if (visual.droneDisguise !== undefined && visual.droneDisguise !== 'none') {
    const droneId = formatCharacterPartSemanticId(visual.characterId, 'drone_disguise');
    const droneMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      createChiaroscuroToonMaterial({
        baseHex: theme.torchWarmHex,
        theme,
        emissiveHex: theme.torchWarmHex,
        emissiveIntensity: 0.3,
      }),
    );
    droneMesh.name = droneId;
    droneMesh.position.set(-0.42, 0.72, 0.25);
    droneMesh.userData['semanticId'] = droneId;
    droneMesh.userData['droneDisguise'] = visual.droneDisguise;
    spineGroup.add(droneMesh);
  }

  return root;
}
