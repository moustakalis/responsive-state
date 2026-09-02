<h1 align="center">responsive-state</h1>

<p align="center">
  Let your application make sensible viewport-aware decisions — without wiring resize listeners into every component.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/responsive-state"><img alt="npm" src="https://img.shields.io/npm/v/responsive-state.svg"></a>
  <a href="https://bundlephobia.com/package/responsive-state"><img alt="size" src="https://img.shields.io/bundlephobia/minzip/responsive-state"></a>
  <a href="https://github.com/moustakalis/responsive-state/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/moustakalis/responsive-state/actions/workflows/ci.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/responsive-state.svg"></a>
</p>

```bash
npm i responsive-state
```

```ts
import { createResponsiveState, tailwind } from 'responsive-state';

const appViewport = createResponsiveState(tailwind);

appViewport.get().current; // 'lg'
appViewport.up('md');      // true — medium screens and wider
appViewport.down('xl');    // true — extra-large screens and narrower
```

`responsive-state` is a tiny, dependency-free, framework-agnostic store for the moments when **JavaScript needs to know what CSS already knows about the viewport**. It is built on `matchMedia`, works with server rendering, and gives TypeScript autocomplete for your breakpoint names.

> **CSS should handle layout.** Use `responsive-state` when your application's behaviour, data, interactions, or client-only features need a viewport-aware decision.

---

## The problem it solves

A responsive layout is usually easy: CSS media queries and container queries are excellent at changing columns, spacing, typography, and visibility.

The awkward part starts when the change is not merely visual:

- A mobile navigation dialog should close when the full desktop navigation becomes available.
- A dashboard should request 6, 12, or 24 records depending on available screen space.
- An expensive map, chart, or editor should load only for larger screens.
- Touch devices need larger drag targets.
- JavaScript transitions should respect reduced-motion preferences.
- React needs a stable snapshot while rendering on the server.

The usual response is to put a `resize` listener in a component, read `window.innerWidth`, remember to clean it up, and repeat the same breakpoint logic elsewhere.

```ts
// Repeated across components. Easy to leak, duplicate, or disagree with CSS.
window.addEventListener('resize', () => {
  if (window.innerWidth < 768) {
    closeFilterPanel();
  }
});
```

Instead, define your breakpoint vocabulary once and ask one shared store:

```ts
// appViewport.ts
import { createResponsiveState, tailwind } from 'responsive-state';

export const appViewport = createResponsiveState(tailwind);
```

```ts
// Anywhere in your application.
import { appViewport } from './appViewport';

if (appViewport.up('lg')) {
  showExpandedSearchControls();
}
```

## When to reach for it

| Everyday need | What `responsive-state` gives you |
|---|---|
| Close an open mobile menu once desktop navigation takes over | `subscribe()` plus `up('lg')` |
| Decide how many items to fetch or render | `pick()` |
| Skip a costly desktop-only client feature | `up()` / `is()` |
| Adapt JavaScript interaction to touch, dark mode, or reduced motion | `feature()` |
| Add a stable breakpoint marker for browser tests | `syncAttribute` |
| Read a deterministic value during React SSR | `getServerSnapshot()` |
| Support a desktop-first value cascade as well as mobile-first | `pick(..., { fallbackDirection: 'down' })` |

## When not to use it

Do not install this package just to make an element look different at another width.

Use **CSS media queries** for viewport-driven presentation. Use **container queries** when a component should react to the space supplied by its parent. Use responsive images for image delivery.

`responsive-state` earns its place when JavaScript must make a real application decision that CSS cannot make alone.

---

## Install and set up once

```bash
npm i responsive-state
# pnpm add responsive-state
# yarn add responsive-state
# bun add responsive-state
```

Create one application-level store, usually near your client entry point:

```ts
// src/appViewport.ts
import { createResponsiveState, tailwind } from 'responsive-state';

export const appViewport = createResponsiveState(tailwind);
```

The included presets cover familiar breakpoint systems:

```ts
import { bootstrap, devices, material, tailwind } from 'responsive-state';

const appViewport = createResponsiveState(tailwind);
```

| Preset | Breakpoints |
|---|---|
| `tailwind` | `base` 0, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 |
| `bootstrap` | `xs` 0, `sm` 576, `md` 768, `lg` 992, `xl` 1200, `xxl` 1400 |
| `material` | `compact` 0, `medium` 600, `expanded` 840, `large` 1200, `extraLarge` 1600 |
| `devices` | `mobile` 0, `tablet` 768, `desktop` 1440 |

Or use the names and values your own product already understands. Numeric values are pixels; CSS lengths such as `48rem` also work.

```ts
const appViewport = createResponsiveState({
  phone: 0,
  tablet: '48rem',
  laptop: 1024,
  desktop: 1440,
});

appViewport.up('laptop'); // typed and autocompleted
```

---

## Recipes

### Close mobile UI when the layout grows

CSS can switch the navigation layout. It cannot close an already-open dialog, restore focus, or clear mobile-only application state.

```ts
import { appViewport } from './appViewport';

let isNavigationOpen = false;

const stopWatchingViewport = appViewport.subscribe((nextViewport, previousViewport) => {
  const justReachedDesktop = !previousViewport.up.lg && nextViewport.up.lg;

  if (justReachedDesktop && isNavigationOpen) {
    isNavigationOpen = false;
    closeNavigationDialog();
  }
});

// Call this only if this is not an app-wide store.
stopWatchingViewport();
```

The callback runs when a relevant media query changes, rather than for every pixel moved during a resize drag.

### Fetch an appropriate amount of data

Let CSS decide how cards are arranged. Let JavaScript decide how much data is worth requesting.

```ts
import { appViewport } from './appViewport';

const projectsPerPage = appViewport.pick(
  {
    base: 6,
    md: 12,
    xl: 24,
  },
  6,
);

const response = await fetch(`/api/projects?limit=${projectsPerPage}`);
```

By default, `pick()` uses a mobile-first cascade. A value defined at `md` is used at `lg` too, until a larger breakpoint provides a replacement.

```ts
appViewport.pick({ base: 6, md: 12, xl: 24 }, 6);
// base/sm → 6 · md/lg → 12 · xl/2xl → 24
```

### Use desktop-first inheritance when your system needs it

Some design systems start with wide-screen values and override them downwards. Keep the same ascending breakpoint map and choose the fallback policy only where you resolve a value.

```ts
import { createResponsiveState } from 'responsive-state';

const editorViewport = createResponsiveState({
  mobile: 0,
  tablet: 782,
  desktop: 1280,
});

const previewColumns = editorViewport.pick(
  {
    tablet: 2,
    desktop: 4,
  },
  1,
  { fallbackDirection: 'down' },
);
```

With `fallbackDirection: 'down'`, a current `mobile` viewport looks toward `tablet`, then `desktop`, for the nearest defined value. An exact value at the current breakpoint always wins.

### Avoid loading an expensive desktop-only feature

Use this sparingly for real bandwidth, CPU, or interaction savings — not as a replacement for responsive CSS.

```ts
import { appViewport } from './appViewport';

if (appViewport.up('lg')) {
  const { mountProjectMap } = await import('./projectMap');
  mountProjectMap();
}
```

Good candidates include large maps, rich editors, data-heavy visualizations, and interaction modes that are genuinely unsuitable for a small viewport.

### Respect touch and accessibility preferences

Breakpoints are only one kind of media query. Keep related browser preferences in the same store.

```ts
import { createResponsiveState, tailwind } from 'responsive-state';

const appViewport = createResponsiveState(tailwind, {
  features: {
    touchInput: '(pointer: coarse)',
    reducedMotion: '(prefers-reduced-motion: reduce)',
    darkAppearance: '(prefers-color-scheme: dark)',
  },
});

if (appViewport.feature('touchInput')) {
  enableLargerDragHandles();
}

if (appViewport.feature('reducedMotion')) {
  disableChartTransitions();
}
```

### Give browser tests an explicit breakpoint hook

For the rare cases where CSS and browser tests need an explicit shared marker, mirror the active breakpoint to `<html>`.

```ts
import { createResponsiveState, tailwind } from 'responsive-state';

const appViewport = createResponsiveState(tailwind, {
  syncAttribute: true,
});
```

```html
<html data-breakpoint="lg">
```

```ts
// Playwright example
await expect(page.locator('html')).toHaveAttribute('data-breakpoint', 'lg');
```

This is useful for test setup and deliberate CSS/JS hand-offs. Prefer normal media queries for ordinary visual styling.

### React: one small hook, no adapter dependency

The store already has the shape React expects for `useSyncExternalStore`.

```ts
// useAppViewport.ts
import { useSyncExternalStore } from 'react';
import { appViewport } from './appViewport';

export function useAppViewport() {
  return useSyncExternalStore(
    appViewport.subscribe,
    appViewport.get,
    appViewport.getServerSnapshot,
  );
}
```

```tsx
function SearchControls() {
  const viewport = useAppViewport();

  return viewport.up.md ? <ExpandedFilters /> : <FilterButton />;
}
```

### Vue 3: a small composable

```ts
// useAppViewport.ts
import { onScopeDispose, shallowRef } from 'vue';
import { appViewport } from './appViewport';

export function useAppViewport() {
  const viewport = shallowRef(appViewport.get());

  const stopWatchingViewport = appViewport.subscribe((nextViewport) => {
    viewport.value = nextViewport;
  });

  onScopeDispose(stopWatchingViewport);
  return viewport;
}
```

---

## API reference

### `createResponsiveState(breakpoints, options?)`

| Option | Default | Use it when… |
|---|---:|---|
| `features` | `{}` | You want named media queries for motion, color scheme, pointer type, and more |
| `ssrBreakpoint` | Smallest breakpoint | Server rendering needs a different deterministic initial tier |
| `syncAttribute` | `false` | You need `data-breakpoint` on an element, usually `<html>` |
| `trackViewport` | `false` | You truly need numeric `width` and `height` in the snapshot |
| `window` | Browser global | You are working with an iframe, popup, or controlled test window |

### Read the current snapshot

```ts
const viewport = appViewport.get();

viewport.current;  // 'lg'
viewport.index;    // 3
viewport.active;   // ['base', 'sm', 'md', 'lg']
viewport.is.lg;    // true
viewport.up.md;    // true
viewport.down.xl;  // true
viewport.width;    // 0 unless trackViewport: true
```

Snapshots are frozen. Read them freely; subscribe when your code must react to future changes.

### Ask direct questions

```ts
appViewport.is('md');            // exactly md
appViewport.up('md');            // md and wider
appViewport.down('lg');          // lg and narrower
appViewport.between('sm', 'lg'); // sm inclusive, lg exclusive
```

### Listen for changes

```ts
const stopWatchingViewport = appViewport.subscribe((nextViewport, previousViewport) => {
  console.log(`${previousViewport.current} → ${nextViewport.current}`);
});

stopWatchingViewport();
```

### Resolve a breakpoint-aware value

```ts
const value = appViewport.pick(
  { base: 'small', lg: 'large' },
  'small',
);
```

| Argument | Meaning |
|---|---|
| `values` | A partial map of breakpoint names to values |
| `fallback` | Returned when no value is found in the selected direction |
| `options.fallbackDirection` | `'up'` by default for mobile-first; `'down'` for desktop-first |

### Destroy a non-global store

```ts
const embeddedViewport = createResponsiveState({ compact: 0, wide: 900 });

// Later, when an iframe/widget is permanently removed:
embeddedViewport.destroy();
```

---

## Why `matchMedia` instead of a resize listener?

- It reacts to breakpoint/query changes instead of every pixel during a resize drag.
- It uses the same browser media-query engine as your CSS.
- Breakpoint semantics live in one tested place rather than being recreated across components.
- The store has no runtime dependencies and no framework import.
- Nothing reads browser globals at module import time, so it is safe to load during SSR.

## Server rendering

On the server, there is no real viewport. The store therefore exposes a stable snapshot based on the smallest breakpoint by default.

```ts
import { createResponsiveState, tailwind } from 'responsive-state';

const marketingViewport = createResponsiveState(tailwind, {
  ssrBreakpoint: 'lg',
});
```

On the client, media queries are evaluated synchronously when the store is created. In React, supply `getServerSnapshot` to `useSyncExternalStore`, as shown in the React recipe.

## Contributing

Contributions are welcome. Please keep the core dependency-free, include focused tests for behaviour changes, and run:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## License

MIT © [Nickos Moustakas](https://github.com/moustakalis)
