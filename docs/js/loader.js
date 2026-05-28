// ══════════════════════════════════════════════════════════════════
// MANIFEST & QUIZ DATA LOADER
// ══════════════════════════════════════════════════════════════════

async function loadManifest() {
    try {
        const resp = await fetch('data/manifest.json?v=' + Date.now());
        manifest = await resp.json();
        const sel = document.getElementById('filename');
        sel.innerHTML = '<option value="" disabled selected>-- select a file --</option>';
        const newOpt = document.createElement('option');
        newOpt.value = 'creator:new';
        newOpt.textContent = '\u270E New / blank quiz \u2014 open Creator';
        sel.appendChild(newOpt);

        // Group by category
        const grouped = {};
        manifest.forEach(m => {
            const cat = m.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(m);
        });

        Object.keys(grouped).forEach(cat => {
            const group = document.createElement('optgroup');
            group.label = cat;
            grouped[cat].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.file;
                opt.textContent = m.label + ' (' + m.count + ' questions)';
                group.appendChild(opt);
            });
            sel.appendChild(group);
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
