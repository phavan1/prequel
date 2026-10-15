# Prequel: test checklist

_Written on 12 October 2026, at version **v36**; last updated 14 October 2026. Run the relevant parts before every release, and all of it after a big change. Update this file whenever behaviour changes or a new regression test is needed._

**Who can run each test:**
- **[Claude]**: Claude can run it in desktop Chromium with Playwright, using fake data (`sample-backup.json`).
- **[iPhone]**: needs Phavan's iPhone, with Prequel installed from Safari to the Home Screen.
- **[Both]**: Claude checks the logic first, then Phavan confirms the feel on his phone.

**Ready-made scripts:** `tools/tests/` (see `tools/README.md`). Use the matching one: `backup.js` §2, `meal.js` and `usuals.js` §3, `reports.js` and `usuals.js` §4, `units.js` §5, `quick.js` §5b, `jar.js` and `quilt.js` §6, `share.js` §7, `usuals.js` §1b.

**How Claude sets up a test:**
- Syntax check every changed module: `node --input-type=module --check < js/file.js`
- Work on a **copy** of the project in Claude's workspace (the files staged from the laptop, or a fresh clone of `phavan1/prequel`), never on real app data.
- Serve the app from the **project root** (the folder with `index.html`; there's no `app/` folder): `python3 -m http.server 8765 &`. The test scripts expect `http://localhost:8765/` unless `PREQUEL_URL` says otherwise (see `tools/README.md`).
- Run the scripts from the project root, for example `NODE_PATH=$(npm root -g) node tools/tests/backup.js` (optionally `SHOTS=<folder>` for screenshots). They use a phone viewport (390×844), load `tools/tests/sample-backup.json` (made-up data) through Settings → Restore, and always use a throwaway browser profile.
- Use `page.clock.install()` to test times of day
- Take screenshots and look at them, then read the console for errors

---

## 0. Release basics
- [ ] [Claude] Every changed `.js` file passes the syntax check.
- [ ] [Claude] `VERSION` in `sw.js` is bumped. Every new file is listed in `SHELL`.
- [ ] [Claude] Files on the laptop match the tested copy (read back and compare; images pixel by pixel).
- [ ] [Claude] No console errors on Home, Days, Move, Mind, Me, Food, Rest, Jar, Sky, Quilt, Share and Settings.
- [ ] [iPhone] After Commit and Sync, close and reopen Prequel (maybe twice). The new version shows.

## 1. Navigation and back buttons
- [ ] [Claude] Every route in `ROUTES` opens without errors.
- [ ] [Claude] Back buttons follow `?from=`:
  - Quilt from Rest → Rest; Quilt from Me → Me; Quilt from Home → Home
  - Sky from Me → Me; Sky from Home → Home
  - Share from a Quilt → back to that month's quilt
- [ ] [Claude] The bottom tab bar's five tabs go to the right pages. (Known, not yet fixed: Food, Rest, Weather, the Jar and Quilt always highlight Home, so Quilt opened from Me or Rest still lights up Home. See HANDOVER section 8, issue 2.)
- [ ] [Claude] The Me gear opens Settings, and its back goes to Me.
- [ ] [iPhone] Swiping back with the iPhone gesture behaves sensibly.

## 1c. What's new (v40)
- [ ] [Claude] `news.js`: a new user never sees it; after an update it shows once, after the hello; only the latest update shows, with "You also missed N" and **See all updates** (same window); closing it is the end; Settings → What's new lists them all.
- [ ] [Claude] Every release has a `NEWS` entry whose number matches `VERSION` in `sw.js`.
- [ ] [iPhone] After Commit and Sync, closing and reopening the app shows the window once.

## 1b. No future dates (v37)
- [ ] [Claude] A future `?d=` in the address goes back to today with "Can't log ahead. Back to today." (Food, Move, Rest, Weather, Jar.)
- [ ] [Claude] Picking a future day in the date chip, the goal "Logging for" box, the weight date or Rest's "add by hand" snaps back to today.
- [ ] [Claude] Rest "add by hand" refuses a wake-up time later than now ("That wake-up hasn't happened yet.").
- [ ] [Claude] Past days still work everywhere. **Mind reminders still accept future dates.**
- [ ] [iPhone] On the iPhone date wheel, choosing tomorrow snaps back to today. (`max` alone doesn't stop it on iOS.)

## 2. Data persistence, backup and restore
_Run `node tools/tests/backup.js` after **any** change to `store.js`, `settings.js`, or a new state field. Last run: 14 Oct 2026, v38, 40/40 passed._
- [ ] [Claude] Log something, reload, and it's still there (IndexedDB). Same with IndexedDB blocked (localStorage fallback).
- [ ] [Claude] Full round trip: every state field (moments, sessions, active, custom workouts, meals, myFoods with per100/recipe/once, weights, rests, pendingSleep, weather, mind, letters, goals with units/paused, goalLogs with amt, heavy, jar, sky, quilt, settings, games, unknown fields) comes back **identical** in an empty app, and after a reload.
- [ ] [Claude] **A new state field** added in a release appears in the export and survives restore (it should, automatically; check it).
- [ ] [Claude] Restoring the same file twice makes no duplicates.
- [ ] [Claude] Decimals, nulls, emoji, line breaks and links between records (meal→food, log→goal, recipe→ingredient) survive.
- [ ] [Claude] **Old backup** (`sample-backup.json`, first-week format) restores, and every screen opens without errors.
- [ ] [Claude] **Bad files** (not JSON, empty, an array, no `moments`, `moments` not a list) are refused and current data stays untouched.
- [ ] [Claude] **B1 (v38):** files with broken parts (e.g. `goals: "abc"`, `meals: null`, a moment with no date, `exercises: "legs"`, `settings: "dark"`) are refused **as a whole** with "This backup looks damaged in places…", and nothing changes. Older legitimate backups (`sample-backup.json`) still restore.
- [ ] [Claude] **B2:** refusal messages are kind and never show technical text ("Unexpected token…").
- [ ] [Claude] The restore sheet shows *This backup* next to *In the app now*. An older backup gets the "would be gone" warning. "Save what's here as a file first" is offered. Cancel changes nothing.
- [ ] [Claude] **Undo:** after a restore, Settings shows the undo card (what was kept, until when). It's still there after reopening the app. Undo puts back exactly the old data, and the card goes away. It's still offered on day 7 and gone after.
- [ ] [Claude] Restoring into an empty app says nothing will be lost and shows no undo card.
- [ ] [Claude] **B5:** the restored data is in IndexedDB immediately after the toast.
- [ ] [iPhone] The restore sheet, undo card and undo work on the phone, and the undo card is still there after closing the app fully.
- [ ] [Claude] Deleting a record also removes its star (`ref`).
- [ ] [Claude] Start fresh asks twice and offers a backup first.
- [ ] [iPhone] **Save a backup** opens the share sheet. "Save to Files" works, and the file name has today's date.
- [ ] [iPhone] **Restore** from Files: the warning shows, data comes back, and it's still there after closing the app fully and reopening.
- [ ] [iPhone] Data survives restarting the phone and an app update.
- [ ] [iPhone] Before a phone change: save a backup, then restore it on the new phone (or after deleting and re-adding the app). **Only do this with a fresh backup in Files first.**
- [ ] [Claude] **B3:** a cancelled share (AbortError) says "No backup saved this time." and doesn't set "Last backup".
- [ ] [iPhone] Cancelling the share sheet doesn't change "Last backup"; saving to Files does.
- [ ] [Android] Save a backup downloads the file (no share sheet).

## 2b. Offline and updates
- [ ] [Claude] Every file the app uses is in `SHELL` (compare `SHELL` against the folder; `tools/` must **not** be in it).
- [ ] [Claude] With the network off after one visit, every route, food search, a PDF and a share card still work.
- [ ] [iPhone] Airplane mode: open from the Home Screen, and everything works (see §8).
- [ ] [iPhone] After a release: close fully and reopen (maybe twice). The new version shows and data is unchanged.

## 3. Food maths
- [ ] [Claude] Search for "chana", "dal", "curd" or "rice" puts **yours** first, and **cooked** grains first.
- [ ] [Claude] Portion by grams: 80 g of a food with 100 kcal per 100 g logs 80 kcal and shows "80 g".
- [ ] [Claude] Portion chips (½…10) multiply correctly.
- [ ] [Claude] **Label:** per 100 g, serving size, kJ↔Cal (1 Cal = 4.184 kJ). Blanks stay "–", never 0.
- [ ] [Claude] **Missing-decimal check:** protein 5.2 typed as 52 triggers the warning.
- [ ] [Claude] **Make a meal:** ingredient totals ÷ portions are right. A raw grain shows the red "uncooked" note. "Log it as one meal" works. A one-off meal stays out of usuals and search.
- [ ] [Claude] **Edit numbers:** with "Also fix past logs" ticked, past meals update. Unticked, they don't.
- [ ] [Claude] Editing a recipe updates the times it's already been logged.
- [ ] [Claude] Day totals say "from X of Y foods" when some are unknown.
- [ ] [Claude] Weight log saves and the chart draws.
- [ ] [Claude] **Usuals (v37):** at most 5 on the page, in a vertical list, most used first. "All your usuals ›" shows only when there are more than 5; its sheet lists all of them grouped (Home-cooked, Eating out, Packaged, Everything else), search narrows it, and tapping one logs it for the chosen day.
- [ ] [iPhone] The usuals list and the "All your usuals" sheet scroll comfortably with one thumb.
- [ ] [iPhone] **"Save and log" on the label sheet works with the keyboard open and after closing it.** (Known issue 1. **Confirm this first.**)
- [ ] [iPhone] Typing decimals on the iPhone keypad (a "." or "," keyboard) works in every number field.

## 4. Sleep and reports
- [ ] [Claude] **Awake for a bit (v42):** `moveorder.js`: no night chips; the card shows only 9pm–6am (today); start → "Awake since …" → Back to sleep logs "Awake in the night: N m from …" today; it appears in the sleep diary as a night note.
- [ ] [iPhone] At night, Awake for a bit → Back to sleep feels easy half-asleep.
- [ ] [Claude] Going to sleep, then Woke up, saves one rest dated **the day you woke up**.
- [ ] [Claude] A rest added by hand that crosses midnight is dated correctly.
- [ ] [Claude] **Sleep diary PDF** for 2 weeks, 4 weeks, everything, and a month:
  - dates in words
  - "Hours each day" has solid night bars, striped daytime bars and a dashed typical line
  - every day with rests has a **Total for the day** row
  - no zeros
- [ ] [Claude] **Food report PDF** for 7 days and a month: highlights, chart (gym days solid, rest days light), regulars, gentle ideas, every food listed. Months without food aren't offered.
- [ ] [Claude] PDFs build with no network (Playwright offline mode).
- [ ] [iPhone] Tapping a report opens the share sheet. "Save to Files" works and the PDF opens and reads well.
- [ ] [iPhone] Reports work in **airplane mode**.
- [ ] [Claude] **Saving (v39):** `saving.js`: Android gets "Save to this phone" (downloads) + "Share it" on PDFs and "Save image" + "Share" on cards; iPhone keeps one "Share or save".
- [ ] [Android] "Save to this phone" puts the PDF in Downloads, and "Save image" puts the card in Downloads.
- [ ] [Claude] **Empty states (v37):** with nothing logged, Food → Reports and Rest → Make a sleep diary show the warm "not yet" sheet, never an empty PDF. With older data only, "the last 7 days" (or 2/4 weeks) is greyed and can't be picked, while months with data are offered. The sleep diary card never says "0 logged".

## 5. Goals
- [ ] [Claude] Create a linked goal and an own goal from Me and from the calendar ＋.
- [ ] [Claude] Units: counting units add 1; amount units (hours, minutes, km) ask "how many" and sum correctly. A custom unit shows its name.
- [ ] [Claude] **Edit sheet opens** and saves: rename, target, unit. (This broke silently from v25 to v34.)
- [ ] [Claude] Rest it for now moves the goal to Resting. Pick it back up returns it, from Me **and** from the calendar ＋.
- [ ] [Claude] Reaching the target shows "You did it." and moves the goal to the finished shelf.
- [ ] [Claude] At zero, a goal shows "Ready when you are", never 0.

## 5b. Move: Quick session (v37)
- [ ] [Claude] The Quick session button opens "How do you want to track it today?". The last answer is highlighted ("last time"). "Same as last time" shows only after a session exists.
- [ ] [Claude] **Without reps:** ticking exercises (and adding your own) then "Log it" saves one session with `noReps:1` and empty sets, adds a star "Quick session · N exercises", and counts toward 100. Logging with nothing ticked asks gently for one.
- [ ] [Claude] In Days, a ticked session shows "what ›"; taking an exercise off and saving keeps the rest (it must never wipe them).
- [ ] [Claude] **With sets and reps:** "What's first?" (Recent first) starts the keypad; "+ Add" adds more as you go with no "keep it" box; Finish saves `workoutId:'quick'`. Nothing is added to a saved workout.
- [ ] [Claude] **Same as last time** starts with the last session's exercises (and swaps), in the same tracking style.
- [ ] [Claude] Planned workouts still start the same way, and their "add exercise" sheet still has the "keep it" box.
- [ ] [iPhone] The Quick session sheets feel quick when tired: big targets, little scrolling.

## 5c. Move: order and sessions (v42)
- [ ] [Claude] `moveorder.js`: doing exercises out of order numbers the chips 1, 2, 3; the plan isn't rearranged; the session saves in the real order; "Last time" shows it next time.
- [ ] [Claude] Your sessions lists the latest (newest first); Copy puts the formatted text on the clipboard (swaps, plates, seconds and ticked sessions read right).
- [ ] [iPhone] Copy, then paste into the other app: the text looks right there.

## 5d. Move: logging honestly (v43)
- [ ] [Claude] `moveedit.js`: Not noted / Bar only log word weights; ⋯ removes an accidental exercise (today, and from the workout for next time); switching to body weight asks about old 0 kg sets and then shows only reps; Fix the order (arrows) renumbers the chips; Copy this workout on the done sheet; Move shows just Your last workout; Days fixes a past session (word ↔ number, reorder).
- [ ] [iPhone] The weight words and ⋯ are easy to hit mid-set; the Days picker works with the iPhone wheel.

## 6. Calendar, jar and journal
- [ ] [Claude] Days tabs: All, Move, Food, Rest, plus each own goal. Optional Tiny wins and Weather tabs switch on from ＋.
- [ ] [Claude] The All tab has no summary line. Other tabs' summaries never say zero.
- [ ] [Claude] Day card: rows collapse; × deletes; "Add to this day" logs to that date.
- [ ] [Claude] **The jar:** a chip adds one star once per day ("Already in the jar today" after). Written wins have no limit. Removal works only from "In the jar today". Shaking gives a slip with a sensible stat.
- [ ] [Claude] **Jars (v41), `jars.js`:** an old full jar of 20 gets its belated celebration once; a new jar gets a size from 20 to 40; the star that fills it plays the lid → swirl → shelf celebration and the words appear after; the shelf shows jam/mason/cookie by size; a shelf jar shows its own size.
- [ ] [iPhone] The celebration plays smoothly and feels good.
- [ ] [Claude] **Mind (v41):** "Bring it back" right after letting go and "Bring back" in the lantern list both return the note and remove its star. The green sticky is readable in Cosy dark. No "0 lanterns".
- [ ] [Claude] Mind: add, remind, let go (lantern). Letters: write, seal, open on a soft day.
- [ ] [Claude] Weather check-in adds a star and shows on Home.
- [ ] [Claude] **Quilt:** the current month has a needle; a past month is whole; tapping a patch flips it; swiping or ‹ › changes months; Share this quilt opens the card for that month.
- [ ] [Claude] **Sky:** the stars match the moment count; tapping a star shows its day.

## 7. Art and appearance
- [ ] [Claude] Home pose by hour: 7am `sitting`, 2pm `afternoon`, 9pm `nightwatch`, soft day `asleep`. The window shows daytime sky from 6am to 7pm.
- [ ] [Claude] No white halo or trapped cream patches around any character, in **light and dark** mode (zoom the screenshots).
- [ ] [Claude] Every share-card type and look draws with the right pose. Text doesn't overflow.
- [ ] [Claude] **My quilt card is a whole quilt even for the current month** (v39), while the Quilt page shows the needle.
- [ ] [Claude] Dark mode: every page readable and nothing left bright white.
- [ ] [Claude] Every image loads offline.
- [ ] [iPhone] The art looks crisp, not blurry, on the Retina screen.

## 8. iPhone usability (all need the iPhone)
- [ ] Add to Home Screen gives the Prequel icon, name and cream splash; it opens full screen with no Safari bars.
- [ ] Nothing is hidden under the notch or home bar. The bottom tab bar can be tapped.
- [ ] Sheets: the keyboard doesn't hide the Save button, and the sheet repaints after the keyboard closes.
- [ ] Buttons are big enough to tap comfortably with one thumb.
- [ ] Share or save on cards opens the iOS share sheet **straight from the tap**. Save Image puts it in Photos.
- [ ] **Airplane mode:** every screen, food search, PDFs and cards still work.
- [ ] Skate home plays smoothly with tap or touch.
- [ ] "Match my phone" follows the iPhone's dark mode.
- [ ] Coming back after 4+ hours (or the first open after 5am) shows the welcome screen.

## 9. Previously found bugs (check they stay fixed)

| Bug | Fixed in | Test |
|---|---|---|
| Goal edit sheet didn't open (bad text replace) | v35 | [Claude] §5 edit sheet |
| Label "Save and log" did nothing on iPhone | v32 (attempt) | **[iPhone]** §3, still unconfirmed |
| Label decimals lost (5.2 → 52) | v32 warning | [Claude] §3 |
| Raw rice inflated protein and calories | v34 | [Claude] §3 cooked first and uncooked note |
| Duplicate jar stars from tapping a chip again | v27 | [Claude] §6 jar |
| Share sheet didn't open on iOS | v20–v23 (pre-built file; exact version unverified) | **[iPhone]** §8 |
| White fringes or cream gaps around the art | v21–v22 (sewing art in v31) | [Claude] §7 |
| Quilt patterns scaled hugely; flip label overflowed | v31 | [Claude] §6 quilt, §7 |
| Soft-day icon stacked above its text | v21 | [Claude] Home on a soft day |
| Finished month quilt had empty patches | v35 | [Claude] §6 quilt |
| Couldn't pick a resting goal back up | around v35 (not named in the commit message; unverified) | [Claude] §5 |
| Back buttons always went to one place | v35 | [Claude] §1 |
| Restore of a bad file must not touch data | audit, 12 Oct | [Claude] §2 (`backup.js`) |

_Fix versions come from the git commit messages on the laptop, except where marked unverified._
