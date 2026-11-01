/* By George: an interactive timeline of George magazine (1995–2001).
   Reads window.GEORGE from data.js. No build step, no dependencies. */
(function () {
  'use strict';

  const G = window.GEORGE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Storage (per-browser conveniences and the viewer's own edits) ──
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bygeorge.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bygeorge.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  // ── Data ───────────────────────────────────────────────────────────
  const BASE = G.issues.map((it, i) => Object.assign({}, it, { id: it.date, n: i + 1, img: it.img || '' }));
  let edits = store.get('edits', {});
  let ISS = [];
  const byId = new Map();
  function rebuild() {
    ISS = BASE.map((it) => (edits[it.id] ? Object.assign({}, it, edits[it.id], { id: it.id, n: it.n }) : it));
    byId.clear();
    ISS.forEach((it) => byId.set(it.id, it));
    buildPeople();
  }
  const TOTAL = BASE.length;
  const SURE = {
    confirmed: { label: 'Confirmed', long: 'Named in news coverage or an editorial roundup of George covers.' },
    reported: { label: 'Reported', long: 'Described in resale listings (eBay, Etsy, back-issue shops). Likely right, but check against a copy.' },
    unknown: { label: 'Not identified', long: 'No source for who is on this cover yet. If you have the issue or find it, add it with Edit details.' }
  };

  const EVENTS = [];
  G.history.forEach((h) => EVENTS.push(Object.assign({ kind: 'mag' }, h)));
  G.context.forEach((h) => EVENTS.push(Object.assign({ kind: 'dc', people: [], src: [] }, h)));
  BASE.forEach((it) => (it.inside || []).forEach((f) => {
    if (f.k === 'interview') EVENTS.push({ kind: 'inside', date: it.date, title: f.who, text: f.text, people: [f.who], src: it.src, issue: it.id });
  }));
  EVENTS.forEach((e, i) => { e.id = 'e' + i; });
  const evById = new Map(EVENTS.map((e) => [e.id, e]));

  const LANES = [
    { id: 'issue', label: 'Covers', c: 'var(--lane-issue)' },
    { id: 'inside', label: "Kennedy's interviews", c: 'var(--lane-inside)' },
    { id: 'mag', label: 'The magazine', c: 'var(--lane-mag)' },
    { id: 'dc', label: 'Washington', c: 'var(--lane-dc)' }
  ];
  const ERAS = [
    { from: '1995-09-07', to: '1997-06', label: 'Kennedy & Berman' },
    { from: '1997-06', to: '1999-07-16', label: 'Kennedy runs it alone' },
    { from: '1999-07-16', to: '2001-03', label: 'After Kennedy: Hachette & Frank Lalli' }
  ];

  // People index: who appears on covers, inside, and behind the scenes.
  let PEOPLE = [];
  function buildPeople() {
    const m = new Map();
    const get = (name) => { if (!m.has(name)) m.set(name, { name, cover: [], inside: [], staff: [], notes: [] }); return m.get(name); };
    ISS.forEach((it) => {
      (it.cover || []).forEach((n) => get(n).cover.push(it.id));
      (it.inside || []).forEach((f) => { if (f.who) get(f.who).inside.push(it.id); });
    });
    G.history.forEach((h) => (h.people || []).forEach((n) => get(n).staff.push(h)));
    G.interviews.forEach((x) => { const p = get(x.who); p.notes.push(x.text); });
    PEOPLE = Array.from(m.values()).map((p) => {
      p.cover = Array.from(new Set(p.cover));
      p.inside = Array.from(new Set(p.inside)).filter((id) => !p.cover.includes(id));
      p.count = p.cover.length + p.inside.length + p.staff.length + p.notes.length;
      p.roles = [];
      if (p.cover.length) p.roles.push('cover');
      if (p.inside.length || p.notes.length) p.roles.push('inside');
      if (p.staff.length) p.roles.push('staff');
      return p;
    }).sort((a, b) => b.cover.length - a.cover.length || b.count - a.count || a.name.localeCompare(b.name));
  }

  // ── Dates ──────────────────────────────────────────────────────────
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function parts(d) { const p = String(d).split('-').map(Number); return { y: p[0], m: p[1] || 1, d: p[2] || 0, hasM: p.length > 1, hasD: p.length > 2 }; }
  function mIndex(d, mid) { const p = parts(d); return p.y * 12 + (p.m - 1) + (p.hasD ? (p.d - 1) / 30.5 : (mid ? 0.5 : 0)); }
  function fmt(d) { const p = parts(d); if (!p.hasM) return String(p.y); return p.hasD ? `${MON[p.m - 1]} ${p.d}, ${p.y}` : `${MON[p.m - 1]} ${p.y}`; }
  const T0 = 1995 * 12 + 6; // July 1995
  const T1 = 2001 * 12 + 4; // May 2001
  const PAD = 40;

  // ── State ──────────────────────────────────────────────────────────
  const state = {
    view: 'timeline',
    q: '',
    person: '',
    lanes: Object.assign({ issue: true, inside: true, mag: true, dc: true }, store.get('lanes', {})),
    sure: Object.assign({ confirmed: true, reported: true, unknown: true }, store.get('sure', {})),
    role: 'all',
    peopleQ: '',
    ppm: 90,
    open: null // { type: 'issue' | 'event', id }
  };
  const failedImgs = new Set();

  function issueMatches(it) {
    if (!state.sure[it.sure]) return false;
    if (state.person && !((it.cover || []).includes(state.person) || (it.inside || []).some((f) => f.who === state.person))) return false;
    if (state.q) {
      const hay = [it.label, (it.cover || []).join(' '), it.concept, it.photo, (it.lines || []).join(' '), (it.inside || []).map((f) => f.who + ' ' + f.text).join(' '), it.notes].join(' ').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  function eventMatches(e) {
    if (state.person && !(e.people || []).includes(state.person)) return false;
    if (state.q) {
      const hay = [e.title, e.text, (e.people || []).join(' ')].join(' ').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const filtering = () => !!(state.q || state.person || !state.sure.confirmed || !state.sure.reported || !state.sure.unknown);

  // ── Drawn cover ────────────────────────────────────────────────────
  const PALS = ['navy', 'paper', 'red', 'sky', 'black', 'gold'];
  function coverHTML(it, w) {
    const mode = w < 30 ? 'tiny' : w < 80 ? 'mini' : '';
    const pal = PALS[(it.n * 7 + parts(it.date).m) % PALS.length];
    const names = (it.cover || []).join(' & ');
    const img = it.img && !failedImgs.has(it.img) ? `<img src="${esc(it.img)}" alt="George, ${esc(it.label)}${names ? ', ' + esc(names) : ''}" loading="lazy" decoding="async">` : '';
    const line = (it.lines || [])[0] || '';
    return `<div class="cv cv-${pal} ${mode}${img ? ' has-img' : ''}" style="--w:${typeof w === 'number' ? w + 'px' : w};--s:var(--sure-${it.sure})">` +
      `<div class="mast">GEORGE</div><div class="stars">★ ★ ★</div><div class="tag">Not just politics as usual</div>` +
      (names ? `<div class="who">${esc(names)}</div>` : `<div class="q">?</div><div class="who">Cover not identified</div>`) +
      (line ? `<div class="line">${esc(line)}</div>` : '') +
      `<div class="date">${esc(it.label)}</div>` + img + `<span class="sure-dot" title="${esc(SURE[it.sure].label)}"></span></div>`;
  }
  // A cover image that fails to load (blocked, moved, hotlink-protected) falls back to the drawn cover.
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest('.cv')) {
      failedImgs.add(t.getAttribute('src'));
      t.closest('.cv').classList.remove('has-img');
      t.remove();
      if (state.open && state.open.type === 'issue') { const n = $('#img-status'); if (n) n.hidden = false; }
    }
  }, true);

  // ── Elements ───────────────────────────────────────────────────────
  const stage = $('#stage');
  const drawer = $('#drawer');
  const dBody = $('#drawer-body');
  const modal = $('#modal');
  const tip = $('#tip');
  const toastEl = $('#toast');
  let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 2600); }

  // ── Sidebar ────────────────────────────────────────────────────────
  function renderSide() {
    const laneCount = { issue: TOTAL, inside: EVENTS.filter((e) => e.kind === 'inside').length, mag: G.history.length, dc: G.context.length };
    $('#lane-chips').innerHTML = LANES.map((l) => `<button type="button" class="chip" data-lane="${l.id}" aria-pressed="${state.lanes[l.id]}"><span class="sw" style="--c:${l.c}"></span>${esc(l.label)} <span class="n">${laneCount[l.id]}</span></button>`).join('');
    const sc = { confirmed: 0, reported: 0, unknown: 0 };
    ISS.forEach((it) => { sc[it.sure]++; });
    $('#sure-chips').innerHTML = Object.keys(SURE).map((k) => `<button type="button" class="chip" data-sure="${k}" aria-pressed="${state.sure[k]}"><span class="sw" style="--c:var(--sure-${k})"></span>${SURE[k].label} <span class="n">${sc[k]}</span></button>`).join('');
    $('#sure-note').textContent = `${sc.confirmed} covers are named in news coverage, ${sc.reported} come from resale listings, and ${sc.unknown} are still unidentified.`;

    $$('.tab[data-role]').forEach((b) => b.classList.toggle('on', b.dataset.role === state.role));
    renderPeopleList();

    $('#interview-list').innerHTML = G.interviews.map((x) => `<li><b>${esc(x.who)}</b>${esc(x.text)}</li>`).join('');
    $('#after-list').innerHTML = G.after.map((x) => `<li><span class="when">${esc(fmt(x.date))}</span><b>${esc(x.title)}</b>${esc(x.text)} ${srcLinks(x.src, true)}</li>`).join('');
  }
  function peopleFiltered() {
    const q = state.peopleQ.toLowerCase();
    return PEOPLE.filter((p) => (state.role === 'all' || p.roles.includes(state.role)) && (!q || p.name.toLowerCase().includes(q)));
  }
  function renderPeopleList() {
    const list = peopleFiltered();
    $('#people-n').textContent = PEOPLE.length;
    $('#people-list').innerHTML = list.map((p) => `<li><button type="button" data-person="${esc(p.name)}" class="${state.person === p.name ? 'on' : ''}">${esc(p.name)}${p.cover.length ? '<span class="role">cover</span>' : ''}<span class="n">${p.count}</span></button></li>`).join('') || '<li class="side-note">No one matches.</li>';
  }

  // ── Focus bar ──────────────────────────────────────────────────────
  function renderFocus() {
    const shown = ISS.filter(issueMatches).length;
    const pills = [];
    if (state.person) pills.push(`<span class="pill">${esc(state.person)}<button type="button" data-clear="person" aria-label="Stop following ${esc(state.person)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>`);
    if (state.q) pills.push(`<span class="pill">“${esc(state.q)}”<button type="button" data-clear="q" aria-label="Clear search"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>`);
    const lead = filtering() ? `Showing ${shown} of ${TOTAL} issues` : `${TOTAL} issues, Oct/Nov 1995 to the 2001 farewell issue. Select a cover for details.`;
    $('#focus').innerHTML = `<span>${lead}</span>${pills.join('')}`;
  }

  // ── Timeline ───────────────────────────────────────────────────────
  const PMIN = 10, PMAX = 220;
  const ppmFromSlider = (v) => PMIN * Math.pow(PMAX / PMIN, v / 1000);
  const sliderFromPpm = (p) => Math.round(1000 * Math.log(p / PMIN) / Math.log(PMAX / PMIN));
  const X = (mi) => PAD + (mi - T0) * state.ppm;

  function renderTimeline() {
    const ppm = state.ppm;
    const W = PAD * 2 + (T1 - T0) * ppm;
    const out = [];
    let y = 80;

    // eras
    ERAS.forEach((e) => {
      const a = X(mIndex(e.from)), b = X(mIndex(e.to));
      out.push(`<div class="era" style="left:${a}px;width:${b - a}px" title="${esc(e.label)}">${esc(e.label)}</div>`);
    });

    const body = [];
    LANES.forEach((lane) => {
      if (!state.lanes[lane.id]) return;
      const top = y;
      body.push(`<div class="lane-rule" style="top:${top - 4}px"></div><div class="lane-head" style="top:${top}px;width:${W}px"><span class="lane-label" style="--c:${lane.c}">${esc(lane.label)}</span></div>`);
      if (lane.id === 'issue') {
        let maxH = 0;
        let anyCap = false;
        const marks = Math.min(150, ppm - 8) < 22; // too narrow for single-month covers: show every issue as a mark
        ISS.forEach((it) => {
          const a = X(mIndex(it.date));
          const slot = it.span * ppm;
          const w = Math.min(150, slot - 8);
          const hit = filtering() && issueMatches(it);
          const dim = filtering() && !issueMatches(it);
          const tipText = `${it.label}: ${(it.cover || []).join(' & ') || 'cover not identified'}`;
          if (marks) {
            body.push(`<button type="button" class="tl-mark${dim ? ' dim' : ''}" data-issue="${it.id}" data-tip="${esc(tipText)}" aria-label="${esc(tipText)}" style="left:${a + 1}px;top:${top + 28}px;width:${Math.max(3, slot - 2)}px;background:var(--sure-${it.sure})"></button>`);
            maxH = Math.max(maxH, 10);
          } else {
            const h = w * 10.6 / 8;
            const cap = w >= 80;
            anyCap = anyCap || cap;
            maxH = Math.max(maxH, h);
            body.push(`<button type="button" class="tl-issue${dim ? ' dim' : ''}${hit ? ' hit' : ''}" data-issue="${it.id}" ${cap ? '' : `data-tip="${esc(tipText)}"`} aria-label="${esc(tipText)}" style="left:${a + (slot - w) / 2}px;top:${top + 28}px;width:${w}px">${coverHTML(it, w)}` +
              (cap ? `<div class="cap"><b>${esc((it.cover || []).join(' & ') || 'Not identified')}</b><span>${esc(it.label)}</span></div>` : '') + `</button>`);
          }
        });
        y = top + 28 + maxH + (anyCap ? 40 : 10) + 18;
      } else {
        const evs = EVENTS.filter((e) => e.kind === lane.id).sort((a, b) => mIndex(a.date, true) - mIndex(b.date, true));
        const cards = ppm >= 30;
        const CW = 172, CH = 60;
        const rows = [];
        evs.forEach((e) => {
          const x = X(mIndex(e.date, true));
          const left = cards ? x - 6 : x - 6;
          const width = cards ? CW : 12;
          let r = rows.findIndex((end) => left > end + 6);
          if (r === -1) { r = rows.length; rows.push(0); }
          rows[r] = left + width;
          const dim = filtering() && !eventMatches(e);
          const hit = filtering() && (state.q || state.person) && eventMatches(e);
          const rowH = cards ? CH + 8 : 18;
          const t = top + 28 + r * rowH;
          const tipText = `${fmt(e.date)}: ${e.title}`;
          if (cards) {
            body.push(`<button type="button" class="ev${dim ? ' dim' : ''}${hit ? ' hit' : ''}" data-ev="${e.id}" style="--c:${lane.c};left:${left}px;top:${t}px;width:${CW}px;height:${CH}px"><span class="when">${esc(fmt(e.date))}</span><b>${esc(e.title)}</b></button>`);
          } else {
            body.push(`<button type="button" class="ev dot${dim ? ' dim' : ''}${hit ? ' hit' : ''}" data-ev="${e.id}" data-tip="${esc(tipText)}" aria-label="${esc(tipText)}" style="--c:${lane.c};left:${left}px;top:${t}px"></button>`);
          }
        });
        const rowH = cards ? CH + 8 : 18;
        y = top + 28 + Math.max(1, rows.length) * rowH + 18;
      }
    });
    const H = Math.max(y + 10, stage.clientHeight);

    // year bands, month ticks
    for (let yr = 1995; yr <= 2001; yr++) {
      const a = Math.max(X(yr * 12), X(T0)), b = Math.min(X(yr * 12 + 12), X(T1));
      if (b <= a) continue;
      out.push(`<div class="year-band${yr % 2 ? ' odd' : ''}" style="left:${a}px;width:${b - a}px"><span class="year-label">${yr}</span></div>`);
    }
    const step = ppm >= 26 ? 1 : ppm >= 13 ? 3 : 6;
    for (let mi = T0; mi < T1; mi++) {
      const m = mi % 12;
      if (m % step) continue;
      const lab = ppm >= 40 ? MON[m] : MON[m][0];
      out.push(`<span class="month-tick" style="left:${X(mi + 0.5)}px">${lab}</span>`);
    }
    // the day Kennedy died
    const dx = X(mIndex('1999-07-16'));
    out.push(`<div class="today-line" style="left:${dx}px"><span>July 16, 1999</span></div>`);

    stage.innerHTML = `<div class="tl" style="width:${W}px;height:${H}px">${out.join('')}${body.join('')}</div>`;
  }

  function zoomTo(ppm, anchorClientX) {
    const rect = stage.getBoundingClientRect();
    const ax = anchorClientX == null ? rect.width / 2 : anchorClientX - rect.left;
    const mi = T0 + (stage.scrollLeft + ax - PAD) / state.ppm;
    state.ppm = Math.max(PMIN, Math.min(PMAX, ppm));
    $('#zoom').value = sliderFromPpm(state.ppm);
    renderTimeline();
    stage.scrollLeft = PAD + (mi - T0) * state.ppm - ax;
  }
  function fitAll() {
    const w = stage.clientWidth || 900;
    zoomTo((w - PAD * 2) / (T1 - T0));
    stage.scrollLeft = 0;
  }
  function scrollToDate(d) {
    if (state.view !== 'timeline') return;
    const x = X(mIndex(d, true));
    const want = x - stage.clientWidth / 2;
    if (x < stage.scrollLeft + 40 || x > stage.scrollLeft + stage.clientWidth - 80) stage.scrollTo({ left: Math.max(0, want), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  // ── Covers grid ────────────────────────────────────────────────────
  function renderCovers() {
    const list = ISS.filter(issueMatches);
    if (!list.length) { stage.innerHTML = `<div class="empty">No issues match. Clear the search or turn the confidence filters back on.</div>`; return; }
    const years = new Map();
    list.forEach((it) => { const y = parts(it.date).y; if (!years.has(y)) years.set(y, []); years.get(y).push(it); });
    stage.innerHTML = `<div class="flow-wrap">` + Array.from(years.entries()).map(([y, its]) =>
      `<section class="yr"><div class="yr-h"><h2>${y}</h2><span>${its.length} ${its.length === 1 ? 'issue' : 'issues'}${yearNote(y)}</span></div><div class="grid">` +
      its.map((it) => `<button type="button" class="card" data-issue="${it.id}">${coverHTML(it, '100%')}<div class="meta"><span class="d">${esc(it.label)} · No. ${it.n}</span><b>${esc((it.cover || []).join(' & ') || 'Not identified')}</b><span class="badge" style="--s:var(--sure-${it.sure})">${SURE[it.sure].label}</span></div></button>`).join('') +
      `</div></section>`).join('') + `</div>`;
  }
  function yearNote(y) {
    return ({ 1995: ' · bimonthly launch', 1996: ' · goes monthly in August', 1999: ' · Kennedy dies July 16', 2001: ' · Hachette closes George' })[y] || '';
  }

  // ── People view ────────────────────────────────────────────────────
  function renderPeopleView() {
    const q = state.q.toLowerCase();
    let list = peopleFiltered().filter((p) => !q || p.name.toLowerCase().includes(q));
    if (state.person) list = list.filter((p) => p.name === state.person);
    if (!list.length) { stage.innerHTML = `<div class="empty">No one matches.</div>`; return; }
    stage.innerHTML = `<div class="flow-wrap"><div class="ppl">` + list.map((p) => {
      const ids = p.cover.concat(p.inside);
      const roles = p.roles.map((r) => `<span class="role ${r}">${({ cover: 'On a cover', inside: 'Inside', staff: 'At George' })[r]}</span>`).join('');
      const bits = [];
      if (p.cover.length) bits.push(`Cover of ${p.cover.map((id) => byId.get(id).label).join(', ')}.`);
      if (p.inside.length) bits.push(`Inside ${p.inside.map((id) => byId.get(id).label).join(', ')}.`);
      p.staff.forEach((h) => bits.push(`${fmt(h.date)}: ${h.title}.`));
      p.notes.forEach((t) => bits.push(t));
      return `<article class="person"><h3>${esc(p.name)}</h3><div class="roles">${roles}</div>` +
        (ids.length ? `<div class="strip">${ids.map((id) => `<button type="button" data-issue="${id}" aria-label="${esc(byId.get(id).label)}">${coverHTML(byId.get(id), 54)}</button>`).join('')}</div>` : '') +
        `<p>${esc(bits.join(' '))}</p>` +
        `<div class="d-actions"><button type="button" class="btn ghost sm" data-person="${esc(p.name)}">${state.person === p.name ? 'Stop following' : 'Follow on the timeline'}</button></div></article>`;
    }).join('') + `</div></div>`;
  }

  // ── Render dispatch ────────────────────────────────────────────────
  function render() {
    $$('.seg-btn[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === state.view));
    $('#zoom-ctl').hidden = state.view !== 'timeline';
    stage.classList.toggle('flow', state.view !== 'timeline');
    stage.setAttribute('aria-label', ({ timeline: 'Timeline', covers: 'Covers', people: 'People' })[state.view]);
    renderFocus();
    if (state.view === 'timeline') renderTimeline();
    else if (state.view === 'covers') renderCovers();
    else renderPeopleView();
  }
  function setView(v) {
    if (state.view === v) return;
    state.view = v;
    store.set('view', v);
    stage.scrollTop = 0;
    render();
    if (v === 'timeline') stage.scrollLeft = 0;
    syncHash();
  }

  // ── Drawer ─────────────────────────────────────────────────────────
  function srcLinks(keys, inline) {
    const items = (keys || []).map((k) => G.sources[k]).filter(Boolean);
    if (!items.length) return '';
    if (inline) return items.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">Source</a>`).join(' · ');
    return `<ul>${items.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>`;
  }
  function googleURL(it) {
    const q = `"George" magazine ${it.label} ${(it.cover || []).join(' ')} cover`;
    return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q.replace(/\s+/g, ' ').trim());
  }

  function openIssue(id, editing) {
    const it = byId.get(id);
    if (!it) return;
    state.open = { type: 'issue', id };
    const i = ISS.indexOf(it);
    const prev = ISS[i - 1], next = ISS[i + 1];
    const names = (it.cover || []).join(' & ');
    const edited = !!edits[id];
    const imgEdited = edited && edits[id].img;
    let html = `<div class="d-cover">${coverHTML(it, 150)}<div class="d-head"><div class="d">${esc(it.label)} · Issue ${it.n} of ${TOTAL}</div><h2>${esc(names || 'Cover not identified')}</h2>${it.concept ? `<p class="concept">${esc(it.concept)}</p>` : ''}</div></div>`;
    html += `<div class="sure-box" style="--s:var(--sure-${it.sure})"><b>${SURE[it.sure].label}.</b> ${esc(SURE[it.sure].long)}${edited ? ' <i>Includes your edits.</i>' : ''}</div>`;
    if (editing) {
      html += `<form class="form" id="edit-form">
        <label>On the cover (separate names with commas)<input id="f-cover" value="${esc((it.cover || []).join(', '))}"></label>
        <label>How they were shown<input id="f-concept" value="${esc(it.concept)}"></label>
        <label>Photographer<input id="f-photo" value="${esc(it.photo)}"></label>
        <label>Cover lines (one per line)<textarea id="f-lines">${esc((it.lines || []).join('\n'))}</textarea></label>
        <label>Notes<textarea id="f-notes">${esc(it.notes)}</textarea></label>
        <label>How sure<select id="f-sure">${Object.keys(SURE).map((k) => `<option value="${k}"${k === it.sure ? ' selected' : ''}>${SURE[k].label}</option>`).join('')}</select></label>
        <div class="d-actions"><button type="submit" class="btn">Save</button><button type="button" class="btn ghost" data-act="cancel-edit">Cancel</button>${edited ? '<button type="button" class="btn danger" data-act="reset">Undo all my changes to this issue</button>' : ''}</div>
      </form>`;
    } else {
      if ((it.lines || []).length) html += `<div class="d-sec"><h3>Cover lines</h3><div class="lines">${it.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div></div>`;
      if (it.photo) html += `<div class="d-sec"><h3>Cover photograph</h3><p>${esc(it.photo)}</p></div>`;
      if ((it.inside || []).length) html += `<div class="d-sec"><h3>Inside</h3><ul>${it.inside.map((f) => `<li><span class="k">${f.k === 'interview' ? 'Interview' : 'Feature'}</span>${f.who ? `<b>${esc(f.who)}</b>. ` : ''}${esc(f.text)}</li>`).join('')}</ul></div>`;
      if (it.notes) html += `<div class="d-sec"><h3>Notes</h3><p>${esc(it.notes)}</p></div>`;
      html += `<div class="d-actions"><button type="button" class="btn ghost sm" data-act="edit">Edit details</button>${names ? (it.cover || []).map((n) => `<button type="button" class="btn ghost sm" data-person="${esc(n)}">Follow ${esc(n)}</button>`).join('') : ''}</div>`;
    }
    html += `<div class="d-sec find"><h3>Cover image</h3>
      <p>${it.img ? 'This issue has a cover image.' : 'No image yet, so the app draws one.'} Find the real cover on Google Images, then drop the picture here, paste it, or paste its link.</p>
      <p id="img-status" hidden><b>That image link didn't load.</b> The site may block its images from showing elsewhere. Save the picture and add it as a file instead.</p>
      <div class="d-actions"><a class="btn sm" href="${esc(googleURL(it))}" target="_blank" rel="noopener">Search Google Images</a>${imgEdited ? '<button type="button" class="btn ghost sm" data-act="rm-img">Remove my image</button>' : ''}</div>
      <label class="drop" id="drop" for="f-file">Drop a cover image here, paste one, or choose a file</label>
      <input type="file" id="f-file" accept="image/*" hidden>
      <form class="row" id="img-form"><input type="url" id="f-img" placeholder="https://… image link" aria-label="Cover image link"><button type="submit" class="btn ghost sm">Use link</button></form>
    </div>`;
    if ((it.src || []).length) html += `<div class="d-sec d-sources"><h3>Sources</h3>${srcLinks(it.src)}</div>`;
    html += `<div class="d-nav">${prev ? `<button type="button" class="btn ghost sm" data-issue="${prev.id}">← ${esc(prev.label)}</button>` : '<span></span>'}${next ? `<button type="button" class="btn ghost sm" data-issue="${next.id}">${esc(next.label)} →</button>` : ''}</div>`;
    dBody.innerHTML = html;
    if (failedImgs.has(it.img)) $('#img-status').hidden = false;
    showDrawer();
    scrollToDate(it.date);
    markOpen();
    syncHash();
  }

  function openEvent(id) {
    const e = evById.get(id);
    if (!e) return;
    if (e.kind === 'inside') { openIssue(e.issue); return; }
    state.open = { type: 'event', id };
    const lane = LANES.find((l) => l.id === e.kind);
    const mi = Math.floor(mIndex(e.date, true));
    const onSale = ISS.find((it) => mIndex(it.date) <= mi && mi < mIndex(it.date) + it.span);
    let html = `<div class="d-head"><div class="d">${esc(lane.label)} · ${esc(fmt(e.date))}</div><h2>${esc(e.title)}</h2></div><div class="d-sec"><p>${esc(e.text)}</p></div>`;
    if ((e.people || []).length) html += `<div class="d-actions">${e.people.map((n) => `<button type="button" class="btn ghost sm" data-person="${esc(n)}">Follow ${esc(n)}</button>`).join('')}</div>`;
    if (onSale) html += `<div class="d-sec"><h3>The issue dated that month</h3><button type="button" class="onsale" data-issue="${onSale.id}">${coverHTML(onSale, 90)}<div class="meta"><span class="d">${esc(onSale.label)}</span><b>${esc((onSale.cover || []).join(' & ') || 'Not identified')}</b></div></button></div>`;
    if ((e.src || []).length) html += `<div class="d-sec d-sources"><h3>Sources</h3>${srcLinks(e.src)}</div>`;
    dBody.innerHTML = html;
    showDrawer();
    scrollToDate(e.date);
    markOpen();
    syncHash();
  }
  function showDrawer() { drawer.hidden = false; dBody.scrollTop = 0; drawer.scrollTop = 0; }
  function closeDrawer() { drawer.hidden = true; state.open = null; markOpen(); syncHash(); }
  function markOpen() {
    $$('[aria-current="true"]', stage).forEach((n) => n.removeAttribute('aria-current'));
    if (!state.open) return;
    const sel = state.open.type === 'issue' ? `[data-issue="${state.open.id}"]` : `[data-ev="${state.open.id}"]`;
    $$(sel, stage).forEach((n) => n.setAttribute('aria-current', 'true'));
  }

  function saveEdits() {
    if (!store.set('edits', edits)) { toast("Couldn't save: this browser's storage is full or turned off."); return false; }
    return true;
  }
  function patchIssue(id, patch) {
    const baseIt = BASE.find((b) => b.id === id);
    const cur = Object.assign({}, edits[id] || {}, patch);
    // drop fields that match the original
    Object.keys(cur).forEach((k) => { if (JSON.stringify(cur[k]) === JSON.stringify(baseIt[k])) delete cur[k]; });
    if (Object.keys(cur).length) edits[id] = cur; else delete edits[id];
    const ok = saveEdits();
    rebuild();
    renderSide();
    render();
    openIssue(id);
    return ok;
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('That file is not an image.')); return; }
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("Couldn't read that file."));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Couldn't open that image."));
        img.onload = () => {
          const s = Math.min(1, 520 / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function addImageFile(file) {
    if (!state.open || state.open.type !== 'issue') return;
    const id = state.open.id;
    readImage(file).then((url) => { if (patchIssue(id, { img: url })) toast('Cover saved in this browser'); }).catch((err) => toast(err.message));
  }

  // ── Edits modal ────────────────────────────────────────────────────
  function openExport() {
    const n = Object.keys(edits).length;
    $('#modal-body').innerHTML = `<h2 id="modal-title">Your edits</h2>
      <p>${n ? `You've changed ${n} ${n === 1 ? 'issue' : 'issues'}. Your changes and covers are saved in this browser only.` : "You haven't changed anything yet. Open an issue and use Edit details, or add a cover image."} Copy this text to keep it or to add it to <code>data.js</code>. To bring edits in from elsewhere, paste them here and apply them.</p>
      <textarea id="export-text" spellcheck="false" aria-label="Your edits as JSON">${esc(JSON.stringify({ app: 'by-george', version: 1, edits }, null, 2))}</textarea>
      <div class="d-actions"><button type="button" class="btn" data-act="copy">Copy</button><button type="button" class="btn ghost" data-act="import">Apply pasted edits</button>${n ? '<button type="button" class="btn danger" data-act="clear-ask">Clear all edits</button>' : ''}</div>
      <div id="confirm-slot"></div>`;
    modal.hidden = false;
  }

  // ── Hash routing ───────────────────────────────────────────────────
  let hashLock = false;
  function syncHash() {
    const h = state.open && state.open.type === 'issue' ? 'issue-' + state.open.id : state.view;
    if (location.hash.slice(1) !== h) { hashLock = true; try { history.replaceState(null, '', '#' + h); } catch (e) { location.hash = h; } setTimeout(() => { hashLock = false; }, 0); }
  }
  function readHash() {
    const h = location.hash.slice(1);
    if (/^issue-\d{4}-\d{2}$/.test(h) && byId.has(h.slice(6))) return { issue: h.slice(6) };
    if (['timeline', 'covers', 'people'].includes(h)) return { view: h };
    return {};
  }
  window.addEventListener('hashchange', () => {
    if (hashLock) return;
    const r = readHash();
    if (r.view) { setView(r.view); if (state.open) closeDrawer(); }
    if (r.issue) openIssue(r.issue);
  });

  // ── Events ─────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (dragMoved) { dragMoved = false; if (stage.contains(e.target)) { e.preventDefault(); e.stopPropagation(); return; } }
    const t = e.target.closest('button, a, label');
    if (!t) return;
    if (t.dataset.view) { setView(t.dataset.view); return; }
    if (t.dataset.issue) { openIssue(t.dataset.issue); return; }
    if (t.dataset.ev) { openEvent(t.dataset.ev); return; }
    if (t.dataset.lane) { state.lanes[t.dataset.lane] = !state.lanes[t.dataset.lane]; store.set('lanes', state.lanes); renderSide(); render(); markOpen(); return; }
    if (t.dataset.sure) { state.sure[t.dataset.sure] = !state.sure[t.dataset.sure]; store.set('sure', state.sure); renderSide(); render(); markOpen(); return; }
    if (t.dataset.role) { state.role = t.dataset.role; renderSide(); if (state.view === 'people') render(); return; }
    if (t.dataset.person) {
      state.person = state.person === t.dataset.person ? '' : t.dataset.person;
      renderPeopleList(); render(); markOpen();
      if (state.person) {
        const first = ISS.find(issueMatches);
        if (first) scrollToDate(first.date);
        toast(`Following ${state.person}`);
      }
      closeSide();
      return;
    }
    if (t.dataset.clear) { state[t.dataset.clear] = ''; if (t.dataset.clear === 'q') $('#q').value = ''; renderPeopleList(); render(); markOpen(); return; }
    const act = t.dataset.act;
    if (!act) return;
    if (act === 'edit' && state.open) openIssue(state.open.id, true);
    else if (act === 'cancel-edit' && state.open) openIssue(state.open.id);
    else if (act === 'reset' && state.open) { const id = state.open.id; delete edits[id]; saveEdits(); rebuild(); renderSide(); render(); openIssue(id); toast('Back to the original details'); }
    else if (act === 'rm-img' && state.open) { patchIssue(state.open.id, { img: BASE.find((b) => b.id === state.open.id).img }); toast('Image removed'); }
    else if (act === 'copy') {
      const ta = $('#export-text');
      const done = () => toast('Copied');
      const fallback = () => { ta.focus(); ta.select(); toast('Selected. Press Ctrl+C or ⌘C to copy.'); };
      try { navigator.clipboard.writeText(ta.value).then(done, fallback); } catch (err) { fallback(); }
    } else if (act === 'import') {
      try {
        const data = JSON.parse($('#export-text').value);
        const inc = data && data.edits ? data.edits : data;
        let n = 0;
        Object.keys(inc || {}).forEach((id) => { if (byId.has(id) && inc[id] && typeof inc[id] === 'object') { edits[id] = Object.assign({}, edits[id] || {}, inc[id]); n++; } });
        saveEdits(); rebuild(); renderSide(); render();
        modal.hidden = true;
        toast(n ? `Applied edits to ${n} ${n === 1 ? 'issue' : 'issues'}` : 'Nothing to apply');
      } catch (err) { toast("That text isn't valid edits JSON."); }
    } else if (act === 'clear-ask') {
      $('#confirm-slot').innerHTML = `<div class="confirm">Delete every edit and uploaded cover in this browser?<button type="button" class="btn danger sm" data-act="clear-yes">Delete them</button><button type="button" class="btn ghost sm" data-act="clear-no">Keep them</button></div>`;
    } else if (act === 'clear-no') { $('#confirm-slot').innerHTML = ''; }
    else if (act === 'clear-yes') { edits = {}; saveEdits(); rebuild(); renderSide(); render(); modal.hidden = true; if (state.open && state.open.type === 'issue') openIssue(state.open.id); toast('All edits cleared'); }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.open) return;
    const id = state.open.id;
    if (e.target.id === 'edit-form') {
      const list = (v, sep) => v.split(sep).map((s) => s.trim()).filter(Boolean);
      patchIssue(id, {
        cover: list($('#f-cover').value, ','),
        concept: $('#f-concept').value.trim(),
        photo: $('#f-photo').value.trim(),
        lines: list($('#f-lines').value, '\n'),
        notes: $('#f-notes').value.trim(),
        sure: $('#f-sure').value
      });
      toast('Saved in this browser');
    } else if (e.target.id === 'img-form') {
      const url = $('#f-img').value.trim();
      if (!/^https?:\/\//i.test(url)) { toast('Paste a link that starts with http:// or https://'); return; }
      failedImgs.delete(url);
      if (patchIssue(id, { img: url })) toast('Image link saved');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-file' && e.target.files[0]) addImageFile(e.target.files[0]);
  });
  drawer.addEventListener('dragover', (e) => { const d = $('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  drawer.addEventListener('dragleave', (e) => { const d = $('#drop'); if (d && !drawer.contains(e.relatedTarget)) d.classList.remove('over'); });
  drawer.addEventListener('drop', (e) => {
    const d = $('#drop');
    if (!d) return;
    e.preventDefault(); d.classList.remove('over');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { addImageFile(f); return; }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (/^https?:\/\//i.test(url || '') && state.open) { patchIssue(state.open.id, { img: url.trim() }); toast('Image link saved'); }
  });
  document.addEventListener('paste', (e) => {
    if (drawer.hidden || !state.open || state.open.type !== 'issue' || !e.clipboardData) return;
    const item = Array.from(e.clipboardData.items || []).find((i) => i.kind === 'file' && /^image\//.test(i.type));
    if (item) { e.preventDefault(); addImageFile(item.getAsFile()); }
  });

  let qT = 0;
  $('#q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); render(); markOpen(); }, 120); });
  $('#people-q').addEventListener('input', (e) => { state.peopleQ = e.target.value.trim(); renderPeopleList(); if (state.view === 'people') render(); });
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#btn-export').addEventListener('click', openExport);
  $('#modal-close').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  // zoom controls
  $('#zoom').addEventListener('input', (e) => zoomTo(ppmFromSlider(+e.target.value)));
  $('#zoom-in').addEventListener('click', () => zoomTo(state.ppm * 1.35));
  $('#zoom-out').addEventListener('click', () => zoomTo(state.ppm / 1.35));
  $('#zoom-fit').addEventListener('click', fitAll);
  stage.addEventListener('wheel', (e) => {
    if (state.view !== 'timeline') return;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTo(state.ppm * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX); }
    else if (e.shiftKey) { e.preventDefault(); stage.scrollTop += e.deltaY || e.deltaX; }
    else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); stage.scrollLeft += e.deltaY; }
  }, { passive: false });

  // drag to pan
  let drag = null, dragMoved = false;
  stage.addEventListener('pointerdown', (e) => {
    if (state.view !== 'timeline' || e.button !== 0 || e.pointerType === 'touch') return;
    drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
    dragMoved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragMoved && Math.abs(dx) + Math.abs(dy) > 5) { dragMoved = true; stage.classList.add('dragging'); }
    if (dragMoved) { stage.scrollLeft = drag.l - dx; stage.scrollTop = drag.t - dy; }
  });
  window.addEventListener('pointerup', () => { if (drag) { drag = null; stage.classList.remove('dragging'); setTimeout(() => { dragMoved = false; }, 0); } });

  // keyboard
  stage.addEventListener('keydown', (e) => {
    if (state.view !== 'timeline') return;
    if (e.key === 'ArrowRight') { stage.scrollLeft += 160; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { stage.scrollLeft -= 160; e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomTo(state.ppm * 1.25); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { zoomTo(state.ppm / 1.25); e.preventDefault(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) modal.hidden = true;
    else if (!drawer.hidden) closeDrawer();
    else closeSide();
  });

  // tooltip
  stage.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.dataset.tip; tip.hidden = false;
  });
  stage.addEventListener('mousemove', (e) => {
    if (tip.hidden) return;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 16) + 'px';
  });
  stage.addEventListener('mouseleave', () => { tip.hidden = true; });

  // narrow-screen sidebar
  const side = $('#side'), backdrop = $('#side-backdrop'), sideBtn = $('#btn-side');
  function closeSide() { side.classList.remove('open'); backdrop.hidden = true; sideBtn.setAttribute('aria-expanded', 'false'); }
  sideBtn.addEventListener('click', () => { const open = !side.classList.contains('open'); side.classList.toggle('open', open); backdrop.hidden = !open; sideBtn.setAttribute('aria-expanded', String(open)); });
  backdrop.addEventListener('click', closeSide);

  let rT = 0;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (state.view === 'timeline') renderTimeline(); markOpen(); }, 150); });

  // ── Start ──────────────────────────────────────────────────────────
  rebuild();
  const h = readHash();
  state.view = h.view || store.get('view', 'timeline');
  if (!['timeline', 'covers', 'people'].includes(state.view)) state.view = 'timeline';
  if (window.innerWidth < 600) state.ppm = 60;
  $('#zoom').value = sliderFromPpm(state.ppm);
  renderSide();
  render();
  if (h.issue) openIssue(h.issue);
})();
