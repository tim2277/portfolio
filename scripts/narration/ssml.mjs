// The whole of the SSML a tuned segment may use. Anything outside it fails the check, so a
// tuning pass can't slip in a tag the voice ignores in silence or a value that distorts it.
const percent = (cap) => (v) => /^[+-]\d{1,2}(\.\d{1,2})?%$/.test(v) && Math.abs(parseFloat(v)) <= cap;
const TAGS = {
  break: { time: (v) => /^\d{2,4}ms$/.test(v) && parseInt(v, 10) <= 1500 },
  // Past these the voice stops sounding like one speaker. Tim's ears, on Brian, 10 Oct 2026.
  prosody: { rate: percent(4), pitch: percent(0.75), volume: percent(20) },
  sub: { alias: (v) => v.length > 0 && v.length <= 80 },
  lang: { 'xml:lang': (v) => /^[a-z]{2}-[A-Z]{2}$/.test(v) },
  phoneme: { alphabet: (v) => v === 'ipa', ph: (v) => v.length > 0 && v.length <= 40 },
};

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
const TOKEN = /<(\/?)([a-z:]+)((?:\s+[a-z:]+="[^"<>]*")*)\s*(\/?)>|([^<]+)/y;

export const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escapeAttr = (s) => escapeXml(s).replace(/"/g, '&quot;');

export function tokenise(fragment) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < fragment.length) {
    const at = TOKEN.lastIndex;
    const m = TOKEN.exec(fragment);
    if (!m) throw new Error(`malformed markup at ${at}: "${fragment.slice(at, at + 40)}"`);
    if (m[5] !== undefined) {
      tokens.push({ type: 'text', value: m[5] });
      continue;
    }
    const attrs = Object.fromEntries([...m[3].matchAll(/([a-z:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    tokens.push({ type: m[1] ? 'close' : m[4] ? 'empty' : 'open', name: m[2], attrs });
  }
  return tokens;
}

// A lexicon entry is a respelling, or { "ipa": … } where no respelling gets the sound.
export function say(written, entry) {
  return typeof entry === 'string' ? `<sub alias="${escapeAttr(entry)}">${written}</sub>` : `<phoneme alphabet="ipa" ph="${escapeAttr(entry.ipa)}">${written}</phoneme>`;
}

// Words the voice gets wrong in running text ("repo" comes out as "reap"), swapped for a
// spoken form wherever they stand alone and aren't already respelt. The written word stays inside the tag.
export function respell(fragment, words = {}) {
  const listed = Object.keys(words);
  if (!listed.length) return fragment;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${listed.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  let spoken = false;
  return tokenise(fragment)
    .map((t) => {
      if (t.type !== 'text') {
        if (t.name === 'sub' || t.name === 'phoneme') spoken = t.type === 'open';
        const attrs = Object.entries(t.attrs).map(([name, value]) => ` ${name}="${value}"`);
        return t.type === 'close' ? `</${t.name}>` : `<${t.name}${attrs.join('')}${t.type === 'empty' ? '/' : ''}>`;
      }
      if (spoken) return t.value;
      return t.value.replace(pattern, (word) => {
        const entry = words[word.toLowerCase()];
        const capital = typeof entry === 'string' && word[0] !== word[0].toLowerCase();
        return say(word, capital ? entry[0].toUpperCase() + entry.slice(1) : entry);
      });
    })
    .join('');
}

export function validate(fragment) {
  let tokens;
  try {
    tokens = tokenise(fragment);
  } catch (e) {
    return [e.message];
  }
  const problems = [];
  const open = [];
  for (const t of tokens) {
    if (t.type === 'text') {
      const stray = t.value.replace(/&(amp|lt|gt|quot|apos);/g, '').match(/&\S{0,8}/);
      if (stray) problems.push(`unescaped "${stray[0]}"`);
      continue;
    }
    if (t.type === 'close') {
      const expected = open.pop();
      if (expected !== t.name) problems.push(`</${t.name}> closes <${expected ?? 'nothing'}>`);
      continue;
    }
    const allowed = TAGS[t.name];
    if (!allowed) {
      problems.push(`<${t.name}> is not an allowed tag`);
      continue;
    }
    if (open.includes('sub') || open.includes('phoneme')) problems.push(`<${t.name}> inside <${open.at(-1)}>`);
    if ((t.type === 'empty') !== (t.name === 'break')) problems.push(`<${t.name}> ${t.type === 'empty' ? 'is self-closing' : 'has to be self-closing'}`);
    if (t.name !== 'break' && Object.keys(t.attrs).length === 0) problems.push(`<${t.name}> has no attributes`);
    for (const [name, value] of Object.entries(t.attrs)) {
      if (!allowed[name]) problems.push(`<${t.name} ${name}> is not an allowed attribute`);
      else if (!allowed[name](value)) problems.push(`<${t.name} ${name}="${value}"> is out of range`);
    }
    if (t.type === 'open') open.push(t.name);
  }
  if (open.length) problems.push(`unclosed <${open.join('>, <')}>`);
  return problems;
}

// The text as written, not as spoken: a <sub> gives up its contents, never its alias.
export function textOf(fragment) {
  return tokenise(fragment)
    .filter((t) => t.type === 'text')
    .map((t) => t.value.replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITIES[e]))
    .join('');
}

// Punctuation and case are the tuner's to change ("No - it's" may become "No." and "It's"),
// the words aren't. Apostrophes go first so a curled one doesn't split a word a straight one keeps whole.
export function words(fragment) {
  return textOf(fragment)
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function speak(fragment, voice, { lang = 'en-GB', pitch } = {}) {
  const body = pitch ? `<prosody pitch="${pitch}">${fragment}</prosody>` : fragment;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><lang xml:lang="${lang}">${body}</lang></voice></speak>`;
}
