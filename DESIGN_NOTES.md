5th Nov 2026

Reassess visual style - it might be better and easier to have a large world if I opt for an animal-crossing/final fantasy 7 style - 3rd person, fixed camera angle, Fixed-Orientation Tracking Camera. That might let us have much larger outdoors and indoors spaces, many more characters and a more sandbox feel. However that must be traded off against the intended seriousness of the subject matter and intended dark(ish) art style - ie can we preserve that whilst simultaneously improving our development and world building potential?

Tech notes:

Logs. Every single possible event, player initiated or not, npc initiated, system initiated etc etc, needs to be logged, per play session, with absolute timestamps and time-since-session-start. Needs to have actor and actee (or other proper term) , plus everything that occurred in that action. Can be either info, warning, error or crash logs. use industry standard for this.

I would also want any ai actions to be logged, both input and output, and, preferably, any reasoning.

Make a debug agent skill to help with accessing all the logs, and tracing and fixing problems

Saved per session, but only keep the latest Session - we need some way to compact previous session logs. In fact even current session logs probably need rolling compaction after a certain time window.

I also want a debug mode where current state and info is displayed over targeted items. Also I should be able to pause, including ticks, and de-anchor so I can move around and inspect things.

Also save functionality and load functionality from a choice of multiple sessions.

World mechanics:

Change the "rival operatives" concept to "rival operatives from other spacefaring races" and we need to make sure that their effects propagate and interact with the players, the player being made aware of same through various direct and indirect ways

The concept of groundside funds, both legitimately gained via role and politics, and illegitimately gained via manufacture and insertion from orbit. Use of Illegitimate carries risk, both for discovery and also disrupting local economy, making it harder for players chosen civ to advance

A more or less clear and useful overview of the wider world, using news items, correspondence, overheard rumours, direct questioning, and ship abilities. Can be used to track the propagation of player effect throughout wider world, as well as, in certain emergencies or uses of abilities, to target non-visible areas eg to rain on advancing armies. Can also be used to glean clues as to potentially rival operatives. The players overview might be ablento be sabotaged/misled by rivals, and vice versa

The player needs to manage their own place in the world. An era-appropriate set of roles, each achievable via various internecine pathways, not necessarily guaranteed or on-rails either, the attainment of which has a large set of both unique and overlapping effects on the games mechanics. This should probably be left open to the concept of advancement, and things to acheive that, within a given role in the future - eg military officer rank, corporate rank etc. This provides access to legitimate funds for groundside operations.

An async "messaging" feature, with the appropriate mechanics of the age - letter writing with horse messengers, mechanised delivery, email (with attendant lag times) - to non-visible but fully interactive and core npcs, which can effect events out of sight, repercussions propagating back to visible world. We could put some time sensitive things in eg write to the pope to prevent the inquisitor from excommunicating another character etc etc. Remember correspondent may or may not do as player intended, based on base state and current live state that effects them. They may even produce an undesired result. This could be tied in with the concept of the player having an office or chambers as dictated by their role.

An "emergency state" mechanic, whereby non-related character traits are paused, and a new set of traits, reactions, rumors, and outcomes become live. User is warned of state, and in fact may have deliberately or indirectly made it happen - it is not necessarily a bad thing. But they must resolve emergency in one way or another before normal play resumes. Effects of outcomes are interpolated with normal play mechanics.

"Inertia weighting", or difficulty of influencing certain people or events, requiring more or less prior info, complicated actions etc etc, effected by various other factors too, like role, discovery risk/current state, etc etc

The assumption being it's easier to build in all these things earlier rather than later, but we really need to make sure these are added and managed in the most decoupled way possible so as not to make it hard to add/remove/modify

Take an example from the last section of brother assassin berserker book - Influence someone to become a religious martyr, but it must be done in the correct way, and no one of their followers must be persuaded to take their place, otherwise the character traits of the replacement are enshrined as virtuous, and they may not be compatible with uplifting the civ. The correct martyr values openness and inquisitiveness.
However, if the correct person is martyrd, then the established religion is at odds with those values, and so in the following ages a rift occurs which must be reconciled before a war occurs.

Speaking of wars, if any of the threads produces one, it can be taken advantage of in order to accelerate technological advance, but must be carefully managed in order not to escalate too far and either set civ back or destroy it. Ditto plagues, economic crises, social upheaval etc etc

I'd love to figure out a way to introduce a few long term, slow build, butterfly effect things, that the player slowly is made aware of, indirectly and obscurely at first, by some mechanism, and can choose to attempt to intercede at some point, with increasing "inertia weighting" the later they leave it - perhaps needing to use less subtle and thus more risky methods the further it goes.

An orbital ability to modify weather in certain ways. Could be to boost or damage crops, to effect troop or civilian movement, to reinforce religious points, or may have no effect whatsoever. If used too often or too obviously, should have quite high penalty.

Speaking of orbital mechanics, a basic orbital mechanics concept, so that certain abilities are unavailable when the ship is not above the place where it's needed - that should be viewable in same ui as the abilities.

All of the above, and their sub types, should be easily individually add/remove/update able in code

Put some sass/primness/character into the interactions with ship mind and drone, as per most of the culture novels. Similarly ensure we have attitude/character/individuality in all npcs

---

## Creative Review Enrichments & Multi-Epoch Continuity Architecture (5th Nov 2026)

### Core Rule: Epoch-Agnostic Engine Abstractions with Era-Specific Content Bindings
Every feudal mechanic in Era 1 (*Highglass Hold*) is built on an **epoch-agnostic domain abstraction** with an explicit `lineageId` so that when Era 1 concludes and exports `CivilizationLegacyState`, every institution, role, economic stock, communication backbone, character lineage, and rival alien footprint flows naturally into Era 2 and beyond without hardcoding Era 2's details today:

| Universal Domain Abstraction | Era 1 (*Highglass Hold* — Feudal) Expression | How It Flows into Future Epochs (Without Hardcoding Details Yet) |
|---|---|---|
| **Contested Offices & Pretexts (`OfficeBlueprint`, `institutionalLineageId`)** | *Court Physician*, *Foundry Inspector*, *Prelate's Confessor*, *Master of Coin* + a deniable *Quiet Claim*. Grants socially legal **Pretexts** (`medical_quarantine`, `ideological_censure`, `technical_audit`, `monetary_assay`, `protocol_immunity`). | Each Office carries an `institutionalLineageId` (`lineage_public_health`, `lineage_industrial_standards`, `lineage_orthodoxy`, `lineage_monetary_audit`). How you used/abused the chair in Era 1 mutates the jurisdiction and corruption of its successor institution in the next Epoch (e.g., *Court Physician* -> Sanitary Commission or Bio-Censorate; *Master of Coin* -> Central Bank or Cartel Treasury). |
| **3 Illicit Orbital Insertion Modes (`IllicitInstrumentType`)** | 1. `unbacked_mass_commodity`: *Pure Bullion* (spikes subsistence prices; fails assay because it is *too* pure).<br>2. `forged_fiat_instrument`: *Counterfeit Coin* (low inflation, high treason risk from duplicated die/batch flaws).<br>3. `anachronistic_marvel`: *Impossible Cut Gem* (buys elite favors, warps prestige, creates a permanent **Veil Scar** rumor that rivals track across ages). | The three abstract modes stay identical across all Epochs while their content skin evolves (e.g., Bullion -> Rare Earths / Unregistered Energy; Counterfeit Coin -> Forged Bearer Bonds / Cloned Ledger Hashes; Impossible Gem -> Room-Temp Superconductor / Metamaterial). Anachronistic marvels left behind in Era 1 physically persist as crown/museum relics in later Epochs. |
| **3 Societal Pressure Stocks (`PressureStockType`)** | 1. `subsistence_pressure` (*Grain/Bread*)<br>2. `production_pressure` (*Charcoal/Iron/Herbs*)<br>3. `elite_prestige_pressure` (*Court Gifts/Indulgences*) | Flows continuously as the three macroeconomic gauges of any age (`subsistence`, `production`, `elite_prestige`), carrying forward unresolved structural imbalances or guild grievances. |
| **Inertia as Load-Bearing Pillars (`InertiaPillar[]`)** | Resistance is composed of 3–5 concrete pillars (`Doctrine`, `Constituency`, `Debt`, `Temper`, `Ignorance`) rather than one opaque float. Early in a thread only `Ignorance`/`Debt` stand; late in a thread `Doctrine`/`Constituency` harden, requiring an Emergency or Orbital Miracle. | Pillars are epoch-agnostic. In any era, identifying that two pillars rest on the same person/institution lets a clever player topple both with one Leverage Chain. |
| **The Communications Desk (`ChannelMediumBlueprint`)** | *The Writing Desk* in your Chambers: choice of Stationery (vellum vs liturgic sheet), Seal (official, personal, forged), Courier Tier (runner, insured horse, smuggler), and Enclosures. Replies arrive via Knock at Door, Public Posting First, or Silent Wrong Action. | Uses the universal `MessageTransitQueue`. Crucially, **whoever controls the Glass River Gorge & Highglass Optics at the end of Era 1** (Synod vs Guild Charter vs Military) inherits ownership and censorship control over the next Epoch's faster communication backbone (semaphore/telegraph/network). |
| **Orbital Pass Cycle & Borrowable Time (`OrbitalPassModule`)** | Ship orbits through `zenith`, `horizon`, and `occluded`. Player can spend **Delta (Orbital Indiscretion)** to **Slingshot** (arrive early, lengthening next occlusion) or **Burn** (linger at zenith, leaving a stationary-star omen in the sky). | Orbital mechanics are universal across all Epochs—what changes in later Epochs is the civilization's **Detection Tech Level** (feudal omens/astrologers -> optical telescopes -> radar/telemetry), making high-Delta Burns progressively riskier if Era 1 left high Veil Scars. |
| **Emergencies Charge Interest (`EmergencyStateModule`)** | Pauses routine behaviors while **compounding suppressed vices** behind closed doors (e.g., Castellan hoards tinctures during a plague). Players can deliberately light small emergencies (e.g., a dye-house fire) as a pretext to suspend procedure. | Universal simulation state machine across all Epochs (`plague_triage`, `military_mobilization`, `ideological_trial`, `civic_riot`, `financial_run`, `assassination_lockdown`). |
| **Dual Legacy Ledgers (`MaterialScars` vs `VeilScars`)** | Separate ledgers in `CivilizationLegacyState`: **Material Scars** (famine, oligarchy, warlord guilds, secret guild method) vs **Veil Scars** (miracle-dependent faith, witch-hunt police, unexplainable relics, doctrinal rifts). | Prevents optimizing a single score. Every Epoch transition reads both ledgers to mutate successor factions, starting crises, and how suspiciously the new age views off-world anomalies. |

### The Immortal Culture Trio vs. Era-Bound Covers & Disguises
- **Your Operative**: Persistent Culture identity (**Deme**) across all Epochs, adopting a new era-appropriate groundside cover in each age (Era 1: **Ellin Quell**).
- **The Ship Mind — GCU *I Have Read Your Diary And The Ending Is Fine* ("The Ending")**: Immortal across all Epochs. Theatrical consequentialist of **The Integral** (area under the curve of lives over centuries; non-round probabilities like `0.73`; rates human happiness in "expected bowls of soup").
- **The Companion Drone — *Hesje-Tuom Fohristi* ("The Lamp")**: Immortal across all Epochs, but forced into a new **era-appropriate physical disguise (`droneDisguise`)** in each age that it resents (Era 1: a bronze chapel reliquary lamp on a chain that polishes itself at night if not ordered to stay tarnished; future Epochs: brass surveying instrument / desk ticker / diagnostic unit). Fierce deontologist of **The Particular** (this fever, this unwashed spoon, room smell scored 1–5).
- **Advisory Duels & Omission (`AdvisoryDuel`)**: The Ending and The Lamp argue in your neural lace. Repeatedly freezing one advisor out causes them to sulk and drop an `omissible` clause from their next briefing (recorded in the AI reasoning log). Across Epochs, both remember and weaponize your past Era 1 sacrifices in their arguments.

### Three Competing Spacefaring Civilizations (Multi-Epoch Theses)
1. **The Tithe (*Predatory Hegemonists*)**: Believe civilizations are forged through administered suffering and hierarchy. *Tells*: Vocabulary cluster `earn / deserve / soft / cull`; spoofed news items always use **clean round numbers** (`100 dead`).
2. **The Quiet (*Zealous Ascetics*)**: Believe surplus consciousness and ambition are a stain; want a static, incurious world. *Tells*: **Agentless passive voice** (*"It was decided"*); missing paragraphs; **deleted rumor slots** on the Wider World Overview.
3. **House Reciprocal (*Bureaucratic Mercantilists*)**: Want the civilization to advance—so every discovery arrives pre-licensed as a debt monopoly. *Tells*: **Double-entry speech** (*"in consideration of"* applied to burials/pardons); overview rumors arriving **faster than era transit allows**.
- Whichever rival thesis gains ground in Era 1 exports its footprint into `CivilizationLegacyState`, evolving into an entrenched ideological or corporate pathology in the next Epoch.

### Era 1 Setting: Highglass Hold & The 4 Braided Butterfly Threads
- **Highglass Hold**: Perched above the **Glass River Gorge** beneath the lightning-struck **Calder Spines**, where volcanic obsidian and fulgurite ("Highglass") are ground into signal lenses and Synod relic beads. Four distant powers pull at the crossing: **The Synod of Unbroken Sight** (*See of Cinder Crest*), **The Iron Marches**, **The Free Port of Brackwell**, and **The Low Fen Confederation** (plus the absentee **Sovereign's Winter Court**).
- **Groundside Cast (`lineageId` persistent across Epochs)**:
  - **Sorrel** (candle-clerk & keeper of the dead; steals wax to read sealed letters; the open-minded martyr candidate) & her charismatic, spectacle-loving assistant **Pell** (the dangerous substitute martyr).
  - **Vane** (steward of the keys; rewrites courtiers' sentences at night to preserve dignity; smells bullion inflation in the weight of bread).
  - **Orin** (serjeant of the muddy gate; writes letters to a brother nine years dead; gentle and fast in emergencies).
  - **Mara** (master of the nail-guild; leaves one bad nail in every keg; adopts new alloys overnight but hoards credit—risking a `secret_guild_method` legacy scar).
- **Braided Butterfly Threads**:
  - **Thread A (*The Third Moon Falls*)**: Storm-glass liturgy vs. meteorology/optics and flood-gate timers.
  - **Thread B (*The Open Martyr / The Eager Successor*)**: Guiding Sorrel's inquiry vs. Pell's spectacle without letting the Synod or a rival crown the wrong saint.
  - **Thread C (*Legion Debt / The Toll War*)**: Surfing a localized gorge war for surgery/metallurgy with strict **Dual-Use Ceilings** before it tips into `warlord_guild_state`.
  - **Thread D (*The Fen Cough / Scapegoat Geometry*)**: Quarantine and parish statistics vs. purifying fires.

### Visual & UI Direction (60 FPS on 2019 Intel Mac)
- **Stage-Paint Chiaroscuro**: Shared stepped toon/chiaroscuro ramp with deep blue-gray (`#1a1f28`) shadows, `-30%` desaturated stone/mud/iron palettes, warm `#c4a574` torch/forge pools, exponential distance fog tied to weather/emergency state, and alpha-cone god-rays.
- **Volume-Aware Tracking Camera (`CameraVolumeBlueprint`)**: Critically damped spring blending between wide courtyard framing, doorway chokes, and cramped interiors, with subtle tilts on Emergencies and Zenith passes, plus instant 40%-desaturated Free-Cam De-Anchor in `F3` Debug Mode.
- **Diegetic UI Bifurcation**: Tactile era-appropriate surface (Era 1: parchment broadsheets, smeared ink, wax seals, linen maps; evolving in future Epochs to newsprint/telegraph tape/CRT) contrasted against the **Sub-Retinal Culture Neural Lace** (razor-thin cyan-white vector arcs, inertia rings, orbital pass windows, and rival spoof conflicts).

### Lightweight AI & NLP Evaluation Testing Framework (Changes 06–08)
- When implementing the AI-related changes (`06-utility-ai-rivals-and-wider-world`, `07-tactical-dialogue-and-voices`, and `08-local-onnx-hybrid-intent`), include a lightweight local **Eval Testing Framework (`eval/` / `npm run eval:ai`)**:
  - **Utility & Rival AI Scenario Evals (Change 06)**: Golden world-state fixtures verifying that NPC utility brains and rival operatives select sensible, non-thrashing goals and respect Inertia Pillars across multi-tick rollouts.
  - **Voice Register & Anti-LLM-Slop Evals (Change 07)**: Golden dialogue and `AdvisoryDuel` fixtures verifying banned-lemma compliance, cadence rules, and clause-omission behavior.
  - **Hybrid NLP & ONNX Intent Evals (Change 08)**: Golden dataset of free-text player inputs (testing negation polarity like *"Do NOT tell the Prelate"*, subject/object role inversion, oblique phrasing, and rival linguistic tells) measuring top-1/top-3 intent/topic accuracy and `<50ms` per-query latency on the 2019 Intel Mac.
