---
description: Wrap up the session — finalize plan + journal, run gates, update memory, push a PR
argument-hint: "[optional: extra instructions, e.g. 'merge it too']"
---

Run the end-of-session wrap-up for this project.

**You have something the wrap-up agent does not: this conversation.** Its
weakest link is starting cold — git tells it what changed on disk, but only you
know what we *discussed*. So do this in two steps.

## Step 1 — Write the session summary

Before delegating, write a thorough summary of this session covering:

- **What we set out to do**, and whether that changed mid-session
- **What actually got built or changed** — files, features, config
- **Decisions made**, and the alternatives we rejected and why
- **What Pascal pushed back on**, questioned, or said he found confusing
- **Concepts that came up** — anything he was learning, at the strategic
  altitude `CLAUDE.md` asks for
- **Things he accepted quickly** without much scrutiny — these become the
  "Still Fuzzy" flags, and they're the highest-value part of the record
- **Anything discussed but not built** — these become "What's Next"
- **Dead ends and things that broke**, including how we diagnosed them
- **Provenance warnings** — if the working tree contains changes you did *not*
  make this session, say so explicitly so the agent doesn't attribute them to
  today

Be specific and generous here. Anything you leave out is lost once the session
clears — this summary is the only bridge between the conversation and the
permanent record.

## Step 2 — Delegate

Invoke the `end-session` subagent, passing that full summary in its prompt,
plus any extra instructions from `$ARGUMENTS`.

The agent owns the ritual itself — sweeping loose ends, running the build /
accessibility / cost / secret / doc-drift gates, finalizing `plans/` and
`journal/`, updating memory, and opening the PR. Don't duplicate its work or
second-guess its checklist; give it the context and let it run.

If the `end-session` agent isn't available in this session (agent definitions
load at startup, so a freshly created one won't register until after a
restart), carry out `.claude/agents/end-session.md` yourself, following it
phase by phase.

## Step 3 — Relay

Report the agent's briefing back to Pascal — the executive summary, files
written, PR URL, the 1–2 things flagged as maybe not holding up, gate results,
loose ends, and what next session should tackle. The agent's report doesn't
reach him on its own.

Do not merge, deploy, or clear the session unless he says so. `/clear` is his
to type.
