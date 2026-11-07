## Purpose

Plan deterministic waypoint routes that cross a portal only while it is passable, truncate an in-flight path when that portal closes, and expose the plan through `SimulationCoordinator.requestWaypointMove`.

## ADDED Requirements

### Requirement: Deterministic waypoint path planning with portal gates
The domain layer SHALL plan a route with `planWaypointPath` from a current waypoint to a destination waypoint. Within a space, neighbor lists on `WaypointBlueprint` SHALL be undirected edges, and a listed neighbor SHALL count even when only one waypoint declares it. A space in which every neighbor list is empty or omitted SHALL use a single undirected chain in declaration order. A space in which any waypoint declares a neighbor SHALL use only those explicit edges, and registration SHALL have rejected any waypoint in that space whose undirected degree is 0. A portal prop that sets both target ids SHALL add one undirected edge between its waypoint and `portalTargetWaypointId` only when that prop's runtime `portalState` is `open` or `ajar`. `closed` and `barred` SHALL remove both directions. A portal with `portalState` and no target ids SHALL add no edge. Search SHALL be breadth-first and SHALL expand each waypoint's neighbors in ascending waypoint-id order. The returned path SHALL omit the start waypoint and include the destination as `WaypointTarget` entries.

#### Scenario: Open portal connects two spaces
- **WHEN** a yard waypoint chains to a door waypoint and the door's `portalState` is `open` toward a chambers waypoint
- **THEN** `planWaypointPath` SHALL return a path that ends on the chambers waypoint and includes that waypoint's `spaceId`

#### Scenario: Ajar portal connects both directions
- **WHEN** the door's runtime `portalState` is `ajar` and no shorter route exists
- **THEN** `planWaypointPath` SHALL return a path that includes the far-side waypoint, and planning from that far-side waypoint back to the near side SHALL also return a path

#### Scenario: Closed or barred portal is not an edge
- **WHEN** the same door's `portalState` is `closed` or `barred` and no other route exists
- **THEN** `planWaypointPath` SHALL return `blocked` and an empty path

#### Scenario: Already at the destination and unknown ids
- **WHEN** the current waypoint equals the destination, or either waypoint id is absent from the directory
- **THEN** the result SHALL be `already_there` with an empty path, or `unknown_waypoint`, and SHALL NOT invent coordinates

#### Scenario: Explicit outdoor neighbors do not fall back to a chain
- **WHEN** a space declares `neighborWaypointIds` on at least one waypoint
- **THEN** planning SHALL traverse only those undirected neighbor edges and SHALL NOT also link consecutive waypoints that were left unconnected

### Requirement: In-flight path truncation when a portal closes
`truncatePathAtClosedPortals` SHALL run once per unpaused frame before the kinematics loop, and that loop SHALL NOT re-read portal state mid-`dt`. The first hop SHALL be the entity's current `waypointId` to `activePath[0]`, then each later consecutive pair. It SHALL drop the first remaining path entry that would traverse a portal which is `closed` or `barred`, and every entry after it.

#### Scenario: Already on the near side when the door bars
- **WHEN** the entity's current waypoint is the near side, `activePath` contains only the far-side waypoint, and the portal becomes `closed` or `barred` before an unpaused `stepFrame` whose `dtSeconds` is large enough to cross
- **THEN** truncation SHALL clear that far-side entry and the entity's `spaceId` SHALL stay on the near side

#### Scenario: Door bars while an entity still has the far side on its path
- **WHEN** an active path contains the near-side door waypoint followed by the far-side waypoint and the portal then becomes `barred`
- **THEN** truncation SHALL keep the near-side waypoint and remove the far-side waypoint and any targets after it

### Requirement: Coordinator move request does not mutate on failure
`SimulationCoordinator.requestWaypointMove(entityId, destinationWaypointId)` SHALL dispatch only `move_entity_to_waypoint` when planning returns `path`. The existing reducer SHALL set `cognitivePhase` to `moving` unless the entity is already `deliberating`, in which case the path SHALL be stored and the phase SHALL stay `deliberating`. `already_there` SHALL succeed with no dispatch. `blocked`, `unknown_waypoint`, `unknown_entity`, and `paused` SHALL leave `WorldState` unchanged. `requestSetPortalState(propId, portalState)` SHALL dispatch the existing `update_prop_state` effect, and SHALL leave state unchanged with `unknown_prop` when the prop id is absent. `stepFrame` SHALL truncate active paths against current portal states, including the hop from the entity's current waypoint, before `stepKinematics` whenever the frame is not paused.

#### Scenario: Unknown entity and paused request preserve state
- **WHEN** `requestWaypointMove` is called with an `entityId` absent from `WorldState`, or while `WorldState.paused` is true
- **THEN** the result SHALL be `unknown_entity` or `paused`, and no entity position, path, or phase SHALL change

#### Scenario: Blocked request preserves positions
- **WHEN** `requestWaypointMove` is called toward a waypoint behind a `barred` portal
- **THEN** the entity's `position`, `spaceId`, `activePath`, and `cognitivePhase` SHALL equal the pre-call state

#### Scenario: Successful request then a closing door stops at the threshold
- **WHEN** a move through an `open` portal is dispatched and the portal is set to `barred` before the entity reaches the far side
- **THEN** the next unpaused `stepFrame` SHALL truncate the path so the entity can still reach the near side and SHALL NOT enter the far `spaceId`
