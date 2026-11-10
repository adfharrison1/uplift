# Verification evidence

Task 5 of `hx-ops-safety`, measured 2026-11-10T21:08:01Z. All twelve measured commands exited zero.

## Result

| Metric (seconds) | Parallel `verify` | `verify:serial` |
| --- | ---: | ---: |
| Cold tool-cache run | 3.340385 | 5.285243 |
| Warm median, five runs | 2.462448 | 3.691985 |
| Warm maximum | 3.204871 | 3.809275 |

The parallel warm median is 33.30% lower than the serial median, meeting the non-regression requirement. The parallel cold and warm runs are below five seconds on this host. The serial cold run exceeds five seconds. This is **not** a measurement of the 2019 Intel Core i7 / 16 GB reference Mac, so its under-five-second target remains unverified.

## Host and dependency state

- Apple M4 Pro, 12 logical CPUs, 24 GiB RAM (`25769803776` bytes), model Mac16,8; arm64.
- macOS 27.2, build 26B123.
- Node v24.22.2 from `/Users/alan.harrison/.nvm/versions/node/v24.22.2/bin/node`; npm 11.19.1.
- Base commit `908bb13a632059db315b3849e3ce5c8fc27dbdc8`, plus the reviewed task-5 working-tree implementation. Both strategies ran against the same frozen files; SHA-256 fingerprints were checked before and after all twelve runs. Executable, dependency and test fingerprints are below. The evidence file and README dependency-manifest wording were finalized after timing; measured executable/test files were unchanged.
- `package-lock.json` lockfile v3, 192 resolved package entries excluding the root. No packages were upgraded. The existing locked `yaml@2.9.1` was made a required, explicit dev dependency for skill metadata parsing; offline lock regeneration succeeded.
- 267 tests in total: 8 architecture tests in one file, 259 unit tests in 27 files. The parallel runner invokes one `npm test`; serial invokes `test:arch` and `test:unit`. Both cover the same assertions, including HTTP and tooling fixtures, and exclude `eval/`.

Pinned direct dependencies for this measurement:

```json
{
  "dependencies": {
    "three": "0.186.1",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "24.19.2",
    "@types/three": "0.186.0",
    "@typescript/native": "npm:typescript@7.0.2",
    "eslint": "10.13.0",
    "eslint-config-prettier": "10.1.8",
    "husky": "9.1.7",
    "lint-staged": "17.6.0",
    "prettier": "3.9.10",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-eslint": "8.72.1",
    "vite": "8.3.5",
    "vitest": "5.0.5",
    "yaml": "2.9.1"
  }
}
```

## Commands and cache preparation

The measured commands were `npm run verify` and `npm run verify:serial`, with the nvm bin directory prepended to PATH. A Python `time.perf_counter()` timer measured each complete npm process from launch through exit, capturing stdout and stderr together; it did not measure tool-approval or orchestration latency. Checks had permission to bind temporary loopback sockets. Review agents were idle throughout timing, and the two strategies were never run simultaneously.

Immediately before **each** cold command, remove only the generated `.prettiercache`, `.eslintcache` and `node_modules/.vite/vitest` artifacts. “Cold” means these tool caches are absent; the OS filesystem cache was not flushed and `node_modules` stayed installed. After the cold pair, leave caches populated for five warm pairs. Odd warm pairs run parallel then serial; even pairs run serial then parallel. No source changes or dependency installation occurred between timed commands.

Equivalent timing loop, from the repository root (with the nvm bin directory on PATH):

```python
import pathlib, shutil, subprocess, time

for phase, pair, commands in [
    ("cold", 0, ["verify", "verify:serial"]),
    *[("warm", i, ["verify", "verify:serial"] if i % 2 else
       ["verify:serial", "verify"]) for i in range(1, 6)],
]:
    for command in commands:
        if phase == "cold":
            for name in (".prettiercache", ".eslintcache", "node_modules/.vite/vitest"):
                path = pathlib.Path(name)
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink(missing_ok=True)
        start = time.perf_counter()
        result = subprocess.run(["npm", "run", command], capture_output=True, text=True)
        elapsed = time.perf_counter() - start
        print(phase, pair, command, elapsed, result.returncode)
        assert result.returncode == 0, result.stdout + result.stderr
```

## Raw durations, in execution order

| Cache | Pair | Command | Seconds | Exit |
| --- | ---: | --- | ---: | ---: |
| cold | 0 | `npm run verify` | 3.340385 | 0 |
| cold | 0 | `npm run verify:serial` | 5.285243 | 0 |
| warm | 1 | `npm run verify` | 2.321263 | 0 |
| warm | 1 | `npm run verify:serial` | 3.809275 | 0 |
| warm | 2 | `npm run verify:serial` | 3.656096 | 0 |
| warm | 2 | `npm run verify` | 2.462448 | 0 |
| warm | 3 | `npm run verify` | 2.482208 | 0 |
| warm | 3 | `npm run verify:serial` | 3.608761 | 0 |
| warm | 4 | `npm run verify:serial` | 3.757919 | 0 |
| warm | 4 | `npm run verify` | 3.204871 | 0 |
| warm | 5 | `npm run verify` | 2.330693 | 0 |
| warm | 5 | `npm run verify:serial` | 3.691985 | 0 |

## Measured code fingerprints

```text
3c0f4d00c49be8b90d0fd2ef4cbffa9cd1f80e050e2bc7d6eb89705b1561a4b4  scripts/verify.mjs
3007642db281d1f9babb2e6839fb7d551b81a6a088dfdc54cd4fa08cd75c7a95  package.json
ffccf64a8df730099bdeca634a6e6a17f55b788cfbb00411f0c1e41a220d9f42  package-lock.json
4a8329aa8bd1d6e264ddc8433bf4b55b4ba5fc2384890561edf2958feb505bde  .husky/pre-commit
152c69765c2e6ba26a8e8bf1b6ba04ef10f73d5a1d75d07709770e1aafba07f4  tests/unit/tooling/VerifyRunner.test.ts
6aaa55b2ee8ad8525af40d7986c741a519c22403b028e0680e4ccb6539916314  tests/architecture/layer_boundaries.test.ts
```

## Verification and review coverage

- Targeted tooling plus architecture run: 18 tests passed. Both full commands passed before timing and all twelve measured runs passed. Lint includes `scripts/verify.mjs`.
- Runner fixtures prove concurrent launch using a filesystem rendezvous, one summary per check, contiguous failure diagnostics, asynchronous and synchronous spawn failures, stdout/stderr output overflow, and wait-for-completion behavior.
- Native macOS SIGINT/SIGTERM fixtures prove both a parent and grandchild terminate, including a parent that exits early and one that ignores SIGTERM, with a resistant grandchild in both cases. Teardown kills remaining recorded PIDs even after an assertion failure.
- Windows `taskkill /PID <pid> /T`, followed by `/F` escalation, is tested with an injected spawn adapter and awaited child close events. Windows cancellation fixtures use IPC because Node's Windows `kill()` bypasses signal handlers. Native Windows termination and Git-for-Windows shell execution have **not** been run here; no claim of native Windows validation is made.
- Hook fixtures execute actual commits in temporary repositories with npm/npx test executables. They prove staged-check failure short-circuits verification, verification failure blocks a commit, a successful gate permits it, and unrelated files never enter the index. Fixture-only Git options disable inherited signing and select the fixture hook directory.
- Skill checks use the YAML parser and validate required files, matching name/string description metadata and nonempty instructions. Regression cases include changed prose/headings, folded descriptions, inline comments, numeric-leading text, missing metadata and malformed YAML. Existing layer, zero-any, determinism and section-documentation checks are retained.
- Two independent reviews found and verified fixes for YAML metadata parsing and Windows fixture signal/PATH handling. Both reviewers cleared those fixes before the measurements. Final evidence review is recorded with task delivery.
