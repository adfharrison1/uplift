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
