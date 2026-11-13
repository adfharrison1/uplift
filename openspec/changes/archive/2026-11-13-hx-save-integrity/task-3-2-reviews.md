# Task 3.2 independent reviews

Two independent reviewers received separate read-only, high-reasoning, medium-to-high-model briefs. Both read task 3.2, its design and delta scenarios, root/scoped guidance and the uncommitted diff; they did not see each other's initial conclusions. They independently inspected the correction. The controller reproduced the shared finding, wrote a failing regression, fixed it and ran the task and full suites.

## Correctness, edges and cost — `/root/task32_correctness`

Lens: malformed inputs, reason precedence, file/path faults, direct replacement, browser and HTTP behavior, G2/G3/G4 and owner-text fidelity. Initial focused file/browser/coordinator run passed **51/51**; guarded HTTP storage passed **18/18** with loopback access after a sandbox `EPERM` on the first attempt. `T3.2-C1` (medium, G4) found that `FileSaveSlotRepository.listSlots` caught any non-`UnsafeLocalPathError` from `files.read`, so `EIO` or `EACCES` became `invalid_envelope` and guarded HTTP could return 200 for a storage failure. `T3.2-C2` (low, process/G3) noted that the required host listing measurement was absent. The reviewer found no owner-text loss. On the revised diff, repository/in-process tests passed **21/21**, guarded HTTP **19/19**; the reviewer confirmed `T3.2-C1` fixed and the supplied 100-slot measurement adequate once retained here.

## Architecture, adherence and documents — `/root/task32_architecture`

Lens: three-source-file cap, inward imports, strict types, inline port result without barrel change, real consumers, G1/G5/G6, paired guides and no-loss. The initial review independently found the same read-fault bug as `HX32-ARCH-01` (moderate, G4), plus absent measurement/evidence as `HX32-ARCH-02` (G3 gate gap). Its non-HTTP run passed **54/54** and guarded HTTP **18/18** with loopback access. An initial full verification on a moving diff failed only formatting in the new file test. The final recheck found no new architecture or document issue: repository/dispatcher/HTTP focused tests passed **40/40**, the previously flagged file passed Prettier, and the read-fault regression covered the trigger and guarded consumer. The controller's final full verification followed the last HTTP test formatting edit.

## Disposition

| Findings | Disposition and evidence |
| --- | --- |
| `T3.2-C1`, `HX32-ARCH-01` | **Fixed in task scope.** `listSlots` no longer catches disk read errors. Injected `EIO`/`EACCES` repository tests failed before the fix and passed after; guarded HTTP `EIO` yields redacted 500, unchanged bytes and a successful later list. Both reviewers independently rechecked. This is the planned failure-containment boundary, not a new feature. |
| `T3.2-C2`, `HX32-ARCH-02` | **Resolved.** The task report retains the 100-slot, 232,500-byte, ten-run host measurement and explicitly leaves the reference Mac unmeasured. |

No finding remains open or deferred. Owner approval is required before committing this task.
