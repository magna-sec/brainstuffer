/* ── BrainStuffer · chess trainer · Walkthrough ──────────────────────────────────
   Steps an opening one ply at a time with narrative, plain-English move
   translation, and inline comprehension quizzes.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var K = window.ChessKit;
var posAfter = K.posAfter;
var moveNo = K.moveNo;
var isWhitePly = K.isWhitePly;
var plainEnglish = K.plainEnglish;
var shuffle = K.shuffle;
var BoardView = K.BoardView;
var renderMoveList = K.renderMoveList;


var L = {
  op: CHESS_OPENINGS[0],
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
    L.ply = 0;
    L.board.orient = L.op.side;
    learnRender();
  });
})();

function learnRender(){
  var op = L.op, i = L.ply;

  document.getElementById('learn-head').innerHTML =
    '<div style="font-size:.95rem;font-weight:800;color:var(--accent);">' + op.name +
    ' <span style="font-size:.68rem;color:var(--muted);font-weight:400;">' + op.eco + ' · ' + op.tag +
    '</span></div>' +
    '<div style="font-size:.78rem;color:var(--subtle);line-height:1.55;margin-top:.25rem;">' + op.idea + '</div>';

  L.board.pos = posAfter(op, i);
  L.board.coords = document.getElementById('learn-coords').classList.contains('on');
  L.board.markMove(i > 0 ? op.moves[i - 1] : null);
  L.board.render();

  renderMoveList(document.getElementById('learn-moves'), op.moves, i, function(k){
    L.ply = k + 1; L.answered = false; learnRender();
  }, true);

  var narr = document.getElementById('learn-narr');
  if (i === 0){
    narr.innerHTML = '<b>Starting position.</b> ' + op.blurb +
      ' Press <b>Next</b> to play through the line one move at a time.' +
      (op.side === 'b' ? ' You will be playing <b>Black</b>, so the board is shown from Black’s side.' : '');
  } else {
    var mv  = op.moves[i - 1];
    var pre = posAfter(op, i - 1);
    var num = moveNo(i - 1) + (isWhitePly(i - 1) ? '.' : '...');
    var h = '<div style="font-family:\'Courier New\',monospace;font-size:.95rem;font-weight:800;' +
            'color:var(--accent);margin-bottom:.4rem;">' + num + ' ' + mv.san + '</div>' + mv.note;
    if (L.plain) h += '<div class="plain">' + plainEnglish(pre, mv) + '</div>';
    narr.innerHTML = h;
  }

  var qbox = document.getElementById('learn-quiz');
  var qmv  = i > 0 ? op.moves[i - 1] : null;
  if (qmv && qmv.quiz && !L.answered) renderLearnQuiz(qbox, qmv.quiz);
  else if (qmv && qmv.quiz && L.answered) { /* leave rendered result in place */ }
  else qbox.innerHTML = '';

  document.getElementById('learn-prev').disabled  = i === 0;
  document.getElementById('learn-first').disabled = i === 0;
  document.getElementById('learn-next').disabled  = i >= op.moves.length;
  document.getElementById('learn-next').textContent =
    i >= op.moves.length ? 'Line complete ✓' : 'Next →';
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
  if (L.ply < L.op.moves.length){ L.ply++; L.answered = false; learnRender(); }
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
document.getElementById('learn-plain').addEventListener('click', function(){
  this.classList.toggle('on');
  L.plain = this.classList.contains('on');
  learnRender();
});

L.board.orient = L.op.side;
learnRender();

})();
