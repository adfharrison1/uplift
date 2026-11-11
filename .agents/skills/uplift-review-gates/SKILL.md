---
name: uplift-review-gates
description: Use when proposing, implementing, reviewing or preparing to archive Uplift work, or when delivery findings and document edits need adjudication before owner approval.
---

# Uplift delivery review gates

Apply this contract alongside the selected OpenSpec workflow. Preserve its planning boundary, CLI-controlled states, and owner approval before each task commit. Use the default checkout; inspect `git status --short` and preserve unrelated edits. Do not isolate work without the owner's request.

Read [delivery procedure](references/delivery.md) for the current checkpoint. When editing docs, also execute [document integrity](references/document-integrity.md). Periodic whole-project reviews use [root-and-branch-review](../root-and-branch-review/SKILL.md).

## Delivery contract

One task produces one green, reviewable commit touching at most **three source or tooling files plus tests**, with related documentation in the same task. More than **eight tasks or three runtime layers** requires an explicit scope justification or a split. Include one closing review task to record unplanned fixes. A verified review finding that needs an unplanned fix becomes a recorded task; do not silently expand scope or discard it.

Every brief specifies **high reasoning, medium-to-high model**, an owned scope, evidence to inspect and a distinct lens. Use available models meeting that capability; no vendor-specific model is required. Independent reviewers do not see each other's conclusions before submitting. Limited slots mean waves, never fewer reviews.

| Checkpoint              | Independent review count | Completion evidence                                                                                              |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Proposal                | 3 auditors               | Verified dispositions, strict OpenSpec validation, then owner review; implementation waits for the apply request |
| Each task               | 2 reviewers              | Task Verify command, `npm run verify`, verified dispositions and scoped diff; owner approves before commit       |
| Delivery before archive | 6 reviewers              | All six dimensions, reconciled findings, scenario coverage and final verification before archive approval        |

## G1–G6 evidence record

Record each gate as verified, not applicable with reason, or unverified with the missing evidence. These axes augment the review counts; they are not six replacement reviewers.

| Gate                     | Required record                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Consumer trace        | Actual entry point → producer → call sites → consumer → observable result. Persistence, logging and pipeline scenarios end at that consumer. Producer-only tests leave the scenario unverified. |
| G2 Trust boundary        | Untrusted inputs, authority, validation, confinement and rejected-input outcomes. Named adversarial axis.                                                                                       |
| G3 Hot-path cost         | Frequency, scale, allocations, algorithmic cost and measured limits on the target hardware. Named performance axis.                                                                             |
| G4 Failure containment   | Failure injection, preserved state, recovery, continued operation and visible errors. Named adversarial axis.                                                                                   |
| G5 Defect reconciliation | Every finding's disposition, fixing owner and retained fix/test/independent-review evidence; reconciliation result.                                                                             |
| G6 Scenario traceability | Every spec scenario → named test or explicit manual evidence → actual result. Unsupported or unrun evidence stays unverified.                                                                   |

Check findings against source before fixing or rejecting them. A finding contradicting an archived SHALL requires a **MODIFIED** delta. Fix verified in-scope issues and rerun affected checks before the corresponding approval checkpoint. Retain disagreements, rejection reasons and deferred ownership.

**Bootstrap:** Until checked ledger commands ship, use the selected proposal's `finding-inventory.md` as the explicit G5 record. Follow the bootstrap fields and migration procedure in [delivery procedure](references/delivery.md); do not run nonexistent commands or claim reconciliation passed. This temporary record is a gate, not a waiver.
