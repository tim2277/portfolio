import { getCollection, type CollectionEntry } from 'astro:content';
import type { MarkdownHeading } from 'astro';
import { SITE_LOCALE } from '../consts';

/** Below this many sections a contents list is furniture, not navigation. */
export const TOC_MINIMUM = 3;

/**
 * h1 is the page title and lives in the header, h4 and deeper are too granular
 * to navigate by, and remark-gfm's 'Footnotes' heading is machinery rather
 * than a section — left in, it both pads the count and lists itself.
 */
export function tocHeadings(headings: MarkdownHeading[]): MarkdownHeading[] {
  return headings.filter(
    (h) => (h.depth === 2 || h.depth === 3) && h.slug !== 'footnote-label'
  );
}

/**
 * Drafts are visible in `astro dev` so you can preview what you're writing,
 * and excluded from a production build. Set `BUILD_DRAFTS=true` to include
 * them in a build — handy for checking a draft renders before you publish it,
 * and for exercising the templates when there's no published content yet.
 */
export const includeDrafts =
  import.meta.env.DEV || process.env.BUILD_DRAFTS === 'true';

const byNewestFirst = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.valueOf() - a.data.date.valueOf();

export async function getPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  return posts.sort(byNewestFirst);
}

export interface TimelineMonth {
  /** Anchor for the month's heading, e.g. '2026-10'. */
  id: string;
  label: string;
  posts: CollectionEntry<'posts'>[];
}

export interface TimelineYear {
  id: string;
  label: string;
  count: number;
  months: TimelineMonth[];
}

/**
 * Keeps the order it's given, so pass posts already sorted. Reads the date in
 * UTC: frontmatter dates are midnight UTC, and a build machine west of
 * Greenwich would otherwise file a post from the 1st under the month before.
 */
export function byYearAndMonth(posts: CollectionEntry<'posts'>[]): TimelineYear[] {
  const monthName = new Intl.DateTimeFormat(SITE_LOCALE, { month: 'long', timeZone: 'UTC' });
  const years: TimelineYear[] = [];

  for (const post of posts) {
    const date = post.data.date;
    const yearId = String(date.getUTCFullYear());
    const monthId = `${yearId}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

    let year = years.at(-1);
    if (year?.id !== yearId) {
      year = { id: yearId, label: yearId, count: 0, months: [] };
      years.push(year);
    }

    let month = year.months.at(-1);
    if (month?.id !== monthId) {
      month = { id: monthId, label: monthName.format(date), posts: [] };
      year.months.push(month);
    }

    month.posts.push(post);
    year.count += 1;
  }

  return years;
}

export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = await getCollection('projects', ({ data }) => includeDrafts || !data.draft);
  return projects.sort(byNewestFirst);
}
