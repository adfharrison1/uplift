# Task 4 fix snapshot

This immutable snapshot records the implemented corrections to T4-C1, T4-C2 and T4-C3. It is an uncommitted content-evidence reference; the closing record must bind the approved task commit. It does not itself claim independent review passed. Use separate retained test/review evidence for those gates.

- **T4-C1:** cancellation removes the journal before its generated receipt, preserving recoverable orphan-receipt state on interruption. Journal and receipt hashes plus ledger/roadmap/active/spec preimages are rechecked before removal. Trusted phase callbacks permit deterministic failure injection. A callback-induced external receipt edit fails without deleting the altered bytes; retry after interruption permits a subsequent unrelated mutation.
- **T4-C2:** filesystem receipt discovery and pure reconciliation require the actual containing path to match the receipt's declared change identity. Misplaced prepared and finalized receipts, including empty receipts, fail before recovery or resolution output.
- **T4-C3:** the shared locator schema rejects repository locators beneath active change directories. Fix/test/review/supplementary and graph delivery references must use the relocatable change form there. The positive move/repair/list consumer test preserves the original history locator after archive.

Exact corrected source SHA-256:

| File                                     | SHA-256                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| scripts/project-status.mjs               | 7b523ffc6d440d8cf238cbdd1b82e89eff61bd924b458274538c69bb40ef4c96 |
| tests/unit/tooling/ProjectStatus.test.ts | f7c70d43d1a4180d1f1635b5c6bc81227abd0a4f93b513b37b687b47b2ea5d8a |
| package.json                             | db18073b702dc80a8a77579933cd173c6cb4e7596487f5b98a1aaf063aaa6005 |

Behavioral RED: task-4-evidence/review-round-1-red.txt (3 failing, 81 passing), then task-4-evidence/review-recheck-red.txt (1 failing, 89 passing). Final focused GREEN: task-4-evidence/focused-green-final.txt (90 passing, 7.03 seconds). Lint and strict typechecking passed after the final source edit. Controller full verification passed: format 1630 ms, lint 2490 ms, typecheck 765 ms, test 8394 ms. These are host measurements, not a reference-Mac claim. Independent final reviews remain separately owned controller evidence.

These hashes identify this source snapshot; future edits to the shared module do not rewrite this record. Supplementary closing evidence should link the delivered Git commit while preserving the original snapshot and event history.
