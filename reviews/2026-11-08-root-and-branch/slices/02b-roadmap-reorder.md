# Slice 2b — How much does reordering the existing roadmap achieve? (owner question)

Draft: raw/S2-roadmap-mapping-draft.md. Checked by 2 blind subagents: raw/S2-roadmap-check1.json (mapping accuracy) and
raw/S2-roadmap-check2.json (dependency and order critique). Corrections below are folded in.

## Answer (slice 2's 19 findings)
- **Fixed by reordering or splitting alone: about 2.** S2-01 (clock, by splitting 05b and moving the clock half earlier) and S2-13 in part (3 of the 5 hubs live in 05b, 06 and 06a).
  Slice 1's sequencing problem is also a reorder: defer 05a and the old 08, and build the vertical slice as the first pass of 11.
- **Already inside an existing change's scope; the spec must include the fix: 3 firm, 2 partial.** S2-07 (06, schema part), S2-16 (06), S2-19 (09);
  S2-09 partial (06), S2-18 partial (09: insertion spending Delta is not in 09's text).
- **New scope (in no change): 6, plus 1 partial.** S2-02 Act/actor, S2-03 Observation, S2-08 authoring kit, S2-11 presence, S2-12 notebook, S2-14 instrument
  profiles; S2-15 decay partial. Also in no change: resource ledger, StateSlice clone fix, browser telemetry wiring.
- **Rescoping an existing change: 4.** S2-04 and S2-05 (08 becomes local text generation), S2-06 (07e becomes gates), S2-10 (diffusion split; touches 05b and 06a). Also S1-R3 (07 says reading costs no watch).
- **Docs only: 1.** S2-17 rules spine (plus the system graph, clock record and player contract at amendment time).

## Corrected order (check2's version, endorsed by Opus)
0. Docs: rules spine, system graph, clock decision record, Leverage Chain definition.
1. 05d direct floor locomotion.  2. 05e proximity use and menus.
3. StateSlice clone fix → 05b-1 (elapsedWatches, advance_watches, *Ticks→*Watches, timeHorizonConfig, Committed Time-Spend verbs). The watch budget and time-spend verbs MUST stay in 05b-1.
4. NEW: effect envelope (actor/cause), Act ring, BehaviorModule commit.
5. NEW: Observation table, derived discovery, notebook data model, instrument data profiles and decay keys.
6. NEW: presence function and materialize-on-entry.
7. NEW: ThreadRuntime, pillar relations (Leverage Chain), ResourceLedger, EmergencyRuntime, closed-form diffusion.
8. 05f eval runner (evidence-coverage and diffusion cases with real fixtures).
9. 07 dialogue paging, plus TextSourcePort (authored and pool adapters), LineBrief and gate, freeze-on-show, authoring kit (generated adapter stubbed).
10. Vertical slice as the first pass of the Epoch 1 pack (one thread, few NPCs, one office/pretext, ledger, stub end card).
11. 06 utility AI, rivals + tellProfile, overview, Writing Desk, Report-as-Observation; 06a Regard on top.
12. 05b-2 storyteller, envelopes, storylets, pacing lab, tuned against the slice.
13. 08' local text generation (generated adapter, plus a timing spike on the real Mac), then 07d, then 07e gates (07e depends on 07d), 07a–07c.
14. 05a audio, 06c, 06b, 09 (+ Delta on insertion, emergency fuse), 09a, 10 (crew handoff, P3), rest of 11.

## Owner amendment (after slice 5)
- The hardening batch (0a, 0b, 1–7) lands before 05d (slices 03 and 04). The validateLaunch / kind-table / docs-truth work lands before the first new kind at 05b-1 (slice 04).
- A **new minimal-audio change goes directly after 05e**: footsteps by surface, doors, menu confirm/back, murmur through doors on provisional audibility tiers, and per-NPC tone blips once text pages exist. Full 05a stays later.
