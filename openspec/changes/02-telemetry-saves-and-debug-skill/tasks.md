## 1. Domain Telemetry & Persistence Ports

- [ ] 1.1 Define epoch-agnostic telemetry and persistence contracts in `src/domain/telemetry/SessionTelemetryPort.ts` (`TelemetryEntry`, `TelemetryLevel`, `AiReasoningTrace`, `CompactedTelemetryDigest`, `TelemetryQueryFilter`, `SessionTelemetryPort`) and `src/domain/persistence/SaveSlotRepositoryPort.ts` (`SaveSlotMetadata`, `SaveSlotEnvelope`, `SaveSlotRepositoryPort`), re-exporting from `src/domain/index.ts` with unit tests in `tests/unit/domain/TelemetryAndSavePorts.test.ts` | Verify: `npx vitest run tests/unit/domain/TelemetryAndSavePorts.test.ts && npm run verify` | Commit: `feat(domain): add epoch-agnostic session telemetry and save slot ports`

## 2. Infrastructure NDJSON Telemetry, Rolling Compactor & Multi-Session Saves

- [ ] 2.1 Implement `RollingLogCompactor` (`src/infrastructure/telemetry/RollingLogCompactor.ts`) and `NdjsonSessionTelemetry` + `InMemorySessionTelemetry` (`src/infrastructure/telemetry/NdjsonSessionTelemetry.ts`) supporting single-session log retention (`./logs/current-session.jsonl`), rolling compaction (`./logs/current-session.compacted.jsonl`), and query filtering with unit tests in `tests/unit/infrastructure/NdjsonSessionTelemetry.test.ts` | Verify: `npx vitest run tests/unit/infrastructure/NdjsonSessionTelemetry.test.ts && npm run verify` | Commit: `feat(infra): add NDJSON session telemetry logger and rolling compactor`
- [ ] 2.2 Implement `FileSaveSlotRepository` and `InMemorySaveSlotRepository` (`src/infrastructure/persistence/FileSaveSlotRepository.ts`), re-export from `src/infrastructure/index.ts`, and verify multi-session save/list/load/delete and corruption handling in `tests/unit/infrastructure/FileSaveSlotRepository.test.ts` | Verify: `npx vitest run tests/unit/infrastructure/FileSaveSlotRepository.test.ts && npm run verify` | Commit: `feat(infra): add multi-session disk and in-memory save slot repositories`

## 3. Vite Disk Bridge, Log Query CLI & Debug Agent Skill

- [ ] 3.1 Implement `src/interfaces/cli/queryLogs.ts` (`npm run logs:query`), `src/interfaces/vite/localDiskBridgePlugin.ts` (`vite.config.ts`), and `.cursor/skills/uplift-debug/SKILL.md` with unit tests in `tests/unit/interfaces/QueryLogsAndBridge.test.ts` and architecture verification in `tests/architecture/layer_boundaries.test.ts` | Verify: `npx vitest run tests/unit/interfaces/QueryLogsAndBridge.test.ts && npm run verify` | Commit: `feat(interfaces): add log query CLI vite disk bridge and uplift-debug skill`

## 4. Hierarchical Documentation & 5-Subagent Review

- [ ] 4.1 Update root `README.md`, `AGENTS.md`, and section `README.md` + `AGENTS.md` files in `src/domain/`, `src/infrastructure/`, `src/interfaces/`, and `tests/` to document telemetry schemas, rolling compaction, save repositories, and `uplift-debug` | Verify: `npm run verify && npm audit` | Commit: `docs(telemetry): update hierarchical README and AGENTS guides for change 02`
- [ ] 4.2 Run the post-change 5-subagent review (adversarial, code adherence, performance, testing, logic using Composer 2.5 Fast / Grok 4.7 High Fast), double-check findings, and apply any verified improvements | Verify: `npm run verify` | Commit: `fix(review): address change 02 five-subagent review findings`
