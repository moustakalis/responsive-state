# Migration guide

`responsive-state` is pre-1.0, so a minor release (`0.x → 0.y`) may contain breaking changes. Each section lists how to tell whether you are affected and exactly what to change. Most apps need no changes at all.

- [0.3 → 0.4](#03--04)
- [0.2 → 0.3](#02--03)

---

## 0.3 → 0.4

### 1. The `tailwind` preset now uses `rem` (Tailwind v4 values)

```ts
// 0.3
tailwind.md; // 768
// 0.4
tailwind.md; // '48rem'
```

**Why:** Tailwind v4 defines breakpoints in `rem`. With pixel values, JavaScript disagreed with your CSS whenever a user changed their browser's default font size.

**You are not affected** if you only pass the preset to the store:

```ts
createResponsiveState(tailwind); // same breakpoints at the default 16px font size
```

**You are affected** if you read the values yourself. Find those places with:

```bash
grep -rnE "tailwind(\.|\[)" src --include=*.{ts,tsx,js,jsx,vue}
```

Typical breakage, and the fix for each:

| Code in 0.3                                         | What happens in 0.4                                     | Change it to                                                             |
| --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `if (width >= tailwind.md)`                         | Type error; `false` at runtime (compares with a string) | `rs.up('md')` — or `tailwind3.md` if you really need the number          |
| `` `${tailwind.md}px` ``                            | `'48rempx'` (invalid CSS)                               | `toLength(tailwind.md)` → `'48rem'`                                      |
| `@media (min-width: ${tailwind.md}px)` in CSS-in-JS | Invalid query                                           | `` `@media ${minWidth(tailwind.md)}` `` or `toMediaQueries(tailwind).md` |
| `Math.max(tailwind.sm, x)` or any arithmetic        | Type error / `NaN`                                      | Use `tailwind3` (identical numbers to 0.3's `tailwind`)                  |

**Still on Tailwind v3,** or want the old numbers everywhere? Swap the import — it is the exact 0.3 preset:

```ts
import { tailwind3 as tailwind } from 'responsive-state';
```

### 2. New members on `ResponsiveSnapshot` and `ResponsiveState` (TypeScript only)

The snapshot gained `below`, `min` and `max`; the store gained `watch()` and `below()`. This only breaks code that **constructs** these types by hand, typically test doubles:

```ts
// error TS2739: Type '{ current: ...; }' is missing the following properties: below, min, max
const fakeSnapshot: ResponsiveSnapshot<'base' | 'md'> = { current: 'md' /* ... */ };
```

Fix: prefer a real store with an injected window over a hand-written fake (see `test/matchMedia.ts` in this repo for a small `matchMedia` stub), or add the new fields. Exact-equality assertions on whole snapshots (`toEqual(snapshot)`) also see the new keys — assert the fields you care about or use `toMatchObject`.

### 3. `getServerSnapshot()` no longer reads the real window size

With `trackViewport: true`, the server snapshot's `width`/`height` used to come from `window.innerWidth`/`innerHeight` when a window existed. That made the "server" snapshot differ between server and client and could cause hydration mismatches. It now reports `ssr.width` / `ssr.height` (default `0`).

**Affected** only if you read `getServerSnapshot().width` on the client. Pass the width you rendered with on the server:

```ts
createResponsiveState(tailwind, {
  trackViewport: true,
  ssr: { width: 1280, height: 800 },
});
```

`get()` is unchanged: it still reports the live window size.

### Not breaking, but worth knowing

- `ssrBreakpoint` now autocompletes your breakpoint names. Any string is still accepted at compile time (for values from cookies or headers); unknown names still throw when the store is created.
- New opt-in features: `watch()`, `below()`, `ssr: { width, height, features }`, `fromCssVariables()`, `toMediaQueries()`, and the `tailwind3`, `antDesign`, `bulma` and `foundation` presets. See the README.

---

## 0.2 → 0.3

### 1. The smallest breakpoint must be `0`

`createResponsiveState` now throws when the smallest breakpoint does not start at `0`:

```
[responsive-state] The smallest breakpoint must start at 0 (got sm: 640). Add a base tier, e.g. { base: 0, sm: 640, ... }.
```

**Why:** the smallest tier is what the store reports when nothing larger matches. With `{ sm: 640, md: 768 }`, a 300px viewport used to report `current: 'sm'` and `up('sm') === true`, even though the browser said `(min-width: 640px)` did not match.

**Fix:** add a base tier below your first breakpoint. All built-in presets already start at `0`.

```ts
// 0.2 — Tailwind v3-style screens without a base
createResponsiveState({ sm: 640, md: 768, lg: 1024 });

// 0.3+
createResponsiveState({ base: 0, sm: 640, md: 768, lg: 1024 });
```

Then check code that relied on the old behaviour: anything that treated "smallest breakpoint" as "always true" should now look at `base` (or use `up('sm')` knowing it is `false` below 640px).

### 2. `breakpoints` is frozen

```ts
rs.breakpoints.reverse(); // TypeError: Cannot assign to read only property '0' of object '[object Array]'
```

**Fix:** copy before mutating — `[...rs.breakpoints].reverse()`.

### 3. Subscriber errors no longer propagate synchronously

A listener that throws no longer stops the other listeners, and the error no longer escapes the `matchMedia` change handler. It is reported through `reportError` (it still appears in the console and fires `window.onerror`).

**Affected** only if you wrapped a resize or listener call in `try/catch` to catch a subscriber's error. Catch inside the listener instead.

### 4. Unitless numeric strings are now pixels

`{ md: '768' }` now means `768px`. Before, it produced the invalid query `(min-width: 768)`, which never matched — so if you had such a value, it silently never activated and now works as intended. Nothing to change unless you depended on that tier never matching.
