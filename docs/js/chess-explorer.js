/* ── BrainStuffer · lichess opening explorer ──────────────────────────
   Turns "this is the main line" into "78% of players actually play this",
   using aggregated rated games from the public lichess opening explorer.

     GET https://explorer.lichess.org/lichess?play=e2e4,e7e5,g1f3

   `play` is a comma-separated list of UCI moves, which core's uciPath()
   builds straight from each move's authored from/to squares. The endpoint
   sends Access-Control-Allow-Origin: * so it is callable from the browser.

   Everything here is strictly additive: the trainer works exactly the same
   with the network off, the toggle off, or the endpoint down. Nothing waits
   on a response and nothing throws if one never arrives.

   Exposes window.ChessExplorer.
─────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var HOST    = 'https://explorer.lichess.org/lichess';
var SPEEDS  = 'blitz,rapid,classical';
var RATINGS = '1600,1800,2000,2200';       /* club level — instructive, not beginner noise */
var MOVES   = 6;

var ENABLED_KEY = 'bs-chess-explorer';
var TOKEN_KEY   = 'bs-chess-lichess-token';

var cache   = {};      /* uci string -> response | {error:…} */
var pending = null;    /* in-flight AbortController */
var timer   = null;

function ls(k, v){
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch (e) { return null; }
}

function enabled(){ return ls(ENABLED_KEY) !== 'off'; }
function setEnabled(on){ ls(ENABLED_KEY, on ? 'on' : 'off'); }
function token(){ return ls(TOKEN_KEY) || ''; }
function setToken(t){ ls(TOKEN_KEY, t || null); }

function url(uci){
  return HOST + '?variant=standard' +
         '&speeds='  + SPEEDS +
         '&ratings=' + RATINGS +
         '&moves='   + MOVES +
         '&topGames=0&recentGames=0' +
         '&play='    + uci;
}

/* Look the position up. Always resolves — never rejects — with either the
   payload or {error:<kind>}, so callers have exactly one code path. */
function lookup(uciArr){
  var key = uciArr.join(',');

  if (cache[key]) return Promise.resolve(cache[key]);
  if (typeof fetch !== 'function') return Promise.resolve({ error: 'unsupported' });

  if (pending) { try { pending.abort(); } catch (e) {} }
  var ctl = (typeof AbortController === 'function') ? new AbortController() : null;
  pending = ctl;

  var headers = { 'Accept': 'application/json' };
  if (token()) headers['Authorization'] = 'Bearer ' + token();

  var opts = { headers: headers };
  if (ctl) opts.signal = ctl.signal;

  return fetch(url(key), opts).then(function(res){
    if (res.status === 401 || res.status === 403) return { error: 'auth' };
    if (res.status === 429) return { error: 'rate' };
    if (!res.ok) return { error: 'http', status: res.status };
    return res.json().then(function(d){
      if (!d || !Array.isArray(d.moves)) return { error: 'shape' };
      cache[key] = d;
      return d;
    }, function(){ return { error: 'shape' }; });
  }).catch(function(e){
    if (e && e.name === 'AbortError') return { error: 'aborted' };
    return { error: 'offline' };
  }).then(function(r){
    if (pending === ctl) pending = null;
    return r;
  });
}

/* Debounced lookup — stepping quickly through a line must not fire a
   request per click. */
function lookupSoon(uciArr, cb){
  if (timer) clearTimeout(timer);
  var key = uciArr.join(',');
  if (cache[key]) { cb(cache[key]); return; }
  timer = setTimeout(function(){ lookup(uciArr).then(cb); }, 320);
}

function total(d){ return (d.white || 0) + (d.draws || 0) + (d.black || 0); }

function pct(n, of){ return of ? Math.round(1000 * n / of) / 10 : 0; }

function fmtCount(n){
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

var MSG = {
  auth:        'The lichess explorer refused the request. It may be asking for a token — you can add a free one below.',
  rate:        'Rate limited by lichess. It will sort itself out in a moment.',
  offline:     'Could not reach lichess. The lesson works fine without it.',
  http:        'Lichess returned an error. The lesson works fine without it.',
  shape:       'Lichess sent something unexpected.',
  unsupported: 'This browser cannot fetch live data.',
  aborted:     ''
};

/* Render into `host`. `expectedSan` is the move the lesson teaches next, so
   it can be called out among what everyone else plays. */
function render(host, data, expectedSan){
  if (!host) return;

  if (!enabled()){
    host.innerHTML = '';
    return;
  }
  if (data === 'loading'){
    host.innerHTML = '<div class="xp"><div class="xp-head"><span class="xp-t">Lichess explorer</span>' +
                     '<span class="xp-n">checking…</span></div></div>';
    return;
  }
  if (!data){ host.innerHTML = ''; return; }

  if (data.error){
    if (data.error === 'aborted'){ return; }        /* superseded — leave what is there */
    var extra = '';
    if (data.error === 'auth'){
      extra = '<div class="xp-token">' +
              '<input type="password" id="xp-token-in" placeholder="lichess API token (optional)" ' +
              'autocomplete="off" spellcheck="false">' +
              '<button type="button" class="ctl" id="xp-token-save">Save</button>' +
              '</div><div class="xp-note">Create one at lichess.org → Preferences → API access tokens. ' +
              'No permissions needed. It is stored only in this browser.</div>';
    }
    host.innerHTML = '<div class="xp"><div class="xp-head"><span class="xp-t">Lichess explorer</span></div>' +
                     '<div class="xp-msg">' + MSG[data.error] + '</div>' + extra + '</div>';
    var save = host.querySelector('#xp-token-save');
    if (save) save.addEventListener('click', function(){
      var v = host.querySelector('#xp-token-in').value.trim();
      setToken(v);
      cache = {};
      host.innerHTML = '<div class="xp"><div class="xp-msg">Token saved. Step a move to retry.</div></div>';
    });
    return;
  }

  var tot = total(data);
  if (!tot || !data.moves.length){
    host.innerHTML = '<div class="xp"><div class="xp-head"><span class="xp-t">Lichess explorer</span></div>' +
      '<div class="xp-msg">No games reach this position at club level — you are already off the beaten track.</div></div>';
    return;
  }

  var rows = data.moves.map(function(m){
    var n    = (m.white || 0) + (m.draws || 0) + (m.black || 0);
    var mine = expectedSan && m.san === expectedSan;
    return '<div class="xp-row' + (mine ? ' mine' : '') + '">' +
      '<span class="xp-san">' + m.san + '</span>' +
      '<span class="xp-bar"><span class="xp-fill" style="width:' + pct(n, tot) + '%"></span></span>' +
      '<span class="xp-pct">' + pct(n, tot) + '%</span>' +
      '<span class="xp-wdl" title="white / draw / black">' +
        '<i class="w" style="flex:' + (m.white || 0) + '"></i>' +
        '<i class="d" style="flex:' + (m.draws || 0) + '"></i>' +
        '<i class="b" style="flex:' + (m.black || 0) + '"></i>' +
      '</span></div>';
  }).join('');

  var played = expectedSan && data.moves.some(function(m){ return m.san === expectedSan; });
  var foot = '';
  if (expectedSan && !played){
    foot = '<div class="xp-msg">Almost nobody plays <b>' + expectedSan +
           '</b> here at this level — which is exactly why it is worth knowing.</div>';
  }
  var opening = data.opening && data.opening.name
    ? '<div class="xp-note">Lichess calls this position: <b>' + data.opening.name + '</b>' +
      (data.opening.eco ? ' (' + data.opening.eco + ')' : '') + '</div>'
    : '';

  host.innerHTML =
    '<div class="xp">' +
      '<div class="xp-head">' +
        '<span class="xp-t">What players actually play here</span>' +
        '<span class="xp-n">' + fmtCount(tot) + ' games</span>' +
      '</div>' +
      '<div class="xp-rows">' + rows + '</div>' +
      foot + opening +
      '<div class="xp-note xp-src">Lichess rated blitz, rapid and classical · 1600&ndash;2200</div>' +
    '</div>';
}

/* One-line summary for the challenge reveal, or null if unavailable. */
function share(data, san){
  if (!data || data.error || !data.moves) return null;
  var tot = total(data);
  if (!tot) return null;
  var m = data.moves.filter(function(x){ return x.san === san; })[0];
  if (!m) return null;
  var n = (m.white || 0) + (m.draws || 0) + (m.black || 0);
  return pct(n, tot) + '% of ' + fmtCount(tot) + ' lichess games play ' + san + ' here.';
}

window.ChessExplorer = {
  lookup: lookup,
  lookupSoon: lookupSoon,
  render: render,
  share: share,
  enabled: enabled,
  setEnabled: setEnabled,
  setToken: setToken,
  _url: url,
  _clearCache: function(){ cache = {}; }
};

})();
