# Orbital blackout and contingencies

Status: planned (roadmap: 09a-doomsday-clocks-and-rival-unveiling)

Purpose: the fine-grained design of the shared orbital blackout, the five planetary contingencies (the doomsday clocks) and the campaign scheduler that spaces them.

Canonical summary lives in DESIGN_NOTES § Orbital blackout, contingencies and Ship Mind forecast.

## Shared `OrbitalBlackoutState`

`isOrbitalSupportAvailable(state) === false` sits alongside `OrbitalPassRuntimeState`. While active, all orbital capabilities (`zenith` drops, weather control, orbital recon, `Slingshot`/`Burn` Delta, and `extracted_overt` rescue) go offline, the 174 Hz neural-lace carrier hum cuts to dead silence, `advisor_integral`'s lace text stops, and `eligibleAdvisors(state)` leaves **only the Companion Drone (`advisor_particular`)** as your groundside companion.

## The pool of 5 planetary contingencies

`ContingencyEventBlueprint` and `orbitalContingencyLedger`; each contingency is once-per-playthrough, and 2–3 are drawn per playthrough with the keyed `roll(worldSeed, streamKey, counter)`. They come in addition to the conditional late-game Rival Ship Ambush (see Rivals in DESIGN_NOTES).

1. `solar_flare_interdiction` (_Catastrophic Coronal Mass Ejection_): _The Ending_ leaves orbit for `watchesRemaining` to deploy Lagrange field-mirror damping. Cannot be solved by locals; discoverability/paranoia delta scales with the Epoch's `detectionTechLevel` (`0..1`: Feudal aurora omens -> Renaissance/Colonial optical telescopes -> Industrial telegraph geomagnetic storms -> Cold-War/Computer/Space-Age radar, radio & satellite telemetry; the ladder form is in The configurable ladder in DESIGN_NOTES).
2. `comet_orbital_diversion` (_Intersecting Comet / Bolide_): in earlier Epochs, _The Ending_ must leave orbit to nudge the comet's trajectory (`ship_diversion`). In the **Final Epoch (`isTerminalEpoch: true`)**, you can choose **`local_mitigation`**: keep the Ship silent and manipulate the civilization's own scientific/space-age institutions to deflect the comet themselves (lower success odds boosted by uplifted science/institutions, much lower discovery/paranoia risk, and a crowning legacy achievement).
3. `derelict_artifact_quarantine` (_Decaying Ancient Wreck / Rogue Sub-Orbital Probe_): _The Ending_ leaves orbit to vaporize a decaying pre-cursor debris field while one fragment slips to the ground, sparking a groundside race against rival operatives to quarantine, buy, or discredit the "fallen star-metal" before it creates a relic `VeilScar` or rival debt monopoly.
4. `tectonic_caldera_stabilization` (_Supervolcanic Plume / Deep-Crustal Lock_): _The Ending_ repositions to the antipodal deep-crustal effector node to bleed tectonic stress while ash-haze, tremors, and doomsday panic hit the settlement (with a `local_mitigation` geothermal relief option if `isTerminalEpoch: true`).
5. `hegemonic_emission_silence` (_Passing Hegemonic Armada / Sensor Sweep_): _The Ending_ drops into 100% EM cold-sleep on the ocean floor while an unaligned fleet transits the system; rival operatives exploit the blackout to broadcast a beacon or strike you unless stopped with purely local levers.

## Anti-clustering and epoch-spacing framework (`CampaignContingencyScheduler`)

- **Stratified campaign draw (`maxContingenciesPerEpoch = 2`)**: at campaign start, keyed `roll(worldSeed, streamKey, counter)` draws pick `2–3` random contingencies from the 5-event pool across the configured `epochs` list (persisted in `CivilizationLegacyState.orbitalContingencyLedger`). If at least 2 are drawn, they **must** span at least 2 distinct Epochs (never all piling into the same Epoch), while any given Epoch may naturally roll **`0` contingencies** (a quiet orbital age), `1`, or at most `2` (including the conditional Rival Ambush).
- **Mutual exclusion plus mandatory recovery cooldown (`minCooldownWatches`)**: only one blackout can ever be active at a time (`pausedByActiveBlackout: true`). When an Epoch has two contingencies (or a random contingency plus the Endgame Rival Ambush), the second event cannot trigger until `elapsedWatches >= lastBlackoutResolvedWatch + minCooldownWatches` (at least 35% of `epochWatchBudget`), preventing back-to-back orbital blackouts.
