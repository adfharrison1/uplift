# Controller recovery probe before correction

The controller independently ran the default installed CLI in a fresh synthetic temporary repository from task-5-smoke.mjs prepare-only. Archive was interrupted at the trusted ledger-written boundary. The archived reviews/testing.md file was then appended to; this is one of the six delivery-review proofs, but not the proof referenced by the synthetic defect record. The wrapper resume, direct defects repair and plain reconciliation were exercised in that order. The fixture was removed in finally. No live work was archived or edited.

Observed output before correction:

```text
INTERRUPTION probe interruption
WRAPPER EVIDENCE: evidence digest mismatch: openspec/changes/archive/2026-11-11-alpha/reviews/testing.md
DIRECT REPAIR {"state":"finalized","change_id":"alpha","ids":["D-1"]}
RECONCILE {"ok":true,"active":0,"resolved":1}
```

The documented direct repair path bypasses the wrapper-only final-review integrity check. This is accepted as T5-C3, major, with the current proposal as fixing owner. Required regression: shared repair/reconciliation reject changed or missing retained archived review evidence and preserve the conflict, including zero-defect receipts. Subsequent passing results must be supplementary to this reproduction.

Scratch reproducer: .superpowers/sdd/tasks/task-5-c3-controller-probe.mjs. It imports the live modules, creates a new isolated fixture and uses the installed CLI. The retained description/output above is historical evidence; the scratch script should report rejection after correction.
