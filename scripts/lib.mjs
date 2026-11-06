// Shared helper: find the awwwards skill's scripts (browser.mjs, serve.mjs), which these scripts reuse.
// Order: $AWWWARDS_SKILL_DIR, then a sibling folder named "awwwards" next to this skill, then
// ~/.claude/skills/awwwards.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.AWWWARDS_SKILL_DIR,
  path.join(here, '..', '..', 'awwwards'),
  path.join(os.homedir(), '.claude', 'skills', 'awwwards'),
].filter(Boolean);
const root = candidates.find((d) => fs.existsSync(path.join(d, 'scripts', 'browser.mjs')));
if (!root) {
  console.error('The awwwards skill was not found. Install it (https://github.com/juliobsz/skills) next to this skill, or set AWWWARDS_SKILL_DIR.');
  process.exit(1);
}
const load = (name) => import(pathToFileURL(path.join(root, 'scripts', name)).href);
export const { launch } = await load('browser.mjs');
export const { serve } = await load('serve.mjs');
