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

// ══════════════════════════════════════════════════════════════════
// SUBCATEGORY FILTER
// ══════════════════════════════════════════════════════════════════

// Populate the "Category" dropdown for the chosen question set.
// Shows "All categories" by default plus each distinct subcategory.
async function bsPopulateSubcats(filename) {
    const wrap = document.getElementById('subcategory-wrap');
    const sel  = document.getElementById('subcategory');
    if (!wrap || !sel) return;
    sel.innerHTML = '';
    wrap.style.display = 'none';
    if (!filename || filename === 'creator:new') return;

    const data = await loadQuizData(filename);
    if (!data || !data.length) return;

    const order = [], counts = {};
    data.forEach(function(q) {
        const s = q.subcategory;
        if (!s) return;
        if (counts[s] === undefined) { counts[s] = 0; order.push(s); }
        counts[s]++;
    });

    const allOpt = document.createElement('option');
    allOpt.value = '__all__';
    allOpt.textContent = 'All categories (' + data.length + ')';
    sel.appendChild(allOpt);

    order.sort();
    order.forEach(function(s) {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s + ' (' + counts[s] + ')';
        sel.appendChild(o);
    });
    sel.value = '__all__';

    // Only surface the control when there is a genuine choice to make.
    if (order.length >= 2) wrap.style.display = '';
}

// Narrow a question list to the currently-selected subcategory.
// Returns the full list when "All categories" is chosen (the default),
// when the set has no subcategories, or when a filter would be empty.
function bsApplySubcatFilter(questions) {
    const sel = document.getElementById('subcategory');
    if (!sel || !questions) return questions;
    const val = sel.value;
    if (!val || val === '__all__') return questions;
    const filtered = questions.filter(function(q) { return q.subcategory === val; });
    return filtered.length ? filtered : questions;
}
