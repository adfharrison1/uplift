# C5 fixes: no-loss review (reviewN) and coherence review (reviewC)

Files edited: `DESIGN_NOTES.md`, `reviews/2026-11-08-root-and-branch/raw/C5-traceability.md`. Nothing committed. Word count after fixes: 19,601 (was 19,095 before the fixes; nothing else was shortened).

## reviewN

| Item | Result |
| --- | --- |
| lost: Engineering rules subsection headings lost their owner ids | applied: every Engineering rules heading carries `(planned: <ids>)` again (Bridge lock, Determinism, State, Launch validation, Telemetry policy, Tests); inline marks restored on Interpolation seam, Phase order, Tests and builders, Layer-test blind spots, Scripted command log |
| lost: R6 lost "(desaturation, free-cam, picking)" and "interface flag" | applied |
| lost: "built by hx-ops-safety" dropped from Pacing Lab, Sound Lab, Bridge lock | applied: Pacing Lab and Sound Lab say "planned, built by hx-ops-safety"; Bridge lock helper bullet is `(planned: hx-ops-safety)` |
| lost: no Core model terminology row; cognition row lost `06-utility-ai` | applied: row added; cognition row is partial and lists `06-utility-ai` |
| lost: `06-rivals-remote-evidence` on Text pipeline row; Delivery mark | applied: both; also the vague "utility-AI and advisor change" now names `06-utility-ai` |
| lost: Clock 1 "(see Loop cycles)" | applied |
| altered: per-observer `discoveryLayer` triggers | applied as the deliberate fix, kept: Observation primitive, noisy miracle, rival strike and `extracted_overt` now say the threshold applies to the observing faction's derived discovery level, not a global ordinal |
| altered: storylet-card open question | applied: old text restored in Open, deferred and parked and in the Storyteller deck "Open question" bullet. The route and finding labels in the old line ("route RC/R7, finding S2-08") are not restored: they are the undefined review labels the coherence review asks to remove, and "R7" would collide with spine rule R7 |
| altered: cognition row shipped vs partial | applied: heading and index row are partial |
| altered: detection-tech chains merged | applied (see next row) |
| merged_wrongly: two detection-tech chains | applied: the Orbital Pass row chain is verbatim in The configurable ladder (Detection Tech Level bullet); the contingency-pool chain is verbatim on `solar_flare_interdiction` |
| traceability: Lab-save row (pointers) | applied: pointers added to Play shell Session and Pacing Lab (Stage lab and Sound Lab already had them); row corrected |
| traceability: Play shell row (caveat) | applied: pointer added in Play shell; row reworded |
| traceability: Status index row quoting | applied: actual wording quoted |
| traceability: Talk cost row | applied: pointer in Clock 1; row says paging and Clock 1 carry it |

## reviewC (high and medium, DESIGN_NOTES.md)

| Item | Result |
| --- | --- |
| high: advisor blueprint schema claimed shipped | applied: status says only the drone-disguise mesh is shipped and no advisor blueprint exists; "The Culture advisory pair" is planned |
| high: root `AGENTS.md` contradicts DESIGN_NOTES | skipped: out of scope, carried to another change |
| medium: Frame and pillars marked shipped | applied: section and index row are partial; Pillars subsection stays shipped; index lists `11-epoch1-content` and `11-epoch-ending-and-handoff-hook` |
| medium: archived `05c-play-shell` as owner; Rules spine and System graph rows owned by `docs-spine-and-roadmap` | applied: play shell row says none; the Rules spine and System graph rows list the owning changes; Play shell text says the change is archived and owns nothing unshipped |
| medium: undefined review labels and the "R6" collision | applied: Considered and rejected rows use titles, "Finding S1-nn" or "Investigation conclusion INV-x"; the intro defines them and points to `reviews/2026-11-08-root-and-branch/register.md`; no bare route R-number remains |
| medium: stale "via `SeededRandom`" wording | applied: contingency pool, scheduler, both advisory-pair places and the travel vignette rolls now say the keyed `roll(worldSeed, streamKey, counter)` |
| medium: dangling pointers | applied: "see Audio"; epoch-transition pointer now names Operative rotation; "§9" gets "in the old numbering"; forecast owner is `09-delta-coupling-and-forecast`; advisor delivery names `06-utility-ai` |
| medium: `orbitalContingencyLedger` presented as present | applied: tagged `(planned: 09a-doomsday-clocks-and-rival-unveiling)` and noted absent from code |
| medium: parked list incomplete | applied: all 16 parked roadmap entries are named, plus `11-epoch-ending-and-handoff-hook` and `11-playtest-and-tuning` |
| medium: Where facts live missing duplicated facts | applied: 9 owner rows added (save policy, talk cost, chunk cap, audibility, pause bit, comms backbone, Detection Tech chain, palette, voice register and tone blips); the duplicates were not collapsed, since length is a separate decision |

Low-severity reviewC items were not in scope and were not touched.

Verify: `npm run verify` passes.
