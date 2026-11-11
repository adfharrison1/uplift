## Purpose

Keep delivery and periodic reviews reproducible, evidence-backed and faithful to the owner's decisions without weakening existing review gates.

## ADDED Requirements

### Requirement: Delivery review gates preserve independent scrutiny

The workflow SHALL require three proposal auditors, two independent reviewers per implementation task and six delivery reviewers before archive. Briefs SHALL specify high reasoning, medium-to-high model. Verified findings SHALL be addressed before the corresponding approval checkpoint.

#### Scenario: Proposal and task reviews

- **WHEN** a proposal or implementation task is ready for approval
- **THEN** the workflow SHALL obtain its required independent reviews, verify findings against evidence, record their dispositions and run the applicable validation before requesting approval

#### Scenario: Final delivery review

- **WHEN** all tasks are delivered
- **THEN** adversarial, architecture, performance, testing, simulation-logic and design-coherence reviewers SHALL review the delivered change before archive, with bounded concurrency if the harness has fewer than six slots

### Requirement: Review axes include consumers and maintained defects

Reviews SHALL cover end-to-end consumer traces, trust boundaries, hot-path cost, failure containment, defect reconciliation and scenario-to-test evidence in addition to existing axes. Persistence, logging and pipeline requirements SHALL end at an observable consumer; findings contradicting archived SHALL requirements SHALL require a MODIFIED delta.

#### Scenario: A pipeline stops before its consumer

- **WHEN** tests cover a producer but no evidence establishes the intended consumer outcome
- **THEN** the reviewer SHALL report the gap and the delivery record SHALL not represent that scenario as verified

#### Scenario: A verified defect remains owned by the delivered change

- **WHEN** a task or closing review changes a defect's disposition
- **THEN** the workflow SHALL update it through the checked ledger command and run reconciliation before approval

### Requirement: Atomic delivery uses the project checkout

The workflow SHALL use the default worktree unless the owner requests isolation. Each task SHALL produce one green reviewable commit touching at most three source or tooling files plus tests, with related documentation included. Changes over eight tasks or three runtime layers SHALL justify their scope or split; one closing review task SHALL record unplanned fixes.

#### Scenario: Existing unrelated edits

- **WHEN** implementation starts with unrelated working-tree changes
- **THEN** it SHALL preserve them, scope staging to the task and retain the per-task approval checkpoint without creating an isolated worktree

### Requirement: Periodic reviews retain the adjudication process

The periodic review skill SHALL preserve baseline inspection, slices 0–7, independent scouts, blind challenges of findings and recommendations, quote verification, owner checkpoints, written rulings and rejected decisions. It SHALL retain content batches followed by a separate no-loss restructure, and SHALL propose only the next roadmap change.

#### Scenario: Prior review and repeated challenges

- **WHEN** a periodic review begins
- **THEN** it SHALL reconcile prior accepted findings and owner pillars, use two or three independent scouts per slice, and obtain at least two blind reviews of each finding and recommendation plus a third for critical or roadmap-changing items

#### Scenario: Synthesis approval

- **WHEN** the review reaches synthesis
- **THEN** it SHALL follow revise, four-auditor re-audit, written rulings, revise, two-auditor final gate and binding punch list before applying approved batches

### Requirement: Quote verification is portable and fails closed

The quote checker SHALL validate complete source quotations against explicit repository-relative paths and line ranges, return nonzero for malformed or mismatched evidence and reject paths outside the selected repository. Command evidence SHALL be reported as requiring human verification and SHALL never be executed.

#### Scenario: Matching prefix with false remaining lines

- **WHEN** only the first line of a multiline quotation matches
- **THEN** validation SHALL fail and identify the mismatched evidence

#### Scenario: Relocated checkout and unsafe evidence

- **WHEN** the checker runs in a relocated checkout with missing files, invalid ranges or escaping paths
- **THEN** it SHALL use the selected root without hardcoded home paths and reject invalid evidence without executing embedded commands
