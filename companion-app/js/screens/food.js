import { get, save, uid, addMoment, removeById } from '../store.js';
import { FOOD_TAGS } from '../data.js';
import { esc, nav, backLink, dateChip, logDate, him, timeOf, prettyDate, toast, openSheet, closeSheet } from '../ui.js';

let tags = ['Proper meal'];

export function mount(root) {
  render(root);
  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-tag]'))) { const v = b.dataset.tag; tags = tags.includes(v) ? tags.filter(x => x !== v) : [...tags, v]; render(root, true); return; }
    if (t.closest('[data-log]')) {
      const note = (root.querySelector('#note').value || '').trim();
      if (!tags.length && !note) { toast('Pick at least one thing, or type what you had'); return; }
      logFood(tags.slice(), note); tags = ['Proper meal']; render(root); return;
    }
    if ((b = t.closest('[data-comfort]'))) {
      const c = get().comfort.find(x => x.id === b.dataset.comfort); if (!c) return;
      logFood(['Proper meal', 'Cooked it myself'], c.name); render(root); return;
    }
    if ((b = t.closest('[data-uncomfort]'))) { const st = get(); st.comfort = st.comfort.filter(x => x.id !== b.dataset.uncomfort); save(); render(root); return; }
    if (t.closest('[data-addcomfort]')) { addComfort(root); return; }
    if ((b = t.closest('[data-del]'))) { removeById('foods', b.dataset.del); render(root); }
  });
}

function logFood(tagList, note) {
  const st = get(), date = logDate();
  const entry = { id: uid(), date, ts: Date.now(), tags: tagList, note };
  st.foods.push(entry);
  const firstNew = tagList.includes('Tried something new');
  addMoment('food', note || tagList.join(', '), date, { ref: entry.id, bright: firstNew ? 1 : 0 });
  const cooked = st.foods.filter(f => f.tags.includes('Cooked it myself')).length;
  toast(tagList.includes('Cooked it myself') ? 'Home-cooked meal number ' + cooked + '. Lovely.' : 'Logged. Feeding yourself counts.');
}

function addComfort(root) {
  openSheet('<h2>Save a comfort meal</h2><p class="muted">Something easy you know you can manage. On low days, it\'s already decided.</p>' +
    '<label class="field-label" for="cName">MEAL</label><input id="cName" type="text" placeholder="e.g. Chicken + dosas" autocomplete="off">' +
    '<label class="field-label" for="cTime">HOW LONG IT TAKES</label><input id="cTime" type="text" placeholder="e.g. 15 min" autocomplete="off">' +
    '<button type="button" class="btn" data-save>Save it</button><button type="button" class="btn alt" data-close>Cancel</button>', ev => {
    if (!ev.target.closest('[data-save]')) return;
    const name = document.getElementById('cName').value.trim(); if (!name) return;
    get().comfort.push({ id: uid(), name, time: document.getElementById('cTime').value.trim() });
    save(); closeSheet(); render(root);
  });
}

function render(root, keepNote) {
  const st = get(), date = logDate();
  const note = keepNote && root.querySelector('#note') ? root.querySelector('#note').value : '';
  const cooked = st.foods.filter(f => f.tags.includes('Cooked it myself')).length;
  const newFoods = st.foods.filter(f => f.tags.includes('Tried something new')).length;
  const todays = st.foods.filter(f => f.date === date).sort((a, b) => a.ts - b.ts);
  root.innerHTML =
    '<div class="top">' + backLink() + dateChip() + '</div>' +
    '<div class="hero">' + him(tags.includes('Cooked it myself') ? 'cooking' : 'eating', 'breathe', 'Your character eating with you') +
      '<div class="txt"><h1>A food moment</h1><p class="say">Eating with you. A banana counts.</p></div></div>' +
    '<div class="chips">' + FOOD_TAGS.map(t => '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' + tags.includes(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
    '<label class="sr" for="note">What did you have? (optional)</label><input id="note" type="text" placeholder="What did you have? (optional)" autocomplete="off" value="' + esc(note) + '">' +
    '<button type="button" class="btn wide" data-log>Log it</button>' +
    '<div class="grid2"><div class="count"><b>' + cooked + ' <small class="muted" style="font-size:13px">/ 50</small></b><span>home-cooked meals</span></div><div class="count"><b>' + newFoods + ' <small class="muted" style="font-size:13px">/ 25</small></b><span>new foods tried</span></div></div>' +
    '<div class="top"><div class="lbl">Comfort menu · saved by good-day you</div><button type="button" class="btn ghost" data-addcomfort style="min-height:36px;padding:0 4px">+ Save one</button></div>' +
    (st.comfort.length ? st.comfort.map(c => '<div class="menu-item"><b>' + esc(c.name) + '</b><span>' + esc(c.time || '') + '</span><button type="button" data-comfort="' + c.id + '">Had it</button><button type="button" data-uncomfort="' + c.id + '" aria-label="Remove ' + esc(c.name) + '" style="color:var(--ink-soft)">×</button></div>').join('') : '<p class="empty">Nothing saved yet. Add an easy meal on a good day.</p>') +
    '<div class="card"><div class="lbl">' + esc(prettyDate(date)) + '</div>' +
      (todays.length ? todays.map(f => '<div class="entry"><span class="t">' + timeOf(f.ts) + '</span><span>' + esc(f.note || f.tags.join(', ')) + '</span><button type="button" class="x" data-del="' + f.id + '" aria-label="Remove">×</button></div>').join('') : '<p class="empty">No food moments logged yet.</p>') +
    '</div>' + nav('home');
}
