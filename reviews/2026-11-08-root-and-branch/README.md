# 2026-11-08 Root-and-Branch Review

Blunt senior-game-dev review of Uplift: delivered work plus the undelivered roadmap and design notes. Sonnet subagents scout and challenge; Opus orchestrates, checks findings against the source, and synthesizes. Every finding and route gets at least two blind subagent reviews.

- Process: [framework.md](framework.md)
- All findings and the owner's positions: [register.md](register.md)
- Common scout brief: [briefs/common.md](briefs/common.md)

| # | Slice | Status |
| --- | --- | --- |
| 0 | Baseline facts | done: [slices/00-baseline.md](slices/00-baseline.md) |
| 1 | Root: vision, loop, legibility, sequencing | done, owner responded: [slices/01-root.md](slices/01-root.md) |
| 2 | Game-systems design: NPC minds, economy, content and generation pipeline | done, owner accepted (P5): [slices/02-systems.md](slices/02-systems.md), [02b](slices/02b-roadmap-reorder.md) |
| 3 | Simulation core (code) + INV-1 | done, owner accepted: [slices/03-sim-core.md](slices/03-sim-core.md) |
| 4 | Engineering health (cross-cutting) | done, owner accepted: [slices/04-engineering.md](slices/04-engineering.md) |
| 5 | Runtime, feel and presentation | done, owner accepted: [slices/05-runtime-feel.md](slices/05-runtime-feel.md) |
| 6 | Process and docs (+ amendment inventory) | done, owner accepted: [slices/06-process-docs.md](slices/06-process-docs.md) |
| 7 | Synthesis, then amendments (OpenSpec and DESIGN_NOTES, all at the end) | Phase 1 merged to main; next: see HANDOFF.md: [slices/07-synthesis.md](slices/07-synthesis.md) |

## Resuming in a new session
Start with `HANDOFF.md` (what remains, in order). Then read `framework.md`, then `register.md` (the owner pillars P1–P4 at the top are binding), then the latest slice digest. Raw evidence is in `raw/`. Run the quote check with `python3 -I reviews/tools/quotecheck.py <file>`.
