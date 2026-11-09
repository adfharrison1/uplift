# Epoch ladder skins and operative rotation

Status: planned (roadmap: 10-crew-handoff, 10-registry-swap-and-legacy, 11-epoch-ending-and-handoff-hook)

Purpose: the fine-grained design of the default 7-rung ladder skins, adjacent-epoch NPC continuity, predecessor traces, kinship claims, anti-over-acceleration ceilings and extraction stills.

Canonical summary lives in DESIGN_NOTES § Epoch ladder and operative rotation.

## Default ladder skins

Skins are content exemplars for the default ladder, never engine constants. The ladder itself, the compression arithmetic and the communications-backbone and Detection Tech Level chains stay in DESIGN_NOTES (The configurable ladder).

| Epoch (Era) | Rung and defining content                                                                                                                                                                                                                    | Drone disguise examples (pool of `3–6` per Epoch) | Cover-persecution apparatus                                             | Diegetic surface                                          | Travel vehicle skin                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1           | **Feudal** (_Highglass Hold_: feudal court, guilds, Synod orthodoxy, horse couriers, naked-eye omens, Witch-Hunt Inquisition)                                                                                                                | reliquary lamp / lantern                          | _Synod Witchcraft & Heresy Inquisition_                                 | parchment broadsheets, smeared ink, wax seals, linen maps | none (local walking)                                                    |
| 2           | **Renaissance** (printing charters, optical lenses, merchant banking houses, humanist inquiry vs. dogmatic rifts)                                                                                                                            | astrolabe / pocket-chronometer                    | _Dogmatic Index & Heresy Tribunal_                                      | printed pamphlets                                         | hired coach / river barge (regional, 2–4 destinations, high watch cost) |
| 3           | **Pre-Industrial / Colonial** (chartered trading companies, optical semaphore & post networks, navigational observatories, mercantilist resource wars)                                                                                       | sextant / barometer                               | _Charter Sedition & Admiralty Assize_                                   | colonial gazettes                                         | coastal packet / post-coach                                             |
| 4           | **Industrial / WWI-equivalent** (steam/coal/rail networks, telegraph wires, mass conscription, factory labor vs. capital, industrial/chemical warfare dual-use ceilings)                                                                     | brass theodolite / telegraph ticker               | _Wartime Espionage & Sabotage Court-Martial_                            | telegraph tape / newsprint                                | rail / steam packet                                                     |
| 5           | **Cold-War-era equivalent** (ideological blocs, radio/television/CRT, nuclear/strategic deterrence dual-use ceilings, intelligence agencies & black-sites)                                                                                   | field-radio / dosimeter                           | _Counter-Intelligence Black-Site & Un-Civil Activities Committee_       | Cold-War dossiers / CRT                                   | motorcade / propeller air                                               |
| 6           | **Computer-Age** (global digital networks, email/cloned ledger hashes, algorithmic surveillance, corporate/state information monopolies)                                                                                                     | diagnostic terminal                               | _Algorithmic Anomaly Warrant & State-Corporate Blacklist_               | computer terminals                                        | high-speed rail / airliner                                              |
| 7           | **Space-Age / First-Contact** (also written Space-Age/1st-Contact; `isTerminalEpoch: true`; orbital telemetry/satellites, indigenous planetary defense capable of deflecting the Intersecting Comet, culminating in First Contact readiness) | telemetry drone                                   | _Planetary Security Quarantine & Extraterrestrial Infiltration Hearing_ | space-age telemetry consoles                              | indigenous suborbital hopper                                            |

## Adjacent-epoch living NPC continuity (`youth -> prime -> elder -> succeeded_by_heir`)

Because each inter-epoch gap is **15–30 years**, **`youth` (`15–29`) and `prime` (`30–49`) NPCs from Epoch k are still alive as `prime` or `elder` (`50–75`) in adjacent Epoch k+1 (alongside their immediate children and protégés)**. They personally remember your predecessor and have lived through the one-rung generational leap (e.g., from Epoch 1 horse couriers to Epoch 2 printing charters and optical lenses, or from Epoch 4 steam/telegraph to Epoch 5 radio/Cold-War blocs), while `elder` NPCs from Epoch k (and earlier generations by Epoch k+2 and later) pass their seats to their `lineageId` heirs and descendants.

## Expanding landing choices

Prior Epoch progress unlocks more `LandingZoneBlueprint` entry points and social covers as the reachable world grows larger and more interconnected each Epoch.

## Predecessor traces

`bindPredecessorTraces(stage, specs)` (planned: 10-registry-swap-and-legacy) grafts **visible and uncoverable traces** of your predecessor's work onto the new stage (`semanticId` wall motifs, monuments, refurbished Chambers props, marginalia in ledgers/archives, dynastic descendants, and cautionary ballads/folklore).

## Kinship claim (`kin_claim`) versus starting afresh (`fresh_start`)

Claiming to be related to (or the direct lineal or institutional heir of) your predecessor unlocks warm `respect`/`obligation`/`trust` edges and fast-track Office access with lineages (`lineageId`) that revered your predecessor, but also inherits their `betrayed` faction grudges, rival targeting profile, and `coverPersecutionRisk`. Starting afresh gives a clean personal slate (`0` inherited personal grudges/persecution) while still letting you build on your predecessor's structural work.

## Anti-over-acceleration ceilings

- **No rung-skipping or mid-Epoch tech runaway** (`EpochTechCeilingBlueprint`, `maxMaturationStepPerTransition = 1`): while Uplift compresses the _years_ between Epochs, mechanics must never skip rungs or break an Epoch's internal coherence. Every `EpochProfileBlueprint` enforces a strict `maxTechTierForEpoch` ceiling for its rung, and `runInterEpochMaturation` advances the civilization by **at most 1 Epoch rung per transition**.
- **Surplus momentum and `absorptionCapacity` friction**: surplus Uplift progress within an Epoch beyond `maxTechTierForEpoch` converts into **compressed maturation time and horizontal institutional readiness** (smoother absorption of the rapid generational leap, lower `subsistence_pressure`, softer `Ignorance` pillars, and wider landing-site choices for the next operative), whereas pushing faster than `absorptionCapacity` without institutional scaffolding triggers future-shock backlash, guild/labor riots, Dual-Use Ceiling wars, or `coverPersecutionRisk`.

## Extraction stills

The `ExtractionStillFrameBuilder` (zero repo bloat) renders a 4-beat chiaroscuro still sequence using the existing Three.js stepped-toon kitbash renderer (palette: Visual and UI direction in DESIGN_NOTES; silhouette-first dioramas parameterized by your operative's actual deeds, Office, wardrobe, and scars): (1) _Final Years of Groundside Work_, (2) _Nocturnal Orbital Pick-Up_, (3) _GCU Voyage Home_, and (4) _Culture Reunion & Successor Handoff_.

## Lever skins across the ladder

The abstract levers in DESIGN_NOTES § Levers and how they flow across the ladder keep their shape across all configured Epochs while their content skin evolves per rung:

- **Office succession** (`institutionalLineageId`): _Court Physician_ -> Renaissance Anatomist Guild -> Colonial Quarantine Board -> Industrial Sanitary Commission -> Cold-War Bio-Directorate.
- **Illicit instrument modes** (`IllicitInstrumentType`): Bullion -> Crucible Ingots / Strategic Ore / Unregistered Energy; Counterfeit Coin -> Forged Letters of Credit / Bearer Bonds / Cloned Ledger Hashes; Impossible Gem -> Achromatic Lens / Precision Chronometer / Room-Temp Superconductor.
