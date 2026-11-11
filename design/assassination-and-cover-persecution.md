# Assassination and cover persecution

Status: planned (roadmap: 06b-assassination-and-cover-persecution)

Purpose: the fine-grained design of the four assassination vectors, counter-assassination against the player and the cover-persecution state machine.

Canonical summary lives in DESIGN_NOTES § Assassination and cover persecution.

## Assassination vectors

Four vectors (`AssassinationVectorBlueprint`, an option of last resort):

1. `drone_instrument` (_Companion Drone Precision Strike_): very high success (`~0.78+`), fast rival anomaly detection (`assayed`/`attributed`), severe _Lamp_ moral revulsion (`affection`/`trust` drop, `dread` spike).
2. `local_agent` (_Hired / Manipulated Local Agent_): medium success (`~0.52`, boosted by `obligation`/`dread` hooks), low off-world anomaly signature, high _Brother Assassin_ martyrdom backfire if botched.
3. `staged_pretext` (_Staged Medical/Industrial Accident_): medium–high success (`~0.73` with matching Office Pretext), lowest local suspicion if pretext holds, huge spike if exposed.
4. `correspondence_enclosure` (_Sabotaged / Poisoned Enclosure_): medium success (`~0.45`, requires courier `trust`), low–medium suspicion.

The planned plot module is `ViolentPlotModule`. Its counter-assassination outcome identifiers are `silent_intercept`, `noisy_miracle` and `hesitation`, corresponding to the named outcomes below.

## Counter-assassination against the player (local agent vs. rival spacefaring operative)

- **Local retaliation**: triggered by botched player plots, `assassination_lockdown` emergencies, or Tier 1 NPCs with `betrayed` / `torn` `RegardEdge`s. Resolution depends on `droneInterceptQuality` derived from `Regard(advisor_particular -> player)`: high disposition (`>= 0.75`) is a **Silent Intercept** (`0` Veil/Persecution spike); medium disposition (`0.45–0.74`) is a **Noisy Miracle** (saves the player, spikes `coverPersecutionRisk`, and leaves the witnesses an Observation at the `noticed` or `assayed` level, so their derived discovery level advances to that threshold); low or alienated disposition (`< 0.45`) is **Drone Hesitation** (the player suffers a non-fatal wound or incapacitation, or capture into an `ideological_trial`).
- **Rival spacefaring operative strike** (_The Tithe_, _The Quiet_, _House Reciprocal_): triggered when a rival holds an Observation of the player at the `attributed` level or higher (R4; the threshold applies to that rival's derived discovery level), when pulling ahead on a Butterfly Thread, or when your Ship Mind is `occluded`. Uses off-world ordnance, neurotoxins and legal traps that even a devoted _Lamp_ cannot silently negate without high Veil exposure or orbital `zenith` support.

## Cover persecution / witch-hunt hazard

`AnomalousSuspectState` and `coverPersecutionRisk` (`0..1`): an epoch-agnostic state machine (`clear -> rumored -> examined -> charged -> condemned`) skinned per Epoch (the apparatus names are in the ladder table in `design/epoch-ladder-skins-and-rotation.md`). Crossing the threshold triggers an `ideological_trial` emergency fuse with 4 escape valves:

1. **Office Pretext** (`ideological_censure` / `medical_quarantine`).
2. **`Regard` alibi / co-signer**.
3. **Framing a scapegoat / rival cover**.
4. **Emergency overt Drone/Orbital extraction (`extracted_overt`)**, which saves your life, ends your current cover, raises every observer's derived discovery level to `theorized`, and records permanent `scar_overt_anomaly_extraction` and `scar_persecution_apparatus` (`witch_hunt_police`) scars in `CivilizationLegacyState`.
