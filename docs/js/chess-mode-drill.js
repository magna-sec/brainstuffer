/* ── BrainStuffer · chess trainer · Square Drill ─────────────────────────────────
   Coordinate recall: find a named square, name a highlighted square, or
   call a square light or dark with no board on screen at all.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var K = window.ChessKit;
var FILES = K.FILES;
var RANKS = K.RANKS;
var isLightSquare = K.isLightSquare;
var shuffle = K.shuffle;
var store = K.store;
var BoardView = K.BoardView;
var lockOpts = K.lockOpts;


var D = {
  mode: 'find', total: 20, n: 0, score: 0, streak: 0,
  target: null, locked: false, orient: 'w',
  board: BoardView(document.getElementById('drill-board'))
};
D.board.showPieces = false;
D.board.coords = false;
D.board.onSquare = drillTap;
D.board.setInteractive(true);

function randSquare(){
  return FILES[Math.floor(Math.random() * 8)] + RANKS[Math.floor(Math.random() * 8)];
}

function drillBestKey(){ return 'bs-chess-drill-best-' + D.mode; }

function drillStart(){
  D.n = 0; D.score = 0; D.streak = 0; D.locked = false;
  document.getElementById('d-fb').textContent = '';
  drillNext();
}

function drillNext(){
  if (D.n >= D.total){ drillFinish(); return; }
  D.n++;
  D.locked = false;
  D.target = randSquare();
  D.board.clearMarks();
  D.board.coords = false;
  D.board.showPieces = false;
  D.board.setInteractive(D.mode === 'find');

  /* Only "find" gets the a–h / 1–8 gutters: in the other two modes they would
     simply spell out the answer. "Light or dark?" hides the board entirely —
     it is a pure visualisation exercise. */
  D.board.rulers = D.mode === 'find';
  document.getElementById('drill-board').classList.toggle('hide', D.mode === 'colour');

  var prompt = document.getElementById('d-prompt');
  var opts   = document.getElementById('d-opts');
  opts.innerHTML = '';
  document.getElementById('d-fb').textContent = '';
  document.getElementById('d-fb').className = 'fb';

  if (D.mode === 'find'){
    prompt.innerHTML = 'Tap this square<span class="big">' + D.target + '</span>';
    D.board.render();
  } else if (D.mode === 'name'){
    prompt.innerHTML = 'What square is highlighted?';
    D.board.mark(D.target, 'target');
    D.board.render();
    drillOptions(D.target, function(){ return randSquare(); }, function(pick){
      drillJudge(pick === D.target, 'The highlighted square was <b>' + D.target + '</b>.');
    });
  } else { /* colour */
    prompt.innerHTML = 'Is this square light or dark?<span class="big">' + D.target + '</span>';
    D.board.showPieces = false;
    D.board.render();
    var light = isLightSquare(D.target);
    var host  = document.getElementById('d-opts');
    ['Light', 'Dark'].forEach(function(lab){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'copt'; b.textContent = lab;
      b.style.textAlign = 'center';
      b.addEventListener('click', function(){
        if (D.locked) return;
        var right = (lab === 'Light') === light;
        lockOpts(host, b, right, function(x, idx){
          return (['Light', 'Dark'][idx] === 'Light') === light;
        });
        D.board.mark(D.target, right ? 'hit' : 'miss');
        drillReveal();
        drillJudge(right, '<b>' + D.target + '</b> is a <b>' + (light ? 'light' : 'dark') +
          '</b> square. Trick: a1 is dark, and the colour flips with every step.');
      });
      host.appendChild(b);
    });
  }

  drillStats();
}

/* After an answer, put every aid back and show the board so the learner
   can check themselves against a fully labelled position. */
function drillReveal(){
  D.board.coords = true;
  D.board.rulers = true;
  D.board.setInteractive(false);
  document.getElementById('drill-board').classList.remove('hide');
  D.board.render();
}

function drillOptions(correct, gen, cb){
  var set = [correct];
  var guard = 0;
  while (set.length < 4 && guard++ < 200){
    var c = gen();
    if (set.indexOf(c) === -1) set.push(c);
  }
  shuffle(set);
  var host = document.getElementById('d-opts');
  host.innerHTML = '';
  set.forEach(function(s){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copt'; b.textContent = s;
    b.style.textAlign = 'center';
    b.style.fontFamily = "'Courier New',monospace";
    b.style.fontWeight = '700';
    b.addEventListener('click', function(){
      if (D.locked) return;
      lockOpts(host, b, s === correct, function(x){ return x.textContent === correct; });
      D.board.mark(D.target, s === correct ? 'hit' : 'miss');
      drillReveal();
      cb(s);
    });
    host.appendChild(b);
  });
}


function drillTap(sq){
  if (D.mode !== 'find' || D.locked) return;
  var right = sq === D.target;
  D.board.clearMarks();
  D.board.mark(sq, right ? 'hit' : 'miss');
  if (!right) D.board.mark(D.target, 'target');
  drillReveal();
  drillJudge(right, right ? 'That is <b>' + D.target + '</b>.'
    : 'You tapped <b>' + sq + '</b>. <b>' + D.target + '</b> is outlined.');
}

function drillJudge(right, msg){
  D.locked = true;
  if (right){ D.score++; D.streak++; } else { D.streak = 0; }
  var fb = document.getElementById('d-fb');
  fb.className = 'fb ' + (right ? 'ok' : 'no');
  fb.innerHTML = (right ? '✓ ' : '✗ ') + msg;
  drillStats();
  setTimeout(function(){ if (D.locked) drillNext(); }, right ? 800 : 1900);
}

function drillStats(){
  document.getElementById('d-prog').textContent  = Math.min(D.n, D.total) + '/' + D.total;
  document.getElementById('d-score').textContent = D.score;
  document.getElementById('d-streak').textContent= D.streak;
  document.getElementById('d-best').textContent  = store(drillBestKey()) || 0;
}

function drillFinish(){
  var best = parseInt(store(drillBestKey()) || '0', 10);
  if (D.score > best){ store(drillBestKey(), D.score); best = D.score; }
  D.locked = true;
  D.board.setInteractive(false);
  document.getElementById('d-prompt').innerHTML =
    'Run complete<span class="big">' + D.score + ' / ' + D.total + '</span>';
  document.getElementById('d-opts').innerHTML = '';
  var fb = document.getElementById('d-fb');
  fb.className = 'fb ok';
  fb.innerHTML = D.score === D.total ? 'Perfect run. Try Blind mode next.'
    : (D.score >= best ? 'New personal best.' : 'Best so far: ' + best + '/' + D.total + '.');
  drillStats();
}

document.querySelectorAll('[data-dmode]').forEach(function(p){
  p.addEventListener('click', function(){
    document.querySelectorAll('[data-dmode]').forEach(function(x){ x.classList.remove('on'); });
    p.classList.add('on');
    D.mode = p.getAttribute('data-dmode');
    drillStart();
  });
});
document.getElementById('d-restart').addEventListener('click', drillStart);
document.getElementById('d-side').addEventListener('click', function(){
  D.orient = D.orient === 'w' ? 'b' : 'w';
  D.board.orient = D.orient;
  this.textContent = D.orient === 'w' ? "White's view" : "Black's view";
  this.classList.toggle('on', D.orient === 'w');
  D.board.render();
});
drillStart();

})();
