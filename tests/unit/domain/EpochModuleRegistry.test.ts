import { describe, expect, it } from 'vitest';
import { EpochModuleRegistry } from '../../../src/domain/registries/EpochModuleRegistry.js';

describe('EpochModuleRegistry and EpochBlueprints', () => {
  it('registers a valid epoch module pack across all blueprint families and sorts behaviors topologically', () => {
    const registry = new EpochModuleRegistry();

    registry.registerPack({
      epochId: 'epoch_test_01',
      spaces: [
        {
          id: 'space_alpha',
          name: 'Alpha Chamber',
          kind: 'indoor_room',
          earshotRadiusMeters: 6,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.15,
          connectedSpaceIds: ['space_beta'],
          waypoints: [
            { id: 'wp_alpha_1', position: [0, 0, 0] },
            { id: 'wp_alpha_2', position: [2, 0, 0] },
          ],
        },
        {
          id: 'space_beta',
          name: 'Beta Courtyard',
          kind: 'outdoor_area',
          earshotRadiusMeters: 14,
          surfaceMaterial: 'mud',
          acousticClass: 'open_court',
          ambientMaskLoudness: 0.4,
          connectedSpaceIds: ['space_alpha'],
          waypoints: [{ id: 'wp_beta_1', position: [10, 0, 0] }],
        },
      ],
      props: [
        {
          id: 'prop_portal_ab',
          name: 'Connecting Door',
          spaceId: 'space_alpha',
          waypointId: 'wp_alpha_2',
          tier: 'interactive',
          initialState: { locked: false },
          portalState: 'closed',
        },
      ],
      characters: [
        {
          id: 'char_alpha',
          name: 'Agent Alpha',
          lineageId: 'lineage_alpha',
          tier: 'utility_schemer',
          startingSpaceId: 'space_alpha',
          startingWaypointId: 'wp_alpha_1',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6.0,
          listenerThreshold: 0.18,
          acousticBias: 'transient',
          drives: { curiosity: 0.8, secrecy: 0.4 },
          emergencyVice: 'secrecy',
          inertiaPillars: [
            { id: 'pillar_doc', kind: 'doctrine', weight: 0.6 },
            {
              id: 'pillar_debt',
              kind: 'debt',
              weight: 0.5,
              holderEntityId: 'char_beta',
            },
          ],
        },
        {
          id: 'char_beta',
          name: 'Agent Beta',
          lineageId: 'lineage_beta',
          tier: 'role_routine',
          startingSpaceId: 'space_beta',
          startingWaypointId: 'wp_beta_1',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6.0,
          listenerThreshold: 0.28,
          drives: { duty: 0.7 },
          emergencyVice: 'duty',
          inertiaPillars: [],
        },
      ],
      offices: [
        {
          id: 'office_auditor',
          name: 'Chief Auditor',
          institutionalLineageId: 'inst_monetary_audit',
          patronEntityId: 'char_beta',
          pretextFamilies: ['monetary_assay', 'technical_audit'],
          stipendPerTick: 10,
          exposureRiskModifier: 0.1,
        },
      ],
      quietClaims: [
        {
          id: 'claim_confidant',
          name: 'Silent Confidant',
          targetEntityId: 'char_alpha',
          unlockedPretext: 'protocol_immunity',
          exposurePenalty: 0.25,
        },
      ],
      rivals: [
        {
          id: 'rival_ascetics',
          name: 'Ascetic Collective',
          doctrineSummary: 'Static equilibrium',
          orbitalOffsetTicks: 5,
          spoofMode: 'deletion',
          coverEntityId: 'char_beta',
        },
      ],
      threads: [
        {
          id: 'thread_succession',
          name: 'Succession Paradox',
          initialInertia: 0.2,
          dualUseCeiling: 2,
          primaryCandidateLineageId: 'lineage_alpha',
          substituteCandidateLineageId: 'lineage_beta',
        },
      ],
      channels: [
        {
          id: 'channel_courier',
          name: 'Relay Runner',
          baseTransitTicks: 4,
          interceptionRisk: 0.15,
          forgeryDifficulty: 0.5,
        },
      ],
      emergencies: [
        {
          id: 'emergency_lockdown',
          name: 'Security Lockdown',
          dominantVerb: 'quarantine',
          fuseTicks: 6,
          viceCompoundRate: 0.05,
        },
      ],
      orbitalPass: {
        id: 'orbit_standard',
        zenithDurationTicks: 3,
        horizonDurationTicks: 2,
        occludedDurationTicks: 5,
        maxDelta: 100,
        slingshotCost: 40,
        burnCostPerTick: 15,
      },
      behaviors: [
        {
          id: 'bhv_chain',
          label: 'Chain Action',
          dependencyIds: ['bhv_work', 'bhv_rest'],
          deliberationSeconds: 4,
          dwellSeconds: 8,
          cooldownSeconds: 4,
          requiresExternalTrigger: true,
        },
        {
          id: 'bhv_rest',
          label: 'Rest Action',
          dependencyIds: ['bhv_work'],
          deliberationSeconds: 2,
          dwellSeconds: 6,
          cooldownSeconds: 2,
          requiresExternalTrigger: false,
        },
        {
          id: 'bhv_work',
          label: 'Work Action',
          dependencyIds: [],
          deliberationSeconds: 3,
          dwellSeconds: 10,
          cooldownSeconds: 3,
          requiresExternalTrigger: false,
        },
      ],
    });

    expect(registry.getSpace('space_alpha').surfaceMaterial).toBe('stone');
    expect(registry.getProp('prop_portal_ab').portalState).toBe('closed');
    expect(registry.getCharacter('char_alpha').lineageId).toBe('lineage_alpha');
    expect(registry.getOffice('office_auditor').institutionalLineageId).toBe('inst_monetary_audit');
    expect(registry.getQuietClaim('claim_confidant').unlockedPretext).toBe('protocol_immunity');
    expect(registry.getRival('rival_ascetics').spoofMode).toBe('deletion');
    expect(registry.getThread('thread_succession').dualUseCeiling).toBe(2);
    expect(registry.getChannel('channel_courier').baseTransitTicks).toBe(4);
    expect(registry.getEmergency('emergency_lockdown').fuseTicks).toBe(6);
    expect(registry.getOrbitalPass()?.maxDelta).toBe(100);

    const sortedIds = registry.getBehaviorsInTopologicalOrder().map((b) => b.id);
    expect(sortedIds).toEqual(['bhv_work', 'bhv_rest', 'bhv_chain']);
  });

  it('rejects duplicate IDs, self-linked spaces, dangling connectedSpaceIds, and waypoints outside startingSpaceId', () => {
    const registry = new EpochModuleRegistry();

    expect(() =>
      registry.registerSpaces([
        {
          id: 'space_self',
          name: 'Self Link',
          kind: 'indoor_room',
          earshotRadiusMeters: 5,
          surfaceMaterial: 'wood',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_self'],
          waypoints: [{ id: 'wp_1', position: [0, 0, 0] }],
        },
      ]),
    ).toThrow(/cannot reference itself/);

    const registryDangling = new EpochModuleRegistry();
    expect(() =>
      registryDangling.registerSpaces([
        {
          id: 'space_a',
          name: 'Space A',
          kind: 'indoor_room',
          earshotRadiusMeters: 5,
          surfaceMaterial: 'wood',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_missing'],
          waypoints: [{ id: 'wp_a', position: [0, 0, 0] }],
        },
      ]),
    ).toThrow(/unknown connectedSpaceId/);

    const registryWrongWp = new EpochModuleRegistry();
    registryWrongWp.registerSpaces([
      {
        id: 'space_1',
        name: 'Space 1',
        kind: 'indoor_room',
        earshotRadiusMeters: 5,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: ['space_2'],
        waypoints: [{ id: 'wp_1', position: [0, 0, 0] }],
      },
      {
        id: 'space_2',
        name: 'Space 2',
        kind: 'indoor_room',
        earshotRadiusMeters: 5,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: ['space_1'],
        waypoints: [{ id: 'wp_2', position: [5, 0, 0] }],
      },
    ]);

    expect(() =>
      registryWrongWp.registerProps([
        {
          id: 'prop_wrong_wp',
          name: 'Wrong Waypoint Prop',
          spaceId: 'space_1',
          waypointId: 'wp_2',
          tier: 'static',
          initialState: {},
        },
      ]),
    ).toThrow(/belongs to space 'space_2', not 'space_1'/);
  });

  it('rejects behavior self-loops, multi-node cycles, and missing behavior dependencies', () => {
    const registrySelfLoop = new EpochModuleRegistry();
    expect(() =>
      registrySelfLoop.registerBehaviors([
        {
          id: 'bhv_self',
          label: 'Self Loop',
          dependencyIds: ['bhv_self'],
          deliberationSeconds: 1,
          dwellSeconds: 1,
          cooldownSeconds: 1,
          requiresExternalTrigger: false,
        },
      ]),
    ).toThrow(/cycle/i);

    const registryCycle = new EpochModuleRegistry();
    expect(() =>
      registryCycle.registerBehaviors([
        {
          id: 'bhv_a',
          label: 'Behavior A',
          dependencyIds: ['bhv_b'],
          deliberationSeconds: 1,
          dwellSeconds: 1,
          cooldownSeconds: 1,
          requiresExternalTrigger: false,
        },
        {
          id: 'bhv_b',
          label: 'Behavior B',
          dependencyIds: ['bhv_a'],
          deliberationSeconds: 1,
          dwellSeconds: 1,
          cooldownSeconds: 1,
          requiresExternalTrigger: false,
        },
      ]),
    ).toThrow(/cycle/i);

    const registryMissing = new EpochModuleRegistry();
    expect(() =>
      registryMissing.registerBehaviors([
        {
          id: 'bhv_orphan',
          label: 'Orphan Behavior',
          dependencyIds: ['bhv_missing'],
          deliberationSeconds: 1,
          dwellSeconds: 1,
          cooldownSeconds: 1,
          requiresExternalTrigger: false,
        },
      ]),
    ).toThrow(/unregistered behavior 'bhv_missing'/);
  });
});
