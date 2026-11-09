# Slice 2 — Game-systems design: NPC minds, levers/economy, text pipeline (adjudicated)

Pipeline: 3 scouts (24 findings, 10 routes, 10 keeps, a system graph) → quote-check (0 problems) → Opus verification of code claims →
consolidated to 19 findings / 10 routes → 5 blind challengers: ch1 falsified claims 01–10; ch2 falsified 11–19 and audited the
system graph (11/13 rows accurate, 2 incomplete, 0 wrong); ch3 game-design review of all recs; ch4 third attack on criticals plus routes;
ch5 engine-architect coherence review of all recs and routes. Every finding had ≥3 reviews; every route ≥2. Raw files: raw/S2-*.json.

## Headline
The design names a dozen systems but the code has none of the **hubs** they connect through: no watch clock, no actor on effects,
no record of what happened (Act), no record of who knows what, no thread/office/resource runtime state. Every built reducer case is a leaf.
That's fine at this stage, but the hubs are where P1 (strong engine) and P4 (inference trails) actually live, and they must be
decided before 05b/06 build leaves on top of them.

## Severity ruling
All three scout "criticals" (S2-01 clock, S2-02 Act/actor, S2-03 epistemics) are **downgraded to major, priority NOW (rules spine)**.
ch4 and ch1 showed the roadmap schedules the clock (05b) and nothing shipped depends on these yet; ch5 showed each can be added beside
shipped code (envelope wrapper, new slices) without rework. Test applied: "if not decided now, about-to-ship code is built in the wrong shape" —
true for the *decision*, not the code.

## Proposed core model (ch5, endorsed by Opus; ch3/ch4 compatible)
Seven primitives instead of twelve:
1. **Watch clock**: `elapsedWatches` on WorldState and one `advance_watches` effect. `worldTick` stays an effect serial; scars record the watch.
2. **Act**: a single ground-truth event `{id, actorId, verb, objectRef, motiveTag, spaceId, watch, perceptibility}` kept in a bounded ring slice.
   Effects carry an optional `causeActId` through a wrapper envelope, so the existing effect variants are untouched.
3. **Observation**: one sparse "who learned what" table that merges Report, Trace and Belief. Each row is
   `{actId|claimId, holderId, channelId, strength, confidence, learnedWatch, hops, spoofSignature?}`.
   A Report is an Observation with channel latency. A Trace is an Observation held by a faction, which decays. A Belief is an Observation held by an entity that carries a Claim.
   The player notebook is the player's Observations. Discovery layers become a view derived from it.
4. **Presence function**: a pure `(entityId, watch, seed) → placement`. It is materialized when the player enters a room or spends a watch. Entities start off-stage.
5. **ThreadRuntime, ResourceLedger and EmergencyRuntime**: ordinary StateSlices registered by packs. Their thresholds and profiles live in blueprints.
6. **LineBrief and gate(line, brief)**: pure functions that read Observations.
7. **TextSourcePort** (application port). It has authored, pool and generated adapters. Shown text is frozen into ConversationHistory and the save.

Storage stays bounded: Tier 3 holds nothing, Tier 2 holds data on demand, and epoch end compacts into scars.
**Performance prerequisite:** `StateSliceStore` deep-clones (`structuredClone`) on every read *and* write (StateSliceRegistry.ts:96,107,110).
Large Act or Observation slices therefore need structural sharing, or writes batched per watch, before they are built. This goes to slice 3.

## Order of introduction (ch5; each step additive, every commit green)
1. Clock decision record, then `elapsedWatches` and `advance_watches`.
2. Rename `*Ticks` to `*Watches` while they have no users.
3. Effect envelope with `causeActId`.
4. Act ring slice, plus a behaviour commit that emits Acts and effects. The behaviour-selection (utility AI) work stays in 06.
5. Observation table plus the derived discovery view. Keep `set_discovery_layer` as a shim.
6. Presence function and materialize step.
7. Data profiles for instruments, plus decay keys. This replaces the hard-coded 0.25.
8. ThreadRuntime, pillar relations (Leverage Chain), ResourceLedger and EmergencyRuntime.
9. Closed-form diffusion and the evidence-coverage eval.
10. LineBrief, gate, TextSourcePort and the authoring kit. The runtime model comes last, behind a timing spike on the real Mac.

## Findings (final)
| ID | Sev | Priority | Finding (post-challenge wording) | Final recommendation |
|---|---|---|---|---|
| S2-01 | major | now | Time uses three units (`*Ticks` fields, seconds, the effect-serial `worldTick` stamped on scars as time). `elapsedWatches` is planned for 05b but doesn't exist. | Write the clock decision record now. Rename the `*Ticks` fields while they have no users. Scars record the watch. |
| S2-02 | major | now | Effects have no actor or cause. A finished dwell commits no effect. Stimuli have only a `sourceEntityId` and a free topic string. | Add an Act record and an effect envelope with an actor/cause, and give BehaviorModule a commit (`WorldEffect[]`). Selection logic stays in 06. |
| S2-03 | major | now | No model exists of what anyone knows (scalar `Regard.exposure` only). | The Observation table (core model #3). |
| S2-04 | major | now (rule) | P2 left generated text with no home. The Composer depends on the deleted free-text parser, change 08 is obsolete as written, and about 15 doc passages still assert free text or ONNX. | Rule: surfaced text is a view of structured facts, produced behind TextSourcePort and frozen when shown. Retire 08 and replace it with "local text generation + authoring kit". Edit the listed passages at amendment time. |
| S2-05 | major | before-06 | Pure runtime generation threatens determinism, and memory is tight on a 2019 MacBook Pro. | Hybrid generation. **Authoring-time SLM generation counts as P2** (model-drafted, curated, pooled). A runtime SLM tier for filler is first-class but gated on a 1-day timing spike on the real Mac. Its output is cached into the save. *(ch3 amendment adopted.)* |
| S2-06 | major | before-06 | Grounding inputs and quality gates for generated text are missing. VoiceProfile and ConversationHistory are planned for 07 but don't exist. | LineBrief plus a three-tier gate (lexical, grounding, tell compliance). On failure, retry, then fall back to the pool and add the line to a review queue. |
| S2-07 | major | later | Rival lexical tells have no schema field, and a model may smooth them away. | `tellProfile` plus a deterministic tell post-pass, with an eval for presence and absence. Reserve the field in the spine now. |
| S2-08 | major | before-06 | No split between authored and generated text, and no authoring kit. | Use the split: spine, Tier-1 bibles and keystones are hand-authored with help. Tier-2, letters, gazette and rumours are pool-generated and curated. Tier-3 is templated. Build the kit: CharacterBible, RegisterCard, few-shot builder, draft/accept CLI. |
| S2-09 | major | before-06 | Remote actors have no common evidence path, and rivals have no agenda. | Reports are Observations with latency. Each rival gets a small agenda that emits Acts. Add an invariant eval for "aware at some point". |
| S2-10 | major | before-06 | The world waits on the player: chains pause at 2 hops, macro beats come only from spent watches, and reading costs nothing. | Split embodied cascades (keep the cap) from information diffusion (closed-form per watch). **Don't use wall-clock beats** (they break pause and punish reading). Use a fractional-watch cost for talking instead, which ties into S1-R3. *(ch3 amendment.)* |
| S2-11 | major | before-06 | The presence seam is clean (`off_stage_region`), but three details resist it: spawn at the start waypoint, room-second timers versus watches, and the fate of stimuli across a watch jump. | Presence function plus a materialize step. Resolve phases on a watch jump. Start entities off-stage. |
| S2-12 | major | later | The notebook categories as stated mix player certainty with world state, and showing omissions can leak that something unknown exists. | Show an omission only when it refers to something real. Add source and reliability, learned-on watch, staleness, contradiction pairs, who-else-knows, player hypotheses graded on corroboration (Obra Dinn) and spoof flags. All of these fall out of the Observation table. |
| S2-13 | major | now | The economy graph has no hubs in code. The legacy-scar export is the only non-cosmetic consumer, and nothing dispatches into it. | Adopt the system graph (below) as the dependency spine. Build the hubs before any further leaf effects. |
| S2-14 | major | before-06 | The instrument coupling coefficients and discovery floors are hard-coded in the domain reducer. (The three modes being fixed is intentional.) | Use a data profile per mode, registered by packs. |
| S2-15 | major | before-06 | Loops have no balancing side. Stocks don't decay, and forged fiat jumps straight to `attributed`, which triggers rival strikes. | One table of loops, each with a tuning key. Discovery becomes decaying evidence through Observation. |
| S2-16 | major | now | Leverage Chain can't be expressed with the current pillar schema. | Pillars gain `bearsOnThreadId` and `supportedBy`. Thread inertia is derived from them. A chain is a derived query, and the player verb is `weaken_support`. |
| S2-17 | major | now | Eight architecture-constraining rules are unwritten. (Watches and thread stages are described in DESIGN_NOTES, but not as binding rules.) | These eight become the S1-R1 rules spine: clock; actor/cause; thread structure; discovery referent; emergency cardinality and fuse; reject instead of throw; resource ledger; epoch-end reads. |
| S2-18 | major | before-06 | Delta is the only real decision. Stocks are bookkeeping, and discovery is a global rank with no observer. | Insertion spends Delta and requires zenith (rejected otherwise). Stocks get diegetic tells. Discovery is tracked per observer. |
| S2-19 | minor | later | An emergency is a single id with no fuse, and compounding is applied uniformly to everyone. | EmergencyRuntime with a fuse and a scope. Write the cardinality into the spine now. |

## Routes
- **Recommended (both reviewers):**
  - RA2: Act records with observers (Narrative Lego). This is core model #2.
  - RA4: evidence-coverage eval.
  - RC3: fact-first text. The sim emits a proposition, a deterministic realiser writes it, and a model restyles it only under a gate that requires every fact id to survive.
- **Recommended with changes:**
  - RA1: Fact/Claim/Belief, merged into Observation.
  - RB1: evidence-trail discovery, merged into Observation.
  - RA3: closed-form diffusion, after Observation.
  - RB2: stock-flow economy with diegetic tells.
  - RB3: storyteller as a seeded card deck over the thread state machine.
  - RC1: Tracery-style grammars whose phrase banks are drafted by a model and curated. These supply RC3's realiser.
- **Parked:** RC2 (a runtime model that only reranks). ch5 called it unsound: scoring isn't deterministic across backends, and it costs RAM. ch4 accepted it only behind RC3's fact gate. Revisit after the timing spike.

## System graph (owner asked for help, S1-R10). Draft verified by ch2: 11 rows accurate, 2 incomplete.
Full table: raw/S2-system-graph.json. In short, everything funnels through five hubs that don't exist yet: watch clock, Regard graph,
thread runtime, office/pretext/funds ledger, and actor/provenance on effects. Pressure stocks, discovery, instruments, emergencies, pillars
and the orbital pass all have reducer cases with no writer and (except cosmetic camera/fog) no reader. The legacy-scar arc is the only
write → read → world-change path, and nothing dispatches into it.

## Keep (protect)
Two-tier sparse Regard design; cognitive phases with digestion delay plus FAST_EVAL; the `off_stage_region` parking place; the 4-clock shape;
pillars as named supports; the 05f runner as host for text gates; the written-register framing; short bounded chunks (an ideal target
for pools and gates); the infrastructure rule keeping HF out of domain/application.
