## Change and purpose

## Acceptance criteria

- [ ] Requirements and scope are explicit
- [ ] `npm ci` and `npm run verify:release` pass on this exact revision
- [ ] `npx wrangler deploy --dry-run` passes
- [ ] Desktop/mobile, keyboard focus, reduced motion and no-JS behavior checked for UI changes
- [ ] Dependencies, licenses, secrets and security impact reviewed
- [ ] Remaining risks and intentionally untested behavior documented

## Evidence

Commands, screenshots, measurements, and any limitations:

## Release

Main auto-deploys. Do not merge until the acceptance criteria are met.
After release, verify the remote commit, Cloudflare build and live routes/headers.
