/* ── BrainStuffer · Tactic Cycles trainer ────────────────────────────────
   Chessable's shape (a book you work through, auto-graded on a board)
   wrapped around the cycle schedule (one fixed set, whole-set cycles
   against a halving clock) instead of per-item spaced repetition.

   Three views: the course shelf, the solving screen, the cycle report.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var P = window.TCProgress;
/* The bundled chapters, plus an imported one if this browser has saved a set. */
var SET = [];
var byId = {};

function rebuildSet(){
  SET = [];
  /* A locally generated book set, if one has been built. It is optional:
     the script 404s harmlessly when absent, so guard on the binding. */
  try {
    if (typeof BOOK_SET !== 'undefined' && BOOK_SET && BOOK_SET.length){
      SET = SET.concat(BOOK_SET);
    }
  } catch (e) { /* not defined - bundled chapters only */ }
  /* Your own blunders, if tools/chesscom-to-puzzles.py has been run. Same
     shape, same guard: the file is gitignored and may not exist. */
  try {
    if (typeof OWN_SET !== 'undefined' && OWN_SET && OWN_SET.length){
      SET = SET.concat(OWN_SET);
    }
  } catch (e) { /* no personal set on this machine */ }
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
var PIECE_LONG = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };

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
  renderPiecePicker();
}

function renderSetup(){
  var host = $('#setup-tiers');
  if (!SET.length){
    /* The chapter file is generated locally and gitignored, so having none
       is the normal state on a fresh clone - say so instead of showing an
       empty list and a dead button. */
    host.innerHTML =
      '<div class="empty-set">' +
      '<b>No puzzle set on this machine.</b>' +
      '<span>Generate one from a book you own:</span>' +
      '<code>python tools/pdf-to-puzzles.py BOOK.pdf --chapter 32 69 224 247 ' +
      '--names "Easy" --js docs/js/book-set.js</code>' +
      '<span>Then reload the page. Or paste your own positions in below.</span>' +
      '</div>';
    $('#setup-total').textContent = '0';
    $('#setup-perday').textContent = '0';
    $('#setup-go').disabled = true;
    return;
  }
  host.innerHTML = SET.map(function(t, i){
    return '<label class="tier-pick">' +
      '<input type="checkbox" value="' + t.key + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<span class="tp-body"><b>' + t.label + '</b>' +
      '<span class="tp-meta">' + t.puzzles.length + ' puzzles</span>' +
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

/* ── Piece sets ───────────────────────────────────────────────────── */

var PREVIEW = ['wK', 'wN', 'bQ', 'bP'];
var previewsWanted = false;

function previewHost(){
  var el = document.getElementById('tc-piece-previews');
  if (!el){
    el = document.createElement('div');
    el.id = 'tc-piece-previews';
    el.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.insertBefore(el, document.body.firstChild);
  }
  return el;
}

/* Pull in each set's artwork and drop a namespaced copy into the hidden
   host, so all eight can be drawn at once without their ids colliding. */
function loadPreviews(){
  if (previewsWanted || !window.TCPieces) return;
  previewsWanted = true;
  var host = previewHost();
  window.TCPieces.SETS.forEach(function(s){
    if (document.getElementById('prev-' + s.key)) return;
    window.TCPieces.preview(s.key, function(sprite){
      if (!sprite) return;
      var box = document.createElement('div');
      box.id = 'prev-' + s.key;
      box.innerHTML = sprite;
      host.appendChild(box);
      var sw = document.querySelector('.pp[data-set="' + s.key + '"] .pp-row');
      if (sw) sw.innerHTML = swatch(s.key);
    });
  });
}

function swatch(key){
  return PREVIEW.map(function(p){
    return '<span><svg viewBox="0 0 45 45"><use href="#' + key + '-pc-' + p + '"/></svg></span>';
  }).join('');
}

function renderPiecePicker(){
  var host = $('#piece-pick');
  if (!host || !window.TCPieces) return;
  var TP = window.TCPieces, now = TP.current();

  host.innerHTML = TP.SETS.map(function(s){
    var ready = !!document.getElementById('prev-' + s.key);
    return '<button type="button" class="pp' + (s.key === now ? ' on' : '') +
           '" data-set="' + s.key + '" aria-pressed="' + (s.key === now) + '">' +
           '<span class="pp-row">' + (ready ? swatch(s.key) : '') + '</span>' +
           '<span class="pp-name">' + s.name + '</span>' +
           '<span class="pp-blurb">' + s.blurb + '</span></button>';
  }).join('');

  host.querySelectorAll('[data-set]').forEach(function(b){
    b.addEventListener('click', function(){
      var key = b.getAttribute('data-set');
      if (key === TP.current()) return;
      TP.use(key, function(){
        renderPiecePicker();
        S.board.render();
      });
    });
  });

  var info = TP.info(now);
  $('#piece-credit').innerHTML =
    '<b>' + info.name + '</b> by ' + info.credit + ' &middot; ' + info.licence +
    '. Piece art from the <a href="https://github.com/lichess-org/lila" ' +
    'target="_blank" rel="noopener">lichess</a> collection.' +
    (info.licence.indexOf('NC') !== -1
      ? ' <b>Non-commercial</b> \u2014 fine for personal study, not for a paid site.'
      : '');

  /* Fetch the swatches when the picker is actually looked at. */
  if (!previewsWanted){
    if (typeof IntersectionObserver === 'function'){
      var io = new IntersectionObserver(function(entries){
        if (entries.some(function(e){ return e.isIntersecting; })){
          io.disconnect();
          loadPreviews();
        }
      }, { rootMargin: '200px' });
      io.observe(host);
    } else {
      loadPreviews();
    }
  }
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
      return '<span class="off"><b>' + name + '</b><span>missed ' +
             o.misses + ' of ' + o.of + '</span></span>';
    }).join('') + '</div>';
}

/* ═══════════════════════════ solving ═════════════════════════════════ */

function loadPuzzle(id){
  var p = byId[id];
  if (!p){ finishSession(); return; }

  S.puzzle = p;
  S.uci = p.moves.split(' ');
  /* A puzzle posed the way a book poses it starts with YOU to move, so the
     solver answers uci[0]. A puzzle that instead opens with the opponent's
     mistake plays that first, and the solver answers uci[1]. */
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

  S.board.isolate = null;
  renderArrowKey();
  $('#explain').className = 'explain';
  $('#explain').innerHTML = '';
  $('#btn-explain').disabled = true;
  $('#btn-explain').classList.remove('on');
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

var ARROW_LABEL = ['Arrows off', "White's arrows", "Black's arrows"];
var ARROW_PIECES = [['q','queen'],['r','rook'],['b','bishop'],['n','knight'],
                    ['p','pawn'],['k','king']];

function renderArrowKey(){
  var el = $('#eye-key'), btn = $('#btn-arrows'), n = S.board.arrows;
  var iso = S.board.isolate ? S.board.game.get(S.board.isolate) : null;

  btn.classList.toggle('on', n > 0);
  btn.setAttribute('aria-pressed', n > 0 ? 'true' : 'false');
  btn.title = ARROW_LABEL[n] + ' \u2014 tap to change';

  if (!n && !iso){ el.className = 'eye-key'; el.innerHTML = ''; return; }
  el.className = 'eye-key on';

  var note;
  if (iso){
    note = 'Only the ' + (iso.color === 'w' ? 'white ' : 'black ') +
      PIECE_LONG[iso.type] + ' on <b>' + S.board.isolate +
      '</b>, including the pieces it defends. Tap it again for the rest.';
  } else {
    note = '<b>' + ARROW_LABEL[n] + '</b> \u2014 every square that side covers. ' +
      'Tap any piece for just its own.';
  }

  el.innerHTML = ARROW_PIECES.map(function(p){
    return '<span><i style="background:var(--eye-' + p[0] + ')"></i>' + p[1] + '</span>';
  }).join('') + '<span class="note">' + note + '</span>';
}

/* ── Explain ──────────────────────────────────────────────────────── */

var PIECE_FULL = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
var VALUE = { p:1, n:3, b:3, r:5, q:9, k:0 };

function materialFor(game, colour){
  return game.board().flat().filter(Boolean)
    .filter(function(p){ return p.color === colour; })
    .reduce(function(a, p){ return a + VALUE[p.type]; }, 0);
}

/* What the solution actually did, read off the board rather than asserted. */
function solutionFacts(p){
  var Chess = window.ChessJS.Chess;
  var g = new Chess(p.fen);
  var uci = p.moves.split(' ');
  var solver = p.solverFirst ? g.turn() : (g.turn() === 'w' ? 'b' : 'w');
  var before = materialFor(g, solver) - materialFor(g, solver === 'w' ? 'b' : 'w');

  var facts = [], captured = [], sans = [];
  uci.forEach(function(u, i){
    var mv;
    try { mv = g.move({ from:u.slice(0,2), to:u.slice(2,4), promotion:u.slice(4) || 'q' }); }
    catch (e) { mv = null; }
    if (!mv) return;
    sans.push(mv.san);
    if (mv.captured && mv.color === solver) captured.push({ type: mv.captured });
  });

  var after = materialFor(g, solver) - materialFor(g, solver === 'w' ? 'b' : 'w');
  var gain = after - before;

  /* Count the NET swing, not the captures. A mating combination often gives
     up more than it takes - saying "wins a pawn" about a rook sacrifice that
     ends in mate is just wrong. */
  if (g.isCheckmate()){
    facts.push({ t:'checkmate', cls:'mate' });
    if (gain < 0) facts.push({ t:'sacrifices ' + (-gain) + ' points', cls:'' });
  } else if (g.isStalemate()){
    facts.push({ t:'stalemate', cls:'' });
  } else if (gain > 0){
    facts.push({ t: (captured.length === 1 && gain === VALUE[captured[0].type])
                   ? 'wins the ' + PIECE_FULL[captured[0].type]
                   : 'wins ' + gain + ' point' + (gain === 1 ? '' : 's'), cls:'big' });
  } else if (gain < 0){
    facts.push({ t:'sacrifices ' + (-gain) + ' points', cls:'' });
  }
  if (g.inCheck() && !g.isCheckmate()) facts.push({ t:'with check', cls:'' });
  facts.push({ t: sans.length + (sans.length === 1 ? ' move' : ' moves'), cls:'' });

  return { facts: facts, mate: g.isCheckmate(), final: g,
           solver: solver, sans: sans };
}

/* Who is delivering mate, and from where. */
function matingNet(game){
  var loser = game.turn();
  var kingSq = null;
  game.board().forEach(function(row, ri){
    row.forEach(function(sq, fi){
      if (sq && sq.type === 'k' && sq.color === loser){
        kingSq = 'abcdefgh'[fi] + (8 - ri);
      }
    });
  });
  if (!kingSq) return [];
  var winner = loser === 'w' ? 'b' : 'w';
  return game.attackers(kingSq, winner).map(function(from){
    var p = game.get(from);
    return { from: from, to: kingSq, type: p ? p.type : 'q' };
  });
}

function toggleExplain(){
  var el = $('#explain');
  if (el.classList.contains('on')){
    el.classList.remove('on');
    $('#btn-explain').classList.remove('on');
    S.board.render();
    renderArrowKey();
    return;
  }
  renderExplain();
}

function renderExplain(){
  var p = S.puzzle, el = $('#explain');
  if (!p) return;
  var info = solutionFacts(p);

  var html = '<h4>Why this works</h4>';
  if (p.label) html += '<div class="game">' + p.label + '</div>';

  if (p.explain){
    /* bold the moves so the line stands out from the commentary */
    var prose = p.explain.replace(
      /\b(\d+\.(?:\.\.)?\s*)?((?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#!?]*)/g,
      function(m){ return '<b>' + m + '</b>'; });
    html += '<div class="prose">' + prose + '</div>';
  } else {
    html += '<div class="prose">' + info.sans.join(' ') +
            (info.mate ? ' \u2014 mate.' : '.') + '</div>';
  }

  html += '<div class="facts">' + info.facts.map(function(f){
    return '<span class="fact ' + f.cls + '">' + f.t + '</span>';
  }).join('') + '</div>';

  html += '<div class="src">' + (info.mate
    ? 'Arrows show every piece attacking the mated king.'
    : 'Arrows show what the moved piece covers now.') + '</div>';

  el.innerHTML = html;
  el.classList.add('on');
  $('#btn-explain').classList.add('on');

  /* Put the final position on the board with the explanatory arrows. */
  S.board.setFen(info.final.fen(), S.board.orient);
  S.board.setInteractive(false);
  if (info.mate){
    S.board.showArrows(matingNet(info.final));
  } else {
    var last = p.moves.split(' ').pop();
    var to = last.slice(2, 4);
    var pc = info.final.get(to);
    if (pc){
      S.board.isolate = to;
      S.board.render();
    }
  }
  renderArrowKey();
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

  /* An alternative mate in the same number of moves is still a solve. */
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

  /* "book" is not a motif worth a chip, and the game is already named under
     the prompt - so a book puzzle shows nothing here and lets Explain carry
     the detail. */
  $('#solve-motif').innerHTML = S.puzzle.themes.split(' ').filter(function(t){
    return t !== 'book' && t !== 'imported' && t !== 'own';
  }).map(function(t){
    return '<span class="motif">' + prettyMotif(t) + '</span>';
  }).join('') +
    '';

  $('#btn-hint').disabled = true;
  $('#btn-skip').disabled = true;
  $('#btn-explain').disabled = false;
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

  /* Pieces load asynchronously; redraw once the sprite is in. */
  if (window.TCPieces){
    window.TCPieces.init(function(){
      S.board.render();
      renderPiecePicker();
    });
  }

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
  $('#btn-arrows').addEventListener('click', function(){
    S.board.cycleArrows();
    renderArrowKey();
  });
  $('#btn-explain').addEventListener('click', toggleExplain);
  S.board.onArrows = renderArrowKey;
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
