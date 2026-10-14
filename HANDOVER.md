# Prequel: development handover

_Written on 12 October 2026, at version **v36**; updated the same day after the backup audit and tool preservation, and on 14 October 2026 (docs cleanup, **v37**, **v38**; 15 October: **v39**). Reading order: `START_HERE.md`, this file, `DECISIONS.md`, `TEST_CHECKLIST.md`, `tools/README.md`, then the Project tracker (see `START_HERE.md` section 3). From now on this file is kept current as work happens (`START_HERE.md` 8b)._

**How sure each fact is:**
- **[verified]**: checked against the code on the laptop or the git log on 12 October 2026.
- **[from history]**: recovered from the conversation transcript, its summary or the planning documents.
- **[unverified]**: could not be confirmed. Check it before relying on it.

---

## 1. What Prequel is

Prequel is Phavan's personal iPhone web app. Its tagline is *"the behind-the-scenes of everything I'm becoming"*. It's a **kind lifestyle companion**: a gentle place to log moving, eating, resting, how the day feels inside, and small wins. It's built for hard days as much as good ones, so it never pressures, grades, compares or shows zeros. Over time the logs turn into keepsakes: a night sky of stars, a patchwork quilt, a jar of paper stars, share cards and PDF reports.

- **Who it's for:** one person (Phavan), on his iPhone. There are no accounts and no other users. A friend could install it and get their own separate copy, because data never leaves the phone.
- **Where it runs:** installed from Safari with "Add to Home Screen", at https://phavan1.github.io/prequel/. **[from history]**
- **Offline is essential.** He has no signal for much of the day, so everything must work offline, and it does. **[verified: service worker and bundled fonts and data]**
- **What it deliberately isn't** (see `DECISIONS.md`): no streaks, targets, percentages, week-against-week comparisons, social features, AI chat, Apple Health, or widgets.

## 2. Architecture and technology [verified]

| Part | What it uses |
|---|---|
| Language | Plain HTML, CSS and JavaScript (ES modules). **No framework, no build step, no npm dependencies at runtime.** |
| Routing | Hash router in `js/app.js`. `#/name/args?query`; `params` (including `params.from`, `params.d`, `params.t`, `params.m`) are passed to `screen.mount(root, params)`. Each route gets a fresh `<main id="app">` so old listeners don't leak. |
| Storage | **IndexedDB** (database `prequel`, store `kv`, key `state`) holding one JSON state object, with a localStorage fallback. Saves are debounced by 150 ms. It asks for `navigator.storage.persist()`. |
| Backup | JSON export and import in Settings, with a monthly gentle nudge (`backupDue()`). Audited on 12 Oct 2026: see section 5b. |
| Offline | `sw.js`: cache name is `VERSION` (now `prequel-v36`). `SHELL` lists **every** file (code, fonts, icons, art, `data/foods.json`). Page loads try the network first and fall back to the cache; other files come from the cache and refresh in the background. |
| Fonts | Bundled in `fonts/`: Nunito 500/700/800/900 and Gaegu 700 (woff2), loaded with `@font-face` in `app.css`. No Google Fonts. |
| Food data | `data/foods.json`: 9,105 foods, 12 nutrients per 100 g, and serving sizes. Sources: INDB (Indian Nutrient Databank, about 1,014 recipes; licence never confirmed, so credit it) and USDA SR27 (public domain). Fields: kcal, protein, carbs, fat, satfat, fibre, sugar, sodium, iron, calcium, b12, vitd. |
| PDFs | `js/pdf.js`: each A4 page (1240×1754, 150 dpi) is drawn on a canvas with the app's fonts, saved as JPEG and packed into a hand-written PDF. No library. Text in the PDF can't be selected. |
| Share cards | `js/cards.js`: 1080×1920 story-sized canvas drawings, shared with the Web Share API. The picture file is prepared before the tap so iOS allows the share sheet to open. |
| Saving files (v39) | `ui.js` `IOS`, `canShareFile`, `saveToDevice`. **iPhone/iPad:** one "Share or save" button opens the share sheet (it has Save to Files / Save Image). **Android and computers:** Android's share sheet usually has **no way to save to the phone** (found from a friend's report: PDFs "didn't save"), so PDFs and cards get **"Save to this phone" / "Save image"** (a real download) next to **Share**, and backups download directly. |
| Hosting | GitHub Pages from repo `phavan1/prequel`, branch `main`, root folder. **[from history]** |
| Backend | **None.** No servers, no API keys, no analytics. |

## 3. Project structure [verified on the laptop, 12 Oct 2026]

Local folder: `C:\Users\Phava\Documents\companion-app` (a git repo; `HEAD` points to `main`).

```
index.html             loads css/app.css and js/app.js (module)
manifest.webmanifest   name "Prequel", standalone, portrait, cream #FAF3DC
sw.js                  offline cache (VERSION + SHELL)
README.md              short entry point (rewritten 12 Oct 2026)
START_HERE.md          first file for a new Claude conversation
HANDOVER.md            this file
DECISIONS.md           why things are the way they are
TEST_CHECKLIST.md      what to test, and where
tools/                 development only, never cached or shipped as a feature (see section 10)
  README.md            how to use the tools
  art/                 clean_art.py, defringe.py, holes.py, requirements.txt
  tests/               Playwright scripts (incl. v37's usuals.js and quick.js), sample-backup.json (fictional), package.json, .gitignore (shots/)
css/app.css            all styles: :root tokens, dark mode block, one section per screen
data/foods.json        offline food database (about 1.4 MB)
fonts/                 Nunito + Gaegu woff2
icons/                 icon-192, icon-512, apple-touch-icon
art/*.webp             24 character pictures (see section 7)
js/
  app.js        router, ROUTES, theme (applyTheme), welcome screen (hello), visibilitychange
  store.js      state, IndexedDB, fresh(), save(), addMoment, removeById, export/import, reset, backupDue
  ui.js         esc, him() art helper, sheets (openSheet with iPhone keyboard fix), toast, nav, backLink, FROM, date chip
  data.js       AREAS, EXERCISES, WORKOUTS (Project Athletic playbook), WEATHERS (13), FOOD_TAGS, FEELS, NIGHT_THINGS
  sky-model.js  seeded random, star clusters, constellation names
  goals.js      linked and own goals, units, count(), logging sheet, edit/rest/remove, checkFinished
  charts.js     hill, weather ribbon, rest clock, "noticing" line
  nutrition.js  NUTRIENTS, food DB load/search, synonyms (SYN), GRAIN rule, myFoods/meals/weights, sums
  cards.js      share-card drawings: sky, milestone, month, quilt + looks + POSES
  pdf.js        Doc class (pages, headings, tables, tiles), makePDF, shareFile, date formatters
  reports.js    sleep diary PDF, food report PDF, date-range and month pickers
  screens/
    home.js     the room (window sky, quilt hoop, him by time of day), quick buttons, soft day
    weather.js  "How's the weather inside?" check-in
    move.js     gym logging from the playbook (keypad, Same again, swaps, add/new workout)
    food.js     search, usuals, portions/grams, labels, Make a meal, edit numbers, weight, reports
    rest.js     going to sleep / woke up, 24-hour ring, add by hand, night chips, sleep diary
    wins.js     THE JAR (route is still #/wins)
    mind.js     things on my mind + reminders, lanterns
    letters.js  letters from good-day you
    days.js     calendar with tabs, day card, add to any day
    me.js       goals, resting goals, finished shelf, counts, charts, share link, gear → settings
    sky.js      the night sky of stars and constellations
    quilt.js    the monthly quilts (also exports PAT, patches, drawQuiltMonth, fullLayout)
    skate.js    Skate home game
    settings.js name, kind words, tiny-win list, Look, backup/restore, Start fresh
    share.js    Share your story (card type, looks, month/milestone picker)
```

Routes (`ROUTES` in `app.js`): `home, weather, move, food, rest, wins, mind, letters, days, me, sky, quilt, skate, settings, share`.
Bottom tab bar (`NAV` in `ui.js`): Home, Days, Move, Mind, Me.

## 4. Data model [verified from code]

Everything lives in one state object (`store.js`, `fresh()`), plus fields that screens add later. Dates are `YYYY-MM-DD` keys **inside the data only**; on screen they're always written in words.

| Key | Shape | Notes |
|---|---|---|
| `moments` | `{id, date, ts, area, text, bright, ref?, written?}` | Every star in the sky. `area` is one of `move, food, rest, win, mind, goal`. `ref` links to the source record. **Tiny wins are moments with `area:'win'`.** `written:1` means a win he wrote himself. |
| `weather` | `{id, date, ts, types:[name], strength}` | Uses the names in `WEATHERS`. |
| `sessions` | `{id, date, ts, workoutId, workoutName, light, exercises:[{key,name,swap,sets:[{a,b}]}], noReps?}` | Gym. A Quick session (v37) has `workoutId:'quick'`, `workoutName:'Quick session'`. **`noReps:1`** means it was logged without reps: its exercises have empty `sets` and must be kept (Days uses its own sheet for these). |
| `rests` | `{id, date, start, end, feel}` | `date` is **the day you woke up**. `feel` is `rested`, `okay` or `groggy`. |
| `pendingSleep` | timestamp or null | "Going to sleep" pressed, waiting for "Woke up". |
| `mind` | `{id, text, remindOn, created, letGo}` | Notes and lanterns. |
| `letters` | `{id, text, ts, weather, opened}` | |
| `foods` | `{id, date, ts, tags:[], note}` | **Old** food moments from before numbers. Still shown and counted. |
| `myFoods` | `{id, name, from, n[12] per portion, per100?, unit, unitG, measures?, kind, uses, last, created, recipe?, portions?, once?}` | His saved foods. `from` is `'label'`, `'recipe'`, or `'<src>:<name>'` from the DB. `once` means a one-off meal, hidden from usuals and search. |
| `meals` | `{id, date, ts, name, foodId, n, unit, unitG, qty, sure, kind}` | Each logged food. `n` is a **copy** of the numbers when logged; editing a food can "also fix past logs". `sure:false` shows as "~". |
| `weights` | `{id, date, ts, kg, where}` | |
| `goals` | `{id, kind:'linked'|'own', source, name, target, from, created, finished, paused?, unit?, amount?, again?}` | `unit` and `amount` only apply to own goals (v25). |
| `goalLogs` | `{id, goalId, date, ts, amt?}` | `amt` is used by amount units (km, hours, minutes). |
| `heavy` | `{date: true}` | Soft days. The name `heavy` is internal only and is never shown. |
| `settings` | `{name, tinyWins[], kindLines[], theme:'light'|'dark'|'auto', dayTabs[]}` | |
| `games.skate` | `{best, runs}` | |
| `sky` | cluster and constellation model | Built by `sky-model.js`. |
| Other flags | `jarsSeen`, `jarSize`, `quiltSeen[]`, `lastBackup`, `lastHello`, `lastSeen`, `goalsSeeded`, `active` (open gym session; `active.quick:1` for a Quick session), `quickMode` (`'reps'` or `'tick'`, the last Quick session answer, v37), `lifts`, `units`, `customExercises`, `customWorkouts`, `workoutAdds`, `subsAdded`, `comfort` | `comfort` (the comfort menu) is **no longer shown anywhere** but is still stored. |

**Rules that matter when changing data:**
- `removeById(list, id)` also removes moments whose `ref` is that id, which takes the star out of the sky.
- Never delete or rename fields without migrating them. Old backups go through `importJSON`, which merges onto `fresh()`.

## 5. Implemented features (through v36) [verified in code unless marked]

### Home (`home.js`)
- A room with a real-looking window:
  - daytime sky (dawn, blue or golden, with sun and clouds) from 6am to 7pm, stars after that
  - shows "N stars" and opens the sky
- An embroidery hoop on the wall showing a mini quilt; it opens the quilt.
- His picture changes with the hour: `sitting` (6–12), `afternoon` (12–19), `nightwatch` (19–6). Tapping him changes his speech bubble.
- "How's the weather inside?" row.
- Quick buttons: **Food, Rest, Jar, Goals**.
- Backup nudge row.
- The soft-day prompt: 🍵 plus a rotating line ("Wanna slow down?" and others).
- **Soft day:**
  - warm peach (dark amber in dark mode), him `asleep`, no rug
  - **Skate home** game card
  - a "From your jar" note: a past win, preferring ones from hard days
  - a letter from good-day you
  - "Back to a regular day"
  - It only lasts for that date and only restyles Home.
- **Welcome screen** on the first open after 5am, or after 4+ hours away. Tap to skip. (`app.js` `hello()`)

### Weather (`weather.js`)
- 13 weathers, from Clear sun to Clear night. Mixing several is allowed, and there's a strength setting.
- Each check-in adds a star (area `mind`) and tints the sky.
- Feeds: Home row, Me ribbon and noticing line, the jar's hard-day check, letter stamps, Days weather tab, My month card.
- **Not yet** in the sleep diary or food report.

### Move (`move.js`) [from history; Quick session verified v37]
- **Quick session** (v37): a big blue button at the top of Move. It asks "How do you want to track it today?" and remembers the last answer (highlighted "last time"):
  - **Track sets and reps:** "What's first?" picker (Recent exercises first), then the normal keypad. More exercises are added as you go with "+ Add" (no "keep it in this workout" box for a Quick session).
  - **Track without reps:** "What did you do?" tick list (Recent first, add your own). Needs at least one tick. Saved as a session with `noReps:1`; the star reads "Quick session · N exercises". In Days it shows "what ›", opening a sheet to take an exercise off.
  - **Same as last time:** repeats the last session's exercises (and swaps), tracked the same way as last time.
  - It counts toward the road to 100, like any session.
- The "add an exercise" sheet shows Recent exercises first (v37).
- The Project Athletic playbook's 12 workouts.
- Custom keypad, "Same again", machine-busy swaps, kg or plate number, add or new workouts, light sessions.
- The `legday` and `cheer` pictures.

### Food (`food.js`, `nutrition.js`)
- **Search:** your foods first ("yours"), then Indian recipes, then USDA.
  - Spelling-friendly synonyms (chana/channa, dal/dhal, yoghurt/yogurt, curd, dahi, paneer, aloo, palak…).
  - For grains and pulses, **cooked versions come first**.
- **"Just log it"** without numbers, to fill in later.
- **Usuals** (v37): the **top 5** (most used, then most recent) as full-width rows going down the page; if there are more, an **"All your usuals ›"** button opens a sheet with all of them, searchable and grouped (Home-cooked, Eating out, Packaged, Everything else). Tapping one logs it. Edit opens Your foods. (Before v37: up to 8 wrapping chips.)
- **"What you ate today"** list, separated from usuals by a dashed divider.
- **Portion sheet:** stepper, quick chips (½…10), or type **grams**. Portions logged by grams show as "80 g".
- **From a label** (v32):
  - copy the label **per 100 g** (or per serving) and the **serving size** in grams
  - energy in kJ or Cal
  - blanks stay unknown, never zero
  - **missing-decimal check**: it warns if protein, carbs and fat hold far more energy than the label says
  - then "How much did you have?" (grams), or **Just save it (to use in meals)**
- **Make a meal or recipe:**
  - search your own foods and DB ingredients, counted in cups, tbsp, pieces or grams
  - **raw grains show a red "uncooked: about 3× this once cooked" note**
  - portions and portion name
  - **Log it as one meal**, with "Keep it in my foods for next time" (off makes it a one-off)
  - Editing a recipe updates the times it's already been logged (v34).
- **Make it yours:** rename, where it's from (Home-cooked, Eating out, Packaged), usual portion. **Edit the numbers** (v33), with "Also fix the times I've already logged it".
- **Day totals sheet:** 12 nutrients; "from X of Y foods" when partial; "–" instead of 0.
- **Weight log** with a little line chart.
- **Reports (PDF):** the last 7 days or any month that has food. **Empty states (v37):** with no food logged at all, a warm "Your first food report is on its way" sheet (him eating) instead of a PDF; if "the last 7 days" has nothing, it's greyed out and dashed with "nothing logged in these dates yet" and can't be picked.
  - highlights, a typical day, a day-by-day chart (gym days solid, rest days light, labelled in words)
  - gym days against rest days, where food came from, regulars, protein sources, weight
  - gentle ideas: protein per kg, fibre, saturated fat, B12, vitamin D, sodium
  - everything eaten, day by day

### Rest (`rest.js`, `reports.js`)
- Going to sleep / Woke up. A 24-hour ring for the day. Add a rest by hand. How you felt.
- Night chips: "Awake for a bit? What did you do" (`NIGHT_THINGS`). **Their future is undecided.**
- Link to the quilt (`?from=rest`).
- **Sleep diary (PDF):** last 2 weeks, last 4 weeks, everything, or any month. **Empty states (v37):** no rests at all shows "Your sleep diary starts with one rest" (him asleep); empty ranges are greyed. The card no longer says "0 logged so far".
  - At a glance: days logged, typical sleep, usually asleep and up around (medians)
  - **Hours each day** chart (v36): solid night, striped daytime, dashed typical line
  - Sleep chart, 6pm to 6pm
  - **Every rest**, with a **Total for the day** row (v36) and night notes

### The jar (`wins.js`, route `#/wins`; v26–v30)
- A drawn glass jar fills with paper stars, one per tiny win. **20 stars fill a jar.**
- No numbers are shown: "Filling up, one star at a time."
- Tap the jar to shake out a slip with a little stat, for example:
  - "You got out of bed 9 times this month."
  - "Since August 10…"
  - "On 3 hard days, you still…"
  - Falls back to the date when something has only happened once.
- **Each chip goes in once per day.** A done chip turns dark and gets ★. Tapping it again just says "Already in the jar today."
- "Or write your own…" wins have no daily limit.
- **In the jar today** pills under the jar, with × then "Remove?". This is the **only** way to remove a star.
- A full jar gets a celebration sheet, then goes onto the **Full jars** shelf. Tap a shelf jar for its dates and three slips.
- If the jar size changes, old full jars are shelved quietly.

### Mind (`mind.js`) and Letters (`letters.js`)
- Things on my mind with gentle reminders (tomorrow, the weekend, next week, or a picked date). Let go as lanterns.
- Letters from good-day you, sealed and opened on soft days.
- **The Mind page redesign is pending.**

### Days (`days.js`)
- Tabs: All, Move, Food, Rest, plus one tab per own goal.
- ＋ opens "Add to your calendar": create a goal, pick a resting goal back up, or switch on the optional Tiny wins and Weather tabs.
- Round-day calendar with rings and icon badges, not colour alone.
- Summary line under each tab, never zero. The All tab has **no** summary line (v30).
- Day card: collapsible rows, × delete, edit sets, **Add to this day** for any date.

### Goals (`goals.js`) and Me (`me.js`)
- **Linked goals** (counted by the app): gym sessions, home-cooked meals, new foods, breakfasts, days of rest, tiny wins, letters, lanterns, or any single tiny win. Optionally count from now.
- **Own goals**, with **units** (v25):
  - counting units add 1: times, sessions, laps, pages, days
  - amount units ask "how many": hours, minutes, km
  - or a custom unit
- Edit goal: rename, target, unit, **Rest it for now / Pick it back up**, Remove. The sheet was broken from v25 to v34 and fixed in v35.
- Me shows: goal cards (or "Ready when you are · counting up to N" at zero), Resting for now, the finished shelf, counts above zero only, Your sky and Your quilt links (`?from=me`), **Share your story**, the hill, weather ribbon, rest clock, noticing line and look-backs. The gear opens Settings.
- A goal reaching its target shows a simple "You did it." sheet with `cheer`. **A richer celebration is pending.**

### Sky (`sky.js`) and Quilt (`quilt.js`)
- **Sky:** every moment is a star. Constellations form with generated names. Tap a star for its day. The back button depends on `from`.
- **Quilt** (v31, v35):
  - **one quilt per month**, hanging from a wooden rod with loops, a blanket-stitch binding, puffy linen patches and a drape shadow
  - the current month shows a needle at the next spot; **finished months are always whole** (some patches double-wide)
  - tap a patch to flip it to a handwritten label
  - care label explaining the colours and patterns; soft-day sparkle; finished-quilt shelf; swipe or ‹ › between months; Share this quilt
  - patch fabric: colour family from hours slept, pattern family from how you felt, a split patch for a two-part night, a button for a nap

### Share your story (`share.js`, `cards.js`)
- **My sky:** Midnight, Dawn, Polaroid.
- **Milestone:** Comic, Sunny, Cream, Night. Works for any goal or app count above zero, and uses the unit.
- **My month:** Journal, Cosy dark, Hoodie.
- **My quilt:** Linen, Night, Sunny, with a month picker.
- Swipe through looks, then one "Share or save" button on iPhone, or "Save image" + "Share" on Android and computers (v39).
- **My quilt is always a whole quilt on the card (v39)**, even mid-month: it uses the finished-month layout (`fullLayout`), while the Quilt page itself keeps the needle and the growing quilt.

### Settings (`settings.js`) and everywhere
- Name, kind lines and tiny-win list. Look: Light, Cosy dark or Match my phone. Backup and restore. Start fresh (a Reset card that asks twice and offers a backup first).
- Dark mode via `html[data-theme="dark"]`.
- Any past date can be logged on most screens with the date chip. **Never a future date (v37):** `ui.js` snaps any `input[type=date]` that has a `max` back to today with the toast "Can't log ahead. Back to today." (the iPhone date wheel ignores `max`), and `setLogDate`/`logDate` ignore a future `?d=` in the address. Rest's "add by hand" also refuses a wake-up time later than now. **Mind reminders are the exception**: their date boxes have no `max`, so future dates still work there.
- **Back buttons return to where you came from**, using `?from=` (v35).

## 5b. Backup and restore (audited 12 Oct 2026)

**How it works** [verified in `store.js` and `screens/settings.js`]:
- **Save a backup** writes the **whole state object** as JSON (`exportJSON`), plus an `exported` timestamp, and hands it to the iPhone share sheet (or a download on desktop). File name: `prequel-backup-YYYY-MM-DD.json`.
- **Restore (v38)** `checkBackup()` in `store.js` checks the file first. The rule is **missing parts are fine, wrong parts are not**:
  - Fields an older backup doesn't have are filled from `fresh()`, `settings` is merged with defaults, and unknown fields are kept.
  - A part that's there but the wrong shape gets the **whole file refused**, with no half-restores. That covers: a record list that isn't a list of objects, a dated record without a `YYYY-MM-DD` date, a map that isn't an object, a wrong `active`, `pendingSleep` or `quiltSeen`, session `exercises`/`sets` that aren't lists, and settings lists that aren't lists.
  - Refusals show a kind sheet ("That file couldn't be read…", "That doesn't look like a Prequel backup…", "This backup looks damaged in places…", each saying nothing was changed).
  - A good file opens **"Restore this backup?"**. It shows *This backup* (saved date, counts) next to *In the app now*. It warns when the backup is **older** than what's here ("Anything logged after <date> would be gone"), or has fewer stars when it has no date. It offers **"Save what's here as a file first"**, then replaces everything (not a merge) and **saves straight away** (`saveNow`).
- **Safety copy and undo (v38):** if the app has anything logged, `restoreBackup()` first keeps a copy of the whole state under the IndexedDB key **`undo`** (`{at, state}`; localStorage `prequel-undo` when there's no IndexedDB).
  - Settings then shows a card: "Your data from before the restore is safe… Prequel stored the app's data from just before, just in case. Want to undo the restore…? This copy stays until <date>."
  - **Undo the restore…** asks first, puts the old state back, saves straight away and deletes the copy.
  - The copy expires after **7 days** and is deleted on the next app start after that.
  - If the copy can't be stored, a sheet says so and offers "Save what's here as a file" or "Restore anyway".
  - Restoring into an empty app keeps no copy ("nothing will be lost").
- **No user data is stored anywhere except that one state object**, apart from the temporary `undo` safety copy (v38), which is deliberately **not** in backups and expires after 7 days. No other localStorage, IndexedDB, cookies or caches hold user data. So the export covers every category by construction, including fields added later.
- **Not in the backup, on purpose:** the static app itself (`foods.json`, the workout playbook in `data.js`, art, fonts). Saved foods and logged meals keep **their own copy of the numbers**, so restoring doesn't depend on the food database. Nothing is regenerated on restore: sky layout, quilt "seen" months and jar counts are stored fields and come back exactly.

**Automated test results** (`tools/tests/backup.js`, fictional data, throwaway browser profiles, desktop Chromium; **21 of 21 passed**):
- A full round trip into an empty app returned identical data. It still matched after a reload (IndexedDB), and also when IndexedDB was blocked (localStorage fallback).
- Restoring the same file twice made no duplicates.
- Decimals (7.92, 1.5, 5.2), nulls, nested arrays, emoji and line breaks survived. Links held: meal → food, goal log → goal, recipe → ingredient.
- The first-week `sample-backup.json` (old format) restored and every screen opened without errors.
- Not JSON, empty, a JSON array, no `moments`, and `moments` not a list were all **refused, and the current data was left untouched**.

| Data | In backup? | Restored correctly? | How it was checked |
|---|---|---|---|
| Moments (stars), incl. tiny wins, written wins, night-waking notes (`area:'rest'`, "Awake in the night: …") | Yes | Yes | Automated |
| Gym sessions and sets, `active` session, `lifts`, `units`, custom exercises and workouts, `workoutAdds`, `subsAdded` | Yes | Yes | Automated |
| Meals, `myFoods` (label `per100`, `measures`, recipes, `portions`, `once`), old `foods` | Yes | Yes | Automated |
| Weights | Yes | Yes | Automated |
| Rests, `pendingSleep` | Yes | Yes | Automated |
| Weather check-ins | Yes | Yes | Automated |
| Mind notes and reminders, letters (incl. `opened`) | Yes | Yes | Automated |
| Goals (units, `amount`, `paused`, `finished`), goal logs (`amt`) | Yes | Yes | Automated |
| Jar (`jarsSeen`, `jarSize`), sky (`sky`), quilt (`quiltSeen`) | Yes | Yes | Automated (created by visiting the screens) |
| Soft days (`heavy`) | Yes | Yes | Automated |
| Settings (name, kind lines, tiny-win list, theme, `dayTabs`), `comfort` | Yes | Yes | Automated |
| Skate (`games.skate`) | Yes | Yes | Automated |
| `lastBackup`, `lastHello`, `lastSeen`, `goalsSeeded`, `created`, `v` | Yes | Yes (`lastHello`/`lastSeen` change on the next open, as designed) | Automated |
| Character art choice | Not stored: pictures follow the time of day and soft day | n/a | Code inspection |
| Saving to Files from the share sheet, picking a file to restore, data surviving an iPhone restart | | | **iPhone only.** Phavan reports Save and Restore worked on his phone; not independently verified |

**Status (v38, 14 Oct 2026): B1, B2, B3 and B5 are fixed; B4 is still open.** History: Phavan made B1 the priority after the docs cleanup. It was re-confirmed on 14 Oct 2026 (`backup.js`, on a copy, fictional data): `{"moments":[],"goals":"abc"}` is accepted and replaces everything. His preferred direction is stricter validation, a clear explanation of what restoring will replace, and a chance to save the current data before importing, while **older legitimate backups must keep restoring** and no new risks are introduced. The design (comparison sheet, older warning, save-first button, automatic 7-day undo with a transparent message, whole-file refusal) was discussed and approved on 14 Oct 2026 and built in v38.

**Issues found in the audit (status updated for v38):**

| # | Issue | Seriousness | Suggested fix |
|---|---|---|---|
| B1 | Validation is thin: any JSON with a `moments` list is accepted. A damaged or wrong file (e.g. `{"moments":[],"goals":"abc"}`, tested) **replaces all current data**. | **Medium** | **Fixed in v38**: stricter check, comparison sheet, save-first button, 7-day undo. |
| B2 | A bad file shows a raw technical message (e.g. "Unexpected token 'h' …"). | Low | **Fixed in v38**: kind messages in a sheet. |
| B3 | "Last backup" is recorded the moment Save a backup is tapped, even if the share sheet is cancelled. | Low | **Fixed in v38**: `downloadFile` reports `'cancelled'`; then "No backup saved this time." and no date. |
| B4 | If an IndexedDB write ever fails, the newer copy goes to localStorage, but the next start reads the older IndexedDB copy first. | Low (rare) | **Still open.** On load, prefer whichever copy is newer. |
| B5 | Saving is delayed 150 ms, so closing the app in that instant after a restore could lose it. | Very low | **Fixed in v38**: `saveNow()` after restore and undo. |
| B6 | Backups are plain JSON with personal food, sleep and weight logs. | Note | Keep them in private places (Files or iCloud Drive). Never put a real backup in the repo. |

**Conclusion:** a backup file realistically **can** recover all personal data after the phone's storage is lost, because it's a complete copy. Since v38 the remaining risk of restoring the wrong file is covered by the comparison sheet and the 7-day undo.

## 6. Deployment and versioning workflow [verified + from history]

1. Claude edits files in a working copy and tests them in desktop Chromium (Playwright) with screenshots, **before** pushing.
2. **Every release bumps** `const VERSION = 'prequel-vN'` in `sw.js`. Any **new file must be added to `SHELL`**, or it won't work offline.
3. Claude writes the changed files to the laptop folder, then reads them back and compares byte for byte (images pixel by pixel) to confirm.
4. Claude gives a commit message in the form `vN: short description`.
5. **Phavan commits and syncs in VS Code** (Source Control, then Commit and Sync). GitHub Pages redeploys.
6. On the iPhone: open Prequel, **close it fully and reopen**, sometimes twice, to pick up the new version.
7. **Claude never commits, pushes or deploys.** Phavan does.

**Git history:** `.git/logs/HEAD` shows commits from the Stage 2 commit (7 Oct 2026) through `v36` (12 Oct, 01:26 Sydney time), then "Handover documents created and updated" (12 Oct, 07:01). **[verified]**
**GitHub sync, verified 12 Oct 2026 ~08:00 Sydney:** `git ls-remote` on `https://github.com/phavan1/prequel.git` returned `main` = `9199dae…`, the same as local `main`. The working folder matched the git index exactly (no uncommitted changes) before the tools and docs below were added.
**Final handover committed:** Phavan then committed and pushed the tools and handover docs as `609bbc9` "Handover: preserve dev tools, backup audit, START_HERE and README" (12 Oct, 07:38 Sydney). **Verified 14 Oct 2026:** laptop `main`, `origin/main`, the git index and GitHub `main` (`git ls-remote` and a fresh clone) were all `609bbc9`, and every working file matched the index (no uncommitted or untracked files). The 14 Oct docs cleanup comes after this.
**How to check yourself:** in VS Code, the Source Control view shows no ↑/↓ numbers when in sync. Or on github.com/phavan1/prequel, the latest commit message should match the last one in VS Code.

## 7. Character art [verified file list; descriptions from history]

**The character:** messy black hair, round glasses, bright cobalt-blue oversized hoodie, black joggers with white side stripes, white and blue chunky sneakers. Hand-drawn manga style, clean black ink lines, soft flat colour.

All art is ChatGPT-generated from Phavan's prompts, cut out by Claude's scripts (section 10), 640 px webp in `art/`.

| File | Shows | Used in |
|---|---|---|
| sitting | morning, juice, waving | Home 6–12, welcome screen |
| afternoon | headphones, iced coffee | Home 12–19, welcome screen |
| nightwatch | lamp and cuppa | Home 19–6, Rest at night, welcome screen, reports, weather data |
| asleep | under a blanket | Home soft day, Rest by day, weather data |
| eating | at a café table | Food header, food report |
| cooking | apron, pot | Food report |
| sewing | sewing his quilt (v31) | Quilt header, My quilt card |
| skate | skating | Me header, data |
| skatego | skating, determined | Skate home game |
| legday, cheer | leg press; jumping for joy | Move; goal reached and some weather moods |
| standing, umbrella, sunny | weather moods | Weather screen (`WEATHERS`) |
| letter | with a letter | Letters, Me |
| cwalk, cgrab, cflip, cfloat, cmanual, ccarve | six cool skate poses (v23) | Share cards: sky (cfloat, cwalk), milestone (cflip, cgrab), month (cmanual, ccarve) |
| waving, lying, stickynote | | **Not used** by any screen right now (still cached) |

## 8. Known issues and limitations

| # | Issue | Status |
|---|---|---|
| 1 | "Save and log" on the packet-label sheet did nothing on iPhone. Couldn't reproduce in Chromium; v32 added a keyboard-close repaint fix in `openSheet`. | **Not confirmed on iPhone** |
| 2 | The bottom tab bar highlights **Home** on several sub-pages, whatever section you came from. Checked in code 14 Oct 2026: Food, Rest, Weather, the Jar and **Quilt** all call `nav('home')`. For Food, Rest, Weather and the Jar that's arguably right, since they're opened from Home. **Quilt is the clear case**: it's also opened from Me (`?from=me`) and Rest (`?from=rest`) but still lights up Home. (Letters and Mind light up Mind; Share and Settings light up Me; Sky and Skate home have no tab bar.) | Open, not discussed; don't change yet |
| 3 | PDF text can't be selected or searched, because pages are pictures. | By design for now |
| 4 | INDB recipes have **no B12** values, so reports read low. Licence unconfirmed; keep the credit. | Open |
| 5 | Data lives only on the phone (IndexedDB). If iOS clears website data or the phone is lost, only a backup file saves it. | Mitigated by backup nudge |
| 6 | `README.md` was out of date (Stage 1). | **Rewritten 12 Oct 2026** |
| 7 | Home's date line and `prettyDate` use the Australian order ("Saturday 10 October", "Fri 9 Oct"). They're in words, but not the "October 10" order he asked for in reports. | Open, ask him |
| 8 | `comfort` (comfort menu) is stored but has no screen any more. `waving`, `lying` and `stickynote` art are unused. | Harmless |
| 9 | All testing has been desktop Chromium (since v39 `saving.js` also pretends to be an Android phone and an iPhone, but it can't open a real share sheet). iPhone-only behaviour (keyboard, share sheet, Add to Home Screen updates, storage) needs his phone. | Ongoing |
| 10 | A long single file (`food.js` ~38 KB) and string-built HTML make edits risky. **Always re-test edited sheets.** In v25 a text replacement silently broke the goal sheet until v35. | Process risk |
| 11 | Food search ranking is heuristic. Some names (seeraga samba, sona masoori, ponni) aren't recognised. | Open, offered |
| 12 | Backup restore issues B1–B5 (section 5b). | B1, B2, B3, B5 **fixed in v38**; B4 open (rare) |
| 15 | Rest shows "Your quilt · 0 patches" when nothing is logged yet: a zero on screen (found 14 Oct 2026 while testing v37; not changed). | Open, ask him |
| 14 | `DEFAULT_COMFORT` in `store.js` holds old comfort-menu examples, and they're in the public repo even though no screen shows them. | Left untouched on purpose (14 Oct 2026); to discuss |
| 13 | The script that built `data/foods.json` was never saved. | Can't be recovered; method in `DECISIONS.md` |

## 9. Pending work and decisions waiting on Phavan

**Done in v38:** B1, B2, B3 and B5 (section 5b). B4 is still open.

**Waiting for his decision (don't build until he chooses):**
1. **Night chips on Rest** ("Awake for a bit?"). Options: remove; one night-only "I'm awake for a bit / Back to sleep" button that logs the time and length (Claude's pick); or keep but show only 10pm–6am.
2. **Weather in the sleep diary:** a weather row under "Hours each day". Offered.
3. **Goal-completion celebration:** count-up and confetti screen, gold shooting star in the sky, trophy landing on the shelf, optional note to future you, "Share this" milestone card, optional chime. Also: loud or quiet and warm? Never answered.
4. **Mind page redesign:** he asked to keep it in mind; not started.
5. **Indian rice names in food search:** offered.
6. **Backup B4** (prefer the newer copy on start). Rare; not discussed yet. B1, B2, B3 and B5 are done (v38).
7. **Comfort menu defaults** (`DEFAULT_COMFORT` in `store.js`): keep, change or remove. Left untouched for now.

**Backlog:**
- Rest page review.
- Light motion lines on dark share cards (offered in v23).
- Soft-day look across the whole app (offered, no answer).
- A one-time "You've already filled N jars!" moment (offered).
- Optional art: jump pose, sitting variants, a watercolour room.
- **Stage 3:** uni planner from his Canvas calendar feed, through a small Cloudflare Worker, as a comic-style planner.
- **Stage 4:** printable A4 monthly showcase (`pdf.js` already exists).
- Cloud sync with login (leaning Firebase; a separate stage; check the free limits).
- Cookbook with photos.

## 10. Development tools (preserved in `tools/` on 12 Oct 2026)

Everything in `tools/` is **development only**. It isn't in `sw.js` `SHELL`, isn't loaded by the app, and was added without bumping `VERSION`. How to use it: `tools/README.md`.

| Saved as | Came from | Changes made when saving | Checked |
|---|---|---|---|
| `tools/art/clean_art.py` | session `tools/clean_art.py` | Header comment. A file name without an `NN-` prefix keeps its whole name (it used to crash). | Ran on an original image |
| `tools/art/defringe.py` | session `tools/defringe3.py` | Header comment only. `defringe2.py` was the same minus the automatic step, so it wasn't kept. | Ran; output was **pixel-identical** to the shipped `art/cgrab.webp` |
| `tools/art/holes.py` | session `tools/holes.py` | Takes an image path and output path instead of fixed `app/art` and `shots` folders. | Ran |
| `tools/tests/{share,reports,jar,quilt,meal,units}.js` | session `share.js`, `reports.js`, `jar4.js`, `q2.js`, `meal.js`, `units.js` | Server address, sample file and screenshot folder made configurable. A test name `'Phavan'` changed to `'Sam'`. Steps unchanged. | All ran against v36 with no page errors |
| `tools/tests/backup.js` | written 12 Oct 2026 for the audit; extended 14 Oct 2026 for v38 (damaged files, kind messages, comparison, older warning, undo and its 7-day expiry, empty-app restore, B3, B5) | New | 40/40 passed (v38) |
| `tools/tests/usuals.js` | written 14 Oct 2026 for v37 | New: usuals, "All your usuals", report empty states, no future dates | 16/16 passed |
| `tools/tests/saving.js` | written 15 Oct 2026 for v39 | New: Android vs iPhone saving and sharing (PDF, card, backup), whole quilt card mid-month | 12/12 passed |
| `tools/tests/quick.js` | written 14 Oct 2026 for v37 | New: Quick session both ways, "Same as last time", Days sheet for ticked sessions, planned workouts unchanged | 17/17 passed |
| `tools/tests/sample-backup.json` | session `sample-backup.json` | `settings.name` changed to `'Sam'`; everything else was already made up | Checked: no real personal data |
| `tools/art/requirements.txt`, `tools/tests/package.json`, `tools/tests/.gitignore` | new | Dependencies: Python OpenCV, NumPy, Pillow; Node Playwright 1.56.0. Screenshots are ignored. | |

**Not preserved (on purpose):** about 34 older or one-off test scripts; the session's first `defringe.py`, plus `defringe2.py`, `holes_c.py` and `holes_s.py` (earlier versions); prototypes (`proto/`, `puppet/`, `wf/`); per-version copies (`push-vN/`, already in git); raw food sources (`data/indb`, `data/usda`, which can be downloaded again); and every personal upload. **The original full-size ChatGPT pictures** (`charart/`, `cool_in/`, `sew_in/`, `newart_in/`) were not copied because of their size. If Phavan doesn't still have them, they're lost when this conversation's workspace ends. The shipped `art/*.webp` files are unaffected.
**Lost before this handover:** the script that built `data/foods.json`.
The project has no root `.gitignore`. Nothing important is excluded from git; only `tools/tests/shots/` and `node_modules/` are ignored.

## 11. Status right now

- **Last completed:** **v39** (15 Oct 2026, not yet committed): "Save to this phone" on Android and computers (PDFs and share cards), and a whole quilt on the share card mid-month. Before that, **v38** (committed): a safer restore (B1, B2, B3, B5) with a comparison sheet, a 7-day undo and kind messages. Before that, **v37** (committed as `ebc05b3`): no future dates, top-5 usuals, report empty states, Quick session. Tested in desktop Chromium only.
- **Last discussion:** the night chips, weather in the sleep diary, and what weather connects to. Answered; waiting on his choices.
- **Handover finished on 12 Oct 2026:** tools preserved, backup audited, docs updated, `README.md` rewritten, `START_HERE.md` added. Phavan committed and pushed these as `609bbc9` (verified 14 Oct 2026).
- **14 Oct 2026, new conversation:** reviewed the project (v36, clean, matches GitHub; 27 JS modules pass the syntax check; `backup.js` 21/21 on a copy). Docs cleanup: stale "not committed" notes fixed, reading order made consistent, test-server instructions corrected, the tab-bar issue described accurately, B1 set as the next priority, and the ongoing docs and conversation-change workflow added (`START_HERE.md` 8b and 8c).
- **Next:** Phavan commits v39; his friend checks "Save to this phone" on Android. Then, in the agreed order: a "What's changed" window (being designed), the jar (20–40 stars, a real celebration), Move (workout order, a session log with Copy), then Move reports. The "phone breaks" question stays **shelved** (`DECISIONS.md` H).

## 12. Instructions for a new Claude conversation

1. **Read in this order** (the same as `START_HERE.md` section 3):
   1. `START_HERE.md`
   2. this file
   3. `DECISIONS.md`
   4. `TEST_CHECKLIST.md`
   5. `tools/README.md`
   6. the Project doc `claude/prequel-build-status.md`
   7. then the actual code: `sw.js`, `js/app.js`, `js/store.js`, `js/ui.js`, and the screen you're touching
2. **The code on the laptop is the source of truth.** Re-read a file before editing it. Don't trust these docs over the code.
3. **Talk first, as a creative collaborator** (`DECISIONS.md` F). Phavan wants ideas discussed, options compared and screenshots shown **before** anything is pushed, and nothing built until he explicitly approves it. Explain things in plain, non-technical language.
4. **Respect the principles** in `DECISIONS.md`: no zeros, no streaks or percentages, colour never alone, dates in words, kind wording, offline always.
5. **Every release:** bump `VERSION`, update `SHELL` for new files, test in a browser (`node --input-type=module --check` for syntax, then the scripts in `tools/tests/`), write to the laptop, read back and compare, then give a `vN: …` commit message. **Never commit or push yourself.**
6. **After any text-replacement edit,** confirm the change actually happened (assert the old string existed) and click through the affected sheet. A silent bad replace broke goals in v25.
7. **Say clearly what was tested where:** "tested in a browser here" versus "please check on your phone".
8. **Keep personal details out of the repo** (health information, private notes). The app's own data never leaves his phone.
9. **Keep the docs current as you go**, updating only what changed, and follow the focused handover when moving to a new conversation (`START_HERE.md` 8b and 8c).
