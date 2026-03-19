import { initialPayload, solveWithManualLocks, applyPreset } from './solver-browser.js';

let state = {
  settings: null,
  summary: null,
  windows: [],
  epithets: [],
  manual_locks: {},
  current_selected: [],
  freeze_before_index: null,
  ranks: [],
  presets: {},
  months: [],
  years: [],
  halves: []
};

let autoSolveTimer = null;
let solveSequence = 0;

const ids = {
  preset: document.getElementById('preset'),
  sprint: document.getElementById('sprint'),
  mile: document.getElementById('mile'),
  medium: document.getElementById('medium'),
  long: document.getElementById('long'),
  turf: document.getElementById('turf'),
  dirt: document.getElementById('dirt'),
  threshold: document.getElementById('threshold'),
  maxConsec: document.getElementById('maxConsec'),
  raceBonus: document.getElementById('raceBonus'),
  statWeight: document.getElementById('statWeight'),
  spWeight: document.getElementById('spWeight'),
  hintWeight: document.getElementById('hintWeight'),
  epithetMultiplier: document.getElementById('epithetMultiplier'),
  threeRacePenalty: document.getElementById('threeRacePenalty'),
  rebuildBtn: document.getElementById('rebuildBtn'),
  clearLocksBtn: document.getElementById('clearLocksBtn'),
  metricEpithets: document.getElementById('metricEpithets'),
  metricEpithetsSub: document.getElementById('metricEpithetsSub'),
  metricValue: document.getElementById('metricValue'),
  metricValueSub: document.getElementById('metricValueSub'),
  metricRaces: document.getElementById('metricRaces'),
  metricRacesSub: document.getElementById('metricRacesSub'),
  metricBreakdown: document.getElementById('metricBreakdown'),
  metricBreakdownSub: document.getElementById('metricBreakdownSub'),
  statusPill: document.getElementById('statusPill'),
  statusText: document.getElementById('statusText'),
  statusNote: document.getElementById('statusNote'),
  summaryLine: document.getElementById('summaryLine'),
  scheduleYears: document.getElementById('scheduleYears'),
  epithetList: document.getElementById('epithetList')
};

function fillSelect(el, values, selected) {
  el.innerHTML = '';
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = String(v);
    if (String(v) === String(selected)) opt.selected = true;
    el.appendChild(opt);
  });
}

function populateStaticControls(payload) {
  state.ranks = payload.ranks;
  state.presets = payload.presets;
  state.months = payload.months;
  state.years = payload.years;
  state.halves = payload.halves;
  fillSelect(ids.preset, Object.keys(payload.presets), payload.settings?.preset || 'Custom Uma');
  const displayRanks = [...payload.ranks].reverse();
  [ids.sprint, ids.mile, ids.medium, ids.long, ids.turf, ids.dirt, ids.threshold].forEach(el => fillSelect(el, displayRanks, 'A'));
}

function settingsFromUI() {
  return {
    preset: ids.preset.value,
    aptitudes: {
      Sprint: ids.sprint.value,
      Mile: ids.mile.value,
      Medium: ids.medium.value,
      Long: ids.long.value,
      Turf: ids.turf.value,
      Dirt: ids.dirt.value
    },
    threshold: ids.threshold.value,
    max_consecutive_races: Number(ids.maxConsec.value || 0),
    race_bonus_pct: Number(ids.raceBonus.value || 0),
    stat_weight: Number(ids.statWeight.value || 0),
    sp_weight: Number(ids.spWeight.value || 0),
    hint_weight: Number(ids.hintWeight.value || 0),
    epithet_multiplier: Number(ids.epithetMultiplier.value || 0),
    three_race_penalty_weight: Number(ids.threeRacePenalty.value || 0)
  };
}

function loadSettingsToUI(settings) {
  ids.preset.value = settings.preset || 'Custom Uma';
  ids.sprint.value = settings.aptitudes.Sprint;
  ids.mile.value = settings.aptitudes.Mile;
  ids.medium.value = settings.aptitudes.Medium;
  ids.long.value = settings.aptitudes.Long;
  ids.turf.value = settings.aptitudes.Turf;
  ids.dirt.value = settings.aptitudes.Dirt;
  ids.threshold.value = settings.threshold;
  ids.maxConsec.value = settings.max_consecutive_races;
  ids.raceBonus.value = settings.race_bonus_pct;
  ids.statWeight.value = settings.stat_weight;
  ids.spWeight.value = settings.sp_weight;
  ids.hintWeight.value = settings.hint_weight;
  ids.epithetMultiplier.value = settings.epithet_multiplier;
  ids.threeRacePenalty.value = settings.three_race_penalty_weight;
}

function currentFreezeLabel() {
  if (state.freeze_before_index == null) return 'No earlier turns are frozen right now.';
  const cutoff = Number(state.freeze_before_index);
  const window = state.windows.find(w => Number(w.index) === cutoff);
  if (!window) return `${Math.max(0, cutoff)} earlier turns are fixed; the planner re-solves from the changed turn onward.`;
  return `Turns before ${window.year} ${window.half} ${window.month} are fixed; the planner re-solves from that turn onward.`;
}

function formatMeta(w) {
  if (w.selected === '[No race]') return '';
  return `${w.surface} · ${w.distance}${w.grade ? ' · ' + w.grade : ''}${w.track ? ' · ' + w.track : ''}`;
}

function formatSubMeta(w) {
  if (w.selected === '[No race]') return '';
  const epithetValue = Number(w.epithet_value || 0);
  return `Race ${w.race_value} + Epithet ${epithetValue} = ${w.tile_value}`;
}

function monthHalfLabel(w) {
  return `${w.month} · ${w.half}`;
}

function yearClass(year) {
  return year.toLowerCase();
}

function sortYearWindows(year) {
  const monthOrder = new Map(state.months.map((m, i) => [m, i]));
  const halfOrder = new Map(state.halves.map((h, i) => [h, i]));
  return state.windows
    .filter(w => w.year === year)
    .sort((a, b) => (monthOrder.get(a.month) - monthOrder.get(b.month)) || (halfOrder.get(a.half) - halfOrder.get(b.half)));
}

function linkedOnlyEpithets(w) {
  const completed = new Set(w.new_epithets || []);
  return (w.epithet_names || []).filter(name => !completed.has(name));
}

function renderTurnCard(w) {
  const card = document.createElement('div');
  card.className = `turn-card ${yearClass(w.year)} ${w.lock_value && w.lock_value !== 'Auto' ? 'locked' : 'auto'} ${w.selected === '[No race]' ? 'empty-turn' : ''}`;

  const top = document.createElement('div');
  top.className = 'turn-top';
  top.innerHTML = `<div class="turn-slot">${monthHalfLabel(w)}</div><div class="badge ${w.lock_value && w.lock_value !== 'Auto' ? 'locked' : ''}">${w.lock_value && w.lock_value !== 'Auto' ? 'Locked' : 'Auto'}</div>`;
  card.appendChild(top);

  const name = document.createElement('div');
  name.className = 'turn-name' + (w.selected === '[No race]' ? ' no-race' : '');
  name.textContent = w.selected === '[No race]' ? 'No race' : w.selected;
  card.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'turn-meta';
  meta.textContent = formatMeta(w);
  card.appendChild(meta);

  const submeta = document.createElement('div');
  submeta.className = 'turn-submeta';
  submeta.textContent = formatSubMeta(w);
  card.appendChild(submeta);

  if (w.selected !== '[No race]') {
    const scoreRow = document.createElement('div');
    scoreRow.className = 'turn-score-row';
    scoreRow.innerHTML = `<div class="score-pill total">Tile ${w.tile_value}</div>`;
    card.appendChild(scoreRow);
  }

  const noteWrap = document.createElement('div');
  noteWrap.className = 'turn-notes';
  const noteLines = [];
  const linkedOnly = linkedOnlyEpithets(w);
  if (linkedOnly.length) noteLines.push(`<div><span class="note-label">Linked Epithets</span>: ${linkedOnly.join(', ')}</div>`);
  if ((w.new_epithets || []).length) noteLines.push(`<div><span class="note-label">Completed Epithets</span>: ${w.new_epithets.join(', ')}</div>`);
  noteWrap.innerHTML = noteLines.join('');
  card.appendChild(noteWrap);

  const select = document.createElement('select');
  w.choices.forEach(choice => {
    const opt = document.createElement('option');
    opt.value = choice;
    opt.textContent = choice === '[No race]' ? 'No race' : choice;
    if (choice === w.lock_value) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    if (select.value === 'Auto') {
      delete state.manual_locks[String(w.index)];
      const remainingLocks = Object.keys(state.manual_locks).map(Number);
      state.freeze_before_index = remainingLocks.length ? Math.max(...remainingLocks) : null;
    } else {
      state.manual_locks[String(w.index)] = select.value;
      state.freeze_before_index = Number(w.index);
    }
    queueSolve(0);
  });
  card.appendChild(select);
  return card;
}

function renderSchedule() {
  ids.scheduleYears.innerHTML = '';
  state.years.forEach(year => {
    const section = document.createElement('section');
    section.className = `year-section ${yearClass(year)}`;

    const header = document.createElement('div');
    header.className = `year-header ${yearClass(year)}`;
    header.innerHTML = `<h3>${year}</h3><div class="year-helper">4 columns × 6 rows · 2 months per row</div>`;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'year-grid';
    sortYearWindows(year).forEach(w => grid.appendChild(renderTurnCard(w)));
    section.appendChild(grid);
    ids.scheduleYears.appendChild(section);
  });
}

function renderEpithets() {
  ids.epithetList.innerHTML = '';
  if (!state.epithets.length) {
    ids.epithetList.innerHTML = '<div class="empty">No supported Trackblazer epithets are completed under the current schedule.</div>';
    return;
  }
  state.epithets.forEach(ep => {
    const card = document.createElement('div');
    card.className = 'epithet-card';
    card.innerHTML = `
      <h4>${ep.name}</h4>
      <div class="reward">${ep.reward_text}</div>
      <div class="condition">${ep.condition_text}</div>
      <div class="value">Weighted value: ${ep.weighted_value}</div>
    `;
    ids.epithetList.appendChild(card);
  });
}

function renderSummary() {
  const s = state.summary;
  ids.metricEpithets.textContent = s.completed_epithets;
  ids.metricEpithetsSub.textContent = 'earned under the current schedule';

  const totalStatPoints = (s.race_stats || 0) + (s.epithet_stat_points || 0);
  ids.metricValue.className = 'v dual';
  ids.metricValue.textContent = `${s.total_value} / ${totalStatPoints}`;
  const penaltyText = s.triple_penalty_total ? ` - 3-race penalty ${s.triple_penalty_total}` : '';
  ids.metricValueSub.textContent = `total score / total stat points · Race ${s.weighted_race_value} + Epithet ${s.weighted_epithet_value}${penaltyText}`;

  ids.metricRaces.textContent = s.scheduled_races;
  ids.metricRacesSub.textContent = `auto-planner uses ${state.settings.threshold} or better as the aptitude floor`;

  const hintNames = s.epithet_hint_names || [];
  const hintDisplay = hintNames.length ? hintNames.join(', ') : 'none';
  ids.metricBreakdown.innerHTML = `${s.race_stats} / ${s.race_skill_points} / ${s.epithet_stat_points} / <span class="metric-hints">${hintDisplay}</span>`;
  ids.metricBreakdownSub.textContent = 'race stats / race skill points / epithet stats / skill hints';

  ids.statusText.textContent = s.status;
  ids.statusPill.className = 'status-pill ' + (s.status === 'OPTIMAL' ? 'ok' : (s.status.includes('INFEAS') ? 'bad' : 'warn'));
  let note = s.proven_optimal
    ? 'This schedule is solver-proven optimal for the current race set, settings, and locks.'
    : 'This result is not currently proven optimal. Check the solver status before trusting it as the true best schedule.';
  if (s.message) note += ' ' + s.message;
  ids.statusNote.textContent = note;

  ids.summaryLine.textContent = `${currentFreezeLabel()} Inputs auto-update the route as soon as you change them.`;
}

function applyPayload(payload) {
  state.settings = payload.settings;
  state.summary = payload.summary;
  state.windows = payload.windows;
  state.epithets = payload.epithets;
  state.manual_locks = payload.manual_locks || {};
  state.current_selected = payload.current_selected || [];
  loadSettingsToUI(payload.settings);
  renderSummary();
  renderSchedule();
  renderEpithets();
}

function queueSolve(delay = 250) {
  clearTimeout(autoSolveTimer);
  autoSolveTimer = setTimeout(() => {
    postSolve();
  }, delay);
}

async function postSolve() {
  const seq = ++solveSequence;
  ids.statusText.textContent = 'UPDATING';
  ids.statusPill.className = 'status-pill warn';
  ids.statusNote.textContent = 'Recomputing the best schedule for the current inputs…';
  try {
    const payload = await solveWithManualLocks(
      settingsFromUI(),
      state.current_selected,
      state.manual_locks,
      state.freeze_before_index
    );
    if (seq !== solveSequence) return;
    applyPayload(payload);
  } catch (err) {
    if (seq !== solveSequence) return;
    console.error(err);
    ids.statusText.textContent = 'ERROR';
    ids.statusPill.className = 'status-pill bad';
    ids.statusNote.textContent = `The in-browser solver failed to run. ${err?.message || err}`;
  }
}

function bindAutoSolveListeners() {
  ids.preset.addEventListener('change', () => {
    const presetAptitudes = applyPreset(ids.preset.value);
    ids.sprint.value = presetAptitudes.Sprint;
    ids.mile.value = presetAptitudes.Mile;
    ids.medium.value = presetAptitudes.Medium;
    ids.long.value = presetAptitudes.Long;
    ids.turf.value = presetAptitudes.Turf;
    ids.dirt.value = presetAptitudes.Dirt;
    queueSolve(0);
  });

  [ids.sprint, ids.mile, ids.medium, ids.long, ids.turf, ids.dirt, ids.threshold, ids.maxConsec].forEach(el => {
    el.addEventListener('change', () => queueSolve(0));
  });

  [ids.raceBonus, ids.statWeight, ids.spWeight, ids.hintWeight, ids.epithetMultiplier, ids.threeRacePenalty].forEach(el => {
    el.addEventListener('input', () => queueSolve(250));
    el.addEventListener('change', () => queueSolve(0));
  });

  ids.rebuildBtn.addEventListener('click', () => queueSolve(0));
  ids.clearLocksBtn.addEventListener('click', () => {
    state.manual_locks = {};
    state.freeze_before_index = null;
    queueSolve(0);
  });
}

async function init() {
  const payload = await initialPayload();
  populateStaticControls(payload);
  applyPayload(payload);
  bindAutoSolveListeners();
}

init().catch(err => {
  console.error(err);
  ids.statusText.textContent = 'ERROR';
  ids.statusPill.className = 'status-pill bad';
  ids.statusNote.textContent = `Failed to initialize the browser app. ${err?.message || err}`;
});
