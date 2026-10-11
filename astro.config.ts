import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { SITE_URL } from './src/consts';

/*
  Sitemap `lastmod` for entry pages, from each entry's `updated` frontmatter
  field (falling back to `date`). The content layer (`astro:content`) isn't
  up yet when this config module is evaluated, so this reads frontmatter
  straight off disk with a couple of line regexes rather than a real YAML
  parser — the fields involved are plain unquoted scalars, never folded.
*/
function readEntryDates(base: string): Map<string, string> {
  const dates = new Map<string, string>();
  const walk = (dir: string, slugPrefix: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full, `${slugPrefix}${name}/`);
        continue;
      }
      if (!/\.(md|mdx)$/.test(name)) continue;
      const raw = readFileSync(full, 'utf-8');
      const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const date = frontmatter.match(/^date:\s*(.+)$/m)?.[1]?.trim();
      const updated = frontmatter.match(/^updated:\s*(.+)$/m)?.[1]?.trim();
      if (!date) continue;
      // A draft left in would date the listing pages by an entry that isn't
      // on them.
      if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
      const slug = slugPrefix + name.replace(/\.(md|mdx)$/, '');
      dates.set(slug, new Date(updated ?? date).toISOString());
    }
  };
  walk(base, '');
  return dates;
}

const postDates = readEntryDates('./src/content/posts');
const projectDates = readEntryDates('./src/content/projects');

const entryLastmod = new Map<string, string>([
  ...[...postDates].map(([slug, lastmod]) => [`/posts/${slug}/`, lastmod] as const),
  ...[...projectDates].map(([slug, lastmod]) => [`/projects/${slug}/`, lastmod] as const),
]);

/*
  Without a `lastmod` a crawler has nothing to say a listing page changed, and
  a search result goes on quoting a card lede long after it was reworded. A
  listing page shows its entries' ledes, so it's as new as the newest of
  them. ISO strings sort chronologically.
*/
const latest = (...dates: Map<string, string>[]) =>
  dates.flatMap((d) => [...d.values()]).sort().at(-1);

for (const [path, lastmod] of [
  ['/', latest(postDates, projectDates)],
  ['/posts/', latest(postDates)],
  ['/projects/', latest(projectDates)],
] as const) {
  if (lastmod) entryLastmod.set(path, lastmod);
}

// https://astro.build/config
export default defineConfig({
  // Drives canonical URLs, Open Graph tags, the sitemap and the RSS feed.
  site: SITE_URL,

  // Static only — no adapter, no SSR. Azure Static Web Apps just serves `dist`.
  output: 'static',

  // SWA resolves /foo/ to /foo/index.html, and consistent slashes keep
  // canonical URLs and internal links from disagreeing.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Every stylesheet ships as a file under _astro/, never as a <style>
    // block — the CSP's style-src is 'self' with no 'unsafe-inline', so an
    // inlined sheet would be refused by the browser without a word.
    inlineStylesheets: 'never',
  },

  integrations: [
    mdx(),
    sitemap({
      // Drafts aren't emitted by a production build, so they can't reach the
      // sitemap that way. Under BUILD_DRAFTS they would — they're noindex'd,
      // which is the backstop. This filter only drops the 404 page.
      filter: (page) => !page.includes('/404'),
      // About has no dated source, so it gets no `lastmod` rather than a
      // fabricated one.
      serialize(item) {
        const lastmod = entryLastmod.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],

  markdown: {
    // Prism, not the default Shiki: Shiki writes a style="" attribute onto
    // every token, and style-src has no 'unsafe-inline', so the browser would
    // drop them all silently. Prism classes tokens instead; theme CSS is
    // vendored in src/styles/prism.css.
    syntaxHighlight: 'prism',
    // Mermaid: deliberately not wired up yet. When you want it, add a rehype
    // plugin here that turns ```mermaid fences into inline SVG at build time
    // (beautiful-mermaid for a pure-JS render, rehype-mermaid + Playwright for
    // full Mermaid fidelity). See the colophon page for the trade-off.
  },

  prefetch: false,

  vite: {
    resolve: {
      // C:\repos is a junction onto another volume. Without this, Vite
      // resolves modules to their real D:\ path while Astro tracks the C:\
      // one, the module graph splits, and every stylesheet is silently
      // dropped from the build — no error, just an unstyled site.
      preserveSymlinks: true,
    },
  },
});
