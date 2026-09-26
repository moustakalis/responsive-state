---
'responsive-state': minor
---

**Breaking changes — see [MIGRATION.md](https://github.com/moustakalis/responsive-state/blob/main/MIGRATION.md#03--04) for step-by-step directions.**

- The `tailwind` preset now uses Tailwind v4's `rem` values (`sm: '40rem'`, `md: '48rem'`, …), so it keeps matching your CSS when users change their default font size. Passing the preset to `createResponsiveState` resolves the same breakpoints at the default 16px, but code that reads the values directly (comparisons, arithmetic, `` `${tailwind.md}px` ``) breaks. Use `rs.up()`, `toLength()`, `minWidth()` or `toMediaQueries()` instead, or import `tailwind3`, which is identical to the old preset.
- `ResponsiveSnapshot` gained `below`, `min` and `max`, and `ResponsiveState` gained `watch()` and `below()`. Hand-written test doubles typed with these interfaces need the new members.
- With `trackViewport`, `getServerSnapshot()` reports `ssr.width` / `ssr.height` (default `0`) instead of reading the real window. This prevents hydration mismatches. `get()` still reports the live size.

**New:**

- `watch(selector, listener, { immediate, equals })` calls back only when a derived value changes. Use it for "entered / left desktop" logic and custom tiers such as `s => s.below.md && s.features.portrait`.
- `below(name)` and `snapshot.below` mean strictly narrower than a breakpoint, matching Tailwind's `max-*` variants and `maxWidth()`.
- `ssr: { width, height, features }` resolves the server snapshot from an assumed viewport, such as a client hint. `ssrBreakpoint` now autocompletes breakpoint names.
- `fromCssVariables(fallback, options?)` reads breakpoints from CSS custom properties (`--breakpoint-*` by default), so JavaScript matches Tailwind v4's CSS. It ignores values that cannot be ordered, such as `calc()`.
- `toMediaQueries(breakpoints)` returns one non-overlapping media query per tier, for CSS-in-JS.
- `snapshot.min` / `snapshot.max` give the CSS lengths bounding the current tier.
- New presets: `tailwind3`, `antDesign`, `bulma`, `foundation`.
- Media query listeners fall back to `addListener` on Safari 13 and older.
