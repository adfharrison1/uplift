/**
 * Pure Deterministic WorldEffect Reducer (`src/domain/simulation/WorldEffectReducer.ts`).
 *
 * Applies discrete `WorldEffect` commands immutably to a `WorldState` snapshot,
 * including anti-thundering-herd stimulus backoff, emergency vice compounding,
 * inertia pillar collapse, pressure stock clamping, illicit fund mode insertion,
 * orbital delta spend, custom state slices, and legacy scars.
 */
import { defineStateSlice } from '../core/StateSliceRegistry.js';
import type { DiscoveryLayer } from '../registries/EpochBlueprints.js';
import {
  type EntitySimulationState,
  type PendingStimulus,
  type PropSimulationState,
  type WorldEffect,
  WorldEffectSchema,
  type WorldState,
} from './WorldState.js';

export const MAX_EMITTED_AUDIO_CUES = 128 as const;
export const MAX_PENDING_STIMULI_PER_ENTITY = 32 as const;
const MAX_BACKOFF_EXPONENT = 64 as const;
const FORBIDDEN_PATCH_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

const DISCOVERY_RANK: Readonly<Record<DiscoveryLayer, number>> = {
  noticed: 1,
  assayed: 2,
  attributed: 3,
  theorized: 4,
};

export interface WorldEffectReducerResult {
  readonly state: WorldState;
  readonly appliedEffects: ReadonlyArray<WorldEffect>;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function maxDiscoveryLayer(
  current: DiscoveryLayer | null,
  candidate: DiscoveryLayer,
): DiscoveryLayer {
  if (current === null) {
    return candidate;
  }
  return DISCOVERY_RANK[candidate] > DISCOVERY_RANK[current] ? candidate : current;
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

    case 'set_separation_weight': {
      const entity = requireEntity(state.entities, effect.entityId);
      return {
        ...state,
        entities: {
          ...state.entities,
          [entity.entityId]: {
            ...entity,
            separationWeight: effect.weight,
          },
        },
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
      const cappedHop = Math.min(effect.cascadeHopCount, MAX_BACKOFF_EXPONENT);
      const delaySeconds =
        state.pacingConfig.baseDigestionDelaySeconds *
        Math.pow(state.pacingConfig.cascadeBackoffFactor, cappedHop);
      const readyAtElapsedSeconds =
        state.elapsedSimulationSeconds +
        (Number.isFinite(delaySeconds) ? delaySeconds : Number.MAX_SAFE_INTEGER);

      const reachedHopCap = effect.cascadeHopCount >= state.pacingConfig.maxAutonomousCascadeHops;

      const stimulus: PendingStimulus = {
        stimulusId: effect.stimulusId,
        sourceEntityId: effect.sourceEntityId,
        topic: effect.topic,
        cascadeHopCount: effect.cascadeHopCount,
        readyAtElapsedSeconds,
        deliberationSeconds: effect.deliberationSeconds,
        dwellSeconds: effect.dwellSeconds,
        cooldownSeconds: effect.cooldownSeconds,
        requiresExternalTrigger: effect.requiresExternalTrigger || reachedHopCap,
        externalRelease: false,
      };

      const nextStimuli = [...entity.pendingStimuli, stimulus];
      const boundedStimuli =
        nextStimuli.length > MAX_PENDING_STIMULI_PER_ENTITY
          ? nextStimuli.slice(nextStimuli.length - MAX_PENDING_STIMULI_PER_ENTITY)
          : nextStimuli;

      const nextPhase =
        reachedHopCap && entity.cognitivePhase === 'idle'
          ? 'awaiting_trigger'
          : entity.cognitivePhase;

      const updatedEntity: EntitySimulationState = {
        ...entity,
        cognitivePhase: nextPhase,
        requiresExternalTrigger: entity.requiresExternalTrigger || reachedHopCap,
        pendingStimuli: boundedStimuli,
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
      const mergedState: Record<string, unknown> = { ...prop.state };
      for (const [key, val] of Object.entries(effect.patch)) {
        if (!FORBIDDEN_PATCH_KEYS.has(key)) {
          mergedState[key] = val;
        }
      }
      const updatedProp: PropSimulationState = {
        ...prop,
        state: structuredClone(mergedState),
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

    case 'insert_illicit_instrument': {
      if (effect.instrument === 'unbacked_mass_commodity') {
        return {
          ...state,
          pressureStocks: {
            ...state.pressureStocks,
            subsistence_pressure: clamp01(
              state.pressureStocks.subsistence_pressure + effect.intensity,
            ),
          },
          discoveryLayer: maxDiscoveryLayer(state.discoveryLayer, 'assayed'),
        };
      }

      if (effect.instrument === 'forged_fiat_instrument') {
        return {
          ...state,
          pressureStocks: {
            ...state.pressureStocks,
            production_pressure: clamp01(
              state.pressureStocks.production_pressure + effect.intensity * 0.25,
            ),
          },
          discoveryLayer: maxDiscoveryLayer(state.discoveryLayer, 'attributed'),
        };
      }

      // 'anachronistic_marvel'
      const nextScars =
        effect.scarId !== undefined &&
        !state.recordedLegacyScars.some((s) => s.scarId === effect.scarId)
          ? [
              ...state.recordedLegacyScars,
              {
                scarId: effect.scarId,
                ledger: 'veil' as const,
                description: effect.scarDescription ?? 'Anachronistic marvel venerated',
                worldTick: state.worldTick,
              },
            ]
          : state.recordedLegacyScars;

      return {
        ...state,
        pressureStocks: {
          ...state.pressureStocks,
          elite_prestige_pressure: clamp01(
            state.pressureStocks.elite_prestige_pressure + effect.intensity,
          ),
        },
        discoveryLayer: maxDiscoveryLayer(state.discoveryLayer, 'noticed'),
        recordedLegacyScars: nextScars,
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
      const sortedIds = Object.keys(state.entities).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const nextEntities: Record<string, EntitySimulationState> = {};
      for (const id of sortedIds) {
        const entity = state.entities[id];
        if (entity === undefined) {
          continue;
        }
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
      if (effect.mode === 'burn' && state.orbitalPass.phase !== 'zenith') {
        throw new Error(
          `Orbital Burn requires 'zenith' pass phase (current phase: '${state.orbitalPass.phase}')`,
        );
      }
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
      const nextCues = [
        ...state.emittedAudioCues,
        {
          bus: effect.bus,
          cueId: effect.cueId,
          loudness: effect.loudness,
          sourceSpaceId: effect.sourceSpaceId,
          worldTick: state.worldTick,
        },
      ];
      return {
        ...state,
        emittedAudioCues:
          nextCues.length > MAX_EMITTED_AUDIO_CUES
            ? nextCues.slice(nextCues.length - MAX_EMITTED_AUDIO_CUES)
            : nextCues,
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
