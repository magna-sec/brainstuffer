// ══════════════════════════════════════════════════════════════════
// FLASHCARD MODE
// ══════════════════════════════════════════════════════════════════

let fcDeck = [];       // remaining cards (shuffled)
let fcDone = 0;        // count of "got it"
let fcTotal = 0;       // total cards this session
let fcFlipped = false; // current card face

function startFlashcards() {
    if (!store) return;
    loadQuizData(store.filename).then(function(questions) {
        if (!questions || !questions.length) return;
        const amount = parseInt(document.getElementById('amount').value) || 0;
        const n = (amount && amount < questions.length) ? amount : questions.length;
        fcDeck = shuffle(questions).slice(0, n);
        fcTotal = fcDeck.length;
        fcDone = 0;
        showPage('flashcard');
        fcShowCard();
    });
}

function fcShowCard() {
    const card = document.getElementById('fc-card');
    card.classList.remove('flipped');
    fcFlipped = false;

    if (!fcDeck.length) {
        fcEnd();
        return;
    }

    const q = fcDeck[0];
    document.getElementById('fc-question-text').textContent = q.question;
    document.getElementById('fc-answer-text').textContent = String(q.answers[0]);

    // Show other options greyed out for context
    const others = (q.answers || []).slice(1);
    const otherEl = document.getElementById('fc-other-answers');
    otherEl.textContent = others.length ? 'Other options: ' + others.join(' \u00b7 ') : '';

    fcUpdateProgress();
}

function fcFlip() {
    if (fcFlipped) return;
    fcFlipped = true;
    document.getElementById('fc-card').classList.add('flipped');
}

function fcGotIt() {
    if (!fcFlipped) { fcFlip(); return; }
    fcDeck.shift();
    fcDone++;
    fcShowCard();
}

function fcMissed() {
    if (!fcFlipped) { fcFlip(); return; }
    // Move card to a random position in the remaining deck (not last, feels better)
    const card = fcDeck.shift();
    const pos = 1 + Math.floor(Math.random() * Math.max(1, fcDeck.length));
    fcDeck.splice(pos, 0, card);
    fcShowCard();
}

function fcUpdateProgress() {
    const remaining = fcDeck.length;
    const pct = fcTotal > 0 ? (fcDone / fcTotal) * 100 : 0;
    const fill = document.getElementById('fc-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const remEl = document.getElementById('fc-remaining');
    if (remEl) remEl.textContent = remaining;
    const doneEl = document.getElementById('fc-got-it');
    if (doneEl) doneEl.textContent = fcDone;
}

function fcEnd() {
    showOverlay('All done! Every card got it \u2713', '\u{1F9E0}', 3000);
    setTimeout(goHome, 3200);
}
