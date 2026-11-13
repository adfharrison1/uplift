# modular-epoch-registries Specification

## Purpose
Define epoch-agnostic plug-and-play module blueprints and the `EpochModuleRegistry` so spaces, props, characters (with Inertia Pillars and emergency vices), contested offices, quiet claims, illicit fund instruments, rival civilizations, trajectory threads (martyrdom/succession and dual-use ceilings), async correspondence channels, emergency states, orbital pass rules, and behaviors can be registered, validated, and swapped independently without modifying engine code.

## Requirements

### Requirement: Epoch-agnostic module blueprints and cross-reference validation
The domain layer SHALL provide an `EpochModuleRegistry` that registers and validates declarative, epoch-agnostic module blueprints for spatial, character, institutional, historical, communication, emergency, orbital, and behavior content.

#### Scenario: Spatial and character blueprint families
- **WHEN** spatial or character blueprints are registered
- **THEN** The registry SHALL register and validate declarative blueprints for spaces (`indoor_room`, `outdoor_area`, `off_stage_region` with `surfaceMaterial`, `acousticClass`, and `ambientMaskLoudness`), props (`interactive`, `static` with optional `portalState: 'open' | 'ajar' | 'closed' | 'barred'`), characters (Tiers 1–3 with `lineageId`, `InertiaPillar[]`, `emergencyVice`, `listenerThreshold`, and optional `acousticBias`).

#### Scenario: Institutional and historical blueprint families
- **WHEN** institutional or historical blueprints are registered
- **THEN** The registry SHALL register and validate declarative blueprints for contested offices (`institutionalLineageId` and legal `PretextKind`s), deniable quiet claims (`QuietClaimBlueprint`), rival civilizations (`RivalCivBlueprint`), trajectory threads (`TrajectoryThreadBlueprint` with martyrdom/succession and dual-use ceiling rules).

#### Scenario: Communication emergency orbital and behavior families
- **WHEN** communication, emergency, orbital, or behavior blueprints are registered
- **THEN** The registry SHALL register and validate declarative blueprints for correspondence media (`ChannelMediumBlueprint`), emergency states (`EmergencyStateBlueprint`), orbital pass profiles (`OrbitalPassBlueprint`), and behaviors (`BehaviorModule`).

#### Scenario: Valid module pack registration and lookup across all blueprint families
- **WHEN** valid blueprints for spaces, waypoints, props, characters, offices, quiet claims, rivals, trajectory threads, correspondence channels, emergencies, orbital pass rules, and behaviors are registered in `EpochModuleRegistry`
- **THEN** the registry SHALL index each module by ID and expose typed lookup methods without errors

#### Scenario: Rejection of duplicate IDs, dangling spatial/entity references, or self-linked spaces
- **WHEN** a blueprint references an unknown `spaceId`, `waypointId` (or a waypoint not belonging to `startingSpaceId`), `connectedSpaceId` (or self-link), or unknown character/patron entity ID, or two blueprints share a duplicate ID
- **THEN** `EpochModuleRegistry` SHALL throw a descriptive validation error identifying the offending module and invalid reference

### Requirement: Topological sort, cycle detection, and human-paced timing for behavior modules
The `EpochModuleRegistry` SHALL validate human-paced timing metadata on every `BehaviorModule` (`deliberationSeconds`, `dwellSeconds`, `cooldownSeconds`, `requiresExternalTrigger`) and SHALL resolve `BehaviorModule` dependencies in deterministic topological order, rejecting self-loops, cycles, or missing behavior dependencies at load time.

#### Scenario: Behavior dependency self-loop or cycle rejected
- **WHEN** Behavior A declares a dependency on itself (`A -> A`) or a cycle (`A -> B -> A`)
- **THEN** `EpochModuleRegistry.registerBehaviors()` SHALL throw a descriptive dependency-cycle error

#### Scenario: Missing behavior dependency rejected
- **WHEN** Behavior A declares a dependency on an unregistered behavior ID
- **THEN** `EpochModuleRegistry.registerBehaviors()` SHALL throw a descriptive missing-dependency error

### Requirement: Waypoint neighbor lists and portal target validation
`EpochModuleRegistry` SHALL validate optional waypoint neighbors, paired portal targets, and character separation weights, and expose every registered space with its kind and waypoints.

#### Scenario: Optional blueprint fields and space directory
- **WHEN** blueprints are registered or `getAllSpaces()` is called
- **THEN** `EpochModuleRegistry` SHALL accept optional `neighborWaypointIds` on `WaypointBlueprint`, optional `portalTargetSpaceId` plus `portalTargetWaypointId` on `PropBlueprint`, and optional `separationWeight` on `CharacterBlueprint` (`0..1`, default `1`), and SHALL expose `getAllSpaces()` returning every registered space with its `kind` and waypoints.

#### Scenario: Neighbor identity and explicit graph degree
- **WHEN** waypoint neighbors are declared
- **THEN** A neighbor id SHALL refer to a different waypoint in the same space, with no duplicates. In a space that declares any neighbor, every waypoint SHALL have undirected degree at least 1.

#### Scenario: Portal target pairing and state-only props
- **WHEN** portal fields are validated
- **THEN** The two portal target fields SHALL both be present or both absent. Either target SHALL require `portalState`. `portalState` with neither target SHALL remain valid and SHALL NOT create a navigation edge.

#### Scenario: Portal destination membership
- **WHEN** both portal target fields are present
- **THEN** When both targets are present, the portal target space SHALL be listed in the source space's `connectedSpaceIds`, and the target waypoint SHALL belong to that target space.

#### Scenario: Valid neighbor list and portal target register
- **WHEN** a space lists two waypoints and the first names the second as a neighbor, and a prop on the first waypoint has `portalState: 'open'` targeting a waypoint in a connected space
- **THEN** `registerSpaces` and `registerProps` SHALL succeed and the stored blueprints SHALL retain the neighbor id and both portal target ids

#### Scenario: Omitted separation weight defaults to personal space
- **WHEN** a character blueprint omits `separationWeight`, or sets it to `0` or `1`
- **THEN** registration SHALL succeed and the stored weight SHALL be `1` when omitted, otherwise the given value

#### Scenario: Separation weight outside the unit interval is rejected
- **WHEN** a character blueprint sets `separationWeight` below `0` or above `1`
- **THEN** registration SHALL throw and name that character id

#### Scenario: Portal state without targets still registers
- **WHEN** a prop sets `portalState` and sets neither target id
- **THEN** registration SHALL succeed and that prop SHALL NOT be treated as a navigation edge

#### Scenario: Rejection of cross-space neighbors, dangling portal targets, mismatched portal fields, and orphan waypoints
- **WHEN** a waypoint names an unknown neighbor, a duplicate neighbor, or its own id, or names a neighbor in another space, or a space's explicit neighbor graph leaves a waypoint at undirected degree 0, or a portal sets only one target id, or sets both target ids without `portalState`, or the target waypoint does not exist in the target space, or the target space is not in `connectedSpaceIds`
- **THEN** registration SHALL throw a descriptive error naming the waypoint or prop id

### Requirement: One epoch registry has an explicit versioned primary pack
An `EpochModuleRegistry` used by a session SHALL bind to exactly one epoch and a primary pack with a nonempty `packId` and positive integer `packVersion`. Additional pack registration SHALL be allowed only when the primary pack explicitly lists that imported pack ID and version for the same target epoch. Imports SHALL NOT replace the primary save identity.

#### Scenario: Primary pack and declared cameo register
- **WHEN** a primary pack with a valid ID, version and epoch declares an imported cameo pack ID and version, and that declared pack registers for the same target epoch
- **THEN** the registry SHALL expose the primary identity for save creation and retain both packs' validated blueprints without changing the primary identity

#### Scenario: Undeclared, duplicate and cross-epoch composition reject
- **WHEN** registration supplies a second pack absent from the primary import list, a duplicate primary or import identity, a mismatched import version, or an imported pack for another target epoch
- **THEN** registration SHALL fail with the offending identity or epoch named, preserve all previously registered blueprints and the primary identity, and allow a corrected retry

#### Scenario: Missing or malformed primary identity rejects
- **WHEN** a primary pack omits its pack ID or version, uses an empty ID or a nonpositive or noninteger version
- **THEN** the registry SHALL reject it before publishing any of its blueprints

### Requirement: Bound registry mutation uses pack registration
Once bound, direct public registration methods SHALL reject mutation outside an authorized `registerPack` transaction. A registry populated through direct registration before binding SHALL NOT later acquire a primary pack identity. Unbound direct registration SHALL remain available for focused registry use.

#### Scenario: Direct registration cannot bypass bound pack imports
- **WHEN** a registry has bound a primary pack and a caller invokes any public direct blueprint registration method outside `registerPack`, or tries to bind a pack after directly populating an unbound registry
- **THEN** registration SHALL reject without changing any blueprint or the primary identity, and a corrected pack registration SHALL remain possible

### Requirement: Materialized entity IDs are compatible with render semantic IDs
Every entity ID entering a live world through registered character materialization or snapshot load SHALL match the renderer-compatible lowercase alphanumeric, underscore and hyphen token pattern, with a lowercase alphanumeric first character and a maximum length of 64. The live world SHALL never publish an entity ID that causes character semantic-ID formatting to throw during a frame.

#### Scenario: Valid registered entity reaches a render frame
- **WHEN** a character with a valid entity ID is registered and materialized into the initial world
- **THEN** the render-frame consumer SHALL format and expose its character semantic ID without an exception

#### Scenario: Invalid authored entity rejects before materialization and frame
- **WHEN** a character blueprint uses whitespace, uppercase, a dot, an unsafe first character or more than 64 characters in its ID
- **THEN** registration SHALL reject the ID before initial materialization or any render frame, preserve the previous registry and world, and name the invalid ID

#### Scenario: Invalid loaded entity rejects before publication
- **WHEN** a structurally valid save snapshot contains an invalid entity map key, an invalid entity's own ID, or a mismatch between the two
- **THEN** coordinator load SHALL fail before publishing the world or RNG, and a later render frame SHALL continue to use the prior valid world
