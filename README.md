# Prequel

*The behind-the-scenes of everything I'm becoming.*

A gentle, private lifestyle companion for one person's iPhone. You can log moving, eating, resting, the weather inside, and small wins, and they slowly turn into a night sky, monthly quilts, a jar of paper stars, share cards and PDF reports. There are no streaks, scores or zeros. It works fully offline, and data never leaves the phone.

**Live:** https://phavan1.github.io/prequel/ (open in Safari → Share → Add to Home Screen)
**Current version:** see `VERSION` in `sw.js` (v36 on 12 October 2026).

## Built with
- Plain HTML, CSS and JavaScript modules. No framework, no build step, no backend.
- IndexedDB on the phone (localStorage fallback), with JSON backup and restore in Settings.
- A service worker (`sw.js`) caches every file for offline use. Fonts and the food database (`data/foods.json`, INDB + USDA SR27) are bundled.
- PDFs and share cards are drawn on canvas, offline.

## Folders
```
index.html, manifest.webmanifest, sw.js   the app shell and offline cache
css/app.css                               all styles (light and cosy dark)
js/                                       app.js (router), store.js (data), ui.js, reports, cards, pdf…
js/screens/                               one file per screen
art/  fonts/  icons/  data/               pictures, fonts, icons, food database
tools/                                    development only: art clean-up scripts and browser tests
```

## Run it locally
```
python -m http.server 8765
```
Then open http://localhost:8765/. Any static file server works. Use a private window, or clear site data, to start clean. Never test with a real backup.

## Deploy
GitHub Pages serves the `main` branch root. To release: bump `VERSION` in `sw.js` (and add any new file to `SHELL`), commit and sync in VS Code, then close and reopen the app on the iPhone.

## Documentation
- [START_HERE.md](START_HERE.md): read first (also for a new Claude conversation)
- [HANDOVER.md](HANDOVER.md): architecture, data, features, backup audit, known issues
- [DECISIONS.md](DECISIONS.md): principles, confirmed decisions, rejected ideas, proposals
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md): what to test, in a browser or on the iPhone
- [tools/README.md](tools/README.md): art scripts and browser tests
