"""Validate exact source quotations; command evidence is never executed.

Usage: python3 -I quotecheck.py findings.json [--root REPOSITORY]
Exit 0: source evidence matches; 1: invalid/mismatched evidence; 2: manual
command verification remains (or CLI usage error). Root defaults to the
nearest .git ancestor of the working directory, including worktree .git files.
"""

import argparse
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import sys


def discover_root():
    current = Path.cwd().resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".git").exists():
            return candidate
    raise ValueError("no repository found from cwd; supply --root")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key: " + key)
        result[key] = value
    return result


def evidence_items(document):
    if isinstance(document, list):
        groups = [("items", document)]
    elif isinstance(document, dict) and ("findings" in document or "facts" in document):
        groups = [(key, document[key]) for key in ("findings", "facts", "keep", "unconsidered_routes") if key in document]
    else:
        raise ValueError("expected an array or an object with findings/facts arrays")
    for group, items in groups:
        if not isinstance(items, list):
            raise ValueError(group + " must be an array")
        for index, item in enumerate(items):
            label = f"{group}[{index}]"
            if not isinstance(item, dict):
                raise ValueError(label + " must be an object")
            label += " " + str(item.get("id", ""))
            evidence = item.get("evidence")
            # Routes may be reasoned proposals without quotations. Check any supplied evidence.
            if group == "unconsidered_routes" and "evidence" not in item:
                continue
            if not isinstance(evidence, list) or not evidence:
                raise ValueError(label + " needs a nonempty evidence array")
            for number, entry in enumerate(evidence):
                yield f"{label} evidence[{number}]", entry


def source_lines(text):
    # Match physical text lines; Unicode separators remain source characters.
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return lines[:-1] if lines[-1] == "" else lines


def check_evidence(root, entry):
    if not isinstance(entry, dict):
        raise ValueError("MALFORMED evidence must be an object")
    path, quote = entry.get("path"), entry.get("quote")
    if not isinstance(path, str) or not path.strip() or not isinstance(quote, str) or not quote:
        raise ValueError("MALFORMED nonempty path and quote strings required")
    if path.startswith(("cmd:", "$")):
        command = path[4:] if path.startswith("cmd:") else path[1:]
        if not command.strip():
            raise ValueError("MALFORMED empty command evidence")
        return "manual"
    relative = PurePosixPath(path)
    if (relative.is_absolute() or PureWindowsPath(path).drive or "\\" in path
            or ".." in relative.parts or "\x00" in path):
        raise ValueError("PATH expected a repository-relative path without traversal")
    try:
        source = (root / path).resolve(strict=True)
        source.relative_to(root)
        if not source.is_file():
            raise ValueError("not a regular file")
    except (OSError, ValueError, RuntimeError) as error:
        raise ValueError("PATH missing, escaping or non-file source: " + path) from error
    lines = entry.get("lines")
    if type(lines) is int:
        lines = str(lines)
    if not isinstance(lines, str) or not re.fullmatch(r"[1-9][0-9]*(?:-[1-9][0-9]*)?", lines):
        raise ValueError("MALFORMED lines must be a positive line number or start-end")
    bounds = lines.split("-")
    start, end = int(bounds[0]), int(bounds[-1])
    try:
        content = source_lines(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeError) as error:
        raise ValueError("PATH unreadable UTF-8 source: " + path) from error
    if start > end or end > len(content):
        raise ValueError("RANGE outside source: " + path + ":" + lines)
    if content[start - 1:end] != source_lines(quote):
        raise ValueError("MISMATCH complete quotation differs at " + path + ":" + lines)
    return "source"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("findings", type=Path)
    parser.add_argument("--root", type=Path)
    args = parser.parse_args()
    source_count = manual_count = problems = 0
    try:
        root = args.root.resolve(strict=True) if args.root is not None else discover_root()
        if not root.is_dir():
            raise ValueError("selected root must be a directory")
        document = json.loads(args.findings.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
        for label, entry in evidence_items(document):
            try:
                outcome = check_evidence(root, entry)
                if outcome == "manual":
                    manual_count += 1
                    print(f"MANUAL {label}: command evidence requires human verification; not executed")
                else:
                    source_count += 1
            except ValueError as error:
                problems += 1
                print(f"{label}: {error}")
    except (OSError, ValueError, RuntimeError) as error:
        problems += 1
        print("MALFORMED input: " + str(error))
    print(f"checked {source_count} source quotations; {manual_count} manual; {problems} problems")
    return 1 if problems else (2 if manual_count else 0)


if __name__ == "__main__":
    sys.exit(main())
