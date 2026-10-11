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

  /* Arrows sit in their own SVG above the squares. One unit per square, so
     every coordinate is just a file/rank index. */
  var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrowSvg.setAttribute('class', 'tc-arrows');
  arrowSvg.setAttribute('viewBox', '0 0 8 8');
  arrowSvg.setAttribute('aria-hidden', 'true');
  board.appendChild(arrowSvg);

  var b = {
    el: board,
    game: new Chess(),
    orient: 'w',
    interactive: false,
    sel: null,            /* selected origin square */
    dests: [],            /* legal destinations from sel */
    last: null,           /* {from,to} of the last move played */
    marks: {},            /* square -> extra class */
    arrows: 0,            /* 0 off, 1 white's arrows, 2 black's */
    isolate: null,        /* square whose arrows are shown alone */
    onMove: null,         /* fn(moveObj) after a legal move is made */
    onIllegal: null,      /* fn(from,to) when the user tries a non-move */
    onArrows: null        /* fn() when the overlay state changes */
  };

  /* ── vision ───────────────────────────────────────────────────────
     Who attacks what, straight from the engine so the overlay can never
     disagree with the position. Cached per FEN because render() runs on
     every tap and this is 128 engine calls. */

  var visionCache = { fen: null, map: null };

  function vision(){
    var fen = b.game.fen();
    if (visionCache.fen === fen) return visionCache.map;
    var map = {};
    for (var f = 0; f < 8; f++){
      for (var r = 0; r < 8; r++){
        var sq = FILES[f] + RANKS[r];
        var entry = { w: [], b: [] };
        ['w', 'b'].forEach(function(colour){
          b.game.attackers(sq, colour).forEach(function(from){
            var pc = b.game.get(from);
            if (pc) entry[colour].push({ from: from, type: pc.type });
          });
        });
        if (entry.w.length || entry.b.length) map[sq] = entry;
      }
    }
    visionCache = { fen: fen, map: map };
    return map;
  }

  /* Squares a single piece attacks. */
  b.seenBy = function(square){
    var pc = b.game.get(square);
    if (!pc) return [];
    var map = vision(), out = [];
    Object.keys(map).forEach(function(sq){
      if (map[sq][pc.color].some(function(a){ return a.from === square; })) out.push(sq);
    });
    return out;
  };

  /* ── arrows ───────────────────────────────────────────────────── */

  var ARROW_COLOUR = { p:'--eye-p', n:'--eye-n', b:'--eye-b',
                       r:'--eye-r', q:'--eye-q', k:'--eye-k' };

  /* Centre of a square in the 8x8 arrow viewBox, honouring orientation. */
  function centre(sq){
    var f = FILES.indexOf(sq[0]), r = RANKS.indexOf(sq[1]);
    return (b.orient === 'w')
      ? { x: f + 0.5, y: (7 - r) + 0.5 }
      : { x: (7 - f) + 0.5, y: r + 0.5 };
  }

  function svgEl(name, attrs){
    var e = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(function(k){ e.setAttribute(k, attrs[k]); });
    return e;
  }

  /* An arrow from one square to another. Knights bend, as they do on every
     analysis board, so the shape reads as a knight move. */
  function arrow(from, to, type, faint){
    var a = centre(from), z = centre(to);
    var dx = z.x - a.x, dy = z.y - a.y;
    var knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2) ||
                 (Math.abs(dx) === 2 && Math.abs(dy) === 1);

    /* Three weights. An arrow landing on a PIECE is a real attack or
       defence and carries the information; an arrow to an empty square is
       only coverage, and at 70-odd arrows that is what turns the board into
       a thicket. So coverage is drawn thin and faint, and attacks are not. */
    var w = faint === 2 ? 0.055 : (faint ? 0.085 : 0.12);
    var head = faint === 2 ? 0.2 : (faint ? 0.26 : 0.3);
    var cls = 'ar' + (faint === 2 ? ' wisp' : (faint ? ' faint' : ''));
    var g = svgEl('g', { class: cls,
                         style: 'color:var(' + ARROW_COLOUR[type] + ')' });

    /* the last leg, which the head is aligned to */
    var lx = a.x, ly = a.y;
    if (knight){
      if (Math.abs(dx) === 2){ lx = z.x; ly = a.y; }   /* along the file, then across */
      else { lx = a.x; ly = z.y; }
    }
    var ux = z.x - lx, uy = z.y - ly;
    var len = Math.sqrt(ux * ux + uy * uy) || 1;
    ux /= len; uy /= len;

    /* stop the shaft short so the head is the point of the arrow */
    var sx = z.x - ux * head, sy = z.y - uy * head;

    var d = knight
      ? 'M ' + a.x + ' ' + a.y + ' L ' + lx + ' ' + ly + ' L ' + sx + ' ' + sy
      : 'M ' + a.x + ' ' + a.y + ' L ' + sx + ' ' + sy;
    g.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'currentColor',
                                  'stroke-width': w, 'stroke-linecap': 'round',
                                  'stroke-linejoin': 'round' }));

    var px = -uy, py = ux, hw = head * 0.52;
    g.appendChild(svgEl('polygon', {
      points: [z.x + ' ' + z.y,
               (sx + px * hw) + ' ' + (sy + py * hw),
               (sx - px * hw) + ' ' + (sy - py * hw)].join(' '),
      fill: 'currentColor'
    }));
    return g;
  }

  function drawArrows(){
    while (arrowSvg.firstChild) arrowSvg.removeChild(arrowSvg.firstChild);
    if (!b.arrows && !b.isolate) return;

    var pairs = [];
    if (b.isolate){
      var ip = b.game.get(b.isolate);
      if (ip) b.seenBy(b.isolate).forEach(function(sq){
        pairs.push({ from: b.isolate, to: sq, type: ip.type, faint: false });
      });
    } else {
      var side = b.arrows === 2 ? 'b' : 'w';
      var map = vision();
      Object.keys(map).forEach(function(sq){
        var occupied = !!b.game.get(sq);
        map[sq][side].forEach(function(at){
          pairs.push({ from: at.from, to: sq, type: at.type,
                       faint: occupied ? 1 : 2 });
        });
      });
    }
    /* heavier pieces last, so their arrows sit on top */
    /* wisps first, so the arrows that matter are drawn over them */
    var depth = { p:0, n:1, b:2, r:3, q:4, k:5 };
    pairs.sort(function(x, y){
      if ((y.faint === 2) !== (x.faint === 2)) return x.faint === 2 ? -1 : 1;
      return depth[x.type] - depth[y.type];
    });
    pairs.forEach(function(p){ arrowSvg.appendChild(arrow(p.from, p.to, p.type, p.faint)); });
  }

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

    /* An isolated piece gets a light wash under its arrows, so the squares
       it covers are readable even where arrows overlap. */
    var isoSquares = null, isoType = null;
    if (b.isolate){
      var ip = b.game.get(b.isolate);
      if (ip){ isoSquares = b.seenBy(b.isolate); isoType = ip.type; }
    }

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

        if (isoSquares){
          if (isoSquares.indexOf(sq) !== -1) cls += ' seen seen-' + isoType;
          if (sq === b.isolate) cls += ' eyeing';
        }

        if (pc){
          /* cburnett draws white and black separately, so the symbol id
             carries the colour: pc-wK, pc-bK, ... */
          inner += '<svg class="tc-pc" viewBox="0 0 45 45" aria-hidden="true">' +
                   '<use href="#pc-' + pc.color + pc.type.toUpperCase() + '"/></svg>';
        }
        /* Legal-destination hints: a dot on an empty square, a ring on a
           capture. Suppressed while a piece is isolated, because the vision
           wash already covers every one of them and more - it also shows the
           friendly pieces this piece defends. */
        if (!isoSquares && b.dests.indexOf(sq) !== -1){
          inner += pc ? '<span class="tc-cap"></span>' : '<span class="tc-dot"></span>';
        }

        var label = sq + (pc ? ', ' + (pc.color === 'w' ? 'white ' : 'black ') + PIECE_NAME[pc.type]
                             : ', empty');
        html += '<button type="button" class="' + cls + '" data-sq="' + sq +
                '" aria-label="' + label + '">' + inner + '</button>';
      });
    });
    board.innerHTML = html;
    board.appendChild(arrowSvg);      /* innerHTML wiped it; put it back on top */
    drawArrows();
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
    var pc = b.game.get(sq);

    /* With the overlay on, a tap asks "what does this piece see?" - including
       the opponent's pieces, which are not otherwise tappable. Tapping the
       same piece again, or an empty square, clears it. */
    if (b.arrows || b.isolate){
      if (pc && pc.color !== b.game.turn()){
        b.isolate = (b.isolate === sq) ? null : sq;
        clearSel();
        b.render();
        if (b.onArrows) b.onArrows();
        return;
      }
      if (!pc && b.isolate){
        b.isolate = null;
        b.render();
        if (b.onArrows) b.onArrows();
        return;
      }
      if (pc){
        b.isolate = (b.isolate === sq) ? null : sq;
        if (b.onArrows) b.onArrows();
      }
    }

    if (!b.interactive) return;

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
    b.last = null; b.marks = {}; b.isolate = null; clearSel();
    b.render();
  };

  /* Off -> White's arrows -> Black's arrows -> off. One side at a time:
     both at once is what made this unreadable before. */
  b.cycleArrows = function(){
    b.arrows = (b.arrows + 1) % 3;
    b.isolate = null;
    b.render();
    return b.arrows;
  };

  /* Draw an explicit set of arrows, e.g. a mating net. */
  b.showArrows = function(list){
    while (arrowSvg.firstChild) arrowSvg.removeChild(arrowSvg.firstChild);
    (list || []).forEach(function(a){
      arrowSvg.appendChild(arrow(a.from, a.to, a.type || 'q', false));
    });
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
