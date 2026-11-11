# clean-architecture-and-quality-gate Specification

## Purpose
Enforce Clean Architecture inward dependency rules, strict zero-`any` TypeScript compilation and static checks, and a single-command verification gate across the repository.

## Requirements

### Requirement: Clean Architecture inward dependency boundaries
The codebase SHALL be organized into `domain`, `application`, `infrastructure`, `content`, and `interfaces` layers with strict inward dependency direction verified automatically.

#### Scenario: Domain independence
- **WHEN** the architecture verification suite inspects `src/domain/`
- **THEN** no file in `src/domain/` SHALL import from `application`, `infrastructure`, `interfaces`, `content`, `three`, or `@huggingface/transformers`, nor reference DOM/WebGL globals

#### Scenario: Application layer independence
- **WHEN** the architecture verification suite inspects `src/application/`
- **THEN** files in `src/application/` SHALL depend only on `src/domain/` abstractions and SHALL NOT import from `infrastructure`, `interfaces`, `three`, or `@huggingface/transformers`

#### Scenario: Domain topology vs 3D scene blueprint separation in content
- **WHEN** the architecture verification suite inspects `src/content/`
- **THEN** domain content modules (`src/content/` outside `src/content/scene/`) SHALL NOT import `three` or `interfaces`, ensuring 3D presentation data never leaks into domain logic

### Requirement: Strict TypeScript and zero-any enforcement
The project SHALL compile with TypeScript strict mode flags enabled and SHALL forbid both implicit and explicit `any` across all source and test files.

#### Scenario: Strict compiler configuration
- **WHEN** `npm run typecheck` executes
- **THEN** TypeScript SHALL enforce `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitOverride` with zero errors

#### Scenario: Explicit any rejection
- **WHEN** any `.ts` file under `src/` or `tests/` contains an explicit `any` type annotation or cast (`: any`, `as any`, `<any>`, `any[]`, or `Record<string, any>`)
- **THEN** `npm run test:arch` SHALL fail and report the offending file path and line

### Requirement: Single-command verification loop

The project SHALL provide npm run verify for offline formatting, lint, type and architecture/unit verification. Format, lint, typecheck and one combined Vitest run SHALL execute concurrently with buffered output and one PASS/FAIL summary per step. Any failed or interrupted step SHALL fail the command. An equivalent verify:serial SHALL remain available. Performance SHALL be measured and recorded under the verification timing requirement.

#### Scenario: Post-task verification pass

- **WHEN** a developer or agent runs npm run verify on a valid codebase
- **THEN** format:check, lint, typecheck and one test invocation covering both architecture and unit suites SHALL start without awaiting another check, produce four PASS summaries and exit zero

#### Scenario: A failing child still gives a complete diagnostic result

- **WHEN** any check exits nonzero or cannot start
- **THEN** verification SHALL report that step as FAIL, print its buffered diagnostics without interleaving other steps' output, report every other step's result and exit nonzero

#### Scenario: Interrupted verification leaves no workers running

- **WHEN** verification receives a termination signal
- **THEN** it SHALL stop and reap its child process trees, mark unfinished steps failed and exit nonzero

#### Scenario: Serial fallback runs the same checks

- **WHEN** npm run verify:serial runs
- **THEN** it SHALL execute format, lint, type and the same architecture/unit test coverage sequentially and propagate failure; test:arch and test:unit SHALL remain separately callable

### Requirement: Hierarchical README and AGENTS documentation per codebase section

The repository SHALL maintain a master `README.md` and `AGENTS.md` at the project root that link to a dedicated `README.md` and `AGENTS.md` inside every major codebase section (`src/domain`, `src/application`, `src/infrastructure`, `src/content`, `src/interfaces`, and `tests`).

#### Scenario: Section documentation presence and root index links

- **WHEN** `npm run test:arch` executes
- **THEN** it SHALL verify that `README.md` and `AGENTS.md` exist and are non-empty in the repository root and in `src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, `src/interfaces/`, and `tests/`, and that the root `README.md` and `AGENTS.md` link to each section's corresponding file

#### Scenario: Shipped guidance distinguishes contracts from gameplay

- **WHEN** root or section guides describe a capability
- **THEN** their claims SHALL match shipped code, distinguish schema/reducer contracts from active consumers, and link future design from its canonical design home rather than describe it as implemented

### Requirement: ESLint static analysis and Prettier formatting with IDE format-on-save
The project SHALL enforce standard TypeScript ESLint rules (`eslint` + `typescript-eslint` + `eslint-config-prettier`) and Prettier code formatting across all project files, and SHALL include workspace editor configuration enabling Prettier formatting on save.

#### Scenario: ESLint check passes on valid TypeScript code and rejects lint violations
- **WHEN** `npm run lint` executes
- **THEN** ESLint SHALL validate all `.ts` files under `src/` and `tests/` with `@typescript-eslint/no-explicit-any` and standard TypeScript rules enabled and exit with code 0

#### Scenario: Prettier check verifies repository formatting
- **WHEN** `npm run format:check` executes
- **THEN** Prettier SHALL verify formatting across all repository `.ts`, `.json`, and `.md` files and exit with code 0

#### Scenario: Workspace editor format-on-save configuration
- **WHEN** a developer opens the repository in Cursor or VS Code and saves a file
- **THEN** `.vscode/settings.json` SHALL configure `editor.formatOnSave: true` and `esbenp.prettier-vscode` as the default formatter

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

### Requirement: Recorded verification timing

Verification performance evidence SHALL name the hardware, OS, Node version, dependency state, cache condition and test count. Delivery SHALL record a cold run and five comparable warm runs of parallel and serial verification, reporting warm median and maximum. The warm parallel median SHALL not exceed the serial median. Under five seconds remains the target on the 2019 Intel reference machine, not an unconditional assertion for every host.

#### Scenario: Comparable timings accompany delivery

- **WHEN** the concurrent runner is delivered
- **THEN** its recorded cold and warm timings SHALL use the same revision and checks as the serial baseline, identify whether the host is the reference machine and flag any missed reference target without a flaky wall-clock unit assertion
- **AND** the implementation's tracked verification record SHALL contain the commands, raw durations, cache preparation, median/maximum and any unexecuted native-platform coverage

### Requirement: Skill and documentation checks verify structure

Architecture checks SHALL retain root/section documentation presence and links, required project skill files and metadata, and the prohibition on .cursor/skills. They SHALL not depend on exact prose headings, sentences or vendor model names in skill instructions. Clean Architecture, zero-any and determinism enforcement SHALL remain intact.

#### Scenario: Wording edits do not invalidate a structurally valid skill

- **WHEN** a required skill retains valid name/description metadata and nonempty instructions but its headings, wording or model recommendations change
- **THEN** architecture checks SHALL continue to pass

#### Scenario: Missing or misplaced guidance is still rejected

- **WHEN** required documentation or skill files are missing, root section links are removed, skill metadata is invalid, or .cursor/skills exists
- **THEN** architecture verification SHALL fail and identify the structural violation

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
