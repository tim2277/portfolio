// Narrates a post: node scripts/narration/narrate.mjs <init|check|build> <slug> [--summary] [--force]
//
//   init   writes narration/<slug>.ssml from the mechanical rules, for tuning by hand
//   check  holds the tuned file to the post: same segments, same words, allowed tags only
//   build  check, then one synthesis request per segment, stitched and encoded
//
//   publish   uploads the built take under a name carrying its hash, and records it in narration/manifest.json,
//             which is what puts a player on the post. Needs az, signed in. Refuses a draft.
//   respell   applies the lexicon's prose entries to the tuned file, after a word is added to it
//   audition  the tuned file's first segments in another voice, to .narration/<slug>/auditions:
//             [--voice=…] [--lang=en-IE] [--pitch=+4%] [--segments=1-5] [--transition=name] [--tag=name], each defaulting to the file's own
//
// build and audition need AZURE_SPEECH_KEY (and AZURE_SPEECH_REGION if it isn't westeurope) and ffmpeg.
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { segmentPost } from './segments.mjs';
import { respell, speak, textOf, validate, words } from './ssml.mjs';

const VOICE = 'en-US-BrianMultilingualNeural';
const FORMAT = 'riff-24khz-16bit-mono-pcm';
const RATE = 24000;

const [command, slug, ...flags] = process.argv.slice(2);
if (!['init', 'check', 'respell', 'build', 'audition', 'publish'].includes(command) || !slug) fail('usage: narrate.mjs <init|check|respell|build|audition|publish> <slug> [--summary] [--force]');
const option = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sidecar = join(root, 'narration', `${slug}.ssml`);
const work = join(root, '.narration', slug);
const cache = join(root, '.narration', 'cache');

const lexicon = JSON.parse(readFileSync(join(root, 'narration', 'lexicon.json'), 'utf8'));
const consts = readFileSync(join(root, 'src', 'consts.ts'), 'utf8');
// The date the outro speaks. It's the tuned file's to hold, so a rebuild next month doesn't change what the recording says of itself.
const head = existsSync(sidecar) && command !== 'init' ? readFileSync(sidecar, 'utf8') : '';
const recorded = head.match(/^recorded (\d{4}-\d{2}-\d{2})$/m)?.[1] ?? new Date().toLocaleDateString('en-CA');
// The reader introduces himself by the voice's own name, so a change of voice can't leave the intro naming the last one.
const reader = (head.match(/^voice (\S+)$/m)?.[1] ?? VOICE).match(/^[a-z]{2}-[A-Z]{2}-([A-Z][a-z]+)/)[1];
const post = join(root, 'src', 'content', 'posts', `${slug}.mdx`);
// Line endings differ between a Windows checkout and the Linux one that runs the site's check.
const sidecarHash = () => createHash('sha256').update(readFileSync(sidecar, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const { segments: source, unlisted } = segmentPost(post, {
  lexicon,
  summary: flags.includes('--summary'),
  site: new URL(consts.match(/SITE_URL = '([^']+)'/)[1]).host,
  name: consts.match(/SITE_TITLE = '([^']+)'/)[1].replace(/[[\]]/g, ''),
  recorded,
  reader,
});
if (unlisted.length) console.warn(`not in narration/lexicon.json, read as written:\n  ${unlisted.join('\n  ')}`);

if (command === 'respell') {
  let tuned = false;
  const lines = readFileSync(sidecar, 'utf8').split('\n');
  const respelt = lines.map((line) => {
    if (line.startsWith('@ ')) tuned = true;
    return tuned && line.trim() && !line.startsWith('@ ') ? respell(line, lexicon.prose) : line;
  });
  writeFileSync(sidecar, respelt.join('\n'));
  console.log(`${respelt.filter((line, i) => line !== lines[i]).length} segments respelt`);
  check();
} else if (command === 'init') {
  if (existsSync(sidecar) && !flags.includes('--force')) fail(`${sidecar} exists. --force replaces it, tuning and all.`);
  const header = [
    `# Narration for src/content/posts/${slug}.mdx. A header line per segment, then its SSML on one line.`,
    `# "@ 012 p gap=1200" overrides the silence before a segment, in milliseconds.`,
    `# node scripts/narration/narrate.mjs check ${slug}`,
    `voice ${VOICE}`,
    `recorded ${recorded}`,
  ];
  writeFileSync(sidecar, [...header, ...source.map((s) => `\n@ ${s.id} ${s.kind}\n${s.ssml}`), ''].join('\n'));
  console.log(`${source.length} segments, ${source.reduce((n, s) => n + s.ssml.length, 0)} characters of SSML -> ${sidecar}`);
} else {
  const tuned = check();
  console.log(`${tuned.segments.length} segments match the post, ${tuned.segments.reduce((n, s) => n + s.ssml.length, 0)} characters of SSML`);
  if (command === 'build') await build(tuned, { lang: tuned.lang, pitch: tuned.pitch, transition: tuned.transition });
  if (command === 'publish') publish();
  if (command === 'audition') {
    const voice = option('voice') ?? tuned.voice;
    const [lang, pitch] = [option('lang') ?? tuned.lang ?? 'en-GB', option('pitch') ?? tuned.pitch];
    const [from, to] = (option('segments') ?? '1-5').split('-').map(Number);
    if (!/^[a-z]{2}-[A-Z]{2}$/.test(lang) || (pitch && !/^[+-]\d{1,2}(\.\d)?%$/.test(pitch)) || !(from >= 1 && to >= from)) fail('bad --lang, --pitch or --segments');
    const name = [voice.replace(/^([a-z]{2}-[A-Z]{2})-(.*?)(Multilingual)?Neural$/, '$2-$1').toLowerCase(), lang === 'en-GB' ? '' : `as-${lang}`, pitch ? `pitch${pitch.slice(0, -1)}` : '', option('tag')]
      .filter(Boolean)
      .join('_');
    // --max-pitch and --max-rate cap every inline move, to hear how little a voice needs before the file is retuned to it.
    const cap = { pitch: Number(option('max-pitch')), rate: Number(option('max-rate')) };
    const soften = (ssml) => ssml.replace(/\b(pitch|rate)="([+-])(\d+(?:\.\d+)?)%"/g, (whole, attr, sign, value) => (value > cap[attr] ? `${attr}="${sign}${cap[attr]}%"` : whole));
    const segments = tuned.segments.slice(from - 1, to).map((s) => ({ ...s, ssml: soften(s.ssml) }));
    await build({ voice, segments }, { lang, pitch, transition: option('transition') ?? tuned.transition, name, dir: join(work, 'auditions') });
  }
}

function readSidecar() {
  if (!existsSync(sidecar)) fail(`${sidecar} doesn't exist. Run init first.`);
  const segments = [];
  const settings = { voice: VOICE };
  for (const line of readFileSync(sidecar, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || (!segments.length && line.startsWith('#'))) continue;
    const setting = segments.length ? null : line.match(/^(voice|lang|pitch|recorded|transition) (\S+)$/);
    if (setting) settings[setting[1]] = setting[2];
    else if (line.startsWith('@ ')) {
      const [, id, kind, ...options] = line.split(/\s+/);
      const gap = options.find((o) => o.startsWith('gap='))?.slice(4);
      segments.push({ id, kind, gap: gap === undefined ? undefined : Number(gap), ssml: '' });
    } else segments.at(-1).ssml += (segments.at(-1).ssml ? ' ' : '') + line.trim();
  }
  return { ...settings, segments };
}

function check() {
  const tuned = readSidecar();
  const problems = [];
  // An "egg" is the reader's own closing remark: the one segment whose words aren't the post's. Last, optional, tags still checked.
  const egg = tuned.segments.at(-1)?.kind === 'egg' ? tuned.segments.at(-1) : null;
  if (egg) problems.push(...validate(egg.ssml).map((f) => `@ ${egg.id} egg: ${f}`));
  const spoken = egg ? tuned.segments.slice(0, -1) : tuned.segments;
  if (spoken.length !== source.length) problems.push(`the post has ${source.length} segments, the tuned file has ${spoken.length}`);
  for (const [i, seg] of spoken.entries()) {
    const from = source[i];
    if (!from) break;
    const at = `@ ${seg.id} ${seg.kind}`;
    if (seg.kind !== from.kind) problems.push(`${at}: the post has a ${from.kind} here`);
    if (seg.gap !== undefined && !(seg.gap >= 0 && seg.gap <= 3000)) problems.push(`${at}: gap is out of range`);
    const faults = validate(seg.ssml);
    if (faults.length) {
      problems.push(...faults.map((f) => `${at}: ${f}`));
      continue;
    }
    const [want, got] = [words(from.ssml), words(seg.ssml)];
    const d = want.findIndex((w, n) => w !== got[n]);
    const first = d === -1 && got.length > want.length ? want.length : d;
    if (first !== -1) {
      const near = (list) => list.slice(Math.max(0, first - 3), first + 4).join(' ');
      problems.push(`${at}: words differ from the post\n    post:  ... ${near(want)}\n    tuned: ... ${near(got)}`);
    }
  }
  if (problems.length) fail(problems.join('\n'));
  return tuned;
}

// Silence before a segment, by what it follows. A tuned gap= wins.
function gapBefore(previous, segment) {
  if (!previous) return 0;
  if (segment.gap !== undefined) return segment.gap;
  if (segment.kind === 'egg') return 2500;
  if (segment.kind === 'h' || segment.kind === 'outro') return 1500;
  if (previous.kind === 'intro') return 1200;
  if (previous.kind === 'h' || previous.kind === 'title') return 900;
  if (segment.kind === 'callout-title') return 1100;
  if (previous.kind === 'callout' && segment.kind !== 'callout') return 1100;
  if (previous.kind === 'callout-title') return 450;
  if (segment.kind === 'li' || segment.kind === 'tr') return 500;
  return 700;
}

// The effect files stay out of git, since their licence forbids passing them on bare, so
// narration/effects.json is what says which file a name means. A missing or different file
// stops the build: a take without its transition, or with the wrong one, sounds finished.
function effectFile(name) {
  if (!name || name === 'none') return null;
  const effect = JSON.parse(readFileSync(join(root, 'narration', 'effects.json'), 'utf8'))[name];
  if (!effect) fail(`no effect called "${name}" in narration/effects.json`);
  const file = join(root, 'narration', 'effects', effect.file);
  const restore = `"${effect.title}" by ${effect.by}, from ${effect.source}, saved as narration/effects/${effect.file}`;
  if (!existsSync(file)) fail(`the "${name}" transition isn't on this machine. It is ${restore}`);
  if (createHash('sha256').update(readFileSync(file)).digest('hex') !== effect.sha256) fail(`narration/effects/${effect.file} isn't the file the registry describes, which is ${restore}`);
  return file;
}

async function build({ voice, segments }, { lang, pitch, transition, name = slug, dir = work } = {}) {
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) fail('AZURE_SPEECH_KEY is not set');
  const endpoint = `https://${process.env.AZURE_SPEECH_REGION ?? 'westeurope'}.tts.speech.microsoft.com/cognitiveservices/v1`;
  mkdirSync(dir, { recursive: true });
  mkdirSync(cache, { recursive: true });

  // Plays between the intro and the post and again before the outro. A post names its own with a
  // "transition <name>" header line, or "transition none"; without one it gets the lexicon's.
  const effect = effectFile(transition ?? lexicon.transition);
  const sting = effect && level(trim(execFileSync('ffmpeg', ['-v', 'error', '-i', effect, '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 2 ** 26 })), 0.35);
  const quiet = (ms) => Buffer.alloc(Math.round((ms / 1000) * RATE) * 2);
  const parts = [];
  const timeline = [];
  let samples = 0;
  let requests = 0;
  for (const [i, segment] of segments.entries()) {
    const document = speak(segment.ssml, voice, { lang, pitch });
    const file = join(cache, `${createHash('sha256').update(`${FORMAT}\n${document}`).digest('hex')}.wav`);
    if (!existsSync(file)) {
      writeFileSync(file, await synthesise(endpoint, key, document));
      requests++;
    }
    const framed = sting && (segments[i - 1]?.kind === 'intro' || segment.kind === 'outro');
    const lead = framed ? [quiet(700), sting, quiet(700)] : [quiet(gapBefore(segments[i - 1], segment))];
    if (framed) timeline.push(`${clock((samples + lead[0].length / 2) / RATE)}  --- transition`);
    const speech = trim(pcm(readFileSync(file), file));
    samples += lead.reduce((n, part) => n + part.length, 0) / 2;
    timeline.push(`${clock(samples / RATE)}  ${segment.id} ${segment.kind.padEnd(13)} ${textOf(segment.ssml).slice(0, 70)}`);
    samples += speech.length / 2;
    parts.push(...lead, speech);
    process.stdout.write(`\r${i + 1}/${segments.length}`);
  }

  const data = Buffer.concat(parts);
  const wav = join(dir, `${name}.wav`);
  const opus = join(dir, `${name}.opus`);
  writeFileSync(wav, Buffer.concat([riffHeader(data.length), data]));
  writeFileSync(join(dir, name === slug ? 'timeline.txt' : `${name}.txt`), timeline.join('\n') + '\n');
  // Without bitexact the Ogg stream gets a random serial number, so the same take would hash,
  // and so publish, under a new name every build.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '32k', '-ac', '1', '-fflags', '+bitexact', '-flags:a', '+bitexact', opus]);
  if (name === slug) writeFileSync(join(dir, 'built.json'), JSON.stringify({ sidecar: sidecarHash(), seconds: Math.round(samples / RATE), transition: transition ?? lexicon.transition ?? 'none' }));
  console.log(`\n${clock(samples / RATE)} of audio, ${requests} new requests, ${segments.length - requests} from cache\n${opus}`);
}

function publish() {
  // The audio container is public. A draft's recording in it is the draft, published.
  if (/^draft:\s*true/m.test(readFileSync(post, 'utf8'))) fail(`${slug} is a draft, and the audio container is public`);
  const stamp = existsSync(join(work, 'built.json')) ? JSON.parse(readFileSync(join(work, 'built.json'), 'utf8')) : {};
  if (stamp.sidecar !== sidecarHash()) fail('the take on disk was not built from the tuned file as it stands. Run build first.');

  const opus = join(work, `${slug}.opus`);
  const bytes = readFileSync(opus);
  // The hash in the name is what lets the file be cached for a year: a new recording is a new URL.
  const file = `posts/${slug}.${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.opus`;
  const [, account, container] = consts.match(/AUDIO_URL = 'https:\/\/([a-z0-9]+)\.[^/']+\/([^/']+)'/);
  const upload = ['storage', 'blob', 'upload', '--auth-mode', 'login', '--account-name', account, '--container-name', container];
  // az is a .cmd on Windows, which only a shell can start.
  execSync(['az', ...upload, '--name', file, '--file', `"${opus}"`, '--content-type', 'audio/ogg', '--content-cache-control', '"public,max-age=31536000,immutable"', '--overwrite', 'true', '--only-show-errors', '--output', 'none'].join(' '), {
    stdio: 'inherit',
  });

  const manifestPath = join(root, 'narration', 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  manifest[slug] = { file, seconds: stamp.seconds, bytes: bytes.length, voice: reader, recorded, transition: stamp.transition, sidecar: stamp.sidecar };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${container}/${file}, recorded in narration/manifest.json`);
}

async function synthesise(endpoint, key, document) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'portfolio-narration',
      },
      body: document,
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt === 4 || (response.status !== 429 && response.status < 500)) {
      fail(`\nsynthesis failed: ${response.status} ${response.statusText} ${await response.text()}\n${document}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
}

function pcm(buffer, file) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.readUInt32LE(24) !== RATE) fail(`${file} isn't ${RATE}Hz RIFF`);
  for (let at = 12; at + 8 <= buffer.length; ) {
    const size = buffer.readUInt32LE(at + 4);
    // A streamed response can declare a data chunk of zero or of 4GB; either way it runs to the end.
    if (buffer.toString('ascii', at, at + 4) === 'data') return buffer.subarray(at + 8, Math.min(buffer.length, at + 8 + (size || Infinity)));
    at += 8 + size + (size % 2);
  }
  fail(`${file} has no data chunk`);
}

// The service pads each clip with silence of its own choosing. Cut back to the speech so
// the gaps in the stitched file are the ones asked for.
function trim(data) {
  const loud = (i) => Math.abs(data.readInt16LE(i * 2)) > 200;
  const pad = Math.round(0.03 * RATE);
  const count = data.length >> 1;
  let start = 0;
  let end = count - 1;
  while (start < end && !loud(start)) start++;
  while (end > start && !loud(end)) end--;
  return data.subarray(Math.max(0, start - pad) * 2, Math.min(count, end + 1 + pad) * 2);
}

// A library effect arrives at whatever level its maker liked. Scale it to a fixed share of full
// scale so it sits under the voice whichever file is dropped in.
function level(data, peak) {
  let loudest = 1;
  for (let i = 0; i < data.length; i += 2) loudest = Math.max(loudest, Math.abs(data.readInt16LE(i)));
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 2) out.writeInt16LE(Math.round((data.readInt16LE(i) * peak * 32767) / loudest), i);
  return out;
}

function riffHeader(bytes) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'ascii');
  h.writeUInt32LE(36 + bytes, 4);
  h.write('WAVEfmt ', 8, 'ascii');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36, 'ascii');
  h.writeUInt32LE(bytes, 40);
  return h;
}

function clock(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
