# Reviews (local only, gitignored)

Occasional deep root-and-branch reviews of Uplift, run about quarterly with no fixed schedule. Each one covers delivered code, the undelivered roadmap (`openspec/config.yaml`) and `DESIGN_NOTES.md`.

A review produces findings here. Once the owner approves them, they become amended or new OpenSpec proposals and amendments to `DESIGN_NOTES.md`. This folder is a working register, not a source of truth for the project.

| Review | Status |
| --- | --- |
| [2026-11-08-root-and-branch](2026-11-08-root-and-branch/README.md) | Phase 1 merged; Phase 2 next (see HANDOFF.md) |

## Layout

```text
reviews/
  tools/quotecheck.py           checks that every evidence quote exists at its cited lines
  <date>-<name>/
    README.md                   status, slice index, how to resume
    framework.md                the process and the owner's decisions about it
    register.md                 every finding with its status and the owner's position
    slices/NN-<slice>.md        adjudicated digest for each slice
    briefs/                     the briefs scouts were given
    raw/                        scout and challenger JSON (evidence trail)
```

Run the quote check with `python3 -I reviews/tools/quotecheck.py <raw/file.json>`.
