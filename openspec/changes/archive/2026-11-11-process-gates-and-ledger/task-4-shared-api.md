# Task 4 shared status API

Import `scripts/project-status.mjs` as an ES module. The CLI entrypoint runs only when the file is executed directly. No archive CLI is invoked here; task 5 owns OpenSpec context/status/strict-validation/review preflight, root identity rechecks and the actual noninteractive archive command. Use argument arrays, never a shell.

## Pure validation and selection

- `parseYaml(bytes, label)` rejects duplicate keys and aliases; all schemas reject unknown fields.
- `validateGraph(roadmap, inventory, checkReference?)` checks all rows/references/milestones and a dependency DAG. `inventory` is `{active: [changeId], archives: [datePrefixedDirectoryName]}`. The optional reference callback validates actual retained delivery evidence; default validation checks shape/presence only. `archiveIdentity(name)` removes exactly one valid calendar-date prefix.
- `selectNext(roadmap, inventory)` validates and returns `{state, active, next, blocked}`; active IDs sort lexically, planned selection retains declared order.
- `validateEntry(entry, {resolved?, checkEvidence?})` checks every before/after event plus immutable identity, current-state replay and contiguous revision.
- `validateLedger(ledger, roadmap, inventory, {checkEvidence?, allowArchivedOwners?})` adds owner, identity, ledger-revision and finite legacy-inventory checks. The archive-owner override is for proving pending snapshots, never ordinary mutation input.
- `transitionEntry(entry, request)` and `updateEntry(entry, patch, expectedRevision, reason)` return new records; they do not write or modify their arguments. Contextual owner/evidence checks belong to `validateLedger` before persistence.
- `validateReceipt(receipt, checkEvidence?)` verifies exact snapshot/target derivation, preimage fingerprints, verified owned records and terminal resolution history.
- `reconcileProject(project, receipts, journal)` returns `{ok, diagnostics, pending, resolved}`. Supply `{ledger, roadmap, inventory}` and receipt items `{path, bytes, receipt}`. Pure reconciliation checks receipt/roadmap/archive identity, missing receipts, recurrence links and pending finalization. Use graph/ledger validation as well; reconciliation alone does not replace those schema checks. `canonical(value)` and `digest(bytes)` produce deterministic canonical serialization and SHA-256.

## Repository adapters

`readProject(root)` reads the schema-checked ledger/roadmap, original bytes and directory inventory. `scanInventory(root)` and `changePath(inventory,id)` resolve unique local identities. `readReceipts(root,inventory)` parses receipts and checks retained evidence. `validateReference(root,inventory,reference)` validates repository-scoped Git commit objects or tracked file content/digests, accepting a tracked active path during an archive move before the index is updated. Repository locators beneath active changes are rejected: use a change locator so evidence survives the move. It never executes test/review commands.

`safePath(root,relativePath)` rejects traversal and symlink components. `atomicWrite(root,relativePath,newBytes,expectedSha256OrNull)` creates an exclusive same-directory candidate, fsyncs its content, rechecks the original hash and renames. Null means the target must not exist. Occupied temporary candidates fail without being removed. `withProjectLock(root, action)` exclusively owns `openspec/.project-status.lock` for a synchronous action; no stale-lock stealing. `gitEnvironment()` strips inherited `GIT_*` overrides. These checks serialize supported writers; arbitrary editors ignoring the lock can still race after the last check.

## Archive protocol and task 5 integration

`prepareArchive(root,id)`, `resumeArchive(root,id)`, `repairArchive(root,id)` and `cancelArchive(root,id)` acquire the same project lock. A wrapper that already holds that lock may pass **trusted programmatic** `{lock:false}`. Never map this option from CLI flags or user JSON. Keep wrapper operations synchronous inside `withProjectLock`; do not return an unawaited asynchronous action that releases the lock early.

Preparation validates current graph/ledger/reconciliation and requires every owned defect verified. It writes an active-change `defect-resolution.yaml` followed by `openspec/archive-transaction.yaml`. The receipt contains exact ledger/roadmap preimage bytes, active-change/main-spec file hashes, base revision, row/snapshot hashes, deterministic target ledger/roadmap bytes and the complete verified snapshots. It starts with `state: prepared`, no resolved records. Preexisting receipts are never overwritten; use explicit recovery for an existing transaction.

The journal binds the prepared/finalized receipt bytes and the ledger/roadmap before/after hashes. Normal task 5 flow: hold lock → external-root and completion/review checks → strict validation → prepare → recheck root → invoke real archive once → inspect actual active/archive inventory even after a nonzero CLI exit → repair only if the move occurred. Archive errors before the move leave prepared state for explicit resume/cancel. No manual pre-sync, no skip-validation/spec flags, no automatic approval.

Resume before the move verifies exact ledger/roadmap, active-change and main-spec preimages, reconstructs an absent journal from an intact prepared receipt and returns the existing receipt. The wrapper must rerun its validation/review prerequisites before invoking archive. Resume after a move delegates to repair. Cancel removes the journal before the generated receipt, so interruption leaves an independently recoverable prepared receipt. Its optional trusted `onStep` callback receives `journal-removed` and `receipt-removed` for phase reporting/failure injection; it is not a CLI option. Cancel requires the same preimages and an active, unmoved change; it preserves unsupported external/spec edits and refuses after archive.

Repair accepts only recorded before/after file hashes, advances the missing ledger/roadmap writes, finalizes terminal records and removes the journal last after consumer validation. A completed transaction is an idempotent no-op even after later supported ledger changes. Pending listings identify receipt record IDs even if ledger removal happened first. Zero-defect receipts remain mandatory for all nonlegacy archives. Finalized receipt bytes are immutable; reopening creates a new active record linked to the receipt digest.

Task 4 tests exercise these functions in synthetic temporary repositories, including occupied-temp failures. They do not establish task 5's CLI selection, OpenSpec rollback or approval behavior. Task 5 must add boundary failure injection around its external CLI and journal/receipt/finalization operations and retain real consumer results.
