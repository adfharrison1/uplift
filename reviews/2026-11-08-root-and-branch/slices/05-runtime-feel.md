# Slice 5: Runtime, feel and presentation (renderer, input, camera, accessibility, art and audio direction)

## How this slice was run

Three scouts filed 24 findings. Scout A benchmarked the frame builder and the scene build headless. The quote check found no problems. Opus verified the pause and de-anchor flags (playInput.ts:151-157) and the antialias/DPR settings. The findings were consolidated to 20, plus 12 routes.

Four blind challengers then reviewed them:
- ch1 falsified claims 1–10 with its own probes: 7 hold, 3 overstated.
- ch2 falsified claims 11–20 and tagged each one as rule, vocabulary, placeholder or code: 3 hold, 6 overstated, 1 wrong.
- ch3, a runtime architect, produced the ordered 05d/05e prerequisites.
- ch4, a lead for game feel, UX and accessibility who also acts as art director, gave the top 3.

Every finding was reviewed at least 3 times and every route at least twice. Raw files are in raw/S5-*.

## Headline

**Speed is not the problem. Structure is.** The pure frame builder costs 5 µs today and about 89 µs with 100 characters and 60 props. Applying the frame to the scene costs about 165 µs at that size, and disposal is complete. JS per-frame cost does not need optimising.

The problems are:
- Input is a stateless key-down adapter that reads `event.key`.
- There is no seam for render interpolation, which the fixed step from the hardening batch will need.
- Mesh shapes are literals inside the renderer, so 05d's rule that the footprint matches the drawn mesh would make the sim read renderer constants.
- Crowd or materialized NPCs get no mesh.
- Room-change cost scales with the whole cast: a 28–72 ms hitch.
- There is no camera layer for world events or zoom.
- There is no rule that separates mood from signal.
- Accessibility is a single reduce-motion clamp.

Much of the art critique is about **placeholder** art (ch2's tags). Opus kept only the parts that describe missing *rules* or *vocabulary*.

## 05d/05e prerequisites (ch3's order, endorsed by Opus; ch4 agrees on substance)

1. **Hardening step 5 (amended).** The domain keeps one `simulationFrozen` bit. *Lab mode* (desaturation, free-cam, picking) becomes a PlaySession flag, and free-cam keys are gated on it, not on `isPaused()`. Add a frame try/catch that re-arms rAF. Reword 05e's clause to "no second **domain** pause flag".
2. **Hardening step 6 (amended).** The accumulator keeps the previous WorldState reference, which structural sharing makes free. Expose `alpha` and a teleport marker. RenderFrameBuilder lerps positions and takes the shortest arc for yaw, and the camera focus uses the interpolated position. Interpolation stays out of WorldState and out of the hash. Start with plain prev/curr maps. Move to a Float32Array only if profiling shows the need.
3. **Hardening step 4 + materialize.** One entity-id pattern check at load and at materialize. Today an id that breaks the pattern throws inside the render loop and freezes the page.
4. **05d task 1.** A content **shape descriptor** (primitive, dims, offset) that both the renderer and the application footprint builder read. Domain still gets plain rectangles. Unknown shape ids fail validation. Start with the minimal vocabulary: box, cylinder, cone, icosahedron.
5. **05d task 2.** An **InputState / InputFrame** layer:
   - handles keyup, blur and visibilitychange;
   - uses `event.code` (physical keys, so AZERTY and Dvorak work), with `getLayoutMap` used only for on-screen labels;
   - tracks held and pressed sets and a steer vector;
   - maps keys through a data action table (gamepad and rebinding follow later);
   - neutralises the dev HUD so Space can't re-click it.
   Space is edge-triggered and never auto-repeats.
6. **05d task 3.** **Control frame.** Derive the camera offset from the volume's yaw, pitch and distance, so the dead `pitchDegrees`/`yawDegrees` fields drive the view and WASD has one authoritative frame. **Latch** the control frame while a move key is held across a volume change (the RE/FF7 rule). The **single zoom-out** is one yaw-neutral scalar on the offset.
7. **05d task 4.** Renderer:
   - build only the poses in the resident space;
   - cache geometry and material, with dispose that is safe for shared resources;
   - keep a stable cached order;
   - warm up with `compileAsync` so the first room entry doesn't hitch.
8. **05d task 5.** A **readability contract test**: three value tiers (environment low, actors mid-high, signal brightest), with signal hues reserved.
9. **05e task 1.** A **modal input stack** on the same InputFrame. The top layer consumes every Space and Escape press in the frame it happens. This keeps the owner's grammar: W/S are vertical, Space confirms, Escape goes back. A/D are aliases in vertical lists and own left/right in horizontal rows. Arrow keys are a second binding set.
10. **05e task 2.** A prop **state-variant** field in the shape table, so a changed prop can be seen. Move the debug highlight off cyan. Add a **warm mark on the currently selected Space target**; without it the 0.4 m / ±45° use rule can't be read.
11. **05e task 3.** A minimal **Settings** model (reduceMotion, hold or toggle movement, textScale) kept outside the hash. readingSpeed, ambient persistence and captions follow with 07 and 05a.

## Rulings on disagreements

- **Camera directive stack timing.** ch4 wanted it with 05d/05e; ch3 wanted it at 07. **Opus ruling:** the control-frame latch and the zoom scalar go in 05d. The capture/return directive stack goes in 07, because world events that capture the camera arrive with dialogue and events. When built:
  - Space never skips a capture; movement or Escape hands control back;
  - no captures during a conversation;
  - reduce-motion cuts instead of blending;
  - each capture has a maximum hold.
- **R5C2, signal-by-exception accent.** ch3 rejected it, because a default "this matters" accent is a billboard and breaks P4. ch4 split it. **Opus ruling:** keep only the *functional* affordance, the warm mark on the selected Space target (prerequisite 10). Reject a global "important" accent. An opt-in assist mode is possible later.
- **Minimal audio slice timing.** The scout wanted it before 05d/05f; ch4 wanted it with 05d/05e; ch3 wanted it as the first task of 05a, after the Observation step. **This goes to the owner.** Opus leans to ch3's position: audible clues need the audibility tiers, and those are defined with Observation. The menu confirm/back sounds and the footstep surface table are small enough to ride with 05e if the owner wants feel earlier.
- **R5C4, per-NPC tone blips.** These sit near the DESIGN_NOTES §9 rule "no synthesised voice reads a line aloud". **Owner question.**

## Findings (final)

| ID | Sev | Slot | Finding (post-challenge) |
|---|---|---|---|
| S5-01 | major | 05d (mount from present poses), core step 6 (pooled add/remove) | Only entities with an id-matched visual get a mesh. Crowd and materialized NPCs are invisible. |
| S5-02 | major | 05d | Per-frame cost and stage-build cost scale with the whole cast. Room change hitches 28 ms at 100 characters and 72 ms at 400. |
| S5-03 | major | hardening 4/5, 05b-1 | An entity id that breaks the pattern throws inside the render loop and freezes the page. |
| S5-04 | major | hardening 6 | No render-interpolation seam for the fixed step. |
| S5-05 | major | 05d, 05e, 05b-1 | Shapes are renderer literals and `kitbashId` is ignored. Props vary only in scale, colour and hinge. The vocabulary is a closed, feudal-named switch with silent fallbacks. *Overstated in detail; the core holds.* |
| S5-06 | minor | 05d | The camera volume's pitch and yaw fields never reach the view. |
| S5-07 | minor | 05d (caches), later (Tier-3 merge) | One geometry and one material per part, about 4.5 draw calls per character. |
| S5-08 | minor | later, with Settings | DPR is capped at 1 with antialias off, so the Retina display renders soft. Make it adaptive: step down fast, step up slowly. |
| S5-09 | major | 05d | Input is stateless and uses `event.key`; focus is unmanaged. *Layout risk is prospective, since WASD isn't built yet.* |
| S5-10 | major | 05e | The menu grammar needs one press-consumption model. *The count of exceptions was overstated.* |
| S5-11 | major | 05d (latch, zoom), 07 (stack) | No camera capture, return or zoom seam. The control frame can remap mid-walk. |
| S5-12 | major | 05e, 07, 05a | Accessibility is one OS-driven clamp. *Overstated: it also scales fog and god-rays.* |
| S5-13 | major | core step 5, then validated at 05f | P4 visual tells have no non-visual pairing. Rule: every tell registers a passive "noticing" in the lace log, Disco Elysium style. |
| S5-14 | minor | hardening 5 | *Wrong as filed:* pause and de-anchor are already separate flags. What remains is that free-cam keys are gated on `isPaused`. |
| S5-15 | major | 05d (rule, test), 05e (rim) | No rule separating mood from signal. *Overstated:* the player colour equals the iron colour, not the stone walls (contrast about 1.66 against walls). It is placeholder art, but the missing *rule* is real. |
| S5-16 | major→minor | later (05b-1 recipes) | No silhouette budget for 40–60 characters. Mostly placeholder; the rule is the keeper (TF2 silhouette principle, plus a black-silhouette lab view). |
| S5-17 | minor | later (before the second epoch pack) | The theme is four material slots. *Overstated:* the palette rebind is opt-in and per-character colours survive by default. |
| S5-18 | minor | 05e (highlight), 07 (lace panel) | Cyan is reused for the debug highlight. Lace text needs a solid panel and a fixed type size. |
| S5-19 | major | core step 5, 07, 05a | Audibility is not a learnable rule. Use three tiers (silent, murmur, clear) shown diegetically, never as a meter. *Overstated:* the earshot rule for ambient lines is a partial readout. |
| S5-20 | minor | 05a (owner decides timing) | No sound identity per NPC. Use hybrid audio: synthesis plus a small CC0 sample set. |

## Routes

- **Adopted:**
  - R5A1, DOM bubbles projected from headAnchor (07): integer-pixel rounding, viewport clamp, capped count;
  - R5A3, interpolation contract (hardening 6), with plain maps first;
  - R5B3, action-map InputFrame (05d/05e);
  - R5B4, ambient lines also written to the notebook as a record, not a replay (core step 5, 07);
  - R5C1, value tiers plus a warm rim, with an outline only if the rim fails;
  - R5C3, recipe-based kitbash data with minimal vocabulary and a resolve contract test (05b-1).
- **Later:**
  - R5A2, merged Tier-3 crowd, only once there are more than about a dozen crowd NPCs;
  - R5B1, camera directive stack (07);
  - R5B2, dither-fade wall occlusion, needed for cramped interiors and 06c cabins;
  - R5C5, minimal audio slice (timing is the owner's call).
- **Split:** R5C2 (see the rulings).
- **Owner question:** R5C4.

**GPU profile, still open.** The exact Chrome DevTools scenario is in raw/S5-A.json `could_not_verify`. It covers 100 characters and 60 props, idle and walking, a door crossing, a heap timeline, renderer.info after 10 crossings, and a DPR 1 vs 2 comparison. Run it with the owner when convenient.

## Keep

- The NDC projection matches Three's to 4e-16.
- The closed-form camera spring is stable at any dt.
- `disposeSceneGraph` frees everything.
- Semantic ids are validated and unique.
- There are no shadows or point lights yet.
- The two-bus audio split with text-only speech.
- The theme-driven toon ramp.
- The F3 lab plus the DOM mirror.
