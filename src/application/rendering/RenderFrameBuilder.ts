/**
 * Pure WebGL-Independent `RenderFrameBuilder` (`src/application/rendering/RenderFrameBuilder.ts`).
 *
 * Computes:
 * - Volume-aware 3rd-person fixed-orientation tracking camera selection (`priority` + smallest AABB tie-break)
 * - Critically damped spring camera transitions (`stepCriticallyDampedSpring`)
 * - Emergency and orbital Zenith Burn camera tilts & fog modifiers (with `reduceMotionAndFlashing` accessibility clamp)
 * - `F3` De-Anchored Free-Cam overrides and `+0.40` desaturation boost
 * - Entity and prop/portal 3D render poses
 * - Shared wall/alcove segment world placement (`computeWallSegmentPlacement`)
 * - Pure 3D-to-NDC perspective projection with behind-camera (`clipW <= 1e-5`) frustum culling for `DebugInspectorCard`s
 * - `AgentDomMirrorState` snapshot for DOM attributes and `globalThis.__UPLIFT_STAGE_INSPECTOR__`
 *
 * Depends strictly inward on `src/domain/` and `./SceneVisualBlueprints.js` with zero Three.js or DOM globals.
 */
import type { CognitivePhase, PortalState, WorldState } from '../../domain/index.js';
import { toLocal } from './SpaceFrame.js';
import {
  type CameraVolumeBlueprint,
  type CharacterVisualBlueprint,
  type EpochVisualTheme,
  formatCharacterRootSemanticId,
  type StagePropVisualBlueprint,
  type StageSceneBlueprint,
  type WallSegmentBlueprint,
} from './SceneVisualBlueprints.js';

export const MAX_CAMERA_SPRING_DT_SECONDS = 0.25 as const;
const CLIP_W_EPSILON = 1e-5;
const DEG_TO_RAD = Math.PI / 180;

export type CameraMode = 'tracking_volume' | 'debug_free_cam';

export interface SpringScalarState {
  readonly value: number;
  readonly velocity: number;
}

export interface NdcProjection {
  readonly ndcX: number;
  readonly ndcY: number;
  readonly ndcZ: number;
  readonly clipW: number;
  readonly visibleInFrustum: boolean;
}

export interface CameraRenderState {
  readonly activeVolumeId: string;
  readonly cameraMode: CameraMode;
  readonly position: readonly [number, number, number];
  readonly lookAt: readonly [number, number, number];
  readonly pitchDegrees: number;
  readonly yawDegrees: number;
  readonly rollDegrees: number;
  readonly fovDegrees: number;
  readonly aspect: number;
  readonly near: number;
  readonly far: number;
}

export interface EntityRenderPose {
  readonly entityId: string;
  readonly semanticId: string;
  readonly spaceId: string;
  readonly position: readonly [number, number, number];
  readonly yawRadians: number;
  readonly headAnchorWorldPosition: readonly [number, number, number];
  readonly cognitivePhase: CognitivePhase;
  readonly visual?: CharacterVisualBlueprint | undefined;
}

export interface PropRenderPose {
  readonly propId: string;
  readonly semanticId: string;
  readonly kitbashId: string;
  readonly position: readonly [number, number, number];
  readonly yawRadians: number;
  readonly hingeYawOffsetRadians: number;
  readonly scale: readonly [number, number, number];
  readonly isPortal: boolean;
  readonly portalState?: PortalState | undefined;
  readonly state: Readonly<Record<string, unknown>>;
}

export interface DebugInspectorCard {
  readonly id: string;
  readonly semanticId: string;
  readonly targetKind: 'entity' | 'prop' | 'wall_segment';
  readonly label: string;
  readonly worldAnchor: readonly [number, number, number];
  readonly ndc: NdcProjection;
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface AgentDomMirrorState {
  readonly activeSpaceId: string;
  readonly hoveredSemanticId: string | null;
  readonly selectedSemanticId: string | null;
  readonly cameraMode: CameraMode;
  readonly debugPaused: boolean;
}

export interface RenderFrame {
  readonly epochId: string;
  readonly worldTick: number;
  readonly elapsedSimulationSeconds: number;
  readonly activeSpaceId: string;
  readonly camera: CameraRenderState;
  readonly effectiveDesaturation: number;
  readonly effectiveFogDensity: number;
  readonly fogColorHex: string;
  readonly suppressGodRays: boolean;
  readonly entityPoses: ReadonlyArray<EntityRenderPose>;
  readonly propPoses: ReadonlyArray<PropRenderPose>;
  readonly inspectorCards: ReadonlyArray<DebugInspectorCard>;
  readonly domMirror: AgentDomMirrorState;
}

export interface BuildRenderFrameInput {
  readonly worldState: WorldState;
  readonly theme: EpochVisualTheme;
  readonly stage: StageSceneBlueprint;
  readonly characterVisuals?: ReadonlyArray<CharacterVisualBlueprint> | undefined;
  readonly focusEntityId?: string | undefined;
  readonly focusPositionOverride?: readonly [number, number, number] | undefined;
  readonly dtSeconds?: number | undefined;
  readonly aspect?: number | undefined;
  readonly near?: number | undefined;
  readonly far?: number | undefined;
  readonly debugMode?: boolean | undefined;
  readonly cameraDeAnchored?: boolean | undefined;
  readonly freeCamOffset?: readonly [number, number, number] | undefined;
  readonly hoveredSemanticId?: string | null | undefined;
  readonly selectedSemanticId?: string | null | undefined;
  readonly reduceMotionAndFlashing?: boolean | undefined;
  /** World-space center of the drawn space. Entity and prop positions subtract it. */
  readonly spaceOrigin?: readonly [number, number, number] | undefined;
}

export interface WallSegmentPlacement {
  readonly position: readonly [number, number, number];
  readonly worldCenterAnchor: readonly [number, number, number];
  readonly rotationYRadians: number;
}

function clampNdc(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function sanitizeFiniteTriple(
  tuple: readonly [number, number, number] | undefined,
  fallback: readonly [number, number, number] = [0, 0, 0],
): readonly [number, number, number] {
  if (tuple === undefined) {
    return fallback;
  }
  return [
    Number.isFinite(tuple[0]) ? tuple[0] : fallback[0],
    Number.isFinite(tuple[1]) ? tuple[1] : fallback[1],
    Number.isFinite(tuple[2]) ? tuple[2] : fallback[2],
  ];
}

function normalizeDegrees180(angleDegrees: number): number {
  const wrapped = ((((angleDegrees + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Steps a 1D critically damped harmonic oscillator toward `target` over `dtSeconds`.
 * Clamps `dtSeconds` to `[0, MAX_CAMERA_SPRING_DT_SECONDS]` for numerical stability.
 */
export function stepCriticallyDampedSpring(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dtSeconds: number,
): SpringScalarState {
  const safeTarget = Number.isFinite(target) ? target : 0;
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || !Number.isFinite(omega) || omega <= 0) {
    return {
      value: Number.isFinite(current) ? current : safeTarget,
      velocity: Number.isFinite(velocity) ? velocity : 0,
    };
  }

  const clampedDt = Math.min(dtSeconds, MAX_CAMERA_SPRING_DT_SECONDS);
  const safeCurrent = Number.isFinite(current) ? current : safeTarget;
  const safeVelocity = Number.isFinite(velocity) ? velocity : 0;

  const delta = safeCurrent - safeTarget;
  const expTerm = Math.exp(-omega * clampedDt);
  const c2 = safeVelocity + omega * delta;
  const nextValue = safeTarget + (delta + c2 * clampedDt) * expTerm;
  const nextVelocity = (safeVelocity - c2 * omega * clampedDt) * expTerm;

  return {
    value: nextValue,
    velocity: nextVelocity,
  };
}

function stepCriticallyDampedAngleDegrees(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dtSeconds: number,
): SpringScalarState {
  const safeCurrent = Number.isFinite(current) ? normalizeDegrees180(current) : 0;
  const safeTarget = Number.isFinite(target) ? normalizeDegrees180(target) : 0;
  const shortestDiff = normalizeDegrees180(safeTarget - safeCurrent);
  const unwrappedTarget = safeCurrent + shortestDiff;
  const stepped = stepCriticallyDampedSpring(
    safeCurrent,
    velocity,
    unwrappedTarget,
    omega,
    dtSeconds,
  );
  return {
    value: normalizeDegrees180(stepped.value),
    velocity: stepped.velocity,
  };
}

function computeAabbVolume(vol: CameraVolumeBlueprint): number {
  const dx = vol.boundsMax[0] - vol.boundsMin[0];
  const dy = vol.boundsMax[1] - vol.boundsMin[1];
  const dz = vol.boundsMax[2] - vol.boundsMin[2];
  return dx * dy * dz;
}

function isPointInsideVolume(
  point: readonly [number, number, number],
  vol: CameraVolumeBlueprint,
): boolean {
  return (
    point[0] >= vol.boundsMin[0] &&
    point[0] <= vol.boundsMax[0] &&
    point[1] >= vol.boundsMin[1] &&
    point[1] <= vol.boundsMax[1] &&
    point[2] >= vol.boundsMin[2] &&
    point[2] <= vol.boundsMax[2]
  );
}

/**
 * Selects the active `CameraVolumeBlueprint` containing `focusPosition`.
 * Ties are broken by descending `priority`, then smallest AABB volume, then declaration order.
 */
export function selectActiveCameraVolume(
  stage: StageSceneBlueprint,
  focusPosition: readonly [number, number, number],
): CameraVolumeBlueprint {
  const indexedContaining = stage.cameraVolumes
    .map((vol, index) => ({ vol, index, aabbVolume: computeAabbVolume(vol) }))
    .filter((entry) => isPointInsideVolume(focusPosition, entry.vol));

  if (indexedContaining.length > 0) {
    indexedContaining.sort((a, b) => {
      if (b.vol.priority !== a.vol.priority) {
        return b.vol.priority - a.vol.priority;
      }
      if (a.aabbVolume !== b.aabbVolume) {
        return a.aabbVolume - b.aabbVolume;
      }
      return a.index - b.index;
    });
    const best = indexedContaining[0]?.vol;
    if (best !== undefined) {
      return best;
    }
  }

  const fallback = stage.cameraVolumes[0];
  if (fallback === undefined) {
    throw new Error(`Stage '${stage.stageId}' has no cameraVolumes`);
  }
  return fallback;
}

/**
 * Computes deterministic 3D placement and center anchor for a wall/alcove segment.
 * Shared by both `RenderFrameBuilder` (for floating `DebugInspectorCard` anchors)
 * and `ChiaroscuroStageRenderer` (for Three.js mesh placement).
 */
export function computeWallSegmentPlacement(
  stage: StageSceneBlueprint,
  seg: WallSegmentBlueprint,
  indexOnCompass: number,
  totalOnCompass: number,
): WallSegmentPlacement {
  const halfW = stage.footprint.widthMeters * 0.5;
  const halfD = stage.footprint.depthMeters * 0.5;
  const autoOffset = (indexOnCompass - (totalOnCompass - 1) * 0.5) * seg.widthMeters;
  const offset = seg.offsetAlongWallMeters ?? autoOffset;
  const recess = seg.zone === 'alcove' ? Math.max(0.4, seg.recessMeters) : seg.recessMeters;
  const midY = seg.heightMeters * 0.5;

  switch (seg.compass) {
    case 'north':
      return {
        position: [offset, 0, -halfD - recess],
        worldCenterAnchor: [offset, midY, -halfD - recess],
        rotationYRadians: 0,
      };
    case 'south':
      return {
        position: [offset, 0, halfD + recess],
        worldCenterAnchor: [offset, midY, halfD + recess],
        rotationYRadians: Math.PI,
      };
    case 'east':
      return {
        position: [halfW + recess, 0, offset],
        worldCenterAnchor: [halfW + recess, midY, offset],
        rotationYRadians: -Math.PI * 0.5,
      };
    case 'west':
      return {
        position: [-halfW - recess, 0, offset],
        worldCenterAnchor: [-halfW - recess, midY, offset],
        rotationYRadians: Math.PI * 0.5,
      };
  }
}

/**
 * Projects a 3D world position into perspective Normalized Device Coordinates (`[-1, 1]`),
 * guarding against behind-camera points (`clipW <= 1e-5`) and degenerate camera parameters.
 */
export function projectWorldToNdc(
  worldPos: readonly [number, number, number],
  camera: CameraRenderState,
): NdcProjection {
  if (
    !Number.isFinite(worldPos[0]) ||
    !Number.isFinite(worldPos[1]) ||
    !Number.isFinite(worldPos[2]) ||
    !Number.isFinite(camera.fovDegrees) ||
    camera.fovDegrees <= 0 ||
    camera.fovDegrees >= 179 ||
    !Number.isFinite(camera.aspect) ||
    camera.aspect <= 0 ||
    !Number.isFinite(camera.near) ||
    camera.near <= 0 ||
    !Number.isFinite(camera.far) ||
    camera.far <= camera.near
  ) {
    return {
      ndcX: 0,
      ndcY: 0,
      ndcZ: 1,
      clipW: 0,
      visibleInFrustum: false,
    };
  }

  let fx = camera.lookAt[0] - camera.position[0];
  let fy = camera.lookAt[1] - camera.position[1];
  let fz = camera.lookAt[2] - camera.position[2];
  const fLen = Math.hypot(fx, fy, fz);
  if (fLen <= CLIP_W_EPSILON) {
    return {
      ndcX: 0,
      ndcY: 0,
      ndcZ: 1,
      clipW: 0,
      visibleInFrustum: false,
    };
  }
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  let upRefX = 0;
  let upRefY = 1;
  let upRefZ = 0;
  if (Math.abs(fy) > 0.999) {
    upRefX = 0;
    upRefY = 0;
    upRefZ = -1;
  }

  let rx = fy * upRefZ - fz * upRefY;
  let ry = fz * upRefX - fx * upRefZ;
  let rz = fx * upRefY - fy * upRefX;
  const rLen = Math.hypot(rx, ry, rz);
  if (rLen <= CLIP_W_EPSILON) {
    return {
      ndcX: 0,
      ndcY: 0,
      ndcZ: 1,
      clipW: 0,
      visibleInFrustum: false,
    };
  }
  rx /= rLen;
  ry /= rLen;
  rz /= rLen;

  let ux = ry * fz - rz * fy;
  let uy = rz * fx - rx * fz;
  let uz = rx * fy - ry * fx;

  if (camera.rollDegrees !== 0) {
    const rollRad = camera.rollDegrees * DEG_TO_RAD;
    const cosR = Math.cos(rollRad);
    const sinR = Math.sin(rollRad);
    const rRotX = rx * cosR + ux * sinR;
    const rRotY = ry * cosR + uy * sinR;
    const rRotZ = rz * cosR + uz * sinR;
    const uRotX = ux * cosR - rx * sinR;
    const uRotY = uy * cosR - ry * sinR;
    const uRotZ = uz * cosR - rz * sinR;
    rx = rRotX;
    ry = rRotY;
    rz = rRotZ;
    ux = uRotX;
    uy = uRotY;
    uz = uRotZ;
  }

  const dx = worldPos[0] - camera.position[0];
  const dy = worldPos[1] - camera.position[1];
  const dz = worldPos[2] - camera.position[2];

  const camX = dx * rx + dy * ry + dz * rz;
  const camY = dx * ux + dy * uy + dz * uz;
  const clipW = dx * fx + dy * fy + dz * fz;

  if (clipW <= CLIP_W_EPSILON) {
    return {
      ndcX: 0,
      ndcY: 0,
      ndcZ: 1,
      clipW,
      visibleInFrustum: false,
    };
  }

  const f = 1 / Math.tan(camera.fovDegrees * DEG_TO_RAD * 0.5);
  const rawNdcX = (camX * (f / camera.aspect)) / clipW;
  const rawNdcY = (camY * f) / clipW;
  const near = camera.near;
  const far = camera.far;
  const rawNdcZ = (far + near) / (far - near) - (2 * far * near) / ((far - near) * clipW);

  const visibleInFrustum =
    clipW >= near &&
    clipW <= far &&
    Math.abs(rawNdcX) <= 1 &&
    Math.abs(rawNdcY) <= 1 &&
    Math.abs(rawNdcZ) <= 1;

  return {
    ndcX: clampNdc(rawNdcX),
    ndcY: clampNdc(rawNdcY),
    ndcZ: clampNdc(rawNdcZ),
    clipW,
    visibleInFrustum,
  };
}

function portalStateToHingeYaw(portalState: PortalState | undefined): number {
  switch (portalState) {
    case 'open':
      return Math.PI * 0.5;
    case 'ajar':
      return 0.38;
    case 'closed':
    case 'barred':
    case undefined:
      return 0;
  }
}

export class RenderFrameBuilder {
  private initialized = false;
  private lastStageId: string | null = null;
  private posX: SpringScalarState = { value: 0, velocity: 0 };
  private posY: SpringScalarState = { value: 0, velocity: 0 };
  private posZ: SpringScalarState = { value: 0, velocity: 0 };
  private lookX: SpringScalarState = { value: 0, velocity: 0 };
  private lookY: SpringScalarState = { value: 0, velocity: 0 };
  private lookZ: SpringScalarState = { value: 0, velocity: 0 };
  private pitch: SpringScalarState = { value: -28, velocity: 0 };
  private yaw: SpringScalarState = { value: 0, velocity: 0 };
  private fov: SpringScalarState = { value: 42, velocity: 0 };

  public resetCameraSprings(): void {
    this.initialized = false;
    this.lastStageId = null;
  }

  public buildFrame(input: BuildRenderFrameInput): RenderFrame {
    const { worldState, theme, stage } = input;
    const debugMode = input.debugMode === true;
    const cameraDeAnchored = input.cameraDeAnchored === true;
    const reduceMotion = input.reduceMotionAndFlashing === true;
    const aspect = input.aspect ?? 16 / 9;
    const near = input.near ?? 0.1;
    const far = input.far ?? 250;
    const dtSeconds = input.dtSeconds ?? 1 / 60;

    if (this.lastStageId !== stage.stageId) {
      this.initialized = false;
      this.lastStageId = stage.stageId;
    }

    const origin = input.spaceOrigin ?? [0, 0, 0];
    let focusPos: readonly [number, number, number] = [0, 0, 0];
    if (input.focusPositionOverride !== undefined) {
      focusPos = sanitizeFiniteTriple(input.focusPositionOverride);
    } else if (input.focusEntityId !== undefined) {
      const entity = worldState.entities[input.focusEntityId];
      if (entity !== undefined && entity.spaceId === stage.spaceId) {
        focusPos = sanitizeFiniteTriple(toLocal(entity.position, origin));
      }
    }

    const activeVolume = selectActiveCameraVolume(stage, focusPos);
    const targetLookX = focusPos[0];
    const targetLookY = focusPos[1];
    const targetLookZ = focusPos[2];
    const targetPosX = focusPos[0] + activeVolume.offset[0];
    const targetPosY = focusPos[1] + activeVolume.offset[1];
    const targetPosZ = focusPos[2] + activeVolume.offset[2];

    let pitchOffsetDegrees = 0;
    let rollDegrees = 0;
    let effectiveFogDensity = theme.fogDensity;

    if (worldState.activeEmergencyId !== null && !reduceMotion) {
      effectiveFogDensity = theme.fogDensity * 1.35;
      rollDegrees += 1.5;
      pitchOffsetDegrees -= 2.0;
    }

    if (
      worldState.orbitalPass.phase === 'zenith' &&
      worldState.orbitalPass.activeBurn &&
      !reduceMotion
    ) {
      pitchOffsetDegrees -= 1.5;
    }

    const targetPitch = activeVolume.pitchDegrees + pitchOffsetDegrees;
    const targetYaw = activeVolume.yawDegrees;
    const targetFov = activeVolume.fovDegrees;
    const omega = activeVolume.springStiffness;

    if (!this.initialized) {
      this.posX = { value: targetPosX, velocity: 0 };
      this.posY = { value: targetPosY, velocity: 0 };
      this.posZ = { value: targetPosZ, velocity: 0 };
      this.lookX = { value: targetLookX, velocity: 0 };
      this.lookY = { value: targetLookY, velocity: 0 };
      this.lookZ = { value: targetLookZ, velocity: 0 };
      this.pitch = { value: targetPitch, velocity: 0 };
      this.yaw = { value: normalizeDegrees180(targetYaw), velocity: 0 };
      this.fov = { value: targetFov, velocity: 0 };
      this.initialized = true;
    } else {
      this.posX = stepCriticallyDampedSpring(
        this.posX.value,
        this.posX.velocity,
        targetPosX,
        omega,
        dtSeconds,
      );
      this.posY = stepCriticallyDampedSpring(
        this.posY.value,
        this.posY.velocity,
        targetPosY,
        omega,
        dtSeconds,
      );
      this.posZ = stepCriticallyDampedSpring(
        this.posZ.value,
        this.posZ.velocity,
        targetPosZ,
        omega,
        dtSeconds,
      );
      this.lookX = stepCriticallyDampedSpring(
        this.lookX.value,
        this.lookX.velocity,
        targetLookX,
        omega,
        dtSeconds,
      );
      this.lookY = stepCriticallyDampedSpring(
        this.lookY.value,
        this.lookY.velocity,
        targetLookY,
        omega,
        dtSeconds,
      );
      this.lookZ = stepCriticallyDampedSpring(
        this.lookZ.value,
        this.lookZ.velocity,
        targetLookZ,
        omega,
        dtSeconds,
      );
      this.pitch = stepCriticallyDampedSpring(
        this.pitch.value,
        this.pitch.velocity,
        targetPitch,
        omega,
        dtSeconds,
      );
      this.yaw = stepCriticallyDampedAngleDegrees(
        this.yaw.value,
        this.yaw.velocity,
        targetYaw,
        omega,
        dtSeconds,
      );
      this.fov = stepCriticallyDampedSpring(
        this.fov.value,
        this.fov.velocity,
        targetFov,
        omega,
        dtSeconds,
      );
    }

    const freeCamOffset = cameraDeAnchored
      ? sanitizeFiniteTriple(input.freeCamOffset)
      : ([0, 0, 0] as const);
    const cameraMode: CameraMode = cameraDeAnchored ? 'debug_free_cam' : 'tracking_volume';

    // Apply atmospheric pitch delta to the lookAt Y target so pitch tilts shift both WebGL view and NDC projection
    const pitchTiltDeltaY =
      Math.tan(pitchOffsetDegrees * DEG_TO_RAD) *
      Math.hypot(activeVolume.offset[0], activeVolume.offset[2]);

    const camera: CameraRenderState = {
      activeVolumeId: activeVolume.id,
      cameraMode,
      position: [
        this.posX.value + freeCamOffset[0],
        this.posY.value + freeCamOffset[1],
        this.posZ.value + freeCamOffset[2],
      ],
      lookAt: [
        this.lookX.value + freeCamOffset[0],
        this.lookY.value + freeCamOffset[1] + pitchTiltDeltaY,
        this.lookZ.value + freeCamOffset[2],
      ],
      pitchDegrees: this.pitch.value,
      yawDegrees: this.yaw.value,
      rollDegrees,
      fovDegrees: this.fov.value,
      aspect,
      near,
      far,
    };

    const debugPaused = worldState.paused || cameraDeAnchored;
    const effectiveDesaturation = cameraDeAnchored
      ? Math.min(1, theme.desaturationFactor + 0.4)
      : theme.desaturationFactor;

    const visualsByCharId = new Map<string, CharacterVisualBlueprint>();
    const visualsByLineageId = new Map<string, CharacterVisualBlueprint>();
    for (const vis of input.characterVisuals ?? []) {
      visualsByCharId.set(vis.characterId, vis);
      if (!visualsByLineageId.has(vis.lineageId)) {
        visualsByLineageId.set(vis.lineageId, vis);
      }
    }

    const sortedEntityIds = Object.keys(worldState.entities).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const entityPoses: EntityRenderPose[] = [];
    for (const entityId of sortedEntityIds) {
      const entity = worldState.entities[entityId];
      if (entity === undefined) {
        continue;
      }
      const visual =
        visualsByCharId.get(entity.entityId) ?? visualsByLineageId.get(entity.lineageId);
      const heightScale = visual?.heightScale ?? 1.0;
      const localPosition = sanitizeFiniteTriple(toLocal(entity.position, origin));
      const headAnchor: readonly [number, number, number] = [
        localPosition[0],
        localPosition[1] + 1.8 * heightScale,
        localPosition[2],
      ];

      entityPoses.push({
        entityId: entity.entityId,
        semanticId: formatCharacterRootSemanticId(entity.entityId),
        spaceId: entity.spaceId,
        position: localPosition,
        yawRadians: entity.yawRadians,
        headAnchorWorldPosition: headAnchor,
        cognitivePhase: entity.cognitivePhase,
        ...(visual !== undefined ? { visual } : {}),
      });
    }

    const propPoses: PropRenderPose[] = stage.props.map((stageProp: StagePropVisualBlueprint) => {
      const simProp = worldState.props[stageProp.propId];
      const portalState = simProp?.portalState;
      return {
        propId: stageProp.propId,
        semanticId: stageProp.semanticId,
        kitbashId: stageProp.kitbashId,
        position: toLocal(stageProp.position, origin),
        yawRadians: stageProp.yawRadians,
        hingeYawOffsetRadians: stageProp.isPortal ? portalStateToHingeYaw(portalState) : 0,
        scale: [stageProp.scale[0], stageProp.scale[1], stageProp.scale[2]],
        isPortal: stageProp.isPortal,
        ...(portalState !== undefined ? { portalState } : {}),
        state: simProp?.state ?? {},
      };
    });

    const inspectorCards: DebugInspectorCard[] = [];
    const hoveredSemanticId = input.hoveredSemanticId ?? null;
    const selectedSemanticId = input.selectedSemanticId ?? null;

    if (debugMode) {
      for (const pose of entityPoses) {
        if (pose.spaceId !== stage.spaceId) {
          continue;
        }
        const entity = worldState.entities[pose.entityId];
        if (entity === undefined) {
          continue;
        }
        inspectorCards.push({
          id: `card_${pose.entityId}`,
          semanticId: pose.semanticId,
          targetKind: 'entity',
          label: pose.entityId,
          worldAnchor: pose.headAnchorWorldPosition,
          ndc: projectWorldToNdc(pose.headAnchorWorldPosition, camera),
          summary: {
            cognitivePhase: entity.cognitivePhase,
            phaseRemainingSeconds: entity.phaseRemainingSeconds,
            waypointId: entity.waypointId,
            drives: { ...entity.drives },
          },
        });
      }

      for (const propPose of propPoses) {
        inspectorCards.push({
          id: `card_prop_${propPose.propId}`,
          semanticId: propPose.semanticId,
          targetKind: 'prop',
          label: propPose.propId,
          worldAnchor: propPose.position,
          ndc: projectWorldToNdc(propPose.position, camera),
          summary: {
            kitbashId: propPose.kitbashId,
            portalState: propPose.portalState ?? null,
            state: { ...propPose.state },
          },
        });
      }

      const segmentsByCompass = new Map<string, WallSegmentBlueprint[]>();
      for (const seg of stage.wallSegments) {
        const list = segmentsByCompass.get(seg.compass) ?? [];
        list.push(seg);
        segmentsByCompass.set(seg.compass, list);
      }

      for (const seg of stage.wallSegments) {
        const siblings = segmentsByCompass.get(seg.compass) ?? [seg];
        const idxOnCompass = Math.max(0, siblings.indexOf(seg));
        const placement = computeWallSegmentPlacement(stage, seg, idxOnCompass, siblings.length);
        inspectorCards.push({
          id: `card_wall_${seg.semanticId}`,
          semanticId: seg.semanticId,
          targetKind: 'wall_segment',
          label: `${seg.compass} ${seg.zone} ${seg.segmentId}`,
          worldAnchor: placement.worldCenterAnchor,
          ndc: projectWorldToNdc(placement.worldCenterAnchor, camera),
          summary: {
            surfaceMaterial: seg.surfaceMaterial,
            motifIds: seg.motifs.map((m) => m.id),
          },
        });
      }
    }

    const domMirror: AgentDomMirrorState = {
      activeSpaceId: stage.spaceId,
      hoveredSemanticId,
      selectedSemanticId,
      cameraMode,
      debugPaused,
    };

    return {
      epochId: worldState.epochId,
      worldTick: worldState.worldTick,
      elapsedSimulationSeconds: worldState.elapsedSimulationSeconds,
      activeSpaceId: stage.spaceId,
      camera,
      effectiveDesaturation,
      effectiveFogDensity,
      fogColorHex: theme.fogColorHex,
      suppressGodRays: reduceMotion,
      entityPoses,
      propPoses,
      inspectorCards,
      domMirror,
    };
  }
}
