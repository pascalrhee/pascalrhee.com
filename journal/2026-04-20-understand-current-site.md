---
date: 2026-04-20
session: understand-current-site
---

## Concepts Learned

**Workers vs Pages** — Workers run code per-request (serverless functions). Pages serves static files. They're not competing — Pages handles what the browser displays, Workers handles server-side logic. For a static site, Pages alone is enough. Workers enters the picture only when something needs to *happen* on the server (e.g., a contact form sending email = both).

## Notes & Examples

- Cloudflare's dashboard pushes Workers by default — Pages is buried under "Create application." This is a product/business decision, not a technical recommendation.
- Astro builds to static files → Pages is the right host. No server-side code needed.
- `preconnect` tells the browser to start connecting to an external server early, before it knows it needs a file. Performance trick for external dependencies like fonts.

**Viewport meta tag** — Tells mobile browsers to render at the device's actual width instead of pretending to be a ~980px desktop screen. Without it, the page renders tiny and zoomed out on phones. Desktop doesn't need it because desktop browsers already use their actual window width — the "pretend to be wide" behavior is mobile-only legacy from when most sites weren't mobile-friendly.

**Data URIs vs external links** — A data URI embeds the content directly in the HTML (the data IS the link). An external link points to another server that has to respond. The favicon in index.html is a data URI (self-contained, zero dependencies). The Google Fonts lines are external dependencies (if Google is down, fonts don't load). Tradeoff: data URIs can't be cached separately by the browser — the data re-downloads with the HTML every time.

**CSS custom properties (variables)** — Defined in `:root` (the top-level element, available everywhere). Named with `--` prefix, used with `var(--name)`. Two benefits: single source of truth (change once, updates everywhere) and readability (`var(--ink-soft)` means more than `#54524d`). Key power: variables can be *redefined* in different contexts (like a dark mode media query), and every rule using `var()` automatically picks up the new value. Only override the ones you want to change.

## Notes & Examples

```css
/* variables act like a switchboard */
:root { --accent: #b8462a; }

@media (prefers-color-scheme: dark) {
  :root { --accent: #e8633f; }  /* only override what changes */
}
```

**Deployment pipeline (git → live site)** — Full chain: `git push` → GitHub receives code → GitHub fires a webhook to Cloudflare ("new commit") → Cloudflare pulls the repo → runs build command (empty for now) → puts output on CDN edge servers worldwide → visitors served from nearest edge. Key: GitHub *notifies* Cloudflare via webhook, Cloudflare doesn't poll/watch the repo.

**Static site generators run at build time, not request time** — Astro will run during the Cloudflare build step, producing plain HTML/CSS/JS. Visitors never interact with Astro — they get static files, same as now. This is why it stays on Pages, not Workers. Astro is a factory machine (build time), not a store clerk (request time).

**Cloudflare .workers.dev subdomain ≠ Workers** — Pages projects now get `.workers.dev` subdomains too due to branding merge. The subdomain name doesn't determine whether it's Workers or Pages. What matters: are you serving static files (Pages) or running code per-request (Workers)?

**Why Astro exists (the duplication problem)** — A static site with multiple pages means repeating shared structure (head, nav, footer) in every file. Astro lets you write shared pieces once as components and assembles complete HTML pages at build time. No duplication = no need for Astro. The framework's value scales with the number of pages sharing structure.

**Why Astro over Next.js** — Next.js assumes you're building an app: it ships JavaScript to every page, expects a server to run code per-request, and is designed for dynamic/interactive experiences. Astro assumes you're building a content site: zero JS by default, no server needed, output is plain HTML on a CDN. Astro lets you opt individual components into interactivity ("islands") without committing the whole site to a JS-heavy framework. Interactivity is per-component, not a framework-level decision.

**Astro's island model** — A page is mostly static HTML (the "ocean") with small interactive components ("islands") that each get their own isolated JavaScript bundle. In the traditional SPA model (React/Next.js), JS owns the entire page — even static text is framework-controlled. Astro inverts this: static is the default, and you opt individual components into interactivity. Each island hydrates independently and you control when it loads (immediately, when visible, when idle).

## Still Fuzzy

- **Sticky footer pattern** — `min-height: 100vh` + `grid-template-rows: auto 1fr auto` makes the footer stick to the bottom of the screen, not under the content. `1fr` means "take all remaining space," not "fit the content." Got this wrong — revisit.
- **Skipped sections of index.html** — Typography/components (lines 48-118), animation/keyframes (lines 139-154), `prefers-reduced-motion` accessibility (lines 152-154), HTML body structure (lines 157-185). Haven't been tested on these.
- **Hydration** — Used the word in the islands discussion but never defined it. Hydration is the process where JavaScript "wakes up" a static HTML element and makes it interactive. Accepted without question — revisit when we scaffold Astro.
- **When islands are worth the complexity** — Understood the concept, but hasn't been tested on judging *when* something actually needs to be an island vs. when plain HTML + a form submission is enough.

## Connections

- Workers vs Pages maps to a bigger concept: static vs dynamic. This distinction will keep coming back — Astro's whole pitch is "static by default, dynamic only when you opt in."
- The deployment pipeline (git → webhook → build → CDN) is the same pattern whether I use Cloudflare, Netlify, or Vercel. The specific tool changes, the chain doesn't.
- Realizing I want systems-level understanding, not code-level, is itself a learning about how I learn. Future sessions should stay at the "what connects to what" altitude.
- The "why Astro" chain follows a funnel: need templating → need static output → need zero-JS default → Astro. Each requirement eliminates options. This decision-by-elimination pattern applies to any tech choice.
- The island model connects back to Workers vs Pages: both are about "where does code run and when?" Pages = no runtime. Islands = runtime only where explicitly opted in. The theme is minimizing what runs.
