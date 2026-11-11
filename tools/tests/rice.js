// v103: rice by its variety name in food search (basmati, seeraga samba, sona masoori, ponni, red/matta), with cooked
// rice numbers under your own name. Run: PREQUEL_URL=http://localhost:8765/ node tools/tests/rice.js
const { chromium } = require('playwright');
const BASE = process.env.PREQUEL_URL || 'http://localhost:8765/';
const results = []; const ok = (name, pass, note = '') => results.push([pass ? 'PASS' : 'FAIL', name, note]);
const errors = [];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const N = await import('./js/nutrition.js'); await N.loadDB();
    const top = q => N.search(q).db.slice(0, 3).map(f => f.name);
    const f = N.search('sona masoori').db[0], base = N.search('boiled rice').db.find(x => /^Boiled rice/.test(x.name)), m = N.search('matta').db[0];
    return { basmati: top('basmati'), samba: top('samba'), seeraga: top('seeraga samba'), jeera: top('jeera samba'), sona: top('sona masoori'), masuri: top('sona masuri'), ponni: top('ponni'), matta: top('matta'), red: top('red rice'), plain: top('rice'),
      same: JSON.stringify(f.per100) === JSON.stringify(base.per100), mattaFibre: m.per100[5], unit: N.fromDB(f).unit };
  });
  ok('basmati', r.basmati[0] === 'Basmati rice, cooked', r.basmati.join(' | '));
  ok('"samba" finds seeraga samba rice before sambar', r.samba[0] === 'Seeraga samba rice, cooked', r.samba.join(' | '));
  ok('seeraga samba, and jeera samba', r.seeraga[0] === 'Seeraga samba rice, cooked' && r.jeera[0] === 'Seeraga samba rice, cooked');
  ok('sona masoori, and sona masuri', r.sona[0] === 'Sona masoori rice, cooked' && r.masuri[0] === 'Sona masoori rice, cooked');
  ok('ponni', r.ponni[0] === 'Ponni rice, cooked');
  ok('red rice / matta borrows brown rice (more fibre)', r.matta[0] === 'Red rice (Kerala matta), cooked' && r.red[0] === 'Red rice (Kerala matta), cooked' && r.mattaFibre > 1.5, String(r.mattaFibre));
  ok('the white varieties use cooked rice\'s numbers', r.same);
  ok('plain "rice" search is unchanged at the top', !/Basmati|Seeraga|Sona|Ponni|matta/.test(r.plain[0]), r.plain.join(' | '));
  ok('a natural portion', /plate|cup/.test(r.unit), r.unit);
  await b.close();
  results.forEach(x => console.log(x.join('  ')));
  console.log('rice: ' + results.filter(x => x[0] === 'FAIL').length + ' failed of ' + results.length + (errors.length ? ' ERRORS: ' + errors.join(' | ') : ' no errors'));
})();
