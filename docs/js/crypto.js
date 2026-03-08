// ══════════════════════════════════════════════════════════════════
// BSQ CRYPTO (AES-GCM + PBKDF2)
// ══════════════════════════════════════════════════════════════════

async function bsqDeriveKey(password, salt) {
    var enc = new TextEncoder();
    var km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}

function bsqB64Enc(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function bsqB64Dec(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }

async function bsqEncrypt(plaintext, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv   = crypto.getRandomValues(new Uint8Array(12));
    var key  = await bsqDeriveKey(password, salt);
    var ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
    return JSON.stringify({ v:1, salt: bsqB64Enc(salt), iv: bsqB64Enc(iv), data: bsqB64Enc(ct) });
}

async function bsqDecrypt(ciphertext, password) {
    var obj = JSON.parse(ciphertext);
    if (!obj.v || !obj.salt || !obj.iv || !obj.data) throw new Error('Not a valid .bsq file');
    var key = await bsqDeriveKey(password, bsqB64Dec(obj.salt));
    var pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bsqB64Dec(obj.iv) }, key, bsqB64Dec(obj.data));
    var text = new TextDecoder().decode(pt);
    var data;
    try { data = safeJsonParse(text); } catch(e) {
        if (typeof jsyaml === 'undefined') {
            await new Promise(function(res, rej) {
                var s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
                s.onload = res; s.onerror = rej; document.head.appendChild(s);
            });
        }
        data = jsyaml.load(text);
    }
    if (!Array.isArray(data)) throw new Error('Decrypted content is not a question list');
    return data;
}
