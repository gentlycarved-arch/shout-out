import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canon, handleOf, matches } from '../../docs/match.js';

test('canon: one address per profile', () => {
  assert.equal(canon('https://www.Twitter.com/AnnMaker/?s=20'), 'x.com/annmaker');
  assert.equal(canon('x.com/annmaker'), 'x.com/annmaker');
  assert.equal(canon('https://mobile.twitter.com/annmaker'), 'x.com/annmaker');
  assert.equal(canon('https://www.figma.com/@PraveenIsOmer'), 'figma.com/@praveenisomer');
  assert.equal(canon('https://example.com/Tools/Aurora/'), 'example.com/Tools/Aurora');
});

test('handleOf: the handle in a profile link', () => {
  assert.equal(handleOf('https://twitter.com/AnnMaker'), 'annmaker');
  assert.equal(handleOf('https://www.figma.com/@praveenisomer'), 'praveenisomer');
  assert.equal(handleOf('https://www.figma.com/community/file/123'), null);
  assert.equal(handleOf('https://bsky.app/profile/ann.bsky.social'), 'ann');
  assert.equal(handleOf('https://www.linkedin.com/in/ann-maker/'), 'ann-maker');
  assert.equal(handleOf('https://github.com/annmaker/aurora'), 'annmaker');
  assert.equal(handleOf('https://example.com/annmaker'), null);
});

const credit = { name: 'Dollar Bill Texture Shader', author: 'Praveen Kumar', authorUrl: 'https://www.figma.com/@praveenisomer',
  url: 'https://www.figma.com/community/file/1686908159036705400/dollar-bill-texture-shader', authorLinks: ['https://x.com/praveen_k'] };

test('matches: by link, by handle on any site, by name', () => {
  assert.ok(matches(credit, 'figma.com/@praveenisomer'));
  assert.ok(matches(credit, 'https://figma.com/@PraveenIsOmer/'));
  assert.ok(matches(credit, 'https://twitter.com/praveen_k'));       // twitter.com and x.com are the same
  assert.ok(matches(credit, '@praveenisomer'));
  assert.ok(matches(credit, '@praveen_k'));                           // a handle from authorLinks
  assert.ok(matches(credit, 'Praveen'));
  assert.ok(matches(credit, 'figma.com/community/file/1686908159036705400'));
  assert.ok(!matches(credit, '@nobody'));
  assert.ok(!matches(credit, 'x.com/someoneelse'));
  assert.ok(!matches(credit, ''));
});
