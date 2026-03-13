// ══════════════════════════════════════════════════════════════════
// MANIFEST & QUIZ DATA LOADER
// ══════════════════════════════════════════════════════════════════

async function loadManifest() {
    try {
        const resp = await fetch('data/manifest.json');
        manifest = await resp.json();
        const sel = document.getElementById('filename');
        sel.innerHTML = '<option value="" disabled selected>-- select a file --</option>';
        const newOpt = document.createElement('option');
        newOpt.value = 'creator:new';
        newOpt.textContent = '\u270E New / blank quiz \u2014 open Creator';
        sel.appendChild(newOpt);
        const sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
        sel.appendChild(sep);
        manifest.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.file;
            opt.textContent = m.label + ' (' + m.count + ' questions)';
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error('Failed to load manifest:', e);
    }
}

async function loadQuizData(filename) {
    if (quizDataCache[filename]) return quizDataCache[filename];
    // Uploaded files are cached directly, never fetched
    if (filename.startsWith('upload:')) return null;
    const resp = await fetch('data/' + filename);
    const text = await resp.text();
    const data = safeJsonParse(text);
    quizDataCache[filename] = data;
    return data;
}
