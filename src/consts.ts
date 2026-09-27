// TODO: replace with the real domain before the first production deploy.
// Feeds `site` in astro.config.ts, so it drives canonical URLs, Open Graph
// tags, the sitemap and the RSS feed. Getting it wrong is silent — nothing
// fails to build, the links just point somewhere useless.
export const SITE_URL = 'https://www.example.com';

export const SITE_TITLE = 'Tim — software and AI Ops';
export const SITE_DESCRIPTION =
  'Notes on building software, and on putting AI agents to work inside real SDLC workflows. Concepts and write-ups, no employer code.';
export const SITE_AUTHOR = 'Tim';
export const SITE_LOCALE = 'en-GB';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/posts/', label: 'Posts' },
  { href: '/projects/', label: 'Projects' },
  { href: '/about/', label: 'About' },
  { href: '/colophon/', label: 'How this site is built' },
] as const;
