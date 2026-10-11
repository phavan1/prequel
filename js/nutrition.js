// Food knowledge, all offline: the Indian Nutrient Databank (recipes) + USDA SR27 (everything else),
// trimmed to the nutrients Prequel shows. Values are per 100 g; each food may carry a few real serving sizes.
import { get, save, uid } from './store.js';

export const NUTRIENTS = [
  ['kcal', 'Calories', 'cal', 0], ['protein', 'Protein', 'g', 0], ['carbs', 'Carbs', 'g', 0], ['fat', 'Fat', 'g', 0],
  ['satfat', 'Saturated fat', 'g', 1], ['fibre', 'Fibre', 'g', 1], ['sugar', 'Sugar', 'g', 0], ['sodium', 'Sodium', 'mg', 0],
  ['iron', 'Iron', 'mg', 1], ['calcium', 'Calcium', 'mg', 0], ['b12', 'Vitamin B12', 'µg', 1], ['vitd', 'Vitamin D', 'µg', 1]
];
export const KINDS = [['home', 'Home-cooked'], ['out', 'Eating out'], ['packaged', 'Packaged']];

let DB = null, loading = null;
export function loadDB() {
  if (DB) return Promise.resolve(DB);
  if (!loading) loading = fetch('data/foods.json').then(r => r.json()).then(j => {
    DB = j.foods.map(f => ({ name: f[0], src: f[1], per100: f.slice(2, 14), measures: f[14] || [], key: f[0].toLowerCase() }));
    return DB;
  }).catch(e => { loading = null; throw e; });
  return loading;
}

// ---------- your foods ----------
export function myFoods() { const st = get(); if (!Array.isArray(st.myFoods)) st.myFoods = []; return st.myFoods; }
export function meals() { const st = get(); if (!Array.isArray(st.meals)) st.meals = []; return st.meals; }
export function weights() { const st = get(); if (!Array.isArray(st.weights)) st.weights = []; return st.weights; }

const scale = (arr, k) => arr.map(v => v == null ? null : v * k);
// prefer a natural portion ("1 doughnut", "1 dosa") over ounces and cups
const UNITY = /\b(oz|ounce|lb|g|cup|cups|tbsp|tsp|fl oz|ml|serving packet)\b/i;
export function bestMeasure(f) {
  const ms = f.measures || [];
  return ms.find(m => !UNITY.test(m[0])) || ms.find(m => /cup|serving/i.test(m[0])) || ms[0] || ['100 g', 100];
}
export function fromDB(f, measure) {
  const m = measure || bestMeasure(f);
  return { unit: m[0], unitG: m[1], n: scale(f.per100, m[1] / 100), per100: f.per100 };
}
// a database food becomes one of yours the first time you log it, so next time it's a single tap
export function adoptDB(f) {
  const mine = myFoods().find(x => x.from === f.src + ':' + f.name);
  if (mine) return mine;
  const s = fromDB(f);
  const food = { id: uid(), name: f.name, from: f.src + ':' + f.name, n: s.n, per100: f.per100, unit: s.unit, unitG: s.unitG, measures: f.measures, kind: null, uses: 0, created: Date.now() };
  myFoods().push(food); return food;
}

// ---------- logging ----------
export function logFood(food, date, opts = {}) {
  const m = { id: uid(), date, ts: Date.now(), name: food.name, foodId: food.id || null, n: food.n || null, unit: food.unit || '1 serving', unitG: food.unitG || null, qty: 1, sure: opts.sure !== false, kind: food.kind || null };
  meals().push(m);
  if (food.id) { food.uses = (food.uses || 0) + 1; food.last = Date.now(); }
  save(); return m;
}
export function totalOf(m) { return m.n ? m.n.map(v => v == null ? null : v * (m.qty || 1)) : null; }
export function sumDay(list) {
  // a blank on a label stays unknown, never zero; cnt says how many foods each total is based on
  const t = new Array(12).fill(0), has = new Array(12).fill(false), cnt = new Array(12).fill(0); let counted = 0, blank = 0;
  list.forEach(m => { const v = totalOf(m); if (!v) { blank++; return; } counted++; v.forEach((x, i) => { if (x != null) { t[i] += x; has[i] = true; cnt[i]++; } }); });
  return { t, has, cnt, counted, blank };
}
export function qtyLabel(m) {
  const q = m.qty || 1, u = m.unit || '1 serving';
  if (q === 1) return u;
  if (m.unitG && Math.abs(q * 2 - Math.round(q * 2)) > 0.01) return Math.round(q * m.unitG) + ' g'; // typed in grams
  const frac = q === 0.5 ? '½' : q === 1.5 ? '1½' : String(Math.round(q * 100) / 100);
  return frac + ' × ' + u.replace(/^1\s+/, '');
}
export const fmt = (v, i) => v == null ? '–' : (NUTRIENTS[i][3] ? (Math.round(v * 10) / 10).toLocaleString() : Math.round(v).toLocaleString());

// spellings people actually type: chana or channa, dhal or dal, yoghurt or yogurt
const SYN = { chana: ['channa', 'chickpea', 'bengal gram'], channa: ['chana', 'chickpea'], chole: ['channa', 'chickpea'], dhal: ['dal'], daal: ['dal'], dahl: ['dal'], yoghurt: ['yogurt'], yogurt: ['yoghurt'], curd: ['yogurt', 'curd'], dahi: ['curd', 'yogurt'], chilli: ['chili', 'pepper'], chili: ['chilli', 'pepper'], brinjal: ['eggplant'], aubergine: ['eggplant'], capsicum: ['pepper'], coriander: ['cilantro', 'coriander'], prawn: ['shrimp'], prawns: ['shrimp'], mince: ['ground'], rajma: ['kidney bean', 'rajma'], paneer: ['paneer', 'cottage cheese'], atta: ['whole wheat', 'atta'], maida: ['wheat flour', 'maida'], besan: ['gram flour', 'besan'], jeera: ['cumin'], haldi: ['turmeric'], aloo: ['potato', 'aloo'], gobi: ['cauliflower', 'gobi'], palak: ['spinach', 'palak'], bhindi: ['okra', 'bhindi'] };
// grains and pulses: people almost always measure them cooked
export const GRAIN = /\b(rice|pasta|spaghetti|macaroni|noodles?|quinoa|oats?|barley|millet|couscous|lentils?|dal|gram|beans?|chickpeas?|channa|chana|rajma|semolina|bulgur|poha)\b/;
export const wordHit = (s, w) => s.includes(w) || (SYN[w] || []).some(x => s.includes(x));
// ---------- search: your foods first, then Indian recipes, then everything else ----------
export function search(q, limit = 12) {
  q = q.trim().toLowerCase(); if (!q) return { mine: [], db: [] };
  const words = q.split(/\s+/);
  const hit = s => words.every(w => wordHit(s, w));
  const mine = myFoods().filter(f => !f.once && hit(f.name.toLowerCase())).sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 6);
  const mineFrom = new Set(myFoods().map(f => f.from));
  const db = (DB || []).filter(f => hit(f.key) && !mineFrom.has(f.src + ':' + f.name)).map(f => {
    let s = 0; if (f.key.startsWith(words[0])) s -= 30; if (f.src === 'i') s -= 40; s += f.name.length / 4;
    if (/,\s*(raw|uncooked|dry)\b/.test(f.key)) s += 8;
    return [s, f];
  }).sort((a, b) => a[0] - b[0]).slice(0, limit).map(x => x[1]);
  return { mine, db };
}

// ---------- your own recipes: ingredients in, numbers per portion out ----------
export function recipeTotals(items) {
  const t = new Array(12).fill(null);
  items.forEach(it => it.per100.forEach((v, i) => { if (v != null) t[i] = (t[i] || 0) + v * it.grams / 100; }));
  return t;
}
export function ingredientSearch(q, limit = 8) {
  q = q.trim().toLowerCase(); if (!q || !DB) return [];
  const words = q.split(/\s+/), grainQ = GRAIN.test(q) && !/\b(raw|dry|uncooked)\b/.test(q);
  // plain ingredients first: raw foods from the USDA list, then simple Indian staples
  return DB.filter(f => words.every(w => wordHit(f.key, w))).map(f => {
    let s = f.name.length / 4; if (f.key.startsWith(words[0])) s -= 20; if (f.src === 'i') s += 10;
    if (grainQ) { if (/\b(raw|dry|uncooked|mature seeds)\b/.test(f.key)) s += 22; if (/\b(cooked|boiled)\b/.test(f.key)) s -= 15; }
    else if (/\braw\b/.test(f.key)) s -= 15;
    if (/\b(industrial|skin|commercial|frozen|canned)\b/.test(f.key)) s += 8;
    const extra = f.key.match(/\b(noodles?|flour|bran|cakes?|crackers?|pudding|vermicelli|syrup|puffed|flakes|glutinous)\b/); if (extra && !q.includes(extra[1].replace(/s$/, ''))) s += 12;
    return [s, f];
  }).sort((a, b) => a[0] - b[0]).slice(0, limit).map(x => x[1]);
}
