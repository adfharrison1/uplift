# defect-ledger Specification

## Purpose
Maintain all accepted code defects through deterministic, evidence-backed status transitions and preserve resolution history when completed work leaves the active ledger.

## Requirements

### Requirement: Active defects have explicit identity and ownership

The tracked ledger SHALL include every open code defect from the accepted review, across all severities, with a stable ID, self-contained summary, source, severity, status, revision and history. Nonparked entries SHALL name an existing undelivered roadmap owner. Parked entries SHALL retain a reason and revisit condition. Split findings SHALL preserve parent provenance.

#### Scenario: Mixed delivered and outstanding finding

- **WHEN** a review finding contains both an archived fix and outstanding work
- **THEN** seeding SHALL record the outstanding portion with its fixing owner and retain evidence identifying the delivered portion without falsely resolving the whole finding

#### Scenario: Invalid identity or owner

- **WHEN** an entry duplicates an ID, uses an unknown status or names an absent, archived or done-by-review owner
- **THEN** validation SHALL fail and identify the entry; parked entries with a null owner SHALL be accepted only with a reason and revisit condition

### Requirement: Status mutations follow a checked lifecycle

Supported active statuses SHALL be open, in_progress, blocked, verified and parked. Commands SHALL enforce the permitted transitions below, expected revisions, reasons and required evidence. Illegal, stale or malformed requests SHALL leave files unchanged. Severity, ownership and workflow status SHALL remain distinct fields.

#### Scenario: Verification needs evidence

- **WHEN** an in_progress defect is marked verified
- **THEN** the command SHALL require a fix reference and successful test and independent-review evidence, append a transition event and increment its revision

#### Scenario: Blocking and reopening

- **WHEN** progress is blocked or verification is invalidated
- **THEN** a legal transition SHALL retain the blocking or reopening reason and prior history; resuming work SHALL not reuse invalidated verification as current evidence

#### Scenario: Conflicting writers

- **WHEN** two updates target the same revision or another supported writer holds the project lock
- **THEN** at most one SHALL succeed and the other SHALL fail without silently overwriting the first

### Requirement: Defect commands are deterministic and maintainable

The defect command SHALL support adding findings, listing active and resolved records, transitions, evidence or owner updates, explicit reopening and reconciliation. Identical state and arguments SHALL produce stable ordering and output without clock-derived history. Read-only commands SHALL never modify files. Errors SHALL return nonzero with actionable diagnostics.

#### Scenario: Evidence or owner changes

- **WHEN** an authorized update changes evidence or fixing ownership
- **THEN** it SHALL record the reason and revision, revalidate the destination owner and invalidate verified status when the verified fix or owner changes

#### Scenario: Resolved defect recurs

- **WHEN** an archived defect recurs
- **THEN** reopening SHALL create a new active ID linked to the immutable resolution receipt, preserving the original archived record

### Requirement: Archive resolves only verified owned defects

Archive SHALL refuse unverified defects owned by its change. It SHALL preserve their full history and resolution evidence in an archive receipt, then remove matching entries from the active ledger only after successful validated archive. Other owners' entries SHALL remain unchanged. Resolved SHALL be a terminal receipt status, never an active-ledger status.

#### Scenario: Successful archive reaches the listing consumer

- **WHEN** a change with verified defects is successfully archived
- **THEN** its matching defects SHALL disappear from the active list, appear as resolved in the combined list with evidence intact, and leave the roadmap reflecting the actual archive

#### Scenario: An unfinished defect remains

- **WHEN** archive finds an open, in_progress, blocked or parked defect still assigned to that change
- **THEN** it SHALL refuse before archiving and require explicit resolution or justified reassignment rather than silently deleting the finding

### Requirement: Archive failures and bypasses remain recoverable

Archive SHALL preserve recoverable intent across its multi-file operation. Reconciliation SHALL detect ledger, receipt and roadmap drift. Read-only checks SHALL report discrepancies without guessing a repair; explicit repair SHALL finalize only proven matching archive receipts and SHALL be idempotent. Evidence conflicts SHALL require an explicit operator decision.

#### Scenario: Failure before archive succeeds

- **WHEN** validation or the underlying archive command fails without completing the archive
- **THEN** no defect SHALL be removed or reported resolved and retry SHALL preserve evidence

#### Scenario: Failure after archive succeeds

- **WHEN** archive moves the change but ledger or roadmap finalization fails
- **THEN** the command SHALL exit nonzero with a recovery instruction, reconciliation SHALL detect pending finalization, and explicit retry SHALL finish without rearchiving or double-appending history

#### Scenario: Bypass or conflicting edits

- **WHEN** a change was archived outside the wrapper or an active record differs from its prepared receipt
- **THEN** reconciliation SHALL fail with the mismatching IDs and SHALL not remove or overwrite the records without matching evidence

### Requirement: Tooling writes remain local and bounded

Mutating commands SHALL reject unsafe IDs, paths outside the repository and symlink write targets, use argument arrays for subprocesses and serialize supported writers. Invalid inputs and write failures SHALL produce nonzero results without truncating existing records. Commands SHALL require no network, WebGL or model inference.

#### Scenario: Unsafe archive argument or ledger path

- **WHEN** an archive argument traverses directories or a write target is a symlink
- **THEN** the command SHALL refuse before invoking archive or modifying any repository file

### Requirement: Evidence remains usable after archive

Verification evidence SHALL use stable locators that resolve before and after archive and SHALL retain content integrity. A moved change SHALL not leave dangling test/review references. The archive wrapper SHALL verify that the CLI selected the intended local planning root before writing any transaction state.

#### Scenario: Change-local evidence moves with archive

- **WHEN** verification and review files move from an active change into its archive
- **THEN** the resolved listing, reconciliation and subsequent reopening SHALL resolve the same evidence and content digests without rewriting historical events

#### Scenario: CLI resolves an external store

- **WHEN** OpenSpec context or status identifies a planning home outside the intended local repository
- **THEN** the wrapper SHALL refuse before preparing a receipt or journal or invoking archive, without writing either repository

#### Scenario: Prepared archive is canceled or resumed

- **WHEN** archive failed before moving the active change and its recorded preimages are intact
- **THEN** an explicit cancel SHALL remove only generated transaction state and unblock subsequent mutations, or explicit resume SHALL continue the existing transaction after revalidation
- **AND** conflicts SHALL prevent cancel/resume and cancellation SHALL be forbidden after the archive move

### Requirement: Permitted transitions are a durable contract

Status changes SHALL accept only the edges defined here. Destination prerequisites SHALL be supplied atomically; obsolete blocker or revisit fields SHALL be cleared from current state but retained in history. Every history SHALL replay to the current record, including status, ownership, evidence and revision.

#### Scenario: Valid active transition edges

- **WHEN** a status transition is requested with the expected revision and a nonempty reason
- **THEN** only these destination sets SHALL be allowed, with all destination prerequisites satisfied:

| From        | Permitted destinations          |
| ----------- | ------------------------------- |
| open        | in_progress, blocked, parked    |
| in_progress | open, blocked, verified, parked |
| blocked     | open, in_progress, parked       |
| verified    | open, in_progress, blocked      |
| parked      | open                            |

- **AND** blocked SHALL require a blocker, parked SHALL require a revisit condition, nonparked states SHALL require a live fixing owner, and verified SHALL require fix/test/review evidence
- **AND** only successful archive finalization SHALL move verified to resolved; no active command SHALL mutate a resolved record

#### Scenario: Hand-edited state contradicts history

- **WHEN** current status, ownership, evidence or revision differs from replaying the recorded events
- **THEN** validation SHALL fail rather than trust the edited summary fields

#### Scenario: Pending finalization remains visible

- **WHEN** an interrupted archive has removed an active row but has not completed all finalization steps
- **THEN** combined listing SHALL report pending finalization and the affected IDs rather than omit those defects or claim they are resolved

### Requirement: Resolution receipts cannot silently disappear

The initial ledger SHALL record a finite explicit legacy-archive exemption set. Every nonlegacy archive SHALL retain a resolution receipt and a roadmap reference to it, even if it resolved no defects. Supported mutation commands SHALL NOT extend legacy exemptions. Reconciliation SHALL detect missing receipts after active entries have been removed.

#### Scenario: Receipt deleted after successful cleanup

- **WHEN** a nonlegacy archive's resolution receipt is missing after its active entries were removed
- **THEN** reconciliation SHALL fail with the archive identity rather than treat the missing receipt as a legacy archive
