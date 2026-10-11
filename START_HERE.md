# START HERE

_For Phavan and for any new Claude conversation. Written on 12 October 2026. This file doesn't depend on any earlier conversation._

## 1. What this is
**Prequel** is Phavan's personal iPhone web app (PWA): a kind, offline, private lifestyle companion. Logs of moving, food, rest, feelings and small wins become a night sky, quilts, a jar of stars, share cards and PDF reports.
**Version: v36** (`const VERSION = 'prequel-v36'` in `sw.js`). There are no app code changes after v36; only docs and `tools/` were added.

## 2. Where it lives
- **Code:** `C:\Users\Phava\Documents\companion-app` on Phavan's Windows laptop (a git repo, branch `main`). Claude reaches it through the Claude desktop app link, when the conversation is linked to his computer.
- **GitHub:** `phavan1/prequel` (public), deployed by GitHub Pages to https://phavan1.github.io/prequel/
- **Claude Project "Creative stuff":** the doc `claude/prequel-build-status.md` is the running tracker and version history.

## 3. Read in this order
1. This file
2. `HANDOVER.md`: architecture, data model, features, backup audit (5b), known issues, pending decisions
3. `DECISIONS.md`: principles, confirmed decisions, rejected features, **unapproved proposals**
4. `TEST_CHECKLIST.md`: what to test, in a browser or on the iPhone
5. `tools/README.md`: art scripts and browser tests
6. The Project doc `claude/prequel-build-status.md`

## 4. Source files to look at first
`sw.js` (VERSION, SHELL) → `js/app.js` (routes) → `js/store.js` (state, `fresh()`, backup) → `js/ui.js` (sheets, `FROM` back-button map) → then only the screen in `js/screens/` you're asked to change.

## 5. How to find the current state
- Version: `VERSION` in `sw.js`.
- Latest work: the last commit message (they read `vN: …`), and the tracker's version table.
- Whether GitHub matches the laptop: VS Code's Source Control shows no ↑/↓ numbers, or the latest commit on github.com/phavan1/prequel matches. On 12 Oct 2026 both were at the commit "Handover documents created and updated" (`9199dae`). The tools and README from the final handover still need committing by Phavan.
- **The code is the truth.** If these docs disagree with the code, trust the code and say so.

## 6. Preserved development tools (in `tools/`)
- `tools/art/`: `clean_art.py`, `defringe.py`, `holes.py`. They turn a ChatGPT picture into a clean 640 px webp cut-out.
- `tools/tests/`: Playwright scripts (`backup`, `share`, `reports`, `jar`, `quilt`, `meal`, `units`) and `sample-backup.json` (**made-up data**).
- Not recoverable: the script that built `data/foods.json`, and the exact ChatGPT character prompt (the look is described in `DECISIONS.md` D).

## 7. Rules that matter most
- **Kind always:** no streaks, scores, percentages, comparisons or zeros. Say "soft day", never "heavy".
- **Offline always; private always:** no backend, no analytics, data stays on the phone.
- **Dates in words. Colour never the only signal.**
- **The same character** in every picture (cobalt-blue hoodie, round glasses, messy black hair).
- **Talk first:** discuss, give options and a recommendation, and show screenshots **before** pushing. Use plain, non-technical language.
- **Claude never commits, pushes or deploys.** Phavan does, in VS Code.
- Don't build anything listed as a proposal in `DECISIONS.md` until he says yes.
- Keep health details, real backups and personal notes out of the repo.

## 8. How work is done
1. Re-read the files you'll change. Make small, targeted edits; after any find-and-replace, confirm it actually happened. (A silent bad replace broke the goal sheet from v25 to v34.)
2. Check syntax (`node --input-type=module --check < file.js`), then run the relevant `tools/tests/` script. Look at the screenshots.
3. Bump `VERSION` in `sw.js`, and add any new app file to `SHELL` (**never** `tools/`).
4. Write the changed files to the laptop, read them back and compare.
5. Give Phavan a commit message like `v37: …`. He commits and syncs, then closes and reopens the app on his iPhone.
6. Say clearly what was tested in a browser and what needs his phone.

## 9. Waiting on Phavan
- **Night chips on Rest:** remove, replace with one "awake for a bit" button, or show them only at night.
- **Weather row** in the sleep diary.
- **Goal celebration** (and loud or quiet?).
- **Mind page redesign** (not designed yet).
- **Indian rice names** in food search.
- **Backup restore fixes B1–B5** (HANDOVER 5b). B1 matters most: a wrong file with a `moments` list replaces everything.
- **Confirm on iPhone:** "Save and log" on the packet-label sheet.
- Small things not yet discussed: the bottom tab bar highlights Home on sub-pages; Home's date order.

## 10. How not to break things
- Don't rebuild, restyle or "tidy up" working screens unless asked. Change only what the request needs.
- Don't rename or remove state fields. Old backups must keep restoring, so run `tools/tests/backup.js` after touching data.
- Don't touch `data/foods.json` by hand; the script that built it is gone.
- Don't remove the unused art (`waving`, `lying`, `stickynote`) or the `comfort` data without asking.
- If something unexpected shows up (uncommitted changes, a different version), **stop and tell Phavan** before doing anything.

---

### Opening prompt for a new conversation (copy and paste)

> We're continuing development of Prequel, my iPhone web app. The project is at `C:\Users\Phava\Documents\companion-app`. Please read `START_HERE.md` first, then `HANDOVER.md`, `DECISIONS.md`, `TEST_CHECKLIST.md` and `tools/README.md`, and the Project doc `claude/prequel-build-status.md`. Then look at the actual code (`sw.js`, `js/app.js`, `js/store.js`, `js/ui.js`) and check the current version and that there are no uncommitted changes. Tell me briefly, in plain language, what you understand about the app, its current state, and the decisions waiting on me, and point out anything in the docs that doesn't match the code. **Don't change, commit or build anything yet.** Wait for my instructions.
