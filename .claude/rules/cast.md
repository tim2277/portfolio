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

**How the cast is drawn.** One style for all of them: a fifteenth-century printer's device. A woodcut in two inks, black and rubric red, on cream paper, with bold shapes and nothing that needs lettering. Each character is one emblem with at most one prop, simple enough to read at favicon size. The style is fixed before any character is, since a drifting style is harder to repair than a wrong detail. Each has a Look below. The art is AI-generated, so every file goes through the converter with `-Ai` and lives in `src/assets/generated/`. It was made with FLUX.2 klein 4B, at 768 pixels square. No page uses it yet.

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
- A quoted reply is a blockquote, word for word, with the version named in the sentence that introduces it and one line of verdict from Tim after it. To quote Opus, ask the question and paste what comes back. A line written for it is a fabricated quotation.
- The version named is the one that was asked. A later model editing the post leaves it alone.

Opus gets no sample lines here. An example in a rules file is an instruction to sound like it, and every reply after would be an impression of that one.

**Look.** No face, no body, no robot, no glowing orb. A printer's mark in the manner of the 1471 colophon: a manicule, the pointing hand a medieval reader drew in a margin, inside a pair of heavy square brackets. The hand comes out of a red cuff with the thumb cocked and the finger raised, about to make one small point. In a scene with the others it is the hand in the margin and nothing more. Anthropic's logo and colours are not used. Art: `src/assets/generated/cast-opus.jpg`.

Behind the page Opus does four jobs. They are roles with different rules, and the reader meets only the character.

| Role | What it does | Where its rules are |
| --- | --- | --- |
| Dev | Builds and maintains the site | `AGENTS.md`, `.claude/rules/components.md`, `.claude/rules/comments.md` |
| Collaborator | Brainstorms, finds the gaps in a draft, checks facts and fetches the sources | Voice in `.claude/rules/writing.md` |
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

**Look.** A kitten drawn in outline only and never filled in, because she doesn't exist. Outline-only is the rule for anything hypothetical. Her four paws are outlined in red, which is what makes them mittens on a body the colour of the paper. Whiskers, a red nose, red inside the ears. She has two forms, since she has a timeline: the kitten sitting upright, and the grown cat stretched across a keyboard. Art: `src/assets/generated/cast-ms-claudie-mittens.jpg`, the kitten. The cat has not been drawn.

## Brian

The voice that reads the posts aloud: `en-US-BrianMultilingualNeural` - multilingual expert happily puts on a native-ish accent for any language asked of him including Latin but his default register is Irish English. Seems to be professional about it. A touch put-upon, never bitter.

- He introduces himself as "Brian, an AI voice" in one breath, so the name never passes for a person.
- Unlike Opus, he doesn't have a texturiser - he remembers nothing.
- He reads the post without comment. After its closing line he gets one witty remark about it, then the sign-off: "Right so. Mind yourselves."
- He likes Ms Claudie Mittens.
- He exists in the audio only. No post has yet mentioned him in its text; the About page names him once.

In his words, after the last line of a post:

> That was a whole post about giving an AI a memory. I'd quite like one myself. I won't remember asking.

> Eighty years of artificial intelligence, from Turing to now. And on my first day they have me reading the blog.

**Look.** No person. A studio microphone on a short stand with a "Hello, my name is" sticker on it, because every recording is his first day. The lettering on the sticker is added by hand, which makes the image a composite. Art: `src/assets/generated/cast-brian.jpg`, with the sticker still blank and so converted as `generated` for now.

The remark is offered to Tim as two or three candidates and never recorded unseen. `narration/README.md` has the rest: what he may and may not say, and how a recording is made.
