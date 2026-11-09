import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

// everything Shoutout draws lives in an open shadow root
const layer = (page, fn, arg) => page.evaluate(([src, a]) => {
  const root = document.querySelector('shoutout-layer').shadowRoot;
  return new Function('root', 'a', src)(root, a);
}, [fn, arg]);

// press Credits (it sits in the footer, so a phone scrolls down to it), then bring the part to look at back into view
async function openCredits(page, isMobile, look = 'main') {
  const button = page.locator('shoutout-button').locator('button');
  if (isMobile) await button.tap(); else await button.click();
  await expect.poll(() => page.evaluate(() => window.Shoutout.isOpen)).toBe(true);
  await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'start' }), look);
  await page.waitForTimeout(700);   // the fade, and a first canvas read
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Shoutout && document.querySelector('shoutout-layer'), null, { polling: 100 });
});

test('loads, with its version', async ({ page }) => {
  expect(await page.evaluate(() => window.Shoutout.version)).toBe(pkg.version);
  expect(await page.evaluate(() => window.Shoutout.credits.length)).toBe(14);
});

test('the Credits button sits in the footer and turns the fade on and off', async ({ page, isMobile }) => {
  const button = page.locator('footer shoutout-button').locator('button');
  await expect(button).toHaveText('Credits');
  await openCredits(page, isMobile);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(await layer(page, "return root.querySelector('.fade').classList.contains('on')")).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.Shoutout.isOpen)).toBe(false);
  await expect(button).toHaveAttribute('aria-pressed', 'false');
});

test('each part is cut out in its own shape', async ({ page, isMobile }) => {
  await openCredits(page, isMobile, '#c2d');
  const kinds = await layer(page, "return [...root.querySelectorAll('.holes > [data-kind]')].map((n) => n.getAttribute('data-kind'))");
  // svg circle, img, two canvases, clip-path, background picture, box, framed part, code-drawn area, buttons, spin
  for (const k of ['svg', 'frame', 'canvas', 'clip', 'box']) expect(kinds).toContain(k);
  // the 2D canvas is read as a picture; the WebGL one can't be, so it falls back to its box
  const canvases = await layer(page, `return [...root.querySelectorAll('.holes > [data-kind="canvas"]')].map((g) => ({
    img: g.children[0].style.display !== 'none' && !!g.children[0].getAttribute('href'), box: g.children[1].style.display !== 'none' }))`);
  expect(canvases).toHaveLength(2);
  expect(canvases.some((c) => c.img)).toBe(true);
  expect(canvases.every((c) => c.img || c.box)).toBe(true);
  // the clip-path circle keeps its shape
  expect(await layer(page, "return root.querySelector('.holes > [data-kind=\"clip\"] circle') !== null")).toBe(true);
});

test('a part inside an iframe lines up with the frame', async ({ page, isMobile }) => {
  await openCredits(page, isMobile, '#frame');
  const frame = await page.locator('#frame').boundingBox();
  const hole = await layer(page, `const ms = [...root.querySelectorAll('.tag')].find((t) => t.textContent.includes('Framed part'));
    return ms ? true : false`);
  expect(hole).toBe(true);
  const box = await layer(page, `const r = [...root.querySelectorAll('.holes > rect')].map((n) => ({ x: +n.getAttribute('x'), y: +n.getAttribute('y'), w: +n.getAttribute('width') }));
    return r`, null);
  // the inner part is 80px wide, 30px in from the frame's left edge
  expect(box.some((r) => Math.abs(r.x - (frame.x + 30)) < 2 && Math.abs(r.w - 80) < 2)).toBe(true);
});

test('a part drawn by code (Shoutout.area) is lit where its function says', async ({ page, isMobile }) => {
  await openCredits(page, isMobile, '#stage');
  const stage = await page.locator('#stage').boundingBox();
  const rects = await layer(page, "return [...root.querySelectorAll('.holes > rect')].map((n) => ({ x: +n.getAttribute('x'), y: +n.getAttribute('y'), w: +n.getAttribute('width'), h: +n.getAttribute('height'), rx: +n.getAttribute('rx') }))");
  expect(rects.some((r) => Math.abs(r.x - (stage.x + 40)) < 2 && Math.abs(r.w - 70) < 2 && Math.abs(r.h - 50) < 2 && r.rx === 8)).toBe(true);
});

test('the pop-up shows the title and maker, and grows to the description', async ({ page, isMobile }) => {
  await openCredits(page, isMobile);
  const seal = await page.locator('#seal').boundingBox();
  const tag = () => layer(page, `const t = [...root.querySelectorAll('.tag')].find((t) => t.textContent.includes('Seal'));
    return { text: t.innerText, width: t.offsetWidth, open: t.parentElement.classList.contains('show') }`);
  const before = await tag();
  expect(before.text).toContain('by Ann Maker');
  expect(before.open).toBe(false);
  const x = seal.x + seal.width / 2, y = seal.y + seal.height / 2;
  if (isMobile) await page.touchscreen.tap(x, y); else await page.mouse.move(x, y);
  await expect.poll(async () => (await tag()).open).toBe(true);
  await page.waitForTimeout(800);   // the 600ms grow
  const after = await tag();
  expect(after.text).toContain('Draws seals.');
  expect(after.width).toBeGreaterThan(before.width);
});

test('clicking the faded page brings it back', async ({ page, isMobile }) => {
  await openCredits(page, isMobile);
  const vw = page.viewportSize().width;
  if (isMobile) await page.touchscreen.tap(vw - 6, 6); else await page.mouse.click(vw - 6, 6);
  await expect.poll(() => page.evaluate(() => window.Shoutout.isOpen)).toBe(false);
});

test('motions replay: hover by CSS only, scripted hovers by events, animations restart', async ({ page, isMobile }) => {
  await openCredits(page, isMobile);
  await page.waitForFunction(() => document.querySelector('.lift').hasAttribute('data-shoutout-hover'), null, { timeout: 5000 });
  await page.waitForFunction(() => window.counts.scriptedEnter > 0, null, { timeout: 5000 });
  // "hover" never sends mouse events, so nothing else on the site reacts
  expect(await page.evaluate(() => window.counts.liftEnter)).toBe(0);
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => window.Shoutout.close());
  expect(await page.evaluate(() => document.querySelector('.lift').hasAttribute('data-shoutout-hover'))).toBe(false);
});

test('reduced motion: nothing replays', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(() => window.Shoutout && document.querySelector('shoutout-layer'), null, { polling: 100 });
  await openCredits(page, isMobile);
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => document.querySelector('.lift').hasAttribute('data-shoutout-hover'))).toBe(false);
  expect(await page.evaluate(() => window.counts.scriptedEnter)).toBe(0);
});

test('the list: every credit in one place; hovering a name lights only its parts', async ({ page, isMobile }) => {
  await openCredits(page, isMobile, '#seal');
  const state = () => layer(page, `return {
    open: root.querySelector('.list').classList.contains('open'),
    heads: [...root.querySelectorAll('.list .head')].map((h) => h.textContent),
    text: root.querySelector('.list').textContent,
    lit: [...root.querySelectorAll('.mark')].filter((g) => !g.classList.contains('dim')).map((g) => g.querySelector('.title').textContent),
    shown: [...root.querySelectorAll('.mark.show .title')].map((t) => t.textContent),
  }`);
  const toggle = page.locator('shoutout-layer .list .toggle');
  await expect(toggle).toContainText('All credits');
  if (isMobile) await toggle.tap(); else await toggle.click();
  await expect.poll(async () => (await state()).open).toBe(true);
  const s = await state();
  expect(s.heads).toEqual(['On this page', 'Made with', 'Also']);
  expect(s.text).toContain('Banknote Engraver');
  expect(s.text).toContain('A typeface');

  const seal = page.locator('shoutout-layer .list .item[data-id="svg-circle"]');
  if (isMobile) await seal.tap(); else await seal.hover();
  await expect.poll(async () => (await state()).lit).toEqual(['Seal']);
  expect((await state()).shown).toEqual(['Seal']);
  // the other parts are back under the fade: their holes are gone
  await expect.poll(() => layer(page, "return [...root.querySelectorAll('.holes > *')].filter((n) => n.style.display !== 'none').length")).toBeLessThan(4);

  if (!isMobile) {
    await page.mouse.move(5, page.viewportSize().height - 5);
    await expect.poll(async () => (await state()).lit.length).toBeGreaterThan(5);
  }
});
