# Portable quotation evidence

Run from any checkout with Python 3:

```bash
python3 -I .agents/skills/root-and-branch-review/scripts/quotecheck.py findings.json --root .
```

`--root` selects the repository directory. If omitted, the checker discovers the nearest `.git` ancestor of the current working directory (including a worktree's `.git` file); without one it fails and asks for `--root`. The JSON input path is relative to the invoking working directory. Source `path` values are relative to the selected repository. Absolute paths, parent traversal, Windows drive paths and resolved symlink escapes are rejected. The input file is data; it is never imported or evaluated.

Accepted document shapes are an array of finding/fact objects, or an object with `findings` and/or `facts` arrays. Optional `keep` evidence and any evidence supplied by `unconsidered_routes` are checked too. Every finding/fact/keep item needs a nonempty `evidence` array; an empty findings array is valid for a no-findings report. An optional `id` is included in diagnostics alongside the item location. Duplicate JSON keys, malformed entries, missing files, unreadable UTF-8 sources and invalid ranges fail closed.

```json
{
  "findings": [
    {
      "id": "F1",
      "claim": "An evidence-backed claim",
      "evidence": [
        {
          "path": "src/example.ts",
          "lines": "12-14",
          "quote": "  first line\n\nlast line"
        }
      ]
    }
  ]
}
```

`lines` is a positive integer, a single-number string, or an inclusive `start-end` string. Quote the **complete cited source lines**, including indentation, blank lines and every remaining line. A sentence within a longer source line needs that whole line as evidence. There is no nearby-line tolerance, substring match, whitespace collapse or ellipsis expansion. Normal text line endings are compared as logical lines; a final line terminator is optional. A matching first line with a false tail fails. A quote check verifies source identity, not whether the interpretation follows from it.

Command evidence uses `path: "cmd: <command>"` (legacy `$ <command>` is recognized) and `quote` for the claimed output. Such entries are **never executed**. The checker prints `MANUAL`; the lead must separately obtain and record human verification of the command, working directory, environment, actual output and result. Commands requiring permissions remain unverified until authorized and run outside this checker. Do not treat a plausible output string as proof.

Exit codes: **0** all supplied source quotations matched and no manual command evidence remains; **1** malformed/missing/escaping/mismatched evidence; **2** manual command verification required (also CLI usage errors, distinguished by diagnostics). If failures and manual items coexist, exit 1 takes precedence. Retain the checker output and manual disposition; do not edit an old review's evidence merely to get a passing code.

Regression suite (separate from ordinary Node verification):

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/tooling -p 'test_quotecheck.py'
```
