# Prequel: test checklist

_Written on 12 October 2026, at version **v36**. Run the relevant parts before every release, and all of it after a big change._

**Who can run each test:**
- **[Claude]**: Claude can run it in desktop Chromium with Playwright, using fake data (`sample-backup.json`).
- **[iPhone]**: needs Phavan's iPhone, with Prequel installed from Safari to the Home Screen.
- **[Both]**: Claude checks the logic first, then Phavan confirms the feel on his phone.

**How Claude sets up a test:**
- Syntax check every changed module: `node --input-type=module --check < js/file.js`
- Serve the app: `(cd app && python3 -m http.server 8765 &)`
- Run Playwright with `NODE_PATH=$(npm root -g)` at a phone viewport (390×844), loading `sample-backup.json` through Settings → Restore
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
- [ ] [Claude] The bottom tab bar's five tabs go to the right pages. (Known: on sub-pages it highlights Home.)
- [ ] [Claude] The Me gear opens Settings, and its back goes to Me.
- [ ] [iPhone] Swiping back with the iPhone gesture behaves sensibly.

## 2. Data persistence and backup
- [ ] [Claude] Log something, reload, and it's still there (IndexedDB).
- [ ] [Claude] Export backup, Start fresh, then restore the backup: everything returns (moments, meals, myFoods, goals, rests, jar, quilt).
- [ ] [Claude] An **old** backup (missing newer fields such as `unit`, `jarSize`, `once`) imports without errors.
- [ ] [Claude] Deleting a record also removes its star (`ref`).
- [ ] [Claude] Start fresh asks twice and offers a backup first.
- [ ] [iPhone] Data survives closing the app, restarting the phone, and an app update.
- [ ] [iPhone] The backup file can be saved to Files and restored from Files.

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
- [ ] [iPhone] **"Save and log" on the label sheet works with the keyboard open and after closing it.** (Known issue 1. **Confirm this first.**)
- [ ] [iPhone] Typing decimals on the iPhone keypad (a "." or "," keyboard) works in every number field.

## 4. Sleep and reports
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

## 5. Goals
- [ ] [Claude] Create a linked goal and an own goal from Me and from the calendar ＋.
- [ ] [Claude] Units: counting units add 1; amount units (hours, minutes, km) ask "how many" and sum correctly. A custom unit shows its name.
- [ ] [Claude] **Edit sheet opens** and saves: rename, target, unit. (This broke silently from v25 to v34.)
- [ ] [Claude] Rest it for now moves the goal to Resting. Pick it back up returns it, from Me **and** from the calendar ＋.
- [ ] [Claude] Reaching the target shows "You did it." and moves the goal to the finished shelf.
- [ ] [Claude] At zero, a goal shows "Ready when you are", never 0.

## 6. Calendar, jar and journal
- [ ] [Claude] Days tabs: All, Move, Food, Rest, plus each own goal. Optional Tiny wins and Weather tabs switch on from ＋.
- [ ] [Claude] The All tab has no summary line. Other tabs' summaries never say zero.
- [ ] [Claude] Day card: rows collapse; × deletes; "Add to this day" logs to that date.
- [ ] [Claude] **The jar:** a chip adds one star once per day ("Already in the jar today" after). Written wins have no limit. Removal works only from "In the jar today". The 20th star brings the celebration and the shelf. Shaking gives a slip with a sensible stat.
- [ ] [Claude] Mind: add, remind, let go (lantern). Letters: write, seal, open on a soft day.
- [ ] [Claude] Weather check-in adds a star and shows on Home.
- [ ] [Claude] **Quilt:** the current month has a needle; a past month is whole; tapping a patch flips it; swiping or ‹ › changes months; Share this quilt opens the card for that month.
- [ ] [Claude] **Sky:** the stars match the moment count; tapping a star shows its day.

## 7. Art and appearance
- [ ] [Claude] Home pose by hour: 7am `sitting`, 2pm `afternoon`, 9pm `nightwatch`, soft day `asleep`. The window shows daytime sky from 6am to 7pm.
- [ ] [Claude] No white halo or trapped cream patches around any character, in **light and dark** mode (zoom the screenshots).
- [ ] [Claude] Every share-card type and look draws with the right pose. Text doesn't overflow.
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

_Fix versions come from the git commit messages on the laptop, except where marked unverified._
