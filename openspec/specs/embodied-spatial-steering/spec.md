# embodied-spatial-steering Specification

## Purpose
Keep embodied moving entities from occupying the same ground point, using a deterministic 2D spatial hash, while exact waypoint arrival and off-stage exclusion stay intact.

## Requirements

### Requirement: 2D spatial hash excludes off-stage entities
`SpatialHashGrid` SHALL partition embodied entity positions on the XZ plane into `2` meter cells. `stepKinematics(state, dtSeconds, spaceKinds?)` SHALL accept an optional space-kind directory and SHALL rebuild the grid once per call from input positions of entities whose space kind is not `off_stage_region`. When `spaceKinds` is omitted, every entity SHALL be treated as embodied. A radius query of `0.75` meters SHALL read the 3×3 cells around the point and SHALL return matching entity ids in ascending id order. Entities in an `off_stage_region` SHALL still advance any assigned waypoint path and SHALL NOT be inserted into the grid. `SimulationCoordinator.stepFrame` SHALL pass a directory built from `EpochModuleRegistry.getAllSpaces()`.

#### Scenario: Off-stage entity is absent from proximity results
- **WHEN** one entity stands in an `indoor_room` and another stands in an `off_stage_region` within `0.75` meters on XZ
- **THEN** a query at the indoor entity SHALL NOT include the off-stage entity id, and the off-stage entity SHALL have advanced along its assigned path

### Requirement: Same-space separation preserves exact waypoint snaps
While `stepKinematics` advances entities in `cognitivePhase === 'moving'`, it SHALL apply an XZ separation offset against other embodied entities in the same `spaceId` whose start-of-step XZ distance is within `0.75` meters. Offsets SHALL be computed from positions at the start of the step and then applied. Displacement length SHALL be at most `separationWeight * min(0.15 * dtSeconds, 0.25 * xzDistanceRemainingToCurrentTarget)` meters, where `separationWeight` is the mover's own weight in `0..1` and an omitted weight SHALL mean `1`. Neighbors SHALL count as bodies to avoid at any weight. A mover whose weight is `0` SHALL take no separation displacement. The offset SHALL NOT increase XZ distance to the current target. It SHALL be applied only on the partial-move branch, so a position already written as the target coordinate SHALL stay exact. Y SHALL be unchanged. When XZ distance remaining is `<= 0.05` meters, separation SHALL be zero and the entity SHALL snap to that target's exact coordinates, emitting the existing `WaypointArrivalEvent`. Entities in different `spaceId`s SHALL NOT separate. Idle entities SHALL NOT separate from each other. Two identical calls with the same input state SHALL produce the same positions. A single moving entity SHALL follow the same positions as path integration without neighbors. Pause, zero `dtSeconds`, and negative or non-finite `dtSeconds` SHALL keep the existing freeze and `RangeError` behavior. This displacement SHALL NOT read `reduceMotionAndFlashing` and SHALL NOT add camera motion.

#### Scenario: Two walkers in one room separate without swapping order dependence
- **WHEN** two `moving` entities with `separationWeight` `1` (or omitted) in the same `indoor_room` start `0.4` meters apart on XZ and `stepKinematics` runs one `1/60` second frame
- **THEN** their XZ distance SHALL increase, both Y coordinates SHALL be unchanged, XZ distance from each entity to its current target SHALL NOT increase, and a second run from the same input SHALL match both positions exactly

#### Scenario: A packed pair keeps its spacing
- **WHEN** two `moving` entities with `separationWeight` `0` in the same space start `0.4` meters apart on XZ and `stepKinematics` runs one frame
- **THEN** neither entity SHALL be displaced by separation

#### Scenario: A miller slides around a packed body
- **WHEN** a `moving` entity with `separationWeight` `1` starts `0.4` meters from a `moving` entity with `separationWeight` `0`
- **THEN** the weight `0` entity SHALL NOT be displaced by separation, and the weight `1` entity's XZ distance to its current target SHALL NOT increase

#### Scenario: An idle body on the destination does not stall arrival
- **WHEN** one embodied entity stands idle on a waypoint and a second entity `2` meters away walks toward it at `1.4` m/s with repeated `dtSeconds` of `1/60`
- **THEN** the walker SHALL emit a `WaypointArrivalEvent` for that waypoint

#### Scenario: Different spaces do not separate
- **WHEN** two `moving` entities in different `spaceId`s start within `0.75` meters on XZ
- **THEN** neither position SHALL change because of separation

#### Scenario: Arrival snap ignores separation inside the snap radius
- **WHEN** a moving entity is within `0.05` meters of its current target and another embodied entity overlaps it
- **THEN** the arriving entity's position SHALL equal the target coordinates exactly and a `WaypointArrivalEvent` SHALL be emitted for that waypoint

#### Scenario: Lone walker matches unseparated integration
- **WHEN** one embodied entity walks a two-waypoint path with no other embodied entity in range
- **THEN** each stepped position SHALL match path integration at that entity's `walkSpeedMetersPerSec` with no lateral offset

### Requirement: Separation weight is authored, spawned, and settable
`CharacterBlueprint.separationWeight` SHALL be optional, in `0..1`, and SHALL default to `1`. Spawn SHALL copy that value onto `EntitySimulationState.separationWeight`. The `set_separation_weight` effect SHALL replace the entity's weight with a schema-valid `0..1` value. A weight outside `0..1` SHALL fail schema validation. An unknown `entityId` SHALL throw and SHALL NOT modify any other entity. An entity that omits the field SHALL behave as weight `1`.

#### Scenario: Spawn copies a packed weight
- **WHEN** a character blueprint with `separationWeight` `0` is spawned into `WorldState`
- **THEN** that entity's `separationWeight` SHALL be `0`

#### Scenario: Runtime weight change and rejection
- **WHEN** `set_separation_weight` sets an existing entity to `0`, and a second effect names an unknown entity or a weight of `1.5`
- **THEN** the existing entity's weight SHALL become `0`, the unknown-entity effect SHALL throw without changing other entities, and the out-of-range weight SHALL fail schema validation
