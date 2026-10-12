// Part of `npm run build`. A link to a heading that was renamed still builds, and the browser
// lands the reader at the top of the page with no error. This fails instead: every internal
// href with a fragment has to point at an id on a page that exists in dist/.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const files = readdirSync(dist, { recursive: true })
  .filter((file) => file.endsWith('.html'))
  .map((file) => join(dist, file));

const route = (file) => `/${relative(dist, file).split(sep).join('/')}`.replace(/index\.html$/, '');
const decode = (text) => text.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'");

const pages = new Map();
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  pages.set(route(file), {
    ids: new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((match) => decode(match[1]))),
    hrefs: [...html.matchAll(/\shref="([^"]*#[^"]+)"/g)].map((match) => decode(match[1])),
  });
}

let dead = 0;
let checked = 0;
for (const [from, page] of pages) {
  for (const href of page.hrefs) {
    // Anything with a scheme or a host is someone else's page.
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
    const target = new URL(href, `http://dist${from}`);
    const fragment = decodeURIComponent(target.hash.slice(1));
    // A browser scrolls to the top for #top whether or not anything carries the id.
    if (fragment === 'top') continue;
    checked++;
    const path = decodeURIComponent(target.pathname);
    const to = pages.get(path) ?? pages.get(`${path}/`);
    if (to?.ids.has(fragment)) continue;
    dead++;
    if (to) console.error(`anchors: ${from} links to ${href}, and ${path} has no id "${fragment}".`);
    else if (existsSync(join(dist, path))) console.error(`anchors: ${from} links to ${href}, and ${path} is not an HTML page.`);
    else console.error(`anchors: ${from} links to ${href}, and dist/ has no page at ${path}.`);
  }
}
if (dead) {
  console.error(`\nA heading's id comes from its text, so renaming the heading changes it. Fix the ${dead} link(s) above.`);
  process.exit(1);
}
console.log(`anchors: ${checked} fragment link(s) across ${pages.size} page(s) all land`);
