/*! Credit 0.1 · a Credits button that highlights the parts of a website made with other people's tools · MIT */
(() => {
  'use strict';
  if (window.Credit) return;

  const script = document.currentScript;
  const opt = (name, fallback) => (script && script.getAttribute('data-' + name)) || fallback;

  // ---------- data ----------

  async function load() {
    const src = opt('src');
    if (!src) {
      const inline = document.querySelector('script[type="application/credits+json"]');
      if (inline) return { data: JSON.parse(inline.textContent), url: null };
    }
    const link = document.querySelector('link[rel~="credits"]');
    const url = new URL(src || (link && link.getAttribute('href')) || 'credits.json', document.baseURI).href;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Credit: could not load ' + url + ' (' + res.status + ')');
    return { data: await res.json(), url };
  }

  const isUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

  function normalize(data) {
    const list = Array.isArray(data) ? data : (data && data.credits) || [];
    return list
      .filter((c) => c && c.id && c.name)
      .map((c) => ({
        id: String(c.id),
        name: String(c.name),
        author: c.author ? String(c.author) : '',
        authorUrl: isUrl(c.authorUrl) ? c.authorUrl : '',
        url: isUrl(c.url) ? c.url : '',
        license: c.license ? String(c.license) : '',
        kind: c.kind ? String(c.kind) : '',
        note: c.note ? String(c.note) : '',
        selectors: [].concat(c.selectors || []).map(String),
      }));
  }

  function targetsOf(credit) {
    const found = new Set();
    document.querySelectorAll('[data-credit]').forEach((el) => {
      if (el.getAttribute('data-credit').split(/\s+/).includes(credit.id)) found.add(el);
    });
    credit.selectors.forEach((s) => {
      try { document.querySelectorAll(s).forEach((el) => found.add(el)); } catch (e) { console.warn('Credit: bad selector', s); }
    });
    return [...found];
  }

  function visibleRect(el) {
    if (!el.isConnected) return null;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return r;
  }

  // ---------- interface ----------

  const CSS = `
:host { all: initial; }
:host {
  --credit-accent: #ffd84d;
  --credit-on-accent: #141414;
  --credit-bg: #ffffff;
  --credit-fg: #141414;
  --credit-muted: #5f5f5f;
  --credit-line: rgba(0,0,0,.12);
  --credit-dim: rgba(12,12,12,.55);
  --credit-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --credit-radius: 10px;
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --credit-bg: #1c1c1c; --credit-fg: #f2f2f2; --credit-muted: #a8a8a8;
    --credit-line: rgba(255,255,255,.14); --credit-dim: rgba(0,0,0,.62);
  }
}
:host([theme="dark"]) {
  --credit-bg: #1c1c1c; --credit-fg: #f2f2f2; --credit-muted: #a8a8a8;
  --credit-line: rgba(255,255,255,.14); --credit-dim: rgba(0,0,0,.62);
}
* { box-sizing: border-box; }
.root { font-family: var(--credit-font); font-size: 14px; line-height: 1.4; color: var(--credit-fg); }
a { color: inherit; }
button { font: inherit; color: inherit; cursor: pointer; }
:focus-visible { outline: 2px solid var(--credit-accent); outline-offset: 2px; }

.btn {
  position: fixed; z-index: 2147483001; display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px 9px 12px; border: 1px solid var(--credit-line); border-radius: 999px;
  background: var(--credit-bg); color: var(--credit-fg); box-shadow: 0 2px 10px rgba(0,0,0,.12);
  font-weight: 600; letter-spacing: .01em;
}
.btn .mark { width: 16px; height: 16px; flex: none; }
.btn .count { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: var(--credit-accent); color: var(--credit-on-accent); font-size: 12px; text-align: center; }
.btn[aria-pressed="true"] { background: var(--credit-accent); color: var(--credit-on-accent); border-color: transparent; }
.btn[aria-pressed="true"] .count { background: var(--credit-on-accent); color: var(--credit-accent); }
.pos-br .btn { right: 16px; bottom: 16px; } .pos-bl .btn { left: 16px; bottom: 16px; }
.pos-tr .btn { right: 16px; top: 16px; }    .pos-tl .btn { left: 16px; top: 16px; }

.dim { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2147483000; pointer-events: none; }
.dim rect.fill { fill: var(--credit-dim); }
.box { position: fixed; z-index: 2147483000; pointer-events: none; border: 2px solid var(--credit-accent); border-radius: 4px; }
.box.flash { animation: flash .9s ease 2; }
@keyframes flash { 50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--credit-accent) 45%, transparent); } }
.tag {
  position: fixed; z-index: 2147483001; max-width: min(320px, calc(100vw - 16px));
  display: flex; flex-direction: column; gap: 1px; padding: 6px 10px; border-radius: 6px;
  background: var(--credit-accent); color: var(--credit-on-accent); text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,.18); font-size: 13px;
}
.tag strong { font-weight: 700; }
.tag span { opacity: .85; }
.tag:hover strong, .tag:focus-visible strong { text-decoration: underline; }
.tag:focus-visible { outline-color: var(--credit-fg); }

.panel {
  position: fixed; z-index: 2147483001; width: min(360px, calc(100vw - 32px)); max-height: min(70vh, 560px);
  display: flex; flex-direction: column; background: var(--credit-bg); color: var(--credit-fg);
  border: 1px solid var(--credit-line); border-radius: var(--credit-radius); box-shadow: 0 10px 40px rgba(0,0,0,.25);
}
.pos-br .panel { right: 16px; bottom: 68px; } .pos-bl .panel { left: 16px; bottom: 68px; }
.pos-tr .panel { right: 16px; top: 68px; }    .pos-tl .panel { left: 16px; top: 68px; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 14px 16px 10px; border-bottom: 1px solid var(--credit-line); }
.head h2 { margin: 0; font-size: 15px; font-weight: 700; }
.head p { margin: 2px 0 0; color: var(--credit-muted); font-size: 12px; }
.close { flex: none; border: 0; background: none; padding: 2px 6px; font-size: 18px; line-height: 1; color: var(--credit-muted); border-radius: 4px; }
.list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; }
.item { padding: 10px 16px; border-bottom: 1px solid var(--credit-line); }
.item:last-child { border-bottom: 0; }
.item .name { font-weight: 650; text-decoration: none; }
.item a.name:hover, .item a.name:focus-visible { text-decoration: underline; }
.item .by { color: var(--credit-muted); }
.item .meta { margin-top: 2px; color: var(--credit-muted); font-size: 12px; }
.item .note { margin: 4px 0 0; }
.item .show { margin-top: 6px; padding: 3px 9px; border: 1px solid var(--credit-line); border-radius: 999px; background: none; font-size: 12px; }
.item .show:hover { background: var(--credit-accent); color: var(--credit-on-accent); border-color: transparent; }
.item .off { margin-top: 6px; color: var(--credit-muted); font-size: 12px; }
.foot { padding: 8px 16px 12px; border-top: 1px solid var(--credit-line); font-size: 12px; color: var(--credit-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) { .box.flash { animation: none; } }
`;

  const MARK = '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="8" cy="8" r="2.5" fill="currentColor"/></svg>';

  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids) if (kid != null && kid !== false) el.append(kid);
    return el;
  };
  const link = (href, cls, text) => (href ? h('a', { class: cls, href, target: '_blank', rel: 'noopener' }, text) : h('span', { class: cls }, text));

  // ---------- state ----------

  let credits = [];
  let site = '';
  let sourceUrl = null;
  let active = false;
  let shadow, rootEl, btn, panel, dimSvg, holes, layer, live;
  let marks = []; // { credit, el, box, tag, hole }
  let frame = 0;

  function build() {
    const host = document.createElement('credit-layer');
    const theme = opt('theme', 'auto');
    if (theme !== 'auto') host.setAttribute('theme', theme);
    if (opt('accent')) host.style.setProperty('--credit-accent', opt('accent'));
    if (opt('on-accent')) host.style.setProperty('--credit-on-accent', opt('on-accent'));
    shadow = host.attachShadow({ mode: 'open' });
    const pos = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[opt('position', 'bottom-right')] || 'br';

    rootEl = h('div', { class: 'root pos-' + pos });
    live = h('div', { class: 'sr', 'aria-live': 'polite' });

    const ns = 'http://www.w3.org/2000/svg';
    dimSvg = document.createElementNS(ns, 'svg');
    dimSvg.setAttribute('class', 'dim');
    dimSvg.setAttribute('aria-hidden', 'true');
    dimSvg.innerHTML = '<defs><mask id="credit-holes" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="white"/><g class="holes"></g></mask></defs><rect class="fill" x="0" y="0" width="100%" height="100%" mask="url(#credit-holes)"/>';
    holes = dimSvg.querySelector('.holes');
    dimSvg.style.display = 'none';
    layer = h('div', { class: 'layer' });

    const label = opt('label', 'Credits');
    btn = h('button', { class: 'btn', type: 'button', part: 'button', 'aria-pressed': 'false', 'aria-controls': 'credit-panel', onclick: toggle },
      h('span', { html: MARK }), label, h('span', { class: 'count', 'aria-hidden': 'true' }, String(credits.length)));
    btn.setAttribute('aria-label', label + ' (' + credits.length + ')');
    if (opt('button') === 'none') btn.hidden = true;

    panel = h('section', { class: 'panel', id: 'credit-panel', part: 'panel', 'aria-label': 'Credits', hidden: true });
    rootEl.append(dimSvg, layer, panel, btn, live);
    shadow.append(h('style', {}, CSS), rootEl);
    document.body.append(host);
  }

  function renderPanel() {
    panel.textContent = '';
    const head = h('div', { class: 'head' },
      h('div', {}, h('h2', {}, 'Credits'), h('p', {}, site ? site + ' was made with these tools and works' : 'This page was made with these tools and works')),
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close credits', onclick: close }, '×'));
    const list = h('ul', { class: 'list' });
    for (const c of credits) {
      const tagged = marks.filter((m) => m.credit === c);
      const shown = tagged.filter((m) => visibleRect(m.el));
      const meta = [c.kind, c.license].filter(Boolean).join(' · ');
      list.append(h('li', { class: 'item' },
        h('div', {}, link(c.url, 'name', c.name), c.author ? h('span', { class: 'by' }, ' by ', link(c.authorUrl, '', c.author)) : null),
        meta ? h('div', { class: 'meta' }, meta) : null,
        c.note ? h('p', { class: 'note' }, c.note) : null,
        shown.length
          ? h('button', { class: 'show', type: 'button', onclick: () => showOnPage(c) }, shown.length > 1 ? 'Show on page (' + shown.length + ')' : 'Show on page')
          : tagged.length ? h('div', { class: 'off' }, 'Not visible right now') : null));
    }
    panel.append(head, list);
    if (sourceUrl) panel.append(h('div', { class: 'foot' }, link(sourceUrl, '', 'View credits.json')));
  }

  function mark() {
    holes.textContent = '';
    layer.textContent = '';
    marks = [];
    const ns = 'http://www.w3.org/2000/svg';
    for (const credit of credits) {
      for (const el of targetsOf(credit)) {
        const hole = document.createElementNS(ns, 'rect');
        hole.setAttribute('fill', 'black');
        hole.setAttribute('rx', '4');
        const box = h('div', { class: 'box', part: 'outline' });
        const tag = link(credit.url, 'tag', h('strong', {}, credit.name));
        tag.setAttribute('part', 'label');
        if (credit.author) tag.append(h('span', {}, 'by ' + credit.author));
        holes.append(hole);
        layer.append(box, tag);
        marks.push({ credit, el, box, tag, hole });
      }
    }
  }

  function place() {
    const vw = innerWidth, vh = innerHeight;
    const taken = [];
    for (const m of marks) {
      const r = visibleRect(m.el);
      const onScreen = r && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
      m.box.hidden = m.tag.hidden = !onScreen;
      m.hole.setAttribute('width', onScreen ? r.width : 0);
      if (!onScreen) continue;
      m.hole.setAttribute('x', r.left); m.hole.setAttribute('y', r.top);
      m.hole.setAttribute('height', r.height);
      Object.assign(m.box.style, { left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
      const tw = m.tag.offsetWidth, th = m.tag.offsetHeight;
      let x = Math.min(Math.max(8, r.left - 3), vw - tw - 8);
      let y = r.top - th - 10;
      if (y < 8) y = Math.max(8, r.top + 8);
      for (const t of taken) if (Math.abs(t.x - x) < tw && Math.abs(t.y - y) < th) y = t.y + th + 4;
      taken.push({ x, y });
      m.tag.style.left = x + 'px';
      m.tag.style.top = y + 'px';
    }
  }

  function loop() { place(); frame = requestAnimationFrame(loop); }

  function showOnPage(credit) {
    const m = marks.find((m) => m.credit === credit && visibleRect(m.el));
    if (!m) return;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });
    marks.filter((x) => x.credit === credit).forEach((x) => {
      x.box.classList.remove('flash'); void x.box.offsetWidth; x.box.classList.add('flash');
    });
    m.tag.focus({ preventScroll: true });
  }

  function open() {
    if (active || !shadow) return;
    active = true;
    mark();
    renderPanel();
    dimSvg.style.display = '';
    panel.hidden = false;
    btn.setAttribute('aria-pressed', 'true');
    loop();
    const shown = new Set(marks.filter((m) => visibleRect(m.el)).map((m) => m.credit)).size;
    live.textContent = 'Credits on. ' + credits.length + (credits.length === 1 ? ' credit, ' : ' credits, ') + shown + ' highlighted on this page.';
    document.dispatchEvent(new CustomEvent('credit:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    dimSvg.style.display = 'none';
    panel.hidden = true;
    holes.textContent = layer.textContent = '';
    marks = [];
    btn.setAttribute('aria-pressed', 'false');
    live.textContent = 'Credits off.';
    if (shadow.activeElement && !btn.hidden) btn.focus();
    document.dispatchEvent(new CustomEvent('credit:toggle', { detail: { open: false } }));
  }

  function toggle() { active ? close() : open(); }

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) close(); });

  window.Credit = {
    open, close, toggle,
    get credits() { return credits.slice(); },
    get isOpen() { return active; },
  };

  async function start() {
    try {
      const { data, url } = await load();
      credits = normalize(data);
      site = (data && data.site) || '';
      sourceUrl = url;
    } catch (err) {
      console.warn(err.message || err);
      return;
    }
    if (!credits.length) return;
    build();
    if (location.hash === '#credits') open();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
