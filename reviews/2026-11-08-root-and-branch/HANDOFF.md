# HANDOFF: finishing the 2026-11-08 root-and-branch review

Audience: a fresh agent with no memory of the conversation that produced this review.
Goal: carry out everything that remains of the review, up to and including running `/opsx-propose` for the next roadmap change.
Read this whole file first. Every path below is relative to the repo root, `/Users/alanharrison/Desktop/Code/uplift`.

---

## 0. Ground rules (binding)

- **Owner pillars P1–P5 and every owner decision** are at the top of `reviews/2026-11-08-root-and-branch/register.md`, plus the "Owner decision" lines after each slice. They override everything else. Use the owner's exact wording wherever it exists.
- **Subagents.** Every subagent is briefed as "high reasoning, medium-to-high model". In Claude Code that means `model: sonnet` or stronger and `effort: high`. Never name vendor models such as Composer or Grok in project docs.
- **Review intensity.** The owner prefers constant multi-agent review and does not want fewer gates. Every derived edit or finding gets at least 2 independent reviewers: one for fidelity to the decision, one for coherence. Give the reviewers no access to the reasoning behind the edit.
- **Tone.** Be blunt. Give a recommendation, not a survey.
- **Change ids** (for example `hx-ops-safety`) may appear only in `openspec/`, `DESIGN_NOTES.md` and `design/`. Never put them in AGENTS.md, README.md, `src/`, `tests/` or code comments.
- **AGENTS.md is written only by the change that ships the code it describes.** It must never describe planned behaviour as shipped.
- **Commits.** Use Conventional Commits that end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push unless the owner asks for that specific push; the push of the Phase 1 work does not authorise later pushes.
- Run `npm run verify` after every change. It must pass.
- **The review register (`reviews/`) is gitignored and local only.** The review skill, once written, is tracked.

## 1. State right now

- Branch `review/2026-11-root-and-branch`. The working tree is clean. The branch has 6 docs-only commits on top of `main`:
  - `f5d81bf` C1: frame, `openspec/roadmap.yaml`, `notes/inbox.md`, gitignore and prettierignore for `reviews/`
  - `2f5f18d` C2: rules spine R1–R8, core model, clock record, Leverage Chain, system graph, loop cycles, planned markers
  - `9d236d3` C3: text pipeline (P2), engineering rules, save policy, telemetry as it really is
  - `20b9122` C4: Act/Observation sections, belief and misbelief, notebook, presence, ledger, storyteller deck, vertical slice, readability/input/camera/accessibility/audio, tone blips, crew handoff
  - `dfde17d` C5a: DESIGN_NOTES reorganised by system
  - `99a0780` C5b: distant M6 detail moved to `design/*.md` (six files plus a README); dedupe; the citation rule widened to `design/` in AGENTS.md and `.cursor/rules/no-opsx-change-citations.mdc`; owner decisions recorded (facing follows walk direction; Escape pops one layer)
- DESIGN_NOTES.md is about 16.5k words. `design/` is about 3.5k words.
- **MERGED into `main`** (fast-forward, by owner request) together with the step 2.2 bookkeeping commit `0b3d6b1`, and **PUSHED to `origin/main`** (github.com:adfharrison1/uplift, `b9ce743..0b3d6b1`) at the owner's request. Steps 2.1 and 2.2 are DONE. The `review/2026-11-root-and-branch` branch is local only and can be deleted.

## 2. Remaining work, in order

### 2.1 Owner reviews and merges the Phase 1 branch (DONE)
Done: fast-forward merged and pushed at the owner's request.

### 2.2 Bookkeeping after the merge (DONE in `0b3d6b1`: `docs-spine-and-roadmap` is `status: done-by-review`; `roadmap:next` and the DAG check moved into `process-gates-and-ledger`)
- In `openspec/roadmap.yaml`, the entry `docs-spine-and-roadmap` has been **delivered by the review's Phase 1**, except for two parts: the `roadmap:next` script and the roadmap DAG check. Move both into `process-gates-and-ledger`'s scope. Then mark `docs-spine-and-roadmap` as `status: done-by-review` (add that value to the header's status list) so that `roadmap:next` skips it, or remove it and note this in the header. Pick one and record which.
- In `reviews/2026-11-08-root-and-branch/README.md`, set slice 7 to "Phase 1 merged". In `reviews/README.md`, set the status to "Phase 1 done; Phase 2 in progress".

### 2.3 Open owner decision (ask before `05b-1` is proposed; it does not block M1)
- **Talk-cost unit.** A conversation costs "a fraction of a watch", but the watch clock is an integer. The options are:
  1. **(recommended)** a finer integer unit under the watch ("bells"; bells per watch is pack data; talk costs bells; watch effects fire on boundary crossings);
  2. an integer cost per conversation;
  3. integer watches plus a carried remainder.

  DESIGN_NOTES carries an "(owner decision pending)" marker in the Loop cycles / talk-cost text. When the owner answers, replace the marker and add the decision to the Rules spine R1 note.

### 2.4 Phase 2: OpenSpec changes for milestone M1, in this order
Use the project's own workflow (root AGENTS.md: `/opsx-propose`, the 3-subagent post-propose audit, 2 reviewers per task, 6 reviewers post-change, `/opsx-archive`). Briefs say "high reasoning, medium-to-high model". Each change's scope is in `openspec/roadmap.yaml`, and the fuller plan is `reviews/2026-11-08-root-and-branch/raw/S7-change-plan-v3.json`. Propose **only the next change**; later entries stay as roadmap entries until reached, because proposals go stale (P5).

1. **`hx-ops-safety`. THE NEXT `/opsx-propose`.**
   - Bridge lock: one guarded write-route helper in `src/interfaces/vite/localDiskBridgePlugin.ts`. It needs an exact Origin allow-list (localhost and 127.0.0.1 on the dev port). An absent Origin is OK only with `Sec-Fetch-Site: same-origin` or `none`. It also needs a Host check, `Content-Type: application/json`, a per-run token header (injected via `transformIndexHtml`), a size cap that destroys over-cap streams, allowlisted paths with realpath/lstat containment and no symlinks, and an explicit `server.cors` in `vite.config.ts`. (Vite 8.3.5's default CORS is already localhost-only, so the token is sound, but the Origin check is what blocks the attack.)
   - Logger: the constructor must never truncate. Rotate the previous session into `logs/prev/` and keep the last N.
   - Add a real HTTP middleware test on `127.0.0.1:0`.
   - Parallel `verify`: run format, lint, typecheck and one vitest run concurrently, with buffered output and one PASS/FAIL line per step. Measured 2.4–3.1 s against 5.3–6.7 s serial. Keep `verify:serial`.
   - Its spec deltas include the telemetry spec ("prior session's log files SHALL be replaced" becomes rotation) and the verify-budget spec (`clean-architecture-and-quality-gate/spec.md:35`, "under 5 seconds").
   - It updates the AGENTS.md Quick Verify block (amendment A-54) because it ships that behaviour.
   - Evidence: the CSRF was reproduced twice on loopback-only probes (`reviews/.../raw/S4-C.json`, `S4-ch2.json`).
2. **`docs-spine-and-roadmap`**: done by Phase 1 (see 2.2).
3. **`process-gates-and-ledger`.** Larger. Split it if it breaks the size rule. Its content is batch **B9** of `reviews/.../raw/S7-inventory-v3.json` (A-78, A-80, A-81, A-82, A-83, A-73, A-74, A-64, A-68, A-66, A-72, A-75), plus every item in `reviews/.../raw/S7-apply-punchlist.md`, especially items 1–3, 14–18. It covers:
   - **Root AGENTS.md rewrite to shipped-code only** (~900 words, test ceiling 1050, no change ids).
     - Schema-only registry kinds (rivals, offices, quiet claims, instruments, stocks, discovery, channels, threads, emergencies, orbital) are worded as schema contracts: "the registry accepts X; no content or runtime yet".
     - Remove the claims about locomotionMode, interactionHold, arrival hold, proximity use, conversation paging, `npm run eval:ai`, "every event and AI trace logs", "local ONNX Web Worker", and `setup-models`.
     - Add a **Skills** section signposting `uplift-debug`, `uplift-design-notes`, `uplift-review-gates` and `root-and-branch-review` (when to use each, and its path). The review skill is tracked, so it gets no exemption.
     - Gate briefs move out of AGENTS.md into the gates skill. Replace "Composer 2.5 Fast or Grok 4.7 High Fast" everywhere with "high reasoning, medium-to-high model".
   - **Section docs.** Remove the stale ONNX/free-text/`setup-models` wording from `README.md`, `tests/AGENTS.md`, `src/domain/README.md`, `src/infrastructure/AGENTS.md` and `src/application` / `src/domain` AGENTS.md. Remove "(click-to-waypoint)" in `src/interfaces/README.md` (it is dev tooling). Fix the `uplift-debug` skill telemetry text.
   - **`.agents/skills/uplift-design-notes/SKILL.md`: FULL REWRITE** (owner decision, not the narrow fix). It must keep the doc system intact and ordered (punch list 17 / register):
     - place each decision in the right system section or `design/` file;
     - one canonical statement per concept;
     - update the status index, Where-facts-live, the roadmap.yaml entry and the dispositions row on every edit;
     - status discipline (`(planned: id)` / `(shipped)`); never write AGENTS.md;
     - owner wording verbatim; a no-loss traceability check on any move;
     - two reviewers (fidelity plus coherence);
     - word budgets: overflow goes to a `design/` file;
     - raw dumps land in `notes/inbox.md` and are emptied by dispositioning;
     - check new decisions against the pillars and the rules spine, and flag conflicts to the owner;
     - search before guessing unfamiliar names.

     Test it once on a small real raw note.
   - **New `.agents/skills/uplift-review-gates/SKILL.md`.** The existing gates (3 post-propose, 2 per task, 6 post-change) plus these additions, never removals:
     - G1, an end-to-end feature trace from the real entry point to its consumer;
     - G2, security / trust boundary;
     - G3, hot-path cost;
     - G4, failure containment (G2 and G4 are named axes inside the adversarial reviewers);
     - G5, the defect ledger;
     - G6, scenario-to-test traceability.

     Size rule: 1 task is 1 green commit touching at most 3 source files plus tests, with docs inside the feature task. A change over 8 tasks or 3 layers must justify itself or split.
   - **Spec rules in `openspec/config.yaml` rules.** A requirement whose purpose is persistence, logging or a pipeline needs a scenario that ends at an observable consumer, and its design.md lists the call sites. Every review finding that contradicts an archived SHALL needs a MODIFIED delta.
   - **Defect ledger** `openspec/defect-ledger.yaml` (tracked).
     - Seed it with every open code defect from this review that has a slotted fixing change, all severities. Each entry has an id, source, severity and fixing change id.
     - An archive wrapper script deletes the entries for the change being archived.
     - The docs-truth test fails if an entry names an archived or non-existent change.
   - **Config context** cut to under 1.5k words (A-72). Produce and pass a no-loss diff table first (punch list 14). Versions live only in package.json; drop the CVE ids (A-73, A-74).
   - **Docs-truth test** `tests/architecture/docs_truth.test.ts` (A-75). It checks that:
     - backticked identifiers and npm scripts in root AGENTS.md resolve (section AGENTS are added later in `pre-05b-pack-source-of-truth`);
     - README/.nvmrc versions match package.json;
     - change ids appear only in `openspec/`, DESIGN_NOTES and `design/`;
     - `planned:` ids resolve in roadmap.yaml;
     - every `design/` file has a status-index row;
     - word budgets hold;
     - roadmap.yaml is a valid DAG;
     - ledger entries are valid;
     - every skill path in AGENTS.md exists.
   - The **`roadmap:next` script** in package.json, which prints the first planned entry whose dependencies are all archived.
4. **Then `hx-1-legacy-clamp-seed-scramble`, `hx-slice-store`, `hx-save-integrity`, `hx-reducer-and-frame-safety`, `hx-fixed-step-tick`, `hx-determinism-harness` and `hx-kinematics`**, each proposed only when reached. Their scopes are in roadmap.yaml. Evidence and repro scripts for every defect are in `reviews/.../raw/S3-*.json`, `S4-*.json` and `S5-*.json`. Each carries its spec deltas (for example `deterministic-simulation-primitives/spec.md:28`, "return a clone").

After M1, milestones M2–M6 follow `openspec/roadmap.yaml` in order. `slices/07-synthesis.md` explains each milestone's outcome. M5 (the vertical slice) is the owner's go/no-go point.

### 2.5 Phase 3: write the tracked review skill (can run in parallel with 2.4 after 2.2)
- Create `.agents/skills/root-and-branch-review/SKILL.md`, plus a symlink `.claude/skills/root-and-branch-review` pointing to `../../.agents/skills/root-and-branch-review` so Claude Code can run `/root-and-branch-review`. Both are tracked. Check that `tests/architecture` doesn't object to `.claude/`; it bans only `.cursor/skills`.
- Sources:
  - `reviews/2026-11-08-root-and-branch/framework.md`
  - `briefs/common.md`, `briefs/slice-briefs.md`, `briefs/phase1-*.md`
  - `process-notes.md`, which holds every lesson
  - `register.md` (pillars and the decision format)
  - `reviews/tools/quotecheck.py`; copy it into the skill folder as a tracked tool
- The skill must encode:
  - step 0, which checks which accepted findings from the previous review were delivered and whether the pillars changed;
  - slices 0–7 with the scout/challenger roles;
  - blind falsifiers, quote-checking and Opus verification;
  - the rule/vocabulary/placeholder/code tags;
  - the de-weighted topics;
  - owner checkpoints with blunt digests;
  - the revise, 4-auditor re-audit, written rulings, revise again, 2-auditor final gate, then a binding punch list;
  - Phase 1 by commit group (applier, verify, fidelity and coherence reviewers, fixer, commit), then the restructure with no-loss traceability;
  - the doc-system integrity procedure (punch list 17);
  - "high reasoning, medium-to-high model";
  - the register under `reviews/<date>-<name>/` (gitignored).
- Review it with 2 subagents (fidelity to the process as actually run; usability for a cold agent). Commit, then signpost it in AGENTS.md. If process-gates-and-ledger has already landed, add the line in that change or a tiny follow-up.

### 2.6 Then: the normal workflow (THE HANDOFF POINT)
Next actions, in order:
1. Ask the owner the talk-cost decision (2.3). It is not blocking.
2. Run `/opsx-propose hx-ops-safety` with the scope in 2.4 item 1, under the full gate process.
3. After it archives, run `process-gates-and-ledger` (2.4 item 3), and write the review skill (2.5) alongside it.

## 3. Where everything is

- `reviews/2026-11-08-root-and-branch/register.md`: every finding with its status, the pillars and owner decisions. **Source of truth.**
- `slices/00-…07-synthesis.md`: the adjudicated digests. `07-synthesis.md` holds the final action plan and milestones.
- `raw/S7-change-plan-v3.json`: 64 changes and the parked items. Mirrored in `openspec/roadmap.yaml`.
- `raw/S7-inventory-v3.json`, `raw/S7-apply-punchlist.md` and `raw/S7-opus-rulings.md`: the B9 amendments still to apply, plus binding rules.
- `raw/S*-*.json`: scout and challenger evidence, with repro descriptions.
- `briefs/`, `framework.md`, `process-notes.md`: the review method, used for Phase 3.
- Memory, which Claude Code loads automatically: `~/.claude/projects/-Users-alanharrison-Desktop-Code-uplift/memory/root-and-branch-review.md`.

## 4. Known non-blocking leftovers (track them; do not lose them)

- `DESIGN_NOTES.md` is about 16.5k words. A further ~1.3k could come off by moving the Engineering rules to their own doc. The owner deferred that **until M1 ships**.
- GPU profile, never run. The Chrome DevTools scenario is in `reviews/.../raw/S5-A.json` (`could_not_verify`). Run it with the owner when convenient.
- Parked items, recorded in roadmap.yaml: onboarding, the Epoch 1 definition of done, the past-advisor cameo, ironman mode, the classifier spike, and others.
