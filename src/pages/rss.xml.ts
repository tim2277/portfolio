import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/content';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_AUTHOR } from '../consts';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();
  const site = context.site!;
  const selfHref = new URL('rss.xml', site).toString();

  // The latest publish-or-update date across all posts stands in for "when
  // the feed last changed" — an update to an older post counts too. A build
  // timestamp would change on every deploy and tell a subscriber nothing.
  const lastBuildDate = posts.length
    ? new Date(Math.max(...posts.map((p) => (p.data.updated ?? p.data.date).getTime())))
    : new Date();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site,
    trailingSlash: true,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    // Full content deliberately stays out — the feed is for discovery, not
    // reading in place of the site.
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/posts/${post.id}/`,
      customData: `<dc:creator>${SITE_AUTHOR}</dc:creator>`,
    })),
    customData: `<language>en-gb</language><lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate><atom:link href="${selfHref}" rel="self" type="application/rss+xml"/>`,
  });
};
