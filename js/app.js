(() => {
  'use strict';

  const T = window.TIMELINE || {};
  const MIN_YEAR = 1935;
  const MAX_YEAR = new Date().getFullYear() + 2;
  let PADL = 40; // left padding of the time axis; the series view adds its label column
  const PADR = 120;
  const LANE_HEAD = 38;
  const BAND_H = 26;
  const MAX_PPY = 1800;

  const TYPES = {
    first: { label: 'First appearances', short: 'First appearance' },
    launch: { label: 'Series launches', short: 'Series launch' },
    key: { label: 'Key stories', short: 'Key story' },
    event: { label: 'Events', short: 'Event' },
    tiein: { label: 'Tie-ins', short: 'Tie-in' },
    milestone: { label: 'History', short: 'Industry history' }
  };
  const PUBS = {
    marvel: { label: 'Marvel', brand: 'Marvel' },
    dc: { label: 'DC', brand: 'DC' },
    crossover: { label: 'Marvel × DC', brand: 'Marvel × DC' }
  };
  // Era boundaries are the conventional collector ones; historians argue the edges.
  const ERAS = [
    { name: 'Platinum', start: MIN_YEAR, end: 1938 },
    { name: 'Golden Age', start: 1938, end: 1956 },
    { name: 'Silver Age', start: 1956, end: 1970 },
    { name: 'Bronze Age', start: 1970, end: 1985 },
    { name: 'Copper Age', start: 1985, end: 1992 },
    { name: 'Modern Age', start: 1992, end: MAX_YEAR }
  ];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SIZES = {
    full: { w: 92, h: 182, gap: 10 },
    mini: { w: 34, h: 51, gap: 4 },
    dot: { w: 10, h: 10, gap: 3 }
  };

  // ── Storage (per-browser; everything still works without it) ──────
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('longbox.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('longbox.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const list = (v) => Array.isArray(v) ? v.filter(Boolean) : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

  function toYear(d) {
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(d || ''));
    if (!m) return NaN;
    return m[2] ? +m[1] + (+m[2] - 1) / 12 : +m[1] + 0.5;
  }
  function fmtDate(d) {
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(d || ''));
    if (!m) return 'Undated';
    return m[2] ? `${MONTHS[+m[2] - 1]} ${m[1]}` : m[1];
  }
  function fmtRange(a, b) {
    if (!b || a === b) return fmtDate(a);
    return `${fmtDate(a)} – ${fmtDate(b)}`;
  }
  function label(it) { return it.issue ? `${it.title} #${it.issue}` : it.title; }

  // ── Data ─────────────────────────────────────────────────────────
  let ITEMS = [];
  let BYID = {};
  let ROLE = {};
  let CHAR_STATS = [];
  let CREATOR_STATS = [];

  function buildData() {
    const edits = store.get('edits', {});
    const added = store.get('added', []);
    const out = [];
    const seen = {};
    const push = (raw, pub) => {
      const it = Object.assign({ characters: [], writers: [], artists: [], summary: '', issue: '', cover: '', event: '' }, raw);
      it.publisher = it.publisher || pub;
      if (!it.id) {
        const base = slug(`${it.publisher}-${it.title}-${it.issue || ''}-${it.date}`);
        let id = base, n = 2;
        while (seen[id]) id = `${base}-${n++}`;
        it.id = id;
      }
      seen[it.id] = 1;
      out.push(it);
    };
    (T.marvel || []).forEach((r) => push(r, 'marvel'));
    (T.dc || []).forEach((r) => push(r, 'dc'));
    (T.crossover || []).forEach((r) => push(r, 'crossover'));
    (T.events || []).forEach((e) => push({
      id: 'event-' + e.id, publisher: e.publisher, date: e.start, end: e.end, title: e.name, issue: '',
      type: 'event', event: e.id, series: e.series, writers: e.writers || [], artists: e.artists || [],
      summary: e.summary, characters: e.characters || []
    }, e.publisher));
    added.forEach((r) => push(Object.assign({}, r, { added: true }), r.publisher || 'marvel'));

    out.forEach((it) => {
      const ed = edits[it.id];
      if (ed) { Object.assign(it, ed); it.edited = true; }
      ['characters', 'writers', 'artists'].forEach((k) => { it[k] = list(it[k]); });
      it.y = toYear(it.date);
      it.ownChars = it.characters.slice();
      if (!it.cover && T.covers) it.cover = T.covers[coverKey(it)] || '';
    });

    BYID = {};
    out.forEach((it) => { BYID[it.id] = it; });

    // An event card picks up every character from its tie-ins, so following
    // a character also surfaces the events they were swept into.
    out.forEach((it) => {
      if (it.type === 'event' || !it.event) return;
      const ev = BYID['event-' + it.event];
      if (!ev) return;
      it.characters.forEach((c) => { if (!ev.characters.includes(c)) ev.characters.push(c); });
    });

    out.forEach((it) => {
      const ev = it.event ? BYID['event-' + it.event] : null;
      it.hay = [it.title, it.issue && '#' + it.issue, it.series, it.summary, ev && ev.title,
        it.characters.join(' '), it.writers.join(' '), it.artists.join(' '), it.date].filter(Boolean).join(' ').toLowerCase();
    });

    ITEMS = out.filter((it) => !isNaN(it.y)).sort((a, b) => a.y - b.y || (a.type === 'event') - (b.type === 'event'));

    if (typeof linkSeries === 'function') linkSeries();
    ROLE = {};
    ((T.roles && T.roles.hero) || []).forEach((n) => { ROLE[n] = 'hero'; });
    ((T.roles && T.roles.villain) || []).forEach((n) => { ROLE[n] = 'villain'; });
  }

  // Must match keyOf() in tools/fetch-covers.mjs.
  function coverKey(it) { return [it.publisher, it.title, it.issue || '', it.date].join('|'); }
  function eventOf(it) { return it && it.event ? BYID['event-' + it.event] : null; }
  function eventParts(evItem) {
    return ITEMS.filter((i) => i.event === evItem.event && i.id !== evItem.id);
  }

  // ── State ────────────────────────────────────────────────────────
  const saved = store.get('prefs', {});
  const state = {
    pub: saved.pub || 'both',
    view: saved.view || 'timeline',
    types: new Set(saved.types || Object.keys(TYPES)),
    q: '',
    char: null,
    creator: null,
    event: null,
    role: 'all',
    charQ: '',
    creatorQ: '',
    ppy: saved.ppy || 0, // 0 = first visit: open on the whole-history overview
    selected: null
  };
  function savePrefs() {
    store.set('prefs', { pub: state.pub, view: state.view, types: [...state.types], ppy: state.ppy, svGroup: state.svGroup });
  }

  function inPub(it) {
    return state.pub === 'both' || it.publisher === state.pub || it.publisher === 'crossover';
  }
  function matches(it, ignore) {
    if (!inPub(it)) return false;
    if (ignore !== 'type' && !state.types.has(it.type)) return false;
    if (state.char && !it.characters.includes(state.char)) return false;
    if (state.creator && !it.writers.includes(state.creator) && !it.artists.includes(state.creator)) return false;
    if (state.event && it.event !== state.event) return false;
    if (state.q) {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.every((w) => it.hay.includes(w))) return false;
    }
    return true;
  }

  // ── Elements ─────────────────────────────────────────────────────
  const stage = $('#stage');
  const drawer = $('#drawer');
  const drawerBody = $('#drawer-body');
  const tip = $('#tip');
  const mmCanvas = $('#mm-canvas');
  const mmWindow = $('#mm-window');
  const zoomInput = $('#zoom');

  // ── Covers ───────────────────────────────────────────────────────
  function coverHtml(it, size) {
    const h = hash(it.title) % 360;
    const brand = it.type === 'milestone' ? 'History' : it.type === 'event' ? `${PUBS[it.publisher].brand} event` : PUBS[it.publisher].brand;
    const num = it.issue ? '#' + it.issue : it.type === 'event' ? 'EVENT' : it.type === 'milestone' ? String(it.date).slice(0, 4) : 'GN';
    const img = it.cover ? `<img src="${esc(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
    if (size === 'mini') {
      return `<span class="cv cv-mini" style="--h:${h}"><span class="cv-brand">${esc(it.publisher === 'crossover' ? 'M×DC' : PUBS[it.publisher].brand)}</span><span class="cv-num">${esc(it.issue ? '#' + it.issue : '★')}</span>${img}</span>`;
    }
    return `<span class="cv" style="--h:${h}"><span class="cv-brand">${esc(brand)}</span><span class="cv-title">${esc(it.title)}</span><span class="cv-num">${esc(num)}</span><span class="cv-year">${esc(String(it.date).slice(0, 4))}</span>${img}</span>`;
  }

  function cardHtml(it, mode, left, top) {
    const cls = `it it-${mode} pub-${it.publisher} t-${it.type}${state.selected === it.id ? ' sel' : ''}`;
    const pos = left == null ? '' : ` style="left:${left.toFixed(1)}px;top:${top}px"`;
    const aria = `aria-label="${esc(label(it) + ', ' + fmtDate(it.date) + ', ' + TYPES[it.type].short)}"`;
    if (mode === 'dot') return `<button type="button" class="${cls}" data-id="${esc(it.id)}"${pos} ${aria}></button>`;
    const inner = coverHtml(it, mode === 'mini' ? 'mini' : 'full');
    const cap = mode === 'full' ? `<span class="cap"><b>${esc(label(it))}</b><i>${esc(fmtDate(it.date))}</i></span>` : '';
    return `<button type="button" class="${cls}" data-id="${esc(it.id)}"${pos} ${aria}>${inner}${cap}</button>`;
  }

  // ── Timeline ─────────────────────────────────────────────────────
  const X = (y) => PADL + (y - MIN_YEAR) * state.ppy;
  const yearAt = (px) => (px - PADL) / state.ppy + MIN_YEAR;
  const canvasWidth = () => PADL + (MAX_YEAR - MIN_YEAR) * state.ppy + PADR;
  function fitPpy() { return Math.max(4, (stage.clientWidth - PADL - PADR + 60) / (MAX_YEAR - MIN_YEAR)); }
  const timeView = () => state.view === 'timeline' || state.view === 'series';
  function setPadl() { PADL = state.view === 'series' ? LABEL_W() + 24 : 40; }
  function renderTime() { if (state.view === 'series') renderSeries(); else renderTimeline(); }
  function zoomMode() { return state.ppy >= 300 ? 'full' : state.ppy >= 80 ? 'mini' : 'dot'; }
  function lanes() { return state.pub === 'both' ? ['marvel', 'crossover', 'dc'] : [state.pub, 'crossover']; }

  function axisHtml() {
    const ppy = state.ppy;
    let h = '';
    ERAS.forEach((e) => {
      const l = X(e.start), w = X(e.end) - l;
      const yrs = e.end >= MAX_YEAR ? `${e.start}–now` : `${e.start}–${e.end}`;
      const txt = w > 70 ? `<span>${esc(e.name)}${w > 150 ? `<small>${yrs}</small>` : ''}</span>` : '';
      h += `<button type="button" class="era-lbl" data-year="${e.start}" style="left:${l}px;width:${w}px" title="${esc(e.name)} (${yrs})" aria-label="Jump to the ${esc(e.name)}">${txt}</button>`;
    });
    const step = ppy >= 55 ? 1 : ppy >= 22 ? 5 : 10;
    for (let y = Math.ceil(MIN_YEAR / step) * step; y < MAX_YEAR; y += step) {
      const dec = y % 10 === 0;
      const txt = step === 1 && !dec && ppy < 90 ? `'${String(y).slice(2)}` : y;
      h += `<span class="yr-lbl${dec ? ' dec' : ''}" style="left:${X(y + (step === 1 ? 0.5 : 0))}px">${txt}</span>`;
    }
    if (ppy >= 700) {
      for (let y = MIN_YEAR; y < MAX_YEAR; y++) {
        for (let m = 1; m < 12; m += 1) {
          if (m % 3) continue;
          h += `<span class="yr-lbl" style="left:${X(y + m / 12 + 1 / 24)}px;opacity:.6">${MONTHS[m]}</span>`;
        }
      }
    }
    return h;
  }

  function bgHtml() {
    let h = '';
    ERAS.forEach((e, i) => {
      h += `<div class="era-stripe${i % 2 ? ' alt' : ''}" style="left:${X(e.start)}px;width:${X(e.end) - X(e.start)}px"></div>`;
    });
    const step = state.ppy >= 55 ? 1 : 10;
    for (let y = Math.ceil(MIN_YEAR / step) * step; y <= MAX_YEAR; y += step) {
      h += `<div class="vline${y % 10 ? ' minor' : ''}" style="left:${X(y)}px"></div>`;
    }
    return h;
  }

  function renderTimeline() {
    const mode = zoomMode();
    const S = SIZES[mode];
    const vis = ITEMS.filter((it) => matches(it));
    const width = canvasWidth();
    let lanesHtml = '';

    for (const pub of lanes()) {
      const issues = vis.filter((i) => i.publisher === pub && i.type !== 'event');
      const evs = vis.filter((i) => i.publisher === pub && i.type === 'event');
      if (!issues.length && !evs.length) continue;

      // Event bands, packed into rows so labels don't collide.
      const bandEnds = [];
      let bands = '';
      const showLabels = state.ppy >= 14;
      for (const e of evs) {
        const x1 = X(e.y);
        const x2 = X(toYear(e.end || e.date) + 1 / 12);
        const w = Math.max(5, x2 - x1);
        const need = Math.max(w, showLabels ? e.title.length * 6.2 + 12 : 0) + 6;
        let r = bandEnds.findIndex((end) => end <= x1);
        if (r < 0) { r = bandEnds.length; bandEnds.push(0); }
        bandEnds[r] = x1 + need;
        bands += `<button type="button" class="band pub-${pub}${showLabels ? '' : ' compact'}${state.selected === e.id ? ' sel' : ''}" data-id="${esc(e.id)}" style="left:${x1.toFixed(1)}px;top:${r * BAND_H}px;width:${w.toFixed(1)}px" aria-label="${esc(e.title + ', ' + fmtRange(e.date, e.end))}"><span class="bar"></span><span class="lbl">${esc(e.title)}</span></button>`;
      }
      const bandsH = bandEnds.length ? bandEnds.length * BAND_H + 8 : 0;

      // Issues, packed greedily into rows.
      const rowEnds = [];
      let cards = '';
      for (const it of issues) {
        const left = X(it.y) - S.w / 2;
        let r = rowEnds.findIndex((end) => end + S.gap <= left);
        if (r < 0) { r = rowEnds.length; rowEnds.push(-Infinity); }
        rowEnds[r] = left + S.w;
        cards += cardHtml(it, mode, left, bandsH + r * (S.h + S.gap));
      }
      const laneH = LANE_HEAD + bandsH + rowEnds.length * (S.h + S.gap) + 18;
      const nIss = issues.length, nEv = evs.length;
      lanesHtml += `<section class="lane lane-${pub}" style="height:${laneH}px">
        <div class="lane-head"><span class="lane-name">${esc(PUBS[pub].label)}</span><span class="lane-count">${nIss} issue${nIss === 1 ? '' : 's'} · ${nEv} event${nEv === 1 ? '' : 's'}</span></div>
        <div class="lane-body" style="top:${LANE_HEAD}px">${bands}${cards}</div>
      </section>`;
    }

    if (!lanesHtml) {
      stage.innerHTML = emptyHtml();
      return;
    }
    stage.innerHTML = `<div class="tl" style="width:${width}px">
      <div class="tl-bg">${bgHtml()}</div>
      <div class="tl-axis">${axisHtml()}</div>
      <div class="tl-lanes">${lanesHtml}</div>
    </div>`;
  }

  function emptyHtml() {
    return `<div class="empty-state"><h3>Nothing matches</h3><p>Try clearing a filter, or switch publishers.</p><p><button type="button" class="btn ghost" data-act="clear-all">Clear all filters</button></p></div>`;
  }

  // ── Cover grid ───────────────────────────────────────────────────
  function renderGrid() {
    const vis = ITEMS.filter((it) => matches(it));
    if (!vis.length) { stage.innerHTML = emptyHtml(); return; }
    const decades = new Map();
    vis.forEach((it) => {
      const y = Math.floor(it.y);
      const d = Math.floor(y / 10) * 10;
      if (!decades.has(d)) decades.set(d, new Map());
      const yrs = decades.get(d);
      if (!yrs.has(y)) yrs.set(y, []);
      yrs.get(y).push(it);
    });
    let h = '<div class="grid-view">';
    decades.forEach((yrs, d) => {
      const n = [...yrs.values()].reduce((a, b) => a + b.length, 0);
      const era = ERAS.filter((e) => e.start < d + 10 && e.end > d).map((e) => e.name).join(' / ');
      h += `<section class="decade"><h2 class="decade-h">${d}s<small>${n} entries<br>${esc(era)}</small></h2><div class="years">`;
      yrs.forEach((its, y) => {
        h += `<div class="year"><div class="year-h">${y}</div><div class="year-cards">${its.map((it) => cardHtml(it, 'full')).join('')}</div></div>`;
      });
      h += '</div></section>';
    });
    stage.innerHTML = h + '</div>';
  }

  // ── Minimap ──────────────────────────────────────────────────────
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function drawMinimap() {
    const box = mmCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mmCanvas.width = Math.round(box.width * dpr);
    mmCanvas.height = Math.round(box.height * dpr);
    const ctx = mmCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = box.width, H = box.height;
    const span = MAX_YEAR - MIN_YEAR;
    const px = (y) => ((y - MIN_YEAR) / span) * W;
    const colors = { marvel: cssVar('--marvel'), dc: cssVar('--dc'), crossover: cssVar('--cross') };
    const evColor = cssVar('--t-event');

    ctx.fillStyle = cssVar('--stripe') || 'rgba(0,0,0,.04)';
    ERAS.forEach((e, i) => { if (i % 2) ctx.fillRect(px(e.start), 0, px(e.end) - px(e.start), H); });

    const vis = ITEMS.filter((it) => matches(it));
    const counts = {};
    let max = 1;
    const bump = (y, pub) => {
      const c = counts[y] || (counts[y] = { marvel: 0, dc: 0, crossover: 0 });
      c[pub] = (c[pub] || 0) + 1;
      max = Math.max(max, c.marvel + c.dc + c.crossover);
    };
    // In the series view the bars count every issue of the series shown.
    if (state.view === 'series' && SV.list) SV.list.forEach((s) => s.ys.forEach((y) => bump(Math.floor(y), s.pub)));
    else vis.forEach((it) => { if (it.type !== 'event') bump(Math.floor(it.y), it.publisher); });
    const bw = Math.max(1, W / span - 1);
    const base = H - 14;
    const scale = (base - 12) / max;
    Object.keys(counts).forEach((y) => {
      let yy = base;
      ['marvel', 'crossover', 'dc'].forEach((p) => {
        const n = counts[y][p];
        if (!n) return;
        ctx.fillStyle = colors[p];
        ctx.fillRect(px(+y), yy - n * scale, bw, n * scale);
        yy -= n * scale;
      });
    });
    ctx.fillStyle = evColor;
    vis.forEach((it) => {
      if (it.type !== 'event') return;
      const x1 = px(it.y), x2 = px(toYear(it.end || it.date) + 1 / 12);
      ctx.fillRect(x1, 4, Math.max(2, x2 - x1), 4);
    });
    ctx.fillStyle = cssVar('--muted');
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'alphabetic';
    for (let y = 1940; y < MAX_YEAR; y += 10) {
      const x = px(y);
      if (x > W - 24) break;
      ctx.fillText(String(y), x + 2, H - 3);
      ctx.fillRect(x, base, 1, 3);
    }
    updateWindow();
  }
  function updateWindow() {
    if (!timeView()) { mmWindow.hidden = true; return; }
    mmWindow.hidden = false;
    const W = mmCanvas.clientWidth;
    const total = canvasWidth();
    const span = MAX_YEAR - MIN_YEAR;
    const y1 = clamp(yearAt(stage.scrollLeft), MIN_YEAR, MAX_YEAR);
    const y2 = clamp(yearAt(stage.scrollLeft + stage.clientWidth), MIN_YEAR, MAX_YEAR);
    const l = ((y1 - MIN_YEAR) / span) * W;
    const r = ((y2 - MIN_YEAR) / span) * W;
    mmWindow.style.left = l + 'px';
    mmWindow.style.width = Math.max(6, r - l) + 'px';
    if (total <= stage.clientWidth + 2) { mmWindow.style.left = '0px'; mmWindow.style.width = W + 'px'; }
  }
  function minimapJump(clientX, smooth) {
    const box = mmCanvas.getBoundingClientRect();
    const y = MIN_YEAR + ((clientX - box.left) / box.width) * (MAX_YEAR - MIN_YEAR);
    if (state.view === 'grid') { jumpGridTo(y); return; }
    stage.scrollTo({ left: X(y) - stage.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  }
  function jumpGridTo(y) {
    const decs = [...stage.querySelectorAll('.decade')];
    const target = decs.find((d) => parseInt(d.querySelector('.decade-h').textContent, 10) >= Math.floor(y / 10) * 10) || decs[decs.length - 1];
    if (target) stage.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
  }

  // ── Zoom ─────────────────────────────────────────────────────────
  function ppyToSlider(p) { const a = fitPpy(); return Math.round((Math.log(p / a) / Math.log(MAX_PPY / a)) * 1000); }
  function sliderToPpy(v) { const a = fitPpy(); return a * Math.pow(MAX_PPY / a, v / 1000); }
  function setZoom(ppy, anchorX) {
    const min = fitPpy();
    ppy = clamp(ppy, min, MAX_PPY);
    if (anchorX == null) anchorX = stage.clientWidth / 2;
    const anchorYear = yearAt(stage.scrollLeft + anchorX);
    const prevMode = zoomMode();
    state.ppy = ppy;
    zoomInput.value = ppyToSlider(ppy);
    renderTime();
    stage.scrollLeft = X(anchorYear) - anchorX;
    if (prevMode !== zoomMode()) hideTip();
    updateWindow();
    savePrefs();
  }

  // ── Filters UI ───────────────────────────────────────────────────
  function renderTypeChips() {
    const scope = ITEMS.filter((it) => matches(it, 'type'));
    const colors = { first: '--t-first', launch: '--t-launch', key: '--t-key', event: '--t-event', tiein: '--t-tiein', milestone: '--t-milestone' };
    $('#type-chips').innerHTML = Object.keys(TYPES).map((k) => {
      const n = scope.filter((i) => i.type === k).length;
      return `<button type="button" class="chip" data-type="${k}" aria-pressed="${state.types.has(k)}" style="--c:var(${colors[k]})"><span class="sw"></span>${TYPES[k].label}<span class="n">${n}</span></button>`;
    }).join('');
  }

  function computeStats() {
    const chars = new Map();
    const creators = new Map();
    ITEMS.forEach((it) => {
      if (!inPub(it)) return;
      const chs = it.type === 'event' ? it.ownChars : it.characters;
      chs.forEach((c) => {
        const s = chars.get(c) || { name: c, n: 0, first: Infinity, pubs: new Set() };
        s.n++; s.first = Math.min(s.first, it.y); s.pubs.add(it.publisher);
        chars.set(c, s);
      });
      [...new Set([...it.writers, ...it.artists])].forEach((c) => {
        const s = creators.get(c) || { name: c, n: 0, first: Infinity, w: 0, a: 0 };
        s.n++; s.first = Math.min(s.first, it.y);
        if (it.writers.includes(c)) s.w++;
        if (it.artists.includes(c)) s.a++;
        creators.set(c, s);
      });
    });
    CHAR_STATS = [...chars.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    CREATOR_STATS = [...creators.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }

  function pubColorVar(pubs) {
    if (pubs.size > 1) return 'var(--cross)';
    const p = [...pubs][0];
    return p === 'dc' ? 'var(--dc)' : p === 'marvel' ? 'var(--marvel)' : 'var(--cross)';
  }

  function renderCharList() {
    const q = state.charQ.toLowerCase();
    const rows = CHAR_STATS.filter((c) => (state.role === 'all' || ROLE[c.name] === state.role) && (!q || c.name.toLowerCase().includes(q)));
    $('#char-n').textContent = rows.length;
    document.querySelectorAll('.tab[data-role]').forEach((b) => b.classList.toggle('on', b.dataset.role === state.role));
    $('#char-list').innerHTML = rows.length ? rows.map((c) => `<li><button type="button" data-char="${esc(c.name)}" class="${state.char === c.name ? 'on' : ''}" style="--c:${pubColorVar(c.pubs)}" title="First seen ${Math.floor(c.first)} · ${c.n} entries"><span class="dot"></span><span class="nm">${esc(c.name)}</span><span class="yr">${Math.floor(c.first)}</span><span class="ct">${c.n}</span></button></li>`).join('') : '<li class="empty">No characters match.</li>';
  }

  function renderCreatorList() {
    const q = state.creatorQ.toLowerCase();
    const rows = CREATOR_STATS.filter((c) => !q || c.name.toLowerCase().includes(q));
    $('#creator-n').textContent = rows.length;
    $('#creator-list').innerHTML = rows.length ? rows.map((c) => {
      const role = c.w && c.a ? 'writer & artist' : c.w ? 'writer' : 'artist';
      return `<li><button type="button" data-creator="${esc(c.name)}" class="${state.creator === c.name ? 'on' : ''}" title="${role} · first credit ${Math.floor(c.first)}"><span class="dot" style="--c:var(--faint)"></span><span class="nm">${esc(c.name)}</span><span class="yr">${Math.floor(c.first)}</span><span class="ct">${c.n}</span></button></li>`;
    }).join('') : '<li class="empty">No creators match.</li>';
  }

  function renderEventList() {
    const evs = ITEMS.filter((it) => it.type === 'event' && inPub(it));
    $('#event-n').textContent = evs.length;
    $('#event-list').innerHTML = evs.map((e) => {
      const c = e.publisher === 'dc' ? 'var(--dc)' : e.publisher === 'marvel' ? 'var(--marvel)' : 'var(--cross)';
      const n = eventParts(e).length;
      return `<li><button type="button" data-event="${esc(e.event)}" class="${state.event === e.event ? 'on' : ''}" style="--c:${c}" title="${esc(fmtRange(e.date, e.end))}"><span class="dot"></span><span class="nm">${esc(e.title)}</span><span class="yr">${String(e.date).slice(0, 4)}</span><span class="ct">${n ? '+' + n : ''}</span></button></li>`;
    }).join('');
  }

  function renderFocus() {
    const vis = ITEMS.filter((it) => matches(it));
    const issues = vis.filter((i) => i.type !== 'event' && i.type !== 'milestone');
    const x = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    let h = state.view === 'series' && SERIES.length
      ? `<span class="count">${SERIES.filter(seriesMatches).length} series</span>`
      : `<span class="count">${issues.length} issues · ${vis.filter((i) => i.type === 'event').length} events</span>`;
    if (state.q) h += `<span class="pill">“${esc(state.q)}”<button type="button" data-clear="q" aria-label="Clear search">${x}</button></span>`;
    if (state.char) h += `<span class="pill">${esc(state.char)}<button type="button" data-clear="char" aria-label="Stop following ${esc(state.char)}">${x}</button></span>`;
    if (state.creator) h += `<span class="pill">${esc(state.creator)}<button type="button" data-clear="creator" aria-label="Clear creator filter">${x}</button></span>`;
    if (state.event) {
      const ev = BYID['event-' + state.event];
      h += `<span class="pill">${esc(ev ? ev.title : state.event)}<button type="button" data-clear="event" aria-label="Clear event filter">${x}</button></span>`;
    }
    const firstIssue = issues[0], lastIssue = issues[issues.length - 1];
    if (state.char && firstIssue) {
      const fa = ITEMS.find((i) => i.type === 'first' && i.ownChars.includes(state.char)) || firstIssue;
      h += `<span class="story">Debut <b>${esc(label(fa))}</b> (${esc(fmtDate(fa.date))}) · on this timeline ${Math.floor(firstIssue.y)}–${Math.floor(lastIssue.y)}</span>`;
    } else if (state.creator && firstIssue) {
      h += `<span class="story">Credits from <b>${Math.floor(firstIssue.y)}</b> to <b>${Math.floor(lastIssue.y)}</b></span>`;
    } else if (state.event) {
      const ev = BYID['event-' + state.event];
      if (ev) h += `<span class="story"><b>${esc(fmtRange(ev.date, ev.end))}</b> · ${esc(ev.series || '')}</span>`;
    } else if (!state.q && state.view === 'series') {
      h += `<span class="story">Each row is one series, with every issue at its release date. Click an event bar to light up its tie-ins, or a series name to see every cover.</span>`;
    } else if (!state.q) {
      h += `<span class="story">Click any cover or event bar for details. Pick a character to follow their whole history.</span>`;
    }
    $('#focus').innerHTML = h;
  }

  function syncControls() {
    document.querySelectorAll('[data-pub]').forEach((b) => b.classList.toggle('on', b.dataset.pub === state.pub));
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === state.view));
    $('#zoom-ctl').hidden = !timeView();
    $('#sv-ctl').hidden = state.view !== 'series';
    document.body.dataset.view = state.view;
    document.querySelectorAll('[data-svgroup]').forEach((b) => b.classList.toggle('on', b.dataset.svgroup === state.svGroup));
    $('#sv-oneshots').setAttribute('aria-pressed', String(state.svOneShots));
  }

  // Full refresh: filters, lists, main view, minimap.
  function refresh(opts = {}) {
    syncControls();
    renderTypeChips();
    if (opts.stats) computeStats();
    renderCharList();
    renderCreatorList();
    renderEventList();
    renderFocus();
    if (timeView()) {
      setPadl();
      state.ppy = clamp(state.ppy, fitPpy(), MAX_PPY);
      zoomInput.value = ppyToSlider(state.ppy);
      renderTime();
    } else {
      renderGrid();
    }
    drawMinimap();
    savePrefs();
    if (opts.jump) jumpToFirst();
  }

  function jumpToFirst() {
    if (state.view === 'series') {
      const ev = state.event && BYID['event-' + state.event];
      if (ev) {
        // Zoom so the event plus a year either side fills the view. Wait a
        // tick so the event panel that opens alongside has taken its space.
        setTimeout(() => {
          const span = toYear(ev.end || ev.date) + 1 / 12 - ev.y + 2;
          setZoom((stage.clientWidth - LABEL_W() - 40) / span);
          stage.scrollTop = 0;
          stage.scrollLeft = X(ev.y - 1) - LABEL_W() - 24;
        }, 0);
        return;
      }
      const s = SV.list && SV.list.slice().sort((a, b) => a.y0 - b.y0)[0];
      if (s) stage.scrollTo({ left: Math.max(0, X(s.y0) - LABEL_W() - 60), top: 0, behavior: 'smooth' });
      return;
    }
    const first = ITEMS.find((it) => matches(it));
    if (!first) return;
    if (state.view === 'timeline') {
      stage.scrollTo({ left: Math.max(0, X(first.y) - 80), top: 0, behavior: 'smooth' });
    } else {
      stage.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Detail drawer ────────────────────────────────────────────────
  function tagList(names, kind) {
    if (!names.length) return '';
    return `<div class="tags">${names.map((n) => `<button type="button" class="tag ${kind === 'char' ? ROLE[n] || '' : ''}" data-${kind}="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
  }
  function badge(text, color, extra = '') { return `<span class="badge ${extra}" style="--c:${color}">${esc(text)}</span>`; }
  function pubColor(p) { return p === 'dc' ? 'var(--dc)' : p === 'marvel' ? 'var(--marvel)' : 'var(--cross)'; }
  const TYPE_COLOR = { first: 'var(--t-first)', launch: 'var(--t-launch)', key: 'var(--t-key)', event: 'var(--t-event)', tiein: 'var(--t-tiein)', milestone: 'var(--t-milestone)' };

  function openItem(id) {
    const it = BYID[id];
    if (!it) return;
    state.selected = id;
    document.querySelectorAll('.it.sel, .band.sel').forEach((el) => el.classList.remove('sel'));
    document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((el) => el.classList.add('sel'));
    hideTip();
    drawerBody.innerHTML = detailHtml(it);
    drawer.hidden = false;
    drawer.scrollTop = 0;
    // The drawer narrows the stage on wide screens; keep the timeline in step.
    requestAnimationFrame(() => { updateWindow(); });
  }
  function closeDrawer() {
    drawer.hidden = true;
    state.selected = null;
    if (state.view === 'series') { SV.sel = null; SV.selSeries = null; scheduleSeriesDraw(); }
    document.querySelectorAll('.it.sel, .band.sel').forEach((el) => el.classList.remove('sel'));
    requestAnimationFrame(updateWindow);
  }

  function detailHtml(it) {
    const ev = it.type === 'event' ? it : eventOf(it);
    let h = `<div class="d-hero"><span class="pub-${it.publisher} t-${it.type}">${coverHtml(it, 'full')}</span>
      <div class="d-meta">
        <div class="badges">${badge(PUBS[it.publisher].label, pubColor(it.publisher))}${badge(TYPES[it.type].short, TYPE_COLOR[it.type], 't-' + it.type)}${it.edited ? badge('Edited', 'var(--muted)') : ''}${it.added ? badge('Added by you', 'var(--muted)') : ''}</div>
        <h2 class="d-title">${esc(label(it))}</h2>
        <div class="d-date">${esc(it.type === 'event' ? fmtRange(it.date, it.end) : fmtDate(it.date) + ' cover date')}</div>
      </div>
    </div>`;
    if (it.summary) h += `<p class="d-summary">${esc(it.summary)}</p>`;
    if (it.type === 'event' && it.series) h += `<div class="d-sec"><h3>Core series</h3><div>${esc(it.series)}</div></div>`;

    if (ev && it.type !== 'event') {
      h += `<div class="d-sec"><h3>Part of</h3><button type="button" class="ev-link" data-open="${esc(ev.id)}"><span class="sw"></span><span><b>${esc(ev.title)}</b><span>${esc(fmtRange(ev.date, ev.end))}</span></span></button></div>`;
    }

    const chars = it.type === 'event' ? it.characters : it.characters;
    h += `<div class="d-sec"><h3>${it.type === 'event' ? 'Characters involved' : 'Characters'}</h3>${tagList(chars, 'char') || '<span class="missing">None listed yet.</span>'}</div>`;
    h += `<div class="d-sec"><h3>Writer${it.writers.length === 1 ? '' : 's'}</h3>${tagList(it.writers, 'creator') || '<span class="missing">Not filled in yet.</span>'}</div>`;
    h += `<div class="d-sec"><h3>Artist${it.artists.length === 1 ? '' : 's'}</h3>${tagList(it.artists, 'creator') || '<span class="missing">Not filled in yet.</span>'}</div>`;

    if (it.type === 'event') {
      const parts = eventParts(it);
      const arc = T.arcs && T.arcs[it.event];
      if (arc && arc.issues.length) {
        const list = arc.issues.map((id) => ISSUE_AT.get(id)).filter(Boolean);
        const nSeries = new Set(list.map((a) => a[0])).size;
        h += `<div class="d-sec"><h3>Full reading order · ${list.length} issues from ${nSeries} series</h3><ol class="reading">${list.map(([ser, i]) => {
          const iss = ser.issues[i];
          const key = KEY_AT.get(iss[0]);
          return `<li><button type="button" data-issue="${ser.id}:${i}"${key ? ' class="core"' : ''}><span class="rd">${esc(fmtDate(iss[2]))}</span><span>${esc(ser.title)} #${esc(iss[1])}${key ? `<span class="rk">★ ${esc(TYPES[key.type].short)}</span>` : ''}</span></button></li>`;
        }).join('')}</ol></div>`;
        h += `<p class="d-note">Reading order from <a href="https://metron.cloud" target="_blank" rel="noopener">Metron</a>. In the Series view, this event lights up every one of these issues.</p>`;
      }
      const reading = [it, ...parts].sort((a, b) => a.y - b.y);
      if (!arc) h += `<div class="d-sec"><h3>Reading order on this timeline</h3><ol class="reading">${reading.map((p) => `<li><button type="button" data-open="${esc(p.id)}" class="${p === it ? 'core' : ''}"><span class="rd">${esc(fmtDate(p.date))}</span><span>${esc(p === it ? (it.series || it.title) : label(p))}<span class="rk">${esc(p === it ? 'Core series' : TYPES[p.type].short)}</span></span></button></li>`).join('')}</ol></div>`;
      h += `<div class="d-actions"><button type="button" class="btn ghost" data-act="series-event" data-event-id="${esc(it.event)}">See it across every series</button></div>`;
      h += `<div class="d-actions"><button type="button" class="btn" data-event="${esc(it.event)}">Show only this event</button><button type="button" class="btn ghost" data-act="edit" data-id="${esc(it.id)}">Edit details</button></div>`;
    } else {
      const ser = seriesOf(it);
      if (ser) h += seriesLinkHtml(ser, ISSUE_AT.get(it.metron)[1]) + issueNavHtml(ser, ISSUE_AT.get(it.metron)[1]);
      h += `<div class="d-actions">${ser ? `<button type="button" class="btn" data-series="${ser.id}">See the whole series</button>` : ''}<button type="button" class="btn ghost" data-act="locate" data-id="${esc(it.id)}">Show on timeline</button><button type="button" class="btn ghost" data-act="edit" data-id="${esc(it.id)}">Edit details</button></div>`;
    }
    const lookup = encodeURIComponent(`${label(it)} ${String(it.date).slice(0, 4)} ${it.publisher === 'dc' ? 'DC' : 'Marvel'} comic`);
    h += `<p class="d-note">Look it up: <a href="https://www.google.com/search?q=${lookup}" target="_blank" rel="noopener">web search</a> · <a href="https://www.google.com/search?tbm=isch&q=${lookup}%20cover" target="_blank" rel="noopener">cover images</a></p>`;
    return h;
  }

  // ── Editing ──────────────────────────────────────────────────────
  function eventOptions(sel) {
    const evs = ITEMS.filter((i) => i.type === 'event');
    return `<option value="">None</option>` + evs.map((e) => `<option value="${esc(e.event)}"${sel === e.event ? ' selected' : ''}>${esc(e.title)} (${String(e.date).slice(0, 4)})</option>`).join('');
  }
  function editHtml(it) {
    const isNew = !it;
    it = it || { id: '', publisher: state.pub === 'dc' ? 'dc' : 'marvel', type: 'key', title: '', issue: '', date: '', characters: [], writers: [], artists: [], summary: '', cover: '', event: '' };
    const isEvent = it.type === 'event';
    const opt = (o, v, l) => `<option value="${v}"${o === v ? ' selected' : ''}>${esc(l)}</option>`;
    return `<form class="form" id="edit-form" data-id="${esc(it.id)}">
      <h2>${isNew ? 'Add an issue' : 'Edit ' + esc(label(it))}</h2>
      <div class="row2">
        <div class="field"><label for="f-title">${isEvent ? 'Event name' : 'Series title'}</label><input id="f-title" name="title" required value="${esc(it.title)}"></div>
        <div class="field"><label for="f-issue">Issue number</label><input id="f-issue" name="issue" value="${esc(it.issue)}" placeholder="e.g. 15"${isEvent ? ' disabled' : ''}></div>
      </div>
      <div class="row2">
        <div class="field"><label for="f-date">Cover date</label><input id="f-date" name="date" required value="${esc(it.date)}" placeholder="YYYY-MM" pattern="\\d{4}(-\\d{1,2})?"><span class="hint">Year and month, like 1962-08</span></div>
        ${isEvent ? `<div class="field"><label for="f-end">End date</label><input id="f-end" name="end" value="${esc(it.end || '')}" placeholder="YYYY-MM" pattern="\\d{4}(-\\d{1,2})?"></div>`
          : `<div class="field"><label for="f-type">Kind</label><select id="f-type" name="type">${['first', 'launch', 'key', 'tiein', 'milestone'].map((k) => opt(it.type, k, TYPES[k].short)).join('')}</select></div>`}
      </div>
      ${isNew ? `<div class="field"><label for="f-pub">Publisher</label><select id="f-pub" name="publisher">${opt(it.publisher, 'marvel', 'Marvel')}${opt(it.publisher, 'dc', 'DC')}${opt(it.publisher, 'crossover', 'Marvel × DC')}</select></div>` : ''}
      ${isEvent ? '' : `<div class="field"><label for="f-event">Part of event</label><select id="f-event" name="event">${eventOptions(it.event)}</select></div>`}
      <div class="field"><label for="f-chars">Characters</label><input id="f-chars" name="characters" value="${esc((isEvent ? it.ownChars || [] : it.characters).join(', '))}"><span class="hint">Separate names with commas</span></div>
      <div class="row2">
        <div class="field"><label for="f-writers">Writers</label><input id="f-writers" name="writers" value="${esc(it.writers.join(', '))}"></div>
        <div class="field"><label for="f-artists">Artists</label><input id="f-artists" name="artists" value="${esc(it.artists.join(', '))}"></div>
      </div>
      <div class="field"><label for="f-cover">Cover image URL</label><input id="f-cover" name="cover" type="url" value="${esc(it.cover)}" placeholder="https://…"><span class="hint">Paste a link to a cover image. It replaces the generated cover.</span></div>
      <div class="field"><label for="f-summary">Notes</label><textarea id="f-summary" name="summary">${esc(it.summary)}</textarea></div>
      <div class="d-actions">
        <button type="submit" class="btn">${isNew ? 'Add to timeline' : 'Save changes'}</button>
        <button type="button" class="btn ghost" data-act="cancel-edit" data-id="${esc(it.id)}">Cancel</button>
        ${it.added ? `<button type="button" class="btn danger" data-act="delete" data-id="${esc(it.id)}">Delete</button>` : ''}
        ${it.edited && !it.added ? `<button type="button" class="btn danger" data-act="revert" data-id="${esc(it.id)}">Undo my edits</button>` : ''}
      </div>
      <p class="d-note">Edits are saved in this browser. Use “Your edits” to copy them out and add them to the data files.</p>
    </form>`;
  }

  function startEdit(id) {
    const it = id ? BYID[id] : null;
    drawerBody.innerHTML = editHtml(it);
    drawer.hidden = false;
    drawer.scrollTop = 0;
    const f = $('#f-title');
    if (f) f.focus();
  }

  function saveForm(form) {
    const fd = new FormData(form);
    const id = form.dataset.id;
    const rec = {
      title: (fd.get('title') || '').trim(),
      date: (fd.get('date') || '').trim(),
      characters: list(fd.get('characters')),
      writers: list(fd.get('writers')),
      artists: list(fd.get('artists')),
      cover: (fd.get('cover') || '').trim(),
      summary: (fd.get('summary') || '').trim()
    };
    if (fd.has('issue')) rec.issue = (fd.get('issue') || '').trim();
    if (fd.has('type')) rec.type = fd.get('type');
    if (fd.has('event')) rec.event = fd.get('event');
    if (fd.has('end')) rec.end = (fd.get('end') || '').trim();
    if (isNaN(toYear(rec.date))) { toast('Enter the cover date as YYYY-MM, like 1962-08'); return; }

    let newId = id;
    if (!id) {
      const added = store.get('added', []);
      rec.publisher = fd.get('publisher') || 'marvel';
      rec.id = 'user-' + slug(`${rec.publisher}-${rec.title}-${rec.issue || ''}-${rec.date}`) + '-' + Date.now().toString(36);
      added.push(rec);
      store.set('added', added);
      newId = rec.id;
      toast('Added to the timeline');
    } else if (BYID[id] && BYID[id].added) {
      const added = store.get('added', []).map((a) => (a.id === id ? Object.assign(a, rec) : a));
      store.set('added', added);
      toast('Saved');
    } else {
      const edits = store.get('edits', {});
      edits[id] = rec;
      store.set('edits', edits);
      toast('Saved');
    }
    buildData();
    refresh({ stats: true });
    openItem(newId);
  }

  function revert(id) {
    const edits = store.get('edits', {});
    delete edits[id];
    store.set('edits', edits);
    buildData(); refresh({ stats: true }); openItem(id);
    toast('Back to the original details');
  }
  function removeAdded(id) {
    store.set('added', store.get('added', []).filter((a) => a.id !== id));
    buildData(); refresh({ stats: true }); closeDrawer();
    toast('Deleted');
  }

  // ── Export / import modal ────────────────────────────────────────
  function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  function exportModal() {
    const data = { edits: store.get('edits', {}), added: store.get('added', []) };
    const n = Object.keys(data.edits).length + data.added.length;
    openModal(`<div class="stack">
      <h2 class="d-title" id="modal-title">Your edits</h2>
      <p>${n ? `You have ${Object.keys(data.edits).length} edited and ${data.added.length} added entries saved in this browser.` : 'You have no edits yet. Open any issue and choose “Edit details”, or use “Add issue”.'} Copy this text to back it up, move it to another device, or paste it into a chat to have it added to the data files permanently.</p>
      <textarea class="code" id="export-text" readonly>${esc(JSON.stringify(data, null, 2))}</textarea>
      <div class="d-actions"><button type="button" class="btn" data-act="copy-export">Copy</button></div>
      <h3 class="side-h">Load edits</h3>
      <p>Paste text copied from “Your edits” on another device. It replaces what is saved here.</p>
      <textarea class="code" id="import-text" style="min-height:100px" placeholder='{"edits": {}, "added": []}'></textarea>
      <div class="d-actions"><button type="button" class="btn ghost" data-act="import">Load these edits</button></div>
    </div>`);
  }
  function copyExport() {
    const ta = $('#export-text');
    const done = () => toast('Copied');
    const fallback = () => { ta.focus(); ta.select(); toast('Selected. Press Ctrl+C or ⌘C to copy'); };
    try { navigator.clipboard.writeText(ta.value).then(done, fallback); } catch (e) { fallback(); }
  }
  function importEdits() {
    try {
      const data = JSON.parse($('#import-text').value);
      if (typeof data !== 'object' || !data) throw new Error('bad');
      store.set('edits', data.edits || {});
      store.set('added', Array.isArray(data.added) ? data.added : []);
      buildData(); refresh({ stats: true }); closeModal();
      toast('Edits loaded');
    } catch (e) {
      toast('That text isn’t valid. Paste the full block copied from “Your edits”');
    }
  }

  // ── Tooltip & toast ──────────────────────────────────────────────
  function showTip(el, e) {
    const it = BYID[el.dataset.id];
    if (!it || (zoomMode() === 'full' && el.classList.contains('it') && state.view === 'timeline') || (state.view === 'grid' && el.classList.contains('it'))) return;
    const sub = it.type === 'event' ? fmtRange(it.date, it.end) : `${fmtDate(it.date)} · ${TYPES[it.type].short}`;
    const who = it.type === 'first' && it.ownChars.length ? `<br>${esc(it.ownChars.slice(0, 3).join(', '))}` : '';
    tip.innerHTML = `<b>${esc(label(it))}</b><span>${esc(sub)}</span>${who}`;
    tip.hidden = false;
    moveTip(e);
  }
  function moveTip(e) {
    if (tip.hidden) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 10;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ── Series view ──────────────────────────────────────────────────
  // Every series is one row on the shared time axis; each issue sits at its
  // cover date. Drawn on a canvas because a full run can be 1,000+ issues.
  const SERIES = (T.series || []).filter((s) => s.issues && s.issues.length);
  const SERIES_BY_ID = new Map();
  const ISSUE_AT = new Map(); // Metron issue id -> [series, index]
  const ARCS_OF = new Map(); // Metron issue id -> [event ids]
  const KEY_AT = new Map(); // Metron issue id -> timeline item
  const IMG_BASE = T.imgBase || '';
  const FAMILIES = [
    ['marvel', 'Spider-Man', /spider|venom|carnage|web of|peter parker/i],
    ['marvel', 'X-Men', /x-men|x-factor|x-force|new mutants|wolverine|excalibur|cable|deadpool|gambit|generation x|house of x|powers of x|mutant|\bx-|^x\b/i],
    ['marvel', 'Avengers', /avengers|thunderbolts|illuminati|vision|scarlet witch|hawkeye|black widow|ant-man|wasp|ultimates/i],
    ['marvel', 'Captain America', /captain america|winter soldier|falcon/i],
    ['marvel', 'Iron Man', /iron man/i],
    ['marvel', 'Thor', /thor|loki|asgard|journey into mystery/i],
    ['marvel', 'Hulk', /hulk/i],
    ['marvel', 'Fantastic Four', /fantastic four|\bff\b/i],
    ['marvel', 'Cosmic', /silver surfer|guardians|thanos|infinity|annihilation|nova|captain marvel|ms\. marvel|warlock|cosmic|kree|skrull|marvel super-heroes/i],
    ['marvel', 'Street level', /daredevil|punisher|luke cage|hero for hire|iron fist|moon knight|alias|jessica jones|defenders|elektra|blade|ghost rider|tomb of dracula|werewolf/i],
    ['dc', 'Batman', /batman|detective comics|robin|nightwing|batgirl|batwoman|catwoman|joker|harley|gotham|red hood|arkham|bane|dark knight|knight/i],
    ['dc', 'Superman', /superman|action comics|supergirl|superboy|steel|lois lane|jimmy olsen|man of steel|doomsday/i],
    ['dc', 'Wonder Woman', /wonder woman|sensation comics/i],
    ['dc', 'Justice League', /justice league|\bjla\b|\bjsa\b|justice society|all.star comics/i],
    ['dc', 'Green Lantern', /lantern|sinestro/i],
    ['dc', 'Flash', /flash/i],
    ['dc', 'Teen Titans', /titans/i],
    ['dc', 'Aquaman', /aquaman/i],
    ['dc', 'Vertigo & horror', /sandman|swamp thing|hellblazer|constantine|doom patrol|watchmen|spectre|house of secrets/i]
  ];
  const FAMILY_ORDER = [...FAMILIES.filter((f) => f[0] === 'marvel').map((f) => f[1]), 'Marvel events & minis', 'More Marvel',
    'Marvel × DC', ...FAMILIES.filter((f) => f[0] === 'dc').map((f) => f[1]), 'DC events & minis', 'More DC'];
  const SV = { rows: [], headerH: 0, contentH: 0, evRows: [], hover: null, sel: null, selSeries: null, colors: null, raf: 0, imgs: new Map(), fit: new Map() };
  state.svGroup = saved.svGroup || 'family';
  state.svOneShots = false;

  function buildSeries() {
    SERIES.forEach((s) => {
      SERIES_BY_ID.set(s.id, s);
      s.ys = s.issues.map((i) => toYear(i[2]));
      s.y0 = s.ys[0];
      s.y1 = s.ys[s.ys.length - 1] + 1 / 12;
      s.title = String(s.name || '').replace(/\s*\(\d{4}\)\s*$/, '');
      const endY = s.end || Math.floor(s.ys[s.ys.length - 1]);
      s.years = s.end == null && s.y1 > new Date().getFullYear() - 0.2 ? `${s.began || Math.floor(s.y0)}–now` : (s.began || Math.floor(s.y0)) === endY ? String(endY) : `${s.began || Math.floor(s.y0)}–${endY}`;
      s.events = new Set();
      s.keys = [];
      s.chars = new Set();
      s.creators = new Set();
      s.issues.forEach((i, idx) => ISSUE_AT.set(i[0], [s, idx]));
    });
    Object.entries(T.arcs || {}).forEach(([ev, a]) => a.issues.forEach((id) => {
      if (!ARCS_OF.has(id)) ARCS_OF.set(id, []);
      ARCS_OF.get(id).push(ev);
      const at = ISSUE_AT.get(id);
      if (at) at[0].events.add(ev);
    }));
  }
  function linkSeries() {
    KEY_AT.clear();
    SERIES.forEach((s) => { s.keys = []; s.chars.clear(); s.creators.clear(); });
    ITEMS.forEach((it) => {
      const id = (T.links || {})[coverKey(it)];
      if (!id) return;
      it.metron = id;
      KEY_AT.set(id, it);
      const at = ISSUE_AT.get(id);
      if (!at) return;
      const s = at[0];
      s.keys.push(it);
      it.ownChars.forEach((c) => s.chars.add(c));
      it.writers.concat(it.artists).forEach((c) => s.creators.add(c));
    });
    SERIES.forEach((s) => {
      s.hay = [s.name, ...s.keys.map((k) => k.hay)].join(' ').toLowerCase();
      const fam = s.pub === 'crossover' ? 'Marvel × DC' : (FAMILIES.find((f) => f[0] === s.pub && f[2].test(s.title)) || [])[1];
      s.family = fam || (s.keys.length || !s.events.size ? (s.pub === 'dc' ? 'More DC' : 'More Marvel') : (s.pub === 'dc' ? 'DC events & minis' : 'Marvel events & minis'));
    });
  }
  const seriesOf = (it) => (it && it.metron && ISSUE_AT.get(it.metron) ? ISSUE_AT.get(it.metron)[0] : null);

  function seriesMatches(s) {
    if (state.pub !== 'both' && s.pub !== state.pub && s.pub !== 'crossover') return false;
    if (state.event) return s.events.has(state.event);
    if (!state.svOneShots && s.issues.length < 2 && !s.keys.length && !state.q) return false;
    if (state.char) {
      const base = state.char.toLowerCase().replace(/\s*\(.*\)$/, '');
      if (!s.chars.has(state.char) && !s.title.toLowerCase().includes(base)) return false;
    }
    if (state.creator && !s.creators.has(state.creator)) return false;
    if (state.q) {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.every((w) => s.hay.includes(w))) return false;
    }
    return true;
  }

  const LABEL_W = () => (stage.clientWidth < 640 ? 118 : 232);
  const AXIS_H = 50;
  const EV_ROW = 17;
  const coverMode = () => state.ppy >= 300;
  const thumbW = () => Math.min(48, (state.ppy / 12) * 0.9);
  const rowH = () => (coverMode() ? Math.round(thumbW() * 1.5 + 12) : 24);

  function computeSvRows() {
    const list = SERIES.filter(seriesMatches);
    const rows = [];
    const rh = rowH();
    let off = 0;
    const push = (r, h) => { r.off = off; r.h = h; rows.push(r); off += h; };
    if (state.svGroup === 'family') {
      const groups = new Map();
      list.forEach((s) => { if (!groups.has(s.family)) groups.set(s.family, []); groups.get(s.family).push(s); });
      FAMILY_ORDER.forEach((name) => {
        const g = groups.get(name);
        if (!g) return;
        push({ kind: 'group', label: name, n: g.length }, 34);
        g.forEach((s) => push({ kind: 'series', s }, rh));
      });
    } else {
      list.forEach((s) => push({ kind: 'series', s }, rh));
    }
    // Event bars along the top, packed into rows.
    const evs = ITEMS.filter((it) => it.type === 'event' && inPub(it) && (!state.event || it.event === state.event));
    const ends = [];
    SV.evRows = evs.map((e) => {
      const y1 = toYear(e.end || e.date) + 1 / 12;
      const w = Math.max(4, (y1 - e.y) * state.ppy);
      const need = Math.max(w, state.ppy >= 14 ? e.title.length * 5.6 + 10 : 0) + 4;
      const x = X(e.y);
      let r = ends.findIndex((end) => end <= x);
      if (r < 0) { r = ends.length; ends.push(0); }
      ends[r] = x + need;
      return { e, r, x, w };
    });
    SV.headerH = AXIS_H + (ends.length ? ends.length * EV_ROW + 8 : 0);
    SV.rows = rows;
    SV.list = list;
    SV.contentH = SV.headerH + off + 40;
  }

  function svColors() {
    const c = {};
    ['--bg', '--surface', '--raised', '--ink', '--muted', '--faint', '--line', '--stripe', '--marvel', '--dc', '--cross', '--t-first', '--t-launch', '--t-key', '--t-event', '--t-tiein', '--t-milestone', '--focus'].forEach((n) => { c[n.slice(2)] = cssVar(n); });
    return c;
  }

  function renderSeries() {
    if (!SERIES.length) {
      stage.innerHTML = `<div class="empty-state"><h3>Series data isn't loaded</h3><p>Run <code>node tools/fetch-series.mjs</code> to build data/series.js.</p></div>`;
      return;
    }
    computeSvRows();
    let sp = stage.querySelector('.sv');
    if (!sp) {
      stage.innerHTML = '<div class="sv"><canvas class="sv-canvas" id="sv-canvas"></canvas></div>';
      sp = stage.querySelector('.sv');
    }
    sp.style.width = canvasWidth() + 'px';
    sp.style.height = Math.max(SV.contentH, stage.clientHeight) + 'px';
    SV.colors = svColors();
    drawSeries();
  }
  function scheduleSeriesDraw() {
    if (SV.raf) return;
    SV.raf = requestAnimationFrame(() => { SV.raf = 0; if (state.view === 'series') drawSeries(); });
  }

  function svImage(path) {
    let rec = SV.imgs.get(path);
    if (!rec) {
      rec = { img: new Image(), ok: false };
      rec.img.decoding = 'async';
      rec.img.referrerPolicy = 'no-referrer';
      rec.img.onload = () => { rec.ok = true; scheduleSeriesDraw(); };
      rec.img.src = IMG_BASE + path;
      SV.imgs.set(path, rec);
    }
    return rec;
  }
  function fitText(ctx, str, max) {
    const k = ctx.font + '|' + max + '|' + str;
    if (SV.fit.has(k)) return SV.fit.get(k);
    let out = str;
    if (ctx.measureText(str).width > max) {
      let lo = 0, hi = str.length;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ctx.measureText(str.slice(0, mid) + '…').width <= max) lo = mid; else hi = mid - 1; }
      out = str.slice(0, lo) + '…';
    }
    SV.fit.set(k, out);
    return out;
  }
  const firstAtOrAfter = (arr, v) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };

  function drawSeries() {
    const cv = $('#sv-canvas');
    if (!cv) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const C = SV.colors || (SV.colors = svColors());
    const sl = stage.scrollLeft, st = stage.scrollTop;
    const LW = LABEL_W();
    const top = SV.headerH;
    const sx = (y) => X(y) - sl;
    const pubC = { marvel: C.marvel, dc: C.dc, crossover: C.cross };
    const typeC = { first: C['t-first'], launch: C['t-launch'], key: C['t-key'], tiein: C['t-tiein'], event: C['t-event'], milestone: C['t-milestone'] };
    const hlEvent = state.event || (SV.hover && SV.hover.kind === 'event' ? SV.hover.e.event : null);
    const hlSet = hlEvent && T.arcs && T.arcs[hlEvent] ? new Set(T.arcs[hlEvent].issues) : null;
    const yMin = (sl + LW - PADL) / state.ppy + MIN_YEAR - 0.1;
    const yMax = (sl + W - PADL) / state.ppy + MIN_YEAR + 0.1;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Era stripes and decade lines
    ERAS.forEach((e, i) => {
      if (!(i % 2)) return;
      ctx.fillStyle = C.stripe;
      ctx.fillRect(sx(e.start), top, sx(e.end) - sx(e.start), H);
    });
    ctx.fillStyle = C.line;
    for (let y = 1940; y < MAX_YEAR; y += state.ppy >= 55 ? 1 : 10) {
      ctx.globalAlpha = y % 10 ? 0.25 : 0.6;
      ctx.fillRect(Math.round(sx(y)), top, 1, H);
    }
    ctx.globalAlpha = 1;

    // Shade the highlighted event's span
    if (hlEvent) {
      const ev = BYID['event-' + hlEvent];
      if (ev) {
        ctx.fillStyle = C['t-event'];
        ctx.globalAlpha = 0.08;
        ctx.fillRect(sx(ev.y), top, Math.max(3, (toYear(ev.end || ev.date) + 1 / 12 - ev.y) * state.ppy), H);
        ctx.globalAlpha = 1;
      }
    }

    // Rows
    const cover = coverMode();
    const monthPx = state.ppy / 12;
    const tickW = Math.max(1.5, monthPx - (monthPx > 4 ? 1 : 0));
    const tw = thumbW(), th = tw * 1.5;
    const rows = SV.rows;
    let i = Math.max(0, firstAtOrAfter(rows.map((r) => r.off + r.h), st) - 0);
    for (; i < rows.length; i++) {
      const r = rows[i];
      const y = top + r.off - st;
      if (y > H) break;
      if (y + r.h < top) continue;
      if (r.kind === 'group') {
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, y, W, r.h);
        ctx.fillStyle = C.line;
        ctx.fillRect(0, y + r.h - 1, W, 1);
        ctx.fillStyle = C.ink;
        ctx.font = '17px Anton, Impact, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.label.toUpperCase(), 14, y + r.h / 2 + 1);
        const lw = ctx.measureText(r.label.toUpperCase()).width;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = C.faint;
        ctx.fillText(`${r.n} series`, 14 + lw + 10, y + r.h / 2 + 1);
        continue;
      }
      const s = r.s;
      const isSel = SV.selSeries === s.id;
      const isHover = SV.hover && SV.hover.s === s;
      if (isSel || isHover) {
        ctx.fillStyle = C.ink;
        ctx.globalAlpha = isSel ? 0.07 : 0.04;
        ctx.fillRect(LW, y, W - LW, r.h);
        ctx.globalAlpha = 1;
      }
      const dim = hlSet && !s.events.has(hlEvent);
      const pc = pubC[s.pub] || C.cross;
      // Run line
      ctx.fillStyle = pc;
      ctx.globalAlpha = dim ? 0.12 : 0.35;
      const mid = cover ? y + 6 + th / 2 : y + r.h / 2;
      ctx.fillRect(sx(s.y0), mid - 1, Math.max(2, (s.y1 - s.y0) * state.ppy), 2);
      ctx.globalAlpha = 1;
      // Issues in view
      const a = Math.max(0, firstAtOrAfter(s.ys, yMin - 1 / 12));
      const b = firstAtOrAfter(s.ys, yMax);
      for (let k = a; k < b; k++) {
        const iss = s.issues[k];
        const x = sx(s.ys[k]);
        const key = KEY_AT.get(iss[0]);
        const inArc = hlSet && hlSet.has(iss[0]);
        const faded = hlSet && !inArc;
        if (cover) {
          const ix = x + (monthPx - tw) / 2, iy = y + 6;
          ctx.globalAlpha = faded ? 0.18 : 1;
          const rec = iss[3] ? svImage(iss[3]) : null;
          if (rec && rec.ok) ctx.drawImage(rec.img, ix, iy, tw, th);
          else { ctx.fillStyle = pc; ctx.fillRect(ix, iy, tw, th); }
          if (key || inArc || (SV.sel === iss[0])) {
            ctx.strokeStyle = SV.sel === iss[0] ? C.ink : inArc ? C['t-event'] : typeC[key.type] || C.ink;
            ctx.lineWidth = SV.sel === iss[0] ? 3 : 2;
            ctx.strokeRect(ix - 1, iy - 1, tw + 2, th + 2);
          }
          ctx.globalAlpha = 1;
        } else {
          const h = r.h - 10;
          ctx.fillStyle = inArc ? C['t-event'] : key ? typeC[key.type] || C.ink : pc;
          ctx.globalAlpha = faded ? 0.12 : inArc || key ? 1 : 0.62;
          ctx.fillRect(x, y + (key ? 3 : 5), tickW, key ? h + 4 : h);
          if (SV.sel === iss[0]) { ctx.globalAlpha = 1; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y + 2, tickW + 4, r.h - 4); }
          ctx.globalAlpha = 1;
        }
      }
      // Sticky label
      ctx.fillStyle = C.surface;
      ctx.fillRect(0, y, LW, r.h);
      ctx.fillStyle = pc;
      ctx.fillRect(0, y + 3, 3, r.h - 6);
      ctx.globalAlpha = dim ? 0.4 : 1;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.ink;
      ctx.font = `${isSel ? 700 : 600} 12px Archivo, sans-serif`;
      const meta = `${s.years} · ${s.count}`;
      ctx.font = '10px "JetBrains Mono", monospace';
      const mw = ctx.measureText(meta).width;
      ctx.font = `${isSel ? 700 : 600} 12px Archivo, sans-serif`;
      if (cover || LW < 200) {
        ctx.fillText(fitText(ctx, s.title, LW - 16), 10, y + r.h / 2 - 7);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = C.muted;
        ctx.fillText(fitText(ctx, meta, LW - 16), 10, y + r.h / 2 + 8);
      } else {
        ctx.fillText(fitText(ctx, s.title, LW - mw - 22), 10, y + r.h / 2 + 1);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = C.muted;
        ctx.fillText(meta, LW - mw - 8, y + r.h / 2 + 1);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.line;
      ctx.fillRect(0, y + r.h - 1, LW, 1);
    }
    ctx.fillStyle = C.line;
    ctx.fillRect(LW, top, 1, H);

    // Header: eras, years, events
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, top);
    ctx.textBaseline = 'middle';
    ERAS.forEach((e) => {
      const l = Math.max(sx(e.start), LW + 4), r2 = sx(e.end);
      if (r2 - l < 60) return;
      ctx.fillStyle = C.ink;
      ctx.fillRect(sx(e.start), 8, 2, 16);
      ctx.font = '13px Anton, Impact, sans-serif';
      ctx.fillStyle = C.muted;
      ctx.fillText(fitText(ctx, e.name.toUpperCase(), r2 - l - 12), l + 8, 17);
    });
    const step = state.ppy >= 55 ? 1 : state.ppy >= 22 ? 5 : 10;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let y = Math.ceil(MIN_YEAR / step) * step; y < MAX_YEAR; y += step) {
      const x = sx(y + (step === 1 ? 0.5 : 0));
      if (x < LW + 14 || x > W) continue;
      ctx.fillStyle = y % 10 === 0 ? C.ink : C.muted;
      ctx.fillText(step === 1 && y % 10 && state.ppy < 90 ? `'${String(y).slice(2)}` : String(y), x, 38);
    }
    ctx.textAlign = 'left';
    SV.evRows.forEach((b) => {
      const x = b.x - sl, y = AXIS_H + 2 + b.r * EV_ROW;
      if (x > W || x + b.w < LW) return;
      const on = hlEvent === b.e.event;
      ctx.fillStyle = b.e.publisher === 'dc' ? C.dc : b.e.publisher === 'marvel' ? C.marvel : C.cross;
      ctx.globalAlpha = hlEvent && !on ? 0.35 : 1;
      ctx.fillRect(x, y, b.w, 5);
      ctx.fillStyle = C['t-event'];
      ctx.fillRect(x, y + 2, b.w, 3);
      if (state.ppy >= 14) {
        ctx.font = `${on ? 700 : 600} 10px Archivo, sans-serif`;
        ctx.fillStyle = C.ink;
        ctx.fillText(b.e.title, Math.max(x, LW + 4), y + 11);
      }
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = C.line;
    ctx.fillRect(0, top - 1, W, 1);
    // Corner
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, LW, top);
    ctx.fillStyle = C.line;
    ctx.fillRect(LW, 0, 1, top);
    ctx.font = '600 10px Archivo, sans-serif';
    ctx.fillStyle = C.muted;
    ctx.fillText('SERIES', 12, 17);
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = C.faint;
    ctx.fillText(`${SV.list.length} · ${SV.list.reduce((n, s) => n + s.issues.length, 0).toLocaleString()} issues`, 12, 36);
    if (SV.headerH > AXIS_H) {
      ctx.font = '600 10px Archivo, sans-serif';
      ctx.fillStyle = C.muted;
      ctx.fillText('EVENTS', 12, AXIS_H + 10);
    }
  }

  // What is under the pointer?
  function svHit(clientX, clientY) {
    const cv = $('#sv-canvas');
    if (!cv) return null;
    const box = cv.getBoundingClientRect();
    const x = clientX - box.left, y = clientY - box.top;
    const LW = LABEL_W();
    if (y < SV.headerH) {
      if (y < AXIS_H || x < LW) return null;
      const r = Math.floor((y - AXIS_H - 2) / EV_ROW);
      const px = x + stage.scrollLeft;
      const b = SV.evRows.find((e) => e.r === r && px >= e.x - 2 && px <= e.x + Math.max(e.w, state.ppy >= 14 ? e.e.title.length * 5.6 : 0) + 2);
      return b ? { kind: 'event', e: b.e } : null;
    }
    const cy = y - SV.headerH + stage.scrollTop;
    const row = SV.rows.find((r) => cy >= r.off && cy < r.off + r.h);
    if (!row || row.kind !== 'series') return null;
    const s = row.s;
    if (x < LW) return { kind: 'series', s };
    const yr = yearAt(x + stage.scrollLeft);
    const monthPx = state.ppy / 12;
    let k = firstAtOrAfter(s.ys, yr - 1 / 12);
    let best = -1, bd = Infinity;
    for (let j = Math.max(0, k - 2); j < Math.min(s.ys.length, k + 3); j++) {
      const cx = X(s.ys[j]) + monthPx / 2;
      const d = Math.abs(cx - (x + stage.scrollLeft));
      if (d < bd) { bd = d; best = j; }
    }
    if (best >= 0 && bd <= Math.max(monthPx / 2 + 2, 5)) return { kind: 'issue', s, idx: best };
    return { kind: 'row', s };
  }

  function svTip(hit, e) {
    if (!hit || hit.kind === 'row') { hideTip(); return; }
    let html;
    if (hit.kind === 'event') html = `<b>${esc(hit.e.title)}</b><span>${esc(fmtRange(hit.e.date, hit.e.end))}</span><br>Click to light up every tie-in`;
    else if (hit.kind === 'series') html = `<b>${esc(hit.s.name)}</b><span>${esc(hit.s.years)} · ${hit.s.count} issues</span>`;
    else {
      const iss = hit.s.issues[hit.idx];
      const key = KEY_AT.get(iss[0]);
      const evs = (ARCS_OF.get(iss[0]) || []).map((id) => BYID['event-' + id]).filter(Boolean);
      html = `<b>${esc(hit.s.title)} #${esc(iss[1])}</b><span>${esc(fmtDate(iss[2]))}</span>${key ? `<br>★ ${esc(TYPES[key.type].short)}` : ''}${evs.length ? `<br>${esc(evs.map((e) => e.title).join(', '))}` : ''}`;
    }
    tip.innerHTML = html;
    tip.hidden = false;
    moveTip(e);
  }

  function issueCoverHtml(s, iss, cls = '') {
    return `<span class="cv ${cls}" style="--h:${hash(s.title) % 360}"><span class="cv-brand">${esc(PUBS[s.pub] ? PUBS[s.pub].brand : '')}</span><span class="cv-title">${esc(s.title)}</span><span class="cv-num">#${esc(iss[1])}</span>${iss[3] ? `<img src="${esc(IMG_BASE + iss[3])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>`;
  }

  function openIssue(s, idx) {
    const iss = s.issues[idx];
    SV.sel = iss[0];
    SV.selSeries = s.id;
    const key = KEY_AT.get(iss[0]);
    if (key) { openItem(key.id); scheduleSeriesDraw(); return; }
    const evs = (ARCS_OF.get(iss[0]) || []).map((id) => BYID['event-' + id]).filter(Boolean);
    let h = `<div class="d-hero"><span class="pub-${s.pub}">${issueCoverHtml(s, iss)}</span>
      <div class="d-meta"><div class="badges">${badge(PUBS[s.pub].label, pubColor(s.pub))}${evs.length ? badge('Tie-in', 'var(--t-tiein)', 't-tiein') : ''}</div>
      <h2 class="d-title">${esc(s.title)} #${esc(iss[1])}</h2><div class="d-date">${esc(fmtDate(iss[2]))} cover date</div></div></div>`;
    h += seriesLinkHtml(s, idx);
    if (evs.length) h += `<div class="d-sec"><h3>Part of</h3>${evs.map((ev) => `<button type="button" class="ev-link" data-open="${esc(ev.id)}"><span class="sw"></span><span><b>${esc(ev.title)}</b><span>${esc(fmtRange(ev.date, ev.end))}</span></span></button>`).join('')}</div>`;
    h += issueNavHtml(s, idx);
    const lookup = encodeURIComponent(`${s.name} #${iss[1]} comic`);
    h += `<p class="d-note">Issue data and covers from <a href="https://metron.cloud" target="_blank" rel="noopener">Metron</a> · <a href="https://www.google.com/search?q=${lookup}" target="_blank" rel="noopener">web search</a></p>`;
    showDrawer(h);
    scheduleSeriesDraw();
  }
  function seriesLinkHtml(s, idx) {
    return `<div class="d-sec"><h3>Series</h3><button type="button" class="ev-link" data-series="${s.id}"><span class="sw" style="background:${pubColor(s.pub)}"></span><span><b>${esc(s.name)}</b><span>${esc(s.years)} · ${s.count} issues${idx != null ? ` · issue ${idx + 1} of ${s.issues.length}` : ''}</span></span></button></div>`;
  }
  function issueNavHtml(s, idx) {
    const prev = idx > 0 ? `<button type="button" class="btn ghost" data-issue="${s.id}:${idx - 1}">← #${esc(s.issues[idx - 1][1])}</button>` : '';
    const next = idx < s.issues.length - 1 ? `<button type="button" class="btn ghost" data-issue="${s.id}:${idx + 1}">#${esc(s.issues[idx + 1][1])} →</button>` : '';
    return prev || next ? `<div class="d-actions">${prev}${next}</div>` : '';
  }

  function openSeries(s) {
    SV.selSeries = s.id;
    SV.sel = null;
    const evs = [...s.events].map((id) => BYID['event-' + id]).filter(Boolean).sort((a, b) => a.y - b.y);
    let h = `<div class="d-hero"><span class="pub-${s.pub}">${issueCoverHtml(s, s.issues[0])}</span>
      <div class="d-meta"><div class="badges">${badge(PUBS[s.pub].label, pubColor(s.pub))}${s.type ? badge(s.type, 'var(--muted)') : ''}</div>
      <h2 class="d-title">${esc(s.title)}</h2><div class="d-date">${esc(s.years)} · ${s.count} issues${s.issues.length < s.count ? ` (${s.issues.length} dated)` : ''}</div>
      <div class="d-date">${esc(s.family)}</div></div></div>`;
    if (s.keys.length) {
      h += `<div class="d-sec"><h3>Key moments</h3><ol class="reading">${s.keys.slice().sort((a, b) => a.y - b.y).map((k) => `<li><button type="button" data-open="${esc(k.id)}"><span class="rd">${esc(fmtDate(k.date))}</span><span>${esc(label(k))}<span class="rk">${esc(TYPES[k.type].short)}</span></span></button></li>`).join('')}</ol></div>`;
    }
    if (evs.length) h += `<div class="d-sec"><h3>Tied into ${evs.length} event${evs.length === 1 ? '' : 's'}</h3>${evs.map((ev) => `<button type="button" class="ev-link" data-open="${esc(ev.id)}"><span class="sw"></span><span><b>${esc(ev.title)}</b><span>${esc(fmtRange(ev.date, ev.end))}</span></span></button>`).join('')}</div>`;
    h += `<div class="d-sec"><h3>Every issue</h3><div class="issue-grid">${s.issues.map((iss, i) => {
      const key = KEY_AT.get(iss[0]);
      const tie = ARCS_OF.has(iss[0]);
      return `<button type="button" class="ig${key ? ' key t-' + key.type : ''}${tie ? ' tie' : ''}" data-issue="${s.id}:${i}" title="${esc(s.title)} #${esc(iss[1])} · ${esc(fmtDate(iss[2]))}">${iss[3] ? `<img src="${esc(IMG_BASE + iss[3])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span>#${esc(iss[1])}</span><i>${esc(fmtDate(iss[2]))}</i></button>`;
    }).join('')}</div></div>`;
    h += `<p class="d-note">Purple outline: part of an event. Gold, green or white outline: a key moment on the timeline. Data from <a href="https://metron.cloud" target="_blank" rel="noopener">Metron</a>.</p>`;
    showDrawer(h);
    scheduleSeriesDraw();
  }
  function showDrawer(h) {
    hideTip();
    drawerBody.innerHTML = h;
    drawer.hidden = false;
    drawer.scrollTop = 0;
  }

  // Jump to a series' row in the series view and open it.
  function showSeries(id) {
    const s = SERIES_BY_ID.get(+id);
    if (!s) return;
    if (state.view !== 'series') { state.view = 'series'; refresh(); }
    if (!SV.list.includes(s)) { clearAll(); }
    const row = SV.rows.find((r) => r.s === s);
    openSeries(s);
    if (row) stage.scrollTo({ top: Math.max(0, row.off - 80), left: Math.max(0, X(s.y0) - LABEL_W() - 60), behavior: 'smooth' });
  }

  // ── Events ───────────────────────────────────────────────────────
  function setFilter(key, val) {
    state[key] = state[key] === val ? null : val;
    closeSide();
    refresh({ jump: !!state[key] });
  }
  function clearAll() {
    state.q = ''; state.char = null; state.creator = null; state.event = null;
    state.types = new Set(Object.keys(TYPES));
    $('#q').value = '';
    refresh();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-open]');
    if (!t) {
      return;
    }
    if (t.dataset.pub) { state.pub = t.dataset.pub; refresh({ stats: true }); return; }
    if (t.dataset.view) {
      const was = state.view;
      const midYear = timeView() ? yearAt(stage.scrollLeft + stage.clientWidth / 2) : 1962;
      state.view = t.dataset.view;
      if (state.view !== 'series') { SV.sel = null; SV.selSeries = null; }
      refresh();
      if (timeView() && was !== state.view) { stage.scrollTop = 0; stage.scrollLeft = X(midYear) - stage.clientWidth / 2; }
      return;
    }
    if (t.dataset.series) { showSeries(t.dataset.series); return; }
    if (t.dataset.issue) {
      const [sid, idx] = t.dataset.issue.split(':');
      const s = SERIES_BY_ID.get(+sid);
      if (s) openIssue(s, +idx);
      return;
    }
    if (t.dataset.svgroup) { state.svGroup = t.dataset.svgroup; refresh(); return; }
    if (t.id === 'sv-oneshots') { state.svOneShots = !state.svOneShots; refresh(); return; }
    if (t.dataset.type && t.classList.contains('chip')) {
      const k = t.dataset.type;
      if (state.types.has(k)) state.types.delete(k); else state.types.add(k);
      refresh();
      return;
    }
    if (t.dataset.role) { state.role = t.dataset.role; renderCharList(); return; }
    if (t.dataset.char) { setFilter('char', t.dataset.char); return; }
    if (t.dataset.creator) { setFilter('creator', t.dataset.creator); return; }
    if (t.dataset.event) {
      const was = state.event;
      setFilter('event', t.dataset.event);
      if (state.event && was !== state.event) openItem('event-' + state.event);
      return;
    }
    if (t.dataset.clear) {
      if (t.dataset.clear === 'q') { state.q = ''; $('#q').value = ''; } else state[t.dataset.clear] = null;
      refresh();
      return;
    }
    if (t.dataset.open) { openItem(t.dataset.open); return; }
    if (t.dataset.year) {
      const y = +t.dataset.year;
      stage.scrollTo({ left: X(y) - 30, behavior: 'smooth' });
      return;
    }
    if (t.dataset.id && (t.classList.contains('it') || t.classList.contains('band'))) {
      if (dragMoved) return;
      openItem(t.dataset.id);
      return;
    }
    switch (t.dataset.act) {
      case 'edit': startEdit(t.dataset.id); break;
      case 'cancel-edit': if (t.dataset.id) openItem(t.dataset.id); else closeDrawer(); break;
      case 'revert': revert(t.dataset.id); break;
      case 'delete': removeAdded(t.dataset.id); break;
      case 'locate': locate(t.dataset.id); break;
      case 'series-event':
        state.event = t.dataset.eventId;
        state.view = 'series';
        refresh({ jump: true });
        break;
      case 'copy-export': copyExport(); break;
      case 'import': importEdits(); break;
      case 'clear-all': clearAll(); break;
    }
  });

  function locate(id) {
    const it = BYID[id];
    if (!it) return;
    if (!matches(it)) clearAll();
    if (state.view !== 'timeline') { state.view = 'timeline'; refresh(); }
    if (state.ppy < 300) setZoom(320);
    const el = stage.querySelector(`[data-id="${CSS.escape(id)}"]`);
    stage.scrollTo({ left: X(it.y) - stage.clientWidth / 2, top: el ? Math.max(0, el.offsetTop - 120) : 0, behavior: 'smooth' });
    if (el) el.classList.add('sel');
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'edit-form') { e.preventDefault(); saveForm(e.target); }
  });

  // Broken cover links fall back to the generated cover.
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG' && e.target.closest('.cv')) e.target.remove();
  }, true);

  $('#btn-add').addEventListener('click', () => startEdit(null));
  $('#btn-export').addEventListener('click', exportModal);
  $('#side-add').addEventListener('click', () => { closeSide(); startEdit(null); });
  $('#side-export').addEventListener('click', () => { closeSide(); exportModal(); });
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  let qTimer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value.trim(); refresh({ jump: !!state.q }); }, 160);
  });
  $('#char-q').addEventListener('input', (e) => { state.charQ = e.target.value.trim(); renderCharList(); });
  $('#creator-q').addEventListener('input', (e) => { state.creatorQ = e.target.value.trim(); renderCreatorList(); });

  // Sidebar on narrow screens
  const side = $('#side');
  const backdrop = $('#side-backdrop');
  function openSide() { side.classList.add('open'); backdrop.hidden = false; $('#btn-side').setAttribute('aria-expanded', 'true'); }
  function closeSide() { side.classList.remove('open'); backdrop.hidden = true; $('#btn-side').setAttribute('aria-expanded', 'false'); }
  $('#btn-side').addEventListener('click', () => (side.classList.contains('open') ? closeSide() : openSide()));
  backdrop.addEventListener('click', closeSide);

  // Zoom controls
  zoomInput.addEventListener('input', () => setZoom(sliderToPpy(+zoomInput.value)));
  $('#zoom-in').addEventListener('click', () => setZoom(state.ppy * 1.6));
  $('#zoom-out').addEventListener('click', () => setZoom(state.ppy / 1.6));
  $('#zoom-fit').addEventListener('click', () => { setZoom(fitPpy()); stage.scrollLeft = 0; });

  // Wheel: scroll moves through time, ctrl/⌘ zooms, shift scrolls lanes.
  let wheelZoom = 0, wheelX = 0, wheelRaf = 0;
  stage.addEventListener('wheel', (e) => {
    if (!timeView()) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      wheelZoom += e.deltaY;
      wheelX = e.clientX - stage.getBoundingClientRect().left;
      if (!wheelRaf) wheelRaf = requestAnimationFrame(() => {
        setZoom(state.ppy * Math.exp(-wheelZoom * 0.0025), wheelX);
        wheelZoom = 0; wheelRaf = 0;
      });
      return;
    }
    // The series view scrolls down through rows; the timeline scrolls through time.
    if (state.view === 'series') {
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); stage.scrollLeft += e.deltaY; }
      return;
    }
    if (e.shiftKey) { e.preventDefault(); stage.scrollTop += e.deltaY || e.deltaX; return; }
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? stage.clientWidth : 1;
      stage.scrollLeft += e.deltaY * unit;
    }
  }, { passive: false });

  // Drag to pan with a mouse (touch already scrolls natively).
  let drag = null, dragMoved = false;
  stage.addEventListener('pointerdown', (e) => {
    if (!timeView() || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
    dragMoved = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragMoved && Math.abs(dx) + Math.abs(dy) > 5) { dragMoved = true; stage.classList.add('grabbing'); hideTip(); }
    if (dragMoved) { stage.scrollLeft = drag.l - dx; stage.scrollTop = drag.t - dy; }
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    stage.classList.remove('grabbing');
    setTimeout(() => { dragMoved = false; }, 0);
  });

  // Keyboard
  stage.addEventListener('keydown', (e) => {
    if (!timeView()) return;
    const step = stage.clientWidth * 0.35;
    if (e.key === 'ArrowRight') { e.preventDefault(); stage.scrollBy({ left: step, behavior: 'smooth' }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stage.scrollBy({ left: -step, behavior: 'smooth' }); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(state.ppy * 1.4); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(state.ppy / 1.4); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#modal').hidden) closeModal();
    else if (side.classList.contains('open')) closeSide();
    else if (!drawer.hidden) closeDrawer();
  });

  // Hover tooltips for compact cards and event bars
  stage.addEventListener('pointerover', (e) => {
    const el = e.target.closest('.it, .band');
    if (el && !drag) showTip(el, e); else if (!el) hideTip();
  });
  stage.addEventListener('pointermove', (e) => moveTip(e));
  stage.addEventListener('pointerleave', hideTip);
  stage.addEventListener('scroll', () => { updateWindow(); hideTip(); if (state.view === 'series') scheduleSeriesDraw(); }, { passive: true });

  // Series view: hover and click on the canvas
  stage.addEventListener('pointermove', (e) => {
    if (state.view !== 'series' || drag && dragMoved) return;
    const hit = svHit(e.clientX, e.clientY);
    const prev = SV.hover;
    SV.hover = hit;
    const changed = (prev && prev.kind) !== (hit && hit.kind) || (prev && prev.s) !== (hit && hit.s) || (prev && prev.e) !== (hit && hit.e);
    if (changed) scheduleSeriesDraw();
    stage.style.cursor = hit && hit.kind !== 'row' ? 'pointer' : '';
    svTip(hit, e);
  });
  stage.addEventListener('pointerleave', () => { if (state.view === 'series' && SV.hover) { SV.hover = null; scheduleSeriesDraw(); } });
  stage.addEventListener('click', (e) => {
    if (state.view !== 'series' || dragMoved || e.target.id !== 'sv-canvas') return;
    const hit = svHit(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.kind === 'event') {
      const was = state.event;
      state.event = was === hit.e.event ? null : hit.e.event;
      refresh();
      if (state.event) openItem(hit.e.id);
    } else if (hit.kind === 'issue') openIssue(hit.s, hit.idx);
    else openSeries(hit.s);
  });

  // Minimap
  const mm = $('#minimap');
  let mmDrag = false;
  mm.addEventListener('pointerdown', (e) => { mmDrag = true; mm.setPointerCapture(e.pointerId); minimapJump(e.clientX, false); });
  mm.addEventListener('pointermove', (e) => { if (mmDrag) minimapJump(e.clientX, false); });
  mm.addEventListener('pointerup', () => { mmDrag = false; });
  mm.addEventListener('pointercancel', () => { mmDrag = false; });

  // Resize and theme changes
  let rTimer;
  const onResize = () => {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => {
      if (timeView()) {
        const prev = PADL;
        setPadl();
        if (prev !== PADL) renderTime();
        const min = fitPpy();
        if (state.ppy < min) setZoom(min);
        else zoomInput.value = ppyToSlider(state.ppy);
      }
      if (state.view === 'series') renderSeries();
      drawMinimap();
    }, 120);
  };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', drawMinimap);
  }
  new MutationObserver(drawMinimap).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── Boot ─────────────────────────────────────────────────────────
  buildSeries();
  buildData();
  computeStats();
  refresh();
  if (!saved.ppy) setZoom(Math.max(fitPpy(), 12), 0);
  if (timeView()) stage.scrollLeft = saved.ppy ? X(1938) - 40 : 0;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawMinimap);
})();
