# Subsystem — Build and Deploy

**Files:** `package.json`, `astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`,
`worker-configuration.d.ts`, `.nvmrc`

Two commands, one artifact, no CI.

## Scripts

`package.json:8-14`

| Script | Command | Notes |
|---|---|---|
| `dev` | `astro dev` | Astro only — the Worker does not run, so `/api/*` 404s (`.claude/agents/end-session.md:109-115`) |
| `build` | `astro build` | Emits `dist/` |
| `preview` | `astro preview` | Same limitation as `dev` |
| `astro` | `astro` | CLI passthrough |
| `smoke` | `node scripts/smoke.mjs` | Builds, boots `wrangler dev --local`, asserts 28 checks across all routes, both API endpoints, the bot filter, the counter round-trip, and the shared constants |
| `deploy` | `astro build && wrangler deploy` | The only path to production |

There is no `lint` or `typecheck` script. `npx wrangler deploy --dry-run`
is used as a bundle-validation gate instead (`.claude/agents/end-session.md:99-104`).

## Dependencies

`package.json:15-20` — exactly two: `astro ^7.2.2` (runtime dep) and
`wrangler ^4.123.0` (dev dep). Lockfile is `lockfileVersion 3`. No framework
integrations, no CSS toolchain, no test runner.

Node is pinned twice: `engines.node >= 22.12.0` (`package.json:5-7`) and `.nvmrc:1`
(`22`).

## Astro configuration

`astro.config.mjs:5` is `defineConfig({})` — completely empty. Every behavior is
an Astro default: static output, `dist/` as the output directory, `src/pages/`
as the route root, directory-style URLs. **UNVERIFIED** — these are Astro's
documented defaults, not settings read from this repo. `dist/` being the output
dir is corroborated only indirectly, by `wrangler.jsonc:7` pointing the assets
binding at `./dist` and `.gitignore:2` ignoring it.

`tsconfig.json:1-5` extends `astro/tsconfigs/strict`, includes `.astro/types.d.ts`
and `**/*`, and excludes `dist`.

## Wrangler configuration

`wrangler.jsonc:1-15`, all 15 lines:

```jsonc
name: "pascalrhee-com"                 // :3
compatibility_date: "2026-08-17"       // :4
main: "src/worker/index.ts"            // :5
assets: { directory: "./dist", binding: "ASSETS" }   // :6-9
kv_namespaces: [{ binding: "VIEWS_KV", id: "a692e1…" }]  // :10-15
```

Wrangler bundles the TypeScript entry itself — there is no separate esbuild or
tsc step in the pipeline.

**What is absent and matters:** no `routes`, no `custom_domain`, no
`workers_dev` flag, no `observability`, no `compatibility_flags`, no
`preview_id` on the KV namespace, no environments. The mapping from
`pascalrhee.com` (claimed at `README.md:5`) to this Worker exists only in the
Cloudflare dashboard.

## Generated types

`worker-configuration.d.ts` is produced by `wrangler types` (`:2`) against
`workerd@1.20260811.1` (`:3`) and is 15,174 lines, almost all of it ambient
runtime types. The project-specific part is eleven lines:

```ts
interface __BaseEnv_Env {
  VIEWS_KV: KVNamespace;
  ASSETS: Fetcher;
}
```
`worker-configuration.d.ts:4-11`

It is committed, so regenerating it after a `wrangler.jsonc` binding change is a
manual step with no automation guarding it.

## What is not here

- **No CI.** No `.github/` directory exists — no Actions, no scheduled workflows,
  no deploy-on-push from this repository.
- **No build hooks.** Nothing runs on `postinstall` or `prepare`.
- **No environments or staging.** One Worker name, one KV namespace, no
  `[env.*]` blocks.

Deploys are therefore always a human typing `npm run deploy` after
`wrangler login` (`README.md:22-28`).

## Ignored paths

`.gitignore` covers build output `dist/` (`:2`), generated `.astro/` (`:4`),
`node_modules/` (`:7`), wrangler local state `.wrangler/` (`:10`), `.env` and
`.env.production` (`:20-21`), `.DS_Store` (`:24`), and `.Rhistory` (`:30`).
