# Process notes and lessons (for making this review repeatable)

## Pipeline per slice (what actually worked)
1. Opus writes the slice briefs: the common brief, a lens, an owned file set, 4–6 questions, an output path, and a cap of 8 findings. There must be at least 2 unconsidered routes, and a keep list.
2. 2–3 Sonnet scouts run in parallel. Each lens is distinct, and in code slices each scout owns a distinct file set.
3. `python3 -I reviews/tools/quotecheck.py raw/<file>.json` checks every quote. It catches wrong line numbers and quotes that don't exist.
4. Opus verifies the load-bearing claims against the source itself, with grep/sed or a quick run.
5. Opus consolidates the findings into one `<slice>-consolidated.json` (merging duplicates) and writes the split challenger inputs with a small python step:
   - claims-only files for the falsifiers (claim + paths, with no recommendation or severity);
   - recs+routes for the judges;
   - criticals-only for the critical re-attack.
6. Blind challengers run in parallel. Thorough mode: every finding gets at least 2 reviews and every route at least 2; criticals get 3 or more.
   - Falsifiers split the claims between them (about 9 each) and write their OWN repros in code slices.
   - One or two judges review the recs and routes from different professional lenses (game designer, engine architect, sim designer, security/DX lead).
7. Opus adjudicates:
   - re-word overstated claims;
   - re-rate severity, using the test "if not decided now, about-to-ship code gets built in the wrong shape";
   - rule explicitly on any disagreement between challengers;
   - check any challenger premise that drives a ruling (for example the Vite default CORS).
8. Write `slices/NN-<name>.md`, append to `register.md`, and update both README status tables.
9. Checkpoint with the owner: a blunt verdict, a findings table, routes, and 2–4 decisions. Record the owner's answers as pillars (P1..Pn) or per-finding statuses BEFORE starting the next slice.

## Rules that proved important
- **Owner pillars are binding.** Scouts must not argue against them. De-weighted topics (here: solo scale vs time, and the number of review gates) are banned as the core argument of a finding.
- **"Holds" is a valid, rewarded verdict** for challengers. Without this they invent problems.
- **Scouts must not see other scouts' output, and falsifiers must not see recommendations.**
- **The repo is read-only.** Probes and repros go only in the session scratchpad, and live server probes bind to 127.0.0.1 with scratch dirs. A probe once created `.vitest/` in the repo, so every code challenger now ends with `git status --short`.
- **Check facts that come from web research against primary sources.** INV-1b produced two unsourced figures that ch4 caught.
- **When the owner names an unfamiliar tool, search for it before guessing.** "JEV / LAYA" was misread twice before a web search found it.
- **Scout "criticals" were routinely downgraded by challengers.** That's expected; keep the bar high.
- **Measurements depend on the machine.** Report the scaling, and treat absolute ms as indicative.

## Inputs that slice 0 must always gather (they feed every later slice)
- what actually runs from each entry point;
- registry kinds vs content counts;
- docs vs code drift;
- the roadmap's delivered vs planned changes;
- verify time;
- LOC and test ratios;
- commit-type mix.

## What to carry between reviews
- `register.md`: pillars, decisions, and statuses.
- The previous review's folder. The next review should start by checking which accepted findings were actually delivered, and whether any pillars changed.

## Added during slice 5
- Tag each challenged claim's `kind` (rule | vocabulary | placeholder | code). In a young project, scouts will critique placeholder art; only rule and vocabulary gaps should drive the roadmap.
- When challengers disagree on *timing* rather than substance, the ruling is usually "build the cheap seam now, the full feature with the change that first needs it" (for example: the camera latch and zoom in 05d, the directive stack in 07).
- Some disagreements touch an owner rule (the per-NPC tone blips vs the no-speech rule). Hand those to the owner; don't rule on them.
- A GPU or browser profile can't be done headless. Have the renderer scout write the exact DevTools scenario so it can be run with the owner later.

## Added during slice 6
- Derived artefacts (change plan, amendment inventory) drifted from the owner's exact words and from accepted order even when the scout had the register. Always audit them twice against the register: once for coverage and order, once for fidelity. Never apply docs straight from a scout's inventory.
- Challengers can only rule on what they can see. If a claim is about the register, a blind falsifier returns "unsure". That's fine; Opus verifies those claims itself.
- Slice-0 facts can be wrong (S0B-42). Later slices should re-check any slice-0 fact they lean on.
- Review findings may contradict archived specs. Flag every case where a SHALL requirement encodes a defect, so the fix change carries a spec delta.

## Added during slice 7
- Revise, re-audit (4 lenses), Opus rulings written to a file, a second revision, then a final gate of 2 auditors. Each revision self-checks with a script, and Opus re-runs the checks independently.
- Final-gate editorial issues become a binding **punch list** for the appliers, rather than another revision round.
- Separate *design-doc amendments* (applied directly as review output: DESIGN_NOTES, config context, roadmap.yaml) from *code/process changes* (AGENTS.md rewrites, tests, skills, which go through OpenSpec). AGENTS.md is written only by the change that ships the code.
- Only propose the next milestone's OpenSpec changes. Keep the rest as roadmap entries, because proposals go stale (P5).
- Phase 1 order: apply content amendments first (C1–C4, each checked for fidelity), then a separate restructure pass (C5) with a traceability table and a no-loss reviewer. Separating "is it correct" from "is it well organised" avoids the fidelity drift seen when the two are mixed.
- Subagent stipulation (owner): every brief says "high reasoning, medium-to-high model". In Claude Code that means `model: sonnet` or stronger, with `effort: high`. Never name vendor-specific models in project docs.
- Owner requirement: every skill that edits docs (design-notes, review, gates) must maintain the doc system's integrity and order. That means one canonical statement per concept, index upkeep on every edit, status discipline, no-loss traceability on moves, and size budgets that push overflow into `design/` files. Phase 3 skill writing must encode this as procedure, not advice.
