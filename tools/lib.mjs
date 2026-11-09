// Shared by find.mjs and build-index.mjs: read a site's credits, and match them against a creator.

const UA = 'ShoutoutFinder/1.0 (+https://github.com/gentlycarved-arch/shout-out)';

async function get(url, timeoutMs = 15000) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
  return { url: res.url, text: await res.text() };
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};

// Find a page's credits: <link rel="credits">, then an inline <script type="application/credits+json">, then /credits.json.
export async function readCredits(pageUrl) {
  if (!/^https?:\/\//i.test(pageUrl)) pageUrl = 'https://' + pageUrl;
  const page = await get(pageUrl);
  const html = page.text;
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    const href = attr(tag, 'href');
    if (rel.includes('credits') && href) {
      const src = new URL(href, page.url).href;
      return { page: page.url, source: src, data: JSON.parse((await get(src)).text) };
    }
  }
  const inline = html.match(/<script\b[^>]*type\s*=\s*["']application\/credits\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (inline) return { page: page.url, source: page.url, data: JSON.parse(inline[1]) };
  try {
    const src = new URL('/credits.json', page.url).href;
    return { page: page.url, source: src, data: JSON.parse((await get(src)).text) };
  } catch {
    return null;
  }
}

// Find a maker's card: the address itself if it's a .json file; otherwise the page's <link rel="maker">,
// then /.well-known/maker.json, then /maker.json.
export async function readMaker(address) {
  if (!/^https?:\/\//i.test(address)) address = 'https://' + address;
  if (/\.json([?#].*)?$/i.test(address)) {
    const got = await get(address);
    return { source: got.url, data: JSON.parse(got.text) };
  }
  let page = null;
  try { page = await get(address); } catch { /* a site with no page at that address can still have a card */ }
  if (page) {
    for (const tag of page.text.match(/<link\b[^>]*>/gi) || []) {
      const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
      const href = attr(tag, 'href');
      if (rel.includes('maker') && href) {
        const src = new URL(href, page.url).href;
        return { source: src, data: JSON.parse((await get(src)).text) };
      }
    }
  }
  const base = page ? page.url : address;
  for (const path of ['/.well-known/maker.json', '/maker.json']) {
    try {
      const src = new URL(path, base).href;
      return { source: src, data: JSON.parse((await get(src)).text) };
    } catch { /* try the next place */ }
  }
  return null;
}

export const creditsOf = (data) => (Array.isArray(data) ? data : (data && data.credits) || []).filter((c) => c && c.name);

// the matching rules live in docs/match.js, shared with the search page
export { canon, handleOf, linksOf, matches, normalizeMaker, makerLinks, madeBy } from '../docs/match.js';
