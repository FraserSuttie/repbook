# Repbook

A gym-tracker PWA for Jane (Fraser's mum), used on an iPhone 14 Plus and hosted on GitHub Pages at `https://frasersuttie.github.io/repbook/`.

**Start by reading `BUILD-BRIEF.md`.** It is the agreed spec. Every design decision in it came from Jane, so don't redesign it, change features, or add any from its "out of scope" list without asking Fraser.

The visual and behavioural reference is in `reference/`:
- `Repbook3-mockup.dc.html` is the final clickable mock-up. It's built for Claude's design canvas, so it won't run standalone. Use its `<style>` block and markup for the look, and the `<script>` block for the logic.
- `mockup-logic.js` is the same logic as a readable file.

## Rules

- **Never lose or overwrite Jane's data.**
  - Seed defaults only into empty storage.
  - Change the data shape only through `schemaVersion` migrations.
  - A restore must confirm first and keep a pre-restore copy.
- **No build step, frameworks or runtime CDN calls.** The app must work fully offline. Vendor the fonts.
- **No native `alert` / `confirm` / `prompt`, and no native `<select>`.** Use in-app sheets and dialogs.
- **Test at 428×926 (iPhone 14 Plus)** with touch enabled before pushing. Check that it still works offline.
- **Bump the service worker cache version on every release.**
- Fraser reviews and sends anything that goes out under his name. This repo is just code.
