---
session: 2026-08-18-refactor-slices
goal: document the repo end to end, find what's actually dead, and remove it in slices that each prove themselves
status: done
---

## Goal
Started as one request — "read this repository end to end, produce
`ARCHITECTURE.md` and `docs/subsystems/*.md`, cite file:line for every claim,
mark inferences UNVERIFIED, and end with the questions you couldn't answer from
code alone." It grew through four further requests into a full arc: document →
analyze for dead code → plan a gated refactor → execute it → wrap up.

The through-line is that each phase had to earn the next. Documentation was
allowed to make claims only with a citation; the dead-code analysis was allowed
to name something dead only with tool evidence; the refactor was allowed to
touch a file only inside a slice that could be verified on its own.

## Plan
1. Read the repo end to end and write `ARCHITECTURE.md` plus one page per
   subsystem, every claim cited to `file:line`, inferences marked UNVERIFIED,
   unanswerable questions listed rather than guessed
2. Run real dead-code tooling over the result and separate what is genuinely
   unreferenced from what only looks it
3. Turn the findings into a slice plan ordered so risk rises monotonically —
   safest change first, so the verification story is established before it
   is needed
4. Execute the slices, one commit each, on a branch cut for the purpose
5. Clean up, re-check the docs the refactor invalidated, push, open the PR

## What Actually Happened

**Phase 1 — Documentation.** `ARCHITECTURE.md` (323 lines) plus eight subsystem
pages under `docs/subsystems/`: edge-worker, view-counter, page-shell,
content-routes, build-and-deploy, session-records, agent-harness,
design-previews. Every claim carries a `file:line` citation. Fifteen questions
that code alone could not answer are listed at the end rather than guessed at —
that list is now a standing to-do.

**Phase 2 — Dead-code analysis**, run as a subtask. knip, depcheck, ts-prune,
and madge, plus a real end-to-end run, because the repo had no tests at all and
static tools cannot see what only runs. Raw output landed in `reports/`, the
findings in `reports/PRUNE.md`. **The repo turned out to be very clean:** zero
unused dependencies, zero unused files, zero import cycles. Genuine dead code
came to two CSS custom properties and six CSS rules. The interesting finding was
not deletion but duplication — 45 hard-coded `font-family` literals and three
files independently restating the counter's constants.

**A finding worth its own line:** every `prefers-reduced-motion` block in `src/`
reads as dead code to a coverage tool, because the preference is off by default
and the rules never match. Four such blocks exist. They are not dead; they are
the accessibility escape hatch, and a naive "delete what coverage never hit"
pass would have removed all four.

**Phase 3 — The slice plan** (`REFACTOR_PLAN.md`), 11 slices ordered so risk
rises monotonically, each with a stated "could break" and a verification.

**Phase 4 — Execution.** Slices 0–9, one commit each, on `refactor-slices`:

- **Slice 0** — `scripts/smoke.mjs`, the repo's first executable verification.
  Node built-ins only, no new dependencies. 28 assertions across five routes,
  both API endpoints, the bot filter, and a real KV round-trip
- **Slice 1** — deleted `--blue-deep` and `--rule`, the two genuinely dead tokens
- **Slice 2** — README and AGENTS.md now document the `wrangler dev --local`
  path, not just `astro dev`
- **Slice 3** — renamed the counter's shadowed `window` binding to `windowEl`
- **Slices 4–8** — 45 `font-family` literals replaced by `--font-serif`,
  `--font-sc`, `--font-mono`, in five separate gated steps
- **Slice 9** — `src/lib/counter.ts`, a single source for `WINDOW_HOURS`,
  `BUCKET_TTL_HOURS`, `BUCKET_TTL_SECONDS`, and `KV_KEY_SHAPE`, imported by the
  Worker at runtime and by `/about` and `/projects` at build time
- **Slice 10** (animation consolidation) — **deliberately deferred.** Pascal's
  call. It remains unexecuted

**Phase 5 — Cleanup.** 424 KB of raw coverage JSON was removed via history
rewrite rather than a delete-commit: the branch had not been pushed, so a
forward delete would have left the bytes sitting in every future clone forever.
Fifteen commit SHAs changed as a result. A `.gitignore` rule now covers
`reports/*coverage*.json`, and the harnesses that generate them are kept.
`ARCHITECTURE.md` and the subsystem docs were then updated, because the refactor
had made them stale in three specific ways: worker line citations had shifted by
one, the deleted tokens were still documented, and the SVG-duplication finding
was now fixed rather than outstanding.

**Deviations from the plan**
- Slice 10 skipped by choice, not by failure
- Executed **serially, with no git worktrees**, despite `REFACTOR_PLAN.md`
  carrying a PARALLEL_SAFE column. Only 3 of 11 slices were genuinely
  file-disjoint and the total diff was ~450 lines; worktree management would
  have cost more than it saved. The planning agent said as much itself
- Branched from `main`, not from the checked-out branch. The tree was sitting on
  `session-notes-2026-08-18-auto-merge-reverted`, which has its own open PR (#9);
  committing there would have polluted someone else's review. Source was
  identical to `main`, so the baseline still held

**Three gate questions Pascal was asked, and answered**
1. Smoke test scope → **Node built-ins only.** Rejected: browser-level
   assertions now, and `astro check`, which would have added two dev
   dependencies against the standing "don't add tooling unasked" rule
2. Font slices → **split into five.** Rejected: collapse to one
3. Slice 10 → **defer**

**Gates, all re-verified at wrap-up**
- `npm run smoke` — 28/28 assertions
- `npm run build` — 5 pages
- `npx wrangler deploy --dry-run` — 2.33 KiB, `VIEWS_KV` and `ASSETS` both resolved
- `/security-review` — ran, **no HIGH or MEDIUM findings**
- Cost — nothing new spent, no new services, no deploys; the harness runs
  `wrangler dev --local`, so remote KV is never touched
- Secrets — diff scan clean. Every "token" hit is a CSS design token or a doc
  line asserting there are none

**Not this session's work.** PRs #8 and #9 come from other sessions running
against this same working tree tonight. Nothing in them belongs to this record.

## What's Next
- **Execute slice 10** — the deferred animation consolidation. It is the one
  piece of `REFACTOR_PLAN.md` still outstanding, and the plan file already
  contains its risk analysis, so re-entry is cheap
- **Add `:focus-visible` styles** — `grep -rn "focus-visible" src/` still
  returns nothing, now four sessions after it was first flagged. It is the
  cheapest outstanding accessibility win, and accessibility is priority #2
- **Decide what `PUBLIC_THRESHOLD` should be** — it is still `0`, so the
  visibility gate the Worker implements is inert code that has never once
  changed an outcome. That is a product decision about whether small numbers
  should show, not a refactor
- **Work the 15 open questions at the end of `ARCHITECTURE.md`** — especially
  the two that affect deploys: how `pascalrhee.com` actually routes to the
  Worker (there is no `routes` key in `wrangler.jsonc`), and whether anything
  dashboard-side auto-deploys on push
