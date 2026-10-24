import { readFileSync } from 'node:fs';
// Astro's own MDX parser, reached through @astrojs/mdx. Parsing with anything else would
// mean a second opinion on where a paragraph ends.
import { mdxToMdast } from 'satteri';
import { escapeXml, respell, say, validate, words } from './ssml.mjs';

const PAUSE = '<break time="300ms"/>';
const ASIDE = ['<prosody pitch="-0.75%" rate="+4%">', '</prosody>'];
const ITALIC = ['<prosody rate="-4%" pitch="+0.75%">', '</prosody>'];
const EMOJI = /\s*[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+/gu;

// One segment per block a listener would hear: the mechanical rules only, each one read
// off markup that's already in the post. Judgement is the tuning pass's job.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function segmentPost(path, { lexicon = {}, summary = false, site, name, recorded, reader, kind = 'post' } = {}) {
  const source = readFileSync(path, 'utf8');
  const tree = mdxToMdast(source, { features: { gfm: true } });
  const segments = [];
  const unlisted = new Set();
  const expanded = new Set();

  const spoken = (value, isCode) => {
    const alias = lexicon.code?.[value];
    if (alias === undefined && isCode) unlisted.add(value);
    return alias === undefined || alias === value ? escapeXml(value) : say(escapeXml(value), alias);
  };
  const prose = (text) => respell(escapeXml(text.replace(EMOJI, '')), lexicon.prose).replace(/(^|\s)-(?=\s|$)/g, PAUSE);
  const flat = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(flat).join(''));
  const kids = (node) => node.children.map(inline).join('');

  function inline(node) {
    switch (node.type) {
      case 'text':
        return prose(node.value);
      case 'inlineCode':
        return spoken(node.value, true);
      case 'emphasis':
        return ITALIC[0] + kids(node) + ITALIC[1];
      case 'footnoteReference':
        return '';
      case 'mdxJsxTextElement': {
        if (node.name !== 'abbr') return kids(node);
        // A listener can't hover for the title, so the first use says it in full and then
        // the short form; after that the short form alone. Commas, not brackets: push()
        // would wrap a bracket pair in an aside, inside the attribute.
        const short = flat(node);
        const full = node.attributes.find((a) => a.name === 'title')?.value;
        const alias = `${full}, ${short},`;
        if (typeof full !== 'string' || expanded.has(short) || alias.length > 80) return spoken(short, false);
        expanded.add(short);
        return say(escapeXml(short), alias);
      }
      default:
        return node.children ? kids(node) : '';
    }
  }

  function push(kind, ssml, { stop = false } = {}) {
    // A bracket pair can straddle an italic, and wrapping that would cross two tags.
    ssml = ssml.replace(/\(([^()]+)\)/g, (whole, inner) => (validate(inner).length ? whole : ASIDE[0] + inner + ASIDE[1]));
    ssml = ssml.replace(/\s+/g, ' ').trim();
    if (stop && /[\p{L}\p{N}](<\/[a-z]+>)*$/u.test(ssml)) ssml += '.';
    if (words(ssml).length) segments.push({ id: String(segments.length + 1).padStart(3, '0'), kind, ssml });
  }

  function block(node, kind = 'p') {
    switch (node.type) {
      case 'paragraph':
        push(kind, kids(node));
        break;
      case 'heading':
        push('h', kids(node), { stop: true });
        break;
      case 'list':
        for (const item of node.children) {
          // An item that is only an element, like About's `- <a rel="me">GitHub</a>`, parses as a
          // block and not a paragraph. Skipping it would leave the next item's "or" with nothing before it.
          const spoken = item.children.filter((c) => c.type === 'paragraph' || c.type === 'mdxJsxFlowElement');
          push('li', spoken.map(kids).join(' '), { stop: true });
          item.children.filter((c) => c.type === 'list').forEach((c) => block(c));
        }
        break;
      case 'table': {
        // Read as a sentence per cell with the column header for its subject, which only
        // works while the headers read as the start of one ("Applies to", "Written by").
        const [head, ...rows] = node.children.map((row) => row.children.map(kids));
        for (const cells of rows) push('tr', cells.map((cell, i) => (i ? `${head[i]} ${cell}.` : `${cell}.`)).join(' '));
        break;
      }
      case 'blockquote':
        node.children.forEach((c) => block(c, 'quote'));
        break;
      case 'mdxJsxFlowElement': {
        if (node.name === 'Summary' && !summary) break;
        // A caption read cold sounds like a paragraph about nothing, so it's announced.
        if (node.name === 'Figure') {
          push('caption', `${prose(lexicon.caption ?? '')} ${kids(node)}`);
          break;
        }
        // Left to the fallback, a pipeline is its step bodies run together: no names, no
        // order, and the label and caption lost, since they're attributes.
        if (node.name === 'Pipeline') {
          const attr = (n, name) => n.attributes.find((a) => a.name === name)?.value;
          const lex = lexicon.pipeline ?? {};
          const label = attr(node, 'label');
          if (typeof label === 'string') push('diagram', `${prose(lex.label ?? '')} ${prose(label)}`, { stop: true });
          for (const step of node.children.filter((c) => c.name === 'Step')) {
            const [title, by, loop] = ['title', 'by', 'loop'].map((name) => attr(step, name));
            const body = step.children.some((c) => c.type === 'paragraph') ? step.children.map(kids).join(' ') : kids(step);
            const head = [title, by && `${lex.by ?? 'by'} ${by}`].filter((s) => typeof s === 'string').map(prose).join(', ');
            const tail = typeof loop === 'string' ? ` ${prose(`${lex.loop ?? ''} ${loop}`)}` : '';
            push('step', `${head}. ${body}${tail}`, { stop: true });
          }
          const caption = attr(node, 'caption');
          if (typeof caption === 'string') push('caption', `${prose(lex.caption ?? '')} ${prose(caption)}`);
          break;
        }
        const title = node.attributes.find((a) => a.name === 'title')?.value;
        const inner = node.name === 'Callout' ? 'callout' : node.name === 'Summary' ? 'summary' : kind;
        if (typeof title === 'string') push('callout-title', prose(title), { stop: true });
        if (node.children.some((c) => c.type === 'paragraph')) node.children.forEach((c) => block(c, inner));
        else push(inner, kids(node));
        break;
      }
    }
  }

  const title = source.match(/^title:\s*(["']?)([^>|\s].*?)\1\s*$/m)?.[2];
  if (!title) throw new Error(`${path}: no single-line title in the frontmatter`);
  // A [bracketed] stretch of the intro is only said of a post that links to its companion code.
  const companion = lexicon.companion && source.includes(`/${lexicon.companion}/`);
  const intro = lexicon.intro?.replace(/\[([^\]]*)\]/g, companion ? '$1' : '').replaceAll('{kind}', kind);
  if (intro) push('intro', prose(intro).replace('{name}', () => escapeXml(name)).replace('{voice}', reader).replace('{title}', () => prose(title)));
  else push('title', prose(title), { stop: true });
  tree.children.forEach((node) => block(node));

  // The label a listener is owed, since nothing on the page travels with a downloaded file.
  const dated = (key) => source.match(new RegExp(`^${key}:\\s*(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
  const long = (iso) => `${Number(iso.slice(8))} ${MONTHS[iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
  const updated = dated('updated') ?? dated('date');
  if (lexicon.outro && updated && recorded) {
    push('outro', prose(lexicon.outro.replaceAll('{kind}', kind)).replace('{site}', spoken(site, true)).replace('{updated}', long(updated)).replace('{recorded}', long(recorded)));
  }

  return { segments, unlisted: [...unlisted] };
}
