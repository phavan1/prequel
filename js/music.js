// On repeat (v51): the song you can't stop playing, one era at a time, kept as cassette tapes.
// Data: st.tapes = [{id, date (= start), start, end|null, title, artist, album?, cover? (a small saved picture),
//                    coverUrl?, preview?, link?, era?, line?}]. The one with no end is on repeat now.
// Finding a song asks Apple's public music search (no account). Everything else works offline.
import { get, save, uid, today, addDays, parseKey } from './store.js';
import { mulberry32, hashStr } from './sky-model.js';

export const tapes = () => (get().tapes || []);
export const current = () => tapes().find(t => !t.end) || null;
export const byStart = (a, b) => a.start.localeCompare(b.start) || (a.id < b.id ? -1 : 1);
const days = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000) + 1;

// ---------- finding a song ----------
const API = 'https://itunes.apple.com/search?media=music&entity=song&limit=6&term=';
function jsonp(url, wait = 6000) {
  return new Promise((res, rej) => {
    const cb = 'pqsong' + Date.now(), s = document.createElement('script');
    const done = () => { clearTimeout(t); delete window[cb]; s.remove(); };
    const t = setTimeout(() => { done(); rej(new Error('timeout')); }, wait);
    window[cb] = d => { done(); res(d); }; s.onerror = () => { done(); rej(new Error('offline')); };
    s.src = url + '&callback=' + cb; document.head.appendChild(s);
  });
}
// Apple first; then Deezer as a backup (v52: Apple's search didn't answer on iPhones); then Apple's older "callback" way.
// Throws when none of them answer (offline). Deezer songs keep their id, because Deezer's preview links expire.
const fromApple = d => (d.results || []).filter(r => r.trackName).map(r => ({
  title: r.trackName, artist: r.artistName || '', album: r.collectionName || '',
  thumb: r.artworkUrl60 || r.artworkUrl100 || '', coverUrl: (r.artworkUrl100 || '').replace(/100x100bb/, '400x400bb'),
  preview: r.previewUrl || '', link: r.trackViewUrl || ''
}));
const fromDeezer = d => (d.data || []).filter(r => r.title).map(r => ({
  title: r.title, artist: (r.artist || {}).name || '', album: (r.album || {}).title || '',
  thumb: (r.album || {}).cover_small || '', coverUrl: (r.album || {}).cover_big || (r.album || {}).cover_medium || '',
  preview: r.preview || '', did: r.id
}));
export let lastSearchTrouble = '';
export async function searchSongs(q) {
  const t = encodeURIComponent(q), why = [];
  try { const r = await fetch(API + t); if (!r.ok) throw new Error('status ' + r.status); return fromApple(await r.json()); } catch (e) { why.push('Apple: ' + (e.message || e)); }
  try { return fromDeezer(await jsonp('https://api.deezer.com/search?limit=6&output=jsonp&q=' + t)); } catch (e) { why.push('Deezer: ' + (e.message || e)); }
  try { return fromApple(await jsonp(API + t, 5000)); } catch (e) { why.push('Apple again: ' + (e.message || e)); }
  lastSearchTrouble = why.join(' · ');
  throw new Error(lastSearchTrouble);
}
// keep a small copy of the cover on the phone, so tapes look right offline (null if the picture can't be copied)
export function saveCover(url) {
  return new Promise(res => {
    if (!url) { res(null); return; }
    const im = new Image(), t = setTimeout(() => res(null), 8000);
    im.crossOrigin = 'anonymous';
    im.onload = () => { clearTimeout(t); try { const c = document.createElement('canvas'); c.width = c.height = 240; c.getContext('2d').drawImage(im, 0, 0, 240, 240); res(c.toDataURL('image/jpeg', 0.82)); } catch (e) { res(null); } };
    im.onerror = () => { clearTimeout(t); res(null); };
    im.src = url;
  });
}

// ---------- covers made by Prequel, for songs without one: unique per song, never changing ----------
const PALS = [['#1F55D0', '#F4C430', '#FFF4CC'], ['#E2402F', '#FFE1DA', '#23262F'], ['#5DAE7E', '#FFF4CC', '#23262F'], ['#D96C8A', '#FBE3EA', '#3C4A8A'], ['#23262F', '#F4C430', '#F3EEDF'], ['#F2A65A', '#23262F', '#FFEBD6'], ['#6CC2B4', '#1F2A55', '#E2F4F1'], ['#B07CC6', '#F1E6F6', '#23262F']];
const made = {};
export function madeCover(t) {
  const key = (t.title || '') + '|' + (t.artist || '');
  if (made[key]) return made[key];
  const r = mulberry32(hashStr(key)), [a, b, ink] = PALS[Math.floor(r() * PALS.length)], S = 240;
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = b; g.fillRect(0, 0, S, S);
  const style = Math.floor(r() * 5);
  g.fillStyle = a; g.strokeStyle = a;
  if (style === 0) { for (let i = 0; i < 18; i++) { const an = i * Math.PI / 9; g.beginPath(); g.moveTo(S / 2, S * 0.62); g.arc(S / 2, S * 0.62, S, an, an + Math.PI / 18); g.closePath(); g.fill(); } } // sunburst
  else if (style === 1) { g.lineWidth = 10; for (let y = 10; y < S + 20; y += 26) { g.beginPath(); for (let x = 0; x <= S; x += 6) g.lineTo(x, y + Math.sin(x / 18 + y) * 8); g.stroke(); } } // waves
  else if (style === 2) { const n = 6, q = S / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) g.fillRect(i * q, j * q, q, q); } // checkerboard
  else if (style === 3) { for (let y = 0; y < S + 16; y += 16) for (let x = (y / 16 % 2) * 8; x < S + 16; x += 16) { g.beginPath(); g.arc(x, y, 2 + 5 * (y / S), 0, 7); g.fill(); } } // halftone
  else { const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(S * 0.7, S * 0.3, S * 0.22, 0, 7); g.fill(); } // gradient + sun
  // grain, then the title hand-lettered on a little strip of tape
  for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(0,0,0,' + (r() * 0.06) + ')'; g.fillRect(r() * S, r() * S, 1.5, 1.5); }
  const words = (t.title || '♪').split(/\s+/), lines = []; let ln = '';
  words.forEach(w => { if ((ln + ' ' + w).trim().length > 11 && ln) { lines.push(ln); ln = w; } else ln = (ln + ' ' + w).trim(); }); lines.push(ln);
  const L = lines.slice(0, 3), lh = 34, h = L.length * lh + 22, y0 = S - h - 18;
  g.save(); g.translate(S / 2, y0 + h / 2); g.rotate((r() - 0.5) * 0.08);
  g.fillStyle = '#FFFDF6'; g.fillRect(-S * 0.42, -h / 2, S * 0.84, h);
  g.fillStyle = ink; g.font = '700 32px "Gaegu", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
  L.forEach((s, i) => g.fillText(s.length > 14 ? s.slice(0, 13) + '…' : s, 0, -h / 2 + 11 + lh / 2 + i * lh));
  g.restore();
  const url = c.toDataURL('image/png');
  if (!document.fonts || document.fonts.check('700 32px Gaegu')) made[key] = url; else document.fonts.load('700 32px Gaegu');
  return url;
}
export const coverOf = t => t.cover || madeCover(t);

// ---------- eras ----------
// put a new song on repeat from `start`; the one before ends the day before (or that same day)
export function putOnRepeat(song, start, extra) {
  const st = get(); st.tapes = st.tapes || [];
  const prev = current();
  if (prev) prev.end = start > prev.start ? addDays(start, -1) : prev.start;
  const t = Object.assign({ id: uid(), date: start, start, end: null, title: song.title, artist: song.artist || '', album: song.album || '', coverUrl: song.coverUrl || '', preview: song.did ? '' : song.preview || '', link: song.link || '', cover: song.cover || null }, song.did ? { did: song.did } : {}, extra || {}); // Deezer previews expire, so only its id is kept
  st.tapes.push(t); save(); return t;
}
export function removeTape(id) { const st = get(); st.tapes = tapes().filter(t => t.id !== id); save(); }
export const tapeDays = t => days(t.start, t.end || today());
// the tape on repeat for the longest part of a month ("2026-10")
export function soundtrackOf(ym) {
  const first = ym + '-01', last = (() => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m, 0); return ym + '-' + String(d.getDate()).padStart(2, '0'); })();
  let best = null, most = 0;
  tapes().forEach(t => { const a = t.start > first ? t.start : first, e = t.end || today(), b = e < last ? e : last; if (a > b) return; const n = days(a, b); if (n > most || (n === most && best && t.start > best.start)) { most = n; best = t; } });
  return best;
}
export const onDay = d => tapes().find(t => t.start <= d && (t.end || today()) >= d) || null;

// ---------- listening ----------
export const APPS = [['spotify', 'Spotify'], ['apple', 'Apple Music'], ['ytmusic', 'YouTube Music'], ['youtube', 'YouTube']];
export function fullUrl(t, app) {
  const q = encodeURIComponent((t.title + ' ' + (t.artist || '')).trim());
  if (app === 'apple') return t.link || 'https://music.apple.com/search?term=' + q;
  if (app === 'ytmusic') return 'https://music.youtube.com/search?q=' + q;
  if (app === 'youtube') return 'https://www.youtube.com/results?search_query=' + q;
  return 'https://open.spotify.com/search/' + q;
}

// the 30-second preview, or for songs without one: a tape click, a breath of hiss, then a tiny music-box tune of its own
let audio = null, ctx = null, stopTimer = null, onEnd = null;
export function stopPlay() {
  if (audio) { audio.pause(); audio = null; }
  if (ctx) { try { ctx.close(); } catch (e) { /* already closed */ } ctx = null; }
  clearTimeout(stopTimer); const f = onEnd; onEnd = null; if (f) f();
}
// iPhones only allow sound that starts from the tap itself, so the player starts (silently) right away,
// then the real preview is loaded into it (Deezer songs need a fresh link first)
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
export function play(t, ended) {
  stopPlay(); onEnd = ended;
  if (!t.preview && !t.did) return Promise.resolve(tune(t));
  const a = audio = new Audio(SILENT); a.play().catch(() => {});
  const src = t.did ? jsonp('https://api.deezer.com/track/' + t.did + '?output=jsonp', 5000).then(d => d.preview || '').catch(() => '') : Promise.resolve(t.preview);
  return src.then(url => {
    if (audio !== a) return 'stopped';
    if (!url) { audio = null; return tune(t); }
    a.src = url; a.addEventListener('ended', stopPlay);
    return a.play().then(() => 'preview').catch(() => { if (audio === a) audio = null; return tune(t); });
  });
}
function tune(t) {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { stopPlay(); return 'none'; }
  ctx = new AC(); const now = ctx.currentTime + 0.05, out = ctx.createGain(); out.gain.value = 0.5; out.connect(ctx.destination);
  const noise = (start, len, vol, freq) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
    gn.gain.setValueAtTime(vol, start); gn.gain.exponentialRampToValueAtTime(0.0001, start + len); src.connect(f); f.connect(gn); gn.connect(out); src.start(start);
  };
  noise(now, 0.06, 0.9, 1800);              // the play button's click
  noise(now + 0.08, 1.2, 0.08, 4000);       // a breath of tape hiss
  const r = mulberry32(hashStr((t.title || '') + '|' + (t.artist || ''))), scale = [0, 2, 4, 7, 9, 12, 14, 16], base = 523.25 * Math.pow(2, Math.floor(r() * 5 - 2) / 12);
  let at = now + 1.3; const step = 0.28 + r() * 0.08;
  for (let i = 0; i < 24; i++) {
    if (r() < 0.12) { at += step; continue; } // a little rest
    const f = base * Math.pow(2, scale[Math.floor(r() * scale.length)] / 12), len = r() < 0.2 ? step * 2 : step;
    [[1, 0.22], [2.01, 0.05], [3.99, 0.02]].forEach(([m, v]) => { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; gn.gain.setValueAtTime(v, at); gn.gain.exponentialRampToValueAtTime(0.0001, at + 1.4); o.connect(gn); gn.connect(out); o.start(at); o.stop(at + 1.5); });
    at += len;
  }
  stopTimer = setTimeout(stopPlay, (at - now + 1.6) * 1000);
  return 'tune';
}
