---
paths:
  - "src/content/**/*.{md,mdx}"
  - "src/pages/**/*.astro"
  - "src/components/**/*.astro"
  - "src/layouts/**/*.astro"
  - "src/consts.ts"
---

# Curly quotes in anything a reader sees

The site's prose uses typographic quotes: `’` for apostrophes, `‘ ’` and `“ ”` for quotation marks. VS Code types the straight ones (`'` and `"`), so whether a straight quote is a problem depends on where it sits.

**MDX body prose converts itself.** Astro runs smartypants over Markdown and MDX, so a straight quote in a paragraph, a list item, a footnote or the text inside `<Callout>` and `<Summary>` renders curly. Type them straight there and leave existing ones alone. Converting them by hand is churn.

**These places are not converted, and need the curly character written out:**

- MDX frontmatter: `title`, `description`, `lede`, `heroAlt`. These feed the page title, the cards, the feed and the link previews.
- Attribute strings in MDX: `<abbr title="Don’t repeat yourself">`, `<Callout title="…">`.
- Everything in a `.astro` file: page copy, `title` and `description` props, `alt` text, hero text.
- Strings in `src/consts.ts`.

**Never curl a quote in code.** Code spans, fenced blocks, import lines, YAML and JSX delimiters, and anything a reader would copy and run stay straight. A curly quote in a shell command is a bug.

**smartypants also turns `--` into an en dash and `---` into an em dash**, and the site allows no em dash in anything a reader sees. Asides take a spaced hyphen (` - `), which it leaves alone.

After touching copy, build and scan the output. This lists every straight quote left in rendered text, with code stripped out:

```powershell
Get-ChildItem dist -Recurse -Include *.html, rss.xml | ForEach-Object {
  $t = [regex]::Replace((Get-Content $_.FullName -Raw), '(?s)<(script|pre|code)\b.*?</\1>', '')
  $text = [regex]::Replace($t, '<[^>]+>', "`n")
  [regex]::Matches($text, "[^\n]{0,40}('|&#39;|&quot;)[^\n]{0,40}") | ForEach-Object { "$($_.Value.Trim())" }
} | Select-Object -Unique
```

It reads text between tags, so check attribute strings (`title="…"`, `alt="…"`) by eye.
