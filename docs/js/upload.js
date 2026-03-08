// ══════════════════════════════════════════════════════════════════
// FILE UPLOAD (YAML / JSON / BSQ)
// ══════════════════════════════════════════════════════════════════
(function () {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-upload');
    const alertWrap = document.getElementById('upload-alert-wrap');

    zone.addEventListener('click', function() { input.click(); });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', function() {
        if (input.files.length) handleFile(input.files[0]);
        input.value = '';
    });

    function showUploadAlert(msg, type) {
        alertWrap.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
        setTimeout(function() { alertWrap.innerHTML = ''; }, 6000);
    }

    function handleFile(file) {
        const name = file.name;
        const isYaml = /\.(ya?ml)$/i.test(name);
        const isJson = /\.json$/i.test(name);
        const isBsq  = /\.bsq$/i.test(name);

        if (!isYaml && !isJson && !isBsq) {
            showUploadAlert('Unsupported file type. Please use .yml, .yaml, .json, or .bsq files.', 'error');
            return;
        }

        if (isBsq) {
            var reader2 = new FileReader();
            reader2.onload = function(e) {
                window._pendingBsqText = e.target.result;
                window._pendingBsqName = name;
                document.getElementById('decrypt-prompt').style.display = '';
                document.getElementById('decrypt-password').focus();
            };
            reader2.readAsText(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            var text = e.target.result;
            if (isJson) {
                try {
                    var data = safeJsonParse(text);
                    registerUploadedQuiz(name, data);
                } catch (err) {
                    showUploadAlert('Invalid JSON: ' + err.message, 'error');
                }
            } else {
                if (typeof jsyaml !== 'undefined') {
                    parseYamlAndRegister(name, text);
                } else {
                    var s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
                    s.onload = function() { parseYamlAndRegister(name, text); };
                    s.onerror = function() { showUploadAlert('Failed to load YAML parser. Try a .json file instead.', 'error'); };
                    document.head.appendChild(s);
                }
            }
        };
        reader.readAsText(file);
    }

    function parseYamlAndRegister(name, text) {
        try {
            var data = jsyaml.load(text);
            if (!Array.isArray(data)) {
                showUploadAlert('YAML must be a list of questions at the top level.', 'error');
                return;
            }
            registerUploadedQuiz(name, data);
        } catch (err) {
            showUploadAlert('Invalid YAML: ' + err.message, 'error');
        }
    }

    function registerUploadedQuiz(name, data) {
        if (!Array.isArray(data) || !data.length) {
            showUploadAlert('File contains no questions.', 'error');
            return;
        }
        // Validate structure
        var valid = data.every(function(q) {
            return q.question && Array.isArray(q.answers) && q.answers.length >= 2;
        });
        if (!valid) {
            showUploadAlert('Invalid format. Each question needs a "question" field and an "answers" list with at least 2 entries.', 'error');
            return;
        }

        var key = 'upload:' + name;
        quizDataCache[key] = data;

        // Add to dropdown if not already there
        var sel = document.getElementById('filename');
        var exists = Array.from(sel.options).some(function(o) { return o.value === key; });
        if (!exists) {
            var opt = document.createElement('option');
            opt.value = key;
            opt.textContent = name + ' (' + data.length + ' questions) [uploaded]';
            sel.appendChild(opt);
        }
        sel.value = key;
        showUploadAlert('Loaded <strong>' + escHtml(name) + '</strong> with ' + data.length + ' questions.', 'success');
    }

    window._registerUploadedQuiz = registerUploadedQuiz;

    // Decrypt uploaded .bsq
    document.getElementById('btn-decrypt-file').addEventListener('click', async function() {
        var pwd = document.getElementById('decrypt-password').value;
        if (!pwd) { showUploadAlert('Enter a password first.', 'error'); return; }
        try {
            var data = await bsqDecrypt(window._pendingBsqText, pwd);
            document.getElementById('decrypt-prompt').style.display = 'none';
            document.getElementById('decrypt-password').value = '';
            registerUploadedQuiz(window._pendingBsqName.replace(/\.bsq$/i, '.json'), data);
        } catch(e) {
            showUploadAlert('Decryption failed — wrong password or corrupted file.', 'error');
        }
    });
})();
