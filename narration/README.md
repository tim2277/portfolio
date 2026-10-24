# Narration

A post, a project or a page can carry a recording of itself, read aloud by an AI voice. None of it runs in the site's build or in the browser: the audio is made on Tim's machine, lives in Azure Blob Storage, and reaches the page as a native `<audio controls>` with no script. An entry gets a player when `narration/manifest.json` has a key for it; `Narration.astro` draws it, placed by `EntryLayout` for posts and projects and by the page itself for About.

Every command takes the entry as `posts/<slug>`, `projects/<slug>` or `pages/<slug>`, and a bare slug means a post. The same id is the manifest key, the sidecar's path under `narration/` and the blob's under the container. A page has to be MDX under `src/content/pages/` with a `title` and an `updated` in its frontmatter, since the intro says one and the outro the other; nothing on the page shows them. Brian calls each kind by the word in the lexicon's `kinds`, and the player's label uses the same word.

| Path | Holds |
| --- | --- |
| `scripts/narration/narrate.mjs` | The pipeline. Its header comment lists the commands |
| `scripts/narration/entries.mjs` | Turns an entry id into its source, sidecar and working folder |
| `narration/<collection>/<slug>.ssml` | The tuned reading: a header (voice, language tag, base pitch, recording date, optionally a transition), then one segment per paragraph, heading, list item and table row |
| `narration/lexicon.json` | Pronunciations, the intro and outro wording, the default transition |
| `narration/effects.json` | Each sound effect's source, licence and hash |
| `narration/manifest.json` | What's published. Written by `publish`, read by the site |
| `.narration/` | Ignored. The per-segment cache, the built takes, and a `timeline.txt` beside each take, under `<collection>/<slug>/`. Ignored files go with a worktree when it's removed, so record in the main checkout, or copy `.narration/` across first |

```powershell
node scripts/narration/narrate.mjs init pages/about      # the mechanical first pass, then tune it by hand
node scripts/narration/narrate.mjs check pages/about     # same words as the page, allowed tags only
node scripts/narration/narrate.mjs audition pages/about --segments=17-18 --tag=before
node scripts/narration/narrate.mjs build pages/about     # synthesise, stitch, encode
node scripts/narration/narrate.mjs publish pages/about   # upload, and record it in the manifest
```

`build` and `audition` want `AZURE_SPEECH_KEY` from the Speech resource in Tim's subscription, read with `az` into the session and never written down, and `ffmpeg` on the `PATH`. `publish` wants `az` signed in. Only changed segments are synthesised again; the rest come from the cache.

**Claude can't hear any of it.** Tim judges every take by ear. Give him short auditions to compare, a before and an after, and use `timeline.txt` to turn "13:43 sounded wrong" into a segment. A claim that something sounds right is a guess.

**The words are the post's.** `check` strips the tags from each tuned segment and compares what's left with the post, word for word. Punctuation is the tuner's to change; words aren't. Code blocks, footnotes, emoji and the `<Summary>` are skipped, and the intro says so. The intro and outro come from the lexicon's templates. A blockquote is read, a `quote` segment per paragraph. A `Figure`'s caption is read too, announced with the lexicon's `caption` wording so it doesn't arrive as a paragraph about nothing. A `Pipeline` is announced by its label, each step read as its title, who does it and its body, a `loop` said aloud, and its caption last, with the wording under the lexicon's `pipeline`. An `AudioClip` is played, not described: Brian announces it with the lexicon's `clip` wording and its label, `build` splices the clip in after him, and the caption follows as its own segment, in the page's order. The file comes from the public container the page plays it from, cached under `.narration/clips/`, and the segment carries it as `clip=<src>` on its header line, which `check` holds to the page. The one segment that's exempt is a closing `egg`, which is Brian's own remark.

**Tune with pauses.** On the current voice, an inline pitch move beyond ±0.75% or a rate change beyond ±4% makes the reader sound like a second person, so the validator in `ssml.mjs` refuses them. Don't put pauses inside a short code phrase to make it sound like code. Those limits belong to the voice: a new voice means new auditions, and the tuning doesn't carry over.

**A word the voice gets wrong goes in the lexicon.** "repo" came out as "reap" and "git" as three letters. Add the word under `prose`, as a respelling or as `{ "ipa": … }` when no respelling works, then run `respell <slug>` to apply it to a file that's already tuned. A word with two readings, like "records", is pinned where it stands.

**Short words go missing, and the voice won't say so.** These come up in nearly every recording:

- A one-syllable word on its own gets swallowed or garbled: "awe", "sus". Give it a beat before it and a fixed reading, either the lexicon's IPA or a `<sub alias>` respelling ("suss").
- "Or" after a pause is the worst of them. A lone "or," followed by a break stumbles, and so does a sentence that opens with "Or" after a long break, which gets dropped outright. Run it on with no comma after it, and if there's a pause before it, pin it: `<phoneme alphabet="ipa" ph="ɔːɹ">Or</phoneme>`.
- A suffix after inline code is read as a letter: `` `Step`s `` comes out "step S" and `` `Figure`'s `` "figure S". Take the suffix inside the tag and say it in the alias: `<sub alias="figure's">Figure's</sub>`.
- Struck-out text is read as a mutter: the struck word at `volume="-20%"`, with a pause before it and a longer one after it, then the correction. Without both pauses it sounds quiet rather than retracted.
- A phrase read in another language can't hold its English expansion, since a `<sub alias>` can't contain a `<lang>`. Hang the expansion on the next word instead: in `this-site-1-1`, `<lang xml:lang="it-IT">Magister Scientiae</lang> <sub alias=", a Master of Science, in">in</sub>`. Keep the space between the tags, or `check` reads the two as one word.

**An abbreviation is said in full once.** The first time one comes up, the listener hears the long form and then the short one, "Large Language Models, L L Ms,", and the short form alone from there on. It's the spoken version of the post's `<abbr>`, and it goes in a `<sub alias>` so the written word stays the post's. `init` does it for each `<abbr title>` it meets; the tuner fixes what that leaves rough, such as a plural whose "s" sits outside the tag, and catches any abbreviation the post never marked up.
**A borrowed word can be read in its own language.** `<lang xml:lang="de-DE">spiel</lang>` asks the voice for the German reading, and `fr-FR` does the same for "ISO". The voice is multilingual, so this is a pronunciation, not a second speaker, but it gets an audition like anything else. One written word can be said in two languages by splitting it across two tags: in `hello-world`, "ISO" is an `I` that carries the French name and an `SO` that carries a spoken "ISO" in English. It looks like a typo and isn't one. The letters still add up to the post's word, which is all `check` asks.

**Brian is a character.** The voice is `en-US-BrianMultilingualNeural` asked for an Irish accent: an American AI doing the accent on request and being professional about it, a touch put-upon, never bitter. Every recording is his first day, since he remembers none of the others. He introduces himself as an AI voice in the same breath as his name, reads the post without comment, and after the closing line gets one dry remark about it and a sign-off ("Right so. Mind yourselves."). Offer Tim two or three candidate remarks for a new post; don't record one unseen.

**The sound effects aren't in the repo.** The Pixabay licence allows an effect inside a recording and forbids passing it on as a bare file, so `narration/effects/` is ignored and `narration/effects.json` is the record. `node scripts/narration/effects.mjs` lists each effect with its source and says whether this machine has the right file, and which effect each published recording used. A post picks its own with a `transition <name>` line in its header, or `transition none`. A build that can't find the file, or finds a different one, stops and prints where to download it. Register a new one with `effects.mjs add`.

**Publishing a recording publishes the post.** The `audio` container is public, so `publish` refuses a draft. Files are named by their own hash and cached for a year; a new recording is a new URL.

**A narrated post can't change quietly.** `npm run check` runs `scripts/narration/verify.mjs`, which fails when a post in the manifest no longer matches its tuned file, or the tuned file has changed since it was published. That stops the deploy. Retune the changed segments, set `recorded` in the header to the new date, then `build` and `publish`. To take the player off instead, remove the post from the manifest.

**The storage host is written twice.** `AUDIO_URL` in `src/consts.ts` builds the player's address, and `media-src` in `public/staticwebapp.config.json` allows it. The config can't read the constant. Change one alone and every player goes silent on a green build. The policy only applies on Azure, so a player that works in `astro dev` proves nothing about it: check the live page.

**The parser is borrowed.** The first pass reads MDX with `satteri`, the parser Astro itself uses, so a paragraph ends where the site says it does. It's installed as a dependency of `@astrojs/mdx` and not listed in `package.json`.
