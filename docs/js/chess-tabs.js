/* ── BrainStuffer · chess trainer tab bar ─────────────────────────────
   Page chrome only. Each mode panel wires itself up independently, so a
   new mode is a new <section class="tab-panel"> plus a new button — no
   changes here.
──────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

var tabBtns = [].slice.call(document.querySelectorAll('.tab-btn'));
tabBtns.forEach(function(b){
  b.addEventListener('click', function(){
    tabBtns.forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
    document.getElementById('tab-' + b.getAttribute('data-tab')).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

})();
