/* ── BrainStuffer · chess trainer · Your Move ────────────────────────────────────
   Poses the position before each of your moves and asks you to play it,
   either by tapping origin then destination or by picking the notation.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var K = window.ChessKit;
var PIECE_NAME = K.PIECE_NAME;
var posAfter = K.posAfter;
var plainEnglish = K.plainEnglish;
var shuffle = K.shuffle;
var store = K.store;
var BoardView = K.BoardView;
var renderMoveList = K.renderMoveList;
var learnerPlies = K.learnerPlies;
var lockOpts = K.lockOpts;


var C = {
  op: CHESS_OPENINGS[0],
  plies: [], idx: 0, score: 0,
  stage: 'from', picked: null, locked: false, tapMode: true,
  board: BoardView(document.getElementById('chal-board'))
};
C.board.onSquare = chalTap;

(function buildChalPills(){
  var bar = document.getElementById('chal-pills');
  bar.innerHTML = CHESS_OPENINGS.map(function(o, i){
    return '<button type="button" class="pill' + (i === 0 ? ' on' : '') +
           '" data-op="' + o.id + '">' + o.name + '</button>';
  }).join('');
  bar.addEventListener('click', function(e){
    var id = e.target.getAttribute && e.target.getAttribute('data-op');
    if (!id) return;
    bar.querySelectorAll('.pill').forEach(function(p){ p.classList.remove('on'); });
    e.target.classList.add('on');
    C.op = CHESS_OPENINGS.filter(function(o){ return o.id === id; })[0];
    chalStart();
  });
})();

function chalStart(){
  C.plies = learnerPlies(C.op);
  C.idx = 0; C.score = 0;
  C.board.orient = C.op.side;
  chalPose();
}

function chalPose(){
  if (C.idx >= C.plies.length){ chalFinish(); return; }
  var i = C.plies[C.idx];
  C.stage = 'from'; C.picked = null; C.locked = false;

  C.board.pos = posAfter(C.op, i);
  C.board.markMove(i > 0 ? C.op.moves[i - 1] : null);
  C.board.setInteractive(C.tapMode);
  C.board.render();

  renderMoveList(document.getElementById('c-moves'), C.op.moves.slice(0, i), i, null, false);

  var who  = C.op.side === 'w' ? 'Black' : 'White';
  var last = i > 0 ? C.op.moves[i - 1] : null;
  var head = last
    ? who + ' played <b style="color:var(--accent)">' + last.san + '</b>.'
    : 'You have the first move.';
  document.getElementById('c-prompt').innerHTML =
    head + '<br><span style="font-size:.8rem;color:var(--subtle)">' +
    (C.tapMode ? 'Tap the piece you want to move, then its destination square.'
               : 'Choose your move in notation.') + '</span>';

  document.getElementById('c-fb').textContent  = '';
  document.getElementById('c-fb').className    = 'fb';
  document.getElementById('c-exp').innerHTML   = '';
  document.getElementById('c-next').disabled   = true;
  document.getElementById('c-opts').innerHTML  = '';

  if (!C.tapMode) chalOptions(i);
  chalStats();
}

function chalOptions(i){
  var mv   = C.op.moves[i];
  var list = [{ san: mv.san, ok: true, why: mv.note }];
  mv.alts.slice(0, 3).forEach(function(a){ list.push({ san: a.san, ok: false, why: a.why }); });
  shuffle(list);

  var host = document.getElementById('c-opts');
  list.forEach(function(o){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copt';
    b.innerHTML = '<span class="san">' + o.san + '</span>';
    b.addEventListener('click', function(){
      if (C.locked) return;
      lockOpts(host, b, o.ok, function(x, idx){ return list[idx].ok; });
      chalJudge(o.ok, i, o.ok ? null : o.why);
    });
    host.appendChild(b);
  });
}

function chalTap(sq){
  if (!C.tapMode || C.locked) return;
  var i = C.plies[C.idx], mv = C.op.moves[i], mine = C.op.side;

  if (C.stage === 'from'){
    if (!C.board.pos[sq] || C.board.pos[sq][0] !== mine) return;
    C.picked = sq;
    C.stage  = 'to';
    C.board.markMove(i > 0 ? C.op.moves[i - 1] : null);
    C.board.mark(sq, 'sel');
    C.board.render();
    return;
  }

  if (sq === C.picked){                       /* tap again to deselect */
    C.stage = 'from'; C.picked = null;
    C.board.markMove(i > 0 ? C.op.moves[i - 1] : null);
    C.board.render();
    return;
  }
  if (C.board.pos[sq] && C.board.pos[sq][0] === mine){   /* switch selection */
    C.picked = sq;
    C.board.markMove(i > 0 ? C.op.moves[i - 1] : null);
    C.board.mark(sq, 'sel');
    C.board.render();
    return;
  }

  var rightFrom = C.picked === mv.from, rightTo = sq === mv.to;
  var why = null;
  if (!rightTo && rightFrom){
    why = 'Right piece, wrong square — it belongs on <b>' + mv.to + '</b>.';
  } else if (!rightFrom){
    var alt = (mv.alts || []).filter(function(a){ return a.san.slice(-2) === sq; })[0];
    why = alt ? alt.why
        : 'The move here is <b>' + mv.san + '</b> — the ' +
          PIECE_NAME[C.board.pos[mv.from][1]] + ' from <b>' + mv.from + '</b> to <b>' + mv.to + '</b>.';
  }
  C.board.clearMarks();
  C.board.mark(C.picked, rightFrom && rightTo ? 'hit' : 'miss');
  C.board.mark(sq,       rightFrom && rightTo ? 'hit' : 'miss');
  if (!(rightFrom && rightTo)){ C.board.mark(mv.from, 'target'); C.board.mark(mv.to, 'target'); }
  C.board.setInteractive(false);
  C.board.render();
  chalJudge(rightFrom && rightTo, i, why);
}

function chalJudge(right, i, why){
  C.locked = true;
  if (right) C.score++;
  var mv  = C.op.moves[i];
  var pre = posAfter(C.op, i);
  var fb  = document.getElementById('c-fb');
  fb.className = 'fb ' + (right ? 'ok' : 'no');
  fb.innerHTML = right ? '✓ ' + mv.san + ' — correct.'
                       : '✗ The move is ' + mv.san + '.';
  document.getElementById('c-exp').innerHTML =
    '<div class="qexp" style="border-top:none;padding-top:.2rem;">' +
    (why ? why + '<br><br>' : '') +
    '<b>' + mv.san + '</b> — ' + plainEnglish(pre, mv) + '.<br>' + mv.note + '</div>';
  document.getElementById('c-next').disabled = false;
  document.getElementById('c-next').textContent =
    C.idx + 1 >= C.plies.length ? 'See result →' : 'Next →';
  chalStats();
}

function chalStats(){
  document.getElementById('c-prog').textContent  =
    Math.min(C.idx + 1, C.plies.length) + '/' + C.plies.length;
  document.getElementById('c-score').textContent = C.score;
  document.getElementById('c-best').textContent  = store('bs-chess-chal-best-' + C.op.id) || 0;
}

function chalFinish(){
  var key  = 'bs-chess-chal-best-' + C.op.id;
  var best = parseInt(store(key) || '0', 10);
  if (C.score > best){ store(key, C.score); }
  C.board.pos = posAfter(C.op, C.op.moves.length);
  C.board.markMove(C.op.moves[C.op.moves.length - 1]);
  C.board.setInteractive(false);
  C.board.render();
  document.getElementById('c-prompt').innerHTML =
    C.op.name + ' complete<span class="big">' + C.score + ' / ' + C.plies.length + '</span>';
  document.getElementById('c-opts').innerHTML = '';
  document.getElementById('c-exp').innerHTML  = '';
  renderMoveList(document.getElementById('c-moves'), C.op.moves, C.op.moves.length, null, false);
  var fb = document.getElementById('c-fb');
  fb.className = 'fb ok';
  fb.innerHTML = C.score === C.plies.length
    ? 'Every move correct. Now try it with no board at all — Blind mode.'
    : 'Best for this opening: ' + Math.max(best, C.score) + '/' + C.plies.length + '.';
  document.getElementById('c-next').disabled = true;
  chalStats();
}

document.getElementById('c-next').addEventListener('click', function(){ C.idx++; chalPose(); });
document.getElementById('c-restart').addEventListener('click', chalStart);
document.getElementById('c-answer-mode').addEventListener('click', function(){
  C.tapMode = !C.tapMode;
  this.textContent = C.tapMode ? 'Answer: tap squares' : 'Answer: notation';
  this.classList.toggle('on', C.tapMode);
  chalPose();
});
chalStart();

})();
