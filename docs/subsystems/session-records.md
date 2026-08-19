# Subsystem — Session Records

**Directories:** `plans/`, `journal/` · **Templates:** `plans/TEMPLATE.md`, `journal/TEMPLATE.md`

Not shipped code. A parallel-file record of how the site got built, one pair of
files per working session, mandated by `CLAUDE.md`'s "Session Records" section and
written by the wrap-up agent (`.claude/agents/end-session.md:180-260`).

## Naming

`YYYY-MM-DD-short-slug.md` in each folder. Plans and journals for the same session
share a slug, so they pair by filename.

## `plans/` — factual

Schema from `plans/TEMPLATE.md`:

```yaml
---
session: YYYY-MM-DD-N
goal: one-line goal
status: planned | in-progress | done
---
```
`plans/TEMPLATE.md:1-5`

Sections: **Goal** (`:7`), **Plan** (`:10`), **What Actually Happened** — filled in
at session end, explicitly kept factual with learnings pushed to the journal
(`:13-15`) — and **What's Next** (`:17`).

## `journal/` — conceptual

Schema from `journal/TEMPLATE.md:1-4`: `date` and `session` only.

Sections: **Concepts Learned** (`:6`), **Notes & Examples** with fenced code
(`:9-16`), **Still Fuzzy** — "things I accepted but don't fully understand yet. Be
honest." (`:18-19`) — and **Connections** (`:21`).

The "Still Fuzzy" section is treated as the highest-value part of the record; the
agent is instructed to flag 1–2 items that may not hold up
(`.claude/agents/end-session.md:224`) and to restate them in the final briefing
(`.claude/agents/end-session.md:298-299`).

## Current contents

Nine non-template files in each folder, spanning `2026-04-20` through
`2026-08-18` — nine sessions, since the counter work split its slug across the
two folders:

| Slug | Present in |
|---|---|
| `2026-04-20-understand-current-site` | both |
| `2026-04-20` (`.txt`) | both — predates the `.md` convention |
| `2026-08-17-astro-migration` | both |
| `2026-08-17-recalibrate-and-counter-plan` | both |
| `2026-08-17-counter-build` | journal only |
| `2026-08-17-counter-plan-workers` | plans only |
| `2026-08-17-about-page-and-counter-hero` | both |
| `2026-08-17-harness-tooling` | both |
| `2026-08-17-michigan-template` | both |
| `2026-08-18-auto-merge-reverted` | both |

Two slugs break the one-pair-per-session symmetry: the counter work split into a
plan named `counter-plan-workers` and a journal named `counter-build`, and the
April 20 entries are `.txt` rather than `.md`.

## Worked example

`journal/2026-08-18-auto-merge-reverted.md` records a session whose net code
change was zero — the design was built and reverted. Its Concepts Learned
(`:8-30`) capture the reasoning that survived: that merge and deploy are only the
same act in a repo wired for it (`:8-15`), that blast radius rather than action
risk is the right automation question (`:16-19`), and that targeted
`git checkout -- <paths>` matters in a tree shared by parallel sessions
(`:24-27`). The three commands that established the repo has no CI are preserved
verbatim (`:49-52`).

That entry is also the load-bearing citation for a claim nothing in the code can
confirm — see open question 3 in `ARCHITECTURE.md`.

## Stray files

`plans/.Rhistory` and `.Rhistory` exist and are gitignored (`.gitignore:30`).
`plans/.DS_Store` likewise (`.gitignore:24`). Nothing in this repo runs R; their
provenance is unexplained.
