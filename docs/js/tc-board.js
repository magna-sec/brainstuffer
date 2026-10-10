/* ── BrainStuffer · Tactic Cycles board ──────────────────────────────────
   A touch-first chessboard driven by chess.js. It knows no chess rules of
   its own — every legal destination, every move and every check comes from
   the engine, so the board cannot disagree with the position.

   Input is tap-then-tap, not drag. Drag on touch needs touchmove handling
   that fights the page scroll and breaks badly on iOS Safari; tap works
   identically with a mouse and a finger.

   Exposes window.TCBoard(hostEl) -> board.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var FILES = 'abcdefgh', RANKS = '12345678';
var PIECE_NAME = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };

window.TCBoard = function(hostEl){
  var Chess = window.ChessJS.Chess;

  var frame  = document.createElement('div'); frame.className  = 'tc-frame';
  var ranks  = document.createElement('div'); ranks.className  = 'tc-ranks';
  var board  = document.createElement('div'); board.className  = 'tc-board';
  var corner = document.createElement('div'); corner.className = 'tc-corner';
  var files  = document.createElement('div'); files.className  = 'tc-files';
  frame.appendChild(ranks); frame.appendChild(board);
  frame.appendChild(corner); frame.appendChild(files);
  hostEl.appendChild(frame);

  var b = {
    el: board,
    game: new Chess(),
    orient: 'w',
    interactive: false,
    sel: null,            /* selected origin square */
    dests: [],            /* legal destinations from sel */
    last: null,           /* {from,to} of the last move played */
    marks: {},            /* square -> extra class */
    onMove: null,         /* fn(moveObj) after a legal move is made */
    onIllegal: null       /* fn(from,to) when the user tries a non-move */
  };

  /* ── geometry ─────────────────────────────────────────────────────── */

  function seqs(){
    var r = [], f = [], i;
    if (b.orient === 'w'){
      for (i = 7; i >= 0; i--) r.push(i);
      for (i = 0; i < 8;  i++) f.push(i);
    } else {
      for (i = 0; i < 8;  i++) r.push(i);
      for (i = 7; i >= 0; i--) f.push(i);
    }
    return { r: r, f: f };
  }

  b.render = function(){
    var s = seqs(), html = '';
    var board2d = b.game.board();          /* [rank8..rank1][fileA..fileH] */
    var inCheck = b.game.inCheck();
    var turn = b.game.turn();

    s.r.forEach(function(r){
      s.f.forEach(function(f){
        var sq    = FILES[f] + RANKS[r];
        var light = (f + r) % 2 === 1;
        var pc    = board2d[7 - r][f];     /* board() is rank 8 first */

        var cls = 'tc-sq ' + (light ? 'l' : 'd');
        if (b.last && (sq === b.last.from || sq === b.last.to)) cls += ' last';
        if (sq === b.sel) cls += ' sel';
        if (b.marks[sq]) cls += ' ' + b.marks[sq];
        if (pc && pc.type === 'k' && pc.color === turn && inCheck) cls += ' check';

        var inner = '';
        if (pc){
          /* cburnett draws white and black separately, so the symbol id
             carries the colour: pc-wK, pc-bK, ... */
          inner += '<svg class="tc-pc" viewBox="0 0 45 45" aria-hidden="true">' +
                   '<use href="#pc-' + pc.color + pc.type.toUpperCase() + '"/></svg>';
        }
        /* legal-destination hint: a dot on an empty square, a ring on a capture */
        if (b.dests.indexOf(sq) !== -1){
          inner += pc ? '<span class="tc-cap"></span>' : '<span class="tc-dot"></span>';
        }

        var label = sq + (pc ? ', ' + (pc.color === 'w' ? 'white ' : 'black ') + PIECE_NAME[pc.type]
                             : ', empty');
        html += '<button type="button" class="' + cls + '" data-sq="' + sq +
                '" aria-label="' + label + '">' + inner + '</button>';
      });
    });
    board.innerHTML = html;
    ranks.innerHTML = s.r.map(function(r){ return '<div>' + RANKS[r] + '</div>'; }).join('');
    files.innerHTML = s.f.map(function(f){ return '<div>' + FILES[f] + '</div>'; }).join('');
    board.classList.toggle('pick', b.interactive);
  };

  /* ── input ────────────────────────────────────────────────────────── */

  function legalDests(from){
    return b.game.moves({ square: from, verbose: true }).map(function(m){ return m.to; });
  }

  function clearSel(){ b.sel = null; b.dests = []; }

  function tap(sq){
    if (!b.interactive) return;
    var pc = b.game.get(sq);

    /* picking up, or switching to, one of your own pieces */
    if (pc && pc.color === b.game.turn()){
      if (b.sel === sq){ clearSel(); b.render(); return; }
      b.sel = sq; b.dests = legalDests(sq); b.render(); return;
    }
    if (!b.sel) return;

    if (b.dests.indexOf(sq) === -1){
      var from = b.sel;
      clearSel(); b.render();
      if (b.onIllegal) b.onIllegal(from, sq);
      return;
    }

    /* promotion needs a piece choice before the move can be made */
    var moving = b.game.get(b.sel);
    var lastRank = b.game.turn() === 'w' ? '8' : '1';
    if (moving && moving.type === 'p' && sq[1] === lastRank){
      askPromotion(b.sel, sq);
      return;
    }
    commit(b.sel, sq);
  }

  function commit(from, to, promo){
    var mv;
    try { mv = b.game.move({ from: from, to: to, promotion: promo || 'q' }); }
    catch (e) { mv = null; }
    clearSel();
    if (!mv){ b.render(); if (b.onIllegal) b.onIllegal(from, to); return; }
    b.last = { from: mv.from, to: mv.to };
    b.render();
    if (b.onMove) b.onMove(mv);
  }

  /* Play a move on behalf of the opponent, without firing onMove. */
  b.playUci = function(uci){
    var mv;
    try {
      mv = b.game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4),
                         promotion: uci.slice(4) || 'q' });
    } catch (e) { mv = null; }
    if (mv){ b.last = { from: mv.from, to: mv.to }; clearSel(); b.render(); }
    return mv;
  };

  function askPromotion(from, to){
    var wrap = document.createElement('div');
    wrap.className = 'tc-promo';
    var colour = b.game.turn();
    wrap.innerHTML = ['q','r','b','n'].map(function(t){
      return '<button type="button" class="tc-promo-opt" data-p="' + t + '" ' +
             'aria-label="promote to ' + PIECE_NAME[t] + '">' +
             '<svg class="tc-pc" viewBox="0 0 45 45"><use href="#pc-' + colour +
             t.toUpperCase() + '"/></svg></button>';
    }).join('');
    frame.appendChild(wrap);
    wrap.addEventListener('click', function(e){
      var t = e.target;
      while (t && t !== wrap && !t.getAttribute('data-p')) t = t.parentNode;
      frame.removeChild(wrap);
      if (!t || t === wrap){ clearSel(); b.render(); return; }
      commit(from, to, t.getAttribute('data-p'));
    });
  }

  board.addEventListener('click', function(e){
    var t = e.target;
    while (t && t !== board && !t.getAttribute('data-sq')) t = t.parentNode;
    if (!t || t === board) return;
    tap(t.getAttribute('data-sq'));
  });

  /* ── public helpers ───────────────────────────────────────────────── */

  b.setFen = function(fen, orient){
    b.game = new Chess(fen);
    if (orient) b.orient = orient;
    b.last = null; b.marks = {}; clearSel();
    b.render();
  };
  b.setInteractive = function(on){ b.interactive = !!on; if (!on) clearSel(); b.render(); };
  b.mark = function(sq, kind){ b.marks[sq] = kind; };
  b.clearMarks = function(){ b.marks = {}; };
  b.flip = function(){ b.orient = b.orient === 'w' ? 'b' : 'w'; b.render(); };
  b.undo = function(){
    b.game.undo(); b.last = null; clearSel(); b.render();
  };

  b.render();
  return b;
};

})();
