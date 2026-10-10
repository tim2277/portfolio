# Narration

A post can carry a recording of itself, read aloud by an AI voice. None of it runs in the site's build or in the browser: the audio is made on Tim's machine, lives in Azure Blob Storage, and reaches the page as a native `<audio controls>` with no script. A post gets a player when `narration/manifest.json` has an entry for its slug; `Narration.astro`, placed by `EntryLayout`, draws it.

| Path | Holds |
| --- | --- |
| `scripts/narration/narrate.mjs` | The pipeline. Its header comment lists the commands |
| `narration/<slug>.ssml` | The tuned reading: a header (voice, language tag, base pitch, recording date, optionally a transition), then one segment per paragraph, heading, list item and table row |
| `narration/lexicon.json` | Pronunciations, the intro and outro wording, the default transition |
| `narration/effects.json` | Each sound effect's source, licence and hash |
| `narration/manifest.json` | What's published. Written by `publish`, read by the site |
| `.narration/` | Ignored. The per-segment cache, the built takes, and a `timeline.txt` beside each take |

```powershell
node scripts/narration/narrate.mjs init <slug>      # the mechanical first pass, then tune it by hand
node scripts/narration/narrate.mjs check <slug>     # same words as the post, allowed tags only
node scripts/narration/narrate.mjs audition <slug> --segments=17-18 --tag=before
node scripts/narration/narrate.mjs build <slug>     # synthesise, stitch, encode
node scripts/narration/narrate.mjs publish <slug>   # upload, and record it in the manifest
```

`build` and `audition` want `AZURE_SPEECH_KEY` from the Speech resource in Tim's subscription, read with `az` into the session and never written down, and `ffmpeg` on the `PATH`. `publish` wants `az` signed in. Only changed segments are synthesised again; the rest come from the cache.

**Claude can't hear any of it.** Tim judges every take by ear. Give him short auditions to compare, a before and an after, and use `timeline.txt` to turn "13:43 sounded wrong" into a segment. A claim that something sounds right is a guess.

**The words are the post's.** `check` strips the tags from each tuned segment and compares what's left with the post, word for word. Punctuation is the tuner's to change; words aren't. Code blocks, footnotes, emoji and the `<Summary>` are skipped, and the intro says so. The intro and outro come from the lexicon's templates. The one segment that's exempt is a closing `egg`, which is Brian's own remark.

**Tune with pauses.** On the current voice, an inline pitch move beyond ±0.75% or a rate change beyond ±4% makes the reader sound like a second person, so the validator in `ssml.mjs` refuses them. Don't put pauses inside a short code phrase to make it sound like code. Those limits belong to the voice: a new voice means new auditions, and the tuning doesn't carry over.

**A word the voice gets wrong goes in the lexicon.** "repo" came out as "reap" and "git" as three letters. Add the word under `prose`, as a respelling or as `{ "ipa": … }` when no respelling works, then run `respell <slug>` to apply it to a file that's already tuned. A word with two readings, like "records", is pinned where it stands.

**Brian is a character.** The voice is `en-US-BrianMultilingualNeural` asked for an Irish accent: an American AI doing the accent on request and being professional about it, a touch put-upon, never bitter. Every recording is his first day, since he remembers none of the others. He introduces himself as an AI voice in the same breath as his name, reads the post without comment, and after the closing line gets one dry remark about it and a sign-off ("Right so. Mind yourselves."). Offer Tim two or three candidate remarks for a new post; don't record one unseen.

**The sound effects aren't in the repo.** The Pixabay licence allows an effect inside a recording and forbids passing it on as a bare file, so `narration/effects/` is ignored and `narration/effects.json` is the record. `node scripts/narration/effects.mjs` lists each effect with its source and says whether this machine has the right file, and which effect each published recording used. A post picks its own with a `transition <name>` line in its header, or `transition none`. A build that can't find the file, or finds a different one, stops and prints where to download it. Register a new one with `effects.mjs add`.

**Publishing a recording publishes the post.** The `audio` container is public, so `publish` refuses a draft. Files are named by their own hash and cached for a year; a new recording is a new URL.

**A narrated post can't change quietly.** `npm run check` runs `scripts/narration/verify.mjs`, which fails when a post in the manifest no longer matches its tuned file, or the tuned file has changed since it was published. That stops the deploy. Retune the changed segments, set `recorded` in the header to the new date, then `build` and `publish`. To take the player off instead, remove the post from the manifest.

**The storage host is written twice.** `AUDIO_URL` in `src/consts.ts` builds the player's address, and `media-src` in `public/staticwebapp.config.json` allows it. The config can't read the constant. Change one alone and every player goes silent on a green build. The policy only applies on Azure, so a player that works in `astro dev` proves nothing about it: check the live page.

**The parser is borrowed.** The first pass reads MDX with `satteri`, the parser Astro itself uses, so a paragraph ends where the site says it does. It's installed as a dependency of `@astrojs/mdx` and not listed in `package.json`.
