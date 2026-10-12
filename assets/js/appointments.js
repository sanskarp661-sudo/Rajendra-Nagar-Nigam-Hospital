/* My appointments: list, resend, add to calendar, cancel (requests saved on this device). */
(function () {
  'use strict';
  var U = window.RNHUtil; if (!U) return;
  var $ = U.$, $$ = U.$$, S = U.S, esc = U.esc, R = U.R;
  var list = $('#appt-list'); if (!list) return;

  U.loadData(function (D) {
    var T = window.RNHBooking(D);
    function all() { return U.store.get('rnh-appointments', []); }
    function save(a) { U.store.set('rnh-appointments', a); }
    function isPast(r) {
      var t = U.todayKey(); if (r.date < t) return true;
      return r.date === t && r.time < U.nowIST().mins;
    }
    function render() {
      var items = all();
      $('#appt-empty').hidden = items.length > 0;
      list.innerHTML = items.map(function (r) {
        var past = isPast(r), st = r.status === 'cancelled' ? 'cancelled' : past ? 'past' : 'pending';
        var label = st === 'cancelled' ? S.cancelled : st === 'past' ? S.past : S.pending;
        var head = (r.type === 'consultation' && T.DOC[r.doctor]) ? U.L(T.DOC[r.doctor].name) : (r.type === 'checkup' && T.PKG[r.pkg]) ? U.L(T.PKG[r.pkg].name) : T.serviceName(r.type);
        var when = r.date ? U.fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + U.fmtTime(r.time) : '';
        var acts = '';
        if (st === 'pending') {
          acts = '<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(T.waText(r)) + '"><svg class="i" aria-hidden="true"><use href="#i-wa"/></svg><span>' + esc(S.sendWa) + '</span></a>' +
            '<button class="btn sm ghost" type="button" data-ics="' + esc(r.ref) + '"><svg class="i" aria-hidden="true"><use href="#i-download"/></svg><span>' + esc(S.addCal) + '</span></button>' +
            '<button class="btn sm ghost danger" type="button" data-cancel="' + esc(r.ref) + '"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg><span>' + esc(S.cancel) + '</span></button>';
        } else {
          var q = r.type === 'consultation' ? '?doctor=' + encodeURIComponent(r.doctor) : r.type === 'checkup' ? '?type=checkup&package=' + encodeURIComponent(r.pkg) : '?type=lab&tests=' + encodeURIComponent((r.tests || []).join(','));
          acts = '<a class="btn sm ghost" href="' + R.base + 'book/' + q + '"><svg class="i" aria-hidden="true"><use href="#i-calendar"/></svg><span>' + esc(S.rebook) + '</span></a>' +
            '<button class="btn sm ghost danger" type="button" data-remove="' + esc(r.ref) + '"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg><span>' + esc(S.remove) + '</span></button>';
        }
        return '<article class="appt ' + st + '"><div class="appt-head"><div><span class="appt-status ' + st + '">' + esc(label) + '</span><h2>' + esc(head) + '</h2><p class="appt-when"><svg class="i" aria-hidden="true"><use href="#i-calendar"/></svg>' + esc(when) + '</p></div><span class="appt-ref">' + esc(r.ref) + '</span></div>' +
          '<details><summary>' + (R.lang === 'hi' ? 'पूरी जानकारी' : 'Full details') + '<svg class="i" aria-hidden="true"><use href="#i-chev"/></svg></summary><dl class="review">' + T.dl(T.rows(r)) + '</dl></details>' +
          '<div class="appt-acts">' + acts + '</div></article>';
      }).join('');
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var items = all(), ref = b.dataset.ics || b.dataset.cancel || b.dataset.remove, rec = items.filter(function (x) { return x.ref === ref; })[0];
      if (!rec) return;
      if (b.dataset.ics) T.download(rec);
      if (b.dataset.cancel) {
        if (!confirm(S.cancelConfirm)) return;
        rec.status = 'cancelled'; save(items); render();
        window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(S.waCancel + '\n\n' + S.ref + ': ' + rec.ref + '\n' + S.patient + ': ' + rec.name), '_blank', 'noopener');
      }
      if (b.dataset.remove) { save(items.filter(function (x) { return x.ref !== ref; })); render(); }
    });
    render();
  });
})();
