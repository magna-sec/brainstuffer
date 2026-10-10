/* ── BrainStuffer · custom set import ─────────────────────────────────
   Lets you train on your OWN positions instead of the bundled set.

   Imported sets live in this browser's localStorage. They are never part of
   the site and never go into the repository, so whatever you load is yours
   and stays on your machine.

   Two input formats, both auto-detected:

     PGN      any PGN whose games carry a [FEN "..."] tag. The mainline is
              taken as the solution. This is what a lichess study exports.

     Lines    one puzzle per line, position and solution split by | or ;
                8/8/8/8/8/5k2/6q1/7K b - - 0 1 | Qg2#
                r1bqkb1r/... | Nxe5 Nxe5 Qh5+

   Moves may be SAN (Nxe5, Qh5+) or UCI (g2g1, e7e8q).

   Unlike the bundled lichess puzzles, an imported puzzle starts with YOU to
   move — that is how positions in books and studies are posed.

   Exposes window.TCImport.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var KEY = 'bs-tactic-cycles-custom-v1';

function ls(k, v){
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch (e) { return null; }
}

/* ── movetext ─────────────────────────────────────────────────────── */

function stripMovetext(s){
  return s
    .replace(/\{[^}]*\}/g, ' ')               /* comments           */
    .replace(/;[^\n]*/g, ' ')                 /* rest-of-line notes */
    .replace(/\$\d+/g, ' ')                   /* NAGs               */
    .replace(/\([^()]*\)/g, ' ')              /* one level of RAV   */
    .replace(/\([^()]*\)/g, ' ')              /* and a second       */
    .replace(/\b\d+\.(\.\.)?/g, ' ')          /* move numbers       */
    .replace(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ')
    .replace(/[?!]+/g, '')
    .trim();
}

function tokens(s){
  return stripMovetext(s).split(/\s+/).filter(function(t){
    return t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t);
  });
}

/* Apply one token, SAN first then UCI. Returns the chess.js move or null. */
function applyToken(game, tok){
  try {
    var m = game.move(tok);
    if (m) return m;
  } catch (e) { /* not SAN — fall through */ }
  var m2 = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(tok.toLowerCase());
  if (!m2) return null;
  try {
    return game.move({ from: m2[1], to: m2[2], promotion: m2[3] || 'q' });
  } catch (e) { return null; }
}

/* ── parsing ──────────────────────────────────────────────────────── */

function splitPgn(text){
  return text.split(/\n\s*\n(?=\s*\[)/).map(function(b){ return b.trim(); })
             .filter(Boolean);
}

function parsePgnBlock(block){
  var fen = /\[FEN\s+"([^"]+)"\]/.exec(block);
  if (!fen) return { error: 'no [FEN] tag' };
  var body = block.replace(/\[[^\]]*\]\s*/g, ' ');
  var name = /\[Event\s+"([^"]+)"\]/.exec(block);
  var white = /\[White\s+"([^"]+)"\]/.exec(block);
  var black = /\[Black\s+"([^"]+)"\]/.exec(block);
  var label = (white && black && white[1] !== '?' )
    ? white[1] + ' – ' + black[1]
    : (name ? name[1] : '');
  return { fen: fen[1], moves: tokens(body), label: label };
}

function parseLine(line){
  var parts = line.split(/\s*[|;]\s*/);
  if (parts.length < 2) return { error: 'expected "FEN | moves"' };
  return { fen: parts[0].trim(), moves: tokens(parts.slice(1).join(' ')), label: '' };
}

/* Returns {puzzles, errors, format}. Never throws. */
function parse(text){
  var Chess = window.ChessJS.Chess;
  var out = [], errors = [];
  var isPgn = /\[FEN\s+"/.test(text);
  var items;

  if (isPgn){
    items = splitPgn(text).map(parsePgnBlock);
  } else {
    items = text.split(/\r?\n/)
      .map(function(l){ return l.trim(); })
      .filter(function(l){ return l && l[0] !== '#'; })
      .map(parseLine);
  }

  items.forEach(function(it, i){
    var where = (isPgn ? 'game ' : 'line ') + (i + 1);
    if (it.error){ errors.push(where + ': ' + it.error); return; }

    var game;
    try { game = new Chess(it.fen); }
    catch (e){ errors.push(where + ': FEN rejected — ' + e.message); return; }

    if (!it.moves.length){ errors.push(where + ': no solution moves'); return; }

    var solver = game.turn();
    var uci = [];
    for (var k = 0; k < it.moves.length; k++){
      var mv = applyToken(game, it.moves[k]);
      if (!mv){
        errors.push(where + ': move ' + (k + 1) + ' (' + it.moves[k] + ') is not legal here');
        return;
      }
      uci.push(mv.from + mv.to + (mv.promotion || ''));
    }

    out.push({
      id: 'c' + (i + 1) + '-' + it.fen.split(' ')[0].length + '-' + uci[0],
      fen: it.fen,
      moves: uci.join(' '),
      rating: 0,
      themes: 'imported',
      label: it.label || '',
      solverFirst: true,          /* books pose "you to move", unlike lichess */
      solverColour: solver
    });
  });

  /* ids must be unique for progress tracking */
  var seen = {};
  out.forEach(function(p, i){
    while (seen[p.id]) p.id = p.id + '-' + i;
    seen[p.id] = true;
  });

  return { puzzles: out, errors: errors, format: isPgn ? 'PGN' : 'lines' };
}

/* ── storage ──────────────────────────────────────────────────────── */

function load(){
  try {
    var raw = ls(KEY);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!s || !s.puzzles || !s.puzzles.length) return null;
    return s;
  } catch (e) { return null; }
}

function save(label, puzzles){
  var rec = { v: 1, label: label || 'My set', savedAt: new Date().toISOString(),
              puzzles: puzzles };
  try {
    ls(KEY, JSON.stringify(rec));
  } catch (e) {
    return { error: 'That set is too large for browser storage.' };
  }
  return rec;
}

function clear(){ ls(KEY, null); }

window.TCImport = {
  parse: parse,
  load: load,
  save: save,
  clear: clear,
  KEY: KEY
};

})();
