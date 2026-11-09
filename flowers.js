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
    const res = await fetch(url, { cache: 'no-cache' });   // always check for the latest credits
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
        note: c.note ? String(c.note).trim().slice(0, 200) : '',
        url: isUrl(c.url) ? c.url : isUrl(c.authorUrl) ? c.authorUrl : '',
        selectors: [].concat(c.selectors || []).map(String),
        replay: c.replay === 'hover' || c.replay === 'animation' ? c.replay : '',
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
  --_pop-bg: var(--flowers-popup-bg, #ffffff);
  --_pop-fg: var(--flowers-popup-fg, #111111);
  --_pop-muted: var(--flowers-popup-muted, #6b6b6b);
  --_ease: cubic-bezier(.2, .8, .2, 1);
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
.also { position: fixed; z-index: 2147483001; left: 50%; bottom: 16px; transform: translateX(-50%); max-width: calc(100vw - 32px); padding: 6px 14px; border-radius: 0; background: var(--_pop-bg); color: var(--_pop-muted); text-align: center; animation: in .4s ease .08s both; }
.also a { color: var(--_pop-fg); }
.also a:hover { text-decoration: underline; }
@keyframes in { from { opacity: 0; } }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .fade, .tag, .tag .more, .tag .more > div { transition: none; } .box, .tag, .also, .fade.on .halos { animation: none; } }
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
  let layerShadow, fade, fadeFill, holes, halos, defs, layer, live;
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
    // the fade has a hole the exact shape of each credited part, and a soft glow drawn just outside that shape
    fade.innerHTML = '<defs>'
      + '<filter id="flowers-black" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>'
      + '<filter id="flowers-halo" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
      + '<feGaussianBlur in="SourceAlpha" stdDeviation="4" result="near"/><feGaussianBlur in="SourceAlpha" stdDeviation="14" result="far"/>'
      + '<feMerge result="both"><feMergeNode in="far"/><feMergeNode in="near"/></feMerge>'
      + '<feFlood class="halo-color" result="color"/><feComposite in="color" in2="both" operator="in" result="lit"/>'
      + '<feComposite in="lit" in2="SourceAlpha" operator="out"/></filter>'
      + '<mask id="flowers-holes" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="100%" height="100%" fill="white"/><g class="holes" filter="url(#flowers-black)"></g></mask>'
      + '</defs><rect class="fill" x="0" y="0" width="100%" height="100%" mask="url(#flowers-holes)"/><g class="halos" filter="url(#flowers-halo)"></g>';
    // hovering (or tapping) a credited part shows who made it; clicking anywhere else brings the page back
    fade.addEventListener('pointermove', (e) => { const m = hit(e); fade.style.cursor = m ? 'default' : 'pointer'; if (e.pointerType !== 'touch') hover(m); });
    fade.addEventListener('pointerleave', () => hover(null));
    fade.addEventListener('click', (e) => { const m = hit(e); if (m) hover(m, true); else close(); });
    holes = fade.querySelector('.holes');
    halos = fade.querySelector('.halos');
    defs = fade.querySelector('defs');
    fadeFill = fade.querySelector('.fill');
    fade.style.display = 'none';
    layer = h('div', {});
    rootEl.append(fade, layer, live);
    placeButtons(rootEl);
    shadow.append(rootEl);
    document.body.append(host);
  }

  const ns = 'http://www.w3.org/2000/svg';
  // ---------- the shape of a part ----------
  // An SVG drawing is copied with its own masks, clips and fills, so a round seal is round;
  // a picture keeps its transparent edges; anything else is its box with its own rounded corners.
  let imported = new Map(), uid = 0;
  const URL_REF = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/g;
  function importRef(id) {
    if (imported.has(id)) return imported.get(id);
    const src = document.getElementById(id);
    if (!src) return null;
    const copy = src.cloneNode(true), fresh = 'flowers-d' + (++uid);
    imported.set(id, fresh);
    copy.id = fresh;
    for (const n of [copy, ...copy.querySelectorAll('*')]) {
      if (n !== copy && n.id) n.removeAttribute('id');
      for (const a of [...n.attributes]) {
        if (URL_REF.test(a.value)) n.setAttribute(a.name, a.value.replace(URL_REF, (_, ref) => { const r = importRef(ref); return r ? 'url(#' + r + ')' : 'none'; }));
        URL_REF.lastIndex = 0;
        if ((a.name === 'href' || a.name === 'xlink:href') && a.value.startsWith('#')) { const r = importRef(a.value.slice(1)); if (r) n.setAttribute(a.name, '#' + r); }
      }
    }
    defs.append(copy);
    return fresh;
  }
  const LOOK = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
    'opacity', 'display', 'visibility', 'mask', 'clip-path', 'filter', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline'];
  function copyLook(src, dst) {
    const cs = getComputedStyle(src);
    dst.removeAttribute('class');
    dst.removeAttribute('style');
    for (const p of LOOK) {
      const v = cs.getPropertyValue(p);
      if (v) dst.style.setProperty(p, v.replace(URL_REF, (_, ref) => { const r = importRef(ref); return r ? 'url(#' + r + ')' : 'none'; }));
      URL_REF.lastIndex = 0;
    }
    for (const a of ['href', 'xlink:href']) {
      const v = dst.getAttribute(a);
      if (v && !v.startsWith('#')) dst.setAttribute(a, new URL(v, document.baseURI).href);
    }
  }
  function svgShape(el) {
    const copy = el.cloneNode(true);
    copy.removeAttribute('transform');   // the element's own transform is part of getScreenCTM()
    copy.removeAttribute('id');
    const from = [el, ...el.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((n, i) => to[i] && copyLook(n, to[i]));
    copy.style.removeProperty('opacity');   // the shape is the part, however faint it's drawn
    return copy;
  }
  // a whole <svg>, copied as a nested <svg> placed over the original
  function svgRoot(el) {
    const copy = el.cloneNode(true);
    const from = [el, ...el.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((n, i) => to[i] && copyLook(n, to[i]));
    copy.style.removeProperty('opacity');
    copy.setAttribute('overflow', 'visible');
    return copy;
  }
  function picture(el) {
    const n = document.createElementNS(ns, 'image');
    n.setAttribute('href', el.currentSrc);
    const fit = getComputedStyle(el).objectFit;
    n.setAttribute('preserveAspectRatio', fit === 'cover' ? 'xMidYMid slice' : fit === 'contain' || fit === 'scale-down' ? 'xMidYMid meet' : 'none');
    return n;
  }
  // a wrapper with nothing of its own to see (no fill, no border) is the shapes of the icons and pictures inside it
  function bare(el) {
    const cs = getComputedStyle(el);
    return !(el instanceof SVGElement) && cs.backgroundImage === 'none' && /rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor)
      && !parseFloat(cs.borderTopWidth) && !parseFloat(cs.borderBottomWidth) && cs.boxShadow === 'none';
  }
  function pieces(el) {
    if (el instanceof SVGGraphicsElement && !(el instanceof SVGSVGElement) && el.ownerSVGElement) return [{ el, node: svgShape(el), kind: 'svg' }];
    if (el instanceof SVGSVGElement) return [{ el, node: svgRoot(el), kind: 'frame' }];
    if (el instanceof HTMLImageElement && el.currentSrc && !parseFloat(getComputedStyle(el).borderTopLeftRadius)) return [{ el, node: picture(el), kind: 'frame' }];
    if (bare(el)) {
      const inner = [...el.querySelectorAll('svg, img')].filter((n) => !n.parentElement.closest('svg') && visibleRect(n));
      if (inner.length) return inner.flatMap(pieces);
    }
    const n = document.createElementNS(ns, 'rect');
    n.setAttribute('fill', 'black');
    return [{ el, node: n, kind: 'box' }];
  }
  function makeShape(el, glow) {
    const parts = pieces(el);
    for (const p of parts) {
      p.nodes = [p.node];
      holes.append(p.node);
      if (glow) { const c = p.node.cloneNode(true); halos.append(c); p.nodes.push(c); }
    }
    return {
      show(on) { for (const p of parts) for (const n of p.nodes) n.style.display = on ? '' : 'none'; },
      update() {
        for (const p of parts) {
          if (p.kind === 'svg') {
            const m = p.el.getScreenCTM();
            if (m) for (const n of p.nodes) n.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
            continue;
          }
          const g = p.el.getBoundingClientRect();
          const rx = p.kind === 'box' ? Math.min(parseFloat(getComputedStyle(p.el).borderTopLeftRadius) || 0, g.width / 2, g.height / 2) : 0;
          for (const n of p.nodes) {
            n.setAttribute('x', g.left); n.setAttribute('y', g.top); n.setAttribute('width', g.width); n.setAttribute('height', g.height);
            if (p.kind === 'box') n.setAttribute('rx', rx);
          }
        }
      },
    };
  }

  function mark() {
    holes.textContent = '';
    halos.textContent = '';
    for (const d of defs.querySelectorAll('[id^="flowers-d"]')) d.remove();
    imported = new Map();
    layer.textContent = '';
    marks = [];
    for (const credit of credits) {
      for (const el of targetsOf(credit)) {
        const box = h('div', { class: 'box', part: 'outline', tabindex: '0', role: 'img', 'aria-label': 'Made with ' + credit.name + (credit.author ? ' by ' + credit.author : '') });
        const about = credit.about || credit.note, link = credit.url;
        const title = link ? h('a', { class: 'title', href: link, target: '_blank', rel: 'noopener' }, h('span', {}, credit.name)) : h('span', { class: 'title' }, h('span', {}, credit.name));
        const by = credit.author ? h('span', { class: 'by' }, h('span', {}, 'by ' + credit.author)) : null;
        const tag = h('div', { class: 'tag', part: 'label' }, title, by,
          about ? h('div', { class: 'more' }, h('div', {}, h('span', { class: 'about' }, about))) : null);
        const group = h('div', { class: 'mark' }, box, tag);
        tag.addEventListener('pointerenter', () => hover(mark));
        tag.addEventListener('pointerleave', () => hover(null));
        layer.append(group);
        const mark = { credit, el, box, tag, title, by, group, shape: makeShape(el, true), r: null };
        marks.push(mark);
      }
    }
    keepLit = keepLit.filter((el) => el.isConnected);
    for (const el of keepLit.concat(triggers.filter((t) => t.getRootNode() === document))) marks.push({ credit: null, el, shape: makeShape(el, false) });

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
      m.shape.show(on);
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
  // "replay": "hover" plays the part's hover effect by itself, slowly, on a loop: it sends the mouse events
  // a script listens for and sets data-flowers-hover, which the site's CSS can match next to :hover.
  // "replay": "animation" restarts the part's own CSS or Web animations on a loop.
  const replays = new Map();   // element -> { timer, on }
  const HOLD = 1600, REST = 1800;
  function pulse(el, kind, on) {
    if (kind === 'hover') {
      el.toggleAttribute('data-flowers-hover', on);
      const r = el.getBoundingClientRect(), at = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      for (const type of on ? ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove'] : ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
        const E = type.startsWith('pointer') && window.PointerEvent ? PointerEvent : MouseEvent;
        el.dispatchEvent(new E(type, { ...at, bubbles: !/enter|leave/.test(type), pointerType: 'mouse' }));
      }
    } else if (on) {
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
    fadeFill.style.fill = 'var(--flowers-fade-color, #0a0a0a)';
    fadeFill.style.fillOpacity = 'var(--flowers-fade, 0.82)';
    mark();
    place();
    fade.style.display = '';
    requestAnimationFrame(() => fade.classList.add('on'));
    pressed(true);
    loop();
    startReplays();
    const shown = credits.filter((c) => marks.some((m) => m.credit === c && visibleRect(m.el))).length;
    live.textContent = 'Flowers on. ' + shown + ' of ' + credits.length + ' shown on this page. Press Escape to close.';
    document.dispatchEvent(new CustomEvent('flowers:toggle', { detail: { open: true } }));
  }

  function close() {
    if (!active) return;
    active = false;
    stopReplays();
    fade.classList.remove('on');
    layer.textContent = '';
    shownMark = null;
    hideTimer = setTimeout(() => {
      cancelAnimationFrame(frame);
      fade.style.display = 'none';
      holes.textContent = '';
      halos.textContent = '';
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
