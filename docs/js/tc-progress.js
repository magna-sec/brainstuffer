/* ── BrainStuffer · the cycle engine ──────────────────────────────────
   The schedule:

     1. Pick ONE fixed set of puzzles and never change it.
     2. Cycle 1: solve the whole set. Budget about four weeks.
     3. Rest a day or so, then do the WHOLE SET again — in half the days.
     4. Keep halving (28, 14, 7, 4, 2, 1 ...), rounding up on odd numbers.
     5. Stop when you can solve the entire set in a single day, or after
        cycle 7, whichever comes first.

   The point is not to solve new puzzles. It is to meet the SAME positions
   until recognising them stops being calculation and starts being memory.
   That is why this is not a spaced-repetition scheduler: there are no
   per-puzzle intervals, only whole-set cycles against a shrinking clock.

   Everything lives in localStorage. Exposes window.TCProgress.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var KEY = 'bs-tactic-cycles-v1';
var MAX_CYCLE = 7;
var FIRST_CYCLE_DAYS = 28;

function today(){
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}

function daysBetween(a, b){
  var ms = Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00');
  return Math.round(ms / 86400000);
}

/* 28 -> 14 -> 7 -> 4 -> 2 -> 1 -> 1. Odd numbers round UP, per the book. */
function targetDays(cycle){
  var d = FIRST_CYCLE_DAYS;
  for (var i = 1; i < cycle; i++) d = Math.max(1, Math.ceil(d / 2));
  return d;
}

function blank(){
  return {
    v: 1,
    chapters: null,      /* chosen tier keys — frozen once training starts */
    order: [],           /* puzzle ids, the fixed set, in a fixed order */
    startedAt: null,
    cycle: 1,
    cycleStartedAt: null,
    solved: {},          /* id -> {ok:bool, ms:int} for the CURRENT cycle */
    history: {},         /* id -> array, one entry per finished cycle: 1 ok, 0 failed */
    cycles: [],          /* finished cycles: {n, from, to, days, count, firstTry, ms} */
    sessionLog: {}       /* 'YYYY-MM-DD' -> puzzles attempted that day */
  };
}

function load(){
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    var s = JSON.parse(raw);
    if (!s || s.v !== 1) return blank();
    return s;
  } catch (e) { return blank(); }
}

function save(s){
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}

var P = {
  MAX_CYCLE: MAX_CYCLE,
  today: today,
  targetDays: targetDays,
  daysBetween: daysBetween,

  state: load(),

  reload: function(){ P.state = load(); return P.state; },
  persist: function(){ return save(P.state); },

  started: function(){ return !!P.state.startedAt; },

  /* Freeze the set. Deliberately one-way: a set that grows or shrinks
     between cycles makes the cycle times meaningless. */
  begin: function(chapterKeys, ids){
    var s = blank();
    s.chapters = chapterKeys.slice();
    s.order = ids.slice();
    s.startedAt = today();
    s.cycleStartedAt = today();
    P.state = s;
    return save(s);
  },

  reset: function(){ P.state = blank(); return save(P.state); },

  size: function(){ return P.state.order.length; },

  /* ── current cycle ─────────────────────────────────────────────── */

  doneCount: function(){ return Object.keys(P.state.solved).length; },
  remaining: function(){ return P.size() - P.doneCount(); },

  isDone: function(id){ return Object.prototype.hasOwnProperty.call(P.state.solved, id); },

  /* Next unsolved puzzle in this cycle, or null when the cycle is complete. */
  nextId: function(){
    for (var i = 0; i < P.state.order.length; i++){
      if (!P.isDone(P.state.order[i])) return P.state.order[i];
    }
    return null;
  },

  dayOfCycle: function(){
    if (!P.state.cycleStartedAt) return 1;
    return daysBetween(P.state.cycleStartedAt, today()) + 1;
  },

  target: function(){ return targetDays(P.state.cycle); },

  /* Puzzles per remaining day needed to finish on schedule. */
  pace: function(){
    var left = P.remaining();
    var daysLeft = Math.max(1, P.target() - P.dayOfCycle() + 1);
    return { left: left, daysLeft: daysLeft, perDay: Math.ceil(left / daysLeft) };
  },

  onPace: function(){
    var elapsed = P.dayOfCycle(), t = P.target();
    if (elapsed > t) return false;
    var expected = P.size() * (elapsed / t);
    return P.doneCount() >= Math.floor(expected * 0.9);
  },

  /* ── recording ─────────────────────────────────────────────────── */

  record: function(id, firstTryOk, ms){
    var s = P.state;
    if (!s.solved[id]) s.solved[id] = { ok: firstTryOk, ms: ms };
    var d = today();
    s.sessionLog[d] = (s.sessionLog[d] || 0) + 1;
    return save(s);
  },

  /* Puzzles failed in the current cycle — the book says mark these. */
  failedThisCycle: function(){
    return Object.keys(P.state.solved).filter(function(id){ return !P.state.solved[id].ok; });
  },

  /* Failed in two or more cycles: the genuine blind spots. */
  repeatOffenders: function(){
    var h = P.state.history, out = [];
    Object.keys(h).forEach(function(id){
      var misses = h[id].filter(function(x){ return x === 0; }).length;
      if (misses >= 2) out.push({ id: id, misses: misses, of: h[id].length });
    });
    return out.sort(function(a, b){ return b.misses - a.misses; });
  },

  /* ── closing a cycle ───────────────────────────────────────────── */

  cycleComplete: function(){ return P.size() > 0 && P.remaining() === 0; },

  /* True when the whole set was cleared inside one calendar day — the
     book's stopping condition. */
  clearedInOneDay: function(){
    if (!P.cycleComplete()) return false;
    return P.dayOfCycle() === 1;
  },

  /* The book ends the method "when you solve the whole set in one day, or
     after the 7th cycle". The one-day rule means meeting a ONE-DAY TARGET,
     which only exists once the halving has compressed the schedule. Reading
     it as "any cycle finished inside a day" would declare victory on day one
     of cycle 1, when the target is still four weeks. */
  finished: function(){
    var s = P.state;
    if (!s.cycles.length) return false;
    var last = s.cycles[s.cycles.length - 1];
    return last.n >= MAX_CYCLE || (last.target <= 1 && last.days <= 1);
  },

  /* Bank the finished cycle and open the next one. */
  advance: function(){
    var s = P.state;
    if (!P.cycleComplete()) return null;

    var ids = s.order;
    var firstTry = 0, totalMs = 0;
    ids.forEach(function(id){
      var r = s.solved[id];
      var ok = !!(r && r.ok);
      if (ok) firstTry++;
      if (r) totalMs += r.ms || 0;
      if (!s.history[id]) s.history[id] = [];
      s.history[id].push(ok ? 1 : 0);
    });

    var rec = {
      n: s.cycle,
      from: s.cycleStartedAt,
      to: today(),
      days: Math.max(1, daysBetween(s.cycleStartedAt, today()) + 1),
      target: P.target(),
      count: ids.length,
      firstTry: firstTry,
      ms: totalMs
    };
    s.cycles.push(rec);

    s.cycle += 1;
    s.cycleStartedAt = today();
    s.solved = {};
    save(s);
    return rec;
  },

  /* A cycle's headline numbers, for the comparison table. */
  summary: function(){
    return P.state.cycles.map(function(c){
      return {
        n: c.n,
        days: c.days,
        target: c.target,
        accuracy: c.count ? Math.round(100 * c.firstTry / c.count) : 0,
        avgSec: c.count ? Math.round(c.ms / c.count / 1000) : 0,
        totalMin: Math.round(c.ms / 60000)
      };
    });
  }
};

window.TCProgress = P;

})();
