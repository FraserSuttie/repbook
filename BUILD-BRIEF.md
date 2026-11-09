# Repbook – build brief

Repbook is a gym tracker for **Jane** (Fraser's mum), used on her **iPhone 14 Plus**. The design was agreed with her over five rounds of clickable mock-ups. This brief records every decision, so the build can go straight from here to a working, installable app.

**Goal for today:** a working app at `https://frasersuttie.github.io/repbook/`, added to Jane's iPhone home screen, with a test workout done and a test backup saved. Jane will set up her own sessions afterwards (see §2, "First run").

---

## 1. Platform & stack

- **Installable web app (PWA)**, hosted on **GitHub Pages** from `main` / root. No App Store.
- **Plain HTML + CSS + vanilla JS. No build step and no frameworks.** Keep it to a few files: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `icons/`.
- **No runtime network dependencies.** It must work fully offline in a gym basement:
  - Vendor or inline everything.
  - Charts are hand-drawn inline SVG, as in the mock-up. No chart library needed.
  - Fonts: bundle **Nunito** (woff2, weights 400/600/700/800/900) in `fonts/`, with a system-ui fallback.
- **Service worker:** cache-first for the app shell. Bump a `CACHE_VERSION` on each release so updates arrive.
- **iOS specifics:**
  - `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style`, and an `apple-touch-icon` (180×180 PNG).
  - `viewport-fit=cover`, with `env(safe-area-inset-*)` padding for the notch and home bar.
  - Use `100dvh`, not `100vh`.
  - Inputs need `font-size ≥ 16px`, otherwise iOS zooms in on focus.
  - Number boxes use `type="text" inputmode="decimal"` (reps use `numeric`).
- **Manifest:** `start_url: "./"`, `scope: "./"` (relative, because the site lives under `/repbook/`), `display: "standalone"`, `theme_color: #9D174D`, `background_color: #FFF6FA`, name "Repbook", short_name "Repbook".
- **Icon:** plum (#9D174D) rounded square with a white open-book mark, as in the mock-up header. Generate the PNGs (180, 192, 512) with a script and commit them.

## 2. Data, storage & safety (most important)

Jane must **never lose her data**.

- **Storage:**
  - Store everything as a single JSON document in **IndexedDB**, falling back to localStorage.
  - Write it **on every change**, so nothing is lost if the app is closed mid-set.
  - Call `navigator.storage.persist()` on first run.
- **Schema versioning:**
  - The document has a `schemaVersion` field, and old documents are upgraded through migration functions.
  - **Never overwrite existing stored data with defaults.** Seed the defaults only when storage is empty.
  - This is a lesson from a previous project, where saved browser data silently masked new defaults and changes to the data model needed a migration.
- **Back up:**
  - Exports the full JSON as `repbook-backup-YYYY-MM-DD.json` via the **Web Share API** (`navigator.share({ files })`), so she can save it to Files / iCloud Drive or email it to herself.
  - If sharing isn't supported, fall back to a download.
  - Record `lastBackupAt`.
- **Restore:**
  - A file input.
  - Validate the file, show a summary ("142 workouts, last on …"), and confirm with an in-app dialog (no `alert`/`confirm`) before replacing anything.
  - Keep the previous data as `preRestoreBackup` in storage.
- **Backup nudge:** a gentle banner if she hasn't backed up for 14 days or more (and has data).
- **Start with no fake history.** The mock-up's 12 weeks of sample data was for demo only.
- **First run (Jane sets up her own sessions):** her real exercise list isn't available, so she'll create it herself in the app. When storage is empty, show a friendly welcome screen ("Welcome to Repbook, Jane!") with two choices:
  - **"Start with example sessions"** loads the §9 lists. Add the line: "You can rename, reorder or delete any of these in Settings."
  - **"Start from scratch"** creates no sessions. The home screen then shows an empty state with a big **"Create your first session"** button that goes to Settings.
  - The welcome screen only ever shows when storage is empty, never again after that.
- Make setting up easy:
  - Adding a session should take her straight to adding its exercises.
  - Adding an exercise keeps the keyboard flow quick (name → type → Add, then the name box is ready for the next one).
  - Make the session and exercise editing in Settings really clear, because she'll be doing it alone.

Suggested shape:

```json
{
  "schemaVersion": 1,
  "profile": { "name": "Jane", "bwUnit": "kg", "lenUnit": "cm" },
  "exercises": { "<id>": { "id": "", "name": "", "type": "weight|reps|time|distance" } },
  "sessions": [ { "id": "", "name": "", "color": "#9D174D", "exIds": [] } ],
  "workouts": [ { "id": "", "date": "YYYY-MM-DD", "sessionId": "", "entries": [ { "exId": "", "sets": [ { "a": 12.5, "b": 10 } ] } ], "pbs": ["<exId>"] } ],
  "body": [ { "date": "YYYY-MM-DD", "kg": 70.4, "bust": 95, "waist": 80, "hips": 103, "thighs": 57 } ],
  "lastBackupAt": null
}
```

Set values: `a` is kg for weight types, minutes for time and km for distance. `b` is reps, used for the weight and reps-only types. Body lengths are stored in **cm** and weight in **kg**, and are converted only for display.

## 3. Look & feel: the "Berry" theme

The visual reference is `reference/Repbook3-mockup.dc.html`. Its styles are in the `<style>` block, and the classes and tokens can be reused.

- Background `#FFF6FA`, surface `#FFFFFF`, ink `#2B0F1E`, muted `#6E5162`, line `#F2DCE7`, soft `#FBE7F0`, placeholder grey `#9C8392`, accent **`#9D174D`**, radius 26px.
- Session colours: `#9D174D`, `#6D28D9`, `#0E7490`, `#B45309`, `#15803D` (in that order, cycling). Body check and PB colour: amber `#F59E0B`.
- Font: **Nunito**, with headings in weight 900.
- Touch targets are at least 44px. Text contrast is AA. Respect `prefers-reduced-motion`.

## 4. Screens

There's a bottom tab bar with **Workout · Calendar · Progress · Settings**. A soft highlight pill slides between the tabs, and the active tab's icon does a small hop.

### Workout (home)
- A Repbook logo row, then a greeting by time of day: **"Morning, Jane!" / "Afternoon, Jane!" / "Evening, Jane!"**, with the subtitle "What are we training today?". The name comes from Settings.
- **"Last week" round-up card** (previous Monday–Sunday): workouts, PBs and kg lifted (total volume of weight exercises).
  - Cheer line: "Brilliant week, Jane!" for 3 or more workouts, "Nice work, Jane!" for 1–2, and "Fresh week, fresh start, Jane." for none.
  - Below it, a "This week so far: …" line.
- **Session tiles** in a 2-column grid, each in its session colour, showing the name, number of exercises and "Last done Mon 2 Nov".
- A **Body** tile (soft background, amber tape-measure icon, "Weight & measurements", last check date) and a **+ New session** tile that goes to Settings.
- **Her body weight is never shown on the home screen.** She asked for this specifically.

### Logging a workout
- A colour band with the session name, "3 of 8 done", a progress bar and Cancel.
- One card per exercise:
  - Name, plus "x of 3 sets".
  - A table with the columns **Set | Last | kg | reps**. "Last" shows last time's set, e.g. `20×10`.
  - **Always exactly 3 set rows** for the weight and reps-only types. Time and distance get 1 row.
- **Last time's values are pre-filled as grey placeholders.** Typing overwrites them. **Any box left blank is saved with last time's value.** There are **no tick boxes**: she rejected them.
- A row counts as filled once it has the values its type needs, and the input border turns accent. A card is complete when all its rows are filled.
- **Swap** opens a bottom sheet listing her other exercises (from all sessions) and swaps one in for **today only**. **Skip today** removes the exercise from this workout.
- **Live PB:** as soon as a typed value beats her all-time best for that exercise, the card glows amber and shows "★ New PB! Best: 27.5kg before today".
- **Finish & save** saves the workout. If there are PBs, it shows a **celebration** overlay: confetti, a trophy, "New personal best!" (or "N new personal bests!"), a list like "Chest press · 30kg (was 27.5kg)", and a "Woohoo!" button.
- Saving a second workout for the same session on the same day replaces the earlier one.

### Body check (from the Body tile)
- An amber band titled "Body check".
- Cards in the same style as the exercise cards:
  - **Weight**, with a kg / st & lb switch. In st & lb it shows two boxes.
  - **Bust, Waist, Hips, Thighs**, with a cm / inches switch.
- Each card shows "Last time (date): value", with grey placeholders.
- **Blanks are skipped here, not copied.** She doesn't measure everything every time.
- Saving merges with any entry for today and shows a toast: "Body check saved: N measurements · Graphs".

### Calendar
- A month grid with the **week starting Monday**. Prev/next arrows **slide** the month smoothly left or right in the direction of travel.
- Workout days show a **filled circle** in the session's colour with a white day number. Today has a ring.
- A small **amber dot** marks body check days, and a small **star** marks PB days.
- Legend: one entry per session, plus Body check and New PB.
- Tapping a day shows a details panel listing each workout's exercises and sets (with "PB" tags) and any body measurements. A rest day shows "Rest day. Nothing logged."

### Progress
- A horizontal row of pills. **Weight, Bust, Waist, Hips, Thighs** come first (dashed outline), followed by every exercise.
- **For exercises:**
  - A personal best badge (trophy, PB value and date) and a sentence like "Up 5 kg since 14 Aug. Latest: 27.5 kg."
  - **Two charts:** heaviest weight per session (or most reps / longest time / furthest distance, depending on type), and **total volume** (sets × reps × kg; weight type only).
- **For body stats:** latest value and date, change over 4 weeks, a unit switch, a sentence like "Down 1.2 kg since …", one chart, and a "Recent" list of the last 5 entries.
- The charts **draw themselves in** (stroke-dash animation) whenever she switches pill.
- With fewer than 2 data points: "Log this a couple of times and your progress will show up here."

### Settings
- **"Your name"** (letter avatar) and the units: body weight in kg / st & lb, and measurements in cm / inches. Add the note: "Exercise weights always stay in kg."
- **Sessions & exercises:**
  - Session chips to pick a session, rename it, delete it (at least one must remain), and add a new one.
  - Exercise rows with an editable name, a **drag handle** to reorder (pointer events with `setPointerCapture` and `touch-action: none` on the handle, and the row lifts while dragging), and a delete button.
  - A **"Measures"** button opens a bottom sheet with **four cards**: Weight & reps (e.g. 12.5kg × 10), Reps only (e.g. 12 press-ups), Time (e.g. 20 minutes) and Distance (e.g. 2 km). **No native `<select>`**: she asked for it to match the app.
- **Add an exercise:** a name box, the same four type cards in a 2×2 grid, and "Add exercise".
- **Your data:** "Last backup: …", **Back up now**, **Restore from a backup**, and a short explanation.

## 5. Units

- **Exercise weights: kg only.**
- **Body weight** in kg or st & lb, using 1 st = 6.35029318 kg and 1 lb = 0.45359237 kg. Display st & lb by rounding to whole lb.
- **Measurements** in cm or inches (1 in = 2.54 cm), shown to 1 decimal place.
- Format numbers without trailing zeros (12.5, 30, 0.75).

## 6. PB & round-up logic

- **Top value per exercise per workout:**
  - weight: max kg across sets with reps > 0
  - reps only: max reps
  - time: max minutes
  - distance: max km
- **A PB** is a top value greater than the best of all **earlier** workouts. The first time an exercise is ever logged doesn't count as a PB.
- Store `pbs: [exId]` on each workout when it's saved.
- **Weekly round-up:** last Monday–Sunday, giving the workout count, the sum of PBs and total volume, with the volume shown using en-GB thousands separators.

## 7. Motion (smooth, consistent, never janky)

- **Page changes:** fade with a 20px slide over 360ms, `cubic-bezier(.22,1,.36,1)`. Slide forward when moving right through the tabs or starting something, and backward when going left, cancelling or finishing.
- **Calendar months:** slide 70px with a fade over 450ms in the direction of travel.
- **Bottom sheets:** rise from the bottom over 420ms, with the backdrop fading in.
- **Celebration:** a springy pop (`cubic-bezier(.34,1.56,.64,1)`), a trophy wiggle, and CSS-only confetti.
- **Small touches:** buttons and tiles squish slightly when pressed, the progress bar eases, and toasts fade up.
- Animate only `transform` and `opacity`. Honour `prefers-reduced-motion`.

## 8. Testing & definition of done

- **Run locally:** `python3 -m http.server`.
- **Smoke tests with Playwright** at an iPhone 14 Plus viewport (**428×926**, `isMobile`, `hasTouch`):
  - start a session, type values, leave blanks, finish, and check that the blanks saved last time's values
  - trigger a PB and check the celebration appears
  - do a body check in st & lb
  - check the calendar dots, circles and stars
  - check the progress charts render
  - rename and reorder an exercise
  - back up, restore, and get the same data back
  - first run: both paths work (example sessions, and from scratch → create a session → add exercises)
  - reload, and check the data persisted, wasn't reseeded, and the welcome screen didn't come back
- **Offline:** check it with the service worker (load once, go offline, reload).
- **Deploy:** push to `main`, then enable GitHub Pages under Settings → Pages → Deploy from branch → `main` / root. Check `https://frasersuttie.github.io/repbook/` loads and the manifest and icons resolve.
- **Hand-over on Jane's iPhone:**
  1. Open the link in **Safari**, tap Share → **Add to Home Screen**, and open Repbook from the icon.
  2. Do a test workout.
  3. Do a test **Back up**, saving to iCloud Drive.
  4. Tell her: **never delete the icon or clear Safari website data without backing up first.**

## 9. Example sessions (offered on first run, all editable)

- **Push:** Chest press, Shoulder press, Incline dumbbell press, Tricep pushdown, Lateral raise, Cable fly, Press-ups (reps), Treadmill walk (time).
- **Upper body:** Lat pulldown, Seated row, Bicep curl, Face pull, Hammer curl, Reverse fly, Assisted pull-up, Plank (time).
- **Legs:** Leg press, Goblet squat, Leg curl, Leg extension, Hip thrust, Calf raise, Glute bridge (reps), Rowing machine (distance).

## 10. Out of scope (for now)

- "Ready to go up?" progression nudges
- Exercise notes
- Rest timer
- Cloud sync / accounts

These are possible later additions. Don't build them today.
