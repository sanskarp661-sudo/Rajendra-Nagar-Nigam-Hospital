/* Lab tests: search, category filter and a test list (basket) that carries into booking. */
(function () {
  'use strict';
  var U = window.RNHUtil; if (!U) return;
  var $ = U.$, $$ = U.$$, S = U.S, esc = U.esc, R = U.R;
  var q = $('#lt-q'); if (!q) return;
  var rows = $$('#lt-table tbody tr'), cat = 'all';
  var P = new URLSearchParams(location.search); if (P.get('q')) q.value = P.get('q');

  function apply() {
    var term = q.value.trim().toLowerCase(), n = 0;
    rows.forEach(function (r) {
      var ok = (cat === 'all' || r.dataset.cat === cat) && (!term || term.split(/\s+/).every(function (t) { return r.dataset.search.indexOf(t) >= 0; }));
      r.hidden = !ok; if (ok) n++;
    });
    $('#lt-count').textContent = U.fmt('showingTests', { n: n });
    $('#lt-empty').hidden = n > 0;
  }
  q.addEventListener('input', apply);
  $$('[data-lt-cat]').forEach(function (b) {
    b.addEventListener('click', function () { cat = b.dataset.ltCat; $$('[data-lt-cat]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); apply(); });
  });

  U.loadData(function (D) {
    var TEST = {}; D.tests.tests.forEach(function (t) { TEST[t.id] = t; });
    var basket = U.store.get('rnh-lab-basket', []).filter(function (id) { return TEST[id]; });
    function render() {
      U.store.set('rnh-lab-basket', basket);
      $$('[data-add]').forEach(function (b) {
        var on = basket.indexOf(b.dataset.add) >= 0;
        b.setAttribute('aria-pressed', on); b.classList.toggle('on', on);
        b.querySelector('use').setAttribute('href', on ? '#i-check' : '#i-plus');
        b.querySelector('span').textContent = on ? S.added : S.add;
        b.setAttribute('aria-label', (on ? S.remove : S.add) + ': ' + TEST[b.dataset.add].name);
      });
      var sum = basket.reduce(function (a, id) { return a + TEST[id].price; }, 0);
      $('#basket-n').textContent = basket.length;
      $('#basket-list').innerHTML = basket.map(function (id) {
        return '<li><span>' + esc(TEST[id].name) + '</span><b>' + U.rupee(TEST[id].price) + '</b><button type="button" class="x" data-rm="' + id + '" aria-label="' + esc(S.remove + ': ' + TEST[id].name) + '"><svg class="i" aria-hidden="true"><use href="#i-close"/></svg></button></li>';
      }).join('');
      $('#basket-empty').hidden = basket.length > 0;
      $('#basket-total').hidden = !basket.length; $('#basket-sum').textContent = U.rupee(sum);
      $('#basket-fast').hidden = !basket.some(function (id) { return TEST[id].fasting; });
      $('#basket-clear').hidden = !basket.length;
      var bk = $('#basket-book');
      bk.href = R.base + 'book/?type=lab' + (basket.length ? '&tests=' + basket.join(',') : '');
      bk.setAttribute('aria-disabled', !basket.length); bk.classList.toggle('disabled', !basket.length);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), rm = e.target.closest('[data-rm]');
      if (a) { var id = a.dataset.add, i = basket.indexOf(id); if (i >= 0) basket.splice(i, 1); else basket.push(id); render(); }
      if (rm) { basket.splice(basket.indexOf(rm.dataset.rm), 1); render(); }
    });
    $('#basket-clear').addEventListener('click', function () { basket = []; render(); });
    $('#basket-book').addEventListener('click', function (e) { if (!basket.length) e.preventDefault(); });
    render();
  });
  apply();
})();
