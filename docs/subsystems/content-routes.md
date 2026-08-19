# Subsystem — Content Routes

Five pages under `src/pages/`, each a file-based route compiled to static HTML.
All content is hand-authored or hardcoded in frontmatter arrays — there is no CMS,
content collection, or Markdown pipeline.

| Route | File | Layout | Section |
|---|---|---|---|
| `/` | `src/pages/index.astro` | `BaseLayout` | `home` (default) |
| `/about/` | `src/pages/about.astro` | `BaseLayout` | `about` (`:7`) |
| `/writing/` | `src/pages/writing/index.astro` | `BaseLayout` | `writing` (`:41`) |
| `/writing/first-look/` | `src/pages/writing/first-look.astro` | `ProseLayout` | `writing` (default, `ProseLayout.astro:17`) |
| `/projects/` | `src/pages/projects/index.astro` | `BaseLayout` | `projects` (`:56`) |

## `/` — landing

`src/pages/index.astro:5-27`. A kicker (`:7`), a two-line `h1` using the
`.italic` maize-underline treatment (`:9-11`), a lede (`:13-17`), the view counter
(`:19`), and a four-row "syllabus" `dl` styled as a mono key/value table
(`:21-26`, styles at `:29-56`).

Notably it passes **no** `title` or `description` to `BaseLayout` (`:5`), so the
home page falls back to the defaults at `src/layouts/BaseLayout.astro:8-9`.

This is the only page that mounts `PageViewCounter` (`:3`, `:19`), and therefore
the only page that generates KV traffic.

## `/about/` — colophon

`src/pages/about.astro:9-176`. Three sections: intro prose (`:19-31`), the
architecture diagram (`:33-142`), and a stack rationale `dl` (`:144-175`).

The diagram is a **hand-authored inline SVG** on a `0 0 720 500` viewBox
(`:37-134`) — every node, edge, and label is an individually positioned `<text>`,
`<line>`, `<rect>`, or `<path>`. It is not generated. It has `role="img"` and is
`aria-labelledby` a `<title>` and a full prose `<desc>` (`:38-51`), satisfying the
accessibility requirement at `.claude/agents/end-session.md:121-122`.

The diagram splits into a BUILD TIME zone (`:59-86`) and a RUNTIME zone
(`:91-128`) separated by a divider (`:89`), with a dashed "same artifact" line
connecting `DIST/` to `env.ASSETS` across the boundary (`:131-132`).

**This SVG duplicates the architecture it describes.** It hardcodes the KV key
format (`:121`), the 30 h TTL and rolling-24 h window (`:122`), and the two API
routes (`:108`, `:112`) — all of which are really defined in
`src/worker/index.ts:4-5`, `:24-27`, `:70-71`. Changing the Worker without
changing this SVG silently makes the page lie.

## `/writing/` — post index

`src/pages/writing/index.astro`. Posts come from a literal array (`:5-29`) with a
comment marking content collections as the intended replacement (`:4`).

Two of the three entries carry `disabled: true` (`:19`, `:27`), which renders the
title as an unlinked `<span>` and the tag as "Draft" instead of "Published"
(`:58-70`). Only `first-look` links out, to `/writing/${slug}/` (`:61`) — which
resolves, since `src/pages/writing/first-look.astro` exists. The disabled entries
have no corresponding files, so the `disabled` flag is what prevents dead links.

Dates are formatted at build time by a local `fmt` helper (`:31-36`). The list is
a `<ol reversed>` (`:53`) with the newest row given the heavy blue-plus-maize top
rule (`:96-107`).

## `/writing/first-look/` — the one real post

`src/pages/writing/first-look.astro:4-67`. Content is hand-written HTML passed
into `ProseLayout`'s slot, with metadata as props (`:5-8`). It links to `/about/`
(`:29`, `:50`) and to astro.build (`:42`), and describes the same one-artifact
architecture the about page diagrams (`:41-47`).

## `/projects/` — project index

`src/pages/projects/index.astro`. Typed this time: a `Status` union (`:4`) and a
`Project` interface (`:6-13`) back the array (`:16-45`), with a
`Record<Status, {label, className}>` map driving the status pill (`:47-51`,
consumed at `:78-80`).

Three entries: the site itself (`in-progress`), the view counter (`shipped`), and
a `seed` placeholder (`:17-44`). Links are optional and conditionally rendered
(`:87-93`). Two entries point at the public GitHub repo and `/about/` (`:24-25`).

Like the about diagram, the copy here restates counter internals — "hourly buckets
and a 30-hour TTL" (`:30`) — that actually live in `src/worker/index.ts:4-5`.
