/**
 * EpochModuleRegistry (`src/domain/registries/EpochModuleRegistry.ts`).
 *
 * Indexes and validates all declarative plug-and-play module blueprints for an Epoch,
 * enforcing global ID uniqueness, spatial/entity cross-reference integrity, atomic batch
 * registration, and Kahn's algorithm topological sort with cycle detection for `BehaviorModule` dependencies.
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

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const PACK_REGISTRATION_TOKEN = Symbol('pack-registration');

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
  private primaryPackIdentity:
    Pick<EpochModulePackInput, 'epochId' | 'packId' | 'packVersion'> | undefined;
  private readonly permittedImports = new Map<string, number>();
  private readonly registeredPackIds = new Set<string>();
  private inPackTransaction = false;

  public getPrimaryPackIdentity():
    Pick<EpochModulePackInput, 'epochId' | 'packId' | 'packVersion'> | undefined {
    return this.primaryPackIdentity === undefined ? undefined : { ...this.primaryPackIdentity };
  }

  public registerPack(pack: EpochModulePackInput): void {
    if (this.inPackTransaction) {
      throw new Error('Nested pack registration is not allowed');
    }
    this.inPackTransaction = true;
    try {
      this.registerPackInTransaction(pack);
    } finally {
      this.inPackTransaction = false;
    }
  }

  private registerPackInTransaction(pack: EpochModulePackInput): void {
    const epochId = pack.epochId;
    const packId = pack.packId;
    const packVersion = pack.packVersion;
    const imports = pack.imports;
    if (typeof epochId !== 'string' || epochId.trim().length === 0 || epochId !== epochId.trim()) {
      throw new Error('EpochModulePackInput.epochId must be a non-empty unpadded string');
    }
    this.assertPackIdentity(packId, packVersion);
    if (!Array.isArray(imports)) {
      throw new Error('EpochModulePackInput.imports must be an explicit list');
    }
    const stagedImports = new Map<string, number>();
    for (const imported of imports) {
      const importedId = imported.packId;
      const importedVersion = imported.packVersion;
      this.assertPackIdentity(importedId, importedVersion);
      if (importedId === packId || stagedImports.has(importedId)) {
        throw new Error(`Pack '${packId}' has a duplicate import '${importedId}'`);
      }
      stagedImports.set(importedId, importedVersion);
    }
    if (this.primaryPackIdentity === undefined) {
      if (this.allIds.size > 0) {
        throw new Error('Cannot bind a directly populated registry to a primary pack');
      }
    } else {
      if (epochId !== this.primaryPackIdentity.epochId) {
        throw new Error(`Pack '${packId}' epochId differs from the primary pack epoch`);
      }
      if (this.registeredPackIds.has(packId)) {
        throw new Error(`Pack '${packId}' is already registered`);
      }
      if (this.permittedImports.get(packId) !== packVersion) {
        throw new Error(`Pack '${packId}' version ${String(packVersion)} is not a declared import`);
      }
    }

    const snapshotAllIds = new Map(this.allIds);
    const snapshotSpaces = new Map(this.spaces);
    const snapshotWaypoints = new Map(this.waypointsById);
    const snapshotProps = new Map(this.props);
    const snapshotCharacters = new Map(this.characters);
    const snapshotOffices = new Map(this.offices);
    const snapshotQuietClaims = new Map(this.quietClaims);
    const snapshotRivals = new Map(this.rivals);
    const snapshotThreads = new Map(this.threads);
    const snapshotChannels = new Map(this.channels);
    const snapshotEmergencies = new Map(this.emergencies);
    const snapshotBehaviors = new Map(this.behaviors);
    const snapshotOrbitalPass = this.orbitalPass;

    try {
      this.registerSpaces(pack.spaces, PACK_REGISTRATION_TOKEN);
      if (pack.props !== undefined) {
        this.registerProps(pack.props, PACK_REGISTRATION_TOKEN);
      }
      if (pack.characters !== undefined) {
        this.registerCharacters(pack.characters, PACK_REGISTRATION_TOKEN);
      }
      if (pack.offices !== undefined) {
        this.registerOffices(pack.offices, PACK_REGISTRATION_TOKEN);
      }
      if (pack.quietClaims !== undefined) {
        this.registerQuietClaims(pack.quietClaims, PACK_REGISTRATION_TOKEN);
      }
      if (pack.rivals !== undefined) {
        this.registerRivals(pack.rivals, PACK_REGISTRATION_TOKEN);
      }
      if (pack.threads !== undefined) {
        this.registerThreads(pack.threads, PACK_REGISTRATION_TOKEN);
      }
      if (pack.channels !== undefined) {
        this.registerChannels(pack.channels, PACK_REGISTRATION_TOKEN);
      }
      if (pack.emergencies !== undefined) {
        this.registerEmergencies(pack.emergencies, PACK_REGISTRATION_TOKEN);
      }
      if (pack.orbitalPass !== undefined) {
        this.registerOrbitalPass(pack.orbitalPass, PACK_REGISTRATION_TOKEN);
      }
      if (pack.behaviors !== undefined) {
        this.registerBehaviors(pack.behaviors, PACK_REGISTRATION_TOKEN);
      }
      if (this.primaryPackIdentity === undefined) {
        this.primaryPackIdentity = {
          epochId,
          packId,
          packVersion,
        };
        for (const [id, version] of stagedImports) {
          this.permittedImports.set(id, version);
        }
      }
      this.registeredPackIds.add(packId);
    } catch (err) {
      this.restoreMap(this.allIds, snapshotAllIds);
      this.restoreMap(this.spaces, snapshotSpaces);
      this.restoreMap(this.waypointsById, snapshotWaypoints);
      this.restoreMap(this.props, snapshotProps);
      this.restoreMap(this.characters, snapshotCharacters);
      this.restoreMap(this.offices, snapshotOffices);
      this.restoreMap(this.quietClaims, snapshotQuietClaims);
      this.restoreMap(this.rivals, snapshotRivals);
      this.restoreMap(this.threads, snapshotThreads);
      this.restoreMap(this.channels, snapshotChannels);
      this.restoreMap(this.emergencies, snapshotEmergencies);
      this.restoreMap(this.behaviors, snapshotBehaviors);
      this.orbitalPass = snapshotOrbitalPass;
      throw err;
    }
  }

  private assertPackIdentity(packId: string, packVersion: number): void {
    if (typeof packId !== 'string' || packId.length === 0 || packId !== packId.trim()) {
      throw new Error('EpochModulePackInput.packId must be a non-empty unpadded string');
    }
    if (!Number.isSafeInteger(packVersion) || packVersion <= 0) {
      throw new Error('EpochModulePackInput.packVersion must be a positive integer');
    }
  }

  private assertDirectRegistrationAllowed(token?: symbol): void {
    if (token === PACK_REGISTRATION_TOKEN && this.inPackTransaction) {
      return;
    }
    if (this.primaryPackIdentity !== undefined || this.inPackTransaction) {
      throw new Error('Direct registration cannot mutate a bound registry');
    }
  }

  public registerSpaces(spaceList: ReadonlyArray<SpaceNodeBlueprint>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedSpaces = new Map<string, SpaceNodeBlueprint>();
    const stagedWaypoints = new Map<
      string,
      { readonly spaceId: string; readonly waypoint: WaypointBlueprint }
    >();

    for (const rawSpace of spaceList) {
      const space = SpaceNodeBlueprintSchema.parse(rawSpace);
      this.stageGlobalId(stagedIds, space.id, 'space');

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
        this.stageGlobalId(stagedIds, wp.id, 'waypoint');
        stagedWaypoints.set(wp.id, { spaceId: space.id, waypoint: wp });
      }

      stagedSpaces.set(space.id, space);
    }

    for (const space of stagedSpaces.values()) {
      for (const connId of space.connectedSpaceIds) {
        if (!this.spaces.has(connId) && !stagedSpaces.has(connId)) {
          throw new Error(`Space '${space.id}' references unknown connectedSpaceId '${connId}'`);
        }
      }
    }

    this.assertWaypointNeighbors(stagedWaypoints);

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, space] of stagedSpaces) {
      this.spaces.set(id, space);
    }
    for (const [id, wpEntry] of stagedWaypoints) {
      this.waypointsById.set(id, wpEntry);
    }
  }

  public registerProps(propList: ReadonlyArray<PropBlueprint>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedProps = new Map<string, PropBlueprint>();

    for (const rawProp of propList) {
      const prop = PropBlueprintSchema.parse(rawProp);
      this.stageGlobalId(stagedIds, prop.id, 'prop');
      this.assertWaypointInSpace('prop', prop.id, prop.spaceId, prop.waypointId);
      this.assertPortalTargets(prop);
      stagedProps.set(prop.id, prop);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, prop] of stagedProps) {
      this.props.set(id, prop);
    }
  }

  public registerCharacters(
    characterList: ReadonlyArray<CharacterBlueprint>,
    token?: symbol,
  ): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedCharacters = new Map<string, CharacterBlueprint>();

    for (const rawChar of characterList) {
      this.assertSeparationWeight(rawChar);
      const parsed = CharacterBlueprintSchema.parse(rawChar);
      const char: CharacterBlueprint = {
        ...parsed,
        separationWeight: parsed.separationWeight ?? 1,
      };
      this.stageGlobalId(stagedIds, char.id, 'character');
      this.assertWaypointInSpace(
        'character',
        char.id,
        char.startingSpaceId,
        char.startingWaypointId,
      );

      if (!Object.hasOwn(char.drives, char.emergencyVice)) {
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

      stagedCharacters.set(char.id, char);
    }

    for (const char of stagedCharacters.values()) {
      for (const pillar of char.inertiaPillars) {
        if (
          pillar.holderEntityId !== undefined &&
          !this.characters.has(pillar.holderEntityId) &&
          !stagedCharacters.has(pillar.holderEntityId)
        ) {
          throw new Error(
            `Character '${char.id}' pillar '${pillar.id}' references unknown holderEntityId '${pillar.holderEntityId}'`,
          );
        }
      }
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, char] of stagedCharacters) {
      this.characters.set(id, char);
    }
  }

  public registerOffices(officeList: ReadonlyArray<OfficeBlueprint>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedOffices = new Map<string, OfficeBlueprint>();

    for (const rawOffice of officeList) {
      const office = OfficeBlueprintSchema.parse(rawOffice);
      this.stageGlobalId(stagedIds, office.id, 'office');
      if (office.patronEntityId !== undefined && !this.characters.has(office.patronEntityId)) {
        throw new Error(
          `Office '${office.id}' references unknown patronEntityId '${office.patronEntityId}'`,
        );
      }
      stagedOffices.set(office.id, office);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, office] of stagedOffices) {
      this.offices.set(id, office);
    }
  }

  public registerQuietClaims(claimList: ReadonlyArray<QuietClaimBlueprint>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedClaims = new Map<string, QuietClaimBlueprint>();

    for (const rawClaim of claimList) {
      const claim = QuietClaimBlueprintSchema.parse(rawClaim);
      this.stageGlobalId(stagedIds, claim.id, 'quiet_claim');
      if (!this.characters.has(claim.targetEntityId)) {
        throw new Error(
          `QuietClaim '${claim.id}' references unknown targetEntityId '${claim.targetEntityId}'`,
        );
      }
      stagedClaims.set(claim.id, claim);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, claim] of stagedClaims) {
      this.quietClaims.set(id, claim);
    }
  }

  public registerRivals(rivalList: ReadonlyArray<RivalCivBlueprint>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedRivals = new Map<string, RivalCivBlueprint>();

    for (const rawRival of rivalList) {
      const rival = RivalCivBlueprintSchema.parse(rawRival);
      this.stageGlobalId(stagedIds, rival.id, 'rival');
      if (rival.coverEntityId !== undefined && !this.characters.has(rival.coverEntityId)) {
        throw new Error(
          `Rival '${rival.id}' references unknown coverEntityId '${rival.coverEntityId}'`,
        );
      }
      stagedRivals.set(rival.id, rival);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, rival] of stagedRivals) {
      this.rivals.set(id, rival);
    }
  }

  public registerThreads(
    threadList: ReadonlyArray<TrajectoryThreadBlueprint>,
    token?: symbol,
  ): void {
    this.assertDirectRegistrationAllowed(token);
    const knownLineages = new Set(Array.from(this.characters.values()).map((c) => c.lineageId));
    const stagedIds = new Map<string, string>();
    const stagedThreads = new Map<string, TrajectoryThreadBlueprint>();

    for (const rawThread of threadList) {
      const thread = TrajectoryThreadBlueprintSchema.parse(rawThread);
      this.stageGlobalId(stagedIds, thread.id, 'thread');
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
      stagedThreads.set(thread.id, thread);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, thread] of stagedThreads) {
      this.threads.set(id, thread);
    }
  }

  public registerChannels(
    channelList: ReadonlyArray<ChannelMediumBlueprint>,
    token?: symbol,
  ): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedChannels = new Map<string, ChannelMediumBlueprint>();

    for (const rawChannel of channelList) {
      const channel = ChannelMediumBlueprintSchema.parse(rawChannel);
      this.stageGlobalId(stagedIds, channel.id, 'channel');
      stagedChannels.set(channel.id, channel);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, channel] of stagedChannels) {
      this.channels.set(id, channel);
    }
  }

  public registerEmergencies(
    emergencyList: ReadonlyArray<EmergencyStateBlueprint>,
    token?: symbol,
  ): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const stagedEmergencies = new Map<string, EmergencyStateBlueprint>();

    for (const rawEmergency of emergencyList) {
      const emergency = EmergencyStateBlueprintSchema.parse(rawEmergency);
      this.stageGlobalId(stagedIds, emergency.id, 'emergency');
      stagedEmergencies.set(emergency.id, emergency);
    }

    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    for (const [id, emergency] of stagedEmergencies) {
      this.emergencies.set(id, emergency);
    }
  }

  public registerOrbitalPass(rawOrbital: OrbitalPassBlueprint, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    if (this.orbitalPass !== undefined) {
      throw new Error(
        `OrbitalPass '${this.orbitalPass.id}' is already registered in this EpochModuleRegistry`,
      );
    }
    const orbital = OrbitalPassBlueprintSchema.parse(rawOrbital);
    const stagedIds = new Map<string, string>();
    this.stageGlobalId(stagedIds, orbital.id, 'orbital_pass');
    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
    this.orbitalPass = orbital;
  }

  /**
   * Validates and registers `BehaviorModule` definitions in deterministic topological order
   * using Kahn's algorithm with code-unit lexicographical tie-breaking, rejecting self-loops,
   * duplicate dependencies, missing dependencies, and multi-node cycles.
   */
  public registerBehaviors(behaviorList: ReadonlyArray<BehaviorModule>, token?: symbol): void {
    this.assertDirectRegistrationAllowed(token);
    const stagedIds = new Map<string, string>();
    const batchById = new Map<string, BehaviorModule>();

    for (const rawBehavior of behaviorList) {
      const behavior = BehaviorModuleSchema.parse(rawBehavior);
      if (batchById.has(behavior.id) || this.behaviors.has(behavior.id)) {
        throw new Error(`Duplicate behavior id '${behavior.id}'`);
      }
      this.stageGlobalId(stagedIds, behavior.id, 'behavior');

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
    for (const [id, kind] of stagedIds) {
      this.allIds.set(id, kind);
    }
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

  public getAllSpaces(): ReadonlyArray<SpaceNodeBlueprint> {
    return Array.from(this.spaces.values());
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

  private stageGlobalId(stagedIds: Map<string, string>, id: string, kind: string): void {
    const existingKind = this.allIds.get(id) ?? stagedIds.get(id);
    if (existingKind !== undefined) {
      throw new Error(
        `Duplicate module id '${id}' (already registered as '${existingKind}', cannot register as '${kind}')`,
      );
    }
    stagedIds.set(id, kind);
  }

  private restoreMap<K, V>(target: Map<K, V>, snapshot: ReadonlyMap<K, V>): void {
    target.clear();
    for (const [k, v] of snapshot) {
      target.set(k, v);
    }
  }

  private assertWaypointNeighbors(
    stagedWaypoints: ReadonlyMap<
      string,
      { readonly spaceId: string; readonly waypoint: WaypointBlueprint }
    >,
  ): void {
    const lookup = (waypointId: string) =>
      stagedWaypoints.get(waypointId) ?? this.waypointsById.get(waypointId);

    for (const [waypointId, entry] of stagedWaypoints) {
      const seenNeighbors = new Set<string>();
      for (const neighborId of entry.waypoint.neighborWaypointIds ?? []) {
        if (neighborId === waypointId) {
          throw new Error(`Waypoint '${waypointId}' cannot list itself as a neighbor`);
        }
        if (seenNeighbors.has(neighborId)) {
          throw new Error(
            `Waypoint '${waypointId}' has duplicate neighborWaypointId '${neighborId}'`,
          );
        }
        seenNeighbors.add(neighborId);
        const neighbor = lookup(neighborId);
        if (neighbor === undefined) {
          throw new Error(
            `Waypoint '${waypointId}' references unknown neighborWaypointId '${neighborId}'`,
          );
        }
        if (neighbor.spaceId !== entry.spaceId) {
          throw new Error(
            `Waypoint '${waypointId}' neighbor '${neighborId}' belongs to space '${neighbor.spaceId}', not '${entry.spaceId}'`,
          );
        }
      }
    }

    const spaceIds = new Set<string>();
    for (const entry of stagedWaypoints.values()) {
      spaceIds.add(entry.spaceId);
    }

    for (const spaceId of spaceIds) {
      const waypointsInSpace: Array<{ readonly id: string; readonly waypoint: WaypointBlueprint }> =
        [];
      for (const [id, entry] of this.waypointsById) {
        if (entry.spaceId === spaceId && !stagedWaypoints.has(id)) {
          waypointsInSpace.push({ id, waypoint: entry.waypoint });
        }
      }
      for (const [id, entry] of stagedWaypoints) {
        if (entry.spaceId === spaceId) {
          waypointsInSpace.push({ id, waypoint: entry.waypoint });
        }
      }

      const usesExplicitNeighbors = waypointsInSpace.some(
        (entry) => (entry.waypoint.neighborWaypointIds?.length ?? 0) > 0,
      );
      if (!usesExplicitNeighbors) {
        continue;
      }

      const degree = new Map<string, number>();
      for (const entry of waypointsInSpace) {
        degree.set(entry.id, 0);
      }
      for (const entry of waypointsInSpace) {
        for (const neighborId of entry.waypoint.neighborWaypointIds ?? []) {
          if (!degree.has(neighborId)) {
            continue;
          }
          degree.set(entry.id, (degree.get(entry.id) ?? 0) + 1);
          degree.set(neighborId, (degree.get(neighborId) ?? 0) + 1);
        }
      }
      for (const [id, neighborCount] of degree) {
        if (neighborCount === 0) {
          throw new Error(
            `Waypoint '${id}' has no neighbor in the explicit neighbor graph for space '${spaceId}'`,
          );
        }
      }
    }
  }

  private assertPortalTargets(prop: PropBlueprint): void {
    const hasTargetSpace = prop.portalTargetSpaceId !== undefined;
    const hasTargetWaypoint = prop.portalTargetWaypointId !== undefined;
    if (hasTargetSpace !== hasTargetWaypoint) {
      throw new Error(
        `Prop '${prop.id}' must set both portalTargetSpaceId and portalTargetWaypointId`,
      );
    }
    if ((hasTargetSpace || hasTargetWaypoint) && prop.portalState === undefined) {
      throw new Error(`Prop '${prop.id}' portal targets require portalState`);
    }
    if (!hasTargetSpace || !hasTargetWaypoint || prop.portalState === undefined) {
      return;
    }
    const targetSpaceId = prop.portalTargetSpaceId;
    const targetWaypointId = prop.portalTargetWaypointId;
    if (targetSpaceId === undefined || targetWaypointId === undefined) {
      return;
    }
    const sourceSpace = this.spaces.get(prop.spaceId);
    if (sourceSpace === undefined || !sourceSpace.connectedSpaceIds.includes(targetSpaceId)) {
      throw new Error(
        `Prop '${prop.id}' portal target space '${targetSpaceId}' is not connected to '${prop.spaceId}'`,
      );
    }
    const targetWaypoint = this.waypointsById.get(targetWaypointId);
    if (targetWaypoint === undefined || targetWaypoint.spaceId !== targetSpaceId) {
      throw new Error(
        `Prop '${prop.id}' portal target waypoint '${targetWaypointId}' does not belong to space '${targetSpaceId}'`,
      );
    }
  }

  private assertSeparationWeight(raw: unknown): void {
    if (typeof raw !== 'object' || raw === null || !('separationWeight' in raw)) {
      return;
    }
    const record = raw as { readonly id?: unknown; readonly separationWeight?: unknown };
    if (record.separationWeight === undefined) {
      return;
    }
    const characterId = typeof record.id === 'string' ? record.id : 'unknown';
    const weight = record.separationWeight;
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 1) {
      throw new Error(`Character '${characterId}' separationWeight must be between 0 and 1`);
    }
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
      .sort(compareCodeUnits);

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
          readyQueue.sort(compareCodeUnits);
        }
      }
    }

    if (sorted.length !== behaviors.length) {
      const cycleIds = behaviors
        .filter((b) => (inDegree.get(b.id) ?? 0) > 0)
        .map((b) => b.id)
        .sort(compareCodeUnits);
      throw new Error(`Behavior dependency cycle detected involving: ${cycleIds.join(', ')}`);
    }

    return sorted;
  }
}
