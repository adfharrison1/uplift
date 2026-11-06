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
The simulation domain SHALL apply discrete `WorldEffect` commands via a pure function `applyWorldEffects(state, effects)` that returns `{ state, appliedEffects }` without mutating the prior state snapshot, covering pressure stocks (`subsistence_pressure`, `production_pressure`, `elite_prestige_pressure`), the 4 discovery layers (`null` when unnoticed, or `'noticed' | 'assayed' | 'attributed' | 'theorized'`), inertia pillars, emergency states (compounding each character's `emergencyVice` drive), orbital pass phases (`zenith | horizon | occluded`) and `Slingshot` / `Burn` Delta spend, audio cue emissions (`emit_audio_cue` targeting the `groundside` or `lace` bus), and Dual-Ledger legacy scars.

#### Scenario: Immutable application of world effects across pressure stocks, inertia pillars, emergencies, audio cues, and orbital delta
- **WHEN** `applyWorldEffects` processes effects adjusting a societal pressure stock, advancing the discovery layer, collapsing an NPC `InertiaPillar`, triggering an `EmergencyState` and compounding `emergencyVice` drives, emitting an audio cue, or spending orbital `Delta` for a `Slingshot` or `Burn`
- **THEN** the returned `WorldState` SHALL reflect the updated values clamped to valid bounds while the input `WorldState` remains completely unmodified

### Requirement: Human-paced NPC cognitive phases, anti-thundering-herd cascade dampening, and fast-eval pacing override
The simulation engine SHALL pace NPC progression through explicit cognitive phases (`idle`, `deliberating`, `moving`, `performing_dwell`, `cooldown`, `awaiting_trigger` — transitioning from `moving` to `performing_dwell` on terminal waypoint arrival), SHALL dampen NPC-to-NPC stimulus cascades via exponential hop backoff (`cascadeHopCount` capped by `maxAutonomousCascadeHops` and un-gated via `release_external_trigger`) and a staggered round-robin token-bucket evaluation cap (`maxCognitiveEvaluationsPerPulse = 1` advancing `cognitiveRoundRobinCursor`) under `DEFAULT_GAMEPLAY_PACING_CONFIG`, and SHALL provide a configurable `SimulationPacingConfig` (`FAST_EVAL_PACING_CONFIG`) that waterfalls zero-duration phases in a single pass so automated tests and AI evals execute in milliseconds.

#### Scenario: Human-paced deliberation, dwell, and awaiting-trigger pause
- **WHEN** an entity enters `deliberating` or `performing_dwell` with `phaseRemainingSeconds: 10` (or `awaiting_trigger` when a behavior requires a player/external trigger) under `DEFAULT_GAMEPLAY_PACING_CONFIG`
- **THEN** the entity SHALL remain in that phase until `10s` of unpaused simulation time has elapsed (or until an external trigger arrives for `awaiting_trigger`) before advancing to the next action

#### Scenario: NPC-to-NPC stimulus cascade hop backoff and thundering-herd cap
- **WHEN** NPC A emits an `enqueue_npc_stimulus` effect to NPC B (`cascadeHopCount: 1`), and NPC B emits a follow-on stimulus to NPC C (`cascadeHopCount: 2`, reaching `maxAutonomousCascadeHops: 2`), while multiple NPCs have ready stimuli in the same pulse under `DEFAULT_GAMEPLAY_PACING_CONFIG`
- **THEN** each hop's `readyAtElapsedSeconds` delay SHALL increase exponentially, any hop at or above `maxAutonomousCascadeHops` SHALL pause the recipient in `awaiting_trigger` until a player or macro-world beat occurs, and `SimulationCoordinator` SHALL evaluate at most `maxCognitiveEvaluationsPerPulse` (`1`) ready NPC per pulse in round-robin order

#### Scenario: Fast-eval pacing override for automated tests and AI evaluations
- **WHEN** `WorldState` or `SimulationCoordinator` is configured with `FAST_EVAL_PACING_CONFIG` (`deliberationScale: 0`, `baseDigestionDelaySeconds: 0`, elevated `maxAutonomousCascadeHops` and `maxCognitiveEvaluationsPerPulse`, and `allowUnclampedFrameDt: true`)
- **THEN** stimuli and cognitive phases SHALL resolve without human-paced waiting delays and evaluate multiple ready NPCs in a single pulse so multi-tick automated evals complete in milliseconds
