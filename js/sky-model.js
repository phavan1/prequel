// Turns your moments into a sky. Assignments are saved, so a constellation you've seen never changes shape.
import { get, save } from './store.js';

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const ADJ = ['Sleepy', 'Wobbly', 'Brave', 'Quiet', 'Stubborn', 'Gentle', 'Sweaty', 'Patient', 'Tiny', 'Golden', 'Restless', 'Cosy', 'Hopeful', 'Clumsy', 'Steady', 'Soft', 'Midnight', 'Rainy', 'Lucky', 'Humble', 'Dreaming', 'Bashful', 'Hungry', 'Faraway', 'Kind', 'Spinning', 'Late', 'Warm', 'Curious', 'Shy', 'Stormproof', 'Unhurried', 'Crooked', 'Glowing', 'Brand-new'];
const NOUN = ['Lantern', 'Kettle', 'Dumbbell', 'Teacup', 'Sneaker', 'Hoodie', 'Dosa', 'Banana', 'Umbrella', 'Pillow', 'Quilt', 'Bicycle', 'Fox', 'Whale', 'Owl', 'Snail', 'Kite', 'Spoon', 'Notebook', 'Moth', 'Frog', 'Barbell', 'Radio', 'Orange', 'Sparrow', 'Boat', 'Mitten', 'Tortoise', 'Window', 'Lighthouse', 'Skateboard', 'Envelope', 'Paper Crane', 'Spice Jar', 'Night Lamp'];
const GOLDEN = 2.399963;

export function clusterCenter(k) { const r = 70 + Math.sqrt(k) * 128; return { x: Math.cos(k * GOLDEN) * r, y: Math.sin(k * GOLDEN) * r }; }
const order = (a, b) => (a.date + String(a.ts).padStart(15, '0')).localeCompare(b.date + String(b.ts).padStart(15, '0'));

// place any new moments; form constellations when a patch fills up
export function updateSky() {
  const st = get();
  if (!st.sky) st.sky = { clusters: [], placed: {}, seenCons: 0, seenStars: 0 };
  const sky = st.sky;
  const fresh = st.moments.filter(m => sky.placed[m.id] === undefined).sort(order);
  let changed = false;
  fresh.forEach(m => {
    let open = sky.clusters[sky.clusters.length - 1];
    if (!open || open.con) { open = newCluster(sky); }
    // a late log for a day that already belongs to a finished chapter sits beside that constellation
    const home = sky.clusters.find(c => c.con && m.date >= c.from && m.date <= c.to);
    if (home && !(open.from && m.date >= open.from)) { home.members.push(m.id); sky.placed[m.id] = home.k; changed = true; return; }
    open.members.push(m.id); sky.placed[m.id] = open.k;
    open.from = open.from && open.from < m.date ? open.from : m.date;
    open.to = open.to && open.to > m.date ? open.to : m.date;
    changed = true;
    const live = open.members.filter(id => st.moments.some(x => x.id === id));
    if (live.length >= open.target) formConstellation(st, open);
  });
  if (changed) save();
  return sky;
}

function newCluster(sky) {
  const k = sky.clusters.length, r = mulberry32(9000 + k * 77);
  const c = { k, target: 6 + Math.floor(r() * 6), members: [], con: null, from: null, to: null };
  sky.clusters.push(c); return c;
}

export function starPos(m, cl) {
  const c = clusterCenter(cl.k), r = mulberry32(hashStr(m.id));
  const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 82;
  return { x: c.x + Math.cos(ang) * rad, y: c.y + Math.sin(ang) * rad, mag: r() + (m.bright ? 2 : 0), phase: r() * 6.283, speed: 0.6 + r() * 1.6, size: 0.9 + r() * 1.3 };
}

function formConstellation(st, cl) {
  const r = mulberry32(31 + cl.k * 101);
  const byId = Object.fromEntries(st.moments.map(m => [m.id, m]));
  const stars = cl.members.filter(id => byId[id]).map(id => Object.assign({ id }, starPos(byId[id], cl)));
  const pick = stars.sort((a, b) => b.mag - a.mag).slice(0, Math.min(stars.length, 4 + Math.floor(r() * 4)));
  // nearest-neighbour tree, so every shape is different
  const inTree = [pick[0]], left = pick.slice(1), edges = [];
  while (left.length) {
    let best = null, bi = -1, bd = Infinity;
    inTree.forEach(a => left.forEach((b, i) => { const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d < bd) { bd = d; best = [a.id, b.id]; bi = i; } }));
    edges.push(best); inTree.push(left[bi]); left.splice(bi, 1);
  }
  if (pick.length >= 5 && r() < 0.4) edges.push([pick[pick.length - 1].id, pick[1].id]);
  cl.con = { edges, name: 'The ' + ADJ[Math.floor(r() * ADJ.length)] + ' ' + NOUN[Math.floor(r() * NOUN.length)], formed: Date.now(), ids: pick.map(p => p.id) };
}
