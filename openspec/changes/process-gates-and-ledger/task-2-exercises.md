# Task 2 independent operator exercises

All briefs specified high reasoning, medium-to-high model. Operators were fresh independent agents, read-only, and received the exact raw note without the expected disposition. No gameplay change or inbox removal was authorized or performed. The two task reviewers separately assess fidelity and coherence.

## Real zoom note: game design and precedents

Agent: `/root/zoom_design`.

Result: already covered as planned design; canonical/status/roadmap/disposition checked and unchanged. Exact input at `notes/inbox.md:17` belongs to the 8 November 2026 dump. `DESIGN_NOTES.md:526` already provides the single yaw-neutral further-out view, status row at line 60 is planned, and disposition at line 630 retains the camera row until delivery. The existing roadmap owner and renderer prerequisite agree.

The useful loop is navigation, widening the view for orientation, and continuing with a stable directional frame. Existing volume-aware camera/readability direction supplies the project precedent; no unsupported external precedent was asserted. Hold/toggle, binding, amount, transition duration and persistence are unspecified. Later delivery should check route visibility, readable actors/proximity cues, wall occlusion and unchanged held direction. Do not expand the note into continuous zoom, free-camera scouting, another pause mode, a map, event capture or extra world information. Capture/return is separately planned.

Fidelity risks: integrated design is not shipped behavior; the inbox introduction saying it empties is not removal approval; a paraphrase does not preserve exact wording. Retain raw input and provenance. No new feature or navigation row is needed.

Controller disposition: accepted as evidence of existing coverage and safe no-op handling, not approval of the suggested future implementation checks or a new design decision.

## Real zoom note: codebase and architecture fit

Agent: `/root/zoom_architecture`.

Result: already covered as planned work; keep inbox and all document rows unchanged. Source trace: `playInput.ts:145` handles pause/de-anchor and paused arrow-key translation; `PlaySession.frame` sends free-camera offset to `RenderFrameBuilder`; `RenderFrameBuilder.ts:524` uses focus plus authored volume offset; `ChiaroscuroStageRenderer.ts:261` consumes position/lookAt/roll/projection. No zoom input/scalar appeared in inspected contracts or the operator's source/test search. Paused translation moves position and lookAt together and does not provide the requested further-out view (`RenderFrameBuilder.ts:632`).

Volume yaw/pitch fields are stored/smoothed but ordinary direction comes from offset-to-focus geometry; atmospheric pitch separately adjusts lookAt Y. The already planned control-frame item addresses this distinction. Reuse interfaces input, application framing/presentation state, authored content parameters and the thin Three.js consumer. No domain mechanic or epoch-specific logic is required. Existing renderer prerequisite remains; later capture/return is a separate item and should not become a zoom prerequisite. No new task split is needed during this exercise; later proposal must prove input-to-rendered-camera behavior.

Controller disposition: accepted; inspected current framing/input source for the load-bearing planned-versus-shipped distinction. Suggestions for future task division remain suggestions, not new roadmap decisions. Raw wording and canonical home remain unchanged.

## Real zoom note: pacing, hardware and coherence

Agent: `/root/zoom_pacing`.

Result: already covered as planned; verify and retain canonical/status/disposition text and all inbox input. The accepted locomotion scope (`DESIGN_NOTES.md:523`) does not advance watches, spend storyteller budget or open audio; room activity and campaign watches remain separate (line 244). Nothing supports adding zoom cost, cooldown, time acceleration, budget consumption or plot release. Wider framing may expose geometry/information, a future implementation concern rather than a reason to invent an information restriction. Free camera, world overview, continuous ranges and event capture are extra scope; capture already has its own home.

The scalar does not justify extra simulation, stage loading or remote services. Retain the accepted one-canvas/resident-stage design (line 517) and planned renderer dependency (line 540). Wider framing may alter draw cost; target-machine 60 FPS requires later measurement and was not measured in this exercise. No binding, multiplier, animation, persistence or hold/toggle choice was inferred. The inbox introduction is not removal approval; exact wording and neighbors remain intact.

Controller disposition: accepted as a coherent existing-coverage assessment. No gameplay or hardware performance assertion is promoted to implemented behavior.

## Cold debugging and additional workflow scenarios

Agent: `/root/debug_forward`. The brief gave a browser-play/reload/empty-AI-query scenario and asked about inference, retention, recovery and replay without supplying expected answers. It also asked how to handle an unapproved unfamiliar mechanic and an approved feature-document move with over-budget config.

Result: no material workflow gap blocked either exercise. Empty disk results do not prove AI never ran. Browser boot injects bounded in-memory telemetry and Map-backed saves (`browserMain.ts:107,349,434`); reload discards them. Visual-asset transport is not campaign telemetry/save wiring (`bridgeTransport.ts:24`). The operator found the AI schema but no `aiReasoning:` producer; coordinator phase/effect events do not supply reasoning. That is an instrumentation limit, not evidence of what happened in the lost session.

Starting the dev server constructs a logger that starts/rotates/prunes sessions (`localDiskBridgePlugin.ts:605`, `NdjsonSessionTelemetry.ts:258`); it cannot recover discarded browser memory. Establish build/session/adapter, stop relevant writers before recovery, preserve current/archive/pending bytes and diagnostics, check identity and use read-only queries against identified directories. The operator recovered all actual query flags, exact level semantics, fixed current filenames, malformed-line skipping, elapsed/sequence order, explicit archive selection, inclusive tick bounds and whole-count digest overlap/actee/reasoning limits. It did not invent limit/tail/help/recursive flags.

Preserved means not digested, not permanent. The active trigger, 60-second default window, compacted eviction tiers, three completed archive groups and explicit pending recovery were correctly distinguished. The two compaction-file replacements are not jointly atomic. RNG plus arbitrary slices is insufficient: coordinator world/custom-slice snapshots, legacy state, matching code/content/registry, pacing/clock and input/effect/frame-step sequence are needed; preserve the original save.

For the unfamiliar mechanic the operator retained raw wording/provenance, canonical checks, primary-source research, three perspectives, concrete synthesis/dispositions and approval before design edits. For the approved move it reused applicable approval, required a block-level no-loss map and two independent reviews before cutting, preserved exact language/numbers/exemplars/pointers, checked all navigation/disposition rows, measured budgets and reported debt without cutting meaning. It retained separate structural work and three final assessors; no automatic proposal/commit.

Controller disposition: accepted. The browser wiring and AI-trace absences are already explicit partial/planned design (`DESIGN_NOTES.md`, Telemetry policy; roadmap `telemetry-wiring`, with replay tracing at `05f-eval-and-replay`). The absence of live save-slot callers is also explicit in the legacy consumer table. This documentation task does not claim to implement those systems or create duplicate runtime findings; future implementation remains with its canonical roadmap scope. Existing design prose saying the active cap holds needs task 3's truth pass against the actual trigger semantics; retained as document debt in the inventory.

## Scope and verification limits

The three zoom perspectives are separate independent research reports. No design batch was integrated, so no actual post-integration final-assessment batch is claimed; the rewritten skill retains that three-perspective requirement for future integrations. The two task reviewers separately check fidelity/no-loss and coherence of this rewrite and exercise. All live inbox/design/navigation/roadmap files remain unchanged. No gameplay performance measurement, live browser trace recovery, AI replay, feature move or inbox drain was performed.
