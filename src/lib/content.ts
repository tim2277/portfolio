import { getCollection, type CollectionEntry } from 'astro:content';

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

export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = await getCollection('projects', ({ data }) => includeDrafts || !data.draft);
  return projects.sort(byNewestFirst);
}
