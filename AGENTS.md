# AGENTS.md

Personal portfolio and blog. Astro 7, static output, Azure Static Web Apps. Architecture write-up lives on the site as the `this-site` project entry (`/projects/this-site/`, with `/colophon/` redirecting to it); setup and deploy steps are in `README.md`.

## Invariants

Breaking any of these is a bug, not a style choice. If a change requires breaking one, stop and say so rather than working around it.

- **No framework runtimes.** No React, Vue or Svelte, no `client:*` directives, no analytics, no tag managers. Vanilla JavaScript is welcome where it earns its place — the theme toggle in `src/layouts/BaseLayout.astro` is the worked example: about thirty lines, no dependencies, and it degrades to `prefers-color-scheme` when it doesn't run.
- **Enhancements only.** A content page must do its whole job with scripts blocked. Anything JavaScript adds is on top of a page that already works — no controls that sit there dead, no content that arrives late.
- **Self-hosted fonts only.** No Google Fonts, no CDN, nothing that makes the reader's browser talk to a third party — that's the part of the old no-web-fonts rule worth keeping. Fraunces ships from `_astro/` via `@fontsource-variable/fraunces`, weight axis only, headings alone. Body and code stay on locally installed stacks. Adding a second family is a dependency decision, not a styling one.
- **Every inline script is pinned in the CSP by hash.** `script-src` in `public/staticwebapp.config.json` lists a sha256 per script. Edit one without recomputing it and the browser silently refuses to run it — the feature dies, the build stays green, and nothing says why. See the traps below.
- **Static output only.** No adapter, no SSR, no server islands.
- **Hiberno-English** in all prose, UI copy, and content: Irish English, which spells as British English does (`colour`, `-ise`) and has its own idiom. "Ye" and "grand" are Tim's actual voice — not errors to be corrected. See Voice in `.claude/rules/writing.md`.
- **No employer code and no client names.** Content is concepts, patterns and write-ups. Generalise anything drawn from paid work.
- **Ask before adding a dependency** that isn't an official Astro integration.

## Definition of done

Both of these clean, every time:

```powershell
npm run check
npm run build
```

The build ends with `scripts/verify-anchors.mjs`, which fails on any internal link whose `#fragment` isn't an id on the page it points to. A heading's id comes from its text, so rename a heading and fix the links the build then names. A deep link goes to the page itself: a redirect such as `/colophon/` has no file in `dist/` and is reported as missing.

Then confirm the build actually produced a site:

- `dist/_astro/*.css` exists — see the junction trap below
- every `<script` in `dist/**/*.html` is inline, and each one's sha256 appears in `script-src` in `dist/staticwebapp.config.json`. JSON-LD blocks (`type="application/ld+json"`) are data, not script, and are exempt — but each must parse as JSON
- no `style=` attribute and no `<style` element anywhere in `dist/**/*.html`
- `dist/staticwebapp.config.json` exists

A build can "succeed" and still fail all four.

## Traps

Each of these fails silently. None produce an error.

**Junction paths eat the CSS.** `C:\repos` is a junction onto another volume. Vite resolves modules to the real `D:\` path while Astro tracks the `C:\` one, the module graph splits, and every stylesheet is dropped from the build. The site builds fine and renders unstyled. `astro.config.ts` sets `vite.resolve.preserveSymlinks` to hold both halves on one path — don't remove it, and if CSS ever vanishes, look here first.

**A stale CSP hash kills a script in silence.** Inline scripts are `is:inline`, so Astro emits them byte-for-byte and the sha256 in `script-src` has to match. Nothing in `npm run check` or `npm run build` verifies this. After touching a script, rebuild and recompute:

```powershell
$html = Get-Content dist\index.html -Raw
$sha = [System.Security.Cryptography.SHA256]::Create()
[regex]::Matches($html, '(?s)<script>(.*?)</script>') | ForEach-Object {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($_.Groups[1].Value)
  "sha256-$([Convert]::ToBase64String($sha.ComputeHash($bytes)))"
}
```

It prints one hash per script, in page order: the theme script in `BaseLayout.astro`, then the margin drift in `Margins.astro`. Each goes in `script-src` in `public/staticwebapp.config.json`, quoted and separated by a space.

**An inline style is dropped in silence too.** `style-src` has no `'unsafe-inline'`, and `build.inlineStylesheets` is `'never'` so Astro ships every stylesheet as a file. Any `style="…"` attribute or `<style>` element in the output is ignored by the browser — the build stays green and the page renders wrong. `Hero` passes its crop through data attributes for this reason. Syntax highlighting is Prism for the same reason: it classes tokens where Shiki styles them inline. The theme in `src/styles/prism.css` is One Light/Dark from prism-themes, with the colours that failed AA against `--code-bg` darkened or lightened; the header lists each one.

**SWA config fails in both directions.** Some mistakes are silent: `navigationFallback` serves every unknown URL with a 200, and `trailingSlash: "always"` 301s every *file*, not just pages. Others fail the deploy: a route rule can't combine `rewrite` with `statusCode`. Check a change against the [configuration reference](https://learn.microsoft.com/azure/static-web-apps/configuration), then against the live site with `Invoke-WebRequest -MaximumRedirection 0`.

**The XML routes carry their own CSP.** Chromium draws its XML tree view with an inline stylesheet and `data:` icons, inside a document that inherits the page's policy. Under the site-wide `style-src 'self'` the feed and the sitemap open in Edge or Chrome as a wall of run-together text, which looks like a broken feed and isn't one. `/rss.xml` and `/sitemap*.xml` override the header with a policy that allows exactly those two things. A new XML route needs the same override. Separately, a `Content-Type` in a route's `headers` is ignored: the feed is served as `text/xml` whatever the rule says.

**Images have to be loadable from another origin.** Edge's Immersive Reader rebuilds the article under a `read://` address and fetches the images from there. Under the site-wide `Cross-Origin-Resource-Policy: same-origin` every one is refused, and the reader shows a broken image above its alt text. The page itself looks fine, so nothing points at the header. `/_astro/*` and `/favicon.svg` override it with `cross-origin`, which is the web's default; the pages keep `same-origin`. An image served from anywhere else, such as a file dropped in `public/`, needs the same override. The header takes three fixed values and no list of origins, so the reader can't be let through on its own.

**`staticwebapp.config.json` must live in `public/`.** Only `dist/` is uploaded, and Astro copies `public/` into it. At the repo root the file is ignored outright: no headers, no 404 handling, no error.

**HTML comments render.** Astro passes `<!-- -->` straight through into the served page. Notes and TODOs go in the `---` frontmatter fence as `//` comments, never in the template. In MDX the frontmatter is YAML, so it's `#` there, and `{/* … */}` in the body renders nothing. This is a portfolio site; the page source is part of it.

**`SITE_URL` in `src/consts.ts` is the only place the domain is written.** It feeds `site` in `astro.config.ts`, and from there canonical URLs, Open Graph tags, the sitemap and the RSS feed. `robots.txt.ts` derives from it too. Wrong value, clean build, every link points somewhere useless.

**`skip_app_build` redefines `app_location`.** In the deploy workflow it means "where the built output is", not "where the source is". Azure's Oryx build engine is bypassed deliberately — that's what pins the Node version and makes failures readable.

**Astro 7 deprecations.** Import `z` from `astro/zod`, not `astro:content`. Use `z.url()`, not `z.string().url()`.

**MDX has no autolinks.** `<https://example.com>` is valid Markdown and a syntax error in MDX — `<` starts a JSX tag, so the build fails outright with `Unexpected character after \`<\``. Always `[text](url)`. This one at least fails loudly.

**A photograph dropped straight into `src/assets/` publishes its EXIF.** Phone images carry GPS coordinates, camera make and model, and a capture timestamp. The copies Astro re-encodes come out without metadata, but an image imported into a post is also shipped to `_astro/` byte for byte as committed, and the repo is public either way, so the coordinates of wherever the picture was taken reach the world. Nothing warns you. Every photograph goes through the converter first:

```powershell
./scripts/Convert-Heic.ps1 -Path ~/Downloads/Whatever.heic -Name posts-hero `
  -Location "Coal Harbour, Vancouver" -SafeRatio 4.5
```

It strips metadata, caps the longest edge at 2400px, honours EXIF orientation, and burns in the location and copyright line. It then re-reads its own output and deletes it, failing, if anything beyond the encoder's five boilerplate tags survived — GPS, XMP, or bytes after the end of the image. Decoding needs `Microsoft.HEIFImageExtension` from the Store; without it `BitmapDecoder` fails on HEIC. Despite the name it takes a PNG or a JPEG as well. A sheet that needs every pixel gets a higher `-MaxEdge`.

**The components have their own file.** `Callout`, `Hero` and where its watermark lands, `Figure`, `Table`, `Pipeline`, the AI image label and the contents list are in [`.claude/rules/components.md`](.claude/rules/components.md), each with the way it goes wrong quietly. Claude Code loads it when a file under `src/content`, `src/components`, `src/layouts`, `src/pages` or `src/assets` is opened. Read it before writing a post or touching a component. 
## Code comments

A comment says why, or explains logic that isn't obvious from the code. It doesn't narrate what the next line does, restate a name, or record the history of a change — that's what the commit message is for. The good examples here name the trap a line exists to avoid: `preserveSymlinks` in `astro.config.ts` says what breaks without it. If a comment would read the same with the code deleted, cut it.

## Writing

Voice, the frontmatter fields, and the two reviews a post gets before it goes live are in [`.claude/rules/writing.md`](.claude/rules/writing.md). Claude Code loads it when a file under `src/content` or `src/pages` is opened. Read it before drafting, editing or reviewing prose, including in a conversation that hasn't opened a post yet. The recurring characters (Tim, Opus, Ms Claudie Mittens, Brian) are in [`.claude/rules/cast.md`](.claude/rules/cast.md): who each one is, and who writes their lines.

## Narration

A post can carry a recording of itself, read aloud by an AI voice called Brian and played by a native `<audio controls>` with no script. The audio is made on Tim's machine and served from Azure Blob Storage; a post has a player when `narration/manifest.json` lists it. Read [`narration/README.md`](narration/README.md) before touching a recording, the pipeline in `scripts/narration/`, the sound effects, or Brian's lines.

Two parts of it reach work that has nothing to do with audio:

- **Editing a narrated post fails `npm run check`**, and with it the deploy, until the post is recorded again or taken out of the manifest. The page would otherwise offer a reading of words it no longer says.
- **The storage host is written twice**, as `AUDIO_URL` in `src/consts.ts` and as `media-src` in `public/staticwebapp.config.json`. Change one alone and every player goes silent on a green build.

## Branches and remotes

Two remotes, one working copy:

| Remote | Repo | Holds |
| --- | --- | --- |
| `origin` | `portfolio` (public) | `main` |
| `private` | `portfolio-drafts` (private) | `drafts/*`, plus `main` as a base |

`main` lives on both, with its upstream set to `origin` — a bare `git push` on `main` is always the public one. The private copy exists so draft branches have a base; refresh it with `git push private main`.

Unfinished writing lives on a `drafts/<topic>` branch pushed only to `private`, so it isn't readable on the public repo while it's still half-formed. Rules:

- **Always push with a bare `git push`.** Branches have explicit upstreams, so it goes to the right remote: `main` to `origin`, every `drafts/*` branch to `private`. A draft pushed to `private` lands in a private repo and publishes nothing. `git push origin` names a remote and would send the current branch there — that's the leak.
- **Never `git push --all` or `--mirror`.** `.githooks/pre-push` refuses `drafts/*` → `origin`. It's tracked in the repo and wired up with `git config core.hooksPath .githooks`, so a fresh clone needs that one command to arm it. `--no-verify` skips it. Seatbelt, not a lock.
- **Publish a post as one commit on `main`, carrying only its own files.** A draft branch holds several unfinished posts at once, some never meant for the public repo, so it is never merged or squashed into `main` whole. On `main`, `git checkout drafts/<topic> -- <paths>` brings across the post, its images, its narration file and any shared file it changed, and one commit publishes them. Check `git diff --cached --stat` names nothing else before committing. A normal merge would carry every intermediate draft commit, and every other draft, into the public repo permanently. This is the point of the whole arrangement — getting it wrong here undoes it.
- **The private repo holds no secrets and has Actions disabled.** It shares history with `main`, so a workflow there could otherwise deploy draft content to the live site.

Preview drafts with `npm run dev`. Draft branches never reach the public repo, so they get no PR preview environment, and that's intended.

## Shell

PowerShell, not bash. Prefer the file tools over either.

## Don't

- Deploy, or create Azure resources, **without asking first**. Running `az` is fine once Tim has said go — show the commands, get the nod, then run them. It's a personal subscription, not a work one; the rule is about consent, not about keeping hands off the CLI.
- Commit or push unless asked.
- Check framework APIs from memory — Astro moves fast. Read the live docs.

## Astro dev server

Use background mode, and manage it with `astro dev stop`, `astro dev status`, `astro dev logs`:

```
astro dev --background
```

## Looking at a page

Use the Playwright MCP server in `.mcp.json`, which drives the installed Edge. That goes for the dev server, a preview of `dist/`, and the live site. It can click, resize, wait for an image to load and read the console, which is what a visual check needs: open the `<details>`, toggle the theme, look at a phone width.

The server loads at session start, after Tim approves it. If its tools aren't there, ask for a restart before a round of visual work.

## Docs

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
