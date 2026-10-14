import { esc, openSheet, him } from './ui.js';
import { dayDate } from './pdf.js';

// What's new: a few plain lines for every update, newest first. Shown once after an update, and kept in Settings.
// Every release adds an entry here (same number as VERSION in sw.js). Write it the way you'd tell a friend.
export const NEWS = [
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
// the window: "Fresh from the workshop · A few new things"
export function openNews(entries, all) {
  openSheet('<div class="newshead">' + him('letter', 'pop', 'Your character holding a note') + '<div><div class="k">Fresh from the workshop</div><h2>' + (all ? 'What\'s new' : 'A few new things') + '</h2></div></div>' +
    '<div class="newslist">' + newsHtml(entries) + '</div>' +
    '<button type="button" class="btn" data-close>' + (all ? 'Done' : 'Got it') + '</button>');
}
