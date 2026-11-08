/*! Credit 0.3 · a Credits button that fades a website back to the parts made with other people's tools · MIT */
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

  // ---------- icons (one per kind of credit) ----------

  const svg = (d) => '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICONS = {
    credit: svg('<rect x="3" y="3" width="14" height="14" rx="3" stroke-dasharray="2.6 2.4"/><circle cx="10" cy="10" r="2.4" fill="currentColor" stroke="none"/>'),
    shader: svg('<path d="M3 6h7M3 10h5M3 14h7"/><path d="M14.5 5.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor"/>'),
    ui: svg('<rect x="2.5" y="4" width="15" height="12" rx="2.5"/><path d="M2.5 8h15M7 8v8"/>'),
    font: svg('<path d="M5 5h10M10 5v11M8 16h4"/>'),
    icons: svg('<circle cx="7" cy="7" r="3"/><rect x="11" y="11" width="6" height="6" rx="1.5"/><path d="M13.5 3.5l3 3-3 3-3-3z"/>'),
    image: svg('<rect x="3" y="3.5" width="14" height="13" rx="2.5"/><circle cx="7.5" cy="8" r="1.5"/><path d="M3.5 15l4.5-4.5 3 3 2-2 3.5 3.5"/>'),
    code: svg('<path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/>'),
    animation: svg('<path d="M4 14c2-6 4-8 6-8s4 2 6 8"/><circle cx="10" cy="6" r="1.4" fill="currentColor" stroke="none"/>'),
    music: svg('<path d="M8 15V5l8-1.5v10"/><circle cx="6" cy="15" r="2"/><circle cx="14" cy="13.5" r="2"/>'),
    back: svg('<path d="M15.5 10h-11M9 5l-5 5 5 5"/>'),
    out: svg('<path d="M8 4H5a1.5 1.5 0 0 0-1.5 1.5v9.5A1.5 1.5 0 0 0 5 16.5h9.5A1.5 1.5 0 0 0 16 15v-3M11 3.5h5.5V9M16.5 3.5L9 11"/>'),
    find: svg('<rect x="3" y="3" width="14" height="14" rx="3"/><path d="M10 6.5v7M6.5 10h7"/>'),
    license: svg('<path d="M5 3.5h7l3.5 3.5v9.5h-10.5z"/><path d="M12 3.5V7h3.5M7.5 11h5M7.5 14h3"/>'),
  };
  const KIND_ICON = { library: 'code', template: 'ui', component: 'ui', 'ui-kit': 'ui', icon: 'icons', photo: 'image', illustration: 'image', video: 'animation', motion: 'animation', snippet: 'code', typeface: 'font' };
  const iconFor = (kind) => ICONS[kind] || ICONS[KIND_ICON[kind]] || ICONS.credit;

  // ---------- styles (shared by the layer and the in-page button) ----------
  // Sites set the public --credit-* properties anywhere (usually :root); the internal --_ ones fall back to the defaults.

  const CSS = `
:host { all: initial; }
:host {
  --_accent: var(--credit-accent, #0b6cff);
  --_on-accent: var(--credit-on-accent, #ffffff);
  --_bg: var(--credit-bg, #ffffff);
  --_tray: var(--credit-tray, #e8e8e8);
  --_chip: var(--credit-chip, #f1f1f1);
  --_chip-on: var(--credit-chip-active, #ffffff);
  --_fg: var(--credit-fg, #232323);
  --_muted: var(--credit-muted, #7a7a7a);
  --_line: var(--credit-line, rgba(0,0,0,.07));
  --_shadow: var(--credit-shadow, 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08));
  --_font: var(--credit-font, "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --_r: var(--credit-radius, 999px);
  --_card-r: var(--credit-card-radius, 28px);
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --_bg: var(--credit-bg, #1f1f1f); --_tray: var(--credit-tray, #2b2b2b); --_chip: var(--credit-chip, #333333);
    --_chip-on: var(--credit-chip-active, #4a4a4a); --_fg: var(--credit-fg, #f2f2f2); --_muted: var(--credit-muted, #a3a3a3);
    --_line: var(--credit-line, rgba(255,255,255,.08));
  }
}
:host([theme="dark"]) {
  --_bg: var(--credit-bg, #1f1f1f); --_tray: var(--credit-tray, #2b2b2b); --_chip: var(--credit-chip, #333333);
  --_chip-on: var(--credit-chip-active, #4a4a4a); --_fg: var(--credit-fg, #f2f2f2); --_muted: var(--credit-muted, #a3a3a3);
  --_line: var(--credit-line, rgba(255,255,255,.08));
}
* { box-sizing: border-box; }
.root { font-family: var(--_font); font-size: 15px; line-height: 1.3; color: var(--_fg); -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; margin: 0; }
:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
[hidden] { display: none !important; }
.ic { width: 20px; height: 20px; flex: none; }

/* trays and pills */
.tray { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--_tray); border-radius: var(--_r); box-shadow: var(--_shadow); }
.chip {
  position: relative; display: inline-flex; align-items: center; gap: 9px; flex: none;
  min-height: 48px; padding: 0 18px 0 16px; border-radius: var(--_r); background: var(--_chip); color: var(--_muted);
  white-space: nowrap; transition: background .15s, color .15s;
}
.chip:hover { color: var(--_fg); }
.chip[aria-pressed="true"] { background: var(--_chip-on); color: var(--_fg); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.chip[aria-pressed="true"]::after { content: ""; position: absolute; left: 50%; bottom: -10px; width: 18px; height: 4px; margin-left: -9px; border-radius: 4px; background: var(--_accent); }
.chip .two { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
.chip .two small { font-size: 13px; color: var(--_muted); }
.round { width: 48px; min-height: 48px; padding: 0; justify-content: center; background: color-mix(in srgb, var(--_tray) 70%, var(--_fg) 8%); }
.count { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--_accent); color: var(--_on-accent); font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }

/* the Credits button */
.inline { display: flex; justify-content: center; padding: 24px 16px 28px; }
.launcher .chip { color: var(--_fg); }
.float .launcher { position: fixed; z-index: 2147483001; }
.pos-br .launcher { right: 16px; bottom: 16px; } .pos-bl .launcher { left: 16px; bottom: 16px; }
.pos-tr .launcher { right: 16px; top: 16px; }    .pos-tl .launcher { left: 16px; top: 16px; }

/* the fade, outlines and labels */
.fade { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2147483000; pointer-events: none; opacity: 0; transition: opacity .45s ease; }
.fade.on { opacity: 1; }
.box { position: fixed; z-index: 2147483000; pointer-events: none; border: 2.5px solid var(--_accent); border-radius: 10px; animation: appear .45s ease both; }
.box::after {
  content: ""; position: absolute; top: -11px; right: -11px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--_accent) no-repeat center / 12px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2l2.3 2.3 4.7-5' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  box-shadow: 0 0 0 2px var(--_bg);
}
.box.flash { animation: flash .9s ease 2; }
@keyframes appear { from { opacity: 0; } }
@keyframes flash { 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--_accent) 25%, transparent); } }
.tag {
  position: fixed; z-index: 2147483001; max-width: min(320px, calc(100vw - 16px));
  display: inline-flex; align-items: center; gap: 9px; padding: 7px 16px 7px 12px; border-radius: var(--_r);
  background: var(--_bg); color: var(--_fg); box-shadow: var(--_shadow); animation: appear .45s ease .1s both;
}
.tag .ic { color: var(--_accent); }
.tag .two { display: flex; flex-direction: column; line-height: 1.15; }
.tag strong { font-weight: 600; font-size: 14px; }
.tag small { font-size: 12.5px; color: var(--_muted); }
.tag:hover strong { text-decoration: underline; }

/* the dock: a card for the chosen credit over a tray of every credit */
.dock {
  position: fixed; z-index: 2147483001; left: 50%; bottom: 20px; transform: translateX(-50%);
  width: max-content; max-width: calc(100vw - 24px); display: flex; flex-direction: column; align-items: center; gap: 10px;
  animation: rise .35s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes rise { from { opacity: 0; transform: translate(-50%, 14px); } }
.card { width: min(560px, calc(100vw - 24px)); padding: 10px; background: var(--_bg); border-radius: var(--_card-r); box-shadow: var(--_shadow); }
.card .text { padding: 8px 10px 12px; }
.card h2 { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: -.01em; }
.card h2 .by { font-weight: 400; color: var(--_muted); }
.card h2 .by a:hover, .card h2 > a:hover { text-decoration: underline; }
.card p { margin: 4px 0 0; color: var(--_muted); font-size: 14px; line-height: 1.45; }
.card .row { display: flex; flex-wrap: wrap; gap: 8px; }
.card .chip { min-height: 40px; padding: 0 14px 0 12px; font-size: 14px; }
.card .chip.go { background: var(--_accent); color: var(--_on-accent); }
.card .chip.off { cursor: default; }
.bar { max-width: 100%; overflow-x: auto; overflow-y: visible; padding-bottom: 14px; margin-bottom: -14px; scrollbar-width: none; }
.bar::-webkit-scrollbar { display: none; }
.bar .tray { width: max-content; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 520px) { .chip { min-height: 44px; padding: 0 14px 0 12px; } .round { width: 44px; } .dock { bottom: 12px; } }
@media (prefers-reduced-motion: reduce) { .fade { transition: none; } .box, .tag, .dock, .box.flash { animation: none; } }
`;

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
  const icon = (html) => h('span', { html, style: 'display:contents' });
  const ext = (href, cls, ...kids) => (href ? h('a', { class: cls, href, target: '_blank', rel: 'noopener' }, ...kids) : h('span', { class: cls }, ...kids));

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
  let active = false;
  let chosen = null;   // the credit shown in the card
  let layerShadow, dock, fade, fadeFill, holes, layer, live;
  let triggers = [];   // every element that opens and closes Credits
  let keepLit = [];    // the button stays lit while the page fades
  let marks = [];      // { credit, el, box, tag, hole }
  let frame = 0;

  // ---------- the button ----------
  // Recommended: at the bottom of the page. A site can choose the place with an element marked data-credit-button
  // (a <button> or <a> there becomes the button itself, in the site's own style; any other element gets Credit's button inside it),
  // or float it in a corner with data-position="bottom-right" and so on.

  function makeButton() {
    const label = opt('label', 'Credits');
    const b = h('button', { class: 'chip', type: 'button', part: 'button', 'aria-pressed': 'false', 'aria-controls': 'credit-dock', onclick: toggle },
      icon(ICONS.credit), label, h('span', { class: 'count', 'aria-hidden': 'true' }, String(credits.length)));
    b.setAttribute('aria-label', label + ' (' + credits.length + ')');
    return { tray: h('div', { class: 'tray launcher' }, b), b };
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
          const { tray, b } = makeButton();
          shadow.append(h('div', { class: 'root' }, tray));
          el.append(host);
          triggers.push(b);
          keepLit.push(tray);
        }
      });
      return;
    }
    const corner = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[opt('position', 'bottom')];
    const { tray, b } = makeButton();
    triggers.push(b);
    if (corner) {
      rootEl.classList.add('float', 'pos-' + corner);
      rootEl.append(tray);
      return;
    }
    // the default: centred at the foot of the page, inside the site's footer when it has one
    const { host, shadow } = shadowHost('credit-button');
    shadow.append(h('div', { class: 'root inline' }, tray));
    const footers = [...document.querySelectorAll('footer')].filter((f) => !f.closest('article, aside, section, dialog'));
    (footers[footers.length - 1] || document.body).append(host);
    keepLit.push(tray);
  }

  // ---------- the layer: fade, outlines, labels and the dock ----------

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

    dock = h('section', { class: 'dock', id: 'credit-dock', part: 'panel', 'aria-label': site ? 'Credits for ' + site : 'Credits', hidden: true });
    rootEl.append(fade, layer, dock, live);
    placeButtons(rootEl);
    shadow.append(rootEl);
    document.body.append(host);
  }

  const shownOf = (c) => marks.filter((m) => m.credit === c && visibleRect(m.el));

  function renderDock() {
    dock.textContent = '';
    const c = chosen;
    const tagged = marks.filter((m) => m.credit === c);
    const shown = shownOf(c);
    const row = h('div', { class: 'row' });
    if (c.kind) row.append(h('span', { class: 'chip off' }, icon(iconFor(c.kind)), c.kind));
    if (c.license) row.append(h('span', { class: 'chip off' }, icon(ICONS.license), c.license));
    if (shown.length) row.append(h('button', { class: 'chip', type: 'button', onclick: () => showOnPage(c) }, icon(ICONS.find), shown.length > 1 ? 'Show on page (' + shown.length + ')' : 'Show on page'));
    else if (tagged.length) row.append(h('span', { class: 'chip off' }, 'Not visible right now'));
    if (c.url) row.append(ext(c.url, 'chip go', 'Open original', icon(ICONS.out)));

    const card = h('div', { class: 'card' },
      h('div', { class: 'text' },
        h('h2', {}, ext(c.url, '', c.name), c.author ? h('span', { class: 'by' }, ' by ', ext(c.authorUrl, '', c.author)) : null),
        c.note ? h('p', {}, c.note) : null),
      row);

    const tray = h('div', { class: 'tray' },
      h('button', { class: 'chip round', type: 'button', 'aria-label': 'Close credits', title: 'Close (Esc)', onclick: close }, icon(ICONS.back)));
    for (const x of credits) {
      tray.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(x === c), onclick: () => choose(x, true) },
        icon(iconFor(x.kind)),
        h('span', { class: 'two' }, x.name, x.author ? h('small', {}, x.author) : null)));
    }
    dock.append(card, h('div', { class: 'bar' }, tray));
  }

  function choose(c, show) {
    chosen = c;
    const focusIndex = credits.indexOf(c);
    renderDock();
    const btns = dock.querySelectorAll('.bar .chip:not(.round)');
    if (btns[focusIndex]) { btns[focusIndex].focus({ preventScroll: true }); btns[focusIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    if (show && shownOf(c).length) showOnPage(c, true);
  }

  const ns = 'http://www.w3.org/2000/svg';
  const newHole = () => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('fill', 'black'); r.setAttribute('rx', '10'); holes.append(r); return r; };

  function mark() {
    holes.textContent = '';
    layer.textContent = '';
    marks = [];
    for (const credit of credits) {
      for (const el of targetsOf(credit)) {
        const box = h('div', { class: 'box', part: 'outline' });
        const tag = ext(credit.url, 'tag', icon(iconFor(credit.kind)), h('span', { class: 'two' }, h('strong', {}, credit.name), credit.author ? h('small', {}, credit.author) : null));
        tag.setAttribute('part', 'label');
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
      const onScreen = r && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && (!m.credit || !covered(m.el, r, vw, vh));
      setHole(m.hole, onScreen ? r : null);
      if (!m.credit) continue;
      m.box.hidden = m.tag.hidden = !onScreen;
      if (!onScreen) continue;
      Object.assign(m.box.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
      const tw = m.tag.offsetWidth, th = m.tag.offsetHeight;
      let x = Math.min(Math.max(8, r.left - 4), vw - tw - 8);
      let y = r.top - th - 14;
      if (y < 8) y = Math.max(8, r.top + 10);
      for (const t of taken) if (Math.abs(t.x - x) < tw && Math.abs(t.y - y) < th) y = t.y + th + 6;
      taken.push({ x, y });
      m.tag.style.left = x + 'px';
      m.tag.style.top = y + 'px';
    }
  }

  function loop() { place(); frame = requestAnimationFrame(loop); }

  function showOnPage(credit, keepFocus) {
    const m = marks.find((m) => m.credit === credit && visibleRect(m.el));
    if (!m) return;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });
    marks.filter((x) => x.credit === credit).forEach((x) => {
      x.box.classList.remove('flash'); void x.box.offsetWidth; x.box.classList.add('flash');
    });
    if (!keepFocus) m.tag.focus({ preventScroll: true });
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
    place();
    chosen = credits.find((c) => shownOf(c).length) || credits[0];
    renderDock();
    fade.style.display = '';
    requestAnimationFrame(() => fade.classList.add('on'));
    dock.hidden = false;
    pressed(true);
    loop();
    const shown = credits.filter((c) => shownOf(c).length).length;
    live.textContent = 'Credits on. ' + credits.length + (credits.length === 1 ? ' credit, ' : ' credits, ') + shown + ' shown on this page.';
    document.dispatchEvent(new CustomEvent('credit:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    fade.classList.remove('on');
    dock.hidden = true;
    layer.textContent = '';
    hideTimer = setTimeout(() => {
      cancelAnimationFrame(frame);
      fade.style.display = 'none';
      holes.textContent = '';
      marks = [];
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 460);
    pressed(false);
    live.textContent = 'Credits off.';
    if (layerShadow.activeElement && triggers[0]) triggers[0].focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('credit:toggle', { detail: { open: false } }));
  }

  function toggle() { active ? close() : open(); }

  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') close();
    // arrow keys move between credits while the tray has focus
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && layerShadow.activeElement && layerShadow.activeElement.closest('.bar')) {
      const i = credits.indexOf(chosen) + (e.key === 'ArrowRight' ? 1 : -1);
      if (credits[i]) { e.preventDefault(); choose(credits[i], true); }
    }
  });

  window.Credit = {
    open, close, toggle,
    get credits() { return credits.slice(); },
    get isOpen() { return active; },
  };

  async function start() {
    try {
      const { data } = await load();
      credits = normalize(data);
      site = (data && data.site) || '';
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
