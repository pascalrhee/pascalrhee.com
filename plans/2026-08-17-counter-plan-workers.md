---
session: 2026-08-17-counter-plan-workers
goal: build a 24h page-view counter on Workers with Assets
status: planned
---

## Context

The original counter plan (`~/.claude/plans/luminous-launching-leaf.md` and `journal/2026-08-17-recalibrate-and-counter-plan.md`) assumed Cloudflare Pages Functions. We're actually on **Workers with Assets**, so the shape changes — same underlying counter logic, different file structure.

## What actually changes vs. the original plan

- **Then:** `functions/api/track.ts` + `functions/api/views.ts` as separate Pages Functions.
- **Now:** One Worker script (`src/worker/index.ts`) that routes `/api/*` requests to handlers and delegates everything else to the assets binding (which serves the Astro `dist/`).
- **Unchanged:** hourly bucketed KV storage, rolling 24h sum, fire-and-forget beacon from an Astro island, `PageViewCounter` component in the meta block.

## Architecture

```
visitor → pascalrhee.com → Worker.fetch(request)
                              │
                              ├─ url.pathname starts with "/api/" →
                              │      ├─ POST /api/track → increment KV bucket for current hour
                              │      └─ GET  /api/views → sum last 24 hourly buckets, return JSON
                              │
                              └─ everything else → env.ASSETS.fetch(request) → static file from dist/
```

One artifact, one deploy, one mental model. The Worker is the "front door"; the assets binding is the file cabinet behind it.

## Files to add / modify

- **New:** `src/worker/index.ts` — Worker fetch handler with the routing above + `handleTrack` / `handleViews`
- **New:** `src/components/PageViewCounter.astro` (thin wrapper) + a small client-side component (React or vanilla) as the island
- **Modify:** `wrangler.jsonc` — add `main: "src/worker/index.ts"`, give the assets binding a name (`binding: "ASSETS"`), add the KV namespace binding
- **Modify:** `src/pages/index.astro` — insert the counter into the `.meta` block
- **Modify:** `src/layouts/BaseLayout.astro` — add a `.meta` style for the new PULSE line if needed

## Endpoints

- `POST /api/track` — reads the `hour` bucket key (`views:YYYY-MM-DDTHH`), increments, writes back with TTL ~30h. Basic bot filter (drop common bot User-Agents). Returns `204`.
- `GET /api/views` — reads the last 24 hourly bucket keys, sums, returns `{ count: N }`. Cached at the edge for ~60s to shield KV from every page load.

## The one design question worth answering first

Pascal flagged this as fuzzy: **is a public counter the right vibe when early numbers will be small?** Three concrete paths:

1. **Public, always shown** — traditional "42 loads · past 24h" line. Honest but exposes small early numbers.
2. **Public with a threshold** — count is displayed only when it's above N (e.g., "shown only when >= 20"). Hides the awkward early phase.
3. **Private, hidden URL** — counter still runs, but the number only appears at something like `/pulse` that only you know about. Zero vibe risk.

**Recommendation: build path 1 with the threshold as a configurable constant (default 0 = always visible).** That way you get the "traditional" version now, and if the number looks bad after a week, flip a single constant to enable path 2 without redesigning anything. Path 3 is a bigger commitment and cuts off the "build in public" story.

## Development flow

1. Create a KV namespace via `wrangler kv namespace create VIEWS_KV` — captures a namespace ID
2. Add KV binding to `wrangler.jsonc` (production + preview IDs)
3. Write the Worker script (routing + handlers)
4. Local test: `wrangler dev` — hits real KV in preview mode; use `curl` to verify both endpoints
5. Manually seed 25 hourly buckets in preview KV; confirm `/api/views` sums exactly the newest 24
6. Add the Astro island; wire into `src/pages/index.astro`
7. Local full-flow test with `wrangler dev` — visit the page, watch it beacon + fetch + render
8. Deploy: `npm run deploy` (needs to become `npm run build && wrangler deploy` — which it already is)
9. Verify on `pascalrhee.com`: counter renders, count increments after refresh (with a few-sec KV consistency delay)

## Cost check (per CLAUDE.md Cost Discipline)

- Worker requests: free tier 100k/day. Static asset requests are uncounted. `/api/track` + `/api/views` per visitor = 2 counted requests each. 100k/day / 2 = 50k visitors/day before we'd hit the request cap — years away.
- KV: 1k writes/day on free tier. Each visitor = 1 write. **1k visitors/day is the ceiling before we'd need to upgrade to Workers Paid ($5/mo) or batch writes.** For a personal site: safe for years.
- No new paid services, no lock-in.

## Known limitations for v1

- Bot inflation (mitigated by User-Agent filter, not eliminated)
- No unique-visitor dedup — a refresh is +1 view. Language on the page must match: "loads", not "people"
- KV eventual consistency — a fresh increment may not appear in the next read for a few seconds

## Verification

- Local: `wrangler dev` → `curl -X POST localhost:8787/api/track` (a few times) → `curl localhost:8787/api/views` returns rising count
- Rolling-window correctness: manually seed 25 hourly buckets; confirm sum is only the newest 24
- Bot filter: curl with `User-Agent: Googlebot` → `/api/views` unchanged
- Production: visit `pascalrhee.com` → counter renders → refresh 3 times → within ~10s the number reflects the new loads
- Failure mode: temporarily break the endpoint URL in the island → confirm the page still renders cleanly with no visible counter (silent failure)
