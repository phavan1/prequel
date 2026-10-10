// Food: log what you ate in a tap, see what it gave you. Nutrition is an estimate, never a score.
import { get, save, uid, addMoment, removeById, today } from '../store.js';
import { esc, nav, backLink, dateChip, logDate, him, timeOf, prettyDate, toast, openSheet, closeSheet } from '../ui.js';
import { openFoodReport } from '../reports.js';
import { NUTRIENTS, KINDS, loadDB, myFoods, meals, weights, fromDB, adoptDB, bestMeasure, logFood, totalOf, sumDay, qtyLabel, fmt, search, recipeTotals, ingredientSearch } from '../nutrition.js';

const EMPTY = ['Eat away!', 'Snack o\'clock?', 'Feed the machine.', 'Bon appétit!', 'Tummy\'s calling.', 'Let\'s eat!', 'Fuel up, friend.'];
let root = null, query = '', linkTo = null, snackTimer = null, dbReady = false;

export function mount(r) {
  root = r; query = ''; linkTo = null;
  render();
  loadDB().then(() => { dbReady = true; if (query) drawResults(); }).catch(() => { /* offline before first load: your own foods still work */ });
  root.addEventListener('input', e => { if (e.target.id === 'fq') { query = e.target.value; drawResults(); } });
  root.addEventListener('keydown', e => { if (e.target.id === 'fq' && e.key === 'Enter') { e.preventDefault(); const first = root.querySelector('#res [data-pick]'); if (first) first.click(); } });
  root.addEventListener('click', onClick);
}
export function unmount() { clearTimeout(snackTimer); const s = document.getElementById('snack'); if (s) s.remove(); }

const kcalP = n => n ? Math.round(n[0] || 0) + ' cal · ' + Math.round(n[1] || 0) + ' g protein' : 'no numbers yet';

function dayList() {
  const st = get(), d = logDate();
  const newer = meals().filter(m => m.date === d).map(m => ({ t: m.ts, m }));
  const older = st.foods.filter(f => f.date === d).map(f => ({ t: f.ts, old: f }));
  return newer.concat(older).sort((a, b) => a.t - b.t);
}

function render() {
  const d = logDate(), list = dayList();
  const S = sumDay(list.filter(x => x.m).map(x => x.m));
  const mealsN = list.length;
  const usuals = myFoods().slice().sort((a, b) => (b.uses || 0) - (a.uses || 0) || (b.last || 0) - (a.last || 0)).slice(0, 8);
  const lastW = weights().slice().sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)[0];
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<button type="button" class="foodhead" data-totals>' + him('eating', 'breathe', 'Your character eating with you') +
      '<span><small>' + esc(prettyDate(d)) + '</small><b>' + (mealsN ? mealsN + (mealsN === 1 ? ' thing' : ' things') + ' eaten' : EMPTY[new Date().getDate() % EMPTY.length]) + '</b>' +
      '<em>' + (S.counted ? '~' + Math.round(S.t[0]).toLocaleString() + ' cal · ' + Math.round(S.t[1]) + ' g protein ›' : 'Anything counts. A banana counts.') + '</em></span></button>' +
    '<div class="fsearch"><label class="sr" for="fq">What did you have?</label><input id="fq" type="search" placeholder="What did you have?" autocomplete="off" enterkeyhint="go" value="' + esc(query) + '"></div>' +
    '<div id="res"></div>' +
    (usuals.length ? '<div class="top"><div class="lbl">Your usuals</div><button type="button" class="btn ghost" data-manage style="min-height:34px;padding:0 4px">Edit</button></div><div class="chips usuals">' + usuals.map(f => '<button type="button" class="chip" data-usual="' + f.id + '">' + esc(f.name) + '</button>').join('') + '</div>' : '') +
    '<div class="card daylist">' + (list.length ? list.map(x => x.m
      ? '<button type="button" class="entry" data-meal="' + x.m.id + '"><span class="t">' + timeOf(x.m.ts) + '</span><span class="nm">' + esc(x.m.name) + '<small>' + (x.m.sure ? '' : '~') + esc(qtyLabel(x.m)) + '</small></span><span class="kc">' + (x.m.n ? Math.round(totalOf(x.m)[0]) + ' cal' : '–') + '</span></button>'
      : '<div class="entry old"><span class="t">' + timeOf(x.old.ts) + '</span><span class="nm">' + esc(x.old.note || x.old.tags.join(', ')) + '<small>from before numbers</small></span><button type="button" class="x" data-delold="' + x.old.id + '" aria-label="Remove">×</button></div>').join('')
      : '<p class="empty">Nothing logged ' + (d === today() ? 'today' : 'this day') + ' yet. Type what you had, or tap a usual.</p>') + '</div>' +
    '<div class="grid2"><button type="button" class="rowlink" data-weight><span>Weight</span><b>' + (lastW ? lastW.kg + ' kg ›' : '+') + '</b></button><button type="button" class="rowlink" data-reports><span>Reports</span><b>PDF ›</b></button></div>' +
    nav('home');
  if (query) drawResults();
}

function drawResults() {
  const box = root.querySelector('#res'); if (!box) return;
  const q = query.trim();
  if (!q) { box.innerHTML = linkTo ? '<p class="muted" style="font-size:13px">Search for what it was, and I\'ll fill in its numbers.</p>' : ''; return; }
  const { mine, db } = search(q);
  const row = (attr, name, sub, tag) => '<button type="button" class="res" ' + attr + '><span>' + esc(name) + (tag ? ' <i>' + tag + '</i>' : '') + '<small>' + esc(sub) + '</small></span><b>+</b></button>';
  box.innerHTML = '<div class="reslist scroll">' +
    (linkTo ? '' : row('data-pick data-quick="1"', 'Just log “' + q + '”', 'fill in the numbers later', '')) +
    mine.map(f => row('data-pick data-mine="' + f.id + '"', f.name, f.unit + ' · ' + kcalP(f.n), 'yours')).join('') +
    db.map((f, i) => { const s = fromDB(f); return row('data-pick data-db="' + i + '"', f.name, s.unit + ' · ' + kcalP(s.n), f.src === 'i' ? 'Indian recipe' : ''); }).join('') +
    (db.length || mine.length ? '' : '<p class="muted" style="font-size:13px;padding:6px 4px">' + (dbReady ? 'No matches in the food lists.' : 'Still loading foods…') + '</p>') +
    '</div><div class="reslist addrow2">' +
    '<button type="button" class="res add" data-recipe><span>+ Make it from ingredients<small>your own dish: what goes in the pot</small></span></button>' +
    '<button type="button" class="res add" data-label><span>+ Add it from a packet label<small>type the nutrition once, it\'s yours after that</small></span></button>' +
    '</div>';
  box._db = db;
}

function finishLog(m, food) {
  addMoment('food', m.name, m.date, { ref: m.id });
  query = ''; render();
  snack('Logged ' + m.name + ' · ' + qtyLabel(m), m.id);
}

function onClick(e) {
  const t = e.target; let b;
  if ((b = t.closest('[data-pick]'))) {
    const d = logDate();
    let food = null, sure = true;
    if (b.dataset.quick) {
      const m = logFood({ name: query.trim() }, d, { sure: false }); finishLog(m); return;
    }
    if (b.dataset.mine) food = myFoods().find(f => f.id === b.dataset.mine);
    if (b.dataset.db) { food = adoptDB(root.querySelector('#res')._db[Number(b.dataset.db)]); sure = false; }
    if (!food) return;
    if (linkTo) { // filling in the numbers for something logged quickly earlier
      const m = meals().find(x => x.id === linkTo); linkTo = null;
      if (m) { Object.assign(m, { name: food.name, foodId: food.id, n: food.n, unit: food.unit, unitG: food.unitG || null, kind: food.kind || null }); food.uses = (food.uses || 0) + 1; save(); query = ''; render(); toast('Numbers filled in.'); }
      return;
    }
    const m = logFood(food, d, { sure }); finishLog(m, food); return;
  }
  if ((b = t.closest('[data-usual]'))) { const f = myFoods().find(x => x.id === b.dataset.usual); if (f) { const m = logFood(f, logDate()); finishLog(m, f); } return; }
  if ((b = t.closest('[data-meal]'))) { portionSheet(b.dataset.meal); return; }
  if ((b = t.closest('[data-delold]'))) { removeById('foods', b.dataset.delold); render(); return; }
  if (t.closest('[data-totals]')) { totalsSheet(); return; }
  if (t.closest('[data-label]')) { labelSheet(); return; }
  if (t.closest('[data-recipe]')) { recipeSheet(); return; }
  if (t.closest('[data-manage]')) { manageSheet(); return; }
  if (t.closest('[data-weight]')) { weightSheet(); return; }
  if (t.closest('[data-reports]')) { openFoodReport(); }
}

// a small bar that offers to change the portion for a few seconds, then goes away
function snack(text, mealId) {
  let s = document.getElementById('snack');
  if (!s) { s = document.createElement('div'); s.id = 'snack'; s.className = 'snack'; document.body.appendChild(s); }
  s.innerHTML = '<span>' + esc(text) + '</span><button type="button">Change</button>';
  s.querySelector('button').onclick = () => { s.classList.remove('show'); portionSheet(mealId); };
  s.classList.add('show'); clearTimeout(snackTimer); snackTimer = setTimeout(() => s.classList.remove('show'), 5000);
}

// ---------- portion: one row of big buttons ----------
function portionSheet(id) {
  const m = meals().find(x => x.id === id); if (!m) return;
  let q = m.qty || 1;
  const show = v => v === 0.5 ? '½' : v === 1.5 ? '1½' : v === 2.5 ? '2½' : String(Math.round(v * 100) / 100);
  const info = () => { const v = m.n ? m.n.map(x => x == null ? null : x * q) : null; return v ? '~' + fmt(v[0], 0) + ' cal · ' + fmt(v[1], 1) + ' g protein · ' + fmt(v[2], 2) + ' g carbs · ' + fmt(v[3], 3) + ' g fat' : ''; };
  const sheet = openSheet('<h2>' + esc(m.name) + '</h2><p class="muted" style="margin:0">' + (m.n ? 'How many? One is ' + esc(m.unit) + '.' : 'This one has no numbers yet.') + '</p>' +
    (m.n ? '<div class="stepper"><button type="button" data-step="-1" aria-label="Less">−</button><output id="qOut">' + show(q) + '</output><button type="button" data-step="1" aria-label="More">+</button></div>' +
      '<div class="chips quick">' + [0.5, 1, 2, 3, 4, 5, 6, 8, 10].map(v => '<button type="button" class="chip small" data-q="' + v + '">' + show(v) + '</button>').join('') + '</div>' +
      (m.unitG ? '<div class="addrow"><label class="sr" for="gIn">Grams</label><input id="gIn" type="text" inputmode="decimal" placeholder="or type grams"><button type="button" class="btn alt" data-grams>Use grams</button></div>' : '') +
      '<p class="muted" id="qInfo" style="font-size:13px;margin:0">' + info() + '</p><button type="button" class="btn" data-o="ok">Save</button>'
      : '<button type="button" class="btn" data-o="link">Find its numbers</button>') +
    (m.foodId ? '<button type="button" class="btn alt" data-o="edit">Edit this food</button>' : '') +
    '<button type="button" class="btn danger" data-o="del">Remove</button><button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const t = ev.target; let b;
    const set = v => { q = Math.max(0.25, Math.min(99, v)); sheet.querySelector('#qOut').textContent = show(q); sheet.querySelector('#qInfo').textContent = info(); };
    if ((b = t.closest('[data-step]'))) { const d = Number(b.dataset.step); set(q < 1 || (q === 1 && d < 0) ? (d > 0 ? 1 : 0.5) : Math.floor(q) + d); return; }
    if ((b = t.closest('[data-q]'))) { set(Number(b.dataset.q)); return; }
    if (t.closest('[data-grams]')) { const g = parseFloat(document.getElementById('gIn').value); if (g > 0) set(Math.round(g / m.unitG * 100) / 100); return; }
    const o = t.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'ok') { m.qty = q; m.sure = true; save(); closeSheet(); render(); return; }
    if (o.dataset.o === 'del') { removeById('meals', id); closeSheet(); render(); return; }
    if (o.dataset.o === 'edit') { foodSheet(m.foodId); return; }
    if (o.dataset.o === 'link') { linkTo = id; query = m.name; closeSheet(); render(); const qi = root.querySelector('#fq'); if (qi) qi.focus(); }
  });
}

// ---------- make a food yours: name, usual portion, where it's from ----------
function foodSheet(id) {
  const f = myFoods().find(x => x.id === id); if (!f) return;
  const draft = { name: f.name, kind: f.kind, unit: f.unit, unitG: f.unitG };
  const draw = () => {
    const n = f.per100 && draft.unitG ? f.per100.map(v => v == null ? null : v * draft.unitG / 100) : f.n;
    return '<h2>Make it yours</h2>' +
      '<label class="field-label" for="fName">NAME</label><input id="fName" type="text" value="' + esc(draft.name) + '" autocomplete="off">' +
      '<div class="lbl">Where it\'s from</div><div class="chips">' + KINDS.map(k => '<button type="button" class="chip small" data-kind="' + k[0] + '" aria-pressed="' + (draft.kind === k[0]) + '">' + k[1] + '</button>').join('') + '</div>' +
      (f.per100 ? '<div class="lbl">Your usual portion</div><div class="chips">' + (f.measures || []).map((ms, i) => '<button type="button" class="chip small" data-ms="' + i + '" aria-pressed="' + (draft.unit === ms[0]) + '">' + esc(ms[0]) + ' (' + ms[1] + ' g)</button>').join('') + '</div>' +
        '<div class="addrow"><label class="sr" for="uG">Grams</label><input id="uG" type="text" inputmode="decimal" placeholder="or your own portion in grams" value="' + (draft.unit && /^\d+ g$/.test(draft.unit) ? draft.unitG : '') + '"><button type="button" class="btn alt" data-ug>Set</button></div>' : '') +
      '<p class="muted" style="font-size:13px;margin:0">One portion (' + esc(draft.unit) + '): ' + (n ? '~' + fmt(n[0], 0) + ' cal · ' + fmt(n[1], 1) + ' g protein · ' + fmt(n[2], 2) + ' g carbs · ' + fmt(n[3], 3) + ' g fat' : 'no numbers') + '</p>' +
      (f.recipe ? '<button type="button" class="btn alt" data-o="recipe">Change ingredients</button>' : '') +
      '<button type="button" class="btn" data-o="save">Save</button><button type="button" class="btn danger" data-o="del">Take off my usuals</button><button type="button" class="btn ghost" data-close>Cancel</button>';
  };
  const redraw = () => { draft.name = document.getElementById('fName').value; const sh = document.querySelector('#sheet .sheet'); sh.innerHTML = draw(); };
  openSheet(draw(), ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-kind]'))) { draft.kind = draft.kind === b.dataset.kind ? null : b.dataset.kind; redraw(); return; }
    if ((b = t.closest('[data-ms]'))) { const ms = f.measures[Number(b.dataset.ms)]; draft.unit = ms[0]; draft.unitG = ms[1]; redraw(); return; }
    if (t.closest('[data-ug]')) { const g = parseFloat(document.getElementById('uG').value); if (g > 0) { draft.unit = g + ' g'; draft.unitG = g; } redraw(); return; }
    const o = t.closest('[data-o]'); if (!o) return;
    if (o.dataset.o === 'recipe') { recipeSheet(id); return; }
    if (o.dataset.o === 'del') { get().myFoods = myFoods().filter(x => x.id !== id); save(); closeSheet(); render(); toast('Off your usuals. Past logs stay.'); return; }
    draft.name = document.getElementById('fName').value.trim() || f.name;
    Object.assign(f, { name: draft.name, kind: draft.kind, unit: draft.unit, unitG: draft.unitG });
    if (f.per100 && draft.unitG) f.n = f.per100.map(v => v == null ? null : v * draft.unitG / 100);
    save(); closeSheet(); render(); toast('Saved. It\'s yours now.');
  });
}

function manageSheet() {
  const list = myFoods().slice().sort((a, b) => a.name.localeCompare(b.name));
  openSheet('<h2>Your foods</h2><p class="muted" style="margin:0">Tap one to rename it, set your usual portion, or take it off.</p>' +
    list.map(f => '<button type="button" class="mgrow" data-f="' + f.id + '" style="width:100%;text-align:left"><span>' + esc(f.name) + '<small>' + esc(f.unit) + ' · ' + kcalP(f.n) + '</small></span><b style="color:var(--blue)">›</b></button>').join('') +
    '<button type="button" class="btn ghost" data-close>Done</button>', ev => { const b = ev.target.closest('[data-f]'); if (b) foodSheet(b.dataset.f); });
}

// ---------- a packet label, typed once ----------
// Australian labels always list energy, protein, fat, saturated fat, carbs, sugars and sodium. Blanks stay unknown, never zero.
function labelSheet() {
  const name = query.trim();
  let kj = true;
  const field = i => '<label for="ln' + i + '"><span>' + (i === 0 ? 'Energy' : NUTRIENTS[i][1]) + '</span><input id="ln' + i + '" type="text" inputmode="decimal" placeholder="' + (i === 0 ? 'kJ' : NUTRIENTS[i][2]) + '"></label>';
  openSheet('<h2>From a packet label</h2><p class="muted" style="margin:0">Use the "per serve" column. Skip anything that isn\'t on the label; it stays blank, it never counts as zero.</p>' +
    '<label class="field-label" for="lName">NAME</label><input id="lName" type="text" value="' + esc(name) + '" autocomplete="off">' +
    '<label class="field-label" for="lUnit">ONE SERVE IS</label><input id="lUnit" type="text" placeholder="e.g. 1 bar (45 g)" autocomplete="off">' +
    '<div class="seg" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button type="button" data-kj="1" aria-pressed="true">Energy in kJ</button><button type="button" data-kj="0" aria-pressed="false">Energy in Cal</button></div>' +
    '<div class="labelgrid">' + [0, 1, 3, 4, 2, 6, 7, 5].map(field).join('') + '</div>' +
    '<details class="more"><summary>Iron, calcium, B12, vitamin D (if listed)</summary><div class="labelgrid">' + [8, 9, 10, 11].map(field).join('') + '</div></details>' +
    '<div class="lbl">Where it\'s from</div><div class="chips">' + KINDS.map(k => '<button type="button" class="chip small" data-kind="' + k[0] + '" aria-pressed="' + (k[0] === 'packaged') + '">' + k[1] + '</button>').join('') + '</div>' +
    '<div class="err" id="lErr"></div><button type="button" class="btn" data-o="save">Save and log it</button><button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-kj]'))) { kj = b.dataset.kj === '1'; document.querySelectorAll('#sheet [data-kj]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); document.getElementById('ln0').placeholder = kj ? 'kJ' : 'Cal'; return; }
    if ((b = t.closest('[data-kind]'))) { document.querySelectorAll('#sheet [data-kind]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if (!t.closest('[data-o]')) return;
    const nm = document.getElementById('lName').value.trim(); if (!nm) { document.getElementById('lErr').textContent = 'Give it a name first.'; return; }
    const n = NUTRIENTS.map((x, i) => { const v = parseFloat(document.getElementById('ln' + i).value); return isNaN(v) ? null : v; });
    if (n[0] == null) { document.getElementById('lErr').textContent = 'Energy at least, so it can count.'; return; }
    if (kj) n[0] = Math.round(n[0] / 4.184);
    const kind = (document.querySelector('#sheet [data-kind][aria-pressed="true"]') || {}).dataset;
    const food = { id: uid(), name: nm, from: 'label', n, unit: document.getElementById('lUnit').value.trim() || '1 serve', unitG: null, kind: kind ? kind.kind : null, uses: 0, created: Date.now() };
    myFoods().push(food);
    const m = logFood(food, logDate()); closeSheet(); finishLog(m, food);
  });
}

// ---------- your own recipe: what goes in the pot ----------
// Count things the way you cook: 2 medium onions, 3 tomatoes, 1 tbsp oil. Grams only if you want them.
// Only the parts that change are redrawn, so typing never fights the keyboard.
const pickUnit = ms => { let i = ms.findIndex(m => /medium/i.test(m[0])); if (i < 0) i = ms.findIndex(m => !/\b(cup|oz|lb|g)\b/i.test(m[0])); return i; };
const gramsOf = it => it.mi >= 0 && it.measures[it.mi] ? it.count * it.measures[it.mi][1] : it.count;
function recipeSheet(editId) {
  const old = editId ? myFoods().find(f => f.id === editId) : null;
  const R = old && old.recipe
    ? { name: old.name, items: old.recipe.map(x => Object.assign({ measures: [], mi: -1, count: x.grams }, x)), portions: old.portions || 1, unit: old.unit }
    : { name: query.trim(), items: [], portions: 1, unit: '1 plate' };
  const per = () => recipeTotals(R.items.map(it => ({ per100: it.per100, grams: gramsOf(it) }))).map(v => v == null ? null : v / R.portions);
  const perText = () => { if (!R.items.length) return ''; const p = per(); return 'Each portion: ~' + fmt(p[0], 0) + ' cal · ' + fmt(p[1], 1) + ' g protein · ' + fmt(p[2], 2) + ' g carbs · ' + fmt(p[3], 3) + ' g fat'; };
  const rowHtml = (it, i) => '<div class="ingrow"><span>' + esc(it.name) + '<small>≈ ' + Math.round(gramsOf(it)) + ' g</small></span>' +
    '<input type="text" inputmode="decimal" data-ic="' + i + '" value="' + (Math.round(it.count * 100) / 100) + '" aria-label="How many">' +
    '<select data-iu="' + i + '" aria-label="Unit">' + it.measures.map((m, j) => '<option value="' + j + '"' + (j === it.mi ? ' selected' : '') + '>' + esc(m[0].replace(/^[\d.]+\s+/, '').replace(/\s*\(.*?\)/g, '').replace(/,.*$/, '')) + '</option>').join('') + '<option value="-1"' + (it.mi < 0 ? ' selected' : '') + '>grams</option></select>' +
    '<button type="button" data-irm="' + i + '" aria-label="Remove ' + esc(it.name) + '">×</button></div>';
  const sheet = openSheet('<h2>' + (old ? 'Change the recipe' : 'Make it from ingredients') + '</h2><p class="muted" style="margin:0">Add what goes in the pot, counted however you count it. Skip the spices; don\'t forget the oil or ghee.</p>' +
    '<label class="field-label" for="rName">DISH</label><input id="rName" type="text" value="' + esc(R.name) + '" placeholder="e.g. Chicken gravy" autocomplete="off">' +
    '<div class="lbl">Ingredients</div><div id="ingList"></div>' +
    '<input id="iq" type="search" placeholder="Add an ingredient: onion, tomato, oil…" autocomplete="off" autocorrect="off" spellcheck="false">' +
    '<div id="ingRes" class="reslist"></div>' +
    '<div class="addrow"><span class="lbl" style="flex:1">Makes how many portions?</span><div class="stepper small"><button type="button" data-pstep="-1" aria-label="Fewer">−</button><output id="pOut">' + R.portions + '</output><button type="button" data-pstep="1" aria-label="More">+</button></div></div>' +
    '<label class="field-label" for="rUnit">ONE PORTION IS</label><input id="rUnit" type="text" value="' + esc(R.unit) + '" autocomplete="off">' +
    '<p class="muted" id="rPer" style="font-size:13px;margin:0"></p>' +
    '<div class="err" id="rErr"></div><button type="button" class="btn" data-o="save">' + (old ? 'Save' : 'Save and log a portion') + '</button><button type="button" class="btn ghost" data-close>Cancel</button>', ev => {
    const t = ev.target; let b;
    if ((b = t.closest('[data-iadd]'))) {
      const f = sheet._res[Number(b.dataset.iadd)]; const ms = f.measures || [];
      R.items.push({ name: f.name, from: f.src + ':' + f.name, per100: f.per100, measures: ms, mi: pickUnit(ms), count: pickUnit(ms) >= 0 ? 1 : 100 });
      const iq = sheet.querySelector('#iq'); iq.value = ''; drawRes(''); drawList(); return;
    }
    if ((b = t.closest('[data-irm]'))) { R.items.splice(Number(b.dataset.irm), 1); drawList(); return; }
    if ((b = t.closest('[data-pstep]'))) { R.portions = Math.max(1, Math.min(30, R.portions + Number(b.dataset.pstep))); sheet.querySelector('#pOut').textContent = R.portions; sheet.querySelector('#rPer').textContent = perText(); return; }
    const o = t.closest('[data-o]'); if (!o) return;
    R.name = sheet.querySelector('#rName').value; R.unit = sheet.querySelector('#rUnit').value;
    if (!R.name.trim()) { sheet.querySelector('#rErr').textContent = 'Give the dish a name.'; return; }
    if (!R.items.length) { sheet.querySelector('#rErr').textContent = 'Add at least one ingredient.'; return; }
    const items = R.items.map(it => ({ name: it.name, from: it.from, per100: it.per100, measures: it.measures, mi: it.mi, count: it.count, grams: gramsOf(it) }));
    const totalG = items.reduce((a2, x) => a2 + x.grams, 0);
    const food = old || { id: uid(), from: 'recipe', kind: 'home', uses: 0, created: Date.now() };
    Object.assign(food, { name: R.name.trim(), recipe: items, portions: R.portions, n: per(), unit: R.unit.trim() || '1 portion', unitG: Math.round(totalG / R.portions), per100: null });
    if (!old) myFoods().push(food);
    save(); closeSheet();
    if (old) { render(); toast('Recipe saved. New logs use the new numbers.'); return; }
    const m = logFood(food, logDate()); finishLog(m, food);
  });
  function drawList() {
    sheet.querySelector('#ingList').innerHTML = R.items.length ? R.items.map(rowHtml).join('') : '<p class="muted" style="font-size:13px;margin:0">Nothing yet. Search below.</p>';
    sheet.querySelector('#rPer').textContent = perText();
  }
  function drawRes(q) {
    sheet._res = ingredientSearch(q, 6);
    sheet.querySelector('#ingRes').innerHTML = sheet._res.map((f, i) => '<button type="button" class="res" data-iadd="' + i + '"><span>' + esc(f.name) + '<small>' + Math.round(f.per100[0]) + ' cal per 100 g</small></span><b>+</b></button>').join('');
  }
  let timer = null;
  sheet.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'iq') { clearTimeout(timer); timer = setTimeout(() => drawRes(el.value), 180); return; }
    if (el.dataset.ic != null) {
      const it = R.items[Number(el.dataset.ic)], v = parseFloat(el.value); if (v > 0) it.count = v;
      el.closest('.ingrow').querySelector('small').textContent = '≈ ' + Math.round(gramsOf(it)) + ' g';
      sheet.querySelector('#rPer').textContent = perText();
    }
  });
  sheet.addEventListener('change', e => {
    const el = e.target; if (el.dataset.iu == null) return;
    const it = R.items[Number(el.dataset.iu)], g = gramsOf(it), mi = Number(el.value);
    it.count = mi < 0 ? Math.round(g) : (it.mi < 0 ? 1 : it.count); it.mi = mi;
    drawList();
  });
  drawList();
}

// ---------- everything the day gave you ----------
function totalsSheet() {
  const list = dayList(), S = sumDay(list.filter(x => x.m).map(x => x.m));
  openSheet('<h2>' + esc(prettyDate(logDate(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' +
    '<div class="nutable">' + NUTRIENTS.map((n, i) => '<div><span>' + n[1] + (S.has[i] && S.cnt[i] < S.counted ? '<small>from ' + S.cnt[i] + ' of ' + S.counted + ' foods</small>' : '') + '</span><b>' + (S.has[i] ? fmt(S.t[i], i) + ' ' + n[2] : '–') + '</b></div>').join('') + '</div>' +
    '<p class="muted" style="font-size:13px;margin:0">Good estimates, not exact. ' + (S.blank ? S.blank + (S.blank === 1 ? ' thing has' : ' things have') + ' no numbers yet; tap it in the list to fill them in. ' : '') + 'Not every food in the lists has B12 or vitamin D, so those read low.</p>' +
    '<button type="button" class="btn ghost" data-close>Close</button>', null);
}

// ---------- weight, whenever you get near a scale ----------
function weightSheet() {
  const W = weights();
  let where = 'Gym';
  const draw = () => {
    const pts = W.slice().sort((a, b) => a.date.localeCompare(b.date));
    let chart = '';
    if (pts.length >= 2) {
      const ks = pts.map(p => p.kg), lo = Math.min(...ks) - 1, hi = Math.max(...ks) + 1, t0 = new Date(pts[0].date).getTime(), t1 = Math.max(t0 + 1, new Date(pts[pts.length - 1].date).getTime());
      const X = p => 10 + (new Date(p.date).getTime() - t0) / (t1 - t0) * 280, Y = k => 70 - (k - lo) / (hi - lo) * 60;
      chart = '<svg viewBox="0 0 300 80" class="wchart" role="img" aria-label="Your weight over time"><polyline fill="none" stroke="#1F55D0" stroke-width="2" stroke-linejoin="round" points="' + pts.map(p => X(p).toFixed(1) + ',' + Y(p.kg).toFixed(1)).join(' ') + '"/>' + pts.map(p => '<circle cx="' + X(p).toFixed(1) + '" cy="' + Y(p.kg).toFixed(1) + '" r="3" fill="#1F55D0"/>').join('') + '</svg>';
    }
    return '<h2>Weight</h2><p class="muted" style="margin:0">Whenever you\'re near a scale. Different scales read a little differently, so it helps to note where.</p>' +
      '<div class="addrow"><label class="sr" for="wKg">Kilograms</label><input id="wKg" type="text" inputmode="decimal" placeholder="kg"><input id="wDay" type="date" max="' + today() + '" value="' + logDate() + '" aria-label="Date" style="max-width:150px"></div>' +
      '<div class="chips">' + ['Gym', 'Hospital', 'Other'].map(w => '<button type="button" class="chip small" data-where="' + w + '" aria-pressed="' + (w === where) + '">' + w + '</button>').join('') + '</div>' +
      '<button type="button" class="btn" data-o="save">Save</button>' + chart +
      '<div class="daylist">' + pts.slice().reverse().map(p => '<div class="entry"><span class="t">' + esc(prettyDate(p.date)) + '</span><span class="nm">' + p.kg + ' kg<small>' + esc(p.where || '') + '</small></span><button type="button" class="x" data-wdel="' + p.id + '" aria-label="Remove">×</button></div>').join('') + '</div>' +
      '<button type="button" class="btn ghost" data-close>Done</button>';
  };
  const sheet = openSheet(draw(), ev => {
    const t = ev.target; let b;
    const redraw = () => { sheet.querySelector('.sheet').innerHTML = draw(); };
    if ((b = t.closest('[data-where]'))) { where = b.dataset.where; sheet.querySelectorAll('[data-where]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return; }
    if ((b = t.closest('[data-wdel]'))) { const keep = W.filter(x => x.id !== b.dataset.wdel); W.length = 0; W.push(...keep); save(); redraw(); render(); return; }
    if (t.closest('[data-o]')) {
      const kg = parseFloat(document.getElementById('wKg').value);
      if (!(kg > 20 && kg < 400)) { toast('Type your weight in kg'); return; }
      W.push({ id: uid(), date: document.getElementById('wDay').value || today(), ts: Date.now(), kg: Math.round(kg * 10) / 10, where });
      save(); redraw(); render(); toast('Noted.');
    }
  });
}
