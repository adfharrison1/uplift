# Task 3.1 evidence — renderable entity IDs

Status: implemented and independently reviewed in the default checkout. The owner approved this task's commit; its checkbox remains open until the verified commit. No defect transition is claimed.

## Scope and observed checks

Three source files changed. `EpochBlueprints.ts` applies the shared token validator to authored character IDs. `WorldStateCodec.ts` validates every saved entity key and inner ID and requires equality. `SceneVisualBlueprints.ts` uses the same validator for character root and part semantic IDs. The frame builder itself is unchanged.

The named focused command passed **60/60 tests across eight files** (`npx vitest run tests/unit/domain/EpochModuleRegistry.test.ts tests/unit/domain/WorldStateCodec.test.ts tests/unit/application/RenderFrameBuilder.test.ts tests/unit/application/SimulationCoordinator`; 310 ms on this host). Final loopback-enabled `npm run verify` passed format **1,673 ms**, lint **1,483 ms**, typecheck **980 ms** and tests **16,695 ms**. An earlier full run found only formatting in the new coordinator test; Prettier fixed it before the passing rerun. Strict OpenSpec validation passed. Checked defect reconciliation passed (**49 active, 30 resolved**), and `git diff --check` passed. The 2019 Intel reference Mac was not measured.

## Task-scoped G1–G6

| Gate | Result and limit |
| --- | --- |
| G1 Consumer trace | Pack character input → registry parsing → initial coordinator world → render frame/semantic ID. File-backed snapshot → codec entity-map parsing → coordinator load publication → later render frame. A future runtime materializer must call the validator when implemented. |
| G2 Trust boundary | Authored IDs and untrusted snapshot entity map keys/values must match the lowercase ASCII token, 1–64 characters, starting alphanumeric. Key/value mismatch rejects. No new validation runs on each frame. |
| G3 Hot-path cost | Registration and load incur validation; the existing defensive character semantic-ID formatting now calls the shared rule. No new frame-builder traversal was added. The focused and full verification times above are current-host measurements only. |
| G4 Failure containment | Rejected cameo registration preserves prior characters and pack identity and permits a corrected import. A malformed saved key, value or mismatch preserves prior world/RNG and slot bytes; a later frame renders that prior world; corrected load succeeds. |
| G5 Disposition | `T3.1-R1` was an independent test-coverage finding, corrected and rechecked. No runtime defect or ledger transition arose. Change-owned defect transitions remain with closing task 4.1; reconciliation passed. |
| G6 Scenario traceability | `EpochModuleRegistry.test.ts` covers malformed authored tokens, whitespace, rollback and retry; `WorldStateCodec.test.ts` covers invalid saved IDs; `SimulationCoordinator/save-codec.test.ts` covers key/value/mismatch, atomic rollback, later frame and corrected load; `RenderFrameBuilder.test.ts` covers valid registered materialization and rendering after a failed cameo; `SceneVisualBlueprints.test.ts` covers shared character formatters. |

## Document integrity

Domain, application and tests README/AGENTS pairs describe the shipped boundary. `DESIGN_NOTES.md` marks registered and saved ID enforcement shipped while future runtime materialization, structural unreadable-slot listing and browser disk loading remain pending. The owner's rollback wording and inbox are intact. The status index, Where-facts-live table, roadmap row and disposition row remain valid because this engineering section is still partial. No block was moved or cut. Before → after word counts: `DESIGN_NOTES.md` 17,484 → 17,513; domain README 1,081 → 1,087 and AGENTS 1,036 → 1,050; application README 862 → 886 and AGENTS 879 → 911; tests README 1,357 → 1,390 and AGENTS 1,600 → 1,631. Both independent reviewers checked document accuracy and no-loss.
