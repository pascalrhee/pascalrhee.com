# PRUNE.md — dead code candidates

Generated 2026-08-18. **Nothing was deleted.** Every row is a proposal.

Headline: this repo is remarkably clean. Zero unused dependencies, zero unused
files, zero import cycles, and every executable statement in the Worker runs
under a real request workload. The genuine dead code is **six CSS rules and two
custom properties** — roughly 40 lines of styling for markup that does not exist.

---

## How this was produced

| Question | Tool | Raw output |
|---|---|---|
| Unused deps | `depcheck` | `reports/depcheck.json` |
| Unused files / exports / deps | `knip` | `reports/knip.json` |
| Unused exported symbols | `ts-prune` | `reports/ts-prune.txt` |
| Import cycles | `madge` + manual edge enumeration | `reports/madge-circular.txt`, `reports/madge-graph.json`, `reports/import-edges.txt` |
| Worker line coverage | live workerd via CDP breakpoints | `reports/worker-line-coverage.txt`, `reports/worker-coverage.json` |
| CSS rule usage + client JS coverage | headless Chrome via CDP | `reports/css-coverage.json`, `reports/css-coverage-emulated.json`, `reports/css-coverage-raw-*.json` |

Harness scripts are in `reports/harness-*.mjs`. All tools ran via `npx`, so
`package.json` and `package-lock.json` were **not** modified. The only package
used from `node_modules` was `ws@8.21.0`, already vendored by wrangler.

**The end-to-end run was real**, not a test suite (this repo has no tests):
`npm run build`, then `wrangler dev --local` on :8787, then 20 HTTP requests
covering every route and branch, plus headless Chrome loading all 5 pages twice
(desktop, then 375px + `prefers-reduced-motion: reduce`). Verified round-trip:
`/api/views` went from `count:3` to `count:4` after a real-UA `POST /api/track`
(`reports/api-views-response.json`). Local KV only — no production writes, no
free-tier spend.

### Tool reliability — read before trusting the tables

- **`madge` is blind to `.astro`.** It reported "no circular dependency found",
  but `reports/madge-graph.json` shows all 9 files with **zero** edges — it
  parsed nothing. That result is vacuous. I re-derived the graph by hand from all
  7 `import` statements in the repo (`reports/import-edges.txt`): pages →
  layouts → `BaseLayout`, plus `ProseLayout` → `BaseLayout`. Strictly acyclic,
  confirmed by exhaustive enumeration rather than by madge.
- **`depcheck` could not parse `worker-configuration.d.ts`** (babel syntax error
  at line 12688, see `reports/depcheck.stderr.txt`). That file is generated and
  contains no imports, so the unused-dependency verdict still holds.
- **workerd does not implement `Profiler.startPreciseCoverage`.** I probed it —
  it returns `Profiler is not enabled`. So worker coverage is **breakpoint-hit
  evidence** instead: a breakpoint on every possible location, 1,746 recorded
  pauses across the workload. A hit is direct proof of execution.
- **Chrome's CSS rule-usage API never reports `@font-face` or `@keyframes` as
  used**, even when they demonstrably are. All 52 `@font-face` rules and all 3
  `@keyframes` blocks are false positives and are excluded below.

---

## Deletion candidates

| File | Symbol | Evidence | Confidence | Blast radius if I'm wrong |
|---|---|---|---|---|
| `src/layouts/BaseLayout.astro:33` | `--blue-deep: #0d1929` custom property | `grep -rn 'blue-deep' src/` returns only the declaration itself. Zero `var(--blue-deep)` references anywhere in the repo. | **High** | None visible. A CSS custom property with no `var()` consumer cannot affect rendering. Worst case you re-add one line when a dark surface is designed. |
| `src/layouts/BaseLayout.astro:39` | `--rule: #d7cfbc` custom property | Same: declaration only, no `var(--rule)` consumer. Borders use `var(--tan)` and `var(--blue)` instead. | **High** | None visible. Identical reasoning. |
| `src/layouts/BaseLayout.astro:297-300` | `.footer a` rule | Never matched across 5 pages in both desktop and mobile+reduced-motion runs. Confirmed structurally: the footer is two `<span>`s and contains no `<a>` on any built page (checked all 5 files in `dist/`). | **High** (unused today) / **Low** (safe to remove) | The footer is *designed* to hold links — `.footer .colophon` sits right beside it and `AGENTS.md`-era markup had them. Delete it and the first footer link you add renders with default `<a>` styling: wrong colour, wrong border. Cheap to notice, annoying to rediscover. |
| `src/layouts/BaseLayout.astro:301-303` | `.footer a:hover` rule | Same as above; no anchor exists to hover. | **High** (unused today) / **Low** (safe to remove) | Same as `.footer a`. These two should be treated as one unit. |
| `src/layouts/ProseLayout.astro:127-136` | `.post-title em, .post-title .italic` rule | Never matched. The only post's title is plain text: `<h1 class="post-title">A first look at the new place</h1>` — no `<em>`, no `.italic`. | **Medium** | High if wrong. This is the maize highlight-underline that defines the site's display typography (`BaseLayout.astro:222-233` does the same for `h1`). It is unused only because one post exists and its title has no emphasis. The next post that italicises a word in its title silently loses the house style. |
| `src/layouts/ProseLayout.astro:268-277` | `.post-body pre` rule | Never matched. `grep '<pre'` across all built HTML returns nothing — the single post has inline `<code>` but no code block. | **Medium** | High if wrong. Code blocks would render unstyled — no background, no left rule, and critically **no `overflow-x: auto`**, so a long line would blow out the layout on mobile. For a site whose author writes about builds, this is near-certain to be needed. |
| `src/layouts/ProseLayout.astro:278-282` | `.post-body pre code` rule | Same; resets the inline-code background inside `<pre>`. | **Medium** | Same as above, and dependent on it — if `.post-body pre` stays, this must stay too or code blocks get a doubled background. |
| `src/worker/index.ts:62` | `threshold: PUBLIC_THRESHOLD` field in the `/api/views` JSON | Emitted on every response, consumed by nobody. The only client destructures `{ count, visible }` (`src/components/PageViewCounter.astro:26`); `grep -rn threshold src/` finds no other reader. | **Medium** | Low functionally — but it is a *public* HTTP response field on a live endpoint. Anything outside this repo reading it (a bookmarklet, a future dashboard, curl in a notebook) breaks silently. It costs ~20 bytes/response and is useful for debugging why the counter is hidden. |
| `src/layouts/ProseLayout.astro:9,17` | `section` prop | No caller ever passes it — `first-look.astro` is the only consumer of `ProseLayout` and sets only `title`/`dek`/`date`/`readingTime`. Only the `'writing'` default is ever used. | **Low** | Real. Deleting the prop (rather than just the override path) hardcodes every future `ProseLayout` page into the "Writing" nav section. A project write-up or an About-section essay would light the wrong nav item. Keep it. |

### Explicitly *not* candidates, despite being flagged

| Flagged | By | Why it stays |
|---|---|---|
| `previews/index.html` (1,508 lines) | not built, not served, outside `src/` | Deliberate design record. Commit `c584bb2` — "Keep the five-direction preview as a design record" — is the decision that settled this. It preserves the four rejected directions, which git history alone would not make legible. |
| `worker-configuration.d.ts` (15,174 lines) | 99% of it never referenced | Generated by `wrangler types`. Only 8 lines are project-specific (`:4-11`), but the ambient runtime types are what make `tsconfig`'s `strict` mode meaningful for the Worker. Regenerate, never hand-edit. |
| `--paper-soft` | looks decorative | Actually used at `ProseLayout.astro:262,270` and `about.astro:277`. Not a candidate. |

---

## Flagged by tools, but actually reachable

Everything in this section was reported as unused by at least one tool. All of it
is live. This is the section that matters most — deleting any of it breaks the
site.

### 1. Framework entry points — reached by convention, never by import

- **`src/worker/index.ts:67` `export default`** — `ts-prune` reports it as an
  unused export. It is *the* Worker entry point. Cloudflare's runtime invokes
  `default.fetch(request, env)`; `wrangler.jsonc:5` names this file as `main`.
  Nothing in the repo imports it because nothing is supposed to. Proven live:
  1,746 breakpoint pauses inside it during the run.
- **`astro.config.mjs:5` `export default`** — `ts-prune` reports it as unused.
  Astro's CLI loads this file by filename convention at build time.
- **`Props` interface in `BaseLayout.astro:2` and `ProseLayout.astro:4`** —
  `knip` reports both as unused types. This is Astro's typing contract: the
  compiler binds `Astro.props` to the exported `Props` interface. It is consumed
  by the framework's generated types (`.astro/types.d.ts`), not by any `import`.
  Both are destructured one line later.

### 2. Config-driven bindings — injected, never constructed

- **`env.VIEWS_KV`** and **`env.ASSETS`** are never assigned anywhere in the
  source. They arrive from `wrangler.jsonc:6-15` at runtime, typed by
  `worker-configuration.d.ts:5-6`. Verified live: `wrangler dev` printed both
  bindings resolved in local mode, and the KV write path incremented a real
  counter value 3 → 4.

### 3. Routing — dispatch by string, invisible to static analysis

- **`handleTrack` and `handleViews`** are reached only through string comparison
  on `url.pathname` (`src/worker/index.ts:70-71`). No tool can connect the URL
  `/api/track` in `PageViewCounter.astro:21` to the function that serves it. Both
  were exercised: `POST /api/track` → 204, `GET /api/views` → 200.
- **The `env.ASSETS.fetch(request)` fallthrough** (`:72`) serves all 5 pages plus
  every hashed asset. It also handles paths that *look* like API routes:
  `GET /api/track/` (trailing slash) returned **404 from the asset server**, not
  405 — confirming the router's exact-match semantics.
- **`isBotUA` is called with 10 regexes that never appear in any test.** All 10
  are live: `Googlebot`, `curl/8.4.0`, `python-requests`, and
  `HeadlessChrome` UAs all correctly returned 204 without incrementing the
  counter. Notably, **headless Chrome's own UA is caught by the
  `/headlesschrome/i` pattern** — so the browser-driven part of this very
  analysis was bot-filtered, which is exactly the intended behaviour.

### 4. CSS reached by user or device state, not by markup

These never matched in a default desktop load, and a naive coverage run would
call them dead. Re-running with emulation matched all of them:

- **All `@media (width <= 640px)` blocks** — `about.astro`, `writing/index.astro`,
  `projects/index.astro`. Unmatched at desktop width; **all matched at 375px**.
  Rule usage went from 54→66 (about), 46→52 (writing), 51→57 (projects).
- **All `@media (prefers-reduced-motion: reduce)` blocks** — `BaseLayout.astro:322`,
  `PageViewCounter.astro:109`, `ProseLayout.astro:83`, `about.astro`. Unmatched
  by default; **all matched** once the media feature was emulated. These are the
  accessibility escape hatches `CLAUDE.md` treats as priority #2 — they are
  supposed to look unused most of the time.
- **Every `:hover` rule** — `a:hover`, `.footer a:hover`, `.post-body a:hover`,
  `.post-row-title:hover`, `.project-links a:hover`. Reached by pointer state,
  which a headless load never produces. (`.footer a:hover` is the exception that
  *is* dead — because no `.footer a` exists to hover in the first place.)
- **All 3 `@keyframes` blocks** (`rise`, `rise-about`, `rise-post`) and **all 52
  `@font-face` rules** — the CDP rule-usage API structurally never marks these
  used. The animations demonstrably run and the fonts demonstrably load.

### 5. Client error paths — reachable only on failure

V8 coverage of the inline counter script (`PageViewCounter.astro`) shows two
never-executed ranges. Both are error handlers, reached when the network or the
API fails:

- `() => {}` at offset 362 — the `.catch()` on the `/api/track` fetch (`:21`).
- `() => { line.remove(); }` at offset 857 — the `.catch()` on `/api/views`
  (`:35-37`). This is the "fail silently" behaviour: a broken counter renders as
  no counter.

A third path, `if (!visible) { line.remove(); }` (`:27-30`), is unreachable
*today* for a specific reason: `PUBLIC_THRESHOLD = 0` makes `total >= 0` always
true (`src/worker/index.ts:60`), so `visible` is never `false`. It becomes live
the moment the threshold is raised, which is what `:7-8` says it is for.

### 6. Not reached by cron or webhook — because none exist

Confirmed, not assumed: the Worker exports only `fetch` (no `scheduled`, `queue`,
`email`, or `tail` handler), `wrangler.jsonc` has no `triggers`/`crons`/`queues`/
`routes` keys, and there is no `.github/` directory. The only time-based
behaviour is KV's declarative ~30 h TTL (`src/worker/index.ts:5`), which is
config, not scheduled code.

### 7. CLI entry points

`package.json:8-14` defines five scripts. `dev`, `preview`, and `astro` are never
referenced by any other code — they are human entry points and are documented in
`README.md:13-28`. `deploy` is the only path to production. Do not prune scripts
on the grounds that nothing imports them.

---

## Coverage summary

**`src/worker/index.ts` — 26/36 breakpointable lines hit (72.2%).**
Full annotated listing: `reports/worker-line-coverage.txt`.

All 10 misses are artifacts, not dead code:

- **7 are function-declaration lines** (`function hourBucketKey(...) {`,
  `async function handleTrack(...) {`, `export default {`, …). Every one of those
  function *bodies* is covered.
- **4 are module-level initialisers** (`WINDOW_HOURS`, `BUCKET_TTL_SECONDS`,
  `PUBLIC_THRESHOLD`, `BOT_UA_PATTERNS`) which run once at worker startup —
  before the debugger attached and set breakpoints. They are proven live
  behaviourally: the KV write applied a TTL (needs `BUCKET_TTL_SECONDS`), the bot
  filter ran 41 times (needs `BOT_UA_PATTERNS`), and the visibility check
  evaluated (needs `PUBLIC_THRESHOLD`).

**The one genuinely untaken branch:** `src/worker/index.ts:38`, `if (!ua) return
true;`. The condition evaluated 6 times, but `return true` has **0 hits** — no
client in the workload omitted a User-Agent. It is reachable (a bare socket
request with no UA header hits it) and it is deliberately fail-closed, protecting
the 1,000 writes/day KV quota. Not dead; just untested.

**Client JS** — the counter script is fully covered apart from the two error
handlers and the `!visible` branch listed above.

**CSS** — after emulation: 36/40 rules used (BaseLayout), 13/13 (index inline),
35/36 (about), 16/17 (writing), 32/37 (first-look), 21/22 (projects). Every
remaining gap is enumerated in the table or in section 4.

---

## Suggested order, if you prune anything

1. `--blue-deep` and `--rule` (2 lines). No risk.
2. Stop there, honestly. The remaining six CSS rules total ~38 lines and every
   one of them is markup-shaped-hole rather than genuine cruft: they are styles
   waiting for a footer link, an italicised post title, and a code block — all
   three of which this site will plausibly have within a few posts. Deleting them
   trades 38 lines of dormant CSS for a future silent styling regression.
