# Slice 4: Engineering health (guardrails, registry and content pipeline, tests, telemetry, disk bridge)

## How this slice was reviewed
1. Three scouts filed 23 findings. Probes ran in the scratchpad only, and the repo was confirmed clean afterwards.
2. All quotes passed the quote check.
3. Opus checked two things directly: that lab saves are never loaded, and Vite 8.3.5's default CORS policy.
4. The findings were consolidated to 18, plus 11 routes.
5. Four blind challengers reviewed them:
   - **ch1** falsified 10 claims using its own lint and regex probes, and re-timed verify. Result: 8 hold, 2 overstated.
   - **ch2** falsified 8 claims and **independently reproduced the bridge CSRF** on a live 127.0.0.1 probe with a scratch logs dir. Result: 6 hold, 2 overstated.
   - **ch3**, the architect, wrote the amended hardening batch.
   - **ch4**, the security and DX lead, gave its top 3.

Every finding was reviewed at least 3 times, and every route at least twice. Evidence is in raw/S4-*.

## Headline
**The guardrails look stronger than they are, and two features already "shipped" don't do what the docs say.**
- The F3 stage lab's Save writes JSON that nothing ever loads.
- The game's logging pipeline isn't fed (S0), and the logger wipes the previous session each time it starts.
- The determinism and layer guards are regexes that miss most bypass forms, and `src/application` (where `tick` will live) has no determinism rule at all.
- The dev-server disk bridge accepts a simple cross-origin POST from any web page. It is reproduced twice.

The good news: the path handling is tight, the server binds to loopback, Vite's Host check works, the suite is fast and free of snapshots, and tsconfig delivers every promised flag.

## Amended hardening batch (ch3, endorsed by Opus; ch4 agrees on priorities)
- **0a. Bridge lock (first, independent).**
  - One guarded write-route helper. It enforces an exact Origin allow-list (absent Origin is acceptable only with `Sec-Fetch-Site: same-origin` or `none`), the Host header, `Content-Type: application/json`, a per-run token header, size limits (destroy over-cap streams), and allowlisted paths with realpath/lstat containment and no symlinks.
  - Set `server.cors` explicitly rather than relying on the default.
  - The logger constructor must never truncate. Rotate the previous session into `logs/prev/`.
  - Add a real http middleware test on `127.0.0.1:0`.
  - Opus correction to ch4: Vite 8.3.5 already limits default CORS to localhost origins (`defaultAllowedOrigins`), so a foreign page can't read a token out of the HTML. The token is sound, but the Origin check is the part that does the work, because CORS blocks reading the response, not sending a simple POST.
- **0b. Faster, louder verify.**
  - Run format, lint, typecheck and vitest in parallel, with buffered output and one PASS/FAIL line per step. Measured at 2.4–3.1 s, against 5.3–6.7 s today. Keep `verify:serial`.
  - Delete the arch tests that pin SKILL.md sentences and the lint-staged array; keep the file-existence checks and the `.cursor/skills` ban.
  - Pre-commit runs verify.
- **Steps 1–7** are as accepted in slice 3, with these additions:
  - **Step 3** (state slices): the shared test builders `makeRegistry`, `makeWorldState` and `makeStageBlueprint` land in `tests/support`. Split a monolithic test only when the change touches it.
  - **Step 4** (codec): store `packId` and `version` on the registry and in the save envelope. Record the decision "one registry per epoch; cameo content via an explicit import list".
  - **Step 6** (tick + golden run): the golden run is built on one headless harness, `src/application/headless/runScenario`, which 05f will reuse. It includes a **shuffled-insertion run** and a run where **Math.random and Date stubs throw**, plus a slice JSON round trip and a PHASES-order test. It also gets **one ESLint determinism block** (`no-restricted-properties` / `no-restricted-globals`) covering domain, non-scene content and application, which replaces the regex copy. Ban `node:*` imports, `require`, and non-literal `import()` in domain and application.
- **Before the first new kind (start of 05b-1):**
  - `validateLaunch(pack, stages, visuals)` collects every error with an id and a file hint, and runs in the PlaySession constructor and every pack test.
  - The epoch-agnostic denylist is derived from every exported pack's ids and moved into `tests/architecture`.
  - The registry gets a ref table now (remove the duplicate check, add the missing `institutionalLineageId` ref), plus the `defineModuleKind` kind table.
  - **Docs truth pass:**
    - rewrite the content AGENTS recipes to the steps that work today;
    - fix the stale HF/ONNX pointers;
    - add a caveat on the lab Save;
    - add a doc check that every `*Blueprint` named in an AGENTS.md exists, unless it is tagged "(planned)";
    - move the Charnel test fixtures out of the content barrel.
  - **Lab source of truth.** The split between ch3 and ch4 is ruled below.

## Rulings on disagreements
- **Lab source of truth (S4-01 / R4B2).** ch3 said "later". ch4 said "first: JSON is the source of truth, no TS emission". Both reject a JSON-to-TS compile step, which ch4 calls a code-injection path for SLM-authored strings. **Opus rules:** decide the direction now. JSON packs and stages are the source of truth, loaded and Zod-checked at runtime through `validateLaunch`, with no emitted TS. The bridge writes only allowlisted, schema-checked files. Build it with `validateLaunch` at the start of 05b-1, because P1's collaborative authoring loop depends on it. Until then, the docs say the Save button doesn't persist.
- **Compiler API / dependency-cruiser (R4A1).** ch3 rejected it and ch4 amended it to "later". **Parked**, because ESLint `no-restricted-imports` plus a syntax ban covers the gaps.
- **Telemetry fixes (S4-14).** **Ruling:** do them with the S1-R11 telemetry wiring: query limits, count-by, honest skill text, a newline guard and an ENOSPC warning. Use segmented logs only if needed.

## Findings (final)
| ID | Sev | Slot | Finding (post-challenge) |
|---|---|---|---|
| S4-01 | major | 05b-1 (decision now) | Stage-lab saves write JSON that nothing loads. A GET handler exists server-side but has no caller. |
| S4-02 | major | hardening-0a | The bridge has no Origin, Content-Type or token check, and a cross-origin simple POST succeeds. Reproduced twice. Chrome's newer Local Network Access prompt is a mitigation, not a block. |
| S4-03 | major | hardening-0a | The logger truncates both files on construct or session start, so a reload erases the last session. |
| S4-04 | major | hardening-6 | The determinism guards only match literal call shapes (ESLint does catch `Math?.random?.()`). Most aliasing and destructuring forms get through, and application has no rule. |
| S4-05 | major | hardening-6 | The layer test can't see `require`, `import =`, non-literal `import()` or `node:*`, and doesn't enforce the content/scene rule. Cycle detection is deferred. |
| S4-06 | major | 05b-1 | The epoch-agnostic guard is a hand-typed list of 5 Highglass ids. |
| S4-07 | major | hardening-3/6, observation-step | The new core-model invariants are unguarded, and the drift is already visible: unsorted iteration, Map/Set slices. |
| S4-08 | major | 05b-1 | Content is joined across 3 files by bare string ids, with no launch validator. A character missing a visual is silently invisible. |
| S4-09 | major | 05b-1 | The registry is a closed set of 11 kinds, and adding one costs about 60 lines across 6 places. Validation is inconsistent, and 9 id-getters have no src callers. |
| S4-10 | major | hardening-4 | Pack identity and composition aren't modelled. |
| S4-11 | major | 05b-1 | Section guides name blueprints that don't exist and carry the pre-P2 AI plan, and test fixtures are shipped as content. |
| S4-12 | major | act-step | Telemetry policy: the Act log records what happened. Telemetry holds crash, warn, frame spikes and hash checkpoints. Decision traces come from replaying the command log with tracing on. Narrowed: today only `aiReasoning` entries are kept verbatim. |
| S4-13 | major | hardening-3 | The tests are real behaviour tests, but they're monolithic and built on pasted fixtures, so they'll break wholesale under the hardening batch. The bridge middleware is untested. |
| S4-14 | minor | with telemetry wiring | Compaction is synchronous and lossy at the edges; the CLI has no tail, limit or count; the skill text overclaims. |
| S4-15 | minor | hardening-0b | verify runs serially. In parallel it measured 2.4–3.1 s. |
| S4-16 | minor | hardening-0b | Some arch tests guard prose, and pre-commit skips typecheck and the arch tests. |
| S4-17 | minor | later | ESLint is untyped (no `no-floating-promises`). Add typed lint when the first async port lands. |
| S4-18 | minor | 05f | Split between eval/ and the golden test. Narrowed: the evidence-coverage eval and the text gates are already assigned to 05f. One harness; tests/ is exact, golden/ holds hashes, eval/ holds distributions and corpora. |

## Routes
- **Adopted:**
  - R4A3 parallel verify with one-line output (0b);
  - R4A4 shuffled golden with throwing stubs (6);
  - R4B1 kind table (05b-1);
  - R4B3 launch lint (05b-1);
  - R4C3 token + Origin lock (0a);
  - R4C2 minimal eval/ shape (05f);
  - R4A2 branded `BeliefView` with one audited projector and a hidden-truth contract test (observation step);
  - R4C1 "log nothing, replay with tracing" as the trace policy (act step).
- **Adopted (amended):** R4B2, as JSON source of truth with no TS emission (ruled above); R4C4, a browser crash ring buffer flushed through the guarded bridge, done with the telemetry wiring.
- **Parked:** R4A1 (compiler-API / dependency-cruiser import scanning).

## Keep
- tsconfig delivers every promised flag.
- zero-any is enforced twice.
- The import check handles barrels, `import type` and `export *`.
- Registration is atomic, with rollback.
- The domain never names starter content.
- Bridge path handling and the loopback bind are solid.
- The compactor's durability ordering is correct.
- The test suite is fast and free of snapshots.
