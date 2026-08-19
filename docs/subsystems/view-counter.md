# Subsystem — View Counter

**Server:** `src/worker/index.ts:4-65` · **Client:** `src/components/PageViewCounter.astro`
· **Store:** `VIEWS_KV` (`wrangler.jsonc:10-15`)

A rolling 24-hour page-load count. The only stateful feature on the site.

## Bucket scheme

Counts live in one KV key per UTC hour:

```
key:   views:2026-08-18T14
value: "37"            (base-10 integer string)
ttl:   108000 s ≈ 30 h
```

- Key built by slicing the first 13 chars of `Date.toISOString()`
  (`src/worker/index.ts:24-27`) — UTC hours, deliberately matching the ISO prefix.
- TTL is `(WINDOW_HOURS + 6) * 60 * 60` (`src/worker/index.ts:4-5`), applied on
  every write (`src/worker/index.ts:52`). The 6-hour margin keeps buckets alive
  past the edge of the read window.

## Write path — `POST /api/track`

`src/worker/index.ts:42-54`

1. Non-POST → `405` (`:43-45`).
2. Bot UA → `204`, no write (`:46-48`).
3. `get` the current hour's key, `parseInt` or default 0, `put` value + 1 with TTL
   (`:49-52`).
4. `204` no content (`:53`).

**The increment is not atomic.** Two requests in the same hour that interleave
their get/put will record one increment, not two (`:50-52`). The error is always
an undercount.

## Read path — `GET /api/views`

`src/worker/index.ts:56-65`

1. Build 24 keys by stepping back one hour at a time (`:57`, `:29-35`).
2. `Promise.all` of 24 parallel `KV.get` calls (`:58`).
3. Sum, treating missing/unparseable as 0 (`:59`).
4. Return `{ count, visible, threshold }` with `Cache-Control: public, max-age=60`
   (`:61-64`).

One page view therefore costs **1 KV write + 24 KV reads**. Against the free-tier
caps reproduced at `.claude/agents/end-session.md:135-141`, writes (1,000/day) bind
long before reads (100,000/day).

## Bot filtering

Ten case-insensitive regexes — `bot`, `crawler`, `spider`, `curl`, `wget`,
`python-requests`, `^Go-http-client`, `uptimerobot`, `pingdom`, `headlesschrome`
(`src/worker/index.ts:11-22`).

A **missing** User-Agent counts as a bot and is skipped
(`src/worker/index.ts:38`) — fail-closed, which protects the write quota at the
cost of dropping privacy-tool traffic.

## Visibility gate

`PUBLIC_THRESHOLD = 0` (`src/worker/index.ts:9`) and the test is `total >= 0`
(`:60`), so `visible` is always `true` today. The comment at `:7-8` states the
intent: raise it later to hide the number until it clears a floor. The client
already honours it by deleting the whole element when `visible` is false
(`src/components/PageViewCounter.astro:27-30`).

## Client

`src/components/PageViewCounter.astro:13-39` — a plain `is:inline` IIFE, no
framework, no hydration directive.

- Fires `POST /api/track` fire-and-forget, swallowing errors (`:21`).
- Fetches `/api/views`, then either removes the element or writes the count and
  adds `.is-ready` to trigger the CSS fade-in (`:24-37`).
- **Fails silently by design:** any rejected fetch, non-OK status, or
  `visible: false` removes the element entirely (`:28-29`, `:35-37`). A broken
  counter looks like no counter, not like a zero.
- `:17` declares `const window = line?.querySelector(...)`, shadowing the global
  `window` inside the IIFE. Nothing in the script uses the global, so this is
  inert — but it is a name collision a reader will trip over.

Accessibility: the value container carries `aria-live="polite"` (`:4`), the
placeholder dot is `aria-hidden` (`:5`), and the transition is disabled under
`prefers-reduced-motion` (`:109-111`).

## Where it is mounted

Only on the landing page — imported at `src/pages/index.astro:3` and placed at
`:19`. No other route renders it, so no other route issues KV traffic.
