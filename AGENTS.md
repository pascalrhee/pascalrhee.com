## Development

Pick the server by what you are changing.

**Pages, styling, layout** — Astro alone is enough:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

**Anything touching `/api/*` or the view counter** — `astro dev` does not run the
Worker, so the API 404s and the counter deletes itself from the page. That failure
is silent and looks like a styling bug. Use wrangler instead:

```
npm run build && npx wrangler dev --local
```

Serves the built site plus the Worker and a local KV namespace on :8787.
`--local` keeps KV local, so the free-tier write quota is never touched.

## Verification

```
npm run smoke
```

Asserts all five routes, both API endpoints, the bot filter, and a real KV
round-trip against `wrangler dev --local`. Run it before proposing a change to
`src/worker/` or the counter.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
