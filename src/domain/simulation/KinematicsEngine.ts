/**
 * Continuous 60Hz Kinematics & Human-Paced Cognitive Phase Engine
 * (`src/domain/simulation/KinematicsEngine.ts`).
 *
 * Advances entity positions and yaw rotations along waypoint paths at realistic speeds (`m/s`, `rad/s`),
 * snaps to exact waypoint coordinates, emits `WaypointArrivalEvent`s in path order, advances
 * human-paced cognitive timers (`deliberating -> moving -> performing_dwell -> cooldown -> idle|awaiting_trigger`),
 * carries leftover intra-frame time across phase transitions, waterfalls zero-duration phases in a single pass
 * under `FAST_EVAL_PACING_CONFIG`, and freezes when `paused`. Moving embodied
 * entities also take a same-space XZ separation slide from start-of-step positions.
 */
import type { SpaceKind } from '../registries/EpochBlueprints.js';
import type { CognitivePhase, EntitySimulationState, WorldState } from './WorldState.js';
import {
  type EmbodiedHashBody,
  insertEmbodiedBodies,
  type SpatialHashGrid,
} from './SpatialHashGrid.js';

const ZERO_SEGMENT_EPSILON_METERS = 1e-6;
const TIME_EPSILON_SECONDS = 1e-9;
const SEPARATION_RADIUS_METERS = 0.75;
const SEPARATION_SNAP_RADIUS_METERS = 0.05;
const SEPARATION_METERS_PER_SECOND = 0.15;
const SEPARATION_REMAINING_FRACTION = 0.25;

export interface WaypointArrivalEvent {
  readonly entityId: string;
  readonly waypointId: string;
  readonly spaceId: string;
  readonly position: readonly [number, number, number];
  readonly terminalArrival: boolean;
}

export interface CognitivePhaseTransitionEvent {
  readonly entityId: string;
  readonly fromPhase: CognitivePhase;
  readonly toPhase: CognitivePhase;
}

export interface KinematicsStepResult {
  readonly state: WorldState;
  readonly arrivals: ReadonlyArray<WaypointArrivalEvent>;
  readonly cognitiveTransitions: ReadonlyArray<CognitivePhaseTransitionEvent>;
}

interface PhaseStepOutcome {
  readonly entity: EntitySimulationState;
  readonly leftoverDt: number;
}

interface SeparationSample {
  readonly dirX: number;
  readonly dirZ: number;
  readonly hasNeighbor: boolean;
  readonly weight: number;
}

interface SeparationContext {
  readonly grid: SpatialHashGrid;
  readonly entities: WorldState['entities'];
  readonly frameDtSeconds: number;
}

const NO_SEPARATION: SeparationSample = {
  dirX: 0,
  dirZ: 0,
  hasNeighbor: false,
  weight: 0,
};

function normalizeAngleRadians(angle: number): number {
  let a = angle;
  while (a <= -Math.PI) {
    a += 2 * Math.PI;
  }
  while (a > Math.PI) {
    a -= 2 * Math.PI;
  }
  return a;
}

function stepYawTowards(currentYaw: number, targetYaw: number, maxDeltaYaw: number): number {
  const diff = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  if (Math.abs(diff) <= maxDeltaYaw) {
    return normalizeAngleRadians(targetYaw);
  }
  const stepped = currentYaw + Math.sign(diff) * maxDeltaYaw;
  return normalizeAngleRadians(stepped);
}

function advanceTimedCognitivePhases(
  entity: EntitySimulationState,
  dtSeconds: number,
  deliberationScale: number,
  transitions: CognitivePhaseTransitionEvent[],
): PhaseStepOutcome {
  let current = entity;
  let remainingDt = dtSeconds;
  let guard = 6;

  while (guard > 0) {
    guard -= 1;
    const phase = current.cognitivePhase;
    if (phase !== 'deliberating' && phase !== 'performing_dwell' && phase !== 'cooldown') {
      break;
    }

    const nextRemaining = current.phaseRemainingSeconds - remainingDt;
    if (nextRemaining > TIME_EPSILON_SECONDS) {
      return {
        entity: {
          ...current,
          phaseRemainingSeconds: nextRemaining,
        },
        leftoverDt: 0,
      };
    }

    remainingDt = nextRemaining < -TIME_EPSILON_SECONDS ? -nextRemaining : 0;

    if (phase === 'deliberating') {
      if (current.activePath.length > 0) {
        transitions.push({
          entityId: current.entityId,
          fromPhase: 'deliberating',
          toPhase: 'moving',
        });
        return {
          entity: {
            ...current,
            cognitivePhase: 'moving',
            phaseRemainingSeconds: 0,
          },
          leftoverDt: remainingDt,
        };
      }

      const dwellDuration = current.pendingDwellSeconds * deliberationScale;
      transitions.push({
        entityId: current.entityId,
        fromPhase: 'deliberating',
        toPhase: 'performing_dwell',
      });
      current = {
        ...current,
        cognitivePhase: 'performing_dwell',
        phaseRemainingSeconds: dwellDuration,
      };
      if (dwellDuration > 0 && remainingDt <= TIME_EPSILON_SECONDS) {
        return { entity: current, leftoverDt: 0 };
      }
      continue;
    }

    if (phase === 'performing_dwell') {
      const cooldownDuration = current.pendingCooldownSeconds * deliberationScale;
      transitions.push({
        entityId: current.entityId,
        fromPhase: 'performing_dwell',
        toPhase: 'cooldown',
      });
      current = {
        ...current,
        cognitivePhase: 'cooldown',
        phaseRemainingSeconds: cooldownDuration,
      };
      if (cooldownDuration > 0 && remainingDt <= TIME_EPSILON_SECONDS) {
        return { entity: current, leftoverDt: 0 };
      }
      continue;
    }

    // phase === 'cooldown'
    const terminalPhase: CognitivePhase = current.requiresExternalTrigger
      ? 'awaiting_trigger'
      : 'idle';
    transitions.push({
      entityId: current.entityId,
      fromPhase: 'cooldown',
      toPhase: terminalPhase,
    });
    return {
      entity: {
        ...current,
        cognitivePhase: terminalPhase,
        phaseRemainingSeconds: 0,
      },
      leftoverDt: 0,
    };
  }

  return { entity: current, leftoverDt: 0 };
}

function enterPerformingDwell(
  entity: EntitySimulationState,
  leftoverDt: number,
  deliberationScale: number,
  transitions: CognitivePhaseTransitionEvent[],
): PhaseStepOutcome {
  const dwellDuration = entity.pendingDwellSeconds * deliberationScale;
  transitions.push({
    entityId: entity.entityId,
    fromPhase: entity.cognitivePhase,
    toPhase: 'performing_dwell',
  });
  return {
    entity: {
      ...entity,
      cognitivePhase: 'performing_dwell',
      phaseRemainingSeconds: dwellDuration,
      activePath: [],
    },
    leftoverDt,
  };
}

function separationSample(
  entity: EntitySimulationState,
  context: SeparationContext,
): SeparationSample {
  const weight = entity.separationWeight ?? 1;
  if (!context.grid.has(entity.entityId) || !(weight > 0)) {
    return NO_SEPARATION;
  }
  const originX = entity.position[0];
  const originZ = entity.position[2];
  let accX = 0;
  let accZ = 0;
  let hasNeighbor = false;
  for (const otherId of context.grid.query(originX, originZ, SEPARATION_RADIUS_METERS)) {
    if (otherId === entity.entityId) {
      continue;
    }
    const other = context.entities[otherId];
    if (other === undefined || other.spaceId !== entity.spaceId) {
      continue;
    }
    hasNeighbor = true;
    const awayX = originX - other.position[0];
    const awayZ = originZ - other.position[2];
    const apart = Math.hypot(awayX, awayZ);
    if (apart <= ZERO_SEGMENT_EPSILON_METERS) {
      accX += entity.entityId < otherId ? -1 : 1;
    } else {
      accX += awayX / apart;
      accZ += awayZ / apart;
    }
  }
  const accLen = Math.hypot(accX, accZ);
  if (!hasNeighbor || accLen <= ZERO_SEGMENT_EPSILON_METERS) {
    return { dirX: 0, dirZ: 0, hasNeighbor, weight };
  }
  return { dirX: accX / accLen, dirZ: accZ / accLen, hasNeighbor, weight };
}

/** Largest scale in `[0, 1]` that keeps XZ distance to the target from growing past `startDist`. */
function maxOffsetScale(
  walkedX: number,
  walkedZ: number,
  offsetX: number,
  offsetZ: number,
  targetX: number,
  targetZ: number,
  startDist: number,
): number {
  const a = offsetX * offsetX + offsetZ * offsetZ;
  if (a <= ZERO_SEGMENT_EPSILON_METERS) {
    return 0;
  }
  const toTargetX = targetX - walkedX;
  const toTargetZ = targetZ - walkedZ;
  const c = toTargetX * toTargetX + toTargetZ * toTargetZ - startDist * startDist;
  if (c > 1e-9) {
    return 0;
  }
  const b = -2 * (toTargetX * offsetX + toTargetZ * offsetZ);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return 0;
  }
  const upper = (-b + Math.sqrt(discriminant)) / (2 * a);
  if (!Number.isFinite(upper) || upper <= 0) {
    return 0;
  }
  return upper >= 1 ? 1 : upper;
}

function separationSlide(
  sample: SeparationSample,
  frameDtSeconds: number,
  segDx: number,
  segDz: number,
  walkedX: number,
  walkedZ: number,
  targetX: number,
  targetZ: number,
  startDist: number,
): { readonly x: number; readonly z: number } {
  const cap =
    sample.weight *
    Math.min(
      SEPARATION_METERS_PER_SECOND * frameDtSeconds,
      SEPARATION_REMAINING_FRACTION * startDist,
    );
  if (!(cap > 0)) {
    return { x: 0, z: 0 };
  }
  let offsetX = sample.dirX * cap;
  let offsetZ = sample.dirZ * cap;
  const segLen = Math.hypot(segDx, segDz);
  if (segLen > ZERO_SEGMENT_EPSILON_METERS) {
    const forwardX = segDx / segLen;
    const forwardZ = segDz / segLen;
    const along = offsetX * forwardX + offsetZ * forwardZ;
    if (along < 0) {
      offsetX -= forwardX * along;
      offsetZ -= forwardZ * along;
    } else if (along > 0) {
      const remainAlong = (targetX - walkedX) * forwardX + (targetZ - walkedZ) * forwardZ;
      if (along > remainAlong) {
        const excess = along - Math.max(0, remainAlong);
        offsetX -= forwardX * excess;
        offsetZ -= forwardZ * excess;
      }
    }
  }
  const scale = maxOffsetScale(walkedX, walkedZ, offsetX, offsetZ, targetX, targetZ, startDist);
  return { x: offsetX * scale, z: offsetZ * scale };
}

function advanceEntityPath(
  entity: EntitySimulationState,
  dtSeconds: number,
  deliberationScale: number,
  arrivals: WaypointArrivalEvent[],
  transitions: CognitivePhaseTransitionEvent[],
  separation: SeparationContext,
): PhaseStepOutcome {
  if (entity.cognitivePhase !== 'moving') {
    return { entity, leftoverDt: 0 };
  }
  if (entity.activePath.length === 0) {
    return enterPerformingDwell(entity, dtSeconds, deliberationScale, transitions);
  }

  let pos0 = entity.position[0];
  let pos1 = entity.position[1];
  let pos2 = entity.position[2];
  let yaw = entity.yawRadians;
  let currentSpaceId = entity.spaceId;
  let currentWaypointId = entity.waypointId;
  let pathIndex = 0;
  let remainingDt = dtSeconds;
  const path = entity.activePath;
  const speed = entity.walkSpeedMetersPerSec;
  const yawSpeed = entity.yawSpeedRadiansPerSec;
  const sample = separationSample(entity, separation);

  while (pathIndex < path.length && remainingDt > TIME_EPSILON_SECONDS) {
    const target = path[pathIndex];
    if (target === undefined) {
      break;
    }

    const dx = target.position[0] - pos0;
    const dy = target.position[1] - pos1;
    const dz = target.position[2] - pos2;
    const dist = Math.hypot(dx, dy, dz);

    if (dist <= ZERO_SEGMENT_EPSILON_METERS) {
      pos0 = target.position[0];
      pos1 = target.position[1];
      pos2 = target.position[2];
      currentSpaceId = target.spaceId;
      currentWaypointId = target.waypointId;
      pathIndex += 1;
      arrivals.push({
        entityId: entity.entityId,
        waypointId: target.waypointId,
        spaceId: target.spaceId,
        position: [pos0, pos1, pos2],
        terminalArrival: pathIndex >= path.length,
      });
      continue;
    }

    if (speed <= 0) {
      if (yawSpeed > 0) {
        yaw = stepYawTowards(yaw, Math.atan2(dx, dz), yawSpeed * remainingDt);
      }
      remainingDt = 0;
      break;
    }

    const timeToArrive = dist / speed;
    const timeSpent = Math.min(remainingDt, timeToArrive);
    if (yawSpeed > 0 && timeSpent > 0) {
      yaw = stepYawTowards(yaw, Math.atan2(dx, dz), yawSpeed * timeSpent);
    }

    if (timeToArrive <= remainingDt + TIME_EPSILON_SECONDS) {
      pos0 = target.position[0];
      pos1 = target.position[1];
      pos2 = target.position[2];
      currentSpaceId = target.spaceId;
      currentWaypointId = target.waypointId;
      remainingDt = Math.max(0, remainingDt - timeToArrive);
      pathIndex += 1;
      arrivals.push({
        entityId: entity.entityId,
        waypointId: target.waypointId,
        spaceId: target.spaceId,
        position: [pos0, pos1, pos2],
        terminalArrival: pathIndex >= path.length,
      });
      continue;
    }

    const ratio = (speed * timeSpent) / dist;
    const xzRemaining = Math.hypot(dx, dz);
    const walkedX = pos0 + dx * ratio;
    const walkedZ = pos2 + dz * ratio;
    const slide = separationSlide(
      sample,
      separation.frameDtSeconds,
      dx,
      dz,
      walkedX,
      walkedZ,
      target.position[0],
      target.position[2],
      xzRemaining,
    );
    const nextX = walkedX + slide.x;
    const nextZ = walkedZ + slide.z;
    const snapCloseNeighbor =
      xzRemaining <= SEPARATION_SNAP_RADIUS_METERS && sample.hasNeighbor && sample.weight > 0;
    const landedOnTarget =
      Math.hypot(target.position[0] - nextX, target.position[2] - nextZ) <=
      ZERO_SEGMENT_EPSILON_METERS;
    if (snapCloseNeighbor || landedOnTarget) {
      pos0 = target.position[0];
      pos1 = target.position[1];
      pos2 = target.position[2];
      currentSpaceId = target.spaceId;
      currentWaypointId = target.waypointId;
      remainingDt = 0;
      pathIndex += 1;
      arrivals.push({
        entityId: entity.entityId,
        waypointId: target.waypointId,
        spaceId: target.spaceId,
        position: [pos0, pos1, pos2],
        terminalArrival: pathIndex >= path.length,
      });
      continue;
    }
    pos0 = nextX;
    pos1 += dy * ratio;
    pos2 = nextZ;
    remainingDt = 0;
    break;
  }

  if (remainingDt <= TIME_EPSILON_SECONDS) {
    remainingDt = 0;
  }

  const updated: EntitySimulationState = {
    ...entity,
    spaceId: currentSpaceId,
    waypointId: currentWaypointId,
    position: [pos0, pos1, pos2],
    yawRadians: yaw,
    activePath: pathIndex === 0 ? entity.activePath : path.slice(pathIndex),
  };

  if (pathIndex >= path.length) {
    return enterPerformingDwell(updated, remainingDt, deliberationScale, transitions);
  }
  return { entity: updated, leftoverDt: 0 };
}

function stepSingleEntity(
  entity: EntitySimulationState,
  dtSeconds: number,
  deliberationScale: number,
  arrivals: WaypointArrivalEvent[],
  transitions: CognitivePhaseTransitionEvent[],
  separation: SeparationContext,
): EntitySimulationState {
  let current = entity;
  let remainingDt = dtSeconds;
  let guard = 6;

  while (guard > 0) {
    guard -= 1;
    const phase = current.cognitivePhase;

    if (phase === 'moving') {
      if (remainingDt <= TIME_EPSILON_SECONDS && current.activePath.length > 0) {
        break;
      }
      const motion = advanceEntityPath(
        current,
        remainingDt,
        deliberationScale,
        arrivals,
        transitions,
        separation,
      );
      current = motion.entity;
      remainingDt = motion.leftoverDt;
      if (
        remainingDt <= TIME_EPSILON_SECONDS &&
        (current.cognitivePhase !== 'performing_dwell' || current.phaseRemainingSeconds > 0)
      ) {
        break;
      }
      continue;
    }

    if (phase === 'deliberating' || phase === 'performing_dwell' || phase === 'cooldown') {
      if (remainingDt <= TIME_EPSILON_SECONDS && current.phaseRemainingSeconds > 0) {
        break;
      }
      const timed = advanceTimedCognitivePhases(
        current,
        remainingDt,
        deliberationScale,
        transitions,
      );
      current = timed.entity;
      remainingDt = timed.leftoverDt;
      if (remainingDt <= TIME_EPSILON_SECONDS && current.cognitivePhase !== 'moving') {
        break;
      }
      continue;
    }

    break;
  }

  return current;
}

/**
 * Steps continuous 60Hz spatial kinematics and human-paced cognitive timers by `dtSeconds`.
 * Rejects negative or non-finite `dtSeconds` with `RangeError`, and returns the input state
 * unchanged when `dtSeconds === 0` or `state.paused === true`.
 * `spaceKinds` omitted treats every entity as embodied. `off_stage_region` entities
 * still follow paths and are left out of separation.
 */
export function stepKinematics(
  state: WorldState,
  dtSeconds: number,
  spaceKinds?: ReadonlyMap<string, SpaceKind> | undefined,
): KinematicsStepResult {
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
    throw new RangeError(
      `dtSeconds must be a non-negative finite number, received: ${String(dtSeconds)}`,
    );
  }
  if (dtSeconds === 0 || state.paused) {
    return {
      state,
      arrivals: [],
      cognitiveTransitions: [],
    };
  }

  const sortedEntityIds = Object.keys(state.entities).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const nextEntities: Record<string, EntitySimulationState> = {};
  const arrivals: WaypointArrivalEvent[] = [];
  const cognitiveTransitions: CognitivePhaseTransitionEvent[] = [];
  const deliberationScale = state.pacingConfig.deliberationScale;
  const hashedBodies: EmbodiedHashBody[] = [];
  for (const id of sortedEntityIds) {
    const entity = state.entities[id];
    if (entity === undefined) {
      continue;
    }
    hashedBodies.push({
      entityId: id,
      spaceId: entity.spaceId,
      x: entity.position[0],
      z: entity.position[2],
    });
  }
  const separation: SeparationContext = {
    grid: insertEmbodiedBodies(hashedBodies, spaceKinds),
    entities: state.entities,
    frameDtSeconds: dtSeconds,
  };

  for (const id of sortedEntityIds) {
    const original = state.entities[id];
    if (original === undefined) {
      continue;
    }
    nextEntities[id] = stepSingleEntity(
      original,
      dtSeconds,
      deliberationScale,
      arrivals,
      cognitiveTransitions,
      separation,
    );
  }

  return {
    state: {
      ...state,
      elapsedSimulationSeconds: state.elapsedSimulationSeconds + dtSeconds,
      entities: nextEntities,
    },
    arrivals,
    cognitiveTransitions,
  };
}
