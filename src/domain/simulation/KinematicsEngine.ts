/**
 * Continuous 60Hz Kinematics & Human-Paced Cognitive Phase Engine
 * (`src/domain/simulation/KinematicsEngine.ts`).
 *
 * Advances entity positions and yaw rotations along waypoint paths at realistic speeds (`m/s`, `rad/s`),
 * snaps to exact waypoint coordinates, emits `WaypointArrivalEvent`s in path order, advances
 * human-paced cognitive timers (`deliberating -> moving -> performing_dwell -> cooldown -> idle|awaiting_trigger`),
 * carries leftover intra-frame time across phase transitions, waterfalls zero-duration phases in a single pass
 * under `FAST_EVAL_PACING_CONFIG`, and freezes when `paused`.
 */
import type { CognitivePhase, EntitySimulationState, WorldState } from './WorldState.js';

const ZERO_SEGMENT_EPSILON_METERS = 1e-6;
const TIME_EPSILON_SECONDS = 1e-9;

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

function advanceEntityPath(
  entity: EntitySimulationState,
  dtSeconds: number,
  deliberationScale: number,
  arrivals: WaypointArrivalEvent[],
  transitions: CognitivePhaseTransitionEvent[],
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
    pos0 += dx * ratio;
    pos1 += dy * ratio;
    pos2 += dz * ratio;
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
 */
export function stepKinematics(state: WorldState, dtSeconds: number): KinematicsStepResult {
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
