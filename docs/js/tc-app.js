/* ── BrainStuffer · Tactic Cycles trainer ────────────────────────────────
   Chessable's shape (a book you work through, auto-graded on a board)
   wrapped around the cycle schedule (one fixed set, whole-set cycles
   against a halving clock) instead of per-item spaced repetition.

   Three views: the course shelf, the solving screen, the cycle report.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var P = window.TCProgress;
/* tactic-set.js declares `const TACTIC_SET`, which is a lexical
   global — visible to other classic scripts, but NOT a property of window. */
/* The bundled chapters, plus an imported one if this browser has saved a set. */
var SET = [];
var byId = {};

function rebuildSet(){
  SET = TACTIC_SET.slice();
  /* A locally generated book set, if one has been built. It is optional:
     the script 404s harmlessly when absent, so guard on the binding. */
  try {
    if (typeof BOOK_SET !== 'undefined' && BOOK_SET && BOOK_SET.length){
      SET = SET.concat(BOOK_SET);
    }
  } catch (e) { /* not defined - bundled chapters only */ }
  var custom = window.TCImport && window.TCImport.load();
  if (custom){
    SET.push({ key: 'custom', label: custom.label || 'My set',
               band: 'imported', puzzles: custom.puzzles });
  }
  byId = {};
  SET.forEach(function(t){
    t.puzzles.forEach(function(p){ byId[p.id] = p; p.tier = t.key; });
  });
  if (window.TCApp) window.TCApp.byId = byId;
}
rebuildSet();

var $ = function(s){ return document.querySelector(s); };

/* ── solving state ────────────────────────────────────────────────── */
var S = {
  board: null,
  puzzle: null,
  uci: [],
  ply: 0,            /* index into uci of the move the solver must play next */
  startedAt: 0,
  firstTry: true,
  solvedNow: false,
  busy: false
};

function fmtTime(sec){
  if (sec < 60) return sec + 's';
  var m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm ' + String(s).padStart(2, '0') + 's';
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}

function prettyMotif(t){
  return t.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function show(view){
  ['shelf', 'solve', 'report'].forEach(function(v){
    $('#view-' + v).classList.toggle('on', v === view);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════ shelf ═══════════════════════════════════ */

function renderShelf(){
  var started = P.started();
  $('#setup').style.display = started ? 'none' : '';
  $('#course').style.display = started ? '' : 'none';
  if (started) renderCourse(); else renderSetup();
}

function renderSetup(){
  var host = $('#setup-tiers');
  host.innerHTML = SET.map(function(t){
    return '<label class="tier-pick">' +
      '<input type="checkbox" value="' + t.key + '"' + (t.key === 'easy' ? ' checked' : '') + '>' +
      '<span class="tp-body"><b>' + t.label + '</b>' +
      '<span class="tp-meta">' + t.puzzles.length + ' puzzles &middot; lichess rating ' + t.band + '</span>' +
      '</span></label>';
  }).join('');
  host.onchange = updateSetupTotal;    /* assign, not add - renderSetup re-runs */
  updateSetupTotal();
}

function chosenKeys(){
  return [].slice.call(document.querySelectorAll('#setup-tiers input:checked'))
           .map(function(i){ return i.value; });
}

function updateSetupTotal(){
  var keys = chosenKeys();
  var n = SET.filter(function(t){ return keys.indexOf(t.key) !== -1; })
             .reduce(function(a, t){ return a + t.puzzles.length; }, 0);
  $('#setup-total').textContent = n;
  $('#setup-perday').textContent = n ? Math.ceil(n / 28) : 0;
  $('#setup-go').disabled = n === 0;
}

function beginCourse(){
  var keys = chosenKeys();
  if (!keys.length) return;
  var ids = [];
  SET.forEach(function(t){
    if (keys.indexOf(t.key) !== -1) t.puzzles.forEach(function(p){ ids.push(p.id); });
  });
  P.begin(keys, ids);
  renderShelf();
}

function renderCourse(){
  var s = P.state;
  var done = P.doneCount(), size = P.size(), pace = P.pace();
  var finished = P.finished();

  $('#cycle-n').textContent = finished ? '✓' : s.cycle;
  $('#cycle-of').textContent = finished ? 'method complete' :
    'of ' + P.MAX_CYCLE + ' · day ' + P.dayOfCycle() + ' of ' + P.target();
  $('#cycle-bar').style.width = (size ? (100 * done / size) : 0) + '%';
  $('#cycle-count').textContent = done + ' / ' + size;

  var pe = $('#pace');
  if (finished){
    pe.className = 'pace ok';
    pe.innerHTML = 'You have finished the method. Build a new set to go again.';
  } else if (P.cycleComplete()){
    pe.className = 'pace ok';
    pe.innerHTML = 'Cycle ' + s.cycle + ' complete — close it out below.';
  } else {
    pe.className = 'pace ' + (P.onPace() ? 'ok' : 'behind');
    pe.innerHTML = '<b>' + pace.perDay + '</b> a day for the next <b>' + pace.daysLeft +
      '</b> day' + (pace.daysLeft === 1 ? '' : 's') + ' to finish cycle ' + s.cycle + ' on time' +
      (P.onPace() ? '' : ' — you are behind pace');
  }

  /* chapter rows */
  $('#chapters').innerHTML = SET.filter(function(t){
    return s.chapters.indexOf(t.key) !== -1;
  }).map(function(t){
    var d = t.puzzles.filter(function(p){ return P.isDone(p.id); }).length;
    var f = t.puzzles.filter(function(p){
      return P.isDone(p.id) && !s.solved[p.id].ok;
    }).length;
    return '<div class="chapter">' +
      '<div class="ch-head"><b>' + t.label + '</b>' +
        '<span class="ch-n">' + d + ' / ' + t.puzzles.length + '</span></div>' +
      '<div class="ch-bar"><span style="width:' + (100 * d / t.puzzles.length) + '%"></span></div>' +
      '<div class="ch-meta">rating ' + t.band +
        (f ? ' · <span class="miss">' + f + ' missed this cycle</span>' : '') + '</div>' +
      '</div>';
  }).join('');

  $('#btn-train').disabled = P.cycleComplete() || finished;
  $('#btn-train').textContent = done === 0 ? 'Start cycle ' + s.cycle : 'Continue →';
  $('#btn-close-cycle').style.display = (P.cycleComplete() && !finished) ? '' : 'none';

  renderCycleTable();
  renderOffenders();
}

function renderCycleTable(){
  var rows = P.summary();
  var host = $('#cycle-table');
  if (!rows.length){ host.innerHTML = ''; return; }
  host.innerHTML =
    '<h3>Cycles so far</h3><table class="ctab"><thead><tr>' +
    '<th>Cycle</th><th>Days</th><th>Target</th><th>First try</th><th>Avg</th><th>Total</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(r){
      return '<tr><td>' + r.n + '</td><td>' + r.days + '</td><td>' + r.target + '</td>' +
             '<td>' + r.accuracy + '%</td><td>' + r.avgSec + 's</td><td>' + r.totalMin + 'm</td></tr>';
    }).join('') + '</tbody></table>';
}

function renderOffenders(){
  var list = P.repeatOffenders().slice(0, 12);
  var host = $('#offenders');
  if (!list.length){ host.innerHTML = ''; return; }
  host.innerHTML = '<h3>Blind spots</h3>' +
    '<p class="hint">Missed in two or more cycles. These are the patterns that have not stuck yet.</p>' +
    '<div class="off-grid">' + list.map(function(o){
      var p = byId[o.id];
      var name = p ? (p.label || prettyMotif(p.themes.split(' ')[0])) : o.id;
      var body = '<b>' + name + '</b><span>missed ' + o.misses +
                 ' of ' + o.of + '</span>';
      return (p && (p.tier === 'custom' || String(p.tier).indexOf('bk-') === 0))
        ? '<span class="off">' + body + '</span>'
        : '<a class="off" href="https://lichess.org/training/' + o.id +
          '" target="_blank" rel="noopener">' + body + '</a>';
    }).join('') + '</div>';
}

/* ═══════════════════════════ solving ═════════════════════════════════ */

function loadPuzzle(id){
  var p = byId[id];
  if (!p){ finishSession(); return; }

  S.puzzle = p;
  S.uci = p.moves.split(' ');
  /* Lichess puzzles open with the opponent's mistake, so the solver answers
     uci[1]. An imported puzzle is posed the way a book poses it - you to
     move - so the solver starts at uci[0]. */
  S.solverFirst = !!p.solverFirst;
  S.ply = S.solverFirst ? 0 : 1;
  S.firstTry = true;
  S.solvedNow = false;
  S.busy = true;

  /* The FEN is the position BEFORE the opponent blunders. Show that, then
     play their move so the learner SEES what just happened — guessing from
     a cold position is a different (worse) exercise. */
  S.board.setFen(p.fen);
  var solverColour = S.solverFirst
    ? S.board.game.turn()
    : (S.board.game.turn() === 'w' ? 'b' : 'w');
  S.board.orient = solverColour;
  S.board.setInteractive(false);
  S.board.render();

  $('#solve-motif').textContent = '';
  $('#solve-fb').textContent = '';
  $('#solve-fb').className = 'fb';
  $('#btn-hint').disabled = false;
  $('#btn-skip').disabled = false;
  $('#btn-next').disabled = true;      /* nothing to advance to until it is solved */
  $('#solve-turn').innerHTML = '&hellip;';

  var begin = function(){
    S.board.setInteractive(true);
    S.busy = false;
    S.startedAt = Date.now();
    $('#solve-turn').innerHTML = '<b>' + (solverColour === 'w' ? 'White' : 'Black') +
      '</b> to play &mdash; find the best move' +
      (p.label ? '<span class="plabel">' + p.label + '</span>' : '');
    updateSolveHeader();
  };
  if (S.solverFirst){
    setTimeout(begin, 120);          /* the position IS the question */
  } else {
    setTimeout(function(){ S.board.playUci(S.uci[0]); begin(); }, 520);
  }
}

function updateSolveHeader(){
  var done = P.doneCount(), size = P.size();
  $('#solve-prog').textContent = done + ' / ' + size;
  $('#solve-cycle').textContent = 'Cycle ' + P.state.cycle;
  $('#solve-bar').style.width = (size ? 100 * done / size : 0) + '%';
}

function onUserMove(mv){
  if (S.busy || S.solvedNow) return;
  var want = S.uci[S.ply];
  var got  = mv.from + mv.to + (mv.promotion || '');
  var wantNorm = want.length === 5 ? want : want.slice(0, 4);
  var gotNorm  = want.length === 5 ? got : got.slice(0, 4);

  /* An alternative mate in the same number of moves is still a solve —
     lichess accepts this and so should we. */
  var alsoFine = S.board.game.isCheckmate() && S.ply === S.uci.length - 1;

  if (gotNorm !== wantNorm && !alsoFine){
    S.firstTry = false;
    S.board.undo();
    S.board.setInteractive(true);
    var fb = $('#solve-fb');
    fb.className = 'fb no';
    fb.textContent = 'Not that one — try again.';
    return;
  }

  S.ply += 1;
  if (S.ply >= S.uci.length){ solved(); return; }

  /* opponent's reply */
  S.busy = true;
  S.board.setInteractive(false);
  $('#solve-fb').className = 'fb ok';
  $('#solve-fb').textContent = 'Correct — keep going.';
  setTimeout(function(){
    S.board.playUci(S.uci[S.ply]);
    S.ply += 1;
    S.board.setInteractive(true);
    S.busy = false;
    $('#solve-fb').textContent = '';
    $('#solve-fb').className = 'fb';
  }, 420);
}

function solved(){
  S.solvedNow = true;
  S.board.setInteractive(false);
  var ms = Date.now() - S.startedAt;
  P.record(S.puzzle.id, S.firstTry, ms);

  var fb = $('#solve-fb');
  fb.className = 'fb ' + (S.firstTry ? 'ok' : 'no');
  fb.innerHTML = (S.firstTry ? '✓ Solved' : '✓ Solved, but not first time') +
    ' · ' + fmtTime(Math.round(ms / 1000));

  $('#solve-motif').innerHTML = S.puzzle.themes.split(' ').map(function(t){
    return '<span class="motif">' + prettyMotif(t) + '</span>';
  }).join('') +
    ((S.puzzle.tier === 'custom' || String(S.puzzle.tier).indexOf('bk-') === 0) ? ''
      : '<a class="motif link" href="https://lichess.org/training/' + S.puzzle.id +
        '" target="_blank" rel="noopener">lichess ↗</a>');

  $('#btn-hint').disabled = true;
  $('#btn-skip').disabled = true;
  $('#btn-next').disabled = false;
  updateSolveHeader();

  if (P.cycleComplete()){
    setTimeout(function(){ show('shelf'); renderShelf(); }, 900);
  }
}

function nextPuzzle(){
  var id = P.nextId();
  if (!id){ finishSession(); return; }
  loadPuzzle(id);
}

function finishSession(){
  show('shelf');
  renderShelf();
}

function hint(){
  if (S.busy || S.solvedNow) return;
  S.firstTry = false;
  var from = S.uci[S.ply].slice(0, 2);
  S.board.clearMarks();
  S.board.mark(from, 'hintsq');
  S.board.render();
  $('#solve-fb').className = 'fb';
  $('#solve-fb').textContent = 'Move this piece.';
}

function skip(){
  if (S.busy || S.solvedNow) return;
  S.firstTry = false;
  /* play out the rest so the pattern is seen, not skipped past */
  S.board.setInteractive(false);
  S.busy = true;
  var step = function(){
    if (S.ply >= S.uci.length){
      S.busy = false;
      solved();
      return;
    }
    S.board.playUci(S.uci[S.ply]);
    S.ply += 1;
    setTimeout(step, 420);
  };
  $('#solve-fb').className = 'fb no';
  $('#solve-fb').textContent = 'Shown — watch the pattern.';
  setTimeout(step, 300);
}

/* ═══════════════════════════ cycle report ════════════════════════════ */

function closeCycle(){
  var prev = P.summary();
  var rec = P.advance();
  if (!rec) return;
  var rows = P.summary();
  var me = rows[rows.length - 1];
  var before = prev.length ? prev[prev.length - 1] : null;

  var verdict;
  if (!before){
    verdict = 'Baseline set. Cycle 2 should take about <b>' + P.target() +
              ' days</b> — half of this one.';
  } else {
    var faster = before.avgSec - me.avgSec;
    verdict = 'Accuracy ' + (me.accuracy >= before.accuracy ? 'up' : 'down') + ' to <b>' +
      me.accuracy + '%</b>, average ' + (faster > 0 ? '<b>' + faster + 's faster</b>' :
      '<b>' + Math.abs(faster) + 's slower</b>') + ' per puzzle.';
  }

  $('#report-body').innerHTML =
    '<div class="rpt-big">Cycle ' + me.n + ' done</div>' +
    '<div class="rpt-grid">' +
      '<div><span>Days taken</span><b>' + me.days + '</b><i>target ' + me.target + '</i></div>' +
      '<div><span>First try</span><b>' + me.accuracy + '%</b><i>' + rec.firstTry + ' of ' + rec.count + '</i></div>' +
      '<div><span>Average</span><b>' + me.avgSec + 's</b><i>per puzzle</i></div>' +
      '<div><span>Time on board</span><b>' + me.totalMin + 'm</b><i>this cycle</i></div>' +
    '</div>' +
    '<p class="rpt-verdict">' + verdict + '</p>' +
    (P.finished()
      ? '<p class="rpt-verdict">That is the method complete — ' +
        (rec.days <= 1 ? 'you cleared the whole set in a day.' : 'seven cycles done.') + '</p>'
      : '<p class="hint">Rest a day or two before cycle ' + P.state.cycle +
        '. The book is explicit about the break.</p>');

  show('report');
}

/* ═══════════════════════════ wiring ══════════════════════════════════ */

function init(){
  S.board = window.TCBoard($('#board-host'));
  S.board.onMove = onUserMove;

  $('#setup-go').addEventListener('click', beginCourse);
  $('#btn-train').addEventListener('click', function(){
    var id = P.nextId();
    if (!id) return;
    show('solve');
    loadPuzzle(id);
  });
  $('#btn-next').addEventListener('click', function(){
    if (!S.solvedNow) return;
    nextPuzzle();
  });
  $('#btn-hint').addEventListener('click', hint);
  $('#btn-skip').addEventListener('click', skip);
  $('#btn-quit').addEventListener('click', finishSession);
  $('#btn-flip').addEventListener('click', function(){ S.board.flip(); });
  $('#btn-close-cycle').addEventListener('click', closeCycle);
  $('#btn-report-done').addEventListener('click', function(){ show('shelf'); renderShelf(); });

  $('#btn-reset').addEventListener('click', function(){
    if ($('#btn-reset').dataset.armed !== '1'){
      $('#btn-reset').dataset.armed = '1';
      $('#btn-reset').textContent = 'Tap again to erase all progress';
      setTimeout(function(){
        $('#btn-reset').dataset.armed = '0';
        $('#btn-reset').textContent = 'Reset course';
      }, 4000);
      return;
    }
    P.reset();
    $('#btn-reset').dataset.armed = '0';
    $('#btn-reset').textContent = 'Reset course';
    renderShelf();
  });

  wireImport();
  renderShelf();
  show('shelf');
}

function wireImport(){
  var go = $('#import-go'), rm = $('#import-clear'), fb = $('#import-fb');
  if (!go || !window.TCImport) return;

  var existing = window.TCImport.load();
  if (existing){
    fb.className = 'import-fb ok';
    fb.textContent = '"' + existing.label + '" loaded \u2014 ' +
      existing.puzzles.length + ' puzzles, listed as a chapter above.';
  }

  go.addEventListener('click', function(){
    var text = $('#import-text').value.trim();
    if (!text){
      fb.className = 'import-fb no';
      fb.textContent = 'Nothing to import.';
      return;
    }
    var res = window.TCImport.parse(text);
    if (!res.puzzles.length){
      fb.className = 'import-fb no';
      fb.innerHTML = 'No puzzles could be read from that ' + res.format + '.' +
        (res.errors.length ? '<ul><li>' + res.errors.slice(0, 6).join('</li><li>') +
         '</li></ul>' : '');
      return;
    }
    var label = ($('#import-label').value || '').trim() || 'My set';
    var saved = window.TCImport.save(label, res.puzzles);
    if (saved && saved.error){
      fb.className = 'import-fb no';
      fb.textContent = saved.error;
      return;
    }
    rebuildSet();
    fb.className = 'import-fb ok';
    fb.innerHTML = 'Imported <b>' + res.puzzles.length + '</b> puzzles from ' +
      res.format + ' as "' + label + '".' +
      (res.errors.length
        ? ' <b>' + res.errors.length + ' skipped:</b><ul><li>' +
          res.errors.slice(0, 6).join('</li><li>') + '</li></ul>'
        : '');
    renderSetup();
  });

  rm.addEventListener('click', function(){
    window.TCImport.clear();
    rebuildSet();
    fb.className = 'import-fb';
    fb.textContent = 'Imported set removed.';
    renderSetup();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

window.TCApp = { byId: byId, state: S, render: renderShelf, loadPuzzle: loadPuzzle,
                 closeCycle: closeCycle, nextPuzzle: nextPuzzle,
                 rebuildSet: rebuildSet, sets: function(){ return SET; } };

})();
