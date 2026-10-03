# AGENTS.md

Personal portfolio and blog. Astro 7, static output, Azure Static Web Apps. Architecture write-up lives on the site as the `this-site` project entry (`/projects/this-site/`, with `/colophon/` redirecting to it); setup and deploy steps are in `README.md`.

## Invariants

Breaking any of these is a bug, not a style choice. If a change requires breaking one, stop and say so rather than working around it.

- **No framework runtimes.** No React, Vue or Svelte, no `client:*` directives, no analytics, no tag managers. Vanilla JavaScript is welcome where it earns its place — the theme toggle in `src/layouts/BaseLayout.astro` is the worked example: about thirty lines, no dependencies, and it degrades to `prefers-color-scheme` when it doesn't run.
- **Enhancements only.** A content page must do its whole job with scripts blocked. Anything JavaScript adds is on top of a page that already works — no controls that sit there dead, no content that arrives late.
- **Self-hosted fonts only.** No Google Fonts, no CDN, nothing that makes the reader's browser talk to a third party — that's the part of the old no-web-fonts rule worth keeping. Fraunces ships from `_astro/` via `@fontsource-variable/fraunces`, weight axis only, headings alone. Body and code stay on locally installed stacks. Adding a second family is a dependency decision, not a styling one.
- **Every inline script is pinned in the CSP by hash.** `script-src` in `public/staticwebapp.config.json` lists a sha256 per script. Edit one without recomputing it and the browser silently refuses to run it — the feature dies, the build stays green, and nothing says why. See the traps below.
- **Static output only.** No adapter, no SSR, no server islands.
- **British English** in all prose, UI copy, and content. Hiberno-English is welcome where it's Tim's actual voice ("ye", "grand") — it isn't an error to be corrected. See Voice below.
- **No employer code and no client names.** Content is concepts, patterns and write-ups. Generalise anything drawn from paid work.
- **Ask before adding a dependency** that isn't an official Astro integration.

## Definition of done

Both of these clean, every time:

```powershell
npm run check
npm run build
```

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
$body = [regex]::Match($html, '(?s)<script>(.*?)</script>').Groups[1].Value
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
"sha256-$([Convert]::ToBase64String([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)))"
```

Paste the result into `script-src` in `public/staticwebapp.config.json`.

**An inline style is dropped in silence too.** `style-src` has no `'unsafe-inline'`, and `build.inlineStylesheets` is `'never'` so Astro ships every stylesheet as a file. Any `style="…"` attribute or `<style>` element in the output is ignored by the browser — the build stays green and the page renders wrong. `Hero` passes its crop through data attributes for this reason. Syntax highlighting is Prism for the same reason: it classes tokens where Shiki styles them inline. The theme in `src/styles/prism.css` is One Light/Dark from prism-themes, with the colours that failed AA against `--code-bg` darkened or lightened; the header lists each one.

**SWA config fails in both directions.** Some mistakes are silent: `navigationFallback` serves every unknown URL with a 200, and `trailingSlash: "always"` 301s every *file*, not just pages. Others fail the deploy: a route rule can't combine `rewrite` with `statusCode`. Check a change against the [configuration reference](https://learn.microsoft.com/azure/static-web-apps/configuration), then against the live site with `Invoke-WebRequest -MaximumRedirection 0`.

**`staticwebapp.config.json` must live in `public/`.** Only `dist/` is uploaded, and Astro copies `public/` into it. At the repo root the file is ignored outright: no headers, no 404 handling, no error.

**HTML comments render.** Astro passes `<!-- -->` straight through into the served page. Notes and TODOs go in the `---` frontmatter fence as `//` comments, never in the template. In MDX the frontmatter is YAML, so it's `#` there, and `{/* … */}` in the body renders nothing. This is a portfolio site; the page source is part of it.

**`SITE_URL` in `src/consts.ts` is the only place the domain is written.** It feeds `site` in `astro.config.ts`, and from there canonical URLs, Open Graph tags, the sitemap and the RSS feed. `robots.txt.ts` derives from it too. Wrong value, clean build, every link points somewhere useless.

**`skip_app_build` redefines `app_location`.** In the deploy workflow it means "where the built output is", not "where the source is". Azure's Oryx build engine is bypassed deliberately — that's what pins the Node version and makes failures readable.

**Astro 7 deprecations.** Import `z` from `astro/zod`, not `astro:content`. Use `z.url()`, not `z.string().url()`.

**MDX has no autolinks.** `<https://example.com>` is valid Markdown and a syntax error in MDX — `<` starts a JSX tag, so the build fails outright with `Unexpected character after \`<\``. Always `[text](url)`. This one at least fails loudly.

**remark-gfm emits its own `Footnotes` heading**, `<h2 id="footnote-label">`. It lands in the `headings` array from `render()`, so left alone it appears in the contents list *and* counts toward the three-heading threshold — a post with two real sections grows a sidebar listing "Footnotes". `tocHeadings()` in `src/lib/content.ts` strips it, and both `EntryLayout` and `TableOfContents` go through it so they can't disagree. GFM also tags that heading `sr-only`, a class this site doesn't define; `global.css` styles the block instead.

**`Callout` takes `type` from a fixed union.** `note`, `warning`, `tip` — and nothing else. Pass anything else and `labels[type]` is `undefined`, so the label renders empty against an unstyled class. For a custom label use `title="…"` and leave `type` alone. `astro check` does not catch this in MDX.

**A photograph dropped straight into `src/assets/` publishes its EXIF.** Phone images carry GPS coordinates, camera make and model, and a capture timestamp. Astro re-encodes on build but preserves what it's given, so the coordinates of wherever the picture was taken reach the live site. Nothing warns you. Every photograph goes through the converter first:

```powershell
./scripts/Convert-Heic.ps1 -Path ~/Downloads/Whatever.heic -Name posts-hero `
  -Location "Coal Harbour, Vancouver" -SafeRatio 4.5
```

It strips metadata, caps the longest edge at 2400px, honours EXIF orientation, and burns in the location and copyright line. It then re-reads its own output and deletes it, failing, if anything beyond the encoder's five boilerplate tags survived — GPS, XMP, or bytes after the end of the image. Decoding needs `Microsoft.HEIFImageExtension` from the Store; without it `BitmapDecoder` fails on HEIC.

**The watermark arguments have to match the `Hero` props.** The credit is burnt into the pixels, so it's placed at conversion time against a crop the script can only be told about:

| Script | `Hero` prop | Meaning |
| --- | --- | --- |
| `-SafeRatio` | `ratio` | Band shape, default 4.5:1 above 64rem |
| `-SafePosition` | Y of `imagePosition` | Which slice of the source is kept |

Get either wrong and the credit sits outside the visible band — present in the downloaded file, invisible on the page, which is backwards. Omit both for in-article images: those render uncropped, so the mark goes in the true corner. Changing a hero's `ratio` or `imagePosition` later means re-running the converter, not just editing the template. Both props take a fixed list of values, so a new one also needs an entry in the type in `Hero.astro` and a matching rule in its stylesheet — `astro check` rejects a value that isn't listed.

## Code comments

A comment says why, or explains logic that isn't obvious from the code. It doesn't narrate what the next line does, restate a name, or record the history of a change — that's what the commit message is for. The good examples here name the trap a line exists to avoid: `preserveSymlinks` in `astro.config.ts` says what breaks without it. If a comment would read the same with the code deleted, cut it.

## Voice

The posts are Tim writing, not a house style. An edit that leaves the prose correct and lifeless has failed — the jokes and asides are the reason anyone finishes the piece. Derived from the `hello-world` copy pass; extend it as more posts land.

**Keep, always.** The running gag, the aside in brackets, the one-word paragraph used as a drum hit. Hogwash. `27001, looking at you`. A joke that survives the edit is worth more than a sentence that reads smoothly. Never explain one — if it needs a gloss, cut it instead.

**Rhythm over uniformity.** A long, winding sentence and then a short one. Fragments are fine deliberately. A spaced hyphen (` - `) carries an aside; semicolons rarely do. Never an em dash in anything a reader sees: posts, page copy, titles, descriptions, footnotes. Readers take one as the mark of machine-written prose and stop reading. Read it aloud — if you run out of breath, split it.

**Cut, don't pad.** Throat-clearing ("Arguably you may ask…"), hedges, and stacked qualifiers all go. Say it once, in the active voice. History goes in the past tense and stays there; the drift into present tense is the most common thing to fix.

**Fix facts, don't soften them.** A wrong claim gets corrected and cited, not vagued up — "the world's first paid LLM product" became "one of the first a working developer paid for out of their own pocket" because the original was simply untrue. Anything dated, priced or attributed gets a footnote, and the source is *fetched* before citing. Don't write a plausible URL.

**Footnotes are GFM** — `[^slug]` inline, `[^slug]: …` at the foot. Named, not numbered, so inserting one doesn't renumber the rest. remark-gfm handles them; no plugin. Each definition reads as a citation: `["Title"](url), Publisher, date` — the title quoted as the link text, a publication in italics, the date the page carries or "accessed 30 September 2026" when it carries none. Then a spaced hyphen and the quote that supports the claim, or a sentence of context. `hello-world` is the worked example.

**Terms get expanded once**, on first use, via `<abbr title="…">`.

**A copy pass is not a rewrite.** Match the existing register rather than importing one. This is also why a copy pass is poor delegation material: an agent starting cold re-derives the rules from the text and reliably sands the personality off.

## Content

Two collections, `posts` and `projects`, schemas in `src/content.config.ts`. Invalid frontmatter fails the build by design.

**`description` and `lede` do different jobs.** `description` is the pitch that search results, link previews, the feed and JSON-LD show. It says why someone should read the piece, not what it's called, and it stays under 160 characters, roughly where Google truncates. The schema enforces the limit. `lede` is what the site itself shows on the entry card and as the subtitle, and it's where the joke goes. It's optional and falls back to `description`.

`draft: true` entries render in `astro dev`, are excluded from a production build, and are `noindex`'d if built anyway. To exercise the templates against a real build:

```powershell
$env:BUILD_DRAFTS = "true"; npm run build; Remove-Item Env:\BUILD_DRAFTS
```

Draft status controls what reaches the **site**. It does nothing about what's readable in the **repo** — see below.

## Before a post goes live

Between setting `draft: false` and the squash merge, two reviews run. Both are read-only, and both go to a fresh agent on purpose: by then the author and the session that helped draft can't read the piece cold. A copy pass is the opposite case and stays inline, as Voice says.

**Cold read.** One pass top to bottom as a reader before analysing anything, then a report of where it stumbled: where the argument jumps or repeats, what's used before it's explained, whether each section earns its place.

**Voice check.** Read against the published posts and the About page. Flag passages that sound like a different writer in either direction: flatter and more technical, or trying too hard. Go through every running gag and callback and say whether it landed, landed late, or missed, and why.

One agent can do both. Its brief has to carry what it can't work out from the text:

- **Who the reader is.** Name the audience for this post. The baseline is a technically aware reader, not necessarily a developer: AI power users, and developers who may or may not use AI themselves. Some posts lean more general still, and the brief says so when one does. Whichever it is, the reader is owed three things: every term expanded once in an `<abbr>`, a footnote for anything they might want to check, and prose that's fun to read, because the content is dry if you aren't in the weeds. Leave the audience out and the feedback comes back generic, advice for any reader of any post.
- **What the post is for.** The one thing a reader should leave with, so the agent can judge whether the piece delivers it.
- **The Voice rules, and that personality isn't a fault.** Hiberno-English is deliberate. No smoothing to neutral. Flag the problem and give at most one suggested wording, never a rewrite.
- **No em dashes**, and not to suggest any.
- **What's fixed and what's open.** `description` isn't up for change. Title and `lede` can get suggestions, along with any constraint on them, such as a joke later in the post that depends on a word in the title.
- **Code blocks** are out of scope for correctness and in scope for placement and length.
- **Factual doubts get flagged**, not verified.
- **What to send back:** a verdict, first-read stumbles with line numbers, each joke in a line, voice drifts, title and lede, and which findings are confident and which are taste.

Tim decides what to act on. A taste finding about his voice is his call, so don't apply one unasked. Then the definition of done, then the squash.

## Branches and remotes

Two remotes, one working copy:

| Remote | Repo | Holds |
| --- | --- | --- |
| `origin` | `portfolio` (public) | `main` |
| `private` | `portfolio-drafts` (private) | `drafts/*`, plus `main` as a base |

`main` lives on both, with its upstream set to `origin` — a bare `git push` on `main` is always the public one. The private copy exists so draft branches have a base; refresh it with `git push private main`.

Unfinished writing lives on a `drafts/<topic>` branch pushed only to `private`, so it isn't readable on the public repo while it's still half-formed. Rules:

- **Always push with a bare `git push`.** Branches have explicit upstreams, so it goes to the right remote. `git push origin` names a remote and would send the current branch there — that's the leak.
- **Never `git push --all` or `--mirror`.** `.githooks/pre-push` refuses `drafts/*` → `origin`. It's tracked in the repo and wired up with `git config core.hooksPath .githooks`, so a fresh clone needs that one command to arm it. `--no-verify` skips it. Seatbelt, not a lock.
- **Squash when merging a draft branch into `main`.** A normal merge carries every intermediate draft commit into the public repo permanently. Squashing publishes the finished state and nothing else. This is the point of the whole arrangement — getting it wrong here undoes it.
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

## Docs

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
