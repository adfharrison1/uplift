"""Exercise the portable quotechecker through its real CLI and isolated files."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


CHECKER = (Path(__file__).resolve().parents[2] / ".agents/skills/"
           "root-and-branch-review/scripts/quotecheck.py")


class QuotecheckTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.base = Path(self.scratch.name)
        self.root = self.base / "relocated"
        self.root.mkdir()
        (self.root / ".git").mkdir()
        (self.root / "source.txt").write_text("before\n  first\n\nlast\nafter\n", encoding="utf-8")

    def run_document(self, document, explicit_root=True):
        evidence = self.base / "evidence.json"
        evidence.write_text(json.dumps(document), encoding="utf-8")
        command = [sys.executable, "-I", str(CHECKER), str(evidence)]
        if explicit_root:
            command += ["--root", str(self.root)]
        return subprocess.run(command, cwd=self.root, text=True, capture_output=True, check=False)

    def run_quote(self, **updates):
        evidence = {"path": "source.txt", "lines": "2-4", "quote": "  first\n\nlast"}
        evidence.update(updates)
        return self.run_document({"findings": [{"id": "F1", "evidence": [evidence]}]})

    def test_complete_multiline_quote_preserves_blank_lines_and_indentation(self):
        result = self.run_quote()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("1 source", result.stdout)

    def test_false_tail_fails_even_when_first_line_matches(self):
        result = self.run_quote(quote="  first\n\nfalse tail")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("MISMATCH", result.stdout)
        self.assertIn("F1", result.stdout)

    def test_exact_range_required_without_nearby_fallback(self):
        for lines in ["1-3", "2-5", "2", "5-2", "0-4", "2-99", "line 2 to 4", True, None]:
            with self.subTest(lines=lines):
                self.assertEqual(self.run_quote(lines=lines).returncode, 1)

    def test_whitespace_is_not_normalized(self):
        for quote in ["first\n\nlast", "  first\nlast", "  first last"]:
            with self.subTest(quote=quote):
                self.assertEqual(self.run_quote(quote=quote).returncode, 1)

    def test_unicode_line_separators_are_source_characters(self):
        (self.root / "source.txt").write_text("first\u2028tail\n", encoding="utf-8")
        result = self.run_quote(lines=1, quote="first")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("MISMATCH", result.stdout)

    def test_crlf_and_optional_final_terminator_match(self):
        (self.root / "source.txt").write_bytes(b"first\r\ntail\r\n")
        result = self.run_quote(lines="1-2", quote="first\r\ntail\r\n")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_single_line_integer_and_facts_or_array_envelopes(self):
        fact = {"id": "one", "evidence": [{"path": "source.txt", "lines": 1, "quote": "before"}]}
        for document in [[fact], {"facts": [fact]}]:
            with self.subTest(document=document):
                self.assertEqual(self.run_document(document).returncode, 0)

    def test_missing_files_and_directory_are_rejected(self):
        for path in ["absent.txt", "."]:
            with self.subTest(path=path):
                result = self.run_quote(path=path)
                self.assertEqual(result.returncode, 1)
                self.assertIn("PATH", result.stdout)

    def test_traversal_absolute_and_symlink_escape_are_rejected(self):
        outside = self.base / "outside.txt"
        outside.write_text("  first\n\nlast", encoding="utf-8")
        (self.root / "linked.txt").symlink_to(outside)
        (self.root / "linked-dir").symlink_to(self.base, target_is_directory=True)
        for path in ["../outside.txt", str(outside), "linked.txt", "linked-dir/outside.txt", "C:\\outside.txt"]:
            with self.subTest(path=path):
                result = self.run_quote(path=path, lines="1-3")
                self.assertEqual(result.returncode, 1)
                self.assertIn("PATH", result.stdout)
        self.assertEqual(outside.read_text(encoding="utf-8"), "  first\n\nlast")

    def test_malformed_evidence_fails_closed(self):
        for document in [None, {}, {"findings": "bad"}, [42], [{"id": "missing"}],
                         [{"evidence": []}], [{"evidence": "bad"}], [{"evidence": [None]}],
                         [{"evidence": [{"path": "source.txt", "lines": 1}]}],
                         [{"evidence": [{"path": "source.txt", "lines": 1, "quote": 9}]}]]:
            with self.subTest(document=document):
                result = self.run_document(document)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("MALFORMED", result.stdout)

    def test_keep_evidence_is_checked_as_well_as_findings(self):
        result = self.run_document({"findings": [], "keep": [{"evidence": [
            {"path": "source.txt", "lines": 1, "quote": "false"}]}]})
        self.assertEqual(result.returncode, 1)
        self.assertIn("MISMATCH", result.stdout)

    def test_commands_require_manual_verification_and_are_never_executed(self):
        sentinel = self.base / "executed"
        for prefix in ["cmd: ", "$ "]:
            with self.subTest(prefix=prefix):
                result = self.run_quote(path=prefix + "touch " + str(sentinel), quote="reported output")
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("MANUAL", result.stdout)
                self.assertFalse(sentinel.exists())

    def test_discovers_repository_from_working_directory(self):
        result = self.run_document([{ "evidence": [{"path": "source.txt", "lines": "1", "quote": "before"}]}], False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
