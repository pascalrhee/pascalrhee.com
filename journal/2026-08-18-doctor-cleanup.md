---
date: 2026-08-18
session: doctor-cleanup
---

## Concepts Learned

**Context is a budget, and duplicates spend it twice.** Everything always-loaded
— your `CLAUDE.md`, the list of available skills — is read at the start of every
single session. Two identical copies of the same skill don't just waste tokens;
they give the model two indistinguishable entries to choose between, which makes
routing worse, not neutral.

**Plugin-managed beats hand-copied.** The same 13 Cloudflare skills existed both
as loose files you'd copied into `~/.claude/skills/` and as part of the
`cloudflare` plugin. Identical today — but the plugin's copies get updates and
the loose ones are frozen at whatever version they were copied at. When
something offers a managed install, the managed one is the keeper.

**Deferred loading changes what "unused means expensive" means.** MCP tool
definitions (connections to external tools like Gmail or the Cloudflare API)
aren't loaded into context up front — only their names are, with the full
details fetched on demand. So "disable it to save tokens" is usually the *wrong*
argument for an unused MCP connection; the honest reason to remove one is
maintenance, not performance. Skills are the opposite: their descriptions are
resident, so an unused skill genuinely costs you every session.

**Subagents have capability boundaries, and those boundaries decide
architecture.** The `end-session` agent is granted only file and shell tools —
no `Skill` tool — so it *cannot* run a slash command, no matter how the
instructions are phrased. That single fact forced `/security-review` into the
command file rather than the agent. When automation won't compose, check what
the piece is actually allowed to do before rewriting the prompt.

**Agent and command definitions are ordinary files under version control.**
They live in `.claude/`, so they follow git branches like any other file, and
they load only at startup. That combination produces a confusing failure: switch
branches, and your tooling silently disappears with no error message.

## Notes & Examples

The duplicate-skill fix and its undo:

```
mv ~/.claude/skills ~/.claude/skills-disabled   # what we did
mv ~/.claude/skills-disabled ~/.claude/skills   # how to undo it
```

Why the loose copies lost and the plugin won — they were identical, so nothing
was lost:

```
diff ~/.claude/skills/wrangler/SKILL.md \
     ~/.claude/plugins/cache/cloudflare/cloudflare/1.0.0/skills/wrangler/SKILL.md
# no output = identical
```

**The branch trap, stated plainly:** a file that only exists on one branch only
exists when you're on that branch. Obvious for source code. Much less obvious
for tooling, because tooling failure looks like "the feature is broken" rather
than "the file isn't here." `/end-session` didn't error — it just wasn't there.

**Two different security questions, easy to conflate.** The wrap-up's existing
secrets scan asks *"did we commit a credential?"* `/security-review` asks *"can
someone abuse what we built?"* The first is a grep; the second needs to read the
code. Having one is not having the other.

## Still Fuzzy

**The `skills-disabled` move is a workaround wearing the costume of a fix.**
Nothing in Claude Code knows that folder means "disabled" — it's just a folder
that isn't named `skills`. The supported mechanism is a `skillOverrides`
setting, and I rejected it on a risk I *reasoned* about but never *tested*:
that turning off `wrangler` might also turn off the plugin's `cloudflare:wrangler`,
since overrides key on name. That may well be wrong. The move works today, but
it's the kind of thing that breaks quietly on an upgrade, and it was accepted in
about one sentence.

**The `/security-review` trigger is a proxy, and proxies drift.** "Did the diff
touch `.astro`/`.ts`/`.js`/`wrangler.jsonc`/`package.json`/`src/`?" stands in for
"is there attack surface here?" A dependency bump in a lockfile, a config change
outside that list, or an API route in an unexpected place would all skip the
review while genuinely changing exposure. Worth revisiting once it's actually
run a few times.

**The `/api/views` risk was asserted, not verified.** The instructions now warn
that the endpoint is unauthenticated and writes to KV against a 1,000
writes/day cap — which follows from the free-tier table in the agent file, not
from anyone reading the handler. It's plausible enough to write down and *not*
established enough to treat as known. Reading that endpoint is on the next-steps
list for a reason.

## Connections

Last session's work made `/end-session` exist; this session made it *survive* —
and then immediately proved it hadn't, because the files were stranded on one
branch. Those two facts belong together: building tooling and making tooling
reachable are separate jobs, and the second one is where this project keeps
tripping.

The through-line with the counter build is the same shape as the skills
duplication: both were cases where something *worked* while quietly costing more
than it needed to, and the fix was noticing rather than building. That's a
different mode from the last few sessions, which were all additive.

It also connects forward to the free-tier discipline in `CLAUDE.md`. The KV
write cap has now come up in three contexts — the counter's design, the
wrap-up's cost gate, and today's security framing. A constraint that keeps
resurfacing from different directions is usually the real constraint on the
project, and `/api/views` is still unprotected against it.
