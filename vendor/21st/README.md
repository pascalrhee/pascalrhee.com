# 21st.dev component provenance

This site uses adapted **actual component source**, not solely visual inspiration.
21st.dev is the discovery/catalogue source; the source files were obtained from
these authors' independently public repositories on 2026-10-08. No gated 21st
source, subscription, CLI credentials, or paid assets are used.

## Background Paths — Kokonut UI / Dorian Baffier

- Catalogue: https://21st.dev/@kokonutd/components/background-paths
- Upstream: https://github.com/kokonut-labs/kokonutui/blob/main/components/kokonutui/background-paths.tsx
- License: MIT, copyright (c) 2025 kokonutUI; full notice in `kokonut-ui/LICENSE`.
- Original source retained in `kokonut-ui/background-paths.tsx`.
- Adaptation: `src/components/21st/background-paths.ts` preserves the complete
  `generateAestheticPath` algorithm. `BackgroundPaths.astro` uses the primary,
  secondary, and accent path families, SVG layering and wave motion, translated
  from React/Motion into server-rendered Astro and CSS. It adds the portfolio's
  copper palette, mirrored field, pointer/scroll perspective, motion toggle,
  visibility pausing and reduced-motion support. No React runtime is shipped.
- `tests/hero-motion.mjs` verifies exact path-output parity with the retained source.

## Magic Card — Magic UI / Dillion Verma

- Catalogue: https://21st.dev/@dillionverma/components/magic-card
- Upstream: https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/magic-card.tsx
- License: MIT, copyright (c) Magic UI; full notice in `magic-ui/LICENSE.md`.
- Upstream Git blob: `3b022df0d33bbf21b05a386a56860c6ad887edb0`.
- Original source retained in `magic-ui/magic-card.tsx`.
- Adaptation: `src/components/21st/MagicCard.astro` ports the gradient-mode
  padding-box/border-box radial gradient, surface/gradient/content layers,
  pointer-coordinate calculation and reset behavior. Motion values become CSS
  properties. The unused theme/orb modes are omitted for the dark-only site.
  Native anchors, touch fallback and reduced-motion gating are added.

## Interactive Hover Button — Magic UI / Dillion Verma

- Catalogue: https://21st.dev/@dillionverma/components/interactive-hover-button
- Upstream: https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/interactive-hover-button.tsx
- License: MIT, copyright (c) Magic UI; full notice in `magic-ui/LICENSE.md`.
- Upstream Git blob: `6aab0d85a7869227b9602c6c0e6dcc84a15ede31`.
- Original source retained in `magic-ui/interactive-hover-button.tsx`.
- Adaptation: `src/components/21st/InteractiveHoverButton.astro` preserves the
  expanding dot (100.8 scale), outgoing text, incoming text/arrow overlay and
  300ms transitions. Tailwind becomes scoped CSS; the button becomes a semantic
  navigation anchor. Duplicate visual text is hidden from assistive technology.
  Keyboard focus, touch and reduced-motion states are included.

The retained `.tsx` source files are provenance material, not installed or
executed dependencies. All original MIT copyright and permission notices must
remain with substantial portions of these adaptations. No endorsement by
21st.dev or either author is implied.
