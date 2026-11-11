---
name: root-and-branch-review
description: Use when the owner requests a periodic deep review of Uplift's delivered code, design, roadmap and engineering process, or resumes an existing root-and-branch review.
---

# Periodic root-and-branch review

Review the roots before the branches. Produce evidence-backed, blunt advice while preserving the owner's pillars and rejected decisions. This is a periodic assessment, not a substitute for [delivery gates](../uplift-review-gates/SKILL.md).

## Start and resume

Use the default checkout. Inspect `git status --short`; preserve unrelated work. Review existing code and docs read-only. Put probes/reproductions in temporary scratch directories; live probes bind only to `127.0.0.1` with temporary storage. End code probes with a working-tree status check. Write only the review's authorized outputs until approved amendment batches begin.

Create or resume `reviews/<date>-<name>/` with a register, slice digests, briefs and raw evidence. Keep review output tracked under the accepted review-history convention; do not copy historical ignore instructions. Read the previous register first: reconcile every accepted finding against delivered evidence, unresolved ownership and the current roadmap. Retain rejected and parked decisions with reasons. Copy current owner pillars verbatim and record whether they changed.

Read [slice and brief contracts](references/slices-and-briefs.md) before dispatch and [adjudication and amendments](references/adjudication.md) before consolidation. Those references contain the required output fields, independent coverage counts and owner checkpoints.

## Review sequence

| Slice | Subject                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Baseline facts: entry points, consumers, registry counts, docs drift, roadmap, verification, LOC/test ratios and commit mix. No mandatory playtest. |
| 1     | Root: vision, player loop, legibility, positioning and sequencing. Hard owner checkpoint.                                                           |
| 2     | Systems: cognition, economy/feedback and content/text pipeline.                                                                                     |
| 3     | Simulation core: movement/spatial, state/reducers, orchestration/persistence.                                                                       |
| 4     | Engineering: architecture guardrails, registry/content pipeline, tests/telemetry/trust boundaries.                                                  |
| 5     | Runtime, feel and presentation: frame cost, input/accessibility, art/audio.                                                                         |
| 6     | Process and docs: truth placement, roadmap/gates, amendment inventory.                                                                              |
| 7     | Synthesis: revise → four-auditor re-audit → written rulings → revise → two-auditor final gate → binding punch list.                                 |

Use **two or three independent scouts per slice**, including baseline. Synthesis scouts draft/revise the plan and amendment inventory; its auditors are additional. Every brief says **high reasoning, medium-to-high model**. Limited slots mean waves, preserving independence and counts. Scouts do not see each other's outputs.

For **every finding and every recommendation/route**, obtain at least **two blind independent reviews of each**, plus a **third for critical or roadmap-changing items**. Track finding and recommendation coverage separately. Falsifiers receive claims/evidence/paths without recommendation or severity; recommendation judges receive proposals/routes and pillars without other verdicts. “Holds” is a valid result.

Run the bundled checker, then independently verify load-bearing claims and challenger premises:

```bash
python3 -I .agents/skills/root-and-branch-review/scripts/quotecheck.py findings.json --root .
```

It checks complete exact source ranges. Command evidence is never executed; exit 2 requires recorded human verification. See [evidence format](references/evidence.md). A quote match proves a citation, not the claim's meaning.

Checkpoint after baseline, hard stop after slice 1, and after each slice 2–6. Record the owner's answers before continuing. Apply only approved content batches, then a separate no-loss restructure, following [document integrity](../uplift-review-gates/references/document-integrity.md). Code/process fixes go through OpenSpec. Propose only the **next** roadmap change; later work remains roadmap entries.
