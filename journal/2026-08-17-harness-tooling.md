---
date: 2026-08-17
session: harness-tooling
---

## Concepts Learned

**The status line is a shell contract, not an integration.** Claude Code pipes a
JSON blob to whatever script you point it at and prints whatever comes back.
Extending it means reading one more field — no API call, no polling, no
dependency. That's why "show me when my 5 hours reset" was a three-line change
rather than a project.

**Look before you build.** The reset time was already being handed to the script
every render; it just wasn't read. The whole task was discovering that the data
was already there. Worth a habit: check what you're already being given before
writing anything to go get it.

**Subagent context isolation.** A subagent runs as a fresh process with a fresh
context — it does not inherit the conversation. That's the *point* (its tool
output stays out of yours, so it can grind through files without flooding your
context), but the consequence is that anything conversational has to be passed
explicitly. A subagent knows what `git diff` says; it has no idea what you
argued about.

**Which follows a clean division of labor:**

| | Runs in | Knows the conversation? | Good for |
|---|---|---|---|
| Slash command / skill | *your* context | yes | anything needing session knowledge |
| Subagent | isolated context | no — must be briefed | heavy lifting, parallel work |

That's exactly why `/end-session` ended up as a wrapper around the agent rather
than a replacement for it: the command supplies the context, the agent supplies
the ritual.

**Harness config has three tiers.** `~/.claude/` applies to every project,
`.claude/` is repo-local and travels with the repo, and `CLAUDE.md` is
instructions to the model rather than machinery. The status line went in tier
one; the wrap-up agent went in tier two because it hardcodes this repo's paths
and conventions.

**Agent definitions load at session start.** Create one mid-session and it isn't
registered until you restart — which is precisely what happened when we tried to
run it, and it registered on the restart exactly as expected. Slash commands are
the opposite: available the moment the file exists. Practical upshot for any
future harness work — build the command first if you want to use it today.

**A checklist you follow is not the same artifact as a checklist you wrote.**
Doing the wrap-up by hand and then having the agent do it produced different
results from the same file, because reading your own instructions as a fresh
process exposes the places where you'd been filling gaps from memory without
noticing.

## Notes & Examples

The field that made the status line work — already present, never read:

```
rate_limits.five_hour.resets_at   # Unix epoch seconds
```

The width-math trap, worth remembering because it's invisible until it bites:
the script keeps a plain-ASCII twin of every colored segment so it can measure
how wide the line is and drop segments when the terminal is narrow. Bash 3.2's
`${#var}` counts **bytes**, not characters — so a `↻` (3 bytes, 1 column) makes
the script think the line is wider than it looks and drop a segment it didn't
need to. Hence plain `->`.

Free-tier ceilings, looked up rather than recalled — and the one that actually
binds is not the obvious one:

| Resource | Cap |
|---|---|
| Workers requests | 100,000/day |
| Workers CPU | 10 ms/request |
| KV reads | 100,000/day |
| **KV writes** | **1,000/day** |
| KV storage | 1 GB |

The view counter writes on every page view, so the write ceiling is ~1,000
views/day — a hundredth of the read limit. The binding constraint on the counter
was never the one that gets quoted.

## Still Fuzzy

**The agent has now run — and the thing I was worried about was not the thing
that was wrong.** After a restart it registered and executed all six phases.
It did *not* skim: the gates took about two minutes and the build and
`wrangler --dry-run` both passed. So the "the file is too long, trim Phase 3"
prediction was simply wrong, and that's worth recording because it was the
loudest warning in this file an hour ago. Three real defects showed up instead,
none of them length:

1. **The accessibility gate skips itself in exactly the case that matters.** It
   says "spot-check pages changed this session." Today no pages changed, so
   followed literally it checks nothing. Checking anyway turned up that `src/`
   contains **no focus styling at all** — no `:focus-visible`, nothing — in the
   committed, live tree. A gate that only looks at today's diff will never find
   a gap that has been there since the beginning. It needs a standing baseline
   pass, not just a diff pass.
2. **The doc-drift gate quietly asks the agent to edit `CLAUDE.md`.** It names
   the exact stale sentence and says to make the edit. But `CLAUDE.md` is the
   instruction file — an agent rewriting its own instructions on its own
   initiative is the wrong default, and the drift here wasn't even caused by
   this session. That gate should say *propose, never edit unasked*.
3. **There's no branch for being run twice.** The file assumes a fresh,
   unwrapped session. But its own advice — restart so the agent registers —
   guarantees the second run lands on an already-written plan and journal and
   an already-open PR. That case had to be explained by the caller rather than
   being in the file, and it will recur every time an agent is created
   mid-session.

A smaller one: the file orders `npm run build` as a gate and separately tells
you to check port 8787, without connecting them — running a build while
`wrangler dev` is up is a known `SQLITE_BUSY` crash in this repo. It didn't fire
this time, but the file walks straight toward it.

**`/end-session` landed as a slash command without weighing the alternatives.**
The question asked was "could we make this a `/` function?" and the answer was a
file in `.claude/commands/` about ninety seconds later. Never discussed: commands
vs. skills, or project scope vs. user scope. As built, this ritual is repo-local
and the agent hardcodes this project's paths, journal conventions, and
Cloudflare limits. If the wrap-up habit turns out to be worth having on every
project, that's a rewrite, not a copy.

**A smaller one:** the status line now spends horizontal space on a reset time
that only changes meaning near the end of a window. Whether that earns its place
in a line that already drops segments on narrow terminals is a question a week of
looking at it will answer better than reasoning will.

## Connections

This session is the first one where the *tools for working* were the work — a
different category from the counter build or the `/about` page, which produced
things visitors see. Both artifacts exist to protect continuity across sessions:
the status line so a session doesn't end by surprise, the wrap-up agent so the
record gets written even when a session ends abruptly.

It also sharpened something the counter build only hinted at. The KV write limit
sitting a hundred times lower than the read limit is the same shape of surprise
as `astro dev` silently 404ing the API — in both cases the obvious number or the
obvious command was the wrong one, and the failure was quiet rather than loud.
The gates now written into the agent exist mostly to make that class of quiet
failure noisy.

The wrap-up then got run twice — once by hand, once by the agent — and the
second pass earned its keep in a way worth noting: the manual pass found the
things the conversation already knew about, and the agent pass found the thing
nobody had looked for (no focus styles anywhere in the site). That's the
argument for a written ritual over a remembered one, and it's the same argument
as the journal itself.

And it exposed a real gap in the current setup: a parallel session was
substantially redesigning the landing page at the same time as this one, and
nothing in the workflow surfaced that until the wrap-up went looking at `git
status`. Two sessions editing one working tree is a coordination problem the
plan/journal habit doesn't currently solve.
