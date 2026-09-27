# portfolio

Personal site and blog — software work plus AI Ops (AI agents inside real SDLC
workflows). Astro, static output, hosted on Azure Static Web Apps.

There's a fuller write-up of the architecture on the site itself, at
`/colophon/` ("How this site is built").

## Requirements

- Node 24 LTS (Astro 7 requires `>=22.12.0` and doesn't support odd majors)
- An Azure subscription, if you're deploying

## Local development

```powershell
npm install
npm run dev          # http://localhost:4321
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server. Drafts are visible here. |
| `npm run check` | `astro check` — type-checks `.astro`, `.ts` and frontmatter. |
| `npm run build` | Production build into `dist/`. Drafts excluded. |
| `npm run preview` | Serves `dist/` locally. |

To build with drafts included — useful for previewing before you publish:

```powershell
$env:BUILD_DRAFTS = "true"; npm run build; Remove-Item Env:\BUILD_DRAFTS
```

### Junction paths

`astro.config.ts` sets `vite.resolve.preserveSymlinks`. If this repo lives under
a junction (`C:\repos` → another volume, for example), Vite resolves modules to
the real path while Astro tracks the junction path, the module graph splits, and
**every stylesheet is silently dropped from the build** — no error, just an
unstyled site. The flag keeps both halves on the same path. Don't remove it
without checking `dist/_astro/*.css` still exists afterwards.

## Branches and remotes

One working copy, two remotes. `main` is public; unfinished writing lives on a
`drafts/<topic>` branch that only ever goes to the private remote.

| Remote | Repo | Holds |
| --- | --- | --- |
| `origin` | `portfolio` (public) | `main` |
| `private` | `portfolio-drafts` (private) | `drafts/*`, plus `main` as a base |

`main` exists on both. Its upstream is `origin`, so a bare `git push` on `main`
always goes public — the private copy is only there to give draft branches
something to branch from and diff against. Refresh it with `git push private
main` when it's drifted.

Starting a draft:

```powershell
git switch -c drafts/some-topic
git push -u private drafts/some-topic   # sets the upstream, once
git push                                # thereafter
```

Publishing it:

```powershell
git switch main
git merge --squash drafts/some-topic
git commit
git push
git branch -D drafts/some-topic
```

**Squash, don't merge.** A normal merge carries every intermediate draft commit
into the public repo, permanently. Squashing publishes the finished state and
nothing else — which is the entire point of the arrangement.

`.githooks/pre-push` refuses to push a `drafts/*` branch to `origin`. It's armed
with `git config core.hooksPath .githooks`, which a fresh clone needs to run
once.

`draft: true` in frontmatter keeps a post off the **site**. The draft branch
keeps it out of the **public repo**. They're different problems — a `draft: true`
post sitting on `main` is invisible on the site but perfectly readable on GitHub.

Draft branches never reach the public repo, so they get no PR preview
environment. Use `npm run dev`.

## Adding a post

Create `src/content/posts/my-post.mdx`. The filename becomes the URL slug.

```mdx
---
title: A short, specific title
description: One or two sentences. Used in the meta description, the feed and the index cards.
date: 2026-09-27
tags: ['ai-ops', 'astro']
draft: true
---

Body goes here. MDX, so you can import components:

import Callout from '../../components/Callout.astro';

<Callout type="tip">Astro components work inline.</Callout>
```

Projects go in `src/content/projects/` and take three extra fields: `status`
(`active` | `shipped` | `archived` | `exploration`), and optional `repo` and
`url`. Schemas live in `src/content.config.ts` — invalid frontmatter fails the
build rather than rendering something broken.

Set `draft: false` to publish. Drafts are also `noindex`'d if they do get built.

## Before the first deploy

Set the real domain in `src/consts.ts` (`SITE_URL`). It drives canonical URLs,
Open Graph tags, the sitemap and the RSS feed, and getting it wrong fails
silently. `src/pages/robots.txt.ts` derives the sitemap URL from it, so that's
the only place it's written down.

The `about` page and the home page intro are skeletons in the right voice, not
finished copy. They're marked with TODOs.

## Deploying

Nothing here has been deployed. These are the commands to run yourself.

### 1. Create the Azure resources

```powershell
az login
az account set --subscription "<your-subscription-id>"

az group create `
  --name rg-portfolio `
  --location westeurope

az deployment group create `
  --resource-group rg-portfolio `
  --template-file infra/main.bicep `
  --parameters infra/main.bicepparam
```

Static Web Apps has a restricted control-plane region list, so if `westeurope`
is rejected, check `az staticwebapp list-locations`. The region only decides
where the resource lives — content is served from the global edge either way.

Preview the change first with `--what-if` if you'd rather see it before it
happens.

### 2. Get the deployment token

```powershell
az staticwebapp secrets list `
  --name swa-portfolio `
  --resource-group rg-portfolio `
  --query "properties.apiKey" -o tsv
```

### 3. GitHub secrets

One secret, on the repository:

| Secret | Value |
| --- | --- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | The deployment token from step 2. |

`GITHUB_TOKEN` is provided automatically — the workflow uses it to post the
preview URL onto the pull request.

```powershell
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "<token>"
```

### 4. Push

`.github/workflows/azure-static-web-apps.yml` runs on pushes to `main` and on
pull requests. It builds on a pinned Node, runs `astro check`, and deploys with
`skip_app_build: true` — Azure's Oryx build engine is bypassed entirely and the
action only uploads `dist`.

Pull requests get their own preview environment; a second job tears it down when
the PR closes. The Free tier allows three at a time.

### Rotating the token

```powershell
az staticwebapp secrets reset-api-key --name swa-portfolio --resource-group rg-portfolio
```

Then update the GitHub secret.

## Layout

```
infra/                       Bicep — one Static Web App, Free tier
.github/workflows/           Build, deploy, tear down PR previews
public/
  staticwebapp.config.json   Headers, caching, 404. Must be in public/ so it
                             lands in dist/ — only dist/ is uploaded.
src/
  consts.ts                  Domain, title, nav
  content.config.ts          Collection schemas
  content/{posts,projects}/  MDX
  lib/content.ts             Draft filtering and sorting
  components/                BaseHead, Header, Footer, EntryList, Callout
  layouts/                   BaseLayout (chrome), EntryLayout (post/project)
  pages/                     Routes, plus rss.xml.ts and robots.txt.ts
  styles/global.css          The whole stylesheet
```

## Notes on what isn't here

- **Mermaid** isn't wired up. Both build-time options cost something; the
  decision is deferred until a post actually needs a diagram. See `/colophon/`
  and the comment in `astro.config.ts`.
- **No interactive islands.** There's room for a self-contained Blazor WASM
  exhibit later — that's what an island is for — but it isn't built.
- **No analytics, comments or web fonts.**
