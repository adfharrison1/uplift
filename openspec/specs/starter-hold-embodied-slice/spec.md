# starter-hold-embodied-slice Specification

## Purpose
Provide a two-space embodied proving slice for Epoch 1, authored only in content, that the headless coordinator can walk through an open door and refuse when the door is barred.

## Requirements

### Requirement: Starter yard and chambers pack
`src/content/worlds/starterHoldPack.ts` SHALL export an `EpochModulePackInput` containing the starter yard, chambers, connecting portal, and exactly two embodied characters, without leaking content ids into domain or application.

#### Scenario: Starter pack topology and occupants
- **WHEN** the starter pack is exported
- **THEN** `src/content/worlds/starterHoldPack.ts` SHALL export an `EpochModulePackInput` with an `outdoor_area` yard, an `indoor_room` chambers, `connectedSpaceIds` linking them, yard waypoints that form a walkable chain or explicit neighbor graph, one portal prop whose initial `portalState` is `open` and whose target waypoint is inside the chambers, and exactly two embodied characters (one yard routine, one player operative).

#### Scenario: Starter scope and engine independence
- **WHEN** the pack and engine source are defined
- **THEN** The pack SHALL contain no offices, rivals, or threads. Domain and application source SHALL NOT reference these Highglass ids.

#### Scenario: Pack registers through EpochModuleRegistry
- **WHEN** `registerPack` is called with the starter hold pack
- **THEN** both spaces, the portal prop, and both characters SHALL be retrievable by id and the portal target waypoint SHALL belong to the chambers space

### Requirement: Matching stage blueprints and headless door crossing
`src/content/scene/starterHoldStages.ts` SHALL export matching starter-space stage blueprints, and headless tests SHALL verify open-door crossing, return-path planning, and barred-door rejection.

#### Scenario: Matching stage and portal visual
- **WHEN** starter stage blueprints are exported
- **THEN** `src/content/scene/starterHoldStages.ts` SHALL export one `StageSceneBlueprint` per starter space, each `spaceId` matching the pack, and the door prop SHALL be `isPortal: true` so the existing portal hinge yaw applies.

#### Scenario: Headless passable door crossing
- **WHEN** the headless test exercises open-door travel
- **THEN** A headless test SHALL register the pack on `SimulationCoordinator`, call `requestWaypointMove` from the yard through the open door, step frames, and observe the traveler's `spaceId` become the chambers. Planning from the chambers threshold back to the yard SHALL also return a path while the door stays passable.

#### Scenario: Headless barred door rejection
- **WHEN** the headless test exercises barred-door travel
- **THEN** The barred case SHALL call `requestSetPortalState(propId, 'barred')` and then `requestWaypointMove`, which SHALL return `blocked` with the traveler still in the yard.

#### Scenario: Open door crossing in a headless coordinator
- **WHEN** the starter portal is `open` and the yard character is requested to move to the chambers threshold across unpaused frames at `FAST_EVAL_PACING_CONFIG` or with a sufficient `dtSeconds`
- **THEN** the character's `spaceId` SHALL become the chambers space id and a waypoint arrival SHALL have been recorded for the chambers threshold

#### Scenario: Barred door refuses the move
- **WHEN** the test calls `requestSetPortalState` with `barred` and then `requestWaypointMove` toward the chambers threshold
- **THEN** the move result SHALL be `blocked` and the character's `spaceId` SHALL remain the yard

#### Scenario: Return path across the same open door
- **WHEN** the traveler has arrived in the chambers and the portal is still `open`
- **THEN** `planWaypointPath` from the chambers threshold back to the yard threshold SHALL return a path
