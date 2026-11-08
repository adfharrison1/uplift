## Why

The painter, the camera, the F3 mutators, and the headless simulation already exist. Nothing opens a page. Change `05c-play-shell` is the game's only UI. Whatever the player has to see or interact with, at any point in the campaign, loads into this page: a stage, a body, a cabin, a still, a lab, or a player-facing control. The proving slice is only the first thing that can be loaded, because it is the only embodied content that exists today. The sound lab (`05a`), the pacing lab (`05b`), travel cabins (`06c`), dialogue and the lace (`07`), and every later epoch's people and places (`11` and beyond) load into this page. None of them creates another one.

All runtime and test code executes 100% locally on the target **2019 Intel Core i7 MacBook Pro (16GB RAM, 60 FPS)** with **zero external API keys, zero paid tokens, and zero cloud inference calls**.

## What Changes

- **Application (`src/application/shell/`)**: A pure `PlaySession` that wraps the existing coordinator and `RenderFrameBuilder`. A launch payload supplies the stage directory, character visuals, theme, and focus entity. The session does not import content, Three.js, or the DOM, and it does not contain exemplar ids. Each animation frame calls `stepFrame` once and then `pulseCognitiveScheduler`, including while paused. A space change selects the stage registered for the new `spaceId`. Play input calls `requestWaypointMove` or `requestSetPortalState` and keeps the returned status.
- **Content**: Character visuals whose `characterId` matches `char_player_operative` and `char_yard_walker`, plus a `spaceId` → `StageSceneBlueprint` directory for the proving-slice stages. Those ids stay in `src/content/`.
- **Interfaces (`src/interfaces/composition/`)**: The only `index.html` and the only `WebGLRenderer`. The document has three stacked layers: the viewport, a diegetic layer, and the dev HUD. The diegetic layer is empty in this change and is the only mount for later parchment, lace, desk, overview, and dialogue chrome. The dev HUD is a panel registry; this change ships the stage lab panel and a waypoint command list. Later labs register a panel. Pointer and key bindings register on the same router. `prefers-reduced-motion` is passed into `buildFrame`.

## Capabilities

### New Capabilities

- `play-shell`: The campaign's single page, its three layers, the frame loop, play input, the dev HUD registry, and the rule that a body is drawn only when a visual's `characterId` matches the entity.

### Modified Capabilities

None. The shell calls the existing coordinator, render frame, stage renderer, DOM mirror, and disk bridge without changing their requirements.

## Impact

- Adds `src/application/shell/PlaySession.ts`, `src/interfaces/composition/`, a root `index.html`, proving-slice character visuals, and a stage directory.
- `npm run dev` on the existing Vite server (`127.0.0.1:5173`) opens the page. `npm run verify` stays headless and does not create a WebGL context.
- Later changes add a dev-HUD panel, a diegetic-layer child, or a pointer binding. They do not add a document, a canvas, or a second frame loop.

## Non-Goals

- The contents of the diegetic layer: parchment, wax, maps, neural-lace arcs, the writing desk, the wider-world overview, and dialogue chrome (Changes `06` and `07`). The layer exists so those changes have a place to mount.
- The Sound Lab and any `AudioContext` (Change `05a`). The Pacing Lab, watch spending, and storylet injection (Change `05b`). The travel-cabin content (Change `06c`); that change calls this shell's existing stage swap.
- Authoring the rest of the campaign. This change loads the proving-slice pack because it is the only embodied content today. Later people, places, cabins, stills, and controls are further loads into this same page.
- A save-slot picker, a second page, a second canvas, click-to-move on arbitrary ground, navmesh, and teleport. Free-cam writes the camera offset. Blueprint edits stay inside the F3 pause and use the existing disk bridge.

## Dependencies

- Depends on archived changes `04` and `05`.
- `05a` and `05b` mount their labs on this page. Every later stage, body, cabin, still, and player-facing control loads into this page, including travel (`06c`) and whatever population a given epoch needs (`11` and beyond).
- `src/domain/` and `src/application/` do not import `src/content/`. The browser entry is the only composition point that names the proving slice.
