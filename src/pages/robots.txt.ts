import type { APIRoute } from 'astro';

// Generated rather than static so the sitemap URL tracks `site` in
// astro.config.mjs — one domain to change, not two.
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
