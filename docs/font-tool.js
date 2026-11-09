/* Font tool: try your own fonts on this site's titles, body text and the rest.
   Open any page with ?fonts. It reads the local catalogue made by tools/font-catalogue.py (docs/.fonts, never
   published), shows every family in its own typeface, previews on hover, and keeps your picks per page part. */
(async () => {
  'use strict';
  const BASE = new URL('.fonts/', document.currentScript ? document.currentScript.src : location.href);
  let catalogue;
  try { catalogue = await (await fetch(new URL('fonts.json', BASE), { cache: 'no-cache' })).json(); }
  catch { alert('Font tool: no font catalogue yet. Run  python3 tools/font-catalogue.py  in the Shoutout folder.'); return; }
  const families = catalogue.families;
  const byName = new Map(families.map((f) => [f.family, f]));

  // the parts of the page, and what they cover
  const ROLES = [
    { id: 'title', label: 'Title', sel: 'h1' },
    { id: 'lede', label: 'Description', sel: '.lede' },
    { id: 'heading', label: 'Headings', sel: 'h2, .agents dt, .makers .name' },
    { id: 'body', label: 'Body', sel: 'body, main p, li, dd, dt, label, input, textarea, select, button' },
    { id: 'small', label: 'Small text', sel: '.or, .muted, figcaption, footer, .status, .what, .label, legend, .credit, .about' },
    { id: 'code', label: 'Code', sel: 'pre, code' },
  ];
  const KEY = 'font-tool:' + location.pathname;
  let picks = {};
  try { picks = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* private window */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch { /* fine */ } };

  // load a family's files once, under its own name prefixed, so it never clashes with an installed copy
  const loaded = new Map();
  const alias = (fam) => 'FT ' + fam;
  function load(fam) {
    if (loaded.has(fam)) return loaded.get(fam);
    const f = byName.get(fam);
    const p = Promise.all((f ? f.styles : []).map((s) => {
      const face = new FontFace(alias(fam), `url("${new URL(s.file, BASE).href}")`, {
        weight: s.weights ? s.weights.join(' ') : String(s.weight), style: s.italic ? 'italic' : 'normal',
      });
      document.fonts.add(face);
      return face.load().catch(() => null);
    }));
    loaded.set(fam, p);
    return p;
  }

  // apply: one style element, rebuilt from the picks (plus a preview, while hovering the list)
  const sheet = document.createElement('style');
  document.head.append(sheet);
  let preview = null;   // { role, family }
  function rule(role, pick) {
    if (!pick || !pick.family) return '';
    const p = [`font-family: "${alias(pick.family)}", system-ui, sans-serif !important`];
    if (pick.weight) p.push(`font-weight: ${pick.weight} !important`);
    p.push(`font-style: ${pick.italic ? 'italic' : 'normal'} !important`);
    if (pick.size) p.push(`font-size: ${pick.size}px !important`);
    if (pick.tracking != null && pick.tracking !== 0) p.push(`letter-spacing: ${pick.tracking}em !important`);
    if (pick.leading) p.push(`line-height: ${pick.leading} !important`);
    return `${role.sel} { ${p.join('; ')}; }`;
  }
  function apply() {
    sheet.textContent = ROLES.map((r) => {
      const pick = preview && preview.role === r.id ? { ...(picks[r.id] || {}), family: preview.family, weight: null, italic: false } : picks[r.id];
      return rule(r, pick);
    }).join('\n');
  }

  // ---------- the panel ----------
  const host = document.createElement('font-tool');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host { all: initial; position: fixed; top: 0; right: 0; bottom: 0; width: 320px; z-index: 2147483600; font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; }
    :host([hidden-panel]) .panel { transform: translateX(100%); }
    .panel { position: absolute; inset: 0; background: #fff; border-left: 1px solid #e6e6e6; display: flex; flex-direction: column; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
    .toggle { position: absolute; left: -36px; top: 12px; width: 28px; height: 28px; border: 1px solid #e6e6e6; background: #fff; cursor: pointer; font: 600 13px/1 inherit; }
    .top { padding: 12px 14px 10px; border-bottom: 1px solid #eee; }
    .roles { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 10px; }
    .roles button { font: inherit; background: none; border: 0; padding: 0; color: #8a8a8a; cursor: pointer; }
    .roles button[aria-pressed="true"] { color: #111; text-decoration: underline; text-underline-offset: 3px; }
    .roles button.set::after { content: " •"; color: #111; }
    .now { font-size: 15px; margin: 0 0 8px; }
    .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
    .controls label { display: flex; flex-direction: column; gap: 2px; color: #8a8a8a; font-size: 11px; }
    .controls select, .controls input { font: inherit; color: #111; border: 0; border-bottom: 1px solid #e6e6e6; padding: 3px 0; background: none; border-radius: 0; }
    .controls .wide { grid-column: 1 / -1; }
    .row { display: flex; gap: 12px; margin-top: 10px; align-items: center; }
    .row button { font: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; color: #111; }
    .row .muted { color: #8a8a8a; }
    .find { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border-bottom: 1px solid #eee; }
    .find input[type="search"] { flex: 1; font: inherit; border: 0; border-bottom: 1px solid #e6e6e6; padding: 4px 0; outline: none; }
    .find label { color: #8a8a8a; white-space: nowrap; }
    ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
    li { padding: 9px 14px; cursor: pointer; border-bottom: 1px solid #f3f3f3; }
    li:hover, li:focus-visible { background: #f6f6f6; outline: none; }
    li.on { background: #111; color: #fff; }
    li .sample { font-size: 20px; line-height: 1.2; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    li .meta { color: #8a8a8a; font-size: 11px; }
    li.on .meta { color: #bbb; }
    .copied { color: #8a8a8a; }
  </style>
  <div class="panel" part="panel">
    <button class="toggle" title="Hide or show the font tool (F)">F</button>
    <div class="top">
      <div class="roles"></div>
      <p class="now"></p>
      <div class="controls">
        <label class="wide">Style<select name="style"></select></label>
        <label>Size (px)<input name="size" type="number" min="8" max="200" step="1"></label>
        <label>Spacing (em)<input name="tracking" type="number" min="-0.2" max="0.5" step="0.005"></label>
        <label>Line height<input name="leading" type="number" min="0.8" max="2.4" step="0.05"></label>
        <label>Sample<input name="sample" value="Shoutout designers & makers"></label>
      </div>
      <div class="row"><button class="copy">Copy CSS</button><button class="clear muted">Clear this part</button><button class="reset muted">Reset all</button><span class="copied"></span></div>
    </div>
    <div class="find"><input type="search" placeholder="Search ${families.length} families" aria-label="Search fonts"><label><input type="checkbox" class="mono"> Mono</label></div>
    <ul tabindex="-1"></ul>
  </div>`;
  document.documentElement.append(host);
  const $ = (s) => root.querySelector(s);
  let role = 'title';

  // the role tabs
  for (const r of ROLES) {
    const b = document.createElement('button');
    b.textContent = r.label;
    b.dataset.role = r.id;
    b.addEventListener('click', () => { role = r.id; refresh(); });
    $('.roles').append(b);
  }

  // what a part looks like now, before any pick: its current size, so the controls start from it
  const current = (r) => { const el = document.querySelector(r.sel.split(',')[0]); return el ? getComputedStyle(el) : null; };

  function refresh() {
    for (const b of root.querySelectorAll('.roles button')) {
      b.setAttribute('aria-pressed', String(b.dataset.role === role));
      b.classList.toggle('set', !!(picks[b.dataset.role] && picks[b.dataset.role].family));
    }
    const r = ROLES.find((x) => x.id === role), pick = picks[role] || {};
    const cs = current(r);
    $('.now').textContent = pick.family ? pick.family : 'The site’s own font' + (cs ? ` (${cs.fontFamily.split(',')[0].replace(/"/g, '')})` : '');
    const styles = pick.family && byName.get(pick.family) ? byName.get(pick.family).styles : [];
    $('[name=style]').innerHTML = '';
    for (const s of styles) {
      const o = document.createElement('option');
      o.value = JSON.stringify({ weight: s.weights ? 400 : s.weight, italic: s.italic });
      o.textContent = s.style + (s.weights ? ` (${s.weights[0]}–${s.weights[1]})` : '');
      if ((pick.weight || 400) === (s.weights ? 400 : s.weight) && !!pick.italic === s.italic) o.selected = true;
      $('[name=style]').append(o);
    }
    $('[name=style]').disabled = !styles.length;
    $('[name=size]').value = pick.size || (cs ? Math.round(parseFloat(cs.fontSize)) : '');
    $('[name=tracking]').value = pick.tracking ?? 0;
    $('[name=leading]').value = pick.leading || (cs && cs.lineHeight !== 'normal' ? (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2) : '');
    for (const li of root.querySelectorAll('li')) li.classList.toggle('on', li.dataset.family === pick.family);
    apply();
  }

  const set = (changes) => { picks[role] = { ...(picks[role] || {}), ...changes }; save(); refresh(); };
  $('[name=style]').addEventListener('change', (e) => set(JSON.parse(e.target.value)));
  $('[name=size]').addEventListener('input', (e) => set({ size: +e.target.value || null }));
  $('[name=tracking]').addEventListener('input', (e) => set({ tracking: +e.target.value || 0 }));
  $('[name=leading]').addEventListener('input', (e) => set({ leading: +e.target.value || null }));
  $('.clear').addEventListener('click', () => { delete picks[role]; save(); refresh(); });
  $('.reset').addEventListener('click', () => { picks = {}; save(); refresh(); });
  $('.toggle').addEventListener('click', () => host.toggleAttribute('hidden-panel'));
  addEventListener('keydown', (e) => { if (e.key === 'f' && !/input|textarea|select/i.test((e.composedPath()[0] || {}).tagName || '')) host.toggleAttribute('hidden-panel'); });

  // the list: every family in its own typeface, loaded as it scrolls into view
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { load(e.target.dataset.family); seen.unobserve(e.target); }
  }, { root: $('ul'), rootMargin: '200px' });
  function list() {
    const q = $('.find input[type=search]').value.trim().toLowerCase(), mono = $('.mono').checked;
    const ul = $('ul');
    ul.textContent = '';
    for (const f of families) {
      if (q && !f.family.toLowerCase().includes(q)) continue;
      if (mono && !f.mono) continue;
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.dataset.family = f.family;
      const sample = document.createElement('span');
      sample.className = 'sample';
      sample.style.fontFamily = `"${alias(f.family)}", system-ui`;
      sample.textContent = $('[name=sample]').value || f.family;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = `${f.family} · ${f.styles.length} style${f.styles.length === 1 ? '' : 's'}${f.mono ? ' · mono' : ''}`;
      li.append(sample, meta);
      li.addEventListener('mouseenter', () => { load(f.family); preview = { role, family: f.family }; apply(); });
      li.addEventListener('focus', () => { load(f.family); preview = { role, family: f.family }; apply(); });
      li.addEventListener('click', () => {
        const regular = f.styles.find((s) => !s.italic && (s.weights || s.weight === 400)) || f.styles.find((s) => !s.italic) || f.styles[0];
        preview = null;
        set({ family: f.family, weight: regular.weights ? 400 : regular.weight, italic: regular.italic });
      });
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') li.click(); });
      ul.append(li);
      seen.observe(li);
    }
    refresh();
  }
  $('ul').addEventListener('mouseleave', () => { preview = null; apply(); });
  $('.find input[type=search]').addEventListener('input', list);
  $('.mono').addEventListener('change', list);
  $('[name=sample]').addEventListener('input', () => { for (const s of root.querySelectorAll('.sample')) s.textContent = $('[name=sample]').value || s.parentElement.dataset.family; });

  // Copy CSS: the picks with real family names, ready for the site's stylesheet
  $('.copy').addEventListener('click', async () => {
    const css = ROLES.filter((r) => picks[r.id] && picks[r.id].family).map((r) => rule(r, picks[r.id])
      .replace(`"${alias(picks[r.id].family)}", system-ui, sans-serif`, `"${picks[r.id].family}"`).replace(/ !important/g, '')).join('\n');
    const text = css ? `/* from the font tool; the fonts need an @font-face, and a licence that lets the site use them */\n${css}` : '/* nothing picked yet */';
    try { await navigator.clipboard.writeText(text); $('.copied').textContent = 'Copied'; } catch { console.log(text); $('.copied').textContent = 'In the console'; }
    setTimeout(() => { $('.copied').textContent = ''; }, 1600);
  });

  for (const r of ROLES) if (picks[r.id] && picks[r.id].family) load(picks[r.id].family);
  document.documentElement.style.marginRight = '320px';
  new MutationObserver(() => { document.documentElement.style.marginRight = host.hasAttribute('hidden-panel') ? '' : '320px'; }).observe(host, { attributes: true });
  list();
})();
