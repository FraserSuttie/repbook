/* Repbook smoke tests – iPhone 14 Plus viewport (428×926), touch on.

   1. In one terminal, from the repo root:   python3 -m http.server 8123
   2. In another:                            node tests/smoke.js
   (Uses the Playwright that's installed globally; set BASE to test another URL.) */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8123/';
const SHOTS = process.env.SHOTS || '';
const PHONE = { viewport: { width: 428, height: 926 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };

let passed = 0, failed = 0;
function check(cond, msg) {
  if (cond) { passed++; console.log('  ✓ ' + msg); }
  else { failed++; console.log('  ✗ ' + msg); }
}
function eq(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  check(ok, msg + (ok ? '' : `  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`));
}

async function newPhone(browser, when) {
  const ctx = await browser.newContext({ ...PHONE, acceptDownloads: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('dialog', d => { page.errors.push('NATIVE DIALOG: ' + d.message()); d.dismiss(); });
  if (when) await page.clock.install({ time: new Date(when) });
  return { ctx, page };
}
const doc = page => page.evaluate(() => window.repbookDebug.doc());
const settle = page => page.waitForTimeout(450);
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
async function tapTab(page, tab) { await page.tap(`#tabs [data-tab="${tab}"]`); await settle(page); }
const setBox = (i, j, k) => `input[data-in="set"][data-i="${i}"][data-j="${j}"][data-k="${k}"]`;

async function layoutChecks(page, where) {
  const r = await page.evaluate(() => {
    const main = document.getElementById('main');
    const small = [...document.querySelectorAll('input')].filter(i => i.offsetParent && parseFloat(getComputedStyle(i).fontSize) < 16).length;
    const tiny = [...document.querySelectorAll('#main button, #tabs button')].filter(b => {
      const r = b.getBoundingClientRect();
      return b.offsetParent && !b.closest('.cal') && (r.height < 44 || r.width < 36);
    }).map(b => b.textContent.trim().slice(0, 20));
    return { overflow: main.scrollWidth - main.clientWidth, small, tiny, selects: document.querySelectorAll('select').length };
  });
  check(r.overflow <= 0, `${where}: no sideways overflow`);
  check(r.small === 0, `${where}: every input is 16px+ (no iOS zoom)`);
  check(r.selects === 0, `${where}: no native <select>`);
  check(r.tiny.length === 0, `${where}: touch targets ≥ 44px tall` + (r.tiny.length ? ' ' + JSON.stringify(r.tiny) : ''));
}

async function mainJourney(browser) {
  console.log('\nFirst run → example sessions → workouts, PBs, body, calendar, progress, settings, backup/restore');
  const { ctx, page } = await newPhone(browser, '2026-10-26T10:00:00'); // a Monday
  await page.goto(BASE);
  await settle(page);
  check(await page.isVisible('text=Welcome to Repbook, Jane!'), 'welcome screen shows on empty storage');
  check(await page.isHidden('#tabs'), 'tab bar hidden on welcome screen');
  await shot(page, '01-welcome');
  await page.tap('[data-act="welcome"][data-mode="examples"]');
  await settle(page);
  let d = await doc(page);
  eq(d.sessions.map(s => s.name), ['Push', 'Upper body', 'Legs'], 'example sessions loaded');
  eq(d.sessions.map(s => s.exIds.length), [8, 8, 8], 'eight exercises in each');
  eq(d.workouts.length, 0, 'no fake history');
  check(await page.isVisible('text=Morning, Jane!'), 'greeting by time of day');
  check(await page.isVisible('text=Fresh week, fresh start, Jane.'), 'round-up cheer for an empty week');
  await layoutChecks(page, 'home');
  await shot(page, '02-home');

  // Workout 1 (Monday): first ever, so no PBs.
  await page.tap('[data-act="start"][data-sid="s-push"]');
  await settle(page);
  check(await page.isVisible('.band >> text=Push'), 'logging screen opens with the session band');
  eq(await page.locator('#card-0 .set[data-j]').count(), 3, 'weight exercise has exactly 3 set rows');
  eq(await page.locator('#card-7 .set[data-j]').count(), 1, 'time exercise (Treadmill walk) has 1 row');
  for (const [j, a, b] of [[0, '20', '10'], [1, '20', '10'], [2, '20', '8']]) {
    await page.fill(setBox(0, j, 'a'), a); await page.fill(setBox(0, j, 'b'), b);
  }
  for (let j = 0; j < 3; j++) { await page.fill(setBox(1, j, 'a'), '12'); await page.fill(setBox(1, j, 'b'), '10'); }
  await page.fill(setBox(7, 0, 'a'), '15');
  check(await page.getAttribute('#card-0', 'class').then(c => c.includes('complete')), 'card turns complete when all rows filled');
  eq(await page.textContent('#wkDone'), '3 of 8 done', 'band counts finished exercises');
  check(await page.isHidden('#card-0 .pb-badge'), 'no PB badge on the first ever log');
  await layoutChecks(page, 'logging');
  await shot(page, '03-logging');
  await page.tap('[data-act="finish"]');
  await settle(page);
  check(await page.isHidden('.cele-bg'), 'no celebration for a first-time log');
  check(await page.isVisible('text=Push saved. Nice one, Jane!'), 'saved toast');
  d = await doc(page);
  eq(d.workouts.length, 1, 'workout saved');
  eq(d.workouts[0].entries.map(e => e.exId), ['ex-chest-press', 'ex-shoulder-press', 'ex-treadmill-walk'], 'only exercises with values are saved');

  // Reload: persisted, not reseeded, no welcome.
  await page.clock.setSystemTime(new Date('2026-10-28T18:30:00')); // Wednesday evening
  await page.reload();
  await settle(page);
  check(await page.isHidden('text=Welcome to Repbook'), 'welcome screen does not come back after reload');
  d = await doc(page);
  eq(d.workouts.length, 1, 'data persisted across reload');
  check(await page.isVisible('text=Evening, Jane!'), 'evening greeting');
  check(await page.isVisible('text=This week so far: 1 workout.'), '"this week so far" line');

  // Workout 2 (Wednesday): blanks take last time's values; a typed PB.
  await page.tap('[data-act="start"][data-sid="s-push"]');
  await settle(page);
  eq(await page.getAttribute(setBox(0, 2, 'a'), 'placeholder'), '20', 'last time\'s kg is the grey placeholder');
  eq(await page.getAttribute(setBox(0, 2, 'b'), 'placeholder'), '8', 'last time\'s reps is the grey placeholder');
  eq((await page.textContent('#card-0 .set[data-j="2"] .lastcell')).trim(), '20×8', '"Last" column shows 20×8');
  await page.fill(setBox(0, 0, 'a'), '22.5');
  check(await page.isVisible('#card-0 .pb-badge'), 'live PB badge as soon as the value beats the best');
  check(await page.getAttribute('#card-0', 'class').then(c => c.includes('is-pb')), 'card glows amber for a PB');
  check((await page.textContent('#card-0 .pb-badge')).includes('Best: 20kg before today'), 'PB badge shows the previous best');
  await shot(page, '04-live-pb');
  // Swap Lateral raise (index 4) for Bicep curl, today only; skip Cable fly.
  await page.tap('#card-4 [data-act="swap"]');
  await settle(page);
  check(await page.isVisible('.sheet >> text=Instead of Lateral raise'), 'swap sheet opens');
  await page.tap('.sheet [data-act="doSwap"][data-id="ex-bicep-curl"]');
  await settle(page);
  check(await page.isVisible('#card-4 >> text=Bicep curl'), 'exercise swapped in for today');
  await page.fill(setBox(4, 0, 'a'), '6'); await page.fill(setBox(4, 0, 'b'), '12');
  await page.tap('#card-5 [data-act="skip"]');
  await settle(page);
  eq(await page.locator('section.card').count(), 7, 'skip today removes the card');
  await page.tap('[data-act="finish"]');
  await settle(page);
  check(await page.isVisible('.cele-bg'), 'celebration overlay appears');
  check(await page.isVisible('.cele-title >> text=New personal best!'), 'celebration title');
  check(await page.isVisible('.cele-row >> text=Chest press'), 'celebration lists the exercise');
  eq((await page.textContent('.cele-now')).trim(), '22.5kg', 'shows the new value');
  eq((await page.textContent('.cele-was')).trim(), 'was 20kg', 'shows the old value');
  await shot(page, '05-celebration');
  await page.tap('[data-act="closeCelebrate"]');
  await settle(page);
  d = await doc(page);
  const w2 = d.workouts[1];
  eq(w2.date, '2026-10-28', 'second workout dated today');
  eq(w2.entries[0].sets, [{ a: 22.5, b: 10 }, { a: 20, b: 10 }, { a: 20, b: 8 }], 'blank boxes saved with last time\'s values');
  eq(w2.entries[1].sets, [{ a: 12, b: 10 }, { a: 12, b: 10 }, { a: 12, b: 10 }], 'untouched exercise saved exactly as last time');
  eq(w2.pbs, ['ex-chest-press'], 'PB stored on the workout');
  check(!w2.entries.some(e => e.exId === 'ex-lateral-raise'), 'swapped-out exercise not saved');
  check(w2.entries.some(e => e.exId === 'ex-bicep-curl'), 'swapped-in exercise saved');
  check(d.sessions[0].exIds.includes('ex-lateral-raise'), 'swap was for today only (session unchanged)');

  // Same session, same day again: replaces rather than duplicates.
  await page.tap('[data-act="start"][data-sid="s-push"]');
  await settle(page);
  eq(await page.getAttribute(setBox(0, 0, 'a'), 'placeholder'), '22.5', 're-doing a session today pre-fills what was saved earlier today');
  await page.fill(setBox(6, 0, 'b'), '9');
  await page.tap('[data-act="finish"]');
  await settle(page);
  check(await page.isVisible('.cele-bg'), 'today\'s PB is kept (and celebrated) when the session is re-saved');
  await page.tap('[data-act="closeCelebrate"]');
  await settle(page);
  d = await doc(page);
  eq(d.workouts.filter(w => w.date === '2026-10-28').length, 1, 'second Push today replaces the earlier one');
  eq(d.workouts[1].pbs, ['ex-chest-press'], 'PB survives the same-day re-save');

  // Body check in st & lb.
  await page.tap('[data-act="startBody"]');
  await settle(page);
  check(await page.isVisible('.body-band >> text=Body check'), 'body check opens');
  await page.tap('[data-act="unit"][data-unit="bw"][data-val="st"]');
  await settle(page);
  eq(await page.locator('#bcard-kg input').count(), 2, 'st & lb shows two boxes');
  await page.fill('input[data-k="kgA"]', '11');
  await page.fill('input[data-k="kgB"]', '4');
  await page.fill('input[data-k="waist"]', '80');
  await layoutChecks(page, 'body check');
  await shot(page, '06-body');
  await page.tap('[data-act="saveBody"]');
  await settle(page);
  check(await page.isVisible('text=Body check saved: 2 measurements'), 'body toast');
  d = await doc(page);
  eq(d.body, [{ date: '2026-10-28', kg: 71.7, waist: 80 }], 'stored in kg and cm; blanks skipped');
  eq(d.profile.bwUnit, 'st', 'unit choice remembered');
  const homeText = await page.textContent('#main');
  check(!/71\.7|11 st/.test(homeText), 'body weight never shown on the home screen');

  // Calendar.
  await tapTab(page, 'cal');
  check(await page.isVisible('text=October 2026'), 'calendar opens on this month');
  const c26 = await page.getAttribute('[data-date="2026-10-26"]', 'class');
  const c28 = await page.getAttribute('[data-date="2026-10-28"]', 'class');
  check(c26.includes('has') && !c26.includes('haspb'), 'Monday: filled circle, no PB star');
  check(c28.includes('has') && c28.includes('haspb') && c28.includes('hasbody'), 'Wednesday: circle, PB star and body dot');
  eq(await page.$eval('[data-date="2026-10-26"] .circ', e => getComputedStyle(e).backgroundColor), 'rgb(157, 23, 77)', 'circle in the session colour');
  check(await page.isVisible('[data-date="2026-10-28"] .pbmark'), 'PB star visible');
  check(await page.isVisible('[data-date="2026-10-28"] .bmark'), 'body dot visible');
  await page.tap('[data-date="2026-10-28"]');
  await settle(page);
  check(await page.isVisible('.detail .pb-mini'), 'day details tag the PB');
  check(await page.isVisible('.detail >> text=Body check'), 'day details list the body check');
  await shot(page, '07-calendar');
  await page.tap('[data-date="2026-10-27"]');
  await settle(page);
  check(await page.isVisible('text=Rest day. Nothing logged.'), 'rest day message');
  await page.tap('[data-act="calMove"][data-dir="next"]');
  await settle(page);
  check(await page.isVisible('text=November 2026'), 'next month');
  check(await page.$eval('.cal-clip > div', e => e.className.includes('cal-anim next')), 'month slides in the direction of travel');
  await page.tap('[data-act="calMove"][data-dir="prev"]');
  await settle(page);

  // Progress.
  await tapTab(page, 'progress');
  await page.tap('[data-act="prog"][data-id="ex-chest-press"]');
  await page.waitForTimeout(1300);
  eq(await page.locator('.chart-svg').count(), 2, 'weight exercise shows two charts');
  check(await page.$eval('.chart-svg .ln', e => e.getAttribute('d').length > 10), 'chart line drawn');
  check(await page.isVisible('text=Up 2.5 kg since 26 Oct.'), 'progress sentence');
  check(await page.isVisible('.pb-num >> text=22.5 kg'), 'personal best badge');
  await shot(page, '08-progress');
  await page.tap('[data-act="prog"][data-id="ex-bicep-curl"]'); // logged once (swapped in)
  await settle(page);
  check(await page.isVisible('text=Log this a couple of times'), 'fewer than 2 points: friendly message');
  eq(await page.locator('.chart-svg').count(), 0, 'no chart with only one point');
  await page.tap('[data-act="prog"][data-id="__kg"]');
  await settle(page);
  check(await page.isVisible('.pb-num >> text=11 st 4 lb'), 'body weight shown in st & lb on Progress');
  await layoutChecks(page, 'progress');

  // Settings: rename and reorder.
  await tapTab(page, 'settings');
  await layoutChecks(page, 'settings');
  await page.fill('input[data-in="exName"][data-id="ex-chest-press"]', 'Chest press machine');
  d = await doc(page);
  eq(d.exercises['ex-chest-press'].name, 'Chest press machine', 'exercise renamed');
  const grip = page.locator('.ex-row[data-id="ex-chest-press"] [data-grip]');
  const box = await grip.boundingBox();
  const rowH = await page.$eval('.ex-row[data-id="ex-chest-press"]', e => e.offsetHeight);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + (rowH + 10) * 1.2 * k / 12);
  check(await page.$eval('.ex-row[data-id="ex-chest-press"]', e => e.classList.contains('dragging')), 'row lifts while dragging');
  await page.mouse.up();
  await settle(page);
  d = await doc(page);
  eq(d.sessions[0].exIds.slice(0, 3), ['ex-shoulder-press', 'ex-chest-press', 'ex-incline-dumbbell-press'], 'drag handle reorders exercises');
  await page.tap('[data-act="openType"][data-id="ex-press-ups"]');
  await settle(page);
  eq(await page.locator('.sheet .type-card').count(), 4, 'Measures sheet shows four type cards');
  await page.tap('[data-act="closeOverlay"][data-x]');
  await settle(page);
  await shot(page, '09-settings');

  // Back up.
  check(await page.isVisible('text=Last backup: never'), 'backup starts as never');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.tap('.backup [data-act="backup"]')]);
  eq(dl.suggestedFilename(), 'repbook-backup-2026-10-28.json', 'backup file name');
  const file = path.join(os.tmpdir(), 'repbook-test-' + Date.now() + '.json');
  await dl.saveAs(file);
  await settle(page);
  const backedUp = JSON.parse(fs.readFileSync(file, 'utf8'));
  d = await doc(page);
  check(!!d.lastBackupAt, 'lastBackupAt recorded');
  eq(backedUp.workouts, d.workouts, 'backup contains every workout');
  check(await page.isHidden('text=Last backup: never'), 'last backup date shown');

  // Change something, then restore and get the backup back.
  await page.fill('#yname', 'Janet');
  await page.tap('[data-act="unit"][data-unit="len"][data-val="in"]');
  await settle(page);
  await page.setInputFiles('#restoreFile', file);
  await settle(page);
  check(await page.isVisible('.dlg >> text=Restore this backup?'), 'restore asks first (in-app dialog)');
  check(await page.isVisible('.dlg >> text=2 workouts, last on Wed 28 Oct'), 'restore shows a summary');
  await shot(page, '10-restore');
  await page.tap('.dlg [data-r="1"]');
  await settle(page);
  d = await doc(page);
  eq(d, Object.assign({}, backedUp, { draft: null }), 'restored data matches the backup exactly');
  const pre = await page.evaluate(() => new Promise(res => {
    const r = indexedDB.open('repbook');
    r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('preRestoreBackup'); g.onsuccess = () => res(g.result && JSON.parse(g.result.json)); };
  }));
  check(pre && pre.profile.name === 'Janet' && pre.profile.lenUnit === 'in', 'pre-restore copy kept in storage');

  // Reload one more time: still there, still no welcome.
  await page.reload();
  await settle(page);
  check(await page.isHidden('text=Welcome to Repbook'), 'no welcome after restore + reload');
  eq((await doc(page)).workouts.length, 2, 'restored data persisted');

  // The following week: round-up for 1–2 workouts, no nudge yet.
  await page.clock.setSystemTime(new Date('2026-11-04T09:00:00'));
  await page.reload();
  await settle(page);
  check(await page.isVisible('text=Nice work, Jane!'), 'last-week cheer for 1–2 workouts');
  eq(await page.$$eval('.wk-num', els => els.map(e => e.textContent)), ['2', '1', '1,865'], 'round-up: workouts, PBs, kg lifted (en-GB)');
  check(await page.isHidden('.nudge'), 'no backup nudge within 14 days');

  // Backup nudge after 14+ days.
  await page.clock.setSystemTime(new Date('2026-11-12T09:00:00'));
  await page.reload();
  await settle(page);
  check(await page.isVisible('.nudge >> text=Your last backup was 15 days ago.'), 'gentle backup nudge after 14 days');
  await shot(page, '11-nudge');

  check(page.errors.length === 0, 'no console errors or native dialogs' + (page.errors.length ? ' ' + JSON.stringify(page.errors) : ''));
  fs.unlinkSync(file);
  await ctx.close();
}

async function scratchJourney(browser) {
  console.log('\nFirst run → from scratch → create a session → add exercises');
  const { ctx, page } = await newPhone(browser, '2026-11-09T14:00:00');
  await page.goto(BASE);
  await settle(page);
  await page.tap('[data-act="welcome"][data-mode="scratch"]');
  await settle(page);
  eq((await doc(page)).sessions.length, 0, 'no sessions created');
  check(await page.isVisible('text=Create your first session'), 'home shows the empty state');
  await shot(page, '12-empty-home');
  await page.tap('text=Create your first session');
  await page.waitForTimeout(800);
  eq(await page.evaluate(() => document.activeElement && document.activeElement.id), 'newsess', 'goes to Settings with the session name box ready');
  await page.keyboard.type('Monday');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  eq(await page.evaluate(() => document.activeElement && document.activeElement.id), 'newex', 'adding a session goes straight to adding its exercises');
  check(await page.isVisible('text=Now add the exercises for Monday'), 'friendly prompt for the new session');
  await page.keyboard.type('Squat');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  eq(await page.evaluate(() => document.activeElement && document.activeElement.id), 'newex', 'name box ready for the next exercise');
  await page.tap('[data-act="newType"][data-t="time"]');
  await page.fill('#newex', 'Bike');
  await page.tap('[data-act="addEx"]');
  await page.waitForTimeout(500);
  const d = await doc(page);
  eq(d.sessions.map(s => s.name), ['Monday'], 'session created');
  eq(d.sessions[0].exIds.map(id => [d.exercises[id].name, d.exercises[id].type]), [['Squat', 'weight'], ['Bike', 'time']], 'exercises added with their types');
  await shot(page, '13-new-session');
  await tapTab(page, 'log');
  check(await page.isVisible('.tile >> text=Monday'), 'new session tile on home');
  check(await page.isVisible('.tile >> text=2 exercises'), 'tile shows exercise count');
  await page.reload();
  await settle(page);
  check(await page.isHidden('text=Welcome to Repbook'), 'welcome does not return');
  eq((await doc(page)).sessions[0].exIds.length, 2, 'sessions persisted');
  check(page.errors.length === 0, 'no console errors or native dialogs' + (page.errors.length ? ' ' + JSON.stringify(page.errors) : ''));
  await ctx.close();
}

async function draftAndOffline(browser) {
  console.log('\nMid-set safety + offline');
  const { ctx, page } = await newPhone(browser);
  await page.goto(BASE);
  await settle(page);
  await page.tap('[data-act="welcome"][data-mode="examples"]');
  await settle(page);
  await page.tap('[data-act="start"][data-sid="s-legs"]');
  await settle(page);
  await page.fill(setBox(0, 0, 'a'), '60');
  await page.reload(); // as if the app was closed mid-set
  await settle(page);
  eq(await page.inputValue(setBox(0, 0, 'a')), '60', 'typed value survives closing the app mid-set');

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await settle(page);
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await ctx.setOffline(true);
  await page.reload();
  await settle(page);
  check(await page.isVisible('.band >> text=Legs'), 'app loads offline with data intact');
  const font = await page.evaluate(() => document.fonts.check('900 20px Nunito'));
  check(font, 'Nunito loads offline');
  const manifestOk = await page.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()).then(m => m.start_url === './' && m.scope === './'));
  check(manifestOk, 'manifest served offline with relative start_url and scope');
  check(page.errors.filter(e => !/ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, 'no console errors' + (page.errors.length ? ' ' + JSON.stringify(page.errors) : ''));
  await ctx.close();
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try {
    await mainJourney(browser);
    await scratchJourney(browser);
    await draftAndOffline(browser);
  } catch (e) {
    failed++;
    console.log('  ✗ crashed: ' + (e && e.stack || e));
  }
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
