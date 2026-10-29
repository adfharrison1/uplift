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
The project SHALL provide an `npm run verify` script that executes typechecking, architectural/static boundary checks, and unit tests in under 5 seconds without requiring network access, API keys, or WebGL.

#### Scenario: Post-task verification pass
- **WHEN** a developer or agent runs `npm run verify` on a valid codebase state
- **THEN** `typecheck`, `test:arch`, and `test:unit` SHALL all execute in sequence and exit with code 0

### Requirement: Hierarchical README and AGENTS documentation per codebase section
The repository SHALL maintain a master `README.md` and `AGENTS.md` at the project root that link to a dedicated `README.md` and `AGENTS.md` inside every major codebase section (`src/domain`, `src/application`, `src/infrastructure`, `src/content`, `src/interfaces`, and `tests`).

#### Scenario: Section documentation presence and root index links
- **WHEN** `npm run test:arch` executes
- **THEN** it SHALL verify that `README.md` and `AGENTS.md` exist and are non-empty in the repository root and in `src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, `src/interfaces/`, and `tests/`, and that the root `README.md` and `AGENTS.md` link to each section's corresponding file
