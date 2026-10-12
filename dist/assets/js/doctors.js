/* Doctor directory: search and filters. Cards are rendered by the server; this only shows/hides them. */
(function () {
  'use strict';
  var U = window.RNHUtil; if (!U) return;
  var $ = U.$, $$ = U.$$, S = U.S;
  var q = $('#doc-q'), dept = $('#doc-dept'), day = $('#doc-day'), gender = $('#doc-gender');
  if (!q) return;
  var cards = $$('#doc-grid .doc-card'), count = $('#doc-count'), empty = $('#doc-empty');
  var params = new URLSearchParams(location.search);
  if (params.get('dept')) dept.value = params.get('dept');
  if (params.get('q')) q.value = params.get('q');
  if (params.get('day')) day.value = params.get('day');

  function norm(s) { return String(s).toLowerCase().trim(); }
  function apply() {
    var term = norm(q.value), dv = dept.value, gv = gender.value, dayv = day.value, n = 0;
    if (dayv === 'today') dayv = String(U.weekday(U.todayKey()));
    cards.forEach(function (c) {
      var days = c.dataset.days ? c.dataset.days.split(',') : [];
      var ok = (!term || term.split(/\s+/).every(function (t) { return c.dataset.search.indexOf(t) >= 0; })) &&
        (!dv || c.dataset.dept === dv) && (!gv || c.dataset.gender === gv) &&
        (!dayv || days.indexOf(dayv) >= 0);
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = U.fmt('showing', { n: n });
    empty.hidden = n > 0;
    var p = new URLSearchParams();
    if (q.value.trim()) p.set('q', q.value.trim()); if (dv) p.set('dept', dv); if (day.value) p.set('day', day.value);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  [q, dept, day, gender].forEach(function (el) { el.addEventListener(el === q ? 'input' : 'change', apply); });
  $('#doc-reset').addEventListener('click', function () { q.value = ''; dept.value = ''; day.value = ''; gender.value = ''; apply(); q.focus(); });
  apply();
})();
