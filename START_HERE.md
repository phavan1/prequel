# START HERE

_For Phavan and for any new Claude conversation. Written on 12 October 2026; last updated 17 October 2026 (v46). This file doesn't depend on any earlier conversation._

## 1. What this is
**Prequel** is Phavan's personal iPhone web app (PWA): a kind, offline, private lifestyle companion. Logs of moving, food, rest, feelings and small wins become a night sky, quilts, a jar of stars, share cards and PDF reports.
**Version: v46** (`const VERSION = 'prequel-v46'` in `sw.js`). v46 (17 Oct 2026): Cycle, an optional private period tracker on Days (a first version for feedback). v45 (17 Oct 2026): gentler nights on Rest: the Awake card offers Breathe with me and Put it down for the morning, Back to sleep asks an optional "What woke you?", six wake feelings plus your own words, Notes for your doctor in the sleep diary, and a soft Yellow hint on Move after a rough night. v44: What's new shows only the latest update, with "See all updates". v43: Not noted / Bar only / Body weight, body weight × reps, the ⋯ sheet, Copy on the done sheet, fixing past workouts. v42: Move shows your real exercise order and keeps your sessions with Copy; Rest's "Awake for a bit". v41: jars of 20–40 stars in three shapes with a real celebration, calling lanterns back, readable sticky notes. v40: a "What's new" window after each update, also kept in Settings. v39: "Save to this phone" on Android and computers, and a whole quilt on the share card. v38: a safer backup restore with a 7-day undo. v37: no logging on future dates, top-5 usuals with an "All your usuals" sheet, kind empty states for the food report and sleep diary, and Quick session on Move. See the tracker's version table for the history.

## 2. Where it lives
- **Code:** `C:\Users\Phava\Documents\companion-app` on Phavan's Windows laptop (a git repo, branch `main`). Claude reaches it through the Claude desktop app link, when the conversation is linked to his computer.
- **GitHub:** `phavan1/prequel` (public), deployed by GitHub Pages to https://phavan1.github.io/prequel/
- **Claude Project "Creative stuff":** the doc `claude/prequel-build-status.md` is the running tracker and version history.

## 3. Read in this order
1. This file
2. `HANDOVER.md`: architecture, data model, features, backup audit (5b), known issues, pending decisions
3. `DECISIONS.md`: principles, confirmed decisions, rejected features, **unapproved proposals**, and how Phavan likes to work (section F)
4. `TEST_CHECKLIST.md`: what to test, in a browser or on the iPhone
5. `tools/README.md`: art scripts and browser tests
6. The Project doc `claude/prequel-build-status.md`
7. Then the actual code (section 4)

## 4. Source files to look at first
`sw.js` (VERSION, SHELL) → `js/app.js` (routes) → `js/store.js` (state, `fresh()`, backup) → `js/ui.js` (sheets, `FROM` back-button map) → then only the screen in `js/screens/` you're asked to change.

## 5. How to find the current state
- Version: `VERSION` in `sw.js`.
- Latest work: the last commit message (app releases read `vN: …`), and the tracker's version table.
- Whether GitHub matches the laptop: VS Code's Source Control shows no ↑/↓ numbers, or the latest commit on github.com/phavan1/prequel matches. **Last checked 14 Oct 2026:** laptop `main`, the git index and GitHub `main` were all at `609bbc9` ("Handover: preserve dev tools, backup audit, START_HERE and README"), with no uncommitted or untracked files. (The docs cleanup of 14 Oct comes after that; see the tracker.)
- If the conversation can't run git on the laptop, compare `.git/refs/heads/main` with `.git/refs/remotes/origin/main`, and the working files against `.git/index`.
- **The code is the truth.** If these docs disagree with the code, trust the code and say so.

## 6. Preserved development tools (in `tools/`)
- `tools/art/`: `clean_art.py`, `defringe.py`, `holes.py`. They turn a ChatGPT picture into a clean 640 px webp cut-out.
- `tools/tests/`: Playwright scripts (`backup`, `share`, `reports`, `jar`, `quilt`, `meal`, `units`, v37's `usuals` and `quick`, v39's `saving`, v40's `news`, v41's `jars`, v42's `moveorder`, and v43's `moveedit`) and `sample-backup.json` (**made-up data**).
- Not recoverable: the script that built `data/foods.json`, and the exact ChatGPT character prompt (the look is described in `DECISIONS.md` D).

## 7. Rules that matter most
- **Kind always:** no streaks, scores, percentages, comparisons or zeros. Say "soft day", never "heavy".
- **Offline always; private always:** no backend, no analytics, data stays on the phone.
- **Dates in words. Colour never the only signal.**
- **The same character** in every picture (cobalt-blue hoodie, round glasses, messy black hair).
- **Be a creative collaborator, not an order-taker** (details in `DECISIONS.md` F): brainstorm, offer alternatives and a recommendation, push back kindly, and leave the decision to Phavan. Use plain, non-technical language.
- **Nothing gets built until he explicitly approves it.** Discussing an idea is not approval. Show screenshots **before** pushing.
- **Claude never commits, pushes or deploys.** Phavan does, in VS Code.
- Don't build anything listed as a proposal in `DECISIONS.md` until he says yes.
- Keep health details, real backups and personal notes out of the repo.

## 8. How work is done
1. Re-read the files you'll change. Make small, targeted edits; after any find-and-replace, confirm it actually happened. (A silent bad replace broke the goal sheet from v25 to v34.)
2. Check syntax (`node --input-type=module --check < file.js`), then run the relevant `tools/tests/` script. Look at the screenshots.
3. Bump `VERSION` in `sw.js`, and add any new app file to `SHELL` (**never** `tools/`). Docs-only changes don't bump `VERSION`.
   **Also add an entry at the top of `NEWS` in `js/news.js`** with the same number: a few plain, friendly lines for every change, small fixes included (Phavan, 15 Oct 2026). It shows once after the update and stays in Settings → What's new.
4. Write the changed files to the laptop, read them back and compare.
5. Give Phavan a commit message like `v37: …`. He commits and syncs, then closes and reopens the app on his iPhone.
6. Say clearly what was tested in a browser and what needs his phone.

## 8b. Keeping the docs current (agreed 14 Oct 2026)
No more big handovers each time a conversation gets long. Keep the docs true as we go, and **update only what changed**, not every file after every message.

| After… | Update |
|---|---|
| A feature or bug fix is finished | The relevant sections of `HANDOVER.md`; `TEST_CHECKLIST.md` if behaviour changed or a regression test is needed |
| Phavan **explicitly approves** a decision, or rejects an idea | `DECISIONS.md`, with the reasoning |
| A release, milestone or change in what's outstanding | The Project tracker `claude/prequel-build-status.md` (version table, done, to-do) |
| The version, a major open issue or the next steps change | `START_HERE.md` |
| Their information actually changes | `README.md`, `tools/README.md` |

- Brainstorming isn't a decision. Record an idea as confirmed only after Phavan explicitly says yes; until then it's a proposal (`DECISIONS.md` H) or not written down at all.
- Doc updates go to the laptop like any other change, and Phavan commits them.

## 8c. Moving to a new conversation
When Phavan says we're preparing to move to another conversation, do a **focused** handover, not the whole original one again:
1. Verify the version (`sw.js`) and git status (laptop vs GitHub, any uncommitted files).
2. Check that finished work and approved decisions are in the right docs (section 8b).
3. Update this file: version, current state, open issues and the immediate next steps.
4. List anything that could be lost when the conversation ends (temporary scripts, images or files that exist only in Claude's workspace) and offer to save what matters.
5. Write a short opening prompt for the next conversation (keep the one below up to date).

**Starting a new conversation:** read the docs in section 3, look at the relevant code, verify the version and git status, point out anything that doesn't match, and then **wait for Phavan's instructions** before changing anything.

## 9. Waiting on Phavan
- **Agreed order (15 Oct 2026):** ~~a "What's changed" window~~ (done, v40) → ~~the jar~~ (done, v41) → ~~Move order and session log~~ (done, v42; polished v43) → **Move reports** (next; design together). See `DECISIONS.md` H.
- **Check v39 on Android** (his friend): "Save to this phone" on a PDF, "Save image" on a card.
- **Check v38 on the iPhone:** restore a backup from Files (comparison sheet, undo card, undo).
- **Check v37 on the iPhone:** a future day on the date wheel snaps back to today; usuals and the "All your usuals" sheet; Quick session both ways.
- **Pin on usuals** (offered, not answered). ("Your quilt · 0 patches" was fixed in v42.)
- **Backup restore fixed in v38** (B1, B2, B3, B5): stricter check, comparison sheet, save-first, 7-day undo. **B4 is still open** (rare; not discussed). 
- **Shelved until the next session (Phavan, 14 Oct 2026): what happens to the data if the phone breaks or is replaced.** Today: reinstall from Safari, then Settings → Restore from the latest backup file; anything after that backup is lost. Three directions offered: (1) a stronger backup habit (more frequent gentle nudge, one-tap save from Home), (2) steer backup files to iCloud Drive so they survive the phone, (3) cloud sync (Firebase), the real fix but a big step away from "nothing leaves the phone". Not decided; also worth testing whether iCloud's own phone backup keeps a home-screen web app's data (unverified).
- **Weather row** in the sleep diary.
- **Goal celebration** (and loud or quiet?).
- **Mind page redesign** (not designed yet).
- **Indian rice names** in food search.
- **Confirm on iPhone:** "Save and log" on the packet-label sheet.
- **Comfort menu defaults** in `store.js` (`DEFAULT_COMFORT`): left as they are for now; to be discussed.
- Small things not yet discussed: the bottom tab bar highlights Home on several sub-pages, including Quilt when opened from Me or Rest (HANDOVER section 8, issue 2); Home's date order.

## 10. How not to break things
- Don't rebuild, restyle or "tidy up" working screens unless asked. Change only what the request needs.
- Don't rename or remove state fields. Old backups must keep restoring, so run `tools/tests/backup.js` after touching data.
- Don't touch `data/foods.json` by hand; the script that built it is gone.
- Don't remove the unused art (`waving`, `lying`, `stickynote`) or the `comfort` data without asking.
- If something unexpected shows up (uncommitted changes, a different version), **stop and tell Phavan** before doing anything.

---

### Opening prompt for a new conversation (copy and paste)

> We're continuing development of Prequel, my iPhone web app. The project is at `C:\Users\Phava\Documents\companion-app`. Please read `START_HERE.md` first, then `HANDOVER.md`, `DECISIONS.md`, `TEST_CHECKLIST.md` and `tools/README.md`, and the Project doc `claude/prequel-build-status.md`. Then look at the actual code (`sw.js`, `js/app.js`, `js/store.js`, `js/ui.js`) and check the current version, git status and that there are no uncommitted changes. Tell me briefly, in plain language, what you understand about the app, its current state, and the decisions waiting on me, and point out anything in the docs that doesn't match the code. Treat this as a creative collaboration: we talk ideas through before anything is built. **Don't change, commit or build anything yet.** Wait for my instructions.
