# Task 3.5 evidence — guarded save PUT classification

Status: implemented and independently reviewed; owner commit approval remains pending in the default checkout. Task 3.4 was approved and committed as `6aae180`; its post-commit checkbox and this bounded correction task are included in the current `tasks.md` diff. The draft closing matrix and report remain separate Task 4.1 work.

## Scope and observed checks

Two source files changed. The shared file/in-memory repository builder now throws `InvalidSaveSlotInputError` when an outer-valid save fails nested structural inspection. Direct diagnostics retain the same message. The guarded bridge maps only that type to redacted HTTP 400, keeping actual disk faults at redacted 500. Paired infrastructure and interface README/AGENTS state the shipped behavior.

The new guarded HTTP test failed first: an invalid inner snapshot replacement returned **500 instead of 400**. After the fix, the named three-file task suite passed **42/42**. It replaces a valid slot with invalid inner snapshot, custom-slice version metadata and legacy state; each case returns redacted 400, preserves exact prior bytes and reads back the original envelope. An injected real rename failure returns redacted 500 and retains the prior slot bytes; clearing that fault permits a subsequent write and guarded readback.

Pinned Node 24.22.2 `npm run verify` passed format **4,279 ms**, lint **3,511 ms**, typecheck **931 ms** and tests **17,727 ms** after the final recovery assertion. An earlier run required a Prettier-only correction to the new test. Strict OpenSpec validation passed, checked defect reconciliation passed with **49 active, 30 resolved**, and `git diff --check` passed. These are current-host measurements; the 2019 Intel reference Mac was not measured.

## Task-scoped G1–G6

| Gate | Result and limit |
| --- | --- |
| G1 Consumer trace | Guarded `PUT /api/saves/:slotId` → outer schema parse → `FileSaveSlotRepository.saveSlot` → shared structural inspection → typed rejection → bridge redacted 400. A valid initial PUT and later guarded GET observe the unchanged envelope and disk bytes. The injected rename fault follows the same route and returns redacted 500. |
| G2 Trust boundary | The HTTP body is untrusted. Outer Zod parsing catches envelope shape, while repository inspection checks nested snapshot, slice metadata and legacy state. Only its typed structural rejection maps to 400; the response omits parser details and disk paths. Existing token, provenance, media-type, size and path checks remain in force. |
| G3 Hot-path cost | The added `instanceof` classification runs only on failed bridge requests. Save/list/load structural inspection was already present and stays off the frame path. No reference-Mac latency claim is made. |
| G4 Failure containment | Invalid replacements leave prior bytes and GET readback unchanged. A real atomic-write rename fault retains 500 and prior bytes. The valid slot remains usable after each rejected input, and a subsequent write succeeds after the injected storage fault is removed. |
| G5 Finding disposition | `F41-A4` in [the review record](task-3-5-reviews.md) identifies the post-3.4 closing-review HTTP classification defect and its source anchor. The red regression, typed-error fix, final 42/42 run and two independent task reviews close that finding. Both review-process gaps are resolved there. Existing six change-owned ledger records remain for Task 4.1 transitions. |
| G6 Scenario traceability | `LocalDiskBridgeHttp/storage.test.ts` observes the guarded consumer for all three structural categories, redaction, byte/readback preservation and a real storage failure. The existing direct dispatcher and repository suites pass. The 28-scenario change-wide matrix is Task 4.1 work. |

## Document integrity

The infrastructure and interface README/AGENTS pairs describe the new shipped error boundary. DESIGN_NOTES' engineering status remains partial and its Where-facts-live table still assigns save policy there; the roadmap row, status index, disposition row, owner wording and inbox entries are unchanged. No document block moved or was cut. Word counts before → after: infrastructure README **698 → 713**, infrastructure AGENTS **458 → 464**, interfaces README **1,380 → 1,398**, interfaces AGENTS **1,203 → 1,218**. Both independent reviewers checked documentation fidelity and coherence.
