import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Pages aren't a content collection: about.mdx is imported by src/pages/about.astro. Its
// recording still needs a title and a date, which it keeps in its own frontmatter.
const COLLECTIONS = ['posts', 'projects', 'pages'];

// "posts/texturiser", "projects/this-site", "pages/about". A bare slug is a post, since
// that's what every recording was before the others could have one.
export function entry(id) {
  const [collection, slug] = id.includes('/') ? id.split('/') : ['posts', id];
  if (!COLLECTIONS.includes(collection) || !/^[a-z0-9-]+$/.test(slug ?? '')) {
    throw new Error(`"${id}" isn't <${COLLECTIONS.join('|')}>/<slug>`);
  }
  return {
    id: `${collection}/${slug}`,
    collection,
    slug,
    source: join(root, 'src', 'content', collection, `${slug}.mdx`),
    sidecar: join(root, 'narration', collection, `${slug}.ssml`),
    work: join(root, '.narration', collection, slug),
  };
}
