#!/usr/bin/env node
// Used by .github/workflows/add-site.yml: read the site address from an "Add my site" issue (in $BODY),
// check that it publishes credits, and add it to registry/sites.txt. Prints GitHub Actions outputs.
//   BODY="### Site address\n\nhttps://example.com" node tools/add-site.mjs
//   SHOUTOUT_LOCAL=1 BODY="http://localhost:8000" node tools/add-site.mjs   (to test with a site on your machine)

import { readFile, appendFile } from 'node:fs/promises';
import { readCredits, creditsOf } from './lib.mjs';

const out = (k, v) => console.log(`${k}=${String(v).replace(/[\r\n]+/g, ' ')}`);
const body = process.env.BODY || process.argv[2] || '';
const found = body.match(/https?:\/\/[^\s<>()"'`]+/i) || body.match(/\b[\w-]+(\.[\w-]+)+\.[a-z]{2,}(\/[^\s<>()"'`]*)?/i);
if (!found) {
  out('added', 'no'); out('done', 'no');
  out('message', "I couldn't find a site address in this issue. Edit it to include one, like https://example.com, and it'll be checked again.");
  process.exit(0);
}
let site;
try {
  const u = new URL(/^https?:\/\//i.test(found[0]) ? found[0] : 'https://' + found[0]);
  // SHOUTOUT_LOCAL=1 lets a local address through, for trying the whole flow on your own machine first
  if (!/^https?:$/.test(u.protocol) || (!process.env.SHOUTOUT_LOCAL && /^(localhost|127\.|10\.|192\.168\.|0\.)/.test(u.hostname))) throw new Error('not a public address');
  site = u.origin + u.pathname.replace(/\/+$/, '');
} catch (e) {
  out('added', 'no'); out('done', 'no'); out('message', `That doesn't look like a public web address (${e.message}).`);
  process.exit(0);
}

const file = new URL('../registry/sites.txt', import.meta.url);
const listed = (await readFile(file, 'utf8')).split('\n').map((l) => l.replace(/#.*/, '').trim().replace(/\/+$/, ''));
if (listed.includes(site)) {
  out('added', 'no'); out('done', 'yes'); out('site', site); out('message', `${site} is already on the list.`);
  process.exit(0);
}

let n = 0;
try {
  const got = await readCredits(site);
  if (!got) throw new Error('no credits found');
  n = creditsOf(got.data).length;
  if (!n) throw new Error('its credits list is empty');
} catch (e) {
  out('added', 'no'); out('done', 'no'); out('site', site);
  out('message', `I couldn't read credits from ${site} (${e.message}). Shoutout looks for a <link rel="credits">, inline credits, or /credits.json. Once it's live, edit this issue and it'll be checked again.`);
  process.exit(0);
}

await appendFile(file, site + '\n');
out('added', 'yes'); out('done', 'yes'); out('site', site);
out('message', `Added ${site} (${n} credit${n === 1 ? '' : 's'}). Makers can now find it at the search page.`);
