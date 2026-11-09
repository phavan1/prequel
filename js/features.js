// v101: "Make it yours". Eight big areas that each person can switch off. Off means hidden everywhere, never
// deleted: switch it back on and everything is still there (backups always keep everything).
// Home, Me, soft days and their games, the sky, Share, Settings and backups are always on. On repeat and Cycle
// keep their own switches (Extra tabs on Days).
import { get, save } from './store.js';

export const AREAS = [
  ['food', 'Food', 'What you eat, your food report.'],
  ['move', 'Move', 'The gym, your activities, Your moving journey.'],
  ['rest', 'Rest', 'Sleep and naps, your quilt, the sleep diary.'],
  ['mind', 'Mind', 'Things on your mind, lanterns, letters.'],
  ['weather', 'Weather', 'How the weather inside feels, your ribbon.'],
  ['wins', 'Tiny wins', 'The jar of small things you did.'],
  ['goals', 'Goals', 'Things you\'re counting up to.'],
  ['wall', 'Your wall', 'A monthly planner to print, and your monthly recap.']
];
const offList = () => { const s = get().settings || {}; return Array.isArray(s.off) ? s.off : []; };
export const on = id => !offList().includes(id);
export function setOn(id, yes) {
  const s = get().settings; s.off = offList().filter(x => x !== id); if (!yes) s.off.push(id); save();
}
// the Days tab lives while any of the areas it shows is on
export const daysOn = () => ['food', 'move', 'rest', 'weather', 'wins'].some(on);
// what feeds the sky: a star for every moment from these areas
const SKY_FED = ['food', 'move', 'rest', 'mind', 'weather', 'wins', 'goals'];
export const skyFed = () => SKY_FED.some(on);
// the sky shows while it has stars, or while something can still add one; the quilt likewise with patches
export const skyOn = () => skyFed() || (get().moments || []).length > 0;
export const quiltOn = () => on('rest') || (get().rests || []).length > 0;
// which area a page belongs to (a switched-off page sends you Home)
export const PAGE_AREA = { food: 'food', move: 'move', gym: 'move', workout: 'move', journey: 'move', rest: 'rest', mind: 'mind', letters: 'mind', weather: 'weather', wins: 'wins', wall: 'wall' };
export function pageAllowed(page) {
  if (page === 'days') return daysOn();
  if (page === 'sky') return skyOn();
  if (page === 'quilt') return quiltOn();
  const a = PAGE_AREA[page]; return !a || on(a);
}
export const needsAreasAsk = () => !get().settings.areasAsked;
export function markAsked() { get().settings.areasAsked = true; save(); }
// which area a goal counts from (a goal hides while its area is off, and every goal hides with Goals)
export function goalArea(g) {
  const s = (g && (g.source || '')) || '';
  if (g && g.kind === 'own') return 'goals';
  if (s === 'sessions' || s.startsWith('act:')) return 'move';
  if (s === 'cooked' || s === 'newfood' || s === 'breakfast') return 'food';
  if (s === 'restdays') return 'rest';
  if (s === 'wins' || s.startsWith('win:')) return 'wins';
  if (s === 'letters' || s === 'lanterns') return 'mind';
  return 'goals';
}
export const goalShown = g => on('goals') && on(goalArea(g));
