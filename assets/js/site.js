/* Rajendra N.N. Hospital – shared behaviour for every page. No dependencies. */
(function () {
  'use strict';
  var d = document.documentElement;
  d.classList.remove('no-js'); d.classList.add('js');
  var R = window.RNH || { lang: 'en', base: '/', s: {} };
  var S = R.s || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.RNHUtil = { $: $, $$: $$, reduced: reduced, S: S, R: R };

  /* ---------- Shared helpers (also used by page scripts) ---------- */
  var U = window.RNHUtil;
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  U.L = function (v) { return v && typeof v === 'object' && 'en' in v ? (v[R.lang] || v.en) : v; };
  U.rupee = function (n) {
    var s = String(Math.round(n)), t = s.slice(-3), h = s.slice(0, -3);
    if (h) t = h.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + t;
    return '₹' + t;
  };
  U.fmt = function (key, map) { var s = S[key] || key; for (var k in map) s = s.replace('{' + k + '}', map[k]); return s; };
  // "Now" in Indian Standard Time, as plain numbers
  U.nowIST = function () {
    var p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, mins: (+p.hour) * 60 + (+p.minute) };
  };
  U.dateKey = function (y, m, dd) { return y + '-' + String(m).padStart(2, '0') + '-' + String(dd).padStart(2, '0'); };
  U.addDays = function (key, n) { var p = key.split('-'); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return U.dateKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  U.weekday = function (key) { var p = key.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); };
  U.todayKey = function () { var n = U.nowIST(); return U.dateKey(n.y, n.m, n.d); };
  U.fmtTime = function (mins) {
    var h = Math.floor(mins / 60), m = mins % 60, h12 = h % 12 || 12, mm = String(m).padStart(2, '0');
    if (R.lang === 'hi') { var part = h < 12 && h >= 4 ? 'सुबह' : h < 16 && h >= 12 ? 'दोपहर' : h < 20 && h >= 16 ? 'शाम' : 'रात'; return part + ' ' + h12 + ':' + mm; }
    return h12 + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
  };
  U.fmtDate = function (key, opts) {
    var p = key.split('-'), dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 6));
    return new Intl.DateTimeFormat(R.lang === 'hi' ? 'hi-IN' : 'en-IN', Object.assign({ timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }, opts || {})).format(dt);
  };
  U.toMins = function (hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); };
  // Next available OPD slot for a doctor (returns {key, mins} or null)
  U.nextSlot = function (doc) {
    if (!doc || !doc.bookable || !doc.schedule.length) return null;
    var today = U.todayKey(), now = U.nowIST().mins;
    for (var i = 0; i < 14; i++) {
      var key = U.addDays(today, i), wd = U.weekday(key);
      for (var j = 0; j < doc.schedule.length; j++) {
        var s = doc.schedule[j];
        if (s.days.indexOf(wd) < 0) continue;
        var start = U.toMins(s.from), end = U.toMins(s.to);
        if (i === 0) { if (now + 30 >= end) continue; start = Math.max(start, Math.ceil((now + 30) / 15) * 15); }
        return { key: key, mins: start };
      }
    }
    return null;
  };
  U.whenLabel = function (key) {
    var t = U.todayKey();
    if (key === t) return S.today;
    if (key === U.addDays(t, 1)) return S.tomorrow;
    return U.fmtDate(key);
  };
  U.loadData = function (cb) {
    if (window.RNH_DATA) return cb(window.RNH_DATA);
    var sc = document.createElement('script'); sc.src = '/assets/data/data.js?v=' + (R.v || '1');
    sc.onload = function () { cb(window.RNH_DATA); }; document.head.appendChild(sc);
  };
  U.store = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  /* ---------- Language links remember the choice ---------- */
  $$('a[hreflang]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('hospital-language', a.getAttribute('hreflang')); } catch (e) {}
      a.href = a.getAttribute('href').split('#')[0] + location.search + location.hash;
    });
  });

  /* ---------- Mobile menu ---------- */
  var nav = $('#nav'), menu = $('#menu');
  function setMenu(open) { if (!nav) return; nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', open); menu.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu'); }
  if (menu) menu.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav && nav.classList.contains('open')) { setMenu(false); menu.focus(); } });
  window.addEventListener('resize', function () { if (innerWidth > 1240) setMenu(false); });

  /* ---------- Header shadow, progress, hero parallax ---------- */
  var header = $('header'), hero = $('.hero'), himg = $('.hero-img'), ticking = false;
  function onScroll() {
    var y = window.scrollY || 0, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 8);
    header.style.setProperty('--sp', max > 0 ? Math.min(1, y / max) : 0);
    if (hero && himg && !reduced && y < hero.offsetHeight + 200) himg.style.setProperty('--py', (y * 0.12).toFixed(1) + 'px');
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Live "open now" status (home) ---------- */
  var st = $('#status-text');
  if (st && window.Intl && st.dataset.tpl) {
    var fmt = new Intl.DateTimeFormat(R.lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' });
    var tick = function () { st.textContent = st.dataset.tpl.replace('{t}', fmt.format(new Date())); };
    tick(); setInterval(tick, 30000);
  }

  /* ---------- Hero slideshow (home) ---------- */
  var slides = $$('.slide'), dots = $$('.dot-btn'), ctrl = $('.slide-ctrl'), tog = $('#slide-toggle'), cur = 0, timer = null, DUR = 7000, playing = !reduced;
  function show(i) {
    cur = i;
    slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
    dots.forEach(function (b, k) { var on = k === i; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); var bar = b.querySelector('.bar i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; });
    schedule();
  }
  function schedule() { clearTimeout(timer); if (playing && !document.hidden) timer = setTimeout(function () { show((cur + 1) % slides.length); }, DUR); }
  function setPlaying(p) {
    playing = p; ctrl.classList.toggle('paused', !p);
    tog.querySelector('use').setAttribute('href', p ? '#i-pause' : '#i-play');
    tog.setAttribute('aria-label', p ? tog.dataset.pause : tog.dataset.play);
    if (p) show(cur); else clearTimeout(timer);
  }
  if (slides.length > 1 && ctrl && tog) {
    ctrl.style.setProperty('--dur', DUR + 'ms');
    dots.forEach(function (b, k) { b.addEventListener('click', function () { show(k); }); });
    tog.addEventListener('click', function () { setPlaying(!playing); });
    document.addEventListener('visibilitychange', function () { document.hidden ? clearTimeout(timer) : schedule(); });
    setPlaying(playing);
  }

  /* ---------- Pointer spotlight on task tiles ---------- */
  $$('.task').forEach(function (t) { t.addEventListener('pointermove', function (e) { var r = t.getBoundingClientRect(); t.style.setProperty('--x', (e.clientX - r.left) + 'px'); t.style.setProperty('--y', (e.clientY - r.top) + 'px'); }); });

  /* ---------- Service explorer (home) ---------- */
  var tabs = $$('.svc-tab'), panels = $$('.svc'), fstatus = $('#filter-status');
  function select(tab, focus) {
    tabs.forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach(function (p) { p.classList.toggle('is-active', p.id === tab.getAttribute('aria-controls')); });
    if (focus) { tab.focus(); tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  if (tabs.length) {
    tabs.forEach(function (t) { t.addEventListener('click', function () { select(t); }); });
    $('.svc-tabs').addEventListener('keydown', function (e) {
      var vis = tabs.filter(function (t) { return !t.hidden; }), i = vis.indexOf(document.activeElement); if (i < 0) return;
      var k = e.key, n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = vis[(i + 1) % vis.length];
      else if (k === 'ArrowUp' || k === 'ArrowLeft') n = vis[(i - 1 + vis.length) % vis.length];
      else if (k === 'Home') n = vis[0]; else if (k === 'End') n = vis[vis.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
    var applyFilter = function (f, announce) {
      var count = 0;
      tabs.forEach(function (t) { t.hidden = !(f === 'all' || t.dataset.cat === f); });
      panels.forEach(function (p) { var sh = f === 'all' || p.dataset.cat === f; p.hidden = !sh; if (sh) count++; });
      $$('.filter[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.filter === f); });
      var c = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (!c || c.hidden) select(tabs.filter(function (t) { return !t.hidden; })[0]);
      if (announce && fstatus) fstatus.textContent = fstatus.dataset.tpl.replace('{n}', count);
    };
    $$('.filter[data-filter]').forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.dataset.filter, true); }); });
  }

  /* ---------- Department filter (departments page) ---------- */
  var dfs = $$('[data-dept-filter]');
  dfs.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.dataset.deptFilter;
      dfs.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $$('#dept-grid .dept-card').forEach(function (c) { c.hidden = !(f === 'all' || c.dataset.cat === f); });
    });
  });

  /* ---------- Visit guide dialog ---------- */
  var guide = $('#guide');
  if (guide) {
    var gtext = $('#guide-text'), gcall = $('#guide-call');
    var updateGuide = function () { var r = $('input[name=visit]:checked', guide); gtext.textContent = r.dataset.advice; gcall.classList.toggle('emergency', r.value === 'emergency'); };
    document.addEventListener('click', function (e) { if (e.target.closest('[data-open-guide]')) { updateGuide(); guide.showModal ? guide.showModal() : guide.setAttribute('open', ''); } });
    $$('input[name=visit]', guide).forEach(function (r) { r.addEventListener('change', updateGuide); });
    $('#close-guide').addEventListener('click', function () { guide.close(); });
    guide.addEventListener('click', function (e) { if (e.target === guide) { var r = guide.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) guide.close(); } });
  }

  /* ---------- Count-ups and scroll reveals ---------- */
  function countUp(el) {
    var to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = null, dur = 1400;
    if (reduced) return;
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = pre + Math.round(to * e) + suf; if (p < 1) requestAnimationFrame(step); }
    el.textContent = pre + '0' + suf; requestAnimationFrame(step);
  }
  var reveals = $$('[data-reveal]');
  reveals.forEach(function (el) { var sib = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); }); var i = sib.indexOf(el); if (sib.length > 1) el.style.setProperty('--d', (i * 0.09) + 's'); });
  function enter(el) {
    el.classList.add('in');
    if (el.classList.contains('steps')) setTimeout(function () { el.classList.add('go'); }, reduced ? 0 : 250);
    var c = el.querySelector('[data-count]'); if (c) countUp(c);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { enter(x.target); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(enter);

  /* ---------- Smooth FAQ open/close ---------- */
  $$('#faqitems details').forEach(function (det) {
    var sum = det.querySelector('summary'), body = det.querySelector('p'), anim = null;
    sum.addEventListener('click', function (e) {
      if (reduced || !body.animate) return;
      e.preventDefault(); if (anim) anim.cancel();
      body.style.overflow = 'hidden';
      if (!det.open) { det.open = true; anim = body.animate([{ height: '0px', opacity: 0 }, { height: body.offsetHeight + 'px', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
      else { anim = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'ease-in' }); anim.addEventListener('finish', function () { det.open = false; }); }
      anim.addEventListener('finish', function () { body.style.overflow = ''; anim = null; });
    });
  });

  /* ---------- Interactive map (loads Google Maps only when asked) ---------- */
  $$('[data-map]').forEach(function (box) {
    var btn = $('.map-load', box); if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.dataset.map; f.title = R.lang === 'hi' ? 'अस्पताल का नक्शा' : 'Map showing the hospital';
      f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.className = 'map-frame'; f.setAttribute('allowfullscreen', '');
      box.classList.add('map-on'); box.insertBefore(f, box.firstChild); btn.remove();
    });
  });

  /* ---------- Availability badges on doctor cards and profile ---------- */
  if ($('[data-avail]') || $('[data-next-slot]') || $('[data-week]')) {
    U.loadData(function (D) {
      var by = {}; D.doctors.forEach(function (x) { by[x.slug] = x; });
      $$('.doc-card').forEach(function (card) {
        var slug = (card.querySelector('.doc-link').getAttribute('href').match(/doctors\/([^/]+)\//) || [])[1];
        var badge = $('[data-avail]', card), doc = by[slug]; if (!badge || !doc) return;
        var n = U.nextSlot(doc); if (!n) return;
        badge.classList.add('on');
        if (n.key === U.todayKey()) { badge.textContent = S.availToday; badge.classList.add('today'); }
        else badge.textContent = S.nextAvail + ': ' + U.whenLabel(n.key);
      });
      var ns = $('[data-next-slot]');
      if (ns) { var n2 = U.nextSlot(by[ns.dataset.doctor]); if (n2) { ns.hidden = false; ns.innerHTML = '<b>' + U.esc(S.nextAvail) + ':</b> ' + U.esc(U.whenLabel(n2.key) + ', ' + U.fmtTime(n2.mins)); } }
      var wk = $('[data-week]');
      if (wk) { var tr = $('tr[data-day="' + U.weekday(U.todayKey()) + '"]', wk); if (tr) tr.classList.add('today'); }
    });
  }

  /* ---------- Enquiry form → WhatsApp (contact) ---------- */
  var eq = $('#enquiry-form');
  if (eq) {
    eq.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#eq-name').value.trim(), msg = $('#eq-msg').value.trim(), ok = true;
      [['eq-name', name.length >= 2, S.errName], ['eq-msg', msg.length >= 3, S.errStep]].forEach(function (c) {
        var er = $('[data-err-for="' + c[0] + '"]'), inp = $('#' + c[0]);
        er.hidden = c[1]; er.textContent = c[1] ? '' : c[2]; inp.setAttribute('aria-invalid', !c[1]); if (!c[1]) ok = false;
      });
      if (!ok) { $('[aria-invalid="true"]', eq).focus(); return; }
      var txt = S.waEnquiry + '\n\n' + name + '\n' + $('#eq-topic').value + '\n\n' + msg;
      U.loadData(function (D) { window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); });
    });
  }

  /* ---------- Site search ---------- */
  var sd = $('#search'), si = $('#search-input'), sr = $('#search-results'), sopen = $('#search-open'), index = null, active = -1;
  function norm(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); }
  var synonyms = { ultrasound: 'usg radiology sonography', sonography: 'usg ultrasound', usg: 'ultrasound', echo: '2d echo cardiology', blood: 'cbc blood', sugar: 'diabetes blood sugar hba1c', 'अल्ट्रासाउंड': 'usg ultrasound radiology', 'जाँच': 'test', bp: 'blood pressure hypertension cardiology', heart: 'cardiology echo ecg', child: 'paediatrics children', kids: 'paediatrics', baby: 'nicu neonatology paediatrics', pregnancy: 'obstetrics gynaecology usg pregnancy', bone: 'orthopaedics fracture x-ray', xray: 'x-ray', scan: 'ultrasound x-ray usg', women: 'gynaecology women', thyroid: 'thyroid tsh', fever: 'general medicine', skin: 'general medicine', 'शुगर': 'diabetes डायबिटीज़', 'बच्चा': 'paediatrics बाल', 'दिल': 'cardiology हृदय', 'हड्डी': 'orthopaedics हड्डी' };
  function buildIndex(D) {
    var L = U.L, base = R.base, out = [];
    D.doctors.forEach(function (x) { var dep = D.departments.filter(function (y) { return y.slug === x.dept; })[0]; out.push({ g: 'grpDoctors', t: L(x.name), s: L(dep.name) + ' · ' + x.qual, h: base + 'doctors/' + x.slug + '/', k: norm(x.name.en + ' ' + x.name.hi + ' ' + dep.name.en + ' ' + dep.name.hi + ' ' + x.qual), ico: 'user' }); });
    D.departments.forEach(function (x) { out.push({ g: 'grpDepts', t: L(x.name), s: L(x.short), h: base + 'departments/' + x.slug + '/', k: norm(x.name.en + ' ' + x.name.hi + ' ' + x.short.en), ico: x.icon }); });
    D.packages.forEach(function (x) { out.push({ g: 'grpPackages', t: L(x.name), s: U.rupee(x.price) + ' · ' + x.tests.length, h: base + 'health-checkups/#pkg-' + x.id, k: norm(x.name.en + ' ' + x.name.hi + ' ' + x.tests.join(' ') + ' checkup package'), ico: 'shield' }); });
    D.tests.tests.forEach(function (x) { var c = D.tests.categories.filter(function (y) { return y.id === x.cat; })[0]; out.push({ g: 'grpTests', t: x.name, s: U.rupee(x.price) + ' · ' + L(c.name), h: base + 'lab-tests/?q=' + encodeURIComponent(x.name), k: norm(x.name + ' ' + c.name.en + ' ' + c.name.hi + ' test'), ico: 'flask' }); });
    D.pages.forEach(function (x) { out.push({ g: 'grpPages', t: L(x.name), s: '', h: base + x.path, k: norm(x.name.en + ' ' + x.name.hi), ico: 'arrow' }); });
    return out;
  }
  function runSearch() {
    if (!index) return;
    var q = norm(si.value.trim()); active = -1;
    if (!q) { sr.innerHTML = ''; return; }
    var terms = q.split(/\s+/).map(function (t) { return (synonyms[t] ? t + ' ' + synonyms[t] : t); });
    var hits = index.map(function (it) {
      var score = 0;
      terms.forEach(function (t) { var alts = t.split(' '), best = 0; alts.forEach(function (a, ai) { var i = it.k.indexOf(a); if (i >= 0) best = Math.max(best, (i === 0 ? 3 : (it.k.charAt(i - 1) === ' ' ? 2 : 1)) * (ai === 0 ? 1 : 0.6)); }); score = best ? score + best : -99; });
      return { it: it, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 12);
    if (!hits.length) { sr.innerHTML = '<p class="sd-empty">' + U.esc(S.noResults) + '</p>'; return; }
    var groups = {}, order = [];
    hits.forEach(function (h) { if (!groups[h.it.g]) { groups[h.it.g] = []; order.push(h.it.g); } groups[h.it.g].push(h.it); });
    var html = '<p class="sr-only" role="status">' + U.esc(U.fmt('results', { n: hits.length })) + '</p>', n = 0;
    order.forEach(function (g) {
      html += '<div class="sd-group"><p class="sd-g">' + U.esc(S[g]) + '</p>';
      groups[g].forEach(function (it) { html += '<a class="sd-item" role="option" id="sr-' + (n++) + '" href="' + U.esc(it.h) + '"><svg class="i" aria-hidden="true"><use href="#i-' + it.ico + '"/></svg><span><b>' + U.esc(it.t) + '</b>' + (it.s ? '<small>' + U.esc(it.s) + '</small>' : '') + '</span></a>'; });
      html += '</div>';
    });
    sr.innerHTML = html;
  }
  function openSearch() {
    if (!sd) return;
    sd.showModal ? sd.showModal() : sd.setAttribute('open', ''); si.value = ''; sr.innerHTML = ''; si.focus();
    if (!index) U.loadData(function (D) { index = buildIndex(D); runSearch(); });
  }
  if (sd) {
    sopen.addEventListener('click', openSearch);
    $('#search-close').addEventListener('click', function () { sd.close(); });
    sd.addEventListener('click', function (e) { if (e.target === sd) sd.close(); });
    si.addEventListener('input', runSearch);
    si.addEventListener('keydown', function (e) {
      var items = $$('.sd-item', sr); if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (x, i) { x.classList.toggle('on', i === active); }); si.setAttribute('aria-activedescendant', items[active].id); items[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); (items[active] || items[0]).click(); }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && !sd.open && tag !== 'input' && tag !== 'textarea' && tag !== 'select') { e.preventDefault(); openSearch(); }
    });
  }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
