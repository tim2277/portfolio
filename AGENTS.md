# AGENTS.md

Personal portfolio and blog. Astro 7, static output, Azure Static Web Apps.
Architecture write-up lives on the site at `/colophon/`; setup and deploy steps
are in `README.md`.

## Invariants

Breaking any of these is a bug, not a style choice. If a change requires
breaking one, stop and say so rather than working around it.

- **No framework runtimes.** No React, Vue or Svelte, no `client:*` directives,
  no analytics, no tag managers. Vanilla JavaScript is welcome where it earns
  its place — the theme toggle in `src/layouts/BaseLayout.astro` is the worked
  example: about thirty lines, no dependencies, and it degrades to
  `prefers-color-scheme` when it doesn't run.
- **Enhancements only.** A content page must do its whole job with scripts
  blocked. Anything JavaScript adds is on top of a page that already works —
  no controls that sit there dead, no content that arrives late.
- **Self-hosted fonts only.** No Google Fonts, no CDN, nothing that makes the
  reader's browser talk to a third party — that's the part of the old no-web-
  fonts rule worth keeping. Fraunces ships from `_astro/` via
  `@fontsource-variable/fraunces`, weight axis only, headings alone. Body and
  code stay on locally installed stacks. Adding a second family is a
  dependency decision, not a styling one.
- **Every inline script is pinned in the CSP by hash.** `script-src` in
  `public/staticwebapp.config.json` lists a sha256 per script. Edit one without
  recomputing it and the browser silently refuses to run it — the feature dies,
  the build stays green, and nothing says why. See the traps below.
- **Static output only.** No adapter, no SSR, no server islands.
- **British English** in all prose, UI copy, and content.
- **No employer code and no client names.** Content is concepts, patterns and
  write-ups. Generalise anything drawn from paid work.
- **Ask before adding a dependency** that isn't an official Astro integration.

## Definition of done

Both of these clean, every time:

```powershell
npm run check
npm run build
```

Then confirm the build actually produced a site:

- `dist/_astro/*.css` exists — see the junction trap below
- every `<script` in `dist/**/*.html` is inline, and each one's sha256 appears
  in `script-src` in `dist/staticwebapp.config.json`
- `dist/staticwebapp.config.json` exists

A build can "succeed" and still fail all three.

## Traps

Each of these fails silently. None produce an error.

**Junction paths eat the CSS.** `C:\repos` is a junction onto another volume.
Vite resolves modules to the real `D:\` path while Astro tracks the `C:\` one,
the module graph splits, and every stylesheet is dropped from the build. The
site builds fine and renders unstyled. `astro.config.ts` sets
`vite.resolve.preserveSymlinks` to hold both halves on one path — don't remove
it, and if CSS ever vanishes, look here first.

**A stale CSP hash kills a script in silence.** Inline scripts are `is:inline`,
so Astro emits them byte-for-byte and the sha256 in `script-src` has to match.
Nothing in `npm run check` or `npm run build` verifies this. After touching a
script, rebuild and recompute:

```powershell
$html = Get-Content dist\index.html -Raw
$body = [regex]::Match($html, '(?s)<script>(.*?)</script>').Groups[1].Value
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
"sha256-$([Convert]::ToBase64String([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)))"
```

Paste the result into `script-src` in `public/staticwebapp.config.json`.

**`staticwebapp.config.json` must live in `public/`.** Only `dist/` is uploaded,
and Astro copies `public/` into it. At the repo root the file is ignored
outright: no headers, no 404 handling, no error.

**HTML comments render.** Astro passes `<!-- -->` straight through into the
served page. Notes and TODOs go in the `---` frontmatter fence as `//` comments,
never in the template. This is a portfolio site; the page source is part of it.

**`SITE_URL` in `src/consts.ts` is the only place the domain is written.** It
feeds `site` in `astro.config.ts`, and from there canonical URLs, Open Graph
tags, the sitemap and the RSS feed. `robots.txt.ts` derives from it too. Wrong
value, clean build, every link points somewhere useless.

**`skip_app_build` redefines `app_location`.** In the deploy workflow it means
"where the built output is", not "where the source is". Azure's Oryx build
engine is bypassed deliberately — that's what pins the Node version and makes
failures readable.

**Astro 7 deprecations.** Import `z` from `astro/zod`, not `astro:content`. Use
`z.url()`, not `z.string().url()`.

## Content

Two collections, `posts` and `projects`, schemas in `src/content.config.ts`.
Invalid frontmatter fails the build by design.

`draft: true` entries render in `astro dev`, are excluded from a production
build, and are `noindex`'d if built anyway. To exercise the templates against a
real build:

```powershell
$env:BUILD_DRAFTS = "true"; npm run build; Remove-Item Env:\BUILD_DRAFTS
```

Draft status controls what reaches the **site**. It does nothing about what's
readable in the **repo** — see below.

## Branches and remotes

Two remotes, one working copy:

| Remote | Repo | Holds |
| --- | --- | --- |
| `origin` | `portfolio` (public) | `main` |
| `private` | `portfolio-drafts` (private) | `drafts/*`, plus `main` as a base |

`main` lives on both, with its upstream set to `origin` — a bare `git push` on
`main` is always the public one. The private copy exists so draft branches have
a base; refresh it with `git push private main`.

Unfinished writing lives on a `drafts/<topic>` branch pushed only to `private`,
so it isn't readable on the public repo while it's still half-formed. Rules:

- **Always push with a bare `git push`.** Branches have explicit upstreams, so
  it goes to the right remote. `git push origin` names a remote and would send
  the current branch there — that's the leak.
- **Never `git push --all` or `--mirror`.** `.githooks/pre-push` refuses
  `drafts/*` → `origin`. It's tracked in the repo and wired up with
  `git config core.hooksPath .githooks`, so a fresh clone needs that one command
  to arm it. `--no-verify` skips it. Seatbelt, not a lock.
- **Squash when merging a draft branch into `main`.** A normal merge carries
  every intermediate draft commit into the public repo permanently. Squashing
  publishes the finished state and nothing else. This is the point of the whole
  arrangement — getting it wrong here undoes it.
- **The private repo holds no secrets and has Actions disabled.** It shares
  history with `main`, so a workflow there could otherwise deploy draft content
  to the live site.

Preview drafts with `npm run dev`. Draft branches never reach the public repo,
so they get no PR preview environment, and that's intended.

## Shell

PowerShell, not bash. Prefer the file tools over either.

## Don't

- Deploy, or create Azure resources. Give the `az` commands to run instead.
- Commit or push unless asked.
- Check framework APIs from memory — Astro moves fast. Read the live docs.

## Astro dev server

Use background mode, and manage it with `astro dev stop`, `astro dev status`,
`astro dev logs`:

```
astro dev --background
```

## Docs

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling](https://docs.astro.build/en/guides/styling/)
