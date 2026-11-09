# repbook
Repbook – a simple gym tracker made for Jane (installable web app)

Live at **https://frasersuttie.github.io/repbook/**

## What's here

- `index.html`, `styles.css`, `app.js` – the whole app. Plain HTML/CSS/JS, no build step, no frameworks, no network calls.
- `sw.js` – service worker (cache-first, so it works offline). **Bump `CACHE_VERSION` on every release.**
- `manifest.webmanifest`, `icons/` – install-to-home-screen bits. Icons are made by `python3 tools/make-icons.py` (needs Pillow).
- `fonts/` – Nunito 400–900 (woff2, SIL Open Font Licence in `fonts/OFL.txt`).
- `tests/smoke.js` – Playwright smoke tests at iPhone 14 Plus size (428×926, touch).
- `BUILD-BRIEF.md` – the agreed spec. `CLAUDE.md` – rules for building in this repo. `reference/` – the signed-off mock-up.

## Run it locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123/.

## Test it

With the server above running:

```bash
node tests/smoke.js
```

Set `SHOTS=/some/folder` to save screenshots of each step.

## Jane's data

Everything is stored on her phone (IndexedDB, mirrored to localStorage) as one JSON document with a `schemaVersion`.

- To change the data shape, bump `SCHEMA_VERSION` in `app.js` and add a step to `MIGRATIONS`. A copy of the old data is kept as `preMigrationBackup` before a migration runs.
- Restoring a backup keeps the data it replaced as `preRestoreBackup`.
- Defaults are only written into empty storage (the first-run welcome screen).
