## MODIFIED Requirements

### Requirement: Continuous 60Hz kinematics step and arrival events
The simulation domain SHALL advance entity positions and yaw rotations continuously along their assigned waypoint paths in `stepKinematics(state, dtSeconds, spaceKinds?)` at realistic walking speeds (`m/s` and `rad/s`), snapping to exact waypoint coordinates and emitting `WaypointArrivalEvent`s in path order when reached, rejecting negative or non-finite `dtSeconds` with `RangeError`, and leaving spatial state unchanged when `dtSeconds === 0` or `state.paused === true`. While advancing an entity in `cognitivePhase === 'moving'`, `stepKinematics` SHALL additionally apply same-space XZ separation against other embodied entities within `0.75` meters, computed from start-of-step positions, capped at `separationWeight * min(0.15 * dtSeconds, 0.25 * xzDistanceRemainingToCurrentTarget)` meters using the mover's own weight (`0..1`, omitted means `1`), without increasing XZ distance to the current target, and with separation forced to zero when that XZ distance is `<= 0.05` meters or the mover's weight is `0`, so a packed group keeps its authored spacing and the arrival snap stays exact. `stepKinematics` SHALL accept an optional space-kind directory; entities whose space kind is `off_stage_region` SHALL still follow assigned paths and SHALL be excluded from separation, and when the directory is omitted every entity SHALL be treated as embodied.

#### Scenario: Continuous movement, exact snap, and multi-waypoint arrival events
- **WHEN** an entity at `[0, 0, 0]` is assigned a path to `[1.4, 0, 0]` at `walkSpeedMetersPerSec: 1.4` and `stepKinematics` is called across 60 frames of `1/60s` (or a single multi-waypoint step)
- **THEN** the entity's position SHALL advance smoothly without zero-vector division errors, snap to `[1.4, 0, 0]` on arrival, and emit one `WaypointArrivalEvent` per reached waypoint in path order

#### Scenario: Kinematics freeze during paused Debug Mode and rejection of invalid dtSeconds
- **WHEN** `stepKinematics(state, dtSeconds)` is called with `state.paused === true` and valid `dtSeconds`, or with negative or non-finite `dtSeconds` (`-0.016`, `NaN`, `Infinity`)
- **THEN** negative or non-finite `dtSeconds` SHALL throw `RangeError`, and when `state.paused === true` with valid `dtSeconds`, all entity positions, rotations, and active paths SHALL remain identical with zero arrival events emitted

#### Scenario: Overlapping movers separate and a lone mover does not drift
- **WHEN** two moving entities share a space and start within `0.75` meters, and separately one moving entity walks a path alone
- **THEN** the pair's XZ distance SHALL increase under a deterministic offset cap, and the lone entity's stepped positions SHALL match path integration with no lateral offset
