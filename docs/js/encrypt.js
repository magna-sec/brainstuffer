// ══════════════════════════════════════════════════════════════════
// ENCRYPT & DOWNLOAD
// ══════════════════════════════════════════════════════════════════
(function() {
    var encZone  = document.getElementById('encrypt-zone');
    var encInput = document.getElementById('encrypt-file-upload');
    var encAlert = document.getElementById('encrypt-alert-wrap');
    var pending  = null;

    function alert2(msg, type) {
        encAlert.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
        setTimeout(function() { encAlert.innerHTML = ''; }, 6000);
    }

    encZone.addEventListener('click', function() { encInput.click(); });
    encZone.addEventListener('dragover', function(e) { e.preventDefault(); encZone.classList.add('dragover'); });
    encZone.addEventListener('dragleave', function() { encZone.classList.remove('dragover'); });
    encZone.addEventListener('drop', function(e) {
        e.preventDefault(); encZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });
    encInput.addEventListener('change', function() {
        if (encInput.files.length) setFile(encInput.files[0]);
        encInput.value = '';
    });

    function setFile(file) {
        if (!/\.(ya?ml|json)$/i.test(file.name)) { alert2('Only .yml, .yaml, or .json files can be encrypted.', 'error'); return; }
        pending = file;
        encZone.querySelector('.upload-zone-text').textContent = file.name;
        document.getElementById('encrypt-controls').style.display = '';
    }

    document.getElementById('btn-encrypt-download').addEventListener('click', async function() {
        if (!pending) { alert2('Select a file first.', 'error'); return; }
        var pwd  = document.getElementById('encrypt-password').value;
        var pwd2 = document.getElementById('encrypt-password2').value;
        if (!pwd)        { alert2('Enter a password.', 'error'); return; }
        if (pwd !== pwd2) { alert2('Passwords do not match.', 'error'); return; }
        this.textContent = 'Encrypting\u2026'; this.disabled = true;
        try {
            var text = await pending.text();
            var enc  = await bsqEncrypt(text, pwd);
            var name = pending.name.replace(/\.(ya?ml|json)$/i, '') + '.bsq';
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([enc], { type: 'application/octet-stream' }));
            a.download = name; a.click(); URL.revokeObjectURL(a.href);
            alert2('Downloaded <strong>' + escHtml(name) + '</strong>', 'success');
            document.getElementById('encrypt-password').value = '';
            document.getElementById('encrypt-password2').value = '';
        } catch(e) { alert2('Encryption failed: ' + e.message, 'error'); }
        finally { this.textContent = '\u2B07 Encrypt & Download'; this.disabled = false; }
    });
})();
