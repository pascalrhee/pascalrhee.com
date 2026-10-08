# pascalrhee.com

Pascal Rhee’s personal website. Live at [pascalrhee.com](https://pascalrhee.com).

## Architecture

- Astro builds three static HTML routes; no React runtime, client framework, or public Astro server.
- Shared layouts and small Astro components, scoped component styles and a global design system.
- Cloudflare Workers Assets serves the output. The Worker retires old `/api/*` routes with HTTP 410; it does not access KV. Existing KV data/binding is retained, untouched.
- Fonts are self-hosted. Adapted UI components and their original MIT licenses/provenance are in `vendor/21st/`.
- `scripts/security-headers.mjs` generates a CSP from the exact built inline-script bytes. Inline styles remain allowed for generated CSS and interactive styles; inline scripts and eval are not broadly allowed.

## Development

Use the Node version in `.nvmrc` (22, at least 22.12).

```sh
npm ci
npm run setup:hooks
npm run dev
```

Astro preview is for the static interface. Test Worker routing and security headers with `npx wrangler dev`; this uses local bindings unless explicitly configured otherwise.

## Verification before a push

```sh
npm run format
npm run verify:release
npx wrangler deploy --dry-run
```

`verify` runs formatting, a narrow secret-pattern guard, Astro/TypeScript diagnostics, a fresh static build, interaction/API tests, route/semantic/link checks, CSP-hash checks, and HTML/JavaScript size budgets. `verify:release` also requires the dependency audit to pass at high severity. A failed/unavailable audit blocks release; review the cause rather than bypassing the gate.

For each change, write acceptance criteria before implementation and record command results plus remaining limitations in the PR. UI changes additionally require desktop/mobile, keyboard navigation, reduced motion, JavaScript-disabled navigation and browser-console checks. Automated DOM checks are not a full accessibility audit or a substitute for visual review.

GitHub Actions runs the same gate on PRs and main with read-only permissions. Main is protected: changes require a pull request, the GitHub Actions `verify` check, and an up-to-date branch. Admin bypass, force pushes, and branch deletion are disabled. Run `npm run setup:hooks` once per clone to install the checked-in pre-push hook. It requires a clean tree, checks that the pushed revision is HEAD, and runs the release gate. Hooks can be bypassed; server-side branch protection remains the stronger control.

## Deployment

Main is connected to Cloudflare Workers Builds and auto-deploys. Do not push/merge unreviewed main changes.

```sh
npm run deploy
```

Wrangler's custom build hook runs `npm run verify:release` before packaging/upload, including when Cloudflare invokes `npx wrangler deploy` directly. This prevents deployment after a failing gate rather than depending on a separate CI job to finish first. Do not bypass the custom build verification.

After release, verify the exact remote commit, the Cloudflare build outcome, all three live routes and retired Writing redirects, security headers, retired API status, and browser interactions. A successful local build or Git push alone is not deployment confirmation.

## Dependency policy

Use the committed lockfile and `npm ci`; review dependency updates rather than using `npm audit fix --force`. The `sharp: 0.35.5` override patches GHSA-wq5f-xc86-pv6w in the development-only Wrangler/Miniflare image tooling. Remove it when upstream's dependency includes the fix, and retest. None of these image-processing packages is deployed as an Astro server.

## Layout

- `src/pages/`: routes and content
- `src/layouts/`: common shells
- `src/components/`: small UI components
- `src/styles/global.css`: design system/responsive styles
- `src/worker/index.ts`: static fallback and retired API response
- `tests/`: interaction and Worker tests
- `scripts/`: build/release checks
- `vendor/`: upstream UI sources/licenses, excluded from typechecking
- `journal/`, `plans/`: historical project notes
