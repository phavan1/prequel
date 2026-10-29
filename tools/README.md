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
| `journey.js` | (v66) Your journey: the Me preview card, the page (filter, cards, no zeros or streaks, this week, year of dots, weeks, lifts, hill), Badminton / Sleep / Gym filters, workout length at Finish and in Fix this workout, the new done picture. Prints PASS/FAIL lines. |
| `moverep.js` | (v61) Me's "last two weeks of nights" (rows, naps striped, the usual times line) and the Move report PDF (glance, weight, gym first/latest/best, other activities, key, privacy of highlights and notes, the empty case). Saves `moverep.pdf`. Prints PASS/FAIL lines. |
| `notes.js` | (v60) The × on Mind notes and lanterns (asks once, Keep it / Remove it, the lantern's star goes too), and the talking head on the gym page. Prints PASS/FAIL lines. |
| `gymlast.js` | (v57–v59) Bar +, Next/Log taking the faint hint, the gym's "Last time" from saved workouts (not the old last-set memory), swaps, fixed old workouts, the empty first set with a hint, Same again and ± from last time, the Weight button on Move and Food. Prints PASS/FAIL lines. |
| `hometab.js` | (v73) No minutes card on Your moving journey and the cards fill the grid (Everything, Gym, Walk); a gym session's length is kept but not in the copied text or Fix this workout; the Home tab leaves the soft page (day stays soft), the soft ask goes back, a game's ‹ Home returns to the soft page, Home from another tab, Home on Home scrolls to the top. |
| `weightunit.js` | (v71) kg or lb: the guess (Australia kg, English (US) in India kg, the US lb), the one-time "earlier numbers in pounds?" (Yes keeps them as typed; plates untouched; No keeps kg), the gym in lb (labels, hints, ±5, Same again exact, Bar + in lb, saved in kg), Fix this workout in lb (untouched numbers go back exactly), Move's first setup question, body weight in lb, the Settings switch, Your moving journey in lb. Uses Playwright's `locale` and `timezoneId`. |
| `restring.js` | (v70) Rest's ring draws a night that crosses 12am all the way round, the night stays whole on the wake-up day, and the yellow past-day chip has readable text (contrast checked). |
| `road.js` | (v68, v69 gears) Slow ride: gears (Easy about 22, Breezy about 50 km/h, remembered), the shelf card (no zeros, then km ridden), the total carries on, it rides by itself, drag steering and drifting back, every place drawn (screenshots `rd-*.png`), the toast and saved distance on leaving, Rest's Wind down row and Back. |
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

**Last run (25 Oct 2026, v66, Claude's workspace):** all scripts ran with no page errors (25 Oct, v66; `journey.js` 27/27 at v67; 29 Oct, v73: `hometab.js` 14/14, `journey.js` 27/27 (updated: no minutes card, no HOW LONG box), `moverep.js` 18/18, `moveedit.js` 15/15, `games.js` 24/24, `gymlast.js` 28/28; 27 Oct, v71: `weightunit.js` 29/29, `gymlast.js` 28/28, `moveedit.js` 15/15, `movehub.js` 35/35 (its milestone check now skips the kg/lb box), `moverep.js`, `journey.js`, `quick.js`, `moveorder.js`, `usuals.js`, `units.js`, `notes.js` all pass, `backup.js` 40/40 (ignores `weightUnit`/`lbAsked`, which start-up fills in by design); v70: `restring.js` 4/4, `sleep.js` 24/24, `backup.js` 40/40; 26 Oct, v69: `road.js` 19/19; v68: `games.js` 24/24 with four games, `backup.js` 40/40, `news.js`, `sleep.js`); `moverep.js` 18/18 (v62: last 4 weeks), `notes.js` 9/9 (v60), `gymlast.js` 28/28 (v65: Bar + and + Add a set in Fix this workout), `games.js` 24/24 (v56), `movehub.js` 35/35 (v50), `ontape.js` 29/29 (v55; also saves all three year-card looks), `startup.js` 6/6 (v53) (the Move scripts now pick Gym in the picker and open its tile first); `cycle.js` 14/14; `backup.js` 40/40, `usuals.js` 16/16, `quick.js` 17/17, `saving.js` 12/12, `news.js` 12/12, `jars.js` 15/15, `moveorder.js` 12/12 (updated for the Goodnight step), `moveedit.js` 15/15, `sleep.js` 24/24 (v47: Week by week) passed. (`jar.js` now closes the belated celebration first.)
