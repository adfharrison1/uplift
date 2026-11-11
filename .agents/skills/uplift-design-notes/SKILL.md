---
name: uplift-design-notes
description: Use when the owner supplies raw Uplift design notes, requests a topic assessment, or asks to record a mechanic or process notes already in the design inbox.
---

# Uplift design notes

Process one topic per cycle, preserving the owner's words and one canonical statement per concept. This workflow researches and integrates design; it does not implement gameplay, generate OpenSpec proposals, commit, or write AGENTS guides.

Use [uplift-review-gates](../uplift-review-gates/SKILL.md) and its [document integrity procedure](../uplift-review-gates/references/document-integrity.md). Read that procedure before editing living documents. Its task sizing and capability-based reviewer briefs supersede older fixed task counts and vendor model names.

## Locate and research

1. Inspect `git status --short`; use the default checkout and preserve unrelated work. Read `notes/inbox.md`, `DESIGN_NOTES.md` (pillars, rules spine, status index, Where facts live and dispositions), `design/README.md`, relevant feature files, and `openspec/roadmap.yaml`. Config context is a summary, not the roadmap authority. Read source and scoped guides when checking shipped behavior.
2. Capture a newly pasted dump verbatim in `notes/inbox.md`, retaining its provenance and existing inbox content; intake records the input, not an approved design decision. Keep raw notes intact while processing. Split the dump into mechanic clusters, keeping coupled ideas together. Present each topic's gist, likely existing canonical home, roadmap fit and conflicts. Research the topic the owner selects; if already selected, proceed without asking again.
3. Research unfamiliar names before interpreting them; verify external claims against primary sources. Compare each note against existing decisions first. Existing coverage calls for verification and a disposition, not another design section. Raise conflicts with pillars or the rules spine to the owner.
4. Obtain **three independent research perspectives**, with read-only briefs stating **high reasoning, medium-to-high model**, exact raw wording, relevant accepted constraints and evidence paths. Use available models meeting that capability; limited slots mean waves, never fewer perspectives or author self-review.

| Perspective                    | Required assessment                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game design and precedents     | Playable loop, precedents, duration, failure modes and what to take or leave.                                                                      |
| Codebase and architecture fit  | Actual shipped contracts and consumers, epoch-agnostic layer placement, reuse, roadmap dependencies and a task split using the delivery size rule. |
| Pacing, hardware and coherence | Economy/storyteller budget, exploits, anti-over-acceleration, accepted decisions and local 2019 Intel i7 / 16 GB / 60 FPS cost.                    |

Include constraints that bind the topic: Epoch and Era are synonymous (`epochId`); the intended ladder is data-driven, never a fixed engine count; content names are exemplars; domain/application remain epoch-agnostic; local operation uses no external runtime APIs. Distinguish intended contracts from shipped code.

Check research claims against cited evidence. Present a concrete synthesis: loop and contracts, canonical placement, roadmap fit/dependencies/non-goals, alternatives requiring owner judgment, and each raw paragraph's proposed disposition. **Owner approval of that interpretation and disposition precedes living-document edits.** Incorporate stipulations verbatim. Reuse explicit approval already given for the same scope; research completion is not approval.

## Integrate approved dispositions

| Disposition                      | Action                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted new or revised design   | Edit the existing system home in DESIGN_NOTES or its indexed feature file; retain owner wording/exemplars verbatim. Mark planned work with resolvable roadmap references. |
| Already covered                  | Verify the canonical text, status and existing disposition; record them as checked/unchanged. Add no duplicate decision or roadmap item.                                  |
| Rejected or deferred             | Retain the reason, owner ruling and revisit condition where applicable in dispositions; do not silently drop the idea.                                                    |
| Failed, undecided or unprocessed | Preserve original inbox text intact; record the unresolved question without presenting it as a decision.                                                                  |

For every edit check the **status index, Where-facts-live table, roadmap and disposition row**. Update affected entries; explicitly record why inspected entries remain unchanged. Every new feature file needs a status-index row; `design/README.md` is a navigation index and is exempt. Keep roadmap ordering/dependencies coherent. Update config context only when its summary needs correction, with pointers rather than duplicated design. Never add planned capabilities to root or scoped AGENTS; shipped guidance belongs to the implementation delivering them.

Before moves or cuts, map every old paragraph/block to its retained home, merged canonical statement or explicitly superseded owner decision. Preserve unique numbers, identifiers, exemplars and wording; leave pointers from old homes. Obtain independent fidelity/no-loss and coherence reviews **before** restructuring or cutting config context. Keep accepted content edits separate from structural work.

Remove only the exact inbox material whose interpretation, disposition **and removal** have applicable owner approval, whose canonical/rejection/deferral record is complete, and whose required reviews pass. Before removal, retain the exact owner wording and provenance in a durable disposition or evidence home; a paraphrased design summary is not a verbatim record. Preserve adjacent and unresolved raw text byte-for-byte. Existing coverage alone is not removal approval. Re-running the workflow must reuse existing decisions and disposition rows.

## Verify integrity and assess the batch

Obtain **two independent reviewers**, each with **high reasoning, medium-to-high model**, exact owner text, before/after documents and the integrity record:

- **Fidelity/no-loss:** meaning, verbatim exemplars/stipulations, all raw paragraphs accounted for, no-loss mapping and approval/removal boundaries.
- **Coherence:** system placement, one canonical statement, pillars/rules spine, shipped/planned status, resolving navigation/roadmap/dispositions, budgets and untouched sections.

These are additional to topic research and final assessment. During delivery they may be included in the two task-review briefs if both receive the necessary evidence and remain independent. Verify findings and correct confirmed in-scope issues before the applicable owner checkpoint.

Record pre/post whitespace-delimited word counts: root AGENTS targets about 900 and must not exceed **1,050**; config context stays **below 1,500**. DESIGN_NOTES' roughly **14,000** target is aspirational; preserve its accepted larger baseline. Report existing budget debt without claiming compliance. Use focused indexed feature files for overflow; the engineering split remains deferred until the first milestone is delivered. Do not cut owner exemplars to meet a target.

After a batch, or on request, retain the **three independent final-assessment perspectives**: terminology (Epoch/Era, exemplar versus engine IDs, time vocabulary); roadmap (duplicates, dependencies and delivery sizing); code versus docs (claims checked against actual schemas, consumers and tests). Use the same capability briefs and wave rule. Present verified contradictions and concrete proposed fixes; owner approval precedes new coherence edits. Preserve rejected findings and reasons.

Run `npm run verify` after edits. Keep a concise retained record: raw anchors and approval scope, canonical homes/status, every index/roadmap/disposition check including unchanged entries, no-loss map, budget measurements, reviewer findings/dispositions and verification results. Never claim unavailable evidence passed. Hand the reviewed result back for the applicable owner checkpoint; do not start a proposal or commit automatically.
