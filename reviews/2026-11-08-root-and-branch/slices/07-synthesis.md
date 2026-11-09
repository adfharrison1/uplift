# Slice 7: Synthesis and action plan

## How the plan and inventory were produced
- **7a.** Two revisers rebuilt the change plan (v2: 83 changes) and the amendment inventory (v2: 89 amendments).
- **7b.** Four auditors re-audited both. All four returned ready_with_fixes:
  - A1 found 17 items with no owner once each scope's text was read.
  - A2 recommended merging down to about 63 changes across 6 milestones.
  - A3 found 2 genuine owner questions and 5 additions nobody had accepted.
  - A4 found 14 apply conflicts and 13 contradictions between slices.
- **7c.** Opus wrote binding rulings (raw/S7-opus-rulings.md), then two v3 revisers ran. Plan v3 has 64 changes; inventory v3 has 94 amendments, each anchored on a verbatim quote (160 anchors).
- **7d.** Two final gates both returned approve_with_minor:
  - F1 found 2 minor gaps in the plan; Opus fixed them.
  - F2 found editorial issues in the inventory. These became a binding punch list (raw/S7-apply-punchlist.md).
- **Checks.** Opus independently verified both versions: dependencies resolve, there are no duplicates, milestones are monotonic, every anchor is verbatim, every amendment sits in exactly one batch, and every plan reference resolves.

## The headline verdict across the whole review
Uplift has **disciplined code under a design that had outrun its foundations**.
- **The code is clean:** a pure reducer, deterministic ordering, crash-safe saves, a fast suite.
- **The design is rich and distinctive:** the Integral/Particular advisors, stylometric rival tells, and dual scar ledgers.
- **What was missing is the middle.** There were no written rules for the player loop, and the hubs every system connects through were absent: clock, Act, Observation, presence, ledger. Structural cracks sat exactly where those hubs would go: slice clone cost, no outcome channel, frame-rate-dependent stepping, no save migration, and stateless input.
- **Three shipped features don't do what their docs say:** the lab save, the logging pipeline, and the bridge's security model.
- **The docs drift mechanically.** The design-notes skill writes planned features into AGENTS.md, and the specs certify several defects as SHALL requirements.

The review's answer:
- a written rules spine and a 7-primitive core model;
- a hardening batch that goes in before any new feature;
- prerequisites for 05d/05e;
- one text pipeline under P2;
- one doc shape, gated by a docs-truth test;
- a dependency-graph roadmap.

All of it is revisable under P5.

## Action plan: 64 changes in 6 milestones (raw/S7-change-plan-v3.json)
| Milestone | Changes | What you can see or do at the end |
|---|---|---|
| **M1 Trustworthy foundation** | 10. hx-ops-safety (bridge lock, logger rotation, parallel verify) **first**, then docs-spine-and-roadmap, process-gates-and-ledger, and hardening 1–7 | The docs can be trusted, saves round-trip and migrate, and a golden seeded run hashes identically twice (including after save → load → continue). Your machine is no longer writable from any web page. |
| **M2 Walkable, usable room** | 7. Render residency and the shape table, 05d (input, control frame, locomotion, arrival hold, readability), 05e (modal stack, settings), audio-minimal | Walk a room with WASD and footsteps, bump into props, press Space to use things (with a warm mark on the target), open menus, change settings. |
| **M3 Core model alive** | 12. Launch validation, lab JSON as source of truth, 05b-1 clock, telemetry wiring, then Act, Observation and notebook, instrument profiles and audibility, presence, crowd render, threads and pillars, ledger and emergency runtime, diffusion | Spend watches; see NPCs act, beliefs spread and pressure shift, both headless and in a crowded room. |
| **M4 Talk and notebook** | 8. 05f eval and replay, **08a timing spike**, text port and history, authoring kit, dialogue paging, camera directive stack, bubble/lace skins with tone blips, notebook presenter | Hold a paged conversation, read the outcome in the notebook, replay it in eval. |
| **M5 Vertical slice (go/no-go)** | 2. One Epoch 1 thread with few NPCs, one office/pretext, and the ledger end card | Play one thread from first clue to an end card, then decide what to change before breadth. |
| **M6 Breadth** | 25. 06/06a, 05b-2, 08 generated adapter, 07a–e, 05a, 06c, 06b, 09/09a, 10, 11 | A finished Epoch 1. |

**Start with:** hx-ops-safety. The CSRF has been reproduced and the fix is independent of everything else. docs-spine-and-roadmap can go the same day.

**Top rework risks** (give these the most design care):
1. cm-act-envelope-and-rolls: 30+ changes consume it.
2. hx-fixed-step-tick: its phase order sets determinism for everything after it.
3. cm-presence-and-materialize: it bridges watches, rooms and the renderer.
4. hx-save-integrity: a close fourth.

**Parked** (recorded in roadmap.yaml): onboarding, DPR/AA, silhouette budget, theme roles, later notebook categories, offline self-play tuning, the classifier spike, the INV-D Bayesian network, INV-F exact inference, the RC2 reranker, dither-fade occlusion, merged Tier-3 crowd, compiler-API import scanning, the Epoch 1 definition of done, and the past-advisor cameo.

## How the amendments get applied (proposed)
- **Phase 1: review amendments to design docs, applied directly.** This covers inventory batches B1–B8: DESIGN_NOTES, the config context, and a new openspec/roadmap.yaml seeded from plan v3.
  - Exclude A-54 (the AGENTS.md Quick Verify text). It ships with hx-ops-safety.
  - Exclude all of B9 (the AGENTS.md rewrite, the docs-truth test, the gates skill, the design-notes skill fix, the ledger, config pins). That becomes the process-gates-and-ledger OpenSpec change.
  - Work on a branch with one commit per batch. Each batch: a Sonnet applier, then verify, then 2 blind Sonnet reviewers (fidelity to inventory and punch list; coherence and shipped-only), then an Opus check. The owner reviews the branch diff before merge.
- **Phase 2: OpenSpec.** Propose the M1 changes with the full gate process, in order: hx-ops-safety → (docs-spine is done in phase 1) → process-gates-and-ledger → hx-1 … hx-kinematics. Everything later stays as roadmap.yaml entries until it is reached; proposals written now would go stale (P5).
- **Phase 3: write the repeatable review skill** from framework.md, briefs/, process-notes.md and the lessons in this slice.

## Owner questions
- **Q1. Timing spike.** Recommended: split it. A no-merge timing spike (08a) runs just before the 07 text skeleton, so the generated-adapter seam is designed with real numbers. The generated adapter (08) stays after 05b-2.
- **Q2. Save policy.** It blocks cm-observation-notebook. Candidate: autosave at watch boundaries plus named manual saves; the notebook persists across reloads; no reload-to-undo of discovered knowledge.
- **Q3. Defect ledger.** Location `openspec/defect-ledger.yaml`. Seed: every open code defect this review found that has a slotted fixing change (all severities), or majors only.
- **Q4. Application approach.** Approve phases 1 and 2 as above, or change them.
