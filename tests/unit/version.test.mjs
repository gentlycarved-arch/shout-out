import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('one version everywhere: package.json, shoutout.js, the skill copy, and the changelog', () => {
  const v = JSON.parse(read('package.json')).version;
  const js = read('shoutout.js');
  assert.match(js, new RegExp(`const VERSION = '${v.replace(/\./g, '\\.')}'`));
  assert.match(js, new RegExp(`Shoutout ${v.replace(/\./g, '\\.')} `));
  assert.equal(read('skills/shoutout/assets/shoutout.js'), js, 'skills/shoutout/assets/shoutout.js is a copy of shoutout.js');
  assert.equal(read('skills/shoutout/assets/SPEC.md'), read('SPEC.md'), 'skills/shoutout/assets/SPEC.md is a copy of SPEC.md');
  assert.match(read('CHANGELOG.md'), new RegExp(`^## ${v.replace(/\./g, '\\.')}`, 'm'));
  assert.match(read('docs/downloads/shoutout-rules.md'), new RegExp(`Shoutout ${v.replace(/\./g, '\\.')}:`), 'docs/downloads is up to date: run npm run build:skill');
});
