# BrainStuffer

<p align="center">
  <img src="static/splash.png" alt="BrainStuffer" />
</p>

A client-side flashcard quiz app hosted on GitHub Pages. Load multiple-choice questions, get scored on accuracy and speed, and review anything you got wrong.

## Live Site

**https://brainstuffer.co.uk**

## Features

- Pick from included quiz sets or upload your own (YAML, JSON, or encrypted .bsq)
- Answers shuffled randomly on every run
- Questions answered **incorrectly** or **too slowly** (> 30s) are re-shown in a review round
- Score is calculated on first-pass performance only
- Download incorrect answers as JSON for later drilling
- Download a YAML template or AI prompt to generate new quiz sets
- Load quiz files directly from a public GitHub repository
- Encrypt quiz files with a password and share them as `.bsq` files
- **Syntax-highlighted code blocks** for C and x86 ASM quiz questions
- **Explanation system** — wrong answers auto-show an explanation; correct answers reveal one on demand via an "Explain" button
- 8 colour skins (Phantom, Matrix, Hellfire, Abyss, Reactor, Win 95, Aero, Caveman)
- XP & level system, celebration animations, and easter eggs
- Fully mobile responsive

## Local Testing

```bash
cd docs
python -m http.server 8080
```

Then open **http://127.0.0.1:8080** in your browser.

## Project Structure

```
brainstuffer/
├── docs/                          # GitHub Pages root
│   ├── index.html                 # Single-page application
│   ├── favicon.svg                # Browser tab icon
│   ├── 404.html                   # SPA path redirect
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── quiz.js
│   │   ├── flashcard.js
│   │   ├── ui.js
│   │   ├── state.js
│   │   ├── levels.js
│   │   ├── loader.js
│   │   ├── upload.js
│   │   ├── github.js
│   │   ├── encrypt.js
│   │   ├── crypto.js
│   │   └── utils.js
│   └── data/
│       ├── manifest.json              # Quiz file index
│       ├── generic_cyber.json         # General cybersecurity (428 questions)
│       ├── classic_literature.json    # Classic Literature & Authors (75 questions)
│       ├── science_discovery.json     # Science & Discovery (74 questions)
│       ├── world_history.json         # World History (99 questions)
│       ├── geography.json             # Geography (78 questions)
│       ├── mathematics_logic.json     # Mathematics & Logic (50 questions)
│       ├── philosophy.json            # Philosophy (59 questions)
│       ├── astronomy_space.json       # Astronomy & Space (76 questions)
│       ├── music_history.json         # Music Theory & History (75 questions)
│       ├── antiques_collecting.json   # Antiques & Collecting (70 questions)
│       ├── music_theory.json          # Music Theory (63 questions)
│       ├── windows_api.json           # Win32 API (59 questions)
│       ├── windows_internals_re.json  # Windows Internals RE (61 questions, explanations)
│       ├── c_programming.json         # C Programming with code blocks (49 questions, explanations)
│       ├── intel_x86_asm.json         # Intel x86 Assembly with code blocks (54 questions, explanations)
│       └── example_quiz.bsq           # Example encrypted quiz file
├── convert_to_json.py             # YAML to JSON converter for adding new quizzes
├── .gitignore
└── README.md
```

## Adding New Quiz Files

1. Create a `.yml` file in the project root using the format below
2. Run the converter:
   ```bash
   python convert_to_json.py
   ```
3. Commit and push — the new quiz appears on the site

Alternatively, upload quiz files directly in the browser (no rebuild needed).

## YAML Format

The first answer in the list is always the correct one. Answers are shuffled before display.

```yaml
---
- question_id: 1
  question: "What does ARP stand for?"
  answers:
    - "Address Resolution Protocol"   # correct - must be first
    - "Automated Routing Protocol"
    - "Application Request Payload"
    - "Access Registration Protocol"
```

## JSON Format (extended)

Quiz files stored in `docs/data/` are JSON arrays. Each question supports optional code block and explanation fields:

```json
[
  {
    "question": "What does this function return?",
    "answers": ["Correct answer", "Wrong 1", "Wrong 2", "Wrong 3"],
    "correct": 0,
    "code": "int add(int a, int b) {\n    return a + b;\n}",
    "code_lang": "c",
    "explanation": "The function adds two integers and returns their sum."
  }
]
```

- `code` — source code snippet displayed above the answers (optional)
- `code_lang` — `"c"` or `"asm"` — controls syntax highlighting (required when `code` is set)
- `explanation` — shown automatically on a wrong answer, or on demand via "Explain" button on a correct answer (optional)

## Included Quiz Sets

| File | Description | Questions | Code blocks | Explanations |
|------|-------------|-----------|-------------|--------------|
| `generic_cyber.json` | General cybersecurity knowledge | 428 | | |
| `world_history.json` | World History | 99 | | |
| `geography.json` | Geography | 78 | | |
| `astronomy_space.json` | Astronomy & Space | 76 | | |
| `classic_literature.json` | Classic Literature & Authors | 75 | | |
| `music_history.json` | Music Theory & History | 75 | | |
| `science_discovery.json` | Science & Discovery | 74 | | |
| `antiques_collecting.json` | Antiques & Collecting | 70 | | |
| `philosophy.json` | Philosophy | 59 | | |
| `windows_api.json` | Win32 API | 59 | | |
| `mathematics_logic.json` | Mathematics & Logic | 50 | | |
| `music_theory.json` | Music Theory | 63 | | |
| `windows_internals_re.json` | Windows Internals & Reverse Engineering | 61 | | ✓ |
| `intel_x86_asm.json` | Intel x86 Assembly | 54 | ✓ (ASM) | ✓ |
| `c_programming.json` | C Programming | 49 | ✓ (C) | ✓ |
