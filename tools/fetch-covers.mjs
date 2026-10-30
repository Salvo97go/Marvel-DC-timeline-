#!/usr/bin/env node
/*
 * Looks up a cover image for every issue on the timeline in the Metron
 * database (https://metron.cloud) and saves the links to data/covers.js.
 *
 *   METRON_USERNAME=you METRON_PASSWORD=secret node tools/fetch-covers.mjs
 *
 * In a Claude cloud session, the login can instead be stored as a network
 * secret for metron.cloud; the proxy adds it, so no variables are needed.
 *
 * Safe to re-run: issues that already have a cover are skipped, so an
 * interrupted run picks up where it left off. Covers you set by hand in
 * the data files (`cover: "..."`) always win over these.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'covers.js');
const BASE = (process.env.METRON_BASE || 'https://metron.cloud/api').replace(/\/$/, '');
const USER = process.env.METRON_USERNAME;
const PASS = process.env.METRON_PASSWORD;
const DELAY_MS = +(process.env.METRON_DELAY_MS || 2100); // Metron allows ~30 requests a minute
const PUBLISHER = { marvel: 'Marvel', dc: 'DC Comics' };

if (!USER || !PASS) {
  console.log('No METRON_USERNAME/METRON_PASSWORD set; relying on a network secret to log in.');
}

// Load the data files the same way the browser does.
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['marvel', 'dc', 'crossovers', 'covers']) {
  const p = path.join(ROOT, 'data', f + '.js');
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
}
const T = sandbox.window.TIMELINE || {};
const covers = Object.assign({}, T.covers || {});
const misses = [];

// Must match coverKey() in js/app.js.
const keyOf = (pub, it) => [pub, it.title, it.issue || '', it.date].join('|');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { Accept: 'application/json', 'User-Agent': 'LongboxTimeline/1.0' };
if (USER && PASS) headers.Authorization = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

async function get(url, tries = 0) {
  const res = await fetch(url, { headers });
  if (res.status === 429 && tries < 5) {
    const wait = (+res.headers.get('retry-after') || 60) * 1000;
    console.log(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    return get(url, tries + 1);
  }
  if (res.status === 401 || res.status === 403) throw new Error('Metron rejected the login. Check the username and password.');
  if (!res.ok) throw new Error(`Metron returned ${res.status} for ${url}`);
  return res.json();
}

// Titles Metron files under a different series name.
const ALIASES = {
  'Luke Cage, Hero for Hire': ['Hero for Hire'],
  'Uncanny X-Men': ['X-Men'], // the title was plain "X-Men" until #142
  'X-Men: Alpha': ['X-Men Alpha'],
  'X-Men: Omega': ['X-Men Omega'],
  'AvX: VS': ['AVX Vs'],
  'The Saga of the Swamp Thing': ['The Saga of Swamp Thing'],
  'Vengeance of Bane': ['Batman: Vengeance of Bane Special'],
  'DC Countdown': ['Countdown to Infinite Crisis'],
  'All-Star Superman': ['All Star Superman'],
  'Marvel and DC Present': ['Marvel and DC Present Featuring The Uncanny X-Men and The New Teen Titans'],
  'Deadpool/Batman': ['Marvel / DC: Deadpool / Batman'],
  'Batman/Deadpool': ['DC / Marvel: Batman / Deadpool']
};

// "The Amazing Spider-Man" is filed under "Amazing Spider-Man" in some places.
function titleVariants(t) {
  const v = [t];
  if (/^the /i.test(t)) v.push(t.replace(/^the /i, ''));
  return v.concat(ALIASES[t] || []);
}

const norm = (t) => String(t || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

// series_name is a "contains" match, so filter by cover year and prefer a
// series whose name matches the title exactly.
async function findCover(pub, it) {
  const year = +String(it.date).slice(0, 4);
  // Golden Age Marvel is filed under Timely, so retry without the publisher.
  for (const publisher of [PUBLISHER[pub], null]) {
    for (const title of titleVariants(it.title)) {
      const hit = await search(title, it.issue, year, publisher);
      if (hit) return hit;
    }
    if (!PUBLISHER[pub]) break;
  }
  return null;
}

async function search(title, number, year, publisher) {
  const want = norm(title);
  for (const y of [year, year + 1, year - 1]) {
    const qs = new URLSearchParams({ series_name: title, number, cover_year: y });
    if (publisher) qs.set('publisher_name', publisher);
    const data = await get(`${BASE}/issue/?${qs}`);
    await sleep(DELAY_MS);
    const exact = (data.results || []).find((r) => r.image && norm(r.series && r.series.name) === want);
    if (exact) return exact.image;
  }
  return null;
}

function save() {
  const body = Object.keys(covers).sort().map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(covers[k])}`).join(',\n');
  fs.writeFileSync(OUT, `/*
 * Cover images from the Metron comic database (https://metron.cloud).
 * Generated by tools/fetch-covers.mjs. Keys are "publisher|title|issue|date".
 */
window.TIMELINE = window.TIMELINE || {};
window.TIMELINE.covers = {
${body}
};
`);
}

const todo = [];
for (const pub of ['marvel', 'dc', 'crossover']) {
  for (const it of T[pub] || []) {
    if (!it.issue || it.type === 'milestone' || it.cover || covers[keyOf(pub, it)]) continue;
    todo.push([pub, it]);
  }
}
console.log(`${todo.length} issues to look up (${Object.keys(covers).length} already have covers).`);

let found = 0;
for (const [i, [pub, it]] of todo.entries()) {
  const name = `${it.title} #${it.issue} (${it.date})`;
  try {
    const url = await findCover(pub, it);
    if (url) { covers[keyOf(pub, it)] = url; found++; save(); console.log(`[${i + 1}/${todo.length}] ✓ ${name}`); }
    else { misses.push(name); console.log(`[${i + 1}/${todo.length}] – ${name}: not found`); }
  } catch (e) {
    console.error(e.message);
    if (/login/.test(e.message)) process.exit(1);
    misses.push(name);
  }
}
save();
console.log(`\nDone. Found ${found} new covers; ${Object.keys(covers).length} total.`);
if (misses.length) console.log(`No match for ${misses.length}:\n  ${misses.join('\n  ')}`);
