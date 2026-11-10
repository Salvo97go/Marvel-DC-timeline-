#!/usr/bin/env node
/*
 * Builds data/series.js from the Metron comic database (https://metron.cloud):
 *   - the full issue list of every series on the timeline,
 *   - each event's reading order (Metron "story arcs"), and the full issue
 *     lists of every series that tied into one,
 *   - basic details (years, issue count) for those series.
 *
 *   node tools/fetch-series.mjs            (see fetch-covers.mjs for the login)
 *
 * Progress is cached in tools/metron-cache.json.gz (committed, so any
 * checkout can resume). The run can be stopped and resumed; delete the
 * file to start over.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools', 'metron-cache.json.gz');
const OLD_CACHE = path.join(ROOT, 'tools', '.cache', 'metron.json');
const OUT = path.join(ROOT, 'data', 'series.js');
const BASE = (process.env.METRON_BASE || 'https://metron.cloud/api').replace(/\/$/, '');
const DELAY_MS = +(process.env.METRON_DELAY_MS || 2100);
const USER = process.env.METRON_USERNAME, PASS = process.env.METRON_PASSWORD;
const IMG_PREFIX = 'https://static.metron.cloud/media/issue/';
const PUBLISHERS = { 'Marvel': 'marvel', 'Timely Comics': 'marvel', 'DC Comics': 'dc' };
const PUB_QUERY = { marvel: 'Marvel', dc: 'DC Comics' };

// Event names that Metron files differently.
const ARC_SEARCH = {
  'kree-skrull-war': 'Kree / Skrull',
  'onslaught': 'Onslaught',
  'hox-pox': 'House of X',
  'judgment-day': 'Judgment Day',
  'death-of-superman': 'Death of Superman',
  'zero-hour': 'Zero Hour',
  'metal': 'Metal',
  'death-metal': 'Death Metal',
  'dark-crisis': 'Dark Crisis',
  'rebirth': 'Rebirth',
  'secret-wars-2015': 'Secret Wars',
  'secret-wars-1984': 'Secret Wars',
  'infinity-war-1992': 'Infinity War',
  'dc-vs-marvel': 'DC vs',
  'jla-avengers': 'JLA'
};

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['marvel', 'dc', 'events', 'crossovers']) {
  const p = path.join(ROOT, 'data', f + '.js');
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
}
const T = sandbox.window.TIMELINE;

const cache = fs.existsSync(CACHE) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(CACHE)).toString('utf8'))
  : fs.existsSync(OLD_CACHE) ? JSON.parse(fs.readFileSync(OLD_CACHE, 'utf8')) : {};
for (const k of ['catalog', 'catalogDone', 'core', 'arcs', 'lists', 'heroes', 'extra', 'creators', 'detail']) cache[k] = cache[k] || {};

// Characters whose every appearance is pulled in, and the creators whose
// credits are tracked. Names must match Metron's.
const HEROES = ['Batman', 'Spider-Man', 'Captain America'];
const CREATORS = [
  // Batman
  'Bob Kane', 'Bill Finger', 'Jerry Robinson', 'Dick Sprang', 'Sheldon Moldoff', 'Carmine Infantino', 'Gardner Fox',
  'Neal Adams', "Denny O'Neil", 'Frank Robbins', 'Irv Novick', 'Dick Giordano', 'Jim Aparo', 'Bob Haney', 'Steve Englehart',
  'Marshall Rogers', 'Len Wein', 'Gene Colan', 'Don Newton', 'Doug Moench', 'Gerry Conway', 'Frank Miller', 'Klaus Janson',
  'David Mazzucchelli', 'Alan Moore', 'Brian Bolland', 'Jim Starlin', 'Max Allan Collins', 'Alan Grant', 'Norm Breyfogle',
  'Chuck Dixon', 'Graham Nolan', 'Kelley Jones', 'Mike W. Barr', 'Jeph Loeb', 'Tim Sale', 'Jim Lee', 'Paul Dini', 'Bruce Timm',
  'Ed Brubaker', 'Greg Rucka', 'Grant Morrison', 'Andy Kubert', 'Frank Quitely', 'Tony S. Daniel', 'Scott Snyder', 'Greg Capullo',
  'Tom King', 'Mikel Janín', 'James Tynion IV', 'Jorge Jiménez', 'Chip Zdarsky', 'Nick Dragotta',
  // Spider-Man
  'Stan Lee', 'Steve Ditko', 'John Romita Sr.', 'Gil Kane', 'Ross Andru', 'Marv Wolfman', 'Keith Pollard', 'Bill Mantlo',
  'Roger Stern', 'John Romita Jr.', 'Tom DeFalco', 'Ron Frenz', 'Sal Buscema', 'Peter David', 'J.M. DeMatteis', 'Mike Zeck',
  'David Michelinie', 'Todd McFarlane', 'Erik Larsen', 'Mark Bagley', 'Howard Mackie', 'Paul Jenkins', 'J. Michael Straczynski',
  'Mike Deodato', 'Dan Slott', 'Humberto Ramos', 'Marcos Martín', 'Brian Michael Bendis', 'Sara Pichelli', 'Nick Spencer',
  'Ryan Ottley', 'Zeb Wells', 'Jonathan Hickman', 'Marco Checchetto',
  // Captain America
  'Joe Simon', 'Jack Kirby', 'Jim Steranko', 'Gene Colan', 'Mark Gruenwald', 'Kieron Dwyer', 'John Byrne', 'Mark Waid',
  'Ron Garney', 'Dan Jurgens', 'Steve Epting', 'Rick Remender', 'Ta-Nehisi Coates', 'Leinil Francis Yu', 'Jesús Saiz', 'Chris Samnee'
];
// Metron's spelling, where it differs from the name used in the app.
const CREATOR_SEARCH = { "Denny O'Neil": ["Dennis O'Neil", "Denny O'Neil"], 'J.M. DeMatteis': ['J.M. DeMatteis', 'J. M. DeMatteis'], 'Marcos Martín': ['Marcos Martin'], 'Mikel Janín': ['Mikel Janin'], 'Tony S. Daniel': ['Tony Daniel'], 'Leinil Francis Yu': ['Leinil Yu'], 'Jesús Saiz': ['Jesus Saiz'], 'Jorge Jiménez': ['Jorge Jimenez'] };
const COLLECTED = /trade|hard ?cover|omnibus|digest|compendium|reprint/i;
// Written often during a run; compression keeps the committed file small.
let lastSave = 0;
const saveCache = (force) => {
  if (!force && Date.now() - lastSave < 30000) return;
  lastSave = Date.now();
  fs.writeFileSync(CACHE, zlib.gzipSync(JSON.stringify(cache)));
};

const headers = { Accept: 'application/json', 'User-Agent': 'LongboxTimeline/1.0' };
if (USER && PASS) headers.Authorization = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;
async function get(url, tries = 0) {
  requests++;
  let res;
  try {
    res = await fetch(url.startsWith('http') ? url : BASE + url, { headers });
  } catch (e) {
    if (tries < 4) { await sleep(5000 * (tries + 1)); return get(url, tries + 1); }
    throw e;
  }
  await sleep(DELAY_MS);
  if (res.status === 429 && tries < 6) {
    const wait = (+res.headers.get('retry-after') || 60) * 1000;
    if (wait > 15 * 60 * 1000) {
      const at = new Date(Date.now() + wait).toISOString().slice(0, 16).replace('T', ' ');
      throw new Error(`Metron's daily request limit is used up. Progress is saved; run again after ${at} UTC.`);
    }
    console.log(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    return get(url, tries + 1);
  }
  if (res.status === 401 || res.status === 403) throw new Error('Metron rejected the login.');
  if (res.status >= 500 && tries < 4) { await sleep(10000); return get(url, tries + 1); }
  if (!res.ok) throw new Error(`Metron returned ${res.status} for ${url}`);
  return res.json();
}
async function getAll(url) {
  const out = [];
  let next = url;
  while (next) { const d = await get(next); out.push(...(d.results || [])); next = d.next; }
  return out;
}
const qs = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();
const norm = (t) => String(t || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const ym = (d) => String(d || '').slice(0, 7);

// ── 1. Series catalog (publisher, years, issue count) ────────────────
async function catalog() {
  for (const [pubName, pub] of Object.entries(PUBLISHERS)) {
    if (cache.catalogDone[pubName]) continue;
    console.log(`Listing ${pubName} series…`);
    let next = '/series/' + qs({ publisher_name: pubName });
    while (next) {
      const d = await get(next);
      for (const s of d.results || []) {
        cache.catalog[s.id] = { pub, name: s.series, began: s.year_began, end: s.year_end, count: s.issue_count, type: s.series_type && s.series_type.name, vol: s.volume };
      }
      next = d.next;
    }
    cache.catalogDone[pubName] = true;
    saveCache();
  }
}

// ── 2. Which Metron series each timeline issue belongs to ────────────
const ALIASES = {
  'Luke Cage, Hero for Hire': ['Hero for Hire'], 'Uncanny X-Men': ['X-Men'], 'X-Men: Alpha': ['X-Men Alpha'],
  'X-Men: Omega': ['X-Men Omega'], 'AvX: VS': ['AVX Vs'], 'The Saga of the Swamp Thing': ['The Saga of Swamp Thing'],
  'Vengeance of Bane': ['Batman: Vengeance of Bane Special'], 'DC Countdown': ['Countdown to Infinite Crisis'],
  'All-Star Superman': ['All Star Superman'],
  'Marvel and DC Present': ['Marvel and DC Present Featuring The Uncanny X-Men and The New Teen Titans'],
  'Deadpool/Batman': ['Marvel / DC: Deadpool / Batman'], 'Batman/Deadpool': ['DC / Marvel: Batman / Deadpool'],
  'Captain America and the Falcon': ['Captain America'], 'All-New Captain America': ['All-New Captain America']
};
const keyOf = (pub, it) => [pub, it.title, it.issue || '', it.date].join('|');
async function core() {
  const todo = [];
  for (const pub of ['marvel', 'dc', 'crossover']) {
    for (const it of T[pub] || []) {
      if (it.issue && it.type !== 'milestone' && !(keyOf(pub, it) in cache.core)) todo.push([pub, it]);
    }
  }
  console.log(`Matching ${todo.length} timeline issues to their series…`);
  for (const [pub, it] of todo) {
    const year = +String(it.date).slice(0, 4);
    const titles = [it.title, it.title.replace(/^the /i, ''), ...(ALIASES[it.title] || [])];
    let hit = null;
    outer: for (const publisher of [PUB_QUERY[pub], null]) {
      for (const title of [...new Set(titles)]) {
        for (const y of [year, year + 1, year - 1]) {
          const d = await get('/issue/' + qs({ series_name: title, number: it.issue, cover_year: y, publisher_name: publisher }));
          hit = (d.results || []).find((r) => norm(r.series.name) === norm(title));
          if (hit) break outer;
        }
      }
      if (!PUB_QUERY[pub]) break;
    }
    cache.core[keyOf(pub, it)] = hit ? { series: hit.series.id, issue: hit.id } : null;
    console.log(`  ${hit ? '✓' : '–'} ${it.title} #${it.issue}`);
    saveCache();
  }
}

// ── 3. Event reading orders ──────────────────────────────────────────
async function arcs() {
  for (const ev of T.events) {
    if (ev.id in cache.arcs) continue;
    const term = ARC_SEARCH[ev.id] || ev.name.replace(/\(.*?\)/g, '').replace(/^the\s+/i, '').trim();
    const y1 = +ev.start.slice(0, 4), y2 = +ev.end.slice(0, 4);
    const found = await getAll('/arc/' + qs({ name: term }));
    const want = norm(ev.name);
    const scored = found.map((a) => {
      const n = norm(a.name);
      const score = n === want ? 0 : n === norm(term) ? 1 : n.startsWith(norm(term)) || want.startsWith(n) ? 2 : 3;
      return { a, score };
    }).filter((x) => x.score < 3).sort((x, y) => x.score - y.score).slice(0, 4);
    let chosen = null;
    for (const { a } of scored) {
      const issues = await getAll(`/arc/${a.id}/issue_list/`);
      const years = issues.map((i) => +String(i.cover_date).slice(0, 4)).filter(Boolean).sort((p, q) => p - q);
      const mid = years[Math.floor(years.length / 2)];
      if (mid >= y1 - 1 && mid <= y2 + 1) { chosen = { arc: a.id, name: a.name, issues }; break; }
    }
    // No reading order in Metron: fall back to the event's own core series.
    if (!chosen) chosen = await coreSeriesArc(ev);
    cache.arcs[ev.id] = chosen ? {
      arc: chosen.arc, name: chosen.name,
      issues: chosen.issues.map((i) => ({ id: i.id, s: i.series.id, sn: i.series.name, sv: i.series.volume, sy: i.series.year_began, n: i.number, d: ym(i.cover_date), img: i.image }))
    } : null;
    console.log(`  ${chosen ? '✓' : '–'} ${ev.name}${chosen ? ` → "${chosen.name}" (${chosen.issues.length} issues)` : ''}`);
    saveCache();
  }
}

async function coreSeriesArc(ev) {
  const titles = String(ev.series || '').split(/,\s*|\s+&\s+/).map((t) => t.split(' #')[0].trim()).filter(Boolean);
  const y = +ev.start.slice(0, 4);
  const issues = [];
  for (const t of [...new Set(titles)]) {
    let found = null;
    for (const variant of [...new Set([t, t.replace(/\s*\/\s*/g, ' / ')])]) {
      for (const yy of [y, y - 1, y + 1]) {
        const d = await get('/issue/' + qs({ series_name: variant, cover_year: yy }));
        found = (d.results || []).find((r) => norm(r.series.name) === norm(t));
        if (found) break;
      }
      if (found) break;
    }
    if (!found) continue;
    const all = await getAll(`/series/${found.series.id}/issue_list/`);
    issues.push(...all);
  }
  if (!issues.length) return null;
  issues.sort((a, b) => String(a.cover_date).localeCompare(String(b.cover_date)));
  return { arc: null, name: `${ev.name} (core series)`, issues };
}

// ── 3b. Every appearance of each hero, and the series they're regulars in
async function heroes() {
  for (const hero of HEROES) {
    if (cache.heroes[hero]) continue;
    const found = await getAll('/character/' + qs({ name: hero }));
    const ch = found.find((c) => norm(c.name) === norm(hero));
    if (!ch) { console.log(`  – no character "${hero}"`); continue; }
    console.log(`Listing every ${hero} appearance…`);
    const issues = await getAll(`/character/${ch.id}/issue_list/`);
    cache.heroes[hero] = { id: ch.id, issues: issues.map((i) => [i.id, i.series.id, i.series.name, i.series.year_began]) };
    console.log(`  ${issues.length} appearances`);
    saveCache();
  }
  // A series joins when the hero is in at least 3 of its issues, or half of them.
  for (const hero of HEROES) {
    const h = cache.heroes[hero];
    if (!h) continue;
    const per = new Map();
    h.issues.forEach(([, sid]) => per.set(sid, (per.get(sid) || 0) + 1));
    let n = 0;
    per.forEach((count, sid) => {
      const c = cache.catalog[sid];
      if (!c || COLLECTED.test(c.type || '') || COLLECTED.test(c.name || '')) return;
      if (count >= 3 || count / Math.max(1, c.count || 1) >= 0.5) { if (!cache.extra[sid]) n++; cache.extra[sid] = true; }
    });
    console.log(`  ${hero}: ${n} new series to add`);
  }
  saveCache();
}

// ── 3c. Credits for key creators
async function creators() {
  for (const name of CREATORS) {
    if (cache.creators[name]) continue;
    let cr = null;
    for (const term of [name, ...(CREATOR_SEARCH[name] || [])]) {
      const found = await getAll('/creator/' + qs({ name: term }));
      cr = found.find((c) => norm(c.name) === norm(term)) || (found.length === 1 ? found[0] : null);
      if (cr) break;
    }
    if (!cr) { console.log(`  – no creator "${name}"`); cache.creators[name] = { id: null, issues: [] }; saveCache(); continue; }
    const issues = await getAll('/issue/' + qs({ creator_id: cr.id }));
    cache.creators[name] = { id: cr.id, issues: issues.map((i) => i.id) };
    console.log(`  ${name}: ${issues.length} credits`);
    saveCache();
  }
}

// ── 3d. Exact roles for key creators' issues featuring the heroes
async function roles(limit) {
  const heroIds = new Set();
  Object.values(cache.heroes).forEach((h) => h && h.issues.forEach((i) => heroIds.add(i[0])));
  const want = new Set();
  Object.values(cache.creators).forEach((c) => c.issues.forEach((id) => { if (heroIds.has(id) && !cache.detail[id]) want.add(id); }));
  const todo = [...want].slice(0, limit);
  console.log(`Fetching credits for ${todo.length} of ${want.size} issues…`);
  let n = 0;
  for (const id of todo) {
    const d = await get(`/issue/${id}/`);
    cache.detail[id] = (d.credits || []).map((c) => [c.creator, (c.role || []).map((r) => r.name).join('/')]);
    if (++n % 50 === 0) { console.log(`  ${n}/${todo.length}`); saveCache(); }
  }
  saveCache();
}

// ── 4. Full issue lists ──────────────────────────────────────────────
async function lists() {
  const ids = new Set();
  Object.values(cache.core).forEach((c) => c && ids.add(c.series));
  Object.values(cache.arcs).forEach((a) => a && a.issues.forEach((i) => ids.add(i.s)));
  Object.keys(cache.extra).forEach((id) => ids.add(+id));
  const todo = [...ids].filter((id) => !cache.lists[id]);
  console.log(`Fetching full issue lists for ${todo.length} series (${ids.size} total)…`);
  let n = 0;
  for (const id of todo) {
    const issues = await getAll(`/series/${id}/issue_list/`);
    cache.lists[id] = issues.map((i) => [i.id, i.number, ym(i.cover_date), i.image ? i.image.replace(IMG_PREFIX, '') : '']);
    if (!cache.catalog[id] && issues[0]) {
      const s = issues[0].series;
      cache.catalog[id] = { pub: null, name: `${s.name} (${s.year_began})`, began: s.year_began, vol: s.volume, count: issues.length };
    }
    n++;
    if (n % 10 === 0 || n === todo.length) console.log(`  ${n}/${todo.length} series`);
    saveCache();
  }
}

// ── 5. Write data/series.js ──────────────────────────────────────────
function write() {
  const eventPub = {};
  T.events.forEach((e) => { eventPub[e.id] = e.publisher; });
  const arcPub = {};
  Object.entries(cache.arcs).forEach(([ev, a]) => a && a.issues.forEach((i) => { arcPub[i.s] = arcPub[i.s] || eventPub[ev]; }));

  const series = Object.keys(cache.lists).map((id) => {
    const c = cache.catalog[id] || {};
    const issues = cache.lists[id].filter((i) => i[2]).sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    let pub = c.pub || (arcPub[id] === 'crossover' ? 'crossover' : arcPub[id]) || 'marvel';
    if (/marvel.*dc|dc.*marvel/i.test(c.name || '')) pub = 'crossover';
    return { id: +id, name: c.name, pub, type: c.type || '', began: c.began, end: c.end || null, count: c.count || issues.length, issues };
  }).filter((s) => s.issues.length).sort((a, b) => (a.issues[0][2] < b.issues[0][2] ? -1 : 1));

  const arcsOut = {};
  Object.entries(cache.arcs).forEach(([ev, a]) => { if (a) arcsOut[ev] = { name: a.name, issues: a.issues.map((i) => i.id) }; });
  const links = {};
  Object.entries(cache.core).forEach(([k, v]) => { if (v) links[k] = v.issue; });

  // Appearances and credits, limited to issues that are in the file.
  const inFile = new Set();
  series.forEach((s) => s.issues.forEach((i) => inFile.add(i[0])));
  const chars = {};
  Object.entries(cache.heroes).forEach(([hero, h]) => { if (h) chars[hero] = h.issues.map((i) => i[0]).filter((id) => inFile.has(id)); });
  const credits = {};
  const kind = (role) => (/writer|plot|script|story/i.test(role) ? 'w' : /pencil|artist|ink|breakdown|layout|finish/i.test(role) ? 'a' : /cover/i.test(role) ? 'c' : null);
  Object.entries(cache.creators).forEach(([name, c]) => {
    const out = { w: [], a: [], c: [], x: [] };
    c.issues.forEach((id) => {
      if (!inFile.has(id)) return;
      const det = cache.detail[id];
      if (!det) { out.x.push(id); return; }
      const mine = det.filter(([who]) => norm(who) === norm(name)).map(([, r]) => r).join('/');
      const kinds = new Set(mine.split('/').map(kind).filter(Boolean));
      if (kinds.has('w')) out.w.push(id);
      if (kinds.has('a')) out.a.push(id);
      if (!kinds.has('w') && !kinds.has('a')) out.c.push(id);
    });
    Object.keys(out).forEach((k) => { if (!out[k].length) delete out[k]; });
    if (Object.keys(out).length) credits[name] = out;
  });

  const lines = series.map((s) => '  ' + JSON.stringify(s));
  fs.writeFileSync(OUT, `/*
 * Full series runs and event reading orders from the Metron comic database
 * (https://metron.cloud). Generated by tools/fetch-series.mjs; don't edit by hand.
 *
 * series[].issues: [metron issue id, issue number, cover date "YYYY-MM", cover image path]
 * Cover images live at ${IMG_PREFIX}<path>.
 */
window.TIMELINE = window.TIMELINE || {};
window.TIMELINE.imgBase = ${JSON.stringify(IMG_PREFIX)};
window.TIMELINE.series = [
${lines.join(',\n')}
];
window.TIMELINE.arcs = ${JSON.stringify(arcsOut)};
window.TIMELINE.links = ${JSON.stringify(links)};
// Every appearance of each hero (issue ids).
window.TIMELINE.chars = ${JSON.stringify(chars)};
// Key creators' credits: w = writer, a = art, c = cover only, x = role not checked yet.
window.TIMELINE.credits = ${JSON.stringify(credits)};
`);
  const total = series.reduce((a, s) => a + s.issues.length, 0);
  console.log(`Wrote ${series.length} series, ${total} issues, ${Object.keys(arcsOut).length} event reading orders to data/series.js`);
}

const only = process.argv[2];
try {
  if (only === 'write') { saveCache(true); write(); process.exit(0); }
  await catalog();
  await core();
  await arcs();
  await heroes();
  await lists();
  write();
  await creators();
  await roles(+(process.env.ROLE_LIMIT || 4000));
  saveCache(true);
  write();
  console.log(`Done (${requests} requests).`);
} catch (e) {
  saveCache(true);
  write();
  console.error(e.message);
  process.exit(1);
}
