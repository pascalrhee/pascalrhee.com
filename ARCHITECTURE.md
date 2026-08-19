# Architecture — pascalrhee.com

A static Astro site compiled to `dist/`, served by a single Cloudflare Worker that
also hosts a two-endpoint page-view API backed by Workers KV. One build artifact,
one deploy, one runtime.

Every claim below cites `path:line`. Lines marked **UNVERIFIED** were inferred
from framework/platform defaults or from prose in the repo, not read from code
in this repository.

---

## 1. Entry points

| # | Entry point | Defined at | Triggered by |
|---|---|---|---|
| 1 | `default.fetch(request, env)` — the Worker | `src/worker/index.ts:67-74` | Every inbound HTTP request to the deployed Worker |
| 2 | `/` | `src/pages/index.astro:1-57` | Build-time route → `dist/index.html` (**UNVERIFIED** — `dist/` is gitignored at `.gitignore:2`; filename convention inferred from Astro's static output) |
| 3 | `/about/` | `src/pages/about.astro:1-365` | Build-time route |
| 4 | `/writing/` | `src/pages/writing/index.astro:1-204` | Build-time route |
| 5 | `/writing/first-look/` | `src/pages/writing/first-look.astro:1-67` | Build-time route |
| 6 | `/projects/` | `src/pages/projects/index.astro:1-256` | Build-time route |
| 7 | `POST /api/track` | `src/worker/index.ts:70` → `src/worker/index.ts:42-54` | Inline browser script on any page rendering the counter (`src/components/PageViewCounter.astro:21`) |
| 8 | `GET /api/views` | `src/worker/index.ts:71` → `src/worker/index.ts:56-65` | Same inline script (`src/components/PageViewCounter.astro:24`) |
| 9 | `npm run build` | `package.json:11` | Developer / deploy script |
| 10 | `npm run deploy` | `package.json:13` — `astro build && wrangler deploy` | Developer, manually |
| 11 | `npm run dev` | `package.json:9` — `astro dev` | Developer. Does **not** run the Worker, so `/api/*` is absent in this mode (`.claude/agents/end-session.md:109-115`) |
| 12 | `/end-session` slash command | `.claude/commands/end-session.md:1-98` | Developer typing the command in Claude Code |

There is no `public/` directory and no separate static asset source — the only
non-generated static asset is an inline SVG favicon data-URI at
`src/layouts/BaseLayout.astro:26`.

---

## 2. Modules and responsibilities

### Runtime code

| Module | Responsibility (one sentence) |
|---|---|
| `src/worker/index.ts` | The only server-side code: routes `/api/track` and `/api/views` to KV-backed handlers and delegates everything else to the static-assets binding (`src/worker/index.ts:67-74`). |
| `src/components/PageViewCounter.astro` | Renders the "Attendance" counter markup, then an inline browser script fires the track call and paints the 24-hour total, removing itself on any failure (`src/components/PageViewCounter.astro:3-39`). |

### Page shells

| Module | Responsibility |
|---|---|
| `src/layouts/BaseLayout.astro` | The global HTML document — head, fonts, the entire global stylesheet and design tokens, masthead, section nav, footer, and a `<slot />` for page content (`src/layouts/BaseLayout.astro:19-357`). |
| `src/layouts/ProseLayout.astro` | Wraps `BaseLayout` to add article chrome — date/reading-time kicker, title, dek, byline, and scoped typography for slotted prose (`src/layouts/ProseLayout.astro:26-59`). |

### Routes

| Module | Responsibility |
|---|---|
| `src/pages/index.astro` | Landing page: masthead copy, the view counter, and a four-row "syllabus" definition list (`src/pages/index.astro:5-27`). |
| `src/pages/about.astro` | Colophon page carrying a hand-authored inline SVG architecture diagram and a stack rationale list (`src/pages/about.astro:33-174`). |
| `src/pages/writing/index.astro` | Post index rendered from a hardcoded in-file array, with two entries flagged `disabled` so they render unlinked as "Draft" (`src/pages/writing/index.astro:5-29`, `:53-75`). |
| `src/pages/writing/first-look.astro` | The single real post, authored as HTML inside `ProseLayout` (`src/pages/writing/first-look.astro:4-67`). |
| `src/pages/projects/index.astro` | Project index rendered from a hardcoded typed array with a `Status` → label/class map (`src/pages/projects/index.astro:4-51`, `:69-98`). |

### Configuration

| Module | Responsibility |
|---|---|
| `astro.config.mjs` | Empty config — everything is Astro defaults (`astro.config.mjs:5`). |
| `wrangler.jsonc` | Declares the Worker name, entry module, the `ASSETS` binding pointed at `./dist`, and the `VIEWS_KV` namespace (`wrangler.jsonc:1-15`). |
| `package.json` | Scripts and the two dependencies — `astro` and `wrangler` (`package.json:8-20`). |
| `tsconfig.json` | Extends `astro/tsconfigs/strict`, excludes `dist` (`tsconfig.json:1-5`). |
| `worker-configuration.d.ts` | Wrangler-generated ambient types; declares `Env` with `VIEWS_KV: KVNamespace` and `ASSETS: Fetcher` (`worker-configuration.d.ts:4-11`). |
| `.nvmrc` | Pins Node 22 (`.nvmrc:1`), matching `engines.node >=22.12.0` (`package.json:5-7`). |

### Non-shipping (repo tooling and records)

| Module | Responsibility |
|---|---|
| `.claude/agents/end-session.md` | Six-phase subagent definition for the end-of-session wrap-up ritual (`.claude/agents/end-session.md:22`, `:49`, `:83`, `:180`, `:262`, `:289`). |
| `.claude/commands/end-session.md` | Slash command that writes the session summary, runs `/security-review`, then delegates to the agent (`.claude/commands/end-session.md:12`, `:34`, `:70`, `:86`). |
| `CLAUDE.md` | Collaboration instructions — teaching altitude, decision protocol, free-tier cost constraint, session-record rules. |
| `AGENTS.md` | Astro-specific agent guidance; recommends `astro dev --background` (`AGENTS.md:3-9`). |
| `plans/`, `journal/` | One file per session, `YYYY-MM-DD-short-slug.md`, shaped by `plans/TEMPLATE.md` and `journal/TEMPLATE.md`. |
| `previews/index.html` | A 1508-line self-contained comparison of five rejected/accepted visual directions, kept as a design record (`previews/index.html:1007-1014`). |
| `.vscode/launch.json` | Debug config launching `astro dev` (`.vscode/launch.json:5`). |
| `.claude/settings.local.json` | Local permission allowlist for git/gh Bash calls (`.claude/settings.local.json:2-12`). |

---

## 3. Call graph

Build time:

```
npm run build (package.json:11)
  └── astro build ── reads astro.config.mjs:5 (defaults)
        └── src/pages/*.astro
              ├── index.astro:2 ──────► layouts/BaseLayout.astro
              │   index.astro:3 ──────► components/PageViewCounter.astro
              ├── about.astro:2 ──────► layouts/BaseLayout.astro
              ├── projects/index.astro:2 ──► layouts/BaseLayout.astro
              ├── writing/index.astro:2 ───► layouts/BaseLayout.astro
              └── writing/first-look.astro:2 ──► layouts/ProseLayout.astro
                                                   └── ProseLayout.astro:2 ──► BaseLayout.astro
        └── emits dist/   (UNVERIFIED — output dir is the Astro default; not
                           configured in astro.config.mjs and gitignored)
```

Deploy:

```
npm run deploy (package.json:13)
  ├── astro build            → dist/
  └── wrangler deploy        → reads wrangler.jsonc:1-15
        ├── bundles main: src/worker/index.ts   (wrangler.jsonc:5)
        ├── uploads ./dist behind binding ASSETS (wrangler.jsonc:6-9)
        └── binds KV id a692e1e…c453ec as VIEWS_KV (wrangler.jsonc:10-15)
```

Runtime:

```
Browser request
  └── default.fetch (src/worker/index.ts:68)
        ├── url.pathname === "/api/track"  (:70) ──► handleTrack (:42)
        │       ├── reject non-POST → 405            (:43-45)
        │       ├── isBotUA(User-Agent) → 204 no-op   (:46-48, :37-40)
        │       ├── hourBucketKey(new Date())         (:49, :24-27)
        │       ├── env.VIEWS_KV.get(key)             (:50)
        │       └── env.VIEWS_KV.put(key, n+1, ttl)   (:52)
        │
        ├── url.pathname === "/api/views"  (:71) ──► handleViews (:56)
        │       ├── last24HourKeys(new Date())        (:57, :29-35)
        │       ├── Promise.all(24 × KV.get)          (:58)
        │       └── Response.json({count,visible,threshold}) (:61-64)
        │
        └── everything else ──► env.ASSETS.fetch(request)  (:72)

Client (only on pages that mount PageViewCounter — currently just "/"):
  IIFE (src/components/PageViewCounter.astro:14)
    ├── fetch POST /api/track, errors swallowed        (:21)
    └── fetch GET /api/views                            (:24)
          ├── !visible → line.remove()                  (:27-30)
          ├── set textContent, add .is-ready            (:31-33)
          └── any rejection → line.remove()             (:35-37)
```

---

## 4. Data flow

**The only persisted state in the system is the view counter.**

- **Key shape:** `views:YYYY-MM-DDTHH`, derived by slicing the first 13 chars of a
  UTC ISO string, so buckets are UTC hours (`src/worker/index.ts:24-27`).
- **Value shape:** a base-10 integer string (`src/worker/index.ts:52`), parsed
  back with `parseInt(…, 10)` and defaulting to 0 when absent
  (`src/worker/index.ts:51`, `:59`).
- **TTL:** `(24 + 6) * 3600` = 108,000 s ≈ 30 h (`src/worker/index.ts:4-5`,
  applied at `:52`). The 6-hour margin means buckets outlive the read window.
- **Read window:** `handleViews` builds exactly 24 keys by stepping back one hour
  at a time from now and sums them (`src/worker/index.ts:29-35`, `:57-59`) — a
  rolling 24 h total, not a calendar day.
- **Write pattern:** get-then-put with no compare-and-set, so concurrent requests
  landing in the same hour bucket can overwrite each other's increment
  (`src/worker/index.ts:50-52`). Undercount, never overcount.
- **Bot filtering:** ten case-insensitive UA regexes; a *missing* User-Agent is
  also treated as a bot and skipped (`src/worker/index.ts:11-22`, `:37-40`).
- **Visibility gate:** `PUBLIC_THRESHOLD` is `0` (`src/worker/index.ts:9`), and
  the check is `total >= PUBLIC_THRESHOLD` (`:60`), so `visible` is currently
  always `true`; the constant exists to be raised later (`:7-8`).
- **Caching:** `/api/views` responses carry `Cache-Control: public, max-age=60`
  (`src/worker/index.ts:63`). `/api/track` returns 204 with no body
  (`:47`, `:53`).

No cookies, no sessions, no user identifiers, no request bodies are read
anywhere — `handleTrack` never touches `request.body`
(`src/worker/index.ts:42-54`). The counter counts page loads, not unique
visitors.

Page content is not data-driven: post and project lists are literal arrays
compiled into HTML at build time (`src/pages/writing/index.astro:5-29`,
`src/pages/projects/index.astro:16-45`). There is no CMS, no content collection,
and no database. The `writing/index.astro:4` comment marks content collections
as the intended replacement.

---

## 5. External services and credentials

| Service | Used for | Where declared | Credentials |
|---|---|---|---|
| Cloudflare Workers | Runtime host for both static assets and the API | `wrangler.jsonc:3-9` | `wrangler login` session, per `README.md:28`. No token is stored in the repo. |
| Cloudflare Workers KV | The `VIEWS_KV` namespace, id `a692e1e48f854fcb9514184fb2c453ec` | `wrangler.jsonc:10-15` | Same wrangler auth. The namespace id is explicitly *not* a secret (`.claude/agents/end-session.md:159-160`). |
| Google Fonts | EB Garamond, EB Garamond SC, IBM Plex Mono, loaded from `fonts.googleapis.com` with a preconnect to `fonts.gstatic.com` | `src/layouts/BaseLayout.astro:27-29` | None. Third-party request on every page load. |
| Google Fonts (previews only) | Fraunces, JetBrains Mono, Newsreader, Bricolage Grotesque, plus the above | `previews/index.html:7-12` | None. Not part of the deployed site. |
| GitHub | Public source repo `github.com/pascalrhee/pascalrhee.com` | Linked at `src/pages/about.astro:25` and `src/pages/projects/index.astro:25` | `gh` CLI auth, allowlisted at `.claude/settings.local.json:4`, `:9`. |

**No secrets, `.env` files, or API tokens exist in the repository.** `.env` and
`.env.production` are gitignored (`.gitignore:20-21`), and the Worker reads only
two bindings — `VIEWS_KV` and `ASSETS` — both declared in
`worker-configuration.d.ts:5-6` and neither of which is a credential.

### Free-tier limits that constrain the design

Reproduced from `.claude/agents/end-session.md:135-141` — **UNVERIFIED** against
Cloudflare's current published pricing; this is a repo document, not a live
source.

| Resource | Cap |
|---|---|
| Workers requests | 100,000/day |
| Workers CPU | 10 ms/request |
| KV reads | 100,000/day |
| KV writes | 1,000/day |
| KV storage | 1 GB |

The binding constraint is KV **writes**: every non-bot page load of `/` issues
one `POST /api/track` (`src/components/PageViewCounter.astro:21`) which performs
one `KV.put` (`src/worker/index.ts:52`). Each `GET /api/views` costs 24 KV reads
(`src/worker/index.ts:58`). This is called out as the live exposure at
`.claude/commands/end-session.md:55-59`.

---

## 6. Scheduled work and webhooks

**There are none.**

- No `cron` / `triggers` / `queues` / `routes` keys in `wrangler.jsonc`
  (verified: the file is 15 lines, `wrangler.jsonc:1-15`).
- The Worker exports only `fetch` — no `scheduled`, `queue`, `email`, or `tail`
  handler (`src/worker/index.ts:67-74`).
- No `.github/` directory exists, so there is no GitHub Actions CI, no scheduled
  workflow, and no push-triggered deploy from this repository.
- Deploys are manual: a human runs `npm run deploy` (`package.json:13`,
  `README.md:22-28`).

The one time-based behavior in the system is KV's own TTL expiry, which is
declarative rather than scheduled — keys self-delete ~30 h after their last write
(`src/worker/index.ts:5`, `:52`).

---

## 7. Subsystem pages

| Page | Covers |
|---|---|
| [docs/subsystems/edge-worker.md](docs/subsystems/edge-worker.md) | Request routing and the assets fallthrough |
| [docs/subsystems/view-counter.md](docs/subsystems/view-counter.md) | KV bucket scheme, bot filter, client script |
| [docs/subsystems/page-shell.md](docs/subsystems/page-shell.md) | `BaseLayout`, `ProseLayout`, design tokens, nav |
| [docs/subsystems/content-routes.md](docs/subsystems/content-routes.md) | The five pages and their hardcoded data |
| [docs/subsystems/build-and-deploy.md](docs/subsystems/build-and-deploy.md) | Astro → `dist/` → wrangler pipeline |
| [docs/subsystems/session-records.md](docs/subsystems/session-records.md) | `plans/`, `journal/`, templates |
| [docs/subsystems/agent-harness.md](docs/subsystems/agent-harness.md) | `.claude/` agent + command, `CLAUDE.md`, `AGENTS.md` |
| [docs/subsystems/design-previews.md](docs/subsystems/design-previews.md) | `previews/index.html` |

---

## 8. Open questions — not answerable from the code alone

**Deployment and hosting**

1. How does `pascalrhee.com` reach this Worker? `wrangler.jsonc` declares no
   `routes` and no custom domain (`wrangler.jsonc:1-15`), yet `README.md:5` says
   the site is live at that hostname. The binding must exist in the Cloudflare
   dashboard, but nothing in the repo records it.
2. Is `workers.dev` enabled, disabled, or irrelevant? Not configured either way.
3. Is any git-connected auto-deploy (Cloudflare Workers Builds) wired to the
   GitHub repo? The absence of `.github/` rules out Actions, but a
   dashboard-side integration would leave no trace here. This matters: it is the
   assumption the "merging is not deploying" reasoning rests on, and that journal
   entry flags the same risk itself
   (`journal/2026-08-18-auto-merge-reverted.md:12-15`, `:49-52`).
4. Which Cloudflare account owns Worker `pascalrhee-com` and KV namespace
   `a692e1e48f854fcb9514184fb2c453ec`, and is there a separate staging namespace?
   No `preview_id` is set (`wrangler.jsonc:10-15`), so what `wrangler dev` binds
   locally is undetermined from the repo.
5. Is Workers observability / logging enabled? No `observability` key in
   `wrangler.jsonc`.

**Behavior the code leaves ambiguous**

6. Why is `PUBLIC_THRESHOLD` set to `0` when the surrounding code exists to hide
   the number below a threshold (`src/worker/index.ts:7-9`)? Was a value chosen
   and reverted, or never chosen?
7. Is there any rate limiting or WAF rule in front of `POST /api/track`? The
   Worker itself has none beyond the UA check (`src/worker/index.ts:42-54`), and
   the endpoint is unauthenticated and writes to KV — the exact quota-exhaustion
   exposure named at `.claude/commands/end-session.md:55-58`. Any protection
   would be dashboard-side.
8. Is the non-atomic get-then-put increment (`src/worker/index.ts:50-52`) an
   accepted tradeoff or an unnoticed one? Nothing in the code says.
9. `src/components/PageViewCounter.astro:17` binds a local `const window` that
   shadows the global inside the IIFE. Deliberate (the script never needs the
   global) or accidental? Not answerable from the code.

**Content and roadmap**

10. What replaces the hardcoded arrays — Astro content collections, as
    `src/pages/writing/index.astro:4` and `src/pages/projects/index.astro:15`
    both suggest? No timeline or decision is recorded in code.
11. `writing/index.astro:14-28` lists two `disabled` posts with real titles and
    past dates. Are these planned drafts or pure lorem?
12. There is no `robots.txt`, `sitemap.xml`, `og:image`, or canonical URL
    anywhere in `BaseLayout.astro:21-29`. Deliberate, given SEO is last on
    `CLAUDE.md`'s priority list, or simply not reached yet?

**Repo hygiene**

13. `.Rhistory` and `plans/.Rhistory` exist and are gitignored (`.gitignore:30`)
    — where do they come from? Nothing in this repo runs R.
14. `previews/index.html` is committed as a design record, but is it meant to be
    served? It sits outside `src/`, so Astro does not build it, and it is not in
    `dist/` — meaning it is repo-only. Confirmed by absence, not by any stated
    intent.
15. Five local branches and ten remote branches exist (plus `origin/HEAD`),
    including `cloudflare/workers-autoconfig` from a bot. Which are live work and
    which are dead? Git history alone does not say.
