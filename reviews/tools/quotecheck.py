"""Check that every evidence quote in a findings JSON file exists near its cited lines.
Usage: python3 -I quotecheck.py <findings.json> [repo_root]
Accepts a JSON array, or an object with a "findings" or "facts" array."""
import json, sys, os, re
def norm(s): return re.sub(r"\s+", " ", s).strip()
path = sys.argv[1]; root = sys.argv[2] if len(sys.argv) > 2 else "/Users/alanharrison/Desktop/Code/uplift"
data = json.load(open(path))
items = data if isinstance(data, list) else (data.get("findings") or data.get("facts") or [])
bad = 0
for it in items:
    for ev in it.get("evidence", []):
        p, q, lines = ev.get("path"), ev.get("quote", ""), str(ev.get("lines", ""))
        if not p or not q or p.startswith("$") or p.startswith("cmd:"):
            continue
        fp = os.path.join(root, p)
        if not os.path.isfile(fp):
            print(f"MISSING-FILE {it.get('id')} {p}"); bad += 1; continue
        text = open(fp, encoding="utf-8", errors="replace").read().splitlines()
        nums = [int(n) for n in re.findall(r"\d+", lines)]
        lo, hi = (max(1, min(nums) - 5), max(nums) + 5) if nums else (1, len(text))
        window = norm(" ".join(text[lo - 1:hi])); whole = norm(" ".join(text))
        first = norm(q.splitlines()[0]) if q.strip() else ""
        if first and first in window: continue
        if first and first in whole:
            print(f"WRONG-LINES {it.get('id')} {p}:{lines}"); bad += 1
        else:
            print(f"NOT-FOUND {it.get('id')} {p}:{lines} :: {first[:80]}"); bad += 1
print(f"checked {len(items)} items, {bad} problems")
