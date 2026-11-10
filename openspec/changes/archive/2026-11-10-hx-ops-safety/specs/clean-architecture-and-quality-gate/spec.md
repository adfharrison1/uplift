# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
