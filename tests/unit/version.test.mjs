import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('one version everywhere: package.json, flowers.js, the skill copy, and the changelog', () => {
  const v = JSON.parse(read('package.json')).version;
  const js = read('flowers.js');
  assert.match(js, new RegExp(`const VERSION = '${v.replace(/\./g, '\\.')}'`));
  assert.match(js, new RegExp(`Flowers ${v.replace(/\./g, '\\.')} `));
  assert.equal(read('skills/flowers/assets/flowers.js'), js, 'skills/flowers/assets/flowers.js is a copy of flowers.js');
  assert.equal(read('skills/flowers/assets/SPEC.md'), read('SPEC.md'), 'skills/flowers/assets/SPEC.md is a copy of SPEC.md');
  assert.match(read('CHANGELOG.md'), new RegExp(`^## ${v.replace(/\./g, '\\.')}`, 'm'));
});
