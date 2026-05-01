#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://gametora.com';
const CACHE = path.join(__dirname, '..', '.cache_gametora');
const RACES_JSON = path.join(__dirname, '..', 'races.json');
const UA = 'Mozilla/5.0 (compatible; trackblazer-fan-merge/1.0)';

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

async function main() {
  const manifest = await fetchJson(`${BASE}/data/manifests/umamusume.json`);
  // Load ura-fans payout tables: id → { order → fans }
  const uraFansRaw = await fetchJson(`${BASE}/data/umamusume/ura-fans.${manifest['ura-fans']}.json`);
  const firstPlaceFansById = new Map();
  for (const row of uraFansRaw || []) {
    if (row?.id == null || !Array.isArray(row.fans)) continue;
    const first = row.fans.find(f => f?.order === 1);
    if (first?.fans != null) firstPlaceFansById.set(row.id, first.fans);
  }

  if (process.argv.includes('--manifest-keys')) {
    console.log(Object.keys(manifest).filter(k => /race|drop|fan/i.test(k)));
    return;
  }
  if (process.argv.includes('--rewards')) {
    const url = `${BASE}/data/umamusume/ura-race-rewards.${manifest['ura-race-rewards']}.json`;
    const r = await fetchJson(url);
    console.log('Type:', Array.isArray(r) ? `array len=${r.length}` : typeof r);
    if (Array.isArray(r)) console.log(JSON.stringify(r.slice(0, 3), null, 2));
    else console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    return;
  }
  if (process.argv.includes('--ura-fans')) {
    const url = `${BASE}/data/umamusume/ura-fans.${manifest['ura-fans']}.json`;
    const r = await fetchJson(url);
    console.log('Type:', Array.isArray(r) ? `array len=${r.length}` : typeof r);
    if (Array.isArray(r)) console.log(JSON.stringify(r.slice(0, 3), null, 2));
    else console.log(JSON.stringify(r, null, 2).slice(0, 2000));
    return;
  }
  const racesUrl = `${BASE}/data/umamusume/races.${manifest.races}.json`;
  const instancesUrl = `${BASE}/data/umamusume/race_instances.${manifest['race_instances']}.json`;
  const racesRaw = await fetchJson(racesUrl);
  const instancesRaw = await fetchJson(instancesUrl);

  // Drill into a sample G1 instance
  if (process.argv.includes('--sample')) {
    const target = process.argv[process.argv.indexOf('--sample') + 1] || 'Japan Cup';
    for (const inst of instancesRaw) {
      if (inst.details?.name_en === target) {
        console.log(JSON.stringify(inst, null, 2));
        break;
      }
    }
    return;
  }

  // Verify fans_gain is consistent per race name across instances
  if (process.argv.includes('--verify')) {
    const byName = new Map();
    for (const inst of instancesRaw) {
      const d = inst.details;
      const name = d?.name_en;
      const fans = inst.fans_gain;
      if (!name || fans == null) continue;
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name).add(fans);
    }
    let conflicts = 0;
    for (const [name, set] of byName) {
      if (set.size > 1) {
        console.log(`CONFLICT: ${name} -> ${[...set].join(', ')}`);
        conflicts++;
      }
    }
    console.log(`Total race names: ${byName.size}, conflicts: ${conflicts}`);
    return;
  }

  // Build name -> 1st-place fans map (resolved through ura-fans payout table)
  const fansByName = new Map();
  for (const inst of instancesRaw) {
    const d = inst.details;
    const name = d?.name_en;
    const tableId = inst.fans_gain;
    if (!name || tableId == null) continue;
    const fans = firstPlaceFansById.get(tableId);
    if (fans != null) fansByName.set(name, fans);
  }

  // Local races.json names → GameTora name_en when transliteration differs
  const NAME_ALIAS = {
    "Japanese Derby (Tokyo Yushun)": "Tokyo Yushun (Japanese Derby)",
    "JBC Ladies' Classic": "JBC Ladies’ Classic",
    "Milers Cup (Yomiuri)": "Milers Cup",
    "Aster Prize": "Aster Sho",
    "Saffron Prize": "Saffron Sho",
    "Purple Chrysanthemum Prize": "Shigiku Sho",
    "Rindou Prize": "Rindo Sho",
    "Platanus Prize": "Platanus Sho",
    "Yellow Chrysanthemum Prize": "Kigiku Sho",
    "Nadeshiko Prize": "Nadeshiko Sho",
    "Hundred Days Grass Special": "Hyakunichiso Tokubetsu",
    "Kinmokusei Special": "Kimmokusei Tokubetsu",
    "Oxalis Prize": "Oxalis Sho",
    "Mochi Tree Prize": "Mochinoki Sho",
    "Red Pine Prize": "Akamatsu Sho",
    "Akimegiku Prize": "Shumeigiku Sho",
    "Cattleya Prize": "Cattleya Sho",
    "Begonia Prize": "Begonia Sho",
    "White Chrysanthemum Prize": "Shiragiku Sho",
    "Leaf Cabbage Prize": "Habotan Sho",
    "Koyamaki Prize": "Koyamaki Sho",
    "Ten Thousand Ryou Prize": "Manryo Sho",
    "Black Pine Soar": "Kuromatsu Sho",
    "Erica Prize": "Erica Sho",
    "Tsuwabuki Prize": "Tsuwabuki Sho",
    "Holly Prize": "Hiiragi Sho",
    "Sazanka Prize": "Sazanka Sho",
    "Cold Camellia Prize": "Kantsubaki Sho",
    "Thousand Ryou Prize": "Senryo Sho",
    "Dahlia Prize": "Dahlia Sho",
    "Phoenix Prize": "Phoenix Sho",
    "Cosmos Prize": "Cosmos Sho",
    "Clover Prize": "Clover Sho",
    "Suzuran Prize": "Suzuran Sho",
    "Wakakoma Stakes": "Wakagoma Stakes",
    "Margaret Stakes": "Marguerite Stakes",
    "Wasurenagusa Prize": "Wasurenagusa Sho",
    "Sweet Pea Stakes": "Sweetpea Stakes",
    "Tenpouzan Stakes": "Tempozan Stakes",
    "Akhal-Teke Stakes": "Akhalteke Stakes",
    "Tomoe Prize": "Tomoe Sho",
    "Meitetsu Cup": "Meitetsu Hai",
    "UHB Prize": "UHB Sho",
    "NST Prize": "NST Sho",
    "BSN Prize": "BSN Sho",
    "Radio Nippon Prize": "Radio Nippon Sho",
    "Auro Cup": "Oro Cup",
    "Fukushima Minpo Cup": "Fukushima Mimpo Hai",
    "Tennouzan Stakes": "Tennozan Stakes",
    "Miyako Oji Stakes": "Miyakooji Stakes",
  };
  function lookupFans(name) {
    if (fansByName.has(name)) return fansByName.get(name);
    const alias = NAME_ALIAS[name];
    if (alias && fansByName.has(alias)) return fansByName.get(alias);
    return null;
  }

  // Apply to races.json
  if (process.argv.includes('--apply')) {
    const races = JSON.parse(fs.readFileSync(RACES_JSON, 'utf8'));
    let matched = 0, missing = [];
    for (const r of races) {
      const fans = lookupFans(r.name);
      if (fans != null) {
        r.fans = fans;
        matched++;
      } else {
        missing.push(r.name);
      }
    }
    if (missing.length) {
      console.log(`Missing fans for ${missing.length} races:`);
      for (const n of [...new Set(missing)]) console.log(`  - ${n}`);
    }
    console.log(`Matched ${matched}/${races.length} races`);
    fs.writeFileSync(RACES_JSON, `${JSON.stringify(races, null, 2)}\n`, 'utf8');
    return;
  }

  // Dry-run: report match rate and any name mismatches
  if (process.argv.includes('--dry-run')) {
    const races = JSON.parse(fs.readFileSync(RACES_JSON, 'utf8'));
    const localNames = new Set(races.map(r => r.name));
    const remoteNames = new Set(fansByName.keys());
    const localOnly = [...localNames].filter(n => lookupFans(n) == null);
    const remoteOnly = [...remoteNames].filter(n => !localNames.has(n) && !Object.values(NAME_ALIAS).includes(n));
    console.log(`Local races.json names: ${localNames.size}`);
    console.log(`Remote names with fans: ${remoteNames.size}`);
    console.log(`Local-only (no remote match): ${localOnly.length}`);
    for (const n of localOnly) console.log(`  LOCAL : "${n}"`);
    console.log(`\nRemote-only (no local match): ${remoteOnly.length}`);
    for (const n of remoteOnly) console.log(`  REMOTE: "${n}"`);
    return;
  }

  // Inspect: print fields on a sample race so we can identify the fan field.
  if (process.argv.includes('--inspect')) {
    console.log('Sample race:', JSON.stringify(racesRaw[0], null, 2));
    console.log('Sample instance:', JSON.stringify(instancesRaw[0], null, 2));
    const keysCount = {};
    for (const r of racesRaw) for (const k of Object.keys(r)) keysCount[k] = (keysCount[k] || 0) + 1;
    console.log('Race field counts:', keysCount);
    if (instancesRaw[0]) {
      const ikc = {};
      for (const r of instancesRaw) for (const k of Object.keys(r)) ikc[k] = (ikc[k] || 0) + 1;
      console.log('Instance field counts:', ikc);
      if (instancesRaw[0].details) {
        const dkc = {};
        for (const r of instancesRaw) if (r.details) for (const k of Object.keys(r.details)) dkc[k] = (dkc[k] || 0) + 1;
        console.log('Instance.details field counts:', dkc);
      }
    }
    return;
  }
}

main().catch(e => { console.error(e); process.exit(1); });
