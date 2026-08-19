# Subsystem — Page Shell

**Files:** `src/layouts/BaseLayout.astro` (357 lines), `src/layouts/ProseLayout.astro` (327 lines)

Two nested layouts. `BaseLayout` is the HTML document and the entire global
stylesheet; `ProseLayout` wraps it to add article chrome.

## BaseLayout

**Props** (`src/layouts/BaseLayout.astro:2-11`): `title` (default `'Pascal Rhee'`),
`description`, and `section` — a union of `'writing' | 'projects' | 'about' | 'home'`
defaulting to `'home'`, used only to mark the current nav item.

**Document head** (`:21-29`):
- `<title>`, `<meta name="description">` from props (`:24-25`)
- Favicon as an inline SVG data-URI — a maize italic "M" on a blue square, no file
  on disk (`:26`)
- Google Fonts: EB Garamond (roman + italic, 400/500/700), EB Garamond SC, IBM
  Plex Mono, with `display=swap` and preconnects (`:27-29`)

**Design tokens** (`:31-40`) — the palette every other file references:

| Token | Value | Role |
|---|---|---|
| `--blue` | `#00274c` | Michigan blue; body text and rules |
| `--maize` | `#ffcb05` | accent — highlights, hairlines, `§` marks |
| `--paper` | `#f5f1e8` | page background |
| `--paper-soft` | `#e8e2d2` | code/pre background |
| `--tan` | `#8b7c5a` | secondary text, borders |
| `--ink` | `#1a1a1a` | prose body text |
| `--font-serif` | `'EB Garamond', Georgia, serif` | body and display type |
| `--font-sc` | `'EB Garamond SC', …` | small-caps labels, nav, kickers |
| `--font-mono` | `'IBM Plex Mono', ui-monospace, monospace` | metadata, code, captions |

All 45 `font-family` declarations across the seven `.astro` files resolve through
those three tokens; the only literal stacks left in `src/` are the definitions
themselves. Custom properties inherit from `:root` into Astro's scoped styles —
scoping adds attribute selectors, not a shadow root — which is why a token
defined here reaches `ProseLayout`'s and `about.astro`'s scoped rules.

**Global styles** — the stylesheet is `is:global` (`:30`) and covers reset (`:42`),
body texture via two fixed radial gradients (`:53-56`), the `main` grid capped at
820 px (`:59-66`), the fixed blue top stripe with its maize `box-shadow` offset
(`:69-79`), header/masthead (`:82-140`), section nav (`:143-186`), kicker
(`:196-209`), `h1` including the maize gradient-underline treatment on `em`/`.italic`
(`:212-233`), lede (`:236-250`), links (`:253-268`), and footer (`:271-303`).

**Body structure** (`:327-355`): `main` → masthead (`:329-339`) → `nav` (`:341-347`)
→ `<slot />` (`:349`) → footer (`:351-354`). Pages supply their own
`<section class="content">` wrapper; nothing enforces this.

**Nav** is generated from a `sections` const (`:13-17`) and sets
`aria-current="page"` when `section` matches (`:343`), which drives both the maize
underline and a `§` prefix (`:172-186`).

**Motion:** direct children of `.content` fade and rise on load with staggered
`animation-delay` in five steps plus a catch-all for the sixth onward
(`:306-316`), with a `prefers-reduced-motion` escape hatch (`:322-324`).

## ProseLayout

`src/layouts/ProseLayout.astro:2` imports `BaseLayout` and delegates the document
to it (`:26`), passing `title` suffixed with `· Pascal Rhee` and falling back to
the title as the meta description when no `dek` is given.

**Props** (`:4-18`): `title` and `date` required; `dek`, `readingTime`, and
`section` (default `'writing'`) optional.

**Date formatting** happens at build time via
`new Date(date).toLocaleDateString('en-US', …)` (`:20-24`) — note this parses a
bare `YYYY-MM-DD` as UTC midnight and formats in the *build machine's* locale
environment, not the reader's.

**Structure** (`:27-59`): `header.post-head` (kicker, title, dek, byline) →
`div.post-body` wrapping `<slot />` → `footer.post-foot`.

**Scoped prose styles** use `:global()` to reach slotted content
(`:170-296`) — paragraph rhythm, a floated italic drop-cap on the first paragraph
(`:174-190`), `h2` with a maize `§` prefix (`:192-206`), small-caps `h3`
(`:208-215`), blockquote with a double blue/maize left rule (`:241-257`), inline
`code` and `pre` on `--paper-soft` (`:259-282`), and an `hr` replaced by a
`‡ ‡ ‡` glyph row (`:284-296`).

It repeats the rise-in animation with its own keyframe name `rise-post` and its
own reduced-motion guard (`:70-85`) rather than reusing `BaseLayout`'s
`.content > *` rule, because its wrapper is `.post`, not `.content`.

## Consumers

| Layout | Used by |
|---|---|
| `BaseLayout` | `src/pages/index.astro:2`, `src/pages/about.astro:2`, `src/pages/writing/index.astro:2`, `src/pages/projects/index.astro:2`, and transitively via `ProseLayout` |
| `ProseLayout` | `src/pages/writing/first-look.astro:2` |
