/* Repbook – Jane's gym tracker.
   Plain JS, no build step. Logic ported from reference/mockup-logic.js.

   Data safety rules (see CLAUDE.md):
   - Defaults are only ever written into EMPTY storage (first-run welcome screen).
   - The data shape only changes through schemaVersion migrations (MIGRATIONS below).
   - Restore confirms first and keeps a pre-restore copy. */
'use strict';
(function () {

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  var SCHEMA_VERSION = 1;
  var APP_VERSION = '1.0.0';
  var PALETTE = ['#9D174D', '#6D28D9', '#0E7490', '#B45309', '#15803D'];
  var AMBER = '#F59E0B';
  var ORPHAN_COLOR = '#6E5162';
  var KG_PER_ST = 6.35029318, KG_PER_LB = 0.45359237, CM_PER_IN = 2.54;
  var NUDGE_DAYS = 14;
  var TAB_ORDER = ['log', 'cal', 'progress', 'settings'];
  var TYPES = ['weight', 'reps', 'time', 'distance'];
  var BODY_FIELDS = [
    { k: 'kg', name: 'Weight' }, { k: 'bust', name: 'Bust' }, { k: 'waist', name: 'Waist' },
    { k: 'hips', name: 'Hips' }, { k: 'thighs', name: 'Thighs' }
  ];
  var LEN_KEYS = ['bust', 'waist', 'hips', 'thighs'];

  /* ------------------------------------------------------------------ *
   * Icons
   * ------------------------------------------------------------------ */
  function svg(inner, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
  }
  var IC = {
    book: svg('<path d="M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1v13c-2-1-5-1-9 1-4-2-7-2-9-1z"/><path d="M12 6.5v13"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    swap: svg('<path d="M4 8h14l-3-3M20 16H6l3 3"/>'),
    skip: svg('<path d="M5 12h10M11 7l5 5-5 5M19 6v12"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    left: svg('<path d="M15 6l-6 6 6 6"/>'),
    right: svg('<path d="M9 6l6 6-6 6"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    grip: svg('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
    trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>'),
    scale: svg('<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0M12 10l1.5-2"/>'),
    tape: svg('<circle cx="10" cy="11" r="7"/><circle cx="10" cy="11" r="2"/><path d="M17 11v7h5"/>'),
    weight: svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
    reps: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
    time: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    distance: svg('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>'),
    star: svg('<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>', 'star'),
    shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>')
  };
  var TYPE_INFO = {
    weight: { label: 'Weight & reps', eg: 'e.g. 12.5kg × 10', icon: IC.weight },
    reps: { label: 'Reps only', eg: 'e.g. 12 press-ups', icon: IC.reps },
    time: { label: 'Time', eg: 'e.g. 20 minutes', icon: IC.time },
    distance: { label: 'Distance', eg: 'e.g. 2 km', icon: IC.distance }
  };

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  function todayYmd() { return ymd(new Date()); }
  function nice(s) { var d = parseYmd(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()]; }
  function short(s) { var d = parseYmd(s); return d.getDate() + ' ' + MONS[d.getMonth()]; }
  function addDays(d, n) { var t = new Date(d); t.setDate(t.getDate() + n); return t; }
  function mondayOf(d) { var t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; }
  /* Whole calendar days from a to b (DST-safe). */
  function daysBetween(a, b) {
    var x = new Date(a); x.setHours(0, 0, 0, 0);
    var y = new Date(b); y.setHours(0, 0, 0, 0);
    return Math.round((y - x) / 86400000);
  }

  /* Numbers: no trailing zeros (12.5, 30, 0.75) */
  function fmt(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '';
    return String(Math.round(Number(n) * 100) / 100);
  }
  /* Parse a typed box. Accepts "12,5" too. Blank/invalid -> null. */
  function num(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).trim().replace(',', '.');
    if (t === '') return null;
    var v = Number(t);
    return isFinite(v) && v >= 0 ? v : null;
  }
  function typed(s) { return s !== null && s !== undefined && String(s).trim() !== ''; }

  /* ------------------------------------------------------------------ *
   * Storage: one JSON document in IndexedDB, mirrored to localStorage.
   * Each copy carries savedAt; on load the newest valid copy wins.
   * ------------------------------------------------------------------ */
  var DB_NAME = 'repbook', STORE = 'kv';
  var LS_DOC = 'repbook:doc', LS_PRE = 'repbook:preRestoreBackup', LS_MIG = 'repbook:preMigrationBackup';

  var Store = {
    db: null,
    writing: false,
    pending: null,

    open: function () {
      var self = this;
      if (!('indexedDB' in window)) return Promise.resolve();
      return new Promise(function (res) {
        var done = false;
        var finish = function (db) { if (!done) { done = true; self.db = db || null; res(); } };
        try {
          var r = indexedDB.open(DB_NAME, 1);
          r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
          r.onsuccess = function () { finish(r.result); };
          r.onerror = function () { finish(null); };
          r.onblocked = function () { finish(null); };
          setTimeout(function () { finish(null); }, 4000);
        } catch (e) { finish(null); }
      });
    },
    idbGet: function (key) {
      var db = this.db;
      return new Promise(function (res, rej) {
        try {
          var tx = db.transaction(STORE, 'readonly');
          var rq = tx.objectStore(STORE).get(key);
          rq.onsuccess = function () { res(rq.result); };
          rq.onerror = function () { rej(rq.error); };
        } catch (e) { rej(e); }
      });
    },
    idbPut: function (key, val) {
      var db = this.db;
      return new Promise(function (res, rej) {
        try {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(val, key);
          tx.oncomplete = function () { res(); };
          tx.onerror = function () { rej(tx.error); };
          tx.onabort = function () { rej(tx.error); };
        } catch (e) { rej(e); }
      });
    },
    /* -> {status:'ok', doc} | {status:'empty'} | {status:'error', reason} */
    load: function () {
      var self = this;
      var idbFailed = false;
      var get = self.db ? self.idbGet('doc').catch(function () { idbFailed = true; return null; }) : Promise.resolve(null);
      return get.then(function (idbRec) {
        var lsRec = null, lsBroken = false;
        try {
          var s = localStorage.getItem(LS_DOC);
          if (s) lsRec = JSON.parse(s);
        } catch (e) { lsBroken = true; }
        var cands = [idbRec, lsRec].filter(function (r) { return r && typeof r.json === 'string'; })
          .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
        for (var i = 0; i < cands.length; i++) {
          try {
            var doc = JSON.parse(cands[i].json);
            if (doc && typeof doc === 'object') return { status: 'ok', doc: doc };
          } catch (e) { /* try the next copy */ }
        }
        // Something is stored but unreadable: never treat that as "empty".
        if (cands.length || idbFailed || lsBroken) return { status: 'error', reason: 'unreadable' };
        return { status: 'empty' };
      });
    },
    save: function (doc) {
      var rec = { savedAt: Date.now(), json: JSON.stringify(doc) };
      try { localStorage.setItem(LS_DOC, JSON.stringify(rec)); } catch (e) { /* quota: IndexedDB still has it */ }
      if (this.db) { this.pending = rec; this.flush(); }
    },
    flush: function () {
      var self = this;
      if (self.writing || !self.pending || !self.db) return;
      var rec = self.pending; self.pending = null; self.writing = true;
      self.idbPut('doc', rec).catch(function () {}).then(function () { self.writing = false; self.flush(); });
    },
    /* Extra safety copies (pre-restore / pre-migration). */
    keep: function (key, lsKey, doc) {
      var rec = { savedAt: Date.now(), json: JSON.stringify(doc) };
      try { localStorage.setItem(lsKey, JSON.stringify(rec)); } catch (e) { /* ignore */ }
      return this.db ? this.idbPut(key, rec).catch(function () {}) : Promise.resolve();
    }
  };

  /* ------------------------------------------------------------------ *
   * Schema + migrations
   * ------------------------------------------------------------------ */
  /* To change the data shape: bump SCHEMA_VERSION and add a step here,
     e.g. MIGRATIONS[1] = function (doc) { ...; doc.schemaVersion = 2; return doc; } */
  var MIGRATIONS = {};

  function migrate(doc) {
    if (typeof doc.schemaVersion !== 'number') doc.schemaVersion = 1;
    while (doc.schemaVersion < SCHEMA_VERSION) {
      var step = MIGRATIONS[doc.schemaVersion];
      if (!step) throw new Error('No migration from version ' + doc.schemaVersion);
      doc = step(doc);
    }
    return doc;
  }

  /* Fill in anything missing. Never replaces data that is there. */
  function normalise(doc) {
    if (!doc.profile || typeof doc.profile !== 'object') doc.profile = {};
    var p = doc.profile;
    if (typeof p.name !== 'string') p.name = 'Jane';
    if (p.bwUnit !== 'st') p.bwUnit = 'kg';
    if (p.lenUnit !== 'in') p.lenUnit = 'cm';
    if (!doc.exercises || typeof doc.exercises !== 'object' || Array.isArray(doc.exercises)) doc.exercises = {};
    if (!Array.isArray(doc.sessions)) doc.sessions = [];
    if (!Array.isArray(doc.workouts)) doc.workouts = [];
    if (!Array.isArray(doc.body)) doc.body = [];
    if (!('lastBackupAt' in doc)) doc.lastBackupAt = null;
    if (!('draft' in doc)) doc.draft = null;
    doc.sessions.forEach(function (s, i) {
      if (!Array.isArray(s.exIds)) s.exIds = [];
      if (!s.color) s.color = PALETTE[i % PALETTE.length];
    });
    if (doc.draft && (typeof doc.draft !== 'object' || !doc.draft.kind)) doc.draft = null;
    if (doc.draft && doc.draft.kind === 'workout') {
      if (!Array.isArray(doc.draft.entries)) doc.draft = null;
      else doc.draft.entries = doc.draft.entries.filter(function (en) { return en && doc.exercises[en.exId] && Array.isArray(en.sets); });
    }
    return doc;
  }

  function emptyDoc() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: { name: 'Jane', bwUnit: 'kg', lenUnit: 'cm' },
      exercises: {}, sessions: [], workouts: [], body: [],
      lastBackupAt: null, draft: null
    };
  }

  /* §9 example sessions – offered on first run only. */
  function exampleDoc() {
    var doc = emptyDoc();
    var defs = [
      ['Push', [['Chest press', 'weight'], ['Shoulder press', 'weight'], ['Incline dumbbell press', 'weight'], ['Tricep pushdown', 'weight'], ['Lateral raise', 'weight'], ['Cable fly', 'weight'], ['Press-ups', 'reps'], ['Treadmill walk', 'time']]],
      ['Upper body', [['Lat pulldown', 'weight'], ['Seated row', 'weight'], ['Bicep curl', 'weight'], ['Face pull', 'weight'], ['Hammer curl', 'weight'], ['Reverse fly', 'weight'], ['Assisted pull-up', 'weight'], ['Plank', 'time']]],
      ['Legs', [['Leg press', 'weight'], ['Goblet squat', 'weight'], ['Leg curl', 'weight'], ['Leg extension', 'weight'], ['Hip thrust', 'weight'], ['Calf raise', 'weight'], ['Glute bridge', 'reps'], ['Rowing machine', 'distance']]]
    ];
    defs.forEach(function (d, i) {
      var exIds = d[1].map(function (x) {
        var id = 'ex-' + x[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
        doc.exercises[id] = { id: id, name: x[0], type: x[1] };
        return id;
      });
      doc.sessions.push({ id: 's-' + d[0].toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: d[0], color: PALETTE[i % PALETTE.length], exIds: exIds });
    });
    return doc;
  }

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */
  var D = null; // Jane's document
  var now0 = new Date();
  var ui = {
    screen: 'log', navDir: null, tabHop: false,
    calY: now0.getFullYear(), calM: now0.getMonth(), calSel: null, calDir: null,
    progEx: null, progAnim: true,
    setSid: null, newExType: 'weight', addedSid: null,
    toast: null, nudgeHidden: false, overlay: null, celebrate: null,
    focusAfter: null, error: null
  };

  function save() { if (D) Store.save(D); }

  /* ------------------------------------------------------------------ *
   * Domain logic
   * ------------------------------------------------------------------ */
  function ex(id) { return D.exercises[id]; }
  function sess(id) { for (var i = 0; i < D.sessions.length; i++) if (D.sessions[i].id === id) return D.sessions[i]; return null; }
  function sessName(id) { var s = sess(id); return s ? s.name : 'Workout'; }
  function sessColor(id) { var s = sess(id); return s ? s.color : ORPHAN_COLOR; }
  function rowsFor(type) { return (type === 'time' || type === 'distance') ? 1 : 3; }
  function colsOf(type) {
    if (type === 'weight') return { a: 'kg', b: 'reps' };
    if (type === 'reps') return { a: null, b: 'reps' };
    if (type === 'time') return { a: 'min', b: null };
    return { a: 'km', b: null };
  }
  function unitOf(type) { return { weight: 'kg', reps: ' reps', time: ' min', distance: ' km' }[type] || ''; }
  function unitWord(type) { return { weight: 'kg', reps: 'reps', time: 'min', distance: 'km' }[type] || ''; }

  /* Top value of one workout's sets (§6). */
  function topOf(type, sets) {
    var v = sets.map(function (x) {
      var a = Number(x.a) || 0, b = Number(x.b) || 0;
      if (type === 'reps') return b;
      if (type === 'weight') return b > 0 ? a : 0;
      return a;
    });
    return v.length ? Math.max.apply(null, v) : 0;
  }
  function entryOf(w, exId) { for (var i = 0; i < w.entries.length; i++) if (w.entries[i].exId === exId) return w.entries[i]; return null; }

  /* Best top value from workouts strictly before `date`. null if never logged. */
  function bestBefore(exId, date) {
    var e = ex(exId); if (!e) return null;
    var best = null;
    D.workouts.forEach(function (w) {
      if (w.date >= date) return;
      var en = entryOf(w, exId); if (!en) return;
      var t = topOf(e.type, en.sets);
      if (best === null || t > best) best = t;
    });
    return best;
  }

  /* Most recent sets for an exercise. If she re-does a session the same day,
     this is what she saved earlier today, so blanks keep those values. */
  function lastSets(exId) {
    for (var i = D.workouts.length - 1; i >= 0; i--) {
      var en = entryOf(D.workouts[i], exId);
      if (en && en.sets.length) return { date: D.workouts[i].date, sets: en.sets };
    }
    return null;
  }
  function phSet(last, j) { if (!last) return null; return last.sets[j] || last.sets[last.sets.length - 1] || null; }
  function lastFor(exId) { return lastSets(exId); }

  function setsText(type, sets) {
    if (!sets || !sets.length) return '';
    if (type === 'weight') {
      var ws = sets.map(function (s) { return fmt(s.a); });
      var same = ws.every(function (w) { return w === ws[0]; });
      if (same) return ws[0] + 'kg × ' + sets.map(function (s) { return fmt(s.b) || '–'; }).join(', ');
      return sets.map(function (s) { return fmt(s.a) + 'kg×' + (fmt(s.b) || '–'); }).join(', ');
    }
    if (type === 'reps') return sets.map(function (s) { return fmt(s.b); }).join(', ') + ' reps';
    if (type === 'time') return fmt(sets[0].a) + ' min';
    return fmt(sets[0].a) + ' km';
  }

  function isFilled(type, s) {
    if (type === 'weight') return typed(s.a) && typed(s.b);
    if (type === 'reps') return typed(s.b);
    return typed(s.a);
  }

  /* What a set will be saved as: typed value, else last time's value. */
  function effectiveSet(type, s, ph) {
    var c = colsOf(type);
    var a = c.a ? (num(s.a) !== null ? num(s.a) : (ph && ph.a !== null && ph.a !== undefined && ph.a !== '' ? Number(ph.a) : null)) : null;
    var b = c.b ? (num(s.b) !== null ? num(s.b) : (ph && ph.b !== null && ph.b !== undefined && ph.b !== '' ? Number(ph.b) : null)) : null;
    return { a: a, b: b };
  }

  function weekStats(monday) {
    var s0 = ymd(monday), s1 = ymd(addDays(monday, 7));
    var recs = D.workouts.filter(function (w) { return w.date >= s0 && w.date < s1; });
    var pbs = 0, vol = 0;
    recs.forEach(function (w) {
      pbs += (w.pbs || []).length;
      w.entries.forEach(function (en) {
        var e = ex(en.exId);
        if (e && e.type === 'weight') en.sets.forEach(function (x) { vol += (Number(x.a) || 0) * (Number(x.b) || 0); });
      });
    });
    return { workouts: recs.length, pbs: pbs, vol: Math.round(vol) };
  }

  /* Body units */
  function bw() { return D.profile.bwUnit; }
  function lu() { return D.profile.lenUnit === 'in' ? 'in' : 'cm'; }
  function stLb(kg) { var tl = Math.round(kg / KG_PER_LB); return { st: Math.floor(tl / 14), lb: tl % 14 }; }
  function kgText(kg) {
    if (kg === null || kg === undefined) return '–';
    if (bw() === 'kg') return fmt(Math.round(kg * 10) / 10) + ' kg';
    var x = stLb(kg); return x.st + ' st ' + x.lb + ' lb';
  }
  function kgDiff(d) {
    if (Math.abs(d) < 0.05) return 'No change';
    var sign = d > 0 ? 'Up ' : 'Down ';
    if (bw() === 'kg') return sign + fmt(Math.round(Math.abs(d) * 10) / 10) + ' kg';
    var lb = Math.round(Math.abs(d) / KG_PER_LB);
    if (lb === 0) return 'No change';
    return sign + (lb >= 14 ? Math.floor(lb / 14) + ' st ' + (lb % 14) + ' lb' : lb + ' lb');
  }
  function lenNum(cm) { return lu() === 'cm' ? Math.round(cm * 10) / 10 : Math.round(cm / CM_PER_IN * 10) / 10; }
  function valText(k, v) {
    if (v === null || v === undefined) return '–';
    if (k === 'kg') return kgText(v);
    return fmt(lenNum(v)) + ' ' + lu();
  }
  function diffText(k, d) {
    if (k === 'kg') return kgDiff(d);
    var n = lenNum(Math.abs(d)); if (n < 0.05) return 'No change';
    return (d > 0 ? 'Up ' : 'Down ') + fmt(n) + ' ' + lu();
  }
  function fieldName(k) { for (var i = 0; i < BODY_FIELDS.length; i++) if (BODY_FIELDS[i].k === k) return BODY_FIELDS[i].name; return k; }
  function lastBody(k) {
    for (var i = D.body.length - 1; i >= 0; i--) if (D.body[i][k] !== undefined && D.body[i][k] !== null) return { date: D.body[i].date, v: D.body[i][k] };
    return null;
  }
  function isBodyCheck(entry) { return BODY_FIELDS.some(function (f) { return entry[f.k] !== undefined && entry[f.k] !== null; }); }

  function hasData() { return D.workouts.length > 0 || D.body.length > 0; }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */
  function render() {
    var main = $('#main');
    var keep = {};
    $$('[data-keep]', main).forEach(function (el) { keep[el.getAttribute('data-keep')] = el.scrollLeft; });

    var html;
    if (ui.screen === 'error') html = renderError();
    else if (ui.screen === 'welcome') html = renderWelcome();
    else if (ui.screen === 'log') {
      if (D.draft && D.draft.kind === 'workout') html = renderWorkout();
      else if (D.draft && D.draft.kind === 'body') html = renderBody();
      else html = renderHome();
    }
    else if (ui.screen === 'cal') html = renderCalendar();
    else if (ui.screen === 'progress') html = renderProgress();
    else html = renderSettings();

    main.innerHTML = '<div class="page' + (ui.navDir ? ' ' + ui.navDir : '') + '">' + html + '</div>';
    ui.navDir = null;

    $$('[data-keep]', main).forEach(function (el) {
      var k = el.getAttribute('data-keep');
      if (keep[k] !== undefined) { el.scrollLeft = keep[k]; return; }
      var on = $('.on', el); // fresh view: bring the selected pill into sight
      if (on && on.offsetLeft + on.offsetWidth > el.clientWidth) el.scrollLeft = on.offsetLeft - 16;
    });
    prepCharts();
    updateTabs();
    renderOverlay();

    if (ui.focusAfter) {
      var el = $(ui.focusAfter); ui.focusAfter = null;
      if (el) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }

  function reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function updateTabs() {
    var hide = ui.screen === 'welcome' || ui.screen === 'error';
    $('#app').classList.toggle('no-tabs', hide);
    var idx = Math.max(0, TAB_ORDER.indexOf(ui.screen));
    $$('#tabs .tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === ui.screen;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      if (on && ui.tabHop) { b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); }
    });
    $('#tabPill').style.transform = 'translateX(' + (idx * 100) + '%)';
    ui.tabHop = false;
  }

  function go(screen) {
    if (screen === ui.screen) { $('#main').scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
    var from = TAB_ORDER.indexOf(ui.screen), to = TAB_ORDER.indexOf(screen);
    ui.navDir = to >= from ? 'fwd' : 'back';
    ui.tabHop = true;
    ui.toast = null;
    if (screen === 'progress') ui.progAnim = true;
    ui.screen = screen;
    $('#main').scrollTop = 0;
    render();
  }

  /* ---------- Error + welcome ---------- */
  function renderError() {
    var newer = ui.error === 'newer';
    return '<div class="welcome"><div class="big-mark">' + IC.book + '</div>' +
      '<h1>' + (newer ? 'Repbook needs a moment' : 'Repbook couldn’t open your data') + '</h1>' +
      '<p class="lead">' + (newer
        ? 'Your data was saved by a newer version of Repbook. Nothing has been changed or deleted. Close Repbook fully, then open it again to update.'
        : 'Nothing has been deleted. Please close Repbook fully (swipe it away), then open it again. If this keeps happening, ask Fraser.') + '</p>' +
      '<button class="primary" data-act="reload" type="button">Try again</button></div>';
  }

  function renderWelcome() {
    return '<div class="welcome">' +
      '<div class="big-mark">' + IC.book + '</div>' +
      '<h1>Welcome to Repbook, Jane!</h1>' +
      '<p class="lead">Your own gym notebook. Everything stays safely on this phone. How would you like to start?</p>' +
      '<button class="choice main-choice" data-act="welcome" data-mode="examples" type="button"><span class="ch-t">Start with example sessions</span>' +
      '<span class="ch-d">Push, Upper body and Legs, ready to go. You can rename, reorder or delete any of these in Settings.</span></button>' +
      '<button class="choice alt-choice" data-act="welcome" data-mode="scratch" type="button"><span class="ch-t">Start from scratch</span>' +
      '<span class="ch-d">No sessions yet. You’ll create your own in Settings.</span></button>' +
      '</div>';
  }

  /* ---------- Home ---------- */
  function firstName() { return (D.profile.name || '').trim(); }

  function renderHome() {
    var nm = firstName();
    var now = new Date(), hr = now.getHours();
    var hello = (hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening') + ', ' + (nm || 'there') + '!';
    var todayLabel = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONL[now.getMonth()];

    var h = '<div class="brand"><span class="brand-mark">' + IC.book + '</span><span class="brand-name">Repbook</span></div>' +
      '<header class="hd"><p class="eyebrow">' + esc(todayLabel) + '</p><h1>' + esc(hello) + '</h1><p class="sub">What are we training today?</p></header>';

    if (ui.toast && ui.toast.kind === 'saved') {
      h += '<div class="toast"><span>' + esc(ui.toast.name) + ' saved. Nice one' + (nm ? ', ' + esc(nm) : '') + '!</span><button class="link" data-act="seeSaved" type="button">See it</button></div>';
    } else if (ui.toast && ui.toast.kind === 'body') {
      h += '<div class="toast"><span>Body check saved: ' + plural(ui.toast.n, 'measurement') + '</span><button class="link" data-act="bodyGraphs" type="button">Graphs</button></div>';
    }

    h += renderNudge();

    var mon = mondayOf(now), lastMon = addDays(mon, -7);
    var lw = weekStats(lastMon), tw = weekStats(mon);
    var sfx = nm ? ', ' + nm : '';
    var cheer = lw.workouts >= 3 ? 'Brilliant week' + sfx + '!' : lw.workouts > 0 ? 'Nice work' + sfx + '!' : 'Fresh week, fresh start' + sfx + '.';
    var thisWeek = tw.workouts === 0 ? 'Nothing logged yet this week.'
      : 'This week so far: ' + plural(tw.workouts, 'workout') + (tw.pbs ? ', ' + plural(tw.pbs, 'PB') : '') + '.';
    h += '<div class="week-card">' +
      '<div class="row" style="align-items:baseline"><p class="wk-title">Last week</p><span class="muted" style="font-size:13px">' + short(ymd(lastMon)) + ' – ' + short(ymd(addDays(mon, -1))) + '</span></div>' +
      '<p class="wk-cheer">' + esc(cheer) + '</p>' +
      '<div class="wk-stats">' +
      '<div class="wk-stat"><span class="wk-num">' + lw.workouts + '</span><span class="wk-lbl">workouts</span></div>' +
      '<div class="wk-stat"><span class="wk-num">' + lw.pbs + '</span><span class="wk-lbl">PBs</span></div>' +
      '<div class="wk-stat"><span class="wk-num">' + lw.vol.toLocaleString('en-GB') + '</span><span class="wk-lbl">kg lifted</span></div>' +
      '</div><p class="muted" style="font-size:13px;margin-top:10px">' + esc(thisWeek) + '</p></div>';

    h += '<p class="label" style="margin-top:20px">Start a session</p>';

    var bodyLast = null;
    D.body.forEach(function (b) { if (isBodyCheck(b)) bodyLast = b.date; });
    var bodyTile = '<button class="tile body" data-act="startBody" type="button"><span class="tile-ic">' + IC.tape + '</span><span class="tile-name">Body</span><span class="tile-meta">Weight &amp; measurements</span><span class="tile-meta">' + (bodyLast ? 'Last check ' + nice(bodyLast) : 'Not done yet') + '</span></button>';

    if (!D.sessions.length) {
      h += '<div class="empty-card"><h2>No sessions yet</h2><p>Make your first session, like “Push” or “Monday”, then add the exercises you do in it.</p>' +
        '<button class="primary" data-act="newSession" type="button">' + IC.plus + ' Create your first session</button></div>' +
        '<div class="tiles">' + bodyTile + '</div>';
      return h;
    }

    h += '<div class="tiles">';
    D.sessions.forEach(function (s) {
      var last = null;
      for (var i = D.workouts.length - 1; i >= 0; i--) if (D.workouts[i].sessionId === s.id) { last = D.workouts[i]; break; }
      h += '<button class="tile" style="background:' + esc(s.color) + '" data-act="start" data-sid="' + esc(s.id) + '" type="button">' +
        '<span class="tile-name">' + esc(s.name) + '</span><span class="tile-meta">' + plural(s.exIds.length, 'exercise') + '</span>' +
        '<span class="tile-meta">' + (last ? 'Last done ' + nice(last.date) : 'Not done yet') + '</span></button>';
    });
    h += bodyTile + '<button class="tile add" data-act="newSession" type="button">' + IC.plus + '<span class="tile-meta">New session</span></button></div>';
    return h;
  }

  function nudgeInfo() {
    if (!hasData() || ui.nudgeHidden) return null;
    var ref;
    if (D.lastBackupAt) ref = new Date(D.lastBackupAt);
    else {
      var first = [D.workouts[0] && D.workouts[0].date, D.body[0] && D.body[0].date].filter(Boolean).sort()[0];
      ref = first ? parseYmd(first) : new Date();
    }
    var days = daysBetween(ref, new Date());
    if (days < NUDGE_DAYS) return null;
    return { days: days, never: !D.lastBackupAt };
  }
  function renderNudge() {
    var n = nudgeInfo(); if (!n) return '';
    return '<div class="nudge" role="note"><p>' + (n.never ? 'You haven’t backed up yet.' : 'Your last backup was ' + n.days + ' days ago.') + '</p>' +
      '<p class="muted">A quick backup keeps your workouts safe if anything happens to this phone.</p>' +
      '<div class="card-actions"><button class="chip-btn" data-act="backup" type="button">' + IC.shield + ' Back up now</button><button class="link" data-act="hideNudge" type="button">Not now</button></div></div>';
  }

  /* ---------- Logging a workout ---------- */
  function blankEntry(exId) {
    var e = ex(exId), sets = [];
    for (var i = 0; i < rowsFor(e ? e.type : 'weight'); i++) sets.push({ a: '', b: '' });
    return { exId: exId, sets: sets };
  }

  function cardState(i) {
    var dr = D.draft, en = dr.entries[i], e = ex(en.exId);
    var last = lastFor(en.exId);
    var filled = en.sets.map(function (s) { return isFilled(e.type, s); });
    var doneN = filled.filter(Boolean).length;
    var eff = en.sets.map(function (s, j) { return effectiveSet(e.type, s, phSet(last, j)); });
    var anyTyped = en.sets.some(function (s) { return typed(s.a) || typed(s.b); });
    var best = bestBefore(en.exId, dr.date);
    var top = topOf(e.type, eff);
    return {
      filled: filled, doneN: doneN, complete: doneN === en.sets.length,
      livePB: anyTyped && best !== null && top > best,
      bestText: best !== null ? 'Best: ' + fmt(best) + unitOf(e.type) + ' before today' : ''
    };
  }
  function cardCls(st) { return 'card' + (st.complete ? ' complete' : '') + (st.livePB ? ' is-pb' : ''); }
  function pbBadge(st) { return '<p class="pb-badge">' + IC.star + ' New PB! <span class="b">' + esc(st.bestText) + '</span></p>'; }

  function renderWorkout() {
    var dr = D.draft;
    var name = sessName(dr.sessionId), color = sessColor(dr.sessionId);
    var completed = 0;
    var cards = dr.entries.map(function (en, i) {
      var st = cardState(i); if (st.complete) completed++;
      return cardHTML(i, st);
    }).join('');
    var n = dr.entries.length;
    var pct = n ? completed / n : 0;
    return '<div class="band" style="background:' + esc(color) + '">' +
      '<div class="row"><div style="min-width:0"><p class="eyebrow" id="wkDone">' + completed + ' of ' + n + ' done</p><h1>' + esc(name) + '</h1></div>' +
      '<button class="ghost" data-act="cancelWorkout" type="button">Cancel</button></div>' +
      '<div class="bar"><div class="bar-in" id="wkBar" style="transform:scaleX(' + pct + ')"></div></div></div>' +
      '<p class="hint">Grey numbers are from last time. If nothing’s changed, leave them and they’ll be saved as they are.</p>' +
      '<div class="stack">' + (cards || '<p class="empty">No exercises left for today. Tap Cancel, or go back and pick a session.</p>') +
      '<button class="primary" data-act="finish" type="button">' + IC.check + ' Finish &amp; save</button></div>';
  }

  function cardHTML(i, st) {
    var en = D.draft.entries[i], e = ex(en.exId), u = colsOf(e.type);
    var last = lastFor(en.exId);
    var both = !!(u.a && u.b);
    var tpl = both ? '32px 68px 1fr 1fr' : '32px 68px 1fr';
    var h = '<section class="' + cardCls(st) + '" id="card-' + i + '">' +
      '<div class="row" style="align-items:baseline"><h2>' + esc(e.name) + '</h2><span class="muted done-text" style="font-size:13px;flex:none">' + st.doneN + ' of ' + en.sets.length + ' sets</span></div>' +
      '<div class="pb-slot" data-on="' + (st.livePB ? '1' : '0') + '">' + (st.livePB ? pbBadge(st) : '') + '</div>' +
      '<div class="set head" style="grid-template-columns:' + tpl + '"><span>Set</span><span>Last</span>' + (u.a ? '<span>' + u.a + '</span>' : '') + (u.b ? '<span>' + u.b + '</span>' : '') + '</div>';
    en.sets.forEach(function (s, j) {
      var ph = phSet(last, j);
      var pa = ph ? fmt(ph.a) : '', pbv = ph ? fmt(ph.b) : '';
      var lastText = '–';
      if (ph) {
        if (e.type === 'weight' && (pa || pbv)) lastText = (pa || '–') + '×' + (pbv || '–');
        else if (e.type === 'reps' && pbv) lastText = pbv;
        else if (e.type === 'time' && pa) lastText = pa + 'm';
        else if (e.type === 'distance' && pa) lastText = pa + 'km';
      }
      h += '<div class="set' + (st.filled[j] ? ' filled' : '') + '" data-j="' + j + '" style="grid-template-columns:' + tpl + '">' +
        '<span class="setn">' + (j + 1) + '</span><span class="lastcell">' + esc(lastText) + '</span>';
      if (u.a) h += '<input class="num" type="text" inputmode="decimal" autocomplete="off" data-in="set" data-i="' + i + '" data-j="' + j + '" data-k="a" value="' + esc(s.a) + '" placeholder="' + esc(pa || u.a) + '" aria-label="' + esc(e.name + ', ' + u.a + ', set ' + (j + 1)) + '">';
      if (u.b) h += '<input class="num" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-in="set" data-i="' + i + '" data-j="' + j + '" data-k="b" value="' + esc(s.b) + '" placeholder="' + esc(pbv || 'reps') + '" aria-label="' + esc(e.name + ', reps, set ' + (j + 1)) + '">';
      h += '</div>';
    });
    h += '<div class="card-actions"><button class="chip-btn" data-act="swap" data-i="' + i + '" type="button">' + IC.swap + ' Swap</button>' +
      '<button class="chip-btn" data-act="skip" data-i="' + i + '" type="button">' + IC.skip + ' Skip today</button></div></section>';
    return h;
  }

  /* Live updates while typing: patch the card instead of re-rendering (keeps focus). */
  function patchCard(i) {
    var card = $('#card-' + i); if (!card) return;
    var st = cardState(i);
    card.className = cardCls(st);
    $$('.set[data-j]', card).forEach(function (r) { r.classList.toggle('filled', !!st.filled[+r.getAttribute('data-j')]); });
    var dt = $('.done-text', card); if (dt) dt.textContent = st.doneN + ' of ' + st.filled.length + ' sets';
    var slot = $('.pb-slot', card);
    var on = st.livePB ? '1' : '0';
    if (slot && slot.getAttribute('data-on') !== on) { slot.setAttribute('data-on', on); slot.innerHTML = st.livePB ? pbBadge(st) : ''; }
  }
  function patchBand() {
    var dr = D.draft, n = dr.entries.length, done = 0;
    for (var i = 0; i < n; i++) if (cardState(i).complete) done++;
    var a = $('#wkDone'); if (a) a.textContent = done + ' of ' + n + ' done';
    var b = $('#wkBar'); if (b) b.style.transform = 'scaleX(' + (n ? done / n : 0) + ')';
  }

  function startWorkout(sid) {
    var s = sess(sid); if (!s) return;
    if (!s.exIds.length) {
      ask({ title: 'No exercises yet', body: 'Add some exercises to ' + s.name + ' in Settings first.', ok: 'Go to Settings', cancel: 'Not now' }).then(function (yes) {
        if (yes) { ui.setSid = sid; ui.focusAfter = '#newex'; go('settings'); }
      });
      return;
    }
    D.draft = { kind: 'workout', sessionId: sid, date: todayYmd(), entries: s.exIds.filter(function (id) { return ex(id); }).map(blankEntry) };
    save();
    ui.toast = null; ui.navDir = 'fwd';
    $('#main').scrollTop = 0;
    render();
  }

  function draftHasTyping() {
    var d = D.draft; if (!d) return false;
    if (d.kind === 'body') return ['kgA', 'kgB'].concat(LEN_KEYS).some(function (k) { return typed(d[k]); });
    return d.entries.some(function (en) { return en.sets.some(function (s) { return typed(s.a) || typed(s.b); }); });
  }

  function finishWorkout() {
    var dr = D.draft, entries = [];
    dr.entries.forEach(function (en) {
      var e = ex(en.exId); if (!e) return;
      var last = lastFor(en.exId);
      var sets = en.sets.map(function (s, j) { return effectiveSet(e.type, s, phSet(last, j)); })
        .filter(function (s) { return s.a !== null || s.b !== null; });
      if (sets.length) entries.push({ exId: en.exId, sets: sets });
    });
    if (!entries.length) {
      ask({ title: 'Nothing to save yet', body: 'Type at least one number, then tap Finish & save.', ok: 'OK' });
      return;
    }
    var date = dr.date, pbs = [], items = [];
    entries.forEach(function (en) {
      var e = ex(en.exId), t = topOf(e.type, en.sets), b = bestBefore(en.exId, date);
      if (b !== null && t > b) {
        pbs.push(en.exId);
        items.push({ name: e.name, now: fmt(t) + unitOf(e.type), was: 'was ' + fmt(b) + unitOf(e.type) });
      }
    });
    var name = sessName(dr.sessionId);
    D.workouts = D.workouts.filter(function (w) { return !(w.date === date && w.sessionId === dr.sessionId); });
    D.workouts.push({ id: uid('w'), date: date, sessionId: dr.sessionId, entries: entries, pbs: pbs });
    D.workouts.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
    D.draft = null;
    save();
    ui.toast = { kind: 'saved', name: name, date: date };
    ui.celebrate = items.length ? { items: items, title: items.length === 1 ? 'New personal best!' : items.length + ' new personal bests!' } : null;
    ui.navDir = 'back';
    $('#main').scrollTop = 0;
    render();
  }

  /* ---------- Body check ---------- */
  function renderBody() {
    var d = D.draft, now = new Date();
    var todayLabel = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONL[now.getMonth()];
    var lw = lastBody('kg');
    var lastLine = function (l, k) {
      return l ? '<p class="last">Last time (' + short(l.date) + '): <strong>' + esc(valText(k, l.v)) + '</strong></p>' : '<p class="last">Not measured yet</p>';
    };
    var h = '<div class="band body-band"><div class="row"><div><p class="eyebrow">' + esc(todayLabel) + '</p><h1>Body check</h1></div>' +
      '<button class="ghost" data-act="cancelBody" type="button">Cancel</button></div></div>' +
      '<p class="hint">Only fill in what you’ve measured today. Anything left blank is simply skipped.</p><div class="stack">';

    h += '<section class="card' + (typed(d.kgA) || typed(d.kgB) ? ' complete' : '') + '" id="bcard-kg">' +
      '<div class="row" style="align-items:center"><h2>Weight</h2>' + seg('bw', [['kg', 'kg'], ['st', 'st &amp; lb']], bw(), true) + '</div>' +
      lastLine(lw, 'kg');
    if (bw() === 'kg') {
      h += '<div class="weigh-inputs" style="margin-top:10px"><input class="num" type="text" inputmode="decimal" autocomplete="off" data-in="body" data-k="kgA" value="' + esc(d.kgA) + '" placeholder="' + (lw ? fmt(Math.round(lw.v * 10) / 10) : 'kg') + '" aria-label="Weight in kg"><span class="w-unit">kg</span></div>';
    } else {
      var sl = lw ? stLb(lw.v) : null;
      h += '<div class="weigh-inputs" style="margin-top:10px"><input class="num" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-in="body" data-k="kgA" value="' + esc(d.kgA) + '" placeholder="' + (sl ? sl.st : 'st') + '" aria-label="Stones"><span class="w-unit">st</span>' +
        '<input class="num" type="text" inputmode="decimal" autocomplete="off" data-in="body" data-k="kgB" value="' + esc(d.kgB) + '" placeholder="' + (sl ? sl.lb : 'lb') + '" aria-label="Pounds"><span class="w-unit">lb</span></div>';
    }
    h += '</section>';

    h += '<div class="row" style="align-items:center;margin-top:6px"><p class="label" style="margin:0">Measurements</p>' + seg('len', [['cm', 'cm'], ['in', 'inches']], lu(), true) + '</div>';
    LEN_KEYS.forEach(function (k) {
      var l = lastBody(k);
      h += '<section class="card' + (typed(d[k]) ? ' complete' : '') + '" id="bcard-' + k + '"><h2>' + fieldName(k) + '</h2>' + lastLine(l, k) +
        '<div class="weigh-inputs" style="margin-top:10px"><input class="num" type="text" inputmode="decimal" autocomplete="off" data-in="body" data-k="' + k + '" value="' + esc(d[k]) + '" placeholder="' + (l ? fmt(lenNum(l.v)) : lu()) + '" aria-label="' + fieldName(k) + ' in ' + (lu() === 'cm' ? 'centimetres' : 'inches') + '"><span class="w-unit">' + lu() + '</span></div></section>';
    });
    h += '<button class="primary" data-act="saveBody" type="button">' + IC.check + ' Save body check</button></div>';
    return h;
  }

  function seg(unit, opts, cur, mini) {
    return '<div class="unit-seg' + (mini ? ' mini-seg' : '') + '" role="group">' + opts.map(function (o) {
      return '<button class="seg' + (cur === o[0] ? ' on' : '') + '" data-act="unit" data-unit="' + unit + '" data-val="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '" type="button">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function startBody() {
    D.draft = { kind: 'body', date: todayYmd(), kgA: '', kgB: '', bust: '', waist: '', hips: '', thighs: '' };
    save();
    ui.toast = null; ui.navDir = 'fwd';
    if (ui.screen !== 'log') { ui.screen = 'log'; ui.tabHop = true; }
    $('#main').scrollTop = 0;
    render();
  }

  function saveBody() {
    var d = D.draft, ent = {};
    var a = num(d.kgA), b = num(d.kgB);
    if (bw() === 'kg') { if (a !== null && a > 0) ent.kg = Math.round(a * 10) / 10; }
    else if (a !== null || b !== null) {
      var st = a, lb = b;
      if (st === null) { var l = lastBody('kg'); st = l ? stLb(l.v).st : 0; } // only pounds typed: keep last stones
      if (lb === null) lb = 0;
      var kg = st * KG_PER_ST + lb * KG_PER_LB;
      if (kg > 0) ent.kg = Math.round(kg * 10) / 10;
    }
    LEN_KEYS.forEach(function (k) {
      var v = num(d[k]);
      if (v !== null && v > 0) ent[k] = Math.round((lu() === 'cm' ? v : v * CM_PER_IN) * 10) / 10;
    });
    var n = Object.keys(ent).length;
    D.draft = null;
    if (n) {
      var date = d.date, found = false;
      D.body = D.body.map(function (x) { if (x.date === date) { found = true; return Object.assign({}, x, ent); } return x; });
      if (!found) D.body.push(Object.assign({ date: date }, ent));
      D.body.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
      ui.toast = { kind: 'body', n: n, field: ent.kg !== undefined ? 'kg' : Object.keys(ent)[0] };
    } else {
      flash('Nothing typed, so nothing was saved.');
    }
    save();
    ui.navDir = 'back';
    $('#main').scrollTop = 0;
    render();
  }

  /* ---------- Calendar ---------- */
  function byDate() {
    var m = {};
    D.workouts.forEach(function (w) { (m[w.date] = m[w.date] || []).push(w); });
    return m;
  }
  function recDetail(date) {
    var out = [];
    var be = null;
    D.body.forEach(function (x) { if (x.date === date && isBodyCheck(x)) be = x; });
    if (be) out.push({
      name: 'Body check', color: AMBER,
      items: BODY_FIELDS.filter(function (f) { return be[f.k] !== undefined && be[f.k] !== null; }).map(function (f) { return { name: f.name, text: valText(f.k, be[f.k]) }; })
    });
    (byDate()[date] || []).forEach(function (w) {
      out.push({
        name: sessName(w.sessionId), color: sessColor(w.sessionId),
        items: w.entries.map(function (en) {
          var e = ex(en.exId);
          return { name: e ? e.name : 'Exercise', text: e ? setsText(e.type, en.sets) : '', pb: (w.pbs || []).indexOf(en.exId) >= 0 };
        })
      });
    });
    return out;
  }

  function renderCalendar() {
    var y = ui.calY, m = ui.calM;
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var daysIn = new Date(y, m + 1, 0).getDate();
    var total = Math.ceil((offset + daysIn) / 7) * 7;
    var todayS = todayYmd(), bd = byDate();
    var bodyDates = {};
    D.body.forEach(function (x) { if (isBodyCheck(x)) bodyDates[x.date] = 1; });
    var monthCount = D.workouts.filter(function (w) { var d = parseYmd(w.date); return d.getMonth() === m && d.getFullYear() === y; }).length;
    var anim = ui.calDir ? ' cal-anim ' + ui.calDir : '';
    ui.calDir = null;

    var cells = '';
    for (var i = 0; i < total; i++) {
      var d = new Date(y, m, 1 - offset + i), s = ymd(d), recs = bd[s] || [];
      var cls = ['cal-cell'];
      if (d.getMonth() !== m) cls.push('out');
      if (recs.length) cls.push('has');
      if (recs.some(function (r) { return r.pbs && r.pbs.length; })) cls.push('haspb');
      if (s === todayS) cls.push('today');
      if (s === ui.calSel) cls.push('sel');
      if (bodyDates[s]) cls.push('hasbody');
      var label = nice(s) + (recs.length ? ', ' + recs.map(function (r) { return sessName(r.sessionId); }).join(', ') : '') + (bodyDates[s] ? ', body check' : '') + (cls.indexOf('haspb') >= 0 ? ', new PB' : '');
      cells += '<button class="' + cls.join(' ') + '" data-act="calDay" data-date="' + s + '" aria-label="' + esc(label) + '" type="button">' +
        '<span class="circ" style="background:' + (recs.length ? esc(sessColor(recs[0].sessionId)) : 'transparent') + '"></span><span class="dn">' + d.getDate() + '</span>' +
        '<span class="bmark" aria-hidden="true"></span><span class="pbmark" aria-hidden="true">' + IC.star + '</span></button>';
    }

    var h = '<div class="cal-head"><button class="icon-btn" data-act="calMove" data-dir="prev" aria-label="Previous month" type="button">' + IC.left + '</button>' +
      '<div class="cal-title"><div class="' + anim.trim() + '"><h1>' + MONL[m] + ' ' + y + '</h1><p class="muted">' + plural(monthCount, 'workout') + '</p></div></div>' +
      '<button class="icon-btn" data-act="calMove" data-dir="next" aria-label="Next month" type="button">' + IC.right + '</button></div>' +
      '<div class="wk" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>' +
      '<div class="cal-clip"><div class="' + anim.trim() + '"><div class="cal">' + cells + '</div></div></div>';

    h += '<div class="legend">' + D.sessions.map(function (s) { return '<span class="lg"><span class="sw" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + '</span>'; }).join('') +
      '<span class="lg"><span class="sw" style="background:' + AMBER + '"></span>Body check</span><span class="lg"><span class="lg-star">' + IC.star + '</span>New PB</span></div>';

    if (ui.calSel) {
      var recs = recDetail(ui.calSel);
      h += '<div class="detail"><div class="row" style="align-items:center"><h3>' + nice(ui.calSel) + '</h3><button class="link" data-act="calClose" type="button">Close</button></div>';
      if (!recs.length) h += '<p class="muted">Rest day. Nothing logged.</p>';
      recs.forEach(function (r) {
        h += '<div class="drec"><p class="dname"><span class="sw" style="background:' + esc(r.color) + '"></span>' + esc(r.name) + '</p>' +
          r.items.map(function (it) { return '<div class="ditem"><span>' + esc(it.name) + (it.pb ? '<span class="pb-mini">PB</span>' : '') + '</span><span class="muted">' + esc(it.text) + '</span></div>'; }).join('') + '</div>';
      });
      h += '</div>';
    }
    return h;
  }

  /* ---------- Progress ---------- */
  function progressPills() {
    var pills = BODY_FIELDS.map(function (f) { return { id: '__' + f.k, name: f.name, body: true }; });
    var seen = {};
    D.sessions.forEach(function (s) {
      s.exIds.forEach(function (id) { if (!seen[id] && ex(id)) { seen[id] = 1; pills.push({ id: id, name: ex(id).name }); } });
    });
    // Exercises no longer in a session but with history stay visible.
    D.workouts.forEach(function (w) {
      w.entries.forEach(function (en) { if (!seen[en.exId] && ex(en.exId)) { seen[en.exId] = 1; pills.push({ id: en.exId, name: ex(en.exId).name }); } });
    });
    return pills;
  }

  function series(exId) {
    var e = ex(exId), out = [];
    if (!e) return out;
    D.workouts.forEach(function (w) {
      var en = entryOf(w, exId); if (!en) return;
      var vol = e.type === 'weight' ? en.sets.reduce(function (t, s) { return t + (Number(s.a) || 0) * (Number(s.b) || 0); }, 0) : 0;
      out.push({ date: w.date, top: topOf(e.type, en.sets), vol: vol });
    });
    return out;
  }

  function chartWidth() {
    var main = $('#main');
    var w = main ? main.clientWidth : 396;
    var cs = main ? getComputedStyle(main) : null;
    var padX = cs ? parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 32;
    return Math.max(220, Math.round(w - padX - 32));
  }

  function chartSVG(vals, dates, label) {
    var W = chartWidth(), H = 150;
    var pl = 10, pr = 10, pt = 14, pb = 14;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mn === mx) { mn -= 1; mx += 1; }
    var span = mx - mn, lo = mn - span * 0.15, hi = mx + span * 0.15;
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    var P = vals.map(function (v, i) {
      return [r1(pl + i * (W - pl - pr) / (vals.length - 1)), r1(pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb))];
    });
    var pts = P.map(function (p) { return p[0] + ',' + p[1]; });
    var line = 'M' + pts.join(' L');
    var area = 'M' + P[0][0] + ',' + H + ' L' + pts.join(' L') + ' L' + P[P.length - 1][0] + ',' + H + ' Z';
    var grid = [0.25, 0.5, 0.75].map(function (f) { var yy = r1(pt + f * (H - pt - pb)); return 'M0,' + yy + ' L' + W + ',' + yy; }).join(' ');
    var dots = vals.length <= 60 ? P.map(function (p) { return '<circle class="dt" cx="' + p[0] + '" cy="' + p[1] + '" r="3.5"/>'; }).join('') : '';
    return '<svg class="chart-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' +
      '<path class="grid" d="' + grid + '"/><path class="area" d="' + area + '"/><path class="ln" d="' + line + '"/>' + dots + '</svg>' +
      '<div class="axis"><span>' + short(dates[0]) + '</span><span>' + short(dates[dates.length - 1]) + '</span></div>';
  }

  /* Draw-in animation: dash length from the real path length. */
  function prepCharts() {
    $$('.prog-anim .ln').forEach(function (p) {
      try {
        var L = Math.ceil(p.getTotalLength()) + 2;
        p.style.strokeDasharray = L + ' ' + L;
        p.style.strokeDashoffset = L;
      } catch (e) { /* leave it drawn */ }
    });
  }

  var NOT_ENOUGH = 'Log this a couple of times and your progress will show up here.';

  function renderProgress() {
    var pills = progressPills();
    if (!ui.progEx || !pills.some(function (p) { return p.id === ui.progEx; })) {
      var firstEx = pills.filter(function (p) { return !p.body; })[0];
      ui.progEx = firstEx ? firstEx.id : '__kg';
    }
    var h = '<header class="hd"><p class="eyebrow">How you’re getting on</p><h1>Progress</h1></header>' +
      '<div class="pills" data-keep="pills" role="tablist">' + pills.map(function (p) {
        var on = p.id === ui.progEx;
        return '<button class="pill' + (p.body ? ' bw' : '') + (on ? ' on' : '') + '" data-act="prog" data-id="' + esc(p.id) + '" role="tab" aria-selected="' + on + '" type="button">' + esc(p.name) + '</button>';
      }).join('') + '</div>';
    h += '<div class="' + (ui.progAnim ? 'prog-anim' : '') + '">' + (ui.progEx.indexOf('__') === 0 ? progBody(ui.progEx.slice(2)) : progExercise(ui.progEx)) + '</div>';
    ui.progAnim = false;
    return h;
  }

  function progExercise(id) {
    var e = ex(id); if (!e) return '';
    var ser = series(id), unit = unitWord(e.type);
    var topLabel = { weight: 'Heaviest weight', reps: 'Most reps in a set', time: 'Longest time', distance: 'Furthest distance' }[e.type];
    var tops = ser.map(function (p) { return p.top; }), vols = ser.map(function (p) { return p.vol; }), dates = ser.map(function (p) { return p.date; });
    var h = '';
    if (ser.length) {
      var pb = -1, pbDate = '';
      ser.forEach(function (p) { if (p.top >= pb) { pb = p.top; pbDate = p.date; } });
      h += '<div class="pb"><span class="pb-ic">' + IC.trophy + '</span><div><p class="pb-lbl">Personal best · ' + short(pbDate) + '</p><p class="pb-num">' + fmt(pb) + ' ' + unit + '</p></div></div>';
    }
    if (ser.length < 2) return h + '<p class="empty">' + NOT_ENOUGH + '</p>';
    var change = tops[tops.length - 1] - tops[0];
    var sentence = change > 0 ? 'Up ' + fmt(change) + ' ' + unit + ' since ' + short(dates[0]) + '.'
      : change < 0 ? 'Down ' + fmt(-change) + ' ' + unit + ' since ' + short(dates[0]) + '.'
        : 'Holding steady since ' + short(dates[0]) + '.';
    h += '<p class="muted" style="margin:0 0 12px 4px">' + sentence + ' Latest: ' + fmt(tops[tops.length - 1]) + ' ' + unit + '.</p>';
    h += '<div class="stack"><div class="chart-card"><div class="chart-hd"><h3>' + topLabel + '</h3><span class="muted">' +
      fmt(Math.min.apply(null, tops)) + '–' + fmt(Math.max.apply(null, tops)) + ' ' + unit + '</span></div>' + chartSVG(tops, dates, topLabel + ' over time') + '</div>';
    if (e.type === 'weight') {
      h += '<div class="chart-card"><div class="chart-hd"><h3>Total volume</h3><span class="muted">' + Math.round(vols[vols.length - 1]).toLocaleString('en-GB') + ' kg last time</span></div>' +
        chartSVG(vols, dates, 'Total volume over time') + '</div>';
    }
    return h + '</div>';
  }

  function progBody(k) {
    var isW = k === 'kg';
    var log = D.body.filter(function (x) { return x[k] !== undefined && x[k] !== null; });
    var last = log[log.length - 1];
    var change4 = '';
    if (last) {
      var cutS = ymd(addDays(parseYmd(last.date), -28));
      var win = log.filter(function (x) { return x.date >= cutS; });
      change4 = win.length > 1 ? diffText(k, last[k] - win[0][k]) + ' in 4 weeks'
        : log.length > 1 ? diffText(k, last[k] - log[log.length - 2][k]) + ' since last time' : 'First one logged';
    }
    var h = '<div class="pb"><span class="pb-ic">' + (isW ? IC.scale : IC.tape) + '</span><div style="flex:1;min-width:0"><p class="pb-lbl">' + fieldName(k) + (last ? ' · ' + short(last.date) : '') + '</p>' +
      '<p class="pb-num">' + (last ? esc(valText(k, last[k])) : '–') + '</p><p class="pb-lbl" style="margin-top:2px">' + esc(last ? change4 : 'Not measured yet') + '</p></div>' +
      '<button class="pb-add" data-act="startBody" aria-label="New body check" type="button">' + IC.plus + '</button></div>';
    h += isW ? seg('bw', [['kg', 'kg'], ['st', 'st &amp; lb']], bw()) : seg('len', [['cm', 'cm'], ['in', 'inches']], lu());
    if (log.length < 2) return h + '<p class="empty">' + NOT_ENOUGH + '</p>';
    h += '<p class="muted" style="margin:0 0 12px 4px">' + esc(diffText(k, last[k] - log[0][k])) + ' since ' + short(log[0].date) + '.</p>';
    var vals = log.map(function (x) { return isW ? (bw() === 'kg' ? x[k] : x[k] / KG_PER_ST) : lenNum(x[k]); });
    var lo = Math.min.apply(null, log.map(function (x) { return x[k]; })), hi = Math.max.apply(null, log.map(function (x) { return x[k]; }));
    h += '<div class="chart-card"><div class="chart-hd"><h3>' + fieldName(k) + '</h3><span class="muted">' + esc(valText(k, lo) + ' – ' + valText(k, hi)) + '</span></div>' +
      chartSVG(vals, log.map(function (x) { return x.date; }), fieldName(k) + ' over time') + '</div>';
    h += '<div class="section"><p class="label">Recent</p><div class="detail" style="margin-top:0">' +
      log.slice(-5).reverse().map(function (x) { return '<div class="ditem"><span>' + nice(x.date) + '</span><span>' + esc(valText(k, x[k])) + '</span></div>'; }).join('') + '</div></div>';
    return h;
  }

  /* ---------- Settings ---------- */
  function initial() { return (firstName().charAt(0) || '?').toUpperCase(); }

  function renderSettings() {
    if (ui.setSid && !sess(ui.setSid)) ui.setSid = null;
    if (!ui.setSid && D.sessions.length) ui.setSid = D.sessions[0].id;
    var cur = ui.setSid ? sess(ui.setSid) : null;

    var h = '<header class="hd"><p class="eyebrow">Repbook</p><h1>Settings</h1></header>' +
      '<div class="you"><span class="avatar" id="avatar">' + esc(initial()) + '</span><div style="flex:1;min-width:0"><label class="label" for="yname" style="margin-bottom:4px">Your name</label>' +
      '<input id="yname" class="txt" type="text" autocomplete="off" autocapitalize="words" enterkeyhint="done" data-in="name" value="' + esc(D.profile.name) + '"></div></div>' +
      '<p class="label" style="margin-top:18px">Your body weight in</p>' + seg('bw', [['kg', 'kg'], ['st', 'st &amp; lb']], bw()) +
      '<p class="label" style="margin-top:6px">Measurements in</p>' + seg('len', [['cm', 'cm'], ['in', 'inches']], lu()) +
      '<p class="muted" style="margin:0 0 26px 4px;font-size:13px">Exercise weights always stay in kg.</p>';

    h += '<p class="label">Sessions &amp; exercises</p>';
    if (!D.sessions.length) {
      h += '<div class="edit-panel" style="--sc:' + PALETTE[0] + '"><p class="edit-title">Make your first session</p>' +
        '<p class="muted" style="margin-bottom:12px;line-height:1.45">Give it a name, like “Push” or “Monday”. Then you’ll add its exercises.</p>' + addSessionBox() + '</div>';
    } else {
      h += '<p class="drag-hint">Tap a session to edit it.</p><div class="stabs">' + D.sessions.map(function (s) {
        return '<button class="stab' + (s.id === ui.setSid ? ' on' : '') + '" data-act="pickSess" data-sid="' + esc(s.id) + '" aria-pressed="' + (s.id === ui.setSid) + '" type="button"><span class="sw" style="background:' + esc(s.color) + '"></span><span data-sname="' + esc(s.id) + '">' + esc(s.name) + '</span></button>';
      }).join('') + '<button class="stab new" data-act="newSession" type="button">' + IC.plus + ' New session</button></div>';

      h += '<div class="edit-panel" style="--sc:' + esc(cur.color) + '">' +
        '<p class="edit-title">Editing: <span data-sname="' + esc(cur.id) + '">' + esc(cur.name) + '</span></p>' +
        '<label class="label" for="sname">Session name</label><div class="ex-top">' +
        '<input id="sname" class="txt" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" data-in="sessName" value="' + esc(cur.name) + '">' +
        (D.sessions.length > 1 ? '<button class="mini" data-act="delSess" aria-label="Delete this session" type="button">' + IC.trash + '</button>' : '') + '</div>';

      h += '<div class="section" style="margin-top:20px"><p class="label">Exercises in this session</p>';
      if (cur.exIds.length > 1) h += '<p class="drag-hint">Hold the dots and drag to change the order.</p>';
      h += '<div class="ex-list" id="exList">';
      cur.exIds.forEach(function (id) {
        var e = ex(id); if (!e) return;
        h += '<div class="ex-row" data-id="' + esc(id) + '"><div class="ex-top">' +
          '<button class="grip" data-grip aria-label="Drag to reorder ' + esc(e.name) + '" type="button">' + IC.grip + '</button>' +
          '<input class="txt" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" data-in="exName" data-id="' + esc(id) + '" value="' + esc(e.name) + '" aria-label="Exercise name">' +
          '<button class="mini" data-act="removeEx" data-id="' + esc(id) + '" aria-label="Remove ' + esc(e.name) + ' from this session" type="button">' + IC.trash + '</button></div>' +
          '<button class="type-pill" data-act="openType" data-id="' + esc(id) + '" type="button"><span class="muted" style="font-size:13px">Measures</span><span class="tp-val">' + TYPE_INFO[e.type].label + '</span>' + IC.down + '</button></div>';
      });
      h += '</div>';
      if (!cur.exIds.length) h += '<p class="empty">No exercises yet. Add the first one below.</p>';
      h += '</div>';

      h += '<div class="add-box" id="addEx">';
      if (ui.addedSid === cur.id && !cur.exIds.length) h += '<p class="add-lead">Now add the exercises for ' + esc(cur.name) + ', one at a time.</p>';
      h += '<label class="label" for="newex">Add an exercise</label><div class="stack">' +
        '<input id="newex" class="txt" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="e.g. Cable row">' +
        '<p class="muted" style="font-size:13px;margin:2px 0 -2px 4px">What should it measure?</p><div class="type-grid">' +
        TYPES.map(function (t) {
          return '<button class="type-card sm' + (ui.newExType === t ? ' on' : '') + '" data-act="newType" data-t="' + t + '" aria-pressed="' + (ui.newExType === t) + '" type="button"><span class="tc-ic">' + TYPE_INFO[t].icon + '</span><span class="tc-name">' + TYPE_INFO[t].label + '</span></button>';
        }).join('') + '</div>' +
        '<button class="primary" data-act="addEx" type="button">' + IC.plus + ' Add exercise</button></div></div></div>';

      h += '<div class="section" id="addSess"><label class="label" for="newsess">Add a session</label>' + addSessionBox() + '</div>';
    }

    var lb = D.lastBackupAt ? new Date(D.lastBackupAt) : null;
    h += '<div class="section"><p class="label">Your data</p><div class="backup">' +
      '<p><strong>Last backup: ' + (lb ? nice(ymd(lb)) + ', ' + pad(lb.getHours()) + ':' + pad(lb.getMinutes()) : 'never') + '</strong></p>' +
      '<p class="muted">Back up saves a copy of all your workouts as a file. Save it to iCloud Drive or email it to yourself, so a new phone can carry on where this one left off.</p>' +
      '<button class="primary" data-act="backup" type="button">' + IC.shield + ' Back up now</button>' +
      '<button class="secondary" data-act="restore" type="button">Restore from a backup</button>' +
      '<p class="muted" style="font-size:13px">Restoring replaces what’s on this phone with the backup. You’ll be asked to check first.</p></div></div>';
    h += '<p class="version">Repbook ' + APP_VERSION + '</p>';
    return h;
  }

  function addSessionBox() {
    return '<div class="ex-top"><input id="newsess" class="txt" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="e.g. Pull day">' +
      '<button class="chip-btn" data-act="addSess" type="button" style="min-height:48px">' + IC.plus + ' Add</button></div>';
  }

  function addSession() {
    var inp = $('#newsess'); var name = inp ? inp.value.trim() : '';
    if (!name) { if (inp) inp.focus(); return; }
    var used = D.sessions.map(function (s) { return s.color; });
    var color = PALETTE.filter(function (c) { return used.indexOf(c) < 0; })[0] || PALETTE[D.sessions.length % PALETTE.length];
    var id = uid('s');
    D.sessions.push({ id: id, name: name, color: color, exIds: [] });
    save();
    ui.setSid = id; ui.addedSid = id;
    ui.focusAfter = '#newex';
    render();
  }

  function addExercise() {
    var inp = $('#newex'); var name = inp ? inp.value.trim() : '';
    var cur = sess(ui.setSid);
    if (!cur) return;
    if (!name) { if (inp) inp.focus(); return; }
    var type = ui.newExType;
    var lower = name.toLowerCase();
    var inSession = cur.exIds.some(function (id) { return ex(id) && ex(id).name.trim().toLowerCase() === lower; });
    if (inSession) { flash(name + ' is already in ' + cur.name + '.'); if (inp) inp.select(); return; }
    // Re-use an existing exercise of the same name and type, so its history carries on.
    var reuse = null;
    Object.keys(D.exercises).forEach(function (id) { var e = D.exercises[id]; if (!reuse && e.name.trim().toLowerCase() === lower && e.type === type) reuse = id; });
    var id = reuse || uid('x');
    if (!reuse) D.exercises[id] = { id: id, name: name, type: type };
    cur.exIds.push(id);
    save();
    flash('Added ' + name);
    ui.focusAfter = '#newex';
    render();
  }

  /* ------------------------------------------------------------------ *
   * Overlays: sheets, celebration, dialogs, flash
   * ------------------------------------------------------------------ */
  function renderOverlay() {
    var o = $('#overlay');
    var want = ui.celebrate ? 'cele' : ui.overlay ? ui.overlay.kind + ':' + (ui.overlay.i !== undefined ? ui.overlay.i : ui.overlay.id) : '';
    if (o.getAttribute('data-k') === want) return; // already showing: don't replay the animation
    o.setAttribute('data-k', want);
    if (!want) { o.innerHTML = ''; return; }
    if (ui.celebrate) { o.innerHTML = celebrateHTML(); focusFirst(o); return; }
    var ov = ui.overlay;
    if (ov.kind === 'swap') o.innerHTML = swapHTML(ov.i);
    else if (ov.kind === 'type') o.innerHTML = typeHTML(ov.id);
    focusFirst(o);
  }
  function focusFirst(root) { var b = $('button', root); if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

  function sheet(eyebrow, title, body, label) {
    return '<div class="sheet-bg" data-act="closeOverlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' +
      '<div class="row" style="align-items:center"><div style="min-width:0"><p class="eyebrow">' + eyebrow + '</p><h2>' + title + '</h2></div>' +
      '<button class="mini" data-act="closeOverlay" data-x="1" aria-label="Close" type="button">' + IC.close + '</button></div>' + body + '</div></div>';
  }

  function swapHTML(i) {
    var dr = D.draft; if (!dr || !dr.entries[i]) return '';
    var inUse = dr.entries.map(function (x) { return x.exId; });
    var homeOf = {};
    D.sessions.forEach(function (s) { s.exIds.forEach(function (id) { if (!homeOf[id]) homeOf[id] = s.name; }); });
    var opts = Object.keys(homeOf).filter(function (id) { return inUse.indexOf(id) < 0 && ex(id); })
      .sort(function (a, b) { return ex(a).name.localeCompare(ex(b).name); });
    var list = opts.length ? opts.map(function (id) {
      return '<button class="opt" data-act="doSwap" data-id="' + esc(id) + '" type="button"><span>' + esc(ex(id).name) + '</span><span class="muted">' + esc(homeOf[id]) + '</span></button>';
    }).join('') : '<p class="empty">No other exercises yet. You can add more in Settings.</p>';
    return sheet('Swap for today only', 'Instead of ' + esc(ex(dr.entries[i].exId).name), '<div class="sheet-list">' + list + '</div>', 'Swap exercise');
  }

  function typeHTML(id) {
    var e = ex(id); if (!e) return '';
    var grid = '<div class="type-grid">' + TYPES.map(function (t) {
      return '<button class="type-card' + (e.type === t ? ' on' : '') + '" data-act="setType" data-id="' + esc(id) + '" data-t="' + t + '" aria-pressed="' + (e.type === t) + '" type="button"><span class="tc-ic">' + TYPE_INFO[t].icon + '</span>' +
        '<span class="tc-name">' + TYPE_INFO[t].label + '</span><span class="tc-eg">' + TYPE_INFO[t].eg + '</span></button>';
    }).join('') + '</div>';
    return sheet('What should ' + esc(e.name) + ' measure?', 'Choose a type', grid, 'What to measure');
  }

  function celebrateHTML() {
    var c = ui.celebrate, cols = ['#9D174D', '#F472B6', '#F59E0B', '#6D28D9', '#0E7490', '#FBCFE8'], conf = '';
    for (var q = 0; q < 28; q++) {
      var x = (q * 37) % 100, dl = ((q * 53) % 70) / 100, dur = 1.6 + ((q * 29) % 10) / 10, w = 6 + (q % 3) * 3;
      conf += '<span class="cf" style="left:' + x + '%;background:' + cols[q % cols.length] + ';animation-delay:' + dl + 's;animation-duration:' + dur + 's;width:' + w + 'px;height:' + (w * 1.6) + 'px"></span>';
    }
    var nm = firstName();
    return '<div class="cele-bg"><div class="confetti" aria-hidden="true">' + conf + '</div>' +
      '<div class="cele-card" role="dialog" aria-modal="true" aria-label="' + esc(c.title) + '"><div class="cele-ic">' + IC.trophy + '</div>' +
      '<h2 class="cele-title">' + esc(c.title) + '</h2><p class="muted" style="margin-bottom:12px">Look at you go' + (nm ? ', ' + esc(nm) : '') + '!</p>' +
      '<div class="cele-list">' + c.items.map(function (it) {
        return '<div class="cele-row"><span class="cele-name">' + esc(it.name) + '</span><span class="cele-now">' + esc(it.now) + '</span><span class="cele-was">' + esc(it.was) + '</span></div>';
      }).join('') + '</div><button class="primary" data-act="closeCelebrate" type="button">Woohoo!</button></div></div>';
  }

  /* In-app replacement for confirm()/alert(). Resolves true/false. */
  function ask(o) {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.className = 'dlg-bg';
      var okBtn = '<button class="' + (o.danger ? 'secondary danger-outline' : 'primary') + '" data-r="1" type="button">' + esc(o.ok || 'OK') + '</button>';
      var noBtn = o.cancel ? '<button class="' + (o.danger ? 'primary' : 'secondary') + '" data-r="0" type="button">' + esc(o.cancel) + '</button>' : '';
      bg.innerHTML = '<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlgT"><h2 id="dlgT">' + esc(o.title) + '</h2>' +
        (o.html || '<p>' + esc(o.body || '') + '</p>') +
        '<div class="dlg-btns">' + (o.danger ? noBtn + okBtn : okBtn + noBtn) + '</div></div>';
      bg.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-r]'); if (!b) return;
        ev.stopPropagation();
        bg.remove();
        resolve(b.getAttribute('data-r') === '1');
      });
      $('#app').appendChild(bg);
      focusFirst(bg);
    });
  }

  var flashTimer = null;
  function flash(text) {
    var f = $('#flash');
    f.textContent = text;
    f.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { f.classList.remove('show'); }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Backup & restore
   * ------------------------------------------------------------------ */
  function backup() {
    var when = new Date();
    var copy = clone(D);
    copy.lastBackupAt = when.toISOString();
    var name = 'repbook-backup-' + ymd(when) + '.json';
    var text = JSON.stringify(copy, null, 2);
    var blob = new Blob([text], { type: 'application/json' });
    var file = null;
    try { file = new File([blob], name, { type: 'application/json' }); } catch (e) { file = null; }

    var done = function () {
      D.lastBackupAt = when.toISOString();
      save();
      ui.nudgeHidden = false;
      render();
      flash('Backup saved. Nice one!');
    };
    var download = function () {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      done();
    };
    // Call share() straight from the tap so iOS treats it as a user action.
    if (file && navigator.canShare && navigator.share) {
      var ok = false;
      try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
      if (ok) {
        navigator.share({ files: [file], title: 'Repbook backup' }).then(done, function (err) {
          if (err && err.name === 'AbortError') return; // she closed the share sheet
          download();
        });
        return;
      }
    }
    download();
  }

  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'This file isn’t a Repbook backup.';
    if (typeof obj.schemaVersion !== 'number') return 'This file isn’t a Repbook backup.';
    if (obj.schemaVersion > SCHEMA_VERSION) return 'This backup was made by a newer version of Repbook. Close and reopen Repbook to update it, then try again.';
    if (!obj.exercises || typeof obj.exercises !== 'object' || Array.isArray(obj.exercises)) return 'This backup looks damaged (no exercises).';
    if (!Array.isArray(obj.sessions) || !Array.isArray(obj.workouts) || !Array.isArray(obj.body)) return 'This backup looks damaged.';
    var badW = obj.workouts.some(function (w) { return !w || !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || !Array.isArray(w.entries); });
    var badB = obj.body.some(function (b) { return !b || !/^\d{4}-\d{2}-\d{2}$/.test(b.date); });
    if (badW || badB) return 'This backup looks damaged.';
    return null;
  }

  function onRestoreFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { ask({ title: 'Couldn’t read that file', body: 'Please try again.', ok: 'OK' }); };
    reader.onload = function () {
      var obj = null;
      try { obj = JSON.parse(String(reader.result)); } catch (e) { obj = null; }
      var err = validateBackup(obj);
      if (err) { ask({ title: 'Can’t restore this file', body: err, ok: 'OK' }); return; }
      var n = obj.workouts.length;
      var lastW = n ? obj.workouts.map(function (w) { return w.date; }).sort().pop() : null;
      var bodyN = obj.body.length;
      var made = obj.lastBackupAt ? new Date(obj.lastBackupAt) : null;
      var summary = '<p><strong style="color:var(--ink)">' + plural(n, 'workout') + (lastW ? ', last on ' + nice(lastW) : '') + '</strong><br>' +
        plural(obj.sessions.length, 'session') + ' · ' + plural(bodyN, 'body check') +
        (made && !isNaN(made) ? '<br>Backed up ' + nice(ymd(made)) : '') + '</p>' +
        '<p>This replaces everything in Repbook on this phone. A copy of what’s here now is kept, just in case.</p>';
      ask({ title: 'Restore this backup?', html: summary, ok: 'Restore', cancel: 'Cancel' }).then(function (yes) {
        if (!yes) return;
        var next;
        try { next = normalise(migrate(clone(obj))); } catch (e) {
          ask({ title: 'Can’t restore this file', body: 'This backup couldn’t be read.', ok: 'OK' }); return;
        }
        next.draft = null;
        Store.keep('preRestoreBackup', LS_PRE, D).then(function () {
          D = next;
          save();
          ui.setSid = null; ui.progEx = null; ui.toast = null; ui.calSel = null;
          render();
          flash('Backup restored');
        });
      });
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ *
   * Drag to reorder (pointer events + setPointerCapture)
   * ------------------------------------------------------------------ */
  var drag = null;
  function dragStart(grip, ev) {
    var row = grip.closest('.ex-row'); if (!row) return;
    ev.preventDefault();
    try { grip.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    drag = { grip: grip, row: row, list: row.parentElement, id: ev.pointerId, startY: ev.clientY };
    row.classList.add('dragging');
    grip.addEventListener('pointermove', dragMove);
    grip.addEventListener('pointerup', dragEnd);
    grip.addEventListener('pointercancel', dragEnd);
    grip.addEventListener('lostpointercapture', dragEnd);
  }
  function dragMove(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.preventDefault();
    var gap = 10, dy = ev.clientY - drag.startY;
    var next = drag.row.nextElementSibling, prev = drag.row.previousElementSibling;
    // Move the neighbour, never the dragged row, so pointer capture is kept.
    if (next && dy > (next.offsetHeight + gap) / 2) {
      drag.list.insertBefore(next, drag.row);
      drag.startY += next.offsetHeight + gap;
    } else if (prev && dy < -(prev.offsetHeight + gap) / 2) {
      drag.list.insertBefore(prev, drag.row.nextSibling);
      drag.startY -= prev.offsetHeight + gap;
    }
    drag.row.style.transform = 'translateY(' + Math.round(ev.clientY - drag.startY) + 'px)';
  }
  function dragEnd() {
    if (!drag) return;
    var d = drag; drag = null;
    d.grip.removeEventListener('pointermove', dragMove);
    d.grip.removeEventListener('pointerup', dragEnd);
    d.grip.removeEventListener('pointercancel', dragEnd);
    d.grip.removeEventListener('lostpointercapture', dragEnd);
    d.row.style.transform = '';
    d.row.classList.remove('dragging');
    var cur = sess(ui.setSid);
    if (cur) {
      var ids = $$('.ex-row', d.list).map(function (r) { return r.getAttribute('data-id'); });
      if (ids.join('|') !== cur.exIds.join('|')) { cur.exIds = ids; save(); }
    }
  }

  /* ------------------------------------------------------------------ *
   * Actions (taps)
   * ------------------------------------------------------------------ */
  var ACTIONS = {
    tab: function (el) { go(el.getAttribute('data-tab')); },
    reload: function () { location.reload(); },
    welcome: function (el) {
      if (D) return; // never seed over existing data
      D = el.getAttribute('data-mode') === 'examples' ? exampleDoc() : emptyDoc();
      save();
      requestPersist();
      ui.screen = 'log'; ui.navDir = 'fwd';
      render();
    },
    start: function (el) { startWorkout(el.getAttribute('data-sid')); },
    newSession: function () {
      ui.focusAfter = '#newsess';
      if (ui.screen === 'settings') render(); else go('settings');
    },
    seeSaved: function () {
      var d = ui.toast && ui.toast.date ? parseYmd(ui.toast.date) : new Date();
      ui.calY = d.getFullYear(); ui.calM = d.getMonth(); ui.calSel = ymd(d);
      go('cal');
    },
    bodyGraphs: function () {
      ui.progEx = '__' + ((ui.toast && ui.toast.field) || 'kg');
      go('progress');
    },
    hideNudge: function () { ui.nudgeHidden = true; render(); },
    backup: function () { backup(); },
    restore: function () { var f = $('#restoreFile'); f.value = ''; f.click(); },

    cancelWorkout: function () {
      var leave = function () { D.draft = null; save(); ui.navDir = 'back'; $('#main').scrollTop = 0; render(); };
      if (!draftHasTyping()) { leave(); return; }
      ask({ title: 'Cancel this workout?', body: 'The numbers you’ve typed today won’t be saved.', ok: 'Yes, cancel it', cancel: 'Keep going', danger: true })
        .then(function (yes) { if (yes) leave(); });
    },
    finish: function () { finishWorkout(); },
    swap: function (el) { ui.overlay = { kind: 'swap', i: +el.getAttribute('data-i') }; renderOverlay(); },
    doSwap: function (el) {
      var i = ui.overlay && ui.overlay.i;
      if (D.draft && D.draft.entries[i]) { D.draft.entries[i] = blankEntry(el.getAttribute('data-id')); save(); }
      ui.overlay = null; render();
    },
    skip: function (el) {
      var i = +el.getAttribute('data-i');
      var en = D.draft.entries[i]; if (!en) return;
      var doIt = function () { D.draft.entries.splice(i, 1); save(); render(); };
      if (!en.sets.some(function (s) { return typed(s.a) || typed(s.b); })) { doIt(); return; }
      ask({ title: 'Skip ' + ex(en.exId).name + ' today?', body: 'What you’ve typed for it won’t be saved.', ok: 'Skip it', cancel: 'Keep it', danger: true })
        .then(function (yes) { if (yes) doIt(); });
    },
    closeOverlay: function (el, ev) {
      if (el.classList.contains('sheet-bg') && ev.target !== el) return; // tap inside the sheet
      ui.overlay = null; renderOverlay();
    },
    closeCelebrate: function () { ui.celebrate = null; renderOverlay(); },

    startBody: function () { startBody(); },
    cancelBody: function () {
      var leave = function () { D.draft = null; save(); ui.navDir = 'back'; render(); };
      if (!draftHasTyping()) { leave(); return; }
      ask({ title: 'Cancel this body check?', body: 'What you’ve typed won’t be saved.', ok: 'Yes, cancel it', cancel: 'Keep going', danger: true })
        .then(function (yes) { if (yes) leave(); });
    },
    saveBody: function () { saveBody(); },
    unit: function (el) {
      var unit = el.getAttribute('data-unit'), val = el.getAttribute('data-val');
      if (unit === 'bw') {
        if (D.profile.bwUnit === val) return;
        D.profile.bwUnit = val;
        if (D.draft && D.draft.kind === 'body') { D.draft.kgA = ''; D.draft.kgB = ''; }
      } else {
        if (D.profile.lenUnit === val) return;
        D.profile.lenUnit = val;
        if (D.draft && D.draft.kind === 'body') LEN_KEYS.forEach(function (k) { D.draft[k] = ''; });
      }
      save(); render();
    },

    calMove: function (el) {
      var dir = el.getAttribute('data-dir');
      var m = ui.calM + (dir === 'next' ? 1 : -1), y = ui.calY;
      if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
      ui.calM = m; ui.calY = y; ui.calDir = dir;
      render();
    },
    calDay: function (el) { ui.calSel = el.getAttribute('data-date'); render(); var d = $('.detail'); if (d) d.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); },
    calClose: function () { ui.calSel = null; render(); },

    prog: function (el) {
      var id = el.getAttribute('data-id');
      if (id === ui.progEx) return;
      ui.progEx = id; ui.progAnim = true; render();
    },

    pickSess: function (el) { ui.setSid = el.getAttribute('data-sid'); ui.addedSid = null; render(); },
    addSess: function () { addSession(); },
    delSess: function () {
      var cur = sess(ui.setSid); if (!cur || D.sessions.length <= 1) return;
      ask({ title: 'Delete the ' + cur.name + ' session?', body: 'Your past workouts stay in your calendar and progress.', ok: 'Delete session', cancel: 'Keep it', danger: true })
        .then(function (yes) {
          if (!yes) return;
          D.sessions = D.sessions.filter(function (s) { return s.id !== cur.id; });
          if (D.draft && D.draft.kind === 'workout' && D.draft.sessionId === cur.id) { /* keep the draft; it falls back to "Workout" */ }
          save();
          ui.setSid = D.sessions[0] ? D.sessions[0].id : null;
          render();
          flash(cur.name + ' deleted');
        });
    },
    removeEx: function (el) {
      var id = el.getAttribute('data-id'), cur = sess(ui.setSid), e = ex(id);
      if (!cur || !e) return;
      ask({ title: 'Remove ' + e.name + '?', body: 'It comes out of ' + cur.name + '. Your past workouts with it are kept.', ok: 'Remove', cancel: 'Keep it', danger: true })
        .then(function (yes) {
          if (!yes) return;
          cur.exIds = cur.exIds.filter(function (x) { return x !== id; });
          save(); render();
        });
    },
    openType: function (el) { ui.overlay = { kind: 'type', id: el.getAttribute('data-id') }; renderOverlay(); },
    setType: function (el) {
      var id = el.getAttribute('data-id'), t = el.getAttribute('data-t'), e = ex(id);
      if (!e) return;
      var apply = function () { e.type = t; save(); ui.overlay = null; render(); };
      if (e.type === t) { ui.overlay = null; renderOverlay(); return; }
      var used = D.workouts.some(function (w) { return entryOf(w, id); });
      if (!used) { apply(); return; }
      ask({ title: 'Change what ' + e.name + ' measures?', body: 'You’ve already logged it as ' + TYPE_INFO[e.type].label + '. Changing it can make those past entries look odd.', ok: 'Change it', cancel: 'Leave it', danger: true })
        .then(function (yes) { if (yes) apply(); });
    },
    newType: function (el) {
      ui.newExType = el.getAttribute('data-t');
      $$('[data-act="newType"]').forEach(function (b) {
        var on = b.getAttribute('data-t') === ui.newExType;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      });
    },
    addEx: function () { addExercise(); }
  };

  /* Typing */
  var INPUTS = {
    set: function (el) {
      var i = +el.getAttribute('data-i'), j = +el.getAttribute('data-j'), k = el.getAttribute('data-k');
      if (!D.draft || !D.draft.entries[i]) return;
      D.draft.entries[i].sets[j][k] = el.value;
      save(); patchCard(i); patchBand();
    },
    body: function (el) {
      var k = el.getAttribute('data-k');
      if (!D.draft || D.draft.kind !== 'body') return;
      D.draft[k] = el.value;
      save();
      var card = el.closest('.card');
      if (card) card.classList.toggle('complete', $$('input', card).some(function (x) { return typed(x.value); }));
    },
    name: function (el) {
      var v = el.value.trim(); if (!v) return;
      D.profile.name = v; save();
      var a = $('#avatar'); if (a) a.textContent = initial();
    },
    sessName: function (el) {
      var v = el.value.trim(), cur = sess(ui.setSid); if (!v || !cur) return;
      cur.name = v; save();
      $$('[data-sname="' + cur.id + '"]').forEach(function (x) { x.textContent = v; });
    },
    exName: function (el) {
      var v = el.value.trim(), e = ex(el.getAttribute('data-id')); if (!v || !e) return;
      e.name = v; save();
    }
  };
  /* On blur, put a blanked-out name back (names are never left empty). */
  var BLUR_FIX = {
    name: function (el) { if (!el.value.trim()) el.value = D.profile.name; },
    sessName: function (el) { var c = sess(ui.setSid); if (c && !el.value.trim()) el.value = c.name; },
    exName: function (el) { var e = ex(el.getAttribute('data-id')); if (e && !el.value.trim()) el.value = e.name; }
  };

  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el || !$('#app').contains(el)) return;
      var fn = ACTIONS[el.getAttribute('data-act')];
      if (fn) fn(el, ev);
    });
    document.addEventListener('input', function (ev) {
      var el = ev.target, k = el.getAttribute && el.getAttribute('data-in');
      if (k && INPUTS[k] && D) INPUTS[k](el, ev);
    });
    document.addEventListener('change', function (ev) {
      var el = ev.target;
      if (el.id === 'restoreFile') { onRestoreFile(el.files && el.files[0]); return; }
      var k = el.getAttribute && el.getAttribute('data-in');
      if (k && BLUR_FIX[k] && D) BLUR_FIX[k](el);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      var t = ev.target;
      if (t.id === 'newex') { ev.preventDefault(); addExercise(); }
      else if (t.id === 'newsess') { ev.preventDefault(); addSession(); }
      else if (t.matches && t.matches('input.txt')) { ev.preventDefault(); t.blur(); }
      else if (t.matches && t.matches('input.num')) {
        ev.preventDefault();
        var all = $$('input.num'), idx = all.indexOf(t);
        if (all[idx + 1]) all[idx + 1].focus(); else t.blur();
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && (ui.overlay)) { ui.overlay = null; renderOverlay(); }
    });
    document.addEventListener('pointerdown', function (ev) {
      var g = ev.target.closest && ev.target.closest('[data-grip]');
      if (g) dragStart(g, ev);
    });
    // Re-draw charts at the right width if the phone rotates.
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (ui.screen === 'progress') render(); }, 200);
    });
    // Belt and braces: make sure the latest copy is written when the app is hidden.
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') Store.flush(); });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persisted().then(function (p) { if (!p) return navigator.storage.persist(); }).catch(function () {});
      }
    } catch (e) { /* ignore */ }
  }

  function registerSW() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  function boot() {
    bindEvents();
    Store.open().then(function () { return Store.load(); }).then(function (res) {
      if (res.status === 'error') { ui.screen = 'error'; ui.error = res.reason; render(); return; }
      if (res.status === 'empty') { D = null; ui.screen = 'welcome'; render(); return; }
      var doc = res.doc;
      if (typeof doc.schemaVersion === 'number' && doc.schemaVersion > SCHEMA_VERSION) {
        ui.screen = 'error'; ui.error = 'newer'; render(); return; // don't touch newer data
      }
      var p = Promise.resolve();
      if (typeof doc.schemaVersion === 'number' && doc.schemaVersion < SCHEMA_VERSION) {
        var before = clone(doc);
        p = Store.keep('preMigrationBackup', LS_MIG, before).then(function () {
          doc = migrate(doc); normalise(doc); D = doc; save();
        });
      } else {
        D = normalise(migrate(doc));
      }
      return p.then(function () {
        ui.screen = 'log';
        render();
        requestPersist();
      });
    }).catch(function () {
      ui.screen = 'error'; ui.error = 'unreadable'; render();
    });
    registerSW();
  }

  // Test hook (read-only snapshot), handy for checking data in the browser console.
  window.repbookDebug = { doc: function () { return D ? clone(D) : null; }, version: APP_VERSION, schema: SCHEMA_VERSION };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
