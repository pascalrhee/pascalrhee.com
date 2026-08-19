# Subsystem — Design Previews

**File:** `previews/index.html` (1,508 lines, self-contained)

A single static HTML page comparing five candidate visual directions for the site,
kept in the repo as a design record after direction E was chosen. It is **not**
part of the build: it sits outside `src/`, so Astro never routes it, and it is not
copied into `dist/`.

## Structure

A neutral dark shell wraps five isolated direction sections so the shell's styling
never bleeds into them (`previews/index.html:14-32`). A fixed side nav jumps
between them (`:1007-1014`):

| Id | Direction | Section |
|---|---|---|
| `#a` | Editorial paper | `:1017` |
| `#b` | Editorial dusk | `:1107` |
| `#c` | Build-log terminal | `:1196` |
| `#d` | Modernist grid | `:1290` |
| `#e` | Michigan wolverine | `:1392` |

Each section is a `<section class="direction dir-X">` with a tag label and an inner
mock of the landing page in that direction's type and palette.

## Fonts

One combined Google Fonts request loads every family across all five directions —
Fraunces, JetBrains Mono, Newsreader, Bricolage Grotesque, IBM Plex Mono, EB
Garamond, and EB Garamond SC (`:7-12`). Only the last three survive into the
shipped site (`src/layouts/BaseLayout.astro:29`).

## Relationship to the live site

Direction E is what shipped. Its heading style — EB Garamond weight 500 in
`--blue` (`:1396`) — matches `src/layouts/BaseLayout.astro:212-220`, and the
blue/maize/paper palette matches the tokens at
`src/layouts/BaseLayout.astro:31-40`.

The four rejected directions are the reason the file is kept: it preserves what
was *not* chosen, which git history alone would not make legible.

## Provenance

Committed deliberately as a design record rather than cleaned up —
`.claude/agents/end-session.md:63` names `previews/index.html` alongside
`plans/.Rhistory` as a path the sweep phase has flagged before, and commit
`c584bb2` ("Keep the five-direction preview as a design record; ignore .Rhistory")
is the decision that settled it.

Whether it is meant to be *served* anywhere is unstated — see open question 14 in
`ARCHITECTURE.md`.
