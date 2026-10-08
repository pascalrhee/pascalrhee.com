## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Required change verification

Before implementation, identify the requested outcome and acceptance criteria.
Before pushing, run `npm ci`, `npm run verify:release`, and
`npx wrangler deploy --dry-run` on the final revision. Do not bypass failures.
Install this clone's pre-push guard with `npm run setup:hooks`.
For UI changes, additionally check desktop/mobile layouts, keyboard focus,
reduced motion, JavaScript-disabled navigation, and browser-console errors.
Report passed, failed, and unrun checks separately. A local build or Git push
is not evidence of deployment: verify the exact remote commit, hosted build,
and live routes/headers after authorized publication.
Do not change remote branch protection or security settings without permission.
