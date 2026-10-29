# Prequel: development handover

_Written on 12 October 2026, at version **v36**; updated the same day after the backup audit and tool preservation, and on 14 October 2026 (docs cleanup, **v37**, **v38**; 15 October: **v39**, **v40**, **v41**, **v42**, **v43**, **v44**; 17 October: **v45**, **v46**, **v47**, **v48**, **v49**; 18 October: **v50**, **v51**, **v52**, **v53**; 19 October: **v54**, **v55**, **v56**; 21 October: **v57**, **v58**; 24 October: **v59**, **v60**, **v61**, **v62**, **v63**, **v64**, **v65**; 25 October: **v66**, **v67**; 26 October: **v68**, **v69**; 27 October: **v70**, **v71**, **v72**; 29 October: **v73**, **v74**, **v75**, **v76**). Reading order: `START_HERE.md`, this file, `DECISIONS.md`, `TEST_CHECKLIST.md`, `tools/README.md`, then the Project tracker (see `START_HERE.md` section 3). From now on this file is kept current as work happens (`START_HERE.md` 8b)._

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
  data.js       AREAS, EXERCISES, WORKOUTS (Project Athletic playbook), WEATHERS (13), FOOD_TAGS, FEELS, NIGHT_THINGS (no longer shown since v42; kept)
  sky-model.js  seeded random, star clusters, constellation names
  goals.js      linked and own goals, units, count(), logging sheet, edit/rest/remove, checkFinished
  charts.js     hill, weather ribbon, last two weeks of nights (v61, was the rest clock), "noticing" line
  weight.js     the body-weight sheet (v57), opened from Food and from the Move hub; one weight per place (Gym, Hospital, Other) per day, saving again replaces it (v58)
  nutrition.js  NUTRIENTS, food DB load/search, synonyms (SYN), GRAIN rule, myFoods/meals/weights, sums
  cards.js      share-card drawings: sky, milestone, month, quilt + looks + POSES
  pdf.js        Doc class (pages, headings, tables, tiles), makePDF, shareFile, date formatters
  reports.js    sleep diary PDF, food report PDF, date-range and month pickers
  activities.js Move's activities (v48): the catalogue (each sport's own fields), milestone measures and totals, logActivity, summary
  music.js      On repeat (v51): eras, Apple song search (fetch, then a "callback" fallback), saved covers, made covers, previews and the little tunes, Listen in full links, soundtrack of the month
  cycle.js      Cycle (v46): the optional period tracker's data helpers, period starts and the gentle estimate
  news.js       What's new (v40): NEWS entries (one per release, newest first), the window and the Settings list
  screens/
    home.js     the room (window sky, quilt hoop, him by time of day), quick buttons, soft day
    weather.js  "How's the weather inside?" check-in
    ontape.js   On repeat (v51): the tape player and shelf on the Days tab, the change-song sheet, a tape's sheet
    movehub.js  the Move hub (v48): first-time picker, same-size tiles, log sheet, timer, milestones, Lately
    move.js     gym logging from the playbook (keypad, Same again, swaps, add/new workout)
    food.js     search, usuals, portions/grams, labels, Make a meal, edit numbers, weight button, reports
    rest.js     going to sleep / woke up, 24-hour ring, add by hand, "Awake for a bit" (v42), sleep diary
    wins.js     THE JAR (route is still #/wins)
    mind.js     things on my mind + reminders, lanterns
    letters.js  letters from good-day you
    days.js     calendar with tabs, day card, add to any day
    me.js       goals, resting goals, finished shelf, counts, charts, share link, gear → settings
    sky.js      the night sky of stars and constellations
    quilt.js    the monthly quilts (also exports PAT, patches, drawQuiltMonth, fullLayout)
    skate.js    Skate home game
    journey.js  Your moving journey (v66, v67): stats page opened from Me's scene card and Move's row
    stack.js    Stack the stars game (v56)
    road.js     Slow ride, the endless bike ride (v68)
    keepup.js   Keep it up game (v56)
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
| `sessions` | `{id, date, ts, workoutId, workoutName, light, exercises:[{key,name,swap,sets:[{a,b}]}], noReps?}` | Gym. **Since v43 a set's weight `a` can be a word:** `'nn'` (Not noted), `'bar'` (Bar only) or `'bw'` (Body weight); everything that adds weights treats these as 0, and `SPECIAL` in `move.js` has the labels. **Since v42 `exercises` are saved in the order you actually did them** (by first set; `active.order` tracks it during a workout). A Quick session (v37) has `workoutId:'quick'`, `workoutName:'Quick session'`. **`noReps:1`** means it was logged without reps: its exercises have empty `sets` and must be kept (Days uses its own sheet for these). |
| `tapes` | `{id, date (= start), start, end|null, title, artist, album?, cover? (data URL), coverUrl?, preview?, link?, did? (Deezer id, v52), era?, line?}` | On repeat (v51). The one with no `end` is on repeat now. In the backup and its checks. `settings.musicApp` holds the Listen-in-full app. |
| `activities` | `{id, date, ts, type, mins?, feel?, hl?, note?, f:{field: value}}` | Move's non-gym activities (v48). `type` is a catalogue id or your own `c…` id. In the backup and its checks. |
| `moveSetup` | `{picked:[ids], custom:{id:{n, e, unit}}}` | What you do (v48). Missing means Move asks once. |
| `actTimer` | `{type, start, date}` or missing | A running "Start now" timer (v48). |
| `cycleDays` | `{id, date, period:1|0, flow:0-3, feels:[]}` | Cycle tab (v46). One per day with anything on it; a day with nothing left is removed. |
| `rests` | `{id, date, start, end, feel, words?}` | `date` is **the day you woke up**. `feel` is one of `refreshed, rested, okay, tired, groggy, restless` (the first three-word set was `rested, okay, groggy`; still valid). `words` is the optional "in your own words" (v45). |
| `doctorNotes` | `{id, date, ts, text}` | Notes for your doctor (v45). In the backup and its checks. |
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
| Other flags | `jarPlan` (v41: one size per jar, oldest first; jars full before v41 are 20, each new jar gets a secret random 20–40 when it starts), `jarsCelebrated` (v41: how many full jars have had their celebration; missing means 0, so old full jars get a belated one), `jarsSeen` and `jarSize` (**no longer used since v41**, kept for old backups), `quiltSeen[]`, `lastBackup`, `lastHello`, `lastSeen`, `goalsSeeded`, `active` (open gym session; `active.quick:1` for a Quick session), `quickMode` (`'reps'` or `'tick'`, the last Quick session answer, v37), `measure` (v43: `{exerciseKey: 'bw'}` for playbook exercises switched to body weight × reps; your own exercises store `t: 'bw'` directly), `awakeSince` (v42: "Awake for a bit" running since, or null), `newsSeen` (the last What's new update shown on this phone, v40; kept as-is by restore and undo), `lifts`, `units`, `customExercises`, `customWorkouts`, `workoutAdds`, `subsAdded`, `comfort` | `comfort` (the comfort menu) is **no longer shown anywhere** but is still stored. |

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
  - **Play something (v56):** a shelf of three game cards (Skate home, Stack the stars, Keep it up), each with your own best, never a zero. Drawings are inline SVG in `home.js` (`GAME_ART`).
  - **Stack the stars** (`#/stack`, `js/screens/stack.js`): a paper star swings on a string; tap (or Space) to drop it. Lands within about one star of the one below or it tumbles off (the end). Off-centre drops lean the tower; if its middle drifts more than 1.5 stars from the base, it topples ("Timber!"). A drop within 16% of the centre is **Perfect**: it snaps straight, sparkles and eases the whole tower back toward the middle. The view climbs through the room and window (8), clouds (15), birds (25), night sky (40) and the moon (60), with a pill label at each. The swing speeds up slowly (1.9 → 3.4) and settles. Record: `st.games.stack` {best, runs}.
  - **Slow ride** (`#/road`, `js/screens/road.js`, v68): a pseudo-3D road (segments of 2 m, about 22 km/h, a little slower uphill) with gentle bends and hills from fixed sine waves, so the road is the same every time. Six places of 6 km each on a loop (`PLACES`: Open fields, The forest road, Lakeside, Rolling hills, The coast road, A sleepy village), blending over the last 8%; their name fades in when you arrive. Roadside things are drawn in code (trees, pines, hay, fences, flowers, reeds, a jetty, sheep, walls, dunes, posts, a lighthouse, houses, lamps). The sky follows the real clock (`skyNow()`: dawn, day, sunset, dusk, night with stars, moon and glowing lamps and a rear light). The rider is `art/biker.webp` (from behind, head turned), leaning into bends. Drag to steer; it drifts back to the middle. Distance shows bottom right and never resets: `st.games.road` {m, rides}, saved every 5 s, when hidden and on leaving; leaving after 50 m or more toasts "X km this ride · Y km all together". Optional soft wind sound. Opened from the games shelf (`?from=home`) and Rest's "Wind down" row (`?from=rest`).
    v69: **gears** (`GEARS`: Easy 22, Brisk 35, Breezy 50 km/h; the `#rdGear` pill bottom left with three rising bars, tap to cycle; eases into the new speed over a second or two; saved as `rec.gear`). Downhill adds at most 10%, uphill takes up to 20%. The view widens a little and the wind gets louder at speed; he rocks with each push on the pedals (`s.pedal`, faster at speed). **Smoothness:** `SEG` is now 0.6 m (the road was drawn for 0.6 m segments but moved as if 2 m, so it crawled and looked stuck); the canvas uses at most 1.5× pixels (`fullCanvas(cv, onSize, maxDpr)`); far segments thinner than a pixel are folded into one strip; saving while riding only every 2 minutes (a save copies all data), plus always on leaving or switching apps; the km label only changes when the number does.
  - **Keep it up** (`#/keepup`, `js/screens/keepup.js`): like Instagram's DM emoji game. Slide a pillow (finger, or ←/→) to keep an emoji in the air. Pick a paper star (default), one of six emoji, or your own (first emoji typed, `Intl.Segmenter`). **Game speed (Phavan's call):** every bounce is 5% quicker, up to 2.6×. Hitting near the pillow's edge sends it sideways and spins it. The count shows only after the first bounce; every 10 bounces lights a star in the background. Missing the very first fall says "It slipped right past" (no zero). Record: `st.games.keepup` {best, runs, emoji}.
  - Both use `js/gamekit.js` (canvas sizing, paper star, sound) and Skate home's `.sk-hud` / `.sk-over` styles; both pause when the app is hidden. **Sound** is one switch for both (`st.games.sound`, off by default; little WebAudio blips). Each screen element has `__game()` for the automated tests only.
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

### The Move hub (`movehub.js`, `activities.js`, v48)
- **Move opens on a hub** (unless a gym workout is open, which goes straight back in). Top: **How's the body?** (Green / Yellow / Red, moved up from the gym page so it covers every activity; the v45 Yellow hint lives here; Yellow and Red show a gentle note). Then "What did you get up to?": **one tile per activity, all the same size, Gym included** (Phavan: no bigger gym tile). Each tile shows an emoji, the name and one line: its milestone ("2 of 10 goals"), or a count only above zero ("1 time so far", "3 walks so far"), or "Tap to log" / "Tap to start". Then "Your activities ›" and a quiet **Lately** line (last three things, tap for a list of 30 with details and highlights). **Since v49 Lately sorts by day, newest first, then time**: some older gym sessions keep their time as text, which had left them in saved order.
- **First time, Move asks once** ("What gets you moving?", with the character): pick from Gym, Walk, Run, Cycling, Swimming, Badminton, Football, Cricket, Tennis, Kickboxing, MMA (both v49), Yoga or stretching, Dance, Hiking, Home workout, plus **Your own** (a name, an emoji, and optionally one number of its own, e.g. "problems"). Gym is preselected for anyone with gym sessions. **Anyone with an unfinished gym-sessions goal (the old road to 100) is asked:** Keep it / Change the number / No milestone. Saved in `st.moveSetup = {picked, custom}`; changed any time from "Your activities".
- **Tapping a non-gym tile:** the last time (with its highlight), **Start now** (a timer in `st.actTimer`, kept even if the app closes; a card at the top of the hub: "🚶 Walk · 32 min so far · Stop / Cancel"; Stop opens the log sheet with the minutes filled in; one timer at a time) or **Log one I did**, and **Set a milestone** (or the current one).
- **The log sheet** (everything optional): how long (15 / 30 / 45 min, 1 hour, 1½ hours, or typed), how it felt (Easy / Good / Tough), the sport's own fields, **Highlight of the day**, and a note. Per sport: Walk distance, steps, outdoors/treadmill; Run distance (pace worked out), outdoors/treadmill; Cycling distance, outdoors/indoor bike; Swimming laps, pool length (distance worked out), stroke; Badminton singles/doubles, games played; Football match/training/kickabout, goals, assists; Cricket match/nets, runs, wickets; Tennis singles/doubles, sets played; **Kickboxing (v49)** pads/bag work/sparring/class, rounds, round length (1/2/3 min), worked on; **MMA (v49)** striking/grappling/wrestling/sparring/class, rounds, worked on; Yoga style, focus; Dance style; Hiking distance, metres climbed, trail; Home workout what you did; Your own its one number. **Effort, never results: no wins or losses**, and no "who you played with" (no friends or tagging in the app). Saving adds a `move` moment (a star), lights the day in Days, and counts toward milestones.
- **Milestones replace "road to 100".** No milestone by default for anything. Any activity can get one, counting times, total time (hours), days active, or any of its numbers (km, steps, games, goals, assists, runs, wickets, sets, laps, metres climbed, your own); Gym counts sessions, sets or days. They're linked goals with source `act:<activity>:<measure>` (gym sessions stay `sessions`), so they show on Me, celebrate when reached and go on the finished shelf.
- **Changing or removing a log on Move (v50):** tapping an activity's tile lists its **5 most recent logs**; tapping one (or anything in **Lately**, which is now tappable) opens it with **Edit** (the log sheet, filled in; saving replaces its details and its star's words, `updateActivity`) and **Remove** (asks "Sure? Tap again"; removes the record and its star, `removeEntry`). A **gym session** (from Lately or Your last workout / All your sessions) gets **Fix this workout** (the same editor as Days, `editSession` exported from `days.js` with a `done` callback) and **Remove**. Days still works too.
- **The gym page** (tap Gym): "‹ Move" back, "Session N" with its milestone ("Set a milestone ›" or "24 of 50 sessions ›"), today's light as a small line with "change", then everything as before (Quick session, suggestion, workouts, Your last workout).
- **Me:** "How you've moved": one count per activity with logs (gym sessions, walks, badminton sessions…), only above zero.
- **Days:** activities are Move moments; removing one in Days removes the activity record too.
- **Left for later (Phavan):** a separate "Play" space for gaming and other hobbies; activity reports and share cards; whether Move reports cover all activities.

### Move (`move.js`) [from history; Quick session verified v37]
- **Quick session** (v37): a big blue button at the top of Move. It asks "How do you want to track it today?" and remembers the last answer (highlighted "last time"):
  - **Track sets and reps:** "What's first?" picker (Recent exercises first), then the normal keypad. More exercises are added as you go with "+ Add" (no "keep it in this workout" box for a Quick session).
  - **Track without reps:** "What did you do?" tick list (Recent first, add your own). Needs at least one tick. Saved as a session with `noReps:1`; the star reads "Quick session · N exercises". In Days it shows "what ›", opening a sheet to take an exercise off.
  - **Same as last time:** repeats the last session's exercises (and swaps), tracked the same way as last time.
  - It counts toward the road to 100, like any session.
- The "add an exercise" sheet shows Recent exercises first (v37).
- **Weights that aren't numbers (v43):** under the weight box, **Not noted · Bar only · Body weight**. Tap one and it fills the weight and jumps to reps. Sets read "Not noted × 12", "Bar only × 12", "Body weight × 15". Typing a number replaces the word.
- **Body weight × reps (v43):** a fourth way to measure (with Weight × reps, Seconds, Minutes). Only a reps box shows. New exercises can choose it; existing ones switch through the ⋯ sheet, which then **asks** whether to mark past 0 kg sets of that exercise as body weight.
- **⋯ for the exercise you're on (v43)**, next to Machine busy?: how you measure it (Weight × reps / Body weight × reps), **Fix the order you did things in** (a sheet with ↑ ↓; it reorders `active.order`, never the plan), and **Remove from today** (asks once more; if it was also saved into the workout, a second button removes it **from the workout for next time** too). Removing the only exercise clears the workout.
- **Real order (v42):** the order you do exercises in is recorded from each one's first set. The exercise chips show numbers 1, 2, 3… (filled when the exercise is done). The plan's order is **never rearranged**. The session is saved in your real order, and next time the same workout shows **"Last time · <day>: Chest press → Shoulder press → …"** under the chips.
- **Your sessions (v42, simplified v43):** the Move start screen shows **Your last workout** (number, name, date, exercises and sets) and, once there's more than one, **All your sessions**. Tapping one opens its text and a **Copy** button (clipboard, with a fallback for older phones). The **Session done** sheet also has **Copy this workout** (v43). The text format (`sessionText` in `move.js`):
  ```
  ✦ Session 10 · Full Body B
  Thursday, October 15 · 7 exercises · 15 sets

  1. Leg extension
     5 kg × 12  ·  12 kg × 10
  …
  7. Plank
     40 sec  ·  50 sec

  — logged with Prequel
  ```
  Swaps read "Pec deck (instead of chest press)", plates "plate 4 × 12", and ticked Quick sessions "done ✓".
- The Project Athletic playbook's 12 workouts.
- Custom keypad, "Same again", machine-busy swaps, kg or plate number, add or new workouts, light sessions.
- **Last time (v57):** `lastTime(i)` in `move.js` reads the newest saved session (on or before the workout's day) that has the exercise; a swapped exercise matches by the swap's name, and swaps don't count for the original. Shown as every set, e.g. "Last time: 10kg × 12, 10kg × 10 (Tue, 13 Oct)". **`st.lifts` is no longer read** (still written at Finish, harmless). Why: Phavan's iPhone said 12.5 kg for biceps curls when he'd lifted 10 (the gym has no 12.5). `lifts` kept only the last set, wasn't updated by fixing a workout in Days, by swaps, and was overwritten by logging an older date; and the first set was **pre-filled** from it in grey, which Next saved as real, so one wrong number could copy itself forward.
- **Bar + (v59):** a weight chip for a bar you don't know the weight of plus kg on **each side** (Phavan's choice: per side, not total). Saved as `a: 'b+2.5'` (`isBP`, `bpKg` exported from `move.js`); shown "bar + 2.5kg each side × 10" (`fmtSet`, `setWords`); the box label becomes "BAR + · KG EACH SIDE" with ±1.25 nudges. Shown on every weight exercise in kg (v64; v59 hid it on `e.m` machines, but Phavan does chest press on a bar), hidden only when the exercise is set to plates; in Bar + mode the kg/plate switch is hidden so the label fits; "plate" keeps meaning the pin position on a machine stack (Phavan kept the name). If last time's first set was Bar +, the first set opens in Bar + mode, still empty. Days' editor (Fix this workout) has a "Bar +" option; v65 fixed picking it (it fell straight back to Bar only because its number box was still empty: `keepTyped` now keeps `b+` while empty, using the select's `data-was`), and an empty Bar + saves as Bar only. v65 also added **+ Add a set** under each exercise (a copy of the last set). PB and Me's volume treat it as 0 kg, like other words.
- **Next/Log takes the hint (v59, Phavan asked):** on the first set, Next or Log on an empty box fills it from the faint "last …" hint (last time's set 1), then logs. A deliberate tap, so it isn't the old silent pre-fill. The hint is in Gaegu (`--font-hand`).
- **The first set starts empty (v57):** the boxes show last time's first set as a faint italic hint ("last 10"), never saved. **Same again** on set 1 uses last time's set 1; ± on the empty box starts from last time's weight. Set 2 onward starts from the set you just did (that's accurate).
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
- Going to sleep / Woke up. A 24-hour ring for the day. Add a rest by hand. How you woke up.
- **Six wake feelings (v45):** Refreshed, Rested, Okay, Tired, Groggy, Restless (`FEELS` in `data.js`, each with its quilt pattern family: refreshed/rested → round patterns, okay/tired → tidy, groggy/restless → wavy; `feelFamily`, `feelLabel`). After Woke up, **one tap on a word saves**, as before. A quiet "+ In your own words" opens a short field (60 characters, saved as `rest.words`); then the tap only selects and a Save button appears. The same choices are in Add a rest by hand. Old nights keep their word and their patch. Words show on the flipped quilt patch and in the sleep diary's Notes.
- **Awake for a bit (v42, replaced the night chips):** from 9pm to 6am (only on today), a card "🌙 Awake for a bit?". Tap it to start (`st.awakeSince`); it becomes "Awake since 11:10 pm" with **Back to sleep** and Cancel. Back to sleep logs a moment `Awake in the night: 25 m from 11:10 pm` dated today, which the sleep diary already shows as a night note. Old chip notes stay in the diary.
- **The awake card (v45):** one soft main button, **Back to sleep**, which opens a small sheet with an optional "What woke you? · only if you want" box and **Goodnight** (the words go on the moment as `woke`, shown in Days and the diary's Notes; closing the sheet keeps you awake). Two quiet buttons underneath: **Breathe with me** (a circle that grows for 4 s and shrinks for 6 s, words "Breathe in" / "And out", as long as you like, "I'm okay now"; with reduced motion the circle stays still) and **Put it down for the morning** (a Mind note with `remindOn` the coming morning, so it shows on Home and Mind then; it doesn't end the awake time). Cancel is a small text link. Nothing is ever detected or asked: the options are always there while awake.
- **Notes for your doctor (v45):** in the "For your doctor" card, "Add a note" ("Your notes" once there are some) opens a sheet: plain text, Save note, each note stamped with the day and time, × to remove. Saved in `st.doctorNotes`. They go into the sleep diary.
- Your quilt row shows the patch count only above zero (v42).
- Link to the quilt (`?from=rest`).
- **Sleep diary (PDF):** last 2 weeks, last 4 weeks, everything, or any month. **Empty states (v37):** no rests at all shows "Your sleep diary starts with one rest" (him asleep); empty ranges are greyed. The card no longer says "0 logged so far".
  - **Notes (v45):** after Every rest, "in my own words": what woke me, how I woke up (own words) and notes for the doctor, by day and time. The "Awake in the night" line in the table now runs across the row instead of being cut off.
  - **Week by week (v47):** right after At a glance, only when two or more weeks (Monday to Sunday) have sleep. One row per week: "Week of Mon, Oct 12" with days logged, typical rest (median day total, in blue), typical night (median of rests starting 6 pm to 9 am; "naps only" if none), nights woken (days with an "Awake in the night" note; "none noted" otherwise), and shortest to longest day as words above a soft range bar with a dot for the typical day, on a shared 0 to 10+ h scale. A one-line note explains "typical".
  - At a glance: days logged, typical sleep, usually asleep and up around (medians)
  - **Hours each day** chart (v36): solid night, striped daytime, dashed typical line
  - Sleep chart, 6pm to 6pm
  - **Every rest**, with a **Total for the day** row (v36) and night notes

### The jar (`wins.js`, route `#/wins`; v26–v30, reshaped in v41)
- A drawn glass jar fills with paper stars, one per tiny win. **Each jar holds a secret 20–40 stars (v41)**, picked when the jar starts and stored in `jarPlan`. Jars that were full before v41 stay 20.
- **The size picks the shape (v41):** 20–26 a short round **jam jar**, 27–33 a tall **mason jar** with a screw band, 34–40 a big **cookie jar** with a glass lid and knob (`SHAPES`, `shapeOf`).
- **Stars come in different sizes (v41).** `layout()` piles them from the bottom up and scales them so the pile reaches the top exactly on the last star (seeded per jar, so they never move).
- No numbers are shown: "Filling up, one star at a time."
- Tap the jar to shake out a slip with a little stat, for example:
  - "You got out of bed 9 times this month."
  - "Since August 10…"
  - "On 3 hard days, you still…"
  - Falls back to the date when something has only happened once.
- **Each chip goes in once per day.** A done chip turns dark and gets ★. Tapping it again just says "Already in the jar today."
- "Or write your own…" wins have no daily limit.
- **In the jar today** pills under the jar, with × then "Remove?". This is the **only** way to remove a star.
- **The celebration (v41):** when the last star goes in, a sheet plays three steps: **the lid screws on**, **the stars swirl and glow**, and **the jar floats up onto a little shelf** next to the previous three jars. Then "Your jar is full. N tiny wins, from … to …" and **Lovely** appear. Reduced motion skips the animation. A full jar that never had its moment (e.g. filled before v41) is **celebrated belatedly the next time the Jar page opens**; if several are waiting, only the newest plays and the sheet mentions the rest. Then it goes onto the **Full jars** shelf, where each jar shows its own shape. Tap a shelf jar for its dates and three slips.
- Taking out the star that filled a jar lowers `jarsCelebrated` again.

### Mind (`mind.js`) and Letters (`letters.js`)
- Things on my mind with gentle reminders (tomorrow, the weekend, next week, or a picked date). Let go as lanterns.
- **Calling a lantern back (v41):** right after "Let it go", a bar offers **Bring it back** for about 7 seconds. Later, every row in "Lanterns you've let go · call one back any time" has a **Bring back** button (the lantern's sheet also has one). Bringing it back makes it a note again and takes its star out of the sky.
- **Sticky notes in Cosy dark (v41 fix):** a dark-mode rule meant for the Me "noticing" card was repainting the green sticky dark, with dark text. Stickies are now excluded (`:not(.sticky)`). No more "0 lanterns" line, and the Letters row shows a count only above zero.
- Letters from good-day you, sealed and opened on soft days.
- **The Mind page redesign is pending.**

### Days (`days.js`)
- Tabs: All, Move, Food, Rest, plus one tab per own goal.
- ＋ opens "Add to your calendar": create a goal, pick a resting goal back up, or switch on the optional Tiny wins, Weather and **Cycle** tabs.
- **On repeat (v51), an optional Days tab** (＋ → More tabs → "On repeat · the song you can't stop playing, era by era"), asked for by a friend. **One song at a time, as an era**: it stays on repeat until you change it; then the old one ends the day before the new one starts and goes on **the shelf**, grouped into **monthly mixtapes** (horizontal rows of small cassettes with their dates). On this tab the day card is replaced by the panel: the **tape player** (a dark deck with a big cassette: coloured shell, paper label with the cover and the handwritten title, two reels that turn while playing), the title, artist, **era name** ("“night bus season”"), "since Sat, 3 Oct · 16 days", and **the line that gets you**; **▶ Play**, **Listen in full ›**, **Change song**, **Edit**. Tapping a past day shows which song was on repeat then. The calendar marks the first day of an era (lv3 with a note badge) and every day of it (lv1). The summary line is **"October's soundtrack: Title · Artist"**: the tape on repeat for the most days that month.
  - **Change song:** a search box asks **Apple's public music search** (`itunes.apple.com/search`, no account or key) as you type; up to 6 rows with a small cover, title, artist · album and a ▶ for the 30-second preview. Pick one, then optional era name and line, and "on repeat since" (not before the current song's start, never in the future). **"Not here? Type it yourself"** for anything not found, or offline (the search then says it can't be reached). **v52, after Phavan's iPhone test failed:** from the live site in a desktop (Chrome-based) browser, Apple's search answered normally and by JSONP, but on the iPhone both failed (cause unknown; Apple likely treats iPhone requests differently). So the search now tries **Apple (normal request) → Deezer (`api.deezer.com/search`, JSONP; checked from the live site: results, covers and previews, covers copyable) → Apple (JSONP)**. If all fail, the message adds a small grey detail line with each reason, for diagnosing. **Deezer preview links expire**, so a Deezer tape keeps `did` (its track id) and no `preview`; pressing play looks up a fresh preview (`/track/<id>`). **iPhones only allow sound that starts from the tap**, so `play()` starts a silent sound immediately, then loads the real preview into the same player. The tests simulate Apple and Deezer.
  - **Covers:** a found song's cover is copied to the phone as a small JPEG (`tape.cover`), so tapes look right offline. Songs typed by hand get a **made cover**, generated from the song's name (sunburst, waves, checkerboard, halftone or gradient, with grain and the title hand-lettered on a strip of tape), always the same for that song.
  - **Play:** the preview plays inside Prequel (reels turn; "Playing a 30-second preview."). Without a preview: a tape click, a breath of hiss, then **a tiny music-box tune of its own**, generated from the song's name with Web Audio ("No preview for this one, so here's a little tune of its own."). Audio is never saved.
  - **Listen in full:** asks once "Where do you listen?" (Spotify, Apple Music, YouTube Music, YouTube; `settings.musicApp`, "change" link under the buttons). Apple Music opens the exact song; the others open a search for "title artist".
  - **A tape's sheet:** the cassette, ▶ Play, Listen in full, era name, the line, its dates (validated), Save, and Remove (asks twice).
  - **The picture (v55):** `art/onrepeat.webp`, him lying on his back on the floor with headphones, eyes closed, a cassette on his chest, a yellow Walkman by his shoulder and tapes scattered around (made with ChatGPT from Claude's prompt; Phavan didn't like the v53 walking/swaying one). Cut out with `tools/art/clean_art.py` (640×311, wide), plus the trapped background inside the Walkman's cable loop punched out. On the My year in songs card it sits beside the year, drawn with `drawFit(g, imgs.onrepeat, W - 330, 436, 540, 300)`. (v53 also put it at the top of the On repeat tab; **v54 removed it there at Phavan's request**, so the tab shows just the cassette.) In `SHELL` and `POSES`.
  - **The search sheet (v53):** sits at the top of the visible area (sized to the space above the keyboard with `visualViewport`), the heading and search box pinned, only the results scroll. Before, typing on an iPhone pushed the box off the top.
  - **My month card (v52, smaller in v53):** the soundtrack always gets a place: with a soundtrack the number tiles are a little shorter and the row is compact (a 230 px cassette, title and artist); if it still wouldn't fit, it takes the quilt patches' row.
  - **Share cards:** a new **My year in songs** card (Shoebox, Night drive, Hoodie looks; that year's tapes oldest first, 2 or 3 per row with dates and era names; a year picker if there are several), and **My month** shows "the soundtrack" with its cassette when there's room.
  - **Network:** the first feature that uses the internet, only when searching, showing a cover the first time, or playing a preview. The service worker now ignores requests to other sites, so searches and covers are never cached as app files (before this, every search would have been answered with the first one from the cache).
- **Cycle (v46), an optional private period tracker:** off by default; nobody is asked their gender or anything else. Switched on under More tabs ("a private period tracker, just for you"); switching it off hides it and keeps the data. On the Cycle tab the day card is just its own panel: one button marks a period day ("Mark as a period day" / "Period day ✓"); when marked, **How much** as droplets (Light / Medium / A lot, never "heavy"); **Anything else** chips (Cramps, Headache, Tired, Low mood, Bloated, Tender), which also work on non-period days. Rose colour plus a droplet badge, so colour isn't the only sign; a feelings-only day gets a dashed ring. Unmarked days show "Day N of your cycle". After two periods the summary gives a gentle estimate ("might start around …. Just an estimate, from your last few"): the median gap between starts (gaps under 15 or over 60 days ignored); a start is a period day with none in the 2 days before. Past the estimate: "might come any day now. Cycles shift, and that's normal." On other tabs, a quiet "Period" row with a link to the Cycle tab. **Private:** no sky stars or moments, not on share cards, not counted on the All calendar, no reports yet. Data in `st.cycleDays` (in the backup and its checks).
- Round-day calendar with rings and icon badges, not colour alone.
- Summary line under each tab, never zero. The All tab has **no** summary line (v30).
- Day card: collapsible rows, × delete, edit sets, **Add to this day** for any date.
- **Fixing a past workout (v43):** the session sheet ("sets ›") lets each weight be a number (kg) or Not noted / Bar only / Body weight (a small picker), and moves exercises earlier or later (↑ ↓). Only × removes a set; an empty weight on a weight exercise is saved as Not noted.

### Goals (`goals.js`) and Me (`me.js`)
- **Linked goals** (counted by the app): gym sessions, home-cooked meals, new foods, breakfasts, days of rest, tiny wins, letters, lanterns, or any single tiny win. Optionally count from now.
- **Own goals**, with **units** (v25):
  - counting units add 1: times, sessions, laps, pages, days
  - amount units ask "how many": hours, minutes, km
  - or a custom unit
- Edit goal: rename, target, unit, **Rest it for now / Pick it back up**, Remove. The sheet was broken from v25 to v34 and fixed in v35.
- Me shows: goal cards (or "Ready when you are · counting up to N" at zero), Resting for now, the finished shelf, counts above zero only, Your sky and Your quilt links (`?from=me`), **Share your story**, the hill, weather ribbon, last two weeks of nights (v61; was the rest clock), noticing line and look-backs. The gear opens Settings.
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

### What's new (`news.js`, `app.js` `whatsNew()`, v40)
- After an update, once, as soon as the welcome hello has gone: a sheet with him holding a note, "Fresh from the workshop · A few new things", **only the latest update** (headed with its date in words and update number), and "Got it". **Since v44**, if more updates were missed, it says "You also missed N earlier updates" with one **See all updates** button that turns the same window into the full list. It also notes "Every update stays in Settings → What's new". Never a chain of windows. Showing it marks everything seen (`newsSeen`).
- A brand-new user never gets it (marked seen on first open). Someone updating from before v40 sees the latest update.
- Settings → About → **What's new** lists every entry, with the current version.

### Start-up safety net (`index.html`, `store.js`, `sw.js`, v53)
- **Why:** a friend's Android phone stayed on the launch screen (icon and name), while the same person's laptop and Phavan's iPhone opened fine. The cause couldn't be reproduced without the phone; the likeliest was **storage that never answers** (Chrome on Android occasionally gets stuck opening a site's IndexedDB): `load()` had no time limit, so the app waited forever on a blank cream page that looks like the launch screen. Size was ruled out (the whole app is about 4 MB), and so were newer-JavaScript features (none used).
- **Storage time limits:** opening storage and reading the data each get 8 s; if either runs out, start-up **stops** (it never opens with empty data that could then be saved over the real data). The undo copy (4 s) and the "keep my data" request (2 s) just carry on if slow.
- **The safety net:** a small plain (non-module) script in `index.html`. If the app hasn't drawn its first screen within 12 s, or start-up fails (`prequelFailed`), or a file fails to load, it shows **"Prequel didn't open properly · Your data is safe on this phone"** with **Try again** (reload) and **Fix and reopen** (unregisters the service worker, deletes the cached app files, never the data, and reloads fresh), plus the reason in small grey text for diagnosing. `app.js` calls `prequelStarted()` once the first screen is drawn.
- **Opening the app (sw.js):** the fresh copy is now asked for by address (accepted by every Chrome version), only saved when it's a good answer, and the offline fallback tries `index.html`, then `./`, then the network, so it never answers with nothing.

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
| Moments (stars), incl. tiny wins, written wins, night-waking notes (`area:'rest'`, "Awake in the night: …", `woke?` since v45) | Yes | Yes | Automated |
| Gym sessions and sets, `active` session, `lifts`, `units`, custom exercises and workouts, `workoutAdds`, `subsAdded` | Yes | Yes | Automated |
| Meals, `myFoods` (label `per100`, `measures`, recipes, `portions`, `once`), old `foods` | Yes | Yes | Automated |
| Weights | Yes | Yes | Automated |
| Rests, `pendingSleep` | Yes | Yes | Automated |
| Weather check-ins | Yes | Yes | Automated |
| Mind notes and reminders, letters (incl. `opened`) | Yes | Yes | Automated |
| Goals (units, `amount`, `paused`, `finished`), goal logs (`amt`) | Yes | Yes | Automated |
| Jar (`jarPlan`, `jarsCelebrated`; older `jarsSeen`, `jarSize`), sky (`sky`), quilt (`quiltSeen`) | Yes | Yes | Automated (created by visiting the screens) |
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
2. **Every release bumps** `const VERSION = 'prequel-vN'` in `sw.js`. Any **new file must be added to `SHELL`**, or it won't work offline. **Every release also adds a `NEWS` entry** (same number) at the top of `js/news.js`: plain, friendly lines for each change, small fixes included.
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
| talking | head and shoulders, talking (v60) | the gym page's strip |
| moving | cross-legged with a notebook after a workout, white sticker outline (v63) | the Move report cover |
| quietyes | standing, small fist pump, eyes closed, towel (v66) | Session done |
| proudstar | holding up a paper star, beaming (v66) | Quick session done, Move report "on its way" |
| sitback | sitting back on his hands, happy and relieved (v66) | goal finished, Rainbow weather |
| climbing | side view, walking up with a backpack and a bottle (v67) | the hill (Me's scene card and the journey page) |
| flagplant | holding up a small blue flag (v67) | the hill, the week you pass a flag |
| biker | from behind on a bike, head turned (v68) | Slow ride |
| legday, cheer | leg press; jumping for joy | Move; goal reached and some weather moods |
| standing, umbrella, sunny | weather moods | Weather screen (`WEATHERS`) |
| letter | with a letter | Letters, Me |
| cwalk, cgrab, cflip, cfloat, cmanual, ccarve | six cool skate poses (v23) | Share cards: sky (cfloat, cwalk), milestone (cflip, cgrab), month (cmanual, ccarve) |
| waving, lying, stickynote | | **Not used** by any screen right now (still cached) |

## 8. Known issues and limitations

| # | Issue | Status |
|---|---|---|
| 1 | "Save and log" on the packet-label sheet did nothing on iPhone. Couldn't reproduce in Chromium; v32 added a keyboard-close repaint fix in `openSheet`. | **Not confirmed on iPhone** |
| 2 | The bottom tab bar highlights **Home** on several sub-pages, whatever section you came from. Checked in code 14 Oct 2026: Food, Rest, Weather, the Jar and **Quilt** all call `nav('home')`. For Food, Rest, Weather and the Jar that's arguably right, since they're opened from Home. **Quilt is the clear case**: it's also opened from Me (`?from=me`) and Rest (`?from=rest`) but still lights up Home. (Letters and Mind light up Mind; Share and Settings light up Me; Sky and Skate home have no tab bar.) | **Fixed in v56:** `nav()` in `ui.js` lights the tab in `?from=` when the page isn't a main tab itself, and `backLink()` with no arguments goes back there too. Days' "Add to this day" and "Open food for this day" now pass `from=days`. Quilt from Me lights Me; from Rest or Home lights Home. |
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
| 15 | Rest showed "Your quilt · 0 patches" when nothing was logged yet. | **Fixed in v42** |
| 14 | `DEFAULT_COMFORT` in `store.js` holds old comfort-menu examples, and they're in the public repo even though no screen shows them. | Left untouched on purpose (14 Oct 2026); to discuss |
| 13 | The script that built `data/foods.json` was never saved. | Can't be recovered; method in `DECISIONS.md` |

## 9. Pending work and decisions waiting on Phavan

**Done in v38:** B1, B2, B3 and B5 (section 5b). B4 is still open.

**Waiting for his decision (don't build until he chooses):**
1. ~~Night chips on Rest~~ **Done in v42:** replaced by one night-only "Awake for a bit" button that logs the time and length.
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
| `tools/tests/jars.js` | written 15 Oct 2026 for v41 | New: belated celebration, 20–40 sizes, the celebration, shapes on the shelf, lantern recall, dark sticky notes, no zeros | 15/15 passed |
| `tools/tests/moveorder.js` | written 15 Oct 2026 for v42 | New: real exercise order, "Last time", Your sessions + Copy (reads the clipboard), Awake for a bit, no "0 patches" | 12/12 passed |
| `tools/tests/moveedit.js` | written 15 Oct 2026 for v43 | New: Not noted / Bar only, body weight × reps and fixing old 0 kg sets, ⋯ remove (today and from the workout), fix the order, Copy on the done sheet, Your last workout, fixing a past session in Days | 15/15 passed |
| `tools/tests/startup.js` | written 18 Oct 2026 for v53 | New: a normal start never shows the recovery screen; stuck storage and a file that fails to load show it, with the reason; nothing is saved while storage is stuck; Fix and reopen reloads fresh | 6/6 passed |
| `tools/tests/ontape.js` | written 18 Oct 2026 for v51 | New: the On repeat tab, the song search (Apple and, since v52, Deezer simulated: made-up results, covers and a silent preview; the Deezer backup, fresh previews, the busy-month card), preview, eras and the shelf, typing a song (made cover and little tune), Listen in full, soundtrack of the month, editing and removing tapes, offline search, the year-in-songs and month cards, backups | 28/28 passed |
| `tools/tests/movehub.js` | written 17 Oct 2026 for v48, extended for v49 (Lately order, kickboxing) | New: the first-time picker (and the road-to-100 question), same-size tiles, your own activity, badminton's fields and highlight, the timer surviving a reload, milestones (football goals, gym sessions), Me counts, the gym page, Days removal, backup checks; v50: edit and remove on Move | 35/35 passed |
| `tools/tests/cycle.js` | written 17 Oct 2026 for v46 | New: Cycle off by default, switched on from ＋, marking days, droplets, feelings, the estimate, day of cycle, feelings-only days, quiet row on other tabs, no stars, switching off keeps data, backup checks | 14/14 passed |
| `tools/tests/sleep.js` | written 17 Oct 2026 for v45, extended for v47 (Week by week) | New: the awake card (Breathe, Put it down, Back to sleep with what woke you), six feelings and own words, doctor notes and the diary's Notes, the quilt families, Move's Yellow hint (and none for split sleep that felt okay), backup checks | 24/24 passed |
| `tools/tests/news.js` | written 15 Oct 2026 for v40, updated for v44 | What's new once after an update, never for a new user, latest only + See all updates, no second window, Settings list | 12/12 passed |
| `tools/tests/quick.js` | written 14 Oct 2026 for v37 | New: Quick session both ways, "Same as last time", Days sheet for ticked sessions, planned workouts unchanged | 17/17 passed |
| `tools/tests/sample-backup.json` | session `sample-backup.json` | `settings.name` changed to `'Sam'`; everything else was already made up | Checked: no real personal data |
| `tools/art/requirements.txt`, `tools/tests/package.json`, `tools/tests/.gitignore` | new | Dependencies: Python OpenCV, NumPy, Pillow; Node Playwright 1.56.0. Screenshots are ignored. | |

**Not preserved (on purpose):** about 34 older or one-off test scripts; the session's first `defringe.py`, plus `defringe2.py`, `holes_c.py` and `holes_s.py` (earlier versions); prototypes (`proto/`, `puppet/`, `wf/`); per-version copies (`push-vN/`, already in git); raw food sources (`data/indb`, `data/usda`, which can be downloaded again); and every personal upload. **The original full-size ChatGPT pictures** (`charart/`, `cool_in/`, `sew_in/`, `newart_in/`) were not copied because of their size. If Phavan doesn't still have them, they're lost when this conversation's workspace ends. The shipped `art/*.webp` files are unaffected.
**Lost before this handover:** the script that built `data/foods.json`.
The project has no root `.gitignore`. Nothing important is excluded from git; only `tools/tests/shots/` and `node_modules/` are ignored.

## 11. Status right now

- **Last completed:** **v76** (29 Oct 2026, not yet committed): Your moving journey's cards come out even more often and never look broken. `cardsFor`: Everything adds "your usual day to move" (the weekday with the most days moved, once there are 4+ days; two that tie show as "Tue & Fri"; more ties, no card); Gym adds "N exercises tried so far" (distinct exercises with sets; a swap counts as its own). CSS: an odd last `.jcard` becomes a slim row (icon, number, label) across the grid. Before that, **v75** (29 Oct 2026): Me no longer has the "How you've moved" counts (`.movecounts`), so 18 gym sessions isn't said three times (goal, counts, journey); the order is now hero → goals → Your moving journey card → the little counts (tiny wins, lanterns, letters) → sky and quilt → Share your story → Looking back. In `cardsFor`, the "days in <year>" card only appears when it differs from both "this month" and "all together". Before that, **v74** (29 Oct 2026, committed): **Soft days, remembered with a gold star.** `goldStar()` in quilt.js draws a gold five-pointed star with a dark outline and a running stitch in the top-right corner of a patch whose date is in `st.heavy` (also on the quilt share card, which uses the same drawing); the care label says "A gold star: a soft day". **Undo:** `toast(msg, {label, fn, ms})` in ui.js can carry a button; tapping "Fancy a slower one?" shows "Today is a soft day. Undo" for 6 s (only if today wasn't already marked); Undo deletes `st.heavy[today]` and `softLeft`. **Later:** a starred patch's back has "Not a hard day? Remove the star" (`data-unstar`). **"Back to my regular day"** (`.softback`, a real button) now keeps the mark (sets `st.softLeft`) and says "Today keeps its gold star"; nothing erases a soft day except Undo and Remove the star. The soft page's jar card: "Remember this one? That was all you." (was "You can again", which felt like pressure). **Days:** `.cal2 .d[aria-pressed="true"]` is a pale tint (`--blue-soft`; pale pink on Cycle) instead of solid blue, so the ring stays visible; the dot still marks today. Test hook: `root.__quilt()` returns the quilt layout. Before that, **v73** (29 Oct 2026, not yet committed): (1) **Gym length hidden**: Phavan, people often log after the workout, so the timed length isn't real. `session.mins` is still saved (move.js `finish`) but shown nowhere: not in the copied text (`sessionText`), not in Fix this workout (the HOW LONG box is gone; saving keeps the saved value), not in the Move report (totals, calendar and list now count only activity minutes you typed). Your moving journey's "minutes/hours of moving" card is gone; `.jcards > .jcard:last-child:nth-child(odd)` stretches an odd last card across so the grid never has a gap. (2) **The Home tab always goes home**: a capture-phase click listener in app.js on `.tabbar a[href="#/home"]`: on a soft day it sets `st.softLeft = today` (home.js shows the soft page only when `st.heavy[d] && st.softLeft !== d`); already on Home it re-routes and scrolls to the top. The day stays in `st.heavy` (quilt, jar). "Fancy a slower one?" (`data-heavy`) clears `softLeft`; a game's "‹ Home" still goes back to the soft page. "Back to a regular day" is unchanged (it un-marks the day). Before that, **v72** (27 Oct 2026, not yet committed): Fix this workout's weight boxes (`.wcell input`) have 6 px side padding and a 12 px placeholder, so "kg each side" / "lb each side" fits whole on 375 px and wider phones (it was cut to "kg each sid"). Before that, **v71** (27 Oct 2026, not yet committed): **kg or lb** for weights, asked for by a friend in the US. `js/units.js`: `st.weightUnit` ('kg'|'lb'; unset means the guess), `wu()`, `guessUnit()` (lb only if `navigator.languages[0]` ends in -US AND the time zone is a US one: read on the phone, no location permission), `showNum`/`toKg` and `showA`/`kgA` for a set's weight (numbers and `b+N`; words untouched), `withUnit`, body weight helpers. **Everything is saved in kg** (lb typed → kg to 4 places, body weight to 2); what was shown is remembered so an untouched number goes back exactly (no rounding creep). Plates (`st.units[k]==='plate'`) and seconds/minutes are never converted; `st.units` 'kg' now just means "a weight". Wired into: the gym (labels WEIGHT · LB, lb | plate toggle, ±5 lb nudges, ±2.5 lb for Bar +, hints, Same again, Last time), Fix this workout (`days.js`: converts the working copy, converts back on save), body weight (`weight.js`: range 44–880 lb), Move/Food weight rows, Your moving journey, the Move and food report PDFs. **Who gets what:** `settleUnits()` at start-up (app.js): someone already using Prequel (Move set up or any workouts/weights) gets the guess saved for good; anyone with no weights saved is marked `lbAsked` (never asked). New people choose in Move's first setup (`data-wpick`, guess pre-picked). Settings: "Weights in: kg · kilograms / lb · pounds". **The question** (`askLb`, once, from the Move hub or right after switching in Settings): only when in lb, not asked before and weights exist. Yes = the old numbers were pounds (each saved kg number is divided by 2.2046 so it shows as typed); No = they were kg. Before that, **v70** (27 Oct 2026, not yet committed): Rest's ring (`ring()` in `rest.js`) draws a rest that crosses 12am as two butt-ended arcs meeting at the top plus round dots at the real start and end (an SVG circle's dash stops where its path ends, so one arc showed only the minutes before midnight); clock labels have a dark outline; `.datechip.past` always uses dark text. A rest still belongs to the day it ended (`date: dateKey(end)`), on purpose. Before that, **v69** (26 Oct 2026, not yet committed): Slow ride gears (Easy, Brisk, Breezy up to 50 km/h) and a smoother ride (see the Slow ride section). Before that, **v68** (26 Oct 2026, not yet committed): **Slow ride** (`#/road`), an endless calm bike ride inspired by slowroads.io: six places on a loop, the sky from the real clock, distance that never resets, drag to steer; a fourth card on the games shelf (now 2×2) and a "Wind down" row on Rest. Before that, **v67** (25 Oct 2026): **Your moving journey**: moving only (the Sleep filter is gone; sleep is the diary and Me's nights chart); `previewCard()` is now a scene card (title in Gaegu, one line, a round ›, and `hillSvg` with him on it) right after the goals on Me; a "Your moving journey ›" row next to Move report on Move (`?from=move`, so Move stays lit and Back goes to Move; `FROM.move` in `ui.js`; the page's back link follows `from`). Hill pictures: `climbing` (walking up with a backpack and bottle) and `flagplant` (holding a flag), shown for 7 days after the entry that passed a flag (`hillState().planted`), standing at that flag. Before that, **v66** (25 Oct 2026):
  - **Your journey** (`js/screens/journey.js`, `#/journey?from=me`), inspired by Phavan's Habit app but calm: no streaks, rates, averages or "unmet". Me shows `previewCard()` (this month's days as a big number, 26 weeks of dots, "Your journey ›") in place of the old hill card and the "heaviest" look-backs (removed from Me). The page: a filter (Everything moving · Gym · each activity used · Sleep), Habit-style cards (round tinted icon, big number, small unit, short label; only above zero; e.g. days this month, all together, hours where timed, weeks since you started, days this year, kinds of moving, sets, heaviest, sport totals, rest weeks "taken kindly"; Sleep: nights, typical sleep, usually asleep/up), This week (7 circles), Your year (two half-year rows of dots; filled = something that day, bigger = more than once; tap for the day), Your weeks (last 12 weeks, bars scaled to the busiest week, number on top, ☾ for a rest week), Your lifts (top 5 exercises: first → latest heaviest set, sparkline with numbers; Bar + as "bar + kg"), Your hill (him walking up with flags at 10, 25, 50, 100…). One strong blue; size, ticks and words carry meaning.
  - **Workout length:** at Finish, `session.mins` = start → last set + 3 min, only when logged live on the day and 5–240 min. Editable in Fix this workout ("How long · minutes"). Counted in Journey hours and the Move report's time; shown in a session's copied text.
  - **Celebration pictures:** `cheer` (jumping) replaced by `quietyes` (workout done), `proudstar` (Quick session done, Move report "on its way"), `sitback` (goal finished, Rainbow weather). `cheer.webp` is no longer cached or used.
  Before that, **v65** (24 Oct 2026): Fix this workout: Bar + sticks, + Add a set. Before that, **v64** (24 Oct 2026, committed): Bar + on every kg weight exercise. Next: graphs for the Move report (discussed: lifts over time, what you did as bars, body check-ins on the calendar, weight line; waiting on Phavan's picks). Before that, **v63** (24 Oct 2026): `art/moving.webp` on the Move report cover (him cross-legged with a notebook, dumbbell, racket and bottle; made with ChatGPT with a white sticker outline so his blue hoodie stands out on the blue cover; cut with `clean_art.py`, the sticker's white kept). Before that, **v62** (24 Oct 2026): the Move report also offers **Last 4 weeks**; its Day by day calendar uses shorter squares past 14 days and moves to a new page whole rather than splitting. The cover picture was replaced in v63. Before that, **v61** (24 Oct 2026): **Move report** (`moveReport`/`openMoveReport` in `reports.js`, from the Move hub's "Move report" row; last 2 weeks; v62 added last 4 weeks). For him, readable by a doctor or coach: At a glance (days moved "N of 14", gym sessions, other activities, time noted, about N days a week, what I did, the body check-ins before the gym and how activities felt), Body weight (every weigh-in, with where), Day by day (a 7-column calendar with a letter per activity and a key, readable without colour), Week by week (7-day rows from the first day, never a zero), The gym (per exercise or swap: times, first / latest / best top set; Bar +, words and plates written out), Other activities (times, time noted, totals of each sport's numbers), Every session. **Highlights (`hl`) and notes are left out on purpose** (Phavan: private for now). **Me:** `nightsChart` in `charts.js` replaced `restClock` (removed): 14 rows, 6pm the evening before to 6pm, solid blue sleep, striped daytime rests (start 9 am to 6 pm), "Usually asleep around …, up around …" (`usualNight`, medians, needs 3 nights). Chosen for Phavan, who is partly colour blind: one strong blue, stripes, words. Before that, **v60** (24 Oct 2026): × on Mind notes and lanterns (`confirmRemove` in `mind.js`, asks once; a lantern's sky star goes too via `removeById`), and `art/talking.webp` (head and shoulders, from ChatGPT, cut with `clean_art.py`; the white eyes and teeth are kept) in the gym page's strip, replacing cheer/legday there (the done sheet still uses cheer). The lantern idea itself is unchanged: Phavan will explain it to his friend. Before that, **v59** (24 Oct 2026): Bar +, Next/Log takes the faint hint, hint in Gaegu. Before that, **v58** (21 Oct 2026): one weight per place per day; space above "Last time". Before that, **v57** (21 Oct 2026): gym "Last time" from saved workouts, empty first set with a hint, Weight on Move. Phavan should check his past biceps-curl sessions in Days for 12.5 kg sets and fix them. Before that, **v56** (19 Oct 2026): Stack the stars and Keep it up on a soft-day games shelf, and the tab bar following where you came from. Before that, **v55** (19 Oct 2026): the new lying-down picture on the My year in songs card. Before that, **v54** (19 Oct 2026): the character removed from the On repeat tab (just the cassette). Before that, **v53** (committed): the start-up safety net, the search box kept in view, the On repeat picture, a smaller soundtrack on My month. **Ask the Android friend to open the app again** (twice if needed, so the new version takes over); if the recovery screen appears, a screenshot of its grey line says why. Before that, **v52** (committed; song search now works on his iPhone): the Deezer backup for song search, previews on iPhones, the soundtrack on My month. **Check on the iPhone that searching and ▶ now work; if not, the grey detail line under the message says why.** Before that, **v51** (committed): On repeat. Before that, **v50** (18 Oct 2026): edit and remove on Move; `README.md` rewritten as a professional project page with four screenshots in `docs/screenshots/` (made from the fictional `sample-backup.json`, never real data). Before that, **v49** (committed): Kickboxing and MMA; Lately newest first. Before that, **v48** (committed, tried on his iPhone): Move for every kind of moving (hub, per-sport fields, timer, milestones instead of road to 100). `moveorder.js`, `moveedit.js`, `quick.js` and `sleep.js` were updated to pick Gym and open its tile first. Before that, **v47**: Week by week in the sleep diary. Before that, **v46** (committed, shared with the friend who asked): Cycle, an optional private period tracker on Days, a first version for friends' feedback. Before that, **v45** (committed as `350c26c`, working on his iPhone): gentler nights. The awake card (Breathe with me, Put it down for the morning, Back to sleep with an optional "What woke you?"), six wake feelings plus own words, Notes for your doctor in the sleep diary, Move's soft Yellow hint. Before that, **v44** (committed as `16746ab`, live): What's new shows only the latest update, with "See all updates" for any missed ones. Before that, **v43** (committed as `4a0f204`): Not noted / Bar only / Body weight weights, body weight × reps, the ⋯ sheet (measure, fix order, remove), Copy on the done sheet, just "Your last workout" on Move, and fixing past workouts in Days. Before that, **v42** (15 Oct 2026, not yet committed): Move records the real exercise order (numbered chips, "Last time", never rearranged), "Your sessions" with Copy, and Rest's "Awake for a bit" instead of the night chips. Before that, **v41** (committed as `23554fa`): jars of 20–40 stars in three shapes, stars of different sizes, the lid/swirl/shelf celebration (belated for old jars), calling lanterns back, readable sticky notes in Cosy dark. Before that, **v40** (committed as `fa7976c`): a "What's new" window after each update (once), also in Settings → What's new. Before that, **v39** (committed as `25f64ec`): "Save to this phone" on Android and computers (PDFs and share cards), and a whole quilt on the share card mid-month. Before that, **v38** (committed): a safer restore (B1, B2, B3, B5) with a comparison sheet, a 7-day undo and kind messages. Before that, **v37** (committed as `ebc05b3`): no future dates, top-5 usuals, report empty states, Quick session. Tested in desktop Chromium only.
- **Last discussion:** the night chips, weather in the sleep diary, and what weather connects to. Answered; waiting on his choices.
- **Handover finished on 12 Oct 2026:** tools preserved, backup audited, docs updated, `README.md` rewritten, `START_HERE.md` added. Phavan committed and pushed these as `609bbc9` (verified 14 Oct 2026).
- **14 Oct 2026, new conversation:** reviewed the project (v36, clean, matches GitHub; 27 JS modules pass the syntax check; `backup.js` 21/21 on a copy). Docs cleanup: stale "not committed" notes fixed, reading order made consistent, test-server instructions corrected, the tab-bar issue described accurately, B1 set as the next priority, and the ongoing docs and conversation-change workflow added (`START_HERE.md` 8b and 8c).
- **Next:** Phavan commits v48 and asks friends what's missing in the new Move. Waiting on his friend's feedback on Cycle. "Hours each day" stays as it is for now (Phavan: give it a while before deciding; the line-chart idea was dropped as too complex). Then **Move reports** (scope to decide: gym only or all activities). Friends now use Prequel too, so features should suit anyone, and the personal comfort-menu defaults are worth revisiting. The "phone breaks" question stays **shelved** (`DECISIONS.md` H).

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
