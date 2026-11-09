// Shoutout in real apps that change pages without reloading.
// Next.js keeps the footer mounted and swaps the page inside it; Astro's view transitions replace <body> outright.
import { test, expect } from '@playwright/test';

const lit = (page) => page.evaluate(() => {
  const root = document.querySelector('shoutout-layer')?.shadowRoot;
  return root ? [...root.querySelectorAll('.tag .title')].map((t) => t.textContent) : null;
});

for (const app of [{ name: 'Next.js', url: process.env.NEXT_URL || 'http://localhost:4321' }, { name: 'Astro', url: process.env.ASTRO_URL || 'http://localhost:4322' }]) {
  test(`${app.name}: Shoutout keeps working across in-app navigation`, async ({ page }) => {
    await page.goto(app.url + '/');
    const button = page.locator('footer shoutout-button').locator('button');
    await expect(button).toHaveText('Shoutout');

    // on: the first page's part is lit
    await button.click();
    await expect.poll(() => lit(page)).toEqual(['Hero shader']);

    // go to the second page inside the app, with Shoutout still on: its own part lights up
    await page.evaluate(() => document.getElementById('to-second').click());
    await page.waitForURL(/second/);
    await expect.poll(() => lit(page), { timeout: 5000 }).toEqual(['Card kit']);
    expect(await page.evaluate(() => document.querySelector('shoutout-layer').isConnected)).toBe(true);

    // off, and on again from the button in the (possibly new) footer
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.Shoutout.isOpen)).toBe(false);
    await expect(page.locator('footer shoutout-button')).toHaveCount(1);
    await page.locator('footer shoutout-button').locator('button').click();
    await expect.poll(() => lit(page)).toEqual(['Card kit']);

    // back home: the first part again, one button, one layer
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.getElementById('to-home').click());
    await page.waitForURL((u) => !/second/.test(u.pathname));
    await page.locator('footer shoutout-button').locator('button').click();
    await expect.poll(() => lit(page)).toEqual(['Hero shader']);
    expect(await page.evaluate(() => [document.querySelectorAll('shoutout-layer').length, document.querySelectorAll('shoutout-button').length])).toEqual([1, 1]);
  });
}
