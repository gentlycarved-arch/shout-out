// Shoutout in real Next.js and Astro apps. The apps' sources are in tests/apps/next and tests/apps/astro;
// `npm run test:apps` copies them somewhere to install and build (APPS_DIR, default: a temp folder), then runs this.
import { defineConfig, devices } from '@playwright/test';
const dir = process.env.APPS_DIR;
export default defineConfig({
  testDir: '.', testMatch: 'apps.spec.mjs', timeout: 30000, retries: 1, reporter: process.env.CI ? 'github' : 'line',
  webServer: [
    { command: 'npx next start -p 4321', cwd: dir + '/next', url: 'http://localhost:4321', reuseExistingServer: !process.env.CI, env: { NEXT_TELEMETRY_DISABLED: '1' } },
    { command: 'npx astro preview --port 4322', cwd: dir + '/astro', url: 'http://localhost:4322', reuseExistingServer: !process.env.CI, env: { ASTRO_TELEMETRY_DISABLED: '1' } },
  ],
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});
