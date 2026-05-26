# BrainStuffer — Claude Code Guide

## Project Overview

BrainStuffer is a static HTML/CSS/JS educational platform (no build step, no framework).
All files live under `docs/`. Open `docs/index.html` in a browser to run locally.

## File Structure

```
docs/
  index.html           # Main SPA — quiz hub + learn hub (manually maintained card lists)
  css/style.css        # Shared theme system (skin CSS custom properties)
  favicon.svg
  js/                  # Quiz engine (main.js, quiz.js, ui.js, state.js, …)
  data/                # Quiz JSON files (intel_x86_asm.json, etc.)
  lessons/
    index.html         # Lessons landing page (manually maintained card list)
    format-string.html
    fd-table.html
    registers.html
    x86-asm.html
    memory-layout.html
    bitshift.html
    [new lessons go here]
  fakestack.html       # Interactive stack chapters (standalone)
  stack.html
  binary-workbench.html
  kerberos.html
  …
```

## Theme System

All pages use `data-skin` on `<html>`. Available skins: `aero`, `neon`, `crimson`, `ocean`, `amber`, `caveman`, `win95`.

CSS custom properties defined in `style.css`: `--bg`, `--bg2`, `--card`, `--card-border`, `--text`, `--muted`, `--accent`, `--accent2`, `--glow`, `--warning`.

**IMPORTANT**: The foreground/body text variable is `--text`, NOT `--fg`. Using `var(--fg)` will silently produce black text because `--fg` is undefined.

The default skin is **aero**. Every page must:
1. Set `<html lang="en" data-skin="aero">` (fallback)
2. Include the inline skin-init script before `<body>` content (reads localStorage)
3. Include the skin-toggle button + skin-panel HTML
4. Include the skin-switcher JS (see template below)

## Adding a New Lesson — Checklist

After creating `docs/lessons/new-lesson.html`:

1. Add a card to `docs/lessons/index.html` (the grid div)
2. Add a learn-card to `docs/index.html` (find the correct category under `page-learn`)
3. No build step — changes are live immediately

---

## Prompt: Create a New Interactive Lesson

Use this prompt when asked to build a new interactive lesson for BrainStuffer.
Fill in the `[TOPIC]`, `[CONCEPT]`, and `[STEPS]` placeholders.

---

```
Create a new BrainStuffer interactive lesson at docs/lessons/[filename].html.

TOPIC: [e.g. "Stack Canaries", "Format String %n Write", "ASLR Bypass with info-leak"]

WHAT IT TEACHES:
[Describe the core concept in 2-3 sentences. What does the user walk away understanding?]

INTERACTIVE STEPS:
[List 3-8 steps the user clicks through. Each step should change something visible —
a register, a memory cell, a diagram element — and have a 1-2 sentence narrative.
Add a quiz question on at least 2 of the steps.]

Example step format:
  Step 1 — Initial state: [describe what is shown]
  Step 2 — [instruction/action]: [what changes, what the narrative says]
  Step 3 (quiz) — [action]: [what changes] | Quiz: [question] | Answer: [correct option]

MANDATORY TEMPLATE — the file must follow this skeleton exactly:

<!DOCTYPE html>
<html lang="en" data-skin="aero">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>[Title] — BrainStuffer</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<!-- inline skin init — MUST be before body content -->
<script>(function(){var sk=localStorage.getItem('bs-skin');if(sk)document.documentElement.setAttribute('data-skin',sk);})();</script>
<style>
/* lesson-local styles only — use var(--bg), var(--card), var(--accent), etc. */
/* never hardcode colours — always use CSS custom properties from the skin */
body { font-family: 'Courier New', monospace; background: var(--bg); color: var(--text);
       min-height: 100vh; padding: 1.5rem 1rem 3rem; }
</style>
</head>
<body>

<!-- SKIN TOGGLE (copy verbatim) -->
<button id="skin-toggle" title="Change skin" aria-label="Change colour skin">&#9681;</button>
<div id="skin-panel" role="listbox" aria-label="Colour skins">
  <div class="skin-panel-title" style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.25rem;">Colour Skin</div>
  <div class="skin-opt" data-skin="aero"    role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#818cf8,#38bdf8)"></span> Phantom</div>
  <div class="skin-opt" data-skin="neon"    role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#4ade80,#86efac)"></span> Matrix</div>
  <div class="skin-opt" data-skin="crimson" role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#f87171,#fca5a5)"></span> Hellfire</div>
  <div class="skin-opt" data-skin="ocean"   role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#2dd4bf,#67e8f9)"></span> Abyss</div>
  <div class="skin-opt" data-skin="amber"   role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#fbbf24,#fde68a)"></span> Reactor</div>
  <div class="skin-opt" data-skin="caveman" role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#e8732a,#f0b040)"></span> Caveman</div>
  <div class="skin-opt" data-skin="win95"   role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#000080,#c0c0c0)"></span> Win 95</div>
  <div class="skin-opt" data-skin="aero"    role="option" style="display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem;border-radius:8px;cursor:pointer;font-size:.85rem;"><span class="skin-swatch" style="width:18px;height:18px;border-radius:4px;flex-shrink:0;background:linear-gradient(135deg,#4fa3e0,#a8d4f5)"></span> Aero</div>
</div>

<!-- BACK LINK -->
<a href="../index.html#learn" style="display:inline-flex;align-items:center;gap:.4rem;
   color:var(--muted);font-size:.8rem;text-decoration:none;margin-bottom:1.5rem;">
  &#8592; Back to Interactive Learning
</a>

<!-- PAGE CONTENT HERE -->
<h1 style="color:var(--accent);font-size:1.4rem;margin-bottom:.25rem;">[Title]</h1>
<p style="color:var(--muted);font-size:.82rem;margin-bottom:1.5rem;">[One-line description]</p>

<!-- main lesson UI goes here -->

<script>
/* ── Skin switcher (copy verbatim) ───────────────────────────────── */
(function(){
  var t=document.getElementById('skin-toggle'), p=document.getElementById('skin-panel');
  if(!t||!p) return;
  t.addEventListener('click', function(e){ e.stopPropagation(); p.classList.toggle('open'); });
  document.addEventListener('click', function(){ p.classList.remove('open'); });
  p.addEventListener('click', function(e){ e.stopPropagation(); });
  p.querySelectorAll('.skin-opt').forEach(function(o){
    o.addEventListener('click', function(){
      var sk = o.getAttribute('data-skin');
      document.documentElement.setAttribute('data-skin', sk);
      localStorage.setItem('bs-skin', sk);
      p.classList.remove('open');
    });
  });
})();

/* ── Lesson logic ────────────────────────────────────────────────── */
// [lesson JavaScript here]
</script>
</body>
</html>

STYLE RULES:
- Use CSS custom properties only — no hardcoded hex colours
- Font: 'Courier New', monospace everywhere
- Cards/panels: background var(--card), border 1px solid var(--card-border), border-radius 10px
- Accent highlights: border-color var(--accent), box-shadow 0 0 8px var(--glow)
- Muted/zero/dimmed elements: opacity 0.28-0.4 or color var(--muted)
- Narratives: border-left 2px solid var(--accent), background subtle gradient
- Quiz correct: border-color #4ade80, background rgba(74,222,128,.1)
- Quiz wrong: border-color #f87171, background rgba(248,113,113,.08)

AFTER CREATING THE FILE also:
1. Add a <a class="card"> entry to docs/lessons/index.html (inside .grid)
2. Add a <a class="learn-card"> entry to docs/index.html (inside the appropriate
   category under id="page-learn") — tag count, topic tags, icon emoji
```

---

## Quiz JSON Schema

Files in `docs/data/` follow this schema:

```json
[
  {
    "question": "Question text",
    "answers": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option A",
    "explanation": "Why A is correct.",
    "diagram": "ASCII art diagram (optional)",
    "code": "code snippet (optional)",
    "code_lang": "asm"
  }
]
```

`correct` must be the exact string of the correct answer from `answers[]`.

## fakestack.html Chapter Data Schema

Steps use:
```javascript
{
  registers: regs({ RIP:'0x...', RSP:'0x...', RAX:'0x...' }),
  memory: [{ addr:'0x...', value:'...', label:'...', frame:0, isNew:true }],
  codeLine: 3,       // 1-based line in CH_N_CODE array
  narrative: '<strong>...</strong> — html allowed',
  quiz: {            // or null
    question: '...',
    options: ['A', 'B', 'C', 'D'],
    correctIdx: 0,
    explanation: '...'
  },
  showHeap: false    // omit or false unless heap panel needed
}
```

After adding a chapter, update `CHAPTERS` array and both "of N" strings (static HTML + dynamic template literal).
