# Epoch 2+ travel vignettes

Status: planned (roadmap: 06c-epoch-travel-vignettes)

Purpose: the fine-grained design of fast travel as a bounded 3D cabin scene from Epoch 2 onward.

Canonical summary lives in DESIGN_NOTES § Epoch 2+ travel vignettes.

## Why travel is a scene, not a skip and not a second campaign

Epoch 1 remains local walking inside the settlement (no travel vignettes). From Epoch 2 onward, era-appropriate transit is **fast travel that is still a bounded 3D scene**: a kitbashed vehicle cabin (`vehicle_cabin` `SpaceKind`), a handful of fellow passengers, diegetic news access, and two independent keyed rolls (`roll(worldSeed, streamKey, counter)`) that may fire a useful/trigger interaction and/or world-mutating news. It is not an overland map, not a loading-screen skip, and not a _Last Express_-length minigame on every hop. Watch cost, destination count, and remaining gates become **less limited one tech rung at a time** (`travelTechTier <= maxTechTierForEpoch`); the engine never hardcodes "coach" vs "rail", and Culture-level teleport is forbidden. The default-ladder vehicle skins are in the ladder table in `design/epoch-ladder-skins-and-rotation.md`.

## The vignette loop (Clock 1 cabin plus Clock 2 spend)

1. **Commit travel** as a Clock 2 time-spend (`TransitRouteBlueprint` watch cost from a `PacingProfileBlueprint` envelope). Boarding is a route action, not a walking `connectedSpaceIds` edge.
2. **Swap stage** via existing `disposeSceneGraph` onto a small `StageSceneBlueprint` for that `VehicleKind` (tight `CameraVolumeBlueprint`s; the F3 Stage Lab still works). Focused 60Hz embodiment is the cabin only.
3. **Origin is not a special "left undefended" mode**: the settlement you left keeps existing the same way every other node already does (Clock 2 / off-camera `off_stage_region` LOD). Highglass Hold is not a unique tactical vulnerability just because you boarded a coach.
4. **Watches advance on vignette cadence** (reading the gazette, waiting, sleeping a stage, or the summary skip), never from idle staring.
5. **Two independent rolls**, each consuming Storyteller storylet budget from `storyletDensityEnvelope`: **`social_trigger`** (passenger hook, Regard bump, eavesdropped secret, correspondent in the next seat) and **`world_news`** (colour, or a mutation of trip pretext / origin / destination / Wider World Overview). Quiet trips are the default; a useful conversation is uncommon; a world-mutating headline is rare. Storyteller vetoes cannot force a second `crisis_fuse` or fire a `09a` blackout.
6. **Arrive** (or **divert** onto an existing same-Epoch route for extra watches). Apply queued `WorldEffect[]`. A stale trip pretext is intelligence arriving _along the corridor you are on_, not slapstick.

**"Commit the rest of the journey" summary skip**: the player may collapse remaining cabin time, but remaining watches and pending social/news rolls **still resolve in summary**, so skip cannot dodge mutation. Embarkation itself is not skippable (choosing a seat/compartment sets passenger adjacency for eavesdropping / Regard).

## Epoch-agnostic contracts (`EpochModuleRegistry`)

- `VehicleKindBlueprint`: `travelTechTier`, named/ambient passenger caps (`2–6` named plus `0–4` ambient), `acousticClass`, sway amplitude (clamped by existing `reduceMotionAndFlashing`).
- `TransitRouteBlueprint`: from/to settlement ids, vehicle kind, base watch cost, weather / emergency / pretext gates.
- `TravelVignetteBlueprint`: route, `vehicleStageId`, diegetic news prop, encounter table ids.
- `EnRouteEncounterTable`: two weighted tables (`social_trigger` | `world_news`) with `mutationKinds: 'trip_pretext' | 'origin' | 'destination' | 'wider_world'` and a storyteller budget cost.
- `TravelSessionState` (`StateSliceKey`): route, remaining watches, passengers, rolled encounter ids, optional destination override. Arrival is a pure function of seed plus state via `TravelVignetteCoordinator`.
- The diegetic news prop (chain in the ladder section of DESIGN_NOTES) is a **delayed slice of `WorldOverviewModule`**, so rival spoof tells still work. Neural lace still works unless a `09a` blackout is active. A rival operative as a fellow passenger is a rare Storyteller beat, never a raw random roll.

## Live world-state surface cues (`TravelSurfaceCueBlueprint`)

Subtle immersion, not a second HUD. Every Epoch 2+ vehicle stage carries **small, data-driven visual/prop details that reflect current world state**, resolved on embark and at each watch boundary (never per 60Hz frame). This is the travel-cabin sibling of `bindPredecessorTraces` (`10-registry-swap-and-legacy`): predicates bind kitbash `semanticId` motifs, props, lights, extra gazette editions, grime, or an empty passenger slot, inspectable in the F3 Stage Lab, zero `.glb` bloat.

- Cues stay **subtle and diegetic** (mud on a wheel-well, a folded extra broadsheet, quarantine yellow bunting, wartime paper blinds, a missing scheduled seat, blackout shutters when the 174 Hz carrier is dead). They are never billboards, objective markers, or lace-HUD dumps. Content authors register `TravelSurfaceCueBlueprint`s (`predicate` on pressure stocks, active emergency, weather, overview headline family, orbital phase, discovery layer, held Office, `Regard` bond, or `coverPersecutionRisk` band -> `visualDelta` on a `semanticId` target). The predicate language is epoch-agnostic so settlement stages can reuse it later; `06c-epoch-travel-vignettes` only authors travel-cabin cues.
- Seed exemplars of the tone (not a closed list): coach wheel-well mud matching last weather; the news rack's extra edition matching the current overview headline (or a rival `early_surplus` spoof tell); an empty compartment when a scheduled passenger is in `ideological_trial`; blackout shutters / dead lace hum during `OrbitalBlackoutState`; colonial quarantine bunting when the destination carries `medical_quarantine`.
