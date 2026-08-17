---
date: 2026-08-17
session: about-page-and-counter-hero
---

## Concepts Learned

**Astro's shared-structure value activated for real.** With `/about` added, `BaseLayout` is finally being reused. The "value scales with page count" pitch made concrete — the layout wrote once, both pages picked it up for free.

**Inline SVG is the right diagram medium for an editorial personal site.** For the architecture diagram on `/about`: text labels are read by screen readers, colors respond to CSS variables (updates when the palette shifts), no image loading. Two-zone comp (BUILD TIME above the rule / RUNTIME below) with a single accent-dashed line crossing the divider from `DIST/` → `env.ASSETS` — the visual punchline of the whole architecture story ("what you build is what gets served").

**Silent failure has a cost when the local environment differs from prod.** The counter component removes itself on any `/api/views` failure — right behavior in production, but locally I first ran `astro dev` (port 4321, no Worker) instead of `wrangler dev` (port 8787, Worker + assets). The counter vanished, and there was no signal about why. Lesson: silent-failure UX assumes the environment matches production; when it doesn't, you can't tell config bugs from design bugs.

**Hero-scale typography for a "signal of life."** Counter went from meta-block footnote (`PULSE 42 · past 24h`, mono caps) to full hero (`42` in italic Fraunces at ~6rem, accent orange) with a small mono caption + heartbeat-pulsing `◆` mark. Same visual weight as the h1 — reads as a second focal point instead of a data point.

## Notes & Examples

- Two dev-server URLs to remember: `localhost:4321` (astro dev, pages only) vs. `localhost:8787` (wrangler dev, pages + Worker). Use wrangler dev when the API matters.
- `.content > *:nth-child(4) { animation-delay: 0.55s; }` + `:nth-child(n+5)` added to BaseLayout so the rise-in stagger keeps working when you add more elements to a page.
- Counter placement rule that worked: between the lede and the meta block — after the reader has landed and read the intro, before they scan the meta info. Prime real estate.
- Diagram uses `<title>` + `<desc>` inside the SVG referenced by `aria-labelledby` — full accessibility without a caption dependency.

## Still Fuzzy

- **Counter on `/about` too?** Currently only shows on landing. Two-page discrepancy: `/about` explains the counter in the diagram but doesn't display the live value. Worth a design call later — duplicate, or leave landing as the "signal moment" and let `/about` stay pure explanation?
- **Public-vibe of the hero-sized counter with small early numbers.** Hero scale + a number like `3` reads even more starkly than the meta-block version did. Might age well; might age awkwardly. Same one-week revisit as before.

## Connections

- `/about` is the concrete moment when "why Astro" stopped being an argument and became a working thing. Before this session, the shared shell (`BaseLayout`) existed but wasn't actually being reused — the argument was hypothetical. Now every future page (`/projects`, `/journal`, blog posts) inherits the shell for free.
- Silent failure + local/prod divergence is the same shape as any config-vs-behavior gap: the code was right, the environment was wrong. Loud dev logs would have caught it faster. Trade-off: verbose dev vs. clean prod — hard to have both without runtime flags.
- The counter's move from footnote to hero is the same pattern as the site's overall stance: "build in public" is only credible when the artifacts of building are visible. A tiny counter hidden in a corner reads as an afterthought; a hero counter reads as a statement.
