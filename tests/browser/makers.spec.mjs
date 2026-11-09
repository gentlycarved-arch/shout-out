import { test, expect } from '@playwright/test';

test('"Make your maker card" writes a maker.json', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the form is the same on phones; one run is enough');
  await page.goto('/docs/maker.html');
  await page.locator('[name="name"]').fill('Praveen Kumar');
  await page.locator('[name="about"]').fill('Makes free shaders.');
  await page.locator('[name="url"]').fill('https://www.figma.com/@praveenisomer');
  await page.locator('[name="links"]').fill('https://x.com/praveen_k\nnot a link');
  await page.locator('[name="wname"]').fill('Dollar Bill Texture Shader');
  await page.locator('[name="wkind"]').selectOption('shader');
  await page.locator('[name="listed"]').uncheck();
  const card = JSON.parse(await page.locator('#card').textContent());
  expect(card).toMatchObject({ maker: '1.0', name: 'Praveen Kumar', url: 'https://www.figma.com/@praveenisomer', links: ['https://x.com/praveen_k'], listed: false });
  expect(card.works).toEqual([{ name: 'Dollar Bill Texture Shader', kind: 'shader' }]);
});

test('Discover lists makers, searches them and filters by kind', async ({ page }) => {
  await page.route('**/docs/makers.json', (route) => route.fulfill({ json: { makers: [
    { name: 'Praveen Kumar', about: 'Makes free shaders.', url: 'https://www.figma.com/@praveenisomer', links: [], credit: '',
      works: [{ name: 'Dollar Bill Texture Shader', url: 'https://example.com/s', kind: 'shader' }],
      shoutouts: [{ site: 'https://thetorontosociety.example', name: 'The Toronto Society', credit: 'Dollar Bill Texture Shader' }] },
    { name: 'Motion Maker', about: '', url: null, links: [], credit: 'Please link my site.', works: [{ name: 'Lift hover', url: null, kind: 'motion' }], shoutouts: [] },
  ] } }));
  await page.goto('/docs/discover.html');
  const names = () => page.locator('.makers .name').allTextContents();
  await expect.poll(names).toEqual(['Praveen Kumar', 'Motion Maker']);
  await expect(page.locator('.makers')).toContainText('A shoutout from The Toronto Society');
  await expect(page.locator('.makers')).toContainText('How to credit them: Please link my site.');
  await page.getByRole('button', { name: 'Motion' }).click();
  await expect.poll(names).toEqual(['Motion Maker']);
  await page.getByRole('button', { name: 'Everyone' }).click();
  await page.locator('#q').fill('dollar');
  await expect.poll(names).toEqual(['Praveen Kumar']);
});
