# Task 3.1 independent reviews

Two high-reasoning, medium-to-high-model reviewers received separate briefs before either submitted conclusions. Neither edited files. Both rechecked the final correction independently. Their reports do not substitute for owner approval.

## Correctness, edge cases and cost — `/root/slice_store_correctness`

Found `T3.1-R1` (major, G2/G4): a structural `StateSliceKey` returned or appended caller-owned mutable default rows. Reproduced with plain JSON; fixed by a private frozen first-read fallback and rejection of an unowned unset append base. Found `T3.1-R3` (major, G2/G4): a changing `id` accessor could poison another collection's cached read or redirect an append/update. Reproduced, fixed by resolving the id once per operation, and rechecked with three red-green tests. Also flagged `T3.1-R4` (minor, test rule): a new non-null assertion; replaced with a named row. Final verdict: no remaining Task 3.1 finding, 14/14 focused tests passed. Source review confirms append does not traverse prior rows and materialization is iterative.

## Architecture, adherence, coverage and documentation — `/root/slice_store_adherence`

Independently reproduced `T3.1-R1`. Found `T3.1-R2` (major, G2/G4): TypeScript-private `materialize` could be called through reflection with fabricated entries to poison the cache. Replaced with JavaScript-private `#materialize`; regression failed before and passed after. Also flagged `T3.1-R4` guide precision and test assertion; both guides now require `defineStateSlice` for an unset appendable default, and the assertion is removed. Rechecked the changing-id fix with a one-getter-call probe and unrelated-collection preservation. Final verdict: no remaining Task 3.1 finding. Independent slice/reducer/coordinator focused run passed 22/22; scoped ESLint and diff checks passed. The reviewer's sandboxed full run was limited by HTTP loopback `EPERM`; the controller's socket-enabled full verify passed.

## Disposition

`T3.1-R1`–`R4` are fixed in the Task 3.1 source, tests and paired guides, and independently rechecked. They refine the already owned `S3-01`/`S3-17-slices` work; no new unplanned task or unresolved disagreement remains. Plain-JSON/schema/version and reference-Mac evidence remain explicitly assigned or unverified in the task evidence. The final scoped diff and checked ledger reconciliation were inspected before commit.
