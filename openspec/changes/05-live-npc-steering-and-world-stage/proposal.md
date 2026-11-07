## Why

Change `03` already moves an entity along an authored waypoint path, and Change `04` already renders a stage and hinges a portal prop. Neither can answer "walk to that doorway, unless it is barred, and do not stand inside the other walker." Change `05-live-npc-steering-and-world-stage` adds that embodied layer: a deterministic waypoint graph with portal gates, a 2D spatial hash with local separation, a coordinator move request, and a two-space Highglass proving slice (outdoor yard, player chambers, one door) so the loop can be tested before Utility AI (`06`) and the full Epoch 1 population (`11`).

All runtime and test code executes 100% locally on the target **2019 Intel Core i7 MacBook Pro (16GB RAM, 60 FPS)** with **zero external API keys, zero paid tokens, and zero cloud inference calls**.

## What Changes

- **Domain (`src/domain/`)**:
  - Extend `WaypointBlueprint` with optional `neighborWaypointIds` and `PropBlueprint` with optional `portalTargetSpaceId` / `portalTargetWaypointId`. Targets are a pair and require `portalState`. `portalState` alone stays valid and adds no graph edge. `EpochModuleRegistry.getAllSpaces()` lists spaces for the coordinator. Explicit-neighbor spaces reject degree-0 waypoints.
  - Add `planWaypointPath` and `truncatePathAtClosedPortals` in `src/domain/simulation/WaypointNavigator.ts`. Within a space, explicit neighbor lists are undirected edges; a space with no neighbor lists falls back to a declaration-order chain. A portal with both target ids is one undirected edge while `portalState` is `open` or `ajar`. Truncation includes the hop from the waypoint the entity is already on.
  - Add `SpatialHashGrid` (`src/domain/simulation/SpatialHashGrid.ts`) and apply XZ separation inside `stepKinematics` for embodied `moving` entities, scaled by that mover's `separationWeight` (`0..1`, omitted means `1`). Weight `0` keeps a packed mob, a queue, or a shoulder-to-shoulder pair on its authored spacing. Weight `1` is the market mill. `set_separation_weight` lets a later emergency change it without editing the integrator. Entities in an `off_stage_region` stay on their paths and stay out of the hash. Arrival still snaps to the exact waypoint.
- **Application (`src/application/simulation/SimulationCoordinator.ts`)**:
  - `requestWaypointMove(entityId, destinationWaypointId)` plans a path from current portal states and dispatches `move_entity_to_waypoint` (the reducer already chooses `moving` versus leaving an in-progress `deliberating` phase), or returns blocked / unknown / paused without mutating state.
  - `requestSetPortalState(propId, portalState)` dispatches the existing `update_prop_state` effect.
  - `stepFrame` truncates any in-flight path at a portal that has since closed or become barred, including the hop from the waypoint the entity is already standing on, before kinematics.
- **Content proving slice** (not the Epoch 1 population):
  - `src/content/worlds/starterHoldPack.ts`: yard (`outdoor_area`), chambers (`indoor_room`), one portal door, two embodied characters.
  - `src/content/scene/starterHoldStages.ts`: matching `StageSceneBlueprint`s whose portal prop is `isPortal`, so the existing hinge yaw in `RenderFrameBuilder` shows open / ajar / closed / barred.

## Capabilities

### New Capabilities

- `waypoint-navigation-and-portals`: Epoch-agnostic waypoint graph, portal-gated edges, deterministic BFS, path truncation when a door closes, and `SimulationCoordinator.requestWaypointMove`.
- `embodied-spatial-steering`: 2D spatial hash, same-space XZ separation for moving embodied entities scaled by `separationWeight`, exact waypoint snap preserved, `off_stage_region` excluded from the hash.
- `starter-hold-embodied-slice`: Two-space Highglass yard and chambers pack plus stage blueprints, exercised by a headless test that walks an entity through an open door and refuses a barred one.

### Modified Capabilities

- `modular-epoch-registries`: Waypoint neighbor lists and portal target fields, with validation scenarios for dangling targets, cross-space neighbors, and portal fields that disagree with `portalState`.
- `continuous-kinematics-and-world-reducer`: `stepKinematics` gains same-space separation while keeping exact arrival snaps, pause freeze, and invalid-`dt` rejection.

## Non-Goals

- Utility AI goal selection, rival turns, the Wider World Overview, and dialogue (Changes `06`–`07`).
- Campaign watches, storyteller point-releases, and pacing envelopes (Change `05b`).
- Procedural Web Audio and the `F3` Sound Lab (Change `05a`).
- The full Epoch 1 cast, districts, and offices (Change `11`). Epoch 2+ travel cabins (Change `06c`).
- Navmesh, flocking, crowd-continuum solvers, or a third-party physics library. A mob, a queue, a seated row, and a milling market are authored waypoints plus `separationWeight`. This change does not add a crowd agent.
- A click-to-move HUD. Callers use `requestWaypointMove` and `requestSetPortalState`. Door hinge yaw already exists in `RenderFrameBuilder` and is not reimplemented. Separation is world displacement only: it does not read `reduceMotionAndFlashing` and it adds no camera shake, FOV kick, or extra hinge motion.
- Any `three` import, stage blueprint, or Highglass name inside `src/domain/` or `src/application/`.

## Dependencies

- Depends on archived changes `01`, `01a`, `02`, `03`, and `04`.
- Registers the proving slice through `EpochModuleRegistry.registerPack` without changing the core reducer effect list.
- `src/application/` does not import `src/content/`. The headless integration test is the composition point.
