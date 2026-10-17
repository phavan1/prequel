import { esc, openSheet, him } from './ui.js';
import { dayDate } from './pdf.js';

// What's new: a few plain lines for every update, newest first. Shown once after an update, and kept in Settings.
// Every release adds an entry here (same number as VERSION in sw.js). Write it the way you'd tell a friend.
export const NEWS = [
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
