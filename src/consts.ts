// The only place the domain is written. Feeds `site` in astro.config.ts, so it
// drives canonical URLs, Open Graph tags, the sitemap, the RSS feed and
// robots.txt. Getting it wrong is silent — nothing fails to build, the links
// just point somewhere useless. Apex, no `www`, no trailing slash.
export const SITE_URL = 'https://timwrites.dev';

/**
 * The site brand — matches the masthead wordmark exactly. Single source for
 * the `<title>` suffix, `og:site_name`, the RSS feed title and JSON-LD
 * `WebSite.name`: change it here and all four follow.
 */
export const SITE_TITLE = 'Tim writes [about] dev';
export const SITE_DESCRIPTION =
  'Notes on building software, and on putting AI agents to work inside real SDLC workflows. Concepts and write-ups, no employer code.';
export const SITE_AUTHOR = 'Tim';

/** Masthead wordmark. Plays off the domain; the brackets echo the favicon.
    Same string as SITE_TITLE — kept as a separate name because the header's
    reason for reading it (masthead text) differs from metadata's (brand
    name), even though the value has to stay identical. */
export const SITE_WORDMARK = SITE_TITLE;
export const SITE_LOCALE = 'en-GB';

/** Canonical URL of the About page — the one place Tim, the person, has a
    page. Feeds the Person JSON-LD node's `@id` and `url`, and article:author. */
export const ABOUT_URL = `${SITE_URL}/about/`;

/** Stable identifier for the Person node in JSON-LD, referenced by `author`
    on BlogPosting/TechArticle nodes and `mainEntity` on the About page's
    ProfilePage node. */
export const PERSON_ID = `${ABOUT_URL}#person`;

/** The only other profile this site links to. Reused for JSON-LD `sameAs`
    and should match the `rel="me"` link on the About page. */
export const GITHUB_URL = 'https://github.com/tim2277';

/**
 * What the Person "knows about", for JSON-LD. Drawn by hand from the About
 * page's "Works on" / "Writes about" fields and body copy — there's no
 * single source to derive this from automatically, so keep it in sync when
 * About changes.
 */
export const PERSON_KNOWS_ABOUT = [
  'Software engineering',
  '.NET and Blazor',
  'AI agents in software delivery',
  'Information security (ISO 27001)',
  'Robotics and mechatronics',
];

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/posts/', label: 'Posts' },
  { href: '/projects/', label: 'Projects' },
  { href: '/about/', label: 'About' },
] as const;
