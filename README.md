# pascalrhee.com

Pascal Rhee's personal website — a home for writing, projects, and whatever accumulates.

Live at [pascalrhee.com](https://pascalrhee.com).

## Stack

- **[Astro](https://astro.build)** — static site generator; builds HTML at compile time, ships zero JavaScript by default
- **[Cloudflare Workers with Assets](https://developers.cloudflare.com/workers/static-assets/)** — global edge hosting
- **[wrangler](https://developers.cloudflare.com/workers/wrangler/)** — Cloudflare's CLI, used here for local dev and deploys

## Local development

```
npm install
npm run dev
```

Dev server at `http://localhost:4321` with hot reload.

## Deploy

```
npm run deploy
```

Builds with Astro (output to `dist/`) and uploads to the `pascalrhee-com` Cloudflare Worker via wrangler. Requires `wrangler login` first.

## Repo layout

- `src/pages/` — one file per URL route
- `src/layouts/` — shared page shells (slot pattern)
- `wrangler.jsonc` — Cloudflare Worker deploy config
- `astro.config.mjs` — Astro build config
- `journal/`, `plans/` — session notes from building this in public
- `CLAUDE.md` — collaboration notes for working on this repo with Claude Code
