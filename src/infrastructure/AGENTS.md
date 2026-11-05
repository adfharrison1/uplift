# Agent Guide — Infrastructure Layer (`src/infrastructure/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/` and approved local runtime packages (`@huggingface/transformers`, Node `node:fs`/`node:path` for local CLI/Vite middleware).
2. **Forbidden Imports**: Must NEVER import from `src/application/`, `src/interfaces/`, `src/content/`, or `three`.
3. **100% Local / Zero API Keys**: Never add HTTP clients calling external LLM APIs (OpenAI, Anthropic, OpenRouter, etc.). All model weights must load from the local `./public/models/` cache after running `npm run setup-models`.
4. **Telemetry & Save Determinism**: Log all AI inputs, outputs, and reasoning chains to `./logs/current-session.jsonl`, and ensure rolling compaction never drops `warn`, `error`, `crash`, player, rival, or AI reasoning events.
5. **Fast Unit Test Fallback**: Always provide a lightweight in-memory/deterministic implementation of every port alongside disk/ONNX adapters so unit and headless simulation tests run in `<3s`.
6. **Zero `any`**: Implicit and explicit `any` are forbidden.
