class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = this.seed();
  }

  ymd(d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  parse(s) { var a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  fmt(n) {
    if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '';
    return String(Math.round(Number(n) * 100) / 100);
  }
  dayName(s) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][this.parse(s).getDay()]; }
  mon(i) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]; }
  monLong(i) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]; }
  nice(s) { var d = this.parse(s); return this.dayName(s) + ' ' + d.getDate() + ' ' + this.mon(d.getMonth()); }
  short(s) { var d = this.parse(s); return d.getDate() + ' ' + this.mon(d.getMonth()); }

  seed() {
    var palette = ["#9D174D", "#6D28D9", "#0E7490", "#B45309", "#15803D"];
    var exercises = {};
    var add = function (id, name, type, base, step) { exercises[id] = { id: id, name: name, type: type, base: base, step: step }; };
    add('cp', 'Chest press', 'weight', 20, 2.5);
    add('sp', 'Shoulder press', 'weight', 12, 1);
    add('idp', 'Incline dumbbell press', 'weight', 8, 1);
    add('tp', 'Tricep pushdown', 'weight', 15, 2.5);
    add('lr', 'Lateral raise', 'weight', 4, 0.5);
    add('cf', 'Cable fly', 'weight', 7.5, 1.25);
    add('pu', 'Press-ups', 'reps', 8, 1);
    add('tm', 'Treadmill walk', 'time', 15, 1.5);
    add('lp', 'Lat pulldown', 'weight', 30, 2.5);
    add('sr', 'Seated row', 'weight', 30, 2.5);
    add('bc', 'Bicep curl', 'weight', 6, 1);
    add('fp', 'Face pull', 'weight', 12.5, 1.25);
    add('hc', 'Hammer curl', 'weight', 6, 1);
    add('rf', 'Reverse fly', 'weight', 4, 0.5);
    add('apu', 'Assisted pull-up', 'weight', 30, 2.5);
    add('pl', 'Plank', 'time', 0.75, 0.25);
    add('lpr', 'Leg press', 'weight', 60, 5);
    add('gs', 'Goblet squat', 'weight', 12, 2);
    add('lc', 'Leg curl', 'weight', 25, 2.5);
    add('le', 'Leg extension', 'weight', 25, 2.5);
    add('ht', 'Hip thrust', 'weight', 30, 5);
    add('cr', 'Calf raise', 'weight', 40, 5);
    add('gb', 'Glute bridge', 'reps', 12, 2);
    add('row', 'Rowing machine', 'distance', 1.5, 0.2);
    var sessions = [
      { id: 'push', name: 'Push', color: palette[0], exIds: ['cp', 'sp', 'idp', 'tp', 'lr', 'cf', 'pu', 'tm'] },
      { id: 'upper', name: 'Upper body', color: palette[1], exIds: ['lp', 'sr', 'bc', 'fp', 'hc', 'rf', 'apu', 'pl'] },
      { id: 'legs', name: 'Legs', color: palette[2], exIds: ['lpr', 'gs', 'lc', 'le', 'ht', 'cr', 'gb', 'row'] }
    ];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var history = [];
    var count = {};
    var r = 11;
    var rnd = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (var back = 84; back >= 1; back--) {
      var d = new Date(today); d.setDate(d.getDate() - back);
      var dow = d.getDay();
      var sid = dow === 1 ? 'push' : dow === 3 ? 'upper' : dow === 5 ? 'legs' : null;
      if (!sid) continue;
      if (rnd() < 0.15) continue;
      var s = sessions.filter(function (x) { return x.id === sid; })[0];
      var entries = s.exIds.map(function (id) {
        var e = exercises[id];
        var k = count[id] = (count[id] || 0) + 1;
        var lvl = Math.floor((k - 1) / 3);
        if (e.type === 'weight') {
          var w = e.base + e.step * lvl;
          var reps = [10, rnd() < 0.7 ? 10 : 9, rnd() < 0.5 ? 8 : 9];
          return { exId: id, sets: reps.map(function (b) { return { a: w, b: b }; }) };
        }
        if (e.type === 'reps') {
          var b = e.base + lvl;
          return { exId: id, sets: [b, b, Math.max(1, b - 2)].map(function (x) { return { a: '', b: x }; }) };
        }
        return { exId: id, sets: [{ a: Math.round((e.base + e.step * lvl) * 100) / 100, b: '' }] };
      });
      history.push({ date: this.ymd(d), sessionId: sid, entries: entries });
    }
    var bodyLog = [];
    var kg = 73.4; var r2 = 5;
    for (var wk = 12; wk >= 0; wk--) {
      r2 = (r2 * 9301 + 49297) % 233280;
      var dd = new Date(today); dd.setDate(dd.getDate() - wk * 7 - 1);
      if (wk === 0) dd = new Date(today.getTime() - 2 * 86400000);
      kg = kg - 0.18 + (r2 / 233280 - 0.5) * 0.5;
      var ent = { date: this.ymd(dd), kg: Math.round(kg * 10) / 10 };
      if (wk % 4 === 0) {
        var f = (12 - wk) / 12;
        ent.bust = Math.round((96.5 - 1.5 * f) * 10) / 10; ent.waist = Math.round((82 - 3 * f) * 10) / 10;
        ent.hips = Math.round((104 - 2 * f) * 10) / 10; ent.thighs = Math.round((58.5 - 1.5 * f) * 10) / 10;
      }
      bodyLog.push(ent);
    }
    var best0 = {};
    for (var hi = 0; hi < history.length; hi++) {
      var pbs0 = [];
      history[hi].entries.forEach(function (en) {
        var t = this.topOf(exercises[en.exId].type, en.sets);
        if (best0[en.exId] !== undefined && t > best0[en.exId]) pbs0.push(en.exId);
        if (best0[en.exId] === undefined || t > best0[en.exId]) best0[en.exId] = t;
      }, this);
      history[hi].pbs = pbs0;
    }
    return {
      celebrate: null, calDir: 'next', calFlip: false, progFlip: false, typeFor: null,
      name: 'Jane', bwUnit: 'kg', lenUnit: 'cm', body: null, drag: null, weighOpen: false, weighA: '', weighB: '', weighSaved: false, bodyLog: bodyLog,
      palette: palette, exercises: exercises, sessions: sessions, history: history,
      screen: 'log', active: null, saved: null,
      calY: today.getFullYear(), calM: today.getMonth(), calSel: null,
      progEx: 'cp', progMetric: 'top',
      setSid: 'push', newEx: '', newExType: 'weight', newSession: '', backupNote: false
    };
  }

  ex(id) { return this.state.exercises[id]; }
  topOf(type, sets) {
    var v = sets.map(function (x) {
      if (type === 'reps') return Number(x.b) || 0;
      if (type === 'weight') return (Number(x.b) || 0) > 0 ? (Number(x.a) || 0) : 0;
      return Number(x.a) || 0;
    });
    return v.length ? Math.max.apply(null, v) : 0;
  }
  bestBefore(exId, date) {
    var e = this.ex(exId); var b = null; var self = this;
    this.state.history.forEach(function (h) {
      if (h.date >= date) return;
      var en = h.entries.filter(function (x) { return x.exId === exId; })[0];
      if (!en) return;
      var t = self.topOf(e.type, en.sets); if (b === null || t > b) b = t;
    });
    return b;
  }
  unitOf(type) { return { weight: 'kg', reps: ' reps', time: ' min', distance: ' km' }[type]; }
  weekStats(monday) {
    var self = this; var s0 = this.ymd(monday); var end = new Date(monday); end.setDate(end.getDate() + 7); var s1 = this.ymd(end);
    var recs = this.state.history.filter(function (h) { return h.date >= s0 && h.date < s1; });
    var pbs = 0, vol = 0;
    recs.forEach(function (h) {
      pbs += (h.pbs || []).length;
      h.entries.forEach(function (en) { var e = self.ex(en.exId); if (e && e.type === 'weight') en.sets.forEach(function (x) { vol += (Number(x.a) || 0) * (Number(x.b) || 0); }); });
    });
    return { workouts: recs.length, pbs: pbs, vol: Math.round(vol) };
  }
  setCal(dir) {
    var st = this.state; var m = st.calM + (dir === 'next' ? 1 : -1), y = st.calY;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    this.setState({ calM: m, calY: y, calDir: dir, calFlip: !st.calFlip });
  }
  kgText(kg, u) {
    if (kg === null || kg === undefined || kg === '') return '–';
    if ((u || this.state.bwUnit) === 'kg') return this.fmt(Math.round(kg * 10) / 10) + ' kg';
    var tl = Math.round(kg / 0.45359237); return Math.floor(tl / 14) + ' st ' + (tl % 14) + ' lb';
  }
  kgDiff(d) {
    var sign = d > 0 ? 'Up ' : 'Down ';
    if (Math.abs(d) < 0.05) return 'No change';
    if (this.state.bwUnit === 'kg') return sign + this.fmt(Math.round(Math.abs(d) * 10) / 10) + ' kg';
    var lb = Math.round(Math.abs(d) / 0.45359237);
    return sign + (lb >= 14 ? Math.floor(lb / 14) + ' st ' + (lb % 14) + ' lb' : lb + ' lb');
  }
  bodyFields() {
    return [
      { k: 'kg', name: 'Weight', kind: 'weight' }, { k: 'bust', name: 'Bust', kind: 'len' },
      { k: 'waist', name: 'Waist', kind: 'len' }, { k: 'hips', name: 'Hips', kind: 'len' }, { k: 'thighs', name: 'Thighs', kind: 'len' }
    ];
  }
  fieldName(k) { return this.bodyFields().filter(function (f) { return f.k === k; })[0].name; }
  lastBody(k, beforeDate) {
    var log = this.state.bodyLog;
    for (var i = log.length - 1; i >= 0; i--) { if (log[i][k] !== undefined && (!beforeDate || log[i].date < beforeDate)) return { date: log[i].date, v: log[i][k] }; }
    return null;
  }
  lenNum(cm) { return this.state.lenUnit === 'cm' ? Math.round(cm * 10) / 10 : Math.round(cm / 2.54 * 10) / 10; }
  valText(k, v) {
    if (v === undefined || v === null) return '–';
    if (k === 'kg') return this.kgText(v);
    return this.fmt(this.lenNum(v)) + (this.state.lenUnit === 'cm' ? ' cm' : ' in');
  }
  diffText(k, d) {
    if (k === 'kg') return this.kgDiff(d);
    var n = this.lenNum(Math.abs(d)); if (n < 0.05) return 'No change';
    return (d > 0 ? 'Up ' : 'Down ') + this.fmt(n) + (this.state.lenUnit === 'cm' ? ' cm' : ' in');
  }
  startBody() { this.setState({ body: { kgA: '', kgB: '', bust: '', waist: '', hips: '', thighs: '' }, active: null, saved: null, weighSaved: false, screen: 'log', navDir: 'fwd' }); }
  setBody(k, v) { var b = Object.assign({}, this.state.body); b[k] = v; this.setState({ body: b }); }
  saveBody() {
    var st = this.state; var b = st.body; var ent = {};
    var a = parseFloat(b.kgA), c = parseFloat(b.kgB);
    if (st.bwUnit === 'kg') { if (!isNaN(a)) ent.kg = Math.round(a * 10) / 10; }
    else if (!isNaN(a) || !isNaN(c)) ent.kg = Math.round(((isNaN(a) ? 0 : a) * 6.35029318 + (isNaN(c) ? 0 : c) * 0.45359237) * 10) / 10;
    ['bust', 'waist', 'hips', 'thighs'].forEach(function (k) {
      var v = parseFloat(b[k]); if (!isNaN(v)) ent[k] = Math.round((st.lenUnit === 'cm' ? v : v * 2.54) * 10) / 10;
    });
    var n = Object.keys(ent).length;
    if (!n) { this.setState({ body: null }); return; }
    var date = this.ymd(new Date());
    var log = st.bodyLog.slice(); var found = false;
    log = log.map(function (x) { if (x.date === date) { found = true; return Object.assign({}, x, ent); } return x; });
    if (!found) log.push(Object.assign({ date: date }, ent));
    log.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    this.setState({ bodyLog: log, body: null, weighSaved: true, bodyCount: n, calSel: date, navDir: 'back' });
  }
  dragStart(idx, ev) {
    var row = ev.currentTarget && ev.currentTarget.closest ? ev.currentTarget.closest('.ex-row') : null;
    var h = row ? row.offsetHeight + 12 : 120;
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
    this.setState({ drag: { idx: idx, startY: ev.clientY, dy: 0, h: h } });
  }
  dragMove(ev) {
    var d = this.state.drag; if (!d) return;
    if (ev.preventDefault) ev.preventDefault();
    var sid = this.state.setSid; var s = this.sess(sid); var ids = s.exIds.slice();
    var dy = ev.clientY - d.startY; var idx = d.idx; var startY = d.startY;
    if (dy > d.h / 2 && idx < ids.length - 1) { var t = ids[idx]; ids[idx] = ids[idx + 1]; ids[idx + 1] = t; idx++; startY += d.h; dy -= d.h; }
    else if (dy < -d.h / 2 && idx > 0) { var t2 = ids[idx]; ids[idx] = ids[idx - 1]; ids[idx - 1] = t2; idx--; startY -= d.h; dy += d.h; }
    var sessions = this.state.sessions.map(function (x) { return x.id === sid ? Object.assign({}, x, { exIds: ids }) : x; });
    this.setState({ sessions: sessions, drag: { idx: idx, startY: startY, dy: dy, h: d.h } });
  }
  dragEnd() { if (this.state.drag) this.setState({ drag: null }); }
  bwSummary() {
    var log = this.state.bodyLog; if (!log.length) return { has: false, latest: '–', date: '', change: '', changeSince: '' };
    var last = log[log.length - 1];
    var cut = this.parse(last.date); cut.setDate(cut.getDate() - 28); var cutS = this.ymd(cut);
    var win = log.filter(function (x) { return x.date >= cutS; });
    return {
      has: true, latest: this.kgText(last.kg), date: this.nice(last.date),
      change: win.length > 1 ? this.kgDiff(last.kg - win[0].kg) + ' in 4 weeks' : 'First weigh-in logged',
      changeSince: log.length > 1 ? this.kgDiff(last.kg - log[0].kg) + ' since ' + this.short(log[0].date) : '',
      down: log.length > 1 && last.kg < log[0].kg
    };
  }
  openWeigh() { this.setState({ weighOpen: true, weighA: '', weighB: '' }); }
  saveWeigh() {
    var st = this.state; var kg;
    var a = parseFloat(st.weighA), b = parseFloat(st.weighB);
    var log = st.bodyLog; var last = log.length ? log[log.length - 1].kg : null;
    if (st.bwUnit === 'kg') kg = isNaN(a) ? last : a;
    else {
      if (isNaN(a) && isNaN(b)) kg = last;
      else kg = (isNaN(a) ? 0 : a) * 6.35029318 + (isNaN(b) ? 0 : b) * 0.45359237;
    }
    if (!kg) return;
    var date = this.ymd(new Date());
    var next = log.filter(function (x) { return x.date !== date; }).concat([{ date: date, kg: Math.round(kg * 10) / 10 }])
      .sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    this.setState({ bodyLog: next, weighOpen: false, weighSaved: true });
  }
  sess(id) { return this.state.sessions.filter(function (s) { return s.id === id; })[0]; }
  lastSets(exId) {
    var h = this.state.history;
    for (var i = h.length - 1; i >= 0; i--) {
      var e = h[i].entries.filter(function (x) { return x.exId === exId; })[0];
      if (e) return { date: h[i].date, sets: e.sets };
    }
    return null;
  }
  rowsFor(type) { return (type === 'time' || type === 'distance') ? 1 : 3; }
  units(type) {
    if (type === 'weight') return { a: 'kg', b: 'reps' };
    if (type === 'reps') return { a: '', b: 'reps' };
    if (type === 'time') return { a: 'min', b: '' };
    return { a: 'km', b: '' };
  }
  typeLabel(t) { return { weight: 'Weight & reps', reps: 'Reps only', time: 'Time', distance: 'Distance' }[t]; }
  setsText(type, sets) {
    var self = this;
    if (type === 'weight') {
      var ws = sets.map(function (s) { return self.fmt(s.a); });
      var same = ws.every(function (w) { return w === ws[0]; });
      if (same) return ws[0] + 'kg × ' + sets.map(function (s) { return self.fmt(s.b); }).join(', ');
      return sets.map(function (s) { return self.fmt(s.a) + 'kg×' + self.fmt(s.b); }).join(', ');
    }
    if (type === 'reps') return sets.map(function (s) { return self.fmt(s.b); }).join(', ') + ' reps';
    if (type === 'time') return this.fmt(sets[0].a) + ' min';
    return this.fmt(sets[0].a) + ' km';
  }

  go(screen) {
    var order = ['log', 'cal', 'progress', 'settings'];
    var dir = order.indexOf(screen) >= order.indexOf(this.state.screen) ? 'fwd' : 'back';
    this.setState({ screen: screen, navDir: dir, saved: screen === 'log' ? this.state.saved : null });
  }
  isFilled(type, s) {
    if (type === 'weight') return s.a !== '' && s.b !== '';
    if (type === 'reps') return s.b !== '';
    return s.a !== '';
  }

  blankEntry(id) {
    var e = this.ex(id); var n = this.rowsFor(e.type); var sets = [];
    for (var i = 0; i < n; i++) sets.push({ a: '', b: '', done: false });
    return { exId: id, sets: sets };
  }
  start(sid) {
    var self = this; var s = this.sess(sid);
    var entries = s.exIds.map(function (id) { return self.blankEntry(id); });
    this.setState({ active: { sessionId: sid, entries: entries, focus: 0, swapIdx: null }, saved: null, weighSaved: false, screen: 'log', navDir: 'fwd' });
  }
  updActive(fn) { var a = JSON.parse(JSON.stringify(this.state.active)); fn(a); this.setState({ active: a }); }
  setField(i, j, k, v) { this.updActive(function (a) { a.entries[i].sets[j][k] = v; }); }
  ph(i, j, k) {
    var en = this.state.active.entries[i]; var last = this.lastSets(en.exId);
    if (!last) return '';
    var s = last.sets[j] || last.sets[last.sets.length - 1];
    return s ? this.fmt(s[k]) : '';
  }
  toggleDone(i, j) {
    var phA = this.ph(i, j, 'a'), phB = this.ph(i, j, 'b');
    this.updActive(function (a) {
      var s = a.entries[i].sets[j];
      if (!s.done) { if (s.a === '') s.a = phA; if (s.b === '') s.b = phB; s.done = true; }
      else s.done = false;
    });
  }
  step(i, j, k, delta) {
    var cur = this.state.active.entries[i].sets[j][k];
    var base = cur !== '' ? Number(cur) : Number(this.ph(i, j, k) || 0);
    if (isNaN(base)) base = 0;
    var nv = Math.max(0, Math.round((base + delta) * 100) / 100);
    this.setField(i, j, k, String(nv));
  }
  finish() {
    var self = this; var a = this.state.active; var entries = [];
    a.entries.forEach(function (en, i) {
      var sets = en.sets.map(function (s, j) {
        var va = s.a !== '' ? s.a : self.ph(i, j, 'a');
        var vb = s.b !== '' ? s.b : self.ph(i, j, 'b');
        return { a: va === '' ? '' : Number(va), b: vb === '' ? '' : Number(vb) };
      });
      var any = sets.some(function (s) { return s.a !== '' || s.b !== ''; });
      if (any) entries.push({ exId: en.exId, sets: sets });
    });
    var date = this.ymd(new Date());
    var pbs = [], pbItems = [];
    entries.forEach(function (en) {
      var e = self.ex(en.exId); var t = self.topOf(e.type, en.sets); var b = self.bestBefore(en.exId, date);
      if (b !== null && t > b) {
        pbs.push(en.exId);
        pbItems.push({ name: e.name, now: self.fmt(t) + self.unitOf(e.type), was: 'was ' + self.fmt(b) + self.unitOf(e.type) });
      }
    });
    var history = this.state.history.filter(function (h) { return !(h.date === date && h.sessionId === a.sessionId); })
      .concat([{ date: date, sessionId: a.sessionId, entries: entries, pbs: pbs }])
      .sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
    this.setState({ history: history, active: null, calSel: date, navDir: 'back', saved: { name: this.sess(a.sessionId).name, count: entries.length },
      celebrate: pbItems.length ? { items: pbItems, title: pbItems.length === 1 ? 'New personal best!' : pbItems.length + ' new personal bests!' } : null });
  }
  cancel() { this.setState({ active: null, navDir: 'back' }); }
  openSwap(i) { this.updActive(function (a) { a.swapIdx = i; }); }
  closeSwap() { this.updActive(function (a) { a.swapIdx = null; }); }
  doSwap(id) { var nb = this.blankEntry(id); this.updActive(function (a) { a.entries[a.swapIdx] = nb; a.swapIdx = null; }); }
  skip(i) {
    this.updActive(function (a) {
      a.entries.splice(i, 1);
      if (a.focus >= a.entries.length) a.focus = Math.max(0, a.entries.length - 1);
    });
  }
  moveFocus(d) {
    this.updActive(function (a) { a.focus = Math.min(a.entries.length - 1, Math.max(0, a.focus + d)); });
  }
  jumpFocus(i) { this.updActive(function (a) { a.focus = i; }); }

  byDate() {
    var m = {};
    this.state.history.forEach(function (h) { (m[h.date] = m[h.date] || []).push(h); });
    return m;
  }
  colorFor(recs) {
    if (!recs || !recs.length) return 'transparent';
    var s = this.sess(recs[0].sessionId);
    return s ? s.color : '#888888';
  }
  calCells() {
    var self = this; var st = this.state;
    var first = new Date(st.calY, st.calM, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysIn = new Date(st.calY, st.calM + 1, 0).getDate();
    var total = Math.ceil((offset + daysIn) / 7) * 7;
    var todayS = this.ymd(new Date());
    var bd = this.byDate();
    var bodyDates = {}; st.bodyLog.forEach(function (x) { if (Object.keys(x).length > 1) bodyDates[x.date] = 1; });
    var cells = [];
    for (var i = 0; i < total; i++) {
      var d = new Date(st.calY, st.calM, 1 - offset + i);
      var s = this.ymd(d);
      var recs = bd[s] || [];
      var inMonth = d.getMonth() === st.calM;
      var cls = ['cal-cell'];
      if (recs.some(function (r) { return r.pbs && r.pbs.length; })) cls.push('haspb');
      if (!inMonth) cls.push('out');
      if (recs.length) cls.push('has');
      if (s === todayS) cls.push('today');
      if (s === st.calSel) cls.push('sel');
      if (bodyDates[s]) cls.push('hasbody');
      cells.push({
        key: s, day: d.getDate(), has: recs.length > 0, color: this.colorFor(recs), cls: cls.join(' '),
        label: this.nice(s) + (recs.length ? ', ' + recs.map(function (r) { var x = self.sess(r.sessionId); return x ? x.name : 'Workout'; }).join(', ') : ''),
        pick: (function (ds) { return function () { self.setState({ calSel: ds }); }; })(s)
      });
    }
    return cells;
  }
  recDetail(date) {
    var self = this; var recs = this.byDate()[date] || [];
    var be = this.state.bodyLog.filter(function (x) { return x.date === date; })[0];
    var bodyRec = be ? [{ name: 'Body check', color: '#F59E0B', isBody: true, items: this.bodyFields().filter(function (f) { return be[f.k] !== undefined; }).map(function (f) { return { name: f.name, text: self.valText(f.k, be[f.k]) }; }) }] : [];
    return bodyRec.concat(recs.map(function (r) {
      var s = self.sess(r.sessionId);
      return {
        name: s ? s.name : 'Workout', color: s ? s.color : '#888888',
        items: r.entries.map(function (en) {
          var e = self.ex(en.exId);
          return { name: e ? e.name : '?', text: e ? self.setsText(e.type, en.sets) : '', pb: (r.pbs || []).indexOf(en.exId) >= 0 };
        })
      };
    }));
  }
  heat() {
    var self = this; var bd = this.byDate();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7 * 11);
    var todayS = this.ymd(today); var cells = [];
    for (var i = 0; i < 84; i++) {
      var d = new Date(mon); d.setDate(mon.getDate() + i);
      var s = this.ymd(d); var recs = bd[s] || [];
      var cls = ['heat-cell'];
      if (recs.length) cls.push('has');
      if (s === todayS) cls.push('today');
      if (s > todayS) cls.push('future');
      if (s === this.state.calSel) cls.push('sel');
      cells.push({ key: s, color: recs.length ? this.colorFor(recs) : '#FFFDF8', cls: cls.join(' '), label: this.nice(s),
        pick: (function (ds) { return function () { self.setState({ calSel: ds }); }; })(s) });
    }
    return cells;
  }
  weeks() {
    var self = this; var bd = this.byDate();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var mon0 = new Date(today); mon0.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    var out = [];
    for (var w = 0; w < 8; w++) {
      var mon = new Date(mon0); mon.setDate(mon0.getDate() - 7 * w);
      var items = [];
      for (var k = 0; k < 7; k++) {
        var d = new Date(mon); d.setDate(mon.getDate() + k);
        var s = this.ymd(d);
        (bd[s] || []).forEach(function (r) {
          var x = self.sess(r.sessionId);
          items.push({ day: self.dayName(s), date: self.short(s), name: x ? x.name : 'Workout', color: x ? x.color : '#888888',
            pick: (function (ds) { return function () { self.setState({ calSel: self.state.calSel === ds ? null : ds }); }; })(s),
            open: self.state.calSel === s, detail: self.recDetail(s) });
        });
      }
      var label = w === 0 ? 'This week' : w === 1 ? 'Last week' : 'Week of ' + this.short(this.ymd(mon));
      out.push({ label: label, count: items.length, countText: items.length === 1 ? '1 workout' : items.length + ' workouts', items: items, empty: items.length === 0 });
    }
    return out;
  }

  series(exId) {
    var e = this.ex(exId); var out = [];
    if (!e) return out;
    this.state.history.forEach(function (h) {
      var en = h.entries.filter(function (x) { return x.exId === exId; })[0];
      if (!en) return;
      var as = en.sets.map(function (s) { return Number(s.a) || 0; });
      var bs = en.sets.map(function (s) { return Number(s.b) || 0; });
      var top = e.type === 'reps' ? Math.max.apply(null, bs) : Math.max.apply(null, as);
      var vol = e.type === 'weight' ? en.sets.reduce(function (t, s) { return t + (Number(s.a) || 0) * (Number(s.b) || 0); }, 0) : 0;
      out.push({ date: h.date, top: top, vol: vol });
    });
    return out;
  }
  chart(vals, dates, W, H) {
    var self = this;
    if (vals.length < 2) return { has: false, line: '', area: '', dots: '', grid: '', yMax: '', yMin: '', x0: '', x1: '' };
    var pl = 10, pr = 10, pt = 14, pb = 14;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mn === mx) { mn -= 1; mx += 1; }
    var span = mx - mn; var lo = mn - span * 0.15, hi = mx + span * 0.15;
    var X = function (i) { return pl + i * (W - pl - pr) / (vals.length - 1); };
    var Y = function (v) { return pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb); };
    var P = vals.map(function (v, i) { return [Math.round(X(i) * 10) / 10, Math.round(Y(v) * 10) / 10]; });
    var line = P.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    var area = 'M' + P[0][0] + ',' + H + ' L' + P.map(function (p) { return p[0] + ',' + p[1]; }).join(' L') + ' L' + P[P.length - 1][0] + ',' + H + ' Z';
    var rr = 3.5;
    var dots = P.map(function (p) { return 'M' + (p[0] - rr) + ',' + p[1] + ' a' + rr + ',' + rr + ' 0 1,0 ' + (2 * rr) + ',0 a' + rr + ',' + rr + ' 0 1,0 ' + (-2 * rr) + ',0'; }).join(' ');
    var grid = [0.25, 0.5, 0.75].map(function (f) { var y = Math.round((pt + f * (H - pt - pb)) * 10) / 10; return 'M0,' + y + ' L' + W + ',' + y; }).join(' ');
    return { has: true, line: line, area: area, dots: dots, grid: grid, yMax: this.fmt(mx), yMin: this.fmt(mn), x0: this.short(dates[0]), x1: this.short(dates[dates.length - 1]) };
  }
  progress(W, H) {
    var self = this; var id = this.state.progEx;
    if (id.indexOf('__') === 0) {
      var k = id.slice(2); var isW = k === 'kg';
      var log = this.state.bodyLog.filter(function (x) { return x[k] !== undefined; });
      var bu = this.state.bwUnit;
      var vals = log.map(function (x) { return isW ? (bu === 'kg' ? x[k] : Math.round(x[k] / 6.35029318 * 100) / 100) : self.lenNum(x[k]); });
      var ds = log.map(function (x) { return x.date; });
      var last = log[log.length - 1];
      var cut = last ? this.parse(last.date) : new Date(); cut.setDate(cut.getDate() - 28); var cutS = this.ymd(cut);
      var win = log.filter(function (x) { return x.date >= cutS; });
      var raw = log.map(function (x) { return x[k]; });
      var lo = raw.length ? Math.min.apply(null, raw) : 0, hi = raw.length ? Math.max.apply(null, raw) : 0;
      return {
        isBody: true, notBody: false, isWeight: isW, isLen: !isW, name: this.fieldName(k), unit: '', topLabel: this.fieldName(k), has: log.length >= 2,
        latest: last ? this.valText(k, last[k]) : '–', latestDate: last ? this.short(last.date) : '',
        sentence: log.length > 1 ? this.diffText(k, last[k] - log[0][k]) + ' since ' + this.short(log[0].date) + '.' : 'Measure this a couple of times to see a trend.',
        change4: win.length > 1 ? this.diffText(k, last[k] - win[0][k]) + ' in 4 weeks' : (log.length > 1 ? this.diffText(k, last[k] - log[log.length - 2][k]) + ' since last time' : ''),
        pb: '', pbDate: '', sessions: log.length,
        rangeText: log.length ? this.valText(k, lo) + ' – ' + this.valText(k, hi) : '', hasVol: false, volLatest: '',
        top: this.chart(vals, ds, W, H), vol: this.chart([], [], W, H),
        recent: log.slice(-5).reverse().map(function (x) { return { date: self.nice(x.date), text: self.valText(k, x[k]) }; })
      };
    }
    var e = this.ex(id);
    var ser = this.series(id);
    var unit = { weight: 'kg', reps: 'reps', time: 'min', distance: 'km' }[e ? e.type : 'weight'];
    var topLabel = { weight: 'Heaviest weight', reps: 'Most reps in a set', time: 'Longest time', distance: 'Furthest distance' }[e ? e.type : 'weight'];
    var tops = ser.map(function (p) { return p.top; });
    var vols = ser.map(function (p) { return p.vol; });
    var dates = ser.map(function (p) { return p.date; });
    var has = ser.length >= 2;
    var change = has ? tops[tops.length - 1] - tops[0] : 0;
    var pb = 0, pbDate = '';
    ser.forEach(function (p) { if (p.top >= pb) { pb = p.top; pbDate = p.date; } });
    var sentence = !has ? 'Log this a couple of times and your progress will show up here.'
      : change > 0 ? 'Up ' + this.fmt(change) + ' ' + unit + ' since ' + this.short(dates[0]) + '.'
      : change < 0 ? 'Down ' + this.fmt(-change) + ' ' + unit + ' since ' + this.short(dates[0]) + '.'
      : 'Holding steady since ' + this.short(dates[0]) + '.';
    var recent = ser.slice(-5).reverse().map(function (p) {
      var rec = self.state.history.filter(function (h) { return h.date === p.date; })[0];
      var en = rec ? rec.entries.filter(function (x) { return x.exId === id; })[0] : null;
      return { date: self.nice(p.date), text: en && e ? self.setsText(e.type, en.sets) : '' };
    });
    return {
      isBody: false, notBody: true, change4: '',
      rangeText: has ? this.fmt(Math.min.apply(null, tops)) + '–' + this.fmt(Math.max.apply(null, tops)) + ' ' + unit : '',
      name: e ? e.name : '', unit: unit, topLabel: topLabel, has: has,
      latest: tops.length ? this.fmt(tops[tops.length - 1]) : '–',
      sentence: sentence, up: change > 0,
      pb: this.fmt(pb), pbDate: pbDate ? this.short(pbDate) : '', sessions: ser.length,
      hasVol: e && e.type === 'weight',
      volLatest: vols.length ? Math.round(vols[vols.length - 1]).toLocaleString('en-GB') : '–',
      top: this.chart(tops, dates, W, H),
      vol: this.chart(vols, dates, W, H),
      recent: recent
    };
  }

  setType(id, t) {
    var ex = Object.assign({}, this.state.exercises);
    ex[id] = Object.assign({}, ex[id], { type: t });
    this.setState({ exercises: ex });
  }
  renameEx(id, name) {
    var ex = Object.assign({}, this.state.exercises);
    ex[id] = Object.assign({}, ex[id], { name: name });
    this.setState({ exercises: ex });
  }
  updSession(fn) {
    var sid = this.state.setSid;
    this.setState({ sessions: this.state.sessions.map(function (s) { if (s.id !== sid) return s; var c = JSON.parse(JSON.stringify(s)); fn(c); return c; }) });
  }
  removeEx(id) { this.updSession(function (s) { s.exIds = s.exIds.filter(function (x) { return x !== id; }); }); }
  moveEx(idx, d) {
    this.updSession(function (s) {
      var j = idx + d; if (j < 0 || j >= s.exIds.length) return;
      var t = s.exIds[idx]; s.exIds[idx] = s.exIds[j]; s.exIds[j] = t;
    });
  }
  addEx() {
    var name = this.state.newEx.trim(); if (!name) return;
    var id = 'x' + Date.now();
    var ex = Object.assign({}, this.state.exercises);
    ex[id] = { id: id, name: name, type: this.state.newExType, base: 0, step: 0 };
    this.setState({ exercises: ex, newEx: '' });
    this.updSession(function (s) { s.exIds.push(id); });
  }
  addSession() {
    var name = this.state.newSession.trim(); if (!name) return;
    var id = 's' + Date.now(); var pal = this.state.palette;
    var color = pal[this.state.sessions.length % pal.length];
    this.setState({ sessions: this.state.sessions.concat([{ id: id, name: name, color: color, exIds: [] }]), setSid: id, newSession: '' });
  }
  removeSession() {
    if (this.state.sessions.length <= 1) return;
    var sid = this.state.setSid;
    var rest = this.state.sessions.filter(function (s) { return s.id !== sid; });
    this.setState({ sessions: rest, setSid: rest[0].id });
  }

  renderVals() {
    var self = this; var st = this.state; var act = st.active;
    var today = new Date();
    var hr = today.getHours();
    var hello = (hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening') + ', ' + (st.name || 'there') + '!';
    var todayLabel = this.dayName(this.ymd(today)) + ' ' + today.getDate() + ' ' + this.monLong(today.getMonth());

    var pickList = st.sessions.map(function (s) {
      var last = null;
      for (var i = st.history.length - 1; i >= 0; i--) { if (st.history[i].sessionId === s.id) { last = st.history[i]; break; } }
      return {
        id: s.id, name: s.name, color: s.color,
        count: s.exIds.length + (s.exIds.length === 1 ? ' exercise' : ' exercises'),
        last: last ? 'Last done ' + self.nice(last.date) : 'Not done yet',
        start: function () { self.start(s.id); }
      };
    });

    var cards = [];
    if (act) {
      cards = act.entries.map(function (en, i) {
        var e = self.ex(en.exId); var u = self.units(e.type); var last = self.lastSets(en.exId);
        var cols = (u.a && u.b) ? '44px 1fr 1fr 52px' : '44px 1fr 52px';
        var stepA = u.a === 'kg' ? 2.5 : u.a === 'min' ? 1 : 0.1;
        var sets = en.sets.map(function (s, j) {
          var phA = self.ph(i, j, 'a'), phB = self.ph(i, j, 'b');
          var lastText = !phA && !phB ? '–' : e.type === 'weight' ? phA + '×' + phB : e.type === 'reps' ? phB : e.type === 'time' ? phA + 'm' : phA + 'km';
          return {
            hasA: !!u.a, hasB: !!u.b, unitA: u.a, unitB: u.b, lastText: lastText,
            isFirstRow: j === 0, bsetCls: s.done ? 'bset done' : 'bset',
            colsWide: (u.a && u.b) ? '34px 70px 1fr 1fr 48px' : '34px 70px 1fr 48px',
            n: j + 1, a: s.a, b: s.b, phA: phA || (u.a ? u.a : ''), phB: phB || 'reps', lastA: phA || '–', lastB: phB || '–', done: s.done, notDone: !s.done,
            rowCls: s.done ? 'set done' : 'set', tickCls: s.done ? 'tick on' : 'tick', cols: cols,
            setA: function (ev) { self.setField(i, j, 'a', ev.target.value); },
            setB: function (ev) { self.setField(i, j, 'b', ev.target.value); },
            tick: function () { self.toggleDone(i, j); },
            aUp: function () { self.step(i, j, 'a', stepA); }, aDown: function () { self.step(i, j, 'a', -stepA); },
            bUp: function () { self.step(i, j, 'b', 1); }, bDown: function () { self.step(i, j, 'b', -1); }
          };
        });
        var doneN = en.sets.filter(function (s) { return self.isFilled(e.type, s); }).length;
        var typedTop = self.topOf(e.type, en.sets.map(function (x) { return { a: x.a === '' ? 0 : x.a, b: x.b === '' ? (e.type === 'weight' && x.a !== '' ? 1 : 0) : x.b }; }));
        var bestSoFar = self.bestBefore(en.exId, self.ymd(new Date()));
        var livePB = bestSoFar !== null && typedTop > bestSoFar;
        sets.forEach(function (row, j) {
          var f = self.isFilled(e.type, en.sets[j]);
          row.rowCls = f ? 'set filled' : 'set';
          row.colsLine = (u.a && u.b) ? '40px 1fr 1fr' : '40px 1fr';
          row.colsCol = (u.a && u.b) ? '32px 68px 1fr 1fr' : '32px 68px 1fr';
        });
        return {
          i: i, num: i + 1, name: e.name, type: e.type, typeLabel: self.typeLabel(e.type),
          hasA: !!u.a, hasB: !!u.b, both: !!(u.a && u.b), unitA: u.a, unitB: u.b, cols: cols,
          colsLine: (u.a && u.b) ? '40px 1fr 1fr' : '40px 1fr', colsCol: (u.a && u.b) ? '32px 68px 1fr 1fr' : '32px 68px 1fr',
          last: last ? self.setsText(e.type, last.sets) : 'First time, no history yet',
          lastDate: last ? self.short(last.date) : '', hasLast: !!last,
          sets: sets, doneText: doneN + ' of ' + en.sets.length + ' sets', allDone: doneN === en.sets.length,
          cardCls: (doneN === en.sets.length ? 'card complete' : 'card') + (livePB ? ' is-pb' : ''),
          livePB: livePB, bestText: bestSoFar !== null ? 'Best: ' + self.fmt(bestSoFar) + self.unitOf(e.type) : '',
          swap: function () { self.openSwap(i); }, skip: function () { self.skip(i); },
          pipCls: (i === act.focus ? 'pip cur' : 'pip') + (doneN === en.sets.length ? ' done' : ''),
          jump: function () { self.jumpFocus(i); }
        };
      });
    }
    var focusCard = act && cards.length ? cards[act.focus] : null;
    var completed = cards.filter(function (c) { return c.allDone; }).length;

    var swapping = !!(act && act.swapIdx !== null && act.swapIdx !== undefined);
    var swapOptions = [];
    if (swapping) {
      var inUse = act.entries.map(function (x) { return x.exId; });
      var homeOf = {};
      st.sessions.forEach(function (s) { s.exIds.forEach(function (id) { if (!homeOf[id]) homeOf[id] = s.name; }); });
      swapOptions = Object.keys(st.exercises).map(function (k) { return st.exercises[k]; })
        .filter(function (e) { return inUse.indexOf(e.id) < 0 && homeOf[e.id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .map(function (e) { return { name: e.name, from: homeOf[e.id], pick: function () { self.doSwap(e.id); } }; });
    }

    var calTitle = this.monLong(st.calM) + ' ' + st.calY;
    var sel = st.calSel;
    var selRecs = sel ? this.recDetail(sel) : [];
    var monthCount = st.history.filter(function (h) { var d = self.parse(h.date); return d.getMonth() === st.calM && d.getFullYear() === st.calY; }).length;

    var exPills = this.bodyFields().map(function (f) {
      var pid = '__' + f.k;
      return { id: pid, name: f.name, cls: st.progEx === pid ? 'pill on bw' : 'pill bw', pick: function () { if (st.progEx !== pid) self.setState({ progEx: pid, progFlip: !st.progFlip }); } };
    });
    var seen = {};
    st.sessions.forEach(function (s) {
      s.exIds.forEach(function (id) {
        if (seen[id]) return; seen[id] = 1;
        var e = st.exercises[id];
        exPills.push({ id: id, name: e.name, cls: id === st.progEx ? 'pill on' : 'pill', pick: function () { if (st.progEx !== id) self.setState({ progEx: id, progFlip: !st.progFlip }); } });
      });
    });

    var curSet = this.sess(st.setSid) || st.sessions[0];
    var setRows = curSet ? curSet.exIds.map(function (id, idx) {
      var e = st.exercises[id];
      return {
        name: e.name, type: e.type, typeLabel: self.typeLabel(e.type), idx: idx,
        rename: function (ev) { self.renameEx(id, ev.target.value); },
        setType: function (ev) { self.setType(id, ev.target.value); },
        openType: function () { self.setState({ typeFor: id }); },
        remove: function () { self.removeEx(id); },
        up: function () { self.moveEx(idx, -1); }, down: function () { self.moveEx(idx, 1); },
        grab: function (ev) { self.dragStart(idx, ev); },
        rowCls: st.drag && st.drag.idx === idx ? 'ex-row dragging' : 'ex-row',
        rowStyle: st.drag && st.drag.idx === idx ? 'transform: translateY(' + Math.round(st.drag.dy) + 'px)' : '',
        isFirst: idx === 0, isLast: idx === curSet.exIds.length - 1
      };
    }) : [];
    var setTabs = st.sessions.map(function (s) {
      return { name: s.name, color: s.color, cls: s.id === st.setSid ? 'stab on' : 'stab', pick: function () { self.setState({ setSid: s.id }); } };
    });

    var tab = function (id) { return st.screen === id ? 'tab on' : 'tab'; };
    var tabIdx = ['log', 'cal', 'progress', 'settings'].indexOf(st.screen);

    return {
      todayLabel: todayLabel,
      is: { log: st.screen === 'log', cal: st.screen === 'cal', progress: st.screen === 'progress', settings: st.screen === 'settings' },
      tabs: { log: tab('log'), cal: tab('cal'), progress: tab('progress'), settings: tab('settings') },
      tabPill: 'transform: translateX(' + (tabIdx * 100) + '%)',
      navCls: 'screen ' + (st.navDir || 'fwd'),
      colsLine: '40px 1fr 1fr', colsCol: '32px 68px 1fr 1fr',
      goLog: function () { self.go('log'); }, goCal: function () { self.go('cal'); },
      goProgress: function () { self.go('progress'); }, goSettings: function () { self.go('settings'); },

      noActive: !act && !st.body, hasActive: !!act, pickList: pickList,
      saved: { show: !!st.saved && !act, name: st.saved ? st.saved.name : '', count: st.saved ? st.saved.count : 0 },
      viewSaved: function () { self.setState({ screen: 'cal', calY: today.getFullYear(), calM: today.getMonth() }); },
      activeName: act ? (this.sess(act.sessionId) || { name: '' }).name : '',
      activeColor: act ? (this.sess(act.sessionId) || { color: '#888' }).color : '#888',
      activeDate: todayLabel,
      cards: cards, completedText: completed + ' of ' + cards.length + ' done',
      progressPct: cards.length ? Math.round(100 * completed / cards.length) + '%' : '0%',
      focus: focusCard, hasFocus: !!focusCard,
      focusPos: act && cards.length ? 'Exercise ' + (act.focus + 1) + ' of ' + cards.length : '',
      atFirst: !act || act.focus === 0, notFirst: !!act && act.focus > 0,
      atLast: !act || act.focus >= cards.length - 1, notLast: !!act && act.focus < cards.length - 1,
      prev: function () { self.moveFocus(-1); }, next: function () { self.moveFocus(1); },
      finish: function () { self.finish(); }, cancel: function () { self.cancel(); },
      swapping: swapping, swapOptions: swapOptions, closeSwap: function () { self.closeSwap(); },
      swapFor: swapping ? this.ex(act.entries[act.swapIdx].exId).name : '',

      calTitle: calTitle, cells: this.calCells(), heat: this.heat(), weeks: this.weeks(),
      monthCount: monthCount + (monthCount === 1 ? ' workout' : ' workouts'),
      prevMonth: function () { self.setCal('prev'); }, nextMonth: function () { self.setCal('next'); },
      calA: !st.calFlip, calB: !!st.calFlip, calAnim: 'cal-anim ' + (st.calDir || 'next'),
      legend: st.sessions.map(function (s) { return { name: s.name, color: s.color }; }),
      hasSel: !!sel, selTitle: sel ? this.nice(sel) : '', selRecs: selRecs, selEmpty: !!sel && selRecs.length === 0, selHas: selRecs.length > 0,
      clearSel: function () { self.setState({ calSel: null }); },

      progEx: st.progEx, barStyle: 'width: ' + (cards.length ? Math.round(100 * completed / cards.length) : 0) + '%',
      exPills: exPills, prog: this.progress(326, 150),
      metricTop: st.progMetric === 'top', metricVol: st.progMetric === 'vol',
      segTop: st.progMetric === 'top' ? 'seg on' : 'seg', segVol: st.progMetric === 'vol' ? 'seg on' : 'seg',
      pickTop: function () { self.setState({ progMetric: 'top' }); }, pickVol: function () { self.setState({ progMetric: 'vol' }); },
      progSelect: function (ev) { self.setState({ progEx: ev.target.value }); },
      progOptions: exPills.map(function (p, k) { return p; }),

      setTabs: setTabs, setRows: setRows, setName: curSet ? curSet.name : '', setEmpty: setRows.length === 0,
      renameSession: function (ev) { var v = ev.target.value; self.updSession(function (s) { s.name = v; }); },
      newEx: st.newEx, newExType: st.newExType, newSession: st.newSession,
      typeNewEx: function (ev) { self.setState({ newEx: ev.target.value }); },
      typeNewExType: function (ev) { self.setState({ newExType: ev.target.value }); },
      typeNewSession: function (ev) { self.setState({ newSession: ev.target.value }); },
      addEx: function () { self.addEx(); }, addSession: function () { self.addSession(); },
      removeSession: function () { self.removeSession(); }, canRemoveSession: st.sessions.length > 1,
      dragMove: function (ev) { self.dragMove(ev); }, dragEnd: function () { self.dragEnd(); },
      inBody: !!st.body, startBody: function () { self.startBody(); }, cancelBody: function () { self.setState({ body: null, navDir: 'back' }); },
      saveBody: function () { self.saveBody(); }, bodySavedText: (st.bodyCount || 0) + (st.bodyCount === 1 ? ' measurement' : ' measurements'),
      lenCm: st.lenUnit === 'cm', segCm: st.lenUnit === 'cm' ? 'seg on' : 'seg', segIn: st.lenUnit === 'in' ? 'seg on' : 'seg',
      useCm: function () { self.setState({ lenUnit: 'cm' }); }, useIn: function () { self.setState({ lenUnit: 'in' }); },
      lenLabel: st.lenUnit,
      bodyLast: (function () { var l = null; st.bodyLog.forEach(function (x) { if (Object.keys(x).length > 1) l = x.date; }); return l ? 'Last check ' + self.nice(l) : 'Not done yet'; })(),
      bodyW: (function () {
        var last = self.lastBody('kg'); var b = st.body || {};
        var tl = last ? Math.round(last.v / 0.45359237) : null;
        return { last: last ? self.valText('kg', last.v) : 'Not measured yet', lastDate: last ? self.short(last.date) : '',
          a: b.kgA || '', b: b.kgB || '', phKg: last ? self.fmt(last.v) : 'kg', phSt: last ? String(Math.floor(tl / 14)) : 'st', phLb: last ? String(tl % 14) : 'lb',
          filled: !!(b.kgA || b.kgB), cls: (b.kgA || b.kgB) ? 'card complete' : 'card',
          setA: function (ev) { self.setBody('kgA', ev.target.value); }, setB: function (ev) { self.setBody('kgB', ev.target.value); } };
      })(),
      bodyLens: ['bust', 'waist', 'hips', 'thighs'].map(function (k) {
        var last = self.lastBody(k); var b = st.body || {};
        return { k: k, name: self.fieldName(k), last: last ? self.valText(k, last.v) : 'Not measured yet', lastDate: last ? self.short(last.date) : '',
          v: b[k] || '', ph: last ? self.fmt(self.lenNum(last.v)) : st.lenUnit, unit: st.lenUnit,
          cls: b[k] ? 'card complete' : 'card', set: function (ev) { self.setBody(k, ev.target.value); } };
      }),
      celebrating: !!st.celebrate && !act, celebrate: st.celebrate || { title: '', items: [] },
      closeCelebrate: function () { self.setState({ celebrate: null }); },
      confetti: (function () {
        var cols = ['#9D174D', '#F472B6', '#F59E0B', '#6D28D9', '#0E7490', '#FBCFE8'];
        var out = [];
        for (var q = 0; q < 28; q++) {
          var x = (q * 37) % 100, d = ((q * 53) % 70) / 100, dur = 1.6 + ((q * 29) % 10) / 10, w = 6 + (q % 3) * 3;
          out.push({ style: 'left: ' + x + '%; background: ' + cols[q % cols.length] + '; animation-delay: ' + d + 's; animation-duration: ' + dur + 's; width: ' + w + 'px; height: ' + (w * 1.6) + 'px' });
        }
        return out;
      })(),
      week: (function () {
        var t = new Date(); t.setHours(0, 0, 0, 0);
        var mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
        var last = new Date(mon); last.setDate(mon.getDate() - 7);
        var lw = self.weekStats(last), tw = self.weekStats(mon);
        var cheer = lw.workouts >= 3 ? 'Brilliant week, ' + st.name + '!' : lw.workouts > 0 ? 'Nice work, ' + st.name + '!' : 'Fresh week, fresh start, ' + st.name + '.';
        return { workouts: String(lw.workouts), pbs: String(lw.pbs), vol: lw.vol.toLocaleString('en-GB'), cheer: cheer,
          range: self.short(self.ymd(last)) + ' – ' + self.short(self.ymd(new Date(mon.getTime() - 86400000))),
          thisWeek: tw.workouts === 0 ? 'Nothing logged yet this week.' : 'This week so far: ' + tw.workouts + (tw.workouts === 1 ? ' workout' : ' workouts') + (tw.pbs ? ', ' + tw.pbs + (tw.pbs === 1 ? ' PB' : ' PBs') : '') + '.' };
      })(),
      progA: !st.progFlip, progB: !!st.progFlip,
      typePicking: !!st.typeFor, closeType: function () { self.setState({ typeFor: null }); },
      typeForName: st.typeFor && st.exercises[st.typeFor] ? st.exercises[st.typeFor].name : '',
      typeOpts: ['weight', 'reps', 'time', 'distance'].map(function (t) {
        var cur = st.typeFor ? (st.exercises[st.typeFor] || {}).type : null;
        return { t: t, cls: cur === t ? 'type-card on' : 'type-card', pick: function () { var id = st.typeFor; self.setType(id, t); self.setState({ typeFor: null }); } };
      }),
      typeO: (function () {
        var cur = st.typeFor ? (st.exercises[st.typeFor] || {}).type : null; var o = {};
        ['weight', 'reps', 'time', 'distance'].forEach(function (t) {
          o[t] = { cls: cur === t ? 'type-card on' : 'type-card', pick: function () { var id = st.typeFor; var ex = Object.assign({}, st.exercises); ex[id] = Object.assign({}, ex[id], { type: t }); self.setState({ exercises: ex, typeFor: null }); } };
        });
        return o;
      })(),
      newTypeCls: { weight: st.newExType === 'weight' ? 'type-card sm on' : 'type-card sm', reps: st.newExType === 'reps' ? 'type-card sm on' : 'type-card sm', time: st.newExType === 'time' ? 'type-card sm on' : 'type-card sm', distance: st.newExType === 'distance' ? 'type-card sm on' : 'type-card sm' },
      newTypeW: function () { self.setState({ newExType: 'weight' }); }, newTypeR: function () { self.setState({ newExType: 'reps' }); },
      newTypeT: function () { self.setState({ newExType: 'time' }); }, newTypeD: function () { self.setState({ newExType: 'distance' }); },
      hello: hello, name: st.name, initial: (st.name || '?').trim().charAt(0).toUpperCase() || '?', typeName: function (ev) { self.setState({ name: ev.target.value }); },
      bw: this.bwSummary(), openWeigh: function () { self.openWeigh(); }, weighOpen: st.weighOpen,
      closeWeigh: function () { self.setState({ weighOpen: false }); }, saveWeigh: function () { self.saveWeigh(); },
      isKg: st.bwUnit === 'kg', isSt: st.bwUnit === 'st',
      segKg: st.bwUnit === 'kg' ? 'seg on' : 'seg', segSt: st.bwUnit === 'st' ? 'seg on' : 'seg',
      useKg: function () { self.setState({ bwUnit: 'kg', weighA: '', weighB: '' }); },
      useSt: function () { self.setState({ bwUnit: 'st', weighA: '', weighB: '' }); },
      weighA: st.weighA, weighB: st.weighB,
      typeWeighA: function (ev) { self.setState({ weighA: ev.target.value }); },
      typeWeighB: function (ev) { self.setState({ weighB: ev.target.value }); },
      phKg: st.bodyLog.length ? self.fmt(st.bodyLog[st.bodyLog.length - 1].kg) : 'kg',
      phSt: st.bodyLog.length ? String(Math.floor(Math.round(st.bodyLog[st.bodyLog.length - 1].kg / 0.45359237) / 14)) : 'st',
      phLb: st.bodyLog.length ? String(Math.round(st.bodyLog[st.bodyLog.length - 1].kg / 0.45359237) % 14) : 'lb',
      weighSaved: st.weighSaved && !act, hideWeighSaved: function () { self.setState({ weighSaved: false }); },
      goBodyProgress: function () { self.setState({ progEx: '__bw', screen: 'progress', navDir: 'fwd', weighSaved: false }); },
      backupNote: st.backupNote, backup: function () { self.setState({ backupNote: true }); },
      hideBackup: function () { self.setState({ backupNote: false }); }
    };
  }
}
