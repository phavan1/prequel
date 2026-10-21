# Prequel development tools

Development-only helpers, saved on 12 October 2026 at v36. **None of this is part of the app:** nothing here is listed in `sw.js` `SHELL`, nothing is loaded by `index.html`, and GitHub Pages serving the files does nothing harmful.

## `art/`: cutting out new character pictures

The character pictures are made in ChatGPT on a plain white background, then cleaned here. The pipeline below reproduces the shipped `art/cgrab.webp` exactly from its original image (checked 12 Oct 2026).

Needs Python 3 with `pip install -r tools/art/requirements.txt` (OpenCV, NumPy, Pillow).

1. Put the original PNGs in a folder, named like `1-walk.png` (the part after the first `-` becomes the name).
2. `python tools/art/clean_art.py <in-folder> <step1-folder>`: removes the background, crops, 640 px webp.
3. `python tools/art/defringe.py <step1-folder> <step2-folder>`: removes light halos and punches out background trapped between arm and body.
   - `AUTO` lists names whose trapped gaps are found automatically. `HOLES` lists exact pixel spots for older pictures. Add new names when needed.
4. `python tools/art/holes.py <step2-folder>/<name>.webp check.png`: paints any remaining trapped light areas magenta. Look at it.
5. Check the picture on cream **and** dark backgrounds, rename it, copy it into `art/`, add it to `SHELL` in `sw.js`, and bump `VERSION`.

## `tests/`: browser tests (Playwright)

Each script opens the app in a phone-sized Chromium window, loads fictional data, clicks through one feature, saves screenshots to `tools/tests/shots/` (ignored by git) and prints `no errors` or the errors it saw.

| Script | Checks |
|---|---|
| `backup.js` | **Backup and restore audit**: full round trip, reload, duplicates, bad and damaged files, old backup, localStorage fallback, and (v38) the comparison sheet, older warning, 7-day undo, B3 and B5. Prints PASS/FAIL lines. |
| `share.js` | Every share-card type and look, saved as PNGs |
| `reports.js` | Sleep diary and food report PDFs, saved to `shots/` |
| `jar.js` | The jar: adding chips and written wins, removing from "In the jar today" |
| `quilt.js` | Quilt: soft-day patches, flip a patch, care label, previous month, dark mode |
| `meal.js` | Packet label with the decimal check, grams, Make a meal |
| `units.js` | Own goals with km and custom units, logging amounts, milestone card |
| `usuals.js` | (v37) Food usuals top 5 + "All your usuals" sheet, report empty states, no future dates. Prints PASS/FAIL lines. |
| `saving.js` | (v39) Saving and sharing as an Android phone vs an iPhone (PDF, card, backup), whole quilt card mid-month. Prints PASS/FAIL lines. |
| `jars.js` | (v41) Jars of 20–40, shapes, the celebration (incl. belated), lantern recall, dark sticky notes. Prints PASS/FAIL lines. |
| `moveorder.js` | (v42) Real exercise order, "Last time", Your sessions + Copy, Rest's Awake for a bit. Prints PASS/FAIL lines and the copied text. |
| `moveedit.js` | (v43) Not noted / Bar only / Body weight, body weight × reps, the ⋯ sheet, fixing the order, Copy on the done sheet, fixing past sessions in Days. Prints PASS/FAIL lines and the copied text. |
| `gymlast.js` | (v57) The gym's "Last time" from saved workouts (not the old last-set memory), swaps, fixed old workouts, the empty first set with a hint, Same again and ± from last time, the Weight button on Move and Food. Prints PASS/FAIL lines. |
| `games.js` | (v56) The soft-day games shelf; Keep it up and Stack the stars played by a little robot (counts, game speed, stars every 10, kind endings, bests, no zeros, your own emoji); the tab bar and back button following `?from=`. Prints PASS/FAIL lines. |
| `startup.js` | (v53) The start-up safety net: stuck storage, a file that fails to load, Fix and reopen. Prints PASS/FAIL lines. |
| `ontape.js` | (v51) On repeat: song search (simulated), preview, eras and the shelf, made covers and tunes, Listen in full, cards, backup checks. Prints PASS/FAIL lines. |
| `movehub.js` | (v48) Move hub: picker, tiles, sport fields, timer, milestones, Me counts, gym page, Days, backup checks. Prints PASS/FAIL lines. |
| `cycle.js` | (v46) Cycle: the optional period tracker on Days, estimate, privacy (no stars), backup checks. Prints PASS/FAIL lines. |
| `sleep.js` | (v45) The awake card (Breathe, Put it down, what woke you), six wake feelings and own words, doctor notes and the diary's Notes, quilt families, Move's Yellow hint, backup checks. Prints PASS/FAIL lines. |
| `news.js` | (v40, v44) What's new: once after an update, never for a new user, latest only + See all updates, Settings list. Prints PASS/FAIL lines. |
| `quick.js` | (v37) Move Quick session with and without reps, "Same as last time", the Days sheet for ticked sessions. Prints PASS/FAIL lines. |

`sample-backup.json` is **made-up data** (about two months, from the first week's format, so it also tests old-backup compatibility).

**How to run** (from the project folder):
```
cd tools/tests && npm install && npx playwright install chromium && cd ../..   # once
python -m http.server 8765              # in one terminal, serves the app
node tools/tests/backup.js              # in another
```
- `PREQUEL_URL=http://localhost:9000/` uses another address (on Windows PowerShell: `$env:PREQUEL_URL='http://localhost:9000/'`). `SHOTS=<folder>` saves screenshots elsewhere.
- The clock is fixed to dates in October 2026 so screenshots are repeatable. Some scripts set the time of day deliberately.
- These tests run in **desktop Chromium**. They don't prove anything about the iPhone: keyboard, share sheet, Add to Home Screen and storage still need checking on the phone (see `TEST_CHECKLIST.md`).
- They use a throwaway browser profile, so they never touch real data.
- The scripts click specific buttons (`[data-…]` attributes). If a screen changes, its script may need updating. That's expected.
- In Claude's cloud workspace, Playwright may already be installed globally: run with `NODE_PATH=$(npm root -g) node tools/tests/<script>.js`.

**Last run (17 Oct 2026, v48, Claude's workspace):** all twenty-one scripts ran with no page errors (21 Oct, v57); `gymlast.js` 16/16 (v58: one weight per place per day), `games.js` 24/24 (v56), `movehub.js` 35/35 (v50), `ontape.js` 29/29 (v55; also saves all three year-card looks), `startup.js` 6/6 (v53) (the Move scripts now pick Gym in the picker and open its tile first); `cycle.js` 14/14; `backup.js` 40/40, `usuals.js` 16/16, `quick.js` 17/17, `saving.js` 12/12, `news.js` 12/12, `jars.js` 15/15, `moveorder.js` 12/12 (updated for the Goodnight step), `moveedit.js` 15/15, `sleep.js` 24/24 (v47: Week by week) passed. (`jar.js` now closes the belated celebration first.)
