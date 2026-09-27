import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { SITE_URL } from './src/consts';

// https://astro.build/config
export default defineConfig({
  // Drives canonical URLs, Open Graph tags, the sitemap and the RSS feed.
  site: SITE_URL,

  // Static only — no adapter, no SSR. Azure Static Web Apps just serves `dist`.
  output: 'static',

  // SWA resolves /foo/ to /foo/index.html, and consistent slashes keep
  // canonical URLs and internal links from disagreeing.
  trailingSlash: 'always',
  build: { format: 'directory' },

  integrations: [
    mdx(),
    sitemap({
      // Drafts are noindex'd; keep them out of the sitemap too.
      filter: (page) => !page.includes('/404'),
    }),
  ],

  markdown: {
    shikiConfig: {
      // Both themes are emitted as CSS variables and swapped by a media
      // query in global.css, so syntax highlighting needs no client JS.
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: false,
    },
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
