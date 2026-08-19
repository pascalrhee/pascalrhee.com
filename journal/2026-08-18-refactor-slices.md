---
date: 2026-08-18
session: refactor-slices
---

## Concepts Learned

**Documentation with citations is a different artifact than documentation.**
The rule "every claim carries a `file:line`, every inference is marked
UNVERIFIED, and anything you can't answer from code goes in a questions list"
turns a doc from prose into something checkable. The strategic point: an
uncited architecture doc rots invisibly, because nothing connects it to the code
that moved. A cited one rots *loudly* — this session's own refactor shifted
worker line numbers by one and the citations immediately pointed at the wrong
lines. That's a feature.

**Dead-code tools answer four different questions, which is why you run four.**
depcheck asks "is this dependency imported anywhere," knip asks "is this file or
export reachable," ts-prune asks "is this export used outside its own module,"
madge asks "do the imports form a cycle." None of them can answer "does this
code ever actually run," because that needs execution. Hence the end-to-end run
alongside them. The class of problem: static analysis sees the graph, not the
traffic.

**Coverage tools will call your accessibility code dead.** Every
`prefers-reduced-motion` block in `src/` never matches during a normal run,
because the preference is off unless the visitor sets it. Four of them exist. A
"delete what coverage never hit" pass removes all four and nobody notices until
a motion-sensitive visitor arrives. The general lesson is bigger than CSS:
**conditional code for minority conditions always looks dead to a majority
sample.** Error branches, fallbacks, and accessibility escape hatches are the
same shape.

**Astro's style scoping does not break CSS inheritance.** This was the
load-bearing assumption of the whole font-token refactor, and slice 5 existed
specifically to test it: do `:root` tokens defined in `BaseLayout`'s `is:global`
block reach *scoped* styles in a child component? They do. Astro scopes by
adding attribute selectors to your rules — it does not create a shadow root — so
the cascade still flows down normally. Had it used shadow DOM, tokens would have
stopped at the boundary and slices 5–8 would have been abandoned rather than
forced.

**Astro inlines small scoped stylesheets into the HTML but hoists large ones to
external bundles.** Which is why token substitution shrank some pages and left
others byte-identical. Worth knowing before you read page-size deltas as if
they mean something uniform.

**Refactoring in slices ordered by rising risk.** The point of doing the safest
change first is not caution for its own sake — it's that the safe slices
*establish the verification story* while the stakes are low. By the time slice 9
touched the Worker's actual constants, the harness had already been proven
against eight cheaper changes. If you order risk the other way, your first
failure is also your first test of the thing meant to catch failures.

**Testing what HTTP can't see.** Slice 9's genuinely dangerous failure mode is a
TTL of 30 *seconds* instead of 30 *hours*. Every request-level assertion still
passes; the counter just quietly stops having a history. No black-box test can
see that, so the harness evaluates the module and asserts on real values. It was
negative-tested by deliberately breaking it — the suite drops to 25/28.

## Notes & Examples

**Substitution order matters when one string contains another.** The small-caps
font stack contains the serif stack as a substring:

```
'EB Garamond SC', 'EB Garamond', Georgia, serif     <- SC stack
'EB Garamond', Georgia, serif                       <- serif stack
```

Replace the serif stack first and every SC declaration silently becomes
`'EB Garamond SC', var(--font-serif)` — corrupt, and it still *builds*. Longest
match first, always.

**Byte counts as a verification signal — printed, never asserted.** Two cases
where the number itself carried the proof:

```
slice 3: page grew by exactly 6 bytes = 3 rename sites x 2 characters
slice 9: /about/ stayed at exactly 9700 bytes
```

The second one is the good one. `/about/` renders its architecture diagram by
interpolating the counter constants into hand-positioned SVG text. Identical
byte count proves the interpolated strings came out the same length, so the
hand-tuned coordinates still fit. A test asserting "the page contains 24" would
have passed while the layout broke.

**The counter's constants, now in one place** (`src/lib/counter.ts`) — the units
comment is the whole reason the file exists:

```ts
export const WINDOW_HOURS = 24;
export const BUCKET_TTL_HOURS = WINDOW_HOURS + 6;   // outlive the read window
export const BUCKET_TTL_SECONDS = BUCKET_TTL_HOURS * 60 * 60;  // KV wants seconds
```

Before this, three files restated these numbers independently — which meant
changing the Worker made the architecture diagram silently wrong, on the one
page whose entire job is explaining the architecture.

**History rewrite vs. delete-commit.** Deleting a file in a new commit removes
it from the working tree but the bytes stay in history, so every clone forever
downloads them. Rewriting removes them from history entirely. Rewriting is only
safe while nothing is pushed — after a push, other people's clones already have
the bytes and rewriting breaks their branches instead.

## Still Fuzzy

**The 247-line smoke harness, to test a 73-line Worker.** That is 3.4 lines of
test per line of subject, and about 13% of everything in `src/`, added in a
single slice to a repo that had zero tests an hour earlier. It is now Pascal's
to maintain forever — it boots wrangler, it depends on the exact shape of the
counter's KV keys, and it will break for reasons that have nothing to do with
the site being broken. The ratio was flagged once, and it drew no pushback,
which is not the same as being examined. The real question that never got asked:
is the harness the right *size*, or was it built to the size that made slice 9
feel safe? A 60-line version asserting the five routes and the API contract
would have caught most of what the full one catches.

**The history rewrite happened while he was asleep, and he approved the goal,
not the method.** Pascal asked to "strip" the coverage files. Rewriting history
rather than deleting forward was chosen for him, and it changed 15 commit SHAs.
It was genuinely safe — nothing was pushed, so nothing could break — but "safe"
and "approved" are different things, and this is the kind of operation where the
habit matters more than the instance. If the same call comes up on a branch that
*has* been pushed, the correct answer flips completely, and the precedent set
tonight points the wrong way.

**All three gate questions were answered "take the recommendation."** Fast
agreement across the board on questions that were framed as genuinely optional.
That's either a well-calibrated recommender or a gate that isn't gating. Worth
watching which one it is next time by making one recommendation deliberately
arguable.

## Connections

**This session inverted the usual direction of the project.** Every prior
session added something — the Astro migration, the counter, `/about`, the
Michigan template. This one added almost nothing visible: after ~450 lines of
change across 10 commits, the site renders byte-for-byte the same. What changed
is that the repo can now *explain itself* (`ARCHITECTURE.md`) and *check itself*
(`npm run smoke`). Those are the two things a codebase needs to survive the
4-month gaps this project actually runs on. Cheap re-entry has been the stated
priority since the first session; this is the first session that built for it
directly rather than just complaining about it.

**The smoke harness is the missing half of the wrap-up ritual.** `/end-session`
has been running build and `wrangler deploy --dry-run` as its gates for several
sessions. Both check that things *compile*, neither checks that anything *works*
— the Worker's bot filter could have been inverted for weeks and every gate would
have stayed green. There is now a gate that would catch it.

**A forward-looking tripwire worth writing down.** The harness dynamically
imports `src/lib/counter.ts` to check its values. That is completely safe today:
fixed path, repo-controlled, no trust boundary crossed, and `/security-review`
dismissed it explicitly. **But if CI is ever added that runs `npm run smoke` on
pull requests from forks, that import becomes a code-execution path on the
runner** — a fork's PR would supply the file being evaluated. There is no
`.github/` directory today, so this is not exploitable. It connects directly to
the standing open question about whether Cloudflare Workers Builds ever gets
connected to the GitHub repo, and to the auto-merge decision from earlier today:
both hinge on "does anything automated watch this repo," and the answer being
*no* is doing a lot of quiet load-bearing work.

**`PUBLIC_THRESHOLD` is still 0, and now it's documented.** The Worker
implements a whole visibility gate that has never once changed an outcome. The
docs and the smoke test both now assert this — the harness has a literal
assertion reading `visible is true while PUBLIC_THRESHOLD is 0`. The original
question from the counter session ("does a public counter with small numbers
look like trying too hard?") is still unanswered, but it is now unanswered
*visibly* rather than forgotten in a constant.

**And the one that keeps not getting done:** `grep -rn "focus-visible" src/`
still returns nothing. Four sessions of being flagged. This session spent its
entire budget on documentation and internal cleanliness while the cheapest
outstanding accessibility win — priority #2 in CLAUDE.md, and the one a
recruiter's screen reader would actually hit — stayed untouched. That is not an
accident of scope; it is what happens when the interesting work and the
important work aren't the same work.
