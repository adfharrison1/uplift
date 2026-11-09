# Slice 6: Process and docs, plus the change plan and amendment inventory

## How this slice was run

- **Scouts.** Three ran:
  - A, documentation architecture: 8 findings.
  - B, OpenSpec and roadmap hygiene: 6 findings, plus a 29-item `change_plan`.
  - C, amendment inventory: 66 amendments, 40 deletions, 6 coverage gaps.
- **Quote checks.** Every quote in A and B was checked, along with all 106 quoted passages in C. Opus confirmed the drift root cause (uplift-design-notes SKILL.md:60) and the specs that encode defects as requirements.
- **Challengers.** Four blind challengers reviewed the output:
  - ch1 falsified the 14 findings: 4 hold, 4 overstated, 2 wrong on counts, and 4 unsure (meta-claims about the register).
  - ch2, a process lead, judged the recommendations under the owner's rule that review must never be reduced, and wrote the final doc shape.
  - ch3 audited the change plan: 17 orphans, 11 items of unaccepted scope, 15 order issues, 7 items to split, 13 missing changes.
  - ch4 audited the inventory: 19 fidelity issues, 19 missing amendments, about 30 deletions to correct, and 12 conflicts with the plan.
- **Erratum.** S0B-42 was wrong. 05c *is* tagged `[archived]` in config.yaml (line 128); the slice-0 scout missed it.

## Headline

**The doc drift has a mechanical cause, and the specs certify the defects.**

1. **Drift cause.** The design-notes skill tells agents to "add a registry bullet" to root AGENTS.md for every new system (SKILL.md:60). As a result, every *planned* system gets written in the present tense into the file agents treat as ground truth. The only doc check tests file existence and that a section is longer than 50 characters.
2. **Specs certify defects.** Archived specs test the call, not the outcome. The lab save "uses the disk route", but nothing loads the files it writes. Several specs encode defects as SHALL requirements:
   - "return a clone" (`deterministic-simulation-primitives/spec.md:28`)
   - "prior session's ... log files SHALL be replaced" (`session-telemetry-and-compaction/spec.md:31`)
   - "verify ... in under 5 seconds" (`clean-architecture-and-quality-gate/spec.md:35`)

   The hardening changes must therefore be spec-delta changes.
3. **Facts are duplicated and diverging.** Pinned versions live in 4 places, and the HF pin isn't even installed. The 7-epoch ladder is in 4 files and the verify budget text in 6. The config context runs to about 5.1k words and is injected into every OpenSpec operation.
4. **The roadmap can't answer the basic questions.** 9 of 20 planned entries state no dependency, and the order is non-monotonic, so an agent cannot reliably answer "what's next?" or "what does X depend on?".
5. **Gates and the defects that got past them.** This is reported with numbers only, per the owner's constraint. About 32 later defects trace to delivered changes. None of the six review axes names the classes that slipped through: the feature does nothing end to end, a trust boundary or security hole, hot-path cost, and failure containment.

## Final doc shape (ch2, endorsed by Opus; fewest new files)

- **AGENTS.md**: shipped code only, about 900 words, linking onward. The section AGENTS/README pairs stay.
- **The top of DESIGN_NOTES.md** holds:
  - pillars P1–P5;
  - a "Where facts live" owner table;
  - an index table giving each section's status (shipped / partial / planned) and roadmap id;
  - the numbered **Rules spine** (R1…, each with a status, all revisable under P5);
  - a dispositions appendix for raw notes (one-line rows only).
- **New files:**
  - `notes/inbox.md` for raw dumps, emptied by the design-notes skill;
  - `openspec/roadmap.yaml`: an ordered array with `depends_on` and `specs_modified`. Status is planned, parked or proposed; archived and active are *derived* from the folders. A `roadmap:next` script reads it.
  - `.agents/skills/uplift-review-gates/SKILL.md`, holding the gate briefs, which move out of AGENTS.md and config.
  - a defect ledger. Its location is an owner question.
- **config.yaml context**: under 1.5k words (invariants, proposal rules, pointers). Versions live only in package.json, the CVE ids are dropped, and `npm audit` is a manual step.
- **One docs-truth test in tests/architecture** checks:
  - backticked identifiers and npm scripts in the AGENTS files resolve;
  - README versions match package.json and .nvmrc;
  - change ids appear only in `openspec/` and DESIGN_NOTES;
  - DESIGN_NOTES status markers resolve to the roadmap;
  - word budgets are respected;
  - the roadmap DAG is valid.
- **Not adopted:** no docs/spine.md, no ADR folder (the change's design.md already holds the rationale), no START.md.

## Gate additions (never removals)

- **G1, end-to-end feature trace.** Run the real entry point and name the producer and consumer call sites.
- **G2, security / trust-boundary axis**, and **G4, failure-containment axis**, both added as named axes inside the existing adversarial reviewers.
- **G3, hot-path cost axis**, inside the performance reviewer.
- **G5, defect ledger.**
- **G6, scenario-to-test traceability check.**

Spec rule: a requirement whose purpose is persistence, logging or a pipeline MUST have a scenario that runs from the user-visible trigger to an observable consumer, and its design.md lists the call sites. Every register finding that contradicts an archived requirement needs a MODIFIED delta.

**Task-size rule.** One task is one green, reviewable commit touching at most 3 source files plus tests. The docs update rides inside the feature task. There is one closing review task, and unplanned fixes are recorded as tasks. Instead of a hard 4–6 count, a change over 8 tasks or 3 layers must justify itself or split, checked by audit Subagent B.

## Findings (final)

| ID | Sev | Finding | Challenge notes |
|---|---|---|---|
| S6A-01 | major | The design-notes skill writes planned systems into AGENTS.md; this is the drift generator. | Overstated in wording; confirmed at SKILL.md:60. Fix: decisions go into DESIGN_NOTES with a status line plus a roadmap entry. AGENTS.md is written only by the change that ships the code. |
| S6A-02 | major | Versions are stated in 4 places and have diverged (the HF pin is not installed; TS 6.0.3 vs 6.0.2). | Holds. |
| S6A-03 | minor | CVE ids and dates can't be verified offline but are injected everywhere. | Holds. Drop them; `npm audit` is a manual step. |
| S6A-04 | major | The 8 Nov raw dump is half-integrated, with no inbox. Camera capture and the zoom item appeared only there. | Holds. Add `notes/inbox.md` plus the dispositions appendix. |
| S6A-05 | major | Engine facts are duplicated with no owner. | Counts were wrong (ladder in 4 files, verify text in 6), but the substance holds. Fix: owner table, plus the docs-truth test asserts numbers against code constants. |
| S6A-06 | minor | The config context is oversized and its roadmap tags were stale. | Wrong in part: 05c is tagged; the context is about 5.1k words. Shrink it anyway. |
| S6A-07 | major | The only doc check is existence and length. | Holds. One docs-truth test. |
| S6A-08 | major | Review outputs have no home. | Fixed by the ch2 shape: the rules spine goes in DESIGN_NOTES, with no extra layers. |
| S6B-01 | major | Specs test the call, not the outcome. | Overstated in breadth. Fix: consumer scenarios for persistence, logging and pipeline requirements. |
| S6B-02 | major | Specs encode defects as requirements. | Confirmed by Opus. Hardening changes carry spec deltas. |
| S6B-03 | major | The gates miss four defect classes; about 32 later defects. | Numeric, framed as additions. G1–G6. |
| S6B-04 | major | The roadmap is unreliable as a dependency source. | Holds. Fix: `roadmap.yaml` plus `roadmap:next`. |
| S6B-05 | minor | The 4–6 count squeezes feature tasks; docs lag behind code. | Overstated. Use the size rule described above. |
| S6B-06 | major | About 30 implied changes have no owner. | Change plan drafted; it needs the corrections below. |

## Change plan and amendment inventory: corrections required (slice 7 work)

**Change plan (ch3):**
- Fix silent reorders: 07 and the text skeleton go before the vertical slice; 05b-2 goes after 06/06a.
- 07e waits for 07d and 08'.
- ConversationHistory belongs to 07.
- Telemetry wiring needs a slot.
- 17 orphans need owners. Among them: inference trails, the notebook presenter and save policy, the camera directive stack, the passage edits, the scars-stamp-watch / `sourceScarId` checks, and the command-log replay tool.
- Add the missing changes: the AGENTS.md truth rewrite, the design-notes skill fix, and a roadmap sync.
- Split the over-wide items: cm-observation, cm-threads, hx-3/4/5, the 05d amendment, lab-json.
- Do not pull the emergency fuse (S2-19, "later") forward.

**Inventory (ch4):**
- Restore the owner's exact wording ("interact with in some way… in some way… at some point").
- Cut the over-specified advisor cameo and the full Epoch 1 contract. R8 is still open.
- Tone blips are deferred to 07.
- No change ids in AGENTS.md.
- Turn about a dozen deletions into "(planned)" marks or rewrites (05d/05e/07/05f lines, eval:ai, telemetry, pacing-profiles route). Keep the local generation worker (it is still planned under P2), and add `config.yaml` line 56 (the orphaned lexical stage 1).
- Add the 19 missing amendments: interpolation seam, legacy clamp, stimulus dedupe, test builders and layer blind spots, belief-conditioned utility, the R3C1 command-log ruling, and others.
- Add the roadmap.yaml, gate and size-rule amendments once the owner accepts S6B.

Both artefacts are revised and re-audited in slice 7 before any doc is touched.

## Keep

- The small per-section AGENTS/README pairs.
- The change-citation rule (prose plus an alwaysApply rule; no violations found).
- The pins that do match package.json.
- The 1 task = 1 green commit discipline.
