// ══════════════════════════════════════════════════════════════════
// LEVEL SYSTEM — persistent XP across sessions
// ══════════════════════════════════════════════════════════════════

// Cumulative XP thresholds for each level (L1–L50; L12+ at +400 XP/level)
const _THRESHOLDS = [
    0, 30, 80, 155, 255, 390, 555, 755, 1005, 1305, 1655,
    2055, 2455, 2855, 3255, 3655, 4055, 4455, 4855, 5255,
    5655, 6055, 6455, 6855, 7255, 7655, 8055, 8455, 8855, 9255,
    9655, 10055, 10455, 10855, 11255, 11655, 12055, 12455, 12855, 13255,
    13655, 14055, 14455, 14855, 15255, 15655, 16055, 16455, 16855, 17255,
]; // 50 entries — index N = cumulative XP to reach level N+1

window.LEVEL_XP_CORRECT = 20;
window.LEVEL_XP_WRONG   = 25; // amount DEDUCTED on wrong answer

let _totalXp   = 0;
let _xpEnabled = false;

function _getLevel(xp) {
    for (let i = _THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= _THRESHOLDS[i]) return i + 1;
    }
    return 1;
}

function _getLevelProgress(xp) {
    const level = _getLevel(xp);
    const idx   = level - 1;
    const start = _THRESHOLDS[idx];
    if (level >= _THRESHOLDS.length) {
        // Max level (L50) — bar stays full
        const cost = start - (_THRESHOLDS[idx - 1] || 0);
        return { level, xpInLevel: cost, xpNeeded: cost, pct: 1, xpToNext: 0 };
    }
    const end = _THRESHOLDS[level];
    return {
        level,
        xpInLevel : xp - start,
        xpNeeded  : end - start,
        pct       : (xp - start) / (end - start),
        xpToNext  : end - xp,
    };
}

function _loadXp() {
    try { _totalXp = Math.max(0, parseInt(localStorage.getItem('bs-xp') || '0', 10) || 0); } catch(e) {}
}

function _saveXp() {
    try { localStorage.setItem('bs-xp', String(_totalXp)); } catch(e) {}
}

function _loadXpEnabled() {
    _xpEnabled = localStorage.getItem('bs-xp-enabled') === '1';
}

function _setXpEnabled(val) {
    _xpEnabled = val;
    try { localStorage.setItem('bs-xp-enabled', val ? '1' : '0'); } catch(e) {}
    const row    = document.getElementById('level-row');
    const toggle = document.getElementById('xp-mode-toggle');
    if (row)    row.style.display    = _xpEnabled ? '' : 'none';
    if (toggle) toggle.checked       = _xpEnabled;
    document.body.classList.toggle('xp-active', _xpEnabled);
}

function _updateLevelUI() {
    const prog  = _getLevelProgress(_totalXp);
    const level = prog.level;
    const tier  = level <= 1 ? 0 : level <= 5 ? 1 : level <= 10 ? 2
               : level <= 15 ? 3 : level <= 20 ? 4 : level <= 25 ? 5
               : level <= 30 ? 6 : level <= 35 ? 7 : level <= 40 ? 8
               : level <= 45 ? 9 : 10;

    document.documentElement.dataset.levelTier = tier;
    document.documentElement.dataset.level     = level;

    const badge = document.getElementById('level-badge');
    if (badge) {
        const cheater = localStorage.getItem('bs-cheater') === '1';
        badge.textContent = 'Lv.' + level + (cheater ? ' \u2620' : '');
        badge.title = cheater ? 'CHEATER' : '';
    }

    const fill = document.getElementById('xp-bar-fill');
    if (fill) fill.style.width = (prog.pct * 100).toFixed(1) + '%';

    const lbl = document.getElementById('xp-label');
    if (lbl) lbl.textContent = level >= _THRESHOLDS.length ? 'MAX LEVEL' : prog.xpInLevel + ' / ' + prog.xpNeeded + ' XP';

    // Danger indicator — within one wrong answer of dropping a level
    const row = document.getElementById('level-row');
    if (row) row.classList.toggle('level-danger', prog.xpInLevel < window.LEVEL_XP_WRONG && level > 1);
}

window.applyXP = function(amount) {
    if (!_xpEnabled) {
        const lv = _getLevel(_totalXp);
        return { oldLevel: lv, newLevel: lv, xpChange: 0 };
    }
    const oldXp    = _totalXp;
    const oldLevel = _getLevel(oldXp);
    const oldProg  = _getLevelProgress(oldXp);

    _totalXp = Math.max(0, _totalXp + amount);
    const newLevel = _getLevel(_totalXp);
    const newProg  = _getLevelProgress(_totalXp);

    _saveXp();

    // Animate XP bar
    const fill = document.getElementById('xp-bar-fill');
    if (fill) {
        if (newLevel > oldLevel) {
            // Level UP: fill to 100%, flash, then reset to new %
            fill.style.width = '100%';
            setTimeout(function() {
                fill.style.transition = 'none';
                fill.style.width = (newProg.pct * 100).toFixed(1) + '%';
                setTimeout(function() { fill.style.transition = ''; }, 60);
            }, 500);
        } else if (newLevel < oldLevel) {
            // Level DOWN: drain to 0, then snap to new %
            fill.style.width = '0%';
            setTimeout(function() {
                fill.style.transition = 'none';
                fill.style.width = (newProg.pct * 100).toFixed(1) + '%';
                setTimeout(function() { fill.style.transition = ''; }, 60);
            }, 600);
        } else {
            fill.style.width = (newProg.pct * 100).toFixed(1) + '%';
        }
    }

    _updateLevelUI();

    // Level change overlays
    if (newLevel > oldLevel) {
        _showLevelUp(newLevel);
    } else if (newLevel < oldLevel) {
        _showLevelDown(newLevel);
    }

    return { oldLevel, newLevel, xpChange: amount };
};

function _showLevelUp(level) {
    // Use existing showOverlay if available
    if (window.showOverlay) {
        showOverlay('Level Up! \u2192 Level ' + level, '\u2b06\ufe0f', 2200);
    }
    // Shake level row green
    const row = document.getElementById('level-row');
    if (row) {
        row.classList.add('level-up-flash');
        setTimeout(function() { row.classList.remove('level-up-flash'); }, 800);
    }
}

function _showLevelDown(level) {
    // Big red overlay
    const el = document.createElement('div');
    el.className = 'level-down-overlay';
    el.innerHTML = '<div class="level-down-text">LEVEL DOWN<br><span style="font-size:1.2rem;opacity:0.8">\u2192 Level ' + level + '</span></div>';
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 1400);

    // Screen shake
    document.body.classList.add('screen-shake');
    setTimeout(function() { document.body.classList.remove('screen-shake'); }, 500);
}

window.getCurrentLevel  = function() { return _getLevel(_totalXp); };
window.refreshLevelUI   = function() { _updateLevelUI(); };
window.getLevelProgress = function() { return _getLevelProgress(_totalXp); };

window.resetXP = function() {
    _totalXp = 0;
    _saveXp();
    _updateLevelUI();
};

// Init on load
_loadXp();
_loadXpEnabled();
_updateLevelUI();

// Wire XP toggle checkbox
(function() {
    const toggle = document.getElementById('xp-mode-toggle');
    const row    = document.getElementById('level-row');
    if (toggle) {
        toggle.checked = _xpEnabled;
        toggle.addEventListener('change', function() { _setXpEnabled(this.checked); });
    }
    if (row) row.style.display = _xpEnabled ? '' : 'none';
    document.body.classList.toggle('xp-active', _xpEnabled);
})();
