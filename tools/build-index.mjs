#!/usr/bin/env node
// Build the two lists the Shoutout site reads, from the open registry:
//   docs/index.json    every listed site's credits, for "See who gave you a shoutout" (docs/find.html, docs/index.html)
//   docs/makers.json   every listed maker's card, with the sites that credit them, for "Discover makers" (docs/discover.html)
// registry/sites.txt     sites that publish credits
// registry/makers.txt    makers who publish a maker card (maker.json) and want to be listed
// registry/leave-out.txt makers who asked to be left out: their profile links. A maker card with "listed": false counts too.
// Run by .github/workflows/index.yml every night, or by hand: node tools/build-index.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readCredits, creditsOf, readMaker, normalizeMaker, madeBy } from './lib.mjs';

const lines = async (name) => {
  try {
    return [...new Set((await readFile(new URL('../registry/' + name, import.meta.url), 'utf8'))
      .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean))];
  } catch { return []; }
};

// makers first: their cards say who asked to be left out
const makers = [];
for (const address of await lines('makers.txt')) {
  try {
    const got = await readMaker(address);
    const maker = got && normalizeMaker(got.data, got.source);
    if (!maker) { console.log('no card     ', address); continue; }
    makers.push(maker);
    console.log('maker       ', address, maker.listed ? '' : '(not listed)');
  } catch (err) {
    console.log('failed      ', address, err.message);
  }
}
const leftOut = (await lines('leave-out.txt')).map((u) => ({ name: 'left out', url: /^https?:\/\//i.test(u) ? u : 'https://' + u, links: [], works: [] }))
  .concat(makers.filter((m) => !m.listed));
const hidden = (c) => leftOut.some((m) => madeBy(m, c));

const KEEP = ['id', 'name', 'author', 'authorUrl', 'about', 'url', 'license', 'kind', 'note', 'role'];
const sites = [];
for (const site of await lines('sites.txt')) {
  try {
    const got = await readCredits(site);
    if (!got) { console.log('no credits  ', site); continue; }
    const data = got.data || {};
    const credits = creditsOf(data).filter((c) => !hidden(c)).map((c) => {
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

// each listed maker, with the sites that gave them a shoutout
const listed = makers.filter((m) => m.listed).map((m) => {
  const shoutouts = [];
  for (const s of sites) for (const c of s.credits) if (madeBy(m, c)) shoutouts.push({ site: s.site, name: s.name, credit: c.name });
  const { listed: _, ...card } = m;
  return { ...card, shoutouts };
}).sort((a, b) => b.shoutouts.length - a.shoutouts.length || a.name.localeCompare(b.name));

// only write a file when its list changed, so a quiet night doesn't make a commit just to update the date
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
async function write(file, key, list) {
  const target = new URL('../docs/' + file, import.meta.url);
  let before = null;
  try { before = JSON.parse(await readFile(target, 'utf8')); } catch { /* first run */ }
  if (before && JSON.stringify(before[key]) === JSON.stringify(list)) return console.log(`No changes to docs/${file}.`);
  await writeFile(target, JSON.stringify({ generated: new Date().toISOString(), [key]: list }, null, 1) + '\n');
  console.log(`Wrote docs/${file}: ${list.length} ${key}.`);
}
console.log('');
await write('index.json', 'sites', sites);
await write('makers.json', 'makers', listed);
