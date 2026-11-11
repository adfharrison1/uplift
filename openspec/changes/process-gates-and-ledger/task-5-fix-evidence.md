# Task 5 immutable fix snapshot

Base commit: `1f104e0`. This snapshot binds reviewed content before the task commit; task 6 will bind it to that delivered commit. Never edit this file or the digested proof after the ledger references it. Mutable summaries and the ledger are deliberately excluded.

- **T5-C1:** preserve declared date-prefixed original archive IDs; reject ambiguous identity mappings. Actual installed-CLI dated archive and all consumers pass.
- **T5-C2:** normalize comparison strings for LF/CRLF prior-sync detection without rewriting source files. Twelve operation/line-ending cases pass after retained failing regressions.
- **T5-C3:** validate archived originals and retained review locators through shared repair/list/reconciliation, including empty receipts and repository/other-change proof. Altered/missing evidence fails closed until restored.
- **T5-C4:** require canonical absolute CLI paths before selected-change confinement. Artifact/task/context dot-segment regressions reject without outside writes.
- **T5-C5:** batch Git index reads and repeated references per synchronous operation. Later operations still observe untracking and altered bytes; no global cache. Focused timing improved from 33.60s (170 tests) to 11.11s (171 tests), not a controlled hardware benchmark.

Both independent final task reviewers passed C1–C5. The final focused run passes 171 tests; a full standalone run passes 449 tests in 30 files. Full verification passes format/lint/types/tests. The actual nine-case CLI matrix predates only the bounded batching correction; the optimized unit matrix and independent forward exercise cover the final behavior.

## Verification limitation retained

The first controller full-verification attempt failed formatting on five scratch JSON inputs and reported 66 archive-fixture failures, primarily absent lock/review files. The original tool output was truncated before the first detailed exception could be retained. Formatting was corrected. No production/test code or configuration changed during investigation. No cross-suite filesystem mock, broad cleanup or environment mutation was found; file timestamps showed implementation edits and smoke cleanup had completed before that run. The unchanged standalone test run and full-verification rerun then passed. The cause remains unlocalized; no claim is made that a fixture defect was fixed. Preserve this observation for task 6 closing review and investigate if it recurs. Passing reruns and independent focused review justify presenting task 5 for approval, with this explicit uncertainty.

The measured test duration exceeds the reference target; no reference-Mac guarantee is claimed. Raw test transcripts retain their original bytes, including trailing blank lines. No live archive or task 5 commit has occurred.

## SHA-256 content bindings

| File (repository-relative, or relative to this change for proof) | SHA-256 |
| --- | --- |
| `scripts/archive-change.mjs` | `6c51caee5fc6d71052c43378aef396dd1743180224584dff17e084936330b9cb` |
| `scripts/project-status.mjs` | `fca8a6de56da770981d86494fd1afcdb9914ae0f35e94c6119df5f2d1083d961` |
| `package.json` | `898f3a356141d6f82f733bec93740029b1659cb88da3b8ac4173b941561a21b9` |
| `tests/unit/tooling/ArchiveChange.test.ts` | `4180ccec4bb627492debf6483b246578664e437ccb9054aed78499ccff99f271` |
| `.agents/skills/openspec-archive-change/SKILL.md` | `0265e7eba5fe81e24810d92675ba6677a89af2bdcc5507ee4351c6198f339248` |
| `.agents/skills/openspec-apply-change/SKILL.md` | `246de906ab2da9efc662420981f68355cbb524eaa49020a890c00793e3dba134` |
| `task-5-tests-optimized.txt` | `e66e2bbef8f0bb41e2881820c3d01abb7a2832a32b196ad9ce9791159c6bda00` |
| `task-5-full-tests.txt` | `9a9c6f8fde0101dbc3b3d23aaa346d0fff487ac384ccbf7cafe3dfd1ca91e3a2` |
| `task-5-full-verify.txt` | `fc2cc6faa651183dff72a2f1ffae675b4d92ecb0870ea4e4af182691408b3f61` |
| `task-5-review-a.md` | `733084e6b9f005bb28dffd9f436a2869ec2fbd8748220753bfe660efc9de9393` |
| `task-5-review-b.md` | `8f11433690839f9e0d968d466acb7c4ce031f85c8e7ce2d908dacfe365f4f675` |
| `task-5-cli-final.txt` | `b1601e995cff0d63e50fd8b6ec2cbe913973e116b33b79ea502e5facb94264a2` |
| `task-5-skill-forward.md` | `07d0b3b68cc688db80952251f5c33ce5caa25f1abe5815d1d431375fc1e82b36` |
