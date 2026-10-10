// Share: story-sized cards made from your own data. Pick a card, swipe through its looks, share or save.
// Nothing is uploaded by the app; the picture only goes where you send it.
import { get } from '../store.js';
import { esc, nav, backLink, toast } from '../ui.js';
import { shareFile } from '../pdf.js';
import { W, H, POSES, loadArt, fontsReady, drawSky, drawMilestone, drawMonth, milestones, shareCanvas, SKY_LOOKS, MILE_LOOKS, MONTH_LOOKS } from '../cards.js';

const KINDS = {
  sky: { name: 'My sky', looks: SKY_LOOKS },
  mile: { name: 'Milestone', looks: MILE_LOOKS },
  month: { name: 'My month', looks: MONTH_LOOKS }
};
let kind = null, lookIx = { sky: 0, mile: 0, month: 0 }, mileId = null;

export function mount(root, params = {}) {
  const st = get(), miles = milestones();
  const avail = Object.keys(KINDS).filter(k => k === 'month' || (k === 'sky' ? st.moments.length > 0 : miles.length > 0));
  if (params.t && avail.includes(params.t)) kind = params.t;
  if (params.m && miles.some(m => m.id === params.m)) mileId = params.m;
  if (!kind || !avail.includes(kind)) kind = avail[0];
  if (!mileId || !miles.some(m => m.id === mileId)) mileId = miles[0] && miles[0].id;

  root.innerHTML = backLink('#/me', 'Me') +
    '<h1 class="sharetitle">Share a little of your story</h1>' +
    '<div class="chips sharekinds" role="tablist">' + avail.map(k => '<button type="button" class="chip" role="tab" data-kind="' + k + '">' + KINDS[k].name + '</button>').join('') + '</div>' +
    '<div class="milepick" hidden></div>' +
    '<div class="sharestage"><button type="button" class="sharenav prev" data-step="-1" aria-label="Previous look">‹</button>' +
      '<canvas id="card" width="' + W + '" height="' + H + '" aria-label="Preview of your card"></canvas>' +
      '<button type="button" class="sharenav next" data-step="1" aria-label="Next look">›</button></div>' +
    '<div class="lookdots" aria-live="polite"></div>' +
    '<button type="button" class="btn wide" data-share>Share or save</button>' +
    '<p class="muted sharenote">Swipe the card for another look. To keep it, pick Save Image. Only this picture leaves your phone, and only where you send it.</p>' +
    nav('me');

  const cv = root.querySelector('#card'), g = cv.getContext('2d');
  let imgs = {}, ready = false, file = null, stamp = 0;
  const draw = () => {
    if (!ready) return;
    const look = KINDS[kind].looks[lookIx[kind]];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (kind === 'sky') drawSky(g, look, imgs);
    else if (kind === 'mile') drawMilestone(g, look, imgs, miles.find(m => m.id === mileId) || miles[0]);
    else drawMonth(g, look, imgs);
    // get the picture ready now, so the share sheet opens straight from the tap
    const my = ++stamp, name = 'prequel-' + KINDS[kind].name.toLowerCase().replace(/\s+/g, '-') + '.png'; file = null;
    cv.toBlob(b => { if (my === stamp && b) file = new File([b], name, { type: 'image/png' }); }, 'image/png');
  };
  const ui = () => {
    root.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.kind === kind)));
    const mp = root.querySelector('.milepick');
    mp.hidden = kind !== 'mile';
    if (kind === 'mile') mp.innerHTML = '<div class="chips">' + miles.map(m => '<button type="button" class="chip small" data-mile="' + m.id + '" aria-pressed="' + (m.id === mileId) + '">' + esc(m.title) + ' · ' + m.n + '</button>').join('') + '</div>';
    const looks = KINDS[kind].looks;
    root.querySelector('.lookdots').innerHTML = looks.map((l, i) => '<button type="button" data-look-i="' + i + '" aria-pressed="' + (i === lookIx[kind]) + '"><i></i><span>' + esc(l.name) + '</span></button>').join('');
    draw();
  };
  const step = d => { const n = KINDS[kind].looks.length; lookIx[kind] = (lookIx[kind] + d + n) % n; ui(); };

  ui();
  Promise.all([fontsReady(), loadArt(POSES)]).then(([, a]) => {
    POSES.forEach((n, i) => { imgs[n] = a[i]; }); ready = true; draw();
  });

  root.addEventListener('click', async e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-kind]'))) { kind = b.dataset.kind; ui(); return; }
    if ((b = t.closest('[data-mile]'))) { mileId = b.dataset.mile; ui(); return; }
    if ((b = t.closest('[data-look-i]'))) { lookIx[kind] = Number(b.dataset.lookI); ui(); return; }
    if ((b = t.closest('[data-step]'))) { step(Number(b.dataset.step)); return; }
    if (t.closest('[data-share]')) {
      if (!ready) return;
      if (!file) { toast('One moment, still drawing.'); return; }
      const r = await shareFile(file);
      if (r === 'saved') toast('Saved. Look in your downloads or Files.');
    }
  });
  // swipe for the next look
  let sx = null, sy = 0;
  cv.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchend', e => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
}
