---
paths:
  - "src/content/**/*.{md,mdx}"
---

# Tags

A tag tells a reader what kind of piece this is before they start. Tags show on the entry card and under the title as plain labels, not links, and go into the RSS feed as categories. Nothing on the site shows a mismatch, so a wrongly tagged post looks fine and stays wrong.

## The vocabulary for posts

| Tag | Goes on |
| --- | --- |
| `musings` | Anything that isn't tech or code specific. A guideline, not yet a rule: a musings post has no code blocks |
| `meta` | Posts about the site itself, or about writing it |
| `opus` | Posts where Opus is the subject, not just the collaborator |
| `claude-code` | Posts where Claude Code, the tool, is the subject |

There is no `ai` tag. Nearly every post is about AI or near it, so the tag would say nothing. The same goes for `claude`: Opus or Claude Code is the more exact one.

A post can carry several: the colophon post is `meta`, `opus` and `musings`. One with no tag that fits carries none, rather than a near miss.

A tag that isn't in the table is a new decision, so name it to Tim rather than coining it. Once he agrees, add it here.

Projects use a different vocabulary, the stack (`astro`, `azure`, `bicep`), and this table doesn't apply to them.

## Before a post goes live

Set the post's tags against this table and against the published posts on the same subject. After the deploy, read them off the live entry page.
