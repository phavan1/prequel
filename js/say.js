// v118: "Just say it". A whole meal in one sentence ("5 dosas, chicken gravy and a coffee"), typed or said with the
// iPhone keyboard's microphone, becomes a short list to tick and log. No AI and no internet: the sentence is split on
// commas and "and", each part's count and amount are read from the words, and the rest is matched against your own
// foods first, then the food lists (the same search as the Food page).
import { search, GRAIN, myFoods } from './nutrition.js';
import { get, save, dateKey } from './store.js';

const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, half: 0.5, quarter: 0.25, couple: 2, few: 3, dozen: 12 };
// amounts people say; they're kept as words (shown, not used for the numbers), except grams
const UNITS = 'cups?|bowls?|plates?|glass(?:es)?|pieces?|pcs|slices?|spoons?|tablespoons?|teaspoons?|tbsp|tsp|handfuls?|scoops?|serves?|servings?|packets?|cans?|bottles?|mugs?|katoris?|ladles?';
const FILLER = /^(?:some|of|the|my|a|an|bit|little|small|big|large|medium|portion|lot|lots)$/;

// split a sentence into its parts
export function splitMeal(text) {
  return String(text || '').toLowerCase()
    .replace(/[“”"!?]/g, ' ')
    .replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten) and (?:a )?half\b/g, (m, n) => String((NUM[n] != null ? NUM[n] : Number(n)) + 0.5)) // "one and a half" before splitting on "and"
    .split(/\s*(?:,|;|\n|\+|&|\band also\b|\band then\b|\bthen\b|\bplus\b|\band\b)\s*/)
    .map(s => s.replace(/^[\s.]+|[\s.]+$/g, '').replace(/\s+/g, ' ')).filter(s => /[a-z]/.test(s));
}

// one part: { text, qty, grams, unitWord, name }
export function readPart(part) {
  let s = ' ' + part.trim() + ' ', qty = null, grams = null, unitWord = '';
  // v120: what people say around the food: "I had…", "for breakfast…"
  s = s.replace(/^\s(?:i\s)?(?:had|ate|have had|have|eaten|also had|also)\s/, ' ').replace(/\s(?:for|at)\s(?:breakfast|brekkie|lunch|dinner|supper|snack|brunch)\s/g, ' ');
  // v120: the iPhone's dictation writes a few numbers as words that sound the same: "For tortillas" (4), "to dosas" (2)
  const sound = s.match(/^\s(for|fore|to|too|won)\s(?=[a-z])/);
  if (sound) { qty = { for: 4, fore: 4, to: 2, too: 2, won: 1 }[sound[1]]; s = s.slice(sound[0].length - 1); }
  // grams: "200 g rice", "200g of rice", "200 grams"
  let m = s.match(/\s(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?)\s/);
  if (m) { grams = parseFloat(m[1]); s = s.replace(m[0], ' '); }
  // a count in digits or a fraction: "5", "1.5", "1/2", "½"
  if (!grams && qty == null) { m = s.match(/\s(\d+(?:\.\d+)?|\d+\/\d+|½|¼)\s/); if (m) { const v = m[1]; qty = v === '½' ? 0.5 : v === '¼' ? 0.25 : v.includes('/') ? Number(v.split('/')[0]) / Number(v.split('/')[1]) : parseFloat(v); s = s.replace(m[0], ' '); } }
  // a count in words: "five", "half a", "a couple of" ("one and a half" became 1.5 before splitting)
  if (qty == null && !grams) {
    m = s.match(/\s(a couple|couple|a few|few|a dozen|dozen|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|an?)\s/);
    if (m) { const w = m[1].replace(/^an?\s/, ''); qty = NUM[w] != null ? NUM[w] : 1; s = s.replace(m[0], ' '); }
  }
  // an amount word: "2 cups of coffee"
  m = s.match(new RegExp('\\s(' + UNITS + ')\\s'));
  if (m) { unitWord = m[1]; s = s.replace(m[0], ' '); }
  const name = s.split(' ').filter(w => w && !FILLER.test(w)).join(' ').replace(/^of\s+/, '').trim();
  return { text: part.trim(), qty: qty == null ? 1 : qty, grams, unitWord, name };
}

// plural to singular for matching: dosas → dosa, chapatis → chapati, tomatoes → tomato, berries → berry
const sing = w => w.length > 3 && /ies$/.test(w) ? w.slice(0, -3) + 'y' : /(ches|shes|sses|xes|oes)$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;

// best match for a name: your own foods first, then the food lists. Tries the words as said, then singular,
// then with the last word dropped ("chicken gravy curry" → "chicken gravy")
export function matchName(name) {
  const tries = []; const words = name.split(' ').filter(Boolean); if (!words.length) return null;
  const said = words.map(w => SAY_SYN[w] || w);
  tries.push(said.map(sing).join(' '), said.join(' ')); // singular first: "eggs" should find "Egg, whole, boiled" too
  // "black coffee", "aunty's sambar": the last word is usually the thing itself, so try it on its own, then the front
  if (said.length > 1) tries.push(said.slice(1).map(sing).join(' '), said.slice(0, -1).map(sing).join(' '));
  // v120: last, each word on its own ("second gravy" → "gravy"), longest first; a match found this way is only a guess
  const singles = said.length > 1 ? said.map(sing).filter(w => w.length > 2 && !STOP.test(w)).sort((a, b) => b.length - a.length) : [];
  // only the first two tries use every word you said; the rest drop some, so what they find is a guess
  const all = tries.map((q, i) => [q, i > 1]).concat(singles.map(q => [q, true]));
  for (const [q, single] of all) {
    const r = search(q, 200); if (!r.mine.length && !r.db.length) continue;
    const c = r.mine.filter(f => !f.once).map(f => [score(f.name, q) - 15, { mine: f }]).concat(r.db.map(f => [score(f.name, q) + (f.src === 'i' ? -2 : 0), { db: f }]));
    if (!c.length) continue;
    c.sort((a, b) => a[0] - b[0]);
    const hit = c[0][1], nm = (hit.mine || hit.db).name;
    // v120: a guess, not a match, when it's a brand ("CAMPBELL'S Chicken Gravy"), only part of what you said, or found from one word
    hit.score = c[0][0]; hit.weak = single || c[0][0] > -20 || /\b[A-Z]{3,}\b/.test(nm);
    return hit;
  }
  return null;
}
// how plainly a name is the thing you said: "Coffee, brewed" or "Coffee" beat "Coffee drops" and "Coffee ice cream"
// (the Food page's own search lists Indian recipes first, which is right for browsing but not for guessing)
const STOP = /^(?:and|with|some|the|of|for|my|had|ate|have|i|a|an|bit|little|small|big|large|medium|portion|lot|lots|cup|cups|bowl|bowls|plate|plates|glass|piece|pieces|slice|slices|spoon|spoons)$/;
const SAY_SYN = { parotta: 'paratha', porotta: 'paratha', parathas: 'paratha', coke: 'cola', pepsi: 'cola', chai: 'tea', kaapi: 'coffee', fries: 'french fries', yoghurt: 'yogurt', omelette: 'omelet', omlette: 'omelet' };
// plain, everyday versions win ties ("Milk, whole" over "Milk, sheep"; "Coffee, brewed" over "Coffee, instant, powder")
const PLAIN = /\b(whole|brewed|cooked|boiled|regular|plain|prepared|fluid|white|hard-boiled|toasted|homemade|fresh)\b/g;
const ODD = /\b(frozen|dehydrated|powder|canned|sheep|goat|buffalo|glutinous|herb|instant|mixture|dried|heated|imitation|substitute|babyfood|infant|concentrate|low|nonfat|fat-free|reduced|unprepared|dry|chamomile|decaffeinated|sweetened|unsweetened|condensed|evaporated|powdered|cheese|flour|seeds|mix|buttermilk|chocolate|flavored|flavoured|without|human|mature|restaurant|espresso)\b/g;
function score(name, q) {
  const n = name.toLowerCase().replace(/\(.*?\)/g, ' '), first = n.split(',')[0].trim(), qs = q.split(' ').map(sing).join(' ');
  const fw = first.split(/[\s/-]+/).filter(Boolean).map(sing).join(' ');
  let s = Math.max(0, fw.split(' ').length - qs.split(' ').length) * 10 + n.length / 20;
  const whole = new RegExp('(^|[\\s,/-])' + qs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?($|[\\s,/-])');
  if (!whole.test(fw)) s += whole.test(n) ? 4 : 12; // "dal" inside "dalma" isn't dal; "cola" inside "chocolate" isn't cola
  s -= ((n.match(PLAIN) || []).length) * 3; s += ((n.match(ODD) || []).length) * 6;
  if (/\b(raw|uncooked)\b/.test(n) && (GRAIN.test(n) || /\b(eggs?|chicken|meat|mutton|fish|pork|beef|lamb|prawns?)\b/.test(n))) s += 8; // you ate it cooked
  if (/\b[A-Z]{3,}\b/.test(name)) s += 5; // a brand ("ZEVIA", "KASHI") is rarely what you meant
  const alts = first.split('/').map(x => x.trim().split(/[\s-]+/).filter(Boolean).map(sing).join(' ')); // "Chapati/Roti" is chapati, and roti
  if (fw === qs || alts.includes(qs)) s -= n.trim() === first ? 60 : 40;
  else if (fw.startsWith(qs + ' ')) s -= 5;
  else if (fw.endsWith(' ' + qs)) s -= 8; // "instant coffee", "hot tea": the thing itself, said more exactly
  return s;
}

// the whole sentence, read: [{ text, qty, grams, unitWord, name, hit }]
export function readMeal(text, when) {
  const slot = when == null ? -1 : when;
  return splitMeal(text).map(readPart).filter(p => p.name || p.grams).map(p => Object.assign(p, { hit: p.name ? bestGuess(p.name, slot) : null }));
}
// v120: what you've taught it first; then the search; a weak search match loses to a fair guess from what it learned
function bestGuess(name, slot) {
  const g = guess(name, slot);
  if (g && g.sure) return { mine: g.food, learned: g.said, weak: false };
  const m = matchName(name);
  if (m && !m.weak) return m;
  if (g) return { mine: g.food, learned: g.said, weak: true };
  return m;
}

// ---------- v120: it learns your words ----------
// A small naive Bayes model, kept with your data (st.sayModel) and in your backups. For each of your foods it keeps
// how often each word went with it (from the food's name, from everything you've logged, and most of all from what you
// said and fixed in Just say it), and when in the day you usually have it. To guess, it scores each of your foods:
//   log(how often you have it) + log(how well the time of day fits) + Σ log(how often each word you said went with it)
// and turns the scores into chances. It's sure when one food clearly wins and it has heard every word for it before.
// Everything stays on the phone. Settings → More → "Forget what Just say it learned" clears it (it starts again
// from your food log).
const SLOT_NAMES = ['morning', 'midday', 'evening', 'late'];
export const slotOf = h => h >= 4 && h < 11 ? 0 : h < 16 ? 1 : h < 21 ? 2 : 3;
export const words = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9']+/)
  .map(w => w.replace(/'s$/, '').replace(/'/g, '')).filter(w => w.length > 1 && !/^\d+$/.test(w) && !STOP.test(w)).map(w => sing(SAY_SYN[w] || w));
function add(M, id, ws, slot, w, said) {
  const F = M.foods[id] || (M.foods[id] = { w: {}, s: {}, t: [0, 0, 0, 0], n: 0 });
  ws.forEach(x => { F.w[x] = (F.w[x] || 0) + w; if (said) F.s[x] = (F.s[x] || 0) + w; });
  if (slot >= 0) F.t[slot] += w; F.n += w;
}
// a fresh model, from your own foods' names and your food log
function seed(st) {
  const M = { v: 1, foods: {}, learned: 0 }, mine = (st.myFoods || []).filter(f => !f.once);
  const byId = new Map(mine.map(f => [f.id, f])), byName = new Map(mine.map(f => [f.name.toLowerCase(), f]));
  mine.forEach(f => add(M, f.id, words(f.name), -1, 0.5));
  (st.meals || []).forEach(m => { const f = (m.foodId && byId.get(m.foodId)) || byName.get(String(m.name || '').toLowerCase()); if (!f) return;
    const d = new Date(m.ts || 0); add(M, f.id, words(f.name), m.ts && dateKey(d) === m.date ? slotOf(d.getHours()) : -1, 0.5); });
  st.sayModel = M; return M;
}
export function model() { const st = get(); return st.sayModel && st.sayModel.v === 1 && st.sayModel.foods ? st.sayModel : seed(st); }
export function forget() { const st = get(); delete st.sayModel; save(); }
export const hasLearned = () => { const st = get(); return !!(st.sayModel && st.sayModel.learned > 0); };
// learn from one row you logged: what you said, the food it was, when. A fix counts three times as much as a plain
// tick, and the food it wrongly guessed loses half its count for those words, so a fix pulls it back quickly.
export function learn(said, food, slot, opts = {}) {
  if (!food || !food.id) return; const M = model(), ws = words(said); if (!ws.length) return;
  add(M, food.id, ws, slot, opts.fixed ? 3 : opts.confirmed ? 2 : 1, true);
  if (opts.wrongId && opts.wrongId !== food.id && M.foods[opts.wrongId]) { const W = M.foods[opts.wrongId]; ws.forEach(x => { if (W.w[x]) W.w[x] *= 0.5; if (W.s[x]) W.s[x] *= 0.5; }); }
  M.learned++;
}
// its best guess among your own foods: { food, sure, said (it learned this from what you said), chance }
export function guess(name, slot = -1) {
  const ws = words(name); if (!ws.length) return null;
  const M = model(), mine = new Map(myFoods().filter(f => !f.once).map(f => [f.id, f])), vocab = new Set();
  Object.values(M.foods).forEach(F => Object.keys(F.w).forEach(x => vocab.add(x)));
  const V = Math.max(1, vocab.size), c = [];
  for (const [id, F] of Object.entries(M.foods)) {
    const f = mine.get(id); if (!f) continue;
    const seen = ws.filter(x => F.w[x] > 0); if (!seen.length) continue;
    const tw = Object.values(F.w).reduce((a, b) => a + b, 0), tt = F.t[0] + F.t[1] + F.t[2] + F.t[3];
    let sc = Math.log(F.n + 1) + (slot >= 0 && tt > 0 ? Math.log((F.t[slot] + 0.5) / (tt + 2)) : Math.log(0.25));
    ws.forEach(x => { sc += Math.log(((F.w[x] || 0) + 0.1) / (tw + 0.1 * V)); });
    c.push({ f, F, sc, seen: seen.length });
  }
  if (!c.length) return null;
  const top = Math.max(...c.map(x => x.sc)), z = c.reduce((a, x) => a + Math.exp(x.sc - top), 0);
  c.forEach(x => { x.p = Math.exp(x.sc - top) / z; }); c.sort((a, b) => b.p - a.p);
  const b = c[0], nameWs = words(b.f.name);
  const heardAll = ws.every(x => (b.F.s[x] || 0) > 0);                       // you've said these words for it before
  const plain = b.seen === ws.length && nameWs.every(x => ws.includes(x));   // or it's simply its own name
  return { food: b.f, chance: b.p, said: heardAll, slot: slot >= 0 ? SLOT_NAMES[slot] : '', sure: b.p >= 0.6 && (heardAll || plain) };
}
