// ══════════════════════════════════════════════════════════════════
// QUIZ CREATOR
// ══════════════════════════════════════════════════════════════════

(function () {
    var creatorQuestions = [];
    var editingIndex     = -1;
    var pendingImage     = null;   // base64 data URL of resized image

    // ── Image resize via canvas ───────────────────────────────────
    var MAX_W = 800, MAX_H = 600, JPEG_Q = 0.80;

    function resizeImage(file, cb) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var scale  = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
                var canvas = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                cb(canvas.toDataURL('image/jpeg', JPEG_Q));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ── Image zone ────────────────────────────────────────────────
    function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        resizeImage(file, function (dataUrl) {
            pendingImage = dataUrl;
            document.getElementById('creator-img-preview-img').src = dataUrl;
            document.getElementById('creator-img-preview').style.display = '';
            document.getElementById('creator-img-zone').style.display    = 'none';
        });
    }

    function clearImage() {
        pendingImage = null;
        document.getElementById('creator-img-preview-img').src = '';
        document.getElementById('creator-img-preview').style.display = 'none';
        document.getElementById('creator-img-zone').style.display    = '';
    }

    // ── Form helpers ──────────────────────────────────────────────
    function clearForm() {
        document.getElementById('creator-q-text').value = '';
        ['creator-a0','creator-a1','creator-a2','creator-a3'].forEach(function (id) {
            document.getElementById(id).value = '';
        });
        document.getElementById('creator-correct-0').checked = true;
        clearImage();
        editingIndex = -1;
        document.getElementById('creator-add-btn').textContent = 'Add Question';
        document.getElementById('creator-cancel-edit').style.display = 'none';
        renderList();
    }

    function fillForm(q) {
        document.getElementById('creator-q-text').value = q.question;
        ['creator-a0','creator-a1','creator-a2','creator-a3'].forEach(function (id, i) {
            document.getElementById(id).value = q.answers[i] || '';
        });
        var correctIdx = q.answers.indexOf(q.correct);
        if (correctIdx < 0) correctIdx = 0;
        document.getElementById('creator-correct-' + correctIdx).checked = true;
        if (q.image) {
            pendingImage = q.image;
            document.getElementById('creator-img-preview-img').src = q.image;
            document.getElementById('creator-img-preview').style.display = '';
            document.getElementById('creator-img-zone').style.display    = 'none';
        } else {
            clearImage();
        }
    }

    // ── Render list ───────────────────────────────────────────────
    function renderList() {
        var list = document.getElementById('creator-question-list');
        if (!list) return;
        if (!creatorQuestions.length) {
            list.innerHTML = '<p class="creator-empty">No questions yet. Add one above.</p>';
            updateExportState();
            return;
        }
        list.innerHTML = '';
        creatorQuestions.forEach(function (q, i) {
            var item = document.createElement('div');
            item.className = 'creator-q-item' + (editingIndex === i ? ' editing' : '');

            var preview = q.question.length > 72 ? q.question.slice(0, 72) + '\u2026' : q.question;
            item.innerHTML =
                '<span class="creator-q-num">' + (i + 1) + '</span>' +
                '<span class="creator-q-preview">' +
                    (q.image ? '<span class="creator-img-badge">\uD83D\uDCF7 </span>' : '') +
                    escHtml(preview) +
                '</span>' +
                '<span class="creator-q-actions">' +
                    '<button class="creator-btn-icon" data-action="edit" data-idx="' + i + '" title="Edit">\u270E</button>' +
                    '<button class="creator-btn-icon danger" data-action="del" data-idx="' + i + '" title="Delete">\u2715</button>' +
                '</span>';

            list.appendChild(item);
        });

        list.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                editingIndex = parseInt(this.dataset.idx);
                fillForm(creatorQuestions[editingIndex]);
                document.getElementById('creator-add-btn').textContent = 'Update Question';
                document.getElementById('creator-cancel-edit').style.display = '';
                document.getElementById('creator-q-text').focus();
                renderList();
            });
        });

        list.querySelectorAll('[data-action="del"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.dataset.idx);
                if (editingIndex === idx) { editingIndex = -1; clearForm(); }
                else if (editingIndex > idx) editingIndex--;
                creatorQuestions.splice(idx, 1);
                renderList();
            });
        });

        updateExportState();
    }

    function updateExportState() {
        var btn   = document.getElementById('creator-export-btn');
        var count = document.getElementById('creator-q-count');
        var n     = creatorQuestions.length;
        if (btn)   btn.disabled = !n;
        if (count) count.textContent = n + ' question' + (n !== 1 ? 's' : '');
    }

    // ── Add / update ──────────────────────────────────────────────
    function addOrUpdate() {
        var question = document.getElementById('creator-q-text').value.trim();
        if (!question) { alert('Please enter a question.'); return; }

        var answers = [
            document.getElementById('creator-a0').value.trim(),
            document.getElementById('creator-a1').value.trim(),
            document.getElementById('creator-a2').value.trim(),
            document.getElementById('creator-a3').value.trim(),
        ];
        var radio      = document.querySelector('input[name="creator-correct"]:checked');
        var correctIdx = radio ? parseInt(radio.value) : 0;
        var filled     = answers.filter(function (a) { return a.length > 0; });

        if (filled.length < 2) { alert('Please enter at least 2 answers.'); return; }
        if (!answers[correctIdx]) {
            alert('The selected correct answer is empty. Fill it in or choose a different one.');
            return;
        }

        var q = {
            question: question,
            answers:  answers.filter(function (a) { return a.length > 0; }),
            correct:  answers[correctIdx],
        };
        if (pendingImage) q.image = pendingImage;

        if (editingIndex >= 0) {
            creatorQuestions[editingIndex] = q;
        } else {
            creatorQuestions.push(q);
        }
        clearForm();
    }

    // ── Export ────────────────────────────────────────────────────
    function exportQuiz() {
        if (!creatorQuestions.length) return;
        var raw  = document.getElementById('creator-quiz-name').value.trim() || 'my_quiz';
        var name = raw.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
        var json = JSON.stringify(creatorQuestions, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url;  a.download = name + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Load existing quiz into creator ───────────────────────────
    window.loadIntoCreator = function (data) {
        creatorQuestions = (data || []).map(function (q) {
            return {
                question: q.question || '',
                answers:  (q.answers || []).slice(),
                correct:  q.correct || (q.answers && q.answers[0]) || '',
                image:    q.image   || null,
            };
        });
        editingIndex = -1;
        clearImage();
        document.getElementById('creator-q-text').value = '';
        ['creator-a0','creator-a1','creator-a2','creator-a3'].forEach(function (id) {
            document.getElementById(id).value = '';
        });
        document.getElementById('creator-correct-0').checked = true;
        document.getElementById('creator-add-btn').textContent = 'Add Question';
        document.getElementById('creator-cancel-edit').style.display = 'none';
        renderList();
    };

    // ── Init (called once from main.js) ──────────────────────────
    window.initCreator = function () {
        // Image zone — drag & drop + click
        var zone  = document.getElementById('creator-img-zone');
        var input = document.getElementById('creator-img-input');
        if (zone) {
            zone.addEventListener('click', function () { input.click(); });
            zone.addEventListener('dragover', function (e) {
                e.preventDefault(); zone.classList.add('dragover');
            });
            zone.addEventListener('dragleave', function () {
                zone.classList.remove('dragover');
            });
            zone.addEventListener('drop', function (e) {
                e.preventDefault(); zone.classList.remove('dragover');
                handleImageFile(e.dataTransfer.files[0]);
            });
        }
        if (input) {
            input.addEventListener('change', function () {
                handleImageFile(input.files[0]);
                input.value = '';
            });
        }

        var removeBtn = document.getElementById('creator-remove-img');
        if (removeBtn) removeBtn.addEventListener('click', clearImage);

        var addBtn = document.getElementById('creator-add-btn');
        if (addBtn) addBtn.addEventListener('click', addOrUpdate);

        var cancelBtn = document.getElementById('creator-cancel-edit');
        if (cancelBtn) cancelBtn.addEventListener('click', clearForm);

        var exportBtn = document.getElementById('creator-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportQuiz);

        renderList();
    };
})();
