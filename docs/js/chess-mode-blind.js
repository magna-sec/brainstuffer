/* ── BrainStuffer · chess trainer · Blind Mode ───────────────────────────────────
   The same challenge with no board: only the move list as text. Peeking
   reveals the position for four seconds and costs a point.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var K = window.ChessKit;
var posAfter = K.posAfter;
var moveNo = K.moveNo;
var isWhitePly = K.isWhitePly;
var plainEnglish = K.plainEnglish;
var shuffle = K.shuffle;
var store = K.store;
var BoardView = K.BoardView;
var learnerPlies = K.learnerPlies;
var lockOpts = K.lockOpts;
var enumerateLines = K.enumerateLines;


var B = {
  op: CHESS_OPENINGS[0],
  lines: [], li: 0, line: null,
  plies: [], idx: 0, score: 0, peeks: 0,
  locked: false, peekTimer: null,
  board: BoardView(document.getElementById('blind-board'))
};

(function buildBlindPills(){
  var bar = document.getElementById('blind-pills');
  bar.innerHTML = CHESS_OPENINGS.map(function(o, i){
    return '<button type="button" class="pill' + (i === 0 ? ' on' : '') +
           '" data-op="' + o.id + '">' + o.name + '</button>';
  }).join('');
  bar.addEventListener('click', function(e){
    var id = e.target.getAttribute && e.target.getAttribute('data-op');
    if (!id) return;
    bar.querySelectorAll('.pill').forEach(function(p){ p.classList.remove('on'); });
    e.target.classList.add('on');
    B.op = CHESS_OPENINGS.filter(function(o){ return o.id === id; })[0];
    B.li = 0;
    blindStart();
  });
})();

function blindStart(){
  B.lines = enumerateLines(B.op);
  if (B.li >= B.lines.length) B.li = 0;
  B.line  = B.lines[B.li];
  B.plies = learnerPlies(B.op, B.line);
  B.idx = 0; B.score = 0; B.peeks = 0;
  B.board.orient = B.op.side;
  K.renderLinePicker('b-lines', B.lines, B.li, function(n){ B.li = n; blindStart(); });
  blindHidePeek();
  blindPose();
}

function blindKey(){
  return 'bs-chess-blind-best-' + B.op.id + '-' + (B.line ? B.line.key : 'main');
}

function blindLog(upTo){
  var html = '', mv = B.line.moves;
  for (var i = 0; i < upTo; i++){
    if (isWhitePly(i)) html += '<span class="mnum">' + moveNo(i) + '.</span>&nbsp;';
    html += '<span class="' + (isWhitePly(i) ? 'w' : 'b') + '">' + mv[i].san + '</span>&nbsp; ';
  }
  if (upTo < mv.length){
    if (isWhitePly(upTo)) html += '<span class="mnum">' + moveNo(upTo) + '.</span>&nbsp;';
    else if (upTo === 0)  html += '<span class="mnum">1.</span>&nbsp;';
    html += '<span class="cursor">_</span>';
  }
  document.getElementById('b-log').innerHTML = html || '<span class="cursor">_</span>';
}

function blindPose(){
  if (B.idx >= B.plies.length){ blindFinish(); return; }
  var i = B.plies[B.idx];
  B.locked = false;
  blindHidePeek();

  blindLog(i);

  var who  = B.op.side === 'w' ? 'Black' : 'White';
  var last = i > 0 ? B.line.moves[i - 1] : null;
  document.getElementById('b-head').innerHTML =
    (last ? who + ' played <b style="color:var(--accent)">' + last.san + '</b>.' : 'You move first.') +
    '<br><span style="font-size:.8rem;color:var(--subtle)">Visualise the position. What do you play?</span>';

  document.getElementById('b-fb').textContent = '';
  document.getElementById('b-fb').className   = 'fb';
  document.getElementById('b-exp').innerHTML  = '';
  document.getElementById('b-next').disabled  = true;

  var mv   = B.line.moves[i];
  var list = [{ san: mv.san, ok: true, why: null }];
  mv.alts.slice(0, 3).forEach(function(a){ list.push({ san: a.san, ok: false, why: a.why }); });
  shuffle(list);

  var host = document.getElementById('b-opts');
  host.innerHTML = '';
  list.forEach(function(o){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copt';
    b.innerHTML = '<span class="san">' + o.san + '</span>';
    b.addEventListener('click', function(){
      if (B.locked) return;
      lockOpts(host, b, o.ok, function(x, idx){ return list[idx].ok; });
      blindJudge(o.ok, i, o.why);
    });
    host.appendChild(b);
  });

  blindStats();
}

function blindJudge(right, i, why){
  B.locked = true;
  if (right) B.score++;
  var mv  = B.line.moves[i];
  var pre = posAfter(B.line.moves, i);
  blindLog(i + 1);
  var fb = document.getElementById('b-fb');
  fb.className = 'fb ' + (right ? 'ok' : 'no');
  fb.innerHTML = right ? '✓ ' + mv.san : '✗ The move is ' + mv.san + '.';
  document.getElementById('b-exp').innerHTML =
    '<div class="qexp" style="border-top:none;padding-top:.2rem;">' +
    (why ? why + '<br><br>' : '') +
    '<b>' + mv.san + '</b> — ' + plainEnglish(pre, mv) + '.<br>' + mv.note + '</div>';
  document.getElementById('b-next').disabled = false;
  document.getElementById('b-next').textContent =
    B.idx + 1 >= B.plies.length ? 'See result →' : 'Next →';
  blindStats();
}

function blindStats(){
  document.getElementById('b-prog').textContent  =
    Math.min(B.idx + 1, B.plies.length) + '/' + B.plies.length;
  document.getElementById('b-score').textContent = B.score;
  document.getElementById('b-peeks').textContent = B.peeks;
  document.getElementById('b-best').textContent  = store(blindKey()) || 0;
}

function blindHidePeek(){
  if (B.peekTimer){ clearInterval(B.peekTimer); B.peekTimer = null; }
  document.getElementById('b-peekwrap').classList.remove('show');
  document.getElementById('b-peek-t').textContent = '';
}

document.getElementById('b-peek').addEventListener('click', function(){
  if (B.idx >= B.plies.length) return;
  var i = B.plies[B.idx];
  B.peeks++;
  B.score = Math.max(0, B.score - 1);
  blindStats();

  B.board.pos = posAfter(B.line.moves, i);
  B.board.markMove(i > 0 ? B.line.moves[i - 1] : null);
  B.board.coords = true;
  B.board.render();
  document.getElementById('b-peekwrap').classList.add('show');

  var left = 4;
  var tEl  = document.getElementById('b-peek-t');
  tEl.textContent = 'Hiding in ' + left + 's…';
  if (B.peekTimer) clearInterval(B.peekTimer);
  B.peekTimer = setInterval(function(){
    left--;
    if (left <= 0){ blindHidePeek(); return; }
    tEl.textContent = 'Hiding in ' + left + 's…';
  }, 1000);
});

function blindFinish(){
  var key  = blindKey();
  var best = parseInt(store(key) || '0', 10);
  if (B.score > best) store(key, B.score);
  blindHidePeek();
  blindLog(B.line.moves.length);
  document.getElementById('b-head').innerHTML =
    B.op.name + (B.line.key === 'main' ? '' : ' · ' + B.line.name) +
    ' played blind<span class="big">' + B.score + ' / ' + B.plies.length + '</span>';
  document.getElementById('b-opts').innerHTML = '';
  document.getElementById('b-exp').innerHTML  = '';
  var fb = document.getElementById('b-fb');
  fb.className = 'fb ok';
  fb.innerHTML = (B.score === B.plies.length && B.peeks === 0)
    ? 'A clean blindfold run. That is genuine visualisation.'
    : 'Peeks used: ' + B.peeks + '. Best: ' + Math.max(best, B.score) + '/' + B.plies.length + '.';
  document.getElementById('b-next').disabled = true;
  blindStats();
}

document.getElementById('b-next').addEventListener('click', function(){ B.idx++; blindPose(); });
document.getElementById('b-restart').addEventListener('click', blindStart);
blindStart();

})();
