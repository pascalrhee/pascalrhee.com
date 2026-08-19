# pascalrhee.com

Pascal Rhee's personal website — a home for writing, projects, and whatever accumulates.

Live at [pascalrhee.com](https://pascalrhee.com).

## Stack

- **[Astro](https://astro.build)** — static site generator; builds HTML at compile time, ships zero JavaScript by default
- **[Cloudflare Workers with Assets](https://developers.cloudflare.com/workers/static-assets/)** — global edge hosting
- **[wrangler](https://developers.cloudflare.com/workers/wrangler/)** — Cloudflare's CLI, used here for local dev and deploys

## Local development

Two dev servers, and the difference matters:

```
npm install
npm run dev        # Astro only, http://localhost:4321
```

`astro dev` serves the pages with hot reload but **does not run the Worker**, so
`/api/track` and `/api/views` 404 and the view counter silently removes itself.
Fine for typography and layout; wrong for anything touching the API.

```
npx wrangler dev --local    # full stack, http://localhost:8787
```

`wrangler dev` runs the Worker, the assets binding, and a local KV namespace, so
the counter behaves as it does in production. `--local` keeps KV local and never
touches the free-tier quota. Run `npm run build` first — it serves `dist/`.

## Tests

```
npm run smoke
```

Builds, boots `wrangler dev --local`, and asserts on all five routes, both API
endpoints, the bot filter, and a real KV round-trip. Node built-ins only, no
dependencies, no network spend.

## Deploy

```
npm run deploy
```

Builds with Astro (output to `dist/`) and uploads to the `pascalrhee-com` Cloudflare Worker via wrangler. Requires `wrangler login` first.

## Repo layout

- `src/pages/` — one file per URL route
- `src/layouts/` — shared page shells (slot pattern)
- `src/worker/` — the edge Worker: static assets plus `/api/track` and `/api/views`
- `src/lib/` — constants shared between the Worker and the pages that document it
- `scripts/smoke.mjs` — the end-to-end verification run by `npm run smoke`
- `wrangler.jsonc` — Cloudflare Worker deploy config
- `astro.config.mjs` — Astro build config
- `ARCHITECTURE.md`, `docs/subsystems/` — how the whole thing fits together, cited to file:line
- `reports/` — dead-code analysis output and the harnesses that produced it
- `journal/`, `plans/` — session notes from building this in public
- `CLAUDE.md` — collaboration notes for working on this repo with Claude Code
