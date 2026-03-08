// ══════════════════════════════════════════════════════════════════
// FLASHCARD MODE
// ══════════════════════════════════════════════════════════════════

let fcDeck = [];       // remaining cards (shuffled)
let fcDone = 0;        // count of "got it"
let fcTotal = 0;       // total cards this session
let fcFlipped = false; // current card face

function startFlashcards() {
    if (!store) { console.warn('[FC] store is null, aborting'); return; }
    console.log('[FC] starting for', store.filename);
    loadQuizData(store.filename).then(function(questions) {
        console.log('[FC] loaded', questions && questions.length, 'questions');
        if (!questions || !questions.length) { console.warn('[FC] no questions loaded'); return; }
        const amount = parseInt(document.getElementById('amount').value) || 0;
        const n = (amount && amount < questions.length) ? amount : questions.length;
        fcDeck = shuffle(questions).slice(0, n);
        fcTotal = fcDeck.length;
        fcDone = 0;
        console.log('[FC] deck ready, showing', fcTotal, 'cards');
        showPage('flashcard');
        fcShowCard();
    }).catch(function(e) { console.error('[FC] loadQuizData error', e); });
}

function fcShowCard() {
    const card = document.getElementById('fc-card');
    fcFlipped = false;

    if (!fcDeck.length) {
        fcEnd();
        return;
    }

    const q = fcDeck[0];
    const correctAns = (q.correct !== undefined && q.correct !== null) ? String(q.correct) : String((q.answers || [])[0]);

    // Snap to front instantly, update front face immediately
    card.style.transition = 'none';
    card.classList.remove('flipped');
    document.getElementById('fc-question-text').textContent = q.question;

    // Delay back-face update so it's safely hidden before content changes
    setTimeout(function() {
        document.getElementById('fc-answer-text').textContent = correctAns;
        card.style.transition = '';
    }, 120);

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
