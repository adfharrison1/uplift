/**
 * EpochModuleRegistry (`src/domain/registries/EpochModuleRegistry.ts`).
 *
 * Indexes and validates all declarative plug-and-play module blueprints for an Epoch,
 * enforcing global ID uniqueness, spatial/entity cross-reference integrity, and
 * Kahn's algorithm topological sort with cycle detection for `BehaviorModule` dependencies.
 */
import {
  type BehaviorModule,
  BehaviorModuleSchema,
  type ChannelMediumBlueprint,
  ChannelMediumBlueprintSchema,
  type CharacterBlueprint,
  CharacterBlueprintSchema,
  type EmergencyStateBlueprint,
  EmergencyStateBlueprintSchema,
  type EpochModulePackInput,
  type OfficeBlueprint,
  OfficeBlueprintSchema,
  type OrbitalPassBlueprint,
  OrbitalPassBlueprintSchema,
  type PropBlueprint,
  PropBlueprintSchema,
  type QuietClaimBlueprint,
  QuietClaimBlueprintSchema,
  type RivalCivBlueprint,
  RivalCivBlueprintSchema,
  type SpaceNodeBlueprint,
  SpaceNodeBlueprintSchema,
  type TrajectoryThreadBlueprint,
  TrajectoryThreadBlueprintSchema,
  type WaypointBlueprint,
} from './EpochBlueprints.js';

export class EpochModuleRegistry {
  private readonly allIds = new Map<string, string>();
  private readonly spaces = new Map<string, SpaceNodeBlueprint>();
  private readonly waypointsById = new Map<
    string,
    { readonly spaceId: string; readonly waypoint: WaypointBlueprint }
  >();
  private readonly props = new Map<string, PropBlueprint>();
  private readonly characters = new Map<string, CharacterBlueprint>();
  private readonly offices = new Map<string, OfficeBlueprint>();
  private readonly quietClaims = new Map<string, QuietClaimBlueprint>();
  private readonly rivals = new Map<string, RivalCivBlueprint>();
  private readonly threads = new Map<string, TrajectoryThreadBlueprint>();
  private readonly channels = new Map<string, ChannelMediumBlueprint>();
  private readonly emergencies = new Map<string, EmergencyStateBlueprint>();
  private readonly behaviors = new Map<string, BehaviorModule>();
  private orbitalPass: OrbitalPassBlueprint | undefined;

  public registerPack(pack: EpochModulePackInput): void {
    const trimmedEpochId = pack.epochId.trim();
    if (trimmedEpochId.length === 0) {
      throw new Error('EpochModulePackInput.epochId must be a non-empty string');
    }

    this.registerSpaces(pack.spaces);
    if (pack.props !== undefined) {
      this.registerProps(pack.props);
    }
    if (pack.characters !== undefined) {
      this.registerCharacters(pack.characters);
    }
    if (pack.offices !== undefined) {
      this.registerOffices(pack.offices);
    }
    if (pack.quietClaims !== undefined) {
      this.registerQuietClaims(pack.quietClaims);
    }
    if (pack.rivals !== undefined) {
      this.registerRivals(pack.rivals);
    }
    if (pack.threads !== undefined) {
      this.registerThreads(pack.threads);
    }
    if (pack.channels !== undefined) {
      this.registerChannels(pack.channels);
    }
    if (pack.emergencies !== undefined) {
      this.registerEmergencies(pack.emergencies);
    }
    if (pack.orbitalPass !== undefined) {
      this.registerOrbitalPass(pack.orbitalPass);
    }
    if (pack.behaviors !== undefined) {
      this.registerBehaviors(pack.behaviors);
    }
  }

  public registerSpaces(spaceList: ReadonlyArray<SpaceNodeBlueprint>): void {
    for (const rawSpace of spaceList) {
      const space = SpaceNodeBlueprintSchema.parse(rawSpace);
      this.claimGlobalId(space.id, 'space');

      const seenConnected = new Set<string>();
      for (const connId of space.connectedSpaceIds) {
        if (connId === space.id) {
          throw new Error(`Space '${space.id}' cannot reference itself in connectedSpaceIds`);
        }
        if (seenConnected.has(connId)) {
          throw new Error(
            `Space '${space.id}' has duplicate connectedSpaceId reference '${connId}'`,
          );
        }
        seenConnected.add(connId);
      }

      for (const wp of space.waypoints) {
        this.claimGlobalId(wp.id, 'waypoint');
        this.waypointsById.set(wp.id, { spaceId: space.id, waypoint: wp });
      }

      this.spaces.set(space.id, space);
    }

    // Validate all connectedSpaceIds exist after inserting the batch
    for (const space of this.spaces.values()) {
      for (const connId of space.connectedSpaceIds) {
        if (!this.spaces.has(connId)) {
          throw new Error(`Space '${space.id}' references unknown connectedSpaceId '${connId}'`);
        }
      }
    }
  }

  public registerProps(propList: ReadonlyArray<PropBlueprint>): void {
    for (const rawProp of propList) {
      const prop = PropBlueprintSchema.parse(rawProp);
      this.claimGlobalId(prop.id, 'prop');
      this.assertWaypointInSpace('prop', prop.id, prop.spaceId, prop.waypointId);
      this.props.set(prop.id, prop);
    }
  }

  public registerCharacters(characterList: ReadonlyArray<CharacterBlueprint>): void {
    const validatedChars: CharacterBlueprint[] = [];

    for (const rawChar of characterList) {
      const char = CharacterBlueprintSchema.parse(rawChar);
      this.claimGlobalId(char.id, 'character');
      this.assertWaypointInSpace(
        'character',
        char.id,
        char.startingSpaceId,
        char.startingWaypointId,
      );

      if (!(char.emergencyVice in char.drives)) {
        throw new Error(
          `Character '${char.id}' emergencyVice '${char.emergencyVice}' must exist in drives`,
        );
      }

      const seenPillarIds = new Set<string>();
      for (const pillar of char.inertiaPillars) {
        if (seenPillarIds.has(pillar.id)) {
          throw new Error(`Character '${char.id}' has duplicate inertiaPillar id '${pillar.id}'`);
        }
        seenPillarIds.add(pillar.id);
      }

      this.characters.set(char.id, char);
      validatedChars.push(char);
    }

    // Validate holderEntityId references after batch insertion
    for (const char of validatedChars) {
      for (const pillar of char.inertiaPillars) {
        if (pillar.holderEntityId !== undefined && !this.characters.has(pillar.holderEntityId)) {
          throw new Error(
            `Character '${char.id}' pillar '${pillar.id}' references unknown holderEntityId '${pillar.holderEntityId}'`,
          );
        }
      }
    }
  }

  public registerOffices(officeList: ReadonlyArray<OfficeBlueprint>): void {
    for (const rawOffice of officeList) {
      const office = OfficeBlueprintSchema.parse(rawOffice);
      this.claimGlobalId(office.id, 'office');
      if (office.patronEntityId !== undefined && !this.characters.has(office.patronEntityId)) {
        throw new Error(
          `Office '${office.id}' references unknown patronEntityId '${office.patronEntityId}'`,
        );
      }
      this.offices.set(office.id, office);
    }
  }

  public registerQuietClaims(claimList: ReadonlyArray<QuietClaimBlueprint>): void {
    for (const rawClaim of claimList) {
      const claim = QuietClaimBlueprintSchema.parse(rawClaim);
      this.claimGlobalId(claim.id, 'quiet_claim');
      if (!this.characters.has(claim.targetEntityId)) {
        throw new Error(
          `QuietClaim '${claim.id}' references unknown targetEntityId '${claim.targetEntityId}'`,
        );
      }
      this.quietClaims.set(claim.id, claim);
    }
  }

  public registerRivals(rivalList: ReadonlyArray<RivalCivBlueprint>): void {
    for (const rawRival of rivalList) {
      const rival = RivalCivBlueprintSchema.parse(rawRival);
      this.claimGlobalId(rival.id, 'rival');
      if (rival.coverEntityId !== undefined && !this.characters.has(rival.coverEntityId)) {
        throw new Error(
          `Rival '${rival.id}' references unknown coverEntityId '${rival.coverEntityId}'`,
        );
      }
      this.rivals.set(rival.id, rival);
    }
  }

  public registerThreads(threadList: ReadonlyArray<TrajectoryThreadBlueprint>): void {
    const knownLineages = new Set(Array.from(this.characters.values()).map((c) => c.lineageId));

    for (const rawThread of threadList) {
      const thread = TrajectoryThreadBlueprintSchema.parse(rawThread);
      this.claimGlobalId(thread.id, 'thread');
      if (
        thread.primaryCandidateLineageId !== undefined &&
        !knownLineages.has(thread.primaryCandidateLineageId)
      ) {
        throw new Error(
          `TrajectoryThread '${thread.id}' references unknown primaryCandidateLineageId '${thread.primaryCandidateLineageId}'`,
        );
      }
      if (
        thread.substituteCandidateLineageId !== undefined &&
        !knownLineages.has(thread.substituteCandidateLineageId)
      ) {
        throw new Error(
          `TrajectoryThread '${thread.id}' references unknown substituteCandidateLineageId '${thread.substituteCandidateLineageId}'`,
        );
      }
      this.threads.set(thread.id, thread);
    }
  }

  public registerChannels(channelList: ReadonlyArray<ChannelMediumBlueprint>): void {
    for (const rawChannel of channelList) {
      const channel = ChannelMediumBlueprintSchema.parse(rawChannel);
      this.claimGlobalId(channel.id, 'channel');
      this.channels.set(channel.id, channel);
    }
  }

  public registerEmergencies(emergencyList: ReadonlyArray<EmergencyStateBlueprint>): void {
    for (const rawEmergency of emergencyList) {
      const emergency = EmergencyStateBlueprintSchema.parse(rawEmergency);
      this.claimGlobalId(emergency.id, 'emergency');
      this.emergencies.set(emergency.id, emergency);
    }
  }

  public registerOrbitalPass(rawOrbital: OrbitalPassBlueprint): void {
    const orbital = OrbitalPassBlueprintSchema.parse(rawOrbital);
    this.claimGlobalId(orbital.id, 'orbital_pass');
    this.orbitalPass = orbital;
  }

  /**
   * Validates and registers `BehaviorModule` definitions in deterministic topological order
   * using Kahn's algorithm with lexicographical tie-breaking, rejecting self-loops,
   * duplicate dependencies, missing dependencies, and multi-node cycles.
   */
  public registerBehaviors(behaviorList: ReadonlyArray<BehaviorModule>): void {
    const batchById = new Map<string, BehaviorModule>();

    for (const rawBehavior of behaviorList) {
      const behavior = BehaviorModuleSchema.parse(rawBehavior);
      if (batchById.has(behavior.id) || this.behaviors.has(behavior.id)) {
        throw new Error(`Duplicate behavior id '${behavior.id}'`);
      }
      this.claimGlobalId(behavior.id, 'behavior');

      const seenDeps = new Set<string>();
      for (const depId of behavior.dependencyIds) {
        if (depId === behavior.id) {
          throw new Error(`Behavior dependency cycle detected: '${behavior.id}' depends on itself`);
        }
        if (seenDeps.has(depId)) {
          throw new Error(`Behavior '${behavior.id}' declares duplicate dependency '${depId}'`);
        }
        seenDeps.add(depId);
      }

      batchById.set(behavior.id, behavior);
    }

    const allKnownBehaviors = new Map<string, BehaviorModule>([
      ...this.behaviors.entries(),
      ...batchById.entries(),
    ]);

    for (const behavior of allKnownBehaviors.values()) {
      for (const depId of behavior.dependencyIds) {
        if (!allKnownBehaviors.has(depId)) {
          throw new Error(`Behavior '${behavior.id}' depends on unregistered behavior '${depId}'`);
        }
      }
    }

    const sorted = this.topologicalSortBehaviors(Array.from(allKnownBehaviors.values()));
    this.behaviors.clear();
    for (const behavior of sorted) {
      this.behaviors.set(behavior.id, behavior);
    }
  }

  public getSpace(id: string): SpaceNodeBlueprint {
    const space = this.spaces.get(id);
    if (space === undefined) {
      throw new Error(`Unknown space '${id}'`);
    }
    return space;
  }

  public getWaypoint(id: string): {
    readonly spaceId: string;
    readonly waypoint: WaypointBlueprint;
  } {
    const entry = this.waypointsById.get(id);
    if (entry === undefined) {
      throw new Error(`Unknown waypoint '${id}'`);
    }
    return entry;
  }

  public getProp(id: string): PropBlueprint {
    const prop = this.props.get(id);
    if (prop === undefined) {
      throw new Error(`Unknown prop '${id}'`);
    }
    return prop;
  }

  public getCharacter(id: string): CharacterBlueprint {
    const char = this.characters.get(id);
    if (char === undefined) {
      throw new Error(`Unknown character '${id}'`);
    }
    return char;
  }

  public getAllCharacters(): ReadonlyArray<CharacterBlueprint> {
    return Array.from(this.characters.values());
  }

  public getAllProps(): ReadonlyArray<PropBlueprint> {
    return Array.from(this.props.values());
  }

  public getOffice(id: string): OfficeBlueprint {
    const office = this.offices.get(id);
    if (office === undefined) {
      throw new Error(`Unknown office '${id}'`);
    }
    return office;
  }

  public getQuietClaim(id: string): QuietClaimBlueprint {
    const claim = this.quietClaims.get(id);
    if (claim === undefined) {
      throw new Error(`Unknown quietClaim '${id}'`);
    }
    return claim;
  }

  public getRival(id: string): RivalCivBlueprint {
    const rival = this.rivals.get(id);
    if (rival === undefined) {
      throw new Error(`Unknown rival '${id}'`);
    }
    return rival;
  }

  public getThread(id: string): TrajectoryThreadBlueprint {
    const thread = this.threads.get(id);
    if (thread === undefined) {
      throw new Error(`Unknown thread '${id}'`);
    }
    return thread;
  }

  public getChannel(id: string): ChannelMediumBlueprint {
    const channel = this.channels.get(id);
    if (channel === undefined) {
      throw new Error(`Unknown channel '${id}'`);
    }
    return channel;
  }

  public getEmergency(id: string): EmergencyStateBlueprint {
    const emergency = this.emergencies.get(id);
    if (emergency === undefined) {
      throw new Error(`Unknown emergency '${id}'`);
    }
    return emergency;
  }

  public getOrbitalPass(): OrbitalPassBlueprint | undefined {
    return this.orbitalPass;
  }

  public getBehaviorsInTopologicalOrder(): ReadonlyArray<BehaviorModule> {
    return Array.from(this.behaviors.values());
  }

  private claimGlobalId(id: string, kind: string): void {
    const existingKind = this.allIds.get(id);
    if (existingKind !== undefined) {
      throw new Error(
        `Duplicate module id '${id}' (already registered as '${existingKind}', cannot register as '${kind}')`,
      );
    }
    this.allIds.set(id, kind);
  }

  private assertWaypointInSpace(
    ownerKind: string,
    ownerId: string,
    spaceId: string,
    waypointId: string,
  ): void {
    if (!this.spaces.has(spaceId)) {
      throw new Error(`${ownerKind} '${ownerId}' references unknown spaceId '${spaceId}'`);
    }
    const wpEntry = this.waypointsById.get(waypointId);
    if (wpEntry === undefined) {
      throw new Error(`${ownerKind} '${ownerId}' references unknown waypointId '${waypointId}'`);
    }
    if (wpEntry.spaceId !== spaceId) {
      throw new Error(
        `${ownerKind} '${ownerId}' waypoint '${waypointId}' belongs to space '${wpEntry.spaceId}', not '${spaceId}'`,
      );
    }
  }

  private topologicalSortBehaviors(
    behaviors: ReadonlyArray<BehaviorModule>,
  ): ReadonlyArray<BehaviorModule> {
    const byId = new Map<string, BehaviorModule>();
    const inDegree = new Map<string, number>();
    const dependentsOf = new Map<string, string[]>();

    for (const behavior of behaviors) {
      byId.set(behavior.id, behavior);
      inDegree.set(behavior.id, behavior.dependencyIds.length);
      dependentsOf.set(behavior.id, []);
    }

    for (const behavior of behaviors) {
      for (const depId of behavior.dependencyIds) {
        dependentsOf.get(depId)?.push(behavior.id);
      }
    }

    const readyQueue = behaviors
      .filter((b) => (inDegree.get(b.id) ?? 0) === 0)
      .map((b) => b.id)
      .sort((a, b) => a.localeCompare(b));

    const sorted: BehaviorModule[] = [];

    while (readyQueue.length > 0) {
      const currentId = readyQueue.shift();
      if (currentId === undefined) {
        break;
      }
      const currentBehavior = byId.get(currentId);
      if (currentBehavior !== undefined) {
        sorted.push(currentBehavior);
      }

      const dependents = dependentsOf.get(currentId) ?? [];
      for (const dependentId of dependents) {
        const nextDegree = (inDegree.get(dependentId) ?? 1) - 1;
        inDegree.set(dependentId, nextDegree);
        if (nextDegree === 0) {
          readyQueue.push(dependentId);
          readyQueue.sort((a, b) => a.localeCompare(b));
        }
      }
    }

    if (sorted.length !== behaviors.length) {
      const cycleIds = behaviors
        .filter((b) => (inDegree.get(b.id) ?? 0) > 0)
        .map((b) => b.id)
        .sort((a, b) => a.localeCompare(b));
      throw new Error(`Behavior dependency cycle detected involving: ${cycleIds.join(', ')}`);
    }

    return sorted;
  }
}
