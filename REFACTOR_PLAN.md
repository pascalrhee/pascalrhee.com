# REFACTOR_PLAN.md

Phase 1 deliverable. **No code has been written.** Eleven slices, ordered so risk
rises as verification gets stronger. Every slice preserves behavior — there are no
feature changes here.

---

## Read this first: the protocol has a missing precondition

The protocol asks for "the slice test command plus the full suite." **This repo has
no test suite.** No test runner, no test files, no `test` script
(`package.json:8-14`), no CI (`ARCHITECTURE.md` §6 — no `.github/`). PRUNE.md says
it outright: *"The end-to-end run was real, not a test suite (this repo has no
tests)."*

So "risk rises as the test suite gets stronger" has nothing to rise against yet.
What exists today is:

| Level | Command | Catches | Available |
|---|---|---|---|
| L0 | `npm run build` | Astro template + TS syntax errors, broken imports | now |
| L0 | `npx wrangler deploy --dry-run` | Worker bundle + binding resolution failures | now |
| L1 | `npm run smoke` | HTTP behavior of all 5 routes + both API endpoints, live | **Slice 0** |
| L2 | `npm run smoke -- --browser` | rendered DOM, computed styles, reduced-motion | **Slice 0** (opt-in) |

**Slice 0 builds L1/L2 before anything is touched.** That is the only reason the
ordering principle in the protocol can be honored at all.

The good news is that the verification already exists in prototype form. The
dead-code analysis left three working CDP harnesses in `reports/harness-*.mjs` that
drive `wrangler dev`, issue 20 branch-covering requests, and verify a real KV
round-trip (`count:3` → `count:4`). Slice 0 distills those into a maintained
`scripts/smoke.mjs`. **It needs no new dependencies** — `ws` is already vendored by
wrangler, per PRUNE.md.

### Two places I bend the protocol, declared up front

1. **Slice 0 has no pre-existing test to verify it.** Its own verification is that
   it passes against unmodified `HEAD` — that run is the baseline snapshot every
   later slice diffs against. Circular by necessity; there is no other way to
   bootstrap.
2. **Slices 4–8 are one conceptual change across seven files.** I split them per
   file to honor "touches one module," which costs five extra gates for mechanical
   work. See Gate Question 2 — you may prefer to collapse them.

---

## GATE QUESTIONS — answer these before I write any code

**Q1. How strong should the smoke test be?**

| Option | Cost | Catches |
|---|---|---|
| **A. Node-only** (recommended) | zero new deps; ~150 lines | every HTTP path, status codes, JSON shape, KV round-trip, bot filter |
| B. A + browser assertions | zero new deps, but needs a local Chrome binary; fragile in CI-that-doesn't-exist | A, plus computed styles and the reduced-motion escape hatches |
| C. A + `astro check` | **adds `@astrojs/check` + `typescript` as dev deps** | A, plus type errors inside `.astro` templates |

I recommend **A, with B available behind an opt-in flag**. C is the only option
that spends anything, and `.claude/agents/end-session.md:106-107` says not to
install dev dependencies just to run a check — so C is your call, not mine.

**Q2. Split or collapse the font-token slices (4–8)?** Split = five gates, each
diff ~15–30 lines, three of them parallel-safe. Collapsed = one gate, ~120-line
diff, still under the 200-line cap. I recommend **split**, because small gates are
the entire point of this protocol and splitting is what makes parallelism real.

**Q3. Is Slice 10 in or out?** It is the only slice whose failure mode is severe
(a blank-looking page) and the only one where I am genuinely unsure of the
framework semantics. I recommend **deferring it** unless you want the cleanup.

---

## Slice table

| # | Slice | Files | Diff | Risk | Concurrency |
|---|---|---|---|---|---|
| 0 | Verification harness | `scripts/smoke.mjs` (new), `package.json` | ~160 | none (additive) | **SERIAL** — gate-opener |
| 1 | Delete 2 dead custom properties | `BaseLayout.astro` | 2 | none | **SERIAL** (shares file with 4) |
| 2 | Fix stale dev-server docs | `README.md`, `AGENTS.md` | ~20 | none (docs) | **PARALLEL_SAFE** |
| 3 | Fix `window` shadowing | `PageViewCounter.astro` | ~4 | very low | **SERIAL** (shares file with 6) |
| 4 | Define font tokens, adopt in BaseLayout | `BaseLayout.astro` | ~25 | low | **SERIAL** (shares file with 1) |
| 5 | Adopt font tokens in ProseLayout | `ProseLayout.astro` | ~28 | low | **PARALLEL_SAFE** after 4 |
| 6 | Adopt font tokens in counter + landing | `PageViewCounter.astro`, `index.astro` | ~10 | low | **SERIAL** (shares file with 3) |
| 7 | Adopt font tokens in writing index | `writing/index.astro` | ~10 | low | **PARALLEL_SAFE** after 4 |
| 8 | Adopt font tokens in about + projects | `about.astro`, `projects/index.astro` | ~30 | low | **SERIAL** (shares files with 9) |
| 9 | Extract counter constants to a shared module | `src/lib/counter.ts` (new), `worker/index.ts`, `about.astro`, `projects/index.astro` | ~60 | **medium** — touches runtime | **SERIAL** |
| 10 | Consolidate three near-identical rise animations | `BaseLayout.astro`, `ProseLayout.astro`, `about.astro` | ~40 | **high** | **SERIAL** — do last or not at all |

Risk is monotonic: additive → docs → dead lines → mechanical substitution →
runtime code → framework semantics.

---

## Slice detail

### Slice 0 — Verification harness · SERIAL · ~160 lines

**Changes:** adds `scripts/smoke.mjs` and a `smoke` script to `package.json`.
Distilled from `reports/harness-worker-coverage.mjs` and `harness-css-coverage.mjs`
— starts `wrangler dev --local`, waits for readiness, issues the branch-covering
request set, asserts, tears down. No source file is touched.

**Asserts:** all 5 routes return 200 with expected markers; `POST /api/track`
returns 204 and increments; `GET /api/views` returns 200 with
`{count:number, visible:boolean}` and `Cache-Control: public, max-age=60`;
`GET /api/track` returns 405; `GET /api/track/` returns 404 (the exact-match
router semantics PRUNE.md confirmed); a `curl/8.4.0` UA returns 204 **without**
incrementing; a real-browser UA does increment.

**Test:** `npm run smoke` — must pass on unmodified `HEAD`.

**Could break:** port 8787 already in use by another session (this tree is shared
— `memory/session-workflow.md`); wrangler startup slower than the readiness
timeout; local KV state leaking between runs and breaking the increment assertion.

**How you'd notice:** the script exits non-zero with the failing assertion named.
The increment assertion is the fragile one — it must read `count` before and after
rather than expect an absolute value, or a re-run inside the same UTC hour fails
spuriously.

---

### Slice 1 — Delete two dead custom properties · SERIAL · 2 lines

**Changes:** removes `--blue-deep: #0d1929` (`BaseLayout.astro:33`) and
`--rule: #d7cfbc` (`:39`). Both are declared and never consumed — zero `var()`
references repo-wide, confirmed independently by my own grep and by PRUNE.md
("High" confidence, "no blast radius").

**Test:** `npm run smoke` + `npm run build`.

**Could break:** nothing renderable. A custom property with no consumer cannot
affect layout or paint.

**How you'd notice:** you wouldn't — which is the point. If a `var(--rule)`
existed somewhere I missed, that border would fall back to its initial value and
show as a missing/black line. Grep is exhaustive here; this is as safe as a change
gets.

---

### Slice 2 — Fix stale dev-server docs · PARALLEL_SAFE · ~20 lines

**Changes:** `README.md:13-28` documents `npm run dev` at :4321 as *the* local
workflow, and `AGENTS.md:3-9` recommends `astro dev --background`. Neither runs the
Worker, so `/api/*` 404s and the counter silently deletes itself. This trap already
cost one session (`.claude/agents/end-session.md:109-115`) and is flagged as
outstanding doc drift at `:172-174`.

**Test:** `npm run build` (docs can't break the build; this is a formality gate).

**Could break:** nothing executable.

**How you'd notice:** N/A. The risk here is the opposite — leaving it *unfixed*
costs another session to the same trap.

---

### Slice 3 — Fix `window` shadowing · SERIAL · ~4 lines

**Changes:** `PageViewCounter.astro:17` declares `const window = line?.querySelector(...)`,
shadowing the global `window` inside the IIFE. Rename to `windowEl`. Nothing in the
script uses the global, so this is inert today — but it is a trap for the next
person who adds `window.matchMedia` or similar and gets a baffling TypeError.

**Test:** `npm run smoke` — the counter must still render a number on `/`.

**Could break:** a missed rename occurrence leaves `windowEl` undefined at
`:18`/`:32`, so the guard at `:18` returns early and the counter element is never
populated.

**How you'd notice:** the counter shows the placeholder `·` and never resolves, or
disappears entirely. Visible on the landing page in one look; caught by the smoke
test only if it asserts the rendered count (Q1 option B) — under option A this
slice is verified by build + eyeball. **Say the word and I'll add a DOM assertion
to Slice 0 for it.**

---

### Slices 4–8 — Font-stack tokens · ~103 lines total

**Why this is worth doing.** The three font stacks are written out **56 times**
across 7 files: `'EB Garamond', Georgia, serif` ×32, `'EB Garamond SC', 'EB
Garamond', Georgia, serif` ×11, `'IBM Plex Mono', ui-monospace, monospace` ×13.
Changing a typeface today means 56 correct edits with no way to verify you got them
all. Slice 4 adds `--font-serif`, `--font-sc`, `--font-mono` next to the existing
color tokens (`BaseLayout.astro:31-40`); slices 5–8 substitute call sites.

Pure textual substitution — every declaration resolves to a byte-identical value.

**Test (each):** `npm run smoke`, plus `npm run build && grep -rc "EB Garamond',
Georgia" dist/` to confirm the count drops as expected and no stack is left
half-substituted.

**Could break:** a typo'd token name (`var(--font-serfi)`) resolves to nothing and
the element falls back to the browser default. Custom properties inherit through
the cascade, so a token defined on `:root` in BaseLayout's `is:global` block does
reach scoped styles in child components — **this is the one framework assumption in
these five slices**, and Slice 4 verifies it before slices 5–8 depend on it.

**How you'd notice:** an element renders in Times New Roman or the system UI font
instead of Garamond. Loud and obvious on any page. If Slice 4 reveals that scoped
styles *don't* see the global tokens, slices 5–8 are abandoned, not forced.

| Slice | File | Occurrences | Concurrency |
|---|---|---|---|
| 4 | `BaseLayout.astro` | 10 | SERIAL (shares file with 1) |
| 5 | `ProseLayout.astro` | 13 | PARALLEL_SAFE after 4 |
| 6 | `PageViewCounter.astro` (3), `index.astro` (1) | 4 | SERIAL (shares file with 3) |
| 7 | `writing/index.astro` | 5 | PARALLEL_SAFE after 4 |
| 8 | `about.astro` (8), `projects/index.astro` (6) | 14 | SERIAL (shares files with 9) |

---

### Slice 9 — Extract counter constants to a shared module · SERIAL · ~60 lines

**Changes:** creates `src/lib/counter.ts` exporting `WINDOW_HOURS`,
`BUCKET_TTL_SECONDS`, and a `KV_KEY_SHAPE` string. `src/worker/index.ts:4-5`
imports them instead of declaring them; `about.astro:121-122` and
`projects/index.astro:30` interpolate them instead of hardcoding
`views:YYYY-MM-DDTHH` and `30h TTL`.

**Why.** This is the one real coupling defect in the repo, and I found it
independently while writing `ARCHITECTURE.md`: three files restate the counter's
internals, and **changing the Worker makes the About diagram and the Projects page
silently lie.** A wrong architecture diagram on a page whose entire purpose is
explaining the architecture is worse than no diagram.

**Test:** `npm run smoke` — specifically the KV round-trip assertion, which proves
the TTL and key shape still work end to end. Plus `npx wrangler deploy --dry-run`,
which is the gate that catches Worker bundling failures Astro alone misses.
**Before this slice runs, Slice 0's increment assertion is the thing standing
between a bad import and a broken counter** — this is the slice the harness was
built for.

**Could break:** (a) wrangler fails to bundle a cross-directory import from
`src/worker/` into `src/lib/` — unlikely, esbuild handles it, but unverified here;
(b) a units mistake if the TTL is exported as hours somewhere and seconds
elsewhere, which would silently change bucket expiry from 30h to 30s; (c) the SVG
`<text>` interpolation changes string length and overflows its `<rect>`, since
those coordinates are hand-positioned (`about.astro:119-122`).

**How you'd notice:** (a) `wrangler deploy --dry-run` fails loudly — cheap. (b) is
the dangerous one: **nothing fails, the counter just starts losing history**, and
you'd only see it as a number that stops growing. The smoke test cannot catch a
30s-vs-30h TTL inside one run. I will assert the exported constant equals `108000`
explicitly rather than trusting the arithmetic. (c) is visible on `/about/` in one
look.

---

### Slice 10 — Consolidate the rise animations · SERIAL · ~40 lines · **recommend deferring**

**Changes:** `BaseLayout.astro:309-320` (`rise`), `ProseLayout.astro:73-81`
(`rise-post`), and `about.astro:192-202` (`rise-about`) are three copies of the
same `0.9s cubic-bezier(0.2, 0.6, 0.2, 1) forwards` fade-and-lift, each with its
own `@keyframes` block and its own `prefers-reduced-motion` guard. Only the wrapper
selector differs.

**Why I'd defer it.** Astro **scopes `@keyframes` names declared inside a scoped
`<style>` block**. Whether a scoped `animation: rise …` correctly resolves to a
globally-declared `@keyframes rise` is exactly the kind of framework detail I would
be guessing at. If it silently fails to resolve, the animation never runs — and
because the initial state is `opacity: 0` (`BaseLayout.astro:307`), **the page
renders blank.** That is the worst failure mode in this entire plan, produced by
the least valuable slice.

**Test:** `npm run smoke -- --browser`, asserting `getComputedStyle(el).opacity === '1'`
on `.content > *`, `.post > *`, and `.about-page > *` after load — which requires
Q1 option B. I would not run this slice under option A.

**Could break:** the entrance animation silently not running.

**How you'd notice:** every page is blank except the header. Catastrophic but
instantly obvious — you would never ship it. The real risk isn't shipping it, it's
burning a session on it.

---

## Explicitly out of scope

| Not doing | Why |
|---|---|
| Deleting the 6 remaining CSS rules from PRUNE.md (`.footer a`, `.post-title em`, `.post-body pre`, …) | PRUNE.md's own recommendation is "stop after the two custom properties." These are markup-shaped holes, not cruft — styles waiting for a footer link, an italicised title, a code block. Dropping `.post-body pre` loses `overflow-x: auto`, so your first published code block blows out mobile layout. |
| Removing the `threshold` field (`worker/index.ts:62`) | It's a field on a **public** HTTP response. Unread in this repo ≠ unread by a bookmarklet or curl. ~20 bytes, and useful for debugging why the counter is hidden. |
| Removing `ProseLayout`'s `section` prop | PRUNE.md rates it "Low" confidence with a real blast radius: deleting it hardcodes every future prose page into the Writing nav section. |
| Hardcoded post/project arrays → content collections | Not behavior-preserving in spirit and well over 200 lines. It's a feature, and `writing/index.astro:4` already marks it as the intended direction. Separate plan. |
| Extracting the repeated maize gradient-underline (11 occurrences) | Genuinely repetitive, but the percentages differ per use (25/30/32/18%), so it needs a parameterised approach rather than a token. Worth doing *after* the font tokens prove the pattern works. |
| Anything in `previews/index.html` | Committed design record, settled by commit `c584bb2`. |
| Anything in `worker-configuration.d.ts` | Generated by `wrangler types`. Regenerate, never hand-edit. |

---

## Concurrency map

If you want to run slices in parallel worktrees, only these are file-disjoint:

- **Slice 2** (`README.md`, `AGENTS.md`) — safe against everything, any time.
- **Slice 5** (`ProseLayout.astro`) and **Slice 7** (`writing/index.astro`) — safe
  against each other and against 6 and 8, but **both must wait for Slice 4** to
  define the tokens. File-disjoint, logically dependent.

Everything else shares a file with a neighbour:
`BaseLayout.astro` → 1, 4, 10 · `PageViewCounter.astro` → 3, 6 ·
`about.astro` → 8, 9, 10 · `projects/index.astro` → 8, 9 ·
`ProseLayout.astro` → 5, 10.

Given the repo is 8 source files and this whole plan is ~450 lines of diff,
**running these serially is almost certainly faster than managing worktrees.** The
column is filled in because you asked for it, not because I'd use it.

---

## GATE

Plan only. No code written, no files touched besides this one.

Answer Q1–Q3 and approve, and I'll start with Slice 0 — three sentences, the
change, `npm run smoke` against unmodified `HEAD`, the full diff, then stop for
your commit message.
