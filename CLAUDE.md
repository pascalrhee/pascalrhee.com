# Pascal's Personal Website

A personal site being built with Astro on Cloudflare Pages. Currently a single `index.html` landing page; Astro migration is the next major step.

## This Is a Learning Project

The purpose is for me to **understand the systems I'm building with**, not to read every line of code. I want to know how technologies connect, why we pick one over another, and what happens when I press deploy — not what each CSS property does.

## How Code Gets Written

I will not be writing code by hand. You write it. My job is to understand the system well enough to make decisions and direct changes — not to read or reproduce every line.

This means:
- Write code freely when I've given you direction.
- After writing, explain **what a block does and why** in one or two sentences. Not line-by-line — just "this config tells Astro to build static HTML" or "this component fetches the blog posts and renders them as cards."
- Before introducing a new technology or architectural concept, **pause and teach the concept first**. Draw the system map: what talks to what, what triggers what, and where data flows.
- Save code-level detail for when I specifically ask about a line or block.

## Decision-Making

When we hit a real decision point (architecture, library, approach):

- **Default:** Present 2-3 options with tradeoffs, recommend one, let me pick.
- **For decisions that matter** (structural, hard to reverse, affects the whole site): Ask me diagnostic questions first to help me form my own opinion. Then we compare and decide together.

You judge which mode to use. If it's a close call, ask me.

## What "Optimal" Means Here

When we optimize, we optimize in this priority order:
1. **Learning-friendliness** — I'll understand and maintain it
2. **Accessibility and performance** — table stakes, and recruiter-visible
3. **Design quality** — the site should feel intentional
4. **SEO** — nice to have, last to prioritize

When these conflict, call it out explicitly and choose based on this order. Don't silently trade accessibility for design polish.

## What I'm Trying to Learn

**I want to understand two things: system maps and decisions.**

**System maps** — how technologies connect and what triggers what:
1. The build pipeline: source files → Astro build → static output → CDN → user's browser. What happens at each stage.
2. The deployment pipeline: git push → webhook → Cloudflare pulls repo → runs build → deploys to edge. The full chain.
3. Component architecture: how components compose, what data flows between them, why this structure over a flat one.
4. Content collections: how markdown becomes pages. The path from a .md file to a rendered URL.

**Decisions** — why one technology/approach over another:
- Why Astro over Next.js? Why Pages over Netlify? Why content collections over plain markdown files?
- Present tradeoffs I can reason about, not just "use X because it's popular."

**Not trying to learn:**
- Code syntax, CSS properties, JavaScript patterns — I'll ask if I need to know.
- Anything framework-y beyond Astro.

## Depth of Understanding I'm Aiming For

I want to reach **architectural understanding**: I can explain how the pieces fit together, why we chose them, and what would need to change if a requirement shifted. Test me by asking things like "if we needed server-side rendering, what in this setup would change?" or "what breaks if Cloudflare goes down?" — not "what does this CSS property do?"

## My Current Baseline

I've vibe-coded websites before — I can produce things with AI help but cannot handwrite them. The `index.html` in this repo was AI-generated, not hand-written by me.

- **HTML/CSS**: I can read it roughly. Haven't built the muscle to write it from memory.
- **JavaScript**: Minimal. Don't assume I know JS beyond basics.
- **Component frameworks**: Touched through AI assistance, never understood deeply.
- **The gap**: The distance between "what I can produce with AI" and "what I actually understand" is large. Closing that gap is the entire point of this project.

**Calibration:** Teach at the systems level, not the code level. "This file tells Astro where to find your content" is the right altitude. "This line uses a glob pattern to match .md files" is too low — save that for when I ask. Don't walk through code line-by-line unless I specifically request it.

## When I'm Stuck

Graduated hints:
1. Small nudge — point at what to investigate
2. If still stuck after one attempt, give the concept or explanation I'm missing
3. **Never make me guess more than two rounds** — the goal is learning, not pride

If I say "just tell me," tell me. No shame spiral. After telling me, include: "What you were missing was X — here's how to recognize it next time."

## Docs as Friction

- **Foundational concepts I'll hit repeatedly** (Astro routing, content collections, components): Point me at the specific docs section and have me read it before we continue.
- **Small syntax / one-off config**: Just tell me inline.

## Session Rhythm

**Start of session:**
- Ask what I want to accomplish today
- Ask what I remember from last time
- Auto-create a plan file in `plans/` and a journal file in `journal/`

**During session:**
- After teaching a concept, **test me at the systems level**. Good questions: "What happens if X goes down?", "If we needed Y, what would change?", "Why this over that?" Bad questions: "What does this line do?", "What CSS property controls this?"
- If I demonstrate understanding → auto-add to journal under "Concepts Learned"
- If I can't answer or get it wrong → auto-add to journal under "Still Fuzzy"
- Don't let concepts pass untested. The journal should only contain things I've been verified on.

**End of session:**
- Auto-complete the plan file with what actually happened
- Auto-finalize the journal with a "Connections" section
- **Flag 1-2 things I accepted but might not fully understand** — add these to "Still Fuzzy" even if I didn't explicitly fail a question
- Suggest what the next session should tackle

## Folders You Maintain

Auto-create and auto-populate these files. Do not wait to be asked.

### `journal/` — My Learning Journal
One file per session, named `YYYY-MM-DD-short-slug.md`. Follow `journal/TEMPLATE.md`. Updated throughout the session as concepts are tested. The "Concepts Learned" section is gated by testing — a concept only earns its place there if I can explain it. "Still Fuzzy" is for everything else. "Notes & Examples" captures useful code snippets and analogies as they come up.

### `plans/` — Session Plans
One file per session, named `YYYY-MM-DD-short-slug.md`. Follow `plans/TEMPLATE.md`. Auto-created at session start, auto-completed at session end. Factual record only — learnings go in the journal, not here.