# Prequel: decisions

_Written on 12 October 2026, at version **v36**; last updated 14 October 2026. This file says **why** Prequel is the way it is. Read it before changing anything you see here. Add to it only when Phavan **explicitly approves or rejects** something; ideas still being explored belong in section H, or aren't written down yet._

**What the labels mean:**
- **Confirmed**: Phavan asked for it or approved it, and it's built (or he made a clear call).
- **Proposal (not approved)**: Claude suggested it. Phavan hasn't said yes. **Don't build it without asking.**
- [verified], [from history] and [unverified] have the same meanings as in `HANDOVER.md`.

---

## A. Confirmed product principles [from history: the planning doc "Companion App — What We've Decided", 6 Oct 2026, plus later conversations]

1. **Kindness only.** Every word is gentle. Nothing scolds, nags or grades. Missed days are never mentioned.
2. **Count up, never reset.** Totals only grow. **No streaks.**
3. **No comparison.** No week-against-week, no "better or worse than last time", no other people.
4. **Life isn't linear.** Hard days are expected and get their own space: the soft day. They aren't treated as failures.
5. **Small wins count big.** Getting out of bed counts. That's what the jar is for.
6. **Nothing imposed.** Goals are his own and optional. Starter suggestions can be removed. Optional tabs stay off until he switches them on.
7. **Surprise lives only in rewards.** Slips from the jar, constellation names, the welcome screen. Never in anything he has to do.
8. **No zeros on screen.** Show counts above zero only, "–" instead of 0 for unknown nutrients, and "Ready when you are" for a goal at zero.
9. **Dates are written in words** on screen and in reports, never `10/10/2026`. In the reports he asked for "October 10" order. [from history] (Home and some lists still use "Saturday 10 October"; see HANDOVER issue 7.)
10. **Colour is never the only signal.** Icons, patterns, labels or rings go with it. This affects calendar badges, quilt patterns and chart line styles.
11. **Offline always.** He has no signal for much of the day. Every feature, including PDFs and share cards, must work offline.
12. **Private by design.** Data stays on the phone. No accounts, no analytics, no servers. Share cards and PDFs only leave through the share sheet when he sends them.

## B. Features deliberately left out (confirmed)

| Left out | Why | Status |
|---|---|---|
| Streaks | Break on bad days and punish | **Never** without a conversation |
| Weekly targets, percentages, progress bars to a deadline | Pressure, grading | **Never** without a conversation |
| Week-vs-week or me-vs-others comparison | Principle 3 | **Never** without a conversation |
| A counted "people" or social section | Not what the app is for | Left out |
| LLM or AI chat inside the app | Privacy, offline, cost | Left out |
| Apple Health, widgets | A web app can't do them well | Left out |
| **Calorie counting** | In the original plan | **Reversed.** He asked for food numbers (kcal, protein and so on) and they're built. Keep them **gentle**: no daily calorie target, no red over-limit warnings. [from history] |

## C. Specific design calls (confirmed) [from history]

**Wording**
- The word **"heavy"** is never shown. The state is called a **soft day**. (`heavy` survives only as an internal data key.)
- The jar is called **"The jar"**, not Tiny Wins. Its route is still `#/wins`.
- Weather check-in question: **"How's the weather inside?"**

**Home and soft day**
- The room has a window, a rug, a quilt hoop and him. **No shelf, pinboard or bed in the room** (all tried and rejected).
- The soft day shows Skate home, a note from the jar, and a letter. **The comfort meal and the tiny-win prompt were removed from soft days.**
- The soft day restyles **Home only**, for **that date only**. (A whole-app soft look was offered; no answer.)
- The soft-day prompt icon is 🍵. Blanket and mug icons were rejected.

**The jar**
- ~~20 stars fill a jar~~ (50 was rejected as too slow). **Since v41 each jar secretly holds 20–40 stars**, picked when it starts, so filling it is a surprise (Phavan, 15 Oct 2026). Jars already full stay 20.
- **The jar's shape hints at its size** (jam jar, mason jar, cookie jar), chosen over a fully hidden size because it makes the shelf a quirky collection. **Stars come in different sizes** (his idea).
- **Celebration:** the lid screws on, the stars swirl, and the jar floats onto the shelf (his picks; "then we'll think of ways to improve"). Jars that filled without a celebration get a **belated** one.
- **No numbers** under the jar.
- Each chip counts **once per day**. Written wins have no limit.
- Stars can be removed **only** from "In the jar today". The remove-by-chip idea was rejected.
- Full jars go onto a shelf. **A separate look-back screen was shelved.** The shelf jars are the look-back.

**Days (calendar)**
- Month view only. **The year grid was rejected.**
- **Mind is not on the calendar.**
- No plain coloured dots: rings and icon badges instead.
- **The All tab has no summary line.**

**Quilt**
- One quilt per month. A **finished month must look whole**, with no empty patches. Some patches go double-wide to fill it.
- The fabric colour comes from hours slept and the pattern from how he felt. A split patch means a two-part night; a button means a nap.

**Share cards**
- Cool skate poses on cards (the six `c*` poses). **The cheer pose was rejected** for cards.
- **No Skate best-score card.**
- One "Share or save" button. The picture is pre-built so the iOS share sheet opens straight from the tap.

**Reports and export**
- Exports are PDF, with dates in words. **CSV export was rejected.**
- Sleep diary periods: 2 weeks, 4 weeks, everything, or a picked month.
- Food reports: last 7 days, or a picked month that has food.
- **No empty PDFs (v37):** with nothing logged, a warm "first report" sheet explains it instead (never the words "no data"); a date range with nothing in it is greyed and can't be picked.
- The food report's "gentle ideas" are suggestions, never verdicts. Some nutrients (B12, vitamin D, iron, fibre and others) were chosen for **personal health reasons he shared**. The details stay out of these docs.

**Food**
- For grains and pulses, **cooked versions come first** in search. Raw grains in a meal show an "uncooked: about 3× once cooked" note (v34).
- Label entry: blanks stay **unknown, never zero**. A **missing-decimal check** warns when the numbers don't add up (v32).
- A saved meal can be a **one-off** ("Keep it in my foods" switched off).
- Editing a food's numbers can also fix past logs, but **only if he ticks the box**.
- **Usuals (v37):** the top 5 sit on the page **in a vertical list**, then an "All your usuals" button opens a sheet with all of them. He chose this over a sideways-scrolling row (**he doesn't like sideways scrolling**) and over hiding all usuals behind a button (that would cost an extra tap for the most common log).

**Backup and restore (v38)**
- **Missing parts are fine, wrong parts are not.** Old backups keep restoring; a file with any wrong-shaped part is refused **as a whole**. Phavan didn't want Prequel to try to rescue what it can.
- Before restoring, show **what's in the backup next to what's in the app now**, and warn when the backup is older ("Anything logged after <date> would be gone").
- Offer **"Save what's here as a file first"**, and **also** keep an automatic safety copy on the phone for **7 days**, with an undo.
- **Transparency:** the undo card says plainly that Prequel stored the app's data from before the restore, just in case, asks whether to undo, and says until when it's kept.
- Kind refusal messages that always say nothing was changed. "Last backup" only counts once the file was really saved. A restore is saved straight away.

**Saving and sharing (v39)**
- iPhone keeps **one "Share or save" button** (its share sheet can save). Android and computers get **"Save to this phone" / "Save image"** plus **"Share"**, because Android's share sheet usually can't save to the phone. Backups download directly there.
- **The quilt share card always shows a whole quilt**, even mid-month (Phavan, 15 Oct 2026). The Quilt page itself keeps the in-progress quilt with the needle.

**What's new (v40)**
- After each update, a window shows **once**, then never again until the next update. It covers **real features and small fixes**, in plain, friendly words.
- Title: a combination, "Fresh from the workshop" over "A few new things". It's also kept in **Settings → What's new**.
- **Only the latest update shows (v44)**, so it never feels like a pile of pop-ups. If more were missed, one **See all updates** button opens the full list in the same window (Phavan's idea; Claude suggested opening it in place rather than sending people to Settings).
- New users don't see it. Which updates were seen belongs to the phone, so restoring a backup doesn't bring old "seen" marks back.

**Mind (v41)**
- A lantern let go can always be **called back**: "Bring it back" right after letting go, and "Bring back" in the lantern list any time.
- Sticky notes keep their paper colours in Cosy dark.

**Move: order and sessions (v42)**
- Prequel records the order you really did exercises in, and **shows** it next time ("Last time: …"). It **never rearranges** the plan (Phavan's choice).
- Sessions are kept on Move with a **Copy** button. Phavan's other app only has a text box and he wasn't fond of his own format, so Claude designed a cleaner one: a title line, the date with counts, then numbered exercises in the order done, each with its sets on one line.

**Move: logging honestly (v43)**
- A weight can be **"Not noted"** (Phavan's wording, chosen over "Didn't check", which sounded negative), **"Bar only"** or **"Body weight"**, instead of a made-up 0. Bar only stays a plain label for now; setting the bar's weight could come later.
- **Body weight × reps** is a way to measure an exercise. Switching an exercise to it **asks** before changing old 0 kg sets.
- A visible **⋯ button** (not a hidden double tap) holds an exercise's options: how it's measured, fixing the order, and removing it if added by mistake.
- Fixing the order uses **arrows** (↑ ↓), chosen over tap-in-order.
- **Copy this workout** right on the Session done sheet. Move shows just **Your last workout** + **All your sessions**. No extra last-workout card at the top, because the page is busy enough.

**Rest (v42)**
- The night chips ("What did you do") are **gone**. In their place is one night-only **"Awake for a bit?" → "Back to sleep"** button that logs when and how long (the option Claude recommended, approved 15 Oct 2026).

**Cycle (v46, agreed 17 Oct 2026)**
- A period tracker, asked for by a friend using the app. **Ship a first version and let users say what's missing**, rather than collecting wishes first (Phavan).
- **Never ask gender.** It's an optional tab anyone can switch on from Days → ＋, announced once in What's new.
- Private: on the phone only, no sky stars, never on share cards. Flow shown as droplets, never "heavy". The estimate is always called an estimate; no fertility or contraception predictions.

**Sleep, gently (v45, agreed 17 Oct 2026)**
- **Minimal and warm, never overwhelming.** A helping hand, not pressure (Phavan; friends using the app said the same). One main button, quiet extras, nothing extra on screen unless you open it.
- **Nothing is detected or guessed.** Breathe with me and Put it down for the morning are simply offered while you're awake.
- **"What woke you?" is a free text box with no preset options**, and always optional.
- **Six wake feelings:** Refreshed, Rested, Okay, Tired, Groggy, Restless, **mapped onto the three existing quilt pattern families**, so the quilt stays readable. Plus an optional "in your own words". Old nights keep their meaning.
- **Notes for your doctor:** plain text only, stamped with day and time, into the sleep diary. Named generally so it suits anyone.
- **Move's Yellow hint** uses only what you told Rest: a groggy or restless wake-up, or under 5 hours of rest in the last 24 hours (naps count, so split sleep isn't punished). It's a suggestion; you still choose, and it steps aside once you pick a light.

**Logging dates**
- **Nothing can be logged for a future day (v37)**, on any screen. A future pick snaps back to today with a gentle note. **Exception:** Mind reminders, where looking ahead is the point.

**Move: Quick session (v37)**
- A one-tap way to start without planning, for tired days. It asks how to track it, and remembers the last answer:
  - **Track sets and reps:** pick exercises as you go, not before.
  - **Track without reps:** tick the exercises you did. He wants the exercises recorded even without numbers, so a plain "I went" log was rejected.
- **Same as last time** repeats the last session's exercises.
- A Quick session counts toward the road to 100, like any session.
- Name: "Quick session".

**Navigation**
- **Back buttons go back to where you came from**, using `?from=` (v35). The `FROM` map in `ui.js` holds the labels. Any new link into a sub-page must pass `from`.
- Bottom tab bar: Home, Days, Move, Mind, Me. Settings is reached from the gear on Me.

**Goals**
- A goal can **rest** ("Rest it for now") and be **picked back up**. Never "failed" or "abandoned".
- Own goals have units (times, sessions, laps, pages, days, hours, minutes, km, or custom). Amount units ask "how many".
- Goals can be created from the calendar's ＋.

## D. Character art requirements (confirmed) [from history]

- **The same character everywhere:** messy black hair, round glasses, bright **cobalt-blue oversized hoodie**, black joggers with white side stripes, white and blue chunky sneakers.
- **Style:** hand-drawn manga or comic, clean black ink lines, soft flat colour, **plain white background** (so `clean_art.py` can cut it out), full body, no text, no props cut off at the edges.
- **Canonical prompt:** the exact wording of the prompt used with ChatGPT was **not saved** in any file. **[unverified]** Rebuild it from the description above, and ask Phavan for his saved prompt if he has one.
- **Processing:** each image goes through `tools/art/clean_art.py`, then `tools/art/defringe.py`, then a check with `tools/art/holes.py` (see `tools/README.md`). Check it on both cream and dark backgrounds. Then 640 px webp in `art/`, and **add it to `SHELL`**.
- **Rejected:** the **puppet rig** (an animated, jointed character). It was prototyped and dropped in favour of single pictures for each mood or time.
- Poses should look **cool and natural**. He rejected stiff or cheesy poses for share cards.

## E. Architecture decisions (confirmed) [verified in code; reasons from history]

| Decision | Why |
|---|---|
| Plain HTML, CSS and JS with no framework and no build step | One person, no tooling to break, easy to host on GitHub Pages, files can be edited and checked one at a time |
| A PWA from Safari, not an App Store app | Free, no Apple developer account, updates by git push |
| IndexedDB with one state object, plus JSON backup | Survives better than localStorage on iOS. One object keeps import and export simple. |
| Everything cached by the service worker, including fonts and `foods.json` | Offline is essential (principle 11) |
| Fonts bundled, not from Google Fonts | Offline and privacy |
| Food DB is INDB (Indian recipes) plus USDA SR27, converted once into `data/foods.json` | He eats mostly Indian food. USDA covers ingredients. Offline. |
| PDFs drawn on canvas as page pictures, with no library | Works offline, uses the app's own fonts and art, no dependency. Downside: text can't be selected. |
| Share cards drawn on canvas | Same reasons; story size (1080×1920) |
| No backend | Privacy, cost, offline. Stage 3 (Canvas calendar) may need a small Cloudflare Worker; that's a **future** decision. |

**How `foods.json` was built** [from history; script lost; details unverified]: INDB recipes and USDA SR27 foods were read in. The 12 nutrients were normalised to **per 100 g**, with serving sizes kept where the source had them. Each entry is tagged with its source, and everything was written as one JSON file. To rebuild it, a new script would be needed. Check the result against the current file before replacing it.

## F. How Phavan likes to work (confirmed) [from history; collaboration style restated by Phavan, 14 Oct 2026]

**Creative collaboration (this matters as much as the technical workflow).** Phavan is conversational and creative. He enjoys brainstorming, improvising, exploring unusual ideas and slowly discovering what a feature should become. Claude is his creative collaborator and development partner, **not an assistant that takes instructions and immediately writes code.** That means:
- Discuss ideas before implementing them, and explore possibilities without rushing into code.
- Offer thoughtful alternatives, with their advantages and disadvantages, and give a recommendation. **The final decision is his.**
- Challenge ideas constructively when something could work better.
- Respect decisions he's already made (sections A–E and G).
- Preserve Prequel's personality, charm and emotional identity.
- Keep explanations simple, approachable and conversational.
- **Never implement an idea just because it was discussed.** Wait for his explicit approval.

**Technical workflow:**
- **Discuss first.** Ideas, options and a recommendation, then he decides. Big features get a plan before any code.
- **Show screenshots** of changes before pushing.
- **Plain, non-technical language.** Short explanations, with the reasoning.
- **He commits and syncs himself** in VS Code from the commit message Claude gives. Claude never commits, pushes or deploys.
- Every release bumps `VERSION` in `sw.js`. After an update he closes and reopens the app on his iPhone.
- He tests on his **iPhone** (Safari, added to Home Screen). Claude tests in desktop Chromium and says so.
- He writes the character prompts in ChatGPT and sends the images back; Claude cuts them out with `tools/art/`.
- **`tools/` is development only:** never add it to `sw.js` `SHELL` and never link it from the app. Test scripts use made-up data only, and real backups never go in the repo.
- **Audits and handovers don't change app code.** Bugs found are written down and fixed only after he approves.
- **Docs are kept current as work happens** (agreed 14 Oct 2026), updating only the relevant parts, with a short, focused handover when moving to a new conversation instead of a full one. The steps are in `START_HERE.md` 8b and 8c.

## G. Never reverse without discussion

- No streaks, targets, percentages, comparisons, or zeros on screen.
- Kind wording; "soft day", never "heavy".
- Offline for everything; no backend; data stays on the phone.
- Dates in words; colour never alone.
- A jar of 20–40 stars (secret, shaped by size), no numbers under it, once per chip per day.
- Back buttons follow `?from=`.
- Finished quilts are whole.
- Food: blanks are unknown not zero, cooked grains first, and past logs only change when he ticks the box.
- The character's look.

---

## H. Proposals NOT approved (don't build without asking)

| Proposal | Where it came from | State |
|---|---|---|
| A weather row in the sleep diary under "Hours each day" | After v36 | Offered |
| A richer goal celebration: count-up and confetti, gold shooting star, trophy on the shelf, note to future you, share card, optional chime | Earlier conversation | Offered; "loud or quiet?" never answered |
| Mind page redesign | His own idea ("keep it in mind") | **Not designed yet** |
| Recognise Indian rice names (seeraga samba, sona masoori, ponni) in food search | v34 conversation | Offered |
| A whole-app soft-day look | Earlier | Offered, no answer |
| A one-time "You've already filled N jars!" moment | Jar work | Offered |
| Light motion lines on dark share cards | v23 | Offered |
| Fix the bottom tab bar so it highlights the section you came from (mainly Quilt, opened from Me and Rest; see HANDOVER section 8, issue 2) | Found during this handover; described more accurately 14 Oct 2026 | Not discussed yet |
| A pin on usuals, so a favourite always stays in the top five | v37 discussion | Offered; not answered, so not built |
| Keep, change or remove the old comfort-menu defaults (`DEFAULT_COMFORT` in `store.js`) | 14 Oct 2026 review | Left untouched for now; to discuss |
| Change Home's date order to "October 10" | Found during this handover | Not discussed yet; **ask him** |
| Protecting data if the phone breaks or is replaced: three directions offered: (1) a stronger backup habit (more frequent gentle nudge, one-tap save from Home), (2) steer backup files to iCloud Drive so they survive the phone, (3) cloud sync (Firebase), the real fix but a big step away from "nothing leaves the phone". Not decided; also worth testing whether iCloud's own phone backup keeps a home-screen web app's data (unverified) | Phavan's question, 14 Oct 2026 | **Shelved** until the next session |
| A clearer chart instead of the sleep diary's "Hours each day" (his doctor found it confusing). Four mock-ups: A total bars with numbers, B two named lines (night / night + day), C side-by-side bars, D a weekly summary table with ranges | Phavan, 17 Oct 2026 | **Discussing** |
| Move as an "active" page: Gym as one option among badminton, walks and others (gaming questioned) | Friends' feedback, 17 Oct 2026 | **Shelved until Cycle is done**, then discuss |
| **Move PDF reports** (order and the session log are done, v42) | Phavan, 14–15 Oct 2026 | Agreed in principle; to design |
| Backup B4: prefer the newer copy on load | Backup audit, 12 Oct 2026 (HANDOVER 5b) | **Still open.** (B1, B2, B3 and B5 were approved and built in v38, see section C.) Earlier note: On 14 Oct 2026 Phavan made **B1 the next recommended technical fix**. His preferred direction: stricter validation, a clear explanation of what restoring will replace, and a chance to save current data before importing, while keeping older legitimate backups restorable and adding no new risks. The actual solution must be proposed and discussed in its own task before anything is built. B2–B5 stay open. |

### Done during the handover (approved by Phavan, 12 Oct 2026)
- `README.md` rewritten as a short entry point.
- Dev tools saved in `tools/` (art scripts, seven test scripts, fictional sample data).

### Agreed on 14 Oct 2026
- The ongoing docs workflow and the focused conversation-change handover (`START_HERE.md` 8b and 8c).
- B1 is the first technical priority after the docs cleanup (the fix itself still needs approval; see the table above).
- The creative-collaboration style in section F.
- v46: Cycle, an optional private period tracker on Days.
- v45: gentler nights: awake card extras, what woke you, six feelings + own words, doctor notes in the diary, Move's Yellow hint.
- v44: What's new shows only the latest update, plus "See all updates".
- v43: Not noted / Bar only / Body weight, body weight × reps, ⋯ sheet (measure, fix order with arrows, remove), Copy on the done sheet, Your last workout, fixing past workouts in Days.
- v42: real exercise order shown (never rearranged), Your sessions with Copy, "Awake for a bit" instead of night chips.
- v41: jars of 20–40 stars, shaped jam/mason/cookie, stars of different sizes, the lid/swirl/shelf celebration (belated for old jars), lantern recall, sticky-note colours.
- v40: "What's new" window (once after each update, kept in Settings), titled "Fresh from the workshop · A few new things".
- v39: Save to this phone on Android, and a whole quilt on the share card.
- v38: safer restore (B1, B2, B3, B5), with the comparison sheet, the older warning, save-first, a 7-day undo with a transparent message, and whole-file refusal.
- v37: no future dates, top-5 usuals + "All your usuals" sheet, report empty states, Quick session (all approved by Phavan and built).

## I. Future ideas (his, not yet planned in detail)

 Stage 3, a uni planner from his Canvas calendar feed as a comic-style planner. Stage 4, a printable A4 monthly showcase. Cloud sync with a login (leaning Firebase). A cookbook with photos.
