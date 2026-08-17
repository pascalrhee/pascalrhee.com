---
date: 2026-08-17
session: counter-build
---

## Concepts Learned

**Workers with Assets = one artifact, two behaviors.** The Worker fetch handler inspects the URL: `/api/*` gets handled in code, everything else is delegated to `env.ASSETS.fetch(request)` which serves the static Astro build. Single deploy, single mental model — the seam between "static site" and "serverless API" collapses.

**Wrangler generates types from bindings.** Running `wrangler types` after editing `wrangler.jsonc` produces `worker-configuration.d.ts` with an `Env` interface that has your KV/asset/binding types filled in. The Worker script just references `Env` and TypeScript sees `env.VIEWS_KV: KVNamespace`, `env.ASSETS: Fetcher`. No manual type maintenance.

**Astro `<script is:inline>` = a zero-dependency island.** For a small client-side script that only needs to run once and touch a couple of DOM nodes, `is:inline` skips the bundler entirely and inlines the JS in the HTML. Way simpler than adding React or Svelte just to hydrate a counter. If we ever need actual UI logic (state, event handlers, re-renders), we'd graduate to a framework — but not before.

**KV eventual consistency in practice.** After a `put`, the next `get` might still return the old value for a few seconds. For a counter serving cached responses (60s edge cache anyway), this is invisible — but it means we can't do "increment and read back" as an atomic operation. Fine for counting; fatal for anything that needs strong consistency (use Durable Objects for that).

**Backend-first, preview-first pattern paid off.** Built the Worker in isolation, tested with curl (`/api/track` then `/api/views`, verified bot filter, verified count increments), *then* wrote the frontend island, *then* wired into the page. Every stage produced a working artifact. When bugs happened they were in the layer I'd just added.

## Notes & Examples

- Bot filter is a User-Agent regex list (`bot`, `crawler`, `curl`, `Googlebot`, `pingdom`, etc.). Not exhaustive, but catches the obvious hits without complexity.
- `PUBLIC_THRESHOLD` design: the frontend receives `{count, visible, threshold}` from `/api/views`. Frontend just checks `visible` — the threshold logic lives entirely server-side. Flipping the constant is a one-line change with no frontend rebuild.
- Silent failure on the frontend: if `/api/views` errors, the counter element is `.remove()`d entirely. A broken counter shouldn't leave a "—" placeholder on the page or degrade the design.
- Deploy pattern that's now established: PR from feature branch → merge to main → `npm run deploy` from main. The sandbox enforces this ordering, which is actually a better workflow than "deploy from branch then merge."

## Still Fuzzy

- **Public-counter vibe with small early numbers.** Threshold defaults to 0 so the count is always visible. In a week of live data, worth revisiting whether small numbers look bad or fine. If bad: flip `PUBLIC_THRESHOLD` (e.g., to 20) and the counter hides itself until the site earns the number.
- **wrangler dev's KV isolation.** Local dev appeared to use in-memory KV rather than the production namespace (production count was 0 after all our local testing, which is correct). Didn't fully verify the mechanism, but the behavior was safe. Worth confirming if we ever add a scenario where local/prod isolation matters more.

## Connections

- The whole "public/private counter" question maps to a broader pattern: features that look one way with small numbers and another way with big numbers. A counter at 5 reads different than a counter at 50,000. This shape shows up in social proof, recommendations, ratings — anywhere the number itself is part of the UX signal. The `visible` flag is a general escape hatch for that class of problem.
- The Worker-with-Assets one-artifact story is the *practical* payoff of picking Workers over Pages (session 5's structural decision). This is where "one artifact, one mental model" stopped being an abstract argument and started being concrete.
- The "backend-first, preview-first" development pattern (originally coined in the counter plan) proved out in exactly the way it was pitched: risk was concentrated in early-verifiable stages, and the visible piece was the last thing added.
