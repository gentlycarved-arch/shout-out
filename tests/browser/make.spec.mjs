// The no-code path: fill in docs/make.html, paste its snippet into a page like a site builder makes, and the
// credited picture lights up. The snippet loads Shoutout from the CDN; here that request is answered with the local file.
import { test, expect } from '@playwright/test';

test('the snippet from "Make your credits" works when pasted into a site', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the form is the same on phones; one run is enough');
  await page.goto('/docs/make.html');
  await page.locator('[name="name"]').fill('Dollar Bill Texture Shader');
  await page.locator('[name="author"]').fill('Praveen Kumar');
  await page.locator('[name="authorUrl"]').fill('https://www.figma.com/@praveenisomer');
  await page.locator('[name="where"]').selectOption('file');
  await page.locator('[name="what"]').fill('angel');
  await page.locator('#add').click();
  await page.locator('[name="name"]').nth(1).fill('Banknote Engraver');
  await page.locator('[name="role"]').nth(1).selectOption('tool');
  const snippet = await page.locator('#snippet').textContent();
  expect(snippet).toContain('"role": "tool"');

  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({ path: 'shoutout.js', contentType: 'text/javascript' }));
  await page.goto('/tests/fixtures/builder.html');
  // paste: the credits, then the script, at the end of the body
  await page.evaluate((html) => {
    const box = document.createElement('div');
    box.innerHTML = html;
    for (const old of box.querySelectorAll('script')) {
      const s = document.createElement('script');
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.textContent = old.textContent;
      document.body.append(s);
    }
  }, snippet);

  const button = page.locator('footer shoutout-button').locator('button');
  await expect(button).toHaveText('Shoutout');
  await button.click();
  const lit = () => page.evaluate(() => [...document.querySelector('shoutout-layer').shadowRoot.querySelectorAll('.tag .title')].map((t) => t.textContent));
  await expect.poll(lit).toEqual(['Dollar Bill Texture Shader']);
  const list = await page.evaluate(() => document.querySelector('shoutout-layer').shadowRoot.querySelector('.list').textContent);
  expect(list).toContain('Made with');
  expect(list).toContain('Banknote Engraver');
});
