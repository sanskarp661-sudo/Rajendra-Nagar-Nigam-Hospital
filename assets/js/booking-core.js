/* Shared booking helpers: review rows, WhatsApp text and calendar file for a saved request. */
window.RNHBooking = function (D) {
  'use strict';
  var U = window.RNHUtil, S = U.S, L = U.L, esc = U.esc, R = U.R;
  var DEPT = {}, TEST = {}, PKG = {}, DOC = {};
  D.departments.forEach(function (d) { DEPT[d.slug] = d; });
  D.tests.tests.forEach(function (t) { TEST[t.id] = t; });
  D.packages.forEach(function (p) { PKG[p.id] = p; });
  D.doctors.forEach(function (d) { DOC[d.slug] = d; });
  function serviceName(t) { return t === 'consultation' ? S.consultation : t === 'checkup' ? S.checkup : S.labtests; }
  function rows(r) {
    var out = [];
    if (r.ref) out.push([S.ref, r.ref]);
    out.push([R.lang === 'hi' ? 'सेवा' : 'Service', serviceName(r.type)]);
    if (r.type === 'consultation' && DOC[r.doctor]) { var doc = DOC[r.doctor]; out.push([S.doctor, L(doc.name)]); out.push([S.department, L(DEPT[doc.dept].name)]); out.push([S.fee, U.rupee(doc.fee)]); }
    if (r.type === 'checkup' && PKG[r.pkg]) { out.push([S.package, L(PKG[r.pkg].name)]); out.push([S.fee, U.rupee(PKG[r.pkg].price)]); }
    if (r.type === 'lab' && r.tests && r.tests.length) {
      var t = r.tests.filter(function (id) { return TEST[id]; });
      out.push([S.tests, t.map(function (id) { return TEST[id].name; }).join(', ')]);
      out.push([S.total, U.rupee(t.reduce(function (a, id) { return a + TEST[id].price; }, 0))]);
    }
    if (r.date && r.time != null) out.push([S.when, U.fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + U.fmtTime(r.time)]);
    if (r.name) out.push([S.patient, r.name + (r.age !== '' && r.age != null ? ', ' + r.age : '') + (r.gender ? ', ' + S[r.gender] : '')]);
    if (r.phone) out.push([S.phone, '+91 ' + r.phone]);
    if (r.visit) out.push([S.visitType, r.visit === 'returning' ? S.returning : S.newPatient]);
    if (r.notes) out.push([S.notes, r.notes]);
    return out;
  }
  function dl(list) { return list.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join(''); }
  function waText(rec, intro) { return (intro || S.waIntro) + '\n\n' + rows(rec).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n'); }
  function ics(rec) {
    var p = rec.date.split('-'), dur = rec.type === 'checkup' ? 120 : 30;
    var start = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 0, rec.time - 330)), end = new Date(start.getTime() + dur * 60000);
    var f = function (dt) { return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var t = function (s) { return String(s).replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n'); };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rajendra NN Hospital//Booking//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + rec.ref + '@rajendra-nn-hospital', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(start), 'DTEND:' + f(end),
      'SUMMARY:' + t(S.calTitle + ' (' + rec.ref + ')'),
      'LOCATION:' + t('Rajendra N.N. Hospital, Ratu Road Chowk, Judge Colony, Ranchi, Jharkhand 834001'),
      'DESCRIPTION:' + t(rows(rec).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n')),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + t(S.calTitle), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function download(rec) {
    var blob = new Blob([ics(rec)], { type: 'text/calendar' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = rec.ref + '.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  return { rows: rows, dl: dl, waText: waText, ics: ics, download: download, serviceName: serviceName, DOC: DOC, PKG: PKG, TEST: TEST, DEPT: DEPT };
};
