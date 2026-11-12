import type { StateSliceStore } from '../../src/domain/core/StateSliceRegistry.js';
import {
  createInitialWorldState,
  type EntitySimulationState,
  type PropSimulationState,
  type SimulationPacingConfig,
  type WorldState,
} from '../../src/domain/simulation/WorldState.js';

export interface MakeWorldStateOptions {
  readonly epochId?: string;
  readonly entities?: Readonly<Record<string, EntitySimulationState>>;
  readonly props?: Readonly<Record<string, PropSimulationState>>;
  readonly pacingConfig?: SimulationPacingConfig;
  readonly stateSlices?: StateSliceStore;
  readonly maxOrbitalDelta?: number;
}

export function makeWorldState(overrides: MakeWorldStateOptions = {}): WorldState {
  return createInitialWorldState({ ...overrides, epochId: overrides.epochId ?? 'epoch_test' });
}

export function makeWorldEntity(
  entityId: string,
  overrides: Partial<EntitySimulationState> = {},
): EntitySimulationState {
  return {
    entityId,
    lineageId: `lineage_${entityId}`,
    spaceId: 'space_alpha',
    waypointId: 'wp_start',
    position: [0, 0, 0],
    yawRadians: 0,
    walkSpeedMetersPerSec: 1.4,
    yawSpeedRadiansPerSec: 6.0,
    cognitivePhase: 'idle',
    phaseRemainingSeconds: 0,
    pendingDwellSeconds: 10,
    pendingCooldownSeconds: 5,
    requiresExternalTrigger: false,
    activePath: [],
    drives: { curiosity: 0.5, secrecy: 0.3 },
    emergencyVice: 'secrecy',
    inertiaPillars: [
      { id: 'pillar_doc', kind: 'doctrine', weight: 0.7 },
      { id: 'pillar_debt', kind: 'debt', weight: 0.4 },
    ],
    pendingStimuli: [],
    ...overrides,
  };
}
