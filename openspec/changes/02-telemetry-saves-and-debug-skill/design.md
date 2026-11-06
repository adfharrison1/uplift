## Context

See `proposal.md` for motivation. Change 02 (`02-telemetry-saves-and-debug-skill`) builds the epoch-agnostic observability, rolling log compaction, multi-session save/load persistence, Vite local disk bridge, and `uplift-debug` agent skill specified in `DESIGN_NOTES.md` and `openspec/config.yaml`.

## Goals / Non-Goals

**Goals:**
- Define pure, epoch-agnostic domain contracts for session telemetry (`SessionTelemetryPort`, `TelemetryEntry`, `AiReasoningTrace`) and multi-session saves (`SaveSlotRepositoryPort`, `SaveSlotEnvelope`).
- Implement fast, dependency-free Node/disk and in-memory adapters in `src/infrastructure/` supporting single-session log retention (`./logs/current-session.jsonl`), rolling compaction (`./logs/current-session.compacted.jsonl`), and multi-session save files (`./saves/<slotId>.json`).
- Provide a Vite dev-server middleware plugin (`src/interfaces/vite/localDiskBridgePlugin.ts`) so the browser client can append log batches and read/write save slots directly to `./logs/` and `./saves/` without any external backend server.
- Provide a CLI log query tool (`npm run logs:query`) and `.cursor/skills/uplift-debug/SKILL.md` so agents can diagnose simulation, AI, and rival-operative behavior rapidly.

**Non-Goals:**
- Introducing external logging/database dependencies (e.g., SQLite, Winston, or cloud telemetry SDKs) that add native compilation or network surface. Node's built-in `node:fs` NDJSON streaming is faster, zero-CVE, and 100% transparent.

## Decisions

### 1. Industry-Standard Structured NDJSON Schema (`.jsonl`)

Each line in `./logs/current-session.jsonl` is a self-contained JSON object following OpenTelemetry / Pino structured logging conventions:

```typescript
export type TelemetryLevel = 'info' | 'warn' | 'error' | 'crash';

export interface AiCandidateScore {
  readonly id: string;
  readonly score: number;
  readonly breakdown?: Readonly<Record<string, number>>;
}

export interface AiReasoningTrace {
  readonly pipeline: 'utility_ai' | 'hybrid_nlp' | 'advisory_duel' | 'rival_ai';
  readonly inputSummary: string;
  readonly outputSummary: string;
  readonly candidateScores: ReadonlyArray<AiCandidateScore>;
  readonly selectedReason: string;
  readonly omittedClauses?: ReadonlyArray<string>;
}

export interface TelemetryEntry {
  readonly sessionId: string;
  readonly sequence: number;
  readonly timestampIso: string;
  readonly elapsedSessionMs: number;
  readonly epochId: string;
  readonly worldTick: number;
  readonly level: TelemetryLevel;
  readonly category: string;
  readonly actorId: string;
  readonly acteeId?: string;
  readonly action: string;
  readonly inputs?: Readonly<Record<string, unknown>>;
  readonly effects?: ReadonlyArray<Readonly<Record<string, unknown>>>;
  readonly aiReasoning?: AiReasoningTrace;
  readonly message: string;
}
```

### 2. Rolling Compaction Algorithm (`RollingLogCompactor`)

- When `compact(retentionWindowMs)` is called (either automatically after $N$ entries or explicitly):
  1. Entries newer than `latestElapsedMs - retentionWindowMs` remain untouched in `current-session.jsonl`.
  2. Entries older than the cutoff are evaluated:
     - **High-Signal Entries (Preserved 100% Verbatim)**: Any entry where `level !== 'info'`, or `aiReasoning !== undefined`, or `category` is in `['player', 'rival', 'emergency', 'martyrdom', 'correspondence', 'orbital', 'legacy']`.
     - **Routine `info` Entries (Compacted)**: Repetitive ambient/routine `info` entries (e.g., `category: 'kinematics' | 'routine'`) sharing `(epochId, category, actorId, action)` are folded into a single `CompactedTelemetryDigest` line in `current-session.compacted.jsonl` recording `count`, `firstSequence`, `lastSequence`, `firstElapsedMs`, `lastElapsedMs`, and `sampleMessage`.

### 3. Pinned Versions Table (Verified 2026-10-29 — Zero New External Dependencies Needed)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
|---|---|---|
| Node.js LTS | `24.22.2` (`.nvmrc`) | Runtime (`node:fs`, `node:path`); includes Oct 21, 2026 security patches (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | Native Go `tsc` binary (`7.0.2`, `ES2025`, strict mode, zero `any`) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | Official TS 6.0.3 JS AST API bridge required by `typescript-eslint` |
| `vite` | `8.3.5` | Local dev server and bundler (hosts `localDiskBridgePlugin`) |
| `vitest` | `5.0.5` | Fast unit and architecture test runner |
| `eslint` | `10.13.0` (`@eslint/js` `10.0.1`) | Flat-config static analysis (`minimatch` override `11.0.4`) |
| `typescript-eslint` | `8.72.1` | Strict & stylistic TypeScript ESLint rules |
| `eslint-config-prettier` | `10.1.8` | Disables formatting rules that conflict with Prettier |
| `prettier` | `3.9.10` | Automated code formatting (`--cache`) |
| `husky` + `lint-staged` | `9.1.7` / `17.6.0` | Pre-commit formatting and linting on staged files |
| `@types/node` | `24.19.2` | Node.js type definitions |

### 4. Layer Placement & Section Documentation Updates

```text
.cursor/
  skills/
    uplift-debug/
      SKILL.md                            # Debug Agent Skill for querying logs & save files
src/
  domain/
    telemetry/
      SessionTelemetryPort.ts             # TelemetryEntry, AiReasoningTrace, TelemetryQueryFilter, SessionTelemetryPort
    persistence/
      SaveSlotRepositoryPort.ts           # SaveSlotMetadata, SaveSlotEnvelope, SaveSlotRepositoryPort
    index.ts                              # Re-exports telemetry & persistence contracts
  infrastructure/
    telemetry/
      RollingLogCompactor.ts              # Pure/deterministic compaction logic for older time windows
      NdjsonSessionTelemetry.ts           # File-backed NDJSON session logger + InMemorySessionTelemetry
    persistence/
      FileSaveSlotRepository.ts           # Disk-backed multi-session save/load under ./saves/ + InMemorySaveSlotRepository
    index.ts                              # Re-exports infrastructure implementations
  interfaces/
    cli/
      queryLogs.ts                        # CLI entrypoint for `npm run logs:query`
    vite/
      localDiskBridgePlugin.ts            # Vite dev server middleware (/api/telemetry, /api/saves)
    index.ts
vite.config.ts                            # Wires localDiskBridgePlugin into Vite
```

- **Section `README.md` & `AGENTS.md` files updated by this change**:
  - Root `README.md` and `AGENTS.md`
  - `src/domain/README.md` and `src/domain/AGENTS.md`
  - `src/infrastructure/README.md` and `src/infrastructure/AGENTS.md`
  - `src/interfaces/README.md` and `src/interfaces/AGENTS.md`
  - `tests/README.md` and `tests/AGENTS.md`

### 5. Local Dev Setup & Verification Commands

- `npm run logs:query -- --level warn`: Filters `./logs/current-session.jsonl` and `./logs/current-session.compacted.jsonl`.
- `npm run verify`: Runs `format:check`, `lint`, `typecheck`, `test:arch`, and `test:unit` in `<4s`.

## Risks / Trade-offs

- **[Risk] Disk I/O in unit tests could slow down `npm run test:unit` or pollute `./logs/`** $\rightarrow$ **Mitigation**: Unit tests use temporary OS directories (`fs.mkdtempSync(join(tmpdir(), 'uplift-test-'))`) cleaned up in `afterEach`, plus `InMemorySessionTelemetry` / `InMemorySaveSlotRepository` for pure simulation tests.
