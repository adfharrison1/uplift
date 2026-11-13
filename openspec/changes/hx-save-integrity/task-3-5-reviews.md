# Task 3.5 independent reviews and disposition

Two reviewers received separate high-reasoning, medium-to-high-model briefs for the scoped two-source-file correction, guarded HTTP test, paired guides and Task 3.5 evidence. Neither edited files or read the other's conclusions before submitting. The draft Task 4.1 matrix and report were outside this task checkpoint.

## Correctness, adversarial boundary and failure containment — `/root/save_task35_correctness`

The reviewer traced middleware admission and run checks through outer save parsing, shared repository inspection, typed rejection and the bridge's fixed 400 response. It confirmed an ordinary rename fault retains redacted 500, existing byte preservation and the absence of new frame-path cost. **No code finding.** It identified one G4 evidence gap: the first test version did not prove recovery after the injected rename fault. The test now clears the fault, writes a changed save, reads it through guarded GET and confirms changed disk bytes. The reviewer inspected the final diff and confirmed the gap is resolved.

## Architecture, spec, tests and document integrity — `/root/save_task35_adherence`

The reviewer confirmed that file and in-memory writes share the typed structural rejection, save/list/load values remain unchanged, and only two runtime files plus one test and paired guides changed. It inspected the final recovery assertion and independently ran the scoped suite, **42/42 passed**. README/AGENTS placement, navigation and unchanged status-index/roadmap ownership were coherent. **No code or scope finding.** It requested a stable finding ID and source anchor in the retained G5 record; `F41-A4` below supplies them. Its own strict OpenSpec validation attempt did not complete; the parent's pinned-Node strict validation passed.

## Closing-review finding and resolution

**F41-A4 (medium, fixed):** The post-Task-3.4 closing review found that an outer-valid guarded `PUT /api/saves/:slotId` with invalid nested snapshot, custom-slice metadata or legacy state reached `FileSaveSlotRepository.buildValidatedEnvelope`, which threw a generic error on failed `inspectSaveSlotEnvelope` in `src/infrastructure/persistence/FileSaveSlotRepository.ts`. `storageErrorResponse` in `src/interfaces/vite/localDiskBridgePlugin.ts` classified it as redacted 500, although the caller supplied structurally invalid data. The new guarded HTTP regression first failed with **expected 400, received 500** on the snapshot case. `InvalidSaveSlotInputError` now marks only that structural rejection; the bridge maps it to redacted 400. The final test checks all three inputs, prior bytes and GET readback, and a real rename fault that remains redacted 500 before successful recovery. The scoped **42/42** and full verification pass, and both independent reviewers found no remaining issue. This process finding is retained here; it does not alter the six change-owned ledger records before Task 4.1.
