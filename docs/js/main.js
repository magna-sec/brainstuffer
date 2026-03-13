// ══════════════════════════════════════════════════════════════════
// MAIN — EVENT WIRING & INIT
// ══════════════════════════════════════════════════════════════════

document.getElementById('btn-start').addEventListener('click', startQuiz);

document.getElementById('btn-submit-answer').addEventListener('click', submitAnswer);
document.getElementById('quiz-home-link').addEventListener('click', goHome);
document.getElementById('dragons-home-link').addEventListener('click', goHome);
document.getElementById('btn-download-template').addEventListener('click', downloadTemplate);
document.getElementById('btn-download-prompt').addEventListener('click', downloadPrompt);

// Flashcard buttons
document.getElementById('btn-fc-flip').addEventListener('click', fcFlip);
document.getElementById('btn-fc-got-it').addEventListener('click', fcGotIt);
document.getElementById('btn-fc-missed').addEventListener('click', fcMissed);
document.getElementById('fc-home-link').addEventListener('click', goHome);

document.getElementById('btn-start-flashcard').addEventListener('click', function() {
    const sel = document.getElementById('filename');
    if (!sel || !sel.value || sel.value === 'creator:new') return;
    store = { filename: sel.value };
    startFlashcards();
});

// Flashcard keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (document.getElementById('page-flashcard').style.display === 'none') return;
    if (!document.getElementById('page-flashcard').classList.contains('active')) return;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); fcFlip(); }
    if (e.key === 'ArrowRight' || e.key === 'Enter') fcGotIt();
    if (e.key === 'ArrowLeft') fcMissed();
});

// Hash-based navigation for dragons page
function checkHash() {
    if (window.location.hash === '#herebedragons') {
        showPage('dragons');
        // Reset and animate dragon lab ring
        var ring = document.getElementById('lab-ring');
        if (ring) {
            ring.style.transition = 'none';
            ring.style.strokeDashoffset = '251.33';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    ring.style.transition = 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)';
                    ring.style.strokeDashoffset = '0';
                });
            });
        }
    }
}
window.addEventListener('hashchange', checkHash);

// ══════════════════════════════════════════════════════════════════
// iOS ZOOM RESET — reset viewport scale after any input loses focus
// ══════════════════════════════════════════════════════════════════
(function() {
    var viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;
    var baseContent = viewportMeta.getAttribute('content');
    document.addEventListener('focusout', function(e) {
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            viewportMeta.setAttribute('content', baseContent + ', maximum-scale=1');
            requestAnimationFrame(function() {
                viewportMeta.setAttribute('content', baseContent);
            });
        }
    }, { passive: true });
})();

// XP reset button
document.getElementById('btn-xp-reset').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Reset your XP and level back to zero?')) {
        if (window.resetXP) window.resetXP();
    }
});

// Dragons lab: XP cheat button
document.getElementById('btn-xp-cheat').addEventListener('click', function() {
    localStorage.setItem('bs-cheater', '1');
    // Enable XP mode if not already on
    var toggle = document.getElementById('xp-mode-toggle');
    if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
    }
    if (window.applyXP) window.applyXP(100);
    this.textContent = '\u2620 XP added \u2014 you\u2019re tagged as a cheater';
});

// Quiz Creator
document.getElementById('btn-open-creator').addEventListener('click', async function () {
    var sel = document.getElementById('filename');
    var val = sel.value;
    if (val && val !== 'creator:new') {
        var data = await loadQuizData(val);
        if (data && window.loadIntoCreator) window.loadIntoCreator(data);
    } else if (window.loadIntoCreator) {
        window.loadIntoCreator([]);
    }
    showPage('creator');
});
document.getElementById('creator-home-link').addEventListener('click', goHome);

// ══════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════
loadManifest();
checkHash();
if (window.initCreator) window.initCreator();
