---
name: openspec-archive-change
description: Archive a completed OpenSpec change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete. Also use when the user says "openspec archive" or "opsx archive".
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: '1.0'
  generatedBy: '1.14.3'
---

Archive a completed change through the project's checked transaction wrapper.

Read [uplift-review-gates](../uplift-review-gates/SKILL.md) and its delivery procedure. All tracked tasks, six independent final delivery reviews, G1–G6, strict validation and defect reconciliation precede owner archive approval. Preserve existing explicit approval; do not ask twice. Completion warnings are blockers here, not an invitation to override checks. The wrapper owns full spec synchronization, the archive move and receipt/ledger/roadmap finalization. Never manually sync before archive, move the directory yourself, or pass skip-validation/spec flags.

The wrapper supports only this repository's local OpenSpec root. Store discovery below may explain where work lives, but an external, declared or global store is outside this transaction contract: report the resolved scope and stop before preparing files or invoking archive. Do not retarget another repository as a workaround.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Project check:** These steps expect a project that already uses OpenSpec. Before the first step that writes anything (`new change`, `archive`, `sync specs`, or authoring an artifact file), confirm the project has a root: run `openspec list --json` (with `--store <id>` when a store is selected, since the store is then the root) and read `root`. A root object means the project is set up. `"root": null` means it is not - there is no `openspec/` directory here, and a write such as `openspec new change` would create one as a side effect. The command also exits non-zero, which is that answer rather than a broken CLI, so read the JSON instead of retrying or working around it.

One `"root": null` is not about setup: when a `status` error message starts with `Declared in` or `Invalid store declaration in` and names this project's `openspec/config.yaml` (or `config.yml`), the project does use OpenSpec through a store it declares, which this machine cannot resolve (the store is not registered, or the `store:` line is malformed). Do not treat it as uninitialized and skip the branches below: stop before writing and show the user that error's `message` and `fix`.

Otherwise, with no root, what happens next depends on how this workflow was reached:

- **Auto-selected**: you chose this workflow yourself, without the user naming OpenSpec, naming this skill, or running its slash command. Stop using OpenSpec and answer the request normally, as you would with no OpenSpec installed. Do not ask them to set anything up and do not mention OpenSpec setup.
- **Explicit OpenSpec request**: the user named OpenSpec, named this skill, or ran its slash command. Stop before writing and ask how to proceed: set this project up (`openspec init`), target a store they already have (`--store <id>`), or continue without OpenSpec for this request. Wait for their answer.

In both branches, never create the root as a side effect: do not run `openspec init` until the user asks for it, do not hand-create `openspec/` files, and do not let a command create it.

`<capability-path>` is the spec directory relative to `specs/` (for example, `user-auth` or `identity/user-auth`). Preserve the full path from each delta spec when resolving its main spec.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and ask the user to select one

   When prompting, show only active changes (not already archived).
   Include the schema used for each change if available.

   Always announce: "Using change: <name>" and how to override (e.g., `$openspec-archive-change (Codex) or /openspec-archive-change (other agents) <other>`).

   **Load current archive inputs before the existing archive checks:**

   After resolving the selected change and planning root, run:

   ```bash
   openspec instructions archive --change "<name>" --json
   ```

   Keep the same selected-root flags on this command. This lookup is advisory and
   optional: it only supplies extra prompt inputs, so it must never block archiving.
   If it exits non-zero or returns invalid JSON — for example on an older CLI that
   does not support this command yet — continue the archive workflow with no
   context and no operation guidance. Do not report an error and do not stop.

   A successful response may omit both optional fields. Treat `context` as a
   required prompt-level input: read and consider it, and apply relevant project
   facts, conventions, and constraints. Treat `operationGuidance` as optional
   additive advice: read and consider every entry, and follow entries that are
   applicable and compatible with the built-in archive workflow.

   Keep both fields separate from built-in steps, explicit user choices, resolved
   paths, CLI checks, and command contracts. If context conflicts with one of those
   controlling inputs, report the conflict and preserve the controlling value. If
   guidance is inapplicable or conflicts with a controlling input, do not follow it
   and explain why. Do not infer replacement paths, skipped prompts, or flags from
   either field, and do not copy their text verbatim into specs, change artifacts,
   or archive summaries unless the user separately asks for it. These are
   prompt-level behavior contracts, not enforceable checks.

2. **Prepare a reviewable archive**

   Read `openspec status --change "<name>" --json` and `openspec instructions apply --change "<name>" --json` with the selected scope. Use `schemaName`, `planningHome`, `changeRoot`, `artifactPaths`, `actionContext`, the schema's tracked task paths and CLI progress. Require all required artifacts done or explicitly skipped and all tracked tasks complete; zero tasks is allowed when the schema reports that state. A missing top-level tasks.md proves nothing. Invalid JSON, duplicate/missing selected list entries, malformed task counts or blocked instructions stop the workflow.

   Assess the delta specs named by `artifactPaths.specs.existingOutputPaths` against their full capability paths beneath the resolved main-spec root. Summarize intended additions, modifications, removals and renames for the owner. Missing main specs can be valid outputs for ADDED requirements; they do not prove prior synchronization. Strict validation and the installed full archive command determine whether merges, new capabilities or explicitly declared retirements are valid. Do not synthesize a merge, fetch specs rules for an agent-written merge, or run the sync skill as part of archive. If a delta was already manually synced, or sync state is conflicting/unclear, stop for inspection; neither “sync again” nor “archive without syncing” is a supported recovery.

   Run `openspec validate "<name>" --strict` with the selected local scope and stop on failure before presenting the archive for approval. The wrapper repeats strict validation independently before preparation.

   Run `npm run defects -- reconcile --check`. Every defect still owned by the selected change must be verified, including parked findings: resolve or explicitly reassign them with evidence before archive. Preserve unresolved findings and immutable history. Retain six independent final reviews using the `final-reviews.yaml` contract in [the command guide](../../../README.md#archive-and-recovery); evidence files must be tracked and their recorded digests current. The wrapper checks records and integrity; semantic review and owner approval remain workflow duties.

3. **Obtain archive approval**

   Present the selected change, schema, resolved local root, completion/review/reconciliation results and intended spec changes. Ask for owner approval only if it has not already been explicitly given. Earlier approval to implement or commit is not archive approval. Do not treat runtime context, operation guidance, review records or a successful check as permission.

4. **Run the checked archive once**

   After approval, from the repository root run:

   ```bash
   npm run change:archive -- <name>
   ```

   The wrapper holds the shared exclusive project lock across local-root checks, schema completion, six review records, strict validation, receipt/journal preparation, root recheck, one noninteractive full CLI archive and consumer-checked finalization. The CLI preserves .openspec.yaml and owns archive naming and spec synchronization. It may preserve an original date prefix; do not compute or rename a destination manually. Conflicting/ambiguous identities fail closed.

   Only report success from finalized receipt, roadmap, combined resolved list and reconciliation readback. Report the actual returned archive path and resolved finding IDs. A CLI success alone is insufficient.

5. **Handle interruption explicitly**

   Preserve the command's diagnostics and generated receipt/journal. Never retry ordinary archive on an existing transaction or remove a project lock without inspecting its owner and confirming no writer remains.

   - **Before the move:** after inspecting the cause, `npm run change:archive -- <name> --resume` refreshes all prerequisite checks and continues the existing prepared transaction. To cancel instead, use `npm run defects -- reconcile --cancel --change <name>`. Exact preimages must remain intact; cancellation removes only generated transaction state.
   - **After the move:** use `npm run defects -- reconcile --repair --change <name>` or the same `change:archive -- <name> --resume`. Recovery finalizes proven matching state without invoking archive again. Repeated repair is idempotent; cancellation is forbidden after the move.
   - **Conflicts, missing receipts or bypass archives:** stop and retain evidence for an explicit operator decision. Do not hand-edit the ledger/history, extend legacy exemptions, guess a receipt or overwrite external edits. Report pending affected IDs from `npm run defects -- list --include-resolved --json` where readable and run reconciliation again after recovery.

**Summary**

Show change, schema, actual archive location, full spec-sync outcome, resolved finding IDs and consumer reconciliation result. If interrupted, show the preserved state, affected IDs and exact applicable recovery command; do not claim completion. Keep runtime context/advice separate from authoritative checks and never copy it into artifacts or summaries without a separate user request.
