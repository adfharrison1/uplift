import { describe, expect, it } from 'vitest';
import { hasPortalNavigationEdge } from '../../../src/domain/registries/EpochBlueprints.js';
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
    expect(registry.getWaypoint('wp_alpha_1').spaceId).toBe('space_alpha');
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

    // Atomic rollback: after failed registration above, 'prop_wrong_wp' is NOT reserved and can be registered cleanly
    registryWrongWp.registerProps([
      {
        id: 'prop_wrong_wp',
        name: 'Fixed Waypoint Prop',
        spaceId: 'space_1',
        waypointId: 'wp_1',
        tier: 'static',
        initialState: {},
      },
    ]);
    expect(registryWrongWp.getProp('prop_wrong_wp').waypointId).toBe('wp_1');

    // Duplicate ID across module types is rejected
    expect(() =>
      registryWrongWp.registerProps([
        {
          id: 'space_1',
          name: 'Colliding ID Prop',
          spaceId: 'space_1',
          waypointId: 'wp_1',
          tier: 'static',
          initialState: {},
        },
      ]),
    ).toThrow(/Duplicate module id 'space_1'/);

    // Unknown patronEntityId on Office and unknown targetEntityId on QuietClaim are rejected
    expect(() =>
      registryWrongWp.registerOffices([
        {
          id: 'office_orphan',
          name: 'Orphan Office',
          institutionalLineageId: 'inst_orphan',
          patronEntityId: 'char_missing',
          pretextFamilies: ['technical_audit'],
          stipendPerTick: 5,
          exposureRiskModifier: 0.1,
        },
      ]),
    ).toThrow(/unknown patronEntityId 'char_missing'/);

    expect(() =>
      registryWrongWp.registerQuietClaims([
        {
          id: 'claim_orphan',
          name: 'Orphan Claim',
          targetEntityId: 'char_missing',
          unlockedPretext: 'technical_audit',
          exposurePenalty: 0.2,
        },
      ]),
    ).toThrow(/unknown targetEntityId 'char_missing'/);
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

  it('registers neighbor links, portal targets, separation weights, and getAllSpaces', () => {
    const registry = new EpochModuleRegistry();
    registry.registerSpaces([
      {
        id: 'space_yard',
        name: 'Yard',
        kind: 'outdoor_area',
        earshotRadiusMeters: 12,
        surfaceMaterial: 'mud',
        acousticClass: 'open_court',
        ambientMaskLoudness: 0.3,
        connectedSpaceIds: ['space_room'],
        waypoints: [
          { id: 'wp_yard_gate', position: [0, 0, 0], neighborWaypointIds: ['wp_yard_door'] },
          { id: 'wp_yard_door', position: [4, 0, 0] },
        ],
      },
      {
        id: 'space_room',
        name: 'Room',
        kind: 'indoor_room',
        earshotRadiusMeters: 5,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: ['space_yard'],
        waypoints: [{ id: 'wp_room_threshold', position: [6, 0, 0] }],
      },
    ]);
    registry.registerProps([
      {
        id: 'prop_door',
        name: 'Door',
        spaceId: 'space_yard',
        waypointId: 'wp_yard_door',
        tier: 'interactive',
        initialState: {},
        portalState: 'open',
        portalTargetSpaceId: 'space_room',
        portalTargetWaypointId: 'wp_room_threshold',
      },
      {
        id: 'prop_hinge_only',
        name: 'Hinge',
        spaceId: 'space_yard',
        waypointId: 'wp_yard_gate',
        tier: 'static',
        initialState: {},
        portalState: 'closed',
      },
    ]);
    registry.registerCharacters([
      {
        id: 'char_packed',
        name: 'Packed',
        lineageId: 'lineage_packed',
        tier: 'ambient_crowd',
        startingSpaceId: 'space_yard',
        startingWaypointId: 'wp_yard_gate',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.2 },
        emergencyVice: 'duty',
        inertiaPillars: [],
        separationWeight: 0,
      },
      {
        id: 'char_default',
        name: 'Default',
        lineageId: 'lineage_default',
        tier: 'ambient_crowd',
        startingSpaceId: 'space_room',
        startingWaypointId: 'wp_room_threshold',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.2 },
        emergencyVice: 'duty',
        inertiaPillars: [],
      },
      {
        id: 'char_personal',
        name: 'Personal',
        lineageId: 'lineage_personal',
        tier: 'role_routine',
        startingSpaceId: 'space_yard',
        startingWaypointId: 'wp_yard_door',
        walkSpeedMetersPerSec: 1.4,
        yawSpeedRadiansPerSec: 6,
        listenerThreshold: 0.2,
        drives: { duty: 0.4 },
        emergencyVice: 'duty',
        inertiaPillars: [],
        separationWeight: 1,
      },
    ]);

    expect(registry.getWaypoint('wp_yard_gate').waypoint.neighborWaypointIds).toEqual([
      'wp_yard_door',
    ]);
    expect(registry.getProp('prop_door').portalTargetSpaceId).toBe('space_room');
    expect(registry.getProp('prop_door').portalTargetWaypointId).toBe('wp_room_threshold');
    expect(registry.getProp('prop_hinge_only').portalTargetSpaceId).toBeUndefined();
    expect(hasPortalNavigationEdge(registry.getProp('prop_door'))).toBe(true);
    expect(hasPortalNavigationEdge(registry.getProp('prop_hinge_only'))).toBe(false);
    expect(registry.getCharacter('char_packed').separationWeight).toBe(0);
    expect(registry.getCharacter('char_default').separationWeight).toBe(1);
    expect(registry.getCharacter('char_personal').separationWeight).toBe(1);
    expect(registry.getAllSpaces().map((space) => space.id)).toEqual(['space_yard', 'space_room']);
    expect(registry.getAllSpaces()[0]?.kind).toBe('outdoor_area');
    expect(registry.getAllSpaces()[0]?.waypoints).toHaveLength(2);
  });

  it('rejects broken neighbor graphs, portal targets, and separation weights', () => {
    const pair = (): EpochModuleRegistry => {
      const registry = new EpochModuleRegistry();
      registry.registerSpaces([
        {
          id: 'space_a',
          name: 'A',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_b'],
          waypoints: [
            { id: 'wp_a1', position: [0, 0, 0] },
            { id: 'wp_a2', position: [1, 0, 0] },
          ],
        },
        {
          id: 'space_b',
          name: 'B',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'wood',
          acousticClass: 'live_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_a'],
          waypoints: [{ id: 'wp_b1', position: [8, 0, 0] }],
        },
      ]);
      return registry;
    };

    expect(() =>
      new EpochModuleRegistry().registerSpaces([
        {
          id: 'space_self_neighbor',
          name: 'Self',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: [],
          waypoints: [{ id: 'wp_loop', position: [0, 0, 0], neighborWaypointIds: ['wp_loop'] }],
        },
      ]),
    ).toThrow(/Waypoint 'wp_loop'/);

    expect(() =>
      new EpochModuleRegistry().registerSpaces([
        {
          id: 'space_dup',
          name: 'Dup',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: [],
          waypoints: [
            { id: 'wp_dup', position: [0, 0, 0], neighborWaypointIds: ['wp_other', 'wp_other'] },
            { id: 'wp_other', position: [1, 0, 0], neighborWaypointIds: ['wp_dup'] },
          ],
        },
      ]),
    ).toThrow(/Waypoint 'wp_dup'/);

    expect(() =>
      new EpochModuleRegistry().registerSpaces([
        {
          id: 'space_missing_neighbor',
          name: 'Missing',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: [],
          waypoints: [{ id: 'wp_known', position: [0, 0, 0], neighborWaypointIds: ['wp_missing'] }],
        },
      ]),
    ).toThrow(/Waypoint 'wp_known'/);

    expect(() =>
      new EpochModuleRegistry().registerSpaces([
        {
          id: 'space_near',
          name: 'Near',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: ['space_far'],
          waypoints: [{ id: 'wp_near', position: [0, 0, 0], neighborWaypointIds: ['wp_far'] }],
        },
        {
          id: 'space_far',
          name: 'Far',
          kind: 'outdoor_area',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'mud',
          acousticClass: 'open_court',
          ambientMaskLoudness: 0.2,
          connectedSpaceIds: ['space_near'],
          waypoints: [{ id: 'wp_far', position: [9, 0, 0], neighborWaypointIds: ['wp_near'] }],
        },
      ]),
    ).toThrow(/Waypoint 'wp_near'/);

    expect(() =>
      new EpochModuleRegistry().registerSpaces([
        {
          id: 'space_orphan',
          name: 'Orphan',
          kind: 'indoor_room',
          earshotRadiusMeters: 4,
          surfaceMaterial: 'stone',
          acousticClass: 'tight_interior',
          ambientMaskLoudness: 0.1,
          connectedSpaceIds: [],
          waypoints: [
            { id: 'wp_linked', position: [0, 0, 0], neighborWaypointIds: ['wp_mate'] },
            { id: 'wp_mate', position: [1, 0, 0] },
            { id: 'wp_stranded', position: [3, 0, 0] },
          ],
        },
      ]),
    ).toThrow(/Waypoint 'wp_stranded'/);

    expect(() =>
      pair().registerProps([
        {
          id: 'prop_half',
          name: 'Half',
          spaceId: 'space_a',
          waypointId: 'wp_a1',
          tier: 'interactive',
          initialState: {},
          portalState: 'open',
          portalTargetSpaceId: 'space_b',
        },
      ]),
    ).toThrow(/Prop 'prop_half'/);

    expect(() =>
      pair().registerProps([
        {
          id: 'prop_targets_only',
          name: 'Targets',
          spaceId: 'space_a',
          waypointId: 'wp_a1',
          tier: 'interactive',
          initialState: {},
          portalTargetSpaceId: 'space_b',
          portalTargetWaypointId: 'wp_b1',
        },
      ]),
    ).toThrow(/Prop 'prop_targets_only'/);

    const unconnected = new EpochModuleRegistry();
    unconnected.registerSpaces([
      {
        id: 'space_solo',
        name: 'Solo',
        kind: 'indoor_room',
        earshotRadiusMeters: 4,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: [],
        waypoints: [{ id: 'wp_solo', position: [0, 0, 0] }],
      },
      {
        id: 'space_other',
        name: 'Other',
        kind: 'indoor_room',
        earshotRadiusMeters: 4,
        surfaceMaterial: 'wood',
        acousticClass: 'live_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: [],
        waypoints: [{ id: 'wp_other_room', position: [5, 0, 0] }],
      },
    ]);
    expect(() =>
      unconnected.registerProps([
        {
          id: 'prop_unlinked',
          name: 'Unlinked',
          spaceId: 'space_solo',
          waypointId: 'wp_solo',
          tier: 'interactive',
          initialState: {},
          portalState: 'ajar',
          portalTargetSpaceId: 'space_other',
          portalTargetWaypointId: 'wp_other_room',
        },
      ]),
    ).toThrow(/Prop 'prop_unlinked'/);

    expect(() =>
      pair().registerProps([
        {
          id: 'prop_wrong_target',
          name: 'Wrong Target',
          spaceId: 'space_a',
          waypointId: 'wp_a1',
          tier: 'interactive',
          initialState: {},
          portalState: 'open',
          portalTargetSpaceId: 'space_b',
          portalTargetWaypointId: 'wp_a2',
        },
      ]),
    ).toThrow(/Prop 'prop_wrong_target'/);

    expect(() =>
      pair().registerCharacters([
        {
          id: 'char_heavy',
          name: 'Heavy',
          lineageId: 'lineage_heavy',
          tier: 'ambient_crowd',
          startingSpaceId: 'space_a',
          startingWaypointId: 'wp_a1',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          listenerThreshold: 0.2,
          drives: { duty: 0.2 },
          emergencyVice: 'duty',
          inertiaPillars: [],
          separationWeight: 1.5,
        },
      ]),
    ).toThrow(/Character 'char_heavy'/);

    expect(() =>
      pair().registerCharacters([
        {
          id: 'char_negative',
          name: 'Negative',
          lineageId: 'lineage_negative',
          tier: 'ambient_crowd',
          startingSpaceId: 'space_a',
          startingWaypointId: 'wp_a1',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          listenerThreshold: 0.2,
          drives: { duty: 0.2 },
          emergencyVice: 'duty',
          inertiaPillars: [],
          separationWeight: -0.1,
        },
      ]),
    ).toThrow(/Character 'char_negative'/);

    expect(() =>
      pair().registerCharacters([
        {
          id: 'char_nan',
          name: 'Nan',
          lineageId: 'lineage_nan',
          tier: 'ambient_crowd',
          startingSpaceId: 'space_a',
          startingWaypointId: 'wp_a1',
          walkSpeedMetersPerSec: 1.4,
          yawSpeedRadiansPerSec: 6,
          listenerThreshold: 0.2,
          drives: { duty: 0.2 },
          emergencyVice: 'duty',
          inertiaPillars: [],
          separationWeight: Number.NaN,
        },
      ]),
    ).toThrow(/Character 'char_nan'/);
  });
});
