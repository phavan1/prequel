// Fixed content: your Project Athletic playbook, the weathers, and the parts of life.
export const AREAS = {
  move: { name: 'Move', colour: '#1F55D0' },
  food: { name: 'Food', colour: '#E5893D' },
  rest: { name: 'Rest', colour: '#D9A400' },
  win: { name: 'Tiny win', colour: '#D6698C' },
  mind: { name: 'Mind', colour: '#3E9E6E' }
};

// t: wr = weight × reps, hold = seconds, mins = minutes. rest: c = compound, i = isolation. m = machine (kg or plate #)
export const EXERCISES = {
  legpress: { n: 'Leg press', t: 'wr', m: 1, rest: 'c', subs: ['Smith squat', 'Goblet squat', 'Split squat'] },
  chest: { n: 'Chest press', t: 'wr', m: 1, rest: 'c', subs: ['Flat dumbbell press', 'Incline dumbbell press', 'Smith press'] },
  incline: { n: 'Incline press', t: 'wr', m: 1, rest: 'c', subs: ['Incline dumbbells', 'Flat press'] },
  lat: { n: 'Lat pulldown', t: 'wr', m: 1, rest: 'c', subs: ['Assisted pull-up', 'Another pulldown station'] },
  row: { n: 'Seated cable row', t: 'wr', m: 1, rest: 'c', subs: ['Machine row', 'Chest-supported dumbbell row'] },
  shoulder: { n: 'Shoulder press', t: 'wr', m: 1, rest: 'c', subs: ['Seated dumbbell press'] },
  curl: { n: 'Biceps curl', t: 'wr', m: 0, rest: 'i', subs: ['Dumbbell curl', 'Fixed-bar curl', 'Hammer curl'] },
  hammer: { n: 'Hammer curl', t: 'wr', m: 0, rest: 'i', subs: ['Dumbbell curl'] },
  tri: { n: 'Triceps pushdown', t: 'wr', m: 1, rest: 'i', subs: ['Overhead dumbbell extension', 'Machine extension'] },
  ohtri: { n: 'Overhead triceps ext.', t: 'wr', m: 0, rest: 'i', subs: ['Cable pushdown'] },
  crunch: { n: 'Ab crunch', t: 'wr', m: 1, rest: 'i', subs: ['Cable crunch', 'Plank'] },
  legcurl: { n: 'Seated leg curl', t: 'wr', m: 1, rest: 'c', subs: ['Romanian deadlift', 'Swiss-ball hamstring curl'] },
  rdl: { n: 'Romanian deadlift', t: 'wr', m: 0, rest: 'c', subs: ['Seated leg curl'] },
  legext: { n: 'Leg extension', t: 'wr', m: 1, rest: 'i', subs: ['Split squat', 'Step-up'] },
  calf: { n: 'Dumbbell calf raise', t: 'wr', m: 0, rest: 'i', subs: ['Calf machine'] },
  plank: { n: 'Plank', t: 'hold', m: 0, rest: 'i', subs: ['Ab crunch'] },
  face: { n: 'Face pulls', t: 'wr', m: 1, rest: 'i', subs: ['Reverse fly'] },
  lateral: { n: 'Lateral raise', t: 'wr', m: 0, rest: 'i', subs: ['Cable lateral raise'] },
  split: { n: 'Split squat', t: 'wr', m: 0, rest: 'c', each: 1, subs: ['Step-up'] },
  pallof: { n: 'Pallof press', t: 'wr', m: 1, rest: 'i', subs: ['Plank'] },
  walk: { n: 'Easy walk / cycle / row', t: 'mins', m: 0, rest: null, subs: ['Cycle', 'Rower'] },
  mobility: { n: 'Mobility / stretching', t: 'mins', m: 0, rest: null, subs: [] }
};

const C = '8-12', I = '10-15';
export const WORKOUTS = [
  { id: 'fbA', n: 'Full Body A', d: 'your main general session', items: [['legpress', '2-3', C], ['chest', '2-3', C], ['lat', '2-3', C], ['shoulder', '2', C], ['curl', '2', I], ['crunch', '2', I]] },
  { id: 'fbB', n: 'Full Body B', d: 'posterior chain + rows', items: [['legcurl', '2-3', C], ['row', '2-3', C], ['legext', '2', I], ['chest', '2', C], ['tri', '2', I], ['calf', '2', '12-20'], ['plank', '2', '20-60s']] },
  { id: 'tbe', n: 'Total Body Essential', d: 'only one gym day this week', items: [['legpress', '2-3', C], ['chest', '2-3', C], ['lat', '2-3', C], ['row', '2', C], ['shoulder', '2', C], ['legcurl', '2', C], ['curl', '2', I], ['tri', '2', I], ['calf', '2', '12-20'], ['crunch', '2', I]] },
  { id: 'min20', n: '20-Minute Minimum', d: 'okay body, terrible motivation', items: [['legpress', '2', C], ['chest', '2', C], ['lat', '2', C]] },
  { id: 'rec', n: 'Recovery / Light', d: 'want to go, not recovered', items: [['walk', '1', '10-20 min'], ['face', '2', '12-15'], ['plank', '2', '20-45s'], ['calf', '2', 'easy'], ['mobility', '1', '5-10 min']] },
  { id: 'uA', n: 'Upper A', d: 'horizontal push + vertical pull', items: [['chest', '2-3', C], ['lat', '2-3', C], ['row', '2', C], ['shoulder', '2', C], ['face', '2', '12-15'], ['curl', '2', I], ['tri', '2', I]] },
  { id: 'lA', n: 'Lower A', d: 'quad emphasis', items: [['legpress', '2-3', C], ['legext', '2', I], ['legcurl', '2', I], ['calf', '2', '12-20'], ['crunch', '2', I]] },
  { id: 'uB', n: 'Upper B', d: 'incline + back / shoulders', items: [['incline', '2-3', C], ['row', '2-3', C], ['lat', '2', C], ['lateral', '2', '12-20'], ['face', '2', '12-15'], ['hammer', '2', I], ['ohtri', '2', I]] },
  { id: 'lB', n: 'Lower B', d: 'hamstring / hip hinge', items: [['rdl', '2-3', C], ['legpress', '2', I], ['legcurl', '2', I], ['split', '2', '8-12 each'], ['calf', '2', '12-20'], ['pallof', '2', I]] },
  { id: 'push', n: 'Push', d: 'chest, shoulders, triceps', items: [['chest', '2-3', C], ['shoulder', '2', C], ['incline', '2', C], ['lateral', '2', '12-20'], ['tri', '2', I]] },
  { id: 'pull', n: 'Pull', d: 'lats, back, rear delts, biceps', items: [['lat', '2-3', C], ['row', '2-3', C], ['face', '2', '12-15'], ['curl', '2', I], ['hammer', '2', I]] },
  { id: 'legs', n: 'Legs', d: 'quads, hams, glutes, calves, core', items: [['legpress', '2-3', C], ['legcurl', '2', I], ['rdl', '2', C], ['legext', '2', I], ['calf', '2', '12-20'], ['crunch', '2', I]] }
];
export const REST_GUIDE = { c: '1:30–2:00', i: '1:00–1:30' };

const CLOUD = 'M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z';
const CLOUD_UP = 'M7 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 7a3.5 3.5 0 0 0 1 7z';
// name, meaning, colour, icon, his reply, which pose suits it
export const WEATHERS = [
  ['Clear sun', 'good, light', '#F4C430', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 'Sunglasses on. Soak it up.', 'sunny'],
  ['Golden hour', 'warm, content', '#F2A65A', '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7v3M5 11l2 1.5M19 11l-2 1.5"/>', 'That soft kind of good. I like it here.', 'skate'],
  ['Partly cloudy', 'okay, mixed', '#9FB8E8', '<path d="M8 3v1.5M3.5 7.5H5M4.6 4.6l1 1"/><circle cx="8.5" cy="8.5" r="2.8"/><path d="M9 19h8a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8 13a3 3 0 0 0 1 6z"/>', 'A bit of both. That is allowed.', 'standing'],
  ['Overcast', 'flat, meh', '#A9A398', '<path d="' + CLOUD + '"/>', 'Grey days happen. We can be grey together.', 'standing'],
  ['Fog', 'numb, far away', '#B8B2A6', '<path d="M4 9h16M6 13h12M4 17h16"/>', 'Hard to see far today. Just the next step, then.', 'standing'],
  ['Drizzle', 'low, a bit sad', '#6F96D0', '<path d="' + CLOUD_UP + '"/><path d="M9 18v.5M13 19v.5M16 17v.5"/>', 'Little rain. I brought the umbrella.', 'umbrella'],
  ['Heavy rain', 'really down', '#3F68B0', '<path d="' + CLOUD_UP + '"/><path d="M8 17l-1 4M12 17l-1 4M16 17l-1 4"/>', 'Big rain. You don\'t have to do anything but be here.', 'umbrella'],
  ['Thunderstorm', 'overwhelmed', '#7A55C0', '<path d="' + CLOUD_UP + '"/><path d="M12 15l-2 4h3l-2 4"/>', 'Loud in there. I\'m right next to you.', 'umbrella'],
  ['Windy', 'restless, anxious', '#4FA89A', '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>', 'Everything blowing about. Let\'s hold on to something small.', 'standing'],
  ['Heatwave', 'burnt out', '#E0663A', '<circle cx="12" cy="9" r="3.5"/><path d="M12 2.5v1.5M5.5 9H7M17 9h1.5M7.4 4.4l1 1M16.6 4.4l-1 1M4 17c2-1.5 4 1.5 6 0s4 1.5 6 0 3 .5 4 0M4 21c2-1.5 4 1.5 6 0s4 1.5 6 0 3 .5 4 0"/>', 'Too much pressure. Water and shade first.', 'nightwatch'],
  ['Snow / still', 'quiet, frozen', '#8FA9C7', '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>', 'Very still today. Blankets count as plans.', 'asleep'],
  ['Rainbow', 'relief', '#C77BD6', '<path d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0"/>', 'After all that. Look at you.', 'cheer'],
  ['Clear night', 'calm, peaceful', '#3C4A8A', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3l.6 1.4L19 5l-1.4.6L17 7l-.6-1.4L15 5l1.4-.6z"/>', 'Calm and quiet. Stay a while.', 'nightwatch']
];
export const weatherByName = n => WEATHERS.find(w => w[0] === n);

export const FOOD_TAGS = ['Proper meal', 'Snack', 'Cooked it myself', 'Tried something new', 'Breakfast', 'Fruit', 'Drank water', 'Protein-y'];
export const FEELS = [['rested', 'Rested'], ['okay', 'Okay'], ['groggy', 'Groggy']];
export const NIGHT_THINGS = ['Washed the dishes', 'Laptop work', 'Read', 'Just lay there', 'Had a snack', 'Scrolled for a bit'];
