# Uplift Design Notes

> **How to read this file.** This file is the design home, organised by system. It is a direction with room to add and modify, not a frozen spec (P5): read every verb about unshipped behaviour as "will". Each heading carries one status mark. `shipped` means in code, or in force for a rule or a record. `partial` means some of it is shipped and the rest is planned. `planned` means no code yet. Planned behaviour carries a `(planned: <roadmap id>)` mark. A section marked planned is planned unless a sentence in it is tagged `(shipped)`, and a `(shipped)` tag names existing code that planned text builds on. Change ids live in this file and under `openspec/` only. Cross-references name sections by title, never by number.

## Where facts live

One owner per duplicated fact. Other files point at the owner and do not restate the fact.

| Fact                                           | Owner                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Epoch ladder (default 7-epoch arc)             | The "Epoch ladder and operative rotation" section of this file (no epoch-ladder blueprint exists in code yet) |
| Dependency versions                            | `package.json` and `.nvmrc` only                                                                            |
| Verify steps and budget                        | `package.json` scripts; one sentence in the `AGENTS.md` Quick Verify                                        |
| Layer rules                                    | root `AGENTS.md` plus `tests/architecture`                                                                  |
| Roadmap order and `depends_on`                 | `openspec/roadmap.yaml`                                                                                     |
| Review gates                                   | the `uplift-review-gates` skill (planned: process-gates-and-ledger)                                         |
| Engine counts such as the 7-epoch default arc  | asserted by the docs-truth test against code constants (planned: process-gates-and-ledger)                  |
| Save policy                                    | "State, saves and pack identity" under Engineering rules                                                    |
| Talk cost                                      | "Loop cycles" in Clock and time                                                                             |
| Conversation chunk cap                         | "Conversation paging and ambient lines" (the gate tier 1 in Text pipeline applies it)                       |
| Audibility tiers and formula                   | The Audio section                                                                                           |
| Pause bit and lab mode                         | Rule R6 in "Rules spine R1 to R8"                                                                           |
| Communications-backbone chain and ownership    | "The configurable ladder" in Epoch ladder and operative rotation                                            |
| Detection Tech Level chain                     | "The configurable ladder" in Epoch ladder and operative rotation                                            |
| Palette (`#1a1f28` shadow, `#c4a574` pools)    | "Visual and UI direction" in Presentation                                                                   |
| Voice register and tone blips                  | "Bubbles, lace page and tone blips" in Text pipeline, conversation and AI eval                              |

## Status index

Each section is `shipped`, `partial` or `planned`, with the roadmap ids that own the unshipped part. This table is the only place the full set is listed.

| Section | Status | Roadmap ids |
| --- | --- | --- |
| Frame and pillars | partial (pillars shipped, in force; the player loop and seed exemplars are planned) | `11-epoch1-content` for the seed exemplars; `11-epoch-ending-and-handoff-hook` for the epoch-end shape (R8) |
| Rules spine R1 to R8 | partial (rules written here, R8 open; enforcing tests to be written by the owning changes) | `05b-1-watch-clock-and-time-spend`, `cm-act-envelope-and-rolls`, `cm-threads-and-pillars`, `cm-observation-notebook`, `cm-ledger-and-emergency`, `09-emergency-fuse`, `hx-reducer-and-frame-safety`, `09-delta-coupling-and-forecast`, `11-epoch-ending-and-handoff-hook` |
| Engineering rules | planned (telemetry policy partial) | `hx-ops-safety`, `hx-1-legacy-clamp-seed-scramble`, `hx-slice-store`, `hx-save-integrity`, `hx-fixed-step-tick`, `hx-kinematics`, `hx-reducer-and-frame-safety`, `hx-determinism-harness`, `pre-05b-launch-validation`, `pre-05b-pack-source-of-truth`, `pre-05d-renderer-shape`, `05b-1-watch-clock-and-time-spend`, `05f-eval-and-replay`, `telemetry-wiring` |
| Core model: terminology and epoch-agnostic rule | partial | `03-modular-registries-and-kinematics`, `10-registry-swap-and-legacy` |
| Core model: seven primitives | planned | `05b-1-watch-clock-and-time-spend`, `cm-act-envelope-and-rolls`, `cm-observation-notebook`, `cm-presence-and-materialize`, `cm-threads-and-pillars`, `cm-ledger-and-emergency`, `07-text-port-and-history` |
| Leverage Chain | planned | `cm-threads-and-pillars` |
| System graph | partial (written here; the hubs it names are planned) | `05b-1-watch-clock-and-time-spend`, `06a-interpersonal-regard-and-romantasy`, `cm-threads-and-pillars`, `cm-ledger-and-emergency`, `cm-act-envelope-and-rolls` |
| Presence model | planned | `cm-presence-and-materialize`, `cm-presence-render-crowd` |
| Clock and time: loop cycles, four clocks, envelopes, storyteller | partial | `05b-1-watch-clock-and-time-spend`, `05b-2-envelopes-and-gates`, `05b-2-storylets-and-lab`, `07-dialogue-paging` |
| Pacing config and fast-eval override | shipped | none |
| Epoch ladder and operative rotation | partial | `10-crew-handoff`, `10-registry-swap-and-legacy`, `11-epoch-ending-and-handoff-hook` |
| NPC minds: cognition phases and cascade guardrails | partial (stimulus cap and diffusion planned) | `06-utility-ai`, `cm-act-envelope-and-rolls`, `cm-diffusion-and-balancing` |
| NPC minds: belief and deliberate misbelief | planned | `cm-observation-notebook`, `06-utility-ai` |
| NPC minds: Regard web and Romantasy | planned | `06a-interpersonal-regard-and-romantasy` |
| Economy and levers: lever table | partial | `cm-instrument-profiles-audibility-tells`, `cm-diffusion-and-balancing`, `cm-ledger-and-emergency` |
| Economy and levers: Resource ledger | planned | `cm-ledger-and-emergency` |
| Economy and levers: assassination and cover persecution | planned | `06b-assassination-and-cover-persecution` |
| Economy and levers: blackout, contingencies, forecast | planned | `09a-doomsday-clocks-and-rival-unveiling`, `09-delta-coupling-and-forecast` |
| Text pipeline, conversation and AI eval | planned | `08a-timing-spike`, `07-text-port-and-history`, `07-authoring-kit`, `08-generated-text-adapter`, `06-rivals-remote-evidence`, `07-bubble-lace-skins-and-tone-blips`, `07-dialogue-paging`, `07a-dialogue-interruption`, `07b-role-pretext-choices`, `07c-fund-spending-choices`, `05f-eval-and-replay` |
| Advisors and lace | partial | `10-crew-handoff`, `10-registry-swap-and-legacy`, `06-overview-writing-desk-report`, `11-pass-1-slice`, `cm-observation-notebook`, `07-notebook-presenter`, `07d-advisory-duel-omission` |
| Rivals | partial | `06-rivals-remote-evidence`, `09a-doomsday-clocks-and-rival-unveiling` |
| Presentation: visual and UI direction | partial | `04-third-person-camera-and-inspector`, `05d-arrival-hold-readability`, `05a-audio-engine` |
| Presentation: visual authoring framework, F3 labs, play shell | shipped | none |
| Presentation: direct floor locomotion | planned | `05d-input-and-control-frame`, `05d-locomotion-footprint`, `05d-arrival-hold-readability`, `07-camera-directive-stack` |
| Presentation: proximity use and menus | planned | `05e-modal-stack-use-and-menu`, `05e-settings-model` |
| Presentation: accessibility and Settings | planned | `05e-settings-model`, `07-bubble-lace-skins-and-tone-blips` |
| Audio | planned | `audio-minimal`, `05a-audio-engine`, `05a-sound-lab` |
| Planned features by milestone | planned | `11-pass-1-slice`, `11-pass-1-ledger-end-card`, `06c-epoch-travel-vignettes` |
| Open, parked and dispositions | partial | `openspec/roadmap.yaml` parked entries |

## Frame and pillars (partial)

### Pillars (shipped)

Owner pillars stated during the 2026-11-08 root-and-branch review. Everything below is read against them.

- **P1.** The engine, modules, content objects and 3D render UI are built as a strong, decoupled, epoch-agnostic framework. The owner and an agent can then add detail and colour collaboratively as they go. The underlying tech and mechanics in the design notes are wanted. Some rules should still be set early enough to guide how the architecture evolves.
- **P2.** There is no free-text player input. A large share of the surfaced text should come from local SLM / Hugging Face generation, not hand-crafted lines. The owner is happy to get help with authoring.
- **P3.** Each epoch has a new operative with their own new Ship and Drone crew, because that is how the Culture works. The new crew, and the loss of the previous one, are part of the fun.
- **P4.** Some feedback is meant to be indirect: the player pieces together related events, NPC behaviour and world outcomes.
- **P5.** Everything the review settles stays open to later change. Core model, rules spine and roadmap order are a direction with room to add and modify, not a frozen spec.
- **De-weighted:** scale versus solo-developer time, and the number of review gates.

### Player loop, minimal (planned)

Owner: keep building the engine, but set a minimal rules spine early so it can guide the architecture. The vertical slice tests the engine; it does not replace engine work. Don't write everything up front. So this entry carries only the fields the owner named, and each is a pointer or a one-line statement that later work may revise:

- **Mission**: a covert Special Circumstances operative steers a developing civilization through the epoch without the world learning an off-world hand is at work.
- **Verbs per thread**: not yet defined. The one verb the spine fixes is `weaken_support` on a pillar (see Leverage Chain).
- **Win and fail shape**: not yet defined. See R8 (open).
- **Epoch-end evaluation**: rule R8 (open).
- **Leverage Chain definition**: see Leverage Chain in Core model.

### Seed exemplars and tone benchmarks (planned)

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

## Rules spine and engineering rules (partial)

> Status: the rules are written here; no rule is enforced by a test yet, and each enforcing test is written by the change that owns the rule. Engineering rules are planned unless a sentence says "today" or "as it is".

### Rules spine R1 to R8 (partial)

Eight architecture-constraining rules, set early so they can guide how the architecture evolves. Owner: accepts the 8-rule rules spine, leaving room to modify. Each rule gives its subject, its status, and the test or lint that enforces it (or "to be written", with the change that writes it).

| Rule | Subject                                                 | Status  |
| ---- | ------------------------------------------------------- | ------- |
| R1   | One watch clock                                         | planned |
| R2   | Actor and cause on every effect                         | planned |
| R3   | Thread structure (stages; one spine thread in `crisis_fuse`) | planned |
| R4   | Discovery has a referent and an observer                | planned |
| R5   | Emergency cardinality and fuse                          | planned |
| R6   | Reject instead of throw                                 | planned |
| R7   | Resource ledger                                         | planned |
| R8   | Epoch-end reads both ledgers and the Observation table  | open    |

- **R1 One watch clock** (planned: 05b-1-watch-clock-and-time-spend). Campaign time is `elapsedWatches`, advanced only by `advance_watches`. `worldTick` is an effect serial and never time, scars record the watch, and every `*Ticks` field is renamed `*Watches` while it has no users. The decision record is in Clock and time. Enforced by a domain test that no blueprint field is named `*Ticks` and that scars carry a watch (to be written).
- **R2 Actor and cause on every effect** (planned: cm-act-envelope-and-rolls). Every effect travels in the Act envelope (see Core model, Act), a finished dwell commits an Act, and a behaviour returns `WorldEffect[]`. Selection logic stays in `06-utility-ai`. Enforced by a reducer test that an effect from a behaviour commit carries `causeActId` (to be written).
- **R3 Thread structure** (planned: cm-threads-and-pillars). A thread is a state machine over `omen -> simmer -> institutional_friction -> crisis_fuse -> resolution`, held in a `ThreadRuntime` slice, with at most one spine thread in `crisis_fuse` at a time. Its inertia is derived from its pillars (see Leverage Chain). Enforced by a `ThreadRuntime` transition test (to be written).
- **R4 Discovery has a referent and an observer** (planned: cm-observation-notebook). Discovery is tracked per observer as decaying evidence in the Observation table, and the global `discoveryLayer` becomes a derived view, with `set_discovery_layer` kept as a shim (see Core model, Observation). Enforced by an eval that a rival strike needs an Observation held by that rival (to be written).
- **R5 Emergency cardinality and fuse** (planned: cm-ledger-and-emergency for the runtime, 09-emergency-fuse for the fuse). `EmergencyRuntime` carries a `scope` and may hold more than one emergency; compounding applies to the scoped group, not to everyone. The fuse is later and is not pulled into the threads-and-ledger core step. Enforced by a reducer test that compounding leaves an out-of-scope entity untouched (to be written).
- **R6 Reject instead of throw** (planned: hx-reducer-and-frame-safety). A reducer rejects an effect with a reason code and returns an outcome, and unknown ids behave the same everywhere. The throw survives only as an authoring-time contract test. The shipped reducer still throws today (for example `spend_orbital_delta` on a `burn` outside `zenith`) until that change ships. **Pause and lab, one definition everywhere**: the player pause sets the single domain freeze bit (planned name `simulationFrozen`), so time freezes while effects still reduce and return outcomes. Lab mode (desaturation, free-cam, picking) is a `PlaySession` interface flag that also holds the bit. Free-cam keys are gated on lab mode, not on `isPaused()`. `hx-reducer-and-frame-safety` owns the bit and its acceptance. There is no second domain pause flag. Enforced by a reducer outcome test and a pause test (to be written).
- **R7 Resource ledger** (planned: cm-ledger-and-emergency). Stipends, funds and pressure stocks are `ResourceLedger` entries. Insertion spends Delta and requires `zenith`, and is rejected otherwise (planned: 09-delta-coupling-and-forecast). Pressure stocks get diegetic tells. Enforced by a ledger reconciliation test (to be written).
- **R8 Epoch-end reads both ledgers and the Observation table** (status: open). The ending reads `materialScars` and `veilScars` and the Observation table. What counts as a finished Epoch 1 is open (see Open, deferred and parked): the owner has not addressed it, and no definition of done is written.

**Standing rule: freeze extension** (planned: pre-05b-launch-validation). No new kind or effect without content that uses it. Settle the clock model before more time-bearing schema. No deletion. An arch test in the kind-table change guards it (see Launch validation, kind table and fixtures), not prose.

### Engineering rules (planned)

Rules that bind how the code is built, kept here so the security record is the first of them. Later engineering rules append to this section.

#### Bridge lock (planned: hx-ops-safety)

The dev-server write routes (`PUT /api/scene-blueprints`, `PUT /api/character-visuals`, the session log and save routes) currently accept a cross-origin simple POST, reproduced twice on loopback-only probes. The fix runs first in the whole plan and is independent of everything else.

- **One guarded write-route helper** (planned: hx-ops-safety): every lab route reuses it (Stage Lab, Sound Lab `PUT /api/audio-patches`, Pacing Lab `GET`/`PUT /api/pacing-profiles/:profileId`) and none re-implements the checks. It enforces an `Origin` allow-list, a `Host` check, `Content-Type`, a per-run token, size limits that destroy the stream, and allowlisted paths with realpath containment.
- **Explicit `server.cors`**: set in Vite config rather than left to the default.
- **Test and logger**: an http middleware test on `127.0.0.1:0` exercises the real middleware, not a mock. The logger rotates the prior session into `logs/prev` instead of truncating it on start.

#### Determinism, fixed step and phases (planned: hx-1-legacy-clamp-seed-scramble, hx-fixed-step-tick, hx-determinism-harness, hx-kinematics, hx-reducer-and-frame-safety)

- **Seed scramble**: a world seed passes `splitmix32` before it reaches `SeededRandom`, so adjacent seeds do not give correlated streams. A golden-vector test pins it. RNG held outside `WorldState` is replaced by the stateless keyed `roll(worldSeed, streamKey, counter)` (planned: cm-act-envelope-and-rolls).
- **Fixed step**: Clock 1 runs on a fixed `1/60` s step with an accumulator and capped catch-up. Raw-dt stepping is replaced, and tests split a frame's dt to prove the result is the same.
- **Golden run**: `hashWorldState` and a golden run through `runScenario`, with shuffled insertion order, throwing `Math.random` and `Date` stubs, a slice JSON round trip and a phase-order test.
- **One lint block**: a single ESLint determinism block covers domain, non-scene content and application, and bans `node:*`, `require` and non-literal `import()`. Today the guards are literal-only and application has none. When it ships, the `AGENTS.md` layer table gains `Math.random` and `Date.now` bans on the application row, which lists none today.
- **Interpolation seam** (planned: hx-fixed-step-tick): the accumulator keeps the previous `WorldState`. `RenderFrameBuilder` receives the previous and current poses, an `alpha` and a teleport marker, and lerps positions, shortest-arc yaw and the camera focus, so rendering can run between fixed steps. Teleports and room changes do not interpolate. It lands as its own commit, and the application README and `AGENTS.md` record it when it ships.
- **Phase order** (planned: hx-fixed-step-tick, hx-kinematics, hx-reducer-and-frame-safety): commands, watch, materialize, kinematics, cognition, commit, flush. A named `PHASES` order is pinned by a test, because phase order is the main determinism risk.
- **Move outcomes as data**: a move ends with `Arrived`, `Blocked` or `Interrupted` and a `residualDt`. A door closing mid-route no longer causes a silent doorway dwell, a retarget plans from the body's position and not the last waypoint, a zero-speed move is rejected, and a hop is measured in metres.
- **Frame safety** (planned: hx-reducer-and-frame-safety): the frame `try`/`catch` re-arms `requestAnimationFrame`, and `PlaySession.status` is recomputed per call instead of sticking. Section `AGENTS.md` updates ride the shipping change.

#### State, saves and pack identity (planned: hx-slice-store, hx-save-integrity)

- **Slices**: frozen on write and shared on read. Today the store deep-clones on every read and write and appends in O(n). The target is O(1) append, guarded by frozen-output invariant tests. `StateSliceKey<T>` gains an optional `schema`, `version` and `migrate`, and a plain-JSON guard so a `Map` or `Set` cannot enter a slice.
- **Codec**: `WorldStateCodec` owns `snapshotVersion`, the Zod load, the migrations chain and the epoch check, replacing four copies of the world-state field list. A save round-trip scenario guards it, and each of its three parts is its own task with its own round-trip test.
- **Pack identity**: saves carry `packId` and `version`, and load checks the pack and the epoch. Decision: one registry per epoch, with cameo content only through an explicit import list. Fingerprint reconciliation is parked with the epoch-transition change (`10-registry-swap-and-legacy`).
- **Entity ids**: one entity-id pattern check at load and at materialize stops a bad id throwing in the render loop, and `listSlots` reports why a slot is unreadable.
- **Save policy (owner decision)**: autosave at watch boundaries plus named manual saves. Loading ANY earlier save is allowed; the owner wants rollback. The notebook (the player's Observations) is part of the save, so loading restores the knowledge state of that moment. Keyed rolls (`roll(worldSeed, streamKey, counter)`) mean a reload does not reroll outcomes unless the player acts differently. An optional ironman mode is parked (`ironman-mode`). This is a gate before `cm-observation-notebook`.
- **Legacy clamp** (planned: hx-1-legacy-clamp-seed-scramble): a legacy mutation clamps to `[0, 1]` with a telemetry note instead of throwing, and the throw stays only as an authoring-time contract test. `sourceScarId` is checked against the scar set (planned: 05b-1-watch-clock-and-time-spend). Scars record the watch (R1). Accumulation across epochs waits for `10-registry-swap-and-legacy`. The domain `AGENTS.md` legacy section is updated by the shipping change.

#### Launch validation, kind table and fixtures (planned: pre-05b-launch-validation, pre-05b-pack-source-of-truth)

- `validateLaunch(pack, stages, visuals)` collects every error with ids and file hints, and runs in `PlaySession` and in pack tests. Shape validation before it uses an interim loader check (planned: pre-05d-renderer-shape), which is then folded into `validateLaunch`.
- The epoch-agnostic denylist is derived from the exported packs and moved into `tests/architecture`, replacing the hand-typed list. `defineModuleKind` replaces the closed 11-kind registry, with a ref table. The freeze-extension guard lives here: an arch test fails a new kind or effect that no content uses.
- The docs-truth check first covers root `AGENTS.md` only; the check that every `*Blueprint` named in a section `AGENTS.md` exists lands in `pre-05b-pack-source-of-truth`, after those files are rewritten. Test fixtures leave the content barrel, and the content `AGENTS.md` recipes are rewritten to working steps.
- **Lab saves**: lab JSON is the source of truth. Packs and stages are JSON, loaded and Zod-checked at runtime through `validateLaunch`, with no emitted TS, and the bridge writes only allowlisted, schema-checked files. Until the loader exists (planned: pre-05b-pack-source-of-truth), a Stage, Sound or Pacing Lab save writes JSON the game does not load: nothing reads `src/content/scene/stages/*.json` at run time.

#### Telemetry policy (partial; planned: telemetry-wiring, hx-ops-safety)

- **As it is today**: the infrastructure NDJSON logger and rolling compactor exist and their caps hold (`50` MiB active, `500` MiB compacted). The browser game does not feed them yet: it keeps an in-memory log. The logger still empties both files at session start (fixed under Bridge lock, planned: hx-ops-safety).
- **Policy** (planned: telemetry-wiring): the Act log records what happened and is the gameplay record. Telemetry holds crash, warn, frame spikes and hash checkpoints. Decision traces come from replaying the scripted command log with tracing on (planned: 05f-eval-and-replay). Log nothing, replay with tracing.
- **Wiring**: browser telemetry goes through the guarded bridge, with a crash ring buffer flushed on throw. The CLI gains `limit`, `tail` and `count-by` on query, a newline guard and an `ENOSPC` warning. The debug skill text is made honest: no local ONNX decisions exist to trace. Root `AGENTS.md`, the infrastructure guide (it still names `npm run setup-models`, which does not exist), `README.md` and the debug skill still carry the old wording (every event logged, a local ONNX worker), and are rewritten in `process-gates-and-ledger` and again when the wiring and the text port ship. The `hybrid_nlp` pipeline value in the domain telemetry port and the skill's `aiReasoning.pipeline` union is renamed or removed by `telemetry-wiring`, with a generated-text value added when the adapter ships.

#### Tests, replay and allocation (planned: hx-slice-store, hx-determinism-harness, 05f-eval-and-replay)

- **Tests and builders** (planned: hx-slice-store): each test ships with the fix that needs it. Shared builders live in `tests/support` (`makeRegistry`, `makeWorldState`, `makeStageBlueprint`). Monolithic tests are split onto them, and the bridge gets http-level tests. Acceptance lines for frozen inputs, RNG golden values, caps, mid-hop states and dt splits are added to the hardening changes. The split between `tests/`, `golden/` and `eval/` is in Local AI eval framework.
- **Layer-test blind spots** (planned: hx-determinism-harness): the layer test is to close `import =`, `export *`, barrel files, type-only imports, and enforcement of the content/scene rule. Every new invariant ships with a guarded test. Typed ESLint is later, attached to the first async-port change (the text port). Compiler-API import scanning is parked (`compiler-api-import-scan`).
- **Scripted command log** (planned: 05f-eval-and-replay): the artifact for golden tests, 05f fixtures and bug repro. It is not the player save format, because a reducer change invalidates a command log. The Act ring is frozen and bounded, and is chunked only if the benchmark at the expected cap fails. Dwell-site slots are later: data on the prop blueprint, with the final metre steered, not a new movement system. The replay-with-tracing tool is owned by the eval-runner change.
- **Allocation note**: per-frame allocation waste is a known cost. Decision: do nothing until a room holds `100+` bodies. No work is scheduled.

## Core model (partial)

> Status: partial. Blueprints and reducer cases for the abstractions in Economy and levers are shipped as schema; the runtime state, the seven primitives and the hubs below are planned. Names tagged (shipped) are existing code the planned text builds on.

**Terminology.** Throughout **Uplift**, **`Epoch` and `Era` are 100% synonymous** (`Epoch === Era`, so `Epoch 1 === Era 1`). Code and schemas use `epochId`.

**Core rule: epoch-agnostic engine abstractions with era-specific content bindings.** Every mechanic in Epoch 1 / Era 1 (*Highglass Hold*) is built on an **epoch-agnostic domain abstraction** with an explicit `lineageId`, so that when an Epoch concludes and exports `CivilizationLegacyState`, every institution, office, economic stock, communication backbone, character lineage, and rival alien footprint flows naturally into the next Epoch. The abstractions and how each flows across the ladder are tabulated in Economy and levers. The configurable ladder itself is in Epoch ladder and operative rotation.

### Seven primitives (planned)

Owner: accepts the 7-primitive core model and the corrected order in the roadmap, leaving plenty of room to add and modify. Only this file carries it. Each section `AGENTS.md` and `README.md` pair adds a primitive in the change that ships it. Nothing below exists in code yet except as named.

1. **Watch clock** (planned: 05b-1-watch-clock-and-time-spend): `elapsedWatches` on `WorldState` and one `advance_watches` effect. See the decision record in Clock and time.
2. **Act** (planned: cm-act-envelope-and-rolls): a single ground-truth event `{ id, actorId, verb, objectRef, motiveTag, spaceId, watch, perceptibility }` kept in a frozen bounded ring slice. Effects carry an optional `causeActId` through a wrapper envelope `{ effect, actorId?, causeActId? }`, so the existing effect variants are untouched. A `BehaviorModule` gains a `commit` that returns `WorldEffect[]`. Randomness inside an Act uses the stateless keyed `roll(worldSeed, streamKey, counter)`.
3. **Observation** (planned: cm-observation-notebook): one sparse "who learned what" table that merges Report, Trace and Belief. A row is `{ actId | claimId, holderId, channelId, strength, confidence, learnedWatch, hops, spoofSignature? }`. A Report is an Observation with channel latency. A Trace is an Observation held by a faction, and it decays. A Belief is an Observation held by an entity that carries a Claim. The player notebook is the player's Observations. Discovery layers (`noticed`, `assayed`, `attributed`, `theorized`) become a decaying view derived per observer from this table, and `set_discovery_layer` survives as a shim. A layer name is therefore view vocabulary, and a trigger that reads "attributed" means an Observation held by the relevant observer. A trigger threshold (`noticed`, `assayed`, `attributed`, `theorized`) applies to the observing faction's derived discovery level, not to a global ordinal. `Regard.exposure` is no longer the only record of who knows what; `Regard`, presence and this table share data. The belief maths that fix this schema are in Belief and deliberate misbelief.
4. **Presence function** (planned: cm-presence-and-materialize): a pure `(entityId, watch, seed) -> placement`, materialized when the player enters a room or spends a watch. Entities start off-stage. See Presence model.
5. **`ThreadRuntime`, `ResourceLedger` and `EmergencyRuntime`** (planned: cm-threads-and-pillars, cm-ledger-and-emergency): ordinary `StateSlice`s registered by packs. Thresholds and profiles live in blueprints.
6. **`LineBrief` and `gate(line, brief)`** (planned: 07-text-port-and-history): pure functions that read Observations.
7. **`TextSourcePort`** (planned: 07-text-port-and-history): an application port with authored, pool and generated adapters. Shown text is frozen into `ConversationHistory` and the save.

Storage stays bounded: Tier 3 holds nothing, Tier 2 holds data on demand, and epoch end compacts into scars. A performance prerequisite sits in front of the Act and Observation slices: the slice store deep-clones on every read and write, so large slices need structural sharing or writes batched per watch first (see State, saves and pack identity).

### Leverage Chain (planned)

Pillars gain `bearsOnThreadId` and `supportedBy` (the persons or institutions a pillar rests on). Thread inertia is derived from its pillars rather than stored as one float. A Leverage Chain is a derived query over shared supporters: two pillars that rest on the same supporter form a chain, so weakening that one supporter topples both. The player verb is `weaken_support`. The shipped `InertiaPillar` carries only `id`, `kind`, `weight` and `holderEntityId`; the extension is additive.

### System graph (partial)

Who writes and who reads each part of the economy and threat state today, drafted in the root-and-branch review and audited against code. Everything funnels through five hubs that do not exist yet: the watch clock, the Regard graph, thread runtime state, office/pretext/funds runtime state, and actor/provenance on effects. The reducer cases below are leaves hanging off hubs that are not there. The graph is the dependency spine: the hubs are built before any further leaf effect. Status is `schema`, `reducer`, `consumed` or `nothing`; "no dispatcher" means nothing in `src` emits the effect.

| Node | Writers | Readers | Status and gap |
| --- | --- | --- | --- |
| `pressureStocks` (3 scalars) | `adjust_pressure_stock`, `insert_illicit_instrument` (reducer only, no dispatcher) | snapshot and save serialisation only; the design wants storylets, travel cues, absorption friction, epoch export | reducer. No real writer, no real reader, no decay. |
| `discoveryLayer` (1 global ordinal) | `insert_illicit_instrument` (ratchet via `maxDiscoveryLayer`), `set_discovery_layer` (raw setter that can also lower it) | nothing; the design wants rival strike (`attributed` or higher), `extracted_overt`, trial | reducer. No reader and no referent (discovered by whom?). Planned: a decaying view derived per observer from the Observation table, with `set_discovery_layer` kept as a shim (planned: cm-observation-notebook). |
| illicit instruments (3 modes) | nobody (no player action, no office, no Delta cost) | the reducer case that fans out to stock, layer and scar | reducer. No writer, no cost, not tied to the orbital pass. Only the schema and the reducer reference it. |
| `activeEmergencyId` (1 slot) | `trigger_emergency`, `resolve_emergency` (no dispatcher) | `RenderFrameBuilder` camera fog, roll and pitch (the only real consumer in the economy graph); `compound_emergency_vices`; the coordinator uses the effects for a telemetry category | consumed cosmetically. No writer; `fuseTicks` (renamed `fuseWatches` by R1) has no state to count in; no behaviour reads it. |
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

### Presence model (planned)

Entities are placed at their authored start waypoint today.

- **Presence function**: each character has a watch-of-day presence table, resolved by a pure function `(entityId, watch, seed) -> placement`. The placement is materialized when the player enters a room or spends a watch. Entities start off-stage and do not spawn at a start waypoint.
- **Watch jumps**: room-second timers are reconciled with watches, and in-flight phases and stimuli resolve deterministically when a watch spend jumps the clock.
- **Bodies**: crowd and materialized NPCs get a mesh from present poses (planned: cm-presence-render-crowd; see Direct floor locomotion, contracts).
- **Macro levers**: a remote adversary or correspondent reaches the player as an Observation: a report, a letter, an overheard exchange or a trace. The owner sentence and its invariant eval are in Rivals.

## Clock and time (partial)

> Status: partial. The `SimulationPacingConfig` presets, the 60 Hz room step and the clamped frame delta are shipped. The watch clock, loop cycles, envelopes, storyteller and Pacing Lab are planned.

### Loop cycles (planned)

Three nested cycles, each on its own clock. Owner: the cost of talking comes from the world.

- **Minute cycle (the room, Clock 1)**: the player walks, uses and talks inside one room at `60` Hz. NPCs deliberate, move, dwell and cool down on room seconds. Nothing in the minute cycle advances a campaign watch by itself. Reading a conversation chunk is free and an ambient line is free.
- **Session cycle (watches spent, Clock 2)**: the player spends watches on Committed Time-Spend Actions: holding office, resting or studying, waiting on a courier, travelling. What returns on a watch boundary is the world having moved on: NPCs have moved on by watch (the presence function, not wall-clock beats), correspondence has arrived, stipends and fuses have run down, and the notebook holds what the player learned. Autosave lands at watch boundaries (see Save policy in State, saves and pack identity).
- **Epoch cycle (the epoch watch budget)**: one epoch is about `8–14` hours (`epochWatchBudget`). It ends by reading both ledgers and the Observation table (R8, still open), hands the operative role to a new crew (P3) and exports `CivilizationLegacyState` into the next epoch.
- **Talking costs time** (planned: 07-dialogue-paging): a conversation is a fractional time-spend verb (the integer unit that makes this exact, a finer unit under the watch, a per-conversation cost, or a carried remainder, is an owner decision pending). `05b-1-watch-clock-and-time-spend` owns the verb and its budget, and `07-dialogue-paging` charges it once per conversation, so the verb is not dead code. This is the world's price for talking: while the player talks, the world moves on. Reading one chunk is still free, and the conversation as a whole is charged once.

### Four clocks and the decision record (planned)

Why room-scale time and campaign watch time must be separate: local room embodiment (`stepKinematics` at 60 Hz plus `2–15s` deliberation, dwell and cooldown) is ideal for watching an NPC think, walk across a room at `1.4 m/s` and act, but if macro plotlines, horse couriers, stipends and NPC evolution also ticked every `10s`, an **~8–14 hour Epoch** (`50–100 hours` total campaign ÷ $N$ configured Epochs; ~8–14h per Epoch on the 7-Epoch default ladder) would burn out in 15 minutes.

1. **Clock 1, 60Hz frame and room embodiment (`elapsedSimulationSeconds`)**: physical locomotion, door hinges, room acoustics, eavesdropping, and live conversation (`2–15s` phase timers). Never advances macro calendar time, with one exception: a conversation charges the talk cost once (see Loop cycles).
2. **Clock 2, campaign watch and Committed Time-Spend (`elapsedWatches`)**: monotonic integer watches (`watchesPerDay`, `daysPerSeason`, `epochWatchBudget`) advanced when the player performs **Committed Time-Spend Actions**: holding Office court/audits, resting/studying in Chambers, waiting on or expediting correspondence, or taking an Epoch 2+ travel vignette (`06c-epoch-travel-vignettes`).
3. **Clock 3, storyteller and plotline point-release director (`StorytellerPacingDirector`)**: evaluates on `elapsedWatches` advances to meter **Butterfly Thread point-releases** (the thread machine of R3, max 1 spine thread in `crisis_fuse` at a time), rival escalations, and **Compositional Storylets** (`StoryletTemplate` slot grammar, which `06a-interpersonal-regard-and-romantasy` extends with `RegardGraph` bindings).
4. **Clock 4, slow-drift NPC and social evolution**: closed-form per-watch / per-season drift on NPC `drives`, passive `Regard` cooling/grudge decay, `InertiaPillar` hardening (`Ignorance/Debt` early -> `Doctrine/Constituency` late), and career rank progression.

**Clock decision record (revisable).** `elapsedWatches` lives on `WorldState` and is advanced only by one `advance_watches` effect. `worldTick` remains the discrete effect and telemetry serial counter and is never time. Scars record the watch they were written on, not `worldTick`. Every `*Ticks` field (`stipendPerTick`, `baseTransitTicks`, `fuseTicks`, the orbital phase durations, `burnCostPerTick`, `orbitalOffsetTicks`) is renamed `*Watches` while it has no users; the rename is done by `05b-1-watch-clock-and-time-spend`, and `storytellerMinWatchScale: 0` joins `FAST_EVAL_PACING_CONFIG` with `05b-2-envelopes-and-gates`. The four-clock shape above is kept. Clock 1 runs on a fixed `1/60` s step with an accumulator (planned: hx-fixed-step-tick; see Determinism, fixed step and phases). Rule R1 states the rule and its test.

### Pacing profiles and curve envelopes (planned)

Nothing about pacing speed, Epoch count ($N$), or tension dynamics is hardcoded. Every pacing dimension is driven by a Zod-validated `PacingProfileBlueprint` and `CurveEnvelopeSchema` (`src/content/pacing/*.json`) using piecewise control-point **curve envelopes** (`points: [{ progress01, value, interpolation: 'linear' | 'smoothstep' | 'step' }]` plus optional wave modulation `cyclePeriodWatches`, `onPhaseDutyCycle01`, `recoveryFloor01`):

1. **`storytellerTensionEnvelope`**: shapes the macro tension/threat ceiling and RimWorld-style pressure-and-recovery waveform across the Epoch (`0.0 -> 1.0`).
2. **`pointReleaseCadenceEnvelope`**: controls `minWatchesBetweenReleases` and Storyteller budget costs for Butterfly Thread point-releases across Acts I–III.
3. **`npcEvolutionEnvelope`**: controls `maxDriveDeltaPerWatch`, `Regard` drift rates, and `InertiaPillar` hardening speed across the Epoch.
4. **`storyletDensityEnvelope`**: controls the injection rate and cooldowns of compositional storylets (Office cases, Writing Desk dilemmas, Rival moves, Romantasy probes, Travel encounters) between spine releases.
5. **`timeHorizonConfig`**: controls `campaignLengthMultiplier` (e.g., `0.25x` quick run vs. `1.0x` 50–100 hr campaign), `watchesPerDay`, `epochWatchBudget`, and watch costs per activity.

**Live `F3` Pacing and Envelope Inspector** (planned: 05b-2-storylets-and-lab). `GET`/`PUT /api/pacing-profiles/:profileId` do not exist yet and will go through the guarded bridge write-route helper (see Bridge lock; planned, built by hx-ops-safety). The lab will allow tweaking any envelope control point, duty cycle or time multiplier live in game, run a `<10ms` headless preview rollout of an Epoch's watch budget to inspect release spacing, and save the updated profile directly to disk (until the pack loader exists that save writes JSON the game does not load; see Lab saves in Launch validation, kind table and fixtures). The preview stays a projection and never writes `WorldState`. The curve envelopes are tuned against the end card of the vertical slice (planned: 11-pass-1-ledger-end-card).

### Storyteller deck, thread gates and storylets (planned)

- **Deck**: the storyteller is a seeded card deck over the thread state machine (R3), and not a free scheduler. It is Clock 3, `StorytellerPacingDirector`.
- **Gates**: the five-stage gates of R3 hold the point-releases.
- **Storylet cards**: a card is a Tracery-style storylet grammar (`StoryletTemplate` slots), and its words go through the text port (see Text pipeline).
- **Open question**: authored quality-gated storylet cards versus generated cards is settled by the authored/generated split and the hybrid pipeline (see Text pipeline). Only the storylet-card question is left to the storyteller change (`05b-2-storylets-and-lab`).

### Pacing config and fast-eval override (shipped)

All pacing and anti-thundering-herd parameters live in an explicit `SimulationPacingConfig` (`deliberationScale`, `baseDigestionDelaySeconds`, `cascadeBackoffFactor`, `maxAutonomousCascadeHops`, `maxCognitiveEvaluationsPerPulse`, `allowUnclampedFrameDt`). Live gameplay uses `DEFAULT_GAMEPLAY_PACING_CONFIG` (human-paced timers, 2-hop cascade cap, 1 evaluation per pulse, `0.25s` frame clamp). Automated unit and simulation tests and the local AI eval runner inject `FAST_EVAL_PACING_CONFIG` (or custom overrides) to zero out deliberation and digestion delays, waterfall zero-duration phases in a single pass, raise evaluation and hop caps, and step large virtual `dtSeconds` so 100-step evals complete in `<20ms`. Planned: the fixed `1/60` s step with capped catch-up replaces raw-dt stepping.

## Epoch ladder and operative rotation (partial)

> Status: partial. The `CivilizationLegacyState` export and `applyLegacyToCharacterBlueprints` are shipped. The ladder blueprint, inter-epoch maturation, crew handoff, extraction stills and predecessor traces are planned. No epoch-ladder blueprint exists in code today.

### The configurable ladder (planned)

The campaign ladder is an ordered array of `EpochProfileBlueprint[]` ($N \ge 1$, where the final entry has `isTerminalEpoch: true`). The **default 7-Epoch / 7-Era grand civilizational arc** below is **data-driven and never a hardcoded engine constant**, so Epochs can be added, removed, split or reordered in content configuration at any time without structural rework. This is the one place the ladder is stated; the rest of this file and the content docs point here.

**Uplift-driven historical compression.** In an un-contacted baseline society, progressing from Feudalism to the Space Age takes 600–800 years. The covert Uplift presence compresses the transitions between the configured Epochs into generational intervals (`15–30 years` between operatives: `4–6 years` of post-climax work before extraction plus `11–24 years` before the next operative lands), so the civilization climbs the full ladder within **~110–200 in-world years**. Skins below are content exemplars for the default ladder, never engine constants.

| Epoch (Era) | Rung and defining content | Drone disguise (`3–6` per Epoch) | Cover-persecution apparatus | Diegetic surface | Travel vehicle skin |
| --- | --- | --- | --- | --- | --- |
| 1 | **Feudal** (*Highglass Hold*: feudal court, guilds, Synod orthodoxy, horse couriers, naked-eye omens, Witch-Hunt Inquisition) | reliquary lamp / lantern | *Synod Witchcraft & Heresy Inquisition* | parchment broadsheets, smeared ink, wax seals, linen maps | none (local walking) |
| 2 | **Renaissance** (printing charters, optical lenses, merchant banking houses, humanist inquiry vs. dogmatic rifts) | astrolabe / pocket-chronometer | *Dogmatic Index & Heresy Tribunal* | printed pamphlets | hired coach / river barge (regional, 2–4 destinations, high watch cost) |
| 3 | **Pre-Industrial / Colonial** (chartered trading companies, optical semaphore & post networks, navigational observatories, mercantilist resource wars) | sextant / barometer | *Charter Sedition & Admiralty Assize* | colonial gazettes | coastal packet / post-coach |
| 4 | **Industrial / WWI-equivalent** (steam/coal/rail networks, telegraph wires, mass conscription, factory labor vs. capital, industrial/chemical warfare dual-use ceilings) | brass theodolite / telegraph ticker | *Wartime Espionage & Sabotage Court-Martial* | telegraph tape / newsprint | rail / steam packet |
| 5 | **Cold-War-era equivalent** (ideological blocs, radio/television/CRT, nuclear/strategic deterrence dual-use ceilings, intelligence agencies & black-sites) | field-radio / dosimeter | *Counter-Intelligence Black-Site & Un-Civil Activities Committee* | Cold-War dossiers / CRT | motorcade / propeller air |
| 6 | **Computer-Age** (global digital networks, email/cloned ledger hashes, algorithmic surveillance, corporate/state information monopolies) | diagnostic terminal | *Algorithmic Anomaly Warrant & State-Corporate Blacklist* | computer terminals | high-speed rail / airliner |
| 7 | **Space-Age / First-Contact** (also written Space-Age/1st-Contact; `isTerminalEpoch: true`; orbital telemetry/satellites, indigenous planetary defense capable of deflecting the Intersecting Comet, culminating in First Contact readiness) | telemetry drone | *Planetary Security Quarantine & Extraterrestrial Infiltration Hearing* | space-age telemetry consoles | indigenous suborbital hopper |

Three skin chains advance with the ladder but do not map one to one onto rungs:

- **Communications backbone**: horse courier -> printed post -> optical semaphore -> telegraph wire -> radio/CRT -> digital network/email. Whoever controls the Glass River Gorge and Highglass Optics at the end of Epoch 1 inherits ownership and censorship control over each later backbone, and sets the harmonic signature of the next Epoch's communication notifications (see Audio).
- **Detection Tech Level** (`detectionTechLevel`; `0..1`: naked-eye omens/astrologers -> Renaissance lenses -> Colonial observatories -> Industrial telegraph geomagnetism -> Cold-War radar -> Computer/Space-Age orbital telemetry). It makes high-Delta Burns and orbital contingencies progressively riskier if earlier Epochs left high Veil Scars.
- **Diegetic news prop** on travel stages: broadsheet bundle -> gazette -> telegraph clerk -> radio -> terminal.

### Operative rotation (planned)

- **A new playable operative per Epoch (P3)**: rather than a single immortal groundside human across the campaign, **each Epoch dispatches a new playable Culture operative** (drawn from or authored in the Epoch's operative pool; e.g., Epoch 1 seed exemplar cover: **Ellin Quell**) with their own new Ship and Drone crew, arriving 11–24 years after extraction (15–30 years between operatives). Owner wording: P3. The crew's temperament ranges and disguise pool are in Advisors and lace. The objection that re-rolled advisors weaken the through-line is rejected by the owner (see Dispositions). A past-advisor cameo over the galactic network is a design note only (see Ideas, not scheduled), and is not built in the crew handoff.
- **Adjacent-epoch living NPC continuity (`youth -> prime -> elder -> succeeded_by_heir`)**: because each inter-epoch gap is **15–30 years**, **`youth` (`15–29`) and `prime` (`30–49`) NPCs from Epoch $k$ are still alive as `prime` or `elder` (`50–75`) in adjacent Epoch $k+1$ (alongside their immediate children and protégés)**. They personally remember your predecessor and have lived through the one-rung generational leap (e.g., from Epoch 1 horse couriers to Epoch 2 printing charters and optical lenses, or from Epoch 4 steam/telegraph to Epoch 5 radio/Cold-War blocs), while `elder` NPCs from Epoch $k$ (and earlier generations by Epoch $k+2+$) pass their seats to their `lineageId` heirs and descendants.
- **Expanding landing choices**: prior Epoch progress unlocks more `LandingZoneBlueprint` entry points and social covers as the reachable world grows larger and more interconnected each Epoch.
- **Predecessor traces**: `bindPredecessorTraces(stage, specs)` (planned: 10-registry-swap-and-legacy) grafts **visible and uncoverable traces** of your predecessor's work onto the new stage (`semanticId` wall motifs, monuments, refurbished Chambers props, marginalia in ledgers/archives, dynastic descendants, and cautionary ballads/folklore).
- **Kinship claim (`kin_claim`) versus starting afresh (`fresh_start`)**: claiming to be related to (or the direct lineal or institutional heir of) your predecessor unlocks warm `respect`/`obligation`/`trust` edges and fast-track Office access with lineages (`lineageId`) that revered your predecessor, but also inherits their `betrayed` faction grudges, rival targeting profile, and `coverPersecutionRisk`. Starting afresh gives a clean personal slate (`0` inherited personal grudges/persecution) while still letting you build on your predecessor's structural work.
- **Legacy clamp**: a legacy mutation clamps instead of throwing (see Legacy clamp in State, saves and pack identity).

### Anti-over-acceleration ceilings (planned)

- **No rung-skipping or mid-Epoch tech runaway** (`EpochTechCeilingBlueprint`, `maxMaturationStepPerTransition = 1`): while Uplift compresses the *years* between Epochs, mechanics must never skip rungs or break an Epoch's internal coherence. Every `EpochProfileBlueprint` enforces a strict `maxTechTierForEpoch` ceiling for its rung, and `runInterEpochMaturation` advances the civilization by **at most 1 Epoch rung per transition**.
- **Surplus momentum and `absorptionCapacity` friction**: surplus Uplift progress within an Epoch beyond `maxTechTierForEpoch` converts into **compressed maturation time and horizontal institutional readiness** (smoother absorption of the rapid generational leap, lower `subsistence_pressure`, softer `Ignorance` pillars, and wider landing-site choices for the next operative), whereas pushing faster than `absorptionCapacity` without institutional scaffolding triggers future-shock backlash, guild/labor riots, Dual-Use Ceiling wars, or `coverPersecutionRisk`.

### Extraction stills (planned)

The `ExtractionStillFrameBuilder` (zero repo bloat) renders a 4-beat chiaroscuro still sequence using the existing Three.js stepped-toon kitbash renderer (`#1a1f28` shadow bands, `#c4a574` pools, silhouette-first dioramas parameterized by your operative's actual deeds, Office, wardrobe, and scars): (1) *Final Years of Groundside Work*, (2) *Nocturnal Orbital Pick-Up*, (3) *GCU Voyage Home*, and (4) *Culture Reunion & Successor Handoff*.

## NPC minds and belief (partial)

> Status: partial. Human-paced cognition phases and the cascade dampening in the coordinator are shipped, with the stimulus cap, diffusion, belief maths and the Regard web planned.

### Cognition phases and cascade guardrails (partial)

- **Human-paced cognitive phases**: even though the CPU evaluates utility scores in `<1ms`, NPCs must think, move and act at a human pace in live gameplay. Every `BehaviorModule` defines `deliberationSeconds` (thinking pause before moving), `dwellSeconds` (time spent physically performing the action at the waypoint before its `WorldEffect` commits), `cooldownSeconds` (recovery pause after acting), and `requiresExternalTrigger` (allowing an NPC to make a decision and then pause in `awaiting_trigger` until the next player-created or macro-world trigger rather than speed-running an entire plot chain). The phase order of a whole step and the move outcomes that end a dwell are in Determinism, fixed step and phases.
- **Anti-thundering-herd NPC-to-NPC cascade dampening**:
  1. **Digestion delay and exponential hop backoff (`cascadeHopCount`)**: when NPC A triggers NPC B (`enqueue_npc_stimulus`), the stimulus is queued with a digestion delay that scales with `cascadeHopCount` (`baseDigestionSeconds * backoffFactor^hopCount`). Once `cascadeHopCount` reaches `maxAutonomousCascadeHops` (default `2`), further propagation pauses in `awaiting_trigger` until a player or macro-world beat occurs (`release_external_trigger`).
  2. **Round-robin token-bucket evaluation (`maxCognitiveEvaluationsPerPulse = 1`)**: `SimulationCoordinator` staggers cognitive evaluations via `cognitiveRoundRobinCursor` so at most one NPC transitions into `deliberating` per pulse, eliminating synchronized NPC stampedes.
  3. **Stimulus cap** (planned: cm-act-envelope-and-rolls): the stimulus queue cap evicts by priority and then age, with dedupe of repeats, instead of by age alone, so a flood of low-priority stimuli cannot push out a high-priority one. The Act record and keyed rolls that come with the same change are in Core model, Act.
- **Embodied cascades versus information diffusion** (planned: cm-diffusion-and-balancing): the 2-hop cap above governs embodied NPC-to-NPC cascades in a room, and it stays. Information that travels between people (a rumour, a report, news) is diffusion: closed form, advanced per watch, and never driven by wall-clock beats, which would break pause and punish reading. The cost of talking is in Loop cycles and is not a beat.
- Pacing parameters and the fast-eval override are in Clock and time, Pacing config and fast-eval override.

### Belief and deliberate misbelief (planned)

Belief maths are integer maths, with no decision model in the simulation path (see Text pipeline, AI notes). Learning stays offline.

- **Combiner**: belief on an Observation is an integer fixed-point noisy-OR. Parents that share an origin or channel collapse before combining. A spoof is a separate negative term. An order-independence test and a parent cap guard it, and each step carries a reason tag so the notebook can show why a rumour is strong. All of this is decided before the Observation schema freezes.
- **BeliefView**: NPC considerations read the actor's branded `BeliefView`, never world state. A contract test catches omniscient reads.
- **Utility** (planned: 06-utility-ai): NPCs use belief-conditioned utility terms. Expected-utility planning is for rivals only. Low confidence maps to investigate or wait. The vertical slice does not yet condition NPC utility on belief.
- **Deliberate misbelief (P4)**: NPCs acting on stale or spoofed beliefs are the readable mistakes that P4 depends on.
- **Offline learning only**: tuning keys and tables are fitted from deterministic self-play and committed as data tied to the rules hash, so a rule change invalidates them. Player style is tracked with counters, and tuned offline only.
- **Rejected at runtime**: general probabilistic-programming engines, learned nets and JEPA-style world models. A small, capped exact-inference network is bit-stable and acceptable only if a later need appears (`inv-f-exact-inference`).

### Regard web and Romantasy (planned)

- **Shared on-stage and off-stage social web**: every interactable character (local visible NPCs of Tier 1 `utility_schemer` and Tier 2 `role_routine`, off-stage non-visible Correspondent NPCs, Rival Alien Operative covers, the Player Operative, and the two Culture Advisors `advisor_integral` and `advisor_particular`) shares the same directed `Regard` graph (`holderId -> targetId`).
- **Scaling to 500+ interactable characters on a 2019 Intel Mac (2-tier hybrid social graph)**:
  1. **Tier 1, zero-allocation faction/role/lineage baseline priors (`computeBaselineRegard(holder, target)`)**: unmet or unperturbed pairs never allocate memory or save-file bytes ($0$ cost instead of a $500 \times 500 = 250,000$ dense matrix); their baseline standing is computed in $O(1)$ time from faction, institutional lineage, and role affinity rules.
  2. **Tier 2, copy-on-write sparse materialized personal edges (`RegardGraph` plus salience pruning)**: personal `RegardEdge` records are materialized only for authored relationships and pairs that interact, correspond, witness each other, or are touched by a rumor/scheme (~15–40 personal edges per character = $7,500\text{–}15,000$ edges at $N = 500$, `<2 MB` RAM). Stored off `EntitySimulationState` so 60Hz `stepKinematics` never clones social maps; `adjust_regard` updates a single holder's adjacency map in $O(1)$ copy-on-write time; and edges that decay back to baseline with `bondKind: 'none'` and zero `obligation`/`exposure` are automatically garbage-collected back to Tier 1 priors.
- **Multi-axis `RegardEdge` contract**:
  - `affection` (`[-1, 1]`): warmth, attraction, personal fondness vs. scorn (softens `Temper` inertia pillars; gates private Chambers visits).
  - `respect` (`[-1, 1]`): deference to competence/status (drives Contested Office coalition math and guild/military obedience).
  - `trust` (`[-1, 1]`): belief in honesty/safety (gates sharing secrets, Writing Desk enclosures, and co-conspiracy).
  - `dread` (`[0, 1]`): fear/coercion/reputation of danger (bypasses `Temper` under threat, hardens `Doctrine`, and triggers a Pendragon-style `torn` flag when both `affection >= 0.6` and `dread >= 0.6`).
  - `obligation` (`[-1, 1]`): directed favor/hook balance (`+` = target owes holder; `-` = **reverse hook** where holder owes target; satisfies `Debt` inertia pillars).
  - `exposure` (`[0, 1]`): scandal/leverage this holder knows about the target.
  - `bondKind`: `'none' | 'courtship' | 'entanglement' | 'kin_claim' | 'patron' | 'rival' | 'betrayed'`.
- **Triangulation, proxy co-signing and autonomous NPC-to-NPC relationships**: correspondence to off-stage NPCs evaluates relational triangles (`Regard(Correspondent -> Player)` vs. `Regard(Correspondent -> LocalTarget)`), and players can use a local ally/lover (`Player -> Ally`) to **co-sign or seal a letter**, borrowing `Regard(Correspondent -> Ally)` ($O(d)$ 1-hop adjacency lookup in `<0.05ms`). On-stage and off-stage NPCs maintain autonomous `courtship`, `entanglement`, `patron`, and `rival` edges with each other, reacting with jealousy, stipend cuts, or leaks when their partners are seduced, exposed, or harmed.
- **Manipulative Romantasy, hidden motives and 6 discovery channels**: Tier 1–2 NPCs carry a hidden `RomanticMotiveBlueprint` (`genuine_devotion`, `faction_honey_trap`, `social_climber`, `martyrdom_shield`, `rival_operative_asset`, `blackmail_bond`) while player romance choices track `authentic` vs. `instrumental` stance. Players uncover an NPC's hidden motive via 6 gameplay channels: (1) **60Hz waypoint vs. conversation-promise mismatch** (the promise is a line in that NPC's conversation bubble while the player is talking to them), (2) **Writing Desk seal/transit interception**, (3) **acoustic eavesdropping through ajar doors**, (4) **The Lamp's physiological/smell tells** (and deliberate `0.55`-loudness bronze chain clinking when the deontologist Drone resents a manipulative seduction), (5) **The Ending's statistical anomaly briefings**, and (6) **planted bait secrets**.
- **Legacy**: romantic bonds, dynastic claims, and betrayals export in `CivilizationLegacyState` (`LineageBondLegacy` keyed by `lineageId`), directly shaping how lineages react when the next Epoch's operative claims kinship with their predecessor.

## Economy and levers (partial)

> Status: partial. Blueprints and reducer cases for offices, instruments, pressure stocks, pillars, channels, the orbital pass, emergencies and the legacy ledgers are shipped as schema (see System graph for what each node lacks). The runtime ledger, assassination, cover persecution, orbital blackout and contingencies are planned.

### Levers and how they flow across the ladder (partial)

Each universal abstraction has an Epoch 1 / Era 1 (*Highglass Hold*, Feudal) expression and a rule for how it flows across the configurable ladder (see Epoch ladder and operative rotation).

| Universal domain abstraction | Epoch 1 / Era 1 expression | How it flows across the ladder |
| --- | --- | --- |
| **Contested Offices & Pretexts (`OfficeBlueprint`, `institutionalLineageId`)** | *Court Physician*, *Foundry Inspector*, *Prelate's Confessor*, *Master of Coin* + a deniable *Quiet Claim*. Grants socially legal **Pretexts** (`medical_quarantine`, `ideological_censure`, `technical_audit`, `monetary_assay`, `protocol_immunity`). | Each Office carries an `institutionalLineageId` (`lineage_public_health`, `lineage_industrial_standards`, `lineage_orthodoxy`, `lineage_monetary_audit`). How you used/abused the chair in Epoch $k$ mutates the jurisdiction and corruption of its successor institution in Epoch $k+1$ (e.g., *Court Physician* -> Renaissance Anatomist Guild -> Colonial Quarantine Board -> Industrial Sanitary Commission -> Cold-War Bio-Directorate). |
| **3 Illicit Orbital Insertion Modes (`IllicitInstrumentType`)** | 1. `unbacked_mass_commodity`: *Pure Bullion* (spikes subsistence prices; fails assay because it is *too* pure).<br>2. `forged_fiat_instrument`: *Counterfeit Coin* (low inflation, high treason risk from duplicated die/batch flaws).<br>3. `anachronistic_marvel`: *Impossible Cut Gem* (buys elite favors, warps prestige, creates a permanent **Veil Scar** rumor that rivals track across ages). | The three abstract modes stay identical across all configured Epochs while their content skin evolves per rung (e.g., Bullion -> Crucible Ingots / Strategic Ore / Unregistered Energy; Counterfeit Coin -> Forged Letters of Credit / Bearer Bonds / Cloned Ledger Hashes; Impossible Gem -> Achromatic Lens / Precision Chronometer / Room-Temp Superconductor). Anachronistic marvels left behind physically persist as crown/museum relics in later Epochs.<br>Insertion spends Delta and requires `zenith` (R7). Coupling coefficients and discovery floors become data profiles per mode, registered by packs, with decay keys (planned: cm-instrument-profiles-audibility-tells). One table of loops, each with a tuning key, and forged fiat no longer jumps straight to `attributed` (planned: cm-diffusion-and-balancing). |
| **3 Societal Pressure Stocks (`PressureStockType`)** | 1. `subsistence_pressure` (*Grain/Bread*)<br>2. `production_pressure` (*Charcoal/Iron/Herbs*)<br>3. `elite_prestige_pressure` (*Court Gifts/Indulgences*) | Flows continuously as the three macroeconomic gauges of any age (`subsistence`, `production`, `elite_prestige`), carrying forward unresolved structural imbalances or guild grievances. The economy is a stock-flow model, and the stocks become `ResourceLedger` entries with diegetic tells (see Resource ledger). |
| **Inertia as Load-Bearing Pillars (`InertiaPillar[]`)** | Resistance is composed of 3–5 concrete pillars (`Doctrine`, `Constituency`, `Debt`, `Temper`, `Ignorance`) rather than one opaque float. Early in a thread only `Ignorance`/`Debt` stand; late in a thread `Doctrine`/`Constituency` harden, requiring an Emergency or Orbital Miracle. | Pillars are epoch-agnostic. In any era, identifying that two pillars rest on the same person/institution lets a clever player topple both with one Leverage Chain (see Core model). |
| **The Communications Desk (`ChannelMediumBlueprint`)** | *The Writing Desk* in your Chambers: choice of Stationery (vellum vs liturgic sheet), Seal (official, personal, forged), Courier Tier (runner, insured horse, smuggler), and Enclosures. Replies arrive via Knock at Door, Public Posting First, or Silent Wrong Action. The Writing Desk uses the text port (planned: 06-overview-writing-desk-report); there is no free-text player input. | Uses the universal `MessageTransitQueue` (`06-overview-writing-desk-report`). Crucially, **whoever controls the Glass River Gorge & Highglass Optics at the end of Epoch 1** (Synod vs Guild Charter vs Military) inherits ownership and censorship control over each subsequent Epoch's faster communication backbone (chain in Epoch ladder and operative rotation). |
| **Orbital Pass Cycle & Borrowable Time (`OrbitalPassBlueprint`)** | Ship orbits through `zenith`, `horizon`, and `occluded`. Player can spend **Delta (Orbital Indiscretion)** to **Slingshot** (arrive early, lengthening next occlusion) or **Burn** (linger at zenith, leaving a stationary-star omen in the sky). | Orbital mechanics are universal across all Epochs. What changes in later Epochs is the civilization's **Detection Tech Level** (see Epoch ladder and operative rotation). |
| **Emergencies Charge Interest (`EmergencyStateBlueprint`)** | Pauses routine behaviors while **compounding suppressed vices** behind closed doors (e.g., Castellan hoards tinctures during a plague). Players can deliberately light small emergencies (e.g., a dye-house fire) as a pretext to suspend procedure. Cardinality and fuse are rule R5. | Universal simulation state machine across all Epochs (`plague_triage`, `military_mobilization`, `ideological_trial`, `civic_riot`, `financial_run`, `assassination_lockdown`). |
| **Dual Legacy Ledgers (`materialScars` vs `veilScars`)** | Separate ledgers in `CivilizationLegacyState` (`InheritedScar[]`): **Material Scars** (famine, oligarchy, warlord guilds, secret guild method) vs **Veil Scars** (miracle-dependent faith, witch-hunt police, unexplainable relics, doctrinal rifts). | Prevents optimizing a single score. Every Epoch transition reads both ledgers to mutate successor factions, starting crises, and how suspiciously the new age views off-world anomalies. |

### Resource ledger (planned)

The reducer holds `pressureStocks` as three scalars and nothing writes or reads them in play.

- **Economy hub**: `ResourceLedger` is the economy hub in the system graph. Stipends, funds and the three pressure stocks are ledger entries in one slice registered by packs, so a ledger write has a reader. Thresholds and profiles live in blueprints.
- **Tells**: pressure stocks get diegetic tells in the world, so a stock is something the player can notice and not a meter.
- **Rule**: R7 is the one rule line. The runtime `EmergencyRuntime` lands in the same change without its fuse (R5).
- **Which "ledger" means what**: `ResourceLedger` is the economy hub above. The Omen Ledger that weather modification will write (planned: 09-weather-omen-and-export-gate) is reconciled with this naming, so there is one ledger vocabulary. `orbitalContingencyLedger` is the campaign contingency draw in `CivilizationLegacyState` (planned: 09a-doomsday-clocks-and-rival-unveiling; no such field exists in code yet). The dual legacy ledgers are `materialScars` and `veilScars`. The "ledger visible" criterion on the vertical-slice end card (`11-pass-1-ledger-end-card`) is a further use of the word, and that change settles which ledger it shows.

### Assassination and cover persecution (planned)

- **4 assassination vectors (`AssassinationVectorBlueprint`, an option of last resort)**:
  1. `drone_instrument` (*Companion Drone Precision Strike*): very high success (`~0.78+`), fast rival anomaly detection (`assayed`/`attributed`), severe *Lamp* moral revulsion (`affection`/`trust` drop, `dread` spike).
  2. `local_agent` (*Hired / Manipulated Local Agent*): medium success (`~0.52`, boosted by `obligation`/`dread` hooks), low off-world anomaly signature, high *Brother Assassin* martyrdom backfire if botched.
  3. `staged_pretext` (*Staged Medical/Industrial Accident*): medium–high success (`~0.73` with matching Office Pretext), lowest local suspicion if pretext holds, huge spike if exposed.
  4. `correspondence_enclosure` (*Sabotaged / Poisoned Enclosure*): medium success (`~0.45`, requires courier `trust`), low–medium suspicion.
- **Counter-assassination against the player (local agent vs. rival spacefaring operative)**:
  - **Local retaliation**: triggered by botched player plots, `assassination_lockdown` emergencies, or Tier 1 NPCs with `betrayed` / `torn` `RegardEdge`s. Resolution depends on `droneInterceptQuality` derived from `Regard(advisor_particular -> player)`: high disposition (`>= 0.75`) is a **Silent Intercept** (`0` Veil/Persecution spike); medium disposition (`0.45–0.74`) is a **Noisy Miracle** (saves the player, spikes `coverPersecutionRisk`, and leaves the witnesses an Observation at the `noticed` or `assayed` level, so their derived discovery level advances to that threshold); low or alienated disposition (`< 0.45`) is **Drone Hesitation** (the player suffers a non-fatal wound or incapacitation, or capture into an `ideological_trial`).
  - **Rival spacefaring operative strike** (*The Tithe*, *The Quiet*, *House Reciprocal*): triggered when a rival holds an Observation of the player at the `attributed` level or higher (R4; the threshold applies to that rival's derived discovery level), when pulling ahead on a Butterfly Thread, or when your Ship Mind is `occluded`. Uses off-world ordnance, neurotoxins and legal traps that even a devoted *Lamp* cannot silently negate without high Veil exposure or orbital `zenith` support.
- **Cover persecution / witch-hunt hazard (`AnomalousSuspectState` and `coverPersecutionRisk`, `0..1`)**: an epoch-agnostic state machine (`clear -> rumored -> examined -> charged -> condemned`) skinned per Epoch (the apparatus names are in the ladder table in Epoch ladder and operative rotation). Crossing the threshold triggers an `ideological_trial` emergency fuse with 4 escape valves: (1) **Office Pretext** (`ideological_censure` / `medical_quarantine`), (2) **`Regard` alibi / co-signer**, (3) **framing a scapegoat / rival cover**, or (4) **emergency overt Drone/Orbital extraction (`extracted_overt`)**, which saves your life, ends your current cover, raises every observer's derived discovery level to `theorized`, and records permanent `scar_overt_anomaly_extraction` and `scar_persecution_apparatus` (`witch_hunt_police`) scars in `CivilizationLegacyState`.

### Orbital blackout, contingencies and Ship Mind forecast (planned)

- **Shared `OrbitalBlackoutState` (`isOrbitalSupportAvailable(state) === false`)**: sits alongside `OrbitalPassRuntimeState`. While active, all orbital capabilities (`zenith` drops, weather control, orbital recon, `Slingshot`/`Burn` Delta, and `extracted_overt` rescue) go offline, the 174 Hz neural-lace carrier hum cuts to dead silence, `advisor_integral`'s lace text stops, and `eligibleAdvisors(state)` leaves **only the Companion Drone (`advisor_particular`)** as your groundside companion.
- **Pool of 5 random planetary contingencies (`ContingencyEventBlueprint` and `orbitalContingencyLedger`; 2–3 drawn per playthrough with the keyed `roll(worldSeed, streamKey, counter)`)**, in addition to the conditional late-game Rival Ship Ambush (see Rivals):
  1. `solar_flare_interdiction` (*Catastrophic Coronal Mass Ejection*): *The Ending* leaves orbit for `watchesRemaining` to deploy Lagrange field-mirror damping. Cannot be solved by locals; discoverability/paranoia delta scales with the Epoch's `detectionTechLevel` (`0..1`: Feudal aurora omens -> Renaissance/Colonial optical telescopes -> Industrial telegraph geomagnetic storms -> Cold-War/Computer/Space-Age radar, radio & satellite telemetry; the ladder form is in Epoch ladder and operative rotation).
  2. `comet_orbital_diversion` (*Intersecting Comet / Bolide*): in earlier Epochs, *The Ending* must leave orbit to nudge the comet's trajectory (`ship_diversion`). In the **Final Epoch (`isTerminalEpoch: true`)**, you can choose **`local_mitigation`**: keep the Ship silent and manipulate the civilization's own scientific/space-age institutions to deflect the comet themselves (lower success odds boosted by uplifted science/institutions, much lower discovery/paranoia risk, and a crowning legacy achievement).
  3. `derelict_artifact_quarantine` (*Decaying Ancient Wreck / Rogue Sub-Orbital Probe*): *The Ending* leaves orbit to vaporize a decaying pre-cursor debris field while one fragment slips to the ground, sparking a groundside race against rival operatives to quarantine, buy, or discredit the "fallen star-metal" before it creates a relic `VeilScar` or rival debt monopoly.
  4. `tectonic_caldera_stabilization` (*Supervolcanic Plume / Deep-Crustal Lock*): *The Ending* repositions to the antipodal deep-crustal effector node to bleed tectonic stress while ash-haze, tremors, and doomsday panic hit the settlement (with a `local_mitigation` geothermal relief option if `isTerminalEpoch: true`).
  5. `hegemonic_emission_silence` (*Passing Hegemonic Armada / Sensor Sweep*): *The Ending* drops into 100% EM cold-sleep on the ocean floor while an unaligned fleet transits the system; rival operatives exploit the blackout to broadcast a beacon or strike you unless stopped with purely local levers.
- **Anti-clustering and epoch-spacing framework (`CampaignContingencyScheduler`)**:
  - **Stratified campaign draw (`maxContingenciesPerEpoch = 2`)**: at campaign start, keyed `roll(worldSeed, streamKey, counter)` draws pick `2–3` random contingencies from the 5-event pool across the configured `epochs` list (persisted in `CivilizationLegacyState.orbitalContingencyLedger`). If $\ge 2$ are drawn, they **must** span at least 2 distinct Epochs (never all piling into the same Epoch), while any given Epoch may naturally roll **`0` contingencies** (a quiet orbital age), `1`, or at most `2` (including the conditional Rival Ambush).
  - **Mutual exclusion plus mandatory recovery cooldown (`minCooldownWatches`)**: only one blackout can ever be active at a time (`pausedByActiveBlackout: true`). When an Epoch has two contingencies (or a random contingency plus the Endgame Rival Ambush), the second event cannot trigger until `elapsedWatches >= lastBlackoutResolvedWatch + minCooldownWatches` ($\ge 35\%$ of `epochWatchBudget`), preventing back-to-back orbital blackouts.
- **Ship Mind forecast** (planned: 09-delta-coupling-and-forecast): a closed-form banded hazard computed from the Mind's own Observations, shown as a band plus its top two causes. Band edges are fixed, with hysteresis so the band does not flicker. Owned by `09-delta-coupling-and-forecast`. The Bayesian network for forecasts stays parked (`inv-d-bayesian-network`) until self-play shows the closed form failing.

## Text pipeline, conversation and AI eval (planned)

> Status: planned. No `TextSourcePort`, `LineBrief`, gate or `ConversationHistory` exists in code, no model runs, and the eval runner does not exist yet.

### Bubbles, lace page and tone blips (planned)

- **The rule**: an NPC conversation is a diegetic text bubble anchored to that body. An advisor conversation is lace text. Both are text. There is no voice acting, and no synthesised voice reads a line aloud. A romantasy promise the player can catch against a waypoint path is a line inside the conversation with that NPC.
- **One pager, two skins**: the bubble and the lace page are two skins on one pager. Neither adds an `AudioContext` for speech. The lace audio bus carries only non-speech cues (see Audio). "Voice" in the voice-register suite means a written register (diction, cadence, banned lemmas, omitted clauses), not a performed voice.
- **Tone blips**: owner: "Per-NPC tone blips approved: a subtle per-character pitch/timbre signature as bubble text pages. DESIGN_NOTES §9 needs an amendment so this is not counted as a synthesised voice." (The owner's §9, in the old numbering, is this section.) A tone blip is that signature, timed to each page of bubble text. It has no phonemes or words and nothing reads a line aloud, so it is not a synthesised voice. It ships with the bubble and lace skins, not with `audio-minimal`.

### Text pipeline (planned)

- **The rule (P2)**: there is no free-text player input. The player pages chunks and picks rows. Surfaced text is a view of structured facts (Acts, Observations, claims), produced behind `TextSourcePort`, and frozen into `ConversationHistory` and the save when shown. A reload shows the same words, and the simulation never reads text back. The Writing Desk uses the same port (planned: 06-overview-writing-desk-report).
- **The retired intent parser**: the earlier three-stage intent parser (a lexical extractor, a MiniLM embedding worker and an intent combiner) is retired, since with no typed input there is nothing to parse. Its jobs are re-homed, not dropped. Negation and speech-act extraction served free-text parsing and go. Rival tells are applied by a deterministic `tellProfile` post-pass over rival lines, and gate tier 3 checks it (see Rivals). `CharacterBible` and `RegisterCard` are the authoring-kit inputs, `VoiceProfile` is the blueprint-side data the gate reads (cadence, tics, banned lemmas), and `tellProfile` is its rival-only part (planned, revisable). The sub-millisecond lexical check survives as gate tier 1. The local text-generation worker, a Hugging Face / ONNX adapter in infrastructure, stays planned under P2.
- **Hybrid generation** (planned: 08a-timing-spike, 08-generated-text-adapter): authoring-time SLM generation counts as P2 (accepted): a model drafts lines, a person or the gate curates them, and accepted lines go into a pool. A runtime SLM tier for filler is first-class but gated on a one-day timing spike on the real 2019 Mac, measuring latency and memory. Runtime output is cached into the save. Slot (owner decision, split): `08a-timing-spike` is a no-merge investigation that runs just before the 07 text skeleton, so the generated-adapter seam is designed with real numbers; the stubbed adapter and the authored pool carry everything meanwhile. `08-generated-text-adapter` stays after `05b-2-storylets-and-lab`. This supersedes the earlier tag "before-06".
- **`TextSourcePort`**: an application port with authored, pool and generated adapters. Infrastructure holds the planned Hugging Face / ONNX adapter, a local worker with no network. A fact-first realiser (every fact id survives restyling) and Tracery-style grammars supply the deterministic fallback when no generated line passes. Tier 3 text is templated through the same port. It is the first async port, the trigger for typed ESLint. `eval:ai` and the scripted command log use the authored and pool adapters or recorded generated lines, so replay and eval never call the live generated adapter; a suite that needs the real worker is opt-in and sits outside the runner's import rule. Root `AGENTS.md` and the section guides change only when the port ships.
- **`LineBrief` and the gate**: a `LineBrief` carries the grounding facts, the speaker, the register and the tells. `gate(line, brief)` is a pure function over Observations with three tiers: (1) lexical, under `1` ms: banned lemmas, cadence and the chunk cap (at most two wrapped lines, about `120` characters; the port splits or retries a generated or templated line over it); (2) grounding, where every fact id in the brief must survive in the line; (3) tell compliance, where a rival's line carries its `tellProfile` tells. On failure the source retries, then falls back to the pool and queues the line for review. The text-source-port change lands before the 07 pager; the gate suites register on the runner after `05f-eval-and-replay`.
- **Authored versus generated, and the authoring kit** (planned: 07-authoring-kit): hand-authored, with help: the spine, Tier 1 character bibles and keystone lines. Pool-generated and curated: Tier 2 lines, letters, the gazette and rumours. Templated: Tier 3. The kit is `CharacterBible`, `RegisterCard`, a few-shot builder and a draft/accept CLI that records the authored or generated split per line. The owner is happy to get help with authoring (P2), so the kit exists to make that help cheap.
- **AI notes**: owner stipulation: also investigate a "JEV"-style decision network or decision web for runtime use, if it has a place (a JEV-style or LAYA-style model, not JEPA). Owner: the INV verdict is accepted: no decision model in the sim path; integer belief maths and designed-in misbelief; small classifier parked as a later spike. **No decision model in the simulation path**: zero-shot a LAYA or JEV class model scores below the majority baseline, its float output breaks bit-exact replay, and it needs about `520` MB of worker memory. An advisory authoring-time gate tier is allowed, never the pass/fail authority. Runtime selection of pooled lines is by tag and seed over Observations (also a spec rule in `07-text-port-and-history`). A small fine-tuned classifier for line selection, with its answer frozen into the save, is a parked later spike (`classifier-spike`). Belief maths, misbelief, offline learning and the rejected runtime options are in Belief and deliberate misbelief; the Ship Mind forecast is in Economy and levers.

### Conversation paging and ambient lines (planned)

Ambient lines and the per-conversation talk cost land in `07-dialogue-paging`; tone blips, `readingSpeed` and captions in `07-bubble-lace-skins-and-tone-blips`; the capture and return camera stack in `07-camera-directive-stack`.

A conversation the player enters, or that a world event pulls them into, can be long. Space advances it one readable chunk at a time. Speech the player did not enter (a market exchange, a passer-by's exclamation, the impatient beat in Direct floor locomotion) is an ambient line: colour, not a conversation. Paging depends on the menu stack and `interactionHold` in Proximity use and menus; the floor change only emits the impatient trigger.

- **A conversation**:
  - The first chunk is on screen when the conversation opens. The Space that started it does not also advance it; a world-opened conversation has no such press, so the next Space advances. A held Space stays on the chunk showing; a new press moves on. WASD does nothing while a chunk is showing. Escape leaves and confirms nothing, and the top modal layer consumes that press so it does not also open pause.
  - A chunk is at most two wrapped lines, about `120` characters. An authored chunk is split by its author and fails at pack load if over the cap. The text port measures and splits generated or templated lines the same way (gate tier 1). The page shows a continue mark or an end mark.
  - When a response is expected, the chunk stays up and a choice menu appears. W and S move the highlight, A and D are aliases, and Space selects the row. The conversation then continues with the next chunk, or finishes. Leave is one of the rows when the talk can end there. The press that reveals the rows does not also select one.
  - An NPC's lines use the diegetic bubble; an advisor's lines, including `AdvisoryDuel`, use the lace page. The keys are the same. A second conversation opened over one sits on top, and finishing it returns to the one underneath. Reading one chunk costs no watch; the conversation as a whole is charged once (see Loop cycles). Only the embodied person being talked to is held. Everyone else keeps walking, and another NPC can still emit an ambient line and slide the player. A shown chunk is the line `ConversationHistory` keeps; the unread tail is not. A person with no authored line still opens the empty presenter and its Leave row.
- **An ambient line**: one short line on a speaker the player is not in conversation with. It expires on its own, takes no input, does not lock the player's feet and offers no choice. Space still uses whatever is in front of the player. Interacting with that speaker clears the line and opens a conversation if one is authored.
  - A market exchange is several ambient lines in order, each anchored to its speaker; a passer-by can fire one. The impatient beat is the same primitive. Words come from the text port (authored, pooled or templated); the simulation composes no free text.
  - A line shows only when its speaker is audible under the earshot rule (the audibility tiers in Audio): distance, the room, and whether a door is `open`, `ajar`, `closed`, or `barred`. One line per speaker, only a few on screen at once; a line tied to a blocked arrival keeps its slot and extra colour waits. An ambient line does not spend a watch, and is written into the notebook as a record, not replayed.
- **Contracts**: `ConversationPage` on the session menu stack holds an anchor id, the chunks, the index, and any choice rows. Domain never sees key names. A choice that changes the world dispatches a `WorldEffect`. `AmbientLine` is an anchor id, one string and a lifetime. Content registers the triggers: the floor change registers the blocked-arrival trigger, and later packs register overheard exchanges and exclamations. The pager has no epoch in it.
- **Left out**: a back-page and transcript on screen, a typewriter, speech audio, camera grabs.

### Interruption, pretext and fund choices (planned)

Three later changes that sit on the pager and own no chunks or ambient lines. Advisor omission is in Advisors and lace; the register suite is in Local AI eval framework.

- **Interruption** (planned: 07a-dialogue-interruption): while a conversation is open, the player can cut it off. Shown chunks stay in `ConversationHistory`. The unread tail does not fire and does not apply. The offer to cut uses the pager's choice menu when it is a row. What the cut does to the talk beyond dropping the tail is this item's scope. It leaves out role pretexts, fund spending and the advisor sulk.
- **Role pretext choices** (planned: 07b-role-pretext-choices): a choice row may name a pretext the operative holds. Space on it spends the pretext and dispatches the row's `WorldEffect`; the conversation then continues or finishes. A row that spends nothing, including Leave, stays an ordinary pager row. It depends on the existing office pretext registry, and leaves out funds, interruption and which pretexts exist.
- **Fund spending choices** (planned: 07c-fund-spending-choices): the same shape for a fund the operative can spend. It depends on the existing fund instruments, and leaves out how the fund was acquired (that stays on the instrument registry) and role pretexts.

### Local AI eval framework (planned)

- **Why its own change, immediately before utility AI**: every AI subject is scored by one harness. Utility AI is the first subject, and that change already owns the brains, rivals, threads, desk and overview. It registers a suite and does not invent the runner. The runner needs only the shipped headless simulation (`SeededRandom`, `WorldState`, `FAST_EVAL_PACING_CONFIG`), not floor walking, menus, clocks, dialogue or a model, so it sits behind the play-shell work and in front of the AI block.
- **The loop**: `npm run eval:ai` will load every registered case, roll it with a fixed seed under `FAST_EVAL_PACING_CONFIG`, and report pass or fail. A case names a subject, a fixture and assertions. The first case rolls the shipped headless simulation, so the command is real before any AI subject exists. A failing case fails the command. The command is local and offline, is not part of `npm run verify`, and a 100-step rollout stays inside the fast-eval budget of that pacing config.
- **Contract**: the runner lives in `eval/` at the repo root, outside the four layers, the same way `tests/` does. It may import domain and application; domain does not import it. A subject id is an open string. The runner does not import `three`, a model runtime or era content, and does not read `Date.now()`. The change that owns an AI subject registers that subject's cases; any later subject adds a suite the same way.
- **Who owns what**: `tests/` holds exact assertions, `golden/` holds state hashes, and `eval/` holds distributions and corpora. One headless harness, `runScenario` (planned: hx-determinism-harness), drives all three. The scripted command log is the fixture format. The text-gate suites sit on the runner only after `07-text-port-and-history`.
- **Suites already named**:
  - **Utility and rival goals** (`06-utility-ai`, `06-rivals-remote-evidence`): golden world-state fixtures verifying that NPC utility brains and rival operatives select sensible, non-thrashing goals and respect Inertia Pillars across multi-step rollouts.
  - **Voice register and anti-LLM-slop** (planned: 07e-voice-register-evals): golden dialogue and `AdvisoryDuel` fixtures check banned-lemma compliance, cadence rules and, once omission exists, dropped clauses (those fixtures depend on `07d-advisory-duel-omission`). Register means written diction and cadence; the lines are the bubble and the lace page, and neither is spoken. The run is local and adds no speech audio. It depends on the runner for the command and the pager for the lines.
  - **Text-pipeline suites** (planned: 07-text-port-and-history, 08-generated-text-adapter): the gate (lexical, grounding, tell compliance) and the generation suites check that every grounding fact survives, banned lemmas and cadence hold, and a failing generated line falls back to the pool. With no free-text player input (P2) there is no intent-accuracy suite.
  - **Invariants**: the `tellProfile` presence and absence evals and the macro-lever invariant (see Rivals), the R4 strike-needs-an-Observation eval, and the check that no clue is visual-only (see Accessibility and Settings).
- **Left out**: the utility brain, rival behaviour, dialogue lines, the written-register rules and the text-pipeline gate stay on their own changes. The runner scores no subject until that change registers its cases.

## Advisors and lace (partial)

> Status: partial. Only the drone-disguise mesh is shipped (`droneDisguise` in `SceneVisualBlueprints`, `StageKitbashBuilders` and `defaultStageContent`). No advisor blueprint exists, and neither do the duel, notebook, inference trails or omission.

### The Culture advisory pair (planned)

- **Left-Ear Ship Mind slot (`advisor_integral`)**: consequentialist of **The Integral** (area under the curve of lives across generations; non-round probabilities like `0.73`; rates human happiness in "expected bowls of soup"). Its core *Integral* ethical pole is fixed, while its hull name/callsign (e.g., seed exemplar: GCU *I Have Read Your Diary And The Ending Is Fine* / "The Ending") and personality traits (`humor`, `patience`, `riskTolerance`, `primness`, `omissionSulkThreshold`) are rolled or selected from a curated pool within bounded ranges per Epoch with the keyed `roll(worldSeed, streamKey, counter)`.
- **Right-Ear Companion Drone slot (`advisor_particular`)**: fierce deontologist of **The Particular** (single bodies, hygiene, this fever, this unwashed spoon, room smell scored 1–5). Its core *Particular* ethical pole is fixed, while its drone identity (e.g., seed exemplar: *Hesje-Tuom Fohristi* / "The Lamp"), personality traits, and physical disguise (`droneDisguise`) are randomly selected from a curated per-Epoch `droneDisguisePool` of `3–6` era-appropriate items (e.g., Epoch 1 pool: `bronze_reliquary_lamp`, `iron_bullseye_lantern`, `apothecary_censer`). The per-Epoch disguise items are in the ladder table in Epoch ladder and operative rotation.
- **Each Epoch's crew (P3)**: the ethical poles stay fixed (Left-Ear Ship Mind = consequentialist *Integral*; Right-Ear Companion Drone = deontological *Particular*), and each Epoch's new crew rolls its personality traits within curated `[min, max]` ranges with the keyed `roll(worldSeed, streamKey, counter)` and selects the Drone's disguise from the Epoch's pool.
- **Advisory duel (`AdvisoryDuel`)**: the two argue in your neural lace. Repeatedly freezing one advisor out will cause them to sulk and omit a clause (see Advisor omission), and both will cite your predecessor operatives' past sacrifices from `CivilizationLegacyState` in their arguments. The argument is lace text. There is no voice acting. When the player enters it, or a world event pulls them in, it pages with the keys in Conversation paging and ambient lines. It does not use the NPC bubble.

### Inference trails and signposting (planned)

- **Owner**: "Indirect feedback is intentional (P4). Design inference trails: each covert effect leaves discoverable traces in events, NPC behaviour and world state. Add light signposting, e.g. advisor nudges or notebook prompts."
- **Advisors**: an advisor may omit a clause but never lies, unless a rival spoofs. There is no numeric debrief. Odds, where shown, are qualitative and in advisor speech (the numeric-odds option is rejected, see Dispositions).
- **Delivery**: the advisor nudges and notebook prompts sit with `06-utility-ai` and the lace page (planned: 06-overview-writing-desk-report). The vertical slice carries authored advisor nudge stubs (planned: 11-pass-1-slice).

### Lace-log notebook (planned)

- **What it is**: owner: "The lace-log notebook records known facts, suspicions, partial knowledge with open questions, and complete omissions (gaps)." It is the player's Observations (Core model, Observation), recorded automatically.
- **Added categories**: source and reliability, the watch it was learned on, staleness, contradiction pairs, who else knows, player hypotheses graded on corroboration, and spoof flags. All of them fall out of the Observation table.
- **Omission-referent rule**: show a gap only when it refers to something real, so the notebook never invents a mystery.
- **Ambient lines** are written in as a record and not replayed (planned: 07-dialogue-paging). A visual tell registers a passive noticing here (see Accessibility and Settings).
- **Ownership**: the data model belongs to `cm-observation-notebook`, and the presenter UI to `07-notebook-presenter`, after the 07 pager.
- **Save**: the notebook is part of the save (see Save policy in State, saves and pack identity): loading any earlier save restores the knowledge state of that moment.

### Advisor omission (planned)

The sulk and the dropped clause are the advisor argument's consequence. The lace page itself is in Conversation paging and ambient lines, and omission depends on that page. Repeatedly freezing out `advisor_integral` or `advisor_particular` makes that advisor sulk and drop an `omissible` clause from the next briefing. The dropped clause is recorded in the AI reasoning log. Both advisors may cite predecessor sacrifices from `CivilizationLegacyState`. The words still page as lace text. The lace bus keeps the non-speech dropout cue (see Audio) and does not speak the missing clause. The voice-register fixtures that check the omission are in Local AI eval framework.

## Rivals (partial)

> Status: partial. `RivalCivBlueprint` is shipped as schema and no runtime state exists (see System graph). Tells, agenda, remote evidence and the unveiling are planned.

### Competing spacefaring civilizations (partial)

Rival operatives belong to competing spacefaring civilizations registered via `RivalCivBlueprint` (the 3 seed archetypes below establish the pattern; additional rival civilizations and operative covers can be registered in content packs):
1. **The Tithe (*Predatory Hegemonists*)**: Believe civilizations are forged through administered suffering and hierarchy. *Tells*: Vocabulary cluster `earn / deserve / soft / cull`; spoofed news items always use **clean round numbers** (`100 dead`).
2. **The Quiet (*Zealous Ascetics*)**: Believe surplus consciousness and ambition are a stain; want a static, incurious world. *Tells*: **Agentless passive voice** (*"It was decided"*); missing paragraphs; **deleted rumor slots** on the Wider World Overview.
3. **House Reciprocal (*Bureaucratic Mercantilists*)**: Want the civilization to advance—so every discovery arrives pre-licensed as a debt monopoly. *Tells*: **Double-entry speech** (*"in consideration of"* applied to burials/pardons); overview rumors arriving **faster than era transit allows**.

- **Structured tells, agenda and remote evidence** (planned: 06-rivals-remote-evidence): a rival's tells become a structured `tellProfile` (the field is reserved here and its schema is owned by that change), applied to its lines by a deterministic post-pass (see Text pipeline) and checked by presence and absence evals: a Tithe round number must be present, a Quiet paragraph must be absent. Each rival gets a small agenda that emits Acts. A remote report is an Observation with channel latency. The invariant eval carries the owner's sentence: "Every macro lever must be something the player interacts with in some way, and is aware of that interaction in some way, at some point. That covers remote adversaries and correspondents." A remote adversary or correspondent therefore reaches the player as an Observation: a report, a letter, an overheard exchange or a trace.
- Whichever rival thesis gains ground in an Epoch exports its footprint into `CivilizationLegacyState`, evolving into an entrenched ideological or corporate pathology in the next Epoch.

### Late-game rival ambush and Rival Unveiling (planned)

**Conditional trigger `rival_evasive_maneuvers` (*Late-Game Rival Ship Ambush*)**: triggered when your Uplift lead pulls ahead of the leading rival civilization late-game. *The Ending* is forced into evasive action (`watchesRemaining: null`) until you complete a 4-step groundside **Rival Unveiling**: correlate overview/mail tells, pinpoint `coverEntityId`, assemble an indigenous Office/`Regard` coalition, and publish the complete attribution so your GCU can return and neutralize their hull. The ambush counts toward the contingency scheduler's per-Epoch cap (see Economy and levers). A rival strike on the player is described in Assassination and cover persecution.

## Presentation (partial)

> Status: partial. The painter, tracking camera, `F3` stage lab, DOM mirror, disk bridge and play shell are shipped. Direct locomotion, proximity use, menus, the readability contract, the camera capture stack and Settings are planned. Target: 60 FPS on a 2019 Intel Mac.

### Visual and UI direction (partial)

- **Stage-paint chiaroscuro**: a shared stepped toon/chiaroscuro ramp with deep blue-gray (`#1a1f28`) shadows, `-30%` desaturated stone/mud/iron palettes, warm `#c4a574` torch/forge pools, exponential distance fog tied to weather/emergency state, and alpha-cone god-rays.
- **Volume-aware tracking camera (`CameraVolumeBlueprint`)**: critically damped spring blending between wide courtyard framing, doorway chokes, and cramped interiors, with subtle tilts on Emergencies and Zenith passes, plus an instant 40%-desaturated Free-Cam De-Anchor in `F3` Debug Mode.
- **Diegetic UI bifurcation**: a tactile era-appropriate surface (Era 1: parchment broadsheets, smeared ink, wax seals, linen maps; evolving per rung as in the ladder table in Epoch ladder and operative rotation) contrasted against the **Sub-Retinal Culture Neural Lace** (razor-thin cyan-white vector arcs, inertia rings, orbital pass windows, and rival spoof conflicts).
- **Readability rule** (planned: 05d-arrival-hold-readability): three value tiers: environment lowest, actors mid-high, signal brightest. Signal hues are reserved, and mood never carries signal. Lace text sits on a solid panel at a fixed type size (planned: 07-bubble-lace-skins-and-tone-blips). The debug highlight moves off cyan, so it cannot be read as a lace signal. A readability contract test enforces the tiers and the reserved hues. The hue of the proximity mark (see Proximity use and menus) against this reserved-hue list is an open item (see Open, deferred and parked).
- **Later notes** (planned, later): a silhouette budget (the TF2 principle, with a black-silhouette lab view); theme schema roles before the second epoch pack; a merged Tier-3 crowd past about a dozen bodies; and DPR 1 with no antialiasing for now (adaptive DPR rides with Settings). Silhouette budget, theme roles and the merged crowd are parked entries (`silhouette-budget`, `theme-roles`, `merged-tier3-crowd`). DPR above 1 and antialiasing stay parked (`dpr-antialiasing`) until a measured frame budget has headroom.

### Visual authoring framework and F3 labs (shipped)

So that the developer and the AI agent can inspect and tweak any visual detail (e.g. *"that wall there needs skulls set in it"*), all 3D sets are structured JSON/TypeScript across three layers, with zero 500MB `.glb` repo bloat (shipped in `04-third-person-camera-and-inspector`). Layers live in `src/application/rendering/SceneVisualBlueprints.ts`; starter content in `src/content/scene/defaultStageContent.ts`; disk bridge JSON in `src/content/scene/stages/*.json` and `src/content/scene/characters/*.json`.

1. **Layer 1, `EpochVisualTheme`**: material palettes (`stoneColorHex`, `mudColorHex`, `ironColorHex`, `woodColorHex`), `#1a1f28` shadow tint, `#c4a574` torch warm tint, directional key-light vector, desaturation, grime intensity, and exponential fog parameters.
2. **Layer 2, declarative `StageSceneBlueprint` with semantic addressing**: room footprints, heights, compass `wallSegments` (`north`, `south`, `east`, `west`, `wall | alcove`, `seg_01`, `seg_02`...), `props` (`StagePropVisualBlueprint` with `isPortal`), `lights` (`StageLightBlueprint`), and `cameraVolumes` (`CameraVolumeBlueprint`). Every generated mesh carries a deterministic **`semanticId`** in `mesh.userData.semanticId` (e.g., `charnel_stairs.wall.north.seg_02` or `charnel_stairs.alcove.east.arch_01`).
3. **Layer 3, parametric motif and character kitbash builders** (`src/interfaces/three/StageKitbashBuilders.ts`, `ChiaroscuroStageRenderer.ts`):
   - **Architecture and props (`buildWallMotifGroup`, `buildStagePropGroup`)**: procedural builders (`ossuary_skull_niche`, `lancet_window`, `buttress_rib`, `fulgurite_lens_sconce`, `guild_anvil_rack`, `torch_sconce` plus open-identifier fallback geometry) attached to a wall segment by `semanticId` (`motifs: [{ id: 'ossuary_skull_niche', count: 24, recessDepth: 0.25, columns: 6 }]`).
   - **Character visuals (`CharacterVisualBlueprint`, `buildCharacterKitbashGroup`)**: keyed by `characterId` / `lineageId` (joining to `CharacterBlueprint` from `03-modular-registries-and-kinematics` with zero 3D leaks in `domain`). Silhouette-first low-poly parameters: **proportions and posture** (`heightScale`, `shoulderWidth`, `spinePitchRadians` e.g. stooped clerk vs. upright serjeant, `gaitStyle`), open-identifier **garment and prop slots** (`headgear`, `cloak`, `heldPropLeft`, `heldPropRight`), **palette and hem grime** (`mudLevel`, `sootLevel`), and *The Lamp's* era-specific `droneDisguise` mesh. Across Epochs, `resolveCharacterVisualForTheme` rebinds `lineageId` successors to the new `EpochVisualTheme`.

**Which wall or character? The `F3` Stage and Wardrobe Lab plus agent DOM inspection (`StageInspectorDomMirror.ts`)**:

- **In-game `F3` inspector**: selecting any wall segment, floor, prop, light, or character part in the viewport highlights it (`charnel_stairs.wall.north.seg_02` or `npc.sorrel.part.headgear`), offers pure Zod-validated mutators for wall `motifs[]`, character posture/garments/held props/colors, light intensity/color/falloff, fog density, and camera volume pitch/FOV, and persists edits via **"Save to Disk"** (`GET`/`PUT /api/scene-blueprints/:stageId` and `GET`/`PUT /api/character-visuals/:characterId` in `localDiskBridgePlugin.ts`). Until the loader exists, a stage-lab save does not persist into the game (see Lab saves in Launch validation, kind table and fixtures).
- **Agent DOM mirror and live browser inspection (`cursor-ide-browser` MCP plus DOM attributes)**: a raw WebGL `<canvas>` is opaque to DOM inspection, so `StageInspectorDomMirror` mirrors `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, and `data-camera-mode` plus `globalThis.__UPLIFT_STAGE_INSPECTOR__` (with `inspectableTargets`). The agent can inspect the live DOM (`browser_snapshot` / `browser_cdp`) and take screenshots (`browser_take_screenshot`) to see the exact wall or prop the user is looking at.

### Play shell (shipped)

The play shell (`05c-play-shell`, archived; no unshipped work is owned by it) is the one game page for the whole campaign: whatever the player must see or use at any point (a stage, a body, a cabin, a still, a lab, a control) loads into it, and none creates a second page. The proving slice is only the first pack it loads. The Sound Lab (`05a-sound-lab`), Pacing Lab (`05b-2-storylets-and-lab`) and travel (`06c-epoch-travel-vignettes`) are the first later loads, and Epoch populations such as `11-epoch1-content` are further loads. It builds on `04-third-person-camera-and-inspector` (painter, tracking camera, `F3` stage lab, disk bridge) and `05-live-npc-steering-and-world-stage` (headless simulation: `requestWaypointMove`, `requestSetPortalState`, `stepFrame`).

- **Session**: one local page, one canvas, one resident stage, one `stepFrame` per animation frame under `DEFAULT_GAMEPLAY_PACING_CONFIG` (the coordinator already clamps the frame delta). It loads one registered pack plus that pack's `spaceId` -> `StageSceneBlueprint` directory, and the focus operative starts in their authored space. The shipped page click (a waypoint within `1.5` m or a portal prop) is dev tooling and will be replaced for the player by direct locomotion and proximity use (planned: 05d-input-and-control-frame). NPC paths still use `requestWaypointMove`. The waypoint status (`path`, `already_there`, `blocked`, `unknown_waypoint`, `unknown_entity`, `paused`) and portal status (`updated`, `unknown_prop`, `paused`) are visible. When the focus entity's `spaceId` changes, the shell calls `disposeSceneGraph` and builds that space's stage. `F3` or backtick calls `setPaused`, desaturates the frozen world by 40%, de-anchors the camera, and lets the stage lab save a picked `semanticId` through the disk bridge (until the pack loader exists that save writes JSON the game does not load; see Lab saves in Launch validation, kind table and fixtures). Free-cam writes the camera offset, and blueprint edits happen while that pause is on (pause semantics: R6).
- **Contracts**: the composition root lives in `src/interfaces/composition/` and may import application, domain, content and Three.js; domain and application stay free of the DOM, Three.js and content packs. The page does not know which epoch it shows. A body is drawn only when a `CharacterVisualBlueprint.characterId` matches the entity id; a pose with no visual is skipped, and a crowd or materialized NPC has no mesh today (planned: cm-presence-render-crowd). The first loadable pack is the proving-slice exemplar (`char_player_operative`, `char_yard_walker`, the yard stage, the chambers stage), and those ids stay in `src/content/`.
- **Left to later changes**: the audio graph (`05a-audio-engine`; this page opens no `AudioContext`), the Pacing Lab's watch-budget preview (a projection that never writes `WorldState`), watch advancement and storylet injection (this loop does neither), cabin stages (`06c-epoch-travel-vignettes` reuses dispose-and-rebuild), and the diegetic parchment and neural lace as the player-facing surface. The dev HUD waypoint list remains a lab command. Arbitrary ground clicks, teleport and live pacing edits stay out.

### Direct floor locomotion (planned)

The player walks the floor instead of clicking a waypoint. NPCs stay on `requestWaypointMove` and `stepKinematics` (both shipped). This builds on the shipped walk and the play shell, slots before the sound lab and pacing lab, and does not advance watches, spend storyteller budget or open an `AudioContext`.

- **Input and walk** (planned: 05d-input-and-control-frame): WASD moves the focus body across the current room at its `walkSpeedMetersPerSec` (shipped field). W is into the picture, taken from the control frame: the active camera volume's yaw, pitch and distance, latched while a move key is held across a volume change so a boundary does not turn the held direction. One yaw-neutral zoom-out scalar gives the single further-out view. Diagonals keep the same speed, and releasing the keys stops the body that frame. An `InputState` is folded into an `InputFrame` each frame; `keyup`, `blur` and `visibilitychange` are handled so a lost key cannot leave the body walking; physical keys are read by `event.code`; held and pressed sets feed a data action table; Space is edge-triggered with no auto-repeat; the dev HUD is neutralised so Space cannot re-click it. A and D with no W or S turn the body in place at `yawSpeedRadiansPerSec` (shipped field) without sliding, and facing holds when the keys come up. A floor click moves nobody.
- **Floor and footprints** (planned: 05d-locomotion-footprint): the floor is the stage footprint inset by a body radius of `0.22` m. Another embodied body in the room is a disc of that radius. A prop blocks the oriented footprint of the mesh the kitbash builder draws for it, plus `0.03` m so the body does not sit in the pixels. The proving-slice meshes are the exemplar, not the rule: a door leaf `1.2` m by `0.14` m, a crate `0.9` m on a side, multiplied by the prop's scale and yaw. The hinge (shipped) yaws that centered leaf in place (`open` adds a quarter turn, `ajar` adds `0.38` rad) and does not move the pivot to an edge, so the proving-slice doorway stays covered; the locomotion change clears an `open` or `ajar` threshold by moving the pivot to the leaf edge. A `closed` or `barred` leaf stays across the threshold. The step tries X, then Z, and a step that would leave the floor, enter a disc or enter a prop footprint is dropped.
- **Portal hop**: within `0.5` m of a portal's near waypoint, with steer toward the far waypoint, an `open` or `ajar` portal hops the body one step inside the target space and the shell swaps the stage. A `0.4` s lockout stops the doorway swapping every frame. `closed` and `barred` do not hop. Epoch 2+ travel stays a committed cabin, not a floor edge.
- **Arrival hold** (planned: 05d-arrival-hold-readability): only the player's disc blocks an NPC arrival. The NPC holds short of a target point the disc covers and the arrival does not commit; another NPC on a mark does not block a snap. The timer runs while the disc covers the point, and sidestepping on the mark does not reset it. At about `6` s the NPC emits an impatient ambient line (see Conversation paging and ambient lines), not a conversation. At about `12` s the player is slid out along the away vector, still on the floor and outside props and bodies, and the NPC arrives. If the slide has nowhere legal to go, the NPC stays and the beat can repeat. One waiter shows the line: the NPC whose current target lies inside the disc. This change owns the wait, the trigger and the slide; varied wording belongs to paging.
- **Camera capture** (planned, later: 07-camera-directive-stack, after the pager): owner: "the camera should move with the players charachter centred, but we should leave the option open for certain world events to capture that centring, to show action, before automatically returning the camera to the player. we should research best practices/improvements/suggestions on this". The capture and return directive stack follows these rules: Space never skips a capture, movement or Escape hands control back, no capture opens during a conversation, `reduceMotion` cuts instead of gliding, and each capture has a maximum hold.
- **Contracts**: `locomotionMode: 'waypoint' | 'direct'` on the character blueprint, default `'waypoint'` (planned: 05d-locomotion-footprint; the field is not in the shipped blueprint, and the kinematics split depends on it). The proving-slice operative is the content exemplar set to `'direct'`. `set_direct_steer` stores a unit direction and clears `activePath` without moving the body. `stepKinematics` integrates that steer for a direct body and keeps the path branch for everyone else. Application passes floor slabs and prop footprints in as plain rectangles; domain does not read meshes. The dev HUD waypoint command (shipped) stays for waypoint-mode bodies and tests, and on a direct body, while unpaused, it does not dispatch. A content shape descriptor `{ primitive, dims, offset }` feeds both the renderer and the application footprint builder (planned: pre-05d-renderer-shape). Its vocabulary starts as `box`, `cylinder`, `cone` and `icosahedron`, an unknown shape id fails validation (an interim loader check that `validateLaunch` later absorbs), and it also carries the `surface` attribute footsteps need. The renderer builds only resident-space poses, caches geometry and materials with shared-resource-safe dispose, and warms up with `compileAsync`, so a room change does not hitch (this residency work belongs to that change, not "later"). Crowd and materialized NPCs get a mesh from present poses, with pooled add and remove, as a renderer subset at the presence step (planned: cm-presence-render-crowd). The entity-id pattern is checked at load and at materialize.
- **Left out**: Space-to-use, menus and the pause menu (see Proximity use and menus), solid decoration that is not a prop, and NPC free roam.

### Proximity use and menus (planned)

The player walks up to a prop, a portal or a person and presses Space, and the same keys drive every menu. This builds on the play shell and direct locomotion. Dialogue wording, interruption and pretexts stay in their own changes; the menu stack leaves a slot they fill.

- **Use** (planned: 05e-modal-stack-use-and-menu): Space uses the nearest point of a prop footprint, or of a person's disc, within `0.4` m and inside a `90°` arc centered on facing (`±45°`). Of the things in reach and arc, the one closest to straight ahead wins, a tie at the same angle goes to the lower id, and nothing in the arc does nothing. The winner's name is the prompt, and it carries a warm mark so the `0.4` m and `±45°` rule can be read. A global "important" accent is rejected, because it would break P4.
- **Menu grammar**: while any menu is open the body stands still. W and S move the highlight, Space confirms, and Escape goes back one layer. A and D alias previous and next in a vertical list and own left and right in a horizontal row. The arrow keys are a second binding set. The top modal layer consumes every Space and Escape press in the frame it happens, so a press that opens a menu never also confirms a row and key repeat never confirms or pops twice. A movement key still held when the menu closes does not steer until released.
- **Doors, props, people**: a door opens rows for `open`, `ajar` and `closed`; confirm calls `requestSetPortalState` (shipped); `barred` is shown and confirm writes nothing. Walking through an `open` or `ajar` door stays the portal hop. A person opens an empty presenter with Leave on it. A prop with no authored rows is not a target. Confirm on a prop row dispatches the existing prop-state effect (`update_prop_state`, shipped).
- **Pause**: menus do not pause the room, so a door confirm can dispatch and other bodies keep walking. Escape on an empty stack opens the player pause menu in the diegetic layer, with Resume as the default row. It freezes the room through the existing paused bit (shipped), leaves the camera anchored, and neither desaturates the picture nor frees the camera (the bit: R6). `F3` and backtick stay the lab, and are ignored while a menu or that pause is up.
- **Contracts**: `selectProximityTarget` is a pure function over plain candidates, and the menu stack lives on the session. `interactionHold` lives on `WorldState`: `{ targetKind: 'entity' | 'prop', targetId }` or empty. Opening a person or prop sets it and closing the menu clears it. A held person does not advance a path, run the impatient timer or slide the player. A held prop refuses any other writer until the player confirms or backs out, though the player's confirm still applies. A door menu does not hold a passer-by, so their impatient timer keeps running; a menu opened on the waiting person holds them, and the timer restarts if the disc still covers the mark when the menu closes. Domain never sees key names.
- **Left out**: conversation paging and ambient lines, interruption, pretext choices, fund choices, advisor omission and the voice-register evals (see Text pipeline, conversation and AI eval), and save and settings rows.

### Accessibility and Settings (planned)

Nothing here is shipped: no Settings model exists. This section is the only description of the model until it ships, and `AGENTS.md` then describes it without change ids.

- **Settings model**: a small model kept outside the world hash, so a setting never changes a replay or save hash. It holds exactly `reduceMotion`, hold-or-toggle movement and `textScale`. `reduceMotion` makes a camera capture cut instead of glide.
- **Arrives later**: `readingSpeed`, ambient-line persistence and captions arrive with the bubble and lace skins (planned: 07-bubble-lace-skins-and-tone-blips) and, for sound captions, the full audio engine (planned: 05a-audio-engine), not with `05e-settings-model`.
- **No clue is visual-only**: every visual tell registers a passive noticing in the lace log, so a player who cannot see a tell still learns it. The instrument-profiles change pairs each tell with a non-visual noticing path (planned: cm-instrument-profiles-audibility-tells), and the runner checks it (planned: 05f-eval-and-replay).
- **Parked**: adaptive DPR, meaning DPR above 1 and antialiasing, waits for a measured frame budget with headroom (`dpr-antialiasing`).

## Audio (planned)

> Status: planned. No audio graph or `AudioContext` exists.

- **Minimal audio** (planned: audio-minimal): its own change, directly after `05e-settings-model`. It covers footsteps by surface (reading the `surface` attribute carried by the shape descriptor, planned: pre-05d-renderer-shape), doors, menu confirm and back sounds, and murmur through doors on a provisional audibility-tier table. It has no tone blips (they ride with `07-bubble-lace-skins-and-tone-blips`) and no speech. The full engine and the Sound Lab stay later (`05a-audio-engine`, `05a-sound-lab`).
- **Audibility (one owner)** (planned: cm-instrument-profiles-audibility-tells): audibility has three diegetic tiers, `silent`, `murmur` and `clear`, and is never shown as a meter. The Observation-step change owns the tier rule and its Observation integration. `audio-minimal` ships a provisional table that it replaces. `05a-audio-engine` only consumes the rule and drops the calculator from its scope. The formula is `audibility = loudness * distanceFalloff(earshotRadiusMeters) * portalTransmission(open|ajar|closed|barred) * (1 - localMask)`, used by both the player's mix and NPC/Rival eavesdropping. Ambient lines use the same tiers (see Conversation paging and ambient lines).
- **Two acoustic buses that share a skull and never share a room**:
  1. **Groundside Bus (wet, close-miked, room-convolved)**: no generic background score; the settlement is the score (Glass River gorge roar, Calder Spines fulgurite thunder, slate rain, Nail-Guild forge hammers with Mara's one flat strike per keg, and Chambers quill/wax/breath). Surface-aware footsteps (`mud` `0.22`, `wood` `0.35`, `stone` `0.55`, `metal` `0.75`) and *The Lamp's* physical bronze chain clink (`0.15–0.55`) feed the same **Audibility & Portal/Mask Occlusion Calculator** (the formula above).
  2. **Sub-Retinal Culture Neural Lace Bus (bone-dry, zero room reverb, cranial)**: non-speech cues for *The Ending* (left ear) and *The Lamp* (right ear, distorted by room smell 1–5); an audible 12 dB high-shelf dropout when a sulking advisor omits a clause; a 174 Hz `zenith` carrier hum that tremolos at `horizon`, bit-drops when `occluded`, and leaks a groundside "singing sky" harmonic during a high-Delta `Burn`. This bus does not speak. Advisor words are lace text, not the conversation bubble. The bus carries only the non-speech cues: the hum, the dropout, the bit-drop and the sky harmonic.
- **Mechanic and debug telegraphs, with multi-epoch inheritance**:
  - Every visual tell also registers a passive noticing in the lace log, so no clue is visual-only (see Accessibility and Settings).
  - Short *Obra Dinn*-style fracture cues for Inertia Pillar collapses; Emergency State room-tone ducking; and an `F3` Debug Pause audio morph (freezes the last 80ms of room tone down 3 semitones while the Lace clicks a dry 1 Hz calibration pulse).
  - Whoever controls the Glass River Gorge and Highglass Optics at the end of Era 1 sets the harmonic signature of the next Epoch's communication notifications (bell partial vs. anvil partial vs. military interval).
- **Hybrid Web Audio plus Live Sound Lab backdoor** (accepted: revisable):
  - Audio identity is hybrid, so the earlier "zero `.wav`" claim is relaxed. A small CC0 sample set may enter with the audio engine work (`audio-minimal` or the full `05a-audio-engine`); the minimal change is procedural and does not have to ship samples. The base is native browser Web Audio synthesis (oscillator modal banks, FM metallic partials, filtered pink/brown noise, and procedurally generated `ConvolverNode` impulse responses) defined as declarative, Zod-validated `ProceduralAudioPatch` presets (`src/content/audio/patches.json`). No large audio assets live in git.
  - **Dual customization (agent co-design plus in-game Sound Lab UI)**: sounds can be adapted either by guiding the agent in plain English or via the **in-game `F3` Sound Lab backdoor UI** (audition any cue/bed, drag live sliders for pitch, filter cutoff/Q, envelope attack/decay, noise/tone mix, reverb send, and stealth loudness, and click **Save Patch to Disk**). The Sound Lab is planned (planned: 05a-sound-lab): its `PUT /api/audio-patches` route does not exist yet and will go through the guarded bridge write-route helper (see Bridge lock; planned, built by hx-ops-safety). Until the pack loader exists, a saved patch does not persist into the game (see Lab saves in Launch validation, kind table and fixtures).

## Planned features by milestone (planned)

> Status: planned. Nothing here is shipped. Entries are ordered by roadmap milestone. The rules for each sit in their system section, and this section carries a pointer unless the feature has no other home.

### Roadmap-ordered pointers (planned)

| Roadmap id | Milestone | System section |
| --- | --- | --- |
| `11-pass-1-slice`, `11-pass-1-ledger-end-card` | M5 | Vertical slice (below) |
| `06a-interpersonal-regard-and-romantasy` | M6 | Regard web and Romantasy |
| `06b-assassination-and-cover-persecution` | M6 | Assassination and cover persecution |
| `09a-doomsday-clocks-and-rival-unveiling` | M6 | Orbital blackout, contingencies and Ship Mind forecast; Late-game rival ambush and Rival Unveiling |
| `10-crew-handoff`, `10-registry-swap-and-legacy` | M6 | Epoch ladder and operative rotation |
| `07a-dialogue-interruption`, `07b-role-pretext-choices`, `07c-fund-spending-choices` | M6 | Interruption, pretext and fund choices |
| `07d-advisory-duel-omission` | M6 | Advisor omission |
| `07e-voice-register-evals` | M6 | Local AI eval framework |
| `06c-epoch-travel-vignettes` | M6 | Epoch 2+ travel vignettes (below) |

### Vertical slice, first pass of the content build (planned)

- **Pass criteria (the M5 go/no-go point, gating M6)**: one Epoch 1 thread end to end, a few NPCs, one office and one pretext, and authored lines through the text port. Inference trails are findable, through authored advisor nudge stubs. The slice runs through the real entry point (gate G1, defined by the review-gates skill, planned: process-gates-and-ledger), and the G1 trace names the macro levers it excludes because they need rivals, which arrive only with `06-rivals-remote-evidence`.
- **What it is for**: it tests the engine and does not replace engine work (owner: see the Player loop). The 06 changes validate against it, and their dependency on it is an ordering and go/no-go gate and not a technical edge. NPC utility in the slice is not yet belief-conditioned (belief-conditioned utility lands with `06-utility-ai`).
- **Not a criterion**: the end card (ledger visible, win/fail shape, an epoch-end evaluation stub) belongs to `11-pass-1-ledger-end-card`. What counts as a finished Epoch 1 stays open (R8).

### Epoch 2+ travel vignettes (planned)

**Why travel is a scene, not a skip and not a second campaign.** Epoch 1 remains local walking inside the settlement (no travel vignettes). From Epoch 2 onward, era-appropriate transit is **fast travel that is still a bounded 3D scene**: a kitbashed vehicle cabin (`vehicle_cabin` `SpaceKind`), a handful of fellow passengers, diegetic news access, and two independent keyed rolls (`roll(worldSeed, streamKey, counter)`) that may fire a useful/trigger interaction and/or world-mutating news. It is not an overland map, not a loading-screen skip, and not a *Last Express*-length minigame on every hop. Watch cost, destination count, and remaining gates become **less limited one tech rung at a time** (`travelTechTier <= maxTechTierForEpoch`); the engine never hardcodes "coach" vs "rail", and Culture-level teleport is forbidden. The default-ladder vehicle skins are in the ladder table in Epoch ladder and operative rotation.

**The vignette loop (Clock 1 cabin plus Clock 2 spend)**:

1. **Commit travel** as a Clock 2 time-spend (`TransitRouteBlueprint` watch cost from a `PacingProfileBlueprint` envelope). Boarding is a route action, not a walking `connectedSpaceIds` edge.
2. **Swap stage** via existing `disposeSceneGraph` onto a small `StageSceneBlueprint` for that `VehicleKind` (tight `CameraVolumeBlueprint`s; the F3 Stage Lab still works). Focused 60Hz embodiment is the cabin only.
3. **Origin is not a special "left undefended" mode**: the settlement you left keeps existing the same way every other node already does (Clock 2 / off-camera `off_stage_region` LOD). Highglass Hold is not a unique tactical vulnerability just because you boarded a coach.
4. **Watches advance on vignette cadence** (reading the gazette, waiting, sleeping a stage, or the summary skip), never from idle staring.
5. **Two independent rolls**, each consuming Storyteller storylet budget from `storyletDensityEnvelope`: **`social_trigger`** (passenger hook, Regard bump, eavesdropped secret, correspondent in the next seat) and **`world_news`** (colour, or a mutation of trip pretext / origin / destination / Wider World Overview). Quiet trips are the default; a useful conversation is uncommon; a world-mutating headline is rare. Storyteller vetoes cannot force a second `crisis_fuse` or fire a `09a` blackout.
6. **Arrive** (or **divert** onto an existing same-Epoch route for extra watches). Apply queued `WorldEffect[]`. A stale trip pretext is intelligence arriving *along the corridor you are on*, not slapstick.

**"Commit the rest of the journey" summary skip**: the player may collapse remaining cabin time, but remaining watches and pending social/news rolls **still resolve in summary**, so skip cannot dodge mutation. Embarkation itself is not skippable (choosing a seat/compartment sets passenger adjacency for eavesdropping / Regard).

**Epoch-agnostic contracts (`EpochModuleRegistry`)**:

- `VehicleKindBlueprint`: `travelTechTier`, named/ambient passenger caps (`2–6` named plus `0–4` ambient), `acousticClass`, sway amplitude (clamped by existing `reduceMotionAndFlashing`).
- `TransitRouteBlueprint`: from/to settlement ids, vehicle kind, base watch cost, weather / emergency / pretext gates.
- `TravelVignetteBlueprint`: route, `vehicleStageId`, diegetic news prop, encounter table ids.
- `EnRouteEncounterTable`: two weighted tables (`social_trigger` | `world_news`) with `mutationKinds: 'trip_pretext' | 'origin' | 'destination' | 'wider_world'` and a storyteller budget cost.
- `TravelSessionState` (`StateSliceKey`): route, remaining watches, passengers, rolled encounter ids, optional destination override. Arrival is a pure function of seed plus state via `TravelVignetteCoordinator`.
- The diegetic news prop (chain in the ladder section) is a **delayed slice of `WorldOverviewModule`**, so rival spoof tells still work. Neural lace still works unless a `09a` blackout is active. A rival operative as a fellow passenger is a rare Storyteller beat, never a raw random roll.

**Live world-state surface cues (`TravelSurfaceCueBlueprint`): subtle immersion, not a second HUD.** Every Epoch 2+ vehicle stage carries **small, data-driven visual/prop details that reflect current world state**, resolved on embark and at each watch boundary (never per 60Hz frame). This is the travel-cabin sibling of `bindPredecessorTraces` (`10-registry-swap-and-legacy`): predicates bind kitbash `semanticId` motifs, props, lights, extra gazette editions, grime, or an empty passenger slot, inspectable in the F3 Stage Lab, zero `.glb` bloat.

- Cues stay **subtle and diegetic** (mud on a wheel-well, a folded extra broadsheet, quarantine yellow bunting, wartime paper blinds, a missing scheduled seat, blackout shutters when the 174 Hz carrier is dead). They are never billboards, objective markers, or lace-HUD dumps. Content authors register `TravelSurfaceCueBlueprint`s (`predicate` on pressure stocks, active emergency, weather, overview headline family, orbital phase, discovery layer, held Office, `Regard` bond, or `coverPersecutionRisk` band -> `visualDelta` on a `semanticId` target). The predicate language is epoch-agnostic so settlement stages can reuse it later; `06c-epoch-travel-vignettes` only authors travel-cabin cues.
- Seed exemplars of the tone (not a closed list): coach wheel-well mud matching last weather; the news rack's extra edition matching the current overview headline (or a rival `early_surplus` spoof tell); an empty compartment when a scheduled passenger is in `ideological_trial`; blackout shutters / dead lace hum during `OrbitalBlackoutState`; colonial quarantine bunting when the destination carries `medical_quarantine`.

## Open, parked and dispositions (partial)

> Status: partial. These are records, not features: open items, parked spikes and where each raw note went.

### Open, deferred and parked (partial)

Explicit open items, one line each. No content is written for them yet. Each parked spike has a parked entry in `openspec/roadmap.yaml` with a revisit trigger.

- **Onboarding / first-10-minutes design**: deferred by the owner. "Owner isn't ready for this yet. Revisit later."
- **Epoch 1 as the definition of done, with its own ending (spine rule R8)**: open. "Open; owner didn't address it." Parked entry `epoch1-definition-of-done`.
- **Text-only advisor / writing prototype**: open. Becomes a generation-quality prototype under P2 (`08a-timing-spike`).
- **Authored quality-gated storylet cards versus generated cards**: resolved by the authored/generated split and the hybrid pipeline. Only the storylet-card question is left to the storyteller change (`05b-2-storylets-and-lab`; see Storyteller deck, thread gates and storylets).
- **Save policy**: owner decision recorded in State, saves and pack identity (autosave at watch boundaries, rollback to any earlier save, ironman parked as `ironman-mode`).
- **GPU profile**: open.
- **Proximity mark hue**: choose the hue of the Space-target mark against the reserved-hue list in the readability rule, since the warm palette already carries torch pools (`05d-arrival-hold-readability`).
- **Parked spikes**: small fine-tuned classifier for line selection (`classifier-spike`), runtime reranker (`rc2-runtime-reranker`), compiler-API import scanning (`compiler-api-import-scan`), typed ESLint (attach to the first async-port change), Bayesian network for the Ship Mind forecast (`inv-d-bayesian-network`), exact-inference network (`inv-f-exact-inference`), dither-fade wall occlusion (`dither-fade-occlusion`), later notebook categories (`notebook-later-categories`) and offline self-play tuning (`offline-self-play-tuning`).
- **Other parked entries**: onboarding (`onboarding`, above), adaptive DPR and antialiasing (`dpr-antialiasing`), silhouette budget (`silhouette-budget`), theme roles (`theme-roles`), the merged Tier-3 crowd (`merged-tier3-crowd`), Epoch 1 definition of done (`epoch1-definition-of-done`, above), past-advisor cameo (`past-advisor-cameo`, below) and ironman mode (`ironman-mode`, under Save policy). `openspec/roadmap.yaml` holds every parked entry with its revisit trigger. The Epoch 1 ending and handoff hook is `11-epoch-ending-and-handoff-hook`, and tuning follows in `11-playtest-and-tuning`.

### Ideas, not scheduled (planned)

- **Past advisors in later epochs**: owner's addition. Past advisors occasionally appear with help or notes over the Culture's galactic network. Design-note candidate only (parked entry `past-advisor-cameo`).

### Dispositions (shipped)

Where each raw note went, one row each. Raw dumps wait in `notes/inbox.md` until the design-notes skill dispositions them. Rejected options are logged so they are not re-proposed. Ids in the rejected table are finding ids (`S1-R9`, `S1-13`, `S1-12`, `R5C2`) and investigation conclusions (`INV-A`, `INV-F`) of the root-and-branch review, recorded in `reviews/2026-11-08-root-and-branch/register.md`. A route of that review is named by its title, never by a bare number, so it cannot be mistaken for a spine rule.

#### Integrated and partly integrated notes (shipped)

| Raw note (8 Nov 2026 world interaction notes) | Disposition | Where |
| --- | --- | --- |
| WASD free movement on any unoccupied floor point, not click-to-move | integrated | Direct floor locomotion |
| Interact by moving near and pressing Space; menus on WASD / Space / Escape | integrated | Proximity use and menus |
| Dialogue as single readable chunks advanced by Space; Space exits from the last chunk | integrated | Conversation paging and ambient lines |
| Pause menu on Escape when nothing else is open, same controls | integrated | Proximity use and menus |
| Camera centred on the player, with world events able to capture it and hand it back | integrated in part: the control-frame latch and the single zoom-out land with the first locomotion change (planned: 05d-input-and-control-frame); the capture / return directive stack lands with dialogue and events (planned: 07-camera-directive-stack) | Direct floor locomotion, Conversation paging and ambient lines |
| A single "further out zoom" for the player to navigate | integrated in part: the single yaw-neutral zoom-out scalar (planned: 05d-input-and-control-frame) | Direct floor locomotion |

The last two rows only ever appeared in the dump, so they stay listed until their changes land.

#### Considered and rejected (shipped)

| Option | Verdict | Note |
| --- | --- | --- |
| Seasonal council with rooms as scenes (a slice 1 route) | rejected-by-review | |
| CK3-style numeric odds (a slice 1 route) | rejected-by-review | Qualitative odds in advisor speech instead |
| Finding S1-R9: re-rolled advisors weaken the through-line | rejected-by-owner | P3; the new crew each epoch is the design |
| Finding S1-13: no epoch-handoff payoff | rejected-by-review | Already specified in Epoch ladder and operative rotation (Operative rotation) |
| Finding S1-12: tone is only flavour | rejected-by-review | Folded into S1-R2 (inference trails) |
| Finding R5C2 (slice 5): global "important" accent | rejected | Breaks P4 |
| A LAYA-class or JEV-class decision model in the simulation path | rejected | Investigation conclusion INV-A |
| Free-text intent parser (retired `08-local-onnx-hybrid-intent`) | rejected-by-owner | P2; jobs re-homed in Text pipeline |
| General probabilistic-programming engines, learned nets and JEPA-style world models at runtime | rejected | Investigation conclusion INV-F |
