---
paths:
  - "src/content/**/*.{md,mdx}"
  - "src/pages/**/*.astro"
---

# Writing and editing content

## Voice

The posts are Tim writing, not a house style. An edit that leaves the prose correct and lifeless has failed — the jokes and asides are the reason anyone finishes the piece. Derived from the `hello-world` copy pass and extended from the texturiser and colophon posts; extend it as more land.

**Keep, always.** The running gag, the aside in brackets, the one-word paragraph used as a drum hit. Hogwash. `27001, looking at you`. A joke that survives the edit is worth more than a sentence that reads smoothly. Never explain one — if it needs a gloss, cut it instead.

**The reader's question is a hinge.** A section often opens by voicing the objection and then answering it: "Immediately your question will be: why let Claude Code remember things about your life?" Keep the question. Cut only a hedge sitting in front of it.

**"You" by default, "ye" once or twice a piece**, where Tim turns to tease the room: "so ye with the wide screens". Leave the count alone in both directions.

**The jokes have a cast.** The AI is a character with a temperament, and gets contradicted in brackets: "a guideline (Claude says it was a rule)", "Opus denies having downtime." The joke lands on Tim first: "The joke's on Opus, I don't really know Latin." Gags cross pieces (`27001, looking at you`, Ms Claudie Mittens), so one that looks stray in this post may be a callback to another.

**A domestic comparison carries the technical point, and comes back later.** The kitchen drawer and the cake in `texturiser`. The return is the payoff, so the first mention stays even where it reads as a detour.

**End on a callback, not a recap**: to the lede, the hero image or the running gag. "A texturiser gives you a friend, not a hoover."

**Rhythm over uniformity.** A long, winding sentence and then a short one. Fragments are fine deliberately. A spaced hyphen (` - `) carries an aside; semicolons rarely do. Never an em dash in anything a reader sees: posts, page copy, titles, descriptions, footnotes. Readers take one as the mark of machine-written prose and stop reading. Read it aloud — if you run out of breath, split it.

**Cut, don't pad.** Throat-clearing (the "Arguably" in front of "you may ask…"), hedges, and stacked qualifiers all go. Say it once, in the active voice. Three things look like padding and stay: deliberate repetition ("Gone is… Gone is… gone is"), the hedge that is the joke ("Kinda.", "(to various degrees of success)"), and the reader's question above. History goes in the past tense and stays there; the drift into present tense is the most common thing to fix. A second-person scenario is in the present on purpose: "You end it and start a fresh one days later."

**Fix facts, don't soften them.** A wrong claim gets corrected and cited, not vagued up — "the world's first paid LLM product" became "one of the first a working developer paid for out of their own pocket" because the original was simply untrue. Anything dated, priced or attributed gets a footnote, and the source is *fetched* before citing. Don't write a plausible URL.

**Footnotes are GFM** — `[^slug]` inline, `[^slug]: …` at the foot. Named, not numbered, so inserting one doesn't renumber the rest. remark-gfm handles them; no plugin. Each definition reads as a citation: `["Title"](url), Publisher, date` — the title quoted as the link text, a publication in italics, the date the page carries or "accessed 30 September 2026" when it carries none. Then a spaced hyphen and the quote that supports the claim, or a sentence of context. `hello-world` is the worked example.

**Terms get expanded once**, on first use, via `<abbr title="…">`, and not again in that post. The audio version expands them for the listener. A post whose readers would know a term can leave it bare: the audience named for the post decides.

**A copy pass is not a rewrite.** Match the existing register rather than importing one. Register differs between pieces on purpose: a project page is dry and assumes its jargon, About is chatty and personal, emoji and all, and the numbered steps of a how-to go flat while the story around them doesn't. Match the piece being edited, not the last one read. This is also why a copy pass is poor delegation material: an agent starting cold re-derives the rules from the text and reliably sands the personality off.

## Content

Two collections, `posts` and `projects`, schemas in `src/content.config.ts`. Invalid frontmatter fails the build by design.

**`description` and `lede` do different jobs.** `description` is the pitch that search results, link previews, the feed and JSON-LD show. It says why someone should read the piece, not what it's called, and it stays under 160 characters, roughly where Google truncates. The schema enforces the limit. `lede` is what the site itself shows on the entry card and as the subtitle, and it's where the joke goes. It's optional and falls back to `description`.

**`date` is when it was published; `updated` is optional and set by hand.** Setting it adds "updated" to the entry's byline and feeds `dateModified` in JSON-LD, `article:modified_time`, the sitemap's `lastmod` and the feed's `lastBuildDate`. Bump it when the substance changes, not for a typo: it tells readers and crawlers the piece is worth another look.

**Every entry opens with a `<Summary>`.** It's a native `<details>`, closed by default, sitting first in the MDX body: what the piece was about, for the reader coming back to it or deciding whether to start. Two to four sentences in Tim's voice, not a table of contents. It comes before the post's first `<abbr>`, so keep abbreviations out of it. Adding or rewording one is not a reason to bump `updated`.

`draft: true` entries render in `astro dev`, are excluded from a production build, and are `noindex`'d if built anyway. To exercise the templates against a real build:

```powershell
$env:BUILD_DRAFTS = "true"; npm run build; Remove-Item Env:\BUILD_DRAFTS
```

Draft status controls which **pages** reach the site. An image a draft imports is still built and shipped to `_astro/` under a hashed name, linked from nowhere. And it does nothing about what's readable in the **repo** — see Branches and remotes in `AGENTS.md`.

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

**Tags.** Before `draft: false`, list the tags on every published entry and set the new post's against them. A post on the same subject carries the same tags: one about Opus carries `opus` because the colophon post does. A tag no published entry uses is a decision, so name it to Tim rather than coining it. Tags render as plain labels, not links, so nothing on the site shows a mismatch. After the deploy, read them off each live entry page.

Tim decides what to act on. A taste finding about his voice is his call, so don't apply one unasked. Then the definition of done, then the squash.
