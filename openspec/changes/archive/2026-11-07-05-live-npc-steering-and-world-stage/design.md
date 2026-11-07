## Context

See `proposal.md` for motivation. Change `05-live-npc-steering-and-world-stage` turns Change `03` path following into navigable, portal-gated, locally avoided movement, and puts a two-space proving stage under the Change `04` renderer. Utility AI, acoustics, campaign watches, and the full Epoch 1 population stay in later changes.

## Goals / Non-Goals

**Goals:**

- Plan a deterministic waypoint path that crosses a portal only when that portal is `open` or `ajar`.
- Keep embodied walkers from occupying the same XZ point without giving up exact waypoint snaps.
- Leave `off_stage_region` entities out of the 60Hz hash.
- Prove the loop with a yard, a chambers door, and two characters, authored only in `src/content/`.
- Keep `npm run verify` headless: no browser, no GPU requirement, no network.

**Non-Goals:**

- See `proposal.md`. This change does not add a physics engine, a click HUD, or era names in `src/domain/` or `src/application/`.

## Decisions

### 1. Portal targets and waypoint neighbors (`EpochBlueprints.ts`, `EpochModuleRegistry.ts`)

- `WaypointBlueprint.neighborWaypointIds` is optional. Each id is another waypoint in the **same** space. The registry rejects unknowns, duplicates, and cross-space ids. Planning treats a listed neighbor as an undirected edge even when only one side declares it.
- A space where every `neighborWaypointIds` list is empty or omitted uses one undirected chain in declaration order. A space where any waypoint declares a neighbor uses **only** those explicit edges, so an outdoor lane cannot silently cut across the yard.
- `portalTargetSpaceId` and `portalTargetWaypointId` are both present or both absent. Either target requires `portalState`. `portalState` without targets stays valid: a hinge/acoustic door that adds no graph edge, so existing fixtures keep registering. When both targets are set, the target space is in the source space's `connectedSpaceIds` and the target waypoint belongs to that space. The prop's own waypoint is one side of the door.
- In a space that uses explicit neighbors, every waypoint must have undirected degree at least 1 after neighbor lists are mirrored. An orphan throws and names the waypoint id.
- `EpochModuleRegistry.getAllSpaces()` returns every registered `SpaceNodeBlueprint` (`kind` and `waypoints` included). `spaces` stays private.

### 2. Path planning (`WaypointNavigator.ts`)

- `planWaypointPath` runs BFS from the entity's current waypoint to the destination. Neighbor expansion is sorted by waypoint id. The returned path omits the start and includes the goal, each entry a `WaypointTarget` (`waypointId`, `spaceId`, `position`).
- A passable portal (`open` or `ajar`) is one undirected edge between the prop waypoint and `portalTargetWaypointId`. `closed` and `barred` remove both directions. A portal with no target ids adds no edge.
- Results: `path`, `already_there`, `blocked`, `unknown_waypoint`.
- `truncatePathAtClosedPortals` runs once per unpaused frame, before the kinematics loop, and the loop does not re-read portals mid-`dt`. The first hop is `(entity.waypointId → activePath[0])`, then each later consecutive pair. If that hop is a `closed` or `barred` portal, that path entry and every target after it are dropped. An entity already standing on the near waypoint whose path is only the far side therefore does not cross.

### 3. Spatial hash and separation (`SpatialHashGrid.ts`, `KinematicsEngine.ts`)

- Cell size is `2` meters on XZ. `stepKinematics(state, dtSeconds, spaceKinds?)` takes an optional space-kind directory. Each step rebuilds the hash once from input positions of entities whose space is not `off_stage_region`. When the directory is omitted, every entity is treated as embodied so existing direct callers keep today's behavior. A `0.75` m query reads the 3×3 cells around the point, then sorts ids ascending. `SimulationCoordinator.stepFrame` builds the directory from `getAllSpaces()` and passes it on every call.
- Separation runs only for `cognitivePhase === 'moving'`, only against other embodied entities in the **same** `spaceId`, inside `0.75` m. Offsets are computed from start-of-step positions, then applied.
- Displacement length is at most `separationWeight * min(0.15 * dtSeconds, 0.25 * xzDistanceRemaining)` meters, using the **mover's** own weight. Neighbors of any weight still count as bodies to slide around. A mover at weight `0` takes no separation displacement, so a packed mob, a queue, or two people walking shoulder to shoulder keep the spacing they were given. A weight `1` walker still slides around a weight `0` body, and that body does not get pushed. The offset must not increase XZ distance to the current target: slide aside, drop a push that opposes the segment. Apply it only on the partial-move branch. A position already written as `target.position` stays exact. Y is unchanged. When XZ distance remaining is `<= 0.05` m, separation is zero. An idle body on the destination must not stall a `1.4 m/s` walker stepping at `1/60` s. Idle and seated entities do not separate from each other at any weight. This push is world displacement only. It does not read `reduceMotionAndFlashing` and it adds no camera motion.
- `CharacterBlueprint.separationWeight` is optional, `0..1`, default `1`. `EntitySimulationState.separationWeight` is optional; omitted means `1`, so existing entity literals and old save snapshots stay valid. Spawn copies the blueprint value. `set_separation_weight` sets it at runtime. A weight outside `0..1` fails the effect schema. An unknown `entityId` throws, matching `requireEntity`.
- Pause, `dtSeconds === 0`, and invalid `dtSeconds` keep today's behavior. A lone entity on a path matches today's positions.
- No third-party physics. The hash is plain TypeScript. A step with `64` embodied entities stays inside the existing frame function.

### 4. Coordinator (`SimulationCoordinator.ts`)

- `requestWaypointMove(entityId, destinationWaypointId)` reads portal states from `WorldState.props` and calls `planWaypointPath`. Unknown `entityId` returns `unknown_entity`. While `paused`, it returns `paused`. Neither mutates state. On `path` it dispatches only `move_entity_to_waypoint`. The existing reducer sets `cognitivePhase` to `moving` unless the entity is already `deliberating`, in which case the path is stored and the phase stays `deliberating` until its timer elapses. On `already_there` it succeeds with no dispatch. On `blocked` or `unknown_waypoint` it leaves `WorldState` unchanged.
- `requestSetPortalState(propId, portalState)` dispatches the existing `update_prop_state` effect. Unknown prop returns `unknown_prop` and does not mutate. No new effect type and no click HUD.
- `stepFrame`, when not paused, runs `truncatePathAtClosedPortals` before `stepKinematics`, using the hop from the entity's current waypoint. Truncation is a state replace, not a new `WorldEffect` type.
- Both directories are built from `getAllSpaces()` at construction. The coordinator does not import content packs.

### 5. Starter slice (`src/content/worlds/starterHoldPack.ts`, `src/content/scene/starterHoldStages.ts`)

- Domain pack: `space_glass_yard` (`outdoor_area`), `space_player_chambers` (`indoor_room`), chained yard waypoints, one `portalState: 'open'` door from the yard threshold into the chambers threshold, two characters (a yard walker and a player operative). Names here are seed exemplars and exist only in content.
- Two `StageSceneBlueprint`s share those `spaceId`s. The door prop is `isPortal: true` so `portalStateToHingeYaw` already in `RenderFrameBuilder` poses it. No new Three.js module.
- A headless test in `tests/unit/content/` registers the pack, opens a `SimulationCoordinator`, requests a move through the open door, steps frames, and asserts the destination `spaceId`. A second case sets the portal to `barred` and asserts `blocked`.

### 6. Pinned Versions Table (Verified 2026-10-29)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
| --- | --- | --- |
| Node.js LTS | `24.22.2` (`.nvmrc`) | Runtime; includes Oct 21, 2026 security patches (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | Native Go `tsc` (`7.0.2`, strict, zero `any`) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | TS 6 AST bridge for `typescript-eslint` |
| `zod` | `4.6.7` | Schema validation and `z.infer` typing |
| `three` | `0.186.1` (`@types/three` `0.186.0`) | Existing stage renderer; this change adds no Three.js API |
| `vite` | `8.3.5` | Local dev server |
| `vitest` | `5.0.5` | Headless unit tests |
| `eslint` | `10.13.0` (`@eslint/js` `10.0.1`) | Flat config (`minimatch` override `11.0.4`) |
| `typescript-eslint` | `8.72.1` | Strict TypeScript lint |
| `eslint-config-prettier` | `10.1.8` | Disables rules that conflict with Prettier |
| `prettier` | `3.9.10` | Formatting |
| `husky` + `lint-staged` | `9.1.7` / `17.6.0` | Pre-commit lint and format |
| `@types/node` | `24.19.2` | Node type definitions |

### 7. Layer placement and section docs

```text
src/
  domain/
    registries/EpochBlueprints.ts       # neighborWaypointIds, portal targets, separationWeight
    registries/EpochModuleRegistry.ts   # neighbor, portal-target, and degree checks; getAllSpaces()
    simulation/WorldState.ts            # optional entity separationWeight; set_separation_weight effect
    simulation/WorldEffectReducer.ts    # applies set_separation_weight
    simulation/WaypointNavigator.ts     # planWaypointPath, truncatePathAtClosedPortals
    simulation/SpatialHashGrid.ts       # 2m XZ hash, 3×3 query
    simulation/KinematicsEngine.ts      # weight-scaled separation before exact snap
    index.ts                            # re-exports navigator and hash
  application/
    simulation/SimulationCoordinator.ts # requestWaypointMove, truncate before step
  content/
    worlds/starterHoldPack.ts           # yard, chambers, door, two characters
    scene/starterHoldStages.ts          # two StageSceneBlueprints, isPortal door
    index.ts                            # re-exports the slice
```

- **Section guides updated by the final task**: `src/domain/README.md`, `src/domain/AGENTS.md`, `src/application/README.md`, `src/application/AGENTS.md`, `src/content/README.md`, `src/content/AGENTS.md`, `tests/README.md`, `tests/AGENTS.md`.

### 8. Headless testing

- Domain tests use synthetic ids (`space_alpha`, `wp_a`). Content tests are the only place Highglass ids appear.
- `npm run verify` stays the gate: `format:check`, `lint`, `typecheck`, `test:arch`, `test:unit`. No WebGL browser and no ONNX load.
- Separation tests assert bitwise-stable positions across two identical runs and exact snap when a lone entity arrives.
