# Phase 1 per-commit reviewers (2 blind reviewers per commit group)

- **Reviewer F (fidelity).** Compares `git diff` against the listed amendment ids in raw/S7-inventory-v3.json, the punch list, the rulings and the register. For each id: faithfully applied, drifted, missing or over-reached. Checks the owner's exact wording, that no valid planned content was deleted, that untargeted text is unchanged, and that change ids appear only in DESIGN_NOTES and openspec/.
- **Reviewer C (coherence).** Reads the RESULTING files as an agent would. Checks that each doc is coherent, with no dangling pointers or contradictions with untouched sections, that it is clear what is shipped and what is planned, that roadmap.yaml is valid YAML and matches plan v3, and whether the house style is too verbose.
- Both reviewers are read-only. Opus applies their verified fixes, re-runs verify, then commits.
