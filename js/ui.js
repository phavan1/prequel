// Small shared helpers: escaping, sheets, toasts, the character, the date you're logging for.
import { today, addDays, parseKey } from './store.js';

export const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- which day you're logging for (backdating) ----------
export const ctx = { date: null };
// nothing can be logged for a day that hasn't happened yet (the iPhone date wheel ignores max, so we check ourselves)
export const AHEAD = 'Can\'t log ahead. Back to today.';
export function logDate() { return ctx.date && ctx.date <= today() ? ctx.date : today(); }
export function setLogDate(d) {
  if (d && d > today()) { d = null; toast(AHEAD); }
  ctx.date = d && d !== today() ? d : null;
}
// any date box with a max (every "which day" box except Mind's reminders) snaps a future day back to today
document.addEventListener('change', e => {
  const el = e.target;
  if (!el.matches || !el.matches('input[type="date"][max]') || !el.value || el.value <= today()) return;
  el.value = today(); toast(AHEAD);
}, true);
export function prettyDate(key, opts) {
  if (key === today()) return 'Today';
  if (key === addDays(today(), -1)) return 'Yesterday';
  return parseKey(key).toLocaleDateString('en-AU', opts || { weekday: 'short', day: 'numeric', month: 'short' });
}
export function dateChip() {
  const d = logDate();
  return '<label class="datechip' + (d !== today() ? ' past' : '') + '"><span>Logging for</span><b>' + esc(prettyDate(d)) + '</b>' +
    '<input type="date" data-logdate max="' + today() + '" value="' + d + '" aria-label="Day you are logging for"></label>';
}
// any screen with a date chip re-renders when it changes
document.addEventListener('change', e => {
  if (!e.target.matches('[data-logdate]')) return;
  // the chosen day travels in the address, so it only applies to this screen
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(query || ''); const v = e.target.value || today();
  if (v === today()) q.delete('d'); else q.set('d', v);
  const s = q.toString(); location.hash = path + (s ? '?' + s : '');
});

export function timeOf(ts) { return new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase(); }
export function hm(mins) { const h = Math.floor(mins / 60), m = Math.round(mins % 60); return h ? h + ' h' + (m ? ' ' + m + ' m' : '') : m + ' m'; }

// ---------- the character ----------
export function him(pose, cls = '', alt) {
  return '<img class="him ' + cls + '" src="art/' + pose + '.webp" alt="' + esc(alt || 'Your character') + '" draggable="false">';
}
export function pop(el) { if (!el || reduceMotion) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

// ---------- sheets + toasts ----------
export function openSheet(html, onClick) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'scrim'; wrap.id = 'sheet';
  wrap.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
  wrap.addEventListener('click', e => {
    if (e.target === wrap || e.target.closest('[data-close]')) { closeSheet(); return; }
    if (onClick) onClick(e, wrap);
  });
  document.body.appendChild(wrap);
  // iPhone: after the keyboard closes, taps can land in the wrong place until the page reflows. Nudge it.
  wrap.addEventListener('focusout', () => setTimeout(() => {
    const a = document.activeElement; if (a && wrap.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    window.scrollTo(window.scrollX, window.scrollY); const sh = wrap.querySelector('.sheet'); if (sh) { sh.style.transform = 'translateZ(0)'; requestAnimationFrame(() => { sh.style.transform = ''; }); }
  }, 60));
  const first = wrap.querySelector('input[type="text"], textarea'); if (first && first.dataset.autofocus !== undefined) first.focus();
  return wrap;
}
export function closeSheet() { const s = document.getElementById('sheet'); if (s) s.remove(); }

let toastTimer = null;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- saving and sharing files ----------
// iPhone and iPad (an iPad can say it's a Mac): their share sheet has "Save to Files" and "Save Image", so one
// "Share or save" button does both. Android's share sheet usually has no way to save to the phone, so Android
// (and computers) get a real "Save to this phone" download next to Share.
export const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export function canShareFile(file) { try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { return false; } }
export function saveToDevice(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return 'downloaded';
}
export const SAVED_NOTE = 'Saved. Look in your Downloads.';

// save a file: the share sheet on iPhone (Save to Files), a normal download elsewhere.
// Says what happened: 'shared', 'downloaded', or 'cancelled' (the share sheet was closed without saving)
export async function downloadFile(name, text, type) {
  const file = new File([new Blob([text], { type })], name, { type });
  if (IOS) {
    try { if (canShareFile(file)) { await navigator.share({ files: [file], title: name }); return 'shared'; } }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  return saveToDevice(file);
}

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------- bottom navigation ----------
const NAV = [
  ['home', 'Home', '<path d="M3 11l9-7 9 7v9H3z"/>'],
  ['days', 'Days', '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
  ['move', 'Move', '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'],
  ['mind', 'Mind', '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>'],
  ['me', 'Me', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>']
];
// where this page was opened from (?from=), so the tab bar and back button follow you (v56)
function hashPage() { const [path, q] = location.hash.replace(/^#\/?/, '').split('?'); return { page: path.split('/')[0] || 'home', from: new URLSearchParams(q || '').get('from') }; }
export function nav(active) {
  const { page, from } = hashPage();
  if (!NAV.some(n => n[0] === page) && NAV.some(n => n[0] === from)) active = from; // a page under a tab lights the tab you came from
  return '<nav class="tabbar" aria-label="Main">' + NAV.map(n => '<a href="#/' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + n[2] + '</svg>' + n[1] + '</a>').join('') + '</nav>';
}
export const FROM = { me: ['#/me', 'Me'], home: ['#/home', 'Home'], rest: ['#/rest', 'Rest'], share: ['#/share', 'Share'], days: ['#/days', 'Days'] };
export function backLink(href, label) {
  if (!href) { const f = FROM[hashPage().from]; [href, label] = f || ['#/home', 'Home']; }
  return '<a class="back" href="' + href + '">‹ ' + esc(label) + '</a>'; }
