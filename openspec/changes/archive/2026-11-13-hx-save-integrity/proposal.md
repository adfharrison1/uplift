# Proposal

## Why

The save envelope is validated, but its inner world snapshot still has a shallow check and no world snapshot migration or pack identity check. A malformed or mismatched slot can reach coordinator state or fail only during rendering; the next hardening work needs a trustworthy load boundary and repository-level reasons for unreadable slots.

## What Changes

- Add a domain `WorldStateCodec` that owns the versioned world snapshot shape, full Zod validation, a deterministic migration chain and round-trip behavior. Compare inner epoch and tick with the envelope, and reject lossy prop state before persistence. Replace the coordinator's repeated snapshot field lists with codec calls.
- Give each epoch registry a primary `packId` and positive `packVersion`; allow cameo pack registration only through an explicit import list. Stamp the save envelope with that identity and reject epoch or pack mismatches before publishing a load.
- Validate entity IDs against the character semantic-ID token pattern at registration or initial materialization and when decoding a save, before `RenderFrameBuilder` can encounter them. Include structurally unreadable slots with a stable reason in `listSlots` and its existing HTTP list response.
- Make successful slot persistence the result of `saveToSlot` even if its subsequent telemetry record fails, so retry guidance cannot imply that a durable save was lost.
- Make browser in-memory save writes and reads own their snapshot values, so callers cannot mutate a stored slot through returned or input references.
- **BREAKING:** require identity-bearing new save envelopes and report unsupported pre-change envelope files as unreadable. The owner confirmed there are no old saves to preserve; test-created saves are temporary. Synthetic historical *inner snapshots* still exercise codec migration.
- Earlier campaign saves remain loadable under the **current primary pack version**. An older version of that pack is outside this change's rollback guarantee, per the owner's clarification; matching pack versions are required.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-session-saves-and-debug-skill`: strengthen save/load and listing behavior with versioned world snapshots, pack and epoch identity, atomic rejection, observable unreadable reasons and truthful save completion.
- `modular-epoch-registries`: bind a registry to one epoch and primary versioned pack, require explicit cameo imports, and reject entity IDs that cannot form render semantic IDs.

## Impact

Depends on the archived slice-store work. Touches domain save/registry contracts, coordinator save/load, the in-memory and file repositories, the existing browser/HTTP save consumers, the proving pack and headless tests. This changes local save formats and `listSlots` results; it adds no player save UI, autosave, pack fingerprint reconciliation or campaign migration. Runtime and tests remain local with zero external API keys or cloud inference.
