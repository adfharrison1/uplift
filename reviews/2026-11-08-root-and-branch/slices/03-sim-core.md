# Slice 3: Simulation core (code), plus INV-1 (runtime decision models)

## How this slice was run

1. Three code scouts reviewed separate file sets (24 findings) and backed their bug claims with repro scripts in the scratchpad.
2. The quote check passed, apart from one line offset.
3. Opus checked the claims about the clone cost, the rAF loop, pause and the RNG.
4. The findings were consolidated into 18 findings and 9 routes.
5. INV-1a covered classical decision networks. It was researched under a wrong reading of the request but kept, because it is useful. INV-1b covered LAYA and JEV decision models. Together they produced 6 INV conclusions.
6. Five blind challengers reviewed the results:
   - ch1 and ch2 falsified all 18 claims, each with independent repros: 14 hold, 4 overstated, 0 wrong.
   - ch3 (architect) judged every fix and route and slotted it into the accepted order.
   - ch4 fact-checked LAYA against primary sources and judged the INV items.
   - ch5 (sim designer) judged the INV items and routes.

Every finding had at least 2 reviews, and the INV items and routes had at least 2. Raw material is in raw/S3-*, raw/INV-1a.json and raw/INV-1b.json.

## Headline

The code is clean and disciplined. Keep these:
- a pure, structurally shared reducer;
- compiler-enforced effect exhaustiveness;
- sorted-id determinism throughout;
- leftover-time carry across phases;
- crash-safe file saves;
- telemetry that is never stale;
- a mid-run save round trip that is exact today.

It does have structural cracks that the core model would build directly on. Fix them first, as a hardening batch before 05d.

## Hardening batch (ch3's order, endorsed by Opus; it lands before 05d, 05e and 05b-1)

1. **Legacy mutations.** Clamp them to [0,1] at runtime, with a telemetry note. The throw is specified behaviour, so keep it in an authoring-time contract test.
2. **Seed scramble.** Put the seed through splitmix32 before seeding SeededRandom, and add a golden-vector test. Today seed 1, the default, gives a first draw of 6.3e-5, and seeds 0, 2^32 and 0x6d2b79f5 all produce the same stream.
3. **State slices: freeze on write, share on read.** Today every get and write deep-clones the slice. An append cost about 10–16 ms at 5k rows (O(n), reproduced twice), which is a whole frame. Also give StateSliceKey an optional schema, version and migrate function, plus a plain-JSON guard: a Map or Set slice currently comes back empty after a save.
4. **WorldStateCodec.** It owns `snapshotVersion`, a Zod load, a `migrations[]` chain, an epoch check, and one field list. Today the list is hand-synced in 4 places. `listSlots` should report why a slot is unreadable instead of swallowing it.
5. **Reducer outcomes.** The reducer returns applied or rejected for each effect, with a reason, so rejecting an effect no longer means throwing and aborting the whole batch. Unknown ids are handled inconsistently today: some throw, some no-op.
   - Split `simulationFrozen` from accepting commands. Pause already stops time, but it also silently drops every dispatched effect.
   - Make `PlaySession.status` per call; it is sticky today.
   - Wrap the frame in try/catch. Today any throw kills the rAF loop permanently (browserMain.ts:191-216).
6. **`coordinator.tick(dt, commands)`** with a fixed, named phase order:
   commands → watch → materialize → kinematics → cognition → commit → flush.
   The empty seams for the core model sit in that order. Add a fixed 1/60 s step with an accumulator and a cap on catch-up steps (today the sim steps with the raw rAF dt, so results depend on frame rate). Add `hashWorldState`, and a **golden-run test**: seeded fixture plus scripted commands, hashes at N frames, and save mid-run, load, continue equals an uninterrupted run. This is the cheapest high-value test a sim can have, and there is none today.
7. **Kinematics.** Split stepping by locomotion mode behind a context object (steer, colliders, presence), run under the golden test.
   - One total phase-transition helper, so pending and active fields stop going stale.
   - Transition events carry `{behaviourId, outcome: Arrived|Blocked|Interrupted, residualDt}` as data.
   - `spaceId` flips when a body crosses the portal plane.
   - Fix the door-closes-mid-route bug: the NPC currently runs its full dwell in the doorway, and no blocked outcome is reported.
   - Fix retarget, which plans from the last waypoint rather than the body's position, so returning to the waypoint just left is ignored.
   - Reject zero-speed moves.

After that: 05d → 05e → 05b-1, then the core-model steps as accepted.

## Findings (final)

| ID | Sev | Slot | Finding | Notes from the challenge |
|---|---|---|---|---|
| S3-01 | major | pre-core | Slice store clones on every get and write. Append cost grows with slice size and blows the frame budget at a few thousand rows. | Reproduced twice. The absolute ms figures vary by machine and row shape. |
| S3-02 | major | pre-core | Slices have no schema or version. The registry is never consulted. A Map or Set comes back empty after a save. | Holds. |
| S3-03 | major | pre-core | No save migration. The inner snapshot is unversioned with a weak guard. Loading a save against a different pack is not checked. | Holds. Fingerprint reconciliation comes later. |
| S3-04 | major | pre-core | No outcome channel. Throws abort the batch, and unknown-id handling is inconsistent. | Holds. |
| S3-05 | major | pre-core | Any throw in `frame` permanently kills the rAF loop. | Overstated in its examples: the dt RangeError can't be reached. The loop death is real. |
| S3-06 | major | pre-core | Pause silently drops every dispatched effect. | Overstated: pause does also stop sim time. The real issue is the effect drop. |
| S3-07 | major | pre-core | No state hash or golden-run test. Raw dt stepping makes runs depend on frame rate. | Holds. |
| S3-08 | major | pre-core, then act-step | No seed scramble; the RNG sits outside WorldState with no fork. | Holds. The scramble goes in now; the stateless `roll(worldSeed, streamKey, counter)` goes with the Act step. |
| S3-09 | major | pre-core | Frame order lives in PlaySession. The coordinator mixes about 7 jobs, and the field list exists in 4 copies. | Holds. Extract the codec and `tick`. WorldBuilder goes with the presence step. |
| S3-10 | major | pre-core | Kinematics can't host behaviour commit, direct steer or presence. Phase fields go stale. | Holds. |
| S3-11 | major | pre-core | A door closing mid-route causes a silent dwell in the doorway, with no blocked outcome. | Holds. |
| S3-12 | major | pre-core | Retarget plans from the last waypoint, so `already_there` is wrongly ignored. | Holds. |
| S3-13 | minor | act-step | Stimulus cap evicts by age, and stimuli are not deduplicated. | Holds. |
| S3-14 | minor | pre-core / 05b-1 | Legacy mutations accumulate across epochs; `sourceScarId` is never checked. | The throw is spec'd. The real defects are accumulation and the unchecked id. |
| S3-15 | minor | pre-core | A zero-speed mover never finishes; the planner counts hops, not metres. | The yaw-snap part was wrong and is dropped. Switch to Dijkstra only once a wrong route is actually observed. |
| S3-16 | minor | presence-step | Small per-frame allocation waste. 0.6 ms per frame for 200 movers is fine today. | Holds. Do nothing until a room holds 100 or more bodies. |
| S3-17 | minor | split | Missing tests: frozen inputs, RNG golden values, caps, mid-hop states, dt splits. | Each test ships with the fix that needs it. |
| S3-18 | minor | pre-core | `PlaySession.status` is sticky. | Holds. |

## Routes

- **Adopted inside the batch:**
  - R3A1 fixed-step accumulator, folded into `tick`;
  - R3A2 explicit move outcomes, as plain data with no callbacks;
  - R3C2 declared tick order, as a const engine phase list with no pack registration;
  - R3C3 versioned slices, folded into the codec and slice keys rather than a separate chunk framework.
- **Act-step:**
  - R3B1 stateless counter-based rolls;
  - R3B2 a frozen bounded ring for Acts, chunked only if the benchmark at the expected cap fails;
  - R3B3 effect envelope `{effect, actorId?, causeActId?}`. The outcomes half lands pre-core.
- **R3C1 (input log plus checkpoint saves).** Split ruling. ch3 rejected it as a save format, because any change to the reducer invalidates a command log (P5). ch5 amended it. Opus rules: the scripted command log is the artifact for golden tests, 05f fixtures and bug repro. It is not the player save format.
- **R3A3 (dwell-site slots).** Later. When it comes, slots live as data on the prop blueprint and the final metre is steered (ch5). It is not a new movement system.

## INV-1: runtime "JEV"-style decision models and decision networks

Fact check (ch4, primary source huggingface.co/convaiinnovations/laya):
- **Confirmed:** LAYA is 421M parameters, a ModernBERT-large encoder with a non-autoregressive choice/score/noul head, Apache-2.0, with 0.362 zero-shot accuracy against a 0.461 majority baseline.
- **Unverified, so struck:** INV-1b's "~110 ms on a 56-core Mac Pro" and its "README determinism warning". The primary-source figures are 39.5 ms per question on a T4 GPU and 193–464 ms for the Router on CPU.
- **Browser route:** `jev-web` runs it in a worker via WebGPU or WASM at about 520 MB (q8), English only, with at most 6 options.
- **Smaller models:** `sdmlai/nano-jev`, a 33.4M MiniLM cross-encoder, was seen in search but its card was not fetched. NanoJev is 0.6B, Kev 0.8–9B, Nimble 9B. None of these changes the verdict.

| ID | Verdict | Final recommendation |
|---|---|---|
| INV-A | Accepted (amended) | **No LAYA-class model in the simulation path.** Zero-shot it scores below the majority baseline, so it needs domain fine-tuning. Its output is over-confident float, which breaks bit-exact replay. It needs about 520 MB of worker memory, which competes with the SLM tier. Optional use: an advisory gate tier at authoring time, never the pass/fail authority. Runtime selection of pooled lines defaults to tag-and-seed selection over Observations. A fine-tuned small classifier (e.g. nano-jev class), with its answer frozen into the save, is **parked as a later spike**, kept open because the owner is interested. |
| INV-B | Accepted (amended) | An integer, fixed-point noisy-OR belief combiner on the Observation table. Collapse parents that share an origin or channel before combining (noisy-OR assumes independent parents). Spoofing is a separate negative term. Add an order-independence test and a parent cap. Each combination step carries a reason tag, so the notebook can show *why* a rumour is strong. Decide all of this before the Observation schema freezes. |
| INV-C | Accepted (amended) | Considerations read the actor's **belief view**, not world state, and a contract test catches omniscient reads. Use belief-conditioned utility terms for NPCs; expected-utility planning is for rivals only. Low confidence maps to investigate or wait. **Design deliberate misbelief in**: NPCs acting on stale or spoofed beliefs are the readable mistakes P4 depends on (ch5's top insight). |
| INV-D | Accepted (amended) | The Ship Mind forecast is a closed-form, banded hazard computed from the Mind's own Observations. It shows the band plus its top two causes, so it is an inference trail rather than a number. Band edges are fixed, with hysteresis. The Bayesian network stays parked until self-play shows the closed form failing. |
| INV-E | Accepted | Use learning offline only: fit tuning keys and tables from deterministic self-play and commit them as data tied to the rules hash, so a rule change invalidates them. Player style is tracked with counters. |
| INV-F | Accepted (softened) | Reject general probabilistic-programming engines, learned nets and JEPA-style world models at runtime. A **small, capped exact-inference network** is bit-stable and acceptable if a later need appears. |
