import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { normalizeMaker, madeBy } from '../../docs/match.js';
import { readMaker } from '../../tools/lib.mjs';

const card = {
  maker: '1.0', name: 'Praveen Kumar', about: 'Makes free shaders.', url: 'https://www.figma.com/@praveenisomer',
  links: ['https://x.com/praveen_k', 'javascript:alert(1)'], credit: 'Credit me as Praveen Kumar.',
  works: [{ name: 'Dollar Bill Texture Shader', url: 'https://www.figma.com/community/file/1686908159036705400/dollar-bill-texture-shader', kind: 'Shader' }],
};

test('normalizeMaker keeps what is safe to show', () => {
  const m = normalizeMaker(card);
  assert.equal(m.name, 'Praveen Kumar');
  assert.deepEqual(m.links, ['https://x.com/praveen_k']);   // only http(s) links
  assert.equal(m.works[0].kind, 'shader');
  assert.equal(m.listed, true);
  assert.equal(normalizeMaker({ about: 'no name' }), null);
  assert.equal(normalizeMaker({ name: 'Ann', listed: false }).listed, false);
});

test('madeBy: by link or handle, never a whole platform, never by name', () => {
  const m = normalizeMaker({ ...card, links: [...card.links, 'https://figma.com'] });
  assert.ok(madeBy(m, { name: 'x', url: card.works[0].url }));
  assert.ok(madeBy(m, { name: 'x', authorUrl: 'https://twitter.com/Praveen_K' }));
  assert.ok(!madeBy(m, { name: 'x', url: 'https://www.figma.com/community/file/999/someone-else' }));
  assert.ok(!madeBy(m, { name: 'Dollar Bill Texture Shader', author: 'Praveen Kumar' }));
});

test('readMaker finds a card: <link rel="maker">, /.well-known/maker.json, /maker.json, or the address itself', async () => {
  const pages = {
    '/a/': '<html><head><link rel="maker" href="/a/me.json"></head></html>', '/a/me.json': JSON.stringify({ name: 'From link' }),
    '/.well-known/maker.json': JSON.stringify({ name: 'From well-known' }),
    '/gist/raw/maker.json': JSON.stringify({ name: 'From address' }),
  };
  const server = createServer((req, res) => {
    const body = pages[req.url];
    if (body === undefined) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': req.url.endsWith('.json') ? 'application/json' : 'text/html' });
    res.end(body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await readMaker(base + '/a/')).data.name, 'From link');
    assert.equal((await readMaker(base + '/b/')).data.name, 'From well-known');
    assert.equal((await readMaker(base + '/gist/raw/maker.json')).data.name, 'From address');
  } finally { server.close(); }
});
