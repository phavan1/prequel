// Small shared helpers: escaping, sheets, toasts, the character, the date you're logging for.
import { today, addDays, parseKey } from './store.js';

export const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- which day you're logging for (backdating) ----------
export const ctx = { date: null };
export function logDate() { return ctx.date || today(); }
export function setLogDate(d) { ctx.date = d && d !== today() ? d : null; }
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
  if (e.target.matches('[data-logdate]')) { setLogDate(e.target.value || today()); window.dispatchEvent(new HashChangeEvent('hashchange')); }
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

// save a file: the share sheet on iPhone (Save to Files), a normal download elsewhere
export async function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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
export function nav(active) {
  return '<nav class="tabbar" aria-label="Main">' + NAV.map(n => '<a href="#/' + n[0] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + n[2] + '</svg>' + n[1] + '</a>').join('') + '</nav>';
}
export function backLink(href = '#/home', label = 'Home') { return '<a class="back" href="' + href + '">‹ ' + esc(label) + '</a>'; }
