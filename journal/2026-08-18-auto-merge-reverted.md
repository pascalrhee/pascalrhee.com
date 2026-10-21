---
date: 2026-08-18
session: auto-merge-reverted
---

## Concepts Learned

- **Merge and deploy are only the same action in a repo wired for it.** This is
  the whole session in one line. Whether automating a merge is safe depends
  entirely on what the merge *triggers* downstream — not on how risky the merge
  itself looks.
- **CI is the thing that fuses them.** In a repo connected to auto-deploy on push
  to `main` (e.g. Cloudflare Workers Builds watching GitHub), merging *is*
  shipping, and automating the merge means automating a public release. This repo
  has no CI, so a merge to `main` is a private, reversible bookkeeping step.
- **Blast radius, not action risk, is the right question for automation.** The
  useful generalization: when deciding whether to let an agent do something
  automatically, don't ask "is this step dangerous," ask "what else does this step
  set in motion." A harmless-looking action in a wired-up system is a release.
- **Gates only work if their inputs actually arrive.** A merge blocker that
  depends on a security finding is worthless if the finding dies in the parent
  conversation and never reaches the agent's prompt. Automation needs the
  information plumbed, not just the rule written.
- **Targeted revert vs. blanket revert.** `git checkout -- <explicit paths>`
  undoes your own work; `git reset --hard` and `git checkout .` undo *everyone's*.
  In a working tree shared by parallel sessions, that difference is the whole
  ballgame.
- **A decision can be correct and still get cancelled.** Design quality and
  "should we do this" are separate questions, and the second one is Pascal's
  alone.

## Notes & Examples

**The merge/deploy split, as a rule of thumb:**

```
No CI:   merge  = bookkeeping (private, reversible)
         deploy = shipping    (public, needs a human)
         -> safe to automate the merge, not the deploy

With CI: merge  = shipping    (public!)
         deploy = automatic
         -> automating the merge automates a release
```

The three checks that established which world this repo is in:

```
ls .github/workflows/          -> does not exist        (no CI)
grep deploy package.json       -> "astro build && wrangler deploy"  (manual)
gh api .../branches/main/protection -> 404 "Branch not protected"   (merge would go through)
```

**Why `--merge` and not `--squash`:** the repo's history already reads
`Merge pull request #7 from pascalrhee/michigan-template`. Matching the existing
shape of the log matters more than any abstract argument about squashing — a log
with two conventions in it is harder to read than either convention alone.

**The block list, which is where the safety actually lived.** Auto-merge isn't
"merge when done," it's "merge only when every gate is green":

```
DO NOT MERGE if:
  - npm run build failed
  - wrangler deploy --dry-run failed
  - the secrets scan hit
  - /security-review left something exploitable unfixed
  - the session left flagged half-finished code
-> leave the PR open, make the blocking gate the loudest line in the briefing
"A green wrap-up merges; a red one stops and explains.
 Never merge to make the briefing look tidy."
```

**The safe revert, in a shared working tree:**

```
git status --porcelain     # confirm ONLY your files are modified
git diff --stat            # confirm the line counts are yours
git checkout -- .claude/agents/end-session.md \
                .claude/commands/end-session.md \
                CLAUDE.md  # explicit paths only
grep -n "Stop before merging" .claude/agents/end-session.md   # verify
```

## Still Fuzzy

- **Why the auto-merge change was cancelled is genuinely unknown.** Pascal
  approved the recommended option, watched it get built across three files, and
  then said "can we cancel the edits that we just made?" with no explanation. I
  didn't ask. This is the most interesting unexamined thing in the session and
  it is not recoverable from the record — if the hesitation was about trusting an
  agent with `main`, about the block list being incomplete, or just about not
  wanting the ritual to grow, that's worth surfacing next time rather than
  re-litigating the design from scratch.
- **The whole safety argument rests on one fact Pascal never saw verified.**
  "Merging is safe because there's no CI" was checked in three commands he didn't
  watch, and it's a fact with an expiry date — connecting Cloudflare Workers
  Builds to the GitHub repo would silently turn auto-merge into auto-deploy, with
  no edit to the agent and no warning. A decision that depends on a fact that can
  change quietly is a decision that needs a tripwire, and none was built.
- **The four-item block list went unquestioned, and it's load-bearing.** It was
  accepted in one pass. If any of those four gates is wrong, unenforceable, or
  silently skippable in practice, the auto-merge is meaningfully riskier than it
  looked — and at least one gate in this ritual is already known to self-skip (see
  Connections).
- **Editing `CLAUDE.md` directly rather than proposing it** was a judgment call
  made quickly and never remarked on. The agent's own doc-drift rule says
  propose-only for that file precisely because it's the instruction file. "Pascal
  asked for the feature" arguably covers "edit the sentence describing the
  feature" — but it's the kind of reasoning that expands quietly if unexamined.

## Connections

- **This closes a loop opened 2026-08-17.** The `end-session` agent was built that
  day, and its recorded defect list included "the doc-drift gate tells the agent
  to edit `CLAUDE.md` directly, which should be propose-only." That defect is now
  *fixed* in the agent file — and today I edited `CLAUDE.md` directly anyway,
  because the instruction that would have stopped me was about drift, not about a
  change Pascal had just requested. Fixing a rule doesn't cover the case that
  routes around it.
- **A known defect proved itself again today.** Defect (1) from that same list —
  the accessibility gate says "spot-check pages changed this session," so it
  self-skips when a session touches no pages — is exactly what happened here.
  Zero pages changed, gate skipped. A gate that only fires on a diff can't hold a
  standing baseline, which is why `grep -rn "focus-visible" src/` *still* returns
  nothing, three sessions after it was first flagged.
- **The branch trap from 2026-08-18 is resolved.** Memory recorded that
  `.claude/agents/` and `.claude/commands/` lived only on the harness-tooling
  branch, so any branch cut from `main` silently had no `/end-session`. PR #6 has
  since merged; `git ls-files .claude/` now shows both files on `main`. That note
  can stop being a warning and become history.
- **The parallel-sessions constraint earned its keep.** The targeted revert was
  chosen specifically because of the memory note that Pascal runs multiple
  sessions against this working tree. That turned out to be live, not theoretical:
  a *second* session ran today and has its own open PR (#8,
  `session-notes-2026-08-18-doctor-cleanup`). A blanket `git checkout .` this
  evening could plausibly have eaten it.
- **Where this points.** The ritual's remaining frontier is trust, not
  capability — the agent can already do every step including the merge; the open
  question is which steps Pascal wants done without him in the loop. Today
  answered "not the merge, at least not yet," and didn't say why.
