// Shared by find.mjs and build-index.mjs: read a site's credits, and match them against a creator.

const UA = 'FlowersFinder/0.1 (+https://github.com/gentlycarved-arch/flowers)';

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

export const creditsOf = (data) => (Array.isArray(data) ? data : (data && data.credits) || []).filter((c) => c && c.name);

// "https://www.X.com/Handle/" → "x.com/handle"
export function bare(u) {
  try {
    const x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}

// A creator is found by a link (their profile, their tool's page, their repo) or by a name or @handle.
export function matches(credit, query) {
  const q = String(query).trim();
  if (!q) return false;
  const looksLikeUrl = /^https?:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+\//.test(q) || /^[\w-]+\.[a-z]{2,}$/i.test(q);
  if (looksLikeUrl) {
    const b = bare(q);
    return [credit.url, credit.authorUrl].filter(Boolean).some((u) => { const x = bare(u); return x === b || x.startsWith(b + '/'); });
  }
  const words = q.replace(/^@/, '').toLowerCase();
  return [credit.author, credit.name, credit.authorUrl].filter(Boolean).some((s) => String(s).toLowerCase().includes(words));
}
