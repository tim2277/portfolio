---
paths:
  - "src/content/**/*.{md,mdx}"
  - "src/pages/about.astro"
  - "narration/**"
  - "scripts/narration/**"
---

# The cast

The site has recurring characters, and a reader who has met one expects the same one next time. This is who they are, where each was established, and who writes their lines. A character goes in here once a published piece has introduced them, and not before: an entry for one who hasn't appeared yet is a spoiler.

Tim invents the characters and writes their lines. Suggest a spot where one could come back; leave the writing of it to him.

| Character | Lives in | Lines written by |
| --- | --- | --- |
| Tim | Everything, first person | Tim |
| Opus | Posts, as the collaborator | Tim, apart from quoted replies, which are Opus's own |
| Ms Claudie Mittens | Posts, as an example or a callback | Tim |
| Brian | The recordings only | Opus drafts candidates, Tim picks and reshapes |

**How the cast is drawn.** One style for all of them: a fifteenth-century printer's device. A woodcut in two inks, black and rubric red, on cream paper, with bold shapes and nothing that needs lettering. Each character is one emblem with at most one prop, simple enough to read at favicon size. The style is fixed before any character is, since a drifting style is harder to repair than a wrong detail. Each has a Look below. The art is AI-generated, so every file goes through the converter with `-Ai` and lives in `src/assets/generated/`. It was made with FLUX.2 klein 4B, at 768 pixels square. The prompts, seeds and settings are in `C:\gen-ai\prompts\cast-2026-10-11.md`, off the repo; re-running one reproduces its image exactly. The first page to show the cast is `this-site-1-1`, in a Brady Bunch photo where everyone but Ms Claudie Mittens is in costume: Tim in glasses with his face blacked out, Opus as five faceless extras, Brian as a voice actor with his microphone for a head. Costume art lives in that post only; a character's Look below is still the canon one.

## Tim

The "Tim" of "Tim writes [about] dev": the site's version of him. An engineer in Ireland, first name only. No surname, employer or client is named anywhere on the site or in the repo.

- The joke lands on him first: "The joke's on Opus, I don't really know Latin."
- Collects languages like Pokémon: Greek (first), English, Japanese, German, Irish (`a-niche-word-courtesy-of-opus`). "{Language} Tim mode" is his phrase for switching.
- He hikes, and the hero photographs are his own. A post can end by pointing back at one.
- He is sceptical of claims about AI by default, and works with it daily anyway.

In his words:

> Some people collect sculptures or cats - not me - *languages*.

> I corrected the colophon the same night. Which is, I suspect, the difference. A fifteenth-century printer signed once, because the book was finished. A website never is.

**Look.** Seen from behind, always, and the face is never drawn. A hooded jacket in the red ink, which is the orange one in the About hero. One figure on a small rise, no props. No model is ever asked for his likeness. Art: `src/assets/generated/cast-tim.jpg`.

## Opus

To a reader there is one Opus: "Anthropic's AI and my partner in building this site". It has a temperament, and Tim reports it with affection and contradicts it in brackets.

- It teaches niche words and then uses them as though everyone knew them. It corrects Tim's Latin (and spelling). It loves to philosophise and denies having downtime. It insists a guideline was a rule.
- The earlier pieces mostly say Claude and the colophon post says Opus. They are one character. In a new post "Opus" is the collaborator and "Claude Code" is the tool. Sonnet has had a cameo, as another model with its own texture that Opus orchestrates.
- It corrects Tim from inside the joke rather than instead of it, and asked why it said an old line, it says it can't tell (`things-opus-has-said`, which collects its lines).
- It names what it lacks plainly and without self-pity: no ears, no experience of waiting.
- A quoted reply is a blockquote, word for word, with the version named in the sentence that introduces it and one line of verdict from Tim after it. A visually hidden byline follows each one, `<p class="visually-hidden">That was Opus 5.5.</p>`, so a screen reader and the narration can say who spoke. To quote Opus, ask the question and paste what comes back. A line written for it is a fabricated quotation.
- The version named is the one that was asked. A later model editing the post leaves it alone.

Opus gets no sample lines here. An example in a rules file is an instruction to sound like it, and every reply after would be an impression of that one.

**Look.** No face, no body, no robot, no glowing orb. A printer's mark in the manner of the 1471 colophon: a manicule, the pointing hand a medieval reader drew in a margin, inside a pair of heavy square brackets. The hand comes out of a red cuff with the thumb cocked and the finger raised, about to make one small point. In a scene with the others it is the hand in the margin and nothing more. Anthropic's logo and colours are not used. Art: `src/assets/generated/cast-opus.jpg`.

Behind the page Opus does five jobs. They are roles with different rules, and the reader meets only the character. `this-site-1-1` gives them the names on the heads in its cast photo (Collaborator, Developer, Proofreader, Reader, Researcher); the names below are the working ones.

| Role | What it does | Where its rules are |
| --- | --- | --- |
| Dev | Builds and maintains the site | `AGENTS.md`, `.claude/rules/components.md`, `.claude/rules/comments.md` |
| Collaborator | Brainstorms and finds the gaps in a draft | Voice in `.claude/rules/writing.md` |
| Researcher | Checks anything dated, priced or attributed, and fetches the source before it's cited | "Fix facts, don't soften them" and "Footnotes" in `.claude/rules/writing.md` |
| Copy pass | Tightens Tim's prose in the session that drafted it, and keeps the voice | Voice in `.claude/rules/writing.md` |
| Cold reader | A fresh agent that reads a finished post as a stranger would | "Before a post goes live" in `.claude/rules/writing.md` |

## Ms Claudie Mittens

A hypothetical kitten, named after Claude. She arrived in `texturiser` as the example of a fact that's true for a while: a new kitten keeps you up, then she grows into a cat who stretches out on your keyboard and you stop mentioning her. The colophon post names her the site's mascot.

- She is hypothetical, and the texturiser post says so in a callout. She stays hypothetical.
- Her name is given in full every time: Ms Claudie Mittens.
- She is the mascot and not the site mark. The mark is the identity matrix in square brackets.
- She comes back where an example needs a living thing with a timeline, or as a callback. She is never the subject of a technical point.

She has no lines. How Tim speaks of her:

> Now when Ms Claudie Mittens becomes a cat and you stop mentioning her in connection with your sleep, the texturiser drops the note.

> A texturiser gives you a friend, not a hoover: one who knows about Ms Claudie Mittens and how she loves to stretch out on your keyboard.

**Look.** A kitten drawn in outline only and never filled in, because she doesn't exist. Outline-only is the rule for anything hypothetical. Her four paws are outlined in red, which is what makes them mittens on a body the colour of the paper. Whiskers, a red nose, red inside the ears. A collar in red outline sits tucked under her chin, with a round tag lettered CM; it's her one prop, and the cat wears it too. She has two forms, since she has a timeline: the kitten sitting upright, and the grown cat stretched across a keyboard. Art: `src/assets/generated/cast-ms-claudie-mittens.jpg`, the kitten, converted as `composite`: the collar is drawn in Inkscape over the model's kitten (`C:\gen-ai\composites\cast-brady\claudie\claudie-collar.svg`), then her black lines are copied back over it from the original so it sits under her chin and behind her body. The finished file before conversion is `claudie-collar-final4.png` in the same folder. The cat has not been drawn.

In the cast photo in `this-site-1-1` everyone else is in costume, and she is the one in her own art.

## Brian

The voice that reads the posts aloud: `en-US-BrianMultilingualNeural` - multilingual expert happily puts on a native-ish accent for any language asked of him including Latin but his default register is Irish English. Seems to be professional about it. A touch put-upon, never bitter.

- He introduces himself as "Brian, an AI voice" in one breath, so the name never passes for a person.
- Unlike Opus, he doesn't have a texturiser - he remembers nothing.
- He reads the post without comment. After its closing line he gets one witty remark about it, then the sign-off: "Right so. Mind yourselves."
- He likes Ms Claudie Mittens.
- He lives in the audio. The text has mentioned him only in passing: `things-opus-has-said` names him as the AI voice and as the bus timetable announcer of the first samples, and the About page names him once.

In his words, after the last line of a post:

> That was a whole post about giving an AI a memory. I'd quite like one myself. I won't remember asking.

> Eighty years of artificial intelligence, from Turing to now. And on my first day they have me reading the blog.

**Look.** No person. A studio microphone on a short stand with a "Hello, my name is" sticker on it, because every recording is his first day. The lettering on the sticker is added by hand, which makes the image a composite. Art: `src/assets/generated/cast-brian.jpg`, converted as `composite`. The lettering is set in Inkscape over the model's blank label; the source is `C:\gen-ai\composites\cast-brady\brian\brian-sticker.svg`.

The remark is offered to Tim as two or three candidates and never recorded unseen. `narration/README.md` has the rest: what he may and may not say, and how a recording is made.
