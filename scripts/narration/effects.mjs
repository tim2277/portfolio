// The sound effects a narration can use for its transition.
//
//   node scripts/narration/effects.mjs
//       lists narration/effects.json and says, for each, whether this machine has the file it describes
//   node scripts/narration/effects.mjs add <name> <file> <source-url> "<title>" "<by>" ["<licence>"]
//       copies a downloaded file into narration/effects/ and registers where it came from
//
// The files are ignored by git and the registry isn't: the Pixabay licence allows an effect in
// a recording and forbids handing it on as a bare file, which a public repo would be doing.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = join(root, 'narration', 'effects.json');
const folder = join(root, 'narration', 'effects');
const effects = existsSync(registry) ? JSON.parse(readFileSync(registry, 'utf8')) : {};
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

const [command, name, file, source, title, by, licence = 'Pixabay Content License'] = process.argv.slice(2);

if (command === 'add') {
  if (!by || !/^[a-z0-9-]+$/.test(name) || !existsSync(file)) {
    console.error('usage: effects.mjs add <name> <file> <source-url> "<title>" "<by>" ["<licence>"], with a lowercase-and-hyphens name');
    process.exit(1);
  }
  mkdirSync(folder, { recursive: true });
  const kept = `${name}${extname(file).toLowerCase()}`;
  copyFileSync(file, join(folder, kept));
  effects[name] = { file: kept, title, by, source, licence, sha256: sha256(join(folder, kept)) };
  writeFileSync(registry, JSON.stringify(effects, null, 2) + '\n');
  console.log(`${name} registered. A post uses it with a "transition ${name}" line in the header of its narration file.`);
} else {
  let missing = 0;
  for (const [id, effect] of Object.entries(effects)) {
    const local = join(folder, effect.file);
    const state = !existsSync(local) ? 'MISSING' : sha256(local) === effect.sha256 ? 'ok' : 'DIFFERENT FILE';
    if (state !== 'ok') missing++;
    console.log(`${state.padEnd(15)}${id.padEnd(14)}"${effect.title}" by ${effect.by}, ${effect.licence}\n${''.padEnd(15)}${effect.source}\n${''.padEnd(15)}narration/effects/${effect.file}`);
  }
  const manifestPath = join(root, 'narration', 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  console.log('\nPublished recordings:');
  for (const [slug, recording] of Object.entries(manifest)) console.log(`  ${slug.padEnd(28)}${recording.transition ?? 'not recorded'}`);
  if (missing) process.exit(1);
}
