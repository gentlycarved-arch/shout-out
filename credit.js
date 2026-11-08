/*! Credit 0.2 · a Credits button that fades a website back to the parts made with other people's tools · MIT */
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
    if (!el || !el.isConnected) return null;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return r;
  }

  // the colour the page fades to: the page's own background, so it reads as the page fading away
  function pageColor() {
    for (const el of [document.body, document.documentElement]) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return '#ffffff';
  }

  // ---------- styles (shared by the layer and the in-page button) ----------
  // Sites set the public --credit-* properties anywhere (usually :root); the internal --_ ones fall back to the defaults.

  const CSS = `
:host { all: initial; }
:host {
  --_accent: var(--credit-accent, #ffd84d);
  --_on-accent: var(--credit-on-accent, #141414);
  --_bg: var(--credit-bg, #ffffff);
  --_fg: var(--credit-fg, #141414);
  --_muted: var(--credit-muted, #5f5f5f);
  --_line: var(--credit-line, rgba(0,0,0,.12));
  --_font: var(--credit-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --_radius: var(--credit-radius, 10px);
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --_bg: var(--credit-bg, #1c1c1c); --_fg: var(--credit-fg, #f2f2f2);
    --_muted: var(--credit-muted, #a8a8a8); --_line: var(--credit-line, rgba(255,255,255,.14));
  }
}
:host([theme="dark"]) {
  --_bg: var(--credit-bg, #1c1c1c); --_fg: var(--credit-fg, #f2f2f2);
  --_muted: var(--credit-muted, #a8a8a8); --_line: var(--credit-line, rgba(255,255,255,.14));
}
* { box-sizing: border-box; }
.root { font-family: var(--_font); font-size: 14px; line-height: 1.4; color: var(--_fg); }
a { color: inherit; }
button { font: inherit; color: inherit; cursor: pointer; }
:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
[hidden] { display: none !important; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px 8px 12px; border: 1px solid var(--_line); border-radius: 999px;
  background: var(--_bg); color: var(--_fg); font-weight: 600; letter-spacing: .01em;
}
.btn .mark { width: 16px; height: 16px; flex: none; }
.btn .count { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: var(--_accent); color: var(--_on-accent); font-size: 12px; text-align: center; }
.btn[aria-pressed="true"] { background: var(--_accent); color: var(--_on-accent); border-color: transparent; }
.btn[aria-pressed="true"] .count { background: var(--_on-accent); color: var(--_accent); }
.inline { display: flex; justify-content: center; padding: 24px 16px; }
.float .btn { position: fixed; z-index: 2147483001; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
.pos-br .btn { right: 16px; bottom: 16px; } .pos-bl .btn { left: 16px; bottom: 16px; }
.pos-tr .btn { right: 16px; top: 16px; }    .pos-tl .btn { left: 16px; top: 16px; }

.fade { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2147483000; pointer-events: none; opacity: 0; transition: opacity .45s ease; }
.fade.on { opacity: 1; }
.box { position: fixed; z-index: 2147483000; pointer-events: none; border: 1.5px solid var(--_accent); border-radius: 4px; animation: appear .45s ease both; }
.box.flash { animation: flash .9s ease 2; }
@keyframes appear { from { opacity: 0; } }
@keyframes flash { 50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--_accent) 45%, transparent); } }
.tag {
  position: fixed; z-index: 2147483001; max-width: min(320px, calc(100vw - 16px));
  display: flex; flex-direction: column; gap: 1px; padding: 6px 10px; border-radius: 6px;
  background: var(--_accent); color: var(--_on-accent); text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,.14); font-size: 13px; animation: appear .45s ease .1s both;
}
.tag strong { font-weight: 700; }
.tag span { opacity: .85; }
.tag:hover strong, .tag:focus-visible strong { text-decoration: underline; }
.tag:focus-visible { outline-color: var(--_fg); }

.panel {
  position: fixed; z-index: 2147483001; width: min(360px, calc(100vw - 32px)); max-height: min(70vh, 560px);
  display: flex; flex-direction: column; background: var(--_bg); color: var(--_fg);
  border: 1px solid var(--_line); border-radius: var(--_radius); box-shadow: 0 10px 40px rgba(0,0,0,.18);
  right: 16px; bottom: 16px; animation: appear .3s ease both;
}
.pos-br .panel { bottom: 68px; } .pos-bl .panel { left: 16px; right: auto; bottom: 68px; }
.pos-tr .panel { top: 68px; bottom: auto; } .pos-tl .panel { left: 16px; right: auto; top: 68px; bottom: auto; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 14px 16px 10px; border-bottom: 1px solid var(--_line); }
.head h2 { margin: 0; font-size: 15px; font-weight: 700; }
.head p { margin: 2px 0 0; color: var(--_muted); font-size: 12px; }
.close { flex: none; border: 0; background: none; padding: 2px 6px; font-size: 18px; line-height: 1; color: var(--_muted); border-radius: 4px; }
.list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; }
.item { padding: 10px 16px; border-bottom: 1px solid var(--_line); }
.item:last-child { border-bottom: 0; }
.item .name { font-weight: 650; text-decoration: none; }
.item a.name:hover, .item a.name:focus-visible { text-decoration: underline; }
.item .by { color: var(--_muted); }
.item .meta { margin-top: 2px; color: var(--_muted); font-size: 12px; }
.item .note { margin: 4px 0 0; }
.item .show { margin-top: 6px; padding: 3px 9px; border: 1px solid var(--_line); border-radius: 999px; background: none; font-size: 12px; }
.item .show:hover { background: var(--_accent); color: var(--_on-accent); border-color: transparent; }
.item .off { margin-top: 6px; color: var(--_muted); font-size: 12px; }
.foot { padding: 8px 16px 12px; border-top: 1px solid var(--_line); font-size: 12px; color: var(--_muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .fade { transition: none; } .box, .tag, .panel, .box.flash { animation: none; } }
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

  function shadowHost(name) {
    const host = document.createElement(name);
    const theme = opt('theme', 'auto');
    if (theme !== 'auto') host.setAttribute('theme', theme);
    if (opt('accent')) host.style.setProperty('--credit-accent', opt('accent'));
    if (opt('on-accent')) host.style.setProperty('--credit-on-accent', opt('on-accent'));
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.append(h('style', {}, CSS));
    return { host, shadow };
  }

  // ---------- state ----------

  let credits = [];
  let site = '';
  let sourceUrl = null;
  let active = false;
  let layerShadow, panel, fade, fadeFill, holes, layer, live;
  let triggers = [];   // every element that opens and closes Credits
  let keepLit = [];    // triggers stay lit while the page fades
  let marks = [];      // { credit, el, box, tag, hole }
  let frame = 0;

  // ---------- the button ----------
  // Recommended: at the bottom of the page. A site can choose the place with an element marked data-credit-button
  // (a <button> or <a> there becomes the button itself, in the site's own style; any other element gets Credit's button inside it),
  // or float it in a corner with data-position="bottom-right" and so on.

  function makeButton() {
    const label = opt('label', 'Credits');
    const b = h('button', { class: 'btn', type: 'button', part: 'button', 'aria-pressed': 'false', 'aria-controls': 'credit-panel', onclick: toggle },
      h('span', { html: MARK }), label, h('span', { class: 'count', 'aria-hidden': 'true' }, String(credits.length)));
    b.setAttribute('aria-label', label + ' (' + credits.length + ')');
    return b;
  }

  function placeButtons(rootEl) {
    if (opt('button') === 'none') return;
    const own = document.querySelectorAll('[data-credit-button]');
    if (own.length) {
      own.forEach((el) => {
        if (el.matches('button, a, [role="button"]')) {
          el.setAttribute('aria-pressed', 'false');
          el.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
          triggers.push(el);
        } else {
          const { host, shadow } = shadowHost('credit-button');
          const b = makeButton();
          shadow.append(h('div', { class: 'root' }, b));
          el.append(host);
          triggers.push(b);
          keepLit.push(host);
        }
      });
      return;
    }
    const corner = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[opt('position', 'bottom')];
    if (corner) {
      rootEl.classList.add('float', 'pos-' + corner);
      const b = makeButton();
      rootEl.append(b);
      triggers.push(b);
      return;
    }
    // the default: centred at the foot of the page, inside the site's footer when it has one
    const { host, shadow } = shadowHost('credit-button');
    const b = makeButton();
    shadow.append(h('div', { class: 'root inline' }, b));
    const footers = [...document.querySelectorAll('footer')].filter((f) => !f.closest('article, aside, section, dialog'));
    (footers[footers.length - 1] || document.body).append(host);
    triggers.push(b);
    keepLit.push(host);
  }

  // ---------- the layer: fade, outlines, labels and the list ----------

  function build() {
    const { host, shadow } = shadowHost('credit-layer');
    layerShadow = shadow;
    const rootEl = h('div', { class: 'root' });
    live = h('div', { class: 'sr', 'aria-live': 'polite' });

    const ns = 'http://www.w3.org/2000/svg';
    fade = document.createElementNS(ns, 'svg');
    fade.setAttribute('class', 'fade');
    fade.setAttribute('aria-hidden', 'true');
    fade.innerHTML = '<defs><mask id="credit-holes" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="white"/><g class="holes"></g></mask></defs><rect class="fill" x="0" y="0" width="100%" height="100%" mask="url(#credit-holes)"/>';
    holes = fade.querySelector('.holes');
    fadeFill = fade.querySelector('.fill');
    fade.style.display = 'none';
    layer = h('div', {});

    panel = h('section', { class: 'panel', id: 'credit-panel', part: 'panel', 'aria-label': 'Credits', hidden: true });
    rootEl.append(fade, layer, panel, live);
    placeButtons(rootEl);
    shadow.append(rootEl);
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

  const ns = 'http://www.w3.org/2000/svg';
  const newHole = () => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('fill', 'black'); r.setAttribute('rx', '4'); holes.append(r); return r; };

  function mark() {
    holes.textContent = '';
    layer.textContent = '';
    marks = [];
    for (const credit of credits) {
      for (const el of targetsOf(credit)) {
        const box = h('div', { class: 'box', part: 'outline' });
        const tag = link(credit.url, 'tag', h('strong', {}, credit.name));
        tag.setAttribute('part', 'label');
        if (credit.author) tag.append(h('span', {}, 'by ' + credit.author));
        layer.append(box, tag);
        marks.push({ credit, el, box, tag, hole: newHole() });
      }
    }
    keepLit = keepLit.filter((el) => el.isConnected);
    for (const el of keepLit.concat(triggers.filter((t) => t.getRootNode() === document))) {
      marks.push({ credit: null, el, hole: newHole() });
    }
  }

  // something else on top (a pop-up, a menu) hides the part, so it isn't lit through it
  function covered(el, r, vw, vh) {
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    const hit = document.elementsFromPoint(x, y).find((e) => e.localName !== 'credit-layer');
    if (!hit) return false;
    if (hit === el || el.contains(hit) || hit.contains(el)) return false;
    const box = el.ownerSVGElement;   // a picture inside an <svg> shares it with the svg's other shapes
    return !(box && box.contains(hit));
  }

  function setHole(hole, r) {
    if (!r) { hole.setAttribute('width', 0); return; }
    hole.setAttribute('x', r.left); hole.setAttribute('y', r.top);
    hole.setAttribute('width', r.width); hole.setAttribute('height', r.height);
  }

  function place() {
    const vw = innerWidth, vh = innerHeight;
    const taken = [];
    for (const m of marks) {
      const r = visibleRect(m.el);
      const onScreen = r && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && !covered(m.el, r, vw, vh);
      setHole(m.hole, onScreen ? r : null);
      if (!m.credit) continue;
      m.box.hidden = m.tag.hidden = !onScreen;
      if (!onScreen) continue;
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

  const pressed = (on) => triggers.forEach((t) => t.setAttribute('aria-pressed', String(on)));
  let hideTimer = 0;

  function open() {
    if (active || !layerShadow) return;
    active = true;
    clearTimeout(hideTimer);
    fadeFill.style.fill = 'var(--credit-fade-color, ' + pageColor() + ')';
    fadeFill.style.fillOpacity = 'var(--credit-fade, 0.9)';
    mark();
    renderPanel();
    place();
    fade.style.display = '';
    requestAnimationFrame(() => fade.classList.add('on'));
    panel.hidden = false;
    pressed(true);
    loop();
    const shown = new Set(marks.filter((m) => m.credit && visibleRect(m.el)).map((m) => m.credit)).size;
    live.textContent = 'Credits on. ' + credits.length + (credits.length === 1 ? ' credit, ' : ' credits, ') + shown + ' shown on this page.';
    document.dispatchEvent(new CustomEvent('credit:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    fade.classList.remove('on');
    panel.hidden = true;
    layer.textContent = '';
    hideTimer = setTimeout(() => {
      cancelAnimationFrame(frame);
      fade.style.display = 'none';
      holes.textContent = '';
      marks = [];
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 460);
    pressed(false);
    live.textContent = 'Credits off.';
    if (layerShadow.activeElement && triggers[0]) triggers[0].focus();
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
