## MODIFIED Requirements

### Requirement: Hierarchical README and AGENTS documentation per codebase section

The repository SHALL maintain a master `README.md` and `AGENTS.md` at the project root that link to a dedicated `README.md` and `AGENTS.md` inside every major codebase section (`src/domain`, `src/application`, `src/infrastructure`, `src/content`, `src/interfaces`, and `tests`).

#### Scenario: Section documentation presence and root index links

- **WHEN** `npm run test:arch` executes
- **THEN** it SHALL verify that `README.md` and `AGENTS.md` exist and are non-empty in the repository root and in `src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, `src/interfaces/`, and `tests/`, and that the root `README.md` and `AGENTS.md` link to each section's corresponding file

#### Scenario: Shipped guidance distinguishes contracts from gameplay

- **WHEN** root or section guides describe a capability
- **THEN** their claims SHALL match shipped code, distinguish schema/reducer contracts from active consumers, and link future design from its canonical design home rather than describe it as implemented

### Requirement: Husky and lint-staged pre-commit quality hooks

Every git commit SHALL run lint-staged followed by the full verification gate. Formatting, lint, type, architecture or unit-test failure SHALL abort the commit. The hook SHALL not stage unrelated working-tree files.

#### Scenario: Pre-commit hook runs lint-staged on staged files

- **WHEN** a developer or agent runs git commit
- **THEN** the hook SHALL run npx lint-staged and, only on success, npm run verify before the commit is recorded

#### Scenario: Full verification failure blocks a commit

- **WHEN** staged formatting passes but typechecking, architecture checks or unit tests fail
- **THEN** the commit SHALL abort with a nonzero result and the failing check's diagnostics

#### Scenario: Failed staged checks stop the hook

- **WHEN** lint-staged fails
- **THEN** the hook SHALL abort without reporting successful verification or recording a commit

#### Scenario: Nested Git fixtures under a partial commit

- **WHEN** the verification tests run with an inherited alternate Git index or repository environment
- **THEN** temporary repository fixtures SHALL use their own Git state, preserve the caller repository and still test both passing and rejected commits

## ADDED Requirements

### Requirement: Documentation truth checks use canonical sources

Architecture verification SHALL resolve root guide identifiers, npm commands and skill paths against current code and manifests; check Node compatibility and version claims; resolve planned roadmap references and design-file index coverage; enforce documentation budgets and citation policy; and validate roadmap and defect consistency. Existing architecture, zero-any and determinism checks SHALL remain intact.

#### Scenario: Broken factual reference

- **WHEN** root guidance names a missing code identifier, npm script or project skill, a planned marker names an absent roadmap entry, or a feature design file lacks an index row
- **THEN** architecture verification SHALL fail with the offending document and reference

#### Scenario: Numeric and version facts

- **WHEN** root guidance states an implementation numeric fact or README repeats a package version
- **THEN** the assertion SHALL resolve to the canonical source or match the manifest; the Node pin SHALL satisfy package engines rather than equal a version range as text

#### Scenario: Budgets and citations

- **WHEN** root AGENTS exceeds 1,050 whitespace-delimited words, config context reaches 1,500 words, or live guidance cites a change outside its permitted design homes
- **THEN** architecture verification SHALL fail without applying a hard 14,000-word ceiling to DESIGN_NOTES or rewriting immutable historical review evidence

#### Scenario: Valid prose and navigation index

- **WHEN** guidance is reworded without changing its facts and design/README.md remains the navigation index
- **THEN** checks SHALL accept the prose without exact-sentence assertions and SHALL require index rows for feature design documents, excluding the navigation index itself

#### Scenario: Invalid ledger or roadmap

- **WHEN** an active defect names an archived or missing owner, a receipt awaits finalization, or roadmap validation fails
- **THEN** the existing offline architecture test command SHALL fail with actionable diagnostics without recursively invoking full verification
