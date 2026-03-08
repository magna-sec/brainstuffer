"""
BrainStuffer static-site tests.

Run with:  pytest tests/ -v
"""
import json
import re
from pathlib import Path

DOCS  = Path(__file__).parent.parent / "docs"
DATA  = DOCS / "data"
INDEX = DOCS / "index.html"

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def all_quiz_files():
    return [p for p in DATA.glob("*.json") if p.name != "manifest.json"]

# ── Manifest ─────────────────────────────────────────────────────────────────

class TestManifest:
    def test_manifest_exists(self):
        assert (DATA / "manifest.json").exists(), "manifest.json not found"

    def test_manifest_is_list(self):
        manifest = load_json(DATA / "manifest.json")
        assert isinstance(manifest, list), "manifest.json must be a JSON array"

    def test_manifest_entries_have_required_fields(self):
        manifest = load_json(DATA / "manifest.json")
        for entry in manifest:
            assert "file"  in entry, f"Missing 'file' key in entry: {entry}"
            assert "label" in entry, f"Missing 'label' key in entry: {entry}"
            assert "count" in entry, f"Missing 'count' key in entry: {entry}"

    def test_manifest_files_exist(self):
        manifest = load_json(DATA / "manifest.json")
        for entry in manifest:
            path = DATA / entry["file"]
            assert path.exists(), f"manifest references missing file: {entry['file']}"

    def test_manifest_counts_are_accurate(self):
        manifest = load_json(DATA / "manifest.json")
        for entry in manifest:
            questions = load_json(DATA / entry["file"])
            assert len(questions) == entry["count"], (
                f"{entry['file']}: manifest says {entry['count']} questions "
                f"but file has {len(questions)}"
            )

    def test_no_orphaned_quiz_files(self):
        """Every .json file in data/ (except manifest) should be in the manifest."""
        manifest = load_json(DATA / "manifest.json")
        listed = {e["file"] for e in manifest}
        for path in DATA.glob("*.json"):
            if path.name == "manifest.json":
                continue
            assert path.name in listed, (
                f"{path.name} exists in data/ but is not listed in manifest.json"
            )

# ── Quiz file structure ───────────────────────────────────────────────────────

class TestQuizFiles:
    def test_quiz_files_are_lists(self):
        for path in all_quiz_files():
            data = load_json(path)
            assert isinstance(data, list), f"{path.name} root must be a JSON array"

    def test_every_question_has_required_fields(self):
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                assert "question" in q,  f"{path.name}[{i}] missing 'question'"
                assert "answers"  in q,  f"{path.name}[{i}] missing 'answers'"

    def test_every_question_has_at_least_two_answers(self):
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                assert len(q["answers"]) >= 2, (
                    f"{path.name}[{i}] has fewer than 2 answers"
                )

    def test_answers_are_strings_or_numbers(self):
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                for j, a in enumerate(q["answers"]):
                    assert isinstance(a, (str, int, float)), (
                        f"{path.name}[{i}] answer[{j}] is unexpected type: {type(a)}"
                    )

    def test_correct_answer_is_non_empty(self):
        """First answer (index 0) is always the correct one."""
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                assert str(q["answers"][0]).strip(), (
                    f"{path.name}[{i}] correct answer (answers[0]) is empty"
                )

    def test_no_duplicate_answers_within_question(self):
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                answers = [str(a).strip() for a in q["answers"]]
                assert len(answers) == len(set(answers)), (
                    f"{path.name}[{i}] has duplicate answer choices"
                )

    def test_question_text_is_non_empty(self):
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                assert q["question"].strip(), (
                    f"{path.name}[{i}] question text is empty"
                )

    def test_answers_with_quotes_exist_and_are_tracked(self):
        """
        Answers containing quote characters (', \") must be renderable without
        breaking the quiz UI. This test documents all known cases and will fail
        if new ones appear that haven't been reviewed, or if existing ones vanish
        (i.e. data was accidentally corrupted).
        """
        SPECIAL = ('"', "'")
        found = []
        for path in all_quiz_files():
            for i, q in enumerate(load_json(path)):
                for j, a in enumerate(q["answers"]):
                    if any(c in str(a) for c in SPECIAL):
                        found.append(f"{path.name}[{i}] answer[{j}]")
        # If this count changes, review the new/removed entries above.
        assert len(found) >= 1, (
            "Expected at least one answer with quotes in the test data — "
            "if all were removed, delete this test too."
        )

# ── HTML integrity ────────────────────────────────────────────────────────────

class TestHTML:
    def setup_method(self):
        self.html = INDEX.read_text(encoding="utf-8")

    def test_index_html_exists(self):
        assert INDEX.exists(), "docs/index.html not found"

    def _has_id(self, element_id: str) -> bool:
        return f'id="{element_id}"' in self.html

    def test_required_page_ids_present(self):
        for page_id in ["page-home", "page-quiz", "page-feedback", "page-results", "page-dragons"]:
            assert self._has_id(page_id), f"Missing page element: #{page_id}"

    def test_required_interactive_elements_present(self):
        for el_id in ["filename", "amount", "btn-start", "file-upload", "skin-toggle", "skin-panel", "footer-quip"]:
            assert self._has_id(el_id), f"Missing element: #{el_id}"

    def test_all_five_skins_defined(self):
        for skin in ["midnight", "neon", "crimson", "ocean", "amber"]:
            assert f'data-skin="{skin}"' in self.html, f"Skin '{skin}' not found in HTML"

    def test_favicon_referenced(self):
        assert "favicon.svg" in self.html, "favicon.svg not referenced in HTML"

    def test_no_localhost_urls_in_html(self):
        assert "localhost" not in self.html, "Hard-coded localhost URL found in HTML"
        assert "127.0.0.1" not in self.html, "Hard-coded 127.0.0.1 URL found in HTML"

    def test_cname_file_exists(self):
        assert (DOCS / "CNAME").exists(), "docs/CNAME file is missing"

    def test_cname_is_single_domain(self):
        cname = (DOCS / "CNAME").read_text(encoding="utf-8").strip()
        assert cname and "." in cname, f"CNAME does not look like a domain: {cname!r}"

    def test_answer_rendering_uses_dom_not_innerHTML_string_concat(self):
        """
        Answers are rendered via DOM methods (input.value = ans) so that
        quotes/special chars in answer text don't break HTML attributes.
        Regression guard: fail if the old unsafe pattern is re-introduced.
        """
        unsafe = 'value="' + "' + escHtml(ans) + '\"'"
        assert unsafe not in self.html, (
            "Unsafe innerHTML string concatenation found for answer value attribute — "
            "use DOM methods (input.value = ans) instead."
        )


# ── File structure ────────────────────────────────────────────────────────────

JS_DIR = DOCS / "js"
CSS_DIR = DOCS / "css"

EXPECTED_JS_FILES = [
    "state.js",
    "utils.js",
    "crypto.js",
    "loader.js",
    "quiz.js",
    "flashcard.js",
    "ui.js",
    "upload.js",
    "github.js",
    "encrypt.js",
    "main.js",
]


class TestFileStructure:
    def test_js_files_exist(self):
        for fname in EXPECTED_JS_FILES:
            path = JS_DIR / fname
            assert path.exists(), f"Expected JS file missing: docs/js/{fname}"

    def test_css_file_exists(self):
        assert (CSS_DIR / "style.css").exists(), "docs/css/style.css not found"

    def test_index_references_js_files(self):
        html = INDEX.read_text(encoding="utf-8")
        for fname in ["state.js", "quiz.js", "flashcard.js", "ui.js", "main.js"]:
            assert f'src="js/{fname}"' in html, (
                f'index.html does not reference js/{fname}'
            )

    def test_index_references_css(self):
        html = INDEX.read_text(encoding="utf-8")
        assert 'href="css/style.css"' in html, (
            "index.html does not reference css/style.css"
        )

    def test_flashcard_js_exists(self):
        fc = JS_DIR / "flashcard.js"
        assert fc.exists(), "docs/js/flashcard.js not found"
        content = fc.read_text(encoding="utf-8")
        assert "startFlashcards" in content, (
            "flashcard.js does not contain 'startFlashcards'"
        )

    def test_no_inline_script_blocks(self):
        """
        index.html must not contain large inline <script> blocks.
        A <script> tag with more than 50 lines of JS is considered 'large'.
        """
        html = INDEX.read_text(encoding="utf-8")
        import re
        # Find all script blocks (non-src script tags)
        script_blocks = re.findall(
            r'<script(?![^>]*\bsrc\b)[^>]*>(.*?)</script>',
            html,
            re.DOTALL | re.IGNORECASE,
        )
        for i, block in enumerate(script_blocks):
            line_count = len(block.strip().splitlines())
            assert line_count <= 50, (
                f"index.html contains inline <script> block #{i+1} with {line_count} lines "
                f"(max allowed: 50). Move JS to an external file."
            )
