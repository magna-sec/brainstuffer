/* ── BrainStuffer · chess trainer · Walkthrough ──────────────────────────────────
   Steps an opening one ply at a time with narrative, plain-English move
   translation, and inline comprehension quizzes.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var K = window.ChessKit;
var X = window.ChessExplorer;
var posAfter = K.posAfter;
var moveNo = K.moveNo;
var isWhitePly = K.isWhitePly;
var plainEnglish = K.plainEnglish;
var shuffle = K.shuffle;
var BoardView = K.BoardView;
var renderMoveList = K.renderMoveList;
var resolveLine = K.resolveLine;
var forksAt = K.forksAt;
var uciPath = K.uciPath;


var L = {
  op: CHESS_OPENINGS[0],
  path: [],               /* chosen variation, [] = main line */
  line: null,             /* resolveLine() of op + path */
  ply: 0,                 /* how many moves have been played */
  plain: true,
  answered: false,
  board: BoardView(document.getElementById('learn-board'))
};

(function buildLearnPills(){
  var bar = document.getElementById('learn-pills');
  bar.innerHTML = CHESS_OPENINGS.map(function(o, i){
    return '<button type="button" class="pill' + (i === 0 ? ' on' : '') +
           '" data-op="' + o.id + '">' + o.name + '</button>';
  }).join('');
  bar.addEventListener('click', function(e){
    var id = e.target.getAttribute && e.target.getAttribute('data-op');
    if (!id) return;
    bar.querySelectorAll('.pill').forEach(function(p){ p.classList.remove('on'); });
    e.target.classList.add('on');
    L.op = CHESS_OPENINGS.filter(function(o){ return o.id === id; })[0];
    L.path = [];
    L.ply = 0;
    L.board.orient = L.op.side;
    learnRender();
  });
})();

function learnRender(){
  var op = L.op, i = L.ply;
  L.line = resolveLine(op, L.path);
  var moves = L.line.moves;
  if (i > moves.length){ i = L.ply = moves.length; }

  document.getElementById('learn-head').innerHTML =
    '<div style="font-size:.95rem;font-weight:800;color:var(--accent);">' + op.name +
    ' <span style="font-size:.68rem;color:var(--muted);font-weight:400;">' + L.line.eco + ' · ' + op.tag +
    '</span></div>' +
    '<div style="font-size:.78rem;color:var(--subtle);line-height:1.55;margin-top:.25rem;">' + op.idea + '</div>';

  L.board.pos = posAfter(moves, i);
  L.board.coords = document.getElementById('learn-coords').classList.contains('on');
  L.board.markMove(i > 0 ? moves[i - 1] : null);
  L.board.render();

  renderMoveList(document.getElementById('learn-moves'), moves, i, function(k){
    L.ply = k + 1; L.answered = false; learnRender();
  }, true);

  renderVariations(moves, i);

  var narr = document.getElementById('learn-narr');
  if (i === 0){
    narr.innerHTML = '<b>Starting position.</b> ' + op.blurb +
      ' Press <b>Next</b> to play through the line one move at a time.' +
      (op.side === 'b' ? ' You will be playing <b>Black</b>, so the board is shown from Black’s side.' : '');
  } else {
    var mv  = moves[i - 1];
    var pre = posAfter(moves, i - 1);
    var num = moveNo(i - 1) + (isWhitePly(i - 1) ? '.' : '...');
    var h = '<div style="font-family:\'Courier New\',monospace;font-size:.95rem;font-weight:800;' +
            'color:var(--accent);margin-bottom:.4rem;">' + num + ' ' + mv.san + '</div>' + mv.note;
    if (L.plain) h += '<div class="plain">' + plainEnglish(pre, mv) + '</div>';
    narr.innerHTML = h;
  }

  var qbox = document.getElementById('learn-quiz');
  var qmv  = i > 0 ? moves[i - 1] : null;
  if (qmv && qmv.quiz && !L.answered) renderLearnQuiz(qbox, qmv.quiz);
  else if (qmv && qmv.quiz && L.answered) { /* leave rendered result in place */ }
  else qbox.innerHTML = '';

  document.getElementById('learn-prev').disabled  = i === 0;
  document.getElementById('learn-first').disabled = i === 0;
  document.getElementById('learn-next').disabled  = i >= moves.length;
  document.getElementById('learn-next').textContent =
    i >= moves.length ? 'Line complete ✓' : 'Next →';

  refreshExplorer(moves, i);
}

/* ── Variations ─────────────────────────────────────────────────────── */

function renderVariations(moves, ply){
  var host = document.getElementById('learn-vars');
  /* Fork choices come from the line WITHOUT any choice made at this ply --
     otherwise, once a branch is taken, its own first move has no `branches`
     and the fork would vanish along with the way back to the main line. */
  var base  = resolveLine(L.op, L.path.filter(function(s){ return s.ply < ply; }));
  var forks = forksAt(base, ply);
  var inBranch = L.path.length > 0;

  if (!forks.length && !inBranch){ host.innerHTML = ''; return; }

  var h = '';
  if (inBranch) h += '<span class="var-cur">' + L.line.name + '</span>';

  if (forks.length){
    var onMain = !L.path.some(function(s){ return s.ply === ply; });
    h += '<span class="var-lbl">At this point you can also play:</span>';
    h += '<button type="button" class="pill' + (onMain ? ' on' : '') +
         '" data-br="main">' + mainMoveAt(ply) + '</button>';
    forks.forEach(function(br, idx){
      var active = L.path.some(function(s){ return s.ply === ply && s.idx === idx; });
      h += '<button type="button" class="pill' + (active ? ' on' : '') +
           '" data-br="' + idx + '">' + br.moves[0].san +
           (br.name ? ' · ' + br.name : '') + '</button>';
    });
  } else {
    h += '<button type="button" class="pill" data-br="reset">&#8592; back to the main line</button>';
  }
  host.innerHTML = h;

  host.querySelectorAll('[data-br]').forEach(function(b){
    b.addEventListener('click', function(){
      var v = b.getAttribute('data-br');
      if (v === 'reset'){ L.path = []; L.ply = 0; }
      else {
        L.path = L.path.filter(function(s){ return s.ply < ply; });
        if (v !== 'main') L.path.push({ ply: ply, idx: parseInt(v, 10) });
      }
      L.answered = false;
      learnRender();
    });
  });
}

/* The move played at `ply` when no branch is taken there. */
function mainMoveAt(ply){
  var base = resolveLine(L.op, L.path.filter(function(s){ return s.ply < ply; }));
  return base.moves[ply] ? base.moves[ply].san : '—';
}

/* ── Lichess explorer ───────────────────────────────────────────────── */

function refreshExplorer(moves, ply){
  var host = document.getElementById('learn-explorer');
  if (!host || !X) return;
  if (!X.enabled()){ host.innerHTML = ''; return; }
  var uci  = uciPath(moves, ply);
  var next = moves[ply] ? moves[ply].san : null;
  X.render(host, 'loading', next);
  X.lookupSoon(uci, function(data){
    if (L.ply !== ply) return;            /* the learner moved on */
    X.render(host, data, next);
  });
}

function renderLearnQuiz(host, q){
  var order = shuffle(q.opts.map(function(t, k){ return { t: t, k: k }; }));
  host.innerHTML =
    '<div class="qbox"><div class="qq">' + q.q + '</div><div class="qopts"></div>' +
    '<div class="qexp" style="display:none"></div></div>';
  var optsEl = host.querySelector('.qopts');
  var expEl  = host.querySelector('.qexp');

  order.forEach(function(o){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copt'; b.textContent = o.t;
    b.addEventListener('click', function(){
      L.answered = true;
      optsEl.querySelectorAll('.copt').forEach(function(x){ x.disabled = true; });
      var right = o.k === q.correct;
      b.classList.add(right ? 'answer-correct' : 'answer-wrong');
      if (!right){
        optsEl.querySelectorAll('.copt').forEach(function(x, idx){
          if (order[idx].k === q.correct) x.classList.add('answer-correct');
        });
      }
      expEl.style.display = '';
      expEl.innerHTML = (right ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + q.exp;
    });
    optsEl.appendChild(b);
  });
}

document.getElementById('learn-next').addEventListener('click', function(){
  /* Bound against the CURRENT line, not the mainline — a variation can be
     longer, and bounding on op.moves would stall Next partway through it. */
  var len = (L.line || L.op).moves.length;
  if (L.ply < len){ L.ply++; L.answered = false; learnRender(); }
});
document.getElementById('learn-prev').addEventListener('click', function(){
  if (L.ply > 0){ L.ply--; L.answered = false; learnRender(); }
});
document.getElementById('learn-first').addEventListener('click', function(){
  L.ply = 0; L.answered = false; learnRender();
});
document.getElementById('learn-flip').addEventListener('click', function(){
  L.board.orient = L.board.orient === 'w' ? 'b' : 'w';
  L.board.render();
});
document.getElementById('learn-coords').addEventListener('click', function(){
  this.classList.toggle('on');
  L.board.coords = this.classList.contains('on');
  L.board.render();
});
(function(){
  var b = document.getElementById('learn-live');
  if (!b || !X) { if (b) b.style.display = 'none'; return; }
  b.classList.toggle('on', X.enabled());
  b.addEventListener('click', function(){
    X.setEnabled(!X.enabled());
    b.classList.toggle('on', X.enabled());
    if (!X.enabled()) document.getElementById('learn-explorer').innerHTML = '';
    else learnRender();
  });
})();

document.getElementById('learn-plain').addEventListener('click', function(){
  this.classList.toggle('on');
  L.plain = this.classList.contains('on');
  learnRender();
});

L.board.orient = L.op.side;
learnRender();

})();
