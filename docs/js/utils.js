// ══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sample(arr, n) {
    const shuffled = shuffle(arr);
    return shuffled.slice(0, n);
}

function scoreColour(pct) {
    if (pct < 25) return 'red';
    if (pct < 50) return 'orange';
    if (pct < 75) return 'yellow';
    return 'green';
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Safely parse JSON, repairing unescaped backslashes (e.g. Windows paths like C:\windows)
function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch(e) {
        // Attempt to fix backslashes not followed by valid JSON escape chars
        var fixed = text.replace(/"(?:[^"\\]|\\.)*"/g, function(m) {
            return m.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        });
        return JSON.parse(fixed);
    }
}
