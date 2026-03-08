// ══════════════════════════════════════════════════════════════════
// GITHUB LOADER
// ══════════════════════════════════════════════════════════════════
(function() {
    var ghFiles = [];

    function ghAlert(msg, type) {
        var w = document.getElementById('github-alert-wrap');
        w.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
        setTimeout(function() { w.innerHTML = ''; }, 7000);
    }

    var SELF_REPO = 'magna-sec/brainstuffer';

    function parseGithubUrl(raw) {
        var url = raw.trim();
        // "self" shortcut — loads this repo
        if (url.toLowerCase() === 'self') url = 'https://github.com/' + SELF_REPO;
        // Allow "user/repo" shorthand
        if (/^[^/\s]+\/[^/\s]+$/.test(url)) url = 'https://github.com/' + url;
        // Allow github.com/... without scheme
        if (/^github\.com\//.test(url)) url = 'https://' + url;
        var m = url.match(/github\.com\/([^/]+)\/([^/?\s]+)(?:\/tree\/([^/\s]+)(?:\/(.+))?)?/);
        if (!m) return null;
        return { owner: m[1], repo: m[2].replace(/\.git$/, ''), branch: m[3] || '', path: m[4] || '' };
    }

    async function fetchContents(owner, repo, path, branch) {
        var url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
        if (branch) url += '?ref=' + encodeURIComponent(branch);
        var res = await fetch(url);
        if (!res.ok) throw new Error('GitHub API error ' + res.status + ' \u2014 is the repo public?');
        var items = await res.json();
        var files = [];
        for (var item of items) {
            if (item.type === 'file' && /\.(ya?ml|json|bsq)$/i.test(item.name)) {
                files.push({ name: item.path, download_url: item.download_url, encrypted: /\.bsq$/i.test(item.name) });
            } else if (item.type === 'dir') {
                var sub = await fetchContents(owner, repo, item.path, branch);
                files = files.concat(sub);
            }
        }
        return files;
    }

    document.getElementById('btn-github-load').addEventListener('click', async function() {
        var url = document.getElementById('github-url').value.trim();
        if (!url) { ghAlert('Paste a GitHub URL first.', 'error'); return; }
        var parsed = parseGithubUrl(url);
        if (!parsed) { ghAlert('Could not parse URL \u2014 use https://github.com/user/repo format.', 'error'); return; }
        this.textContent = 'Searching\u2026'; this.disabled = true;
        try {
            ghFiles = await fetchContents(parsed.owner, parsed.repo, parsed.path, parsed.branch);
            if (!ghFiles.length) { ghAlert('No compatible files found in that repo.', 'error'); return; }
            var sel = document.getElementById('github-file-select');
            sel.innerHTML = '';
            ghFiles.forEach(function(f, i) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = f.name + (f.encrypted ? ' \uD83D\uDD12' : '');
                sel.appendChild(opt);
            });
            document.getElementById('github-file-list').style.display = '';
            document.getElementById('github-decrypt-prompt').style.display = ghFiles[0].encrypted ? '' : 'none';
            ghAlert('Found ' + ghFiles.length + ' file' + (ghFiles.length !== 1 ? 's' : '') + '.', 'success');
        } catch(e) { ghAlert(e.message, 'error'); }
        finally { this.textContent = 'Browse Repo'; this.disabled = false; }
    });

    document.getElementById('github-file-select').addEventListener('change', function() {
        var f = ghFiles[parseInt(this.value)];
        document.getElementById('github-decrypt-prompt').style.display = f && f.encrypted ? '' : 'none';
    });

    document.getElementById('btn-github-load-file').addEventListener('click', async function() {
        var idx = parseInt(document.getElementById('github-file-select').value);
        var f = ghFiles[idx]; if (!f) return;
        this.textContent = 'Loading\u2026'; this.disabled = true;
        try {
            var res = await fetch(f.download_url);
            if (!res.ok) throw new Error('Failed to fetch file');
            var text = await res.text();
            var data;
            if (f.encrypted) {
                var pwd = document.getElementById('github-decrypt-password').value;
                if (!pwd) { ghAlert('Enter the password to decrypt this file.', 'error'); return; }
                data = await bsqDecrypt(text, pwd);
            } else if (/\.json$/i.test(f.name)) {
                data = safeJsonParse(text);
            } else {
                if (typeof jsyaml === 'undefined') {
                    await new Promise(function(res, rej) {
                        var s = document.createElement('script');
                        s.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
                        s.onload = res; s.onerror = rej; document.head.appendChild(s);
                    });
                }
                data = jsyaml.load(text);
            }
            window._registerUploadedQuiz(f.name.split('/').pop(), data);
            ghAlert('Loaded <strong>' + escHtml(f.name) + '</strong> \u2014 ' + data.length + ' questions.', 'success');
        } catch(e) { ghAlert('Error: ' + e.message, 'error'); }
        finally { this.textContent = 'Load Selected File'; this.disabled = false; }
    });
})();
