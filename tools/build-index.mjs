#!/usr/bin/env node
// Read every site in registry/sites.txt and write docs/index.json, the list the search page (docs/index.html) looks through.
// Run by .github/workflows/index.yml every night, or by hand: node tools/build-index.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readCredits, creditsOf } from './lib.mjs';

const KEEP = ['id', 'name', 'author', 'authorUrl', 'url', 'license', 'kind', 'note'];
const list = (await readFile(new URL('../registry/sites.txt', import.meta.url), 'utf8'))
  .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);

const sites = [];
for (const site of [...new Set(list)]) {
  try {
    const got = await readCredits(site);
    if (!got) { console.log('no credits  ', site); continue; }
    const data = got.data || {};
    const credits = creditsOf(data).map((c) => Object.fromEntries(KEEP.filter((k) => typeof c[k] === 'string').map((k) => [k, c[k].slice(0, 500)])));
    sites.push({ site: got.page, name: typeof data.site === 'string' ? data.site.slice(0, 120) : '', credits });
    console.log('read        ', site, '(' + credits.length + ')');
  } catch (err) {
    console.log('failed      ', site, err.message);
  }
}

await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/index.json', import.meta.url), JSON.stringify({ generated: new Date().toISOString(), sites }, null, 1) + '\n');
console.log(`\nWrote docs/index.json: ${sites.length} sites, ${sites.reduce((n, s) => n + s.credits.length, 0)} credits.`);
