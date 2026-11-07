## ADDED Requirements

### Requirement: Waypoint neighbor lists and portal target validation
`EpochModuleRegistry` SHALL accept optional `neighborWaypointIds` on `WaypointBlueprint`, optional `portalTargetSpaceId` plus `portalTargetWaypointId` on `PropBlueprint`, and optional `separationWeight` on `CharacterBlueprint` (`0..1`, default `1`), and SHALL expose `getAllSpaces()` returning every registered space with its `kind` and waypoints. A neighbor id SHALL refer to a different waypoint in the same space, with no duplicates. The two portal target fields SHALL both be present or both absent. Either target SHALL require `portalState`. `portalState` with neither target SHALL remain valid and SHALL NOT create a navigation edge. When both targets are present, the portal target space SHALL be listed in the source space's `connectedSpaceIds`, and the target waypoint SHALL belong to that target space. In a space that declares any neighbor, every waypoint SHALL have undirected degree at least 1.

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
