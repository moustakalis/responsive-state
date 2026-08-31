<h1 align="center">responsive-state</h1>

<p align="center">
  Tiny, dependency-free, type-safe breakpoint state for the browser.<br>
  Built on <code>matchMedia</code>. SSR-safe. Framework-agnostic.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/responsive-state"><img alt="npm" src="https://img.shields.io/npm/v/responsive-state.svg"></a>
  <a href="https://bundlephobia.com/package/responsive-state"><img alt="size" src="https://img.shields.io/bundlephobia/minzip/responsive-state"></a>
  <a href="https://github.com/moustakalis/responsive-state/actions/workflows/ci.yml"><img alt="ci" src="https://github.com/moustakalis/responsive-state/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/npm/l/responsive-state.svg"></a>
</p>

---

One observable store that always knows which breakpoint the viewport is in,
driven by the browser's own media-query engine.

```ts
import { createResponsiveState, tailwind } from 'responsive-state';

const rs = createResponsiveState(tailwind);

rs.get().current;       // 'lg'
rs.up('md');            // true  — md and wider
rs.down('xl');          // true  — xl and narrower
rs.between('sm', 'lg'); // false

rs.subscribe((next, prev) => {
  console.log(`${prev.current} → ${next.current}`);
});
```

## Why `matchMedia`

- **One callback per crossed breakpoint**, not one per pixel of a resize drag.
- **No layout thrash** — `innerWidth` is never read unless you opt into `trackViewport`.
- **Same engine as your CSS**, so JS state cannot disagree with your stylesheet.
- **Zero dependencies**, ~1.7 kB gzipped, tree-shakeable.
- **SSR-safe** — nothing touches `window` at module scope.

## Install

```bash
npm i responsive-state
# pnpm add responsive-state · yarn add responsive-state · bun add responsive-state
```

## Define your breakpoints

Any `name -> min-width` map works. Values are numbers (px) or CSS lengths, and
they are sorted ascending for you.

```ts
const rs = createResponsiveState({
  base: 0,
  phone: 480,
  tablet: '48rem',
  laptop: 1024,
  desktop: 1440,
});
```

Names are inferred, so `rs.up('laptop')` autocompletes and `rs.up('lapotp')` is
a compile error. Four presets ship in the box:

```ts
import { tailwind, bootstrap, material, devices } from 'responsive-state';
```

| Preset | Tiers |
|---|---|
| `tailwind` | `base` 0 · `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536 |
| `bootstrap` | `xs` 0 · `sm` 576 · `md` 768 · `lg` 992 · `xl` 1200 · `xxl` 1400 |
| `material` | `compact` 0 · `medium` 600 · `expanded` 840 · `large` 1200 · `extraLarge` 1600 |
| `devices` | `mobile` 0 · `tablet` 768 · `desktop` 1440 |

Or pull them straight from your Tailwind config so there is only one source of
truth:

```ts
import config from './tailwind.config.js';
const rs = createResponsiveState({ base: 0, ...config.theme.screens });
```

## API

### `createResponsiveState(breakpoints, options?)`

| Option | Type | Default | Purpose |
|---|---|---|---|
| `features` | `Record<string, string>` | `{}` | Extra media queries: dark mode, `pointer: coarse`, reduced motion |
| `ssrBreakpoint` | `string` | smallest | Snapshot used on the server and before hydration |
| `syncAttribute` | `boolean \| { target, name }` | `false` | Mirrors the breakpoint to `<html data-breakpoint="md">` for CSS/E2E hooks |
| `trackViewport` | `boolean` | `false` | Adds rAF-throttled `width`/`height` to the snapshot |
| `window` | `Window \| null` | `globalThis.window` | Inject a window for tests, iframes or popups |

### Store methods

| Method | Returns |
|---|---|
| `get()` | Frozen snapshot: `current`, `index`, `active`, `is`, `up`, `down`, `features`, `width`, `height` |
| `subscribe(fn)` | Unsubscribe function; `fn(next, previous)` fires only on real changes |
| `is(name)` / `up(name)` / `down(name)` | Booleans with exact / `>=` / `<=` semantics |
| `between(from, to)` | `from` inclusive, `to` exclusive |
| `feature(name)` | Boolean for a named feature query |
| `pick(values, fallback)` | Nearest-smaller-defined value — mobile-first cascade in JS |
| `breakpoints` | Ascending breakpoint names |
| `getServerSnapshot()` | Stable snapshot for `useSyncExternalStore` |
| `destroy()` | Detaches every listener |

### `pick` — the cascade you already know from CSS

```ts
const perPage = rs.pick({ base: 6, md: 12, xl: 24 }, 6);
// base/sm → 6 · md/lg → 12 · xl/2xl → 24
```

### Feature queries

```ts
const rs = createResponsiveState(tailwind, {
  features: {
    dark: '(prefers-color-scheme: dark)',
    touch: '(pointer: coarse)',
    calm: '(prefers-reduced-motion: reduce)',
  },
});

rs.feature('touch'); // boolean, kept live through the same subscription
```

## Recipes

**Vanilla DOM**

```ts
const rs = createResponsiveState(devices, { syncAttribute: true });
rs.subscribe(({ is }) => (menu.hidden = is.mobile));
```

**React** — no adapter package needed, the store is already `useSyncExternalStore` shaped.

```ts
import { useSyncExternalStore } from 'react';
const useResponsive = () =>
  useSyncExternalStore(rs.subscribe, rs.get, rs.getServerSnapshot);
```

**Vue 3**

```ts
import { shallowRef, onScopeDispose } from 'vue';
export function useResponsive() {
  const state = shallowRef(rs.get());
  onScopeDispose(rs.subscribe((next) => (state.value = next)));
  return state;
}
```

**Svelte** — the store already satisfies the store contract via `subscribe`; wrap with `readable` if you want `$` syntax.

**CSS hand-off**

```css
[data-breakpoint='mobile'] .sidebar { display: none; }
```

## SSR and hydration

On the server, `get()` returns the `ssrBreakpoint` snapshot with `width: 0`.
The first client evaluation happens synchronously at construction. Pair with
`getServerSnapshot()` in React to avoid hydration mismatch warnings.

## When *not* to use this

If a component should react to the space *it* occupies rather than the
viewport, use CSS container queries or a `ResizeObserver` instead — media
queries only know about the screen.

## License

MIT © [Nickos Moustakas](https://github.com/moustakalis)
