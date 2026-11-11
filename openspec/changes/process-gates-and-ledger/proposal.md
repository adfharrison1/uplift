# Proposal

## Why

The review found that project guidance presents planned systems as shipped, duplicates facts and versions, and can recreate that drift through the design-notes skill. The security/verification foundation is now archived; the next step is an enforceable documentation and review workflow with an explicit, auditable defect lifecycle.

## What Changes

- Preserve all existing three-agent proposal, two-agent task and six-agent delivery reviews in a dedicated `uplift-review-gates` skill. Add consumer traces, trust-boundary and failure-containment checks, hot-path cost, defect reconciliation and scenario-to-test mapping. Use the owner's model-agnostic reviewer brief and task-size rule.
- Create the tracked `root-and-branch-review` skill and portable quote checker, with the Claude skill symlink, from the actual review process. Include it here so root guidance never points at a missing skill.
- Fully rewrite `uplift-design-notes` around the current document structure, approval checkpoints, verbatim owner wording, one canonical home per concept and dispositioned inbox handling. Correct the debug skill's telemetry and compaction claims.
- Rewrite root and affected section guidance to distinguish working code, schema/reducer contracts and future gameplay. Preserve the default-worktree policy. Replace duplicated version/security attestations with manifest pointers. Cut config context only after an independently reviewed no-loss mapping, keeping it below 1,500 words and root AGENTS at most 1,050 words.
- Add a validated roadmap graph and deterministic `roadmap:next`, using real archive directories and the explicit `done-by-review` exception rather than trusting a stale status label.
- Add a tracked defect ledger with explicit `open`, `in_progress`, `blocked`, `verified` and `parked` states, legal transitions, revision checks, reasons and evidence. Expose deterministic add/list/transition/update/reopen/reconcile commands. Retain resolution history in archive receipts, while removing resolved entries from the active ledger after successful archive. This incorporates the owner's request during proposal drafting for deterministic status maintenance.
- Add an archive wrapper that updates the active ledger and roadmap, detects incomplete finalization and supports safe retry. Archive guidance uses that wrapper; reconciliation and architecture tests detect bypass or drift.
- Land the docs-truth checks last: symbol/script/skill links, version sources, change citations, planned IDs, design-file index coverage, budgets, graph and defect-state consistency. Preserve existing architecture assertions and fix the already reproduced nested-Git fixture environment leak while extending tooling verification.

## Capabilities

### New Capabilities

- `review-process`: mandatory delivery reviews, the periodic root-and-branch workflow, verified evidence and portable quote checks.
- `design-note-workflow`: approved, lossless integration of raw notes into canonical living documents.
- `roadmap-graph`: validated roadmap references, archive-derived state and deterministic next-work selection.
- `defect-ledger`: evidence-backed defect transitions, reconciliation, archive resolution receipts and failure recovery.

### Modified Capabilities

- `clean-architecture-and-quality-gate`: truthful hierarchical guidance, additional documentation/state assertions and isolated Git hook fixtures, retaining all existing checks.

## Impact

Repository tooling, project skills, tests and guidance only. New scripts stay in `scripts/`; no domain, application or renderer behavior changes, registry additions, simulation randomness or frame-loop work. Runtime and tests require zero external API keys or cloud inference. Reuse the installed YAML parser and existing Node/TypeScript toolchain; no dependency upgrades or additions. Python 3 is needed only for the portable quote-check tool and its targeted validation.

Dependencies: archived `hx-ops-safety` and the `done-by-review` delivery of `docs-spine-and-roadmap`. The handoff's Phase 3 review skill is folded into this proposal as a prerequisite of the root skill index, not a second independent feature proposal. Six verified tasks are planned; extensive documentation reconciliation rides with the workflow it describes.

## Non-goals

No gameplay hardening, browser telemetry wiring, JSON pack loader, new AI/model runtime, talk-cost decision, roadmap reordering or distant feature proposal. No reduction in review intensity. Do not invent a shipped epoch-count constant to satisfy a documentation test. Do not remove committed review evidence, rewrite historical reports, automatically push, or claim static checks can establish the truth of every sentence.

## Decisions for review

The handoff calls review registers local and ignored, but later commit `f56b967` explicitly tracks 137 review files. Preserve that history. This draft follows the later tracked-history precedent for future reviews; the owner has been asked to confirm that policy. The citation checker distinguishes immutable historical review evidence from current guidance, while enforcing the existing restriction in source, tests and live guides. This exception must be explicit in the proposed guidance rather than hidden in the checker.

The active-ledger removal rule remains intact. `verified` means a fix has review/test evidence but is not archived; `resolved` is the archived receipt's terminal state, visible in the combined defect listing. This preserves audit history without leaving completed findings in the active ledger.
