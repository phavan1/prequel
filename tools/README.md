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
| `backup.js` | **Backup and restore audit**: full round trip, reload, duplicates, bad files, old backup, localStorage fallback. Prints PASS/FAIL lines. |
| `share.js` | Every share-card type and look, saved as PNGs |
| `reports.js` | Sleep diary and food report PDFs, saved to `shots/` |
| `jar.js` | The jar: adding chips and written wins, removing from "In the jar today" |
| `quilt.js` | Quilt: soft-day patches, flip a patch, care label, previous month, dark mode |
| `meal.js` | Packet label with the decimal check, grams, Make a meal |
| `units.js` | Own goals with km and custom units, logging amounts, milestone card |

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

**Last run (12 Oct 2026, v36, Claude's workspace):** all seven scripts ran with no page errors; `backup.js` 21 of 21 passed.
