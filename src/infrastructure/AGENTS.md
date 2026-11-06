# Agent Guide — Infrastructure Layer (`src/infrastructure/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/`, `zod`, and approved local runtime packages (`@huggingface/transformers`, Node `node:fs`/`node:path`).
2. **Forbidden Imports**: Must NEVER import from `src/application/`, `src/interfaces/`, `src/content/`, or `three`.
3. **100% Local / Zero API Keys**: Never add HTTP clients calling external LLM APIs (OpenAI, Anthropic, OpenRouter, etc.). All model weights must load from the local `./public/models/` cache after running `npm run setup-models`.
4. **Zod `safeParse` for Disk/JSON Inputs**: Always use `safeParseJsonWithSchema(rawJson, Schema)` when reading JSON or NDJSON from disk so corrupted or truncated lines/files are handled safely without uncaught exceptions or `as` casts.
5. **Telemetry Storage Caps & Save Safety**: Keep active logs within `50 MiB` and compacted logs within `500 MiB`, and always write save files via `.tmp` + `renameSync` after validating `slotId` with `validateSaveSlotId`.
6. **Fast Unit Test Fallback**: Always provide an in-memory implementation (`InMemorySessionTelemetry`, `InMemorySaveSlotRepository`) alongside disk adapters so unit and headless simulation tests run in `<3s`.
7. **Zero `any`**: Implicit and explicit `any` are forbidden.
