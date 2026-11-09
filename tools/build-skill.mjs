#!/usr/bin/env node
// Package the skill for places other than Claude Code:   npm run build:skill
//   docs/downloads/shoutout-skill.zip   the skill folder, to upload as a skill in Claude on the web or the desktop app
//   docs/shoutout.js                    a copy of the script, for the site's examples page
//   docs/downloads/shoutout-rules.md    the same instructions as plain rules, for agents without skills:
//                                       add them to a project's AGENTS.md (Codex and others), CLAUDE.md, or Cursor's rules
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = root + 'docs/downloads/';
await mkdir(out, { recursive: true });

// the Shoutout site (docs/) uses the script too, for its examples page
await writeFile(root + 'docs/shoutout.js', await readFile(root + 'shoutout.js'));

const version = JSON.parse(await readFile(root + 'package.json', 'utf8')).version;
const repo = 'https://github.com/gentlycarved-arch/shout-out';
const raw = 'https://raw.githubusercontent.com/gentlycarved-arch/shout-out/main/';

// the zip: the skill folder as it is, with SKILL.md at the top of the archive's one folder
await rm(out + 'shoutout-skill.zip', { force: true });
execFileSync('zip', ['-r', '-X', '-q', out + 'shoutout-skill.zip', 'shoutout', '-x', '*.DS_Store'], { cwd: root + 'skills' });

// the rules: the skill's instructions without its front matter, pointing at the script and spec online
const skill = await readFile(root + 'skills/shoutout/SKILL.md', 'utf8');
const body = skill.replace(/^---[\s\S]*?---\s*/, '')
  .replace(/the script \(bundled in this skill at `assets\/shoutout\.js`; its version is on its first line\)/,
    `the script, version ${version}: download it from ${raw}shoutout.js (its version is on its first line)`)
  .replaceAll('`assets/shoutout.js`', `\`shoutout.js\` (${raw}shoutout.js)`)
  .replaceAll('`assets/SPEC.md`', `the spec (${repo}/blob/main/SPEC.md)`)
  .replaceAll('node <this skill>/assets/read-image-credits.mjs', `curl -sO ${raw}skills/shoutout/assets/read-image-credits.mjs && node read-image-credits.mjs`)
  .replaceAll('`assets/read-image-credits.mjs`', `\`read-image-credits.mjs\` (${raw}skills/shoutout/assets/read-image-credits.mjs)`)
  .replaceAll("The skill's `assets/read-image-credits.mjs`", 'read-image-credits.mjs');
const rules = `<!-- Shoutout ${version}: rules for coding agents. Add this to your project's AGENTS.md, CLAUDE.md or Cursor rules. Built from ${repo} -->

When the user shares a link to someone else's tool or work that they're using on the site, mentions a tool they made the site with, or asks to credit, audit or update credits, follow these instructions.

${body}`;
await writeFile(out + 'shoutout-rules.md', rules);
console.log('docs/downloads/shoutout-skill.zip and docs/downloads/shoutout-rules.md, version ' + version);
