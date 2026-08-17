---
session: 2026-08-17-astro-migration
goal: scaffold Astro at repo root, migrate index.html into layout + page
status: in-progress
---

## Goal
Get Astro live locally with the current landing page rendering through a layout component instead of a single `index.html`. Prerequisite for the counter feature and any future page beyond the landing.

## Plan
1. Create feature branch `astro-migration`
2. Scaffold Astro (minimal template, TypeScript strict)
3. Hoist scaffold contents to repo root, resolve collisions
4. Create `src/layouts/BaseLayout.astro` with shell + global CSS
5. Reduce `src/pages/index.astro` to just the content middle
6. Verify build output
7. Start dev server for visual check
8. (Pending user verification) Commit, decide push/deploy timing

## What Actually Happened
- Branch `astro-migration` created; `index.html` moved to `index.legacy.html` as a fallback
- `create-astro` refused to scaffold into non-empty `.` — it scaffolded to `./exotic-ellipse` and I hoisted contents to root (kept our CLAUDE.md, replaced `.gitignore` with scaffold's superset, dropped the scaffold's CLAUDE.md symlink)
- `npm install` timed out inside the scaffolder; re-ran separately (~1min, 205 packages, Astro 7.2.2)
- Renamed package from `exotic-ellipse` → `pascalrhee-website`
- Wrote `src/layouts/BaseLayout.astro` (shell + global CSS + header + footer) and `src/pages/index.astro` (content middle only)
- Removed scaffold's default `favicon.svg`/`favicon.ico` in favor of the inline data URI already in the design
- Build succeeds in ~400ms, output HTML matches the original structurally
- Dev server running at http://localhost:4321 pending user visual verification

## What's Next
- User confirms visual match in browser
- Delete `index.legacy.html` once confident
- Commit CLAUDE.md + session files to `main` separately (they're not Astro-specific), then commit Astro migration to `astro-migration` branch
- Confirm Cloudflare Pages behavior before merging to main — the build config in the CF dashboard controls what happens when main gets a new commit. If CF is still set to "no build," main will keep serving the old top-level HTML even with Astro files present. If we want the Astro build live, we update the CF dashboard: build command `npm run build`, output dir `dist`.
