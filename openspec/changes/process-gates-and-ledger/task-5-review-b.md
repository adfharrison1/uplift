# Task 5 independent review B

## Pre-cut coherence and coverage checkpoint

Baseline: `1f104e0bae5bbb21fd118c8974337dd34c714f6a`. Brief: high reasoning,
medium-to-high model; independent architecture/spec/design/types/test reviewer,
with this first checkpoint limited to skill coherence and no-loss coverage. No
reviewer A conclusions were read. Implementation was still changing and was not
reviewed at this checkpoint.

Inputs inspected: root AGENTS; review-gates skill and its delivery/document
integrity references; approved task 5 and design section 5; defect-ledger and
review-process delta specs; existing archive/apply skills; proposed
`.superpowers/sdd/tasks/task-5-archive-skill.md`, `task-5-apply-skill.md`, and
`task-5-skill-no-loss.md`; design navigation and document ownership guidance.

**Result: correction required before installing the replacement archive skill.**

### T5-B-DOC-01: Run strict validation before the approval checkpoint

Severity: minor process/document finding. Gates: G5/G6 and reviewable approval.
Owner: this task's archive-skill integration.

The draft's opening contract says “strict validation and defect reconciliation
precede owner archive approval.” However, “Prepare a reviewable archive” reads
status/apply instructions and runs reconciliation without running strict
validation. “Obtain archive approval” follows next. The only executable strict
validation route is described inside the wrapper in “Run the checked archive
once,” after approval. A cold operator following the numbered steps cannot
present the promised strict-validation result before requesting approval.

Add `openspec validate "<name>" --strict` with the selected scope in preparation,
require success before presenting the approval result, and retain the wrapper's
revalidation under its lock. This preserves approved design section 5 and the
opening contract without adding an approval round. Recheck the draft's numbered
sequence and no-loss map before installation. No runtime defect entry is needed.

### Coverage and justified supersession

- The full validated CLI archive supersedes the generated manual-sync/move
  implementation, warning overrides, and skip-spec choices by explicit approved
  design authority. The map identifies those cuts rather than silently claiming
  that they remain supported. Delegation to the installed CLI is a contract to
  verify during implementation and smoke testing, not present proof of preserved
  output.
- Store discovery remains usable for diagnosis while the wrapper transaction
  explicitly refuses external, declared, and global stores. Root-null and invalid
  declaration branches survive, including no implicit initialization.
- Change selection, active-only candidates, schema reporting, context/advice
  precedence, nonblocking optional archive-instructions lookup, conflict
  reporting, and restrictions on copying prompt inputs survive.
- Task completion remains schema driven through status/apply/list authority, not
  a hardcoded `tasks.md` check. The draft explicitly rejects malformed counts,
  duplicate/missing selected entries, blocked instructions, and incomplete tasks;
  zero tasks remains supported when the schema permits it. Final wrapper review
  must verify these claimed checks actually run.
- Full capability paths, status-returned delta sources, new-main-spec semantics,
  intended-change summary, retirement validation, and stop-on-already-synced or
  ambiguous state remain represented. The former intelligent-merge mechanics
  are explicitly superseded by one full CLI synchronization.
- Six independent final reviews, G1–G6, tracked current review evidence, verified
  owned defects (including refusal of parked owned defects), and distinct archive
  authorization remain required. Existing explicit authorization is preserved.
- Before-move resume/cancel and after-move repair/resume are concrete commands;
  byte conflicts, missing receipts, bypasses, stale locks, and immutable history
  receive fail-closed guidance. Final success ends at receipt/roadmap/combined
  listing/reconciliation consumers rather than CLI exit alone.
- The apply diff changes only its delivery-gates signpost. Checked commands,
  expected revisions, reconciliation, and immutable evidence are added while
  default-worktree policy, schema/source-path handling, optional advice,
  task-specific owner approval, and all other existing text remain unchanged.

### Integrity and remaining verification

The no-loss map covers every major old archive block, including Purpose/title
and requirement-formatting delegation, naming/metadata movement, and summary
semantics. No additional unjustified cut was identified. Skill word counts at
this checkpoint: archive 2,490 → 1,686; apply 1,847 → 1,883. These are observations,
not root/config budget claims.

The proposed command-guide link targets the future root README archive/recovery
section, which is not present in the baseline. Validate the installed anchor and
`final-reviews.yaml` fields against the final wrapper/docs before task approval.
Status index, Where-facts-live, roadmap ordering, design pillars, and inbox remain
unchanged by this evidence-only review; no new design decision is introduced.
This file is the canonical independent review record, not a rewritten historical
report or a ledger verification claim.

Full implementation review, targeted tests, real-CLI smoke output, final
reconciliation, and `npm run verify` are not claimed by this pre-cut checkpoint.
The controller retains the task-wide verification obligation after core freeze.

## Pre-cut correction recheck

**Result: PASS for the scoped pre-cut coherence/no-loss checkpoint.**

T5-B-DOC-01 is fixed in the proposed archive skill. Step 2 now explicitly runs
`openspec validate "<name>" --strict` with the selected local scope and stops on
failure before presenting archive approval. The following sentence retains
independent wrapper validation before preparation. The numbered sequence now
matches its opening contract and the approved design.

This recheck inspected only that requested correction and its surrounding
approval sequence. It authorizes no archive and makes no implementation,
installed-skill, full-verification, or final task-review claim. The earlier
finding and evidence remain above; final contract/link and core review remain
outstanding. No reviewer A conclusions were read.

## Implementation review B: initial frozen-core review

**Result: correction required for T5-C2; no other blocking finding identified.**

Reviewed the archive wrapper, shared-state diff, package wiring, complete
ArchiveChange tests and relevant existing ProjectStatus recovery tests, installed
skills, root/tests guide pairs, and the updated design ownership row against task
5, design section 5, and both applicable delta specs. This remained independent
of reviewer A. The only reviewer-created file is this report.

### T5-C2: CRLF deltas bypass the already-synchronized guard

Severity: major code defect; G2/G6; fixing owner: this archive integration task.
Source: `scripts/archive-change.mjs`, `detectPresync`, exact anchor
`section = block.split('\n')[0]` followed by comparisons against
`'## ADDED Requirements'`, `'## MODIFIED Requirements'`, and
`'## REMOVED Requirements'`.

Trigger: an already manually synchronized main spec and matching MODIFIED delta
both use CRLF endings. The section variable retains the carriage return, so no
section comparison succeeds and the wrapper proceeds beyond the guard. The
approved design explicitly requires already manually synchronized deltas to stop
for inspection before archive. This also affects ADDED and REMOVED detection;
the separate rename branch is not the cause of this reproduction.

Independent reproduction executed the unchanged `detectPresync` function body
from the current module against real temporary main/delta files, with its real
`safePath` dependency and filesystem reads. Only line endings differed:

| File endings | Actual result |
| --- | --- |
| Both LF | `PRESYNC: delta appears already synchronized or conflicts with main spec` |
| Both CRLF | Accepted already-synchronized MODIFIED delta |

The fixture requirement was `Existing`, with the same SHALL body and Scenario
block in main and delta. Temporary files were removed. This narrow probe proves
the guard defect; it does not claim a real archive was invoked. The controller
independently reproduced the same outcome and accepted the finding as T5-C2.

Required correction: normalize line endings before section and requirement-block
comparison, preserving source files; add wrapper-level negative regressions for
CRLF ADDED/MODIFIED/REMOVED cases that assert no receipt/journal or archive call.
Include differing main/delta line endings so a header-only trim does not leave
the MODIFIED block comparison vulnerable. Retain the fix and passing regression
evidence before verification and task approval.

### Architecture, contracts, and evidence checked

- The three source/tooling files are the new wrapper, shared state module, and
  package manifest. No simulation layer changes or outward runtime imports were
  introduced. The shared-module work adds consistent declared-ID mapping and
  failure hooks around existing transaction primitives rather than redesigning
  the protocol. Programmatic adapters are not exposed as CLI bypass flags.
- Completion reads actual context/list/status/apply responses, validates the
  selected local root and change, uses safe integer counts and schema-returned
  source paths, and requires done/skipped artifacts plus `all_done` apply state.
  The positive fixture uses `work/checklist.md`, so it does not merely reproduce
  a hardcoded tasks.md assumption. Unsafe options and paths fail before archive.
- `final-reviews.yaml` has a strict outer/record schema, exactly six dimensions,
  distinct nonempty reviewer identities, nonempty briefs, passed dispositions,
  and tracked/digested file locators. The guide accurately limits this to
  structural/integrity proof; semantic independence and owner authorization remain
  workflow duties. Missing/five/duplicate-reviewer/stale fixtures exercise refusal.
- The shared exclusive lock encloses synchronous preflight, preparation, CLI,
  finalization and readback. Root and preimage rechecks happen immediately before
  the CLI; symlink/unsafe ID checks and actual post-CLI inventory inspection
  remain in place. The documented arbitrary-editor race limit is honest.
- Recovery tests use real temporary files, occupied candidates and injected
  receipt/journal/ledger/roadmap/terminal-receipt boundaries. They assert pending
  IDs after active-row removal, preserved bytes on conflicts, one resolution
  event, no second archive on moved recovery, and idempotent repeated repair.
  Existing tests cover orphan receipts, cancellation interruptions, later
  unrelated mutations, finite legacy exemptions, missing receipts, and reopening.
- Date-prefixed identities are resolved from the declared roadmap consistently
  in filesystem discovery, graph/ledger checks, pure reconciliation, receipt
  discovery and recovery. The pure dated-reconciliation test deliberately removes
  adapter mappings. Ambiguous IDs and invalid calendar prefixes fail before
  preparation. Actual dated CLI evidence preserves the original full ID through
  resolved listing, recurrence linkage and reconciliation, supporting T5-C1's fix.
- Tests use typed interfaces/unknown rather than explicit any, isolated fixture
  repositories, sanitized Git overrides and cleanup. The retained targeted run
  reports 146 passing tests in 11.35 seconds; it predates the last invalid-calendar
  test and the requested T5-C2 correction, so it is not final verification evidence.

### G1/G5/G6 and documentation disposition

The controller's `task-5-controller-smoke.txt` reaches the installed default CLI
resolver, canonical main-spec output, terminal receipt/list/reconciliation, and a
linked reopened successor with evidence intact. Normal/dated/empty smoke logs and
before/after-move plus finalization-boundary logs extend that coverage. The smoke
driver uses only temporary repositories and synthetic reviews; it establishes
tool integration, not that six real delivery reviews occurred for this change.
Its new-main ADDED fixture verifies title/Purpose/requirement/scenario output;
existing-main modification, rename and retirement semantics are delegated to the
installed CLI and are not claimed as independently exercised by these logs.

G5 remains pending the controller's checked verification transitions for T5-C1
and T5-C2, final reconciliation, and retained current test/review evidence. The
full cross-capability scenario matrix and six delivery reviewers remain task 6
work; this two-reviewer task checkpoint does not replace them. The wrapper tests
plus existing shared-state tests cover the task's transaction scenarios. A final
targeted run and full verification must include the new line-ending regressions.

Installed archive/apply skills exactly match the reviewed scratch copies; the
strict-validation-before-approval correction survived installation. The root
README recovery anchor exists and its six-review fields/dimensions match code.
Root/tests README and AGENTS pairs explain the actual capability and recovery
boundary. Root AGENTS is 996 whitespace-delimited words, below 1,050; installed
archive/apply skills are 1,714/1,883 words. Config is unchanged. The design
Where-facts-live row now distinguishes shipped process tooling from planned
docs-truth checks; no gameplay decision, roadmap ordering, or inbox entry changes.
`git diff --check` passed. No full-suite result is claimed by this initial review;
the controller owns the upcoming final run.

## T5-C2 scoped correction review

**Result: PASS for T5-C2's implementation and regression coverage.**

Both main and delta comparison strings now normalize CRLF to LF immediately
after reading. Original files remain untouched. This fixes section matching and
MODIFIED block equality in both mixed-line-ending directions. Twelve wrapper
regressions cover ADDED, MODIFIED, REMOVED and RENAMED with both CRLF, CRLF main/LF
delta, and LF main/CRLF delta. Every case checks PRESYNC refusal, absent generated
receipt/journal state, and no archive invocation.

The retained RED log shows seven failures before the fix, including both mixed
MODIFIED directions; the implementer's GREEN log shows twelve passing. Reviewer
B independently ran the focused cases with the pinned Node runtime:

```text
/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin/node node_modules/vitest/vitest.mjs run tests/unit/tooling/ArchiveChange.test.ts -t 'rejects presynced'
Test Files  1 passed (1)
Tests       12 passed | 59 skipped (71)
Duration    1.40s
Exit        0
```

This closes the review finding's code/test objection. It does not claim a checked
ledger transition, full-suite success, or final task approval. Additional
controller-discovered boundary fixes are still pending; the report remains open
for their bounded re-review and must not yet be frozen as final evidence.

## T5-C3/T5-C4 bounded correction review and reviewer verdict

**Reviewer B verdict: PASS. No remaining blocking code or documentation finding
within this task-review scope.** Controller final verification and checked
evidence transitions remain prerequisites to the task approval checkpoint.

T5-C3 now checks original change-local file hashes in shared `readReceipts` after
mapping their active preimage paths to the discovered archive. This runs before
direct repair and the list/check consumers use those receipts, for prepared as
well as finalized receipts and including empty receipts. It binds the final
review manifest and proofs even when no defect separately references them.
Hash checks are read-only; conflicts preserve the changed evidence and current
ledger/roadmap/receipt rather than replacing them. Main-spec preimages are
deliberately excluded because full synchronization changes those files. New
supplementary files remain possible without changing retained originals.

The four pending/finalized × empty/owned-defect regressions tamper with a review
proof, check both direct repair and plain reconciliation refusal, compare every
current ledger/roadmap/receipt byte, retain the changed proof, then restore its
original bytes and successfully repair/reconcile. The missing-manifest regression
also covers empty finalized receipts. The historical controller reproduction is
retained separately and was not rewritten. Source trace confirms combined-list
uses the same `repositoryState` → `readReceipts` path; the defect is not merely
patched in wrapper resume.

T5-C4 rejects noncanonical absolute CLI paths before checking the selected-change
prefix and filesystem confinement. This prevents `alpha/../beta` from passing
the lexical prefix check and then escaping through normalized repository-relative
resolution. Artifact outputs, task source paths and context paths all call this
helper. Three regressions assert refusal before preparation/archive and preserve
the sibling-change sentinel. Canonical nested custom-schema paths remain valid;
the successful fixture still uses `work/checklist.md`, not tasks.md. No returned
path is silently rewritten into an accepted alternate path.

Reviewer B independently ran the eight new cases plus normal empty archive,
dated pure-reconciliation integration and all six successful failure-boundary
recovery cases:

```text
/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin/node node_modules/vitest/vitest.mjs run tests/unit/tooling/ArchiveChange.test.ts -t 'dot-segment|changed review proof|missing archived final-review|runs full archive once|recovers failure after|dated receipt'
Test Files  1 passed (1)
Tests       16 passed | 60 skipped (76)
Duration    6.37s
Exit        0
```

This bounded run confirms both rejection and legitimate fixture recovery after
the shared check. The earlier installed-CLI smoke evidence remains scoped as
documented above; this run does not claim to repeat the real CLI smoke. No API
schema redesign was introduced. The new README explanation accurately describes
archived-original integrity, supplemental evidence, and the main-spec exclusion;
the paired test guides describe the actual direct-recovery coverage. T5-C2's
independent twelve-case PASS remains applicable. No reviewer A conclusions were
read, no implementation/ledger edits were made, and no live change was archived.

## T5-C3 retained-locator extension: final bounded review

**Final reviewer B verdict: PASS for the delivered task implementation.** Final
controller verification and checked G5 evidence transitions remain outstanding.

The previous C3 PASS covered archived change-local proof. The subsequently
reproduced repository-locator variant exposed a missing supported case in that
scope; the earlier verdict is retained as historical evidence, not evidence that
this variant had been covered.

The final patch carries the wrapper's validated review locators into optional
receipt-v1 `retained_evidence`. The shared schema reuses `locatorSchema`; existing
receipts without the optional field retain their original serialization and
remain valid. Journal prepared/finalized fingerprints include the added field via
the existing whole-receipt hashing. Trusted preparation validates locator shape,
tracking and digest before writing; wrapper preflight supplies all six validated
references. There is no new CLI option, recovery phase, or six-review schema
dependency in the shared module.

Shared receipt loading now validates retained references before all filesystem
repair/list/reconciliation consumers. Repository references stay repository
references, and other-change references continue through the existing relocatable
`changePath`/`validateReference` logic. Original archived-file hash checks remain
in place. A main-spec repository file cannot serve as final-review proof: wrapper
preflight rejects it with an immutable-snapshot instruction before preparation,
preventing synchronization from invalidating its own archive evidence. Comparison
normalization for T5-C2 still only affects in-memory strings.

The four new cases cover changed and deleted repository proof during pending
empty-receipt recovery, other-change proof after finalization, and mutable
main-spec overlap. They preserve conflicts and require original bytes restored
before successful repair. Reviewer B independently ran those four cases plus the
normal empty archive and the existing shared orphan/zero-defect recovery case
(which prepares receipts without `retained_evidence`):

```text
Pinned Node v24.22.2; Vitest ArchiveChange.test.ts + ProjectStatus.test.ts
Focused normal/compatibility/other-change/main-spec selection:
  Test Files 2 passed; Tests 4 passed | 166 skipped; Duration 1.95s; exit 0
Focused 'repository-located final-review' selection:
  Test Files 1 passed; Tests 2 passed | 78 skipped; Duration 1.53s; exit 0
```

The README now describes durable repository/other-change proof and exclusion of
mutable main-spec evidence. This is consistent with the existing locator
contract, shared integrity checks and documented direct-repair route. No remaining
blocking issue was identified in the bounded patch. This review does not claim a
new complete-suite or real-CLI-smoke run; the final controller run remains the
completion evidence. No reviewer A conclusions were inspected.

## T5-C5 bounded cache-lifetime review

**Reviewer B verdict remains PASS.** The optimization preserves the reviewed
tracking, digest and relocation contracts; no new blocking finding was identified.

`createReferenceChecker` creates local sets for one synchronous validation scope.
It lazily reads the Git index once using `ls-files -z`, preserving literal path
membership without quoted/newline-delimited output ambiguity. Its successful
reference cache keys include the validated kind, path/change identity and digest;
failed checks are not cached. Git object references retain their object check.
The standalone `validateReference` constructs a fresh checker on every call.

Call-site review confirms new checkers are created inside each receipt load,
project validation, retained-evidence preparation, roadmap invocation and wrapper
final-review check. None is global or carried across the archive move, filesystem
writes, or later command invocation. Receipt defect references and retained review
references share a checker within their read operation. Existing confinement,
digest verification and original-active-path/archived-path Git membership rules
remain unchanged. The documented unsupported-external-writer race limit remains
applicable; this is not a claim of a universal filesystem snapshot.

The new regression checks a successful reconciliation, removes the original
tracked review path from the index, requires the next reconciliation to fail,
then stages the archived path and requires the next call to succeed. Reviewer B
independently ran it with the seven changed/deleted/local/repository/other-change
proof regressions to check that subsequent calls also observe current bytes:

```text
Pinned Node v24.22.2; Vitest ArchiveChange.test.ts
-t 'later reconciliation|changed review proof|repository-located|retains evidence in another change'
Test Files 1 passed; Tests 8 passed | 73 skipped
Duration 2.28s; exit 0
```

The controller reports a targeted-suite improvement from 33.60s to 11.11s; this
review did not repeat that full benchmark and does not claim the reference-Mac
timing target is met. C1–C4 review conclusions remain intact. Final full
verification, evidence freezing and checked defect transitions remain controller
completion work.
