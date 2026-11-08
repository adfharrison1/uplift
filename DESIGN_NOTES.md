# Uplift Design Notes

This file is the design home. It is a direction with room to add and modify, not a frozen spec (P5). The sections below the frame are dated and keep their original order. Planned behaviour carries a `(planned: <change id>)` mark. Change ids live in this file and under `openspec/` only.

## Pillars

Owner pillars stated during the 2026-11-08 root-and-branch review. Everything below is read against them.

- **P1.** The engine, modules, content objects and 3D render UI are built as a strong, decoupled, epoch-agnostic framework. The owner and an agent can then add detail and colour collaboratively as they go. The underlying tech and mechanics in the design notes are wanted. Some rules should still be set early enough to guide how the architecture evolves.
- **P2.** There is no free-text player input. A large share of the surfaced text should come from local SLM / Hugging Face generation, not hand-crafted lines. The owner is happy to get help with authoring.
- **P3.** Each epoch has a new operative with their own new Ship and Drone crew, because that is how the Culture works. The new crew, and the loss of the previous one, are part of the fun.
- **P4.** Some feedback is meant to be indirect: the player pieces together related events, NPC behaviour and world outcomes.
- **P5.** Everything the review settles stays open to later change. Core model, rules spine and roadmap order are a direction with room to add and modify, not a frozen spec.
- **De-weighted:** scale versus solo-developer time, and the number of review gates.

## Where facts live

One owner per duplicated fact. Other files point at the owner and do not restate the fact.

| Fact | Owner |
| --- | --- |
| Epoch ladder (default 7-epoch arc) | Section 4 of this file (no epoch-ladder blueprint exists in code yet) |
| Dependency versions | `package.json` and `.nvmrc` only |
| Verify steps and budget | `package.json` scripts; one sentence in the `AGENTS.md` Quick Verify |
| Layer rules | root `AGENTS.md` plus `tests/architecture` |
| Roadmap order and `depends_on` | `openspec/roadmap.yaml` |
| Review gates | the `uplift-review-gates` skill (planned: process-gates-and-ledger) |
| Engine counts such as the 7-epoch default arc | asserted by the docs-truth test against code constants (planned: process-gates-and-ledger) |

## Status index

Each section is `shipped`, `partial` or `planned`, with the roadmap ids that own the unshipped part. Heading markers inside the sections are written section by section as each is checked against code. This table is the only place the full set is listed.

| Section | Status | Roadmap id |
| --- | --- | --- |
| Core Rule: epoch-agnostic abstractions (5 Nov) | shipped | `03-modular-registries-and-kinematics` |
| Generational Operatives & the Culture Advisory Pair | partial | `10-crew-handoff`, `10-registry-swap-and-legacy` |
| Competing Spacefaring Civilizations | partial | `06-rivals-remote-evidence` |
| Illustrative Seed Exemplars & Tone Benchmarks | planned | `11-epoch1-content` |
| Visual & UI Direction, Stage Lab, DOM inspection | shipped | `04-third-person-camera-and-inspector` |
| Lightweight AI & NLP Evaluation Framework | planned | `05f-eval-and-replay` |
| Human-Paced NPC Cognition & Anti-Thundering-Herd | partial | `06-utility-ai` |
| Sound Design, Gameplay Acoustics & Sound Lab | planned | `audio-minimal`, `05a-audio-engine`, `05a-sound-lab` |
| 0. Campaign Pacing, 4-Clock Hierarchy, Curve Envelopes | planned | `05b-1-watch-clock-and-time-spend`, `05b-2-envelopes-and-gates`, `05b-2-storylets-and-lab` |
| 1. Interpersonal `Regard` Web & Romantasy | planned | `06a-interpersonal-regard-and-romantasy` |
| 2. Assassination & Cover Persecution | planned | `06b-assassination-and-cover-persecution` |
| 3. Orbital Blackout, Doomsday Clocks, Scheduler | planned | `09a-doomsday-clocks-and-rival-unveiling` |
| 4. N-Epoch Ladder, Operative Rotation, Extraction Stills | partial | `10-registry-swap-and-legacy` |
| 5. Epoch 2+ Fast-Travel Vignettes | planned | `06c-epoch-travel-vignettes` |
| 6. Play Shell | shipped | `05c-play-shell` |
| 7. Direct Floor Locomotion | planned | `05d-input-and-control-frame`, `05d-locomotion-footprint`, `05d-arrival-hold-readability` |
| 8. Proximity Use and Menu Grammar | planned | `05e-modal-stack-use-and-menu`, `05e-settings-model` |
| 9. Conversation Text Bubbles, No Voice Acting | planned | `07-bubble-lace-skins-and-tone-blips` |
| 10. Conversation Paging and Ambient Lines | planned | `07-dialogue-paging` |
| 10a to 10e. Interruption, Pretext, Fund, Duel, Voice Register | planned | `07a-dialogue-interruption` to `07e-voice-register-evals` |
| 11. Local AI Eval Framework | planned | `05f-eval-and-replay` |
| Engineering rules | planned | `hx-ops-safety` |
| Rules spine R1 to R8 | partial (rules written here, R8 open; enforcing tests to be written by the owning changes) | `docs-spine-and-roadmap` |
| Core model: seven primitives | planned | `05b-1-watch-clock-and-time-spend`, `cm-act-envelope-and-rolls`, `cm-observation-notebook`, `cm-presence-and-materialize`, `cm-threads-and-pillars`, `cm-ledger-and-emergency`, `07-text-port-and-history` |
| Leverage Chain | planned | `cm-threads-and-pillars` |
| System graph | planned | `docs-spine-and-roadmap` |
| Loop cycles: minute, session and epoch | planned | `05b-1-watch-clock-and-time-spend`, `07-dialogue-paging` |

A "Minimal audio" section (footsteps by surface, doors, menu sounds, murmur on a provisional audibility-tier table) is written by `docs-spine-and-roadmap`; its change is `audio-minimal` (planned), directly after `05e-settings-model`. Per-NPC tone blips ride with `07-bubble-lace-skins-and-tone-blips`, not with it.

### Open, deferred and parked

Explicit open items, one line each. No content is written for them yet. Each parked spike has a parked entry in `openspec/roadmap.yaml` with a revisit trigger.

- **Onboarding / first-10-minutes design (S1-R8)**: deferred by the owner. "Owner isn't ready for this yet. Revisit later."
- **Epoch 1 as the definition of done, with its own ending (R8)**: open. "Open; owner didn't address it." Parked entry `epoch1-definition-of-done`.
- **Text-only advisor / writing prototype (R5)**: open. Becomes a generation-quality prototype under P2 (`08a-timing-spike`).
- **Authored quality-gated storylet cards versus generated cards (route RC/R7, finding S2-08)**: resolved by the authored/generated split and the hybrid pipeline. Only the storylet-card question is left to the storyteller change (`05b-2-storylets-and-lab`).
- **Save policy (S1-R5, owner decision)**: autosave at watch boundaries plus named manual saves. Loading any earlier save is allowed; the owner wants rollback. The notebook (the player's Observations) is part of the save, so loading restores the knowledge state of that moment. Deterministic keyed rolls (`roll(worldSeed, streamKey, counter)`) mean a reload does not reroll random outcomes unless the player acts differently. An optional ironman mode is parked (`ironman-mode`). Gate before `cm-observation-notebook`.
- **GPU profile (slice 5)**: open.
- **Parked spikes**: small fine-tuned classifier for line selection (`classifier-spike`), runtime reranker (`rc2-runtime-reranker`), compiler-API import scanning (`compiler-api-import-scan`), typed ESLint (attach to the first async-port change), INV-D Bayesian network (`inv-d-bayesian-network`), INV-F exact-inference network (`inv-f-exact-inference`).

#### Ideas, not scheduled

- **Past advisors in later epochs**: owner's addition. Past advisors occasionally appear with help or notes over the Culture's galactic network. Design-note candidate only (parked entry `past-advisor-cameo`).

## Rules spine

Eight architecture-constraining rules, R1 to R8, set early so they can guide how the architecture evolves (S1-R1, S2-17). Owner: accepts the 8-rule rules spine, leaving room to modify. Every rule below is revisable under P5, so each is a direction and not a frozen spec. Each paragraph gives the rule, its status, and the test or lint that enforces it (or "to be written", with the change that writes it). No rule is enforced by a test yet. Rule numbers here are R1 to R8 only; the review's slice-1 route RC/R7 (authored storylet cards) is a different label.

| Rule | Subject | Status |
| --- | --- | --- |
| R1 | One watch clock | planned |
| R2 | Actor and cause on every effect | planned |
| R3 | Thread structure (stages; one spine thread in `crisis_fuse`) | planned |
| R4 | Discovery has a referent and an observer | planned |
| R5 | Emergency cardinality and fuse | planned |
| R6 | Reject instead of throw | planned |
| R7 | Resource ledger | planned |
| R8 | Epoch-end reads both ledgers and the Observation table | open |

- **R1 One watch clock** (planned: 05b-1-watch-clock-and-time-spend). Campaign time is `elapsedWatches`, advanced only by `advance_watches`. `worldTick` is an effect serial and never time, scars record the watch, and every `*Ticks` field is renamed `*Watches` while it has no users. The decision record is in section 0. Enforced by a domain test that no blueprint field is named `*Ticks` and that scars carry a watch (to be written).
- **R2 Actor and cause on every effect** (planned: cm-act-envelope-and-rolls). An effect travels in an envelope `{ effect, actorId?, causeActId? }`, a finished dwell commits an Act, and a behaviour returns `WorldEffect[]`. Selection logic stays in `06-utility-ai`. Enforced by a reducer test that an effect from a behaviour commit carries `causeActId` (to be written).
- **R3 Thread structure** (planned: cm-threads-and-pillars). A thread is a state machine over `omen -> simmer -> institutional_friction -> crisis_fuse -> resolution`, held in a `ThreadRuntime` slice, with at most one spine thread in `crisis_fuse` at a time. Its inertia is derived from its pillars (see Leverage Chain). Enforced by a `ThreadRuntime` transition test (to be written).
- **R4 Discovery has a referent and an observer** (planned: cm-observation-notebook). Discovery is tracked per observer as decaying evidence in the Observation table, and the global `discoveryLayer` becomes a derived view, with `set_discovery_layer` kept as a shim. Enforced by an eval that a rival strike needs an Observation held by that rival (to be written).
- **R5 Emergency cardinality and fuse** (planned: cm-ledger-and-emergency for the runtime, 09-emergency-fuse for the fuse). `EmergencyRuntime` carries a `scope` and may hold more than one emergency; compounding applies to the scoped group. The fuse is later and is not pulled into the core step. Enforced by a reducer test that compounding leaves an out-of-scope entity untouched (to be written).
- **R6 Reject instead of throw** (planned: hx-reducer-and-frame-safety). A reducer rejects an effect with a reason code and returns an outcome, and unknown ids behave the same everywhere. The throw survives only as an authoring-time contract test. The shipped reducer still throws today (for example `spend_orbital_delta` on a `burn` outside `zenith`) until that change ships. **Pause and lab, one definition everywhere**: the player pause sets the single domain freeze bit, so time freezes while effects still reduce and return outcomes. Lab mode is a `PlaySession` flag that also holds the bit. Free-cam keys are gated on lab mode. `hx-reducer-and-frame-safety` owns the bit and its acceptance. Enforced by a reducer outcome test and a pause test (to be written).
- **R7 Resource ledger** (planned: cm-ledger-and-emergency). Stipends, funds and pressure stocks are `ResourceLedger` entries. Insertion spends Delta and requires `zenith`, and is rejected otherwise (planned: 09-delta-coupling-and-forecast). Pressure stocks get diegetic tells. Enforced by a ledger reconciliation test (to be written).
- **R8 Epoch-end reads both ledgers and the Observation table** (status: open). The ending reads `materialScars` and `veilScars` and the Observation table. What counts as a finished Epoch 1 is open (see Open items): the owner has not addressed it, and no definition of done is written.

**Standing rule: freeze extension (planned: pre-05b-launch-validation).** No new kind or effect without content that uses it. Settle the clock model before more time-bearing schema. No deletion. A test in the kind-table change guards it, not prose.

### Player loop (minimal)
Owner: keep building the engine, but set a minimal rules spine early so it can guide the architecture. The vertical slice tests the engine; it does not replace engine work. Don't write everything up front. So this entry carries only the fields the owner named, and each is a pointer or a one-line statement that later work may revise:

- **Mission**: a covert Special Circumstances operative steers a developing civilization through the epoch without the world learning an off-world hand is at work.
- **Verbs per thread**: not yet defined; revisable (P5). The one verb the spine fixes is `weaken_support` on a pillar (see Leverage Chain).
- **Win and fail shape**: not yet defined; revisable (P5). See R8 (open).
- **Epoch-end evaluation**: rule R8 (open).
- **Leverage Chain definition**: see the Leverage Chain section.


## Creative Review Enrichments & Multi-Epoch Continuity Architecture (5th Nov 2026)

### Core Rule: Epoch-Agnostic Engine Abstractions with Era-Specific Content Bindings
- **Terminology (`Epoch === Era`) & Configurable $N$-Epoch Ladder (`EpochProfileBlueprint[]`)**:
  - Throughout **Uplift**, **`Epoch` and `Era` are 100% synonymous** (`Epoch 1 === Era 1`). Code and schemas use `epochId`.
  - The **7-Epoch / 7-Era Grand Civilizational Arc** (`1. Feudal -> 2. Renaissance -> 3. Pre-Industrial/Colonial -> 4. Industrial/WWI -> 5. Cold-War -> 6. Computer-Age -> 7. Space-Age/1st-Contact`) is the **default data-driven campaign ladder**, **never a hardcoded engine constant**. The engine accepts any ordered array of `EpochProfileBlueprint[]` ($N \ge 1$, where the final entry has `isTerminalEpoch: true`), so Epochs can be added, removed, split, or reordered in content configuration at any time without structural rework.
- Every mechanic in Epoch 1 / Era 1 (*Highglass Hold*) is built on an **epoch-agnostic domain abstraction** with an explicit `lineageId` so that when an Epoch concludes and exports `CivilizationLegacyState`, every institution, office, economic stock, communication backbone, character lineage, and rival alien footprint flows naturally into the next Epoch:

| Universal Domain Abstraction | Epoch 1 / Era 1 (*Highglass Hold* — Feudal) Expression | How It Flows Across the Configurable $N$-Epoch Ladder |
|---|---|---|
| **Contested Offices & Pretexts (`OfficeBlueprint`, `institutionalLineageId`)** | *Court Physician*, *Foundry Inspector*, *Prelate's Confessor*, *Master of Coin* + a deniable *Quiet Claim*. Grants socially legal **Pretexts** (`medical_quarantine`, `ideological_censure`, `technical_audit`, `monetary_assay`, `protocol_immunity`). | Each Office carries an `institutionalLineageId` (`lineage_public_health`, `lineage_industrial_standards`, `lineage_orthodoxy`, `lineage_monetary_audit`). How you used/abused the chair in Epoch $k$ mutates the jurisdiction and corruption of its successor institution in Epoch $k+1$ (e.g., *Court Physician* -> Renaissance Anatomist Guild -> Colonial Quarantine Board -> Industrial Sanitary Commission -> Cold-War Bio-Directorate). |
| **3 Illicit Orbital Insertion Modes (`IllicitInstrumentType`)** | 1. `unbacked_mass_commodity`: *Pure Bullion* (spikes subsistence prices; fails assay because it is *too* pure).<br>2. `forged_fiat_instrument`: *Counterfeit Coin* (low inflation, high treason risk from duplicated die/batch flaws).<br>3. `anachronistic_marvel`: *Impossible Cut Gem* (buys elite favors, warps prestige, creates a permanent **Veil Scar** rumor that rivals track across ages). | The three abstract modes stay identical across all configured Epochs while their content skin evolves per rung (e.g., Bullion -> Crucible Ingots / Strategic Ore / Unregistered Energy; Counterfeit Coin -> Forged Letters of Credit / Bearer Bonds / Cloned Ledger Hashes; Impossible Gem -> Achromatic Lens / Precision Chronometer / Room-Temp Superconductor). Anachronistic marvels left behind physically persist as crown/museum relics in later Epochs. |
| **3 Societal Pressure Stocks (`PressureStockType`)** | 1. `subsistence_pressure` (*Grain/Bread*)<br>2. `production_pressure` (*Charcoal/Iron/Herbs*)<br>3. `elite_prestige_pressure` (*Court Gifts/Indulgences*) | Flows continuously as the three macroeconomic gauges of any age (`subsistence`, `production`, `elite_prestige`), carrying forward unresolved structural imbalances or guild grievances. |
| **Inertia as Load-Bearing Pillars (`InertiaPillar[]`)** | Resistance is composed of 3–5 concrete pillars (`Doctrine`, `Constituency`, `Debt`, `Temper`, `Ignorance`) rather than one opaque float. Early in a thread only `Ignorance`/`Debt` stand; late in a thread `Doctrine`/`Constituency` harden, requiring an Emergency or Orbital Miracle. | Pillars are epoch-agnostic. In any era, identifying that two pillars rest on the same person/institution lets a clever player topple both with one Leverage Chain, defined under "Leverage Chain" below (planned: cm-threads-and-pillars). |
| **The Communications Desk (`ChannelMediumBlueprint`)** | *The Writing Desk* in your Chambers: choice of Stationery (vellum vs liturgic sheet), Seal (official, personal, forged), Courier Tier (runner, insured horse, smuggler), and Enclosures. Replies arrive via Knock at Door, Public Posting First, or Silent Wrong Action. | Uses the universal `MessageTransitQueue` (`Change 06`). Crucially, **whoever controls the Glass River Gorge & Highglass Optics at the end of Epoch 1** (Synod vs Guild Charter vs Military) inherits ownership and censorship control over each subsequent Epoch's faster communication backbone (horse courier -> printed post -> optical semaphore -> telegraph wire -> radio/CRT -> digital network/email). |
| **Orbital Pass Cycle & Borrowable Time (`OrbitalPassBlueprint`)** | Ship orbits through `zenith`, `horizon`, and `occluded`. Player can spend **Delta (Orbital Indiscretion)** to **Slingshot** (arrive early, lengthening next occlusion) or **Burn** (linger at zenith, leaving a stationary-star omen in the sky). | Orbital mechanics are universal across all Epochs—what changes in later Epochs is the civilization's **Detection Tech Level** (`0..1`: naked-eye omens/astrologers -> Renaissance lenses -> Colonial observatories -> Industrial telegraph geomagnetism -> Cold-War radar -> Computer/Space-Age orbital telemetry), making high-Delta Burns progressively riskier if earlier Epochs left high Veil Scars. |
| **Emergencies Charge Interest (`EmergencyStateBlueprint`)** | Pauses routine behaviors while **compounding suppressed vices** behind closed doors (e.g., Castellan hoards tinctures during a plague). Players can deliberately light small emergencies (e.g., a dye-house fire) as a pretext to suspend procedure. Cardinality and fuse are a rule (R5): an `EmergencyRuntime` carries a `scope`, and compounding applies to the scoped group, not to everyone. The fuse is later (planned: 09-emergency-fuse), not pulled forward into the threads-and-ledger core step (planned: cm-ledger-and-emergency). | Universal simulation state machine across all Epochs (`plague_triage`, `military_mobilization`, `ideological_trial`, `civic_riot`, `financial_run`, `assassination_lockdown`). |
| **Dual Legacy Ledgers (`materialScars` vs `veilScars`)** | Separate ledgers in `CivilizationLegacyState` (`InheritedScar[]`): **Material Scars** (famine, oligarchy, warlord guilds, secret guild method) vs **Veil Scars** (miracle-dependent faith, witch-hunt police, unexplainable relics, doctrinal rifts). | Prevents optimizing a single score. Every Epoch transition reads both ledgers to mutate successor factions, starting crises, and how suspiciously the new age views off-world anomalies. |

### Core model: seven primitives (planned, revisable)
Owner: accepts the 7-primitive core model and the corrected order in the roadmap, leaving plenty of room to add and modify. Only this file carries it. Each section `AGENTS.md` and `README.md` pair adds a primitive in the change that ships it. Nothing below exists in code yet except as named.

1. **Watch clock** (planned: 05b-1-watch-clock-and-time-spend): `elapsedWatches` on `WorldState` and one `advance_watches` effect. See the clock decision record in section 0.
2. **Act** (planned: cm-act-envelope-and-rolls): a single ground-truth event `{ id, actorId, verb, objectRef, motiveTag, spaceId, watch, perceptibility }` kept in a bounded ring slice. Effects carry an optional `causeActId` through a wrapper envelope `{ effect, actorId?, causeActId? }`, so the existing effect variants are untouched.
3. **Observation** (planned: cm-observation-notebook): one sparse "who learned what" table that merges Report, Trace and Belief. A row is `{ actId | claimId, holderId, channelId, strength, confidence, learnedWatch, hops, spoofSignature? }`. A Report is an Observation with channel latency. A Trace is an Observation held by a faction, and it decays. A Belief is an Observation held by an entity that carries a Claim. The player notebook is the player's Observations. Discovery layers become a view derived from this table.
4. **Presence function** (planned: cm-presence-and-materialize): a pure `(entityId, watch, seed) -> placement`, materialized when the player enters a room or spends a watch. Entities start off-stage.
5. **`ThreadRuntime`, `ResourceLedger` and `EmergencyRuntime`** (planned: cm-threads-and-pillars, cm-ledger-and-emergency): ordinary `StateSlice`s registered by packs. Thresholds and profiles live in blueprints.
6. **`LineBrief` and `gate(line, brief)`** (planned: 07-text-port-and-history): pure functions that read Observations.
7. **`TextSourcePort`** (planned: 07-text-port-and-history): an application port with authored, pool and generated adapters. Shown text is frozen into `ConversationHistory` and the save.

Storage stays bounded: Tier 3 holds nothing, Tier 2 holds data on demand, and epoch end compacts into scars. A performance prerequisite sits in front of the Act and Observation slices: the slice store deep-clones on every read and write, so large slices need structural sharing or writes batched per watch first.

### Leverage Chain (planned: cm-threads-and-pillars)
Pillars gain `bearsOnThreadId` and `supportedBy` (the persons or institutions a pillar rests on). Thread inertia is derived from its pillars rather than stored as one float. A Leverage Chain is a derived query over shared supporters: two pillars that rest on the same supporter form a chain, so weakening that one supporter topples both. The player verb is `weaken_support`. The shipped `InertiaPillar` carries only `id`, `kind`, `weight` and `holderEntityId`; the extension is additive.

### System graph (planned: docs-spine-and-roadmap)
Who writes and who reads each part of the economy and threat state today. Drafted from `raw/S2-system-graph.json` in the root-and-branch review and audited against code (12 of 14 rows accurate as drafted, 2 incomplete and fixed here). Everything funnels through five hubs that do not exist yet: the watch clock, the Regard graph, thread runtime state, office/pretext/funds runtime state, and actor/provenance on effects. The reducer cases below are leaves hanging off hubs that are not there. The graph is the dependency spine: the hubs are built before any further leaf effect. Status is `schema`, `reducer`, `consumed` or `nothing`; "no dispatcher" means nothing in `src` emits the effect.

| Node | Writers | Readers | Status and gap |
| --- | --- | --- | --- |
| `pressureStocks` (3 scalars) | `adjust_pressure_stock`, `insert_illicit_instrument` (reducer only, no dispatcher) | snapshot and save serialisation only; the design wants storylets, travel cues, absorption friction, epoch export | reducer. No real writer, no real reader, no decay. |
| `discoveryLayer` (1 global ordinal) | `insert_illicit_instrument` (ratchet via `maxDiscoveryLayer`), `set_discovery_layer` (raw setter that can also lower it) | nothing; the design wants rival strike (`attributed` or higher), `extracted_overt`, trial | reducer. No reader and no referent (discovered by whom?). |
| illicit instruments (3 modes) | nobody (no player action, no office, no Delta cost) | the reducer case that fans out to stock, layer and scar | reducer. No writer, no cost, not tied to the orbital pass. Only the schema and the reducer reference it. |
| `activeEmergencyId` (1 slot) | `trigger_emergency`, `resolve_emergency` (no dispatcher) | `RenderFrameBuilder` camera fog, roll and pitch (the only real consumer in the economy graph); `compound_emergency_vices`; the coordinator uses the effects for a telemetry category | consumed cosmetically. No writer; `fuseTicks` has no state to count in; no behaviour reads it. |
| `drives` / `emergencyVice` | `compound_emergency_vices` (all entities, same delta) | registry validation (`emergencyVice` must be in `drives`), the render-frame copy, and the reducer's own read; no utility AI reads them | reducer. The utility AI is unbuilt. |
| `inertiaPillars` (per entity) | `collapse_inertia_pillar` (delete only) | registry validation and the seeding copy only | schema and reducer. No adder, no hardening writer, no reader, not linked to any thread; the starter pack authors empty arrays. |
| `orbitalPass` (phase, delta, burn) | `advance_orbital_pass` (the caller supplies the phase; nothing owns the durations), `spend_orbital_delta` (throws on an illegal spend) | `RenderFrameBuilder` burn camera effect only | consumed cosmetically. No clock driver and no gate on any gameplay verb. |
| `recordedLegacyScars` | `record_legacy_scar`, `insert_illicit_instrument` (marvel); neither has a dispatcher, so no scar is written in live play | `SimulationCoordinator.exportLegacyState` into `CivilizationLegacyState` and `applyLegacyToCharacterBlueprints`; `saveToSlot` also calls the export; the browser entry passes a `legacyState` option at startup, so the read side is wired | consumed in code. The only node with a write, read and world-change arc, but nothing writes it and no interface calls the save slots. |
| offices, quiet claims, pretexts | nobody | nobody; no `WorldState` field for office held, pretext available, funds or hooks | schema (blueprint only). No runtime state exists. |
| threads, martyrdom, crises | nobody | nobody; blueprint has one `initialInertia` float | schema. No `ThreadRuntimeState`. |
| correspondence channels | nobody | nobody | schema. No queue state. |
| rivals | nobody | nobody (the design has them read `discoveryLayer`, the orbital phase and the thread lead) | schema. No runtime state. |
| Regard graph | the design says player, NPC, letters and storylets | the design says offices, pillars (`Temper`, `Debt`), correspondence and counter-assassination | nothing. The hub of the graph does not exist. |
| `elapsedWatches` / storyteller | the design says Committed Time-Spend Actions | the design says stipends, fuses, transit, the orbital pass, point-releases and drift | nothing. The hub of the clock graph does not exist. |

### Generational Operatives & The Culture Advisory Pair (`advisor_integral` & `advisor_particular` — Updated 7th Nov 2026)
- **A New Playable Operative Per Epoch**: Rather than a single immortal groundside human across the entire campaign, **each Epoch dispatches a new playable Culture operative** (drawn from or authored in the Epoch's operative pool; e.g., Epoch 1 seed exemplar cover: **Ellin Quell**), arriving ~15–30 years after the previous operative's extraction and choosing whether to **claim kinship (`kin_claim`)** with their predecessor or **start afresh (`fresh_start`)** (see Section 4 below).
- **Left-Ear Ship Mind Slot (`advisor_integral`)**: Consequentialist of **The Integral** (area under the curve of lives across generations; non-round probabilities like `0.73`; rates human happiness in "expected bowls of soup"). Its core *Integral* ethical pole is fixed, while its hull name/callsign (e.g., seed exemplar: GCU *I Have Read Your Diary And The Ending Is Fine* / "The Ending") and personality traits (`humor`, `patience`, `riskTolerance`, `primness`, `omissionSulkThreshold`) are rolled or selected from a curated pool within bounded ranges per Epoch via `SeededRandom`.
- **Right-Ear Companion Drone Slot (`advisor_particular`)**: Fierce deontologist of **The Particular** (single bodies, hygiene, this fever, this unwashed spoon, room smell scored 1–5). Its core *Particular* ethical pole is fixed, while its drone identity (e.g., seed exemplar: *Hesje-Tuom Fohristi* / "The Lamp"), personality traits, and physical disguise (`droneDisguise`) are randomly selected from curated per-Epoch pools of `3–6` era-appropriate items (e.g., Epoch 1 pool: `bronze_reliquary_lamp`, `iron_bullseye_lantern`, `apothecary_censer`).
- **Advisory Duels & Omission (`AdvisoryDuel`)**: `advisor_integral` (Ship Mind) and `advisor_particular` (Companion Drone) argue in your neural lace. Repeatedly freezing one advisor out will cause them to sulk and drop an `omissible` clause from their next briefing (recorded in the AI reasoning log; planned: 07d-advisory-duel-omission), and both will cite your predecessor operatives' past sacrifices from `CivilizationLegacyState` in their arguments. The argument is lace text. There is no voice acting. When the player enters it, or a world event pulls them in, it pages with the keys in section 10. It does not use the NPC bubble.

### Competing Spacefaring Civilizations (Multi-Epoch Rival Theses — Extensible Pool)
Rival operatives belong to competing spacefaring civilizations registered via `RivalCivBlueprint` (the 3 seed archetypes below establish the pattern; additional rival civilizations and operative covers can be registered in content packs):
1. **The Tithe (*Predatory Hegemonists*)**: Believe civilizations are forged through administered suffering and hierarchy. *Tells*: Vocabulary cluster `earn / deserve / soft / cull`; spoofed news items always use **clean round numbers** (`100 dead`).
2. **The Quiet (*Zealous Ascetics*)**: Believe surplus consciousness and ambition are a stain; want a static, incurious world. *Tells*: **Agentless passive voice** (*"It was decided"*); missing paragraphs; **deleted rumor slots** on the Wider World Overview.
3. **House Reciprocal (*Bureaucratic Mercantilists*)**: Want the civilization to advance—so every discovery arrives pre-licensed as a debt monopoly. *Tells*: **Double-entry speech** (*"in consideration of"* applied to burials/pardons); overview rumors arriving **faster than era transit allows**.
- Whichever rival thesis gains ground in an Epoch exports its footprint into `CivilizationLegacyState`, evolving into an entrenched ideological or corporate pathology in the next Epoch.

### Illustrative Seed Exemplars & Tone Benchmarks (Non-Exhaustive — Content Scales to 500+ Characters, Multiple Regions & Many Threads)
> **Important Note for Agents & Content Authors**: All specific locations, characters, ships, drones, and threads named in this document (such as *Highglass Hold*, *Sorrel*, *Pell*, *Vane*, *Orin*, *Mara*, *The Ending*, and *The Lamp*) are **non-exhaustive seed exemplars** that define our writing quality bar and Culture/*Inversions* tone (concrete physical habits, private contradictions, and anti-LLM-slop specificity). Actual Epoch content packs scale across **500+ interactable on-stage and off-stage characters**, multiple settlements/regions, and large pools of spine threads and compositional storylets. Never treat these seed exemplars as a closed list.

- **Epoch 1 Seed Location Exemplar (*Highglass Hold*)**: Perched above the **Glass River Gorge** beneath the lightning-struck **Calder Spines**, where volcanic obsidian and fulgurite ("Highglass") are ground into signal lenses and Synod relic beads, with distant regional powers (*The Synod of Unbroken Sight*, *The Iron Marches*, *The Free Port of Brackwell*, *The Low Fen Confederation*, *The Sovereign's Winter Court*) pulling at the crossing.
- **Seed Groundside Character Exemplars (Demonstrating the Specificity Bar for `CharacterBlueprint`s)**:
  - **Sorrel** (candle-clerk & keeper of the dead; steals wax to read sealed letters; open-minded martyr candidate) & her charismatic, spectacle-loving assistant **Pell** (dangerous substitute martyr).
  - **Vane** (steward of the keys; rewrites courtiers' sentences at night to preserve dignity; smells bullion inflation in the weight of bread).
  - **Orin** (serjeant of the muddy gate; writes letters to a brother nine years dead; gentle and fast in emergencies).
  - **Mara** (master of the nail-guild; leaves one bad nail in every keg; adopts new alloys overnight but hoards credit—risking a `secret_guild_method` legacy scar).
- **Seed Braided Butterfly Thread Exemplars (`TrajectoryThreadBlueprint`s)**:
  - **Thread A (*The Third Moon Falls*)**: Storm-glass liturgy vs. meteorology/optics and flood-gate timers.
  - **Thread B (*The Open Martyr / The Eager Successor*)**: Guiding open inquiry vs. public spectacle without letting orthodoxy or a rival crown the wrong saint.
  - **Thread C (*Legion Debt / The Toll War*)**: Surfing a localized war for surgery/metallurgy with strict **Dual-Use Ceilings** before it tips into `warlord_guild_state`.
  - **Thread D (*The Fen Cough / Scapegoat Geometry*)**: Quarantine and parish statistics vs. purifying fires.

### Visual & UI Direction, Semantic Wall Addressing, Live `F3` Stage Lab & Agent DOM/Browser Inspection (60 FPS on 2019 Intel Mac)
- **Stage-Paint Chiaroscuro**: Shared stepped toon/chiaroscuro ramp with deep blue-gray (`#1a1f28`) shadows, `-30%` desaturated stone/mud/iron palettes, warm `#c4a574` torch/forge pools, exponential distance fog tied to weather/emergency state, and alpha-cone god-rays.
- **Volume-Aware Tracking Camera (`CameraVolumeBlueprint`)**: Critically damped spring blending between wide courtyard framing, doorway chokes, and cramped interiors, with subtle tilts on Emergencies and Zenith passes, plus instant 40%-desaturated Free-Cam De-Anchor in `F3` Debug Mode.
- **Diegetic UI Bifurcation**: Tactile era-appropriate surface (Era 1: parchment broadsheets, smeared ink, wax seals, linen maps; evolving across the 7 Epochs to printed pamphlets, colonial gazettes, telegraph tape/newsprint, Cold-War dossiers/CRT, computer terminals, and space-age telemetry consoles) contrasted against the **Sub-Retinal Culture Neural Lace** (razor-thin cyan-white vector arcs, inertia rings, orbital pass windows, and rival spoof conflicts).
- **3-Layer Encoded Visual Authoring Framework (100% Agent- & UI-Editable, Zero 500MB `.glb` Repo Bloat — Shipped in Change 04)**:
  So that both the human developer and the AI agent can inspect, build, and tweak any visual detail (e.g. *"that wall there needs skulls set in it"*), all 3D sets are encoded as structured JSON/TypeScript across three layers (`src/application/rendering/SceneVisualBlueprints.ts`, starter content in `src/content/scene/defaultStageContent.ts`, and disk bridge JSON persistence in `src/content/scene/stages/*.json` & `src/content/scene/characters/*.json`):
  1. **Layer 1 — `EpochVisualTheme`**: Defines material palettes (`stoneColorHex`, `mudColorHex`, `ironColorHex`, `woodColorHex`), `#1a1f28` shadow tint, `#c4a574` torch warm tint, directional key-light vector, desaturation, grime intensity, and exponential fog parameters.
  2. **Layer 2 — Declarative `StageSceneBlueprint` with Semantic Addressing**: Defines room footprints, heights, compass `wallSegments` (`north`, `south`, `east`, `west`, `wall | alcove`, `seg_01`, `seg_02`...), `props` (`StagePropVisualBlueprint` with `isPortal`), `lights` (`StageLightBlueprint`), and `cameraVolumes` (`CameraVolumeBlueprint`). Every generated mesh carries a deterministic **`semanticId`** in `mesh.userData.semanticId` (e.g., `charnel_stairs.wall.north.seg_02` or `charnel_stairs.alcove.east.arch_01`).
  3. **Layer 3 — Parametric Motif & Character Kitbash Builders (`src/interfaces/three/StageKitbashBuilders.ts`, `ChiaroscuroStageRenderer.ts`)**:
     - **Architecture & Props (`buildWallMotifGroup`, `buildStagePropGroup`)**: Reusable procedural geometry builders (`ossuary_skull_niche`, `lancet_window`, `buttress_rib`, `fulgurite_lens_sconce`, `guild_anvil_rack`, `torch_sconce` plus open-identifier fallback geometry) attached to any wall segment by `semanticId` (`motifs: [{ id: 'ossuary_skull_niche', count: 24, recessDepth: 0.25, columns: 6 }]`).
     - **Character Visuals, Posture & Wardrobe (`CharacterVisualBlueprint`, `buildCharacterKitbashGroup`)**: Keyed by `characterId` / `lineageId` (joining cleanly to `CharacterBlueprint` from Change 03 with zero 3D leaks in `domain`). Encodes silhouette-first low-poly parameters: **Proportions & Posture** (`heightScale`, `shoulderWidth`, `spinePitchRadians` e.g. stooped clerk vs. upright serjeant, `gaitStyle`), open-identifier **Modular Garment & Prop Slots** (`headgear`, `cloak`, `heldPropLeft`, `heldPropRight`), **Palette & Hem Grime** (`mudLevel`, `sootLevel`), and *The Lamp's* era-specific `droneDisguise` mesh. Across Epochs, `resolveCharacterVisualForTheme` rebinds `lineageId` successors to the new `EpochVisualTheme`.
- **How We Know "Which Wall or Character?" — In-Game `F3` Stage & Wardrobe Lab + Agent DOM / Browser Inspection (`StageInspectorDomMirror.ts`)**:
  - **In-Game `F3` Stage, Lighting & Character Wardrobe Inspector**: Selecting any wall segment, floor, prop, light, or character part in the 3D viewport highlights that target (`charnel_stairs.wall.north.seg_02` or `npc.sorrel.part.headgear`), provides pure Zod-validated mutators to tweak wall `motifs[]`, character posture/garments/held props/colors, light intensity/color/falloff, fog density, and camera volume pitch/FOV, and persists edits via **"Save to Disk"** (`GET`/`PUT /api/scene-blueprints/:stageId` and `GET`/`PUT /api/character-visuals/:characterId` in `localDiskBridgePlugin.ts`). Interim caveat: until the loader exists (planned: pre-05b-pack-source-of-truth), a stage-lab save does not persist into the game. The same caveat holds for Save Patch to Disk in the Sound Lab. Lab JSON is then the source of truth: packs and stages are JSON, loaded and Zod-checked at runtime through `validateLaunch`, with no emitted TS.
  - **Agent DOM Mirror & Live Browser Inspection (`cursor-ide-browser` MCP + DOM Attributes)**: Because a raw WebGL `<canvas>` is opaque to standard DOM inspection, `StageInspectorDomMirror` mirrors `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, and `data-camera-mode` plus `globalThis.__UPLIFT_STAGE_INSPECTOR__` (with `inspectableTargets`). The AI agent can inspect the live DOM (`browser_snapshot` / `browser_cdp`) and take visual screenshots (`browser_take_screenshot`) to see the exact wall or prop the user is looking at.

### Lightweight AI & NLP Evaluation Testing Framework (planned: 05f-eval-and-replay)
- The shared runner is its own change, recorded in section 11. It is `eval/` and `npm run eval:ai`, and it scores every AI subject. Later changes register suites on that runner. They do not create a second one.
  - **Utility & Rival AI Scenario Evals (Change 06)**: Golden world-state fixtures verifying that NPC utility brains and rival operatives select sensible, non-thrashing goals and respect Inertia Pillars across multi-tick rollouts.
  - **Voice Register & Anti-LLM-Slop Evals (`07e-voice-register-evals`)**: Golden dialogue and `AdvisoryDuel` fixtures verifying banned-lemma compliance, cadence rules, and clause-omission behavior. Register means written diction and cadence. NPC conversation lines are the bubbles in section 9. Advisory lines are lace text. Neither is spoken. Clause-omission fixtures depend on `07d-advisory-duel-omission`.
  - **Hybrid NLP & ONNX Intent Evals (Change 08)**: Golden dataset of free-text player inputs (testing negation polarity like *"Do NOT tell the Prelate"*, subject/object role inversion, oblique phrasing, and rival linguistic tells) measuring top-1/top-3 intent/topic accuracy and `<50ms` per-query latency on the 2019 Intel Mac.

### Human-Paced NPC Cognition & Anti-Thundering-Herd Cascade Guardrails (Changes 03 & 06)
- **Human-Paced Cognitive Phases**: Even though the CPU evaluates utility scores in `<1ms`, NPCs must think, move, and act at a human pace in live gameplay. Every `BehaviorModule` defines `deliberationSeconds` (thinking pause before moving), `dwellSeconds` (time spent physically performing the action at the waypoint before its `WorldEffect` commits), `cooldownSeconds` (recovery pause after acting), and `requiresExternalTrigger` (allowing an NPC to make a decision and then pause in `awaiting_trigger` until the next player-created or macro-world trigger rather than speed-running an entire plot chain).
- **Anti-Thundering-Herd NPC-to-NPC Cascade Dampening**:
  1. **Digestion Delay & Exponential Hop Backoff (`cascadeHopCount`)**: When NPC A triggers NPC B (`enqueue_npc_stimulus`), the stimulus is queued with a digestion delay that scales with `cascadeHopCount` (`baseDigestionSeconds * backoffFactor^hopCount`). Once `cascadeHopCount` reaches `maxAutonomousCascadeHops` (default `2`), further propagation pauses in `awaiting_trigger` until a player or macro-world beat occurs (`release_external_trigger`).
  2. **Round-Robin Token-Bucket Evaluation (`maxCognitiveEvaluationsPerPulse = 1`)**: `SimulationCoordinator` staggers cognitive evaluations via `cognitiveRoundRobinCursor` so at most one NPC transitions into `deliberating` per pulse, eliminating synchronized NPC stampedes.
- **Fast-Forward / Eval Override (`SimulationPacingConfig`: `DEFAULT_GAMEPLAY_PACING_CONFIG` vs. `FAST_EVAL_PACING_CONFIG`)**:
  - All pacing and anti-thundering-herd parameters live in an explicit `SimulationPacingConfig` (`deliberationScale`, `baseDigestionDelaySeconds`, `cascadeBackoffFactor`, `maxAutonomousCascadeHops`, `maxCognitiveEvaluationsPerPulse`, `allowUnclampedFrameDt`).
  - Live gameplay uses `DEFAULT_GAMEPLAY_PACING_CONFIG` (human-paced timers, 2-hop cascade cap, 1 evaluation per pulse, `0.25s` frame clamp), while automated unit/simulation tests and the local AI eval runner (section 11) inject `FAST_EVAL_PACING_CONFIG` (or custom overrides) to zero out deliberation/digestion delays, waterfall zero-duration phases in a single pass, raise evaluation/hop caps, and step large virtual `dtSeconds` so 100-tick evals complete in `<20ms`.

### Sound Design, Gameplay Acoustics & Live Sound Lab Backdoor (planned: audio-minimal, 05a-audio-engine, 05a-sound-lab; was `05a`)
- **Two Acoustic Buses That Share a Skull and Never Share a Room**:
  1. **Groundside Bus (Wet, Close-Miked, Room-Convolved)**: No generic background score; the settlement is the score (Glass River gorge roar, Calder Spines fulgurite thunder, slate rain, Nail-Guild forge hammers with Mara's one flat strike per keg, and Chambers quill/wax/breath). Surface-aware footsteps (`mud` `0.22`, `wood` `0.35`, `stone` `0.55`, `metal` `0.75`) and *The Lamp's* physical bronze chain clink (`0.15–0.55`) feed into the same **Audibility & Portal/Mask Occlusion Calculator** used by both the player's mix and NPC/Rival eavesdropping (`audibility = loudness * distanceFalloff(earshotRadiusMeters) * portalTransmission(open|ajar|closed|barred) * (1 - localMask)`).
  2. **Sub-Retinal Culture Neural Lace Bus (Bone-Dry, Zero Room Reverb, Cranial)**: *The Ending* (left ear) and *The Lamp's* private ethical voice (right ear, distorted by room smell 1–5); audible 12 dB high-shelf dropout when a sulking advisor omits a clause; 174 Hz `zenith` carrier hum that tremolos at `horizon`, bit-drops when `occluded`, and leaks a groundside "singing sky" harmonic during a high-Delta `Burn`. This bus does not speak. Advisor words are lace text, not the conversation bubble in section 9. The bus carries the non-speech cues: the hum, the dropout, the bit-drop, and the sky harmonic.
- **Mechanic & Debug Telegraphs + Multi-Epoch Inheritance**:
  - Short *Obra Dinn*-style fracture cues for Inertia Pillar collapses; Emergency State room-tone ducking; and an `F3` Debug Pause audio morph (freezes the last 80ms of room tone down 3 semitones while the Lace clicks a dry 1 Hz calibration pulse).
  - Whoever controls the Glass River Gorge & Highglass Optics at the end of Era 1 sets the harmonic signature of the next Epoch's communication notifications (bell partial vs. anvil partial vs. military interval).
- **100% Procedural Web Audio API + Live Sound Lab Backdoor UI (Zero Git Repo Bloat)**:
  - Uses native browser Web Audio synthesis (oscillator modal banks, FM metallic partials, filtered pink/brown noise, and procedurally generated `ConvolverNode` impulse responses) defined as declarative, Zod-validated `ProceduralAudioPatch` presets (`src/content/audio/patches.json`).
  - **Dual Customization (Agent Co-Design + In-Game Sound Lab UI)**: Sounds can be adapted either by guiding the agent in plain English or via the **In-Game `F3` Sound Lab Backdoor UI** (audition any cue/bed, drag live sliders for pitch, filter cutoff/Q, envelope attack/decay, noise/tone mix, reverb send, and stealth loudness, and click **Save Patch to Disk**). The Sound Lab is planned (planned: 05a-sound-lab): its `PUT /api/audio-patches` route does not exist yet and will go through the guarded bridge write-route helper (planned, built by hx-ops-safety). Until the pack loader exists, a saved patch does not persist into the game (planned: pre-05b-pack-source-of-truth).

---

## Solidified Design Decisions & Architecture Enrichments (7th Nov 2026)

### Loop cycles: minute, session and epoch (planned: 05b-1-watch-clock-and-time-spend, 07-dialogue-paging)
Three nested cycles, each on its own clock. They are revisable (P5). Owner: the cost of talking comes from the world.

- **Minute cycle (the room, Clock 1)**: The player walks, uses and talks inside one room at `60` Hz. NPCs deliberate, move, dwell and cool down on room seconds. Nothing in the minute cycle advances a campaign watch by itself. Reading a conversation chunk is free and an ambient line is free.
- **Session cycle (watches spent, Clock 2)**: The player spends watches on Committed Time-Spend Actions: holding office, resting or studying, waiting on a courier, travelling. What returns on a watch boundary is the world having moved on: NPCs have moved on by watch (the presence function, not wall-clock beats), correspondence has arrived, stipends and fuses have run down, and the notebook holds what the player learned. Autosave lands at watch boundaries (see the save policy under Open items).
- **Epoch cycle (the epoch watch budget)**: One epoch is about `8–14` hours (`epochWatchBudget`). It ends by reading both ledgers and the Observation table (rule R8, still open), hands the operative role to a new crew (P3) and exports `CivilizationLegacyState` into the next epoch.
- **Talking costs time**: A conversation is a fractional time-spend verb (the integer unit that makes this exact, a finer unit under the watch, a per-conversation cost, or a carried remainder, is an owner decision pending). `05b-1-watch-clock-and-time-spend` owns the verb and its budget, and `07-dialogue-paging` charges it once per conversation, so the verb is not dead code. This is the world's price for talking: while the player talks, the world moves on. It replaces "reading costs no watch" in section 10 for the conversation as a whole; reading one chunk is still free.

### 0. 50–100 Hour Campaign Pacing, 4-Clock Hierarchy & Data-Driven Curve Envelopes (planned: 05b-1-watch-clock-and-time-spend, 05b-2-envelopes-and-gates, 05b-2-storylets-and-lab; was `05b`)
- **Why Room-Scale Time and Campaign Watch Time Must Be Separated**:
  - Local room embodiment (`stepKinematics` at 60Hz + `2–15s` deliberation/dwell/cooldown) is ideal for watching an NPC think, walk across a room at `1.4 m/s`, and perform an action, but if macro plotlines, horse couriers, stipends, and NPC evolution also ticked every `10s`, an **~8–14 hour Epoch** (`50–100 hours` total campaign ÷ $N$ configured Epochs; ~8–14h per Epoch on the 7-Epoch default ladder) would burn out in 15 minutes.
- **The 4-Clock Simulation Hierarchy (Rebasing Change 03 `*Tick` Fields onto Campaign Watches)**:
  1. **Clock 1 — 60Hz Frame & Room Embodiment Clock (`elapsedSimulationSeconds`)**: Physical locomotion, door hinges, room acoustics, eavesdropping, and live conversation (`2–15s` phase timers). Never advances macro calendar time, with one exception: a conversation charges the talk cost once (see Loop cycles). (`worldTick` remains the discrete effect/telemetry serial counter).
  2. **Clock 2 — Campaign Watch & "Committed Time-Spend" Clock (`elapsedWatches`)**: Monotonic integer watches (`watchesPerDay`, `daysPerSeason`, `epochWatchBudget`) advanced when the player performs **Committed Time-Spend Actions** (holding Office court/audits, resting/studying in Chambers, waiting on or expediting correspondence, or taking an Epoch 2+ Travel Vignette — Change `06c`). The rename of the `*Ticks` duration fields onto Watches is recorded in the clock decision record (R1) and done by `05b-1-watch-clock-and-time-spend`; `storytellerMinWatchScale: 0` joins `FAST_EVAL_PACING_CONFIG` with `05b-2-envelopes-and-gates`.
  3. **Clock 3 — Storyteller & Plotline "Point-Release" Director (`StorytellerPacingDirector`)**: Evaluates on `elapsedWatches` advances to meter **Butterfly Thread Point-Releases** (`omen -> simmer -> institutional_friction -> crisis_fuse -> resolution`, max 1 spine thread in `crisis_fuse` at a time), rival escalations, and **Compositional Storylets** (`StoryletTemplate` slot grammar, which Change `06a` extends with `RegardGraph` bindings).
  4. **Clock 4 — Slow-Drift NPC & Social Evolution**: Closed-form per-watch / per-season drift on NPC `drives`, passive `Regard` cooling/grudge decay, `InertiaPillar` hardening (`Ignorance/Debt` early -> `Doctrine/Constituency` late), and career rank progression.
- **Clock decision record (planned: 05b-1-watch-clock-and-time-spend; revisable)**:
  - `elapsedWatches` lives on `WorldState` and is advanced only by one `advance_watches` effect. `worldTick` is an effect serial and is never time. Scars record the watch they were written on, not `worldTick`. Every `*Ticks` field (`stipendPerTick`, `baseTransitTicks`, `fuseTicks`, the orbital phase durations, `burnCostPerTick`, `orbitalOffsetTicks`) is renamed `*Watches` while it has no users. The four-clock shape above is kept. Clock 1 runs on a fixed `1/60` s step with an accumulator (planned: hx-fixed-step-tick). Rule R1 below carries this record.
- **100% Data-Driven Pacing Profiles & Curve Envelopes (`PacingProfileBlueprint` & `CurveEnvelopeSchema` + Live `F3` Pacing Lab)**:
  - Nothing about pacing speed, Epoch count ($N$), or tension dynamics is hardcoded. Every pacing dimension is driven by a Zod-validated `PacingProfileBlueprint` (`src/content/pacing/*.json`) using piecewise control-point **Curve Envelopes** (`points: [{ progress01, value, interpolation: 'linear' | 'smoothstep' | 'step' }]` + optional wave modulation `cyclePeriodWatches`, `onPhaseDutyCycle01`, `recoveryFloor01`):
    1. **`storytellerTensionEnvelope`**: Shapes the macro tension/threat ceiling and RimWorld-style pressure-and-recovery waveform across the Epoch (`0.0 -> 1.0`).
    2. **`pointReleaseCadenceEnvelope`**: Controls `minWatchesBetweenReleases` and Storyteller budget costs for Butterfly Thread point-releases across Acts I–III.
    3. **`npcEvolutionEnvelope`**: Controls `maxDriveDeltaPerWatch`, `Regard` drift rates, and `InertiaPillar` hardening speed across the Epoch.
    4. **`storyletDensityEnvelope`**: Controls the injection rate and cooldowns of compositional storylets (Office cases, Writing Desk dilemmas, Rival moves, Romantasy probes, Travel encounters) between spine releases.
    5. **`timeHorizonConfig`**: Controls `campaignLengthMultiplier` (e.g., `0.25x` quick run vs. `1.0x` 50–100 hr campaign), `watchesPerDay`, `epochWatchBudget`, and watch costs per activity.
  - **Live `F3` Pacing & Envelope Inspector (planned: 05b-2-storylets-and-lab; `GET`/`PUT /api/pacing-profiles/:profileId` do not exist yet and will go through the guarded bridge write-route helper, planned, built by hx-ops-safety)**: Will allow tweaking any envelope control point, duty cycle, or time multiplier live in-game, running a `<10ms` headless preview rollout of an Epoch's watch budget to inspect release spacing, and saving the updated profile directly to disk.

### 1. Unified Interpersonal `Regard` Web (Scaling to 500+ Interactable Characters) & Manipulative Romantasy (`06a-interpersonal-regard-and-romantasy`)
- **Shared On-Stage + Off-Stage Social Web**: Every interactable character — including local visible NPCs (Tier 1 `utility_schemer` & Tier 2 `role_routine`), off-stage non-visible Correspondent NPCs, Rival Alien Operative covers, the Player Operative, and the two Culture Advisors (`advisor_integral`, `advisor_particular`) — shares the same directed `Regard` graph (`holderId -> targetId`).
- **Scaling to 500+ Interactable Characters on a 2019 Intel Mac (2-Tier Hybrid Social Graph)**:
  1. **Tier 1 — Zero-Allocation Faction/Role/Lineage Baseline Priors (`computeBaselineRegard(holder, target)`)**: Unmet or unperturbed pairs never allocate memory or save-file bytes ($0$ cost instead of a $500 \times 500 = 250,000$ dense matrix); their baseline standing is computed in $O(1)$ time from faction, institutional lineage, and role affinity rules.
  2. **Tier 2 — Copy-on-Write Sparse Materialized Personal Edges (`RegardGraph` + Salience Pruning)**: Personal `RegardEdge` records are materialized only for authored relationships and pairs that interact, correspond, witness each other, or are touched by a rumor/scheme (~15–40 personal edges per character = $7,500\text{–}15,000$ edges at $N = 500$, `<2 MB` RAM). Stored off `EntitySimulationState` so 60Hz `stepKinematics` never clones social maps; `adjust_regard` updates a single holder's adjacency map in $O(1)$ copy-on-write time; and edges that decay back to baseline with `bondKind: 'none'` and zero `obligation`/`exposure` are automatically garbage-collected back to Tier 1 priors.
- **Multi-Axis `RegardEdge` Contract**:
  - `affection` (`[-1, 1]`): Warmth, attraction, personal fondness vs. scorn (softens `Temper` inertia pillars; gates private Chambers visits).
  - `respect` (`[-1, 1]`): Deference to competence/status (drives Contested Office coalition math and guild/military obedience).
  - `trust` (`[-1, 1]`): Belief in honesty/safety (gates sharing secrets, Writing Desk enclosures, and co-conspiracy).
  - `dread` (`[0, 1]`): Fear/coercion/reputation of danger (bypasses `Temper` under threat, hardens `Doctrine`, and triggers a Pendragon-style `torn` flag when both `affection >= 0.6` and `dread >= 0.6`).
  - `obligation` (`[-1, 1]`): Directed favor/hook balance (`+` = target owes holder; `-` = **reverse hook** where holder owes target; satisfies `Debt` inertia pillars).
  - `exposure` (`[0, 1]`): Scandal/leverage this holder knows about the target.
  - `bondKind`: `'none' | 'courtship' | 'entanglement' | 'kin_claim' | 'patron' | 'rival' | 'betrayed'`.
- **Triangulation, Proxy Co-Signing & Autonomous NPC-to-NPC Relationships**:
  - Correspondence to off-stage NPCs evaluates relational triangles (`Regard(Correspondent -> Player)` vs. `Regard(Correspondent -> LocalTarget)`), and players can use a local ally/lover (`Player -> Ally`) to **co-sign or seal a letter**, borrowing `Regard(Correspondent -> Ally)` ($O(d)$ 1-hop adjacency lookup in `<0.05ms`).
  - On-stage and off-stage NPCs maintain autonomous `courtship`, `entanglement`, `patron`, and `rival` edges with each other, reacting with jealousy, stipend cuts, or leaks when their partners are seduced, exposed, or harmed.
- **Manipulative Romantasy, Hidden Motives & 6 Discovery Channels**:
  - Tier 1–2 NPCs carry a hidden `RomanticMotiveBlueprint` (`genuine_devotion`, `faction_honey_trap`, `social_climber`, `martyrdom_shield`, `rival_operative_asset`, `blackmail_bond`) while player romance choices track `authentic` vs. `instrumental` stance.
  - Players uncover an NPC's hidden motive via 6 gameplay channels: (1) **60Hz Waypoint vs. Conversation-Promise Mismatch** (the promise is a line in that NPC's conversation bubble, section 9, while the player is talking to them), (2) **Writing Desk Seal/Transit Interception**, (3) **Acoustic Eavesdropping through Ajar Doors**, (4) **The Lamp's Physiological/Smell Tells** (and deliberate `0.55`-loudness bronze chain clinking when the deontologist Drone resents a manipulative seduction), (5) **The Ending's Statistical Anomaly Briefings**, and (6) **Planted Bait Secrets**.
  - Romantic bonds, dynastic claims, and betrayals export in `CivilizationLegacyState` (`LineageBondLegacy` keyed by `lineageId`), directly shaping how lineages react when the next Epoch's operative claims kinship with their predecessor.

### 2. Last-Resort Assassination, Counter-Assassination & Cover Persecution / Witch-Hunt Hazard (`06b-assassination-and-cover-persecution`)
- **4 Assassination Vectors (`AssassinationVectorBlueprint` — Option of Last Resort)**:
  1. `drone_instrument` (*Companion Drone Precision Strike*): Very high success (`~0.78+`), fast rival anomaly detection (`assayed`/`attributed`), severe *Lamp* moral revulsion (`affection`/`trust` drop, `dread` spike).
  2. `local_agent` (*Hired / Manipulated Local Agent*): Medium success (`~0.52`, boosted by `obligation`/`dread` hooks), low off-world anomaly signature, high *Brother Assassin* martyrdom backfire if botched.
  3. `staged_pretext` (*Staged Medical/Industrial Accident*): Medium–high success (`~0.73` with matching Office Pretext), lowest local suspicion if pretext holds, huge spike if exposed.
  4. `correspondence_enclosure` (*Sabotaged / Poisoned Enclosure*): Medium success (`~0.45`, requires courier `trust`), low–medium suspicion.
- **Counter-Assassination Against the Player (Local Agent vs. Rival Spacefaring Operative)**:
  - **Local Retaliation**: Triggered by botched player plots, `assassination_lockdown` emergencies, or Tier 1 NPCs with `betrayed` / `torn` `RegardEdge`s. Resolution depends on `droneInterceptQuality` derived from `Regard(advisor_particular -> player)`:
    - High disposition (`>= 0.75`): **Silent Intercept** (`0` Veil/Persecution spike).
    - Medium disposition (`0.45–0.74`): **Noisy Miracle** (saves player, spikes `coverPersecutionRisk`, advances `discoveryLayer` to `noticed`/`assayed`).
    - Low/alienated disposition (`< 0.45`): **Drone Hesitation** (player suffers non-fatal wound/incapacitation or capture into an `ideological_trial`).
  - **Rival Spacefaring Operative Strike (*The Tithe*, *The Quiet*, *House Reciprocal*)**: Triggered when `discoveryLayer >= 'attributed'`, when pulling ahead on a Butterfly Thread, or when your Ship Mind is `occluded`. Uses off-world ordnance/neurotoxins/legal traps that even a devoted *Lamp* cannot silently negate without high Veil exposure or orbital `zenith` support.
- **Cover Persecution / Witch-Hunt Hazard (`AnomalousSuspectState` & `coverPersecutionRisk` `0..1`)**:
  - Epoch-agnostic state machine (`clear -> rumored -> examined -> charged -> condemned`) skinned across the 7-Epoch arc (1. Feudal: *Synod Witchcraft & Heresy Inquisition* -> 2. Renaissance: *Dogmatic Index & Heresy Tribunal* -> 3. Pre-Industrial/Colonial: *Charter Sedition & Admiralty Assize* -> 4. Industrial/WWI: *Wartime Espionage & Sabotage Court-Martial* -> 5. Cold-War: *Counter-Intelligence Black-Site & Un-Civil Activities Committee* -> 6. Computer-Age: *Algorithmic Anomaly Warrant & State-Corporate Blacklist* -> 7. Space-Age/1st-Contact: *Planetary Security Quarantine & Extraterrestrial Infiltration Hearing*).
  - Crossing the threshold triggers an `ideological_trial` emergency fuse with 4 escape valves: (1) **Office Pretext** (`ideological_censure` / `medical_quarantine`), (2) **`Regard` Alibi / Co-Signer**, (3) **Framing a Scapegoat / Rival Cover**, or (4) **Emergency Overt Drone/Orbital Extraction (`extracted_overt`)**, which saves your life, ends your current cover, jumps `discoveryLayer` to `theorized`, and records permanent `scar_overt_anomaly_extraction` and `scar_persecution_apparatus` (`witch_hunt_police`) scars in `CivilizationLegacyState`.

### 3. Orbital Blackout Contingencies, Doomsday Clocks & Anti-Clustering Scheduler (`09a-doomsday-clocks-and-rival-unveiling`)
- **Shared `OrbitalBlackoutState` (`isOrbitalSupportAvailable(state) === false`)**:
  - Sits alongside `OrbitalPassRuntimeState`. While active, all orbital capabilities (`zenith` drops, weather control, orbital recon, `Slingshot`/`Burn` Delta, and `extracted_overt` rescue) go offline, the 174 Hz neural-lace carrier hum cuts to dead silence, `advisor_integral`'s lace text stops, and `eligibleAdvisors(state)` leaves **only the Companion Drone (`advisor_particular`)** as your groundside companion.
- **Conditional Late-Game Rival Ship Ambush + Pool of 5 Random Planetary Contingencies (`ContingencyEventBlueprint` & `orbitalContingencyLedger`)**:
  - **Conditional Trigger — `rival_evasive_maneuvers` (*Late-Game Rival Ship Ambush*)**: Triggered when your Uplift lead pulls ahead of the leading rival civilization late-game. *The Ending* is forced into evasive action (`watchesRemaining: null`) until you complete a 4-step groundside **Rival Unveiling** (correlate overview/mail tells -> pinpoint `coverEntityId` -> assemble an indigenous Office/`Regard` coalition -> publish the complete attribution so your GCU can return and neutralize their hull).
  - **5-Event Random Campaign Contingency Pool (2–3 Drawn per Playthrough via `SeededRandom`)**:
    1. `solar_flare_interdiction` (*Catastrophic Coronal Mass Ejection*): *The Ending* leaves orbit for `watchesRemaining` to deploy Lagrange field-mirror damping. Cannot be solved by locals; discoverability/paranoia delta scales with the Epoch's `detectionTechLevel` (`0..1`: Feudal aurora omens -> Renaissance/Colonial optical telescopes -> Industrial telegraph geomagnetic storms -> Cold-War/Computer/Space-Age radar, radio & satellite telemetry).
    2. `comet_orbital_diversion` (*Intersecting Comet / Bolide*): In earlier Epochs, *The Ending* must leave orbit to nudge the comet's trajectory (`ship_diversion`). In the **Final Epoch (`isTerminalEpoch: true`)**, you can choose **`local_mitigation`**: keep the Ship silent and manipulate the civilization's own scientific/space-age institutions to deflect the comet themselves (lower success odds boosted by uplifted science/institutions, much lower discovery/paranoia risk, and a crowning legacy achievement).
    3. `derelict_artifact_quarantine` (*Decaying Ancient Wreck / Rogue Sub-Orbital Probe*): *The Ending* leaves orbit to vaporize a decaying pre-cursor debris field while one fragment slips to the ground, sparking a groundside race against rival operatives to quarantine, buy, or discredit the "fallen star-metal" before it creates a relic `VeilScar` or rival debt monopoly.
    4. `tectonic_caldera_stabilization` (*Supervolcanic Plume / Deep-Crustal Lock*): *The Ending* repositions to the antipodal deep-crustal effector node to bleed tectonic stress while ash-haze, tremors, and doomsday panic hit the settlement (with a `local_mitigation` geothermal relief option if `isTerminalEpoch: true`).
    5. `hegemonic_emission_silence` (*Passing Hegemonic Armada / Sensor Sweep*): *The Ending* drops into 100% EM cold-sleep on the ocean floor while an unaligned fleet transits the system; rival operatives exploit the blackout to broadcast a beacon or strike you unless stopped with purely local levers.
- **Anti-Clustering & Epoch-Spacing Framework (`CampaignContingencyScheduler`)**:
  - **Stratified Campaign Draw (`maxContingenciesPerEpoch = 2`)**: At campaign start, `SeededRandom` draws `2–3` random contingencies from the 5-event pool across the configured `epochs` list (persisted in `CivilizationLegacyState.orbitalContingencyLedger`). If $\ge 2$ are drawn, they **must** span at least 2 distinct Epochs (never all piling into the same Epoch), while any given Epoch may naturally roll **`0` contingencies** (a quiet orbital age), `1`, or at most `2` (including the conditional Rival Ambush).
  - **Mutual Exclusion + Mandatory Recovery Cooldown (`minCooldownWatches`)**: Only one blackout can ever be active at a time (`pausedByActiveBlackout: true`). When an Epoch has two contingencies (or a random contingency plus the Endgame Rival Ambush), the second event cannot trigger until `elapsedWatches >= lastBlackoutResolvedWatch + minCooldownWatches` ($\ge 35\%$ of `epochWatchBudget`), preventing back-to-back orbital blackouts.
- **Ship Mind forecast (planned: 09-delta-coupling-and-forecast)**:
  - A closed-form banded hazard computed from the Mind's own Observations, shown as a band plus its top two causes. Band edges are fixed, with hysteresis so the band does not flicker. Owned by the orbital-mechanics change. The Bayesian network for forecasts (INV-D) stays parked (`inv-d-bayesian-network`).

### 4. Configurable $N$-Epoch Civilizational Ladder (Default 7-Epoch Arc), Generational Operative Rotation, Anti-Over-Acceleration Ceilings & Extraction Stills (planned: 10-crew-handoff, 10-registry-swap-and-legacy; was `10`)
- **Uplift-Driven Historical Compression Across a Configurable $N$-Epoch Ladder (Default 7 Epochs)**:
  - In an un-contacted baseline society, progressing from Feudalism to the Space Age takes 600–800 years. **Your covert Uplift presence compresses the transitions between the configured Epochs (`EpochProfileBlueprint[]`, default $N = 7$) into generational intervals (`15–30 years` between operatives: `4–6 years` of post-climax work before extraction + `11–24 years` before the next operative lands)** so the civilization climbs the full ladder within **~110–200 in-world years**:
    1. **Epoch 1 (Era 1) — Feudal** (*Highglass Hold*: feudal court, guilds, Synod orthodoxy, horse couriers, naked-eye omens, Witch-Hunt Inquisition)
    2. **Epoch 2 (Era 2) — Renaissance** (printing charters, optical lenses, merchant banking houses, humanist inquiry vs. dogmatic rifts)
    3. **Epoch 3 (Era 3) — Pre-Industrial / Colonial** (chartered trading companies, optical semaphore & post networks, navigational observatories, mercantilist resource wars)
    4. **Epoch 4 (Era 4) — Industrial / WWI-Equivalent** (steam/coal/rail networks, telegraph wires, mass conscription, factory labor vs. capital, industrial/chemical warfare dual-use ceilings)
    5. **Epoch 5 (Era 5) — Cold-War-Era Equivalent** (ideological blocs, radio/television/CRT, nuclear/strategic deterrence dual-use ceilings, intelligence agencies & black-sites)
    6. **Epoch 6 (Era 6) — Computer-Age** (global digital networks, email/cloned ledger hashes, algorithmic surveillance, corporate/state information monopolies)
    7. **Epoch 7 (Era 7) — Space-Age / First-Contact (`isTerminalEpoch: true`)** (orbital telemetry/satellites, indigenous planetary defense capable of deflecting the Intersecting Comet, culminating in First Contact readiness)
  - **Adjacent-Epoch Living NPC Continuity (`youth -> prime -> elder -> succeeded_by_heir`)**: Because each inter-epoch gap is **15–30 years**, **`youth` (`15–29`) and `prime` (`30–49`) NPCs from Epoch $k$ are still alive as `prime` or `elder` (`50–75`) in adjacent Epoch $k+1$ (alongside their immediate children/protégés)**! They personally remember your predecessor and have lived through the one-rung generational leap (e.g., from Epoch 1 horse couriers to Epoch 2 printing charters & optical lenses, or from Epoch 4 steam/telegraph to Epoch 5 radio/Cold-War blocs), while `elder` NPCs from Epoch $k$ (and earlier generations by Epoch $k+2+$) pass their seats to their `lineageId` heirs/descendants.
- **Measured One-Rung-at-a-Time Progression & Anti-Over-Acceleration Guardrails (`EpochTechCeilingBlueprint` & `maxMaturationStepPerTransition = 1`)**:
  - **No Rung-Skipping or Mid-Epoch Tech Runaway**: While Uplift compresses the *years* between Epochs to match our pacing design, mechanics must never accidentally skip rungs or break an Epoch's internal coherence. Every `EpochProfileBlueprint` enforces a strict `maxTechTierForEpoch` ceiling for its rung on the configured Epoch ladder, and `runInterEpochMaturation` advances the civilization by **at most 1 Epoch rung per transition** (`maxMaturationStepPerTransition = 1`).
  - **Surplus Momentum & `absorptionCapacity` Friction**: Surplus Uplift progress within an Epoch beyond `maxTechTierForEpoch` converts into **compressed maturation time and horizontal institutional readiness** (smoother absorption of the rapid generational leap, lower `subsistence_pressure`, softer `Ignorance` pillars, and wider landing-site choices for the next operative), whereas pushing faster than `absorptionCapacity` without institutional scaffolding triggers future-shock backlash, guild/labor riots, Dual-Use Ceiling wars, or `coverPersecutionRisk`.
- **4-Panel Stylized Extraction & Reunion Stills (`ExtractionStillFrameBuilder` — Zero Repo Bloat)**:
  - Renders a 4-beat chiaroscuro still sequence using our existing Three.js stepped-toon kitbash renderer (`#1a1f28` shadow bands, `#c4a574` pools, silhouette-first dioramas parameterized by your operative's actual deeds, Office, wardrobe, and scars): (1) *Final Years of Groundside Work*, (2) *Nocturnal Orbital Pick-Up*, (3) *GCU Voyage Home*, and (4) *Culture Reunion & Successor Handoff*.
- **Expanding Landing Choices, Predecessor Traces (`semanticId`) & Kinship Claim (`kin_claim` vs. `fresh_start`)**:
  - Prior Epoch progress unlocks more `LandingZoneBlueprint` entry points and social covers as the reachable world grows larger and more interconnected each Epoch.
  - `bindPredecessorTraces(stage, specs)` grafts **visible and uncoverable traces** of your predecessor's work onto the new stage (`semanticId` wall motifs, monuments, refurbished Chambers props, marginalia in ledgers/archives, dynastic descendants, and cautionary ballads/folklore).
  - **Claiming Kinship (`kin_claim`) vs. Starting Afresh (`fresh_start`)**: Claiming to be related to (or the direct lineal/institutional heir of) your predecessor unlocks warm `respect`/`obligation`/`trust` edges and fast-track Office access with lineages (`lineageId`) that revered your predecessor, but also inherits their `betrayed` faction grudges, rival targeting profile, and `coverPersecutionRisk`. Starting afresh gives a clean personal slate (`0` inherited personal grudges/persecution) while still letting you build on your predecessor's structural work.
- **Seeded-Random Ship & Drone Temperament Ranges + Era-Appropriate `droneDisguisePool`**:
  - While the ethical poles remain fixed (Left-Ear Ship Mind = consequentialist *Integral*; Right-Ear Companion Drone = deontological *Particular*), each Epoch rolls their personality traits (`humor`, `patience`, `riskTolerance`, `primness`, `omissionSulkThreshold`) within curated `[min, max]` ranges via `SeededRandom`, and selects the Drone's physical disguise (`droneDisguise`) from a curated per-Epoch pool of `3–6` era-appropriate items (Feudal reliquary lamp/lantern -> Renaissance astrolabe/pocket-chronometer -> Colonial sextant/barometer -> Industrial brass theodolite/telegraph ticker -> Cold-War field-radio/dosimeter -> Computer-Age diagnostic terminal -> Space-Age telemetry drone).

### 5. Epoch 2+ Interactive Fast-Travel Vignettes (`06c-epoch-travel-vignettes`)
- **Why Travel Is a Scene, Not a Skip and Not a Second Campaign**:
  - Epoch 1 remains local walking inside the settlement (no travel vignettes). From Epoch 2 onward, era-appropriate transit is **fast travel that is still a bounded 3D scene**: a kitbashed vehicle cabin (`vehicle_cabin` `SpaceKind`), a handful of fellow passengers, diegetic news access, and two independent `SeededRandom` rolls that may fire a useful/trigger interaction and/or world-mutating news. It is not an overland map, not a loading-screen skip, and not a Last Express-length minigame on every hop. Watch cost, destination count, and remaining gates become **less limited one tech rung at a time** (`travelTechTier <= maxTechTierForEpoch`); the engine never hardcodes "coach" vs "rail", and Culture-level teleport is forbidden.
- **The Vignette Loop (Clock 1 Cabin + Clock 2 Spend)**:
  1. **Commit travel** as a Clock 2 time-spend (`TransitRouteBlueprint` watch cost from a `PacingProfileBlueprint` envelope). Boarding is a route action, not a walking `connectedSpaceIds` edge.
  2. **Swap stage** via existing `disposeSceneGraph` onto a small `StageSceneBlueprint` for that `VehicleKind` (tight `CameraVolumeBlueprint`s; F3 Stage Lab still works). Focused 60Hz embodiment is the cabin only.
  3. **Origin is not a special "left undefended" mode**: the settlement you left keeps existing the same way every other node already does (Clock 2 / off-camera `off_stage_region` LOD). Highglass Hold is not a unique tactical vulnerability just because you boarded a coach.
  4. **Watches advance on vignette cadence** (reading the gazette, waiting, sleeping a stage, or the summary skip) — never from idle staring.
  5. **Two independent rolls**, each consuming Storyteller storylet budget from `storyletDensityEnvelope`: **`social_trigger`** (passenger hook, Regard bump, eavesdropped secret, correspondent in the next seat) and **`world_news`** (colour, or a mutation of trip pretext / origin / destination / Wider World Overview). Quiet trips are the default; a useful conversation is uncommon; a world-mutating headline is rare. Storyteller vetoes cannot force a second `crisis_fuse` or fire a `09a` blackout.
  6. **Arrive** (or **divert** onto an existing same-Epoch route for extra watches). Apply queued `WorldEffect[]`. A stale trip pretext is intelligence arriving *along the corridor you are on*, not slapstick.
  - **"Commit the rest of the journey" summary skip**: the player may collapse remaining cabin time, but remaining watches and pending social/news rolls **still resolve in summary** — skip cannot dodge mutation. Embarkation itself is not skippable (choosing a seat/compartment sets passenger adjacency for eavesdropping / Regard).
- **Epoch-Agnostic Contracts (`EpochModuleRegistry`)**:
  - `VehicleKindBlueprint`: `travelTechTier`, named/ambient passenger caps (`2–6` named + `0–4` ambient), `acousticClass`, sway amplitude (clamped by existing `reduceMotionAndFlashing`).
  - `TransitRouteBlueprint`: from/to settlement ids, vehicle kind, base watch cost, weather / emergency / pretext gates.
  - `TravelVignetteBlueprint`: route, `vehicleStageId`, diegetic news prop, encounter table ids.
  - `EnRouteEncounterTable`: two weighted tables (`social_trigger` | `world_news`) with `mutationKinds: 'trip_pretext' | 'origin' | 'destination' | 'wider_world'` and a storyteller budget cost.
  - `TravelSessionState` (`StateSliceKey`): route, remaining watches, passengers, rolled encounter ids, optional destination override. Arrival is a pure function of seed + state via `TravelVignetteCoordinator`.
  - Default-ladder vehicle *skins* (content exemplars, never engine constants): Epoch 2 hired coach / river barge (regional, 2–4 destinations, high watch cost) -> Epoch 3 coastal packet / post-coach -> Epoch 4 rail / steam packet -> Epoch 5 motorcade / propeller air -> Epoch 6 high-speed rail / airliner -> Epoch 7 indigenous suborbital hopper. Diegetic news prop evolves with the communications backbone (broadsheet bundle -> gazette -> telegraph clerk -> radio -> terminal) as a **delayed slice of `WorldOverviewModule`**, so rival spoof tells still work. Neural lace still works unless a `09a` blackout is active. A rival operative as a fellow passenger is a rare Storyteller beat, never a raw random roll.
- **Live World-State Surface Cues (`TravelSurfaceCueBlueprint`) — Subtle Immersion, Not a Second HUD**:
  - Every Epoch 2+ vehicle stage carries **small, data-driven visual/prop details that reflect current world state**, resolved on embark and at each watch tick (never per 60Hz frame). This is the travel-cabin sibling of Change 10's `bindPredecessorTraces`: predicates bind kitbash `semanticId` motifs, props, lights, extra gazette editions, grime, or an empty passenger slot — inspectable in the F3 Stage Lab, zero `.glb` bloat.
  - Cues stay **subtle and diegetic** (mud on a wheel-well, a folded extra broadsheet, quarantine yellow bunting, wartime paper blinds, a missing scheduled seat, blackout shutters when the 174 Hz carrier is dead). They are never billboards, objective markers, or lace-HUD dumps. Content authors register `TravelSurfaceCueBlueprint`s (`predicate` on pressure stocks, active emergency, weather, overview headline family, orbital phase, discovery layer, held Office, `Regard` bond, or `coverPersecutionRisk` band -> `visualDelta` on a `semanticId` target). The predicate language is epoch-agnostic so settlement stages can reuse it later; Change `06c` only authors travel-cabin cues.
  - Seed exemplars of the tone (not a closed list): coach wheel-well mud matching last weather; the news rack's extra edition matching the current overview headline (or a rival `early_surplus` spoof tell); an empty compartment when a scheduled passenger is in `ideological_trial`; blackout shutters / dead lace hum during `OrbitalBlackoutState`; colonial quarantine bunting when the destination carries `medical_quarantine`.

### 6. Play Shell (`05c-play-shell`)
- **Why the page is its own change, and why it comes before the labs**:
  - Change 04 shipped the painter, the tracking camera, the F3 stage lab, and the disk bridge. Change 05 shipped the headless simulation (`requestWaypointMove`, `requestSetPortalState`, `stepFrame`) and left the HUD out of that change on purpose. No HTML entry and no animation frame exist, so nothing can be opened. This page is the game UI for the whole campaign. The proving slice is only the first pack it can load, because that is the only embodied content that exists. Whatever the player has to see or interact with, at any point in the campaign, loads into this same page: a stage, a body, a cabin, a still, a lab, or a player-facing control. The sound lab (`05a-sound-lab`), the pacing lab (`05b-2-storylets-and-lab`), and travel (`06c`) are the first later loads. Epoch populations, including Change `11`, are further loads, not a different UI. None of them creates a second page.
- **The session (one canvas, whatever pack is loaded, the dev HUD)**:
  - One local page, one canvas, one resident stage, one `stepFrame` per animation frame under `DEFAULT_GAMEPLAY_PACING_CONFIG` (the coordinator already clamps the frame delta). The page loads one registered pack plus that pack's `spaceId` → `StageSceneBlueprint` directory. The focus operative starts in their authored space. The shipped page click, a waypoint within `1.5` m or a portal prop, is replaced for the player by sections 7 and 8. NPC paths still use `requestWaypointMove`. The waypoint status (`path`, `already_there`, `blocked`, `unknown_waypoint`, `unknown_entity`, `paused`) and the portal status (`updated`, `unknown_prop`, `paused`) are visible. When the focus entity's `spaceId` changes, the shell calls `disposeSceneGraph` and builds the stage registered for that space. `F3` or backtick calls `setPaused`, desaturates the frozen world by 40%, de-anchors the camera, and the existing stage lab can save a picked `semanticId` through the disk bridge. Until the pack loader exists, that save writes JSON the game does not load: nothing reads `src/content/scene/stages/*.json` at run time. Lab JSON is planned to become the source of truth (planned: pre-05b-pack-source-of-truth), loaded and Zod-checked at runtime through `validateLaunch` with no emitted TS, and the bridge will write only allowlisted, schema-checked files. Free-cam writes the camera offset. Blueprint edits happen while that pause is on.
- **Epoch-agnostic contracts**:
  - The composition root lives in `src/interfaces/composition/` and may import application, domain, content, and Three.js. Domain and application stay free of the DOM, Three.js, and content packs. The page does not know which epoch it is showing. A body is drawn only when a `CharacterVisualBlueprint.characterId` matches the entity id; a pose with no matching visual is skipped. The first pack that can be loaded is the proving-slice exemplar (`char_player_operative`, `char_yard_walker`, the yard stage, and the chambers stage), and those ids stay in `src/content/`.
- **What this shell leaves to later changes**:
  - `05a-sound-lab` mounts the Sound Lab and `05a-audio-engine` owns the audio graph. This page does not open an `AudioContext`. `05b-2-storylets-and-lab` mounts the Pacing Lab. Its watch-budget preview stays a projection and does not write `WorldState`. This loop does not advance `elapsedWatches` or inject storylets. `06c` reuses this dispose-and-rebuild for cabin stages. Diegetic parchment and the neural lace remain the later player-facing surface. Player locomotion and proximity use are sections 7 and 8. The dev HUD waypoint list remains a lab command. Arbitrary ground clicks, teleport, and live pacing edits stay out.

### 7. Direct Floor Locomotion (planned: 05d-input-and-control-frame, 05d-locomotion-footprint, 05d-arrival-hold-readability; was `05d`)
> **Status: planned.** The shipped page still moves the focus body by a waypoint click. This section is the accepted design, kept in the present tense for readability; read each verb as "will". Nothing here is shipped.

- **Why the player walks the floor**:
  - The shipped page moves the focus body by a waypoint click. The player instead walks. NPCs stay on `requestWaypointMove` and `stepKinematics`. This is its own change, depending on the shipped walk and the play shell, and it slots before the sound lab and the pacing lab. It does not advance watches, spend storyteller budget, or open an `AudioContext`.
- **The loop**:
  - WASD will move the focus body across the current room at that body's `walkSpeedMetersPerSec` (planned: 05d-input-and-control-frame). W is into the picture, taken from the active camera volume's settled yaw. Diagonals keep that same speed. Releasing the keys stops the body on that frame. A and D with no W or S turn the body in place at `yawSpeedRadiansPerSec` and do not slide it. Facing holds when the keys come up. A floor click moves nobody.
  - The floor is the stage footprint, inset by a body radius of `0.22` m. Another embodied body in the same room is a disc of that radius. A prop blocks the oriented footprint of the mesh the kitbash builder draws for it, plus `0.03` m so the body does not sit in the pixels. The proving-slice meshes are the exemplar, not the rule: a door leaf `1.2` m by `0.14` m, a crate `0.9` m on a side, multiplied by that prop's scale and yaw. The shipped hinge yaws that centered leaf in place (`open` adds a quarter turn, `ajar` adds `0.38` rad) and does not move the pivot to an edge, so the proving-slice doorway stays covered. This change clears an `open` or `ajar` threshold by moving the pivot to the edge of the leaf. A `closed` or `barred` leaf stays across the threshold. The step tries X, then Z. A step that would leave the inset floor, enter a disc, or enter a prop footprint is dropped.
  - Within `0.5` m of a portal's near waypoint, with steer toward the far waypoint, an `open` or `ajar` portal hops the body one step inside the target space and the shell swaps the stage. A `0.4` s lockout stops the doorway swapping the stage every frame. `closed` and `barred` do not hop. Epoch 2+ travel stays a committed cabin, not a floor edge.
  - Only the player's disc blocks an NPC arrival. The NPC holds short of a target point the disc covers, and the arrival does not commit. Another NPC standing on a mark does not block a snap. The timer runs while the disc covers the point. Sidestepping on the mark does not reset it. At about `6` s the NPC emits an impatient ambient line (section 10). It does not open a conversation. At about `12` s the player is slid out along the away vector, still on the floor and still outside props and other bodies, and the NPC then arrives. If that slide has nowhere legal to go, the NPC stays and the beat can repeat. One waiter shows the line: the NPC whose current target lies inside the disc. Varied wording of the line belongs to section 10. This change owns the wait, the trigger, and the slide.
- **Epoch-agnostic contracts**:
  - `locomotionMode: 'waypoint' | 'direct'` on the character blueprint, default `'waypoint'`. This is a planned contract (planned: 05d-locomotion-footprint): the field is not in the shipped blueprint, and the kinematics split by mode depends on it. The proving-slice operative is the content exemplar set to `'direct'`. `set_direct_steer` stores a unit direction and clears `activePath` without moving the body. `stepKinematics` integrates that steer for a direct body and keeps the existing path branch for everyone else. Application passes floor slabs and prop footprints in as plain rectangles. Domain does not read meshes. The dev HUD waypoint command stays for waypoint-mode bodies and for tests. On a direct body, while unpaused, it does not dispatch.
- **What this change leaves out**:
  - Space-to-use, menus, and the pause menu are section 8. Solid decoration that is not a prop. NPC free roam.

### 8. Proximity Use and Menu Grammar (planned: 05e-modal-stack-use-and-menu, 05e-settings-model; was `05e`)
> **Status: planned.** Nothing here is shipped. This section is the accepted design, kept in the present tense for readability; read each verb as "will".

- **Why use is a reach, not a click**:
  - The player walks up to a prop, a portal, or a person and presses Space. The same keys drive every menu. This depends on the play shell and on section 7. Dialogue wording, interruption, pretexts, and free-text intent stay in their own changes. The menu stack leaves a slot those changes fill.
- **The loop**:
  - Space will use the nearest point of a prop footprint, or of a person's disc, within `0.4` m, and inside a `90°` arc centered on facing (`±45°`). Among the things inside that reach and that arc, the one closest to straight ahead wins. A tie at the same angle goes to the lower id. Nothing in the arc does nothing. The winner's name is the prompt.
  - While any menu is open, WASD moves the highlight and the body stands still. W and A go to the previous row. S and D go to the next. Space confirms. Escape pops one layer. Space and Escape ignore key repeat. The key that opens a menu does not also confirm a row. A key still held when the menu closes does not steer until it is released.
  - A door opens rows for `open`, `ajar`, and `closed`. Confirm calls `requestSetPortalState`. `barred` is shown and confirm writes nothing. Walking through an `open` or `ajar` door stays the hop in section 7. A person opens an empty presenter with Leave on it. A prop with no authored rows is not a target. Confirm on a prop row dispatches the existing prop-state effect.
  - These menus do not pause the room, so a door confirm can dispatch and other bodies keep walking. Escape on an empty stack opens the player pause menu in the diegetic layer, with Resume as the default row. That pause freezes the room through the existing paused bit and leaves the camera anchored. It does not desaturate the picture and it does not free the camera. `F3` and backtick stay the lab, and they are ignored while a menu or that pause is up.
- **Epoch-agnostic contracts**:
  - `selectProximityTarget` is a pure function over plain candidates. The menu stack lives on the session. `interactionHold` lives on `WorldState`: `{ targetKind: 'entity' | 'prop', targetId }` or empty. Opening a person or a prop sets it. Closing the menu clears it. A held person does not advance a path, does not run the impatient timer, and does not slide the player. A held prop refuses any other writer until the player confirms or backs out. The player's confirm still applies. A door menu does not hold a passer-by, so their impatient timer keeps running. Opening a menu on the person who is waiting holds them, and the timer starts over if the disc still covers the mark when the menu closes. Domain never sees key names.
- **What this change leaves out**:
  - Conversation paging and ambient lines are section 10. Interruption, pretext choices, fund choices, advisor omission, and the voice-register evals are sections 10a through 10e. Free-text intent is the change after that family. The empty presenter and `interactionHold` are the hooks. Save and settings rows. A second pause flag.

### 9. Conversation Text Bubbles, No Voice Acting (planned: 07-bubble-lace-skins-and-tone-blips)
> **Status: planned.** Nothing here is shipped. The accepted design, read each verb as "will".

- **The rule**:
  - An NPC conversation is a diegetic text bubble anchored to that body. An advisor conversation is lace text. Both are text. There is no voice acting, and no synthesised voice reads a line aloud. Section 10 is how either conversation is paged, and how speech you did not enter stays an ambient line.
  - A romantasy promise the player can catch against a waypoint path is a line inside the conversation with that NPC. The lace audio bus still carries the hum, the omission dropout, the bit-drop, and the sky harmonic, and it does not speak.
- **Where this already appears**:
  - The voice-register suite (`07e-voice-register-evals`) judges written diction, cadence, banned lemmas, and omitted clauses. "Voice" there is a written register. It registers on the runner in section 11.
- **The contract**:
  - The NPC bubble and the lace page are two skins on one pager. Neither adds an `AudioContext` for speech. The audio change stays non-speech.

### 10. Conversation Paging and Ambient Lines (planned: 07-dialogue-paging; was `07`)
> **Status: planned.** Nothing here is shipped. The accepted design, read each verb as "will". Ambient lines and the per-conversation talk cost land in `07-dialogue-paging`; tone blips, `readingSpeed` and captions in `07-bubble-lace-skins-and-tone-blips`; the capture and return camera stack in `07-camera-directive-stack`.

- **Why long text and color speech are different**:
  - A conversation the player enters, or that a world event pulls them into, can be a long piece of text. Space advances it one readable chunk at a time. Speech the player did not enter — a market exchange, a passer-by's exclamation, the impatient beat in section 7 — is an ambient line. It is color. It is not a conversation. This folds into the dialogue change. It depends on the menu stack and `interactionHold` in section 8. The floor change only emits the impatient trigger.
- **A conversation**:
  - The first chunk is on screen when the conversation opens. The Space that the player used to start it does not also advance it. A conversation the world opened has no such press, so the next Space advances. A held Space stays on the chunk already showing. A new press moves to the next chunk. WASD does nothing while a chunk is showing. Escape leaves, confirms nothing, and does not open pause on that same press.
  - A chunk is at most two wrapped lines, about `120` characters. The author splits it. A chunk over that cap fails when the pack loads. The page shows a continue mark or an end mark.
  - When a response is expected, the chunk stays up and a choice menu appears. W and A move to the previous row. S and D move to the next. Space selects the highlighted row. The conversation then continues with the next chunk, or it finishes. Leave is one of those rows when the talk can end there. The press that reveals the rows does not also select one.
  - An NPC's lines use the diegetic bubble. An advisor's lines, including `AdvisoryDuel`, use the lace page. The keys are the same. A second conversation opened while one is already open sits on top. Finishing or leaving it returns to the one underneath. Reading one chunk costs no watch; the conversation as a whole is charged once (see Loop cycles). Only the embodied person being talked to is held. Everyone else keeps walking, and another NPC can still emit an ambient line and slide the player. A shown chunk is the line `ConversationHistory` keeps. The unread tail is not. A person with no authored line still opens the empty presenter and its Leave row from section 8.
- **An ambient line**:
  - One short line of text on a speaker the player is not in conversation with. It expires on its own. It takes no input, does not lock the player's feet, and does not offer a choice. Space still uses whatever is in front of the player. Interacting with that speaker clears the line and opens a conversation if one is authored.
  - A market exchange is several ambient lines in order, each anchored to the speaker. A passer-by can fire one line. The impatient beat is the same primitive: one line at about `6` s while the player's disc covers an arrival point. The words are authored. The engine does not invent them.
  - A line shows only when that speaker is audible under the earshot rule: distance, the room, and whether a door is `open`, `ajar`, `closed`, or `barred`. One line per speaker. Only a few lines are on screen at once. A line tied to a blocked arrival keeps its slot. Extra color waits. An ambient line does not spend a watch.
- **Epoch-agnostic contracts**:
  - `ConversationPage` on the session menu stack: an anchor id, the chunks, the index, and any choice rows. Domain never sees key names. A choice that changes the world dispatches a `WorldEffect`. `AmbientLine` is an anchor id, one string, and a lifetime. Content registers the triggers. The floor change registers the blocked-arrival trigger. Later packs register overheard exchanges and exclamations. The pager has no epoch in it.
- **What this change leaves out**:
  - Interruption, pretext choices, fund choices, advisor omission, and the voice-register suite are their own changes (sections 10a through 10e). Those suites register on the runner in section 11. Free-text intent is the change after that family: a deeper layer, and Space submits the text there instead of paging. A back-page and a transcript on screen. A typewriter. Speech audio. Camera grabs.

### 10a. Dialogue Interruption (planned: 07a-dialogue-interruption)
- **Why it is separate**: Cutting a live conversation short is its own change. It depends on the pager in section 10. It does not own chunks, ambient lines, pretexts, or funds.
- **The loop**: While a conversation is open, the player can cut it off. Shown chunks stay in `ConversationHistory`. The unread tail does not fire and does not apply. The offer to cut uses the choice menu from section 10 when it is a row. What the cut does to the talk, beyond dropping the tail, is this change.
- **What it leaves out**: Role pretexts, fund spending, and the advisor sulk.

### 10b. Role Pretext Choices (planned: 07b-role-pretext-choices)
- **Why it is separate**: Spending a role pretext is a choice on a conversation, not the pager. It depends on section 10 and on the existing office pretext registry.
- **The loop**: A choice row may name a pretext the operative holds. Space on that row spends it and dispatches the row's `WorldEffect`. The conversation then continues or finishes under section 10. A row that spends nothing, including Leave, stays a section 10 row.
- **What it leaves out**: Fund spending, interruption, and which pretexts exist. Those stay on the office registry.

### 10c. Fund Spending Choices (planned: 07c-fund-spending-choices)
- **Why it is separate**: Spending a fund is a choice on a conversation, not the pager and not a pretext. It depends on section 10 and on the existing fund instruments.
- **The loop**: A choice row may name a fund the operative can spend. Space on that row spends it and dispatches the row's `WorldEffect`. The conversation then continues or finishes under section 10.
- **What it leaves out**: How the fund was acquired. That stays on the instrument registry. Role pretexts are section 10b.

### 10d. Advisory Duel Omission (planned: 07d-advisory-duel-omission)
- **Why it is separate**: The sulk and the dropped clause are the advisor argument's consequence. The lace page itself is section 10. This depends on that page.
- **The loop**: Repeatedly freezing out `advisor_integral` or `advisor_particular` makes that advisor sulk and drop an `omissible` clause from the next briefing. The dropped clause is recorded in the AI reasoning log. Both advisors may cite predecessor sacrifices from `CivilizationLegacyState`. The words still page as lace text. The lace bus keeps the non-speech dropout cue. It does not speak the missing clause.
- **What it leaves out**: The voice-register fixtures that check the omission. Those are section 10e.

### 10e. Voice-Register Evals (planned: 07e-voice-register-evals)
- **Why it is separate**: These fixtures are one suite on the runner in section 11. They are not the runner, not the pager, and not the sulk. The suite depends on section 11 for the command, on section 10 for the lines, and on section 10d for clause-omission fixtures.
- **The loop**: Golden fixtures check banned lemmas, cadence, and, once omission exists, dropped clauses. Register means written diction. The lines are the conversation bubble and the lace page. The run is local. It does not add speech audio.
- **What it leaves out**: The runner itself. The free-text intent suite. That suite belongs to the following change, and it registers on the same runner.

### 11. Local AI Eval Framework (planned: 05f-eval-and-replay; was `05f`)
> **Status: planned.** Nothing here is shipped. The accepted design, read each verb as "will". The runner, `eval/` and `npm run eval:ai`, does not exist yet.

- **Why it is its own change, and why it sits immediately before utility AI**: Every AI subject is scored by one harness. Utility AI is the first subject, and that change already owns the brains, the rivals, the threads, the desk, and the overview. It registers a suite. It does not invent the runner. The runner needs the shipped headless simulation only: `SeededRandom`, `WorldState`, and `FAST_EVAL_PACING_CONFIG`. It does not need floor walking, menus, clocks, dialogue, or a model, so it stays behind the play-shell work and in front of the AI block.
- **The loop**: `npm run eval:ai` will load every registered case, roll it with a fixed seed under `FAST_EVAL_PACING_CONFIG`, and report pass or fail (planned: 05f-eval-and-replay). A case names a subject, a fixture, and assertions. The first case rolls the shipped headless simulation, so the command is real before any AI subject exists. A failing case fails the command. The command is local and offline. It is not part of `npm run verify`, and a 100-tick rollout stays inside the fast-eval budget already set for that pacing config.
- **Epoch-agnostic contract**: The runner lives in `eval/` at the repo root, outside the four layers, the same way `tests/` does. It may import domain and application. Domain does not import it. A subject id is an open string. The runner does not import `three`, the ONNX runtime, or era content, and it does not read `Date.now()`. The change that owns an AI subject registers that subject's cases. Suites already named are utility and rival goals (change 06), the written register (section 10e), and free-text intent (change 08). Any later AI subject adds a suite the same way.
- **What it leaves out**: The utility brain, rival behavior, dialogue lines, the written-register rules, and the intent dataset. Those stay on their own changes. The runner does not score a subject until that change registers its cases.

## Engineering rules

Rules that bind how the code is built, kept here so the security record is the first of them. Later engineering rules append to this section.

### Bridge lock (planned: hx-ops-safety)

The dev-server write routes (`PUT /api/scene-blueprints`, `PUT /api/character-visuals`, the session log and save routes) currently accept a cross-origin simple POST. This was reproduced twice on loopback-only probes (S4-02), so the fix runs first in the whole plan, ahead of docs and process work, and is independent of everything else.

- **One guarded write-route helper (planned)**: every lab route reuses it, and no route re-implements the checks. It enforces an `Origin` allow-list, a `Host` check, `Content-Type`, a per-run token, size limits that destroy the stream, and allowlisted paths with realpath containment.
- **Explicit `server.cors`**: set in Vite config rather than left to the default.
- **Test**: an http middleware test on `127.0.0.1:0` exercises the real middleware, not a mock.
- **Logger partner**: the logger rotates the prior session into `logs/prev` instead of truncating it on start (S4-03).

## Dispositions appendix

Where each raw note went, one row each. Raw dumps wait in `notes/inbox.md` until the design-notes skill dispositions them. Rejected options are logged so they are not re-proposed.

### Integrated and partly integrated notes

| Raw note (8 Nov 2026 world interaction notes) | Disposition | Where |
| --- | --- | --- |
| WASD free movement on any unoccupied floor point, not click-to-move | integrated | Section 7 |
| Interact by moving near and pressing Space; menus on WASD / Space / Escape | integrated | Section 8 |
| Dialogue as single readable chunks advanced by Space; Space exits from the last chunk | integrated | Section 10 |
| Pause menu on Escape when nothing else is open, same controls | integrated | Section 8 |
| Camera centred on the player, with world events able to capture it and hand it back | integrated in part (S5-11): the control-frame latch and the single zoom-out land with the first locomotion change (planned: 05d-input-and-control-frame); the capture / return directive stack lands with dialogue and events (planned: 07-camera-directive-stack) | Sections 7, 10 |
| A single "further out zoom" for the player to navigate | integrated in part (S5-11): the single yaw-neutral zoom-out scalar (planned: 05d-input-and-control-frame) | Section 7 |

The last two rows only ever appeared in the dump, so they stay listed until their changes land.

### Considered and rejected

| Option | Verdict | Note |
| --- | --- | --- |
| R6 seasonal council with rooms as scenes | rejected-by-review | |
| R9 CK3 numeric odds | rejected-by-review | Qualitative odds in advisor speech instead |
| S1-R9 re-rolled advisors weaken the through-line | rejected-by-owner | P3; the new crew each epoch is the design |
| S1-13 no epoch-handoff payoff | rejected-by-review | Already specified in the epoch-transition section |
| S1-12 tone is only flavour | rejected-by-review | Folded into S1-R2 (inference trails) |
| R5C2 global "important" accent | rejected | Breaks P4 |
| A LAYA-class or JEV-class decision model in the simulation path | rejected | INV-A |
| General probabilistic-programming engines, learned nets and JEPA-style world models at runtime | rejected | INV-F |
