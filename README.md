# timwrites.dev

The source for [timwrites.dev](https://timwrites.dev). I build things, and occasionally I write down how it went. This is where the writing-down happens: software, and where AI agents earn their keep in a real delivery process instead of just making a mess faster.

Astro, static output, Azure Static Web Apps. No server, no framework runtime, and exactly one script. How it got to one is most of [How this site is built](https://timwrites.dev/projects/this-site/), which is the proper architecture write-up. This README only covers running it.

The code a post talks about doesn't live here. That's in [`wrote-it-down`](https://github.com/tim2277/wrote-it-down): one folder per post, in a state you can copy and run.

## Requirements

- Node 24 LTS (Astro 7 needs `>=22.12.0` and doesn't support odd majors)
- An Azure subscription, if you're deploying
- PowerShell 7, for the snippets below and the photo converter. The site itself doesn't care what shell you use

## Local development

```powershell
npm install
npm run dev          # http://localhost:4321
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server. Drafts are visible here. |
| `npm run check` | `astro check`: type-checks `.astro`, `.ts` and frontmatter. |
| `npm run build` | Production build into `dist/`. Drafts excluded. |
| `npm run preview` | Serves `dist/` locally. |

To build with drafts included, which is handy for a look before publishing:

```powershell
$env:BUILD_DRAFTS = "true"; npm run build; Remove-Item Env:\BUILD_DRAFTS
```

A green build isn't proof of a working site. Several things here fail without saying a word (a stale CSP hash, an inline style, a stylesheet that quietly never shipped), and `AGENTS.md` lists each one with the check that catches it.

## Content

Copy an existing entry in `src/content/posts/` or `src/content/projects/`. The filename becomes the URL slug. Schemas live in `src/content.config.ts`, and invalid frontmatter fails the build rather than rendering something broken.

`draft: true` keeps a post off the **site**. A `drafts/*` branch keeps it out of the **public repo**. They're different problems. The branch rules are in `AGENTS.md`: two remotes, drafts only ever go to the private one, and merges into `main` are squashed. A fresh clone needs one command to arm the hook that refuses a draft branch on its way to the public remote:

```powershell
git config core.hooksPath .githooks
```

Photographs go through `scripts/Convert-Heic.ps1` before they land in `src/assets/`. A phone picture carries its GPS coordinates, and nothing else in the pipeline will take them out for you.

## Deploying

### 1. Create the Azure resources

```powershell
az login
az account set --subscription "<your-subscription-id>"

az group create `
  --name rg-portfolio-prod `
  --location westeurope

az deployment group create `
  --resource-group rg-portfolio-prod `
  --template-file infra/main.bicep `
  --parameters infra/main.bicepparam `
  --parameters audioUploaderPrincipalId=$(az ad signed-in-user show --query id -o tsv)
```

Add `--what-if` to see the change before it happens.

The second `--parameters` grants your own account upload rights on the audio storage account, which has key access switched off. Leave it out on a later run and the existing grant stays as it is. The account name in `main.bicepparam` is the hostname in every audio URL and has to be globally unique: `az storage account check-name --name <name>` says whether yours is free. `infra/audio.bicep` also deploys on its own, taking the same values as parameters, when the storage is all that changed.

### 2. Get the deployment token

```powershell
az staticwebapp secrets list `
  --name swa-portfolio `
  --resource-group rg-portfolio-prod `
  --query "properties.apiKey" -o tsv
```

### 3. Give it to GitHub

One secret, `AZURE_STATIC_WEB_APPS_API_TOKEN`, and it lives in the `production` environment so that only `main` can reach it.

```powershell
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --env production --body "<token>"
```

### 4. Push

`.github/workflows/azure-static-web-apps.yml` runs on pushes to `main` and nothing else. It builds on a pinned Node, runs `astro check`, and deploys with `skip_app_build: true`, so Azure's Oryx build engine is bypassed and the action only uploads `dist`. Every action is pinned to a commit SHA.

Then look at the live site. The run going green tells you the upload worked, not that the headers did.

### 5. Custom domain

`timwrites.dev` is the apex, and `www` redirects to it. The Free tier allows two custom domains and issues the certificates itself. DNS has no legal CNAME at the apex, so the apex needs an ALIAS record. If your registrar can't do one, delegate the zone to Azure DNS and use an alias record there.

### Rotating the token

```powershell
az staticwebapp secrets reset-api-key --name swa-portfolio --resource-group rg-portfolio-prod
```

Then repeat step 3.

## Layout

```
infra/                       Bicep: one Static Web App, Free tier, and the
                             storage account that serves narration audio
.github/workflows/           Build and deploy on push to main
.githooks/pre-push           Refuses drafts/* on its way to the public remote
scripts/Convert-Heic.ps1     Strips metadata from a photo and burns in the credit
public/
  staticwebapp.config.json   Headers, CSP, caching, 404. Has to be in public/
                             so it lands in dist/, the only thing uploaded.
src/
  consts.ts                  Domain, title, nav
  content.config.ts          Collection schemas
  content/{posts,projects}/  MDX
  assets/photos/             Heroes and in-article images
  lib/content.ts             Draft filtering, sorting, contents-list rules
  components/                Head, header, footer, hero, entry cards, and the
                             bits MDX uses: Callout, Summary
  layouts/                   BaseLayout (chrome), EntryLayout (post/project)
  pages/                     Routes, plus rss.xml.ts and robots.txt.ts
  styles/                    global.css, and prism.css for code blocks
AGENTS.md                    Invariants, silent failures, voice. Read this
                             before changing anything.
.mcp.json                    Playwright on Edge, for agents that need to look
                             at a page instead of guessing
```

## Security

Found something? `SECURITY.md` says how to tell me.

## Licence

A three-way split, on purpose. See `LICENSE`:

- **Code** is MIT: components, layouts, styles, config, the pipeline. Help yourself.
- **Writing** is CC BY-NC 4.0: the posts and project write-ups in `src/content/`, and the page copy in `src/pages/`. Share and adapt it non-commercially, with credit and a link.
- **Photographs** under `src/assets/photos/` are all rights reserved. Quote a low-res copy with credit and a link, and ask before anything more.

---

Views are my own.
