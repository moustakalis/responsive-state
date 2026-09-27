# responsive-state

## 0.4.0

### Minor Changes

- [#5](https://github.com/moustakalis/responsive-state/pull/5) [`8c1f077`](https://github.com/moustakalis/responsive-state/commit/8c1f0775bfff00054b50f3466986a9475cdb433f) Thanks [@moustakalis](https://github.com/moustakalis)! - **Breaking changes — see [MIGRATION.md](https://github.com/moustakalis/responsive-state/blob/main/MIGRATION.md#03--04) for step-by-step directions.**

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

## 0.3.0

### Minor Changes

- [#3](https://github.com/moustakalis/responsive-state/pull/3) [`9c8edb2`](https://github.com/moustakalis/responsive-state/commit/9c8edb2bfe007ed8be50b7eacf443085a82ee51c) Thanks [@moustakalis](https://github.com/moustakalis)! - Fix four correctness bugs found in review:

  - Unitless numeric strings such as `'768'` are now treated as pixels. They previously produced an invalid media query (`(min-width: 768)`) that never matched. `toLength`/`minWidth` now return `768px` for them.
  - **Breaking (0.x):** `createResponsiveState` now throws when the smallest breakpoint is not `0`. Previously, a map like `{ sm: 640, md: 768 }` reported `current: 'sm'` and `up('sm') === true` at 300px even though no query matched. Add a base tier, e.g. `{ base: 0, sm: 640, md: 768 }`.
  - `breakpoints` is now frozen, so mutating it can no longer corrupt the store's internal order.
  - A subscriber that throws no longer stops later subscribers from being notified or escapes from the `matchMedia` change handler. The error is surfaced through `reportError` (or rethrown asynchronously where that is unavailable).

## 0.2.1

### Patch Changes

- [`bd289d5`](https://github.com/moustakalis/responsive-state/commit/bd289d5f5896fa5820a4b79eaee646369a48fffc) Thanks [@moustakalis](https://github.com/moustakalis)! - Refresh the published README with clearer problem-focused guidance and practical integration recipes.

## 0.2.0

### Minor Changes

- [`d729f78`](https://github.com/moustakalis/responsive-state/commit/d729f78ba8c3a795671bc4e9c129e31f955df3f7) Thanks [@moustakalis](https://github.com/moustakalis)! - Add `fallbackDirection: 'down'` to `pick()` for desktop-first breakpoint value resolution.

## 0.1.0

### Minor Changes

- 093d1fe: Initial release: `matchMedia`-driven, dependency-free breakpoint store with typed breakpoint names, `is`/`up`/`down`/`between`/`pick` helpers, feature queries, SSR snapshots, optional viewport tracking and `data-breakpoint` mirroring.
