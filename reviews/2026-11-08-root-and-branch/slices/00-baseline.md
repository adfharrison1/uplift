# Slice 0 — Baseline (verified facts)

Sources: raw/S0-A.json (42 facts), raw/S0-B.json (56 facts); all quotes script-checked (0 problems);
23 load-bearing facts blind re-verified by 2 independent checkers (44/46 holds, 2 "partly" nuances, 0 wrong);
Opus spot-checks on wiring, registry counts, telemetry.

## What exists and runs
- One page: 2 rooms (yard, chambers), 1 door, 2 characters (player operative + a yard walker). Click a waypoint
  button or floor near a waypoint to move; click door to cycle state; switch focus; F3 pause/free-cam/stage-lab edits saved to disk.
- No WASD, no Space/Escape, no menus, no conversation, no game rules a player can engage with.
- verify passes: 6.1–6.6 s (documented budget <5 s). Unit 2.3 s. 24 test files / ~133 cases. 0 TODOs.

## Built but inert (schemas/reducers, zero content, zero callers)
- Registry supports 11 kinds; content registers 3 (2 spaces, 1 prop, 2 characters). Offices, quiet claims, rivals,
  threads, channels, emergencies, behaviors, orbital pass: 0 entries. Only getOrbitalPass is ever called (returns undefined).
- Reducer cases for illicit instruments, pressure stocks, discovery layers, emergencies, orbital pass, legacy scars:
  nothing dispatches them. enqueue_npc_stimulus: never dispatched. Cognitive scheduler pulses every frame over nothing.
- saveToSlot / loadFromSlot / exportLegacyState: never called by the app.
- Browser uses its own in-memory telemetry (compact() is a no-op) and in-memory saves; the infrastructure NDJSON logger,
  compactor and file saves are reachable only from the CLI and the Vite plugin. Nothing posts to /api/telemetry or /api/saves.
  logs/ files are 0 bytes; saves/ empty. The "non-negotiable: every event MUST be logged" pipeline is not fed by the game.

## Docs vs reality
- Root AGENTS.md describes as present: locomotionMode, interactionHold, WASD/Space/Escape menus, 0.22 m disc /
  0.03 m slop, conversation paging, ambient lines, eval:ai — none exist (all are planned 05d/05e/05f/07).
- Also absent: setup-models, ONNX worker, audio patches route, pacing-profiles route, VoiceProfile, EpochProfileBlueprint,
  EpochTechCeilingBlueprint (markdown only).
- Minor contradictions: README "TS 6.0.3" vs pinned 6.0.2; verify <5 s; 4–6 task rule broken by 02 (8) and 05c (7);
  05c delivered but not tagged [archived] in config.yaml.

## Weight & process
- Docs: ~24k words across guide docs + DESIGN_NOTES (10.3k words, mostly unbuilt) + config.yaml (5.9k words),
  plus 2.5k lines of openspec specs/changes — vs 11k LOC src.
- 79 commits in 11 days: docs 29 > feat 26; docs+chore+build 44 vs feat+fix+perf+test 35.
- Roadmap: 27 changes; 7 delivered; 20 planned with no proposal. Ordering edited by splitting (05a–f, 06a–c, 07a–e).
- 05c (first interactive page) took 3 fix + 1 perf commits after 4 feats; earlier changes ≤1 fix each.
