---
paths:
  - "src/content/**/*.{md,mdx}"
  - "src/components/**"
  - "src/layouts/**"
  - "src/pages/**/*.astro"
  - "src/assets/**"
  - "scripts/Convert-Heic.ps1"
---

# Components, and how each one fails quietly

None of these produce an error, like the traps in `AGENTS.md`. The converter, and why every photograph goes through it first, is there under Traps.

**`Callout` takes `type` from a fixed union.** `note`, `warning`, `tip` — and nothing else. Pass anything else and `labels[type]` is `undefined`, so the label renders empty against an unstyled class. For a custom label use `title="…"` and leave `type` alone. `astro check` does not catch this in MDX.

**An image in a post is a `Figure`.** `<Figure src={…} alt="…">Caption.[^note]</Figure>`, from `src/components/Figure.astro`. Clicking it opens the full-size image in a popover, which is plain HTML: no script and no CSP hash. A browser without popovers gets a link to the full-size file. The hero of a post or a project entry is one too, placed by `EntryLayout` with `hero`. Three things go wrong quietly:

- The same image twice on one page needs an `id` on the second. The popover's id comes from the file name, so without one both open the first.
- A strip several times wider than it is tall needs `wide`. Without it the enlarged copy shrinks to the screen's width and is no bigger than it was in the article.
- The caption is rendered twice, once in the overlay with its footnote marker stripped. A marker there would repeat an id and scroll the page behind the backdrop.

**A Markdown table is a `Table`.** The entry routes map `src/components/Table.astro` onto every GFM table, so a post writes a plain one. With four or more columns, on a screen under 44rem, it's cut off at the edge and scrolls sideways, and a button opens it in a popover: plain HTML again, no script and no CSP hash. Its footnote markers are stripped from the overlay copy for the same reason as a `Figure` caption's.

**A pipeline diagram is a `Pipeline` of `Step`s.** `<Pipeline label="…" caption="…">` around `<Step title="…" by="…" human loop="…">`, with the description as the body. It's an ordered list styled as cards and arrows, so it follows the theme and reads as a list anywhere the stylesheet doesn't reach. More than three steps never wrap: they run off the article's edge in one row and open full size in a popover. Below 48rem it's a single column. It draws a sequence and nothing else. A step that repeats says so with `loop`; a diagram that forks or merges needs another tool, and that decision hasn't been made.

**An audio clip in a page is an `AudioClip`.** `<AudioClip src="clips/<collection>/<slug>/<name>.<hash>.opus" label="…">Caption.</AudioClip>`: a native `<audio controls>` with a label and a caption, no script. `src` is a path under `AUDIO_URL`, uploaded by hand with the same `az storage blob upload` flags `publish` uses, hash in the name. A clip from any other host plays in `astro dev` and is refused by `media-src` on the live site, in silence.

**The watermark arguments have to match the `Hero` props.** The credit is burnt into the pixels, so it's placed at conversion time against a crop the script can only be told about:

| Script | `Hero` prop | Meaning |
| --- | --- | --- |
| `-SafeRatio` | `ratio` | Band shape, default 4.5:1 above 64rem |
| `-SafePosition` | Y of `imagePosition` | Which slice of the source is kept |

Get either wrong and the credit sits outside the visible band — present in the downloaded file, invisible on the page, which is backwards. Omit both for in-article images: those render uncropped, so the mark goes in the true corner. A post hero renders uncropped as well, so a portrait photograph would run the height of the screen: cut it to a landscape frame at conversion with `-CropRatio` (1.5 for 3:2) and `-CropPosition`, the percentage down the frame where the kept slice sits. Changing a hero's `ratio` or `imagePosition` later means re-running the converter, not just editing the template. Both props take a fixed list of values, so a new one also needs an entry in the type in `Hero.astro` and a matching rule in its stylesheet — `astro check` rejects a value that isn't listed. The mark scales with the image's width, but from no more than twice its height, so a long strip gets a mark sized for its height.

**An AI image carries its label in three places, set by two arguments that have to agree.** Anything generative AI had a hand in is converted with `-Ai`, lives in `src/assets/generated/`, and is shown with the matching `ai` prop:

```powershell
./scripts/Convert-Heic.ps1 -Path ~/Downloads/sheet.png -Destination src/assets/generated `
  -Name majors-sheet -MaxEdge 4000 -Ai composite
```

| Value | Meaning | Burnt-in label | IPTC source type |
| --- | --- | --- | --- |
| `generated` | A model's output as it came | AI-generated | `trainedAlgorithmicMedia` |
| `composite` | Generated art arranged or finished by hand | AI composite | `compositeSynthetic` |

The converter burns the label into the pixels and writes the source type into the file; `<Figure ai="composite">` lays the EU's "AI" mark over the image, with the kind as its hover and screen-reader text. Nothing checks that the prop matches the file, or that an image in that folder was converted with `-Ai` at all. The folder also decides the licence: `LICENSE` scope 4, CC BY-NC. The source type is in the committed file only. Astro drops it from every copy it re-encodes, and Tim has decided that's fine. The mark is the icon the Commission publishes with its [Code of Practice](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content), with its `<style>` block rewritten as fill attributes.

**remark-gfm emits its own `Footnotes` heading**, `<h2 id="footnote-label">`. It lands in the `headings` array from `render()`, so left alone it appears in the contents list *and* counts toward the three-heading threshold — a post with two real sections grows a sidebar listing "Footnotes". `tocHeadings()` in `src/lib/content.ts` strips it, and both `EntryLayout` and `TableOfContents` go through it so they can't disagree. GFM also tags that heading `sr-only`, a class this site doesn't define; `global.css` styles the block instead.
