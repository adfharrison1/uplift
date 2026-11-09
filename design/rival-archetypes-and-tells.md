# Rival archetypes and tells

Status: planned (roadmap: 06-rivals-remote-evidence, 09a-doomsday-clocks-and-rival-unveiling)

Purpose: the three seed rival archetypes with their tells verbatim, and the late-game ambush and Rival Unveiling. The structured `tellProfile`, agenda and remote-evidence rules stay in DESIGN_NOTES.

Canonical summary lives in DESIGN_NOTES § Competing spacefaring civilizations (the ambush: DESIGN_NOTES § Late-game rival ambush and Rival Unveiling).

## The three seed archetypes

Rival operatives belong to competing spacefaring civilizations registered via `RivalCivBlueprint` (the 3 seed archetypes below establish the pattern; additional rival civilizations and operative covers can be registered in content packs):

1. **The Tithe (_Predatory Hegemonists_)**: Believe civilizations are forged through administered suffering and hierarchy. _Tells_: Vocabulary cluster `earn / deserve / soft / cull`; spoofed news items always use **clean round numbers** (`100 dead`).
2. **The Quiet (_Zealous Ascetics_)**: Believe surplus consciousness and ambition are a stain; want a static, incurious world. _Tells_: **Agentless passive voice** (_"It was decided"_); missing paragraphs; **deleted rumor slots** on the Wider World Overview.
3. **House Reciprocal (_Bureaucratic Mercantilists_)**: Want the civilization to advance—so every discovery arrives pre-licensed as a debt monopoly. _Tells_: **Double-entry speech** (_"in consideration of"_ applied to burials/pardons); overview rumors arriving **faster than era transit allows**.

## Late-game rival ambush and Rival Unveiling

**Conditional trigger `rival_evasive_maneuvers` (_Late-Game Rival Ship Ambush_)**: triggered when your Uplift lead pulls ahead of the leading rival civilization late-game. _The Ending_ is forced into evasive action (`watchesRemaining: null`) until you complete a 4-step groundside **Rival Unveiling**: correlate overview/mail tells, pinpoint `coverEntityId`, assemble an indigenous Office/`Regard` coalition, and publish the complete attribution so your GCU can return and neutralize their hull. The ambush counts toward the contingency scheduler's per-Epoch cap (see `design/orbital-blackout-and-contingencies.md`). A rival strike on the player is described in `design/assassination-and-cover-persecution.md`.
