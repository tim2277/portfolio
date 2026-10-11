---
paths:
  - "**/*.{ts,mts,mjs,js}"
  - "src/**/*.astro"
  - "src/**/*.css"
  - "scripts/**/*.ps1"
---

# A comment opens with what the code can't show

The first words of a comment are the trap, the failure or the constraint: what breaks if the line goes, or the fact a reader couldn't work out from the code in front of them. `AGENTS.md` has the principle under Code comments. This is the check to run on every comment before the edit is saved, including one-liners and ones reworded in passing.

**Run these three, in order:**

1. Delete the first sentence. If nothing is lost, it stays deleted. Openers that name the construct or say "on purpose" go this way every time.
2. Read what's left with the code hidden. If it would be just as true of different code, or of no code, it's narration: cut it or replace it with the reason.
3. Look for the session in it. "Bing went on quoting a card from launch week", "added after the table fix", "used to be one script" are the story of the change. That goes in the commit message, and the comment keeps only the standing reason.

**Worked examples, from `astro.config.ts`:**

| Written first | Kept |
| --- | --- |
| `// A draft has no page in a production build, and must not date the listing pages either.` | `// A draft left in would date the listing pages by an entry that isn't on them.` |
| `// Entry pages take lastmod from their own frontmatter, and the listing pages from their newest entry. About has no source, so it gets none rather than a fabricated one.` | `// About has no dated source, so it gets no lastmod rather than a fabricated one.` |

The first leads with the consequence. The second drops a sentence that restated the fifteen lines above it and keeps the one fact they don't show.

**A short note on non-obvious logic earns its place.** "ISO strings sort chronologically" beside a bare `.sort()` says why the plain sort is safe. So does a unit, an ordering that matters, or a value that has to match one written elsewhere.

**No comment is a fine outcome.** Code that reads plainly gets none. Match the density of the file being edited.
