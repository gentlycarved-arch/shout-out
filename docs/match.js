// How a maker is found: the one copy of the matching rules, used by the search page (docs/find.html)
// and by the command-line tools (tools/lib.mjs). Runs in browsers and in Node.
//
// A maker is the same person across their links: x.com and twitter.com, www. or not, a trailing slash or not,
// @Handle or handle, and the extra profiles listed in a credit's authorLinks.

// different addresses for the same site
const ALIASES = {
  'twitter.com': 'x.com', 'mobile.twitter.com': 'x.com', 'mobile.x.com': 'x.com',
  'instagr.am': 'instagram.com',
  'm.youtube.com': 'youtube.com', 'youtu.be': 'youtube.com',
  'm.facebook.com': 'facebook.com', 'fb.com': 'facebook.com',
  'threads.com': 'threads.net',
  'staging.bsky.app': 'bsky.app',
};

// sites where a profile is a handle in the address, and where to find it: x.com/handle, figma.com/@handle …
const PROFILE = {
  'x.com': 1, 'github.com': 1, 'instagram.com': 1, 'dribbble.com': 1, 'behance.net': 1, 'codepen.io': 1,
  'read.cv': 1, 'are.na': 1, 'gumroad.com': 1, 'facebook.com': 1, 'medium.com': 1, 'framer.com': 1,
  'figma.com': '@', 'threads.net': '@', 'tiktok.com': '@', 'youtube.com': '@', 'mastodon.social': '@',
  'linkedin.com': 'in', 'bsky.app': 'profile',
};

const NOT_HANDLES = new Set(['community', 'file', 'design', 'proto', 'search', 'explore', 'i', 'home', 'settings', 'about', 'login', 'signup']);

function parse(u) {
  try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : 'https://' + u); } catch { return null; }
}

// "https://www.Twitter.com/Handle/?s=20" → "x.com/handle"
export function canon(u) {
  const x = parse(String(u).trim());
  if (!x) return String(u).trim().toLowerCase();
  let host = x.hostname.toLowerCase().replace(/^(www|m)\./, '');
  host = ALIASES[host] || host;
  let path = decodeURIComponent(x.pathname).replace(/\/+$/, '');
  if (host === 'youtube.com' && x.hostname === 'youtu.be') path = '/watch';
  // on profile sites a handle is the same in any case
  if (host in PROFILE) path = path.toLowerCase();
  return host + path;
}

// the handle in a profile link, or null: "https://figma.com/@praveenisomer" → "praveenisomer"
export function handleOf(u) {
  const c = canon(u), slash = c.indexOf('/');
  if (slash < 0) return null;
  const host = c.slice(0, slash), parts = c.slice(slash + 1).split('/').filter(Boolean);
  const rule = PROFILE[host];
  if (!rule || !parts.length) return null;
  let h = null;
  if (rule === 1) h = parts[0];
  else if (rule === '@') h = parts[0].startsWith('@') ? parts[0] : null;
  else if (parts[0] === rule) h = parts[1] || null;
  if (!h) return null;
  h = h.replace(/^@/, '').replace(/\.bsky\.social$/, '').toLowerCase();
  return h && !NOT_HANDLES.has(h) ? h : null;
}

// every link that belongs to a credit's maker or tool
export function linksOf(credit) {
  return [credit.url, credit.authorUrl].concat(Array.isArray(credit.authorLinks) ? credit.authorLinks : [])
    .filter((u) => typeof u === 'string' && u.trim());
}

const looksLikeLink = (q) => /^[a-z]+:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+\//.test(q) || /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}$/i.test(q);

// A maker searches with a link (their profile, their tool's page, their repo), an @handle, or their name.
export function matches(credit, query) {
  const q = String(query).trim();
  if (!q) return false;
  const links = linksOf(credit);
  if (looksLikeLink(q)) {
    const b = canon(q), h = handleOf(q);
    return links.some((u) => { const x = canon(u); return x === b || x.startsWith(b + '/') || (h && handleOf(u) === h); });
  }
  const word = q.replace(/^@/, '').toLowerCase();
  if (q.startsWith('@') || /^[\w.-]+$/.test(q)) {
    if (links.some((u) => handleOf(u) === word)) return true;
  }
  return [credit.author, credit.name].concat(links).filter(Boolean).some((s) => String(s).toLowerCase().includes(word));
}
