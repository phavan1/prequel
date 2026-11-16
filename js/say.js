// v118: "Just say it". A whole meal in one sentence ("5 dosas, chicken gravy and a coffee"), typed or said with the
// iPhone keyboard's microphone, becomes a short list to tick and log. No AI and no internet: the sentence is split on
// commas and "and", each part's count and amount are read from the words, and the rest is matched against your own
// foods first, then the food lists (the same search as the Food page).
import { search, GRAIN } from './nutrition.js';

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
  // grams: "200 g rice", "200g of rice", "200 grams"
  let m = s.match(/\s(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?)\s/);
  if (m) { grams = parseFloat(m[1]); s = s.replace(m[0], ' '); }
  // a count in digits or a fraction: "5", "1.5", "1/2", "½"
  if (!grams) { m = s.match(/\s(\d+(?:\.\d+)?|\d+\/\d+|½|¼)\s/); if (m) { const v = m[1]; qty = v === '½' ? 0.5 : v === '¼' ? 0.25 : v.includes('/') ? Number(v.split('/')[0]) / Number(v.split('/')[1]) : parseFloat(v); s = s.replace(m[0], ' '); } }
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
  for (const q of tries) {
    const r = search(q, 200); if (!r.mine.length && !r.db.length) continue;
    const c = r.mine.map(f => [score(f.name, q) - 15, { mine: f }]).concat(r.db.map(f => [score(f.name, q) + (f.src === 'i' ? -2 : 0), { db: f }]));
    c.sort((a, b) => a[0] - b[0]); return c[0][1];
  }
  return null;
}
// how plainly a name is the thing you said: "Coffee, brewed" or "Coffee" beat "Coffee drops" and "Coffee ice cream"
// (the Food page's own search lists Indian recipes first, which is right for browsing but not for guessing)
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
export function readMeal(text) {
  return splitMeal(text).map(readPart).filter(p => p.name || p.grams).map(p => Object.assign(p, { hit: p.name ? matchName(p.name) : null }));
}
