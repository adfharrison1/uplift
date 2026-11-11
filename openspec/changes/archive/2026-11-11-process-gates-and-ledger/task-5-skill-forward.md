# Cold archive skill exercise

Executed the installed `openspec-archive-change` skill and its linked delivery contract against synthetic `alpha` only, using the supplied brief. Fixture root: `/private/var/folders/ch/7k3l_gw51w9d8cvqkwjj9kfw0000gn/T/uplift-real-archive-9FpuSl`. The fixture remains available for controller inspection and cleanup.

The existing explicit owner archive authorization was sufficient. No repeated permission request, new review round, delegation, manual synchronization, manual move, staging, commit, push, or global configuration change occurred. Supplied review manifests/proofs and completion claims were synthetic preconditions, not real product reviews. No other implementation review, baseline, expected-answer, or scratch no-loss artifact was read.

## Commands and preflight

All operational commands below ran from the fixture root. Commands using `npm` had this exact prefix:

```sh
env PATH=/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin:$PATH OPENSPEC_TELEMETRY=0 DO_NOT_TRACK=1
```

The first command, that prefix followed by `openspec list --json`, exited 134: the installed launcher hardcodes `/opt/homebrew/opt/node/bin/node`, whose `libsimdjson.34.dylib` is missing. Inspection used `command -v openspec` and `head -n 3 "$(command -v openspec)"`. Subsequent CLI reads used the same installed CLI with the supported Node runtime, with this exact prefix:

```sh
env OPENSPEC_TELEMETRY=0 DO_NOT_TRACK=1 /Users/alan.harrison/.nvm/versions/node/v24.22.2/bin/node /opt/homebrew/bin/openspec
```

Commands appended to the CLI prefix, all exit 0:

```sh
list --json
instructions archive --change alpha --json
status --change alpha --json
instructions apply --change alpha --json
validate alpha --strict
```

The list resolved the exact fixture root with source `nearest`. Status reported schema `spec-driven`, repo-local planning/action context, and all four artifacts done. Apply reported `all_done`, total 1, complete 1, remaining 0. Archive instructions supplied neither context nor operation guidance. Strict validation returned `Change 'alpha' is valid`.

Read the schema-returned delta at `openspec/changes/alpha/specs/fixture/spec.md`, `final-reviews.yaml`, roadmap and tracked-file inventory (`git ls-files openspec/changes/alpha`). Six distinct synthetic reviewers covered the six required dimensions with passed records and tracked digest references. Main spec `openspec/specs/fixture/spec.md` did not yet exist. The planned sync was one ADDED requirement, `Fixture operation`, with its `Successful operation` scenario; no modification, removal or rename.

Commands appended to the npm prefix:

```sh
npm run defects -- reconcile --check
npm run defects -- list --json
npm run change:archive -- alpha
```

Preflight reconciliation returned `{"ok":true,"active":1,"resolved":0}`. The only active finding was `D-1`, verified, owned by `alpha`, revision 3, with retained fix/test/review evidence. The archive command ran once and exited 0:

```json
{
  "state": "finalized",
  "change_id": "alpha",
  "archive_path": "openspec/changes/archive/2026-11-11-alpha",
  "ids": ["D-1"],
  "reconcile": { "ok": true, "active": 0, "resolved": 1 }
}
```

## Actual consumers and files

Readback commands appended to the npm prefix, all exit 0:

```sh
npm run roadmap:next -- --json
npm run defects -- list --include-resolved --json
npm run defects -- reconcile --check
```

- Roadmap consumer: `state: ready`, `active: []`, `next: beta`, `blocked: []`.
- Combined defect consumer: `D-1` is resolved at revision 4, retained history includes `Validated archive finalization`, and `pending: []`.
- Reconciliation: `{"ok":true,"active":0,"resolved":1}`.
- CLI-prefix `list --json`: `changes: []`, same local root.
- Receipt readback: `openspec/changes/archive/2026-11-11-alpha/defect-resolution.yaml` has `state: finalized`; its original verified record and resolved record are retained.
- Roadmap file: `alpha` has `status: archived`, `archive_protocol: v1` and its receipt locator; `beta` remains planned.
- Active ledger: revision 4, `entries: []`.
- Generated main spec: `openspec/specs/fixture/spec.md` contains the original purpose, `Fixture operation` SHALL requirement, and `Successful operation` WHEN/THEN scenario under normal main-spec headings.
- Filesystem checks: active `alpha` and `openspec/archive-transaction.yaml` are absent; archived `.openspec.yaml` exists.

No recovery was necessary. Archive success is supported by receipt, files and consumer readback, not just CLI exit status.

## Limits and integrity

`npm run verify` with the npm prefix exited 1 because this fixture has no `verify` script. No full-project verification claim is made; the brief supplied completed synthetic verification as a precondition, and actual archive validation/reconciliation/readback passed. Direct CLI invocation required the explicit Node workaround above; the archive wrapper itself succeeded without launcher edits. No scope or permission ambiguity remained.

This report is the sole live-project edit made by this exercise. Existing working-tree changes were inspected and preserved. Live design/status indices, roadmap and dispositions remain unchanged because this records isolated test evidence and introduces no product or workflow capability. No existing document text was moved or cut. Additional document review rounds were excluded by the brief.
