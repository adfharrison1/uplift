# Phase 1 applier brief (design-doc amendments)

You are applying ONE commit group of reviewed documentation amendments to the "Uplift" repo at /Users/alanharrison/Desktop/Code/uplift, on branch review/2026-11-root-and-branch. Do NOT commit; the orchestrator commits.

Inputs, all under /Users/alanharrison/Desktop/Code/uplift/reviews/2026-11-08-root-and-branch/:
- raw/S7-inventory-v3.json: the amendments. Apply ONLY the ids listed for your commit group.
- raw/S7-apply-punchlist.md: BINDING. It overrides an amendment where they conflict.
- raw/S7-opus-rulings.md: BINDING.
- register.md: the source of truth, holding the owner pillars P1-P5, the owner's exact words and the owner decisions, including the Q1-Q4 decisions after slice 7.
- raw/S7-change-plan-v3.json: the plan. Planned-behaviour text cites its change ids as "(planned: <id>)". Change ids may appear ONLY in DESIGN_NOTES.md and under openspec/, never in AGENTS.md, README.md, src/ or tests/.

Rules:
1. Edit in place with your Edit/Write tools. Locate each target by its verbatim `anchor_quote`. Headings that earlier groups suffixed with a status marker are matched by prefix.
2. Write real, finished prose from each amendment's `summary` and `new_text_outline`, in the existing house style of DESIGN_NOTES: dense, concrete, backticked identifiers. Keep it as short as faithful allows.
3. NEVER delete valid planned content. Use "(planned: <id>)" status marks, rewrites or moves as the amendment says. Content you do not target must stay byte-identical.
4. Use the owner's exact wording wherever the register or the amendment provides it.
5. Do not touch AGENTS.md, README.md, src/, tests/ or .agents/. Those changes go through OpenSpec changes.
6. When you finish, run `npx prettier --write` on any NEW file outside prettier-ignored paths (DESIGN_NOTES.md and openspec/ are ignored), then run `npm run verify`. It must pass.
7. Write a short report to the path given in your task: for each amendment id, `applied` or `skipped` with the reason, plus every place you had to interpret.
