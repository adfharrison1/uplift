# Agent Guide — Infrastructure Layer (`src/infrastructure/`)

## Strict Guardrails (Enforced by `npm run test:arch`)

1. **Allowed Imports**: May import from `src/domain/` and approved local runtime packages (`@huggingface/transformers`).
2. **Forbidden Imports**: Must NEVER import from `src/application/`, `src/interfaces/`, `src/content/`, or `three`.
3. **100% Local / Zero API Keys**: Never add HTTP clients calling external LLM APIs (OpenAI, Anthropic, OpenRouter, etc.). All model weights must load from the local `./public/models/` cache after running `npm run setup-models`.
4. **Fast Unit Test Fallback**: Always provide a lightweight deterministic implementation of every port alongside the Web Worker ONNX adapter so unit and headless simulation tests run in `<3s`.
5. **Zero `any`**: Implicit and explicit `any` are forbidden.
