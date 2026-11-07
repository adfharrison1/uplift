## Context

See `proposal.md` for motivation. Change `04` shipped `RenderFrameBuilder`, `ChiaroscuroStageRenderer`, `StageInspectorDomMirror`, and the disk bridge. Change `05` shipped `requestWaypointMove`, `requestSetPortalState`, `stepFrame`, and the headless proving slice. There is no `index.html`, no `WebGLRenderer`, and no `requestAnimationFrame`. Entity meshes are keyed by `CharacterVisualBlueprint.characterId`, and the proving-slice ids do not match the existing exemplar visuals.

## Goals / Non-Goals

**Goals:**

- One page for the whole game. Anything the player must see or interact with, at any point, loads into its viewport, diegetic layer, or dev HUD.
- A pure `PlaySession` so the loop, the stage swap, and the request statuses are tested without WebGL.
- The proving slice visible on that page: both bodies, the door, waypoint commands, and the stage lab.
- A frame loop that already calls `stepFrame` once and `pulseCognitiveScheduler`, so later changes add a panel or a binding instead of opening the loop.

**Non-Goals:**

- Drawing parchment, lace, dialogue, the sound lab, or the pacing lab.
- A second HTML entry, a second canvas, or an `AudioContext`.
- Watch spending, storylet injection, and arbitrary-ground click-to-move.

## Decisions

### 1. The page is a host, and the pack is a launch payload

`PlaySession` lives in `src/application/shell/PlaySession.ts`. Its constructor takes the existing `SimulationCoordinator`, a `RenderFrameBuilder`, and a launch value: `ReadonlyMap<string, StageSceneBlueprint>`, character visuals, `EpochVisualTheme`, and `focusEntityId`. It does not import `src/content/`. `src/interfaces/composition/browserMain.ts` is the only file that names the proving-slice pack, stages, and visuals, and it passes them in.

The document, built by `shellDocument.ts`, has three elements: `data-shell-layer="viewport"`, `data-shell-layer="diegetic"`, and `data-shell-layer="dev-hud"`. The diegetic element starts empty. `registerDevHudPanel(id, panel)` mounts into the dev HUD. A second registration of the same id throws and leaves the first panel in place. This change registers `stage` only. `05a` and `05b` call the same function.

Alternative considered: a proving-slice page that a later "real HUD" replaces. Rejected. That is the gap this change exists to close.

### 2. One frame, one resident stage

`browserMain.ts` uses one `requestAnimationFrame` callback. The callback calls `session.frame(rawDt, { reduceMotionAndFlashing })` once. `frame` calls `coordinator.stepFrame(rawDt)` and then `coordinator.pulseCognitiveScheduler()`. It does not accumulate leftover time into a second step. The coordinator's existing `0.25` s clamp remains the spike limit. While `paused` is true, those two calls stay in the callback because both already return the current state when paused, and the renderer still applies the frame so free-cam can move.

`activeSpaceId` is the focus entity's `spaceId`. The session resolves the launch directory before it replaces the resident stage. A missing entry keeps that stage and sets status `missing_stage`. The shell calls `disposeSceneGraph` only after that resolution yields a different stage, and it finishes disposal before `buildStageSceneGraph` builds the new one. Pixel ratio is `Math.min(devicePixelRatio, 1)`. There is no postprocessing pass.

### 3. Input is a router with two shipped bindings

Bindings:

- A waypoint command in the dev HUD, one per waypoint in the active space, calls `requestWaypointMove(focusEntityId, waypointId)` while paused and while unpaused.
- A floor raycast runs only while unpaused. It picks the nearest active-space waypoint whose XZ distance is `<= 1.5`. Anything farther is a miss.
- A portal raycast runs only while unpaused. A hit whose `semanticId` belongs to a prop with `isPortal: true` calls `requestSetPortalState`. The stage panel also offers the four portal states for the selected portal prop.

The returned status is text in the dev HUD. While paused, `requestWaypointMove` returns `paused` and does not dispatch, and the waypoint command shows that status. `F3` and backtick call `setPaused` and set `cameraDeAnchored` for the next `buildFrame`. While paused, arrow keys change `freeCamOffset` only. Floor and portal raycasts do not run while paused.

The router is a list of `{ id, when, handle }` on the shell. `when` for `waypoint` stays true while paused. `when` for the floor and portal raycasts is unpaused only. This change registers `waypoint` and `portal`. A later verb appends a binding. It does not replace the listener.

### 4. The stage panel uses the lab that already exists

While paused, a picked `semanticId` is passed to `StageInspectorDomMirror` and to `buildFrame` as `hoveredSemanticId` / `selectedSemanticId`. Save uses the existing `PUT /api/scene-blueprints/:stageId` and `PUT /api/character-visuals/:characterId` after the existing Zod mutators. The panel does not write entity position and does not dispatch a `WorldEffect` for a blueprint edit. The dev HUD can set `focusEntityId` to any entity in `WorldState`. A focus entity in another registered space swaps the stage.

### 5. Bodies

`src/content/scene/starterHoldCharacterVisuals.ts` defines two `CharacterVisualBlueprint`s. `characterId` and `lineageId` match the proving-slice pack. `src/content/scene/starterHoldStages.ts` exports `STARTER_HOLD_STAGE_DIRECTORY` mapping `space_glass_yard` and `space_player_chambers`. A content test fails if a pack character has no visual with the same id.

### 6. Pinned versions (verified 2026-10-29)

| Tool / Package | Pinned Version | Role |
| --- | --- | --- |
| Node.js LTS | `24.22.2` | Runtime |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | `tsc` |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | `typescript-eslint` AST |
| `zod` | `4.6.7` | Schemas |
| `three` | `0.186.1` | WebGL |
| `vite` | `8.3.5` | Dev server |
| `vitest` | `5.0.5` | Tests (`environment: node`) |
| `eslint` | `10.13.0` | Lint |
| `prettier` | `3.9.10` | Format |

No new dependency. Tests stay on the Node environment. The WebGL path is not part of `npm run verify`.

### 7. Layer placement

```text
src/application/shell/PlaySession.ts     # pure session; no DOM, no content ids
src/content/scene/                       # proving-slice visuals and stage directory
src/interfaces/composition/              # the only page, renderer, layers, router, stage panel
index.html                               # the only HTML entry
```

`src/domain/` is unchanged. Section guides updated by the last task: `src/application/README.md`, `src/application/AGENTS.md`, `src/content/README.md`, `src/content/AGENTS.md`, `src/interfaces/README.md`, `src/interfaces/AGENTS.md`.

## Risks / Trade-offs

- The diegetic layer is empty until a later change fills it. The page is still the UI: the viewport, the waypoint commands, the status text, and the stage lab are usable on the first load. Filling the layer with parchment now would invent a surface for systems that do not exist yet.
- A `1.5` m floor click will not carry a city. The waypoint command list is the verb that still works when the click misses. Later changes may add a binding. They may not replace the page.
- `pulseCognitiveScheduler` runs every frame and promotes nothing until stimuli exist. The call is in the loop so Change `06` does not have to open `browserMain.ts` to be seen.
- Headless tests cannot execute the WebGL draw. They cover the session, the directory, the visual ids, the layer plan, and the panel-id rejection. A person confirms the picture with `npm run dev`.
