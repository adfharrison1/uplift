# Proposal audit

Date: 2026-11-10. Scope: planning artifacts for hx-ops-safety and its roadmap status. No runtime implementation or implementation-task completion is claimed.

Three independent reviewers used fresh contexts with the brief "high reasoning, medium-to-high model":

| Review                                                                                | Initial result | Follow-up result                                                            |
| ------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| Architecture, adversarial/security, failure containment, determinism and hardware     | Revise         | Approve                                                                     |
| Owner-decision fidelity, spec completeness, task atomicity and cold-builder usability | Revise         | Approve with a minor policy-object clarification, incorporated in design.md |
| Coherence, dev-tool practice, safety, accessibility and extensibility                 | Revise         | Approve                                                                     |

## Verified corrections

- Defined completed and pending archive directory names, every rotation transition, recovery of bytes, pruning boundaries and separate constructor/explicit-start failure semantics.
- Defined maxPreviousSessions on logger and bridge, typed filesystem fault injection, a temporary-name seam, diagnostic behavior and custom-retention acceptance.
- Specified one shared bound-port policy, positive and negative CORS preflight behavior, middleware ordering, the guarded dispatch boundary and explicit browser metadata in Node HTTP tests.
- Gave browserMain ownership of a dedicated accessible save-status sink; preserved the existing void transport and callable character-save API without adding a new wardrobe control.
- Specified stable redacted storage errors and failed-session retry behavior.
- Specified process-group/tree termination, a real grandchild test and a tracked destination for implementation timing evidence.
- Kept roadmap status proposed while active. The runtime and documentation changes remain implementation tasks.

The suggestion to retain automated semantic prose matching in skill files was checked against the owner's explicit decision to remove prose-pinning tests. Structural checks and actual runtime cap/path/query assertions stay; semantic guidance is checked by documentation review, with broader docs-truth enforcement left to its scheduled roadmap entry. The architecture reviewer accepted that disposition.

## Validation

- Strict OpenSpec validation passes.
- All four required artifact categories are complete: proposal, specs, design and tasks. All six implementation checkboxes remain open.
- The four delta specs use the actual existing capability directory names; the roadmap's older abbreviated labels were not used as new capabilities.
- Repository verification passes under Node 24.22.2: formatting, ESLint, typecheck, 8 architecture tests and 125 unit tests.
- Proposal files are also checked explicitly with Prettier because the repository ignore policy excludes OpenSpec files.
- Existing product code is unchanged. The six generated OpenSpec skills from setup were formatted to satisfy the repository gate.
- The CLI warns about an unsupported operations.propose entry in existing config. The proposal rules and three-reviewer gate were applied explicitly; no configuration rewrite is included.

These checks validate the proposal and the existing baseline. The HTTP security, rotation and parallel-runner scenarios must be implemented and tested through the six tasks before delivery. No implementation benchmark has been invented; task 5 will write verification.md.

## Review boundary

The artifacts are ready for owner review. Apply starts only on a subsequent instruction. No commit, push or archive was performed.
