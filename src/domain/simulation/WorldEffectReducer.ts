/**
 * Pure Deterministic WorldEffect Reducer (`src/domain/simulation/WorldEffectReducer.ts`).
 *
 * Applies discrete `WorldEffect` commands immutably to a `WorldState` snapshot,
 * including anti-thundering-herd stimulus backoff, emergency vice compounding,
 * inertia pillar collapse, pressure stock clamping, orbital delta spend, custom state slices,
 * and legacy scars.
 */
import { defineStateSlice } from '../core/StateSliceRegistry.js';
import {
  type EntitySimulationState,
  type PendingStimulus,
  type PropSimulationState,
  type WorldEffect,
  WorldEffectSchema,
  type WorldState,
} from './WorldState.js';

export interface WorldEffectReducerResult {
  readonly state: WorldState;
  readonly appliedEffects: ReadonlyArray<WorldEffect>;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function requireEntity(
  entities: Readonly<Record<string, EntitySimulationState>>,
  entityId: string,
): EntitySimulationState {
  const entity = entities[entityId];
  if (entity === undefined) {
    throw new Error(`Unknown entityId '${entityId}' in WorldEffect`);
  }
  return entity;
}

function requireProp(
  props: Readonly<Record<string, PropSimulationState>>,
  propId: string,
): PropSimulationState {
  const prop = props[propId];
  if (prop === undefined) {
    throw new Error(`Unknown propId '${propId}' in WorldEffect`);
  }
  return prop;
}

function applySingleWorldEffect(state: WorldState, effect: WorldEffect): WorldState {
  switch (effect.type) {
    case 'set_paused': {
      return {
        ...state,
        paused: effect.paused,
      };
    }

    case 'move_entity_to_waypoint': {
      const entity = requireEntity(state.entities, effect.entityId);
      const updatedEntity: EntitySimulationState = {
        ...entity,
        activePath: effect.path.map((wp) => ({
          waypointId: wp.waypointId,
          spaceId: wp.spaceId,
          position: [wp.position[0], wp.position[1], wp.position[2]],
        })),
        cognitivePhase: entity.cognitivePhase === 'deliberating' ? 'deliberating' : 'moving',
      };
      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: updatedEntity,
        },
      };
    }

    case 'set_cognitive_phase': {
      const entity = requireEntity(state.entities, effect.entityId);
      const isTimedPhase =
        effect.phase === 'deliberating' ||
        effect.phase === 'performing_dwell' ||
        effect.phase === 'cooldown';
      const scaledDuration = isTimedPhase
        ? effect.durationSeconds * state.pacingConfig.deliberationScale
        : 0;
      const updatedEntity: EntitySimulationState = {
        ...entity,
        cognitivePhase: effect.phase,
        phaseRemainingSeconds: scaledDuration,
        ...(effect.behaviorId !== undefined ? { activeBehaviorId: effect.behaviorId } : {}),
        ...(effect.dwellSeconds !== undefined ? { pendingDwellSeconds: effect.dwellSeconds } : {}),
        ...(effect.cooldownSeconds !== undefined
          ? { pendingCooldownSeconds: effect.cooldownSeconds }
          : {}),
        ...(effect.requiresExternalTrigger !== undefined
          ? { requiresExternalTrigger: effect.requiresExternalTrigger }
          : {}),
      };
      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: updatedEntity,
        },
      };
    }

    case 'enqueue_npc_stimulus': {
      const entity = requireEntity(state.entities, effect.targetEntityId);
      const delaySeconds =
        state.pacingConfig.baseDigestionDelaySeconds *
        Math.pow(state.pacingConfig.cascadeBackoffFactor, effect.cascadeHopCount);
      const readyAtElapsedSeconds = state.elapsedSimulationSeconds + delaySeconds;

      const stimulus: PendingStimulus = {
        stimulusId: effect.stimulusId,
        sourceEntityId: effect.sourceEntityId,
        topic: effect.topic,
        cascadeHopCount: effect.cascadeHopCount,
        readyAtElapsedSeconds,
        deliberationSeconds: effect.deliberationSeconds,
        dwellSeconds: effect.dwellSeconds,
        cooldownSeconds: effect.cooldownSeconds,
        requiresExternalTrigger: effect.requiresExternalTrigger,
        externalRelease: false,
      };

      const reachedHopCap = effect.cascadeHopCount >= state.pacingConfig.maxAutonomousCascadeHops;
      const nextPhase = reachedHopCap ? 'awaiting_trigger' : entity.cognitivePhase;

      const updatedEntity: EntitySimulationState = {
        ...entity,
        cognitivePhase: nextPhase,
        pendingStimuli: [...entity.pendingStimuli, stimulus],
      };

      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: updatedEntity,
        },
      };
    }

    case 'release_external_trigger': {
      const entity = requireEntity(state.entities, effect.entityId);
      const releasedStimuli = entity.pendingStimuli.map((s) => ({
        ...s,
        externalRelease: true,
        readyAtElapsedSeconds: Math.min(s.readyAtElapsedSeconds, state.elapsedSimulationSeconds),
      }));

      const updatedEntity: EntitySimulationState = {
        ...entity,
        cognitivePhase:
          entity.cognitivePhase === 'awaiting_trigger' ? 'idle' : entity.cognitivePhase,
        requiresExternalTrigger: false,
        pendingStimuli: releasedStimuli,
      };

      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: updatedEntity,
        },
      };
    }

    case 'update_prop_state': {
      const prop = requireProp(state.props, effect.propId);
      const updatedProp: PropSimulationState = {
        ...prop,
        state: structuredClone({
          ...prop.state,
          ...effect.patch,
        }),
        ...(effect.portalState !== undefined ? { portalState: effect.portalState } : {}),
      };
      return {
        ...state,
        props: {
          ...state.props,
          [prop.propId]: updatedProp,
        },
      };
    }

    case 'adjust_pressure_stock': {
      const currentVal = state.pressureStocks[effect.stock];
      return {
        ...state,
        pressureStocks: {
          ...state.pressureStocks,
          [effect.stock]: clamp01(currentVal + effect.delta),
        },
      };
    }

    case 'set_discovery_layer': {
      return {
        ...state,
        discoveryLayer: effect.layer,
      };
    }

    case 'collapse_inertia_pillar': {
      const entity = requireEntity(state.entities, effect.entityId);
      const nextPillars = entity.inertiaPillars.filter((p) => p.id !== effect.pillarId);
      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: {
            ...entity,
            inertiaPillars: nextPillars,
          },
        },
      };
    }

    case 'trigger_emergency': {
      return {
        ...state,
        activeEmergencyId: effect.emergencyId,
      };
    }

    case 'compound_emergency_vices': {
      if (state.activeEmergencyId === null) {
        return state;
      }
      const nextEntities: Record<string, EntitySimulationState> = {};
      for (const [id, entity] of Object.entries(state.entities)) {
        const currentViceVal = entity.drives[entity.emergencyVice] ?? 0;
        nextEntities[id] = {
          ...entity,
          drives: {
            ...entity.drives,
            [entity.emergencyVice]: clamp01(currentViceVal + effect.delta),
          },
        };
      }
      return {
        ...state,
        entities: nextEntities,
      };
    }

    case 'resolve_emergency': {
      return {
        ...state,
        activeEmergencyId: null,
      };
    }

    case 'advance_orbital_pass': {
      const samePhase = state.orbitalPass.phase === effect.phase;
      const nextDelta = Math.min(
        state.orbitalPass.maxDelta,
        state.orbitalPass.availableDelta + effect.deltaRegen,
      );
      return {
        ...state,
        orbitalPass: {
          ...state.orbitalPass,
          phase: effect.phase,
          ticksInCurrentPhase: samePhase ? state.orbitalPass.ticksInCurrentPhase + 1 : 0,
          availableDelta: nextDelta,
          activeBurn: effect.phase === 'zenith' ? state.orbitalPass.activeBurn : false,
        },
      };
    }

    case 'spend_orbital_delta': {
      if (effect.cost > state.orbitalPass.availableDelta) {
        throw new Error(
          `Insufficient orbital Delta: required ${String(effect.cost)}, available ${String(state.orbitalPass.availableDelta)}`,
        );
      }
      const nextPhase = effect.mode === 'slingshot' ? 'zenith' : state.orbitalPass.phase;
      const phaseChanged = nextPhase !== state.orbitalPass.phase;
      return {
        ...state,
        orbitalPass: {
          ...state.orbitalPass,
          phase: nextPhase,
          ticksInCurrentPhase: phaseChanged ? 0 : state.orbitalPass.ticksInCurrentPhase,
          availableDelta: state.orbitalPass.availableDelta - effect.cost,
          activeBurn: effect.mode === 'burn' ? true : state.orbitalPass.activeBurn,
        },
      };
    }

    case 'emit_audio_cue': {
      return {
        ...state,
        emittedAudioCues: [
          ...state.emittedAudioCues,
          {
            bus: effect.bus,
            cueId: effect.cueId,
            loudness: effect.loudness,
            sourceSpaceId: effect.sourceSpaceId,
            worldTick: state.worldTick,
          },
        ],
      };
    }

    case 'record_legacy_scar': {
      const alreadyExists = state.recordedLegacyScars.some((s) => s.scarId === effect.scarId);
      if (alreadyExists) {
        return state;
      }
      return {
        ...state,
        recordedLegacyScars: [
          ...state.recordedLegacyScars,
          {
            scarId: effect.scarId,
            ledger: effect.ledger,
            description: effect.description,
            worldTick: state.worldTick,
          },
        ],
      };
    }

    case 'set_state_slice': {
      const sliceKey = defineStateSlice<unknown>(effect.sliceId, effect.value);
      return {
        ...state,
        stateSlices: state.stateSlices.withSlice(sliceKey, effect.value),
      };
    }
  }
}

/**
 * Applies a batch of discrete `WorldEffect` commands immutably, returning a new `WorldState`.
 */
export function applyWorldEffects(
  state: WorldState,
  effects: ReadonlyArray<WorldEffect>,
): WorldEffectReducerResult {
  if (effects.length === 0) {
    return { state, appliedEffects: [] };
  }

  let current = state;
  const applied: WorldEffect[] = [];

  for (const rawEffect of effects) {
    const parsedEffect = WorldEffectSchema.parse(rawEffect);
    current = applySingleWorldEffect(current, parsedEffect);
    applied.push(parsedEffect);
  }

  return {
    state: current,
    appliedEffects: applied,
  };
}
