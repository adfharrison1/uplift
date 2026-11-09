# C5 restructure brief

Input: the committed DESIGN_NOTES.md after C4, and raw/phase1-C4-reviewC.json (duplication_map with 40 concepts, a 15-section c5_outline, verbatim_exemplars, and the issues deferred to C5).

1. **Restructurer** (high reasoning, medium-to-high model). Write the new DESIGN_NOTES.md by system, following c5_outline:
   - Merge each duplicated concept into one canonical statement and point to it from elsewhere.
   - Keep the exemplars (characters, threads, rival tells, tone benchmarks) and the owner's exact wording VERBATIM.
   - Give every section heading a short name plus one status mark.
   - Move review ids out of the prose into the traceability table.
   - State the P5 banner once.
   - Produce `reviews/.../raw/C5-traceability.md`: every paragraph of the old document mapped to its new location (or "merged into X", or "intentionally dropped as a duplicate of X").
2. **Reviewer N (no-loss)** checks every concept, number, identifier, exemplar and owner sentence in the old document against the new one, using the traceability table. It lists anything lost or altered.
3. **Reviewer C (coherence)** reads the new document fresh. It checks structure, contradictions, the shipped/planned clarity and length (a target of no growth over the current word count, ideally a reduction).
4. **Opus** fixes what they find, runs verify, and commits.
