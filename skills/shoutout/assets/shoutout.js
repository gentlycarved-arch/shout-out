/*! Shoutout 2.1.0 · shoutout designers & makers on your website: a button that fades a website back to the parts made with other people's tools · MIT */
(() => {
  'use strict';
  if (window.Shoutout) return;
  const VERSION = '2.1.0';

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
    const res = await fetch(url, { cache: 'no-cache' });   // always check for the latest credits
    if (!res.ok) throw new Error('Shoutout: could not load ' + url + ' (' + res.status + ')');
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
        note: c.note ? String(c.note).trim().slice(0, 200) : '',
        url: isUrl(c.url) ? c.url : isUrl(c.authorUrl) ? c.authorUrl : '',
        selectors: [].concat(c.selectors || []).map(String),
        role: c.role === 'tool' ? 'tool' : 'part',   // a tool you made the site with, or a part of the site
        replay: ['hover', 'hover-events', 'animation'].includes(c.replay) ? c.replay : '',
      }));
  }

  // the page and every same-origin <iframe> in it (a cross-origin frame can only be credited as a whole)
  function documents(doc = document, out = []) {
    out.push(doc);
    for (const f of doc.querySelectorAll('iframe, frame')) {
      try { if (f.contentDocument && f.contentDocument.documentElement) documents(f.contentDocument, out); } catch (e) { /* another origin */ }
    }
    return out;
  }

  function targetsOf(credit) {
    const found = new Set();
    for (const doc of documents()) {
      doc.querySelectorAll('[data-credit]').forEach((el) => {
        if (el.getAttribute('data-credit').split(/\s+/).includes(credit.id)) found.add(el);
      });
      credit.selectors.forEach((s) => {
        try { doc.querySelectorAll(s).forEach((el) => found.add(el)); } catch (e) { if (doc === document) console.warn('Shoutout: bad selector', s); }
      });
    }
    return [...found];
  }

  const css = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
  // where an element's frame sits on the page, so parts inside an <iframe> line up
  function offsetOf(el) {
    let x = 0, y = 0, w = el.ownerDocument.defaultView;
    while (w && w !== window && w.frameElement) {
      const f = w.frameElement, r = f.getBoundingClientRect();
      x += r.left + f.clientLeft; y += r.top + f.clientTop;
      w = w.parent;
    }
    return { x, y };
  }
  function rectOf(el) {
    const r = el.getBoundingClientRect(), o = offsetOf(el);
    return o.x || o.y ? new DOMRect(r.left + o.x, r.top + o.y, r.width, r.height) : r;
  }

  function visibleRect(el) {
    if (!el || !el.isConnected) return null;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
    const r = rectOf(el);
    if (r.width < 2 || r.height < 2) return null;
    return r;
  }

  // ---------- styles ----------
  // Sites set the --shoutout-* properties anywhere (usually :root).

  const CSS = `
:host { all: initial; }
:host {
  --_accent: var(--shoutout-accent, #ffffff);
  --_bg: var(--shoutout-bg, #ffffff);
  --_fg: var(--shoutout-fg, #111111);
  --_muted: var(--shoutout-muted, #6b6b6b);
  --_font: var(--shoutout-font, "Helvetica Neue", Helvetica, Arial, sans-serif);
  --_pop-bg: var(--shoutout-popup-bg, #ffffff);
  --_pop-fg: var(--shoutout-popup-fg, #111111);
  --_pop-muted: var(--shoutout-popup-muted, #6b6b6b);
  --_ease: cubic-bezier(.2, .8, .2, 1);
  --_r: var(--shoutout-radius, 999px);
}
/* the button sits on the site, so it follows the site's light or dark; the pop-ups sit on the dark fade, so they stay white */
@media (prefers-color-scheme: dark) { :host(:not([theme="light"])) .btn { --_bg: var(--shoutout-bg, #1c1c1c); --_fg: var(--shoutout-fg, #f2f2f2); } }
:host([theme="dark"]) .btn { --_bg: var(--shoutout-bg, #1c1c1c); --_fg: var(--shoutout-fg, #f2f2f2); }
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
.box { position: fixed; z-index: 2147483000; pointer-events: none; outline: none; border-radius: 2px; }
.box:focus-visible { outline: 1px solid var(--_accent); outline-offset: 3px; }
.halo-color { flood-color: var(--_accent); flood-opacity: .8; }
.halos { pointer-events: none; }
.fade.on .halos { animation: in .8s ease .15s both; }
/* the pop-over: a white square with the title; on hover it grows, smoothly, to hold the description */
.tag {
  position: fixed; z-index: 2147483001; overflow: hidden;
  display: flex; flex-direction: column; padding: 8px 12px; border-radius: 0;
  background: var(--_pop-bg); color: var(--_pop-fg);
  font-size: 13px; line-height: 1.35; animation: in .4s ease .1s both;
  transition: width .6s var(--_ease);
}
.tag .title { width: max-content; max-width: 100%; font-weight: 700; color: inherit; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag a.title:hover, .tag a.title:focus-visible { text-decoration: underline; }
.tag .more { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .6s var(--_ease); }
.tag .more > div { overflow: hidden; min-height: 0; display: flex; flex-direction: column; gap: 3px; opacity: 0; transition: opacity .3s ease; }
.mark.show .more > div, .mark:has(:focus-visible) .more > div { opacity: 1; transition: opacity .6s var(--_ease); }
.mark.show .more, .mark:has(:focus-visible) .more { grid-template-rows: 1fr; }
.mark.show .tag { z-index: 2147483002; }
.tag .by { color: var(--_pop-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag .about { padding-top: 4px; }
.tag .about { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.mark.dim .tag { display: none; }
/* the list of every credit: a small white square at the top that drops down; hovering a name lights only its parts */
.list { position: fixed; z-index: 2147483003; left: 50%; top: 16px; transform: translateX(-50%); width: min(300px, calc(100vw - 32px));
  background: var(--_pop-bg); color: var(--_pop-fg); font-size: 13px; line-height: 1.35; animation: in .4s ease .08s both; }
.list .toggle { display: flex; justify-content: space-between; gap: 12px; width: 100%; font: inherit; font-weight: 700; color: inherit; background: none; border: 0; border-radius: 0; padding: 8px 12px; cursor: pointer; text-align: left; }
.list .toggle span { color: var(--_pop-muted); font-weight: 400; }
.list .body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .6s var(--_ease); }
.list.open .body { grid-template-rows: 1fr; }
.list .body > div { min-height: 0; overflow: hidden; }
.list .scroll { max-height: min(50vh, 360px); overflow-y: auto; padding-bottom: 6px; }
.list .head { color: var(--_pop-muted); padding: 8px 12px 2px; }
.list .item { display: block; width: 100%; font: inherit; color: inherit; background: none; border: 0; border-radius: 0; padding: 6px 12px; text-align: left; text-decoration: none; cursor: pointer; }
.list .item .by { display: block; color: var(--_pop-muted); }
.list .item:hover, .list .item:focus-visible, .list .item.on { background: color-mix(in srgb, var(--_pop-fg) 7%, transparent); outline: none; }
@keyframes in { from { opacity: 0; } }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .fade, .tag, .tag .more, .tag .more > div { transition: none; } .box, .tag, .list, .fade.on .halos { animation: none; } .list .body { transition: none; } }
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

  function shadowHost(name) {
    const host = document.createElement(name);
    const theme = opt('theme', 'auto');
    if (theme !== 'auto') host.setAttribute('theme', theme);
    if (opt('accent')) host.style.setProperty('--shoutout-accent', opt('accent'));
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.append(h('style', {}, CSS));
    return { host, shadow };
  }

  // ---------- state ----------

  let credits = [];
  let active = false;
  let layerShadow, fade, fadeFill, holes, halos, defs, layer, live;
  let triggers = [];   // every element that turns Shoutout on and off
  let keepLit = [];    // the button stays clear while the page fades
  let marks = [];      // { credit, el, box, tag, hole }
  let frame = 0;

  // ---------- the button ----------
  // Recommended: at the bottom of the page (the default, inside the site's footer).
  // An element marked data-shoutout-button chooses the place: a <button> or <a> there becomes the button itself,
  // anything else gets the Credits button inside it. data-position="bottom-right" etc. floats it in a corner.

  function makeButton() {
    return h('button', { class: 'btn', type: 'button', part: 'button', 'aria-pressed': 'false', onclick: toggle }, opt('label', 'Credits'));
  }

  // A site's own <button data-shoutout-button> is answered through one listener on the document, so it keeps working
  // when an app draws its footer again. Shoutout' own buttons are put back if the page replaces the elements they sat in.
  let layerHost = null, layerRoot = null, defaultHost = null, defaultButton = null;
  const OWN = 'button, a, [role="button"]';
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('[data-shoutout-button]');
    if (t && t.matches(OWN)) { e.preventDefault(); toggle(); }
  });
  function syncButtons() {
    if (opt('button') === 'none') { triggers = []; keepLit = []; return; }
    const own = [...document.querySelectorAll('[data-shoutout-button]')];
    const mine = own.filter((el) => el.matches(OWN));   // the site's own button or link
    const made = [];                                      // Credits buttons Shoutout put inside the page
    let floating = null;
    for (const el of own) {
      if (el.matches(OWN)) continue;
      let host = [...el.children].find((c) => c.localName === 'shoutout-button');
      if (!host) {
        const sh = shadowHost('shoutout-button');
        sh.shadow.append(h('div', { class: 'root' }, makeButton()));
        el.append(sh.host);
        host = sh.host;
      }
      made.push(host.shadowRoot.querySelector('button'));
    }
    if (own.length) {
      if (defaultHost) defaultHost.remove();
      if (defaultButton && defaultButton.parentNode === layerRoot) defaultButton.remove();
    } else {
      defaultButton ??= makeButton();
      const corner = { 'bottom-right': 'br', 'bottom-left': 'bl', 'top-right': 'tr', 'top-left': 'tl' }[opt('position', 'bottom')];
      if (corner) {
        layerRoot.classList.add('float', 'pos-' + corner);
        if (defaultButton.parentNode !== layerRoot) layerRoot.append(defaultButton);
        floating = defaultButton;
      } else {
        if (!defaultHost) {
          const sh = shadowHost('shoutout-button');
          sh.shadow.append(h('div', { class: 'root inline' }, defaultButton));
          defaultHost = sh.host;
        }
        const footers = [...document.querySelectorAll('footer')].filter((f) => !f.closest('article, aside, section, dialog'));
        const where = footers[footers.length - 1] || document.body;
        if (defaultHost.parentNode !== where || defaultHost !== where.lastElementChild && !where.contains(defaultHost)) where.append(defaultHost);
        made.push(defaultButton);
      }
    }
    triggers = mine.concat(made, floating ? [floating] : []);
    keepLit = made;   // buttons inside the page stay clear of the fade; a floating one already sits above it
    for (const t of triggers) t.setAttribute('aria-pressed', String(active));
  }

  // ---------- the layer ----------

  function build() {
    const { host, shadow } = shadowHost('shoutout-layer');
    layerShadow = shadow;
    const rootEl = h('div', { class: 'root' });
    live = h('div', { class: 'sr', 'aria-live': 'polite' });
    const ns = 'http://www.w3.org/2000/svg';
    fade = document.createElementNS(ns, 'svg');
    fade.setAttribute('class', 'fade');
    fade.setAttribute('aria-hidden', 'true');
    // the fade has a hole the exact shape of each credited part, and a soft glow drawn just outside that shape
    fade.innerHTML = '<defs>'
      + '<filter id="shoutout-black" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>'
      + '<filter id="shoutout-halo" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
      + '<feGaussianBlur in="SourceAlpha" stdDeviation="4" result="near"/><feGaussianBlur in="SourceAlpha" stdDeviation="14" result="far"/>'
      + '<feMerge result="both"><feMergeNode in="far"/><feMergeNode in="near"/></feMerge>'
      + '<feFlood class="halo-color" result="color"/><feComposite in="color" in2="both" operator="in" result="lit"/>'
      + '<feComposite in="lit" in2="SourceAlpha" operator="out"/></filter>'
      + '<mask id="shoutout-holes" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="white"/><g class="holes" filter="url(#shoutout-black)"></g></mask>'
      + '</defs><rect class="fill" x="0" y="0" width="100%" height="100%" mask="url(#shoutout-holes)"/><g class="halos" filter="url(#shoutout-halo)"></g>';
    // hovering (or tapping) a credited part shows who made it; clicking anywhere else brings the page back
    fade.addEventListener('pointermove', (e) => { const m = hit(e); fade.style.cursor = m ? 'default' : 'pointer'; if (e.pointerType !== 'touch') hover(m); });
    fade.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover(null); });   // a lifted finger "leaves" too
    // A tap is handled when the finger lifts: iPhone Safari can swallow the click that would follow, because the glow
    // moves every frame and Safari takes that for the page answering a hover. A finger that moved was a scroll.
    const act = (e) => { const m = hit(e); if (m) hover(m, true); else close(); };
    let down = null, tapped = 0;
    fade.addEventListener('pointerdown', (e) => { down = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; });
    fade.addEventListener('pointerup', (e) => {
      if (!down) return;
      const still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10;
      down = null;
      if (still) { tapped = performance.now(); act(e); }
    });
    fade.addEventListener('click', (e) => { if (performance.now() - tapped < 700) return; act(e); });
    holes = fade.querySelector('.holes');
    halos = fade.querySelector('.halos');
    defs = fade.querySelector('defs');
    fadeFill = fade.querySelector('.fill');
    fade.style.display = 'none';
    layer = h('div', {});
    rootEl.append(fade, layer, live);
    layerHost = host; layerRoot = rootEl;
    shadow.append(rootEl);
    document.body.append(host);
    syncButtons();
  }

  const ns = 'http://www.w3.org/2000/svg';
  // ---------- the shape of a part ----------
  // An SVG drawing is copied with its own masks, clips and fills, so a round seal is round; a picture or a canvas
  // keeps its see-through edges; a CSS clip-path keeps its shape; a plain wrapper is the icons and pictures in it;
  // anything else is its box with its own rounded corners.
  let imported = new Map(), uid = 0;
  const URL_REF = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/g;
  const isSvg = (el) => el.namespaceURI === ns;
  function importRef(id, doc) {
    const key = id + '\u0000' + (doc === document ? '' : doc.URL);
    if (imported.has(key)) return imported.get(key);
    const src = doc.getElementById(id);
    if (!src) return null;
    const copy = src.cloneNode(true), fresh = 'shoutout-d' + (++uid);
    imported.set(key, fresh);
    copy.id = fresh;
    for (const n of [copy, ...copy.querySelectorAll('*')]) {
      if (n !== copy && n.id) n.removeAttribute('id');
      for (const a of [...n.attributes]) {
        if (URL_REF.test(a.value)) n.setAttribute(a.name, a.value.replace(URL_REF, (_, ref) => { const r = importRef(ref, doc); return r ? 'url(#' + r + ')' : 'none'; }));
        URL_REF.lastIndex = 0;
        if ((a.name === 'href' || a.name === 'xlink:href') && a.value.startsWith('#')) { const r = importRef(a.value.slice(1), doc); if (r) n.setAttribute(a.name, '#' + r); }
        else if ((a.name === 'href' || a.name === 'xlink:href') && a.value) n.setAttribute(a.name, new URL(a.value, doc.baseURI).href);
      }
    }
    defs.append(document.importNode(copy, true));
    return fresh;
  }
  const LOOK = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
    'opacity', 'display', 'visibility', 'mask', 'clip-path', 'filter', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline'];
  function copyLook(src, dst) {
    const cs = css(src), doc = src.ownerDocument;
    dst.removeAttribute('class');
    dst.removeAttribute('style');
    for (const p of LOOK) {
      const v = cs.getPropertyValue(p);
      if (v) dst.style.setProperty(p, v.replace(URL_REF, (_, ref) => { const r = importRef(ref, doc); return r ? 'url(#' + r + ')' : 'none'; }));
      URL_REF.lastIndex = 0;
    }
    for (const a of ['href', 'xlink:href']) {
      const v = dst.getAttribute(a);
      if (v && !v.startsWith('#')) dst.setAttribute(a, new URL(v, doc.baseURI).href);
    }
  }
  function copyOf(el) {
    const copy = el.cloneNode(true);
    const from = [el, ...el.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((n, i) => to[i] && copyLook(n, to[i]));
    copy.style.removeProperty('opacity');   // the shape is the part, however faint it's drawn
    copy.removeAttribute('id');
    return document.importNode(copy, true);
  }
  function svgShape(el) {
    const copy = copyOf(el);
    copy.removeAttribute('transform');   // the element's own transform is part of getScreenCTM()
    return copy;
  }
  function svgRoot(el) {
    const copy = copyOf(el);
    copy.setAttribute('overflow', 'visible');
    return copy;
  }
  const FIT = { cover: 'xMidYMid slice', contain: 'xMidYMid meet', 'scale-down': 'xMidYMid meet', fill: 'none' };
  function image(href, aspect) {
    const n = document.createElementNS(ns, 'image');
    n.setAttribute('href', href);
    n.setAttribute('preserveAspectRatio', aspect);
    return n;
  }
  // a CSS background picture that isn't tiled: its own see-through edges, placed as the CSS places it
  function backgroundAspect(cs) {
    if (!/^url\(/.test(cs.backgroundImage) || cs.backgroundImage.includes(',') || !/no-repeat/.test(cs.backgroundRepeat)) return null;
    const size = cs.backgroundSize.trim();
    const pos = cs.backgroundPosition.split(/\s+/).map((v) => ({ '0%': 'Min', '50%': 'Mid', '100%': 'Max' })[v]);
    if (!pos[0] || !pos[1]) return null;
    const align = 'x' + pos[0] + 'Y' + pos[1];
    if (size === 'cover') return align + ' slice';
    if (size === 'contain') return align + ' meet';
    if (size === '100% 100%') return 'none';
    return null;
  }
  // a canvas: its see-through shape, read now and again; a WebGL canvas that can't be read is its box
  function canvasShape(el) {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 48;
    const read = () => {
      try {
        const g = probe.getContext('2d', { willReadFrequently: true });
        g.clearRect(0, 0, 48, 48);
        g.drawImage(el, 0, 0, 48, 48);
        const a = g.getImageData(0, 0, 48, 48).data;
        let clear = 0, solid = 0;
        for (let i = 3; i < a.length; i += 4) { if (a[i] === 0) clear++; else if (a[i] === 255) solid++; }
        const all = a.length / 4;
        if (clear === all || solid === all) return null;   // blank (unreadable WebGL) or fully opaque: the box says it all
        return el.toDataURL();
      } catch (e) { return null; }   // a canvas showing another site's picture can't be read
    };
    return read;
  }
  // CSS clip-path: circle(), ellipse(), inset() and polygon() keep their shape
  function clipShape(value, w, h) {
    const m = /^(circle|ellipse|inset|polygon)\((.*)\)/.exec(value || '');
    if (!m) return null;
    const len = (v, ref) => (v.endsWith('%') ? parseFloat(v) / 100 * ref : parseFloat(v)) || 0;
    const at = (str) => {
      const p = (str || '50% 50%').trim().split(/\s+/).map((v) => ({ left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' })[v] || v);
      return [len(p[0], w), len(p[1] || '50%', h)];
    };
    const [shape, args] = [m[1], m[2]];
    if (shape === 'circle' || shape === 'ellipse') {
      const [radii, pos] = args.split(/\s+at\s+/);
      const [cx, cy] = at(pos);
      const side = (v, ref, c) => v === 'farthest-side' ? Math.max(c, ref - c) : v === 'closest-side' || !v ? Math.min(c, ref - c) : len(v, ref);
      const rs = (radii || '').trim().split(/\s+/).filter(Boolean);
      if (shape === 'circle') {
        const r = rs[0] && rs[0].endsWith('%') ? parseFloat(rs[0]) / 100 * Math.hypot(w, h) / Math.SQRT2
          : rs[0] === 'farthest-side' ? Math.max(cx, w - cx, cy, h - cy) : !rs[0] || rs[0] === 'closest-side' ? Math.min(cx, w - cx, cy, h - cy) : parseFloat(rs[0]);
        return ['circle', { cx, cy, r }];
      }
      return ['ellipse', { cx, cy, rx: side(rs[0], w, cx), ry: side(rs[1], h, cy) }];
    }
    if (shape === 'inset') {
      const [box, round] = args.split(/\s+round\s+/);
      const v = box.trim().split(/\s+/);
      const t = len(v[0], h), r = len(v[1] || v[0], w), b = len(v[2] || v[0], h), l = len(v[3] || v[1] || v[0], w);
      const rx = round ? len(round.trim().split(/\s+/)[0], w) : 0;
      return ['rect', { x: l, y: t, width: Math.max(0, w - l - r), height: Math.max(0, h - t - b), rx }];
    }
    const pts = args.replace(/^\s*(nonzero|evenodd)\s*,/, '').split(',').map((pair) => { const [x, y] = pair.trim().split(/\s+/); return len(x, w) + ',' + len(y, h); });
    return ['polygon', { points: pts.join(' ') }];
  }
  // a wrapper with nothing of its own to see (no fill, no border) is the shapes of the icons and pictures inside it
  function bare(el, cs) {
    return !isSvg(el) && cs.backgroundImage === 'none' && /rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor)
      && !parseFloat(cs.borderTopWidth) && !parseFloat(cs.borderBottomWidth) && cs.boxShadow === 'none';
  }
  function pieces(el) {
    if (isSvg(el) && el.localName !== 'svg' && el.ownerSVGElement) return [{ el, node: svgShape(el), kind: 'svg' }];
    if (isSvg(el) && el.localName === 'svg') return [{ el, node: svgRoot(el), kind: 'frame' }];
    const cs = css(el), radius = parseFloat(cs.borderTopLeftRadius);
    const clip = cs.clipPath && cs.clipPath !== 'none' && /^(circle|ellipse|inset|polygon)\(/.test(cs.clipPath) ? cs.clipPath : '';
    if (clip) return [{ el, node: document.createElementNS(ns, 'g'), kind: 'clip', clip }];
    if (el.localName === 'img' && el.currentSrc && !radius) return [{ el, node: image(el.currentSrc, FIT[cs.objectFit] || 'none'), kind: 'frame' }];
    if (el.localName === 'canvas' && !radius) {
      const g = document.createElementNS(ns, 'g'), box = document.createElementNS(ns, 'rect');
      box.setAttribute('fill', 'black');
      g.append(image('', 'none'), box);
      return [{ el, node: g, kind: 'canvas', read: canvasShape(el), next: 0, url: null }];
    }
    const bgAspect = !radius && backgroundAspect(cs);
    if (bgAspect && /rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor) && !parseFloat(cs.borderTopWidth)) {
      const url = /^url\(["']?(.*?)["']?\)$/.exec(cs.backgroundImage);
      if (url) return [{ el, node: image(new URL(url[1], el.ownerDocument.baseURI).href, bgAspect), kind: 'frame' }];
    }
    if (bare(el, cs)) {
      const inner = [...el.querySelectorAll('svg, img, canvas')].filter((n) => !(n.parentElement && n.parentElement.closest('svg')) && visibleRect(n));
      if (inner.length) return inner.flatMap(pieces);
    }
    const n = document.createElementNS(ns, 'rect');
    n.setAttribute('fill', 'black');
    return [{ el, node: n, kind: 'box' }];
  }
  function makeShape(el, glow) {
    const parts = pieces(el);
    for (const p of parts) {
      p.node.setAttribute('data-kind', p.kind);
      p.nodes = [p.node];
      holes.append(p.node);
      if (glow) { const c = p.node.cloneNode(true); halos.append(c); p.nodes.push(c); }
    }
    return {
      show(on) { for (const p of parts) for (const n of p.nodes) n.style.display = on ? '' : 'none'; },
      update() {
        for (const p of parts) {
          if (p.kind === 'svg') {
            const m = p.el.getScreenCTM(), o = offsetOf(p.el);
            if (m) for (const n of p.nodes) n.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e + o.x} ${m.f + o.y})`);
            continue;
          }
          const g = rectOf(p.el);
          if (p.kind === 'clip') {
            const key = g.width + 'x' + g.height + p.clip;
            if (p.key !== key) {
              p.key = key;
              const sh = clipShape(p.clip, g.width, g.height);
              for (const n of p.nodes) {
                n.textContent = '';
                if (sh) { const s = document.createElementNS(ns, sh[0]); for (const [k, v] of Object.entries(sh[1])) s.setAttribute(k, v); s.setAttribute('fill', 'black'); n.append(s); }
              }
            }
            for (const n of p.nodes) n.setAttribute('transform', `translate(${g.left} ${g.top})`);
            continue;
          }
          if (p.kind === 'canvas') {
            if (performance.now() >= p.next) { p.next = performance.now() + 500; p.url = p.read(); }   // a moving canvas changes shape: read it twice a second
            for (const n of p.nodes) {
              const [img, box] = n.children;
              for (const c of [img, box]) { c.setAttribute('x', g.left); c.setAttribute('y', g.top); c.setAttribute('width', g.width); c.setAttribute('height', g.height); }
              if (p.url && img.getAttribute('href') !== p.url) img.setAttribute('href', p.url);
              img.style.display = p.url ? '' : 'none';
              box.style.display = p.url ? 'none' : '';
            }
            continue;
          }
          const rx = p.kind === 'box' ? Math.min(parseFloat(css(p.el).borderTopLeftRadius) || 0, g.width / 2, g.height / 2) : 0;
          for (const n of p.nodes) {
            n.setAttribute('x', g.left); n.setAttribute('y', g.top); n.setAttribute('width', g.width); n.setAttribute('height', g.height);
            if (p.kind === 'box') n.setAttribute('rx', rx);
          }
        }
      },
    };
  }

  // ---------- areas drawn by code ----------
  // A part with no element of its own (an object in a WebGL or 3D scene, a region of a canvas) is given to Shoutout as
  // a function that returns where it is on screen: Shoutout.area('chair', () => ({ x, y, width, height, radius })).
  const areas = new Map();   // credit id -> [where()]
  let proxies = [];
  function proxyFor(where) {
    const el = document.createElement('div');
    el.setAttribute('data-shoutout-area', '');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { position: 'fixed', pointerEvents: 'none', margin: '0', padding: '0', border: '0', background: 'none', zIndex: '-1' });
    el.where = where;
    document.body.append(el);
    proxies.push(el);
    moveProxy(el);
    return el;
  }
  function moveProxy(el) {
    let r = null;
    try { r = el.where(); } catch (e) { /* the scene isn't ready */ }
    if (r && r.getBoundingClientRect) r = rectOf(r);
    const ok = r && r.width > 0 && r.height > 0;
    Object.assign(el.style, ok
      ? { display: '', left: (r.x ?? r.left) + 'px', top: (r.y ?? r.top) + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: (r.radius || 0) + 'px' }
      : { display: 'none' });
  }
  function dropProxies() { proxies.forEach((p) => p.remove()); proxies = []; }

  function mark() {
    dropProxies();
    holes.textContent = '';
    halos.textContent = '';
    for (const d of defs.querySelectorAll('[id^="shoutout-d"]')) d.remove();
    imported = new Map();
    layer.textContent = '';
    marks = [];
    for (const credit of credits) {
      const els = targetsOf(credit).concat((areas.get(credit.id) || []).map(proxyFor));
      for (const el of els) {
        const box = h('div', { class: 'box', part: 'outline', tabindex: '0', role: 'img', 'aria-label': 'Made with ' + credit.name + (credit.author ? ' by ' + credit.author : '') });
        const about = credit.about || credit.note, link = credit.url;
        const title = link ? h('a', { class: 'title', href: link, target: '_blank', rel: 'noopener' }, h('span', {}, credit.name)) : h('span', { class: 'title' }, h('span', {}, credit.name));
        const by = credit.author ? h('span', { class: 'by' }, h('span', {}, 'by ' + credit.author)) : null;
        const tag = h('div', { class: 'tag', part: 'label' }, title, by,
          about ? h('div', { class: 'more' }, h('div', {}, h('span', { class: 'about' }, about))) : null);
        const group = h('div', { class: 'mark' }, box, tag);
        tag.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover(mark); });
        tag.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover(null); });
        layer.append(group);
        const mark = { credit, el, box, tag, title, by, group, shape: makeShape(el, true), r: null };
        marks.push(mark);
      }
    }
    keepLit = keepLit.filter((el) => el.isConnected);
    for (const el of keepLit.concat(triggers.filter((t) => t.getRootNode() === document))) marks.push({ credit: null, el, shape: makeShape(el, false) });

    buildList();
  }

  // ---------- the list ----------
  // Every credit, in one place: the parts on this page (hover a name and only its parts stay lit; click it to go
  // there), then the tools the site was made with, then anything else (a font, a library).
  let focused = null;
  function focusCredit(c) {
    focused = c;
    for (const m of marks) {
      if (!m.credit) continue;
      m.dim = !!c && m.credit !== c;
      m.group.classList.toggle('dim', m.dim);
      m.group.classList.toggle('show', (!!c && m.credit === c) || m === shownMark);
    }
    if (listEl) for (const b of listEl.querySelectorAll('.item[data-id]')) b.classList.toggle('on', !!c && b.dataset.id === c.id);
  }
  let listEl = null;
  function buildList() {
    const placed = credits.filter((c) => marks.some((m) => m.credit === c && visibleRect(m.el)));
    const rest = credits.filter((c) => !placed.includes(c));
    const tools = rest.filter((c) => c.role === 'tool'), other = rest.filter((c) => c.role !== 'tool');
    const row = (c, el) => { el.append(h('span', {}, c.name), c.author ? h('span', { class: 'by' }, 'by ' + c.author) : null); return el; };
    const scroll = h('div', { class: 'scroll' });
    if (placed.length) {
      if (rest.length) scroll.append(h('div', { class: 'head' }, 'On this page'));
      for (const c of placed) {
        const b = row(c, h('button', { class: 'item', type: 'button', 'data-id': c.id }));
        b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') focusCredit(c); });
        b.addEventListener('focus', () => focusCredit(c));
        b.addEventListener('click', () => {
          focusCredit(c);
          const m = marks.find((x) => x.credit === c);
          if (m) m.el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        });
        scroll.append(b);
      }
    }
    if (tools.length) { scroll.append(h('div', { class: 'head' }, 'Made with')); for (const c of tools) scroll.append(row(c, ext(c.url, 'item'))); }
    if (other.length) { scroll.append(h('div', { class: 'head' }, 'Also')); for (const c of other) scroll.append(row(c, ext(c.url, 'item'))); }
    const toggle = h('button', { class: 'toggle', type: 'button', 'aria-expanded': 'false' }, 'All credits', h('span', {}, String(credits.length)));
    listEl = h('div', { class: 'list', part: 'list' }, toggle, h('div', { class: 'body' }, h('div', { inert: '' }, scroll)));
    toggle.addEventListener('click', () => {
      const open = !listEl.classList.contains('open');
      listEl.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      listEl.querySelector('.body > div').inert = !open;
      if (!open) focusCredit(null);
    });
    listEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') focusCredit(null); });
    listEl.addEventListener('focusout', (e) => { if (!listEl.contains(e.relatedTarget)) focusCredit(null); });
    layer.append(listEl);
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
    if (el.ownerDocument !== document || el.hasAttribute('data-shoutout-area')) return false;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
    const hit = document.elementsFromPoint(x, y).find((e) => e.localName !== 'shoutout-layer');
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return false;
    const svg = el.ownerSVGElement;
    return !(svg && svg.contains(hit));
  }

  function place() {
    const vw = innerWidth, vh = innerHeight;
    proxies.forEach(moveProxy);
    for (const m of marks) {
      const r = visibleRect(m.el);
      const on = r && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && (!m.credit || !covered(m.el, r, vw, vh));
      m.r = on && !m.dim ? r : null;
      m.shape.show(on && !m.dim);
      if (on) m.shape.update(r);
      if (!m.credit) continue;
      m.box.hidden = m.tag.hidden = !on;
      if (!on) continue;
      Object.assign(m.box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      // below the part, opening downward so the title never moves; above it when there's no room below;
      // inside its top edge when there's room for neither. Open, it widens to fit the description.
      const inner = m.tag.querySelector('.more > div');
      const closedW = Math.ceil(Math.max(m.title.firstChild.getBoundingClientRect().width, m.by ? m.by.firstChild.getBoundingClientRect().width : 0)) + 25, maxW = Math.min(260, vw - 16);
      const openW = inner ? Math.max(Math.min(closedW, maxW), maxW) : Math.min(closedW, maxW);
      const isOpen = m.group.matches('.show, :has(:focus-visible)');
      m.tag.style.width = (isOpen ? openW : Math.min(closedW, maxW)) + 'px';
      const th = m.tag.offsetHeight, full = m.title.offsetHeight + (m.by ? m.by.offsetHeight : 0) + 16 + (inner ? inner.scrollHeight : 0);
      const cx = r.left + Math.min(r.width, vw) / 2;
      const x = Math.max(8, Math.min(cx - Math.min(closedW, maxW) / 2, vw - openW - 8));
      let y;
      if (r.bottom + 10 + full <= vh - 8) y = r.bottom + 10;
      else if (r.top - 10 - full >= 8) y = r.top - 10 - th;
      else y = Math.max(8, Math.min(r.top + 10, vh - th - 8));
      m.tag.style.left = x + 'px';
      m.tag.style.top = y + 'px';
    }
  }

  function loop() { place(); frame = requestAnimationFrame(loop); }

  const pressed = (on) => triggers.forEach((t) => t.setAttribute('aria-pressed', String(on)));
  let hideTimer = 0;

  // ---------- replaying a credited motion ----------
  // While Credits is on, a credited motion plays by itself, slowly, on a loop:
  //   "hover"         sets data-shoutout-hover on the part; the site's CSS matches it next to :hover. Nothing else happens,
  //                   so no menu opens, no video starts and no analytics fire.
  //   "hover-events"  also sends the mouse events a script listens for. Only for effects driven by a script, and only
  //                   when those events do nothing but the effect. Shoutout.replaying is true while they're sent.
  //   "animation"     restarts the part's own CSS or Web animations.
  const replays = new Map();   // element -> { timer, on }
  const HOLD = 1600, REST = 1800;
  let replaying = false;
  function pulse(el, kind, on) {
    if (kind === 'hover' || kind === 'hover-events') el.toggleAttribute('data-shoutout-hover', on);
    if (kind === 'hover-events') {
      const win = el.ownerDocument.defaultView, r = el.getBoundingClientRect(), at = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      replaying = true;
      try {
        for (const type of on ? ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove'] : ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
          const E = type.startsWith('pointer') && win.PointerEvent ? win.PointerEvent : win.MouseEvent;
          el.dispatchEvent(new E(type, { ...at, bubbles: !/enter|leave/.test(type), pointerType: 'mouse' }));
        }
      } finally { replaying = false; }
    }
    if (kind === 'animation' && on) {
      for (const a of el.getAnimations({ subtree: true })) { a.currentTime = 0; a.play(); }
    }
  }
  function startReplays() {
    stopReplays();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const m of marks) {
      if (!m.credit || !m.credit.replay || replays.has(m.el)) continue;
      const state = { on: false, kind: m.credit.replay, timer: 0 };
      const tick = () => { state.on = !state.on; pulse(m.el, state.kind, state.on); state.timer = setTimeout(tick, state.on ? HOLD : REST); };
      state.timer = setTimeout(tick, 700);
      replays.set(m.el, state);
    }
  }
  function stopReplays() {
    for (const [el, state] of replays) { clearTimeout(state.timer); if (state.on) pulse(el, state.kind, false); }
    replays.clear();
  }

  function open() {
    if (active || !layerShadow) return;
    active = true;
    clearTimeout(hideTimer);
    fadeFill.style.fill = 'var(--shoutout-fade-color, #0a0a0a)';
    fadeFill.style.fillOpacity = 'var(--shoutout-fade, 0.82)';
    mark();
    place();
    fade.style.display = '';
    requestAnimationFrame(() => fade.classList.add('on'));
    pressed(true);
    loop();
    startReplays();
    const shown = credits.filter((c) => marks.some((m) => m.credit === c && visibleRect(m.el))).length;
    live.textContent = 'Shoutout on. ' + shown + ' of ' + credits.length + ' shown on this page. Press Escape to close.';
    document.dispatchEvent(new CustomEvent('shoutout:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    stopReplays();
    fade.classList.remove('on');
    layer.textContent = '';
    shownMark = null;
    focused = null;
    listEl = null;
    hideTimer = setTimeout(() => {
      cancelAnimationFrame(frame);
      fade.style.display = 'none';
      holes.textContent = '';
      halos.textContent = '';
      marks = [];
      dropProxies();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
    pressed(false);
    live.textContent = 'Shoutout off.';
    document.dispatchEvent(new CustomEvent('shoutout:toggle', { detail: { open: false } }));
  }

  function toggle() { active ? close() : open(); }

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) close(); });

  // after the page changes (a new route, parts added or removed), open Credits again over the new parts
  function refresh() { if (active) { stopReplays(); mark(); place(); startReplays(); } }

  window.Shoutout = {
    version: VERSION,
    open, close, toggle, refresh,
    // a part drawn by code: where() returns { x, y, width, height, radius } on screen (or an element), or null when hidden
    area(id, where) {
      if (typeof where !== 'function') throw new TypeError('Shoutout.area(id, where): where must be a function');
      areas.set(String(id), (areas.get(String(id)) || []).concat(where));
      refresh();
      return () => { areas.set(String(id), (areas.get(String(id)) || []).filter((f) => f !== where)); refresh(); };
    },
    get credits() { return credits.slice(); },
    get isOpen() { return active; },
    get replaying() { return replaying; },
  };

  // ---------- when the page changes without reloading ----------
  // Next.js, Astro, Turbo, Framer and other apps change pages in place, and some replace <body> outright.
  // Shoutout puts itself back, keeps its buttons, re-reads credits written in the page, and, while Credits
  // is on, lights up the parts of the new page.
  let healTimer = 0, inlineText = null;
  const ours = (n) => n.nodeType === 1 && (n.localName === 'shoutout-layer' || n.localName === 'shoutout-button' || n.hasAttribute('data-shoutout-area'));
  function heal() {
    clearTimeout(healTimer);
    healTimer = 0;
    if (!layerHost) return;
    if (!layerHost.isConnected) document.body.append(layerHost);
    const inline = !opt('src') && document.querySelector('script[type="application/credits+json"]');
    if (inline && inline.textContent !== inlineText) {
      inlineText = inline.textContent;
      try { credits = normalize(JSON.parse(inlineText)); } catch (e) { console.warn('Shoutout: the credits in the page are not valid JSON'); }
    }
    syncButtons();
    if (active) {
      const now = credits.flatMap((c) => targetsOf(c));
      const had = marks.filter((m) => m.credit && !m.el.hasAttribute('data-shoutout-area')).map((m) => m.el);
      if (now.length !== had.length || now.some((el, i) => el !== had[i])) refresh();
    }
  }
  const soon = () => { if (!healTimer) healTimer = setTimeout(heal, 120); };
  function watch() {
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.target.nodeType === 1 && (ours(r.target) || r.target.closest('shoutout-layer, shoutout-button, [data-shoutout-area]'))) continue;
        if ([...r.addedNodes, ...r.removedNodes].every(ours)) continue;
        return soon();
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    for (const type of ['popstate', 'pageshow']) addEventListener(type, soon);
    for (const type of ['astro:after-swap', 'astro:page-load', 'turbo:load', 'turbo:render', 'swup:page:view']) document.addEventListener(type, soon);
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name];
      history[name] = function (...args) { const out = original.apply(this, args); soon(); return out; };
    }
  }

  async function start() {
    try { credits = normalize(await load()); } catch (err) { console.warn(err.message || err); return; }
    if (!credits.length) return;
    const inline = !opt('src') && document.querySelector('script[type="application/credits+json"]');
    if (inline) inlineText = inline.textContent;
    build();
    watch();
    document.dispatchEvent(new CustomEvent('shoutout:ready', { detail: { version: VERSION, credits: credits.length } }));
    if (location.hash === '#shoutout') open();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
