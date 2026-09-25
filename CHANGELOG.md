# responsive-state

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
