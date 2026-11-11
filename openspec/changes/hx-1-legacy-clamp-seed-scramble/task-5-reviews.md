# Final delivery reviews — legacy clamp and seed scramble

Six independent high-reasoning, medium-to-high-model briefs covered the required dimensions after Tasks 4.1–4.4, with Task 4.5 rechecks for the final documentation correction. Reviewers made no edits and did not receive one another's counted conclusions before reporting. Preliminary second-wave testing, logic and design reports were excluded from the independent count because full-history forks could expose first-wave conclusions; their context-free replacements are recorded below. These judgments do not grant owner commit or archive approval.

## Adversarial — `/root/hx1_close_adversarial`

Brief: malformed inputs, boundary values, G2 trust and G4 failure containment, including restored-epoch telemetry. Verdict: **passed; no new in-scope finding**. The reviewer traced schema/seed validation, ordered resolution, startup/load publication and injected warning/required-record failures. The distinct saved epoch and tick are checked through real telemetry query results. Three focused suites passed 37/37. After Task 4.5 it rechecked the documentation-only diff and found no impact. Limit: injected telemetry failures throw before append; a port that appends then throws was not separately tested.

## Architecture and adherence — `/root/hx1_close_architecture`

Brief: inward imports, purity, zero-`any`, contracts, spec behavior, paired guides, document integrity and G1/G6 trace. Verdict: **passed; no new finding**. Domain/application dependencies remain inward, the resolver is pure, and the guides and design statuses match shipped behavior while later work stays planned. Architecture plus three focused suites passed 45/45. After Task 4.5, the reviewer confirmed the status-index owner correction and passed the architecture suite 25/25. Final ledger transitions were pending during its initial review.

## Performance — `/root/hx1_close_performance`

Brief: G3 frequency, scaling, allocations and reference-hardware limits. Verdict: **passed; no new performance finding**. Fresh seed mixing is one fixed-cost constructor step; `fromState` and draw loops retain their behavior. Legacy resolution and warning writes run at construction/load, outside `stepFrame`. Tasks 4.1–4.5 add no runtime cost; the reviewer confirmed Task 4.5 changed documentation only. Host verification takes roughly 17 seconds; the reference Mac's under-five-second target and 60 FPS frame cost remain unmeasured.

## Testing — `/root/hx1_close_testing_independent`

Brief: G6 delta scenarios, consumer assertions, deterministic fixtures and suite timing. Verdict: **passed; no new in-scope finding**. All 16 planned scenarios map to assertions; four focused files passed 45/45 in 206 ms Vitest on this host, and the full verify passed with loopback access. Coordinator tests query actual in-memory telemetry and check restored world/RNG and failure containment. The ambient-randomness architecture test scans current files and synthetic violations; an actual `Date.now()` source-file failure probe was later run by the controller. After Task 4.5, the reviewer confirmed no scenario changed and independently passed the architecture suite 25/25. Reference-Mac timing remains unmeasured.

## Logic and simulation integrity — `/root/hx1_close_logic_independent`

Brief: mathematical and bitwise correctness, reducer purity, state invariants, actual consumers and the pre-existing `nextInt` observation. Verdict: **passed for this change; one separate pre-existing minor defect**. The reviewer independently reproduced the seed vectors and mixed-zero result, traced ordered legacy mutation and coordinator state publication, and passed full verification with loopback access. After Task 4.5 it confirmed no source/test or logic change. The headless coordinator consumer is verified; browser launch does not yet supply legacy state or load a slot.

### HX1-NEXTINT-01 — pre-existing `nextInt(2^32)` distribution defect

`SeededRandom.nextUint32()` never returns zero because Xorshift32 stays in nonzero states and normalizes zero to a fallback. `nextInt(2^32)` accepts that bound, sets the rejection limit to `2^32` and returns the nonzero sample modulo `2^32`; zero is therefore unreachable despite the method's “unbiased” contract. For smaller bounds above 1, residue zero has one fewer accepted sample per full period than other residues. The reviewer checked the same algorithm in the pre-mixer implementation. No gameplay code in `src/` calls `nextInt` or `choose`; changing draws here would alter saved continuation. **Disposition: parked, minor, fixing owner `cm-act-envelope-and-rolls`; revisit before it introduces a gameplay caller of these methods or changes RNG stream semantics.** The checked ledger records the finding separately. Task 1's correctness review had called rejection sampling correct at `2^32`; this mathematical check supersedes that narrow conclusion while leaving its seed-mixing judgment intact.

## Design coherence — `/root/hx1_close_design_independent`

Brief: owner wording, pillars/rules, status, navigation, no-loss, future integration and budgets. The independent review found `CLOSE-DOC-03`: the Engineering status-index unshipped-owner column still listed this fully shipped change. Task 4.5 removed only that ID in commit `84b61c5`, keeping the shipped summary and twelve later owners. The reviewer rechecked the commit, roadmap and full verification with loopback access: **passed; finding resolved, no new finding**. Keyed rolls, scar validation, accumulation and operative rotation remain planned; adjacent-seed intent remains without an independence claim. `DESIGN_NOTES.md` is 17,274 words within its accepted aspirational-budget exception. Reference-Mac measurements remain unverified.

## Earlier closing findings and disposition

- `CLOSE-G6-01`: restored epoch/tick was indistinguishable from live metadata in the low-load test. Fixed and independently rechecked in Task 4.1 (`4aaa3e9`).
- `CLOSE-G6-02`: pinned seeds had only one repeated draw each. Fixed and independently rechecked with 16 draws per seed in Task 4.2 (`be9a95b`).
- `CLOSE-DOC-01`: Engineering and Operative rotation status references lagged shipped code. Fixed and independently rechecked in Task 4.3 (`463c3dc`).
- `CLOSE-DOC-02`: seed paragraph omitted the original adjacent-seed spreading intent. Fixed and independently rechecked in Task 4.4 (`cbba8f9`).
- `CLOSE-DOC-03`: the Engineering status index retained this shipped change as owner of unshipped work. Fixed and independently rechecked in Task 4.5 (`84b61c5`).
- `CLOSE-PROC-01`: preliminary second-wave reports could inherit first-wave conclusions. Those reports were excluded from the independent count and replaced by context-free testing, logic and design reviews above.

No in-scope closing finding remains. `HX1-NEXTINT-01` retains explicit future ownership and revisit conditions; reference-hardware performance remains unverified.

## Task 5.1 artifact reviews

Two further independent, context-free, high-reasoning, medium-to-high-model reviewers inspected the staged closing package after the six delivery rechecks. They made no edits and did not see each other's conclusions before reporting.

- **Correctness/adversarial — `/root/hx1_task5_final_correctness`**: checked ledger history from revision 183 to 190, exact owned-entry transitions, retained fix/test/review digests, parked nextInt owner, manifest identities and SHA, strict validation and reconciliation. Verdict: **no finding**. Limits: the temporary `Date.now()` probe output is summarized but not retained, and the parked entry's active-change source path moves at archive while its code anchor remains stable.
- **Adherence/scenario — `/root/hx1_task5_final_adherence`**: traced all 16 scenarios to assertions and observable consumers; checked Task 4.5's no-loss status edit, six manifest identities/digest, strict validation, reconciliation and loopback-enabled full verification. Verdict: **no finding**. Limits: it did not repeat the removed temporary probe; reviewer isolation is evidenced by the retained briefs and reports, and reference-Mac timing remains unmeasured.

Both judgments are task reviews, separate from the six counted delivery dimensions. No task-review disagreement remains.
