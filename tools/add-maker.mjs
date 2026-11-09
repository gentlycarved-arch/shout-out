#!/usr/bin/env node
// Used by .github/workflows/makers.yml. Reads the address from an issue ($BODY) and, by $MODE:
//   add-maker   checks that a maker card is there and adds the address to registry/makers.txt
//   leave-out   adds the profile link to registry/leave-out.txt
// Prints GitHub Actions outputs.
import { readFile, appendFile } from 'node:fs/promises';
import { readMaker, normalizeMaker, canon } from './lib.mjs';

const out = (k, v) => console.log(`${k}=${String(v).replace(/[\r\n]+/g, ' ')}`);
const mode = process.env.MODE === 'leave-out' ? 'leave-out' : 'add-maker';
const body = process.env.BODY || process.argv[2] || '';
const found = body.match(/https?:\/\/[^\s<>()"'`]+/i) || body.match(/\b[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/[^\s<>()"'`]*)?/i);
const stop = (message, done = false) => { out('added', 'no'); out('done', done ? 'yes' : 'no'); out('message', message); process.exit(0); };
if (!found) stop("I couldn't find a link in this issue. Edit it to include one, like https://example.com, and it'll be checked again.");

let address;
try {
  const u = new URL(/^https?:\/\//i.test(found[0]) ? found[0] : 'https://' + found[0]);
  if (/^(localhost|127\.|10\.|192\.168\.|0\.)/.test(u.hostname)) throw new Error('not a public address');
  address = u.href.replace(/\/+$/, '');
} catch (e) { stop(`That doesn't look like a public web address (${e.message}).`); }

const file = new URL(`../registry/${mode === 'leave-out' ? 'leave-out' : 'makers'}.txt`, import.meta.url);
const listed = (await readFile(file, 'utf8')).split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
if (listed.some((l) => canon(l) === canon(address))) {
  out('what', ''); stop(mode === 'leave-out' ? `${address} is already left out.` : `${address} is already on the list.`, true);
}

if (mode === 'leave-out') {
  await appendFile(file, address + '\n');
  out('added', 'yes'); out('done', 'yes'); out('what', `Leave out ${address}`);
  out('message', `Done: credits that point to ${address} are left out of Shoutout's search and Discover from the next rebuild. Sites' own Shoutout buttons are theirs and aren't changed.`);
  process.exit(0);
}

let maker;
try {
  const got = await readMaker(address);
  maker = got && normalizeMaker(got.data, got.source);
  if (!maker) throw new Error('no maker card found, or it has no name');
} catch (e) {
  stop(`I couldn't read a maker card at ${address} (${e.message}). Shoutout looks for the address itself if it's a .json file, then a <link rel="maker">, /.well-known/maker.json and /maker.json. Once it's up, edit this issue and it'll be checked again.`);
}
await appendFile(file, address + '\n');
out('added', 'yes'); out('done', 'yes'); out('what', `Add ${maker.name} to Discover`);
out('message', `Added ${maker.name}${maker.listed ? '' : ' (your card says "listed": false, so you stay out of Discover and the search)'}. Discover is rebuilt from the list, starting now.`);
