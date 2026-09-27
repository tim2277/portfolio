# Personal Site

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

## Content

Copy an existing entry in `src/content/posts/` or `src/content/projects/`. The
filename becomes the URL slug. Schemas live in `src/content.config.ts` —
invalid frontmatter fails the build rather than rendering something broken.

`draft: true` keeps a post off the **site**. A `drafts/*` branch keeps it out of
the **public repo**. They're different problems, and the full branch rules are
in `AGENTS.md`: two remotes, drafts only ever go to the private one, and merges
into `main` are squashed.

## Deploying

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

One secret, on the repository. `GITHUB_TOKEN` is provided automatically — the
workflow uses it to post the preview URL onto the pull request.

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

### 5. Custom domain

`timwrites.dev`, apex — no `www`. The Free tier allows two custom domains and
issues the certificate itself. DNS has no legal apex CNAME, so the apex needs an
ALIAS record; if the registrar can't do that, delegate the zone to Azure DNS
(~€6/year, unlimited subdomains) and use an alias record there.

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

## Licence

Split, deliberately — see `LICENSE`:

- **Code** is MIT. Components, layouts, styles, config, the pipeline. Help
  yourself.
- **Writing** isn't. Everything under `src/content/`, the prose in
  `src/pages/`, and the images are all rights reserved. Quote it with a link;
  ask before republishing it.

---

Views are my own.
