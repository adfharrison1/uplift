# Regard web and Romantasy

Status: planned (roadmap: 06a-interpersonal-regard-and-romantasy)

Purpose: the fine-grained design of the shared Regard graph, its two-layer storage, the multi-axis edge contract and the hidden-motive Romantasy system.

Canonical summary lives in DESIGN_NOTES § Regard web and Romantasy.

## Shared on-stage and off-stage social web

Every interactable character shares the same directed `Regard` graph (`holderId -> targetId`): local visible NPCs of Tier 1 `utility_schemer` and Tier 2 `role_routine`, off-stage non-visible Correspondent NPCs, Rival Alien Operative covers, the Player Operative, and the two Culture Advisors `advisor_integral` and `advisor_particular`.

## Scaling to 500+ interactable characters on a 2019 Intel Mac (two-layer hybrid social graph)

1. **Baseline layer, zero-allocation faction/role/lineage baseline priors (`computeBaselineRegard(holder, target)`)**: unmet or unperturbed pairs never allocate memory or save-file bytes (zero cost instead of a 500 x 500 = 250,000 dense matrix); their baseline standing is computed in O(1) time from faction, institutional lineage, and role affinity rules.
2. **Sparse layer, copy-on-write materialized personal edges (`RegardGraph` plus salience pruning)**: personal `RegardEdge` records are materialized only for authored relationships and pairs that interact, correspond, witness each other, or are touched by a rumor/scheme (~15–40 personal edges per character = 7,500–15,000 edges at N = 500, `<2 MB` RAM). Stored off `EntitySimulationState` so 60Hz `stepKinematics` never clones social maps; `adjust_regard` updates a single holder's adjacency map in O(1) copy-on-write time; and edges that decay back to baseline with `bondKind: 'none'` and zero `obligation`/`exposure` are automatically garbage-collected back to Tier 1 priors.

## Multi-axis `RegardEdge` contract

- `affection` (`[-1, 1]`): warmth, attraction, personal fondness vs. scorn (softens `Temper` inertia pillars; gates private Chambers visits).
- `respect` (`[-1, 1]`): deference to competence/status (drives Contested Office coalition math and guild/military obedience).
- `trust` (`[-1, 1]`): belief in honesty/safety (gates sharing secrets, Writing Desk enclosures, and co-conspiracy).
- `dread` (`[0, 1]`): fear/coercion/reputation of danger (bypasses `Temper` under threat, hardens `Doctrine`, and triggers a Pendragon-style `torn` flag when both `affection >= 0.6` and `dread >= 0.6`).
- `obligation` (`[-1, 1]`): directed favor/hook balance (`+` = target owes holder; `-` = **reverse hook** where holder owes target; satisfies `Debt` inertia pillars).
- `exposure` (`[0, 1]`): scandal/leverage this holder knows about the target.
- `bondKind`: `'none' | 'courtship' | 'entanglement' | 'kin_claim' | 'patron' | 'rival' | 'betrayed'`.

## Triangulation, proxy co-signing and autonomous NPC-to-NPC relationships

Correspondence to off-stage NPCs evaluates relational triangles (`Regard(Correspondent -> Player)` vs. `Regard(Correspondent -> LocalTarget)`), and players can use a local ally/lover (`Player -> Ally`) to **co-sign or seal a letter**, borrowing `Regard(Correspondent -> Ally)` (O(d) 1-hop adjacency lookup in `<0.05ms`). On-stage and off-stage NPCs maintain autonomous `courtship`, `entanglement`, `patron`, and `rival` edges with each other, reacting with jealousy, stipend cuts, or leaks when their partners are seduced, exposed, or harmed.

## Manipulative Romantasy, hidden motives and 6 discovery channels

Tier 1–2 NPCs carry a hidden `RomanticMotiveBlueprint` (`genuine_devotion`, `faction_honey_trap`, `social_climber`, `martyrdom_shield`, `rival_operative_asset`, `blackmail_bond`) while player romance choices track `authentic` vs. `instrumental` stance. Players uncover an NPC's hidden motive via 6 gameplay channels:

1. **60Hz waypoint vs. conversation-promise mismatch** (the promise is a line in that NPC's conversation bubble while the player is talking to them).
2. **Writing Desk seal/transit interception**.
3. **Acoustic eavesdropping through ajar doors**.
4. **The Lamp's physiological/smell tells** (and deliberate `0.55`-loudness bronze chain clinking when the deontologist Drone resents a manipulative seduction).
5. **The Ending's statistical anomaly briefings**.
6. **Planted bait secrets**.

## Legacy

Romantic bonds, dynastic claims, and betrayals export in `CivilizationLegacyState` (`LineageBondLegacy` keyed by `lineageId`), directly shaping how lineages react when the next Epoch's operative claims kinship with their predecessor.
