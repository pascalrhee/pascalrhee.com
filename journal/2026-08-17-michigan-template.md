---
date: 2026-08-17
session: michigan-template
---

## Concepts Learned

**Design tokens as CSS custom properties gate whole-site retones.** Because
every color reference in `BaseLayout` went through `var(--paper)`, `var(--ink)`,
`var(--accent)`, swapping the whole site from warm-cream terracotta to
Michigan blue-and-maize was one block of variable declarations. The strategic
point: pick your token names early, and even a full aesthetic change is a
five-minute edit rather than a rewrite. This is what "design system" actually
buys you at small scale.

**Layouts compose, they don't inherit.** `ProseLayout` wraps `BaseLayout` —
the outer shell (nav, header, footer, palette, fonts) comes for free; the
inner file only owns article typography (drop cap, dek, measured column,
blockquote). Astro's layout system is compositional in exactly this sense.
This is why "when do I make a new layout vs. a new component" has a clean
answer: a layout owns the shell, a component owns a piece.

**Small caps as a functional typographic tool, not decoration.** EB Garamond
SC is a genuine typeface variant — small caps drawn at the small size, not
`text-transform: uppercase` scaled down. That's why the small-caps kicker
labels ("§ Volume I · Bulletin No. 001") read as institutional rather than
shouted. Real small caps have proper weight and proportion at 0.72rem;
uppercased normal caps at that size look thin and wrong.

**Preview-mockups are real design work, not a detour.** Building the five
direction previews before touching `src/` took about 15 minutes and saved a
whole implementation cycle. Instead of describing options in words (Pascal's
working style tag is "look it up first" — same principle applies to design:
build the artifact first). The preview file becomes the shared reference: if
future sessions want to consider "what if we go direction B," the file still
exists.

**Placeholder-driven design is a legitimate two-pass workflow.** The visual
template gets locked with mockup copy ("Volume I · Bulletin No. 001", the
syllabus meta), then real content fills the container later. The alternative
— trying to design the container and finalize the copy simultaneously — is
what makes personal-site rewrites take years. Two-pass beats one-pass here.

## Notes & Examples

The Michigan palette, chosen for the site (Michigan's official blue + maize
plus a warm off-white paper as design supplement):

```
--blue:      #00274C   /* Michigan blue */
--maize:     #FFCB05   /* Michigan maize */
--paper:     #F5F1E8   /* warm off-white — not white, not cream */
--paper-soft:#E8E2D2   /* one step deeper for panels */
--tan:       #8B7C5A   /* neutral warm gray — rules, secondary text */
--ink:       #1A1A1A   /* body text where blue would be too heavy */
```

The maize-highlighter pattern — used behind italic phrases, current-nav items,
status pills, drop caps. A linear gradient masquerading as a highlighter:

```css
background: linear-gradient(
  to top,
  var(--maize) 0%,
  var(--maize) 30%,       /* the top edge of the highlighter */
  transparent 30%,
  transparent 100%
);
```

The signature top stripe — thick blue rule, thin maize shadow-line below.
The `box-shadow` trick is a second full-width horizontal line without a
second element:

```css
main::before {
  height: 6px;
  background: var(--blue);
  box-shadow: 0 8px 0 var(--maize);
}
```

Michigan founding year in Roman numerals: 1817 = MDCCCXVII. Currently in the
header as **MMIII** (2003, placeholder Pascal-birth-year) — real year needs
Pascal's call.

## Still Fuzzy

**The direction got chosen at first glance from static previews.** Pascal
opened `previews/index.html`, saw all five, and said "I like E." That was the
whole decision. No A/B in situ, no reading-post feel until after the
Michigan template was already built out across five pages. If it fatigues
after a week — if the Block-M in the header starts feeling like a costume,
or the maize highlighter starts feeling like a gimmick — undoing costs more
than a variable swap now, because the ProseLayout and the syllabus meta and
the section nav all lean into the collegiate metaphor. The preview file was
a good decision aid; sitting with the choice for a day would have been a
better one, and that step got skipped in the momentum.

**The syllabus meta is chrome that repeats on every landing view.** "Course ·
Pascal Rhee · dot com / Term · Winter 2026 — indefinite / Sections · Writing
· Projects · Notes · About / Instructor · Pascal, one commit at a time" reads
great once, as a concept. As permanent chrome on the landing page — the thing
visitors see every visit — it's a costume that never comes off. Pascal
accepted it as part of the hero mockup without commentary; it was never
weighed against the previous mockup's simpler STATUS / STACK / NEXT block.
The costume risk shows up first in copy, not code.

## Connections

This is the first session where the *look* of the site was the point. Every
prior session shipped structure — the Astro migration made the site
maintainable, the counter added a live artifact, `/about` added the colophon.
Those made the site *work*. This session gave it a *voice*. Both categories
matter, but they hit different muscles: structure sessions are about picking
tools and making things work; design sessions are about picking a
point-of-view and committing to it.

The Michigan reference is personal — Pascal went to UMich Ann Arbor. That's
exactly the thing the site's positioning (per `[[site-purpose]]`: "personal
home base built to grow over years") should accommodate. A recruiter portfolio
optimized for legibility wouldn't do this; a personal site optimized for
being *his* should. The trade-off is that a strong reference dates faster
than a neutral one — this is a site that reads like a specific person made it
in 2026, and that's the point.

The template scaffold with placeholder copy is also a small commitment to
writing later. `/writing/first-look/` doesn't just prove the ProseLayout —
it makes the empty state of the writing section less blank. There's now
something at the URL, so the first real post is *replacing* a placeholder,
not *starting* a new thing. Lower activation energy for something Pascal's
positioning notes said would happen "sometime, someday" — the classic
never-time.

Two parallel Claude sessions ran on this working tree today (this one, plus
the harness-tooling one that built `/end-session`). The coordination worked
because both sessions checked `git status` before staging and neither
attributed the other's changes to itself — which is the pattern that new
`memory/session-workflow.md` note now codifies. First real proof of the
parallel-sessions workflow, and it held.
