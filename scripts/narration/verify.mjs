// Part of `npm run check`. A post edited after it was recorded still builds, and the page then
// offers a reading of words it no longer says. This fails instead: every published recording
// has to match its tuned file, and the tuned file its post.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const manifestPath = join(root, 'narration', 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

let stale = 0;
for (const [slug, recording] of Object.entries(manifest)) {
  const checked = spawnSync(process.execPath, [join(here, 'narrate.mjs'), 'check', slug], { encoding: 'utf8' });
  const tuned = readFileSync(join(root, 'narration', `${slug}.ssml`), 'utf8').replace(/\r\n/g, '\n');
  const retuned = createHash('sha256').update(tuned).digest('hex') !== recording.sidecar;
  if (checked.status === 0 && !retuned) continue;
  stale++;
  console.error(`narration: ${slug} has changed since ${recording.file} was recorded.`);
  if (checked.status !== 0) console.error(checked.stderr.trim());
  else console.error(`narration/${slug}.ssml was retuned and not published.`);
  console.error(`Rebuild and publish it, or remove "${slug}" from narration/manifest.json to take the player off the post.\n`);
}
if (stale) process.exit(1);
console.log(`narration: ${Object.keys(manifest).length} recording(s) match their posts`);
