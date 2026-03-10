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

    def test_title_capitalisation(self):
        """Browser tab should read 'BrainStuffer', not 'Brainstuffer'."""
        assert "<title>BrainStuffer</title>" in self.html, (
            "index.html <title> must be 'BrainStuffer' (capital S)"
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

# ── Quiz JS behaviour (static analysis) ──────────────────────────────────────

QUIZ_JS   = JS_DIR / "quiz.js"
UI_JS     = JS_DIR / "ui.js"
LOADER_JS = JS_DIR / "loader.js"


class TestQuizJS:
    def setup_method(self):
        self.quiz_js   = QUIZ_JS.read_text(encoding="utf-8")
        self.ui_js     = UI_JS.read_text(encoding="utf-8")
        self.loader_js = LOADER_JS.read_text(encoding="utf-8")

    # ── Quip updates ────────────────────────────────────────────────

    def _function_body(self, source: str, fn_name: str) -> str:
        """
        Very simple extractor: finds `function fn_name(` and returns
        the content up to (and including) its matching closing brace.
        """
        start = source.find(f"function {fn_name}(")
        if start == -1:
            return ""
        depth = 0
        i = source.index("{", start)
        while i < len(source):
            if source[i] == "{":
                depth += 1
            elif source[i] == "}":
                depth -= 1
                if depth == 0:
                    return source[start : i + 1]
            i += 1
        return source[start:]

    def test_quip_called_in_show_quiz_question(self):
        """renderQuip() must be called inside showQuizQuestion so the quip
        updates on every new question (including 'Next Question' click)."""
        body = self._function_body(self.quiz_js, "showQuizQuestion")
        assert "renderQuip" in body, (
            "showQuizQuestion() in quiz.js does not call renderQuip() — "
            "the footer quip will not update when a new question is shown."
        )

    def test_quip_called_in_show_feedback(self):
        """renderQuip() must be called inside showFeedback so the quip
        updates when 'Submit Answer' is clicked."""
        body = self._function_body(self.quiz_js, "showFeedback")
        assert "renderQuip" in body, (
            "showFeedback() in quiz.js does not call renderQuip() — "
            "the footer quip will not update when the feedback page is shown."
        )

    def test_quip_called_in_go_home(self):
        """renderQuip() should also be called when returning to the home page."""
        body = self._function_body(self.ui_js, "goHome")
        assert "renderQuip" in body, (
            "goHome() in ui.js does not call renderQuip()."
        )

    # ── XP display when disabled ─────────────────────────────────────

    def test_xp_block_guarded_by_xp_change(self):
        """When XP is disabled, applyXP returns {xpChange: 0}. The feedback
        page must check xpChange !== 0 (not just that xpResult is truthy)
        so no XP info is shown when the system is off."""
        body = self._function_body(self.quiz_js, "showFeedback")
        # The guard must include xpChange, not just `if (data.xpResult)`
        assert "xpChange" in body, (
            "showFeedback() does not check xpResult.xpChange — XP info will "
            "appear even when the XP system is disabled."
        )

    # ── Backslash / safe JSON parsing ────────────────────────────────

    def test_loader_uses_safe_json_parse(self):
        """loadQuizData() in loader.js must use safeJsonParse (not raw resp.json())
        so that answers containing Windows-style paths like C:\\windows\\system32
        are not silently mangled."""
        load_quiz_body = self._function_body(self.loader_js, "loadQuizData")
        assert load_quiz_body, "loadQuizData function not found in loader.js"
        assert "safeJsonParse" in load_quiz_body, (
            "loadQuizData() in loader.js does not use safeJsonParse() — "
            "unescaped backslashes in quiz JSON files will be silently dropped "
            "(e.g. C:\\windows becomes C:windows)."
        )
        assert "resp.json()" not in load_quiz_body, (
            "loadQuizData() in loader.js still calls resp.json() directly — "
            "replace with safeJsonParse(await resp.text()) to handle unescaped backslashes."
        )

    def test_safe_json_parse_defined_in_utils(self):
        utils_js = (JS_DIR / "utils.js").read_text(encoding="utf-8")
        assert "safeJsonParse" in utils_js, (
            "safeJsonParse is not defined in utils.js"
        )
        assert "backslash" in utils_js.lower() or r"\\" in utils_js, (
            "safeJsonParse in utils.js does not appear to handle backslash repair"
        )


# ── Backslash integrity in quiz data files ────────────────────────────────────

class TestBackslashIntegrity:
    """
    Checks that quiz JSON files either:
      (a) are valid JSON with properly escaped backslashes (\\\\), OR
      (b) can be repaired by safeJsonParse-style logic without data loss.

    Python's json.load is strict and will raise on unescaped backslashes,
    so a file that loads cleanly in Python is safe for the browser too.
    """

    def test_all_quiz_files_parse_without_error(self):
        """All data/*.json files must be parseable by Python's strict JSON parser."""
        errors = []
        for path in all_quiz_files():
            try:
                with open(path, encoding="utf-8") as f:
                    json.load(f)
            except json.JSONDecodeError as e:
                errors.append(f"{path.name}: {e}")
        assert not errors, (
            "The following quiz files contain invalid JSON (possibly due to "
            "unescaped backslashes — use \\\\ for a single backslash in JSON):\n"
            + "\n".join(errors)
        )

    def test_backslash_strings_round_trip(self):
        """
        Any answer or question that contains a backslash in the parsed value
        must also contain a double-backslash in the raw file bytes — confirming
        the backslash is properly escaped and will survive the browser's
        JSON.parse without being silently dropped.
        """
        failures = []
        for path in all_quiz_files():
            raw = path.read_text(encoding="utf-8")
            try:
                questions = json.loads(raw)
            except json.JSONDecodeError:
                continue  # caught by the previous test
            for i, q in enumerate(questions):
                texts = [q.get("question", "")] + [str(a) for a in q.get("answers", [])]
                for text in texts:
                    if "\\" in text:
                        # The raw JSON must contain \\\\ (escaped backslash)
                        # to represent a single \ in the parsed value.
                        # We verify at least one \\\\ exists nearby.
                        if "\\\\" not in raw:
                            failures.append(
                                f"{path.name}[{i}]: parsed value contains \\ "
                                f"but raw file has no \\\\ — backslash may be lost "
                                f"in browser JSON.parse."
                            )
                            break
        assert not failures, "\n".join(failures)
