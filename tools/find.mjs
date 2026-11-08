#!/usr/bin/env node
// Find where your work is credited.
//
//   node tools/find.mjs <you> <site> [site …]
//   node tools/find.mjs <you> --sites registry/sites.txt
//
// <you> is a link (your profile, your tool's page or repo) or your name or @handle.
// Each site's page is read for <link rel="credits">, inline credits, or /credits.json.

import { readFile } from 'node:fs/promises';
import { readCredits, creditsOf, matches } from './lib.mjs';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node tools/find.mjs <your link, name or @handle> <site> [site …]\n       node tools/find.mjs <you> --sites registry/sites.txt');
  process.exit(1);
}
const [who, ...rest] = args;
let sites = rest;
const i = rest.indexOf('--sites');
if (i !== -1) {
  const list = await readFile(rest[i + 1], 'utf8');
  sites = rest.filter((_, j) => j !== i && j !== i + 1).concat(list.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean));
}

let found = 0;
await Promise.all(sites.map(async (site) => {
  try {
    const got = await readCredits(site);
    if (!got) return console.log(`·  ${site}: no credits published`);
    const hits = creditsOf(got.data).filter((c) => matches(c, who));
    for (const c of hits) {
      found++;
      console.log(`✓  ${got.page}\n   ${c.name}${c.author ? ' by ' + c.author : ''}${c.note ? '\n   ' + c.note : ''}`);
    }
    if (!hits.length) console.log(`·  ${site}: credits published, none for "${who}"`);
  } catch (err) {
    console.log(`!  ${site}: ${err.message}`);
  }
}));
console.log(`\n${found} credit${found === 1 ? '' : 's'} found for "${who}" across ${sites.length} site${sites.length === 1 ? '' : 's'}.`);
