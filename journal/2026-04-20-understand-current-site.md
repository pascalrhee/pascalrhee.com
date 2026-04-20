---
date: 2026-04-20
session: understand-current-site
---

## Concepts Learned

**Workers vs Pages** — Workers run code per-request (serverless functions). Pages serves static files. They're not competing — Pages handles what the browser displays, Workers handles server-side logic. For a static site, Pages alone is enough. Workers enters the picture only when something needs to *happen* on the server (e.g., a contact form sending email = both).

## Notes & Examples

- Cloudflare's dashboard pushes Workers by default — Pages is buried under "Create application." This is a product/business decision, not a technical recommendation.
- Astro builds to static files → Pages is the right host. No server-side code needed.
- `preconnect` tells the browser to start connecting to an external server early, before it knows it needs a file. Performance trick for external dependencies like fonts.

**Viewport meta tag** — Tells mobile browsers to render at the device's actual width instead of pretending to be a ~980px desktop screen. Without it, the page renders tiny and zoomed out on phones. Desktop doesn't need it because desktop browsers already use their actual window width — the "pretend to be wide" behavior is mobile-only legacy from when most sites weren't mobile-friendly.

**Data URIs vs external links** — A data URI embeds the content directly in the HTML (the data IS the link). An external link points to another server that has to respond. The favicon in index.html is a data URI (self-contained, zero dependencies). The Google Fonts lines are external dependencies (if Google is down, fonts don't load). Tradeoff: data URIs can't be cached separately by the browser — the data re-downloads with the HTML every time.

## Still Fuzzy

(none yet)

## Connections

(to be filled at end of session)
