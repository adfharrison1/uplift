## Purpose

Define epoch-agnostic plug-and-play module blueprints and the `EpochModuleRegistry` so spaces, props, characters (with Inertia Pillars and emergency vices), contested offices, quiet claims, illicit fund instruments, rival civilizations, trajectory threads (martyrdom/succession and dual-use ceilings), async correspondence channels, emergency states, orbital pass rules, and behaviors can be registered, validated, and swapped independently without modifying engine code.

## ADDED Requirements

### Requirement: Epoch-agnostic module blueprints and cross-reference validation
The domain layer SHALL provide an `EpochModuleRegistry` that registers and validates declarative blueprints for spaces (`indoor_room`, `outdoor_area`, `off_stage_region`), props (`interactive`, `static`), characters (Tiers 1–3 with `lineageId`, `InertiaPillar[]`, and `emergencyVice`), contested offices (`institutionalLineageId` and legal `PretextKind`s), deniable quiet claims (`QuietClaimBlueprint`), rival civilizations (`RivalCivBlueprint`), trajectory threads (`TrajectoryThreadBlueprint` with martyrdom/succession and dual-use ceiling rules), correspondence media (`ChannelMediumBlueprint`), emergency states (`EmergencyStateBlueprint`), orbital pass profiles (`OrbitalPassBlueprint`), and behaviors (`BehaviorModule`).

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
