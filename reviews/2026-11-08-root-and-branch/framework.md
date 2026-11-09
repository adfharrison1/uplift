# Uplift — Root-and-Branch Review Framework (v1, post-critique)

Revised after 3 Sonnet critics (game-dev, codebase-fit, method/cost). Facts re-verified by Opus:
src LOC domain 3.9k / application 2.6k / interfaces 3.1k / infra 0.9k / content 0.6k; tests 7.7k;
`eval/` does not exist; interfaces/composition (1.1k) was unowned in v0; `npm run verify` = 6.6s wall (passes).

## Principles
1. Play before theory; root before branch.
2. Every finding quotes evidence verbatim (file:line + 1–3 lines, doc heading + sentence, or command + output).
   A script checks quotes exist before Opus reads them.
3. Relevance gate: each finding states `bites_when`. No near-term trigger → parked list. Generic best-practice claims rejected.
4. Read-only. Fixes become OpenSpec changes afterwards.
5. Keep-list and cut-list are first-class outputs.

## Per-slice pipeline
1. Brief (Opus, fixed template): goal, project in 3 sentences + "solo, nascent — don't demand enterprise rigour",
   3–6 questions, explicit in/out-of-scope paths, baseline facts, register index, schema + example,
   cap of 8 ranked findings, mandatory keep + could-not-verify sections, JSON only.
2. Scout: 2–3 Sonnet agents, differing in lens, not just files.
3. Quote-check script, then Opus verifies all critical/major against source and samples minors.
4. Blind challenge: challenger sees only claim + evidence + path and tries to falsify from source.
   "Holds" is a valid result. Critical or roadmap-changing → 2 challengers (1 adversarial, 1 on the recommendation);
   major → 1–2; minor → Opus verification + 1 batched challenger per slice.
5. Opus synthesizes → one-page digest for owner (top 5 findings, top 3 decisions) + full slice section in register.

## Slices
0. Baseline & playtest — facts (verify, LOC, registry usage, docs-vs-reality e.g. eval/), then a recorded
   30–60 min play session (owner, Opus watching via browser). 1 Sonnet + Opus.
1. ROOT — vision, loop, legibility, scope. Scouts: (a) player experience/core loop/legibility of covert actions/onboarding;
   (b) scope, risk & prototype-vs-production: roadmap vs 7 archived changes delivered, what is over-built, vertical slice;
   (c) comparables & positioning (CK, Cultist Sim, Disco Elysium, DF; one-sentence pitch).  ** HARD STOP **
2. Game-systems design — (a) NPC cognition as perceived by the player (500+ characters, cheapest believable fake);
   (b) economy/pressure stocks/delta/inertia — feedback loops, readability, tunability;
   (c) content & writing pipeline at scale, anti-slop, where local NLP fits.
3. Simulation core (code) — (a) KinematicsEngine/WaypointNavigator/SpatialHashGrid; (b) WorldState/WorldEffectReducer/legacy;
   (c) SimulationCoordinator/save schema/FileSaveSlotRepository.
4. Engineering health (cross-cutting) — (a) import graph & architecture-test strength; (b) registry genericity — earning its keep?;
   (c) tests value-vs-volume, telemetry, disk-bridge security, doc/code drift.
5. Runtime, feel & presentation — (a) RenderFrameBuilder/renderer/kitbash allocations & disposal;
   (b) composition/playInput/HUD/menus/accessibility; (c) art direction & audio plan. Plus Opus-run measured profile.
6. Process & docs — OpenSpec gates on trial with numbers (findings produced vs cost across archived changes),
   AGENTS/DESIGN_NOTES density and drift. 2 scouts.
7. Synthesis — scripted dedup/contradiction check, 2 blind Sonnet reviewers on top-15 + cut list, Opus final plan
   & roadmap deltas.

Checkpoints: after 0, hard stop after 1, then after each of 2–6.
Budget: ≈ 35–40 Sonnet runs.

## Register (review/ in repo, or scratchpad)
- findings.jsonl keyed `S3-007`; index.md (IDs+titles only, fed to later scouts); digests/ per slice.
- Status: candidate → verified → challenged → accepted | downgraded | rejected | parked. Rejected kept with reason.
- Duplicates append `seen_in`. Topic tags fixed: scope, loop, sim, arch, perf, feel, content, econ, ai, test, process, docs.

Schema: id, slice, topic, kind(problem|risk|gap|overbuilt|keep), claim, evidence[{path,lines,quote}], bites_when,
severity, confidence, disconfirm, recommendation, fix_cost(S|M|L), ignore_cost, relates_to[], status, challenge{verdict,note}.

## Owner decisions (2026-11-08) — override anything above
1. THOROUGH: every finding and every recommendation gets >= 2 blind subagent reviewers (1 falsifier on the claim,
   1 on the recommendation; critical/roadmap-changing items get a 3rd). No tiering.
2. Register lives in scratchpad (this folder), not the repo. Periodic (~quarterly) review of delivered work +
   undelivered roadmap + DESIGN_NOTES. Outputs, after owner approval: amended/new OpenSpec proposals and DESIGN_NOTES amendments.
3. No playtest. Slice 0 = facts only. Emphasis: catch nascent issues, dead ends, antipatterns before they snowball;
   propose alternative routes and things not yet considered (every slice gets an "unconsidered routes" output).
4. Tone: very blunt.
5. (2026-11-08, before slice 1) De-weight: (a) the number of subagent review gates — owner prefers constant review;
   Opus may raise it only as a later, evidence-backed finding if it disagrees. (b) Scale of the game vs one developer's
   time — owner is not concerned. Scouts must not file findings whose core argument is "too big for a solo dev" or "too many review gates".
6. (after slice 1) Register moved from scratchpad to `reviews/` at repo root (gitignored, also in .prettierignore).
   One folder per review. Owner pillars P1-P4 (see register.md) bind all later scouts and challengers.
   Amendments are drafted together at the end. Onboarding (S1-R8) is deferred.
7. (after slice 2) P5: all review outputs are revisable directions. INV-1 (runtime "JEV"-style decision networks / decision webs; not JEPA) runs alongside slice 3 with the usual
   2+ blind reviewers. Slice 3 scouts must also judge how readily the shipped code takes the accepted 7-primitive core model.
