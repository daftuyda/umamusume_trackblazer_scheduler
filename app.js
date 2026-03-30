import { initialPayload, solveWithManualLocks, applyPreset, DEFAULT_SUMMER_BLOCKS, epithetRacePredicates, getAllEpithetNames } from './solver-browser.js';

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
  halves: [],
  forced_epithets: [],
  all_epithet_defs: []
};

let autoSolveTimer = null;
let solveSequence = 0;

const ids = {
  preset: document.getElementById('preset'),  // hidden input for value
  presetInput: document.getElementById('presetInput'),
  presetDropdown: document.getElementById('presetDropdown'),
  presetCombo: document.getElementById('presetCombo'),
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
  raceCost: document.getElementById('raceCost'),
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

const tooltip = document.getElementById('raceTooltip');
const settingsDrawer = document.getElementById('settingsDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const settingsToggle = document.getElementById('settingsToggle');
const drawerClose = document.getElementById('drawerClose');
const solverToggle = document.getElementById('solverToggle');
let activeTooltipCard = null;
let tooltipPinned = false;
let solverEnabled = true;

/* ───── DARK MODE ───── */
const themeToggle = document.getElementById('themeToggle');
const SUN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const MOON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeToggle.innerHTML = dark ? SUN_ICON : MOON_ICON;
  localStorage.setItem('uma-theme', dark ? 'dark' : 'light');
}
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});
// Restore saved theme, fallback to system preference
const savedTheme = localStorage.getItem('uma-theme');
if (savedTheme) setTheme(savedTheme === 'dark');
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(true);

/* ───── SETTINGS DRAWER ───── */
function openDrawer() {
  settingsDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
}
function closeDrawer() {
  settingsDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
}
settingsToggle.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (shareModal.classList.contains('open')) closeShareModal();
    else if (settingsDrawer.classList.contains('open')) closeDrawer();
    else hideTooltip();
  }
});

/* ───── SHARE ───── */
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const shareBackdrop = document.getElementById('shareBackdrop');
const shareClose = document.getElementById('shareClose');
const shareLink = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const importInput = document.getElementById('importInput');
const importBtn = document.getElementById('importBtn');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

function encodeShareState() {
  const s = settingsFromUI();
  // Only include forced_epithets if non-empty to keep share codes compact
  if (!s.forced_epithets || !s.forced_epithets.length) delete s.forced_epithets;
  const data = {
    s,
    l: state.manual_locks,
    f: state.freeze_before_index
  };
  return btoa(JSON.stringify(data));
}

function decodeShareState(code) {
  // Strip URL parts if a full link was pasted
  const hashIdx = code.indexOf('#');
  if (hashIdx !== -1) code = code.substring(hashIdx + 1);
  code = code.trim();
  return JSON.parse(atob(code));
}

function openShareModal() {
  const code = encodeShareState();
  const url = window.location.origin + window.location.pathname + '#' + code;
  shareLink.value = url;
  importInput.value = '';
  shareModal.classList.add('open');
  shareBackdrop.classList.add('open');
}

function closeShareModal() {
  shareModal.classList.remove('open');
  shareBackdrop.classList.remove('open');
}

shareBtn.addEventListener('click', openShareModal);
shareClose.addEventListener('click', closeShareModal);
shareBackdrop.addEventListener('click', closeShareModal);

copyLinkBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    showToast('Link copied to clipboard!');
  }).catch(() => {
    shareLink.select();
    document.execCommand('copy');
    showToast('Link copied!');
  });
});

importBtn.addEventListener('click', () => {
  const raw = importInput.value.trim();
  if (!raw) return;
  try {
    const data = decodeShareState(raw);
    state.manual_locks = data.l || {};
    state.freeze_before_index = data.f ?? null;
    if (data.s) loadSettingsToUI(data.s);
    closeShareModal();
    showToast('Schedule imported!');
    queueSolve(0);
  } catch (e) {
    showToast('Invalid share link or code');
  }
});

/* ───── TOOLTIP LOGIC ───── */
function showTooltip(card, w) {
  if (activeTooltipCard === card) return;
  // Always fully dismiss old tooltip (handles stale refs from re-renders)
  tooltip.classList.remove('visible');
  activeTooltipCard = card;

  const isNoRace = w.selected === '[No race]';
  const linkedOnly = linkedOnlyEpithets(w);
  const newEpithets = w.new_epithets || [];

  let html = '';

  if (isNoRace) {
    html = `
      <div class="race-tooltip-header">
        <span class="tt-name">${monthHalfLabel(w)}</span>
        <span class="tt-badge">${w.lock_value && w.lock_value !== 'Auto' ? 'Locked' : 'Auto'}</span>
      </div>
      <div class="race-tooltip-body">
        <div class="tt-no-race">No race scheduled</div>
        <div class="tt-divider"></div>
        <div class="tt-select-wrap" id="ttSelectWrap"></div>
      </div>`;
  } else {
    html = `
      <div class="race-tooltip-header">
        <span class="tt-name">${w.selected}</span>
        <span class="tt-badge tt-grade-${gradeClass(w.grade)}">${w.grade || ''}</span>
      </div>
      <div class="race-tooltip-body">
        <div class="tt-meta-row">
          ${w.track ? `<span class="tt-meta-tag">${w.track}</span>` : ''}
          ${w.surface ? `<span class="tt-meta-tag">${w.surface}</span>` : ''}
          ${w.distance ? `<span class="tt-meta-tag">${w.distance}</span>` : ''}
        </div>
        <div class="tt-values">
          <div class="tt-val-box">
            <div class="tt-val-label">Stats</div>
            <div class="tt-val-num">+${w.race_stats || 0}</div>
          </div>
          <div class="tt-val-box">
            <div class="tt-val-label">Skill Pts</div>
            <div class="tt-val-num">+${w.race_sp || 0}</div>
          </div>
          <div class="tt-val-box tile-box">
            <div class="tt-val-label">Score</div>
            <div class="tt-val-num">${w.tile_value || 0}</div>
          </div>
        </div>
        ${(() => {
          const raceStats = w.race_stats || 0;
          const epithetStats = newEpithets.reduce((sum, name) => {
            const ep = state.epithets.find(e => e.name === name);
            return sum + (ep && ep.reward_kind === 'stat' ? (ep.amount || 0) : 0);
          }, 0);
          const shopCoins = 100;
          const shopStats = Math.floor(shopCoins / 30) * 15;
          const shopRemainder = shopCoins - Math.floor(shopCoins / 30) * 30;
          const shopExtra = Math.floor(shopRemainder / 15) * 7;
          const totalStats = raceStats + epithetStats + shopStats + shopExtra;
          return `
          <div class="tt-section-label">Stat Breakdown</div>
          <div class="tt-breakdown">
            <div class="tt-bk-row"><span class="tt-bk-label">Race</span><span class="tt-bk-val">+${raceStats}</span></div>
            <div class="tt-bk-row"><span class="tt-bk-label">Epithets</span><span class="tt-bk-val">${epithetStats ? '+' + epithetStats : '—'}</span></div>
            <div class="tt-bk-row"><span class="tt-bk-label">Shop <span class="tt-bk-hint">${shopCoins} coins</span></span><span class="tt-bk-val">+${shopStats + shopExtra}</span></div>
            <div class="tt-bk-row tt-bk-total"><span class="tt-bk-label">Total</span><span class="tt-bk-val">+${totalStats}</span></div>
          </div>`;
        })()}
        ${linkedOnly.length ? `
          <div class="tt-section-label">Contributes to Epithets</div>
          <div class="tt-epithet-list">
            ${linkedOnly.map(name => {
              const ep = state.epithets.find(e => e.name === name);
              const reward = ep ? ep.reward_text : '';
              const c = getEpithetColor(name);
              return `<div class="tt-epithet-item"><span class="tt-edot" style="background:${c}"></span><span>${name}</span><span class="tt-stat-bonus">${reward}</span></div>`;
            }).join('')}
          </div>` : ''}
        ${newEpithets.length ? `
          <div class="tt-section-label">Completes Epithets</div>
          <div class="tt-epithet-list">
            ${newEpithets.map(name => {
              const ep = state.epithets.find(e => e.name === name);
              const reward = ep ? ep.reward_text : '';
              const c = getEpithetColor(name);
              return `<div class="tt-epithet-item"><span class="tt-edot" style="background:${c};box-shadow:0 0 3px ${c}"></span><span>${name}</span><span class="tt-stat-bonus">${reward}</span></div>`;
            }).join('')}
          </div>` : ''}
        <div class="tt-divider"></div>
        <div class="tt-select-wrap" id="ttSelectWrap"></div>
      </div>`;
  }

  tooltip.innerHTML = html;

  const selectWrap = tooltip.querySelector('#ttSelectWrap');
  if (selectWrap) {
    // Build epithet predicates for showing contribution dots on choices
    const completedNames = state.epithets.map(e => e.name);
    const preds = epithetRacePredicates(completedNames);

    // Rich race picker list
    const raceList = document.createElement('div');
    raceList.className = 'tt-race-list';

    // Auto option
    const autoItem = document.createElement('div');
    autoItem.className = `tt-race-item ${w.lock_value === 'Auto' || !w.lock_value ? 'selected' : ''}`;
    autoItem.innerHTML = `<span class="tt-ri-name">Auto (solver picks)</span>`;
    autoItem.addEventListener('click', () => pickRace('Auto', w));
    raceList.appendChild(autoItem);

    // No race option
    const noRaceItem = document.createElement('div');
    noRaceItem.className = `tt-race-item tt-ri-skip ${w.lock_value === '[No race]' ? 'selected' : ''}`;
    noRaceItem.innerHTML = `<span class="tt-ri-name">No Race — Train</span>`;
    noRaceItem.addEventListener('click', () => pickRace('[No race]', w));
    raceList.appendChild(noRaceItem);

    // Race choices with full info
    const raceChoices = w.race_choices || [];
    for (const rc of raceChoices) {
      const isCurrent = rc.name === w.selected;
      const isLocked = rc.name === w.lock_value;
      const item = document.createElement('div');
      item.className = `tt-race-item ${isLocked ? 'selected' : ''} ${isCurrent && !isLocked ? 'current' : ''}`;

      // Find which epithets this race contributes to
      const epDots = [];
      for (const [epName, pred] of Object.entries(preds)) {
        if (pred({ name: rc.name, year: w.year, grade: rc.grade, distance: rc.distance, surface: rc.surface, track: rc.track })) {
          epDots.push(epName);
        }
      }

      const dotsHtml = epDots.length
        ? `<span class="tt-ri-dots">${epDots.map(n => `<span class="edot" style="background:${getEpithetColor(n)}" title="${n}"></span>`).join('')}</span>`
        : '';

      item.innerHTML = `
        <span class="grade-badge ${gradeClass(rc.grade)}" style="font-size:9px">${rc.grade}</span>
        <span class="tt-ri-name">${rc.name}</span>
        <span class="tt-ri-meta">${rc.surface} ${rc.distance}</span>
        <span class="tt-ri-stats">+${rc.stats} / +${rc.sp}</span>
        ${dotsHtml}
      `;
      item.addEventListener('click', () => pickRace(rc.name, w));
      raceList.appendChild(item);
    }

    selectWrap.appendChild(raceList);

    // Skip / Confirm buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'tt-btn-row';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'tt-btn tt-btn-skip';
    skipBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg> Skip — Train`;
    skipBtn.addEventListener('click', () => {
      lockUpTo(w.index);
      state.manual_locks[String(w.index)] = '[No race]';
      state.freeze_before_index = w.index;
      hideTooltip();
      queueSolve(0);
    });
    btnRow.appendChild(skipBtn);

    if (!isNoRace) {
      const lostBtn = document.createElement('button');
      lostBtn.className = 'tt-btn tt-btn-lost';
      lostBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M9 5l3-3 3 3"/><circle cx="12" cy="19" r="3"/></svg> Lost — Retry`;
      lostBtn.title = 'Didn\'t get 1st? Lock this turn as training so the solver replans the race for a later turn.';
      lostBtn.addEventListener('click', () => {
        lockUpTo(w.index);
        state.manual_locks[String(w.index)] = '[No race]';
        state.freeze_before_index = w.index;
        hideTooltip();
        queueSolve(0);
      });
      btnRow.appendChild(lostBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'tt-btn tt-btn-confirm';
      confirmBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Confirm Race`;
      confirmBtn.addEventListener('click', () => {
        lockUpTo(w.index);
        state.freeze_before_index = w.index;
        hideTooltip();
        queueSolve(0);
      });
      btnRow.appendChild(confirmBtn);
    }

    selectWrap.appendChild(btnRow);
  }

  // Position: render off-screen first to measure actual size
  tooltip.style.left = '-9999px';
  tooltip.style.top = '0';
  tooltip.classList.add('visible');

  const rect = card.getBoundingClientRect();
  const ttRect = tooltip.getBoundingClientRect();
  const ttW = ttRect.width;
  const ttH = ttRect.height;
  const pad = 10;

  let left = rect.right + 8;
  let top = rect.top;

  // Flip left if overflows right
  if (left + ttW > window.innerWidth - pad) left = rect.left - ttW - 8;
  // Center below if still off-screen
  if (left < pad) { left = Math.max(pad, rect.left + rect.width / 2 - ttW / 2); top = rect.bottom + 8; }
  // Clamp to viewport bottom
  if (top + ttH > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - ttH - pad);
  // Clamp to viewport top
  if (top < pad) top = pad;

  // If tooltip is taller than viewport, cap its height and enable scroll
  if (ttH > window.innerHeight - pad * 2) {
    tooltip.style.maxHeight = (window.innerHeight - pad * 2) + 'px';
    tooltip.style.overflowY = 'auto';
    top = pad;
  } else {
    tooltip.style.maxHeight = '';
    tooltip.style.overflowY = '';
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
  tooltip.innerHTML = '';
  activeTooltipCard = null;
  tooltipPinned = false;
}

function pickRace(choice, w) {
  if (choice === 'Auto') {
    delete state.manual_locks[String(w.index)];
    const remainingLocks = Object.keys(state.manual_locks).map(Number);
    state.freeze_before_index = remainingLocks.length ? Math.max(...remainingLocks) : null;
  } else {
    state.manual_locks[String(w.index)] = choice;
    state.freeze_before_index = Number(w.index);
  }
  hideTooltip();
  queueSolve(0);
}

function lockUpTo(index) {
  for (let idx = 0; idx <= index; idx++) {
    if (!state.manual_locks[String(idx)]) {
      const row = state.windows.find(r => r.index === idx);
      state.manual_locks[String(idx)] = row ? row.selected : '[No race]';
    }
  }
}

tooltip.addEventListener('mouseleave', () => {
  if (tooltipPinned) return;
  setTimeout(() => {
    if (tooltipPinned) return;
    if (!tooltip.matches(':hover')) {
      const cardInDom = activeTooltipCard && activeTooltipCard.isConnected;
      if (!cardInDom || !activeTooltipCard.matches(':hover')) hideTooltip();
    }
  }, 350);
});

document.addEventListener('click', (e) => {
  if (!tooltip.contains(e.target) && !e.target.closest('.turn-card')) hideTooltip();
});

/* ───── HELPERS ───── */
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
  state.presetNames = Object.keys(payload.presets);
  const initial = payload.settings?.preset || '';
  ids.preset.value = initial;
  ids.presetInput.value = '';
  buildPresetDropdown('');
  const displayRanks = [...payload.ranks].reverse();
  [ids.sprint, ids.mile, ids.medium, ids.long, ids.turf, ids.dirt, ids.threshold].forEach(el => fillSelect(el, displayRanks, 'A'));
}

function buildPresetDropdown(filter) {
  const dd = ids.presetDropdown;
  dd.innerHTML = '';
  const lower = filter.toLowerCase();
  const matches = state.presetNames.filter(n => n.toLowerCase().includes(lower));
  if (!matches.length) {
    dd.innerHTML = '<div class="combo-empty">No matches</div>';
    return;
  }
  for (const name of matches) {
    const item = document.createElement('div');
    item.className = 'combo-item' + (name === ids.preset.value ? ' selected' : '');
    item.textContent = name;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectPreset(name);
    });
    dd.appendChild(item);
  }
}

function selectPreset(name) {
  ids.preset.value = name;
  ids.presetInput.value = name;
  ids.presetCombo.classList.remove('open');
  const apt = applyPreset(name);
  ids.sprint.value = apt.Sprint;
  ids.mile.value = apt.Mile;
  ids.medium.value = apt.Medium;
  ids.long.value = apt.Long;
  ids.turf.value = apt.Turf;
  ids.dirt.value = apt.Dirt;
  queueSolve(0);
}

function settingsFromUI() {
  return {
    preset: ids.preset.value,
    aptitudes: {
      Sprint: ids.sprint.value, Mile: ids.mile.value,
      Medium: ids.medium.value, Long: ids.long.value,
      Turf: ids.turf.value, Dirt: ids.dirt.value
    },
    threshold: ids.threshold.value,
    max_consecutive_races: Number(ids.maxConsec.value || 0),
    race_bonus_pct: Number(ids.raceBonus.value || 0),
    stat_weight: Number(ids.statWeight.value || 0),
    sp_weight: Number(ids.spWeight.value || 0),
    hint_weight: Number(ids.hintWeight.value || 0),
    epithet_multiplier: Number(ids.epithetMultiplier.value || 0),
    three_race_penalty_weight: Number(ids.threeRacePenalty.value || 0),
    race_cost: Number(ids.raceCost.value || 0),
    forced_epithets: [...state.forced_epithets]
  };
}

function loadSettingsToUI(settings) {
  const presetVal = settings.preset || '';
  ids.preset.value = presetVal;
  ids.presetInput.value = presetVal === '' ? '' : presetVal;
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
  ids.raceCost.value = settings.race_cost;
  if (settings.forced_epithets) {
    state.forced_epithets = [...settings.forced_epithets];
    renderForcedEpithetList();
  }
}

function currentFreezeLabel() {
  if (state.freeze_before_index == null) return '';
  const cutoff = Number(state.freeze_before_index);
  const w = state.windows.find(w => Number(w.index) === cutoff);
  if (!w) return `${Math.max(0, cutoff)} turns fixed`;
  return `Fixed before ${w.year} ${w.half} ${w.month}`;
}

function monthHalfLabel(w) {
  return `${w.month} ${w.half}`;
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

// Distinct colors for epithet tracking — bright, visible on both light and dark
const EPITHET_COLORS = [
  '#ef5350', '#66bb6a', '#42a5f5', '#ffa726', '#ab47bc',
  '#26c6da', '#ec407a', '#9ccc65', '#ff7043', '#26a69a',
  '#7e57c2', '#ffca28', '#29b6f6', '#d4e157', '#8d6e63',
  '#78909c', '#5c6bc0', '#ffee58', '#ff8a65', '#4db6ac',
  '#ba68c8', '#aed581', '#4fc3f7', '#fff176', '#a1887f',
  '#90a4ae', '#7986cb', '#81c784', '#e57373', '#4dd0e1',
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getEpithetColor(name) {
  return EPITHET_COLORS[hashStr(name) % EPITHET_COLORS.length];
}

function gradeClass(grade) {
  if (!grade) return '';
  const g = grade.toLowerCase();
  if (g === 'g1') return 'g1';
  if (g === 'g2') return 'g2';
  if (g === 'g3') return 'g3';
  return 'op';
}


function abbreviateRace(name) {
  if (!name || name === '[No race]') return '';
  if (name.length > 20) {
    return name
      .replace('Championship', 'Champ.')
      .replace('Stakes', 'S.')
      .replace('Memorial', 'Mem.')
      .replace('Juvenile', 'Juv.')
      .replace('Futurity', 'Fut.')
      .replace('Japanese ', 'Jpn. ')
      .replace('Takamatsunomiya', 'Takamatsu.')
      .replace('Sprinters Stakes', 'Sprinters S.')
      .replace('Queen Elizabeth II Cup', 'QE II Cup');
  }
  return name;
}

/* ───── FORCED EPITHETS ───── */
const forcedEpithetList = document.getElementById('forcedEpithetList');
const forcedEpithetSearch = document.getElementById('forcedEpithetSearch');

function renderForcedEpithetList(filter = '') {
  if (!forcedEpithetList) return;
  forcedEpithetList.innerHTML = '';
  const lower = filter.toLowerCase();
  const defs = state.all_epithet_defs || [];
  const filtered = lower ? defs.filter(e => e.name.toLowerCase().includes(lower) || e.condition_text.toLowerCase().includes(lower)) : defs;
  // Show forced ones first, then the rest
  const sorted = [...filtered].sort((a, b) => {
    const af = state.forced_epithets.includes(a.name) ? 0 : 1;
    const bf = state.forced_epithets.includes(b.name) ? 0 : 1;
    return af - bf || a.name.localeCompare(b.name);
  });
  for (const ep of sorted) {
    const isForced = state.forced_epithets.includes(ep.name);
    const item = document.createElement('label');
    item.className = 'forced-epithet-item' + (isForced ? ' active' : '');
    item.title = ep.condition_text;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isForced;
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!state.forced_epithets.includes(ep.name)) state.forced_epithets.push(ep.name);
      } else {
        state.forced_epithets = state.forced_epithets.filter(n => n !== ep.name);
      }
      item.classList.toggle('active', cb.checked);
      queueSolve(0);
    });
    const text = document.createElement('span');
    text.className = 'forced-epithet-name';
    text.textContent = ep.name;
    const reward = document.createElement('span');
    reward.className = 'forced-epithet-reward';
    reward.textContent = ep.reward_text;
    item.appendChild(cb);
    item.appendChild(text);
    item.appendChild(reward);
    forcedEpithetList.appendChild(item);
  }
}

if (forcedEpithetSearch) {
  forcedEpithetSearch.addEventListener('input', () => {
    renderForcedEpithetList(forcedEpithetSearch.value);
  });
}

/* ───── RENDER: TURN CELL ───── */
function renderTurnCell(w) {
  const card = document.createElement('div');
  const isLocked = w.lock_value && w.lock_value !== 'Auto';
  const isNoRace = w.selected === '[No race]';

  card.className = `turn-card ${isLocked ? 'locked' : ''} ${isNoRace ? 'empty-turn' : ''}`;
  if (w.grade) card.setAttribute('data-grade', w.grade);
  // Store epithet names for highlight matching
  const allEpNames = [...(w.epithet_names || []), ...(w.new_epithets || [])];
  if (allEpNames.length) card.setAttribute('data-epithets', allEpNames.join('||'));

  const inner = document.createElement('div');
  inner.className = 'turn-inner';

  // Top row: month/half + lock badge
  const top = document.createElement('div');
  top.className = 'turn-top';
  const slot = document.createElement('div');
  slot.className = 'turn-slot';
  slot.textContent = `${w.month} ${w.half}`;
  top.appendChild(slot);
  if (isLocked) {
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = 'LCK';
    top.appendChild(badge);
  }
  inner.appendChild(top);

  // Race name with grade badge
  const nameRow = document.createElement('div');
  nameRow.className = 'turn-name-row';

  if (!isNoRace && w.grade) {
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `grade-badge ${gradeClass(w.grade)}`;
    gradeBadge.textContent = w.grade;
    nameRow.appendChild(gradeBadge);
  }

  const name = document.createElement('span');
  name.className = 'turn-name' + (isNoRace ? ' no-race' : '');
  name.textContent = isNoRace ? 'No race' : abbreviateRace(w.selected);
  name.title = w.selected;
  nameRow.appendChild(name);
  inner.appendChild(nameRow);

  // Track/surface info line
  if (!isNoRace) {
    const info = document.createElement('div');
    info.className = 'turn-race-info';
    info.textContent = `${w.track || ''} · ${w.surface || ''} ${w.distance || ''}`;
    inner.appendChild(info);
  }

  // Bottom: epithet dots + stats
  const bottom = document.createElement('div');
  bottom.className = 'turn-bottom';

  if (!isNoRace) {
    const linkedOnly = linkedOnlyEpithets(w);
    const completed = w.new_epithets || [];
    if (linkedOnly.length || completed.length) {
      const dots = document.createElement('span');
      dots.className = 'turn-epithet-dots';
      for (const name of completed) {
        const dot = document.createElement('span');
        dot.className = 'edot';
        dot.style.background = getEpithetColor(name);
        dot.style.boxShadow = `0 0 3px ${getEpithetColor(name)}`;
        dot.title = `Completes: ${name}`;
        dots.appendChild(dot);
      }
      for (const name of linkedOnly) {
        const dot = document.createElement('span');
        dot.className = 'edot';
        dot.style.background = getEpithetColor(name);
        dot.title = name;
        dots.appendChild(dot);
      }
      bottom.appendChild(dots);
    }

    if (w.race_stats || w.race_sp) {
      const stats = document.createElement('span');
      stats.className = 'turn-stat-info';
      stats.textContent = `+${w.race_stats || 0} / +${w.race_sp || 0}`;
      bottom.appendChild(stats);
    }
  }
  inner.appendChild(bottom);

  card.appendChild(inner);

  // Interactions
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeTooltipCard === card && tooltipPinned) {
      hideTooltip();
    } else if (activeTooltipCard === card) {
      tooltipPinned = true;
    } else {
      showTooltip(card, w);
      tooltipPinned = true;
    }
  });

  let hoverTimer = null;
  card.addEventListener('mouseenter', () => {
    if (tooltipPinned) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showTooltip(card, w), 180);
  });
  card.addEventListener('mouseleave', () => {
    if (tooltipPinned) return;
    clearTimeout(hoverTimer);
    setTimeout(() => {
      if (tooltipPinned) return;
      if (!tooltip.matches(':hover') && (activeTooltipCard === card || !activeTooltipCard?.isConnected)) hideTooltip();
    }, 350);
  });

  return card;
}

/* ───── RENDER: SCHEDULE ───── */
function renderSchedule() {
  hideTooltip();
  ids.scheduleYears.innerHTML = '';

  state.years.forEach(year => {
    const section = document.createElement('section');
    section.className = `year-section`;

    const header = document.createElement('div');
    header.className = `year-header ${yearClass(year)}`;
    const yearWindows = sortYearWindows(year);
    const raceCount = yearWindows.filter(w => w.selected !== '[No race]').length;
    header.innerHTML = `<h3>${year}</h3><div class="year-helper">${raceCount} races</div>`;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'year-grid';
    yearWindows.forEach(w => grid.appendChild(renderTurnCell(w)));
    section.appendChild(grid);
    ids.scheduleYears.appendChild(section);
  });
}

/* ───── RENDER: EPITHETS ───── */
let activeEpithetHighlight = null;

function clearEpithetHighlight() {
  document.querySelectorAll('.turn-card.epithet-highlight').forEach(el => el.classList.remove('epithet-highlight'));
  document.querySelectorAll('.turn-card.epithet-dim').forEach(el => el.classList.remove('epithet-dim'));
  document.querySelectorAll('.epithet-card.active').forEach(el => el.classList.remove('active'));
  activeEpithetHighlight = null;
}

function highlightEpithet(name) {
  if (activeEpithetHighlight === name) {
    clearEpithetHighlight();
    return;
  }
  clearEpithetHighlight();
  activeEpithetHighlight = name;

  const color = getEpithetColor(name);
  document.querySelectorAll('.turn-card').forEach(el => {
    const eps = el.getAttribute('data-epithets');
    if (eps && eps.split('||').includes(name)) {
      el.classList.add('epithet-highlight');
      el.style.setProperty('--highlight-color', color);
    } else if (!el.classList.contains('empty-turn')) {
      el.classList.add('epithet-dim');
    }
  });
}

function renderEpithets() {
  ids.epithetList.innerHTML = '';
  activeEpithetHighlight = null;
  if (!state.epithets.length) {
    ids.epithetList.innerHTML = '<div class="empty">No epithets completed under the current schedule.</div>';
    return;
  }
  state.epithets.forEach(ep => {
    const card = document.createElement('div');
    card.className = 'epithet-card';
    const color = getEpithetColor(ep.name);
    card.innerHTML = `
      <div class="epithet-color-dot" style="background:${color}"></div>
      <h4>${ep.name}</h4>
      <div class="reward">${ep.reward_text}</div>
      <div class="condition">${ep.condition_text}</div>
      <div class="value">Weighted value: ${ep.weighted_value}</div>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      document.querySelectorAll('.epithet-card.active').forEach(el => el.classList.remove('active'));
      if (activeEpithetHighlight === ep.name) {
        clearEpithetHighlight();
      } else {
        highlightEpithet(ep.name);
        card.classList.add('active');
      }
    });
    ids.epithetList.appendChild(card);
  });
}

/* ───── RENDER: SUMMARY ───── */
function renderSummary() {
  const s = state.summary;
  ids.metricEpithets.textContent = s.completed_epithets;
  ids.metricValue.textContent = s.total_value;
  ids.metricRaces.textContent = s.scheduled_races;

  // Individual gain metrics
  const elRaceStats = document.getElementById('metricRaceStats');
  const elRaceSP = document.getElementById('metricRaceSP');
  const elEpithetStats = document.getElementById('metricEpithetStats');
  const elHints = document.getElementById('metricHints');
  if (elRaceStats) elRaceStats.textContent = s.race_stats || 0;
  if (elRaceSP) elRaceSP.textContent = s.race_skill_points || 0;
  if (elEpithetStats) elEpithetStats.textContent = s.epithet_stat_points || 0;

  const hintNames = s.epithet_hint_names || [];
  if (elHints) elHints.textContent = hintNames.length ? hintNames.length : '0';
  if (elHints) elHints.title = hintNames.length ? hintNames.join(', ') : 'No hints';

  // Keep hidden compat elements populated
  if (ids.metricBreakdown) ids.metricBreakdown.innerHTML = `${s.race_stats}/${s.race_skill_points}/${s.epithet_stat_points}`;

  ids.statusText.textContent = s.status;
  ids.statusPill.className = 'status-pill ' + (s.status === 'OPTIMAL' ? 'ok' : (s.status.includes('INFEAS') ? 'bad' : 'warn'));

  let note = s.proven_optimal
    ? 'Solver-proven optimal for current settings.'
    : 'Not proven optimal — check solver status.';
  if (s.message) note += ' ' + s.message;
  ids.statusNote.textContent = note;

  const freeze = currentFreezeLabel();
  ids.summaryLine.textContent = freeze || 'Auto-updates as you change settings.';
}

/* ───── APPLY / SOLVE ───── */
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
  // Persist state so it survives refresh
  saveStateToStorage();
}

function saveStateToStorage() {
  try {
    const data = {
      s: settingsFromUI(),
      l: state.manual_locks,
      f: state.freeze_before_index
    };
    localStorage.setItem('uma-schedule', JSON.stringify(data));
  } catch (e) { /* quota exceeded — ignore */ }
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem('uma-schedule');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function queueSolve(delay = 250) {
  clearTimeout(autoSolveTimer);
  if (!solverEnabled) {
    // Solver disabled — just re-render with current state
    renderSchedule();
    return;
  }
  autoSolveTimer = setTimeout(() => postSolve(), delay);
}

async function postSolve() {
  const seq = ++solveSequence;
  ids.statusText.textContent = 'UPDATING';
  ids.statusPill.className = 'status-pill warn';
  ids.statusNote.textContent = 'Recomputing\u2026';
  try {
    const payload = await solveWithManualLocks(
      settingsFromUI(), state.current_selected, state.manual_locks, state.freeze_before_index
    );
    if (seq !== solveSequence) return;
    applyPayload(payload);
    if (payload.dropped_epithets?.length) {
      state.forced_epithets = state.forced_epithets.filter(n => !payload.dropped_epithets.includes(n));
      renderForcedEpithetList();
      showToast(`Removed forced epithet${payload.dropped_epithets.length > 1 ? 's' : ''} (incompatible with locked races): ${payload.dropped_epithets.join(', ')}`);
    }
  } catch (err) {
    if (seq !== solveSequence) return;
    console.error(err);
    ids.statusText.textContent = 'ERROR';
    ids.statusPill.className = 'status-pill bad';
    ids.statusNote.textContent = `Solver failed: ${err?.message || err}`;
  }
}

function bindAutoSolveListeners() {
  ids.presetInput.addEventListener('input', () => {
    buildPresetDropdown(ids.presetInput.value);
    ids.presetCombo.classList.add('open');
  });
  ids.presetInput.addEventListener('focus', () => {
    ids.presetInput.select();
    buildPresetDropdown(ids.presetInput.value);
    ids.presetCombo.classList.add('open');
  });
  ids.presetInput.addEventListener('blur', () => {
    // Small delay so mousedown on dropdown item fires first
    setTimeout(() => {
      ids.presetCombo.classList.remove('open');
      // Reset to current value if input doesn't match
      if (!state.presetNames.includes(ids.presetInput.value)) {
        ids.presetInput.value = ids.preset.value === '' ? '' : ids.preset.value;
      }
    }, 200);
  });
  ids.presetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const filter = ids.presetInput.value.toLowerCase();
      const match = state.presetNames.find(n => n.toLowerCase().includes(filter));
      if (match) selectPreset(match);
      ids.presetInput.blur();
    } else if (e.key === 'Escape') {
      ids.presetInput.value = ids.preset.value === '' ? '' : ids.preset.value;
      ids.presetCombo.classList.remove('open');
      ids.presetInput.blur();
    }
  });

  [ids.sprint, ids.mile, ids.medium, ids.long, ids.turf, ids.dirt, ids.threshold].forEach(el => {
    el.addEventListener('change', () => {
      // Clear race locks when aptitudes change — they may now be ineligible
      // Keep only summer block locks (No race)
      const kept = {};
      for (const [k, v] of Object.entries(state.manual_locks)) {
        if (v === '[No race]') kept[k] = v;
      }
      state.manual_locks = kept;
      state.freeze_before_index = null;
      queueSolve(0);
    });
  });

  ids.maxConsec.addEventListener('change', () => queueSolve(0));

  [ids.raceBonus, ids.statWeight, ids.spWeight, ids.hintWeight, ids.epithetMultiplier, ids.threeRacePenalty, ids.raceCost].forEach(el => {
    el.addEventListener('input', () => queueSolve(250));
    el.addEventListener('change', () => queueSolve(0));
  });

  ids.rebuildBtn.addEventListener('click', () => {
    solverEnabled = true;
    solverToggle.checked = true;
    queueSolve(0);
  });
  ids.clearLocksBtn.addEventListener('click', () => {
    // Reset to only the default summer training blocks
    const kept = {};
    for (const idx of DEFAULT_SUMMER_BLOCKS) {
      kept[String(idx)] = '[No race]';
    }
    state.manual_locks = kept;
    state.freeze_before_index = null;
    queueSolve(0);
  });

  solverToggle.addEventListener('change', () => {
    solverEnabled = solverToggle.checked;
    if (solverEnabled) {
      ids.statusText.textContent = 'Enabled';
      ids.statusPill.className = 'status-pill ok';
      queueSolve(0);
    } else {
      ids.statusText.textContent = 'Manual';
      ids.statusPill.className = 'status-pill';
      ids.statusNote.textContent = 'Solver disabled — pick races manually.';
    }
  });
}

async function init() {
  // Load saved state before initialPayload so applyPayload doesn't overwrite it
  const hash = window.location.hash.slice(1);
  const saved = !hash ? loadStateFromStorage() : null;

  const [payload, allEpDefs] = await Promise.all([initialPayload(), getAllEpithetNames()]);
  state.all_epithet_defs = allEpDefs;
  populateStaticControls(payload);
  renderForcedEpithetList();

  // Apply initial payload without saving to storage (would overwrite saved state)
  state.settings = payload.settings;
  state.summary = payload.summary;
  state.windows = payload.windows;
  state.epithets = payload.epithets;
  state.current_selected = payload.current_selected || [];
  loadSettingsToUI(payload.settings);
  renderSummary();
  renderSchedule();
  renderEpithets();

  // Restore state: URL hash > localStorage > defaults
  if (hash) {
    try {
      const data = decodeShareState(hash);
      state.manual_locks = data.l || {};
      state.freeze_before_index = data.f ?? null;
      if (data.s) loadSettingsToUI(data.s);
      showToast('Imported shared schedule!');
    } catch (e) {
      for (const idx of DEFAULT_SUMMER_BLOCKS) {
        state.manual_locks[String(idx)] = '[No race]';
      }
    }
  } else if (saved) {
    state.manual_locks = saved.l || {};
    state.freeze_before_index = saved.f ?? null;
    if (saved.s) loadSettingsToUI(saved.s);
  } else {
    for (const idx of DEFAULT_SUMMER_BLOCKS) {
      state.manual_locks[String(idx)] = '[No race]';
    }
  }
  queueSolve(0);

  bindAutoSolveListeners();
}

init().catch(err => {
  console.error(err);
  ids.statusText.textContent = 'ERROR';
  ids.statusPill.className = 'status-pill bad';
  ids.statusNote.textContent = `Init failed: ${err?.message || err}`;
});
