// The only place the domain is written. Feeds `site` in astro.config.ts, so it
// drives canonical URLs, Open Graph tags, the sitemap, the RSS feed and
// robots.txt. Getting it wrong is silent — nothing fails to build, the links
// just point somewhere useless. Apex, no `www`, no trailing slash.
export const SITE_URL = 'https://timwrites.dev';

export const SITE_TITLE = 'Tim — software and AI Ops';
export const SITE_DESCRIPTION =
  'Notes on building software, and on putting AI agents to work inside real SDLC workflows. Concepts and write-ups, no employer code.';
export const SITE_AUTHOR = 'Tim';

/** Masthead wordmark. Plays off the domain; the brackets echo the favicon. */
export const SITE_WORDMARK = 'Tim writes [about] dev';
export const SITE_LOCALE = 'en-GB';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/posts/', label: 'Posts' },
  { href: '/projects/', label: 'Projects' },
  { href: '/about/', label: 'About' },
] as const;
