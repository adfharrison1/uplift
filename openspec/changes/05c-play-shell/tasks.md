## 1. Pure play session

- [x] 1.1 Add `PlaySession` in `src/application/shell/PlaySession.ts` and re-export it from `src/application/index.ts`. The session accepts a coordinator, a render-frame builder, and a launch payload (stage directory, visuals, theme, focus entity). `frame` calls `stepFrame` once and then `pulseCognitiveScheduler`, swaps the active stage when the focus entity changes space, keeps the previous stage and reports `missing_stage` when the space is unregistered, and exposes move, portal, pause, focus, and reduced-motion inputs. A floor hit farther than `1.5` m from every active-space waypoint does not move. Paused play input does not dispatch. Cover a non-proving-slice payload, an open-door stage swap, a barred door, a paused command, a paused frame that still calls `stepFrame` once and then `pulseCognitiveScheduler`, a distant click, a nearby click, and a missing stage in `tests/unit/application/PlaySession.test.ts` | Verify: `npx vitest run tests/unit/application/PlaySession.test.ts && npm run verify` | Commit: `feat(app): add the campaign play session`

## 2. First launch content

- [x] 2.1 Add `src/content/scene/starterHoldCharacterVisuals.ts` with a `CharacterVisualBlueprint` for `char_player_operative` and `char_yard_walker`, export `STARTER_HOLD_STAGE_DIRECTORY` from `src/content/scene/starterHoldStages.ts`, and re-export both from `src/content/index.ts`. Assert in `tests/unit/content/StarterHoldStage.test.ts` that every proving-slice character id has a visual with that id and that both pack spaces resolve a stage | Verify: `npx vitest run tests/unit/content/StarterHoldStage.test.ts && npm run verify` | Commit: `feat(content): give the proving slice visible bodies and a stage directory`

## 3. The page

- [x] 3.1 Add root `index.html`, `src/interfaces/composition/browserMain.ts`, and `src/interfaces/composition/shellDocument.ts`. One canvas, three layers (`viewport`, `diegetic`, `dev-hud`), pixel ratio capped at `1`, one animation frame calling `PlaySession.frame` once, and `prefers-reduced-motion` forwarded. The browser entry launches the proving-slice pack. The diegetic layer has no children. Cover the layer ids and a duplicate `stage` panel rejection in `tests/unit/interfaces/ShellDocument.test.ts` | Verify: `npx vitest run tests/unit/interfaces/ShellDocument.test.ts && npm run verify` | Commit: `feat(ui): boot the campaign page`

## 4. Play input and the stage lab

- [ ] 4.1 Add the waypoint command list, the floor and portal pointer bindings, the text request status, focus switching, and the paused stage panel in `src/interfaces/composition/playInput.ts` and `src/interfaces/composition/stageLabPanel.ts`. `F3` and backtick toggle pause and de-anchor. Free-cam changes the camera offset only. The stage panel uses `StageInspectorDomMirror` and the existing scene-blueprint and character-visual disk routes. Floor and portal raycasts do not run while paused. A waypoint command while paused calls the session, shows status `paused`, and does not dispatch. Cover a portal binding, `F3` and backtick pause, free-cam leaving the entity position unchanged, and a blueprint save through the disk bridge in `tests/unit/interfaces/PlayInput.test.ts` | Verify: `npx vitest run tests/unit/interfaces/PlayInput.test.ts && npm run verify` | Commit: `feat(ui): add waypoint play input and the stage lab panel`

## 5. Application and content guides

- [ ] 5.1 Update `src/application/README.md`, `src/application/AGENTS.md`, and `src/content/README.md` to name `PlaySession` and the proving-slice visuals. Describe the modules. Do not cite an OpenSpec change id | Verify: `npm run verify` | Commit: `docs(app): document the play session launch`

## 6. Interface guides

- [ ] 6.1 Update `src/content/AGENTS.md`, `src/interfaces/README.md`, and `src/interfaces/AGENTS.md` to name the composition modules once they exist. Describe the modules. Do not cite an OpenSpec change id | Verify: `npm run verify` | Commit: `docs(ui): document the campaign play shell`

After task 6.1 is committed, run the post-change 6-subagent review (adversarial, code adherence, performance, testing, logic, design adherence) and fold verified fixes before archive. That review is not one of the six task commits.
