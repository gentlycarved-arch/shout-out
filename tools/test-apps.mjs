#!/usr/bin/env node
// Test Shoutout inside real apps that change pages without reloading: a Next.js app and an Astro app with
// view transitions (tests/apps). Copies them to a temp folder, installs, puts the current shoutout.js in,
// builds, and runs tests/apps/apps.spec.mjs in Chromium, Firefox and WebKit.   npm run test:apps
import { cp, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = process.env.APPS_DIR || await mkdtemp(join(tmpdir(), 'shoutout-apps-'));
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ASTRO_TELEMETRY_DISABLED: '1' } });
for (const app of ['next', 'astro']) {
  await cp(join(root, 'tests/apps', app), join(dir, app), { recursive: true });
  await cp(join(root, 'shoutout.js'), join(dir, app, 'public/shoutout.js'));
  run('npm install --no-audit --no-fund', join(dir, app));
  run(app === 'next' ? 'npx next build' : 'npx astro build', join(dir, app));
}
run('npx playwright test -c tests/apps/playwright.config.mjs', root);
