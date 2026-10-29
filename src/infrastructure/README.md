# Infrastructure Layer (`src/infrastructure/`)

## Purpose

`src/infrastructure/` provides concrete, 100% local/offline implementations of domain ports:
- **Hybrid 3-Stage Local NLP Pipeline**:
  1. Deterministic lexical/pragmatic extractor (`<1ms` negation, speaker-target roles, speech act).
  2. Local Web Worker running quantized `Xenova/all-MiniLM-L6-v2` (`~23MB` ONNX cached in `./public/models/`).
  3. Intent combiner and deterministic fallback matcher for fast unit tests.
- **Local Persistence**: Save/load serialization for `WorldState`, `SeededRandom` seed state, and `CivilizationLegacyState` snapshots.

## Current Module Inventory

- `index.ts` — Public infrastructure layer barrel.
