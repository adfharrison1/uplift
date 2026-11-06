## Purpose

Provide an immutable `WorldState`, a pure deterministic `WorldEffect` reducer, and a continuous 60Hz `stepKinematics(dt)` locomotion engine with pause support, exact waypoint snapping, and physical arrival events.

## ADDED Requirements

### Requirement: Continuous 60Hz kinematics step and arrival events
The simulation domain SHALL advance entity positions and yaw rotations continuously along their assigned waypoint paths in `stepKinematics(state, dtSeconds)` at realistic walking speeds (`m/s` and `rad/s`), snapping to exact waypoint coordinates and emitting `WaypointArrivalEvent`s in path order when reached, rejecting negative or non-finite `dtSeconds` with `RangeError`, and leaving spatial state unchanged when `dtSeconds === 0` or `state.paused === true`.

#### Scenario: Continuous movement, exact snap, and multi-waypoint arrival events
- **WHEN** an entity at `[0, 0, 0]` is assigned a path to `[1.4, 0, 0]` at `walkSpeedMetersPerSec: 1.4` and `stepKinematics` is called across 60 frames of `1/60s` (or a single multi-waypoint step)
- **THEN** the entity's position SHALL advance smoothly without zero-vector division errors, snap to `[1.4, 0, 0]` on arrival, and emit one `WaypointArrivalEvent` per reached waypoint in path order

#### Scenario: Kinematics freeze during paused Debug Mode and rejection of invalid dtSeconds
- **WHEN** `stepKinematics(state, dtSeconds)` is called with `state.paused === true` and valid `dtSeconds`, or with negative / non-finite `dtSeconds` (`-0.016`, `NaN`, `Infinity`)
- **THEN** negative or non-finite `dtSeconds` SHALL throw `RangeError`, and when `state.paused === true` with valid `dtSeconds`, all entity positions, rotations, and active paths SHALL remain identical with zero arrival events emitted

### Requirement: Pure deterministic WorldEffect reducer
The simulation domain SHALL apply discrete `WorldEffect` commands via a pure function `applyWorldEffects(state, effects)` that returns `{ state, appliedEffects }` without mutating the prior state snapshot, covering pressure stocks (`subsistence_pressure`, `production_pressure`, `elite_prestige_pressure`), the 4 discovery layers (`null` when unnoticed, or `'noticed' | 'assayed' | 'attributed' | 'theorized'`), inertia pillars, emergency states (compounding each character's `emergencyVice` drive), orbital pass phases (`zenith | horizon | occluded`) and `Slingshot` / `Burn` Delta spend, and Dual-Ledger legacy scars.

#### Scenario: Immutable application of world effects across pressure stocks, inertia pillars, emergencies, and orbital delta
- **WHEN** `applyWorldEffects` processes effects adjusting a societal pressure stock, advancing the discovery layer, collapsing an NPC `InertiaPillar`, triggering an `EmergencyState` and compounding `emergencyVice` drives, or spending orbital `Delta` for a `Slingshot` or `Burn`
- **THEN** the returned `WorldState` SHALL reflect the updated values clamped to valid bounds while the input `WorldState` remains completely unmodified
