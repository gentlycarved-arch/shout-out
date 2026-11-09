#!/usr/bin/env node
// Read every site in registry/sites.txt and write docs/index.json, the list the search page (docs/find.html) looks through.
// Run by .github/workflows/index.yml every night, or by hand: node tools/build-index.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readCredits, creditsOf } from './lib.mjs';

const KEEP = ['id', 'name', 'author', 'authorUrl', 'about', 'url', 'license', 'kind', 'note'];
const list = (await readFile(new URL('../registry/sites.txt', import.meta.url), 'utf8'))
  .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);

const sites = [];
for (const site of [...new Set(list)]) {
  try {
    const got = await readCredits(site);
    if (!got) { console.log('no credits  ', site); continue; }
    const data = got.data || {};
    const credits = creditsOf(data).map((c) => {
      const kept = Object.fromEntries(KEEP.filter((k) => typeof c[k] === 'string').map((k) => [k, c[k].slice(0, 500)]));
      if (Array.isArray(c.authorLinks)) kept.authorLinks = c.authorLinks.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 10).map((u) => u.slice(0, 300));
      return kept;
    });
    sites.push({ site: got.page, name: typeof data.site === 'string' ? data.site.slice(0, 120) : '', credits });
    console.log('read        ', site, '(' + credits.length + ')');
  } catch (err) {
    console.log('failed      ', site, err.message);
  }
}

await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
const target = new URL('../docs/index.json', import.meta.url);
// only write when the list itself changed, so a quiet night doesn't make a commit just to update the date
let before = null;
try { before = JSON.parse(await readFile(target, 'utf8')); } catch { /* first run */ }
if (before && JSON.stringify(before.sites) === JSON.stringify(sites)) {
  console.log(`\nNo changes: ${sites.length} sites, ${sites.reduce((n, s) => n + s.credits.length, 0)} credits.`);
  process.exit(0);
}
await writeFile(target, JSON.stringify({ generated: new Date().toISOString(), sites }, null, 1) + '\n');
console.log(`\nWrote docs/index.json: ${sites.length} sites, ${sites.reduce((n, s) => n + s.credits.length, 0)} credits.`);
