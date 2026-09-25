---
'responsive-state': minor
---

Fix four correctness bugs found in review:

- Unitless numeric strings such as `'768'` are now treated as pixels. They previously produced an invalid media query (`(min-width: 768)`) that never matched. `toLength`/`minWidth` now return `768px` for them.
- **Breaking (0.x):** `createResponsiveState` now throws when the smallest breakpoint is not `0`. Previously, a map like `{ sm: 640, md: 768 }` reported `current: 'sm'` and `up('sm') === true` at 300px even though no query matched. Add a base tier, e.g. `{ base: 0, sm: 640, md: 768 }`.
- `breakpoints` is now frozen, so mutating it can no longer corrupt the store's internal order.
- A subscriber that throws no longer stops later subscribers from being notified or escapes from the `matchMedia` change handler. The error is surfaced through `reportError` (or rethrown asynchronously where that is unavailable).
