# Slice 1 — Root: vision, loop, legibility, sequencing (adjudicated)

Pipeline: 3 scouts (22 findings, 11 routes, 11 keeps) → quote-check → Opus verification → consolidated to 14 findings / 9 routes →
3 blind challengers (ch1 falsified all 14 claims; ch2 judged all recs+routes; ch3 re-attacked the 3 criticals + all routes) → Opus adjudication.
Every item below had ≥2 independent reviews; criticals had 3.

## Accepted findings (final wording and severity)
- **S1-R1 CRITICAL — No written player loop or player contract, and nothing in the roadmap forces one to be tested before the big systems.**
  (merges S1-01 + S1-03; both challengers trimmed wording: a one-line macro aim, persecution/extraction failure path and a dual-ledger
  end gate exist.) Missing: Epoch 1 mission, verbs per thread, how the player knows they're winning, epoch-end evaluation, what a
  bad epoch looks like; 'Leverage Chain' never defined. First content pack is change 11/27; first consequential choice ~07; 05a/05b/06/06a/08/09/10
  are designed against a world with no rules content. Severity held at critical by Opus (ch3: "defence is weak for this particular gap").
  REC: one-page Epoch 1 player contract + a vertical-slice change before 05a/05b/06 that is the acceptance gate for 06; add a "validated by" column to the roadmap.
- **S1-R2 MAJOR — Feedback for covert actions is under-specified per action.** (S1-02 downgraded: the HUD ban at DESIGN_NOTES:207 is scoped
  to travel cues, and advisors/desk/overview/fracture cues are named channels.) No passage says when and how an action's success/notice/backfire
  reaches the player. REC: every WorldEffect carries a player-readable cause surfaced later through advisor prose and in-room evidence;
  advisors may omit but never lie (unless a rival spoofs); no numeric debrief.
- **S1-R3 MAJOR — Loop cycles unwritten and conversation is free of campaign time.** (S1-04.) REC: write minute/session/epoch cycles; let the
  cost of talking come from the world (NPCs move on by watch) rather than a new meter.
- **S1-R4 MAJOR — No NPC presence model bridges watches and rooms.** (S1-05.) REC: per-character watch-of-day presence table resolved on room
  entry; every macro lever is exercised through a reachable person or place.
- **S1-R5 MAJOR — Hidden-information design with no player notebook and no save/reload policy.** (S1-06, held by both.) REC: lace log as
  notebook (auto-recorded, diffable; omitted clauses show as gaps); decide save policy now (e.g. autosave at watch boundaries).
- **S1-R6 MAJOR — Schemas encode unvalidated numbers; rework already queued; generality ahead of use.** (S1-09, held by both.) 1,894 lines of
  registry/schema/reducer/legacy for 3 entries; 8 *Tick fields queued for rebase onto Watches. REC (amended): don't move or delete code; freeze
  extension — no new registry kind or effect without a content consumer; settle the clock model before any further time-bearing schema.
- **S1-R7 MAJOR — Writing pipeline undecided.** (S1-07 reworded: 'Period-Voice Composer' appears only in config.yaml; 'authored' is stated for
  ambient lines/chunks.) Change 08 depends on the answer. REC: free text (if kept) selects among authored nodes; drop 'Composer'; authored
  quality-gated storylet cards for spine beats, slot grammar only for filler.
- **S1-R8 MAJOR — No onboarding / first-10-minutes design.** (S1-11 onboarding part held; 'no experiential intent' overstated.) REC: script the
  opening 10 minutes as part of the slice; 5-line best-case play story per thread as acceptance scenarios.
- **S1-R9 MINOR — Advisors re-rolled each epoch weakens the through-line.** (S1-08 downgraded: interpretation.) REC: keep new operative per epoch;
  persist advisor identity and trust across epochs, let traits drift.
- **S1-R10 MINOR — System inputs/consumers thin.** (S1-10 overstated: threads do have loose levers.) Fund acquisition deferred; pressure stocks
  thinly read. REC: one-page who-writes/who-reads system graph, applied first to the slice.
- **S1-R11 MINOR — Inert/contradicted subsystems.** (S1-14, held by both.) REC: label click-to-waypoint dev tooling; wire browser telemetry to
  /api/telemetry so the logging rule becomes true.

## Rejected / folded
- S1-13 (no epoch-handoff payoff) — REJECTED: DESIGN_NOTES:174,179,182 specify stills, predecessor traces, remembering NPCs.
- S1-12 (tone only flavour) — overstated; folded into S1-R2 (ethics shown through advisor disagreement and named people's fates, not numbers).

## Routes
- ENDORSED: R1 one-thread vertical slice (both); R5 text-only advisor/writing prototype before dialogue/NLP engine work (both).
- ENDORSED WITH CHANGES: R2 advisors as feedback (prose, ground-truth-bounded, eval case on 05f); R3 lace-log notebook (string board deferred);
  R4 content-first discipline (freeze, don't quarantine); R7 authored cards for spine; R8 Epoch 1 as "definition of done" with its own ending,
  keeping cross-epoch continuity.
- REJECTED: R6 seasonal council with rooms as scenes (inverts embodied pillar; keep only as between-room summary framing);
  R9 CK3 numeric odds (HUD dump; use qualitative odds in advisor speech, optional accessibility setting).

## Keep (protect)
Clock 1 / Clock 2 separation; character specificity bar; dual scar ledgers as fail-forward; Integral/Particular advisors + omission;
stylometric rival tells; quiet-by-default event pacing; revisable roadmap; deterministic headless eval path.
