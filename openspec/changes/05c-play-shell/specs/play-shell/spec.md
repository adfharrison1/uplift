## Purpose

The campaign has one browser page. It loads whichever pack is registered, steps and draws that pack, and gives every later lab and player-facing surface a layer to mount into.

## ADDED Requirements

### Requirement: Single campaign page
The interfaces layer SHALL boot one browser page with one canvas and one `WebGLRenderer`. That page SHALL be the only surface on which the player sees or interacts with the game. Any later stage, body, cabin, still, lab panel, or player-facing control SHALL load into this page. The repository SHALL have one HTML entry. Domain and application SHALL NOT import the DOM, Three.js, or a content pack. The page SHALL be driven by a launch payload of a stage directory keyed by `spaceId`, character visuals, a visual theme, and a focus entity id. The session type SHALL NOT contain exemplar place or character ids. The first wired launch SHALL be the proving-slice pack, which is the only embodied content that exists today.

#### Scenario: A second pack can drive the same session
- **WHEN** a headless `PlaySession` is constructed with a launch payload whose only space id is `space_other` and whose focus entity starts in that space
- **THEN** the session's active stage SHALL be the stage registered for `space_other`

#### Scenario: A later surface uses this page
- **WHEN** a later change adds something the player must see or use, whether a stage, a body, a cabin, a still, a lab panel, or a player-facing control
- **THEN** it SHALL load into this page's viewport, diegetic layer, or dev HUD, and SHALL NOT add a document

#### Scenario: The proving slice is the first page load
- **WHEN** the browser entry starts
- **THEN** it SHALL launch the proving-slice pack with focus entity `char_player_operative` on one canvas and one `WebGLRenderer`, and SHALL NOT create a second document, canvas, or renderer

#### Scenario: Domain and application stay pack-free
- **WHEN** the play session module is loaded
- **THEN** it SHALL NOT import the DOM, Three.js, or a content pack, and SHALL NOT contain an exemplar place or character id

### Requirement: Three lasting layers
The page SHALL stack three layers in this order: the viewport, a diegetic layer, and a dev HUD. The diegetic layer SHALL be the only mount for later parchment, lace, desk, overview, and dialogue chrome. The dev HUD SHALL be a panel registry keyed by panel id. This change SHALL ship the stage panel. Registering a panel id that is already present SHALL fail without replacing the existing panel. A later lab SHALL add a panel to this registry rather than adding a document.

#### Scenario: The diegetic layer starts empty
- **WHEN** the page finishes its first frame
- **THEN** the document SHALL stack `viewport`, then `diegetic`, then `dev-hud`; the diegetic layer SHALL contain no child elements; and the dev HUD SHALL contain the stage panel

#### Scenario: A duplicate dev-HUD panel is rejected
- **WHEN** a panel with id `stage` is registered and a second panel with id `stage` is registered
- **THEN** the registry SHALL reject the second registration and the first panel SHALL remain mounted

### Requirement: One frame loop
Each animation frame SHALL call `stepFrame` once with the raw frame delta and then `pulseCognitiveScheduler`. The loop SHALL NOT call `stepFrame` more than once per frame. While the simulation is unpaused and the focus entity's `spaceId` has a registered stage, the session SHALL build one render frame for that stage and the renderer SHALL apply it. When the focus entity's `spaceId` changes and the launch directory contains that space, the shell SHALL finish `disposeSceneGraph` on the resident stage before building the next stage. When the directory does not contain that space, the shell SHALL leave the resident stage mounted. The loop SHALL NOT advance `elapsedWatches`, open an `AudioContext`, or inject a storylet. The renderer pixel ratio SHALL be capped at `1`.

#### Scenario: An open door swaps the resident stage
- **WHEN** the focus entity is in the chambers and a move to the yard gate is requested through an open door and enough frames elapse to arrive
- **THEN** the active stage SHALL become the yard stage and the previous stage graph SHALL have been disposed

#### Scenario: A large frame delta still steps once
- **WHEN** one animation frame reports a delta of `2` seconds
- **THEN** the session SHALL call `stepFrame` exactly once with that delta and then `pulseCognitiveScheduler`, and SHALL NOT advance `elapsedWatches`, open an `AudioContext`, or inject a storylet

#### Scenario: A paused frame still steps once
- **WHEN** the simulation is paused and one animation frame runs
- **THEN** the session SHALL call `stepFrame` once and then `pulseCognitiveScheduler`, and SHALL NOT dispatch a waypoint or portal request

#### Scenario: An unpaused registered space is drawn
- **WHEN** the simulation is unpaused and the focus entity's `spaceId` has a registered stage
- **THEN** the session SHALL build one render frame for that stage and the renderer SHALL apply it

#### Scenario: A high device pixel ratio is capped
- **WHEN** `devicePixelRatio` is greater than `1` and the renderer is created
- **THEN** the renderer pixel ratio SHALL be `1`

### Requirement: Play input stays on authored targets
Unpaused input SHALL be able to issue `requestWaypointMove` for the focus entity to an authored waypoint in the active space, and `requestSetPortalState` for a portal prop. A floor click SHALL select the nearest waypoint in the active space only when the hit is within `1.5` meters of that waypoint on XZ. A farther floor click SHALL NOT move the entity. The dev HUD SHALL list every waypoint in the active space as a command that issues the same move. The waypoint status (`path`, `already_there`, `blocked`, `unknown_waypoint`, `unknown_entity`, `paused`) or the portal status (`updated`, `unknown_prop`, `paused`) SHALL be shown as text. A waypoint command SHALL call `requestWaypointMove` while paused and while unpaused. While paused, that call returns `paused` and SHALL NOT dispatch. Floor and portal raycasts SHALL run only while unpaused. `F3` and backtick SHALL toggle pause and de-anchor the camera. Free-cam SHALL change `freeCamOffset` and SHALL NOT write an entity position.

#### Scenario: A barred door does not change space
- **WHEN** the chambers door is barred and the focus entity requests the yard gate
- **THEN** the status SHALL be `blocked` and the active stage SHALL remain the chambers stage

#### Scenario: A paused click does not move
- **WHEN** the simulation is paused and the player activates a waypoint command
- **THEN** the entity position SHALL be unchanged and the status SHALL be `paused`

#### Scenario: A distant floor click is not a move
- **WHEN** the simulation is unpaused and a floor click is more than `1.5` meters from every waypoint in the active space
- **THEN** the focus entity's path SHALL be unchanged

#### Scenario: A nearby floor click selects the waypoint
- **WHEN** the simulation is unpaused and a floor click is within `1.5` meters on XZ of one waypoint in the active space
- **THEN** the dev HUD SHALL show a text command for every waypoint in that space, and the click SHALL call `requestWaypointMove` for the nearest one

#### Scenario: A portal click requests a state
- **WHEN** the simulation is unpaused and the player activates a portal prop
- **THEN** the session SHALL call `requestSetPortalState` and the dev HUD SHALL show the returned status as text

#### Scenario: An unknown prop is not a portal change
- **WHEN** the player requests a portal state for a prop id that is not in the world
- **THEN** the status SHALL be `unknown_prop` and no prop state SHALL change

#### Scenario: Pause de-anchors without moving the body
- **WHEN** the player presses `F3` or backtick and then changes the free-cam offset
- **THEN** the simulation SHALL be paused, the camera SHALL be de-anchored, `freeCamOffset` SHALL change, and the focus entity position SHALL be unchanged

#### Scenario: Status is text
- **WHEN** a waypoint or portal request returns a status
- **THEN** the dev HUD SHALL show that status as text and SHALL NOT use color as the only signal

### Requirement: Missing stage does not kill the loop
When the focus entity's `spaceId` has no stage in the launch directory, the session SHALL keep the previous resident stage, SHALL set a visible `missing_stage` status, and SHALL NOT throw.

#### Scenario: An unregistered space keeps the last picture
- **WHEN** the focus entity's `spaceId` becomes `space_unregistered` after a frame had a resident stage
- **THEN** the resident stage SHALL be unchanged and the visible status SHALL be `missing_stage`

### Requirement: Dev HUD stage lab
While paused, picking a `semanticId` SHALL update `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`, and `globalThis.__UPLIFT_STAGE_INSPECTOR__`. The stage panel SHALL be able to save the selected stage blueprint or character visual through the existing disk-bridge routes. The dev HUD SHALL also be able to set the focus entity to any entity in the current world. Changing focus to an entity in another registered space SHALL swap the resident stage.

#### Scenario: A paused pick mirrors the inspector
- **WHEN** the simulation is paused and a `semanticId` is picked
- **THEN** the shell SHALL set `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`, and `globalThis.__UPLIFT_STAGE_INSPECTOR__`

#### Scenario: The stage panel saves through the disk bridge
- **WHEN** the stage panel saves the selected stage blueprint or character visual
- **THEN** the save SHALL use the existing scene-blueprint or character-visual disk route

#### Scenario: Focus can move to the other body
- **WHEN** the dev HUD sets the focus entity to the other entity in the proving-slice pack and that entity is in a different registered space
- **THEN** the resident stage SHALL become the stage for that entity's space

### Requirement: Bodies require a matching visual
The renderer SHALL create an entity mesh only when a `CharacterVisualBlueprint.characterId` equals that entity id. The proving-slice launch SHALL include a visual for every character in that pack. A pose with no matching visual SHALL NOT throw and SHALL NOT produce a mesh.

#### Scenario: A pose with no visual is skipped
- **WHEN** a render frame includes an entity with no `CharacterVisualBlueprint` of the same `characterId`
- **THEN** the renderer SHALL NOT throw and SHALL NOT create a mesh for that entity

#### Scenario: Both proving-slice characters have a visual
- **WHEN** the proving-slice pack is loaded
- **THEN** `char_player_operative` and `char_yard_walker` SHALL each resolve a `CharacterVisualBlueprint` with that same `characterId`

### Requirement: A stage is drawn in its space frame
The floor footprint SHALL be the walkable rectangle in the space's local frame. The space origin SHALL be the center of that space's waypoint positions on X and Z, with Y at 0. Entity positions and stage prop positions SHALL subtract that origin before they are placed on the stage. The floor, the walls, the lights, and the camera volume SHALL stay centered on the stage. A floor click SHALL add the origin before it is compared with waypoints, and SHALL NOT move the focus entity when that entity is not in the drawn space. The camera SHALL follow the focus entity only while that entity is in the drawn space, and SHALL look at the stage center otherwise. Waypoint Y SHALL be kept. A waypoint whose local XZ lies outside the footprint SHALL reject the launch and SHALL NOT change `WorldState`. The renderer SHALL NOT be given a room width or an entity id in order to place the floor. The dev HUD focus list SHALL list entities in the focus entity's space. `setFocusEntity` SHALL still accept an entity in another registered space.

#### Scenario: The chambers hearth sits on the authored floor
- **WHEN** the proving-slice chambers stage is launched
- **THEN** its footprint SHALL be 12 m by 10 m and the hearth waypoint's local position SHALL lie on that floor

#### Scenario: A waypoint outside the floor rejects the launch
- **WHEN** a launch stage's space has a waypoint whose local XZ is outside the footprint
- **THEN** constructing the session SHALL throw and `WorldState` SHALL be unchanged

#### Scenario: A floor hit on a kept stage does not move a departed focus
- **WHEN** the focus entity's space has no stage and a floor hit lands on the kept stage
- **THEN** the focus entity's path SHALL be unchanged and the camera SHALL look at the stage center

#### Scenario: A stage-local floor hit selects the world waypoint
- **WHEN** the simulation is unpaused and a floor hit is the stage-local position of a waypoint in the drawn space
- **THEN** the session SHALL call `requestWaypointMove` for that waypoint

### Requirement: Reduced motion is honored
The shell SHALL set `reduceMotionAndFlashing` from the browser `prefers-reduced-motion` setting on every render frame. Waypoint commands and the request status SHALL be text, not color alone.

#### Scenario: Reduced motion is forwarded
- **WHEN** `prefers-reduced-motion` is reduce and a frame is built
- **THEN** the render-frame input SHALL set `reduceMotionAndFlashing` to true
