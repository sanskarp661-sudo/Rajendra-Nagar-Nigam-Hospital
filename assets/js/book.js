/* Booking flow: service → choice → date & time → patient → review → WhatsApp hand-off.
   Requests are saved in localStorage ("rnh-appointments") and sent by the patient on WhatsApp. */
(function () {
  'use strict';
  var U = window.RNHUtil; if (!U) return;
  var $ = U.$, $$ = U.$$, S = U.S, L = U.L, esc = U.esc, R = U.R;
  var form = $('#book-form'); if (!form) return;

  U.loadData(function (D) {
    var DOCS = D.doctors.filter(function (d) { return d.bookable; });
    var DEPT = {}; D.departments.forEach(function (d) { DEPT[d.slug] = d; });
    var TEST = {}; D.tests.tests.forEach(function (t) { TEST[t.id] = t; });
    var CAT = {}; D.tests.categories.forEach(function (c) { CAT[c.id] = c; });
    var PKG = {}; D.packages.forEach(function (p) { PKG[p.id] = p; });
    var state = { type: 'consultation', dept: '', doctor: '', pkg: '', tests: [], date: '', time: null };
    var step = 1, TOTAL = 5;

    /* ---------- Prefill from the URL or the lab-test list ---------- */
    var P = new URLSearchParams(location.search);
    if (P.get('type') && ['consultation', 'checkup', 'lab'].indexOf(P.get('type')) >= 0) state.type = P.get('type');
    if (P.get('package') && PKG[P.get('package')]) { state.type = 'checkup'; state.pkg = P.get('package'); }
    if (P.get('doctor')) { var dd = DOCS.filter(function (x) { return x.slug === P.get('doctor'); })[0]; if (dd) { state.type = 'consultation'; state.doctor = dd.slug; state.dept = dd.dept; } }
    if (P.get('dept') && DEPT[P.get('dept')]) { state.dept = P.get('dept'); if (!P.get('type')) state.type = 'consultation'; }
    if (state.type === 'lab') {
      var ids = (P.get('tests') ? P.get('tests').split(',') : U.store.get('rnh-lab-basket', [])).filter(function (id) { return TEST[id]; });
      state.tests = ids;
    }
    $$('input[name=type]', form).forEach(function (r) { r.checked = r.value === state.type; });
    $('#bk-dept').value = state.dept;

    form.hidden = false;
    var jump = state.type === 'consultation' && state.doctor ? 3 : state.type === 'checkup' && state.pkg ? 3 : (state.type === 'lab' && state.tests.length) || P.get('dept') ? 2 : 1;

    /* ---------- Slots ---------- */
    function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
    function blocksFor(dateKey) {
      var wd = U.weekday(dateKey);
      if (state.type === 'consultation') {
        var doc = DOCS.filter(function (x) { return x.slug === state.doctor; })[0]; if (!doc) return [];
        return doc.schedule.filter(function (s) { return s.days.indexOf(wd) >= 0; }).map(function (s) { return [U.toMins(s.from), U.toMins(s.to), 15]; });
      }
      if (state.type === 'checkup') return wd === 0 ? [] : [[450, 630, 30]];
      var tests = state.tests.map(function (id) { return TEST[id]; });
      var imaging = tests.some(function (t) { return t.cat === 'imaging'; }), fasting = tests.some(function (t) { return t.fasting; });
      if (imaging) return wd === 0 ? [] : [[540, fasting ? 660 : 1020, 30]];
      return [[420, fasting ? 660 : 1260, 30]];
    }
    function slotsFor(dateKey) {
      var out = [], isToday = dateKey === U.todayKey(), now = U.nowIST().mins, who = state.doctor || state.pkg || state.tests.join('+') || state.type;
      blocksFor(dateKey).forEach(function (b) {
        for (var m = b[0]; m + b[2] <= b[1]; m += b[2]) {
          var past = isToday && m < now + 30;
          var taken = !past && hash(who + dateKey + m) % 5 === 0;
          out.push({ m: m, off: past || taken, taken: taken });
        }
      });
      return out;
    }

    /* ---------- Step 2 renderers ---------- */
    function renderDoctors() {
      var list = DOCS.filter(function (x) { return !state.dept || x.dept === state.dept; });
      if (state.doctor && !list.some(function (x) { return x.slug === state.doctor; })) state.doctor = '';
      $('#bk-doctors').innerHTML = list.map(function (x) {
        var n = U.nextSlot(x), next = n ? (S.nextAvail + ': ' + U.whenLabel(n.key) + ', ' + U.fmtTime(n.mins)) : '';
        var sched = x.schedule.map(function (s) { return s.days.length === 6 && s.days.indexOf(0) < 0 ? (R.lang === 'hi' ? 'सोम–शनि' : 'Mon–Sat') : s.days.map(function (d) { return U.fmtDate(U.addDays(U.todayKey(), (d - U.weekday(U.todayKey()) + 7) % 7), { weekday: 'short', day: undefined, month: undefined }); }).join(', '); }).join(' · ');
        return '<label class="pick"><input type="radio" name="doctor" value="' + x.slug + '"' + (state.doctor === x.slug ? ' checked' : '') + '>' +
          '<span class="pick-in"><span class="avatar h' + x.hue + '" aria-hidden="true">' + x.initials + '</span><span class="pick-txt"><b>' + esc(L(x.name)) + '</b><small>' + esc(L(DEPT[x.dept].name)) + ' · ' + esc(x.qual) + '</small><small>' + esc(sched) + (next ? ' · <span class="ok-txt">' + esc(next) + '</span>' : '') + '</small></span>' +
          '<span class="pick-price">' + U.rupee(x.fee) + (D.sample ? '<span class="sample-badge">' + esc(S.sample) + '</span>' : '') + '</span></span></label>';
      }).join('');
      $$('input[name=doctor]', form).forEach(function (r) { r.addEventListener('change', function () { state.doctor = r.value; state.date = ''; state.time = null; clearErr(2); summary(); }); });
    }
    function renderPackages() {
      $('#bk-packages').innerHTML = D.packages.map(function (p) {
        return '<label class="pick"><input type="radio" name="pkg" value="' + p.id + '"' + (state.pkg === p.id ? ' checked' : '') + '>' +
          '<span class="pick-in"><span class="ico">' + '<svg class="i" aria-hidden="true"><use href="#i-shield"/></svg></span><span class="pick-txt"><b>' + esc(L(p.name)) + '</b><small>' + esc(L(p.for)) + '</small><small>' + p.tests.length + ' · ' + esc(L(p.report)) + '</small></span>' +
          '<span class="pick-price">' + U.rupee(p.price) + '<s>' + U.rupee(p.mrp) + '</s></span></span></label>';
      }).join('');
      $$('input[name=pkg]', form).forEach(function (r) { r.addEventListener('change', function () { state.pkg = r.value; state.date = ''; state.time = null; clearErr(2); summary(); }); });
    }
    function renderTests() {
      var q = $('#bk-test-q').value.trim().toLowerCase();
      var list = D.tests.tests.filter(function (t) { return !q || (t.name + ' ' + CAT[t.cat].name.en + ' ' + CAT[t.cat].name.hi).toLowerCase().indexOf(q) >= 0 || state.tests.indexOf(t.id) >= 0; });
      $('#bk-tests').innerHTML = list.map(function (t) {
        var on = state.tests.indexOf(t.id) >= 0;
        return '<label class="tpick' + (on ? ' on' : '') + '"><input type="checkbox" value="' + t.id + '"' + (on ? ' checked' : '') + '><span>' + esc(t.name) + (t.fasting ? ' <span class="pill warn">' + esc(S.fasting) + '</span>' : '') + '<small>' + esc(L(CAT[t.cat].name)) + '</small></span><b>' + U.rupee(t.price) + '</b></label>';
      }).join('');
      $$('#bk-tests input', form).forEach(function (c) {
        c.addEventListener('change', function () {
          var i = state.tests.indexOf(c.value);
          if (c.checked && i < 0) state.tests.push(c.value); if (!c.checked && i >= 0) state.tests.splice(i, 1);
          c.closest('.tpick').classList.toggle('on', c.checked); state.date = ''; state.time = null; clearErr(2); testTotal(); summary();
        });
      });
      testTotal();
    }
    function testTotal() {
      var sum = state.tests.reduce(function (a, id) { return a + TEST[id].price; }, 0);
      $('#bk-test-total').innerHTML = state.tests.length ? esc(U.fmt('itemsSelected', { n: state.tests.length })) + ' · ' + esc(S.total) + ': <b>' + U.rupee(sum) + '</b>' : '';
    }
    $('#bk-test-q').addEventListener('input', renderTests);
    $('#bk-dept').addEventListener('change', function () { state.dept = this.value; renderDoctors(); summary(); });

    /* ---------- Step 3 renderers ---------- */
    function renderDates() {
      var today = U.todayKey(), html = '', first = '';
      for (var i = 0; i < 14; i++) {
        var key = U.addDays(today, i), free = slotsFor(key).filter(function (s) { return !s.off; }).length;
        if (free && !first) first = key;
        var p = key.split('-');
        html += '<label class="dchip' + (free ? '' : ' off') + '"><input type="radio" name="date" value="' + key + '"' + (free ? '' : ' disabled') + (state.date === key ? ' checked' : '') + '>' +
          '<span><small>' + esc(i === 0 ? S.today : i === 1 ? S.tomorrow : U.fmtDate(key, { weekday: 'short', day: undefined, month: undefined })) + '</small><b>' + (+p[2]) + '</b><small>' + esc(U.fmtDate(key, { weekday: undefined, day: undefined, month: 'short' })) + '</small></span></label>';
      }
      $('#bk-dates').innerHTML = html;
      if (!state.date || !slotsFor(state.date).some(function (s) { return !s.off; })) state.date = first;
      var r = $('#bk-dates input[value="' + state.date + '"]'); if (r) r.checked = true;
      $$('#bk-dates input', form).forEach(function (r2) { r2.addEventListener('change', function () { state.date = r2.value; state.time = null; renderSlots(); summary(); }); });
      var sub = '';
      if (state.type === 'consultation') { var doc = DOCS.filter(function (x) { return x.slug === state.doctor; })[0]; if (doc) sub = L(doc.name) + ' · ' + L(DEPT[doc.dept].name); }
      else if (state.type === 'checkup' && PKG[state.pkg]) sub = L(PKG[state.pkg].name) + ' · ' + (R.lang === 'hi' ? 'सुबह खाली पेट आएँ' : 'come in the morning, fasting');
      else sub = U.fmt('itemsSelected', { n: state.tests.length });
      $('#s3-sub').textContent = sub;
      renderSlots();
    }
    function renderSlots() {
      if (!state.date) { $('#bk-slots').innerHTML = '<p class="muted">' + esc(S.noSlots) + '</p>'; return; }
      var slots = slotsFor(state.date), groups = [[S.morning, []], [S.afternoon, []], [S.evening, []]];
      slots.forEach(function (s) { groups[s.m < 720 ? 0 : s.m < 960 ? 1 : 2][1].push(s); });
      var html = '';
      groups.forEach(function (g) {
        if (!g[1].length) return;
        html += '<div class="slot-group"><p class="slot-g">' + esc(g[0]) + '</p><div class="slot-row">' + g[1].map(function (s) {
          return '<label class="slot' + (s.off ? ' off' : '') + '"><input type="radio" name="time" value="' + s.m + '"' + (s.off ? ' disabled' : '') + (state.time === s.m ? ' checked' : '') + '><span>' + esc(U.fmtTime(s.m)) + (s.taken ? '<span class="sr-only"> (' + esc(S.booked) + ')</span>' : '') + '</span></label>';
        }).join('') + '</div></div>';
      });
      $('#bk-slots').innerHTML = html || '<p class="muted">' + esc(S.noSlots) + '</p>';
      $$('#bk-slots input', form).forEach(function (r) { r.addEventListener('change', function () { state.time = +r.value; clearErr(3); summary(); }); });
    }

    /* ---------- Summary + review (shared helpers in booking-core.js) ---------- */
    var T = window.RNHBooking(D), rows = function (rec) { return T.rows(rec || snapshot()); }, dl = T.dl;
    function snapshot() {
      var g = $('input[name=gender]:checked', form), v = $('input[name=visit]:checked', form);
      return { type: state.type, dept: state.dept, doctor: state.doctor, pkg: state.pkg, tests: state.tests.slice(), date: state.date, time: state.time,
        name: $('#bk-name').value.trim(), phone: $('#bk-phone').value.replace(/\D/g, ''), age: $('#bk-age').value.trim(),
        gender: g ? g.value : '', visit: v ? v.value : 'new', notes: $('#bk-notes').value.trim() };
    }
    function summary() { $('#bk-summary').innerHTML = dl(rows().filter(function (x) { return x[0] !== S.notes; })); }

    /* ---------- Validation ---------- */
    function clearErr(n) { var e = $('[data-err="' + n + '"]', form); if (e) { e.hidden = true; e.textContent = ''; } }
    function showErr(n, msg) { var e = $('[data-err="' + n + '"]', form); e.hidden = false; e.textContent = msg; e.setAttribute('role', 'alert'); }
    function fieldErr(name, msg) {
      var e = $('[data-err-for="' + name + '"]', form), inp = form.elements[name];
      e.hidden = !msg; e.textContent = msg || '';
      var el = inp && inp.length && !inp.tagName ? inp[0] : inp; if (el && el.setAttribute) el.setAttribute('aria-invalid', !!msg);
      return !msg;
    }
    function valid(n) {
      if (n === 2) {
        if (state.type === 'consultation' && !state.doctor) { showErr(2, S.chooseDoctor); return false; }
        if (state.type === 'checkup' && !state.pkg) { showErr(2, S.errStep); return false; }
        if (state.type === 'lab' && !state.tests.length) { showErr(2, S.errTests); return false; }
      }
      if (n === 3 && (!state.date || state.time == null)) { showErr(3, S.errSlot); return false; }
      if (n === 4) {
        var s = snapshot(), ok = true;
        ok = fieldErr('name', s.name.length >= 2 ? '' : S.errName) && ok;
        ok = fieldErr('phone', /^[6-9]\d{9}$/.test(s.phone) ? '' : S.errPhone) && ok;
        ok = fieldErr('age', s.age !== '' && +s.age >= 0 && +s.age <= 120 ? '' : S.errAge) && ok;
        ok = fieldErr('gender', s.gender ? '' : S.errGender) && ok;
        if (!ok) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); }
        return ok;
      }
      if (n === 5 && !$('#bk-consent').checked) { showErr(5, S.errConsent); return false; }
      return true;
    }
    ['name', 'phone', 'age'].forEach(function (n) { form.elements[n].addEventListener('input', function () { if (this.getAttribute('aria-invalid') === 'true') valid(4); summary(); }); });
    $$('input[name=gender]', form).forEach(function (r) { r.addEventListener('change', function () { fieldErr('gender', ''); summary(); }); });
    $('#bk-phone').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });
    $('#bk-consent').addEventListener('change', function () { clearErr(5); });

    /* ---------- Step navigation ---------- */
    function show(n, focus) {
      step = n;
      $$('.bstep', form).forEach(function (f) { f.hidden = +f.dataset.step !== n; });
      $$('#stepper li').forEach(function (li, i) { li.className = i + 1 < n ? 'done' : i + 1 === n ? 'current' : ''; });
      $('#step-count').textContent = U.fmt('step', { a: n, b: TOTAL });
      $('#bk-back').hidden = n === 1; $('#bk-next').hidden = n === TOTAL; $('#bk-submit').hidden = n !== TOTAL;
      if (n === 2) {
        $$('[data-for]', form).forEach(function (b) { b.hidden = b.dataset.for !== state.type; });
        $('#s2-title').textContent = state.type === 'consultation' ? (R.lang === 'hi' ? 'डॉक्टर चुनें' : 'Choose a doctor') : state.type === 'checkup' ? (R.lang === 'hi' ? 'पैकेज चुनें' : 'Choose a package') : (R.lang === 'hi' ? 'जाँच चुनें' : 'Choose tests');
        if (state.type === 'consultation') renderDoctors(); else if (state.type === 'checkup') renderPackages(); else renderTests();
      }
      if (n === 3) renderDates();
      if (n === 5) $('#bk-review').innerHTML = dl(rows());
      summary();
      if (focus) { var lg = $('.bstep[data-step="' + n + '"] .step-title', form); lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); form.scrollIntoView({ behavior: U.reduced ? 'auto' : 'smooth', block: 'start' }); }
    }
    $$('input[name=type]', form).forEach(function (r) { r.addEventListener('change', function () { state.type = r.value; state.date = ''; state.time = null; summary(); }); });
    $('#bk-next').addEventListener('click', function () { if (valid(step)) show(step + 1, true); });
    $('#bk-back').addEventListener('click', function () { show(step - 1, true); });
    form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && step < TOTAL) { e.preventDefault(); $('#bk-next').click(); } });

    /* ---------- Submit ---------- */
    function makeRef() { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; var n = U.nowIST(); return 'RNH-' + String(n.y).slice(2) + String(n.m).padStart(2, '0') + String(n.d).padStart(2, '0') + '-' + s; }
    var waText = T.waText, ics = T.ics;
    var last = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(5)) return;
      var rec = snapshot(); rec.ref = makeRef(); rec.created = new Date().toISOString(); rec.status = 'pending'; rec.lang = R.lang;
      var all = U.store.get('rnh-appointments', []); all.unshift(rec); U.store.set('rnh-appointments', all);
      if (rec.type === 'lab') U.store.set('rnh-lab-basket', []);
      last = rec;
      $('#bk-done-review').innerHTML = dl(rows(rec));
      $('#bk-wa').href = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(waText(rec));
      form.hidden = true; $('#stepper').hidden = true;
      var done = $('#bk-done'); done.hidden = false; done.focus();
      done.scrollIntoView({ behavior: U.reduced ? 'auto' : 'smooth', block: 'start' });
    });
    $('#bk-ics').addEventListener('click', function () {
      if (!last) return;
      var blob = new Blob([ics(last)], { type: 'text/calendar' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = last.ref + '.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    $('#bk-print').addEventListener('click', function () { window.print(); });
    $('#bk-again').addEventListener('click', function () { location.href = location.pathname; });

    show(jump, false);
  });
})();
