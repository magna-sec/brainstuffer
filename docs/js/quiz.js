// ══════════════════════════════════════════════════════════════════
// QUIZ ENGINE
// ══════════════════════════════════════════════════════════════════

// ── Start quiz ───────────────────────────────────────────────────
async function startQuiz() {
    const sel = document.getElementById('filename');
    const filename = sel.value;
    if (!filename) return;

    const amount = parseInt(document.getElementById('amount').value) || 0;
    const questions = await loadQuizData(filename);
    if (!questions || !questions.length) return;

    const n = (amount && amount < questions.length) ? amount : questions.length;
    const sampled = sample(questions, n);

    const quiz = sampled.map(q => {
        const answers = q.answers.slice();
        const correct = q.correct !== undefined ? String(q.correct) : String(answers[0]);
        return {
            question_id: q.question_id || 0,
            question: q.question,
            answers: shuffle(answers),
            correct: correct,
        };
    });

    store = {
        quiz: quiz,
        total: quiz.length,
        current: 0,
        correct: 0,
        incorrect: [],
        filename: filename,
        review_queue: [],
        is_review: false,
        question_start: null,
    };

    showQuizQuestion();
}

// ── Show quiz question ───────────────────────────────────────────
function showQuizQuestion() {
    if (!store) { showPage('home'); return; }

    let current = store.current;
    const questions = store.quiz;

    if (current >= questions.length) {
        if (store.review_queue.length) {
            store.quiz = store.review_queue.map(q => {
                const answers = q.answers.slice();
                return {
                    question_id: q.question_id,
                    question: q.question,
                    answers: shuffle(answers),
                    correct: q.correct,
                };
            });
            store.review_queue = [];
            store.current = 0;
            store.is_review = true;
            current = 0;
        } else {
            showResults();
            return;
        }
    }

    store.question_start = Date.now() / 1000;

    const question = store.quiz[current];
    const humanIdx = current + 1;
    const total = store.quiz.length;

    document.getElementById('subtitle').textContent =
        store.is_review ? 'Review Round' : 'Question ' + humanIdx + ' of ' + total;
    document.title = 'Question ' + humanIdx + ' of ' + total;

    document.getElementById('quiz-progress-label').textContent = store.is_review ? 'Review' : 'Progress';
    document.getElementById('quiz-progress-count').textContent = humanIdx + ' / ' + total;
    document.getElementById('quiz-progress-fill').style.width = (((humanIdx - 1) / total) * 100).toFixed(1) + '%';

    document.getElementById('quiz-review-badge').style.display = store.is_review ? '' : 'none';
    document.getElementById('quiz-q-number').textContent = 'Question ' + humanIdx;
    document.getElementById('quiz-q-text').textContent = question.question;

    const answersList = document.getElementById('quiz-answers');
    answersList.innerHTML = '';
    question.answers.forEach((ans, i) => {
        const li    = document.createElement('li');
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type     = 'radio';
        input.name     = 'answer';
        input.value    = String(ans);
        input.required = true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + String(ans)));
        li.appendChild(label);
        answersList.appendChild(li);
    });

    showPage('quiz');
}

// ── Submit answer ────────────────────────────────────────────────
function submitAnswer() {
    if (!store) return;

    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return;

    const current = store.current;
    const question = store.quiz[current];
    const selectedVal = selected.value;
    const correct = question.correct;
    const isCorrect = selectedVal.trim().toLowerCase() === correct.trim().toLowerCase();

    const elapsed = (Date.now() / 1000) - (store.question_start || (Date.now() / 1000));
    const tooSlow = elapsed > SLOW_THRESHOLD_SECONDS;

    if (isCorrect && !tooSlow && !store.is_review) {
        store.correct++;
    }

    // XP
    let xpResult = null;
    if (window.applyXP) {
        xpResult = window.applyXP(isCorrect ? window.LEVEL_XP_CORRECT : -window.LEVEL_XP_WRONG);
    }

    const flagged = !isCorrect || tooSlow;
    if (flagged) {
        const alreadyQueued = store.review_queue.some(q => q.question_id === question.question_id);
        if (!alreadyQueued) {
            store.review_queue.push({
                question_id: question.question_id,
                question: question.question,
                answers: question.answers,
                correct: correct,
            });
        }
    }

    if (!isCorrect && !store.is_review) {
        const alreadyLogged = store.incorrect.some(q => q.question_id === question.question_id);
        if (!alreadyLogged) {
            store.incorrect.push({
                question_id: question.question_id,
                question: question.question,
                answers: [correct].concat(question.answers.filter(a => a !== correct)),
            });
        }
    }

    store.current++;
    const isLast = store.current >= store.quiz.length && !store.review_queue.length;

    showFeedback({
        isCorrect, correct, selectedVal,
        current: current + 1,
        total: store.quiz.length,
        isLast, flagged, tooSlow,
        elapsed: Math.floor(elapsed),
        isReview: store.is_review,
        xpResult,
    });
}

// ── Show feedback ────────────────────────────────────────────────
function showFeedback(data) {
    document.getElementById('fb-progress-label').textContent = data.isReview ? 'Review' : 'Progress';
    document.getElementById('fb-progress-count').textContent = data.current + ' / ' + data.total;
    document.getElementById('fb-progress-fill').style.width = ((data.current / data.total) * 100).toFixed(1) + '%';

    let html = '<div class="result-icon">' + (data.isCorrect ? '&#9989;' : '&#10060;') + '</div>';
    html += '<h2 class="result-heading" style="color:' + (data.isCorrect ? '#22c55e' : '#ef4444') + '">'
         + (data.isCorrect ? 'Correct!' : 'Incorrect') + '</h2>';

    if (!data.isCorrect) {
        html += '<div class="answer-box answer-wrong"><strong>Your answer:</strong> ' + escHtml(data.selectedVal || '(none)') + '</div>';
    }
    html += '<div class="answer-box answer-correct"><strong>Correct answer:</strong> ' + escHtml(data.correct) + '</div>';

    if (data.xpResult) {
        const gained = data.xpResult.xpChange > 0;
        const cls    = gained ? 'xp-gain' : 'xp-loss';
        const sign   = gained ? '+' : '';
        html += '<div class="xp-change ' + cls + '">' + sign + data.xpResult.xpChange + ' XP';
        if (!gained && data.xpResult.newLevel < data.xpResult.oldLevel) {
            html += ' &mdash; <strong>LEVEL DOWN \u2193</strong>';
        } else if (gained && data.xpResult.newLevel > data.xpResult.oldLevel) {
            html += ' &mdash; <strong>LEVEL UP \u2191</strong>';
        }
        html += '</div>';
        // Warn if next wrong answer would drop a level
        if (!gained && window.getLevelProgress) {
            const prog = window.getLevelProgress();
            if (prog.xpInLevel < window.LEVEL_XP_WRONG && prog.level > 1) {
                html += '<div class="xp-warning">\u26a0\ufe0f One wrong answer will drop you to Level ' + (prog.level - 1) + '</div>';
            }
        }
    }

    html += '<div class="meta"><span>&#9201; ' + data.elapsed + 's</span>';
    if (data.tooSlow) html += '<span class="badge badge-slow">Too slow (&gt;30s)</span>';
    if (data.flagged && !data.isReview) html += '<span class="badge badge-review">Queued for review</span>';
    html += '</div>';

    document.getElementById('fb-card').innerHTML = html;

    let nextHtml;
    if (data.isLast) {
        nextHtml = '<button class="btn btn-success" id="btn-see-results">See Results &#8594;</button>';
    } else {
        nextHtml = '<button class="btn btn-primary" id="btn-next-question">Next Question &#8594;</button>';
    }
    document.getElementById('fb-next-wrap').innerHTML = nextHtml;

    if (data.isLast) {
        document.getElementById('btn-see-results').addEventListener('click', showResults);
    } else {
        document.getElementById('btn-next-question').addEventListener('click', showQuizQuestion);
    }

    showPage('feedback');
}

// ── Show results ─────────────────────────────────────────────────
function showResults() {
    if (!store) { showPage('home'); return; }

    const total = store.total;
    const correct = store.correct;
    const percentage = Math.round((correct / total) * 1000) / 10;
    const colour = scoreColour(percentage);
    const dashOffset = (376.99 * (1 - percentage / 100)).toFixed(2);

    let resultLabel;
    if (percentage >= 75) resultLabel = 'Excellent work!';
    else if (percentage >= 50) resultLabel = 'Good effort!';
    else if (percentage >= 25) resultLabel = 'Keep practising.';
    else resultLabel = 'More study needed.';

    let html = '<div class="card" style="text-align:center">';
    html += '<div class="score-ring-wrap">';
    html += '<svg viewBox="0 0 140 140" width="140" height="140">';
    html += '<circle class="score-ring-bg" cx="70" cy="70" r="60"/>';
    html += '<circle class="score-ring-fill colour-' + colour + '" cx="70" cy="70" r="60" '
         + 'stroke-dasharray="376.99" stroke-dashoffset="376.99" id="ring-fill"/>';
    html += '</svg>';
    html += '<div class="score-text">';
    html += '<span class="score-pct colour-' + colour + '">' + percentage + '%</span>';
    html += '<span class="score-frac">' + correct + ' / ' + total + '</span>';
    html += '</div></div>';
    html += '<h2 class="result-label">' + resultLabel + '</h2>';
    html += '<span class="filename-chip">' + escHtml(store.filename) + '</span>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-primary" id="btn-restart">Restart Quiz</button>';
    if (store.incorrect.length) {
        html += '<button class="btn btn-muted" id="btn-save-incorrect">Download Incorrect</button>';
    }
    html += '<button class="btn btn-muted" id="btn-home">Home</button>';
    html += '</div></div>';

    if (store.incorrect.length) {
        html += '<div class="card"><h2>Missed Questions <span style="color:var(--muted);font-weight:500;font-size:0.95rem">(' + store.incorrect.length + ')</span></h2>';
        html += '<ul class="incorrect-list">';
        store.incorrect.forEach(q => {
            html += '<li><div class="q-text">' + escHtml(q.question) + '</div>';
            html += '<div class="a-text">&#10003; ' + escHtml(q.answers[0]) + '</div></li>';
        });
        html += '</ul></div>';
    }

    document.getElementById('page-results').innerHTML = html;
    showPage('results');

    // Animate ring
    requestAnimationFrame(() => {
        const fill = document.getElementById('ring-fill');
        if (fill) {
            fill.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
            fill.style.strokeDashoffset = dashOffset;
        }
    });

    // Wire up buttons
    document.getElementById('btn-restart').addEventListener('click', restartQuiz);
    document.getElementById('btn-home').addEventListener('click', goHome);
    const saveBtn = document.getElementById('btn-save-incorrect');
    if (saveBtn) saveBtn.addEventListener('click', downloadIncorrect);

    // 100% celebration
    if (percentage >= 100) {
        setTimeout(() => {
            const picks = [flyAround, inflate, multiply, bounce, firework, matrixRain, disco, parade, confetti, spinShrink, screenMelt];
            picks[Math.floor(Math.random() * picks.length)]();
        }, 1300);
    }
}

// ── Restart quiz ─────────────────────────────────────────────────
async function restartQuiz() {
    if (!store) { showPage('home'); return; }

    const filename = store.filename;
    const questions = await loadQuizData(filename);
    if (!questions || !questions.length) { showPage('home'); return; }

    const quiz = shuffle(questions).map(q => {
        const answers = q.answers.slice();
        const correct = answers[0];
        return {
            question_id: q.question_id || 0,
            question: q.question,
            answers: shuffle(answers),
            correct: correct,
        };
    });

    store = {
        quiz: quiz,
        total: quiz.length,
        current: 0,
        correct: 0,
        incorrect: [],
        filename: filename,
        review_queue: [],
        is_review: false,
        question_start: null,
    };

    showQuizQuestion();
}

// ── Download incorrect as JSON ───────────────────────────────────
function downloadIncorrect() {
    if (!store || !store.incorrect.length) return;
    const data = JSON.stringify(store.incorrect, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incorrect_' + (Date.now() % 10000) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ── Download template & AI prompt ────────────────────────────────
function downloadTemplate() {
    var template = [
        '---',
        '# BrainStuffer Question Template',
        '# The FIRST answer is always the correct one.',
        '# Add 2-4 answer options per question.',
        '#',
        '# Fill this in manually or feed it to an AI with the prompt below.',
        '',
        '- question_id: 1',
        '  question: "Your question here?"',
        '  answers:',
        '    - "Correct answer"',
        '    - "Wrong answer 1"',
        '    - "Wrong answer 2"',
        '    - "Wrong answer 3"',
        '',
        '- question_id: 2',
        '  question: "Another question?"',
        '  answers:',
        '    - "Right answer"',
        '    - "Distractor A"',
        '    - "Distractor B"',
        '    - "Distractor C"',
        '',
    ].join('\n');

    var blob = new Blob([template], { type: 'text/yaml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'brainstuffer_template.yml';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadPrompt() {
    var prompt = [
        'Generate a set of multiple-choice quiz questions in YAML format for a tool called BrainStuffer.',
        '',
        'Rules:',
        '- Output valid YAML as a list of question objects',
        '- Each object has: question_id (integer), question (string), answers (list of strings)',
        '- The FIRST answer in the list MUST be the correct one',
        '- Include 3-4 answer options per question (1 correct + 2-3 plausible distractors)',
        '- Make distractors realistic and challenging, not obviously wrong',
        '- Number question_id sequentially starting from 1',
        '',
        'Topic: [YOUR TOPIC HERE]',
        'Number of questions: [NUMBER]',
        'Difficulty: [easy / medium / hard]',
        '',
        'Example format:',
        '---',
        '- question_id: 1',
        '  question: "What is the capital of France?"',
        '  answers:',
        '    - "Paris"',
        '    - "London"',
        '    - "Berlin"',
        '    - "Madrid"',
        '',
        '- question_id: 2',
        '  question: "Which planet is closest to the Sun?"',
        '  answers:',
        '    - "Mercury"',
        '    - "Venus"',
        '    - "Mars"',
        '    - "Earth"',
        '',
        'Generate the quiz now. Output ONLY the YAML, no explanations.',
    ].join('\n');

    var blob = new Blob([prompt], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'brainstuffer_ai_prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
}
