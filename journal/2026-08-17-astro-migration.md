---
date: 2026-08-17
session: astro-migration
---

## Concepts Learned

**Astro layouts + slot pattern** — A layout is a component that renders the shell (html/head/body + shared structural elements like header/footer) and exposes a `<slot />` where per-page content goes. Pages import the layout and wrap their unique content in it. This is how Astro solves the copy-paste problem: change the layout once, every page updates.

**Astro scoped vs global CSS** — `<style>` in a component is scoped by default (styles apply only to elements in that component's template, via a hash attribute). Slotted content isn't in the layout's template, so scoped styles don't reach it. Solution for site-wide styles: `<style is:global>` in the layout. For component-specific styles, keep scoped.

**create-astro's safety default** — It refuses to scaffold into a non-empty directory and instead creates a randomly-named subdir. Workaround: scaffold to a temp subdir, hoist contents to root.

**Astro build output shape** — `astro build` produces `dist/` containing static HTML + hashed assets. `dist/index.html` for the homepage; future pages become `dist/[route]/index.html`. CSS gets minified and inlined per page automatically. Same shape as any static site output — no server needed.

## Notes & Examples

- The `AGENTS.md` file the scaffolder created is Astro's guidance for AI agents (use `astro dev --background`, links to routing/component/content-collection docs). Kept it at root.
- Split for this migration: BaseLayout owns html/head/body/main + header + footer + global CSS. index.astro owns just the h1/lede/meta content middle. Future pages inherit the whole shell for free.
- `index.legacy.html` kept during migration as a rollback fallback. Delete once we're confident.
- Astro auto-minifies and deduplicates CSS on build — the original hand-written CSS collapsed into one inline `<style>` block in `dist/index.html`.

## Still Fuzzy

- **Cloudflare build config timing.** We haven't flipped the Cloudflare Pages settings yet. If we push and merge without updating the dashboard, unclear what CF does with a repo that suddenly has `package.json` + `astro.config.mjs`. Two possibilities: (a) CF keeps its "no build" setting and serves the old top-level HTML fine, or (b) CF auto-detects Astro and tries to build. Need to confirm before merge.
- **Visual fidelity.** Raw HTML output looks right; browser rendering not verified yet.

## Connections

- The value of Astro is invisible with one page. It becomes obvious the moment a second page shares the same shell. The bet made today: the second page is coming soon enough that the migration cost was worth paying now, while the site is small.
- `astro dev --background` was built specifically for AI agents. First real "harness feature that was built for this workflow" moment — worth noting that framework tooling is starting to bake AI-agent affordances in.
- The pattern "keep the old thing around as a rollback until the new thing is verified" (index.legacy.html today, the counter's dual write/read endpoints tomorrow) is the same shape as "backend-first, preview-first" from the counter plan. Both are risk-reduction tactics: never remove the safety net until you're standing on the new floor.
