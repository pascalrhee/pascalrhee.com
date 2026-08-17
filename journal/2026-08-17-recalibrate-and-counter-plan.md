---
date: 2026-08-17
session: recalibrate-and-counter-plan
---

## Concepts Learned

**Why Astro (re-explained after 4-month gap)** — Three-part answer, in weight order: (1) value scales with pages — Astro solves the copy-paste problem once you have more than one page sharing structure; (2) content-site shape — Astro outputs static HTML with zero JS by default, right tool for a personal site, whereas Next.js is app-shaped and expects a server; (3) the island model enables features like the view counter, letting one interactive component live in an otherwise-static page without turning the whole site into a JS app.

**Bucketed time-series counters** — How you implement "count in last N hours" without storing every event: bucket by time unit (hourly), sum the recent N buckets on read, set a TTL so old buckets self-clean. Pattern generalizes to rate limiters, dashboards, log analysis.

**Two-endpoint separation for write/read paths** — For the counter, track (write) and views (read) are separate endpoints. Failure of one doesn't corrupt the other; read can be cached at the edge, write cannot. General pattern for any "increment + display" feature.

**Backend-first, preview-first dev pattern** — When adding new infra + a visible piece: build the backend in isolation, deploy to a preview branch, hit it with curl, then attach the UI. Validates the risky new thing before anything visible depends on it. The Cloudflare Pages preview URL per branch makes this cheap.

**Fire-and-forget beacons** — The tracking write isn't awaited by the frontend. If it fails, the page still renders. Ties to critical-path vs background-work distinction.

## Notes & Examples

- Mental model for Astro: **factory that runs at build time**. Visitors never touch Astro — they get plain HTML, same as now.
- Right calibration altitude going forward: "You need something like Astro when a site has multiple pages sharing structure" — not "this file tells Astro where to find your content" (too low).
- Placement decision for the counter: fits the existing `.meta` block on the landing page as a `PULSE` line, matches the mono-caps aesthetic.

## Still Fuzzy

- **Whether a public counter is the right vibe.** Accepted "public" quickly. Small numbers early on can undercut the "building in public" effect. Worth revisiting once it's live and we can see how the number reads next to the rest of the page.
- **The strategic-only altitude shift itself.** Accepted it, but haven't stress-tested whether "strategic only" leaves gaps when a real decision hinges on how something works underneath. Will find out during the Astro migration.

## Connections

- The 4-month gap between sessions is what made "why Astro" fuzzy. Long gaps + heavy ritual = concepts don't stick. Recalibrating CLAUDE.md to a lighter, more strategic mode is a bet that easier sessions will be easier to return to.
- Counter and Astro are linked by the island model: without Astro (or something like it), the counter forces you to either give up static output or hand-roll more plumbing. This is a concrete example of "why this framework specifically enables the future you want" — the kind of strategic reasoning the new CLAUDE.md is calibrated for.
- The "backend-first, preview-first" pattern is the same shape as "static-by-default, opt into interactivity" (Astro islands) and "Pages by default, add Workers only when needed" (Cloudflare). Recurring theme: validate the risky/dynamic thing in isolation, keep the safe/static thing as the default.
