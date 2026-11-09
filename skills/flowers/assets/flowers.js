/*! Flowers 0.1 · give the makers their flowers: a button that fades a website back to the parts made with other people's tools · MIT */
(() => {
  'use strict';
  if (window.Flowers) return;

  const script = document.currentScript;
  const opt = (name, fallback) => (script && script.getAttribute('data-' + name)) || fallback;

  // ---------- data ----------

  async function load() {
    const src = opt('src');
    if (!src) {
      const inline = document.querySelector('script[type="application/credits+json"]');
      if (inline) return JSON.parse(inline.textContent);
    }
    const link = document.querySelector('link[rel~="credits"]');
    const url = new URL(src || (link && link.getAttribute('href')) || 'credits.json', document.baseURI).href;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Flowers: could not load ' + url + ' (' + res.status + ')');
    return res.json();
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
        about: c.about ? String(c.about).trim().slice(0, 200) : '',
        url: isUrl(c.url) ? c.url : isUrl(c.authorUrl) ? c.authorUrl : '',
        selectors: [].concat(c.selectors || []).map(String),
      }));
  }

  function targetsOf(credit) {
    const found = new Set();
    document.querySelectorAll('[data-credit]').forEach((el) => {
      if (el.getAttribute('data-credit').split(/\s+/).includes(credit.id)) found.add(el);
    });
    credit.selectors.forEach((s) => {
      try { document.querySelectorAll(s).forEach((el) => found.add(el)); } catch (e) { console.warn('Flowers: bad selector', s); }
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

  // ---------- styles ----------
  // Sites set the --flowers-* properties anywhere (usually :root).

  const CSS = `
:host { all: initial; }
:host {
  --_accent: var(--flowers-accent, #ffffff);
  --_bg: var(--flowers-bg, #ffffff);
  --_fg: var(--flowers-fg, #111111);
  --_muted: var(--flowers-muted, #6b6b6b);
  --_font: var(--flowers-font, "Helvetica Neue", Helvetica, Arial, sans-serif);
  --_r: var(--flowers-radius, 999px);
}
/* the button sits on the site, so it follows the site's light or dark; the pop-ups sit on the dark fade, so they stay white */
@media (prefers-color-scheme: dark) { :host(:not([theme="light"])) .btn { --_bg: var(--flowers-bg, #1c1c1c); --_fg: var(--flowers-fg, #f2f2f2); } }
:host([theme="dark"]) .btn { --_bg: var(--flowers-bg, #1c1c1c); --_fg: var(--flowers-fg, #f2f2f2); }
* { box-sizing: border-box; }
.root { font-family: var(--_font); font-size: 13px; line-height: 1.3; color: var(--_fg); -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
[hidden] { display: none !important; }

.btn { font: inherit; color: var(--_fg); background: var(--_bg); border: 1px solid color-mix(in srgb, var(--_fg) 15%, transparent); border-radius: var(--_r); padding: 7px 14px; cursor: pointer; }
.btn[aria-pressed="true"] { background: var(--_fg); color: var(--_bg); border-color: transparent; }
.inline { display: flex; justify-content: center; padding: 20px 16px; }
.float .btn { position: fixed; z-index: 2147483001; }
.pos-br .btn { right: 16px; bottom: 16px; } .pos-bl .btn { left: 16px; bottom: 16px; }
.pos-tr .btn { right: 16px; top: 16px; }    .pos-tl .btn { left: 16px; top: 16px; }

.fade { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2147483000; opacity: 0; transition: opacity .4s ease; cursor: pointer; }
.fade.on { opacity: 1; }
.box { position: fixed; z-index: 2147483000; pointer-events: none; outline: none; border-radius: 2px; animation: glow .6s ease both;
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--_accent) 45%, transparent), 0 0 48px 8px color-mix(in srgb, var(--_accent) 18%, transparent); }
.box:focus-visible { outline: 1px solid var(--_accent); outline-offset: 3px; }
@keyframes glow { from { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; } }
.tag {
  position: fixed; z-index: 2147483001; max-width: min(260px, calc(100vw - 16px));
  display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 0;
  background: var(--flowers-popup-bg, #ffffff); color: var(--flowers-popup-fg, #111111);
  animation: in .4s ease .1s both;
}
.tag .title { font-weight: 700; color: inherit; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag a.title:hover, .tag a.title:focus-visible { text-decoration: underline; }
.tag .more { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .22s ease; }
.tag .more > div { overflow: hidden; min-height: 0; display: flex; flex-direction: column; gap: 2px; }
.mark.show .more, .mark:focus-within .more { grid-template-rows: 1fr; }
.tag .who { color: var(--flowers-popup-muted, #6b6b6b); padding-top: 4px; }
.tag .about { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.also { position: fixed; z-index: 2147483001; left: 50%; bottom: 16px; transform: translateX(-50%); max-width: calc(100vw - 32px); padding: 6px 14px; border-radius: var(--_r); background: var(--flowers-popup-bg, #ffffff); color: var(--flowers-popup-muted, #6b6b6b); text-align: center; animation: in .4s ease .08s both; }
.also a { color: var(--flowers-popup-fg, #111111); }
.also a:hover { text-decoration: underline; }
@keyframes in { from { opacity: 0; } }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .fade, .tag .more { transition: none; } .box, .tag, .also { animation: none; } }
`;

  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids) if (kid != null && kid !== false) el.append(kid);
    return el;
  };
  const ext = (href, cls, ...kids) => (href ? h('a', { class: cls, href, target: '_blank', rel: 'noopener' }, ...kids) : h('span', { class: cls }, ...kids));
  // "Name by Author"
  const words = (c, cls) => ext(c.url, cls, c.name, c.author ? h('span', {}, ' by ' + c.author) : null);

  function shadowHost(name) {
    const host = document.createElement(name);
    const theme = opt('theme', 'auto');
    if (theme !== 'auto') host.setAttribute('theme', theme);
    if (opt('accent')) host.style.setProperty('--flowers-accent', opt('accent'));
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.append(h('style', {}, CSS));
    return { host, shadow };
  }

  // ---------- state ----------

  let credits = [];
  let active = false;
  let layerShadow, fade, fadeFill, holes, layer, live;
  let triggers = [];   // every element that turns Flowers on and off
  let keepLit = [];    // the button stays clear while the page fades
  let marks = [];      // { credit, el, box, tag, hole }
  let frame = 0;

  // ---------- the button ----------
  // Recommended: at the bottom of the page (the default, inside the site's footer).
  // An element marked data-flowers-button chooses the place: a <button> or <a> there becomes the button itself,
  // anything else gets the Credits button inside it. data-position="bottom-right" etc. floats it in a corner.

  function makeButton() {
    return h('button', { class: 'btn', type: 'button', part: 'button', 'aria-pressed': 'false', onclick: toggle }, opt('label', 'Credits'));
  }

  function placeButtons(rootEl) {
    if (opt('button') === 'none') return;
    const own = document.querySelectorAll('[data-flowers-button]');
    if (own.length) {
      own.forEach((el) => {
        if (el.matches('button, a, [role="button"]')) {
          el.setAttribute('aria-pressed', 'false');
          el.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
          triggers.push(el);
        } else {
          const { host, shadow } = shadowHost('flowers-button');
          const b = makeButton();
          shadow.append(h('div', { class: 'root' }, b));
          el.append(host);
          triggers.push(b);
          keepLit.push(b);
        }
      });
      return;
    }
    const b = makeButton();
    triggers.push(b);
    const corner = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[opt('position', 'bottom')];
    if (corner) {
      rootEl.classList.add('float', 'pos-' + corner);
      rootEl.append(b);
      return;
    }
    const { host, shadow } = shadowHost('flowers-button');
    shadow.append(h('div', { class: 'root inline' }, b));
    const footers = [...document.querySelectorAll('footer')].filter((f) => !f.closest('article, aside, section, dialog'));
    (footers[footers.length - 1] || document.body).append(host);
    keepLit.push(b);
  }

  // ---------- the layer ----------

  function build() {
    const { host, shadow } = shadowHost('flowers-layer');
    layerShadow = shadow;
    const rootEl = h('div', { class: 'root' });
    live = h('div', { class: 'sr', 'aria-live': 'polite' });
    const ns = 'http://www.w3.org/2000/svg';
    fade = document.createElementNS(ns, 'svg');
    fade.setAttribute('class', 'fade');
    fade.setAttribute('aria-hidden', 'true');
    fade.innerHTML = '<defs><mask id="flowers-holes" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="white"/><g class="holes"></g></mask></defs><rect class="fill" x="0" y="0" width="100%" height="100%" mask="url(#flowers-holes)"/>';
    // hovering (or tapping) a credited part shows who made it; clicking anywhere else brings the page back
    fade.addEventListener('pointermove', (e) => { const m = hit(e); fade.style.cursor = m ? 'default' : 'pointer'; if (e.pointerType !== 'touch') hover(m); });
    fade.addEventListener('pointerleave', () => hover(null));
    fade.addEventListener('click', (e) => { const m = hit(e); if (m) hover(m, true); else close(); });
    holes = fade.querySelector('.holes');
    fadeFill = fade.querySelector('.fill');
    fade.style.display = 'none';
    layer = h('div', {});
    rootEl.append(fade, layer, live);
    placeButtons(rootEl);
    shadow.append(rootEl);
    document.body.append(host);
  }

  const ns = 'http://www.w3.org/2000/svg';
  const newHole = () => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('fill', 'black'); r.setAttribute('rx', '3'); holes.append(r); return r; };

  function mark() {
    holes.textContent = '';
    layer.textContent = '';
    marks = [];
    for (const credit of credits) {
      for (const el of targetsOf(credit)) {
        const box = h('div', { class: 'box', part: 'outline', tabindex: '0', role: 'img', 'aria-label': 'Made with ' + credit.name + (credit.author ? ' by ' + credit.author : '') });
        const about = credit.about, link = credit.url;
        const title = link ? h('a', { class: 'title', href: link, target: '_blank', rel: 'noopener' }, credit.name + ' ↗') : h('span', { class: 'title' }, credit.name);
        const tag = h('div', { class: 'tag', part: 'label' }, title,
          credit.author || about ? h('div', { class: 'more' }, h('div', {},
            credit.author ? h('span', { class: 'who' }, 'Flowers to ' + credit.author) : null,
            about ? h('span', { class: 'about' }, about) : null)) : null);
        const group = h('div', { class: 'mark' }, box, tag);
        tag.addEventListener('pointerenter', () => hover(mark));
        tag.addEventListener('pointerleave', () => hover(null));
        layer.append(group);
        const mark = { credit, el, box, tag, group, hole: newHole(), r: null };
        marks.push(mark);
      }
    }
    keepLit = keepLit.filter((el) => el.isConnected);
    for (const el of keepLit.concat(triggers.filter((t) => t.getRootNode() === document))) marks.push({ credit: null, el, hole: newHole() });

    // credits with nothing to point at on this page (a font, a library) go in one line at the bottom
    const rest = credits.filter((c) => !marks.some((m) => m.credit === c && visibleRect(m.el)));
    if (rest.length) {
      const also = h('div', { class: 'also', part: 'also' }, 'Also: ');
      rest.forEach((c, i) => { if (i) also.append(', '); also.append(words(c, '')); });
      layer.append(also);
    }
  }

  const hit = (e) => marks.find((m) => m.credit && m.r && e.clientX >= m.r.left && e.clientX <= m.r.right && e.clientY >= m.r.top && e.clientY <= m.r.bottom);
  let shownMark = null, hideTimer2 = 0;
  function hover(m, now) {
    clearTimeout(hideTimer2);
    if (m === shownMark) return;
    const swap = () => { if (shownMark) shownMark.group.classList.remove('show'); shownMark = m; if (m) m.group.classList.add('show'); };
    if (m || now) swap(); else hideTimer2 = setTimeout(swap, 250);   // a moment to move onto the pop-up and its link
  }

  // something on top (a pop-up, a menu) hides the part, so it isn't lit through it
  function covered(el, r, vw, vh) {
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    const hit = document.elementsFromPoint(x, y).find((e) => e.localName !== 'flowers-layer');
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return false;
    const svg = el.ownerSVGElement;
    return !(svg && svg.contains(hit));
  }

  function place() {
    const vw = innerWidth, vh = innerHeight;
    for (const m of marks) {
      const r = visibleRect(m.el);
      const on = r && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && (!m.credit || !covered(m.el, r, vw, vh));
      m.r = on ? r : null;
      m.hole.setAttribute('width', on ? r.width : 0);
      if (on) { m.hole.setAttribute('x', r.left); m.hole.setAttribute('y', r.top); m.hole.setAttribute('height', r.height); }
      if (!m.credit) continue;
      m.box.hidden = m.tag.hidden = !on;
      if (!on) continue;
      Object.assign(m.box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      const tw = m.tag.offsetWidth, th = m.tag.offsetHeight;
      let x = Math.min(Math.max(8, r.left), vw - tw - 8);
      let y = r.top - th - 10;
      if (y < 8) y = Math.max(8, r.top + 8);
      m.tag.style.left = x + 'px';
      m.tag.style.top = y + 'px';
    }
  }

  function loop() { place(); frame = requestAnimationFrame(loop); }

  const pressed = (on) => triggers.forEach((t) => t.setAttribute('aria-pressed', String(on)));
  let hideTimer = 0;

  function open() {
    if (active || !layerShadow) return;
    active = true;
    clearTimeout(hideTimer);
    fadeFill.style.fill = 'var(--flowers-fade-color, #0a0a0a)';
    fadeFill.style.fillOpacity = 'var(--flowers-fade, 0.82)';
    mark();
    place();
    fade.style.display = '';
    requestAnimationFrame(() => fade.classList.add('on'));
    pressed(true);
    loop();
    const shown = credits.filter((c) => marks.some((m) => m.credit === c && visibleRect(m.el))).length;
    live.textContent = 'Flowers on. ' + shown + ' of ' + credits.length + ' shown on this page. Press Escape to close.';
    document.dispatchEvent(new CustomEvent('flowers:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    fade.classList.remove('on');
    layer.textContent = '';
    shownMark = null;
    hideTimer = setTimeout(() => {
      cancelAnimationFrame(frame);
      fade.style.display = 'none';
      holes.textContent = '';
      marks = [];
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
    pressed(false);
    live.textContent = 'Flowers off.';
    document.dispatchEvent(new CustomEvent('flowers:toggle', { detail: { open: false } }));
  }

  function toggle() { active ? close() : open(); }

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) close(); });

  window.Flowers = {
    open, close, toggle,
    get credits() { return credits.slice(); },
    get isOpen() { return active; },
  };

  async function start() {
    try { credits = normalize(await load()); } catch (err) { console.warn(err.message || err); return; }
    if (!credits.length) return;
    build();
    if (location.hash === '#flowers') open();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
