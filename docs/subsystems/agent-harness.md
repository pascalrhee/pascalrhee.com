# Subsystem — Agent Harness

**Files:** `.claude/agents/end-session.md` (313 lines), `.claude/commands/end-session.md` (98 lines),
`.claude/settings.local.json`, `CLAUDE.md`, `AGENTS.md`, `.vscode/`

Repo-local Claude Code configuration. Ships nothing; governs how the site gets
built.

## `CLAUDE.md` — the instruction file

Project instructions loaded into every session. Four operative rules:

- **Teaching altitude** — explain strategically (why this tool, what tradeoff),
  never line-by-line; handle mechanics silently.
- **Communication** — lead with a 2–4 line executive summary.
- **Decisions** — present 2–3 options with tradeoffs, recommend one, let Pascal
  pick; push back when his idea isn't optimal.
- **Priority order** — learning-friendliness → accessibility and performance →
  design quality → SEO, with **free tier as a hard constraint outranking all of
  them**, and a requirement to name actual dollar figures rather than "it's
  cheap."

It also defines the session-records ritual and directs memory updates to
`~/.claude/projects/-Users-pascalrhee-claude-website/memory/`.

## `/end-session` — the command

`.claude/commands/end-session.md`. Frontmatter declares a description and an
`argument-hint` (`:1-4`). Four steps, and the split between them is the design:

1. **Write the session summary** (`:12-32`) — the parent session's job, because
   the subagent starts cold and "git tells it what changed on disk, but only you
   know what we *discussed*" (`:8-10`). Enumerates nine things to capture,
   including what Pascal pushed back on and what he *accepted quickly* — the
   latter explicitly called the highest-value part (`:22-23`).
2. **Security review** (`:34-68`) — also the parent's job, because the subagent
   has no `Skill` tool and cannot invoke a slash command (`:36-38`). Runs
   `/security-review` if the diff touched anything executable, skips for
   docs-only diffs, and requires saying which way it went (`:47-51`). Names the
   live exposure: `/api/track` is unauthenticated and writes to KV against a
   1,000-writes/day cap, making any new write path a quota-exhaustion risk
   (`:55-59`). *(Note: `:55` says `/api/views`; the write path is actually
   `/api/track` — `src/worker/index.ts:52`.)*
3. **Delegate** (`:70-84`), passing summary + security outcome + `$ARGUMENTS`.
4. **Relay** (`:86-95`) — the agent's briefing does not reach Pascal on its own.

Ends with an explicit stop: *"Do not merge, deploy, or clear the session unless
he says so"* (`:97-98`).

## `end-session` — the agent

`.claude/agents/end-session.md`. Frontmatter grants `Read, Write, Edit, Glob,
Grep, Bash` — deliberately **no `Skill`**, which is what forces the security
review upstream (`:4`). Six phases:

| Phase | Line | Job |
|---|---|---|
| 1 Reconstruct | `:22` | Rebuild the session from the caller's summary → git → today's plan → transcript grep (never a full read). Refuse to invent a session (`:42-45`). |
| 2 Sweep | `:49` | Half-finished code, discussed-but-not-done, stray files (never `git add -A`, never delete unasked, `:61-65`), dev servers on 4321/8787 reported but **not** killed (`:67-75`), dangling PRs (`:77-79`). |
| 3 Gates | `:83` | Build, accessibility, cost, secrets, doc drift — detailed below. |
| 4 Record | `:180` | Plan file, journal, Still Fuzzy, memory files. |
| 5 Ship | `:262` | Branch → commit → PR, **stop before merging** (`:282-285`). |
| 6 Brief | `:289` | Executive summary, files, PR URL, flagged doubts, gate results, loose ends, next session; closes with a verbatim line and cannot type `/clear` itself (`:306-313`). |

### The gates (Phase 3)

- **Build** — `npm run build` must pass, then `npx wrangler deploy --dry-run` to
  catch worker/config breakage Astro alone misses (`:88-104`). No new dev
  dependencies just to run a check (`:106-107`).
- **Local-preview trap** — verify in `wrangler dev` (8787), never `astro dev`
  (4321), because `astro dev` doesn't run the Worker and the counter silently
  removes itself (`:109-115`).
- **Accessibility** — names this repo's three specific exposures: inline SVG
  diagrams needing `role="img"` + `<title>`, entrance animations needing a
  `prefers-reduced-motion` escape, and heading order / focus-visible / contrast
  (`:117-126`). Instructed to say so plainly if polish was traded for access
  (`:128-129`).
- **Cost** — a free-tier table (`:135-141`) and the conclusion that the
  1,000 KV-writes/day ceiling is the real constraint, not reads (`:143-146`).
- **Secrets** — the repo is public; scan the diff, and note that a pushed secret
  must be *rotated*, not just deleted (`:152-157`). Explicitly lists the KV
  namespace id, Worker name, and compatibility date as non-secrets that belong in
  the repo (`:159-160`).
- **Doc drift** — flags that `README.md` documents `npm run dev` at 4321 and
  `AGENTS.md` recommends `astro dev --background`, both incomplete now that API
  routes exist (`:172-174`). `CLAUDE.md` changes are to be *proposed*, not made
  (`:170-171`).

**A known self-defeating gate:** the accessibility check is scoped to "pages
changed this session" (`:119`), so a docs-only session skips it entirely.

## `AGENTS.md`

Astro's own agent guidance (`AGENTS.md:1-22`) — recommends `astro dev
--background` (`:3-9`) and links seven Astro doc guides (`:15-22`). This is the
file the wrap-up agent flags as stale (`.claude/agents/end-session.md:174`),
because `astro dev` cannot exercise the Worker.

## Permissions and editor config

`.claude/settings.local.json:2-12` allowlists seven Bash prefixes — `gh auth`,
`git init`, `git add`, `git branch`, `git commit -m`, `gh repo`, `git push`.
Notably absent: `git merge` and anything wrangler.

`.vscode/extensions.json:2` recommends `astro-build.astro-vscode`;
`.vscode/launch.json:5` launches `./node_modules/.bin/astro dev` as a node-terminal
task.
