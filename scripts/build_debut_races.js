#!/usr/bin/env node
'use strict';

// Build debut_races.json: { [characterName]: { track, surface, distance, length } }
// Sourced from GameTora's character-cards (name -> char_id) and ura-objectives
// (char_id -> first objective race = "Junior Make Debut" with resolved fields).

const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://gametora.com';
const CACHE = path.join(__dirname, '..', '.cache_gametora');
const OUT = path.join(__dirname, '..', 'debut_races.json');
const SOLVER = path.join(__dirname, '..', 'solver-browser.js');
const UA = 'Mozilla/5.0 (compatible; trackblazer-debut-builder/1.0)';

const TRACK_ID_TO_NAME = {
  10001: 'Sapporo', 10002: 'Hakodate', 10003: 'Fukushima', 10004: 'Niigata',
  10005: 'Nakayama', 10006: 'Tokyo', 10007: 'Chukyo', 10008: 'Kyoto',
  10009: 'Hanshin', 10010: 'Kokura',
  10101: 'Ooi', 10102: 'Kawasaki', 10103: 'Funabashi', 10104: 'Morioka', 10105: 'Saga',
  10201: 'Longchamp', 10202: 'Santa Anita Park', 10203: 'Del Mar',
};

function distanceCategory(meters) {
  if (meters <= 1400) return 'Sprint';
  if (meters <= 1800) return 'Mile';
  if (meters <= 2400) return 'Medium';
  return 'Long';
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function cachePath(url) {
  const slug = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 200);
  return path.join(CACHE, slug.endsWith('.json') ? slug : `${slug}.json`);
}

async function fetchJson(url) {
  const cached = cachePath(url);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'));
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  ensureDir(CACHE);
  fs.writeFileSync(cached, JSON.stringify(data));
  return data;
}

function presetNamesFromSolver() {
  const src = fs.readFileSync(SOLVER, 'utf8');
  const m = src.match(/const PRESETS = \{([\s\S]*?)\n\};/);
  if (!m) throw new Error('Could not parse PRESETS from solver-browser.js');
  return [...m[1].matchAll(/'([^']+)':/g)].map(x => x[1]);
}

async function main() {
  const manifest = await fetchJson(`${BASE}/data/manifests/umamusume.json`);
  const cards = await fetchJson(`${BASE}/data/umamusume/character-cards.${manifest['character-cards']}.json`);
  const objectives = await fetchJson(`${BASE}/data/umamusume/ura-objectives.${manifest['ura-objectives']}.json`);

  // name_en -> char_id (first card seen per character)
  const nameToCharId = {};
  const seen = new Set();
  for (const c of cards) {
    if (!c?.name_en || seen.has(c.char_id)) continue;
    seen.add(c.char_id);
    nameToCharId[c.name_en] = c.char_id;
  }

  // char_id -> debut race object (objectives[].order === 1)
  const debutByCharId = {};
  for (const obj of objectives) {
    const charId = obj?.char_id;
    if (!charId) continue;
    const first = (obj.objectives || []).find(o => o.order === 1);
    const race = first?.races?.[0];
    if (!race) continue;
    debutByCharId[charId] = race;
  }

  const presetNames = presetNamesFromSolver();
  const result = {};
  const missing = [];
  for (const name of presetNames) {
    const charId = nameToCharId[name];
    const race = charId != null ? debutByCharId[charId] : null;
    if (!race || race.distance == null || race.track == null) {
      missing.push(name);
      continue;
    }
    const length = race.distance;
    const trackName = TRACK_ID_TO_NAME[race.track] || `Track ${race.track}`;
    const surface = race.terrain === 2 ? 'Dirt' : 'Turf';
    result[name] = {
      name: 'Junior Make Debut',
      track: trackName,
      surface,
      distance: distanceCategory(length),
      length,
    };
  }

  if (missing.length) {
    console.log(`Missing debut info for ${missing.length} preset(s):`);
    for (const n of missing) console.log(`  - ${n}`);
  }
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(result).length}/${presetNames.length} debut races -> ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
