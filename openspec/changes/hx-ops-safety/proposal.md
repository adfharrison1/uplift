# Proposal

## Why

The Vite disk bridge accepts cross-origin simple POSTs, and constructing its telemetry logger overwrites the previous session's diagnostic files. The root-and-branch review reproduced the request vulnerability twice and measured avoidable overhead in serial verification; these independent operational defects should be fixed before further gameplay work.

## What Changes

- Put every existing mutating bridge route behind one shared guard: exact loopback Origin and Host checks, restricted absent-Origin handling, JSON Content-Type, a per-server-run token, bounded body consumption, and an explicit route allowlist. Configure Vite CORS explicitly.
- Inject the token into dev HTML and send it through the existing stage-lab browser transport. **BREAKING:** unauthenticated scripts and old browser tabs can no longer mutate disk; clients must supply the current token and approved request metadata.
- Confine log, save, stage and character file operations to their configured roots, reject symlinks, and use exclusive temporary files for atomic replacement.
- Rotate previous active and compacted logs into bounded session groups under `logs/prev/`; preserve bytes on startup/rotation failure. Keep current log filenames, query behavior, schemas and compaction policy.
- Exercise the actual middleware over ephemeral loopback HTTP, including persisted-file readback and rejected requests that must leave disk unchanged.
- Run format, lint, typecheck and one combined Vitest invocation concurrently, buffer output per step, retain `verify:serial`, and require full verification after lint-staged in pre-commit.
- Remove assertions that pin skill prose or vendor model names while retaining structural documentation, skill-location, architecture, type and determinism checks. Update shipped-behavior documentation with the implementing tasks.

## Capabilities

### New Capabilities

None. Extend the existing persistence, telemetry, inspector and quality-gate contracts.

### Modified Capabilities

- `multi-session-saves-and-debug-skill`: authenticated bridge requests, early body limits and confined filesystem operations, including save temporary files.
- `stage-inspector-lab-and-dom-mirror`: authenticated stage/character writes and a browser-to-HTTP-to-file-to-GET round trip.
- `session-telemetry-and-compaction`: replace destructive single-session retention with bounded previous-session rotation.
- `clean-architecture-and-quality-gate`: concurrent verification, equivalent serial fallback, measured timing evidence, pre-commit verification and structural skill checks.

## Impact

Depends on archived `05c-play-shell`, as ordered in `openspec/roadmap.yaml`. The roadmap abbreviates two spec names; the capability paths above are the actual existing directories. Findings covered: S4-02, S4-03, the middleware-testing portion of S4-13, S4-15 and the prose-pinning/pre-commit portions of S4-16.

Implementation stays in infrastructure filesystem/telemetry adapters, interfaces bridge/browser transport, Vite configuration and repository verification tooling. No domain/application behavior or registry kind changes: all routes and storage roots are epoch-agnostic, with no pack-specific identifiers. Runtime and tests require zero external API keys, zero cloud inference, and no network beyond local loopback HTTP tests. No package upgrades or new dependencies are proposed.

## Non-goals

No browser telemetry wiring, Act log, save codec/migration, pack loader, new lab endpoint, gameplay clock, AI generation, global documentation rewrite, defect ledger or new review workflow. Those remain in their roadmap entries. No public/LAN server support or protection against a malicious process already running as the same OS user. This proposal does not implement or archive any work, and does not change the existing review gates.
