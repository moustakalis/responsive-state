---
'responsive-state': minor
---

New features inspired by a survey of similar libraries:

- `watch(selector, listener, options?)` calls back only when a derived value changes. Use it for "entered / left desktop" logic and custom tiers that combine breakpoints and features (`s => s.below.md && s.features.portrait`). Supports `immediate` and `equals`.
- `below(name)` and `snapshot.below` mean strictly narrower than a breakpoint, matching Tailwind's `max-*` variants and `maxWidth()`. `down()` is unchanged.
- `ssr: { width, height, features }` resolves the server snapshot from an assumed viewport (e.g. a client hint) and sets assumed feature values. `ssrBreakpoint` is now typed to your breakpoint names.
- `fromCssVariables(fallback, options?)` reads breakpoints from CSS custom properties (`--breakpoint-*` by default) so JavaScript matches Tailwind v4's CSS.
- `toMediaQueries(breakpoints)` returns one exclusive media query per tier for CSS-in-JS.
- The snapshot now carries `min` and `max`, the CSS lengths bounding the current tier.
- New presets: `tailwind3`, `antDesign`, `bulma`, `foundation`.
- Media query listeners fall back to `addListener` on Safari 13 and older.

**Breaking (0.x):** the `tailwind` preset now uses Tailwind v4's `rem` values (`sm: '40rem'`, …) so it keeps matching your CSS when users change their default font size. Behaviour is identical at the default 16px. The previous pixel values are available as `tailwind3`.
