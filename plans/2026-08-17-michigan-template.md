---
session: 2026-08-17-michigan-template
goal: lock a visual template for the whole site and scaffold /writing + /projects pages around it
status: done
---

## Goal
A design session, not a systems session. Two things:

1. Pick a visual direction for the site and apply it consistently — the
   editorial-paper look already live was one option, but not the only one worth
   considering
2. Scaffold the next page kinds (writing, projects) around the chosen direction
   so that when real content lands there's no template-writing to do first

## Plan
1. Load the `frontend-design` skill and build a self-contained preview page
   with 4–5 distinct aesthetic directions rendered in real fonts + real
   swatches, not adjectives
2. Have Pascal pick one; refactor `BaseLayout` to match, retone the landing
   page, the view counter, and `/about`
3. Add a section nav so pages can link to each other, plus a
   `ProseLayout` for reading shell
4. Build `/writing` (index + one sample post) and `/projects` (index) using
   the same template so the direction is proved across more than one page kind
5. Verify with `wrangler dev` at 8787

## What Actually Happened

- **Direction picked from a preview file, not from adjectives.** Rather than
  ask Pascal to describe what he wanted, built a single-page HTML preview at
  `previews/index.html` with five directions side-by-side: editorial paper
  (current, extended), editorial dusk (dark reversal), build-log terminal,
  modernist grid, and — on Pascal's request mid-preview — a University of
  Michigan wolverine variant. Each direction rendered with real Google Fonts,
  real color swatches, a hero mockup, and a typography specimen. Pascal picked
  **E (Michigan)** after opening the file
- **Michigan palette + type:** `#00274C` blue, `#FFCB05` maize, `#F5F1E8` warm
  paper, `#8B7C5A` tan, EB Garamond (with EB Garamond SC small-caps variant)
  for display and body, IBM Plex Mono for institutional meta
- **`src/layouts/BaseLayout.astro`** rewritten around the new palette. Added
  a signature blue-rule-with-maize-shadow top stripe fixed to the viewport,
  a Block-M glyph + small-caps wordmark + "Est. MMIII" header, and a
  small-caps section nav strip with maize-highlighter current-page marking
  driven by a new `section` prop
- **`src/pages/index.astro`** rebuilt: kicker → hero (maize highlighter behind
  the italic phrase) → lede → counter → syllabus meta
  (Course/Term/Sections/Instructor) as a placeholder for the eventual
  status/stack lines
- **`src/components/PageViewCounter.astro`** restyled as an "Attendance / past
  24 hours" line — big blue italic EB Garamond numeral bracketed by two blue
  rules with a maize hairline riding the top rule. Kept the fire-and-forget
  fetch, the placeholder-then-fade rendering, and the silent-remove-on-failure
  branch unchanged
- **`src/pages/about.astro`** retoned to Michigan colors. The SVG architecture
  diagram's "same artifact" line now renders in maize; the accent-box strokes
  in blue
- **`src/layouts/ProseLayout.astro` (new)** — reading shell wrapping
  `BaseLayout`. Adds article typography: date + reading-time kicker,
  oversized H1, italic dek, byline, ~34rem measured column, blue drop-cap
  sitting on a maize hairline, `§`-prefixed H2s, blockquotes with
  blue-plus-maize left rules, mono code blocks, `‡ ‡ ‡` ornamental `<hr>`,
  small end-mark
- **`src/pages/writing/index.astro` (new)** — table-of-contents-style post
  list, three placeholders (one live, two disabled as drafts to show the
  disabled state)
- **`src/pages/writing/first-look.astro` (new)** — sample post exercising every
  ProseLayout element (drop cap, blockquote, H2, hr, inline code, links)
- **`src/pages/projects/index.astro` (new)** — vertical project list, three
  placeholders with status pills (Shipped / In progress / Seed), stack tags in
  IBM Plex Mono, italic outbound links
- Build gate passed (5 pages: `/`, `/about/`, `/projects/`, `/writing/`,
  `/writing/first-look/`). Wrangler dry-run passed (bundle 2.27 KiB, both KV
  and ASSETS bindings resolved). Secret scan clean on the diff
- **Wrangler crashed once mid-session** with a `SQLITE_BUSY` on its internal
  state DB when hot-reloading after a rebuild. Requests served before the crash
  returned fine. Restarted and everything continued. Noted in
  `memory/stack-decisions.md`

## Deferred — not this session's work
- The parallel harness-tooling session's branch
  (`session-notes-2026-08-17-harness-tooling`) sits ahead of `main` with the
  `end-session` agent + command. This session's work rebased off `main`, not
  off that branch, so the two sit side-by-side and merge in whichever order
  Pascal chooses
- `previews/index.html` was left in the working tree untracked. It's the record
  of what design directions were considered. Committing it (as a design log) or
  gitignoring it (as a scratch artifact) is a judgment call worth Pascal's
  input — not made unilaterally
- `plans/.Rhistory` is a stray empty file (R history), safe to delete or
  gitignore

## What's Next
- **Decide on `previews/index.html`** — commit as a permanent design record
  in the repo, or add `previews/` to `.gitignore`
- **Stub `/notes`** — the landing page's syllabus lists Notes as a section but
  no route exists; that's a dead link in the current nav-less mockup and will
  become a dead link the moment the nav grows Notes
- **Migrate `/writing` from hardcoded `.astro` posts to a content collection**
  — fine for one or two posts, but once real writing starts, `.md`/`.mdx` in
  `src/content/writing/` with a typed collection is the pattern that scales
- **Replace placeholder copy** — the syllabus meta (Course/Term/Sections/
  Instructor), the "Est. MMIII" year, "Volume I · Bulletin No. 001", and every
  post/project entry are mockup text. The visual container is locked; the
  content is not
- **Resolve the Block-M question** — the header glyph is a stylized geometric
  mark, not the trademarked University of Michigan Block M. If the site is
  going to lean into the reference publicly, that decision needs an answer;
  if not, the glyph should be swapped for a neutral typographic monogram
- **Add focus-visible styles** — carried over from the harness-tooling
  session's findings; still true, still priority #2 in CLAUDE.md
