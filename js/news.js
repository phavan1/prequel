import { esc, openSheet, him } from './ui.js';
import { dayDate } from './pdf.js';

// What's new: a few plain lines for every update, newest first. Shown once after an update, and kept in Settings.
// Every release adds an entry here (same number as VERSION in sw.js). Write it the way you'd tell a friend.
export const NEWS = [
  { v: 61, date: '2026-10-24', items: [
    'New: a Move report. On Move, tap "Move report" for a PDF of your last 2 weeks: days you moved, your gym exercises (first, latest and best), other activities, how your body felt and your weight. Highlights and notes stay private.',
    'On Me, the sleep circle is now "Your last two weeks of nights": one row a day, solid bars for sleep, striped bars for daytime rests, and a plain line with when you usually fall asleep and wake up.'
  ] },
  { v: 60, date: '2026-10-24', items: [
    'Every note on Mind, and every lantern you\'ve let go, now has a little × to remove it. It asks once first.',
    'In the gym, he now talks you through your workout, head and shoulders, instead of jumping about.'
  ] },
  { v: 59, date: '2026-10-24', items: [
    'New in the gym: "Bar +", for when you load plates on a bar but don\'t know what the bar weighs. Type the kg on each side, and it\'s saved as "bar + 2.5kg each side". It doesn\'t show on machines.',
    'The faint "last 10" on your first set now counts: tap Next and Log without typing, and it logs last time\'s numbers.',
    'That faint "last" hint is now written in Prequel\'s handwriting.'
  ] },
  { v: 58, date: '2026-10-21', items: [
    'Your weight is one a day for each place (Gym, Hospital, Other). Saving again on the same day changes that day\'s number instead of adding another.',
    'A little more breathing room above "Last time" in the gym.'
  ] },
  { v: 57, date: '2026-10-21', items: [
    'In the gym, "Last time" now comes from the workouts you actually saved, with every set, like "10kg × 12, 10kg × 10". Fix an old workout in Days and it updates here too.',
    'The first set of each exercise starts empty, with last time showing faintly as a hint. Tap Same again to use it, or type what you lifted. Nothing gets saved that you didn\'t choose.',
    'Your body weight can be logged from Move now as well as Food. It\'s the same log.'
  ] },
  { v: 56, date: '2026-10-19', items: [
    'Two new games on a soft day, next to Skate home. Stack the stars: tap to drop each star and build a tower up past the clouds to the moon. Keep it up: slide the pillow to keep your emoji in the air (pick any emoji), and it gets faster with every bounce.',
    'The bottom bar now remembers where you came from. Open your quilt from Me, and Me stays lit. Open food from Days, and Back takes you to Days.'
  ] },
  { v: 55, date: '2026-10-19', items: [
    'A new picture on the My year in songs card: he\'s lying back on the floor with his Walkman, lost in a song.'
  ] },
  { v: 54, date: '2026-10-19', items: [
    'On repeat in Days now shows just your cassette, without the picture above it. He\'s still on the My year in songs card.'
  ] },
  { v: 53, date: '2026-10-18', items: [
    'If Prequel ever has trouble opening, it now says so and offers "Try again" or "Fix and reopen", instead of getting stuck on the start screen. Your data stays safe either way.',
    'Searching for a song keeps the search box in view while results appear.',
    'A new picture of him, lost in a song, on On repeat and the My year in songs card.',
    'The soundtrack on My month is a little smaller and calmer.'
  ] },
  { v: 52, date: '2026-10-18', items: [
    'Song search on On repeat now works on iPhones: if Apple\'s search doesn\'t answer, Prequel asks Deezer\'s instead. Same covers, same 30-second previews.',
    'Previews start properly on iPhones when you press play.',
    'My month now always shows its soundtrack, even in a busy month.'
  ] },
  { v: 51, date: '2026-10-18', items: [
    'New: On repeat. Keep the song you can\'t stop playing, one era at a time, as a little cassette tape. Turn it on in Days → ＋ → On repeat.',
    'Search for your song and pick it with its cover, then press play on the tape for a 30-second preview, or "Listen in full" in your own music app.',
    'Name the era, add the line that gets you, and when you change the song the old tape goes on your shelf, in monthly mixtapes.',
    'Each month gets a soundtrack (the song you had on repeat longest), and there\'s a new "My year in songs" share card.',
    'Songs Prequel can\'t find get a cover of their own, and a tiny tune of their own too. Tell Phavan what\'s missing.'
  ] },
  { v: 50, date: '2026-10-18', items: [
    'You can now change or remove a log right on Move. Tap an activity to see its recent logs, or tap anything in "Lately", then Edit or Remove.',
    'Gym sessions too: open one and tap "Fix this workout" or "Remove". No more trips to Days for it.'
  ] },
  { v: 49, date: '2026-10-17', items: [
    'Kickboxing and MMA are on Move now. Kickboxing logs pads, bag work, sparring or class, rounds and round length. MMA logs striking, grappling, wrestling, sparring or class, and rounds.',
    '"Lately" on Move now shows your most recent days first.'
  ] },
  { v: 48, date: '2026-10-17', items: [
    'Move is now for every kind of moving: walks, runs, badminton, football, swimming, yoga and more, plus anything of your own. The gym is one of them, just like before.',
    'Each activity logs what matters for it, like games played, goals, laps or distance. All of it optional, plus a "highlight of the day".',
    'Log one you did, or tap "Start now" and Prequel keeps time for you, even if you close the app.',
    '"How\'s the body?" now sits at the top of Move, for whatever you do today.',
    'No more set "road to 100". Give any activity a milestone of your own: sessions, hours, km, games, goals, whatever you like.',
    'This is a first version. Tell Phavan what\'s missing.'
  ] },
  { v: 47, date: '2026-10-17', items: [
    'The sleep diary has a new "Week by week" table: typical rest, typical night, nights you woke, and your shortest to longest day, for each week. Handy for seeing if things are changing.'
  ] },
  { v: 46, date: '2026-10-17', items: [
    'New, and only if you want it: a private period tracker. Turn it on in Days → ＋ → Cycle.',
    'Tap a day to mark it as a period day. How much and how you felt are there if you want them.',
    'After a couple of periods, Prequel gently estimates when the next one might start. It\'s just an estimate.',
    'It stays on your phone. No stars in the sky, nothing on share cards. This is a first version, and what you think will shape the next one.'
  ] },
  { v: 45, date: '2026-10-17', items: [
    'Awake in the night? The Awake card now has "Breathe with me", a slow in-and-out to follow for as long as you like.',
    '"Put it down for the morning": write down what\'s on your mind, and it waits on Mind until morning, so your head doesn\'t have to hold it.',
    'When you head back to sleep, you can say what woke you, in your own words. Only if you want to.',
    'Six ways to say how you woke up: Refreshed, Rested, Okay, Tired, Groggy or Restless. Add a few words of your own if you like. Your quilt still sews them in.',
    '"Notes for your doctor" on Rest: jot things down, and they go into your sleep diary with the day and time.',
    'After a rough night, Move might gently suggest a Yellow day. You still choose.'
  ] },
  { v: 44, date: '2026-10-15', items: [
    'This window now shows just the latest update. If you missed a few, "See all updates" opens the whole list right here.'
  ] },
  { v: 43, date: '2026-10-15', items: [
    'Forgot to check the weight? Tap "Not noted" under the weight box. There\'s also "Bar only" and "Body weight".',
    'Exercises you do with your own body weight can be set to "Body weight × reps", so you only type reps. Prequel offers to fix your old 0 kg sets too.',
    'Each exercise has a ⋯ button: change how you measure it, fix the order you did things in, or remove it if you added it by mistake.',
    'In Days, you can fix a past workout: mark a weight as not noted, put exercises in the right order, and more.',
    'When you finish a session, you can copy it straight away. Move now shows just your last workout, with all the others one tap away.'
  ] },
  { v: 42, date: '2026-10-15', items: [
    'Move remembers the order you really did your exercises in. The exercise buttons get little numbers as you go.',
    'Next time you do the same workout, you\'ll see "Last time" with the order you went in. Nothing gets rearranged.',
    'Your sessions now live on Move. Tap one to see it, and Copy it to paste into any other app.',
    'Rest has one "Awake for a bit?" button at night instead of the list of chips. Tap it when you\'re up, and again when you head back to sleep. It shows up in your sleep diary.',
    'No more "0 patches" on Rest before your first night.'
  ] },
  { v: 41, date: '2026-10-15', items: [
    'Every new jar secretly holds 20 to 40 stars, so you never quite know when it will fill.',
    'Jars come in shapes now: a little jam jar, a tall mason jar or a big cookie jar. The bigger the jar, the more stars it holds.',
    'The paper stars come in different sizes.',
    'A full jar gets a proper moment: the lid screws on, the stars swirl, and it floats onto your shelf. Jars that filled before this get theirs the next time you open the jar.',
    'Let a lantern go by mistake? Tap "Bring it back" straight away, or call it back any time from "Lanterns you\'ve let go".',
    'Sticky notes on Mind are readable again in Cosy dark.'
  ] },
  { v: 40, date: '2026-10-15', items: [
    'This little window. After each update, Prequel tells you what\'s new, just once.',
    'You can read it all again any time in Settings → What\'s new.'
  ] },
  { v: 39, date: '2026-10-15', items: [
    'On Android, reports and share cards now have a "Save to this phone" button, so PDFs and pictures land in your Downloads.',
    'Sharing your quilt in the middle of a month now shows a whole quilt, not a half-finished one.'
  ] },
  { v: 38, date: '2026-10-14', items: [
    'Restoring a backup is safer. Prequel shows what\'s in the file next to what\'s in the app, and warns you if the backup is older.',
    'After a restore, Prequel keeps a copy of your old data for 7 days, so you can undo it.',
    'A damaged backup file is refused, and nothing in the app changes.',
    '"Last backup" only counts when a backup was really saved.'
  ] },
  { v: 37, date: '2026-10-14', items: [
    'You can\'t log things for days that haven\'t happened yet. Prequel gently takes you back to today.',
    'The food page shows your top 5 usuals, with the rest in an "All your usuals" sheet.',
    'Quick session on Move: start without a plan, and track sets and reps or just tick what you did.',
    'With nothing logged yet, reports kindly say "not yet" instead of making an empty PDF.'
  ] }
];
export const LATEST = NEWS[0].v;

// one block per update: the date in words, then its lines
export function newsHtml(entries) {
  return entries.map(n => '<div class="newsday"><div class="lbl">' + esc(dayDate(n.date)) + ' · update ' + n.v + '</div><ul>' + n.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>').join('');
}
// the window: "Fresh from the workshop · A few new things". After an update it shows only the latest one (v44);
// if more were missed, one "See all updates" button turns the same window into the full list. Never a chain of windows.
const head = title => '<div class="newshead">' + him('letter', 'pop', 'Your character holding a note') + '<div><div class="k">Fresh from the workshop</div><h2>' + title + '</h2></div></div>';
const fullList = () => head('What\'s new') + '<div class="newslist">' + newsHtml(NEWS) + '</div><button type="button" class="btn" data-close>Done</button>';
export function openNews(entries, all) {
  if (all) { openSheet(fullList()); return; }
  const missed = entries.length - 1;
  const sheet = openSheet(head('A few new things') + '<div class="newslist">' + newsHtml(entries.slice(0, 1)) + '</div>' +
    (missed > 0 ? '<div class="newsmore"><p>You also missed ' + missed + (missed === 1 ? ' earlier update.' : ' earlier updates.') + '</p><button type="button" class="btn alt" data-allnews>See all updates</button></div>' : '') +
    '<p class="muted newswhere">Every update stays in Settings → What\'s new.</p>' +
    '<button type="button" class="btn" data-close>Got it</button>', ev => {
    if (ev.target.closest('[data-allnews]')) { const sh = sheet.querySelector('.sheet'); sh.innerHTML = fullList(); sh.scrollTop = 0; }
  });
}
