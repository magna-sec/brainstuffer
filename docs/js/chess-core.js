/* ── BrainStuffer · chess engine core ─────────────────────────────────
   The position model, the board renderer, and the helpers every mode
   shares. No mode logic lives here.

   There is deliberately no legal-move generator: authored lines carry both
   their SAN and their from/to squares, so applying a move is a two-line
   operation that cannot disagree with the notation.

   Exposes window.ChessKit. Each mode file aliases what it needs from it.
   Load order: chess-pieces -> chess-core -> chess-openings-data -> modes.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';
/* ═══════════════════════════════════════════════ Core chess model ═══ */

var FILES = 'abcdefgh', RANKS = '12345678';
var PIECE_NAME = {K:'king',Q:'queen',R:'rook',B:'bishop',N:'knight',P:'pawn'};

function startPos(){
  var p = {}, back = 'RNBQKBNR';
  for (var f = 0; f < 8; f++){
    p[FILES[f] + '1'] = 'w' + back[f];
    p[FILES[f] + '2'] = 'wP';
    p[FILES[f] + '7'] = 'bP';
    p[FILES[f] + '8'] = 'b' + back[f];
  }
  return p;
}

/* Apply one authored move. Returns {captured:<code|null>}. */
function applyMove(pos, mv){
  var captured = pos[mv.to] || null;
  pos[mv.to] = pos[mv.from];
  delete pos[mv.from];
  if (mv.rook){
    pos[mv.rook.to] = pos[mv.rook.from];
    delete pos[mv.rook.from];
  }
  return { captured: captured };
}

/* Position after the first n plies of an opening. */
function posAfter(op, n){
  var pos = startPos();
  for (var i = 0; i < n; i++) applyMove(pos, op.moves[i]);
  return pos;
}

/* "1.e4 e5 2.Nf3" style numbering for ply index i (0-based). */
function moveNo(i){ return Math.floor(i / 2) + 1; }
function isWhitePly(i){ return i % 2 === 0; }

/* Plain-English rendering of a move, given the position BEFORE it. */
function plainEnglish(pos, mv){
  var code = pos[mv.from];
  if (!code) return mv.san;
  var who = code[0] === 'w' ? 'White' : 'Black';
  if (mv.rook){
    var sideTxt = mv.to[0] === 'g' ? 'kingside' : 'queenside';
    return who + ' castles ' + sideTxt + ': king ' + mv.from + ' → ' + mv.to +
           ', rook ' + mv.rook.from + ' → ' + mv.rook.to;
  }
  var txt = who + "'s " + PIECE_NAME[code[1]] + ' ' + mv.from + ' → ' + mv.to;
  var tgt = pos[mv.to];
  if (tgt) txt += ', capturing the ' + PIECE_NAME[tgt[1]];
  if (mv.san.indexOf('+') > -1) txt += ' — check';
  return txt;
}

function isLightSquare(sq){
  return (FILES.indexOf(sq[0]) + RANKS.indexOf(sq[1])) % 2 === 1;
}

function shuffle(a){
  for (var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function store(k, v){
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }
  catch (e) { return null; }
}

function lockOpts(host, chosen, right, isRight){
  var all = [].slice.call(host.querySelectorAll('.copt'));
  all.forEach(function(x, idx){ x.disabled = true; if (isRight(x, idx)) x.classList.add('answer-correct'); });
  if (!right) chosen.classList.add('answer-wrong');
}

/* ═════════════════════════════════════════════════ Board rendering ═══ */

function BoardView(hostEl){
  var frame = document.createElement('div'); frame.className = 'bframe';
  var ranks = document.createElement('div'); ranks.className = 'ranks';
  var board = document.createElement('div'); board.className = 'board';
  var corner= document.createElement('div'); corner.className= 'bcorner';
  var files = document.createElement('div'); files.className = 'files';
  frame.appendChild(ranks); frame.appendChild(board);
  frame.appendChild(corner); frame.appendChild(files);
  hostEl.appendChild(frame);

  var v = {
    el: board, frame: frame,
    pos: startPos(),
    orient: 'w',
    coords: true,
    rulers: true,       /* the a–h / 1–8 gutters — hidden during recall drills */
    showPieces: true,
    marks: {},          /* square -> 'last' | 'sel' | 'hit' | 'miss' | 'target' */
    onSquare: null
  };

  board.addEventListener('click', function(e){
    var t = e.target;
    while (t && t !== board && !t.getAttribute('data-sq')) t = t.parentNode;
    if (!t || t === board) return;
    if (v.onSquare) v.onSquare(t.getAttribute('data-sq'));
  });

  v.render = function(){
    var rSeq = [], fSeq = [], i;
    if (v.orient === 'w'){
      for (i = 7; i >= 0; i--) rSeq.push(i);
      for (i = 0; i < 8;  i++) fSeq.push(i);
    } else {
      for (i = 0; i < 8;  i++) rSeq.push(i);
      for (i = 7; i >= 0; i--) fSeq.push(i);
    }

    var html = '';
    rSeq.forEach(function(r, ri){
      fSeq.forEach(function(f, fi){
        var sq    = FILES[f] + RANKS[r];
        var light = (f + r) % 2 === 1;
        var cls   = 'sq ' + (light ? 'l' : 'd');
        if (v.marks[sq]) cls += ' ' + v.marks[sq];

        var lbl = '';
        if (v.coords){
          lbl = '<span class="cr">' + sq + '</span>';
        } else if (v.rulers && (fi === 0 || ri === 7)){
          /* minimal labels: rank down the first column, file along the last row */
          var edge = (fi === 0 ? RANKS[r] : '') + (ri === 7 ? FILES[f] : '');
          lbl = '<span class="cr edge">' + edge + '</span>';
        }

        var pc = '';
        if (v.showPieces && v.pos[sq]){
          var code = v.pos[sq];
          pc = '<svg class="pc ' + code[0] + '" viewBox="0 0 45 45" aria-hidden="true">' +
               '<use href="#pc-' + code + '"/></svg>';
        }

        var label = sq + (v.pos[sq] && v.showPieces
                     ? ', ' + (v.pos[sq][0] === 'w' ? 'white ' : 'black ') + PIECE_NAME[v.pos[sq][1]]
                     : ', empty');
        html += '<button type="button" class="' + cls + '" data-sq="' + sq +
                '" aria-label="' + label + '">' + lbl + pc + '</button>';
      });
    });
    board.innerHTML = html;

    ranks.innerHTML = rSeq.map(function(r){ return '<div>' + (v.rulers ? RANKS[r] : '') + '</div>'; }).join('');
    files.innerHTML = fSeq.map(function(f){ return '<div>' + (v.rulers ? FILES[f] : '') + '</div>'; }).join('');
  };

  v.setInteractive = function(on){ board.classList.toggle('pick', !!on); };
  v.clearMarks = function(){ v.marks = {}; };
  v.mark = function(sq, kind){ v.marks[sq] = kind; };
  v.markMove = function(mv){
    v.clearMarks();
    if (!mv) return;
    v.mark(mv.from, 'last'); v.mark(mv.to, 'last');
    if (mv.rook){ v.mark(mv.rook.from, 'last'); v.mark(mv.rook.to, 'last'); }
  };
  v.render();
  return v;
}

/* Shared move-list renderer. */
function renderMoveList(el, moves, upTo, onClick, dimFuture){
  var html = '';
  for (var i = 0; i < moves.length; i++){
    if (isWhitePly(i)) html += '<span class="mnum">' + moveNo(i) + '.</span>';
    var cls = 'mv';
    if (i === upTo - 1) cls += ' on';
    if (dimFuture && i >= upTo) cls += ' future';
    html += '<span class="' + cls + '" data-i="' + i + '">' + moves[i].san + '</span>';
  }
  el.innerHTML = html;
  if (onClick){
    el.querySelectorAll('.mv').forEach(function(n){
      n.addEventListener('click', function(){ onClick(parseInt(n.getAttribute('data-i'), 10)); });
    });
  }
}

/* Indices of the plies the learner is responsible for. */
function learnerPlies(op){
  var out = [];
  for (var i = 0; i < op.moves.length; i++){
    var mine = op.side === 'w' ? isWhitePly(i) : !isWhitePly(i);
    if (mine && op.moves[i].alts && op.moves[i].alts.length >= 3) out.push(i);
  }
  return out;
}

/* ── Export ─────────────────────────────────────────────────────────── */
window.ChessKit = {
  FILES: FILES,
  RANKS: RANKS,
  PIECE_NAME: PIECE_NAME,
  startPos: startPos,
  applyMove: applyMove,
  posAfter: posAfter,
  moveNo: moveNo,
  isWhitePly: isWhitePly,
  plainEnglish: plainEnglish,
  isLightSquare: isLightSquare,
  shuffle: shuffle,
  store: store,
  BoardView: BoardView,
  renderMoveList: renderMoveList,
  learnerPlies: learnerPlies,
  lockOpts: lockOpts
};

})();
