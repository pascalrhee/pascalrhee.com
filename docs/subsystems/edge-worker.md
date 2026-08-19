# Subsystem — Edge Worker

**File:** `src/worker/index.ts` (74 lines) · **Config:** `wrangler.jsonc`

The only server-side code in the project. It is a three-branch router: two API
paths it handles itself, and everything else handed to Cloudflare's static-assets
service.

## Shape

```ts
export default {
  async fetch(request, env) { ... }
} satisfies ExportedHandler<Env>
```
`src/worker/index.ts:67-74`

Only `fetch` is exported. There is no `scheduled`, `queue`, `email`, or `tail`
handler, so the Worker is purely request-driven (`src/worker/index.ts:67-74`).

## Routing

| Match | Handler | Line |
|---|---|---|
| `url.pathname === "/api/track"` | `handleTrack(request, env)` | `src/worker/index.ts:70` |
| `url.pathname === "/api/views"` | `handleViews(env)` | `src/worker/index.ts:71` |
| anything else | `env.ASSETS.fetch(request)` | `src/worker/index.ts:72` |

Matching is exact string equality on `pathname` after `new URL(request.url)`
(`src/worker/index.ts:69`) — no prefix matching, no trailing-slash tolerance, no
method-based routing at the top level. `/api/track/` or `/api/views?x=1` behave
differently from each other here: the query string is stripped by `pathname`, but
a trailing slash is not, so `/api/track/` falls through to `ASSETS`.

Method checking happens inside the handler, not the router — `handleTrack`
returns `405 Method not allowed` for anything but POST
(`src/worker/index.ts:43-45`). `handleViews` never checks the method at all
(`src/worker/index.ts:56`), so `POST /api/views` returns the same JSON as GET.

## The assets fallthrough

`env.ASSETS` is a `Fetcher` (`worker-configuration.d.ts:6`) bound to the `./dist`
directory (`wrangler.jsonc:6-9`). Passing the original `Request` through unchanged
means Cloudflare's asset server owns 404s, content types, ETags, and
directory-index resolution — none of that logic lives in this repo.

This is the "one artifact" property the site's own copy advertises: the static
HTML and the API ship in the same deploy
(`src/pages/writing/first-look.astro:44-46`, `src/pages/about.astro:130-140`).

## Bindings

Declared in `wrangler.jsonc:6-15`, typed in `worker-configuration.d.ts:4-11`:

- `ASSETS: Fetcher` — the built `dist/` directory
- `VIEWS_KV: KVNamespace` — namespace id `a692e1e48f854fcb9514184fb2c453ec`

No secrets, no vars, no other bindings.

## Notable properties

- **Unauthenticated write path.** `/api/track` is reachable by anyone and writes
  to KV (`src/worker/index.ts:52`). The only gate is the User-Agent filter
  (`src/worker/index.ts:46-48`). See `view-counter.md`.
- **No error handling around KV.** A KV failure in either handler throws out of
  `fetch` rather than degrading (`src/worker/index.ts:50-52`, `:58`). The client
  absorbs this by removing itself on any non-OK response
  (`src/components/PageViewCounter.astro:35-37`).
- **`astro dev` does not run this file.** Local verification of anything API-shaped
  requires `wrangler dev` on port 8787 — a trap documented at
  `.claude/agents/end-session.md:109-115`.
