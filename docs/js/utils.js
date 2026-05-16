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

function highlightCode(raw, lang) {
    if (lang !== 'c' && lang !== 'asm') return escHtml(raw);
    var result = '';
    var s = raw;
    var prevAlnum = false;
    function emit(tok, cls) {
        if (cls) result += '<span class="' + cls + '">' + escHtml(tok) + '</span>';
        else result += escHtml(tok);
        prevAlnum = tok.length > 0 && /[a-zA-Z0-9_]/.test(tok[tok.length - 1]);
        s = s.slice(tok.length);
    }
    if (lang === 'asm') {
        var rReg = /^(EAX|EBX|ECX|EDX|ESI|EDI|ESP|EBP|AX|BX|CX|DX|SI|DI|SP|BP|AL|AH|BL|BH|CL|CH|DL|DH|RAX|RBX|RCX|RDX|RSI|RDI|RSP|RBP|R8D|R9D|R10D|R11D|R12D|R13D|R14D|R15D|R8|R9|R10|R11|R12|R13|R14|R15)(?![a-zA-Z0-9_])/i;
        var rInstr = /^(MOVSX|MOVZX|PUSHAD|POPAD|REPNZ|REPNE|REPZ|REPE|PUSHA|POPA|PUSHF|POPF|XADD|XCHG|CWDE|CDQE|IMUL|IDIV|LODS|STOS|SCAS|MOVS|RETN|MOV|PUSH|POP|CALL|RET|JMP|JAE|JBE|JGE|JLE|JNE|JNZ|JE|JZ|JA|JB|JG|JL|ADD|SUB|MUL|DIV|AND|OR|XOR|NOT|NEG|SHL|SHR|SAL|SAR|ROL|ROR|INC|DEC|CMP|TEST|LEA|NOP|INT|LEAVE|ENTER|CDQ|CBW|REP)(?![a-zA-Z0-9_])/i;
        while (s.length) {
            var m;
            if (s[0] === ';') { var nl = s.indexOf('\n'); emit(nl < 0 ? s : s.slice(0, nl), 'hl-cmt'); continue; }
            if ((m = s.match(/^0x[0-9a-fA-F]+/i))) { emit(m[0], 'hl-num'); continue; }
            if (!prevAlnum && (m = s.match(/^[0-9][0-9a-fA-F]*h\b/i))) { emit(m[0], 'hl-num'); continue; }
            if (!prevAlnum && (m = s.match(/^[0-9]+/))) { emit(m[0], 'hl-num'); continue; }
            if (!prevAlnum && (m = s.match(rReg))) { emit(m[1], 'hl-reg'); continue; }
            if (!prevAlnum && (m = s.match(rInstr))) { emit(m[1], 'hl-kw'); continue; }
            emit(s[0], null);
        }
    } else {
        var rKw = /^(sizeof|typedef|struct|union|enum|unsigned|signed|volatile|register|extern|static|const|void|char|short|int|long|float|double|return|if|else|for|while|do|break|continue|switch|case|default|NULL|true|false|DWORD|HANDLE|BOOL|LPVOID|LPCSTR|LPSTR|HMODULE|WINAPI|PVOID|PCHAR|UINT|BYTE|WORD|QWORD|HWND|size_t|printf|malloc|free|calloc|realloc|memcpy|memset|strlen|strcmp|strcpy|strcat|scanf|fprintf|fopen|fclose|fread|fwrite|sprintf)(?![a-zA-Z0-9_])/;
        while (s.length) {
            var m;
            if (s.slice(0,2) === '//') { var nl = s.indexOf('\n'); emit(nl < 0 ? s : s.slice(0, nl), 'hl-cmt'); continue; }
            if (s.slice(0,2) === '/*') { var end = s.indexOf('*/'); emit(end < 0 ? s : s.slice(0, end + 2), 'hl-cmt'); continue; }
            if (s[0] === '#') { var nl = s.indexOf('\n'); emit(nl < 0 ? s : s.slice(0, nl), 'hl-pre'); continue; }
            if (s[0] === '"') { var i = 1; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; i++; } emit(s.slice(0, i + 1), 'hl-str'); continue; }
            if (s[0] === "'") { var i = 1; while (i < s.length && s[i] !== "'") { if (s[i] === '\\') i++; i++; } emit(s.slice(0, i + 1), 'hl-str'); continue; }
            if ((m = s.match(/^0x[0-9a-fA-F]+/i))) { emit(m[0], 'hl-num'); continue; }
            if (!prevAlnum && (m = s.match(/^[0-9]+(?:\.[0-9]+)?[uUlLfF]*/))) { emit(m[0], 'hl-num'); continue; }
            if (!prevAlnum && (m = s.match(rKw))) { emit(m[1], 'hl-kw'); continue; }
            emit(s[0], null);
        }
    }
    return result;
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
