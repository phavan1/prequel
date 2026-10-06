# Prequel

The behind-the-scenes of everything you're becoming: a gentle companion for moving, eating, resting and getting through the days. It's a web app (PWA) you install on your iPhone from Safari. All your data stays on your phone.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The page that loads the app |
| `css/app.css` | All the styling (colours, layout) |
| `js/app.js` | Starts the app and switches screens |
| `js/store.js` | Where your data is saved, plus backup export/import |
| `js/data.js` | Your playbook workouts, the 13 weathers, food tags |
| `js/ui.js` | Shared helpers (the character, sheets, the date chip) |
| `js/screens/*.js` | One file per screen: home, weather, move, food, rest, wins, mind, letters, days, me |
| `art/*.webp` | The character poses |
| `icons/` | Home-screen icons |
| `manifest.webmanifest`, `sw.js` | What makes it installable and work offline |

## Try it on your laptop

In VS Code, install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.
(Opening the file directly by double-clicking won't work, because the app uses modules.)

## Put it on your iPhone (free, with GitHub Pages)

1. On github.com, create a new **public** repository called `prequel`.
2. Upload everything in this folder to it: on the repo page click **Add file → Upload files**, drag the folder's contents in, then **Commit changes**.
   (Or with Git: `git init`, `git add .`, `git commit -m "First version"`, then follow GitHub's "push an existing repository" steps.)
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch **main**, folder **/ (root)**, **Save**.
4. After a minute your app is at `https://<your-username>.github.io/prequel/`.
5. On your iPhone, open that link in **Safari** → **Share** → **Add to Home Screen**.

## Updating it later

Change the files, upload them again (or `git push`), and bump `VERSION` at the top of `sw.js` (e.g. `prequel-v2`) so phones fetch the new version. Close and reopen the app on your phone twice to see it.

## Your data

Everything is stored on the phone itself, never on a server. Use **Me → Save a backup** now and then, and keep the file in Files or iCloud Drive. **Restore** brings it back on any phone.
