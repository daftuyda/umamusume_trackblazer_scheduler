import GLPK from 'https://cdn.jsdelivr.net/npm/glpk.js@5.0.0/dist/index.js';

const glpkPromise = GLPK();

let DATA = null;

const RANKS = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HALVES = ['Early', 'Late'];
const YEARS = ['Junior', 'Classic', 'Senior'];
const COUNTRY_WORDS = ['Saudi Arabia', 'Argentina', 'American', 'New Zealand'];
const KANTO_TRACKS = new Set(['Tokyo', 'Nakayama', 'Ooi', 'Oi']);
const WEST_TRACKS = new Set(['Chukyo', 'Chukyu', 'Hanshin', 'Kyoto']);
const TOHOKU_TRACKS = new Set(['Fukushima', 'Niigata']);
const HOKKAIDO_TRACKS = new Set(['Sapporo', 'Hakodate']);
const KOKURA_TRACKS = new Set(['Kokura']);
const BASE_REWARD = {
  G1: { stats: 10, sp: 35 },
  G2: { stats: 8, sp: 25 },
  G3: { stats: 8, sp: 25 }
};
const NO_RACE = '[No race]';
const AUTO = 'Auto';

// Keep solver ordering from G -> S, but the UI can display these reversed.
const PRESETS = {
  'Custom Uma': { Sprint: 'A', Mile: 'A', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G' },
  'King Halo': {Sprint: 'A', Mile: 'B', Medium: 'B', Long: 'C', Turf: 'A', Dirt: 'G'},
  'Nice Nature': {Sprint: 'G', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Matikanefukukitaru': {Sprint: 'F', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'F'},
  'Haru Urara': {Sprint: 'A', Mile: 'B', Medium: 'G', Long: 'G', Turf: 'G', Dirt: 'A'},
  'Sakura Bakushin O': {Sprint: 'A', Mile: 'B', Medium: 'G', Long: 'G', Turf: 'A', Dirt: 'G'},
  'Winning Ticket': {Sprint: 'G', Mile: 'F', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Agnes Tachyon': {Sprint: 'G', Mile: 'D', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Mejiro Ryan': {Sprint: 'E', Mile: 'C', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Super Creek': {Sprint: 'G', Mile: 'G', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Mayano Top Gun': {Sprint: 'D', Mile: 'D', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'E'},
  'Air Groove': {Sprint: 'C', Mile: 'B', Medium: 'A', Long: 'E', Turf: 'A', Dirt: 'G'},
  'El Condor Pasa': {Sprint: 'F', Mile: 'A', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'B'},
  'Grass Wonder': {Sprint: 'G', Mile: 'A', Medium: 'B', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Daiwa Scarlet': {Sprint: 'F', Mile: 'A', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Vodka': {Sprint: 'F', Mile: 'A', Medium: 'A', Long: 'F', Turf: 'A', Dirt: 'G'},
  'Gold Ship': {Sprint: 'G', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Matikanetannhauser': {Sprint: 'G', Mile: 'D', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Rice Shower': {Sprint: 'E', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Symboli Rudolf': {Sprint: 'E', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Mejiro McQueen': {Sprint: 'G', Mile: 'F', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'E'},
  'Taiki Shuttle': {Sprint: 'A', Mile: 'A', Medium: 'E', Long: 'G', Turf: 'A', Dirt: 'B'},
  'Oguri Cap': {Sprint: 'E', Mile: 'A', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'B'},
  'Maruzensky': {Sprint: 'B', Mile: 'A', Medium: 'B', Long: 'C', Turf: 'A', Dirt: 'D'},
  'Tokai Teio': {Sprint: 'F', Mile: 'E', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Silence Suzuka': {Sprint: 'D', Mile: 'A', Medium: 'A', Long: 'E', Turf: 'A', Dirt: 'G'},
  'Special Week': {Sprint: 'F', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'TM Opera O': {Sprint: 'G', Mile: 'E', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'E'},
  'Mihono Bourbon': {Sprint: 'C', Mile: 'B', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Biwa Hayahide': {Sprint: 'F', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'F'},
  'Curren Chan': {Sprint: 'A', Mile: 'D', Medium: 'G', Long: 'G', Turf: 'A', Dirt: 'F'},
  'Narita Taishin': {Sprint: 'F', Mile: 'D', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Smart Falcon': {Sprint: 'B', Mile: 'A', Medium: 'A', Long: 'E', Turf: 'E', Dirt: 'A'},
  'Narita Brian': {Sprint: 'F', Mile: 'B', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Seiun Sky': {Sprint: 'G', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Hishi Amazon': {Sprint: 'D', Mile: 'A', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'E'},
  'Fuji Kiseki': {Sprint: 'B', Mile: 'A', Medium: 'B', Long: 'E', Turf: 'A', Dirt: 'F'},
  'Gold City': {Sprint: 'F', Mile: 'A', Medium: 'B', Long: 'B', Turf: 'A', Dirt: 'D'},
  'Meisho Doto': {Sprint: 'G', Mile: 'F', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'E'},
  'Eishin Flash': {Sprint: 'G', Mile: 'F', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Hishi Akebono': {Sprint: 'A', Mile: 'B', Medium: 'F', Long: 'G', Turf: 'A', Dirt: 'F'},
  'Agnes Digital': {Sprint: 'F', Mile: 'A', Medium: 'A', Long: 'G', Turf: 'A', Dirt: 'A'},
  'Kawakami Princess': {Sprint: 'D', Mile: 'B', Medium: 'A', Long: 'F', Turf: 'A', Dirt: 'G'},
  'Manhatten Cafe': {Sprint: 'G', Mile: 'F', Medium: 'B', Long: 'A', Turf: 'A', Dirt: 'G'},
  'Tosen Jordan': {Sprint: 'G', Mile: 'F', Medium: 'A', Long: 'B', Turf: 'A', Dirt: 'G'},
  'Mejiro Dober': {Sprint: 'E', Mile: 'A', Medium: 'A', Long: 'F', Turf: 'A', Dirt: 'G'},
  'Tamamo Cross': {Sprint: 'G', Mile: 'E', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'F'},
  'Fine Motion': {Sprint: 'F', Mile: 'A', Medium: 'A', Long: 'C', Turf: 'A', Dirt: 'G'},
  'Sakura Chiyono O': {Sprint: 'E', Mile: 'A', Medium: 'A', Long: 'E', Turf: 'A', Dirt: 'G'},
  'Mejiro Ardan': {Sprint: 'E', 'Mile': 'B', Medium: 'A', Long: 'D', Turf: 'A', Dirt: 'F'},
  'Admire Vega': {Sprint: 'F', Mile: 'C', Medium: 'A', Long: 'C', Turf: 'A', Dirt: 'G'},
  'Kitasan Black': {'Sprint': 'E', Mile: 'C', Medium: 'A', Long: 'A', Turf: 'A', Dirt: 'G'},
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function loadData() {
  if (DATA) return DATA;
  const [races, epithets, glpk] = await Promise.all([
    fetch('races.json').then(r => r.json()),
    fetch('epithets.json').then(r => r.json()),
    glpkPromise
  ]);

  const epithetByName = Object.fromEntries(epithets.map(e => [e.name, e]));
  const windows = [];
  for (const year of YEARS) {
    for (const month of MONTHS) {
      for (const half of HALVES) {
        const period = `${half} ${month}`;
        const windowRaces = races
          .filter(r => r.year === year && r.period === period)
          .sort((a, b) => {
            const gradeCmp = String(a.grade).localeCompare(String(b.grade));
            return gradeCmp || String(a.name).localeCompare(String(b.name));
          });
        windows.push({
          index: windows.length,
          year,
          month,
          half,
          period,
          label: `${year} ${period}`,
          races: windowRaces
        });
      }
    }
  }

  DATA = { races, epithets, epithetByName, windows, glpk };
  return DATA;
}

function defaultSettings() {
  return {
    preset: 'Custom Uma',
    aptitudes: clone(PRESETS['Custom Uma']),
    threshold: 'C',
    race_bonus_pct: 50.0,
    stat_weight: 1.0,
    sp_weight: 1.0,
    hint_weight: 8.0,
    epithet_multiplier: 1.0,
    three_race_penalty_weight: 0.0,
    max_consecutive_races: 3
  };
}

function applyPreset(presetName) {
  return clone(PRESETS[presetName] || PRESETS['Custom Uma']);
}

function normalizeSettings(settings = null) {
  const s = defaultSettings();
  if (settings) {
    Object.assign(s, settings);
    if (settings.aptitudes) {
      s.aptitudes = { ...s.aptitudes, ...settings.aptitudes };
    }
  }
  for (const key of ['race_bonus_pct', 'stat_weight', 'sp_weight', 'hint_weight', 'epithet_multiplier', 'three_race_penalty_weight']) {
    s[key] = Number(s[key] ?? 0);
  }
  s.max_consecutive_races = Number(s.max_consecutive_races ?? 0);
  return s;
}

function raceIsEligible(race, settings) {
  const threshold = RANK_VALUE[settings.threshold];
  const apt = settings.aptitudes;
  return RANK_VALUE[apt[race.distance]] >= threshold && RANK_VALUE[apt[race.surface]] >= threshold;
}

function raceReward(race, raceBonusPct) {
  const base = BASE_REWARD[race.grade];
  if (!base) return { stats: 0, sp: 0 };
  const rb = Math.max(0, raceBonusPct) / 100.0;
  return {
    stats: Math.floor(base.stats * (1 + rb)),
    sp: Math.floor(base.sp * (1 + rb))
  };
}

function weightedRaceValue(race, settings) {
  const { stats, sp } = raceReward(race, settings.race_bonus_pct);
  return { stats, sp, value: settings.stat_weight * stats + settings.sp_weight * sp };
}

function epithetStatTotal(epithetName, data) {
  const e = data.epithetByName[epithetName];
  if (!e || e.reward_kind !== 'stat') return 0;
  // Trackblazer stat epithets are listed as "+N to 2 random stats", so total score is doubled.
  return Number(e.amount || 0) * 2;
}

function epithetObjectiveValue(epithetName, settings, data) {
  const e = data.epithetByName[epithetName];
  if (!e) return 0;
  if (e.reward_kind === 'stat') {
    return settings.epithet_multiplier * settings.stat_weight * epithetStatTotal(epithetName, data);
  }
  return settings.epithet_multiplier * settings.hint_weight * Number(e.amount || 0);
}

function hintSkillName(epithetName, data) {
  const rewardText = String(data.epithetByName[epithetName]?.reward_text || '').trim();
  const match = rewardText.match(/^(.*?)\s+hint\b/i);
  return (match ? match[1] : rewardText).trim();
}

function countSelected(selectedRaces, predicate) {
  let count = 0;
  for (const race of selectedRaces) if (predicate(race)) count += 1;
  return count;
}

function selectedCounts(selectedRaces) {
  const byName = new Map();
  const byYearName = new Map();
  const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const r of selectedRaces) {
    inc(byName, r.name);
    inc(byYearName, `${r.year}||${r.name}`);
  }

  return {
    byName,
    byYearName,
    standard: countSelected(selectedRaces, r => r.distance === 'Medium'),
    nonstandard: countSelected(selectedRaces, r => r.distance !== 'Medium'),
    dirt: countSelected(selectedRaces, r => r.surface === 'Dirt'),
    dirt_g1: countSelected(selectedRaces, r => r.surface === 'Dirt' && r.grade === 'G1'),
    op_plus: countSelected(selectedRaces, r => ['G1', 'G2', 'G3', 'OP', 'Pre-OP'].includes(r.grade)),
    junior_stakes: countSelected(selectedRaces, r => String(r.name).includes('Junior Stakes')),
    country: countSelected(selectedRaces, r => COUNTRY_WORDS.some(word => String(r.name).includes(word))),
    umamusume_stakes: countSelected(selectedRaces, r => String(r.name).includes('Umamusume Stakes')),
    turf_sprint: selectedRaces.some(r => r.surface === 'Turf' && r.distance === 'Sprint'),
    turf_mile: selectedRaces.some(r => r.surface === 'Turf' && r.distance === 'Mile'),
    turf_medium: selectedRaces.some(r => r.surface === 'Turf' && r.distance === 'Medium'),
    turf_long: selectedRaces.some(r => r.surface === 'Turf' && r.distance === 'Long'),
    dirt_sprint: selectedRaces.some(r => r.surface === 'Dirt' && r.distance === 'Sprint'),
    dirt_mile: selectedRaces.some(r => r.surface === 'Dirt' && r.distance === 'Mile'),
    dirt_medium: selectedRaces.some(r => r.surface === 'Dirt' && r.distance === 'Medium'),
    kanto: countSelected(selectedRaces, r => ['G1', 'G2', 'G3'].includes(r.grade) && KANTO_TRACKS.has(r.track)),
    west: countSelected(selectedRaces, r => ['G1', 'G2', 'G3'].includes(r.grade) && WEST_TRACKS.has(r.track)),
    tohoku: countSelected(selectedRaces, r => ['G1', 'G2', 'G3'].includes(r.grade) && TOHOKU_TRACKS.has(r.track)),
    hokkaido: countSelected(selectedRaces, r => ['G1', 'G2', 'G3'].includes(r.grade) && HOKKAIDO_TRACKS.has(r.track)),
    kokura: countSelected(selectedRaces, r => ['G1', 'G2', 'G3'].includes(r.grade) && KOKURA_TRACKS.has(r.track))
  };
}

function hasRaceAny(counts, raceName) {
  return (counts.byName.get(raceName) || 0) >= 1;
}

function hasRaceYear(counts, year, raceName) {
  return (counts.byYearName.get(`${year}||${raceName}`) || 0) >= 1;
}

function completedEpithets(selectedRaces, data) {
  const counts = selectedCounts(selectedRaces);
  const done = new Set();

  const stunning = ['Satsuki Sho', 'Japanese Derby (Tokyo Yushun)', 'Kikuka Sho'].every(n => hasRaceYear(counts, 'Classic', n));
  const lady = ['Oka Sho', 'Japanese Oaks', 'Shuka Sho'].every(n => hasRaceYear(counts, 'Classic', n));
  const springChampion = ['Osaka Hai', 'Tenno Sho (Spring)', 'Takarazuka Kinen'].every(n => hasRaceYear(counts, 'Senior', n));
  const fallChampion = ['Tenno Sho (Autumn)', 'Japan Cup', 'Arima Kinen'].every(n => hasRaceYear(counts, 'Senior', n));

  if (stunning) done.add('Stunning');
  if (lady) done.add('Lady');
  if (springChampion) done.add('Spring Champion');
  if (fallChampion) done.add('Fall Champion');
  if (hasRaceYear(counts, 'Senior', 'Tenno Sho (Spring)') && hasRaceYear(counts, 'Senior', 'Tenno Sho (Autumn)')) done.add('Shield Bearer');
  if (stunning && (hasRaceYear(counts, 'Classic', 'Japan Cup') || hasRaceYear(counts, 'Classic', 'Arima Kinen'))) done.add('Incredible');

  const phenomenalCount = ['Tenno Sho (Spring)', 'Takarazuka Kinen', 'Japan Cup', 'Tenno Sho (Autumn)', 'Osaka Hai', 'Arima Kinen']
    .filter(raceName => hasRaceAny(counts, raceName)).length;
  if (stunning && phenomenalCount >= 2) done.add('Phenomenal');

  if (['NHK Mile Cup', 'Yasuda Kinen', 'Mile Championship'].every(raceName => hasRaceAny(counts, raceName))) done.add('Breakneck Miler');
  if (lady && hasRaceYear(counts, 'Classic', 'Queen Elizabeth II Cup')) done.add('Heroine');
  if (
    lady &&
    hasRaceYear(counts, 'Junior', 'Hanshin Juvenile Fillies') &&
    hasRaceYear(counts, 'Senior', 'Victoria Mile') &&
    hasRaceYear(counts, 'Classic', 'Queen Elizabeth II Cup') &&
    hasRaceYear(counts, 'Senior', 'Queen Elizabeth II Cup')
  ) done.add('Goddess');
  if (hasRaceAny(counts, 'Takamatsunomiya Kinen') && hasRaceAny(counts, 'Sprinters Stakes')) done.add('Sprint Go-Getter');
  if (
    hasRaceAny(counts, 'Takamatsunomiya Kinen') &&
    hasRaceAny(counts, 'Sprinters Stakes') &&
    hasRaceAny(counts, 'Yasuda Kinen') &&
    hasRaceAny(counts, 'Mile Championship')
  ) done.add('Sprint Speedster');
  if (
    hasRaceYear(counts, 'Classic', 'Oka Sho') &&
    hasRaceAny(counts, 'NHK Mile Cup') &&
    hasRaceAny(counts, 'Yasuda Kinen') &&
    hasRaceYear(counts, 'Senior', 'Victoria Mile') &&
    hasRaceAny(counts, 'Mile Championship') &&
    (hasRaceYear(counts, 'Junior', 'Hanshin Juvenile Fillies') || hasRaceYear(counts, 'Junior', 'Asahi Hai Futurity Stakes'))
  ) done.add('Mile a Minute');

  if (counts.dirt_g1 >= 3) done.add('Dirt G1 Achiever');
  if (counts.dirt_g1 >= 4) done.add('Dirt G1 Star');
  if (counts.dirt_g1 >= 5) done.add('Dirt G1 Powerhouse');
  if (counts.dirt_g1 >= 9) done.add('Dirt G1 Dominator');
  if (counts.standard >= 10) done.add('Standard Distance Leader');
  if (counts.nonstandard >= 10) done.add('Non-Standard Distance Leader');
  if (counts.dirt >= 5) done.add('Dirty Work');
  if (counts.dirt >= 10) done.add('Playing Dirty');
  if (counts.dirt >= 15) done.add('Eat My Dust');
  if (counts.op_plus >= 10) done.add('Pro Racer');
  if (counts.junior_stakes >= 3) done.add('Junior Jewel');
  if (counts.country >= 3) done.add('Globe-Trotter');
  if (counts.umamusume_stakes >= 3) done.add('Umatastic');
  if (counts.dirt_sprint && counts.dirt_mile && counts.dirt_medium) done.add('Dirt Dancer');
  if (counts.turf_sprint && counts.turf_mile && counts.turf_medium && counts.turf_long) done.add('Turf Tussler');
  if (hasRaceYear(counts, 'Classic', 'JBC Sprint') && hasRaceYear(counts, 'Senior', 'JBC Sprint')) done.add('Dirt Sprinter');
  if (['Unicorn Stakes', 'Leopard Stakes', 'Japan Dirt Derby'].every(raceName => hasRaceYear(counts, 'Classic', raceName))) done.add('Kicking Up Dust');
  if (counts.kanto >= 3) done.add('Kanto Conqueror');
  if (counts.west >= 3) done.add('West Japan Whiz');
  if (counts.tohoku >= 3) done.add('Tohoku Top Dog');
  if (counts.hokkaido >= 3) done.add('Hokkaido Hotshot');
  if (counts.kokura >= 3) done.add('Kokura Constable');
  if (springChampion && fallChampion && (stunning || lady)) done.add('Legendary');

  return data.epithets.filter(e => done.has(e.name)).map(e => e.name);
}

function removeSelectedRaceOnce(selectedRaces, targetIndex) {
  return selectedRaces.filter((_, idx) => idx !== targetIndex);
}

function linkedEpithetsForSelectedRace(selectedRaces, selectedIndex, solvedEpithets, settings, data) {
  const reduced = removeSelectedRaceOnce(selectedRaces, selectedIndex);
  const reducedEpithets = new Set(completedEpithets(reduced, data));
  const linked = solvedEpithets.filter(name => !reducedEpithets.has(name));
  const linkedValue = linked.reduce((sum, name) => sum + epithetObjectiveValue(name, settings, data), 0);
  return { linked, linkedValue: Number(linkedValue.toFixed(2)) };
}

function epithetsWeightedValue(epithets, settings, data) {
  return Number(epithets.reduce((sum, name) => sum + epithetObjectiveValue(name, settings, data), 0).toFixed(2));
}

function buildActions(settings, windows, forcedChoiceNames = {}) {
  return windows.map(window => {
    const forcedName = forcedChoiceNames[window.index];
    const actions = [{ kind: 'none', choice: NO_RACE, race: null, stats: 0, sp: 0, value: 0 }];
    for (const race of window.races) {
      if (!raceIsEligible(race, settings) && forcedName !== race.name) continue;
      const { stats, sp, value } = weightedRaceValue(race, settings);
      actions.push({ kind: 'race', choice: race.name, race, stats, sp, value });
    }
    return actions;
  });
}

function addConstraint(model, glpk, name, coeffs, kind, lb = 0, ub = 0) {
  model.subjectTo.push({
    name,
    vars: coeffs.map(([varName, coef]) => ({ name: varName, coef })),
    bnds: { type: kind, lb, ub }
  });
}

function statusToText(status, glpk) {
  switch (status) {
    case glpk.GLP_OPT: return 'OPTIMAL';
    case glpk.GLP_FEAS: return 'FEASIBLE';
    case glpk.GLP_INFEAS: return 'INFEASIBLE';
    case glpk.GLP_NOFEAS: return 'NO FEASIBLE SOLUTION';
    case glpk.GLP_UNBND: return 'UNBOUNDED';
    case glpk.GLP_UNDEF:
    default:
      return 'UNDEFINED';
  }
}

function varsToCoeffPairs(varsObj) {
  return Object.entries(varsObj).filter(([, coef]) => Math.abs(coef) > 1e-12);
}

function mergeExprs(...exprs) {
  const merged = {};
  for (const expr of exprs) {
    for (const [k, v] of Object.entries(expr || {})) merged[k] = (merged[k] || 0) + v;
  }
  return merged;
}

async function optimizeSchedule(settingsInput = null, fixedChoices = {}) {
  const data = await loadData();
  const { windows, epithets, glpk } = data;
  const settings = normalizeSettings(settingsInput);
  const fixed = Object.fromEntries(Object.entries(fixedChoices || {}).map(([k, v]) => [Number(k), v]));
  const actionsByWindow = buildActions(settings, windows, fixed);

  const xVars = [];
  const actionLookup = new Map();
  for (let i = 0; i < actionsByWindow.length; i += 1) {
    for (let j = 0; j < actionsByWindow[i].length; j += 1) {
      const name = `x_${i}_${j}`;
      xVars.push(name);
      actionLookup.set(name, { window: i, actionIndex: j, ...actionsByWindow[i][j] });
    }
  }

  const yVars = epithets.map(e => `y_${e.name}`);
  const zVars = [];
  for (let start = 0; start < Math.max(0, actionsByWindow.length - 2); start += 1) {
    zVars.push(`z_${start}`);
  }

  const objectiveVars = [];
  for (const name of xVars) {
    objectiveVars.push({ name, coef: actionLookup.get(name).value });
  }
  for (const e of epithets) {
    objectiveVars.push({ name: `y_${e.name}`, coef: epithetObjectiveValue(e.name, settings, data) });
  }
  for (const name of zVars) {
    objectiveVars.push({ name, coef: -settings.three_race_penalty_weight });
  }

  const model = {
    name: 'TrackblazerPlanner',
    objective: {
      direction: glpk.GLP_MAX,
      name: 'score',
      vars: objectiveVars
    },
    subjectTo: [],
    bounds: [],
    binaries: [...xVars, ...yVars, ...zVars]
  };

  const varsForWindow = i => actionsByWindow[i].map((_, j) => `x_${i}_${j}`);
  const raceVarsByWindow = Object.fromEntries(actionsByWindow.map((actions, i) => [
    i,
    actions
      .map((action, j) => ({ action, name: `x_${i}_${j}` }))
      .filter(item => item.action.race !== null)
      .map(item => item.name)
  ]));

  function actionSum(predicate) {
    const coeffs = {};
    for (const [varName, info] of actionLookup.entries()) {
      if (info.race && predicate(info.race)) coeffs[varName] = (coeffs[varName] || 0) + 1;
    }
    return coeffs;
  }

  function exprRaceAny(raceName) {
    return actionSum(r => r.name === raceName);
  }

  function exprRaceYear(year, raceName) {
    return actionSum(r => r.year === year && r.name === raceName);
  }

  function exprEpithet(name) {
    return { [`y_${name}`]: 1 };
  }

  function requireYLeqExpr(yName, exprCoeffs) {
    const coeffs = { ...exprCoeffs, [`y_${yName}`]: (exprCoeffs[`y_${yName}`] || 0) - 1 };
    addConstraint(model, glpk, `req_${yName}_${model.subjectTo.length}`, varsToCoeffPairs(coeffs), glpk.GLP_LO, 0, 0);
  }

  function requireCountThreshold(yName, exprCoeffs, threshold) {
    const coeffs = { ...exprCoeffs, [`y_${yName}`]: (exprCoeffs[`y_${yName}`] || 0) - threshold };
    addConstraint(model, glpk, `cnt_${yName}_${model.subjectTo.length}`, varsToCoeffPairs(coeffs), glpk.GLP_LO, 0, 0);
  }

  // Exactly one action per window.
  for (let i = 0; i < actionsByWindow.length; i += 1) {
    addConstraint(model, glpk, `one_action_${i}`, varsForWindow(i).map(name => [name, 1]), glpk.GLP_FX, 1, 1);
  }

  // Max consecutive races hard cap.
  const maxConsec = Number(settings.max_consecutive_races || 0);
  if (maxConsec > 0) {
    for (let start = 0; start < actionsByWindow.length - maxConsec; start += 1) {
      const coeffs = [];
      for (let i = start; i < start + maxConsec + 1; i += 1) {
        for (const name of raceVarsByWindow[i]) coeffs.push([name, 1]);
      }
      addConstraint(model, glpk, `max_consec_${start}`, coeffs, glpk.GLP_UP, 0, maxConsec);
    }
  }

  // Sliding three-race windows used only for the soft penalty term.
  for (let start = 0; start < zVars.length; start += 1) {
    const zName = `z_${start}`;
    for (let i = start; i < start + 3; i += 1) {
      const coeffs = [[zName, 1], ...raceVarsByWindow[i].map(name => [name, -1])];
      addConstraint(model, glpk, `z_link_${start}_${i}`, coeffs, glpk.GLP_UP, 0, 0);
    }
    const coeffs = [[zName, -1]];
    for (let i = start; i < start + 3; i += 1) {
      for (const name of raceVarsByWindow[i]) coeffs.push([name, 1]);
    }
    addConstraint(model, glpk, `z_full_${start}`, coeffs, glpk.GLP_UP, 0, 2);
  }

  // Fixed manual or historical choices.
  for (const [windowIndexRaw, choiceName] of Object.entries(fixed)) {
    const windowIndex = Number(windowIndexRaw);
    let matched = false;
    for (let j = 0; j < actionsByWindow[windowIndex].length; j += 1) {
      const action = actionsByWindow[windowIndex][j];
      const varName = `x_${windowIndex}_${j}`;
      if (action.choice === choiceName) {
        matched = true;
        model.bounds.push({ name: varName, type: glpk.GLP_FX, lb: 1, ub: 1 });
      } else {
        model.bounds.push({ name: varName, type: glpk.GLP_FX, lb: 0, ub: 0 });
      }
    }
    if (!matched) {
      return {
        status: 'INFEASIBLE',
        message: `Fixed choice '${choiceName}' is not available at ${windows[windowIndex].label} under the current race list.`,
        schedule_rows: [],
        epithets: [],
        settings
      };
    }
  }

  const exprDirtG1 = actionSum(r => r.surface === 'Dirt' && r.grade === 'G1');
  const exprDirt = actionSum(r => r.surface === 'Dirt');
  const exprStandard = actionSum(r => r.distance === 'Medium');
  const exprNonStandard = actionSum(r => r.distance !== 'Medium');
  const exprOpPlus = actionSum(r => ['G1', 'G2', 'G3', 'OP', 'Pre-OP'].includes(r.grade));
  const exprJuniorStakes = actionSum(r => String(r.name).includes('Junior Stakes'));
  const exprCountry = actionSum(r => COUNTRY_WORDS.some(word => String(r.name).includes(word)));
  const exprUmamusume = actionSum(r => String(r.name).includes('Umamusume Stakes'));
  const exprKanto = actionSum(r => ['G1', 'G2', 'G3'].includes(r.grade) && KANTO_TRACKS.has(r.track));
  const exprWest = actionSum(r => ['G1', 'G2', 'G3'].includes(r.grade) && WEST_TRACKS.has(r.track));
  const exprTohoku = actionSum(r => ['G1', 'G2', 'G3'].includes(r.grade) && TOHOKU_TRACKS.has(r.track));
  const exprHokkaido = actionSum(r => ['G1', 'G2', 'G3'].includes(r.grade) && HOKKAIDO_TRACKS.has(r.track));
  const exprKokura = actionSum(r => ['G1', 'G2', 'G3'].includes(r.grade) && KOKURA_TRACKS.has(r.track));

  for (const raceName of ['Satsuki Sho', 'Japanese Derby (Tokyo Yushun)', 'Kikuka Sho']) requireYLeqExpr('Stunning', exprRaceYear('Classic', raceName));
  for (const raceName of ['Oka Sho', 'Japanese Oaks', 'Shuka Sho']) requireYLeqExpr('Lady', exprRaceYear('Classic', raceName));
  for (const raceName of ['Osaka Hai', 'Tenno Sho (Spring)', 'Takarazuka Kinen']) requireYLeqExpr('Spring Champion', exprRaceYear('Senior', raceName));
  for (const raceName of ['Tenno Sho (Autumn)', 'Japan Cup', 'Arima Kinen']) requireYLeqExpr('Fall Champion', exprRaceYear('Senior', raceName));
  requireYLeqExpr('Shield Bearer', exprRaceYear('Senior', 'Tenno Sho (Spring)'));
  requireYLeqExpr('Shield Bearer', exprRaceYear('Senior', 'Tenno Sho (Autumn)'));
  requireYLeqExpr('Incredible', exprEpithet('Stunning'));
  requireYLeqExpr('Incredible', mergeExprs(exprRaceYear('Classic', 'Japan Cup'), exprRaceYear('Classic', 'Arima Kinen')));

  const phenomenalExpr = actionSum(r => ['Tenno Sho (Spring)', 'Takarazuka Kinen', 'Japan Cup', 'Tenno Sho (Autumn)', 'Osaka Hai', 'Arima Kinen'].includes(r.name));
  requireYLeqExpr('Phenomenal', exprEpithet('Stunning'));
  requireCountThreshold('Phenomenal', phenomenalExpr, 2);
  requireYLeqExpr('Heroine', exprEpithet('Lady'));
  requireYLeqExpr('Heroine', exprRaceYear('Classic', 'Queen Elizabeth II Cup'));
  requireYLeqExpr('Goddess', exprEpithet('Lady'));
  for (const expr of [
    exprRaceYear('Junior', 'Hanshin Juvenile Fillies'),
    exprRaceYear('Senior', 'Victoria Mile'),
    exprRaceYear('Classic', 'Queen Elizabeth II Cup'),
    exprRaceYear('Senior', 'Queen Elizabeth II Cup')
  ]) requireYLeqExpr('Goddess', expr);

  requireYLeqExpr('Legendary', exprEpithet('Spring Champion'));
  requireYLeqExpr('Legendary', exprEpithet('Fall Champion'));
  requireYLeqExpr('Legendary', { 'y_Stunning': 1, 'y_Lady': 1 });

  for (const raceName of ['NHK Mile Cup', 'Yasuda Kinen', 'Mile Championship']) requireYLeqExpr('Breakneck Miler', exprRaceAny(raceName));

  const juvenileAlt = { ...exprRaceYear('Junior', 'Hanshin Juvenile Fillies') };
  for (const [k, v] of Object.entries(exprRaceYear('Junior', 'Asahi Hai Futurity Stakes'))) juvenileAlt[k] = (juvenileAlt[k] || 0) + v;
  for (const expr of [
    exprRaceYear('Classic', 'Oka Sho'),
    exprRaceAny('NHK Mile Cup'),
    exprRaceAny('Yasuda Kinen'),
    exprRaceYear('Senior', 'Victoria Mile'),
    exprRaceAny('Mile Championship'),
    juvenileAlt
  ]) requireYLeqExpr('Mile a Minute', expr);

  for (const raceName of ['Takamatsunomiya Kinen', 'Sprinters Stakes']) {
    requireYLeqExpr('Sprint Go-Getter', exprRaceAny(raceName));
    requireYLeqExpr('Sprint Speedster', exprRaceAny(raceName));
  }
  for (const raceName of ['Yasuda Kinen', 'Mile Championship']) requireYLeqExpr('Sprint Speedster', exprRaceAny(raceName));

  for (const raceName of ['Unicorn Stakes', 'Leopard Stakes', 'Japan Dirt Derby']) requireYLeqExpr('Kicking Up Dust', exprRaceYear('Classic', raceName));
  requireYLeqExpr('Dirt Sprinter', exprRaceYear('Classic', 'JBC Sprint'));
  requireYLeqExpr('Dirt Sprinter', exprRaceYear('Senior', 'JBC Sprint'));

  requireCountThreshold('Dirt G1 Achiever', exprDirtG1, 3);
  requireCountThreshold('Dirt G1 Star', exprDirtG1, 4);
  requireCountThreshold('Dirt G1 Powerhouse', exprDirtG1, 5);
  requireCountThreshold('Dirt G1 Dominator', exprDirtG1, 9);
  requireCountThreshold('Standard Distance Leader', exprStandard, 10);
  requireCountThreshold('Non-Standard Distance Leader', exprNonStandard, 10);
  requireCountThreshold('Dirty Work', exprDirt, 5);
  requireCountThreshold('Playing Dirty', exprDirt, 10);
  requireCountThreshold('Eat My Dust', exprDirt, 15);
  requireCountThreshold('Pro Racer', exprOpPlus, 10);
  requireCountThreshold('Junior Jewel', exprJuniorStakes, 3);
  requireCountThreshold('Globe-Trotter', exprCountry, 3);
  requireCountThreshold('Umatastic', exprUmamusume, 3);
  requireCountThreshold('Kanto Conqueror', exprKanto, 3);
  requireCountThreshold('West Japan Whiz', exprWest, 3);
  requireCountThreshold('Tohoku Top Dog', exprTohoku, 3);
  requireCountThreshold('Hokkaido Hotshot', exprHokkaido, 3);
  requireCountThreshold('Kokura Constable', exprKokura, 3);
  requireYLeqExpr('Dirt Dancer', actionSum(r => r.surface === 'Dirt' && r.distance === 'Sprint'));
  requireYLeqExpr('Dirt Dancer', actionSum(r => r.surface === 'Dirt' && r.distance === 'Mile'));
  requireYLeqExpr('Dirt Dancer', actionSum(r => r.surface === 'Dirt' && r.distance === 'Medium'));
  requireYLeqExpr('Turf Tussler', actionSum(r => r.surface === 'Turf' && r.distance === 'Sprint'));
  requireYLeqExpr('Turf Tussler', actionSum(r => r.surface === 'Turf' && r.distance === 'Mile'));
  requireYLeqExpr('Turf Tussler', actionSum(r => r.surface === 'Turf' && r.distance === 'Medium'));
  requireYLeqExpr('Turf Tussler', actionSum(r => r.surface === 'Turf' && r.distance === 'Long'));

  const result = await glpk.solve(model, {
    msglev: glpk.GLP_MSG_OFF,
    presol: true
  });

  const status = statusToText(result.result.status, glpk);
  const solutionVars = result.result.vars || {};

  const chosenActions = [];
  const selectedRaces = [];
  for (let i = 0; i < actionsByWindow.length; i += 1) {
    let chosen = actionsByWindow[i][0];
    for (let j = 0; j < actionsByWindow[i].length; j += 1) {
      const value = solutionVars[`x_${i}_${j}`] || 0;
      if (value > 0.5) {
        chosen = actionsByWindow[i][j];
        break;
      }
    }
    chosenActions.push(chosen);
    if (chosen.race) selectedRaces.push(chosen.race);
  }

  const solvedEpithets = completedEpithets(selectedRaces, data);
  let raceInstanceCounter = 0;
  const raceIndicesByWindow = {};
  chosenActions.forEach((chosen, i) => {
    if (chosen.race) {
      raceIndicesByWindow[i] = raceInstanceCounter;
      raceInstanceCounter += 1;
    } else {
      raceIndicesByWindow[i] = null;
    }
  });

  const scheduleRows = [];
  const runningSelected = [];
  let previousEpithets = [];
  for (let i = 0; i < chosenActions.length; i += 1) {
    const chosen = chosenActions[i];
    const race = chosen.race;
    if (race) runningSelected.push(race);
    const now = completedEpithets(runningSelected, data);
    const newEpithets = now.filter(e => !previousEpithets.includes(e));
    previousEpithets = now;

    let linkedEpithets = [];
    if (race && raceIndicesByWindow[i] !== null) {
      linkedEpithets = linkedEpithetsForSelectedRace(selectedRaces, raceIndicesByWindow[i], solvedEpithets, settings, data).linked;
    }
    const epithetNames = data.epithets
      .map(e => e.name)
      .filter(name => new Set([...linkedEpithets, ...newEpithets]).has(name));
    const epithetValue = epithetsWeightedValue(epithetNames, settings, data);
    const tileValue = Number((chosen.value + epithetValue).toFixed(2));

    scheduleRows.push({
      index: i,
      window: windows[i].label,
      year: windows[i].year,
      month: windows[i].month,
      half: windows[i].half,
      selected: chosen.choice,
      track: race ? race.track : '',
      grade: race ? race.grade : '',
      distance: race ? race.distance : '',
      surface: race ? race.surface : '',
      race_stats: chosen.stats,
      race_sp: chosen.sp,
      race_value: Number(chosen.value.toFixed(2)),
      linked_epithets: linkedEpithets,
      epithet_names: epithetNames,
      epithet_value: epithetValue,
      tile_value: tileValue,
      new_epithets: newEpithets
    });
  }

  const totalRaceStats = chosenActions.reduce((sum, chosen) => sum + chosen.stats, 0);
  const totalRaceSp = chosenActions.reduce((sum, chosen) => sum + chosen.sp, 0);
  const epithetStatPoints = solvedEpithets.reduce((sum, name) => sum + epithetStatTotal(name, data), 0);
  const epithetHintNames = solvedEpithets.filter(name => data.epithetByName[name].reward_kind === 'hint').map(name => hintSkillName(name, data));
  const weightedRaceValueTotal = settings.stat_weight * totalRaceStats + settings.sp_weight * totalRaceSp;
  const weightedEpithetValueTotal = settings.epithet_multiplier * settings.stat_weight * epithetStatPoints + settings.epithet_multiplier * settings.hint_weight * epithetHintNames.length;
  const triplePenaltyCount = zVars.reduce((sum, zName) => sum + ((solutionVars[zName] || 0) > 0.5 ? 1 : 0), 0);
  const triplePenaltyTotal = settings.three_race_penalty_weight * triplePenaltyCount;
  const totalValue = weightedRaceValueTotal + weightedEpithetValueTotal - triplePenaltyTotal;

  return {
    status,
    message: '',
    schedule_rows: scheduleRows,
    epithets: solvedEpithets,
    selected_choices: scheduleRows.map(row => row.selected),
    total_value: Number(totalValue.toFixed(2)),
    weighted_race_value: Number(weightedRaceValueTotal.toFixed(2)),
    weighted_epithet_value: Number(weightedEpithetValueTotal.toFixed(2)),
    triple_penalty_count: triplePenaltyCount,
    triple_penalty_total: Number(triplePenaltyTotal.toFixed(2)),
    total_race_stats: totalRaceStats,
    total_race_sp: totalRaceSp,
    epithet_stat_points: epithetStatPoints,
    epithet_hint_count: epithetHintNames.length,
    epithet_hint_names: epithetHintNames,
    settings,
    proven_optimal: status === 'OPTIMAL',
    solver_message: ''
  };
}

export async function solveWithManualLocks(settingsInput, currentSelected = [], manualLocks = {}, freezeBeforeIndex = null) {
  const settings = normalizeSettings(settingsInput);
  const locks = Object.fromEntries(
    Object.entries(manualLocks || {})
      .filter(([, v]) => ![null, '', AUTO].includes(v))
      .map(([k, v]) => [Number(k), v])
  );
  let fixed = {};
  if (freezeBeforeIndex == null && Object.keys(locks).length && currentSelected.length) {
    freezeBeforeIndex = Math.max(...Object.keys(locks).map(Number));
  }
  if (freezeBeforeIndex != null && currentSelected.length) {
    const cutoff = Math.max(0, Number(freezeBeforeIndex));
    for (let idx = 0; idx < cutoff; idx += 1) {
      if (idx < currentSelected.length) fixed[idx] = currentSelected[idx];
    }
  }
  fixed = { ...fixed, ...locks };
  const result = await optimizeSchedule(settings, fixed);
  return formatPayload(result, manualLocks, result.selected_choices || []);
}

function allDropdownChoices(windows) {
  const choiceMap = {};
  for (const w of windows) {
    choiceMap[w.index] = [AUTO, NO_RACE, ...w.races.map(r => r.name)];
  }
  return choiceMap;
}

function formatPayload(result, manualLocks = {}, currentSelected = []) {
  const data = DATA;
  const locks = Object.fromEntries(Object.entries(manualLocks || {}).map(([k, v]) => [String(k), v]));
  const selectedChoices = currentSelected || result.selected_choices || [];
  const acquired = (result.epithets || []).map(name => {
    const e = data.epithetByName[name];
    return {
      name,
      reward_text: e.reward_text,
      condition_text: e.condition_text,
      reward_kind: e.reward_kind,
      amount: e.amount,
      weighted_value: Number(epithetObjectiveValue(name, result.settings, data).toFixed(2))
    };
  });

  const choicesByWindow = allDropdownChoices(data.windows);
  const windowsPayload = (result.schedule_rows || []).map(row => ({
    ...row,
    lock_value: locks[String(row.index)] || AUTO,
    choices: choicesByWindow[row.index]
  }));

  return {
    settings: result.settings,
    summary: {
      status: result.status || 'UNKNOWN',
      proven_optimal: Boolean(result.proven_optimal),
      message: result.message || '',
      total_value: result.total_value || 0,
      weighted_race_value: result.weighted_race_value || 0,
      weighted_epithet_value: result.weighted_epithet_value || 0,
      triple_penalty_count: result.triple_penalty_count || 0,
      triple_penalty_total: result.triple_penalty_total || 0,
      race_stats: result.total_race_stats || 0,
      race_skill_points: result.total_race_sp || 0,
      epithet_stat_points: result.epithet_stat_points || 0,
      epithet_hint_count: result.epithet_hint_count || 0,
      epithet_hint_names: result.epithet_hint_names || [],
      scheduled_races: (result.selected_choices || []).filter(s => s !== NO_RACE).length,
      completed_epithets: (result.epithets || []).length
    },
    windows: windowsPayload,
    epithets: acquired,
    manual_locks: locks,
    current_selected: selectedChoices,
    presets: PRESETS,
    ranks: RANKS,
    years: YEARS,
    months: MONTHS,
    halves: HALVES
  };
}

export async function initialPayload() {
  await loadData();
  const result = await optimizeSchedule(defaultSettings(), {});
  return formatPayload(result, {}, result.selected_choices || []);
}

export { NO_RACE, AUTO, applyPreset };
