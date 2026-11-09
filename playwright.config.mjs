import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 30000,
  retries: 1,   // a browser's first cold start can be slow
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4310', trace: 'retain-on-failure' },
  webServer: { command: 'node tools/serve.mjs 4310', url: 'http://localhost:4310/tests/fixtures/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
});
