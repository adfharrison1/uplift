---
name: uplift-design-notes
description: >-
  Break a raw Uplift design-note dump into topics, research each topic with
  three parallel subagents (game design, codebase fit, pacing and hardware),
  and after approval integrate it into DESIGN_NOTES.md, openspec/config.yaml,
  and AGENTS.md, then run a coherence assessment. Use when the user pastes
  design notes, says design note dump, topic assessment, or asks to record a
  new mechanic into the living roadmap.
---

# Uplift Design Notes (`uplift-design-notes`)

Use this skill when the user drops a raw design-note dump, asks to assess notes already in `DESIGN_NOTES.md`, or asks to record a new mechanic into the living roadmap. Process **one topic per cycle**. This skill writes living docs. It does not run `/opsx-propose` and it does not commit unless the user asks.

## Standing constraints

Read these before splitting topics, and repeat the ones that bind the current topic inside every subagent prompt:

- `Epoch` and `Era` are synonymous. Schemas use `epochId`.
- The campaign ladder is an ordered `EpochProfileBlueprint[]` (`N >= 1`, final entry `isTerminalEpoch: true`). The 7-epoch arc is the default content ladder, never an engine constant.
- Names of people, ships, drones, places, and threads are seed exemplars. Engine ids for the advisors are `advisor_integral` and `advisor_particular`.
- `src/domain/` and `src/application/` stay epoch-agnostic: no feudal hardcoding, no `three`, no `Math.random()`, no `Date.now()`.
- Target hardware is a 2019 Intel Core i7, 16GB RAM, 60 FPS, 100% local, zero API keys.
- A new mechanic becomes its own roadmap change when folding it into an existing change would bloat that change. Letter the id (`06c`) and name its dependencies.
- Subagent model: `composer-2.5-fast` or `grok-4.7-high-fast`. Prefer the highest-reasoning of those two that is available. If the user names another listed model, use that. If a slug is rejected, retry the other allowed slug or do the pass yourself and say which model was unavailable. Do not substitute an unlisted model.

## 1. Topic breakdown

1. Read `DESIGN_NOTES.md`, the context block and planned change sequence in `openspec/config.yaml`, and the registry list in root `AGENTS.md`.
2. Separate the user's raw dump from sections already under **Solidified Design Decisions**. Leave the raw dump in the file until the user asks to remove it.
3. Split the dump into topics. One topic is one mechanic cluster that could become one OpenSpec change (or a deliberate fold into an existing change). Keep coupled ideas together (a state machine and its scheduler). Split ideas that would blow the 4–6 task budget.
4. Present a numbered topic list: one-sentence gist, likely change id or "fold into `<existing-id>`", and any obvious clash with a solidified decision.
5. Stop. Research the topic the user names. If they already named it in the same message, start there.

## 2. Three-agent research

Launch **three** `generalPurpose` subagents in **one** message. Each prompt must include the topic text, the standing constraints, "do not edit files", and a request for a concrete recommendation under ~1200 words.

| Agent                           | Brief                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game design and precedents      | What similar games do, what to take, what to leave, and a playable loop with duration and failure modes.                                                |
| Codebase and architecture fit   | Read the current registries, reducers, rendering, and roadmap. Name new contracts, layer placement, reuse of shipped systems, and 4–6 inward-out tasks. |
| Pacing, hardware, and coherence | Watch economy, storyteller budget, anti-over-acceleration, 2019-Mac cost, exploits, and clashes with solidified decisions.                              |

When they return, check their claims against the files they cite. Present one synthesis to the user:

- Recommended loop and epoch-agnostic contracts (content skins stay in `src/content/`)
- Where it sits on the roadmap, with dependencies and non-goals
- The forks only the user can decide

**Wait for approval before editing any living doc.** A stipulation in the approval is part of the decision. Fold it into the synthesis before writing.

## 3. Integration

After approval, update the living docs so a later agent can implement the decision without the chat transcript.

1. `DESIGN_NOTES.md` — add a numbered solidified section: why, player-facing loop, epoch-agnostic contracts, default-ladder content skins marked as exemplars, and the user's stipulations.
2. `openspec/config.yaml` — add a context bullet and a planned-sequence line (`<id> — <one sentence> [planned — revisable]`). Keep change order equal to dependency order.
3. Root `AGENTS.md` — add a registry bullet when the decision names a new system.
4. Section `README.md` / `AGENTS.md` — update only the guide that would otherwise describe the wrong inventory or recipe.

Writing rules while you edit:

- Engine text stays free of era names. Era names appear only as default-ladder content skins.
- Reuse an existing contract (`StageSceneBlueprint`, `StoryletTemplate`, `WorldEffect`, `SeededRandom`, `StateSliceKey`) before inventing a parallel one.
- Do not delete the user's raw notes unless they ask.
- Do not create `proposal.md`, `design.md`, or `tasks.md`.
- Run `npm run verify` after the edit.

## 4. Final assessment

Run this after a batch of topics is recorded, or when the user asks whether the docs still agree. Launch **three** subagents in one message, same model rule, "do not edit files":

| Agent            | Brief                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Terminology      | `Epoch`/`Era`, locked epoch counts, exemplar names used as engine ids, advisor ids, `*Tick` fields that should be watches. |
| Roadmap          | Duplicate systems, change ids that depend on work scheduled after them, changes too large for 4–6 tasks.                   |
| Code versus docs | Solidified claims that contradict shipped schemas, layer rules, or tests. Read the files.                                  |

Verify every finding against the cited file. Present a short contradiction list and the exact edit you would make. Apply those edits only after the user approves, then run `npm run verify`.

## Pause points

- After the topic list, unless the user already named the topic.
- After the synthesis, before any living-doc edit.
- After the final-assessment list, before applying coherence fixes.
